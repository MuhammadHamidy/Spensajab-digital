package errors

import (
	"fmt"
	"net/http"
)

// ErrorType defines the type of error for categorization.
type ErrorType string

const (
	ErrorTypeValidation   ErrorType = "VALIDATION_ERROR"
	ErrorTypeNotFound     ErrorType = "NOT_FOUND"
	ErrorTypeSystem       ErrorType = "SYSTEM_ERROR"
	ErrorTypeUnauthorized ErrorType = "UNAUTHORIZED_ERROR"
	ErrorTypeConflict     ErrorType = "CONFLICT_ERROR"
)

// AppError represents a standardized application error.
type AppError struct {
	Type    ErrorType `json:"type"`
	Message string    `json:"message"`
	Code    int       `json:"code"`
	Err     error     `json:"-"`
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

// New creates a new AppError.
func New(errType ErrorType, code int, message string, err error) *AppError {
	return &AppError{
		Type:    errType,
		Code:    code,
		Message: message,
		Err:     err,
	}
}

// BadRequest creates a new validation error (HTTP 400).
func BadRequest(message string) *AppError {
	return New(ErrorTypeValidation, http.StatusBadRequest, message, nil)
}

// NotFound creates a new not found error (HTTP 404).
func NotFound(message string) *AppError {
	return New(ErrorTypeNotFound, http.StatusNotFound, message, nil)
}

// InternalServerError creates a new system error (HTTP 500).
func InternalServerError(message string) *AppError {
	return New(ErrorTypeSystem, http.StatusInternalServerError, message, nil)
}

// Unauthorized creates a new unauthorized error (HTTP 401).
func Unauthorized(message string) *AppError {
	return New(ErrorTypeUnauthorized, http.StatusUnauthorized, message, nil)
}

// Conflict creates a new conflict error (HTTP 409).
func Conflict(message string) *AppError {
	return New(ErrorTypeConflict, http.StatusConflict, message, nil)
}

// Wrap adds context to an existing error explicitly, maintaining the original error code if possible.
func Wrap(err error, message string) *AppError {
	if appErr, ok := err.(*AppError); ok {
		return New(appErr.Type, appErr.Code, fmt.Sprintf("%s: %s", message, appErr.Message), appErr.Err)
	}
	return New(ErrorTypeSystem, http.StatusInternalServerError, message, err)
}
