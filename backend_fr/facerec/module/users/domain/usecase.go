package domain

import (
	"context"
)

// UseCase defines the business logic contract for Users module.
type UseCase interface {
	FindAll(ctx context.Context, filter UserFilter) ([]*User, int64, error)
	Get(ctx context.Context, id string) (*User, error)
	SyncUser(ctx context.Context, institutionId string, token string, code string) (*User, error) // Returns synced user
	UpdateStatus(ctx context.Context, id string, status string, updatedBy string) error
	AssignRole(ctx context.Context, cmd AssignRoleCommand) (string, error) // Returns assignment ID
}

// AssignRoleCommand encapsulates data for assigning a role.
type AssignRoleCommand struct {
	UserId        string
	RoleId        string
	InstitutionId string
	GroupId       string
	AssignedBy    string
}
