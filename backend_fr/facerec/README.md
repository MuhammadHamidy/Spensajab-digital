# facerec Backend - IAM Service

**facerec** is the central Identity and Access Management (IAM) microservice for the SiAKUP platform. It provides comprehensive user management, role-based access control (RBAC), permission management, and authentication flows via OpenID Connect (OIDC) Identity Provider integration.

## Features

*   **User Management**: Sync user data from IDP, manage user status.
*   **RBAC**: Manage Roles and Permissions. Assign roles to users.
*   **IDP Integration**: Handle authentication redirects and session creation.
*   **Health Checks**: Production-grade Liveness (`/health/livez`) and Readiness (`/health/readyz`) probes.
*   **Observability**: Integrated OpenTelemetry tracing and structured logging.

## Project Structure

```text
facerec/
├── cmd/            # Application entry points (serve, etc.)
├── config/         # Configuration structs and providers
├── docs/           # OpenAPI specifications & technical documentation
├── migrations/     # Database migration scripts (26+ migrations)
├── module/         # Domain modules (Clean Architecture)
│   ├── users/      # User management & synchronization
│   ├── roles/      # Roles & Permissions (RBAC)
│   ├── domains/    # Domain configuration
│   ├── redirect/   # OAuth/OIDC redirect flow
│   ├── shift_sessions/    # Shift scheduling
│   ├── shift_groups/      # Shift group management
│   └── severity_levels/   # Classification levels
├── tests/          # Integration & unit tests
├── version/        # Version information
├── Dockerfile      # Multi-stage Go build
├── Makefile
└── main.go
```

## Tech Stack

*   **Language**: Go 1.25+
*   **Frameworks**:
    *   [Fiber](https://gofiber.io/) (Web Framework)
    *   [Fx](https://go.uber.org/fx) (Dependency Injection)
*   **Storage**: PostgreSQL (Primary DB), Redis (Cache/Session).
*   **Configuration**: HashiCorp Consul (KV).

## Prerequisites

*   Go 1.23+
*   Docker & Docker Compose
*   Postgres
*   Redis
*   Consul (for configuration)

## API Documentation

The API is documented using OpenAPI 3.0.

*   **Spec File**: [docs/openapi.yaml](docs/openapi.yaml)
*   User Swagger UI or Postman to view and test the endpoints.

## Configuration

This service uses a **3-Layer Configuration Strategy**:
1.  **Environment Variables**: Highest priority, overrides everything.
2.  **Consul KV**: Primary dynamic configuration.
3.  **Config File**: Fallback/Base configuration (`config/config.json`).

### Key Environment Variables

| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `APP_ENV` | Environment name (dev, staging, prod). Determines Consul prefix. | Yes | `dev` |
| `CONSUL_HTTP_ADDR` | Address of the Consul agent. | Yes (if using Consul) | - |
| `CONSUL_HTTP_TOKEN` | Access token for Consul ACLs. | No | - |

### Consul Structure
Keys are stored at: `config/users/<APP_ENV>/...`

Example for `dev`:
- `config/users/dev/database/host` -> Maps to `Database.Host`
- `config/users/dev/redis/addr` -> Maps to `Redis.Addr`

### Configuration Examples

#### 1. File Configuration (config/config.json)
Place this file in the `facerec/config/` directory.

```json
{
  "app_name": "presdig",
  "port": 8080,
  "log_level": "info",
  "postgres_url": "postgres://user:pass@postgres:5432/presdig",
  "redis_address": "redis:6379",
  "redirectUrl": "http://localhost:3000/callback"
}
```

#### 2. Consul Configuration (Dynamic Non-Sensitive)
Use Consul for application behavior that might change at runtime or shared configuration. **Avoid storing secrets (passwords) here unless using Vault.**

```bash
# Set Log Level (Runtime adjustable)
consul kv put config/facerec/dev/log_level debug

# Set Redirect URL (Business Logic)
consul kv put config/facerec/dev/redirectUrl "http://staging-dashboard.com/callback"

# Set Body Limit
consul kv put config/facerec/dev/body_limit 10485760
```

### 3. Environment Variables (Infrastructure & Secrets)
Use Environment Variables for infrastructure binding (Ports) and sensitive credentials (DB Passwords), typically injected by your orchestrator (Docker/K8s).

```bash
# Infrastructure Binding
export APP_PORT=8080

# Sensitive Connection String (Contains Password)
export APP_POSTGRES_URL="postgres://user:supersecret@db-prod:5432/presdig"

# Redis Address (Infrastructure)
export APP_REDIS_ADDRESS="redis-prod:6379"
```

## Advanced Configuration Features

The configuration framework supports **Resolvers** and **Bootstrapping** which allows for powerful dynamic configuration patterns.

### 1. Bootstrapping Consul connection
To enable the application to read from Consul on startup, you must provide connection details via standard environment variables.

```bash
# Required: Address of the Consul agent
export CONSUL_HTTP_ADDR=http://localhost:8500

# Optional: ACL Token if your Consul cluster has ACLs enabled
export CONSUL_HTTP_TOKEN=your-secure-acl-token
```

### 2. Value Resolvers
Configuration values can be references to other data sources using special schemes. This allows you to keep your config files static (or committed to git) while fetching sensitive or dynamic data at runtime.

#### A. Environment Variable Reference (`env://`)
Useful for referring to credentials injected by the platform (e.g., K8s Secrets).

**In `config.json` or Consul:**
```json
{
  "database_password": "env://DB_PASSWORD"
}
```
**At Runtime:** The application reads the value of the `DB_PASSWORD` environment variable.

#### B. File Reference (`file://`)
Useful for reading content of mounted files (e.g., TLS certificates).

**In `config.json` or Consul:**
```json
{
  "tls_cert": "file:///etc/certs/server.crt"
}
```
**At Runtime:** The application reads the contents of `/etc/certs/server.crt` and uses it as the value.

#### C. Vault Secret Reference (`vault://`)
Directly fetch secrets from HashiCorp Vault.

**In `config.json` or Consul:**
```json
{
  "api_key": "vault://secret/data/payment-service/api-key"
}
```
**At Runtime:** The application authenticates with Vault and fetches the specified secret key.

#### D. Base64 Decoding (`base64://`)
Useful for passing binary data (like small keys) in text-based config formats.

**In `config.json` or Consul:**
```json
{
  "encryption_key": "base64://SGVsbG8gV29ybGQ="
}
```
**At Runtime:** The application decodes the base64 string.

## Running the Service

### 1. Local Development

Ensure dependencies (Postgres, Redis, Consul) are running.

```bash
# Install dependencies
go mod download

# Run the service
make run

# Run tests
make test
```

### 2. Docker

Build the container using the provided Makefile. The build process automatically injects version information (Git commit, branch, build time).

```bash
# Build the image
make docker-build
# or manually: docker build -f Dockerfile -t users:latest ../

# Run the container
docker run -p 8080:8080 -e APP_ENV=dev users:latest
```

### 3. Docker Compose

The project includes both production and development configurations.

#### **Production (default)**
Full containerized stack with optimized binary.

```bash
# Start all services (PostgreSQL, Redis, Consul, facerec)
docker-compose up

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f facerec-be
```

#### **Development (with Live Reload)**
Uses [air](https://github.com/cosmtrek/air) for automatic code recompilation on file changes.

```bash
# Start with live-reload enabled
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# View logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f facerec-be

# When you edit .go files in facerec/, framework/, or libraries/, 
# air automatically detects changes and rebuilds the binary inside the container.
```

**Development Setup Notes:**
- The dev target mounts volumes: `./framework`, `./libraries`, `./facerec` → `/app/`
- Air watches `.go` files and auto-rebuilds (delay: 1s)
- Configuration: see [`.air.toml`](.air.toml) for exclude patterns
- Server restarts automatically; API available immediately at `http://localhost:8080`

#### **Stopping Services**
```bash
# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (clears DB/cache)
docker-compose down -v
```
