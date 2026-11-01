package postgresql

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/facerec/facerec-be/facerec/module/roles/domain"
)

// PermissionEntity represents the database schema for permissions.
type PermissionEntity struct {
	Id            string  `db:"id"`
	InstitutionId string  `db:"institution_id"`
	Code          string  `db:"code"`
	Description   *string `db:"description"`
	Module        string  `db:"module"`
	SubModule     string  `db:"sub_module"`
	Page          string  `db:"page"`
	Action        string  `db:"action"`
	ScopeType     string  `db:"scope_type"`
	IsSystem      bool    `db:"is_system"`
}

// FindAllPermissions retrieves all permissions matching the filter.
func (r *Repository) FindAllPermissions(ctx context.Context, filter domain.PermissionFilter) ([]*domain.Permission, error) {
	sql := `
		SELECT
			id, institution_id, code, description,
			module, sub_module, page, action,
			scope_type, is_system
		FROM iam.permissions
		WHERE 1=1
	`
	args := pgx.NamedArgs{}

	if filter.InstitutionId != "" {
		sql += " AND institution_id = @institution_id"
		args["institution_id"] = filter.InstitutionId
	}

	if filter.Search != "" {
		sql += " AND (code ILIKE @search OR description ILIKE @search OR module ILIKE @search)"
		args["search"] = "%" + filter.Search + "%"
	}

	sql += " ORDER BY module, sub_module, page, action"

	rows, err := r.db.Query(ctx, sql, args)
	if err != nil {
		return nil, err
	}

	records, err := pgx.CollectRows(rows, pgx.RowToAddrOfStructByName[PermissionEntity])
	if err != nil {
		return nil, err
	}

	var result []*domain.Permission
	for _, rec := range records {
		var desc string
		if rec.Description != nil {
			desc = *rec.Description
		}
		result = append(result, &domain.Permission{
			Id:            rec.Id,
			InstitutionId: rec.InstitutionId,
			Code:          rec.Code,
			Description:   desc,
			Module:        rec.Module,
			SubModule:     rec.SubModule,
			Page:          rec.Page,
			Action:        rec.Action,
			ScopeType:     rec.ScopeType,
			IsSystem:      rec.IsSystem,
		})
	}

	return result, nil
}
