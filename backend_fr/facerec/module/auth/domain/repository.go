package domain

import (
	"context"
	"time"
)

type Role struct {
	Id          string    `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"unique;not null"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (Role) TableName() string {
	return "roles"
}

type Account struct {
	Id           string    `json:"id" gorm:"primaryKey"`
	Username     string    `json:"username" gorm:"unique;not null"`
	PasswordHash string    `json:"-" gorm:"not null"`
	Password     string    `json:"password,omitempty" gorm:"-"`
	Email        string    `json:"email" gorm:"unique;not null"`
	FullName     string    `json:"full_name" gorm:"not null"`
	RoleId       string    `json:"role_id" gorm:"not null"`
	RoleName     string    `json:"role_name" gorm:"-"`
	NimNip       string    `json:"nim_nip"`
	Phone        string    `json:"phone"`
	Nisn         string    `json:"nisn"`
	Gender       string    `json:"gender"`
	ParentPhone  string    `json:"parent_phone"`
	Address      string    `json:"address"`
	PhotoUrl     string    `json:"photo_url"`
	ClassName    string    `json:"class_name"`
	CourseIds    []string  `json:"course_ids,omitempty" gorm:"-"`
	CourseNames  []string  `json:"course_names,omitempty" gorm:"-"`
	ClassIds     []string  `json:"class_ids,omitempty" gorm:"-"`
	ClassCodes   []string  `json:"class_codes,omitempty" gorm:"-"`
	HasFace      bool      `json:"has_face" gorm:"-"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (Account) TableName() string {
	return "accounts"
}

type TeacherCourse struct {
	Id        string    `json:"id" gorm:"primaryKey"`
	TeacherId string    `json:"teacher_id" gorm:"not null"`
	CourseId  string    `json:"course_id" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
}

func (TeacherCourse) TableName() string {
	return "teacher_courses"
}

type TeacherClass struct {
	Id        string    `json:"id" gorm:"primaryKey"`
	TeacherId string    `json:"teacher_id" gorm:"not null"`
	ClassId   string    `json:"class_id" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
}

func (TeacherClass) TableName() string {
	return "teacher_classes"
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token     string   `json:"token"`
	ExpiresAt string   `json:"expires_at"`
	Account   *Account `json:"account"`
}

type ResetPasswordRequest struct {
	NewPassword string `json:"new_password"`
	SendEmail   bool   `json:"send_email"`
}

type ResetPasswordResponse struct {
	NewPassword string `json:"new_password"`
	EmailSent   bool   `json:"email_sent"`
	Message     string `json:"message"`
}

type UpdateProfileRequest struct {
	Username    string `json:"username"`
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
	FullName    string `json:"full_name"`
	Phone       string `json:"phone"`
	PhotoUrl    string `json:"photo_url"`
}

type SendAccessEmailRequest struct {
	Password string `json:"password"`
}

type AuthRepository interface {
	FindByUsername(ctx context.Context, username string) (*Account, error)
	FindAccountByID(ctx context.Context, id string) (*Account, error)
	FindAllAccounts(ctx context.Context, roleName string) ([]*Account, error)
	StoreAccount(ctx context.Context, account *Account) error
	UpdateAccount(ctx context.Context, account *Account) error
	DeleteAccount(ctx context.Context, id string) error
	AssignTeacherCourses(ctx context.Context, teacherId string, courseIds []string) error
	GetTeacherCourseIDs(ctx context.Context, teacherId string) ([]string, error)
	AssignTeacherClasses(ctx context.Context, teacherId string, classIds []string) error
	GetTeacherClassIDs(ctx context.Context, teacherId string) ([]string, error)
	FindAllRoles(ctx context.Context) ([]*Role, error)
	FindRoleByID(ctx context.Context, id string) (*Role, error)
	ResetPassword(ctx context.Context, id string, newPasswordHash string) error
	UpdateProfile(ctx context.Context, id string, req UpdateProfileRequest, newPasswordHash string) (*Account, error)
}

type UseCase interface {
	Login(ctx context.Context, req LoginRequest) (*LoginResponse, error)
	GetAccountList(ctx context.Context, roleName string) ([]*Account, error)
	CreateAccount(ctx context.Context, account *Account) error
	UpdateAccount(ctx context.Context, id string, account *Account) error
	DeleteAccount(ctx context.Context, id string) error
	GetRoleList(ctx context.Context) ([]*Role, error)
	ResetPassword(ctx context.Context, id string, req ResetPasswordRequest) (*ResetPasswordResponse, error)
	SendAccessEmail(ctx context.Context, id string, customPassword string) error
	UpdateProfile(ctx context.Context, id string, req UpdateProfileRequest) (*Account, error)
}
