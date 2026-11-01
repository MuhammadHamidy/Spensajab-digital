package usecase

import (
	"context"

	"github.com/rs/zerolog"
	"github.com/facerec/facerec-be/libraries/errors"
)

// Delete removes a role from the system.
func (u *UseCase) Delete(ctx context.Context, institutionId string, id string) error {
	ctx, span := u.tracer.Start(ctx, "Delete")
	defer span.End()

	logger := zerolog.Ctx(ctx)

	if err := u.repository.Delete(ctx, institutionId, id); err != nil {
		logger.Error().
			Str("func", "repository.Delete").
			Err(err).
			Msg("failed to delete role")

		return errors.InternalServerError("failed to delete role")
	}

	return nil
}
