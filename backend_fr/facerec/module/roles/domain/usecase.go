package domain

import (
	"context"
)

// UseCase defines the business logic for the roles module.
type UseCase interface {
	FindAll(ctx context.Context, filter RoleFilter) ([]*Role, int64, error)
	Get(ctx context.Context, id string) (*Role, error)
	Create(ctx context.Context, role *Role) error
	Update(ctx context.Context, role *Role) error
	Delete(ctx context.Context, institutionId string, id string) error
	ListPermissions(ctx context.Context, filter PermissionFilter) ([]*Permission, error)
}