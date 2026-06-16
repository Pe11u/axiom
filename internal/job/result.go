package job

import (
	"sync"
	"sync/atomic"
	"time"
)

type LogField struct {
	Label      string `json:"label"`
	Value      string `json:"value"`
	Expandable bool   `json:"expandable,omitempty"`
}

type LogStep struct {
	NodeType   string     `json:"nodeType"`
	NodeLabel  string     `json:"nodeLabel"`
	Fields     []LogField `json:"fields"`
	DurationMs *float64   `json:"durationMs,omitempty"`
	Error      string     `json:"error,omitempty"`
}

type CapturedVar struct {
	Name   string `json:"name"`
	Value  string `json:"value"`
	Hidden bool   `json:"hidden,omitempty"`
}

type Result struct {
	Target       string        `json:"target"`
	StatusCode   int           `json:"statusCode"`
	BodySnippet  string        `json:"bodySnippet"`
	Latency      time.Duration `json:"latency"`
	ProxyUsed    string        `json:"proxyUsed"`
	Error        string        `json:"error,omitempty"`
	Timestamp    time.Time     `json:"timestamp"`
	OutputBranch string        `json:"outputBranch,omitempty"`
	LogSteps     []LogStep     `json:"logSteps,omitempty"`
	CapturedVars []CapturedVar `json:"capturedVars,omitempty"`
}

type ResultBucket struct {
	mu      sync.Mutex
	Hits    []Result
	Fails   []Result
	Retries []Result

	DoneCount      atomic.Int64
	HitCount       atomic.Int64
	FailCount      atomic.Int64
	RetryCount     atomic.Int64
	totalLatencyNs atomic.Int64
}

func (b *ResultBucket) AddHit(r Result) {
	b.mu.Lock()
	b.Hits = append(b.Hits, r)
	b.mu.Unlock()
	b.HitCount.Add(1)
	b.DoneCount.Add(1)
	b.totalLatencyNs.Add(int64(r.Latency))
}

func (b *ResultBucket) AddFail(r Result) {
	b.mu.Lock()
	b.Fails = append(b.Fails, r)
	b.mu.Unlock()
	b.FailCount.Add(1)
	b.DoneCount.Add(1)
	b.totalLatencyNs.Add(int64(r.Latency))
}

func (b *ResultBucket) AddRetry(r Result) {
	b.mu.Lock()
	b.Retries = append(b.Retries, r)
	b.mu.Unlock()
	b.RetryCount.Add(1)
}

func (b *ResultBucket) Stats() (done, hits, fails, retries int64) {
	return b.DoneCount.Load(), b.HitCount.Load(), b.FailCount.Load(), b.RetryCount.Load()
}

func (b *ResultBucket) AvgLatencyMs() float64 {
	done := b.DoneCount.Load()
	if done == 0 {
		return 0
	}
	return float64(b.totalLatencyNs.Load()) / float64(done) / 1e6
}

func (b *ResultBucket) Page(bucketType string, offset, limit int) []Result {
	b.mu.Lock()
	defer b.mu.Unlock()
	var src []Result
	switch bucketType {
	case "hits":
		src = b.Hits
	case "fails":
		src = b.Fails
	case "retries":
		src = b.Retries
	default:
		return nil
	}
	if offset >= len(src) {
		return nil
	}
	end := offset + limit
	if end > len(src) {
		end = len(src)
	}
	out := make([]Result, end-offset)
	copy(out, src[offset:end])
	return out
}

type ProgressEvent struct {
	JobID      string  `json:"jobId"`
	Done       int64   `json:"done"`
	Total      int64   `json:"total"`
	Hits       int64   `json:"hits"`
	Fails      int64   `json:"fails"`
	AvgLatency float64 `json:"avgLatency"`
}

type StatusSnapshot struct {
	JobID      string     `json:"jobId"`
	Status     string     `json:"status"`
	Done       int64      `json:"done"`
	Total      int64      `json:"total"`
	Hits       int64      `json:"hits"`
	Fails      int64      `json:"fails"`
	AvgLatency float64    `json:"avgLatency"`
	StartedAt  time.Time  `json:"startedAt"`
	FinishedAt *time.Time `json:"finishedAt,omitempty"`
}
