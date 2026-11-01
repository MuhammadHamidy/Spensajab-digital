// Package postgres provides an Uber Fx module for PostgreSQL connection pooling and GORM.
package postgres

import (
	"context"

	"github.com/exaring/otelpgx"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/fx"
	gormPostgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Module is the Fx module for PostgreSQL.
var Module = fx.Module("postgres",
	fx.Provide(
		NewPostgres,
		NewGorm,
	),
)

// Config holds configuration for the PostgreSQL connection.
type Config struct {
	URL string `config:"postgres_url"`
}

// NewPostgres creates a new PostgreSQL connection pool based on the provided configuration.
func NewPostgres(lc fx.Lifecycle, cfg *Config) (*pgxpool.Pool, error) {
	if cfg.URL == "" {
		return nil, nil
	}

	poolConfig, err := pgxpool.ParseConfig(cfg.URL)
	if err != nil {
		return nil, err
	}

	poolConfig.ConnConfig.Tracer = otelpgx.NewTracer()

	conn, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		return nil, err
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			return conn.Ping(ctx)
		},
		OnStop: func(ctx context.Context) error {
			conn.Close()
			return nil
		},
	})

	return conn, nil
}

// NewGorm creates a new GORM DB instance connected to PostgreSQL.
func NewGorm(cfg *Config) (*gorm.DB, error) {
	if cfg.URL == "" {
		return nil, nil
	}
	db, err := gorm.Open(gormPostgres.Open(cfg.URL), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	return db, nil
}
