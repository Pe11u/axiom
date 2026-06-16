package job

import (
	"sync"
	"testing"
	"time"
)

func TestAtomicCountersConcurrentWrites(t *testing.T) {
	const goroutines = 1000
	b := &ResultBucket{}
	var wg sync.WaitGroup
	wg.Add(goroutines)
	for i := 0; i < goroutines; i++ {
		i := i
		go func() {
			defer wg.Done()
			r := Result{Target: "http://example.com", Timestamp: time.Now()}
			if i%2 == 0 {
				b.AddHit(r)
			} else {
				b.AddFail(r)
			}
		}()
	}
	wg.Wait()

	done, hits, fails, _ := b.Stats()
	if done != goroutines {
		t.Errorf("done = %d, want %d", done, goroutines)
	}
	if hits != goroutines/2 {
		t.Errorf("hits = %d, want %d", hits, goroutines/2)
	}
	if fails != goroutines/2 {
		t.Errorf("fails = %d, want %d", fails, goroutines/2)
	}
	b.mu.Lock()
	sliceHits := len(b.Hits)
	sliceFails := len(b.Fails)
	b.mu.Unlock()
	if int64(sliceHits) != hits {
		t.Errorf("slice hits %d != atomic hits %d", sliceHits, hits)
	}
	if int64(sliceFails) != fails {
		t.Errorf("slice fails %d != atomic fails %d", sliceFails, fails)
	}
}

func TestRetryCounterDoesNotIncrementDone(t *testing.T) {
	b := &ResultBucket{}
	b.AddRetry(Result{})
	done, _, _, retries := b.Stats()
	if done != 0 {
		t.Errorf("done should be 0 after AddRetry, got %d", done)
	}
	if retries != 1 {
		t.Errorf("retries should be 1, got %d", retries)
	}
}

func TestPagePagination(t *testing.T) {
	b := &ResultBucket{}
	for i := 0; i < 10; i++ {
		b.AddHit(Result{Target: "x"})
	}
	page := b.Page("hits", 3, 4)
	if len(page) != 4 {
		t.Errorf("expected 4 results, got %d", len(page))
	}
	page = b.Page("hits", 8, 10)
	if len(page) != 2 {
		t.Errorf("expected 2 results at tail, got %d", len(page))
	}
	page = b.Page("hits", 20, 5)
	if len(page) != 0 {
		t.Errorf("expected 0 results past end, got %d", len(page))
	}
}
