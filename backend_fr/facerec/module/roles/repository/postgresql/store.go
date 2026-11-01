package postgresql

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/facerec/facerec-be/facerec/module/roles/domain"
)

var queryStore = `
	INSERT INTO iam.roles (
		institution_id, name, description, is_active, created_by, updated_by
	) VALUES (
		@institution_id, @name, @description, @is_active, @created_by, @updated_by
	)
	RETURNING id
`

// Store persists a new role to the database.
func (r *Repository) Store(ctx context.Context, role *domain.Role) error {
	rows, err := r.db.Query(ctx, queryStore, pgx.NamedArgs{
		"institution_id": role.InstitutionId,
		"name":           role.Name,
		"description":    role.Description,
		"is_active":      role.IsActive,
		"created_by":     role.CreatedBy,
		"updated_by":     role.UpdatedBy,
	})
	if err != nil {
		return err
	}

	// Scan returning ID
	var id string
	if _, err := pgx.ForEachRow(rows, []any{&id}, func() error { return nil }); err != nil {
		return err
	}
	role.Id = id

	// Permissions are handled via AddPermissions separately or we should do it here if passed
	if len(role.Permissions) > 0 {
		if err := r.AddPermissions(ctx, role.Id, role.Permissions); err != nil {
			return err
		}
	}

	return nil
}
