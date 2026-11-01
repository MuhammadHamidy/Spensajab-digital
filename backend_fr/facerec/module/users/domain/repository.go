package domain

import (
	"context"
	"time"

	"github.com/facerec/facerec-be/libraries/types"
)

// User represents the domain user entity.
type User struct {
	Id               string         `object:"id"`
	InstitutionId    string         `object:"institution_id"`
	ExternalSubject  string         `object:"external_subject"`
	IdentityProvider string         `object:"identity_provider"`
	Status           string         `object:"status"`
	Metadata         map[string]any `object:"metadata"`
	CreatedAt        time.Time      `object:"created_at"`
	UpdatedAt        time.Time      `object:"updated_at"`
	DeletedAt        *time.Time     `object:"deleted_at"` // Pointer for nullable
}

// UserRole represents a role assignment to a user.
type UserRole struct {
	Id            string     `object:"id"`
	InstitutionId string     `object:"institution_id"`
	UserId        string     `object:"user_id"`
	RoleId        string     `object:"role_id"`
	GroupId       string     `object:"group_id"`
	AssignedAt    time.Time  `object:"assigned_at"`
	AssignedBy    *string    `object:"assigned_by"` // Nullable
	ExpiresAt     *time.Time `object:"expires_at"`  // Nullable
	IsActive      bool       `object:"is_active"`
}

// UserFilter represents filter options for listing users.
type UserFilter struct {
	types.Pagination
	InstitutionId string
	Status        string
	Search        string // Search in name/email inside metadata or external_subject
}	

// UserRepository defines the persistence layer contract.
type UserRepository interface {
	FindAll(ctx context.Context, filter UserFilter) ([]*User, int64, error)
	FindByID(ctx context.Context, id string) (*User, error)
	FindByExternalSubject(ctx context.Context, institutionId string, subject string) (*User, error)
	Store(ctx context.Context, user *User) error
	UpdateStatus(ctx context.Context, id string, status string, updatedBy string) error
	AssignRole(ctx context.Context, userRole *UserRole) error
	// Typically we might want checking existing assignment but AssignRole can handle logic or we add FindAssignment
}
