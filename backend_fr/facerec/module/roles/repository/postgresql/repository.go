package postgresql

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/facerec/facerec-be/facerec/module/roles/domain"
)

var _ domain.RoleRepository = (*Repository)(nil)

// RoleEntity represents the schema in the database.
type RoleEntity struct {
	Id            string `db:"id" map:"Id"`
	InstitutionId string `db:"institution_id" map:"InstitutionId"`
	Name          string `db:"name" map:"Name"`
	Description   string `db:"description" map:"Description"`
	IsActive      bool   `db:"is_active" map:"IsActive"`
}

// RolePermissionEntity represents the permission association.
type RolePermissionEntity struct {
	RoleId         string `db:"role_id"`
	PermissionCode string `db:"permission_code"`
}

// Repository implements the domain.RoleRepository interface for PostgreSQL.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new instance of the PostgreSQL Repository.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// AddPermissions adds permissions to a role.
func (r *Repository) AddPermissions(ctx context.Context, roleId string, permissions []string) error {
	if len(permissions) == 0 {
		return nil
	}

	// 1. Resolve codes to IDs
	sql := `SELECT id, code FROM iam.permissions WHERE code = ANY(@codes)`
	rows, err := r.db.Query(ctx, sql, pgx.NamedArgs{"codes": permissions})
	if err != nil {
		return err
	}
	defer rows.Close()

	var permissionIDs []string
	foundCodes := make(map[string]bool)
	for rows.Next() {
		var id, code string
		if err := rows.Scan(&id, &code); err != nil {
			return err
		}
		permissionIDs = append(permissionIDs, id)
		foundCodes[code] = true
	}
	if err := rows.Err(); err != nil {
		return err
	}

	// Optional: Check if all permissions were found
	// for _, code := range permissions {
	// 	if !foundCodes[code] {
	// 		// Handle missing code, maybe ignore or error?
	// 		// For now, only insert valid ones.
	// 	}
	// }

	if len(permissionIDs) == 0 {
		return nil
	}

	// 2. Bulk Insert into role_permissions
	insertRows := [][]interface{}{}
	for _, pid := range permissionIDs {
		insertRows = append(insertRows, []interface{}{roleId, pid})
	}

	_, err = r.db.CopyFrom(
		ctx,
		pgx.Identifier{"iam", "role_permissions"},
		[]string{"role_id", "permission_id"},
		pgx.CopyFromRows(insertRows),
	)

	return err
}

// RemovePermissions removes all permissions for a role.
func (r *Repository) RemovePermissions(ctx context.Context, roleId string) error {
	query := `DELETE FROM iam.role_permissions WHERE role_id = @role_id`
	_, err := r.db.Exec(ctx, query, pgx.NamedArgs{"role_id": roleId})
	return err
}

// GetPermissions retrieves permissions for a role.
func (r *Repository) GetPermissions(ctx context.Context, roleId string) ([]string, error) {
	query := `
		SELECT p.code 
		FROM iam.role_permissions rp 
		JOIN iam.permissions p ON rp.permission_id = p.id 
		WHERE rp.role_id = @role_id
	`
	rows, err := r.db.Query(ctx, query, pgx.NamedArgs{"role_id": roleId})
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var permissions []string
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, err
		}
		permissions = append(permissions, p)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return permissions, nil
}
