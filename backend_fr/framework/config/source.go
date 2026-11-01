package config

import (
	"context"
)

// SourceFunc is a function that loads configuration values from a source.
type SourceFunc func(ctx context.Context) (map[string]any, error)

// Source represents a configuration source with a name and loading function.
type Source struct {
	name   string
	source SourceFunc
}

// Name returns the name of the configuration source.
func (s Source) Name() string {
	return s.name
}

// Load executes the source function and returns configuration values.
func (s Source) Load(ctx context.Context) (map[string]any, error) {
	return s.source(ctx)
}
