package usecase

import (
	"context"

	"github.com/rs/zerolog"
	"github.com/facerec/facerec-be/libraries/errors"
	"github.com/facerec/facerec-be/facerec/module/users/domain"
)

// AssignRole assigns a role to a user.
func (u *UseCase) AssignRole(ctx context.Context, cmd domain.AssignRoleCommand) (string, error) {
	ctx, span := u.tracer.Start(ctx, "AssignRole")
	defer span.End()

	logger := zerolog.Ctx(ctx)

	// Validate inputs
	if cmd.UserId == "" || cmd.RoleId == "" || cmd.InstitutionId == "" {
		return "", errors.BadRequest("missing required fields")
	}

	if cmd.GroupId == "" {
		return "", errors.BadRequest("group_id is currently required")
	}

	userRole := &domain.UserRole{
		UserId:        cmd.UserId,
		RoleId:        cmd.RoleId,
		InstitutionId: cmd.InstitutionId,
		GroupId:       cmd.GroupId,
		AssignedBy:    &cmd.AssignedBy,
		IsActive:      true,
	}

	if err := u.repository.AssignRole(ctx, userRole); err != nil {
		logger.Error().
			Str("func", "repository.AssignRole").
			Err(err).
			Msg("failed to assign role")
		return "", errors.InternalServerError("failed to assign role")
	}

	return userRole.Id, nil
}
