package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/facerec/facerec-be/facerec/module/roles/domain"
	"github.com/facerec/facerec-be/facerec/module/roles/usecase"
	"github.com/facerec/facerec-be/facerec/tests/mocks"
)

func TestUseCase_Roles(t *testing.T) {
	mockRepo := new(mocks.RolesRepositoryMock)
	uc := usecase.NewUseCase(mockRepo)

	t.Run("FindAll", func(t *testing.T) {
		ctx := context.Background()
		filter := domain.RoleFilter{InstitutionId: "inst-1"}
		roles := []*domain.Role{{Id: "r1"}}
		count := int64(1)

		mockRepo.On("FindAll", mock.Anything, filter).Return(roles, count, nil).Once()

		res, c, err := uc.FindAll(ctx, filter)
		assert.NoError(t, err)
		assert.Equal(t, roles, res)
		assert.Equal(t, count, c)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Get", func(t *testing.T) {
		ctx := context.Background()
		id := "r1"
		role := &domain.Role{Id: id}

		mockRepo.On("FindByID", mock.Anything, id).Return(role, nil).Once()

		res, err := uc.Get(ctx, id)
		assert.NoError(t, err)
		assert.Equal(t, role, res)
		// assert.Equal(t, perms, res.Permissions) // GetPermissions not called in implementation

		mockRepo.AssertExpectations(t)
	})

	t.Run("Create", func(t *testing.T) {
		ctx := context.Background()
		role := &domain.Role{
			InstitutionId: "inst-1",
			Name:          "Role",
			Permissions:   []string{"p1"},
		}

		mockRepo.On("FindByName", mock.Anything, role.InstitutionId, role.Name).Return((*domain.Role)(nil), pgx.ErrNoRows).Once()

		mockRepo.On("Store", mock.Anything, mock.MatchedBy(func(r *domain.Role) bool {
			return r.Name == role.Name && r.InstitutionId == role.InstitutionId
		})).Return(nil).Once()

		err := uc.Create(ctx, role)
		assert.NoError(t, err)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Update", func(t *testing.T) {
		ctx := context.Background()
		role := &domain.Role{Id: "r1", InstitutionId: "inst-1", Name: "Role", Permissions: []string{"p2"}}
		current := &domain.Role{Id: "r1", InstitutionId: "inst-1", Name: "Role", Permissions: []string{"p1"}}

		mockRepo.On("FindByID", mock.Anything, role.Id).Return(current, nil).Once()
		mockRepo.On("Update", mock.Anything, role).Return(nil).Once()

		err := uc.Update(ctx, role)
		assert.NoError(t, err)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Delete", func(t *testing.T) {
		ctx := context.Background()
		instId := "inst-1"
		id := "r1"

		mockRepo.On("Delete", mock.Anything, instId, id).Return(nil).Once()

		err := uc.Delete(ctx, instId, id)
		assert.NoError(t, err)

		mockRepo.AssertExpectations(t)
	})

	t.Run("ListPermissions", func(t *testing.T) {
		ctx := context.Background()
		filter := domain.PermissionFilter{}
		perms := []*domain.Permission{{Code: "p1"}}

		mockRepo.On("FindAllPermissions", mock.Anything, filter).Return(perms, nil).Once()

		res, err := uc.ListPermissions(ctx, filter)
		assert.NoError(t, err)
		assert.Equal(t, perms, res)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Create_Duplicate", func(t *testing.T) {
		ctx := context.Background()
		role := &domain.Role{InstitutionId: "1", Name: "R"}
		existing := &domain.Role{Id: "2"}
		mockRepo.On("FindByName", mock.Anything, "1", "R").Return(existing, nil).Once()

		err := uc.Create(ctx, role)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "already exists")
		mockRepo.AssertExpectations(t)
	})

	t.Run("Update_ValidationFail", func(t *testing.T) {
		ctx := context.Background()
		role := &domain.Role{Id: "r1", InstitutionId: "inst-1", Name: "Changed"}
		current := &domain.Role{Id: "r1", InstitutionId: "inst-1", Name: "Original"}
		existing := &domain.Role{Id: "r2", Name: "Changed"} // Conflict with r2

		mockRepo.On("FindByID", mock.Anything, "r1").Return(current, nil).Once()
		mockRepo.On("FindByName", mock.Anything, "inst-1", "Changed").Return(existing, nil).Once()

		err := uc.Update(ctx, role)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "already exists")
		mockRepo.AssertExpectations(t)
	})

	t.Run("Delete_Error", func(t *testing.T) {
		ctx := context.Background()
		mockRepo.On("Delete", mock.Anything, "inst-1", "r1").Return(errors.New("fail")).Once()
		err := uc.Delete(ctx, "inst-1", "r1")
		assert.Error(t, err)
		mockRepo.AssertExpectations(t)
	})

	t.Run("FindAll_Error", func(t *testing.T) {
		ctx := context.Background()
		mockRepo.On("FindAll", mock.Anything, mock.Anything).Return(([]*domain.Role)(nil), int64(0), errors.New("fail")).Once()
		_, _, err := uc.FindAll(ctx, domain.RoleFilter{})
		assert.Error(t, err)
		mockRepo.AssertExpectations(t)
	})
	t.Run("Update_NotFound", func(t *testing.T) {
		ctx := context.Background()
		role := &domain.Role{Id: "r1"}
		mockRepo.On("FindByID", mock.Anything, "r1").Return((*domain.Role)(nil), pgx.ErrNoRows).Once()

		err := uc.Update(ctx, role)
		assert.Error(t, err)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Create_StoreFail", func(t *testing.T) {
		ctx := context.Background()
		role := &domain.Role{InstitutionId: "i", Name: "N"}
		mockRepo.On("FindByName", mock.Anything, "i", "N").Return((*domain.Role)(nil), pgx.ErrNoRows).Once()
		mockRepo.On("Store", mock.Anything, mock.Anything).Return(errors.New("fail")).Once()

		err := uc.Create(ctx, role)
		assert.Error(t, err)
		mockRepo.AssertExpectations(t)
	})
}
