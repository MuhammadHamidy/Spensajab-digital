package usecase

import (
	"context"
	"encoding/json"

	"github.com/rs/zerolog"
	"github.com/facerec/facerec-be/libraries/errors"
	"github.com/facerec/facerec-be/facerec/module/users/domain"
)

// SyncUser performs user synchronization using external IDP.
func (u *UseCase) SyncUser(ctx context.Context, institutionId string, token string, code string) (*domain.User, error) {
	ctx, span := u.tracer.Start(ctx, "SyncUser")
	defer span.End()

	logger := zerolog.Ctx(ctx)

	// Check Database First
	cachedUser, err := u.repository.FindByExternalSubject(ctx, institutionId, code)
	if err == nil && cachedUser != nil {
		return cachedUser, nil
	}
	// Ignore not found error log, proceed to sync

	// Get IDP Client for Institution
	clientIdp, err := u.idp.GetIDP(ctx, institutionId)
	if err != nil {
		logger.Error().
			Str("institution_id", institutionId).
			Err(err).
			Msg("failed to get IDP client")
		return nil, errors.InternalServerError("failed to configure IDP for institution")
	}

	// Fetch User from IDP
	logger.Info().Str("code", code).Msg("Fetching user from IDP")

	idpUser, err := clientIdp.GetUserByCode(ctx, token, code)
	if err != nil {
		logger.Error().
			Str("func", "idp.GetUserByCode").
			Err(err).
			Msg("failed to fetch user from IDP")
		return nil, errors.InternalServerError("failed to fetch user from IDP")
	}

	if idpUser == nil {
		return nil, errors.NotFound("user not found in IDP")
	}

	// Convert IDP user struct to map for metadata storage
	metadata := make(map[string]any)
	metaBytes, _ := json.Marshal(idpUser) // Quick marshal/unmarshal to map
	_ = json.Unmarshal(metaBytes, &metadata)

	user := &domain.User{
		InstitutionId:    institutionId,
		ExternalSubject:  idpUser.Code,
		IdentityProvider: clientIdp.Key(),
		Status:           "active",
		Metadata:         metadata,
	}

	// Upsert User Locally
	if err := u.repository.Store(ctx, user); err != nil {
		logger.Error().Str("func", "repository.Store").Err(err).Msg("failed to store synced user")
		return nil, errors.InternalServerError("failed to store synced user")
	}

	return user, nil
}
