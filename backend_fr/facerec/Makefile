.PHONY: build run test docker-build clean

APP_NAME := presdig
DOCKER_IMAGE := $(APP_NAME):latest
# Assumes build is run from repository root if using docker-build
DOCKER_CONTEXT := ../

# Build Variables
VERSION ?= $(shell git describe --tags --always --dirty || echo "dev")
COMMIT ?= $(shell git rev-parse --short HEAD || echo "none")
BRANCH ?= $(shell git rev-parse --abbrev-ref HEAD || echo "unknown")
BUILD_TIME ?= $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

LDFLAGS := -ldflags "-X 'github.com/facerec/facerec-be/facerec/version.Version=$(VERSION)' \
                     -X 'github.com/facerec/facerec-be/facerec/version.Commit=$(COMMIT)' \
                     -X 'github.com/facerec/facerec-be/facerec/version.Branch=$(BRANCH)' \
                     -X 'github.com/facerec/facerec-be/facerec/version.BuildTime=$(BUILD_TIME)'"

build:
	go build $(LDFLAGS) -o bin/$(APP_NAME) main.go

run:
	go run $(LDFLAGS) main.go serve

test:
	go test -v -cover ./...

clean:
	rm -rf bin/

# Docker commands
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-restart:
	docker-compose restart presdig-be

docker-logs:
	docker-compose logs -f presdig-be

# Database commands (when containers already running)
db-seed:
	@echo "Running all seeder(s)..."
	docker-compose up seeder
	@echo "Seeder completed!"

db-migrate-fresh:
	@echo "Resetting migrations..."
	docker-compose exec -T postgres psql -U user -d presdig -c "DROP TABLE IF EXISTS schema_migrations;"
	docker-compose restart migrate
	@echo "Migrations reset!"

db-query:
	docker-compose exec postgres psql -U user -d presdig

db-backup:
	@echo "Backing up database..."
	docker-compose exec -T postgres pg_dump -U user presdig > backup_presdig_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup completed!"

db-restore:
	@echo "Enter backup file path: (press Ctrl+C to cancel)"
	@read FILE; docker-compose exec -T postgres psql -U user -d presdig < $$FILE
	@echo "Restore completed!"

# Development helpers
install-migrate:
	@echo "Installing migrate CLI..."
	@command -v migrate >/dev/null 2>&1 || (echo "Install golang-migrate from: https://github.com/golang-migrate/migrate/releases" && exit 1)
	@echo "migrate is ready!"

swagger-install:
	go install github.com/swaggo/swag/cmd/swag@latest

swagger-init:
	swag init -g cmd/serve.go --output docs --parseDependency --parseInternal

.PHONY: docker-up docker-down docker-restart docker-logs db-seed db-migrate-fresh db-query db-backup db-restore install-migrate

# Docker build command to be run from the facerec directory, but setting context to root
docker-build:
	docker build \
		--build-arg VERSION="$(VERSION)" \
		--build-arg COMMIT="$(COMMIT)" \
		--build-arg BRANCH="$(BRANCH)" \
		--build-arg BUILD_TIME="$(BUILD_TIME)" \
		-f Dockerfile -t $(DOCKER_IMAGE) $(DOCKER_CONTEXT)

# Helper to run docker build from repo root manually:
# docker build -f facerec/Dockerfile -t facerec:latest .

.PHONY: swagger-install swagger-init
