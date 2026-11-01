package integrations

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

var (
	testPool *pgxpool.Pool
)

func TestMain(m *testing.M) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("Skipping integration tests (Docker not running/available): %v\n", r)
			os.Exit(0)
		}
	}()

	ctx := context.Background()

	pgContainer, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("absensi_test"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(30*time.Second),
		),
	)
	if err != nil {
		fmt.Printf("Skipping integration tests: Docker container start failed: %v\n", err)
		os.Exit(0)
	}

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		pgContainer.Terminate(ctx)
		os.Exit(0)
	}

	testPool, err = pgxpool.New(ctx, connStr)
	if err != nil {
		pgContainer.Terminate(ctx)
		os.Exit(0)
	}

	_ = applyMigrations(ctx, testPool, "../../migrations")

	code := m.Run()

	testPool.Close()
	pgContainer.Terminate(ctx)

	os.Exit(code)
}

func applyMigrations(ctx context.Context, db *pgxpool.Pool, dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}

	var migrationFiles []string
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".sql" && filepath.Ext(filepath.Base(entry.Name())) != ".down.sql" {
			migrationFiles = append(migrationFiles, entry.Name())
		}
	}
	sort.Strings(migrationFiles)

	for _, file := range migrationFiles {
		content, err := os.ReadFile(filepath.Join(dir, file))
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", file, err)
		}
		if _, err := db.Exec(ctx, string(content)); err != nil {
			return fmt.Errorf("failed to exec migration %s: %w", file, err)
		}
	}
	return nil
}
