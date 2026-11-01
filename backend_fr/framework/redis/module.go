// Package redis provides an Uber Fx module for Redis client initialization.
// It supports standalone, sentinel, and cluster configurations via the go-redis UniversalClient.
package redis

import (
	"context"
	"strings"

	"github.com/redis/go-redis/extra/redisotel/v9"
	"github.com/redis/go-redis/v9"
	"go.uber.org/fx"
)

// Module is the Fx module for Redis.
// It provides a redis.UniversalClient to the dependency graph.
var Module = fx.Module("redis",
	fx.Provide(
		NewRedis,
	),
)

// Config holds configuration for the Redis client.
type Config struct {
	// Address is a single Redis address (e.g., "localhost:6379").
	// Deprecated: Use Addresses for new applications to support clustering/failover.
	Address string `config:"redis_address"`

	// Addresses is a comma-separated list of Redis addresses (e.g., "host1:6379,host2:6379").
	// Use this for Sentinel or Cluster configurations.
	Addresses string `config:"redis_addresses"`

	// Password for Redis authentication.
	Password string `config:"redis_password"`

	// DB is the database number to select (typically 0).
	DB int `config:"redis_db"`
}

// NewRedis creates a new Redis UniversalClient based on the provided configuration.
// It supports:
// - Single Node: One address provided.
// - Failover/Cluster: Multiple addresses provided.
//
// The client verifies connectivity (Ping) on startup and closes on shutdown.
func NewRedis(lc fx.Lifecycle, cfg *Config) (redis.UniversalClient, error) {
	var addrs []string
	if cfg.Addresses != "" {
		addrs = strings.Split(cfg.Addresses, ",")
	} else if cfg.Address != "" {
		addrs = []string{cfg.Address}
	} else {
		// No address configured.
		// If optional, we might return nil or default to localhost.
		// Returning nil as "not configured" behavior for now.
	}

	// Trim spaces from addresses
	for i := range addrs {
		addrs[i] = strings.TrimSpace(addrs[i])
	}

	// NewUniversalClient handles the logic to choose between simple Client, FailoverClient, or ClusterClient
	// based on the number of addresses and options provided.
	rdb := redis.NewUniversalClient(&redis.UniversalOptions{
		Addrs:    addrs,
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			// Enable tracing
			if err := redisotel.InstrumentTracing(rdb); err != nil {
				return err
			}

			// Fail startup if we can't ping Redis
			return rdb.Ping(ctx).Err()
		},
		OnStop: func(ctx context.Context) error {
			return rdb.Close()
		},
	})

	return rdb, nil
}
