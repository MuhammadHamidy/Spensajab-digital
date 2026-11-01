package publisher

import (
	"context"
	"errors"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog/log"
	"github.com/facerec/facerec-be/framework/bunnymq"
)

// Event represents a message to be published to RabbitMQ.
type Event interface {
	Exchange() string
	Topic() string
	MessageId() string
	ContentType() string
	Body() []byte
}

// Publisher handles publishing messages to RabbitMQ with auto-reconnect logic.
type Publisher struct {
	rmq *bunnymq.RabbitMQ
	mu  sync.Mutex
	ch  *amqp.Channel
}

// New creates a new Publisher instance.
func New(rmq *bunnymq.RabbitMQ) *Publisher {
	return &Publisher{
		rmq: rmq,
	}
}

// Publish publishes an event to RabbitMQ.
// It automatically attempts to reconnect if the channel is closed.
func (p *Publisher) Publish(ctx context.Context, event Event) error {
	const maxRetries = 1
	var err error

	for i := 0; i <= maxRetries; i++ {
		if err = p.ensureChannel(); err != nil {
			// If we can't get a channel, wait a bit and retry if we have retries left
			if i < maxRetries {
				select {
				case <-ctx.Done():
					return ctx.Err()
				case <-time.After(100 * time.Millisecond):
					continue
				}
			}
			return err
		}

		// Try to publish
		p.mu.Lock()
		ch := p.ch
		p.mu.Unlock()

		msg := amqp.Publishing{
			MessageId:   event.MessageId(),
			ContentType: event.ContentType(),
			Body:        event.Body(),
		}

		err = ch.PublishWithContext(
			ctx,
			event.Exchange(),
			event.Topic(),
			false, // mandatory
			false, // immediate
			msg,
		)
		if err == nil {
			return nil
		}

		// Check if error is due to channel closure
		if errors.Is(err, amqp.ErrClosed) {
			log.Warn().Msg("Publisher channel closed, attempting to reopen and retry...")
			p.resetChannel()
			continue
		}

		// Other errors, return immediately
		return err
	}

	return err
}

// ensureChannel ensures that there is an open channel available.
func (p *Publisher) ensureChannel() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.ch != nil && !p.ch.IsClosed() {
		return nil
	}

	conn := p.rmq.Connection()
	if conn == nil || conn.IsClosed() {
		return amqp.ErrClosed // Connection is not ready
	}

	ch, err := conn.Channel()
	if err != nil {
		return err
	}

	p.ch = ch

	// Register NotifyClose to proactively reset p.ch when the channel closes.
	// This avoids trying to publish to a closed channel and failing.
	go func() {
		closeChan := make(chan *amqp.Error, 1)
		ch.NotifyClose(closeChan)

		// Wait for channel closure
		<-closeChan

		// Reset the channel reference
		p.resetChannel()
	}()

	return nil
}

// resetChannel clears the current channel so a new one can be created.
func (p *Publisher) resetChannel() {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.ch = nil
}
