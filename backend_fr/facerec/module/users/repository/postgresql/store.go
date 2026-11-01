package postgresql

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/facerec/facerec-be/facerec/module/users/domain"
)

var queryStore = `
	INSERT INTO auth.users (
		institution_id, external_subject, identity_provider,
		status, metadata, created_at, updated_at
	) VALUES (
		@institution_id, @external_subject, @identity_provider,
		@status, @metadata, now(), now()
	)
	ON CONFLICT (institution_id, identity_provider, external_subject) WHERE deleted_at IS NULL
	DO UPDATE SET
		metadata = EXCLUDED.metadata,
		updated_at = now()
	RETURNING id
`

// Store upserts a user record.
func (r *Repository) Store(ctx context.Context, user *domain.User) error {
	rows, err := r.db.Query(ctx, queryStore, pgx.NamedArgs{
		"institution_id":    user.InstitutionId,
		"external_subject":  user.ExternalSubject,
		"identity_provider": user.IdentityProvider,
		"status":            user.Status,
		"metadata":          user.Metadata,
	})
	if err != nil {
		return err
	}

	var id string
	if _, err := pgx.ForEachRow(rows, []any{&id}, func() error { return nil }); err != nil {
		return err
	}
	user.Id = id
	return nil
}
