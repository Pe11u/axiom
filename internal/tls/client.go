package tlsclient

import (
	"errors"
	"math/rand"

	tls_client "github.com/bogdanfinn/tls-client"
	"github.com/bogdanfinn/tls-client/profiles"
)

type ProfileName string

const (
	ProfileChrome  ProfileName = "chrome_146"
	ProfileFirefox ProfileName = "firefox_135"
	ProfileSafari  ProfileName = "safari_16"
	ProfileRandom  ProfileName = "random"
)

var randomPool = []profiles.ClientProfile{
	profiles.Chrome_146,
	profiles.Chrome_133,
	profiles.Firefox_135,
	profiles.Firefox_132,
	profiles.Safari_16_0,
	profiles.Brave_146,
}

func NewClient(profile ProfileName, timeoutSecs int, proxyURL string) (tls_client.HttpClient, error) {
	p, err := resolveProfile(profile)
	if err != nil {
		return nil, err
	}

	opts := []tls_client.HttpClientOption{
		tls_client.WithClientProfile(p),
		tls_client.WithTimeoutSeconds(timeoutSecs),
		tls_client.WithRandomTLSExtensionOrder(),
		tls_client.WithNotFollowRedirects(),
		tls_client.WithCookieJar(tls_client.NewCookieJar()),
	}
	if proxyURL != "" {
		opts = append(opts, tls_client.WithProxyUrl(proxyURL))
	}

	return tls_client.NewHttpClient(tls_client.NewNoopLogger(), opts...)
}

func resolveProfile(name ProfileName) (profiles.ClientProfile, error) {
	switch name {
	case ProfileChrome:
		return profiles.Chrome_146, nil
	case ProfileFirefox:
		return profiles.Firefox_135, nil
	case ProfileSafari:
		return profiles.Safari_16_0, nil
	case ProfileRandom:
		return randomPool[rand.Intn(len(randomPool))], nil
	default:
		return profiles.ClientProfile{}, errors.New("unknown TLS profile: " + string(name))
	}
}
