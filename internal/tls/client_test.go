package tlsclient

import (
	"testing"
)

func TestNewClientAllProfiles(t *testing.T) {
	profiles := []ProfileName{
		ProfileChrome,
		ProfileFirefox,
		ProfileSafari,
		ProfileRandom,
	}
	for _, p := range profiles {
		p := p
		t.Run(string(p), func(t *testing.T) {
			t.Parallel()
			client, err := NewClient(p, 10, "")
			if err != nil {
				t.Fatalf("NewClient(%q) error: %v", p, err)
			}
			if client == nil {
				t.Fatalf("NewClient(%q) returned nil client", p)
			}
		})
	}
}

func TestNewClientUnknownProfile(t *testing.T) {
	_, err := NewClient("netscape_4", 10, "")
	if err == nil {
		t.Fatal("expected error for unknown profile, got nil")
	}
}

func TestNewClientWithProxy(t *testing.T) {
	client, err := NewClient(ProfileChrome, 5, "http://127.0.0.1:9999")
	if err != nil {
		t.Fatalf("NewClient with proxy error: %v", err)
	}
	if client == nil {
		t.Fatal("expected non-nil client")
	}
}
