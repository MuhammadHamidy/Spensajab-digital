package mocks

import (
"context"

"github.com/facerec/facerec-be/facerec/module/users/domain"
"github.com/stretchr/testify/mock"
)

type UsersUseCaseMock struct {
mock.Mock
}

func (m *UsersUseCaseMock) FindAll(ctx context.Context, filter domain.UserFilter) ([]*domain.User, int64, error) {
args := m.Called(ctx, filter)
return args.Get(0).([]*domain.User), args.Get(1).(int64), args.Error(2)
}

func (m *UsersUseCaseMock) Get(ctx context.Context, id string) (*domain.User, error) {
args := m.Called(ctx, id)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*domain.User), args.Error(1)
}

func (m *UsersUseCaseMock) SyncUser(ctx context.Context, institutionId string, token string, code string) (*domain.User, error) {
args := m.Called(ctx, institutionId, token, code)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*domain.User), args.Error(1)
}

func (m *UsersUseCaseMock) UpdateStatus(ctx context.Context, id string, status string, updatedBy string) error {
args := m.Called(ctx, id, status, updatedBy)
return args.Error(0)
}

func (m *UsersUseCaseMock) AssignRole(ctx context.Context, cmd domain.AssignRoleCommand) (string, error) {
args := m.Called(ctx, cmd)
return args.String(0), args.Error(1)
}
