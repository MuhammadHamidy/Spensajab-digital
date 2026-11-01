package postgresql

import (
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/facerec/facerec-be/facerec/module/users/domain"
)

var _ domain.UserRepository = (*Repository)(nil)

// UserEntity maps to auth.users table.
type UserEntity struct {
	Id               string         `db:"id" map:"Id"`
	InstitutionId    string         `db:"institution_id" map:"InstitutionId"`
	ExternalSubject  string         `db:"external_subject" map:"ExternalSubject"`
	IdentityProvider string         `db:"identity_provider" map:"IdentityProvider"`
	Status           string         `db:"status" map:"Status"`
	Metadata         map[string]any `db:"metadata" map:"Metadata"`
	CreatedAt        time.Time      `db:"created_at" map:"CreatedAt"`
	UpdatedAt        time.Time      `db:"updated_at" map:"UpdatedAt"`
	DeletedAt        *time.Time     `db:"deleted_at" map:"DeletedAt"`
}

// UserRoleEntity maps to iam.user_roles table.
type UserRoleEntity struct {
	Id            string     `db:"id"`
	InstitutionId string     `db:"institution_id"`
	UserId        string     `db:"user_id"`
	RoleId        string     `db:"role_id"`
	GroupId       string     `db:"group_id"`
	AssignedAt    time.Time  `db:"assigned_at"`
	AssignedBy    *string    `db:"assigned_by"`
	ExpiresAt     *time.Time `db:"expires_at"`
	IsActive      bool       `db:"is_active"`
}

// Repository implements domain.UserRepository.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new User Repository.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}
