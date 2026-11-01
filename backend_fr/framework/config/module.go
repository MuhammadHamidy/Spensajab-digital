// Package config provides integration with the Uber Fx framework for loading configuration.
// It includes all the core configuration logic (Loader, Sources, Resolvers) locally.
package config

import (
	"context"

	"go.uber.org/fx"
)

// Module is the Fx module for configuration.
// It provides a Loader that can be customized with sources and resolvers.
var Module = fx.Module("config",
	fx.Provide(
		NewLoader,
	),
)

// Loader holds the configuration options (sources and resolvers) for loading values.
// It allows for deferred loading and customization within the Fx lifecycle.
type Loader struct {
	opts []ConfigOption
}

type LoaderParams struct {
	fx.In
	Options []ConfigOption `group:"config_options"`
}

// NewLoader creates a new configuration Loader instance with empty options.
// Use WithOptions to add sources and resolvers.
func NewLoader(params LoaderParams) *Loader {
	return &Loader{
		opts: params.Options,
	}
}

// WithOptions appends configuration options (sources, resolvers, etc.) to the loader.
// It returns the Loader instance for chaining.
func (l *Loader) WithOptions(opts ...ConfigOption) *Loader {
	l.opts = append(l.opts, opts...)
	return l
}

// ProvideConfig creates an Fx provider that reads configuration into a struct type T.
// T must be a struct with "config" tags.
//
// The provider will:
// 1. Use opportunities from the Loader (sources, resolvers).
// 2. If no sources are present, default to loading from environment variables.
// 3. Decode the values into a new instance of T.
// 4. Return *T to the Fx container.
func ProvideConfig[T any]() any {
	return func(loader *Loader) (*T, error) {
		var cfg T

		// If no sources configured, add default Env source to avoid error
		opts := loader.opts
		if len(opts) == 0 {
			opts = append(opts, WithSources(EnvSource("", DefaultEnvMapper())))
		}

		err := ReadInConfig(context.Background(), &cfg, opts...)
		if err != nil {
			return nil, err
		}
		return &cfg, nil
	}
}
