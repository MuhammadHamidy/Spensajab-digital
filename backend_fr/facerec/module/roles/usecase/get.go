package usecase

import (
	"context"
	errs "errors" // standard errors

	"github.com/jackc/pgx/v5"
	"github.com/rs/zerolog"
	"github.com/facerec/facerec-be/libraries/errors"
	"github.com/facerec/facerec-be/facerec/module/roles/domain"
)

// Get finds a role by their unique identifier.
func (u *UseCase) Get(ctx context.Context, id string) (*domain.Role, error) {
	ctx, span := u.tracer.Start(ctx, "Get")
	defer span.End()

	logger := zerolog.Ctx(ctx)

	role, err := u.repository.FindByID(ctx, id)
	if err != nil {
		if errs.Is(err, pgx.ErrNoRows) {
			return nil, errors.NotFound("role not found")
		}

		logger.Error().
			Str("func", "repository.FindByID").
			Err(err).
			Msg("failed to find role by id")
		return nil, errors.InternalServerError("failed to find role by id")
	}

	return role, nil
}
