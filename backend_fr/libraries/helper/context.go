package helper

import (
	"context"
	"strings"

	"github.com/google/uuid"
)

type contextKey struct{}

var traceIDKey = contextKey{}

// GetTraceID retrieves the trace ID from the context.
// If not found, it generates a new one.
func GetTraceID(ctx context.Context) string {
	if val, ok := ctx.Value(traceIDKey).(string); ok {
		return val
	}
	return strings.ReplaceAll(uuid.NewString(), "-", "")
}

// WithTraceID returns a new context with the given trace ID.
func WithTraceID(ctx context.Context, traceID string) context.Context {
	return context.WithValue(ctx, traceIDKey, traceID)
}
