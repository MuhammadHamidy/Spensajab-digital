// Package logger provides a centralized logger configuration using Zerolog.
// It includes hooks for injecting OpenTelemetry TraceID and SpanID.
package logger

import (
	"fmt"
	"os"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/fx"
)

// Module is the Fx module for Logger.
var Module = fx.Module("logger",
	fx.Invoke(
		Configure,
	),
)

// Config holds configuration for the Logger.
type Config struct {
	// Level is the logging level (debug, info, warn, error).
	Level string `config:"log_level"`

	// Format is the logging format (json, console).
	Format string `config:"log_format"`
}

// TracingHook is a zerolog hook that injects trace_id and span_id from the context.
type TracingHook struct{}

func (h TracingHook) Run(e *zerolog.Event, level zerolog.Level, msg string) {
	ctx := e.GetCtx()
	if ctx == nil {
		return
	}

	span := trace.SpanFromContext(ctx)
	if !span.IsRecording() {
		return
	}

	spanContext := span.SpanContext()
	if spanContext.HasTraceID() {
		e.Str("trace_id", spanContext.TraceID().String())
	}
	if spanContext.HasSpanID() {
		e.Str("span_id", spanContext.SpanID().String())
	}
}

// Configure sets up the global zerolog logger.
func Configure(cfg *Config) {
	level, err := zerolog.ParseLevel(cfg.Level)
	if err != nil {
		level = zerolog.InfoLevel
	}
	zerolog.SetGlobalLevel(level)

	// Default to JSON
	var logger zerolog.Logger

	if cfg.Format == "console" {
		logger = zerolog.New(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: "2006-01-02 15:04:05"}).
			With().
			Timestamp().
			Caller().
			Logger()
	} else {
		// JSON format
		logger = zerolog.New(os.Stdout).
			With().
			Timestamp().
			Caller().
			Logger()
	}

	// Customize the caller marshal function to show file name and line number
	zerolog.CallerMarshalFunc = func(pc uintptr, file string, line int) string {
		return fmt.Sprintf("%s:%d", file, line)
	}

	// Add Tracing Hook
	logger = logger.Hook(TracingHook{})

	// Set global logger
	log.Logger = logger

	// Set DefaultContextLogger to allow zerolog.Ctx(ctx) to work effectively if middleware attaches it
	zerolog.DefaultContextLogger = &logger
}
