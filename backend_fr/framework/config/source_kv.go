package config

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/pkg/errors"
	"github.com/tidwall/gjson"
)

// KVClient is a function that fetches configuration from a KV store.
type KVClient func(ctx context.Context, key string) (map[string]any, error)

// KVDefaultMapper maps nested keys by dropping segments.
func KVDefaultMapper(dropSegments int) Mapper {
	return func(key string) (string, bool) {
		if key == "" {
			return "", false
		}
		parts := strings.Split(key, "/")
		if len(parts) <= dropSegments {
			return "", false
		}
		parts = parts[dropSegments:]
		return strings.ToLower(strings.Join(parts, ".")), true
	}
}

// KVSource creates a source that reads from a Key-Value store.
func KVSource(prefix string, client KVClient, mapper Mapper) Source {
	name := "kv"
	if prefix != "" {
		name = fmt.Sprintf("kv:%s", prefix)
	}
	return Source{
		name: name,
		source: func(ctx context.Context) (map[string]any, error) {
			data, err := client(ctx, prefix)
			if err != nil {
				return nil, err
			}
			result := make(map[string]any)
			for k, v := range data {
				if prefix != "" && strings.HasPrefix(k, prefix) {
					k = strings.TrimPrefix(k, prefix)
					k = strings.TrimLeft(k, "/.")
				}
				if mapper != nil {
					if mk, ok := mapper(k); ok && mk != "" {
						k = mk
					} else {
						// Mapper returned false, skip? Original code kept if empty?
						// Original: if !ok || key == "" { return sourceKey } (logic was tricky in original)
						// Let's stick to simple: if mapped, use it.
						// The original `kvMapPrefix` logic was: map, if missing/empty -> keep original?
						// Actually original `kvMapPrefix` returns `sourceKey` if mapper fails/returns empty.
						// So we keep original behavior.
					}
				}
				if k != "" {
					result[k] = v
				}
			}
			return result, nil
		},
	}
}

// ConsulClient creates a KVClient for Consul.
func ConsulClient(baseURL, token string) KVClient {
	if err := validateConsulBaseURL(baseURL); err != nil {
		return func(_ context.Context, _ string) (map[string]any, error) {
			return nil, err
		}
	}
	baseURL = strings.TrimRight(baseURL, "/")

	return func(ctx context.Context, key string) (map[string]any, error) {
		if key == "" {
			return nil, errors.New("key cannot be empty")
		}
		url := fmt.Sprintf("%s/v1/kv/%s?recurse=true", baseURL, strings.TrimLeft(key, "/"))

		var opts []HTTPOption
		if token != "" {
			opts = append(opts, WithHTTPHeader("X-Consul-Token", token))
		}

		raw, err := fetch(ctx, url, opts...)
		if err != nil {
			if errors.Is(err, ErrNotFound) {
				return map[string]any{}, nil
			}
			return nil, err
		}

		var items []struct {
			Key   string `json:"Key"`
			Value string `json:"Value"`
		}
		if err := json.Unmarshal(raw, &items); err != nil {
			return nil, err
		}

		out := make(map[string]any)
		for _, it := range items {
			val, err := base64.StdEncoding.DecodeString(it.Value)
			if err != nil {
				return nil, errors.Wrapf(err, "decode consul key %s", it.Key)
			}
			out[it.Key] = string(val)
		}
		return out, nil
	}
}

func validateConsulBaseURL(baseURL string) error {
	if baseURL == "" {
		return errors.New("empty baseURL")
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		return errors.Wrap(err, "invalid baseURL")
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return errors.New("baseURL must be http or https")
	}
	return nil
}

// VaultClient creates a KVClient for Vault (KV v2).
func VaultClient(baseUrl, token, mountPath string) KVClient {
	return func(ctx context.Context, key string) (map[string]any, error) {
		url := fmt.Sprintf("%s/v1/%s/data/%s", baseUrl, mountPath, strings.TrimLeft(key, "/"))

		var opts []HTTPOption
		if token != "" {
			opts = append(opts, WithHTTPHeader("X-Vault-Token", token))
		}

		raw, err := fetch(ctx, url, opts...)
		if err != nil {
			if errors.Is(err, ErrNotFound) {
				return make(map[string]any), nil
			}
			return nil, err
		}

		res := gjson.GetBytes(raw, "data")
		if !res.Exists() {
			return make(map[string]any), nil
		}

		out := make(map[string]any)
		// Vault KV v2 wrappers 'data' inside 'data'
		res.ForEach(func(k, v gjson.Result) bool {
			out[k.String()] = v.Value()
			return true
		})
		return out, nil
	}
}
