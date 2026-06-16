package output

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"axiom/internal/job"
)

type Writer struct {
	mu      sync.Mutex
	hitsW   *bufio.Writer
	failsW  *bufio.Writer
	hitsF   *os.File
	failsF  *os.File
	flushCh chan struct{}
	done    chan struct{}
}

func NewWriter(outputPath, jobID string) (*Writer, error) {
	if err := os.MkdirAll(outputPath, 0755); err != nil {
		return nil, fmt.Errorf("create output dir: %w", err)
	}

	hitsPath := filepath.Join(outputPath, jobID+"_hits.jsonl")
	failsPath := filepath.Join(outputPath, jobID+"_fails.jsonl")

	hitsF, err := os.Create(hitsPath)
	if err != nil {
		return nil, fmt.Errorf("create hits file: %w", err)
	}
	failsF, err := os.Create(failsPath)
	if err != nil {
		hitsF.Close()
		return nil, fmt.Errorf("create fails file: %w", err)
	}

	w := &Writer{
		hitsF:   hitsF,
		failsF:  failsF,
		hitsW:   bufio.NewWriterSize(hitsF, 4096),
		failsW:  bufio.NewWriterSize(failsF, 4096),
		flushCh: make(chan struct{}),
		done:    make(chan struct{}),
	}
	go w.flushLoop()
	return w, nil
}

func (w *Writer) WriteHit(r job.Result) error {
	return w.writeTo(w.hitsW, r)
}

func (w *Writer) WriteFail(r job.Result) error {
	return w.writeTo(w.failsW, r)
}

func (w *Writer) writeTo(bw *bufio.Writer, r job.Result) error {
	b, err := json.Marshal(r)
	if err != nil {
		return err
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	_, err = bw.Write(b)
	if err != nil {
		return err
	}
	return bw.WriteByte('\n')
}

func (w *Writer) WriteStats(outputPath, jobID string, snap *job.StatusSnapshot) error {
	path := filepath.Join(outputPath, jobID+"_stats.json")
	b, err := json.MarshalIndent(snap, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, b, 0644)
}

func (w *Writer) Close() error {
	close(w.flushCh)
	<-w.done
	w.mu.Lock()
	defer w.mu.Unlock()
	_ = w.hitsW.Flush()
	_ = w.failsW.Flush()
	w.hitsF.Close()
	w.failsF.Close()
	return nil
}

func (w *Writer) flushLoop() {
	defer close(w.done)
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-w.flushCh:
			return
		case <-ticker.C:
			w.mu.Lock()
			_ = w.hitsW.Flush()
			_ = w.failsW.Flush()
			w.mu.Unlock()
		}
	}
}
