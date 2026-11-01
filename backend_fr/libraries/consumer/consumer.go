package consumer

import (
	"context"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog/log"
	"github.com/facerec/facerec-be/framework/bunnymq"
)

// Handler is the function signature for processing messages.
// It returns an error if processing fails.
type Handler func(ctx context.Context, msg amqp.Delivery) error

type Config struct {
	AutoAck          bool       `config:"auto_ack"`
	Exclusive        bool       `config:"exclusive"`
	NoLocal          bool       `config:"no_local"`
	Args             amqp.Table `config:"args"`
	QosPrefetchCount int        `config:"qos_prefetch_count"`
	QosPrefetchSize  int        `config:"qos_prefetch_size"`
	QosGlobal        bool       `config:"qos_global"`
}

// Consumer handles consuming messages from a RabbitMQ queue with auto-reconnect logic.
type Consumer struct {
	rmq *bunnymq.RabbitMQ
}

// New creates a new Consumer instance.
func New(rmq *bunnymq.RabbitMQ) *Consumer {
	return &Consumer{
		rmq: rmq,
	}
}

// options holds configuration for the consumer.
type options struct {
	AutoAck          bool
	Exclusive        bool
	NoLocal          bool
	Args             amqp.Table
	QosPrefetchCount int
	QosPrefetchSize  int
	QosGlobal        bool
}

// defaultOptions returns the default options.
func defaultOptions() options {
	return options{
		AutoAck:          false,
		Exclusive:        false,
		NoLocal:          false,
		Args:             nil,
		QosPrefetchCount: 1,
		QosPrefetchSize:  0,
		QosGlobal:        false,
	}
}

// Option serves as a functional option for configuring the consumer.
type Option func(*options)

// WithAutoAck sets the auto-ack flag.
func WithAutoAck(autoAck bool) Option {
	return func(o *options) {
		o.AutoAck = autoAck
	}
}

// WithExclusive sets the exclusive flag.
func WithExclusive(exclusive bool) Option {
	return func(o *options) {
		o.Exclusive = exclusive
	}
}

// WithNoLocal sets the no-local flag.
func WithNoLocal(noLocal bool) Option {
	return func(o *options) {
		o.NoLocal = noLocal
	}
}

// WithArgs sets the arguments table.
func WithArgs(args amqp.Table) Option {
	return func(o *options) {
		o.Args = args
	}
}

// WithQos sets the QoS settings.
func WithQos(prefetchCount, prefetchSize int, global bool) Option {
	return func(o *options) {
		o.QosPrefetchCount = prefetchCount
		o.QosPrefetchSize = prefetchSize
		o.QosGlobal = global
	}
}

// Consume begins consuming messages from the specified queue.
// It blocks until the context is cancelled.
// It handles channel recreation and connection recovery automatically.
func (c *Consumer) Consume(ctx context.Context, queueName string, handler Handler, opts ...Option) {
	// Apply options
	cfg := defaultOptions()
	for _, opt := range opts {
		opt(&cfg)
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
			// Attempt to consume
			if err := c.consume(ctx, queueName, handler, cfg); err != nil {
				log.Error().Err(err).Str("queue", queueName).Msg("Consumer encountered an error")
			}
		}
	}
}

// consume establishes a channel and consumes messages.
// It returns when the channel is closed or context is cancelled.
func (c *Consumer) consume(ctx context.Context, queueName string, handler Handler, cfg options) error {
	conn := c.rmq.Connection()
	if conn == nil || conn.IsClosed() {
		return amqp.ErrClosed
	}

	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	// Set QoS
	if err := ch.Qos(cfg.QosPrefetchCount, cfg.QosPrefetchSize, cfg.QosGlobal); err != nil {
		return err
	}

	msgs, err := ch.Consume(
		queueName,     // queue
		"",            // consumer
		cfg.AutoAck,   // auto-ack
		cfg.Exclusive, // exclusive
		cfg.NoLocal,   // no-local
		false,         // no-wait
		cfg.Args,      // args
	)
	if err != nil {
		return err
	}

	log.Info().Str("queue", queueName).Msg("Consumer started")

	for {
		select {
		case <-ctx.Done():
			return nil
		case d, ok := <-msgs:
			if !ok {
				log.Warn().Str("queue", queueName).Msg("Delivery channel closed")
				return amqp.ErrClosed
			}

			// Process the message
			if err := handler(ctx, d); err != nil {
				log.Error().Err(err).Str("msg_id", d.MessageId).Msg("Failed to process message, nacking...")
				// Requeue the message if processing failed and AutoAck is false
				if !cfg.AutoAck {
					_ = d.Nack(false, true)
				}
			} else {
				// Ack if success and AutoAck is false
				if !cfg.AutoAck {
					_ = d.Ack(false)
				}
			}
		}
	}
}
