package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/facerec/facerec-be/libraries/idp/client"
	"github.com/facerec/facerec-be/facerec/module/users/domain"
	"github.com/facerec/facerec-be/facerec/module/users/usecase"
	"github.com/facerec/facerec-be/facerec/tests/mocks"
)

func TestUseCase_Users(t *testing.T) {
	mockRepo := new(mocks.UsersRepositoryMock)
	mockIDPProvider := new(mocks.IDPProviderMock)
	mockIDPClient := new(mocks.IDPClientMock)

	uc := usecase.NewUseCase(mockRepo, mockIDPProvider)

	t.Run("FindAll", func(t *testing.T) {
		ctx := context.Background()
		filter := domain.UserFilter{InstitutionId: "inst-1"}
		usersList := []*domain.User{{Id: "u1"}}
		count := int64(1)

		mockRepo.On("FindAll", mock.Anything, filter).Return(usersList, count, nil).Once()

		res, c, err := uc.FindAll(ctx, filter)
		assert.NoError(t, err)
		assert.Equal(t, usersList, res)
		assert.Equal(t, count, c)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Get", func(t *testing.T) {
		ctx := context.Background()
		id := "u1"
		user := &domain.User{Id: id}

		mockRepo.On("FindByID", mock.Anything, id).Return(user, nil).Once()

		res, err := uc.Get(ctx, id)
		assert.NoError(t, err)
		assert.Equal(t, user, res)

		mockRepo.AssertExpectations(t)
	})

	t.Run("SyncUser_Success", func(t *testing.T) {
		ctx := context.Background()
		instId := "inst-1"
		token := "token"
		code := "code"

		idpUser := &client.UserResponse{
			Code:      code,
			FullName:  "Test User",
			Email:     "test@test.com",
			AppAccess: []client.AppAccessResponse{},
		}

		existingUser := (*domain.User)(nil)

		mockRepo.On("FindByExternalSubject", mock.Anything, instId, code).Return(existingUser, errors.New("not found")).Once()
		mockIDPProvider.On("GetIDP", mock.Anything, instId).Return(mockIDPClient, nil).Once()
		mockIDPClient.On("GetUserByCode", mock.Anything, token, code).Return(idpUser, nil).Once()
		mockIDPClient.On("Key").Return("uper").Once()

		mockRepo.On("Store", mock.Anything, mock.MatchedBy(func(u *domain.User) bool {
			return u.ExternalSubject == code && u.InstitutionId == instId
		})).Return(nil).Once()

		res, err := uc.SyncUser(ctx, instId, token, code)
		assert.NoError(t, err)
		assert.Equal(t, code, res.ExternalSubject)

		mockRepo.AssertExpectations(t)
		mockIDPProvider.AssertExpectations(t)
		mockIDPClient.AssertExpectations(t)
	})

	t.Run("UpdateStatus", func(t *testing.T) {
		ctx := context.Background()
		id := "u1"
		status := "active"
		by := "admin"

		mockRepo.On("UpdateStatus", mock.Anything, id, status, by).Return(nil).Once()

		err := uc.UpdateStatus(ctx, id, status, by)
		assert.NoError(t, err)

		mockRepo.AssertExpectations(t)
	})

	t.Run("AssignRole", func(t *testing.T) {
		ctx := context.Background()
		cmd := domain.AssignRoleCommand{
			UserId:        "u1",
			RoleId:        "r1",
			InstitutionId: "inst-1",
			GroupId:       "g1",
			AssignedBy:    "admin",
		}

		mockRepo.On("AssignRole", mock.Anything, mock.MatchedBy(func(ur *domain.UserRole) bool {
			return ur.UserId == cmd.UserId && ur.RoleId == cmd.RoleId
		})).Return(nil).Once()

		_, err := uc.AssignRole(ctx, cmd)
		assert.NoError(t, err)

		mockRepo.AssertExpectations(t)
	})

	t.Run("SyncUser_FailGetIDP", func(t *testing.T) {
		ctx := context.Background()
		instId := "inst-1"
		mockRepo.On("FindByExternalSubject", mock.Anything, instId, "c").Return((*domain.User)(nil), errors.New("404")).Once()
		mockIDPProvider.On("GetIDP", mock.Anything, instId).Return((*mocks.IDPClientMock)(nil), errors.New("fail")).Once()

		_, err := uc.SyncUser(ctx, instId, "t", "c")
		assert.Error(t, err)
		mockRepo.AssertExpectations(t)
		mockIDPProvider.AssertExpectations(t)
	})

	t.Run("SyncUser_FailFetch", func(t *testing.T) {
		ctx := context.Background()
		instId := "inst-1"
		mockRepo.On("FindByExternalSubject", mock.Anything, instId, "c").Return((*domain.User)(nil), errors.New("404")).Once()
		mockIDPProvider.On("GetIDP", mock.Anything, instId).Return(mockIDPClient, nil).Once()
		mockIDPClient.On("GetUserByCode", mock.Anything, "t", "c").Return((*client.UserResponse)(nil), errors.New("fail")).Once()

		_, err := uc.SyncUser(ctx, instId, "t", "c")
		assert.Error(t, err)
		mockRepo.AssertExpectations(t)
		mockIDPProvider.AssertExpectations(t)
		mockIDPClient.AssertExpectations(t)
	})

	t.Run("AssignRole_ValidationFail", func(t *testing.T) {
		ctx := context.Background()
		// Missing fields
		cmd := domain.AssignRoleCommand{}
		_, err := uc.AssignRole(ctx, cmd)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "missing required fields")
	})

	t.Run("AssignRole_RepoFail", func(t *testing.T) {
		ctx := context.Background()
		cmd := domain.AssignRoleCommand{
			UserId:        "u1",
			RoleId:        "r1",
			InstitutionId: "inst-1",
			GroupId:       "g1",
			AssignedBy:    "admin",
		}
		mockRepo.On("AssignRole", mock.Anything, mock.Anything).Return(errors.New("db error")).Once()
		_, err := uc.AssignRole(ctx, cmd)
		assert.Error(t, err)
		mockRepo.AssertExpectations(t)
	})

	t.Run("FindAll_Error", func(t *testing.T) {
		ctx := context.Background()
		mockRepo.On("FindAll", mock.Anything, mock.Anything).Return(([]*domain.User)(nil), int64(0), errors.New("error")).Once()
		_, _, err := uc.FindAll(ctx, domain.UserFilter{})
		assert.Error(t, err)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Get_Error", func(t *testing.T) {
		ctx := context.Background()
		mockRepo.On("FindByID", mock.Anything, "u1").Return((*domain.User)(nil), errors.New("error")).Once()
		_, err := uc.Get(ctx, "u1")
		assert.Error(t, err)
		mockRepo.AssertExpectations(t)
	})
}
