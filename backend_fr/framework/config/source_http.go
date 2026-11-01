package config

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"github.com/pkg/errors"
)

const (
	DefaultHTTPTimeout   = 5 * time.Second
	DefaultHTTPRetry     = 3
	DefaultHTTPRetryWait = 300 * time.Millisecond
)

var DefaultHTTPSetting = &HTTPSetting{
	timeout:   DefaultHTTPTimeout,
	retry:     DefaultHTTPRetry,
	retryWait: DefaultHTTPRetryWait,
}

type HTTPSetting struct {
	url       string
	headers   http.Header
	timeout   time.Duration
	tlsConfig *tls.Config
	retry     int
	retryWait time.Duration
}

type HTTPOption func(*HTTPSetting)

// WithHTTPHeader adds a header to the request.
func WithHTTPHeader(key, value string) HTTPOption {
	return func(h *HTTPSetting) {
		if h.headers == nil {
			h.headers = make(http.Header)
		}
		h.headers.Set(key, value)
	}
}

// WithHTTPHeaders adds multiple headers to the request.
func WithHTTPHeaders(args map[string]string) HTTPOption {
	return func(h *HTTPSetting) {
		if h.headers == nil {
			h.headers = make(http.Header)
		}
		for k, v := range args {
			h.headers.Set(k, v)
		}
	}
}

// WithHTTPTimeout sets the request timeout.
func WithHTTPTimeout(d time.Duration) HTTPOption {
	return func(h *HTTPSetting) {
		h.timeout = d
	}
}

// WithHTTPTLSConfig sets the TLS config.
func WithHTTPTLSConfig(cfg *tls.Config) HTTPOption {
	return func(h *HTTPSetting) {
		h.tlsConfig = cfg
	}
}

// WithHTTPRetry configures retry behavior.
func WithHTTPRetry(count int, wait time.Duration) HTTPOption {
	return func(h *HTTPSetting) {
		h.retry = count
		h.retryWait = wait
	}
}

// HTTPSource fetches configuration from a URL.
func HTTPSource(urlStr string, opts ...HTTPOption) Source {
	return Source{
		name: fmt.Sprintf("http:%s", urlStr),
		source: func(ctx context.Context) (map[string]any, error) {
			if err := validateURL(urlStr); err != nil {
				return nil, errors.Wrapf(err, "invalid URL %q", urlStr)
			}

			_, file := filepath.Split(urlStr)
			ext := strings.ToLower(filepath.Ext(file))

			resp, err := fetch(ctx, urlStr, opts...)
			if err != nil {
				return nil, err
			}

			return extUnmarshalling(ext, resp)
		},
	}
}

func validateURL(urlStr string) error {
	if urlStr == "" {
		return errors.New("URL cannot be empty")
	}
	u, err := url.Parse(urlStr)
	if err != nil {
		return errors.Wrap(err, "failed to parse URL")
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return errors.Errorf("scheme %q not allowed", u.Scheme)
	}
	if u.Host == "" {
		return errors.New("URL must include a host")
	}
	return nil
}

func fetch(ctx context.Context, url string, opts ...HTTPOption) ([]byte, error) {
	var cfg = *DefaultHTTPSetting
	cfg.url = url
	for _, opt := range opts {
		opt(&cfg)
	}

	call := func(ctx context.Context, cfg *HTTPSetting) ([]byte, error) {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, cfg.url, nil)
		if err != nil {
			return nil, err
		}

		client := &http.Client{Timeout: cfg.timeout}
		if cfg.tlsConfig != nil {
			client.Transport = &http.Transport{TLSClientConfig: cfg.tlsConfig}
		}

		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			if resp.StatusCode == http.StatusNotFound {
				return nil, ErrNotFound
			}
			return nil, NewHTTPError(resp.StatusCode, resp.Status)
		}
		return io.ReadAll(resp.Body)
	}

	var resp []byte
	var err error

	for attempt := 0; attempt < cfg.retry; attempt++ {
		if err = ctx.Err(); err != nil {
			return nil, err
		}

		resp, err = call(ctx, &cfg)
		if err == nil {
			return resp, nil
		}

		if attempt < cfg.retry-1 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(cfg.retryWait):
			}
		}
	}
	return nil, err
}
