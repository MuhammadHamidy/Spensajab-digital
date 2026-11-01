package client

import (
	"context"
	"encoding/json"
)

type AuthSession struct {
	Sub         string `json:"sub"`
	Type        string `json:"type"`
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

type GeneralResponse struct {
	Success   bool            `json:"success"`
	Message   string          `json:"message"`
	Url       string          `json:"url"`
	Method    string          `json:"method"`
	Timestamp string          `json:"timestamp"`
	TotalData int             `json:"total_data"`
	Data      json.RawMessage `json:"data"`
}

type UserResponse struct {
	Id        int                 `json:"id"`
	Uuid      string              `json:"uuid"`
	Username  string              `json:"username"`
	Code      string              `json:"code"`
	FullName  string              `json:"full_name"`
	Nickname  string              `json:"nickname"`
	Email     string              `json:"email"`
	AltEmail  interface{}         `json:"alt_email"`
	JoinDate  string              `json:"join_date"`
	Title     string              `json:"title"`
	Status    string              `json:"status"`
	AppAccess []AppAccessResponse `json:"app_access"`
}

type AppAccessResponse struct {
	Uuid    string `json:"uuid"`
	Code    string `json:"code"`
	Name    string `json:"name"`
	BaseUrl string `json:"base_url"`
	Roles   []any  `json:"roles"`
}

type LoginResponse struct {
	Success            bool   `json:"success"`
	AccessToken        string `json:"access_token"`
	TokenType          string `json:"token_type"`
	ExpiresIn          int    `json:"expires_in"`
	FormattedExpiresIn any    `json:"formatted_expires_in"`
	Message            string `json:"message,omitempty"`
}

type IDP interface {
	Key() string
	Check(ctx context.Context, token string) (*AuthSession, error)
	Refresh(ctx context.Context, token string) (*AuthSession, error)

	// Auth
	Login(ctx context.Context, username, password string) (*LoginResponse, error)
	Logout(ctx context.Context, token string) (*GeneralResponse, error)
	ForgotPassword(ctx context.Context, email string) (*GeneralResponse, error)
	ResetPassword(ctx context.Context, token, email, password, confirmation string) (*GeneralResponse, error)
	ChangeMyPassword(ctx context.Context, token, current, new, confirmation string) (*GeneralResponse, error)
	ChangeUserPassword(ctx context.Context, token, username, password, confirmation string) (*GeneralResponse, error)
	GetMe(ctx context.Context, token string) (*GeneralResponse, error)
	GetMyApplications(ctx context.Context, token string) (*GeneralResponse, error)
	StartImpersonation(ctx context.Context, token, uuid string) (*GeneralResponse, error)
	LeaveImpersonation(ctx context.Context, token string) (*GeneralResponse, error)
	LogoutDevices(ctx context.Context, token string) (*GeneralResponse, error)
	GetActiveDevices(ctx context.Context, token string) (*GeneralResponse, error)
	GetActiveImpersonations(ctx context.Context, token string) (*GeneralResponse, error)

	// Client
	ClearSession(ctx context.Context, token string) (*GeneralResponse, error)
	GetUserByCode(ctx context.Context, token, code string) (*UserResponse, error)
	GetUserByUuid(ctx context.Context, uuid string) (*GeneralResponse, error)
	UpsertUser(ctx context.Context, body map[string]interface{}) (*GeneralResponse, error)

	// Applications
	GetApplications(ctx context.Context, token string, search string, page int) (*GeneralResponse, error)
	CreateApplication(ctx context.Context, token string, body map[string]interface{}) (*GeneralResponse, error)
	GetApplication(ctx context.Context, token, uuid string) (*GeneralResponse, error)
	UpdateApplication(ctx context.Context, token, uuid string, body map[string]interface{}) (*GeneralResponse, error)
	DeleteApplication(ctx context.Context, token, uuid string) (*GeneralResponse, error)
	UpdateApplicationStatus(ctx context.Context, token, uuid string) (*GeneralResponse, error)
	GetApplicationUsers(ctx context.Context, token, uuid string) (*GeneralResponse, error)

	// Notifications
	GetNotifications(ctx context.Context, token string, page int) (*GeneralResponse, error)
	CreateNotification(ctx context.Context, token string, body map[string]interface{}) (*GeneralResponse, error)
	MarkNotificationRead(ctx context.Context, token, uuid string) (*GeneralResponse, error)
	DeleteNotification(ctx context.Context, token, uuid string) (*GeneralResponse, error)
	MarkAllNotificationsRead(ctx context.Context, token string) (*GeneralResponse, error)

	// Roles
	GetRoles(ctx context.Context, token string, search string, page int) (*GeneralResponse, error)
	CreateRole(ctx context.Context, token string, body map[string]interface{}) (*GeneralResponse, error)
	GetRole(ctx context.Context, token, uuid string) (*GeneralResponse, error)
	UpdateRole(ctx context.Context, token, uuid string, body map[string]interface{}) (*GeneralResponse, error)
	DeleteRole(ctx context.Context, token, uuid string) (*GeneralResponse, error)

	// Users
	GetUsers(ctx context.Context, token string, search string, page, perPage int) (*GeneralResponse, error)
	CreateUser(ctx context.Context, token string, body map[string]interface{}) (*GeneralResponse, error)
	GetUser(ctx context.Context, token, uuid string) (*GeneralResponse, error)
	UpdateUser(ctx context.Context, token, uuid string, body map[string]interface{}) (*GeneralResponse, error)
	DeleteUser(ctx context.Context, token, uuid string) (*GeneralResponse, error)
	UpdateUserStatus(ctx context.Context, token, uuid string, body map[string]interface{}) (*GeneralResponse, error)
	GenerateUsername(ctx context.Context, token string, body map[string]interface{}) (*GeneralResponse, error)
	UpdateMyProfile(ctx context.Context, token string, body map[string]interface{}) (*GeneralResponse, error)
	ImportUsers(ctx context.Context, token, filePath string) (*GeneralResponse, error)
	GetLdapUsers(ctx context.Context, token string) (*GeneralResponse, error)

	// User Roles
	GetUserRoles(ctx context.Context, token string, params map[string]string) (*GeneralResponse, error)
	AssignUserRole(ctx context.Context, token string, body map[string]interface{}) (*GeneralResponse, error)
	RemoveUserRole(ctx context.Context, token, uuid string) (*GeneralResponse, error)
}
