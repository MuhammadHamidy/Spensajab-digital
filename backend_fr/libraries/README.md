# Shared Libraries

This directory contains shared libraries and utilities used across the `github.com/facerec/facerec-be/facerec` application. These libraries provide standardized implementations for common patterns, error handling, logging, and infrastructure integrations.

## Modules

### 1. Consumer (`libraries/consumer`)
Wraps RabbitMQ consumer logic using `framework/bunnymq`.
- **Features**: Auto-reconnect, QoS configuration, Graceful shutdown.
- **Usage**: See `messaging.Consume` in feature modules.

### 2. Errors (`libraries/errors`)
Provides standardized application error types for consistent error handling and HTTP status mapping.
- **Types**: `AppError`
- **Helpers**: `BadRequest`, `NotFound`, `InternalServerError`, `Unauthorized`, `Conflict`.

### 3. Helper (`libraries/helper`)
Utilities for context management and observability.
- **Trace ID**: `WithTraceID`, `GetTraceID` for Request ID propagation.
- **Logging**: `Logger(ctx)` to retrieve contextual `zerolog` loggers.

### 4. Object (`libraries/object`)
Utilities for object transformation and mapping.
- **Features**: Tag-based struct mapping (e.g., mapping database entities to domain objects via struct tags).

### 5. Publisher (`libraries/publisher`)
Wraps RabbitMQ publisher logic.
- **Features**: Publishes events with trace IDs.

### 6. Responses (`libraries/responses`)
Standardized HTTP JSON response structures.
- **Success**: `Success(data, message)`, `SuccessWithMeta(data, message, meta)`.
- **Fail**: `Fail(code, message)`.
- **Meta**: Pagination metadata structure.

### 7. Types (`libraries/types`)
Common data types shared across the system.
- **Pagination**: Standard pagination request structure (`Page`, `Size`).

## Usage

Import these packages into your modules to ensure consistency across the application.

```go
import (
    "github.com/facerec/facerec-be/libraries/errors"
    "github.com/facerec/facerec-be/libraries/responses"
    // ...
)
```
