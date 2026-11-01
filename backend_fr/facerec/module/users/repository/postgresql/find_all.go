package postgresql

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/facerec/facerec-be/libraries/object"
	"github.com/facerec/facerec-be/facerec/module/users/domain"
)

// FindAll retrieves users based on filters.
func (r *Repository) FindAll(ctx context.Context, filter domain.UserFilter) ([]*domain.User, int64, error) {
	// 1. Build Base Query for Counting and Selecting
	baseQuery := " FROM auth.users WHERE deleted_at IS NULL"
	args := pgx.NamedArgs{}

	if filter.InstitutionId != "" {
		baseQuery += " AND institution_id = @institution_id"
		args["institution_id"] = filter.InstitutionId
	}

	if filter.Status != "" {
		baseQuery += " AND status = @status"
		args["status"] = filter.Status
	}

	if filter.Search != "" {
		baseQuery += " AND (external_subject ILIKE @search OR metadata::text ILIKE @search)"
		args["search"] = "%" + filter.Search + "%"
	}
	
	// 2. Count Total
	var total int64
	countQuery := "SELECT count(id)" + baseQuery
	if err := r.db.QueryRow(ctx, countQuery, args).Scan(&total); err != nil {
		return nil, 0, err
	}

	// 3. Select Data
	selectQuery := `
		SELECT
			id, institution_id, external_subject, identity_provider,
			status, metadata, created_at, updated_at, deleted_at
	` + baseQuery + " ORDER BY created_at DESC"

	if filter.Pagination.Size > 0 {
		selectQuery += " LIMIT @limit OFFSET @offset"
		args["limit"] = filter.Pagination.GetLimit()
		args["offset"] = filter.Pagination.GetOffset()
	}

	rows, err := r.db.Query(ctx, selectQuery, args)
	if err != nil {
		return nil, 0, err
	}

	records, err := pgx.CollectRows(rows, pgx.RowToAddrOfStructByName[UserEntity])
	if err != nil {
		return nil, 0, err
	}

	users, err := object.ParseAll[*UserEntity, *domain.User](object.TagDB, object.TagObject, records)
	if err != nil {
		return nil, 0, err
	}

	return users, total, nil
}
