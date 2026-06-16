//go:build integration

package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"axiom/internal/job"
	"axiom/internal/proxy"
)

func TestEngineOffline(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer ts.Close()

	proxyServer := httptest.NewServer(newConnectProxy())
	defer proxyServer.Close()

	targets := make([]string, 10)
	for i := range targets {
		targets[i] = ts.URL + fmt.Sprintf("/?n=%d", i)
	}

	var emitted []string
	eng := NewEngine(context.Background(), func(event string, _ ...interface{}) {
		emitted = append(emitted, event)
	})

	cfg := job.JobConfig{
		Method:       "GET",
		Concurrency:  5,
		TimeoutSecs:  5,
		TLSProfile:   "chrome_146",
		ProxyMode:    "none",
		OutputFormat: "jsonl",
		OutputPath:   t.TempDir(),
	}
	cfgJSON, _ := json.Marshal(cfg)

	jobID, err := eng.CreateJob(string(cfgJSON), targets, nil)
	if err != nil {
		t.Fatalf("CreateJob: %v", err)
	}

	if err := eng.StartJob(jobID); err != nil {
		t.Fatalf("StartJob: %v", err)
	}

	deadline := time.Now().Add(15 * time.Second)
	for time.Now().Before(deadline) {
		snap, _ := eng.GetJobStatus(jobID)
		if snap != nil && (snap.Status == "done" || snap.Status == "stopped" || snap.Status == "error") {
			break
		}
		time.Sleep(100 * time.Millisecond)
	}

	snap, err := eng.GetJobStatus(jobID)
	if err != nil {
		t.Fatalf("GetJobStatus: %v", err)
	}
	if snap.Status != "done" {
		t.Errorf("job status = %q, want \"done\"", snap.Status)
	}
	if snap.Hits != 10 {
		t.Errorf("hits = %d, want 10 (fails=%d)", snap.Hits, snap.Fails)
	}
	if snap.Done != 10 {
		t.Errorf("done = %d, want 10", snap.Done)
	}
	t.Logf("events emitted: %v", emitted)
}

func newConnectProxy() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodConnect {
			http.Error(w, "only CONNECT supported", http.StatusMethodNotAllowed)
			return
		}
		dst, err := net.Dial("tcp", r.Host)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadGateway)
			return
		}
		w.WriteHeader(http.StatusOK)
		hj, ok := w.(http.Hijacker)
		if !ok {
			return
		}
		conn, _, err := hj.Hijack()
		if err != nil {
			dst.Close()
			return
		}
		go tunnel(dst, conn)
		go tunnel(conn, dst)
	})
}

func tunnel(dst io.WriteCloser, src io.ReadCloser) {
	defer dst.Close()
	defer src.Close()
	_, _ = io.Copy(dst, src)
}

func TestProxyPoolIntegration(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	proxyServer := httptest.NewServer(newConnectProxy())
	defer proxyServer.Close()

	targets := []string{ts.URL}
	pool := proxy.NewPool(proxy.RoundRobin)
	_ = pool.LoadFromLines([]string{proxyServer.URL})

	eng := NewEngine(context.Background(), func(_ string, _ ...interface{}) {})
	cfg := job.JobConfig{
		Method:       "GET",
		Concurrency:  1,
		TimeoutSecs:  5,
		TLSProfile:   "chrome_146",
		ProxyMode:    "round_robin",
		OutputFormat: "jsonl",
		OutputPath:   t.TempDir(),
	}
	cfgJSON, _ := json.Marshal(cfg)
	jobID, err := eng.CreateJob(string(cfgJSON), targets, []string{proxyServer.URL})
	if err != nil {
		t.Fatalf("CreateJob: %v", err)
	}
	if err := eng.StartJob(jobID); err != nil {
		t.Fatalf("StartJob: %v", err)
	}
	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		snap, _ := eng.GetJobStatus(jobID)
		if snap != nil && snap.Status == "done" {
			break
		}
		time.Sleep(50 * time.Millisecond)
	}
	snap, _ := eng.GetJobStatus(jobID)
	if snap.Status != "done" {
		t.Errorf("status = %q, want done", snap.Status)
	}
	t.Logf("hits=%d fails=%d", snap.Hits, snap.Fails)
}
