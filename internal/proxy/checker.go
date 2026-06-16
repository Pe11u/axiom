package proxy

import (
	"context"
	"net/http"
	"time"
)

const (
	checkURL      = "http://connectivitycheck.gstatic.com/generate_204"
	checkTimeout  = 5 * time.Second
	checkInterval = 60 * time.Second
	checkParallel = 20
)

func StartHealthChecker(ctx context.Context, pool *Pool, interval time.Duration) {
	if interval <= 0 {
		interval = checkInterval
	}
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		checkAll(ctx, pool)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				checkAll(ctx, pool)
			}
		}
	}()
}

func checkAll(ctx context.Context, pool *Pool) {
	proxies := pool.All()
	sem := make(chan struct{}, checkParallel)
	for _, px := range proxies {
		px := px
		select {
		case <-ctx.Done():
			return
		case sem <- struct{}{}:
		}
		go func() {
			defer func() { <-sem }()
			latency, alive := probe(ctx, px)
			if alive {
				pool.MarkAlive(px, latency)
			} else {
				pool.MarkDead(px)
			}
		}()
	}
	for i := 0; i < checkParallel; i++ {
		select {
		case sem <- struct{}{}:
		case <-ctx.Done():
			return
		}
	}
}

func probe(ctx context.Context, px *Proxy) (time.Duration, bool) {
	proxyURL := px.URL()
	transport := &http.Transport{
		Proxy: http.ProxyURL(proxyURL),
	}
	client := &http.Client{
		Transport: transport,
		Timeout:   checkTimeout,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	pCtx, cancel := context.WithTimeout(ctx, checkTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(pCtx, http.MethodGet, checkURL, nil)
	if err != nil {
		return 0, false
	}

	start := time.Now()
	resp, err := client.Do(req)
	latency := time.Since(start)
	if err != nil {
		return 0, false
	}
	resp.Body.Close()
	return latency, resp.StatusCode == http.StatusNoContent || resp.StatusCode < 500
}
