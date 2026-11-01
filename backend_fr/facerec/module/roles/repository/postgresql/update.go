package postgresql

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/facerec/facerec-be/facerec/module/roles/domain"
)

var queryUpdate = `
	UPDATE iam.roles
	SET
		institution_id = @institution_id,
		name = @name,
		description = @description,
		is_active = @is_active
	WHERE id = @id
`

// Update modifies an existing role record.
func (r *Repository) Update(ctx context.Context, role *domain.Role) error {
	_, err := r.db.Exec(ctx, queryUpdate, pgx.NamedArgs{
		"id":             role.Id,
		"institution_id": role.InstitutionId,
		"name":           role.Name,
		"description":    role.Description,
		"is_active":      role.IsActive,
	})
	if err != nil {
		return err
	}

	// Update permissions: Delete all and re-insert is simple strategy for now
	// Ideally we diff, but simple overwrite works for MVP
	if err := r.RemovePermissions(ctx, role.Id); err != nil {
		return err
	}

	if len(role.Permissions) > 0 {
		if err := r.AddPermissions(ctx, role.Id, role.Permissions); err != nil {
			return err
		}
	}

	return nil
}
