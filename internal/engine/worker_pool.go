package engine

import (
	"context"
	"sync"
)

type Task struct {
	Target string
	JobID  string
}

type WorkerFunc func(ctx context.Context, t Task)

type WorkerFactory func() WorkerFunc

type WorkerPool struct {
	concurrency int
	taskCh      chan Task
	wg          sync.WaitGroup
}

func NewWorkerPool(concurrency, bufSize int) *WorkerPool {
	if bufSize < 1 {
		bufSize = 1
	}
	if bufSize > 10000 {
		bufSize = 10000
	}
	return &WorkerPool{
		concurrency: concurrency,
		taskCh:      make(chan Task, bufSize),
	}
}

func (wp *WorkerPool) Start(ctx context.Context, factory WorkerFactory) {
	for i := 0; i < wp.concurrency; i++ {
		handler := factory()
		wp.wg.Add(1)
		go func() {
			defer wp.wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				case t, ok := <-wp.taskCh:
					if !ok {
						return
					}
					handler(ctx, t)
				}
			}
		}()
	}
}

func (wp *WorkerPool) Submit(ctx context.Context, t Task) bool {
	select {
	case <-ctx.Done():
		return false
	case wp.taskCh <- t:
		return true
	}
}

func (wp *WorkerPool) Drain() {
	close(wp.taskCh)
	wp.wg.Wait()
}
