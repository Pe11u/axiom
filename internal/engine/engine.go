package engine

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"axiom/internal/job"
	"axiom/internal/output"
	"axiom/internal/proxy"
)

type EmitFunc func(event string, data ...interface{})

type Engine struct {
	jobs map[string]*job.Job
	mu   sync.RWMutex
	ctx  context.Context
	emit EmitFunc
}

func NewEngine(ctx context.Context, emit EmitFunc) *Engine {
	return &Engine{
		jobs: make(map[string]*job.Job),
		ctx:  ctx,
		emit: emit,
	}
}

func (e *Engine) CreateJob(configJSON string, targets []string, proxyLines []string) (string, error) {
	var cfg job.JobConfig
	if err := json.Unmarshal([]byte(configJSON), &cfg); err != nil {
		return "", fmt.Errorf("invalid config JSON: %w", err)
	}
	if err := cfg.Validate(); err != nil {
		return "", err
	}
	if len(targets) == 0 {
		return "", errors.New("target list is empty")
	}

	pool := proxy.NewPool(proxy.RotationMode(cfg.ProxyMode))
	if cfg.ProxyMode != "none" && len(proxyLines) > 0 {
		if err := pool.LoadFromLines(proxyLines); err != nil {
			return "", err
		}
		proxy.StartHealthChecker(e.ctx, pool, 60*time.Second)
	}

	id := newJobID()
	j := job.NewJob(id, &cfg, targets)
	j.ProxyPool = pool

	emit := e.emit
	j.OnProgress = func(ev job.ProgressEvent) {
		emit("job:progress", ev)
	}

	e.mu.Lock()
	e.jobs[id] = j
	e.mu.Unlock()

	return id, nil
}

func (e *Engine) StartJob(id string) error {
	j, err := e.getJob(id)
	if err != nil {
		return err
	}
	s := j.GetStatus()
	if s != job.StatusPending && s != job.StatusStopped {
		return fmt.Errorf("job %s is not in a startable state (current: %s)", id, s)
	}

	go e.runJob(j)
	return nil
}

func (e *Engine) PauseJob(id string) error {
	j, err := e.getJob(id)
	if err != nil {
		return err
	}
	j.Pause()
	return nil
}

func (e *Engine) ResumeJob(id string) error {
	j, err := e.getJob(id)
	if err != nil {
		return err
	}
	j.Resume()
	return nil
}

func (e *Engine) StopJob(id string) error {
	j, err := e.getJob(id)
	if err != nil {
		return err
	}
	j.Stop()
	return nil
}

func (e *Engine) GetJobStatus(id string) (*job.StatusSnapshot, error) {
	j, err := e.getJob(id)
	if err != nil {
		return nil, err
	}
	return j.Snapshot(), nil
}

func (e *Engine) ListJobs() []*job.StatusSnapshot {
	e.mu.RLock()
	defer e.mu.RUnlock()
	out := make([]*job.StatusSnapshot, 0, len(e.jobs))
	for _, j := range e.jobs {
		out = append(out, j.Snapshot())
	}
	return out
}

func (e *Engine) GetJobTargets(id string) ([]string, error) {
	j, err := e.getJob(id)
	if err != nil {
		return nil, err
	}
	out := make([]string, len(j.Targets))
	copy(out, j.Targets)
	return out, nil
}

func (e *Engine) UpdateJobTargets(id string, targets []string) error {
	j, err := e.getJob(id)
	if err != nil {
		return err
	}
	return j.SetTargets(targets)
}

func (e *Engine) GetJobProxies(id string) ([]string, error) {
	j, err := e.getJob(id)
	if err != nil {
		return nil, err
	}
	if j.ProxyPool == nil {
		return nil, nil
	}
	all := j.ProxyPool.All()
	lines := make([]string, len(all))
	for i, px := range all {
		lines[i] = px.Raw
	}
	return lines, nil
}

func (e *Engine) UpdateJobProxies(id string, proxyLines []string) error {
	j, err := e.getJob(id)
	if err != nil {
		return err
	}
	newPool := proxy.NewPool(proxy.RotationMode(j.Config.ProxyMode))
	if len(proxyLines) > 0 {
		if err := newPool.LoadFromLines(proxyLines); err != nil {
			return err
		}
	}
	return j.SetProxyPool(newPool)
}

func (e *Engine) GetProxyStats(id string) ([]proxy.ProxyStat, error) {
	j, err := e.getJob(id)
	if err != nil {
		return nil, err
	}
	if j.ProxyPool == nil {
		return nil, nil
	}
	return j.ProxyPool.Stats(), nil
}

func (e *Engine) GetResults(id, bucket string, offset, limit int) ([]job.Result, error) {
	j, err := e.getJob(id)
	if err != nil {
		return nil, err
	}
	return j.Results.Page(bucket, offset, limit), nil
}

func (e *Engine) runJob(j *job.Job) {
	j.MarkStarted()

	cfg := j.Config
	bufSize := len(j.Targets)

	var wr *output.Writer
	if cfg.OutputPath != "" {
		if w, err := output.NewWriter(cfg.OutputPath, j.ID); err == nil {
			wr = w
		}
	}

	wp := NewWorkerPool(cfg.Concurrency, bufSize)
	wp.Start(j.Context(), makeFactory(j, j.ProxyPool, wr))

	feederDone := make(chan struct{})
	go func() {
		defer close(feederDone)
		for _, target := range j.Targets {
			if !wp.Submit(j.Context(), Task{Target: target, JobID: j.ID}) {
				return
			}
		}
	}()

	ticker := time.NewTicker(500 * time.Millisecond)
	go func() {
		for {
			select {
			case <-j.Context().Done():
				ticker.Stop()
				return
			case <-ticker.C:
				snap := j.Snapshot()
				e.emit("job:progress", job.ProgressEvent{
					JobID:      j.ID,
					Done:       snap.Done,
					Total:      snap.Total,
					Hits:       snap.Hits,
					Fails:      snap.Fails,
					AvgLatency: snap.AvgLatency,
				})
			}
		}
	}()

	<-feederDone
	wp.Drain()
	ticker.Stop()

	finalStatus := job.StatusDone
	if j.GetStatus() == job.StatusStopped {
		finalStatus = job.StatusStopped
	}
	j.MarkFinished(finalStatus)

	if wr != nil {
		_ = wr.WriteStats(cfg.OutputPath, j.ID, j.Snapshot())
		_ = wr.Close()
	}

	e.emit("job:done", j.Snapshot())
}

func (e *Engine) getJob(id string) (*job.Job, error) {
	e.mu.RLock()
	j, ok := e.jobs[id]
	e.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("job %q not found", id)
	}
	return j, nil
}

var jobCounter sync.Mutex
var jobSeq int

func newJobID() string {
	jobCounter.Lock()
	jobSeq++
	id := fmt.Sprintf("job-%d-%d", time.Now().UnixMilli(), jobSeq)
	jobCounter.Unlock()
	return id
}
