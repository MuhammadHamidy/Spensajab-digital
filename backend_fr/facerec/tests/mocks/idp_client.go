package mocks

import (
"context"

"github.com/facerec/facerec-be/libraries/idp/client"
"github.com/stretchr/testify/mock"
)

// IDPClientMock implements client.IDP interface
type IDPClientMock struct {
mock.Mock
}

func (m *IDPClientMock) Key() string {
args := m.Called()
return args.String(0)
}

func (m *IDPClientMock) Check(ctx context.Context, token string) (*client.AuthSession, error) {
args := m.Called(ctx, token)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.AuthSession), args.Error(1)
}

func (m *IDPClientMock) Refresh(ctx context.Context, token string) (*client.AuthSession, error) {
args := m.Called(ctx, token)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.AuthSession), args.Error(1)
}

func (m *IDPClientMock) Login(ctx context.Context, username, password string) (*client.LoginResponse, error) {
args := m.Called(ctx, username, password)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.LoginResponse), args.Error(1)
}

func (m *IDPClientMock) Logout(ctx context.Context, token string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) ForgotPassword(ctx context.Context, email string) (*client.GeneralResponse, error) {
args := m.Called(ctx, email)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) ResetPassword(ctx context.Context, token, email, password, confirmation string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, email, password, confirmation)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) ChangeMyPassword(ctx context.Context, token, current, newPwd, confirmation string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, current, newPwd, confirmation)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) ChangeUserPassword(ctx context.Context, token, username, password, confirmation string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, username, password, confirmation)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GetMe(ctx context.Context, token string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GetMyApplications(ctx context.Context, token string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) StartImpersonation(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) LeaveImpersonation(ctx context.Context, token string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) LogoutDevices(ctx context.Context, token string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GetActiveDevices(ctx context.Context, token string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GetActiveImpersonations(ctx context.Context, token string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) ClearSession(ctx context.Context, token string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GetUserByCode(ctx context.Context, token, code string) (*client.UserResponse, error) {
args := m.Called(ctx, token, code)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.UserResponse), args.Error(1)
}

func (m *IDPClientMock) GetUserByUuid(ctx context.Context, uuid string) (*client.GeneralResponse, error) {
args := m.Called(ctx, uuid)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) UpsertUser(ctx context.Context, body map[string]interface{}) (*client.GeneralResponse, error) {
args := m.Called(ctx, body)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GetApplications(ctx context.Context, token string, search string, page int) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, search, page)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) CreateApplication(ctx context.Context, token string, body map[string]interface{}) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, body)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GetApplication(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) UpdateApplication(ctx context.Context, token, uuid string, body map[string]interface{}) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid, body)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) DeleteApplication(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) UpdateApplicationStatus(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GetApplicationUsers(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GetNotifications(ctx context.Context, token string, page int) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, page)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) CreateNotification(ctx context.Context, token string, body map[string]interface{}) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, body)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) MarkNotificationRead(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) DeleteNotification(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) MarkAllNotificationsRead(ctx context.Context, token string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GetRoles(ctx context.Context, token string, search string, page int) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, search, page)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) CreateRole(ctx context.Context, token string, body map[string]interface{}) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, body)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GetRole(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) UpdateRole(ctx context.Context, token, uuid string, body map[string]interface{}) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid, body)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) DeleteRole(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GetUsers(ctx context.Context, token string, search string, page, perPage int) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, search, page, perPage)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) CreateUser(ctx context.Context, token string, body map[string]interface{}) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, body)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GetUser(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) UpdateUser(ctx context.Context, token, uuid string, body map[string]interface{}) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid, body)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) DeleteUser(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) UpdateUserStatus(ctx context.Context, token, uuid string, body map[string]interface{}) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid, body)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GenerateUsername(ctx context.Context, token string, body map[string]interface{}) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, body)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) UpdateMyProfile(ctx context.Context, token string, body map[string]interface{}) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, body)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) ImportUsers(ctx context.Context, token, filePath string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, filePath)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GetLdapUsers(ctx context.Context, token string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) GetUserRoles(ctx context.Context, token string, params map[string]string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, params)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) AssignUserRole(ctx context.Context, token string, body map[string]interface{}) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, body)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}

func (m *IDPClientMock) RemoveUserRole(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
args := m.Called(ctx, token, uuid)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*client.GeneralResponse), args.Error(1)
}
