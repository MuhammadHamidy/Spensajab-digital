package config

import (
	"context"
	"fmt"
	"os"
	"strings"
)

// Mapper transforms a source key to a configuration key.
// Returns the new key and a boolean indicating if the key should be included.
type Mapper func(key string) (configKey string, ok bool)

// DefaultEnvMapper converts "EXAMPLE_KEY" to "example.key".
func DefaultEnvMapper() Mapper {
	return func(key string) (string, bool) {
		if key == "" {
			return "", false
		}
		return strings.ReplaceAll(strings.ToLower(key), "_", "."), true
	}
}

// EnvSnakeCaseMapper converts "EXAMPLE_KEY" to "example.key" (first segment grouped).
func EnvSnakeCaseMapper() Mapper {
	return func(key string) (string, bool) {
		if key == "" {
			return "", false
		}
		parts := strings.Split(key, "_")
		if len(parts) == 1 {
			return strings.ToLower(key), true
		}
		head := strings.ToLower(parts[0])
		tail := strings.ToLower(strings.Join(parts[1:], "_"))
		return head + "." + tail, true
	}
}

// EnvSource creates a source that reads from environment variables.
func EnvSource(prefix string, mapper Mapper) Source {
	name := "env"
	if prefix != "" {
		name = fmt.Sprintf("env:%s", prefix)
	}
	return Source{
		name: name,
		source: func(ctx context.Context) (map[string]any, error) {
			results := make(map[string]any)
			for _, kv := range os.Environ() {
				parts := strings.SplitN(kv, "=", 2)
				if len(parts) != 2 {
					continue
				}
				rawKey, rawVal := parts[0], parts[1]

				if prefix != "" {
					if !strings.HasPrefix(rawKey, prefix) {
						continue
					}
					rawKey = strings.TrimPrefix(rawKey, prefix)
				}

				if configKey, ok := mapper(rawKey); ok && configKey != "" {
					results[configKey] = rawVal
				}
			}
			return results, nil
		},
	}
}
