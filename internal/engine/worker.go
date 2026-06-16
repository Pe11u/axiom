package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	fhttp "github.com/bogdanfinn/fhttp"
	tls_client "github.com/bogdanfinn/tls-client"
	"axiom/internal/flow"
	"axiom/internal/job"
	"axiom/internal/output"
	"axiom/internal/proxy"
	tlsclient "axiom/internal/tls"
)

const maxBodySnippet = 1 << 20

func makeFactory(j *job.Job, pool *proxy.Pool, wr *output.Writer) WorkerFactory {
	cfg := j.Config

	return func() WorkerFunc {
		initialProxy := pickProxy(pool, cfg.ProxyMode)

		client, err := tlsclient.NewClient(
			tlsclient.ProfileName(cfg.TLSProfile),
			cfg.TimeoutSecs,
			initialProxy,
		)
		if err != nil {
			return func(ctx context.Context, t Task) {
				j.Results.AddFail(job.Result{
					Target:    t.Target,
					Error:     err.Error(),
					Timestamp: time.Now(),
				})
			}
		}

		lastProxy := initialProxy

		return func(ctx context.Context, t Task) {
			select {
			case <-j.PauseCh():
			case <-ctx.Done():
				return
			}

			proxyURL := pickProxy(pool, cfg.ProxyMode)
			if proxyURL != lastProxy {
				if setErr := client.SetProxy(proxyURL); setErr == nil {
					lastProxy = proxyURL
				}
			}

			start := time.Now()
			var r job.Result
			if cfg.FlowGraph != "" {
				var g flow.Graph
				if err := json.Unmarshal([]byte(cfg.FlowGraph), &g); err == nil {
					var initVars map[string]string
					if cfg.SeedVarMode == "user_pass" {
						delim := cfg.SeedVarDelim
						if delim == "" {
							delim = ":"
						}
						parts := strings.SplitN(t.Target, delim, 2)
						initVars = map[string]string{"User": parts[0]}
						if len(parts) == 2 {
							initVars["Pass"] = parts[1]
						}
					}
					fr := flow.Run(ctx, client, &g, initVars)
					r.StatusCode = fr.StatusCode
					r.BodySnippet = fr.BodySnippet
					r.LogSteps = fr.LogSteps
					r.CapturedVars = fr.CapturedVars
					r.OutputBranch = fr.OutputBranch
					r.Error = fr.Error
				} else {
					r.Error = "invalid flow graph: " + err.Error()
				}
			} else {
				r = executeWithRetry(ctx, client, cfg, t.Target, j)
				r.LogSteps = buildLogSteps(r)
			}
			r.Latency = time.Since(start)
			r.Target = t.Target
			r.ProxyUsed = lastProxy
			r.Timestamp = time.Now()

			if r.Error != "" || (r.StatusCode > 0 && !isHit(r.StatusCode)) {
				j.Results.AddFail(r)
				if wr != nil {
					_ = wr.WriteFail(r)
				}
			} else {
				j.Results.AddHit(r)
				if wr != nil {
					_ = wr.WriteHit(r)
				}
			}

			if j.OnProgress != nil {
				done, hits, fails, _ := j.Results.Stats()
				j.OnProgress(job.ProgressEvent{
					JobID:      j.ID,
					Done:       done,
					Total:      int64(len(j.Targets)),
					Hits:       hits,
					Fails:      fails,
					AvgLatency: j.Results.AvgLatencyMs(),
				})
			}
		}
	}
}

func executeWithRetry(ctx context.Context, client tls_client.HttpClient, cfg *job.JobConfig, target string, j *job.Job) job.Result {
	backoff := 50 * time.Millisecond
	var lastErr error
	var lastCode int
	var lastSnippet string

	for attempt := 0; attempt <= cfg.RetryCount; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return job.Result{Error: "cancelled"}
			case <-time.After(backoff):
			}
			if backoff < 2*time.Second {
				backoff *= 2
			}
		}

		code, snippet, err := execute(ctx, client, cfg, target)
		if err != nil {
			lastErr = err
			continue
		}
		lastCode = code
		lastSnippet = snippet
		lastErr = nil

		if shouldRetry(code, cfg.RetryOnCodes) {
			j.Results.AddRetry(job.Result{
				Target:      target,
				StatusCode:  code,
				BodySnippet: snippet,
			})
			continue
		}
		return job.Result{StatusCode: code, BodySnippet: snippet}
	}

	r := job.Result{StatusCode: lastCode, BodySnippet: lastSnippet}
	if lastErr != nil {
		r.Error = lastErr.Error()
	}
	return r
}

func execute(ctx context.Context, client tls_client.HttpClient, cfg *job.JobConfig, target string) (int, string, error) {
	var bodyReader io.Reader
	if cfg.Body != "" {
		bodyReader = strings.NewReader(cfg.Body)
	}

	req, err := fhttp.NewRequest(cfg.Method, target, bodyReader)
	if err != nil {
		return 0, "", err
	}
	req = req.WithContext(ctx)

	for k, v := range cfg.Headers {
		req.Header.Set(k, v)
	}

	resp, err := client.Do(req)
	if err != nil {
		return 0, "", err
	}
	defer resp.Body.Close()

	buf := make([]byte, maxBodySnippet)
	n, _ := io.ReadFull(resp.Body, buf)
	_, _ = io.Copy(io.Discard, resp.Body)
	return resp.StatusCode, string(buf[:n]), nil
}

func buildLogSteps(r job.Result) []job.LogStep {
	latMs := float64(r.Latency) / 1e6
	proxy := r.ProxyUsed
	if proxy == "" {
		proxy = "direct"
	}
	fields := []job.LogField{
		{Label: "url",     Value: r.Target},
		{Label: "status",  Value: fmt.Sprintf("%d", r.StatusCode)},
		{Label: "latency", Value: fmt.Sprintf("%.0fms", latMs)},
		{Label: "proxy",   Value: proxy},
	}
	if r.BodySnippet != "" {
		fields = append(fields, job.LogField{Label: "response body", Value: r.BodySnippet, Expandable: true})
	}
	return []job.LogStep{{
		NodeType:   "http_request",
		NodeLabel:  "HTTP Request",
		Fields:     fields,
		DurationMs: &latMs,
		Error:      r.Error,
	}}
}

func pickProxy(pool *proxy.Pool, mode string) string {
	if mode == "none" || pool == nil {
		return ""
	}
	px, err := pool.Next()
	if err != nil || px == nil {
		return ""
	}
	return px.String()
}

func isHit(code int) bool {
	return code >= 200 && code < 300
}

func shouldRetry(code int, codes []int) bool {
	for _, c := range codes {
		if c == code {
			return true
		}
	}
	return false
}
