package postgresql

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/facerec/facerec-be/libraries/object"
	"github.com/facerec/facerec-be/facerec/module/users/domain"
)

var queryFindById = `
	SELECT
		id, institution_id, external_subject, identity_provider,
		status, metadata, created_at, updated_at, deleted_at
	FROM auth.users
	WHERE id = @id AND deleted_at IS NULL
	LIMIT 1
`

// FindByID retrieves a user by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*domain.User, error) {
	rows, err := r.db.Query(ctx, queryFindById, pgx.NamedArgs{
		"id": id,
	})
	if err != nil {
		return nil, err
	}

	record, err := pgx.CollectOneRow(rows, pgx.RowToAddrOfStructByName[UserEntity])
	if err != nil {
		return nil, err
	}

	return object.Parse[*UserEntity, *domain.User](object.TagDB, object.TagObject, record)
}
