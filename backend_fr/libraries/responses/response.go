package responses

// Response represents a standard API response container.
type Response[T any] struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Data    T      `json:"data,omitempty"`
	Error   *Error `json:"error,omitempty"`
	Meta    *Meta  `json:"meta,omitempty"`
}

// Error represents standard error details.
type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Meta represents pagination or other metadata.
type Meta struct {
	Page       int   `json:"page"`
	Size       int   `json:"size"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

// Success creates a success response.
func Success[T any](data T, message string) Response[T] {
	return Response[T]{
		Success: true,
		Message: message,
		Data:    data,
	}
}

// SuccessWithMeta creates a success response with metadata (e.g. pagination).
func SuccessWithMeta[T any](data T, message string, meta *Meta) Response[T] {
	return Response[T]{
		Success: true,
		Message: message,
		Data:    data,
		Meta:    meta,
	}
}

// Fail creates an error response.
func Fail(code string, message string) Response[any] {
	return Response[any]{
		Success: false,
		Error: &Error{
			Code:    code,
			Message: message,
		},
	}
}
