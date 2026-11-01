package client

import (
	"errors"
	"fmt"
)

var (
	ErrInvalidType    = errors.New("invalid type")
	ErrNotImplemented = errors.New("not implemented")
)

type HTTPError struct {
	StatusCode int
	Body       []byte
}

func NewHTTPError(statusCode int, body []byte) *HTTPError {
	return &HTTPError{StatusCode: statusCode, Body: body}
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("%d: %s", e.StatusCode, string(e.Body))
}
