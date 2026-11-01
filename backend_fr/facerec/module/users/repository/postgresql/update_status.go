package postgresql

import (
	"context"

	"github.com/jackc/pgx/v5"
)

var queryUpdateStatus = `
	UPDATE auth.users
	SET status = @status, updated_at = now(), updated_by = @updated_by
	WHERE id = @id AND deleted_at IS NULL
`

// UpdateStatus updates a user's status.
func (r *Repository) UpdateStatus(ctx context.Context, id string, status string, updatedBy string) error {
	_, err := r.db.Exec(ctx, queryUpdateStatus, pgx.NamedArgs{
		"id":         id,
		"status":     status,
		"updated_by": updatedBy,
	})
	return err
}
