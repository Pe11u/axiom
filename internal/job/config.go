package job

import (
	"errors"
	"strings"
)

type JobConfig struct {
	Method       string            `json:"method"`
	Headers      map[string]string `json:"headers"`
	Body         string            `json:"body"`
	Concurrency  int               `json:"concurrency"`
	TimeoutSecs  int               `json:"timeoutSecs"`
	RetryCount   int               `json:"retryCount"`
	RetryOnCodes []int             `json:"retryOnCodes"`
	TLSProfile   string            `json:"tlsProfile"`
	ProxyMode    string            `json:"proxyMode"`
	OutputPath   string            `json:"outputPath"`
	OutputFormat string            `json:"outputFormat"`
	FlowGraph    string            `json:"flowGraph,omitempty"`
	SeedVarMode  string            `json:"seedVarMode,omitempty"`
	SeedVarDelim string            `json:"seedVarDelim,omitempty"`
}

var validTLSProfiles = map[string]bool{
	"chrome_146":  true,
	"firefox_135": true,
	"safari_16":   true,
	"random":      true,
}

var validProxyModes = map[string]bool{
	"round_robin": true,
	"random":      true,
	"none":        true,
}

func (c *JobConfig) Validate() error {
	method := strings.ToUpper(c.Method)
	switch method {
	case "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS":
		c.Method = method
	default:
		return errors.New("invalid HTTP method: " + c.Method)
	}
	if c.Concurrency < 1 || c.Concurrency > 2000 {
		return errors.New("concurrency must be between 1 and 2000")
	}
	if c.TimeoutSecs < 1 {
		c.TimeoutSecs = 30
	}
	if c.RetryCount < 0 {
		c.RetryCount = 0
	}
	if !validTLSProfiles[c.TLSProfile] {
		return errors.New("invalid TLS profile: " + c.TLSProfile)
	}
	if !validProxyModes[c.ProxyMode] {
		return errors.New("invalid proxy mode: " + c.ProxyMode)
	}
	if c.OutputFormat == "" {
		c.OutputFormat = "jsonl"
	}
	return nil
}
