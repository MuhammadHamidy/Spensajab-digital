// Package config provides a flexible configuration loading library with support for
// multiple sources (files, environment variables, HTTP, Consul, Vault) and
// value resolvers for secrets and external references.
//
// Example usage:
//
//	type Config struct {
//		DatabaseURL string `config:"database.url"`
//		APIKey      string `config:"api.key"`
//	}
//
//	var cfg Config
//	err := config.ReadInConfig(context.Background(), &cfg,
//		config.WithSources(
//			config.FileSource("config.json"),
//			config.EnvSource("APP_", config.DefaultEnvMapper()),
//		),
//		config.WithResolvers(
//			config.EnvResolver(),
//			config.FileResolver(),
//		),
//	)
package config

import (
	"context"

	"github.com/pkg/errors"

	"github.com/mitchellh/mapstructure"
)

// LoaderConfig holds the configuration for loading config values.
type LoaderConfig struct {
	resolvers []Resolver
	sources   []Source
}

// ConfigOption is a functional option for configuring the config loader.
type ConfigOption func(*LoaderConfig)

// WithSources adds configuration sources to the loader.
func WithSources(sources ...Source) ConfigOption {
	return func(cfg *LoaderConfig) {
		cfg.sources = append(cfg.sources, sources...)
	}
}

// WithResolvers adds value resolvers to the loader.
// Resolvers are applied to string values in the order they are provided.
// Each resolver attempts to resolve values that match its scheme.
//
// Supported resolvers:
//   - EnvResolver: resolves "env://VARIABLE_NAME"
//   - FileResolver: resolves "file:///path/to/file"
//   - Base64Resolver: resolves "base64://ENCODED_VALUE"
//   - VaultResolver: resolves "vault://secret/path"
//
// Example:
//
//	config.WithResolvers(
//		config.EnvResolver(),
//		config.FileResolver(),
//		config.VaultResolver("https://vault:8200", "token", "secret", "myapp/"),
//	)
func WithResolvers(resolvers ...Resolver) ConfigOption {
	return func(cfg *LoaderConfig) {
		cfg.resolvers = append(cfg.resolvers, resolvers...)
	}
}

// ReadInConfig loads configuration from the provided sources into the target struct.
// The target must be a pointer to a struct. Configuration values are mapped to
// struct fields using the "config" tag (defaults to field name if not specified).
//
// The function applies resolvers to string values that contain resolver schemes
// (e.g., "env://VAR", "file:///path", "vault://secret").
//
// Parameters:
//   - ctx: Context for cancellation and timeouts
//   - arg: Pointer to the target struct to load configuration into
//   - opts: Functional options for configuring sources and resolvers
//
// Returns:
//   - error: Any error encountered during loading or resolving
//
// Example:
//
//	type Config struct {
//		DatabaseURL string `config:"database.url"`
//		SecretKey   string `config:"secret.key"`
//	}
//
//	var cfg Config
//	err := config.ReadInConfig(context.Background(), &cfg,
//		config.WithSources(config.FileSource("config.json")),
//		config.WithResolvers(config.EnvResolver()),
//	)
func ReadInConfig[T any](ctx context.Context, arg *T, opts ...ConfigOption) error {
	if arg == nil {
		return ErrInvalidTarget
	}

	var cfg LoaderConfig
	for _, opt := range opts {
		opt(&cfg)
	}

	if len(cfg.sources) == 0 {
		return ErrNoSource
	}

	return readFromSources(ctx, arg, cfg)
}

func readFromSources[T any](ctx context.Context, arg *T, options LoaderConfig) error {
	values := make(map[string]any)
	for _, source := range options.sources {
		sourceValues, err := source.source(ctx)
		if err != nil {
			return errors.Wrapf(err, "failed to load source %q config", source.name)
		}

		for k, v := range sourceValues {
			values[k] = v
		}
	}

	return resolveSources(ctx, arg, values, options)
}

func resolveSources[T any](ctx context.Context, arg *T, sources map[string]any, options LoaderConfig) error {
	if options.resolvers == nil {
		options.resolvers = []Resolver{}
	}

	for k, v := range sources {
		str, ok := v.(string)
		if ok {
			resolveStr, err := Resolve(ctx, str, options.resolvers...)
			if err != nil {
				return errors.Wrapf(err, "failed to resolve config key %s", k)
			}

			sources[k] = resolveStr
		}
	}

	return decodeSources(arg, sources)
}

func decodeSources[T any](arg *T, sources map[string]any) error {
	decodeConfig := &mapstructure.DecoderConfig{
		TagName:          "config",
		Result:           arg,
		WeaklyTypedInput: true,
		DecodeHook: mapstructure.ComposeDecodeHookFunc(
			mapstructure.StringToTimeDurationHookFunc(),
			mapstructure.StringToSliceHookFunc(","),
		),
	}

	decoder, err := mapstructure.NewDecoder(decodeConfig)
	if err != nil {
		return errors.Wrap(err, "failed to new decoder")
	}

	err = decoder.Decode(sources)
	if err != nil {
		return errors.Wrap(err, "failed to decode sources")
	}

	return nil
}
