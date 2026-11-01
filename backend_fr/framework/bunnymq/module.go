// Package bunnymq provides an Uber Fx module for RabbitMQ connection management.
// It includes logic for automatic reconnection and multiple-node failover.
package bunnymq

import (
	"context"
	"strings"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog/log"
	"go.uber.org/fx"
)

// Module is the Fx module for RabbitMQ.
// It provides a *RabbitMQ wrapper that manages the underlying *amqp.Connection.
var Module = fx.Module("bunnymq",
	fx.Provide(
		NewRabbitMQ,
	),
)

// Config holds configuration for RabbitMQ connection.
type Config struct {
	// URL is a single AMQP connection string (e.g., "amqp://guest:guest@localhost:5672/").
	URL string `config:"rabbitmq_url"`

	// URLs is a comma-separated list of AMQP connection strings for failover.
	// If set, the client will attempt to connect to these in order.
	URLs string `config:"rabbitmq_urls"`
}

// RabbitMQ is a wrapper around the AMQP connection that handles reconnection.
type RabbitMQ struct {
	conn *amqp.Connection
	cfg  *Config
	mu   sync.RWMutex
	done chan struct{} // Channel to signal shutdown to the reconnect loop
}

// NewRabbitMQ creates a new RabbitMQ manager.
// It initiates a connection immediately. If successful, it spawns a background
// goroutine to monitor the connection and reconnect if it drops.
func NewRabbitMQ(lc fx.Lifecycle, cfg *Config) (*RabbitMQ, error) {
	rmq := &RabbitMQ{
		cfg:  cfg,
		done: make(chan struct{}),
	}

	// Attempt initial connection if configured
	if cfg.URL != "" || cfg.URLs != "" {
		if err := rmq.connect(); err != nil {
			log.Error().Err(err).Msg("Failed to connect to RabbitMQ initially")
			// We return error here to fail app startup if critical infra is missing.
			return nil, err
		}
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			// Start the reconnection monitor
			go rmq.reconnectLoop()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			// Signal the loop to stop
			close(rmq.done)
			rmq.mu.RLock()
			defer rmq.mu.RUnlock()
			if rmq.conn != nil {
				return rmq.conn.Close()
			}
			return nil
		},
	})

	return rmq, nil
}

// getURLs returns the list of URLs to try for connection, derived from config.
func (r *RabbitMQ) getURLs() []string {
	var urls []string
	if r.cfg.URLs != "" {
		parts := strings.Split(r.cfg.URLs, ",")
		for _, part := range parts {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				urls = append(urls, trimmed)
			}
		}
	}
	// Fallback/Legacy URL support
	if len(urls) == 0 && r.cfg.URL != "" {
		urls = append(urls, r.cfg.URL)
	}
	return urls
}

// connect attempts to establish a connection to one of the configured URLs.
// It iterates through the list until a successful connection is made.
func (r *RabbitMQ) connect() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	urls := r.getURLs()
	if len(urls) == 0 {
		return nil // Nothing to connect to
	}

	var lastErr error
	for _, urlStr := range urls {
		conn, err := amqp.Dial(urlStr)
		if err == nil {
			if r.conn != nil {
				_ = r.conn.Close()
			}
			r.conn = conn
			log.Info().Str("url", urlStr).Msg("Connected to RabbitMQ")
			return nil
		}
		log.Warn().Err(err).Str("url", urlStr).Msg("Failed to connect to RabbitMQ node")
		lastErr = err
	}

	return lastErr
}

// reconnectLoop monitors the connection status using NotifyClose.
func (r *RabbitMQ) reconnectLoop() {
	r.mu.RLock()
	currentConn := r.conn
	r.mu.RUnlock()

	notifyClose := make(chan *amqp.Error, 1)

	if currentConn != nil {
		currentConn.NotifyClose(notifyClose)
	}

	for {
		select {
		case <-r.done:
			return
		case err := <-notifyClose:
			if err != nil {
				log.Warn().Err(err).Msg("RabbitMQ connection closed")
			} else {
				log.Info().Msg("RabbitMQ connection closed gracefully")
			}

			// Attempt to reconnect
			for {
				log.Info().Msg("Attempting to reconnect to RabbitMQ...")
				if backoffErr := r.connect(); backoffErr == nil {
					log.Info().Msg("Reconnected to RabbitMQ")

					// Re-register NotifyClose on the new connection
					r.mu.RLock()
					newConn := r.conn
					r.mu.RUnlock()

					notifyClose = make(chan *amqp.Error, 1)
					newConn.NotifyClose(notifyClose)
					break
				}

				log.Error().Msg("Failed to reconnect, retrying in 5 seconds...")
				select {
				case <-r.done:
					return
				case <-time.After(5 * time.Second):
					continue
				}
			}
		}
	}
}

// Connection returns the underlying *amqp.Connection.
// It is thread-safe. Note that the returned connection might be closed if
// the manager is currently reconnecting.
func (r *RabbitMQ) Connection() *amqp.Connection {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.conn
}
