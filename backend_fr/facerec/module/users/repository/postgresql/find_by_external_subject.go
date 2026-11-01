package postgresql

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/facerec/facerec-be/libraries/object"
	"github.com/facerec/facerec-be/facerec/module/users/domain"
)

var queryFindBySubject = `
	SELECT
		id, institution_id, external_subject, identity_provider,
		status, metadata, created_at, updated_at, deleted_at
	FROM auth.users
	WHERE institution_id = @institution_id AND external_subject = @subject AND deleted_at IS NULL
	LIMIT 1
`

// FindByExternalSubject retrieves a user by their external subject (sub) within an institution.
func (r *Repository) FindByExternalSubject(ctx context.Context, institutionId string, subject string) (*domain.User, error) {
	rows, err := r.db.Query(ctx, queryFindBySubject, pgx.NamedArgs{
		"institution_id": institutionId,
		"subject":        subject,
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
