# Framework Libraries

A modular, production-ready Golang framework library set integrated with `uber-go/fx` for dependency injection.

## Overview

This framework provides a set of reusable modules for common infrastructure components, designed to be easily wired together using [Uber Fx](https://github.com/uber-go/fx).

### Included Modules

- **Config**: Flexible configuration loading.
- **Fiber**: High-performance URI web server with production middleware.
- **PostgreSQL**: Connection pooling via `pgxpool` with HA support.
- **Redis**: Universal client support (Standalone/Sentinel/Cluster).
- **RabbitMQ**: AMQP wrapper with automatic connection recovery.

## Installation

```bash
go get framework
```
*Note: Ensure your `go.mod` has the correct replace directive or module path if working in a monorepo.*

## Usage Example

Here is a complete example of how to bootstrap an application using these modules:

```go
package main

import (
    "go.uber.org/fx"
    "github.com/facerec/facerec-be/framework/bunnymq"
    "github.com/facerec/facerec-be/framework/config"
    "github.com/facerec/facerec-be/framework/fiber"
    "github.com/facerec/facerec-be/framework/postgres"
    "github.com/facerec/facerec-be/framework/redis"
)

// Define your application config (maps to environment variables)
type AppConfig struct {
    Postgres postgres.Config `config:",squash"`
    Redis    redis.Config    `config:",squash"`
    RabbitMQ bunnymq.Config  `config:",squash"`
    Fiber    fiber.Config    `config:",squash"`
}

func main() {
    fx.New(
        // 1. Provide Framework Modules
        config.Module,
        postgres.Module,
        redis.Module,
        bunnymq.Module,
        fiber.Module,

        // 2. Supply Configuration Options (e.g. read from APP_ env vars)
        fx.Supply(
            config.WithSources(
                config.EnvSource("APP_", nil),
            ),
        ),

        // 3. Provide Config Loader
        fx.Provide(
            config.ProvideConfig[AppConfig](),
            // Extract sub-configs for modules
            func(cfg *AppConfig) *postgres.Config { return &cfg.Postgres },
            func(cfg *AppConfig) *redis.Config { return &cfg.Redis },
            func(cfg *AppConfig) *bunnymq.Config { return &cfg.RabbitMQ },
            func(cfg *AppConfig) *fiber.Config { return &cfg.Fiber },
        ),

        // 4. Your Application Logic
        fx.Invoke(func(app *fiber.App) {
            app.Get("/", func(c *fiber.Ctx) error {
                return c.SendString("Hello, World!")
            })
        }),
    ).Run()
}
```

## Module Configuration Reference

The framework uses struct tags `config:"..."` to map values. Below are the environment variables required for each module (assuming `APP_` prefix).

### Postgres Module
| Config Field | Env Variable | Description |
| :--- | :--- | :--- |
| `URL` | `APP_POSTGRES_URL` | Connection string. Supports multiple hosts for HA.<br>`postgres://u:p@host1,host2/db?target_session_attrs=read-write` |

### Redis Module
| Config Field | Env Variable | Description |
| :--- | :--- | :--- |
| `Addresses` | `APP_REDIS_ADDRESSES` | Comma-separated list of addresses (e.g. `host1:6379,host2:6379`).<br>Used for Cluster/Sentinel. |
| `Address` | `APP_REDIS_ADDRESS` | Single address (legacy/simple support). |
| `Password` | `APP_REDIS_PASSWORD` | Redis password. |
| `DB` | `APP_REDIS_DB` | Database number (default 0). |

### RabbitMQ Module
| Config Field | Env Variable | Description |
| :--- | :--- | :--- |
| `URLs` | `APP_RABBITMQ_URLS` | Comma-separated list of AMQP URLs for failover.<br>`amqp://u:p@host1:5672/,amqp://u:p@host2:5672/` |
| `URL` | `APP_RABBITMQ_URL` | Single AMQP URL. |

### Fiber Module
| Config Field | Env Variable | Default | Description |
| :--- | :--- | :--- | :--- |
| `AppName` | `APP_APP_NAME` | - | Name of the application. |
| `Port` | `APP_PORT` | - | Port to listen on (e.g. 8080). |
| `ReadTimeout` | `APP_READ_WAIT_TIMEOUT` | `10s` | HTTP Read timeout. |
| `WriteTimeout` | `APP_WRITE_WAIT_TIMEOUT` | `10s` | HTTP Write timeout. |
| `BodyLimit` | `APP_BODY_LIMIT` | `4MB` | Max request body size (bytes). |
| `CORSAllowedOrigins` | `APP_CORS_ALLOWED_ORIGINS` | - | Comma-separated origins for CORS. |
| `EnableCompress` | `APP_ENABLE_COMPRESS` | `false` | Enable Gzip/Brotli compression. |

## Feature Highlights

- **Fiber Production Ready**: automatically includes `Recover`, `Logger` (Zerolog), `RequestID`, `Helmet`, and `CORS` middleware. Uses `goccy/go-json` for high-performance encoding.
- **Graceful Shutdown**: All modules hook into `fx.Lifecycle.OnStop` to close connections gracefully on SIGINT/SIGTERM.
- **Auto-Reconnect**: RabbitMQ module manages a background reconnection loop transparently.
- **Health Checks**: Redis and Postgres modules perform a `Ping` on startup to ensure connectivity.

---
## Configuration System Details

The framework leverages a powerful configuration library. Below are details on how different sources and resolvers work.

### Configuration Sources

#### File Source
Load configuration from files in JSON, YAML, or TOML format:

```go
// JSON configuration
config.FileSource("config.json")
// YAML configuration
config.FileSource("config.yaml")
```

#### Environment Variables
Read environment variables with optional prefix and key mapping:

```go
// Read all APP_* environment variables
config.EnvSource("APP_", config.DefaultEnvMapper())

// Using snake_case to dot notation mapping
config.EnvSource("", config.EnvSnakeCaseMapper())
```

#### HTTP/HTTPS Source
Load configuration from remote endpoints:

```go
config.HTTPSource("https://config.mycorp.com/app/config.json",
    config.WithHTTPHeader("Authorization", "Bearer "+token),
    config.WithHTTPTimeout(10 * time.Second),
)
```

#### Consul KV Store
Load configuration from HashiCorp Consul:

```go
client := config.ConsulClient("http://consul:8500", "")
config.KVSource("myapp/config", client, config.KVDefaultMapper(1))
```

#### Vault Secrets
Load secrets from HashiCorp Vault:

```go
client := config.VaultClient("https://vault:8200", "your-token", "secret")
config.KVSource("myapp/secrets", client, nil)
```

### Value Resolvers

Resolve dynamic configuration values at runtime:

#### Environment Variable Resolver
```json
{ "database_url": "env://DATABASE_URL" }
```
enable with: `config.WithResolvers(config.EnvResolver())`

#### File Resolver
```json
{ "private_key": "file:///etc/secrets/private.pem" }
```
enable with: `config.WithResolvers(config.FileResolver())`

#### Base64 Resolver
```json
{ "secret": "base64://c2VjcmV0LXZhbHVl" }
```
enable with: `config.WithResolvers(config.Base64Resolver())`

#### Vault Resolver
```json
{ "database_password": "vault://database/password" }
```
enable with: `config.WithResolvers(config.VaultResolver("https://vault:8200", "token", "secret", ""))`

### Struct Field Mapping

Use struct tags to map configuration keys to fields:

```go
type Config struct {
    // Direct mapping
    Host string `config:"host"`

    // Nested mapping
    DatabaseURL string `config:"database.url"`

    // Field with different name in config
    DebugMode bool `config:"debug.enabled"`

    // Optional field with default value in struct
    Timeout time.Duration `config:"timeout"`
}
```
