package postgresql

import (
	"context"

	"github.com/jackc/pgx/v5"
)

var queryDelete = `DELETE FROM iam.roles WHERE id = @id AND institution_id = @institution_id`

// Delete removes a role from the database.
func (r *Repository) Delete(ctx context.Context, institutionId string, id string) error {
	// First delete permissions
	if err := r.RemovePermissions(ctx, id); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, queryDelete, pgx.NamedArgs{
		"id":             id,
		"institution_id": institutionId,
	})

	return err
}
