package domain

import (
	"context"

	"github.com/facerec/facerec-be/libraries/types"
)

// Role represents the domain object for a Role.
type Role struct {
	Id            string   `object:"id"`
	InstitutionId string   `object:"institution_id"`
	Name          string   `object:"name"`
	Description   string   `object:"description"`
	IsActive      bool     `object:"is_active"`
	Permissions   []string `object:"permissions"`
	CreatedBy     string   `object:"created_by"`
	UpdatedBy     string   `object:"updated_by"`
}

// Permission represents the domain object for a system permission.
type Permission struct {
	Id            string `object:"id"`
	InstitutionId string `object:"institution_id"`
	Code          string `object:"code"`
	Description   string `object:"description"`
	Module        string `object:"module"`
	SubModule     string `object:"sub_module"`
	Page          string `object:"page"`
	Action        string `object:"action"`
	ScopeType     string `object:"scope_type"`
	IsSystem      bool   `object:"is_system"`
}

// PermissionFilter represents filter options for permissions.
type PermissionFilter struct {
	types.Pagination
	InstitutionId string
	Search        string
}

// RoleFilter represents the filter options for fetching roles.
type RoleFilter struct {
	types.Pagination
	InstitutionId string
	Search        string
}

// RoleRepository defines the methods for interacting with the roles storage.
type RoleRepository interface {
	FindAll(ctx context.Context, filter RoleFilter) ([]*Role, int64, error)
	FindByID(ctx context.Context, id string) (*Role, error)
	FindByName(ctx context.Context, 	 string, name string) (*Role, error)
	Store(ctx context.Context, role *Role) error
	Update(ctx context.Context, role *Role) error
	Delete(ctx context.Context, institutionId string, id string) error
	AddPermissions(ctx context.Context, roleId string, permissions []string) error
	RemovePermissions(ctx context.Context, roleId string) error
	GetPermissions(ctx context.Context, roleId string) ([]string, error)
	FindAllPermissions(ctx context.Context, filter PermissionFilter) ([]*Permission, error)
}
