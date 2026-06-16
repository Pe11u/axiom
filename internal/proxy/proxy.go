package proxy

import (
	"fmt"
	"net/url"
	"strings"
	"sync/atomic"
	"time"
)

type Scheme string

const (
	HTTP   Scheme = "http"
	HTTPS  Scheme = "https"
	SOCKS5 Scheme = "socks5"
)

type Proxy struct {
	Raw     string
	Scheme  Scheme
	Host    string
	Port    string
	User    string
	Pass    string
	Latency atomic.Int64
	alive   atomic.Bool
	Fails   atomic.Int32
}

func (p *Proxy) IsAlive() bool           { return p.alive.Load() }
func (p *Proxy) SetAlive(v bool)         { p.alive.Store(v) }
func (p *Proxy) GetLatency() time.Duration { return time.Duration(p.Latency.Load()) }

func (p *Proxy) URL() *url.URL {
	u := &url.URL{
		Scheme: string(p.Scheme),
		Host:   p.Host + ":" + p.Port,
	}
	if p.User != "" || p.Pass != "" {
		u.User = url.UserPassword(p.User, p.Pass)
	}
	return u
}

func (p *Proxy) String() string {
	return p.URL().String()
}

func ParseProxy(raw string) (*Proxy, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, fmt.Errorf("empty proxy string")
	}

	s := raw
	if !strings.Contains(s, "://") {
		s = "http://" + s
	}

	u, err := url.Parse(s)
	if err != nil {
		return nil, fmt.Errorf("invalid proxy %q: %w", raw, err)
	}

	scheme := Scheme(strings.ToLower(u.Scheme))
	switch scheme {
	case HTTP, HTTPS, SOCKS5:
	default:
		return nil, fmt.Errorf("unsupported proxy scheme %q in %q", u.Scheme, raw)
	}

	host := u.Hostname()
	port := u.Port()
	if host == "" || port == "" {
		return nil, fmt.Errorf("proxy missing host or port: %q", raw)
	}

	p := &Proxy{
		Raw:    raw,
		Scheme: scheme,
		Host:   host,
		Port:   port,
	}
	if u.User != nil {
		p.User = u.User.Username()
		p.Pass, _ = u.User.Password()
	}
	p.alive.Store(true)
	return p, nil
}

type ProxyStat struct {
	Raw     string        `json:"raw"`
	Alive   bool          `json:"alive"`
	Latency time.Duration `json:"latency"`
	Fails   int32         `json:"fails"`
}

func (p *Proxy) Stat() ProxyStat {
	return ProxyStat{
		Raw:     p.Raw,
		Alive:   p.IsAlive(),
		Latency: p.GetLatency(),
		Fails:   p.Fails.Load(),
	}
}
