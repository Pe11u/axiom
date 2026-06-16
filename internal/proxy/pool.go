package proxy

import (
	"bufio"
	"errors"
	"math/rand"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type RotationMode string

const (
	RoundRobin RotationMode = "round_robin"
	Random     RotationMode = "random"
	None       RotationMode = "none"
)

var ErrNoAliveProxy = errors.New("no alive proxies in pool")

type Pool struct {
	proxies []*Proxy
	mu      sync.RWMutex
	cursor  atomic.Int64
	mode    RotationMode
}

func NewPool(mode RotationMode) *Pool {
	return &Pool{mode: mode}
}

func (p *Pool) LoadFromFile(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	var lines []string
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		lines = append(lines, sc.Text())
	}
	return p.LoadFromLines(lines)
}

func (p *Pool) LoadFromLines(lines []string) error {
	var parsed []*Proxy
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		px, err := ParseProxy(line)
		if err != nil {
			continue
		}
		parsed = append(parsed, px)
	}
	p.mu.Lock()
	p.proxies = append(p.proxies, parsed...)
	p.mu.Unlock()
	return nil
}

func (p *Pool) Next() (*Proxy, error) {
	p.mu.RLock()
	proxies := p.proxies
	p.mu.RUnlock()

	if len(proxies) == 0 {
		return nil, ErrNoAliveProxy
	}

	if p.mode == Random {
		return p.nextRandom(proxies)
	}
	return p.nextRoundRobin(proxies)
}

func (p *Pool) nextRoundRobin(proxies []*Proxy) (*Proxy, error) {
	n := int64(len(proxies))
	for range proxies {
		idx := p.cursor.Add(1) % n
		px := proxies[idx]
		if px.IsAlive() {
			return px, nil
		}
	}
	return nil, ErrNoAliveProxy
}

func (p *Pool) nextRandom(proxies []*Proxy) (*Proxy, error) {
	alive := make([]*Proxy, 0, len(proxies))
	p.mu.RLock()
	for _, px := range proxies {
		if px.IsAlive() {
			alive = append(alive, px)
		}
	}
	p.mu.RUnlock()
	if len(alive) == 0 {
		return nil, ErrNoAliveProxy
	}
	return alive[rand.Intn(len(alive))], nil
}

func (p *Pool) MarkDead(px *Proxy) {
	px.SetAlive(false)
	px.Fails.Add(1)
}

func (p *Pool) MarkAlive(px *Proxy, latency time.Duration) {
	px.Latency.Store(int64(latency))
	px.SetAlive(true)
}

func (p *Pool) Alive() int {
	p.mu.RLock()
	defer p.mu.RUnlock()
	count := 0
	for _, px := range p.proxies {
		if px.IsAlive() {
			count++
		}
	}
	return count
}

func (p *Pool) All() []*Proxy {
	p.mu.RLock()
	defer p.mu.RUnlock()
	out := make([]*Proxy, len(p.proxies))
	copy(out, p.proxies)
	return out
}

func (p *Pool) Stats() []ProxyStat {
	all := p.All()
	stats := make([]ProxyStat, len(all))
	for i, px := range all {
		stats[i] = px.Stat()
	}
	return stats
}
