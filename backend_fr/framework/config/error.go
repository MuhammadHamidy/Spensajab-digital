// Package config defines error types used throughout the configuration library.
// These errors provide structured error information with context about
// what went wrong during configuration loading or resolution.
//
// Error Types:
//   - HTTPError: For HTTP-related errors with status codes
//   - SourceError: For errors from specific configuration sources
//   - ValidationError: For input validation failures
//   - ConfigError: For general configuration errors
package config

import (
	"errors"
	"fmt"
)

var (
	// ErrInvalidPath is returned when a file path is invalid or unsafe
	ErrInvalidPath = errors.New("invalid path")

	// ErrInvalidFileFormat is returned when a file has an unsupported format
	ErrInvalidFileFormat = errors.New("invalid file format")

	// ErrInvalidTarget is returned when the configuration target is invalid
	ErrInvalidTarget = errors.New("invalid target")

	// ErrNotFound is returned when a requested resource is not found
	ErrNotFound = errors.New("not found")

	// ErrInvalidResolver is returned when a resolver doesn't recognize the value
	ErrInvalidResolver = errors.New("invalid resolver")

	// ErrNoSource is returned when no configuration sources are provided
	ErrNoSource = errors.New("no source")
)

// HTTPError represents an HTTP error response with status code and message.
// This is used when HTTP sources return non-200 status codes.
type HTTPError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// NewHTTPError creates a new HTTP error with the given status code and message.
//
// Parameters:
//   - code: HTTP status code (e.g., 404, 500)
//   - message: Optional error message
//
// Returns:
//   - *HTTPError: A new HTTP error instance
//
// Example:
//	err := config.NewHTTPError(404, "Configuration not found")
func NewHTTPError(code int, message string) *HTTPError {
	return &HTTPError{Code: code, Message: message}
}

// Error returns a string representation of the HTTP error.
func (e *HTTPError) Error() string {
	return fmt.Sprintf("HTTP error: code=%d, message=%s", e.Code, e.Message)
}

// SourceError represents an error from a specific configuration source.
// It includes the source name for debugging and error tracking.
type SourceError struct {
	Source string
	Err    error
}

// Error returns a string representation of the source error.
func (e *SourceError) Error() string {
	return fmt.Sprintf("source %q: %v", e.Source, e.Err)
}

// Unwrap returns the underlying error for error inspection.
func (e *SourceError) Unwrap() error {
	return e.Err
}

// NewSourceError creates a new source error with the given source name and error.
//
// Parameters:
//   - source: Name of the configuration source (e.g., "file:config.json")
//   - err: The underlying error that occurred
//
// Returns:
//   - *SourceError: A new source error instance
//
// Example:
//	err := config.NewSourceError("env:APP_", os.ErrNotExist)
func NewSourceError(source string, err error) *SourceError {
	return &SourceError{
		Source: source,
		Err:    err,
	}
}

// ValidationError represents a configuration input validation error.
// It includes the field name, invalid value, and error message.
type ValidationError struct {
	Field   string
	Value   any
	Message string
}

// Error returns a string representation of the validation error.
func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation failed for field %q: %s", e.Field, e.Message)
}

// NewValidationError creates a new validation error.
//
// Parameters:
//   - field: Name of the field that failed validation
//   - message: Description of the validation failure
//   - value: The invalid value (optional, can be nil)
//
// Returns:
//   - *ValidationError: A new validation error instance
//
// Example:
//	err := config.NewValidationError("url", "must be absolute", "relative/path")
func NewValidationError(field, message string, value any) *ValidationError {
	return &ValidationError{
		Field:   field,
		Value:   value,
		Message: message,
	}
}

// ConfigError represents a general configuration operation error.
// It includes the operation name and the underlying error.
type ConfigError struct {
	Operation string
	Err       error
}

// Error returns a string representation of the config error.
func (e *ConfigError) Error() string {
	return fmt.Sprintf("config %s failed: %v", e.Operation, e.Err)
}

// Unwrap returns the underlying error for error inspection.
func (e *ConfigError) Unwrap() error {
	return e.Err
}

// NewConfigError creates a new config error for a specific operation.
//
// Parameters:
//   - operation: Name of the operation that failed (e.g., "load", "resolve")
//   - err: The underlying error that occurred
//
// Returns:
//   - *ConfigError: A new config error instance
//
// Example:
//	err := config.NewConfigError("decode", mapstructure.Err("invalid type"))
func NewConfigError(operation string, err error) *ConfigError {
	return &ConfigError{
		Operation: operation,
		Err:       err,
	}
}
