package job

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"time"
	"unsafe"

	"axiom/internal/proxy"
)

type Status int32

const (
	StatusPending Status = iota
	StatusRunning
	StatusPaused
	StatusDone
	StatusStopped
	StatusError
)

func (s Status) String() string {
	switch s {
	case StatusPending:
		return "pending"
	case StatusRunning:
		return "running"
	case StatusPaused:
		return "paused"
	case StatusDone:
		return "done"
	case StatusStopped:
		return "stopped"
	case StatusError:
		return "error"
	default:
		return "unknown"
	}
}

type Job struct {
	ID        string
	Config    *JobConfig
	Targets   []string
	ProxyPool *proxy.Pool

	Results *ResultBucket

	status    atomic.Int32
	startedAt time.Time
	finishAt  *time.Time
	mu        sync.RWMutex

	ctx    context.Context
	cancel context.CancelFunc

	pauseCh unsafe.Pointer

	OnProgress func(ProgressEvent)
}

func NewJob(id string, cfg *JobConfig, targets []string) *Job {
	ctx, cancel := context.WithCancel(context.Background())
	ch := make(chan struct{})
	close(ch)
	j := &Job{
		ID:      id,
		Config:  cfg,
		Targets: targets,
		Results: &ResultBucket{},
		ctx:     ctx,
		cancel:  cancel,
	}
	j.status.Store(int32(StatusPending))
	atomic.StorePointer(&j.pauseCh, unsafe.Pointer(&ch))
	return j
}

func (j *Job) Context() context.Context { return j.ctx }

func (j *Job) GetStatus() Status {
	return Status(j.status.Load())
}

func (j *Job) SetStatus(s Status) {
	j.status.Store(int32(s))
}

func (j *Job) PauseCh() <-chan struct{} {
	p := (*chan struct{})(atomic.LoadPointer(&j.pauseCh))
	return *p
}

func (j *Job) Pause() {
	if j.GetStatus() != StatusRunning {
		return
	}
	newCh := make(chan struct{})
	atomic.StorePointer(&j.pauseCh, unsafe.Pointer(&newCh))
	j.SetStatus(StatusPaused)
}

func (j *Job) Resume() {
	if j.GetStatus() != StatusPaused {
		return
	}
	p := (*chan struct{})(atomic.LoadPointer(&j.pauseCh))
	j.SetStatus(StatusRunning)
	close(*p)
}

func (j *Job) Stop() {
	j.SetStatus(StatusStopped)
	j.cancel()
}

func (j *Job) SetTargets(targets []string) error {
	if s := j.GetStatus(); s != StatusPending && s != StatusStopped {
		return errors.New("job must be pending or stopped to edit targets")
	}
	cp := make([]string, len(targets))
	copy(cp, targets)
	j.mu.Lock()
	j.Targets = cp
	j.mu.Unlock()
	return nil
}

func (j *Job) SetProxyPool(pool *proxy.Pool) error {
	if s := j.GetStatus(); s != StatusPending && s != StatusStopped {
		return errors.New("job must be pending or stopped to edit proxies")
	}
	j.mu.Lock()
	j.ProxyPool = pool
	j.mu.Unlock()
	return nil
}

func (j *Job) MarkStarted() {
	j.mu.Lock()
	j.startedAt = time.Now()
	j.mu.Unlock()
	j.SetStatus(StatusRunning)
}

func (j *Job) MarkFinished(s Status) {
	now := time.Now()
	j.mu.Lock()
	j.finishAt = &now
	j.mu.Unlock()
	j.SetStatus(s)
}

func (j *Job) Snapshot() *StatusSnapshot {
	j.mu.RLock()
	started := j.startedAt
	finished := j.finishAt
	j.mu.RUnlock()
	done, hits, fails, _ := j.Results.Stats()
	return &StatusSnapshot{
		JobID:      j.ID,
		Status:     j.GetStatus().String(),
		Done:       done,
		Total:      int64(len(j.Targets)),
		Hits:       hits,
		Fails:      fails,
		AvgLatency: j.Results.AvgLatencyMs(),
		StartedAt:  started,
		FinishedAt: finished,
	}
}
