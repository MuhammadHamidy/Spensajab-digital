// Package otel provides an Uber Fx module for OpenTelemetry.
package otel

import (
	"context"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
	"go.uber.org/fx"
)

// Module is the Fx module for OpenTelemetry.
var Module = fx.Module("otel",
	fx.Provide(
		NewTracerProvider,
	),
	fx.Invoke(
		RegisterGlobalTracer,
	),
)

// Config holds configuration for OpenTelemetry.
type Config struct {
	// ServiceName is the name of the service.
	ServiceName string `config:"service_name"`

	// Exporter is the type of exporter to use.
	// Values: "otlp-grpc", "stdout", "noop" (default)
	Exporter string `config:"exporter"`

	// Endpoint is the endpoint for the exporter (e.g. "localhost:4317").
	Endpoint string `config:"endpoint"`

	// Insecure disables TLS for the exporter.
	Insecure bool `config:"insecure"`
}

// Params holds dependencies for creating the TracerProvider.
type Params struct {
	fx.In

	Lifecycle fx.Lifecycle
	Config    *Config
}

// NewTracerProvider creates a new TracerProvider based on the configuration.
func NewTracerProvider(params Params) (*sdktrace.TracerProvider, error) {
	ctx := context.Background()

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName(params.Config.ServiceName),
		),
	)
	if err != nil {
		return nil, err
	}

	var exporter sdktrace.SpanExporter

	switch params.Config.Exporter {
	case "otlp-grpc":
		opts := []otlptracegrpc.Option{
			otlptracegrpc.WithEndpoint(params.Config.Endpoint),
		}
		if params.Config.Insecure {
			opts = append(opts, otlptracegrpc.WithInsecure())
		}
		exporter, err = otlptracegrpc.New(ctx, opts...)
	case "stdout":
		exporter, err = stdouttrace.New(stdouttrace.WithPrettyPrint())
	default:
		// Noop or default
		return nil, nil // Return nil provider if disabled, or handle noop
	}

	if err != nil {
		return nil, err
	}

	if exporter == nil {
		// If no exporter, we can return a no-op provider or nil.
		// For now let's return nil to indicate disabled OTel.
		// However, returning nil might cause issues if other components expect a provider.
		// A better approach might be to return a no-op provider, but sdktrace.NewTracerProvider returns the concrete type.
		// If we don't provide options, it behaves locally.
		// Let's create a provider with no exporter (which basically samples but exports nowhere? or just drop?)
		// Actually, if exporter is nil, let's just return a default provider which does nothing effective or maybe just basic sampling.
		// But to satisfy the type, we do:
		tp := sdktrace.NewTracerProvider(
			sdktrace.WithResource(res),
		)
		return tp, nil
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)

	params.Lifecycle.Append(fx.Hook{
		OnStop: func(ctx context.Context) error {
			return tp.Shutdown(ctx)
		},
	})

	return tp, nil
}

// RegisterGlobalTracer registers the global tracer provider and propagator.
func RegisterGlobalTracer(tp *sdktrace.TracerProvider) {
	if tp == nil {
		return
	}
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))
}
