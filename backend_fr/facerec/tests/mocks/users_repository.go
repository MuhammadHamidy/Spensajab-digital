package mocks

import (
"context"

"github.com/facerec/facerec-be/facerec/module/users/domain"
"github.com/stretchr/testify/mock"
)

type UsersRepositoryMock struct {
mock.Mock
}

func (m *UsersRepositoryMock) FindAll(ctx context.Context, filter domain.UserFilter) ([]*domain.User, int64, error) {
args := m.Called(ctx, filter)
return args.Get(0).([]*domain.User), args.Get(1).(int64), args.Error(2)
}

func (m *UsersRepositoryMock) FindByID(ctx context.Context, id string) (*domain.User, error) {
args := m.Called(ctx, id)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*domain.User), args.Error(1)
}

func (m *UsersRepositoryMock) FindByExternalSubject(ctx context.Context, institutionId string, subject string) (*domain.User, error) {
args := m.Called(ctx, institutionId, subject)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*domain.User), args.Error(1)
}

func (m *UsersRepositoryMock) Store(ctx context.Context, user *domain.User) error {
args := m.Called(ctx, user)
return args.Error(0)
}

func (m *UsersRepositoryMock) UpdateStatus(ctx context.Context, id string, status string, updatedBy string) error {
args := m.Called(ctx, id, status, updatedBy)
return args.Error(0)
}

func (m *UsersRepositoryMock) AssignRole(ctx context.Context, userRole *domain.UserRole) error {
args := m.Called(ctx, userRole)
return args.Error(0)
}
