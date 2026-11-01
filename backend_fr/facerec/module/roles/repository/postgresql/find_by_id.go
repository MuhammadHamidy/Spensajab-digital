package postgresql

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/facerec/facerec-be/libraries/object"
	"github.com/facerec/facerec-be/facerec/module/roles/domain"
)

var queryFindById = `
	SELECT
		id, institution_id, name, description, is_active
	FROM iam.roles
	WHERE id = @id
	LIMIT 1
`

// FindByID retrieves a single role by their ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*domain.Role, error) {
	rows, err := r.db.Query(ctx, queryFindById, pgx.NamedArgs{
		"id": id,
	})
	if err != nil {
		return nil, err
	}

	record, err := pgx.CollectOneRow(rows, pgx.RowToAddrOfStructByName[RoleEntity])
	if err != nil {
		return nil, err
	}

	role, err := object.Parse[*RoleEntity, *domain.Role](object.TagDB, object.TagObject, record)
	if err != nil {
		return nil, err
	}

	// Fetch permissions
	perms, err := r.GetPermissions(ctx, id)
	if err != nil {
		return nil, err
	}
	role.Permissions = perms

	return role, nil
}

var queryFindByName = `
	SELECT
		id, institution_id, name, description, is_active
	FROM iam.roles
	WHERE institution_id = @institution_id AND name = @name
	LIMIT 1
`

// FindByName retrieves a single role by name and institution.
func (r *Repository) FindByName(ctx context.Context, institutionId string, name string) (*domain.Role, error) {
	rows, err := r.db.Query(ctx, queryFindByName, pgx.NamedArgs{
		"institution_id": institutionId,
		"name":           name,
	})
	if err != nil {
		return nil, err
	}

	record, err := pgx.CollectOneRow(rows, pgx.RowToAddrOfStructByName[RoleEntity])
	if err != nil {
		return nil, err
	}

	role, err := object.Parse[*RoleEntity, *domain.Role](object.TagDB, object.TagObject, record)
	if err != nil {
		return nil, err
	}

	return role, nil
}
