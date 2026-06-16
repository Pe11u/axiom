package proxy

import (
	"testing"
	"time"
)

func makePool(mode RotationMode, lines []string) *Pool {
	p := NewPool(mode)
	_ = p.LoadFromLines(lines)
	return p
}

func TestRoundRobinRotation(t *testing.T) {
	proxies := []string{
		"http://1.1.1.1:8080",
		"http://2.2.2.2:8080",
		"http://3.3.3.3:8080",
	}
	pool := makePool(RoundRobin, proxies)

	seen := map[string]int{}
	for i := 0; i < 9; i++ {
		px, err := pool.Next()
		if err != nil {
			t.Fatalf("iteration %d: unexpected error: %v", i, err)
		}
		seen[px.Host]++
	}
	for _, h := range []string{"1.1.1.1", "2.2.2.2", "3.3.3.3"} {
		if seen[h] != 3 {
			t.Errorf("host %s appeared %d times, want 3", h, seen[h])
		}
	}
}

func TestDeadProxiesSkipped(t *testing.T) {
	proxies := []string{
		"http://1.1.1.1:8080",
		"http://2.2.2.2:8080",
		"http://3.3.3.3:8080",
		"http://4.4.4.4:8080",
		"http://5.5.5.5:8080",
	}
	pool := makePool(RoundRobin, proxies)

	all := pool.All()
	pool.MarkDead(all[0])
	pool.MarkDead(all[1])

	for i := 0; i < 20; i++ {
		px, err := pool.Next()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !px.IsAlive() {
			t.Fatalf("returned dead proxy %s", px.Host)
		}
		if px.Host == "1.1.1.1" || px.Host == "2.2.2.2" {
			t.Fatalf("returned dead proxy %s", px.Host)
		}
	}
}

func TestAllDeadReturnsError(t *testing.T) {
	pool := makePool(RoundRobin, []string{"http://1.1.1.1:8080"})
	pool.MarkDead(pool.All()[0])
	_, err := pool.Next()
	if err != ErrNoAliveProxy {
		t.Fatalf("want ErrNoAliveProxy, got %v", err)
	}
}

func TestMarkAliveRestoresProxy(t *testing.T) {
	pool := makePool(RoundRobin, []string{"http://1.1.1.1:8080"})
	px := pool.All()[0]
	pool.MarkDead(px)
	pool.MarkAlive(px, 10*time.Millisecond)
	got, err := pool.Next()
	if err != nil {
		t.Fatalf("unexpected error after revive: %v", err)
	}
	if !got.IsAlive() {
		t.Fatal("proxy should be alive after MarkAlive")
	}
}

func TestRandomMode(t *testing.T) {
	proxies := []string{
		"http://1.1.1.1:8080",
		"http://2.2.2.2:8080",
		"http://3.3.3.3:8080",
	}
	pool := makePool(Random, proxies)
	seen := map[string]bool{}
	for i := 0; i < 100; i++ {
		px, err := pool.Next()
		if err != nil {
			t.Fatalf("iteration %d error: %v", i, err)
		}
		seen[px.Host] = true
	}
	for _, h := range []string{"1.1.1.1", "2.2.2.2", "3.3.3.3"} {
		if !seen[h] {
			t.Errorf("host %s never selected in 100 random calls", h)
		}
	}
}
