package mocks

import (
"context"

"github.com/facerec/facerec-be/facerec/module/roles/domain"
"github.com/stretchr/testify/mock"
)

type RolesUseCaseMock struct {
mock.Mock
}

func (m *RolesUseCaseMock) FindAll(ctx context.Context, filter domain.RoleFilter) ([]*domain.Role, int64, error) {
args := m.Called(ctx, filter)
return args.Get(0).([]*domain.Role), args.Get(1).(int64), args.Error(2)
}

func (m *RolesUseCaseMock) Get(ctx context.Context, id string) (*domain.Role, error) {
args := m.Called(ctx, id)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(*domain.Role), args.Error(1)
}

func (m *RolesUseCaseMock) Create(ctx context.Context, role *domain.Role) error {
args := m.Called(ctx, role)
return args.Error(0)
}

func (m *RolesUseCaseMock) Update(ctx context.Context, role *domain.Role) error {
args := m.Called(ctx, role)
return args.Error(0)
}

func (m *RolesUseCaseMock) Delete(ctx context.Context, institutionId string, id string) error {
args := m.Called(ctx, institutionId, id)
return args.Error(0)
}

func (m *RolesUseCaseMock) ListPermissions(ctx context.Context, filter domain.PermissionFilter) ([]*domain.Permission, error) {
args := m.Called(ctx, filter)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).([]*domain.Permission), args.Error(1)
}
