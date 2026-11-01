package http_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/facerec/facerec-be/libraries/middleware"
	deliverhttp "github.com/facerec/facerec-be/facerec/module/roles/delivery/http"
	"github.com/facerec/facerec-be/facerec/module/roles/domain"
	"github.com/facerec/facerec-be/facerec/tests/mocks"
)

func setupRoleApp(useCase domain.UseCase) *fiber.App {
	handler := deliverhttp.NewRoleHandler(useCase, nil)

	app := fiber.New()

	// Mock middleware
	app.Use(func(c *fiber.Ctx) error {
		c.Locals(middleware.XInstitutionId, "inst-1")
		c.Locals(middleware.XUserIdKey, "admin-user")
		return c.Next()
	})

	app.Get("/roles", handler.GetRoles)
	app.Get("/roles/permissions", handler.GetPermissions)
	app.Post("/roles", handler.CreateRole)
	app.Put("/roles/:id", handler.UpdateRole)
	app.Delete("/roles/:id", handler.DeleteRole)
	app.Get("/roles/:id", handler.GetRoleByID)

	return app
}

func TestRoleHandler_GetRoles(t *testing.T) {
	mockUseCase := new(mocks.RolesUseCaseMock)
	app := setupRoleApp(mockUseCase)

	t.Run("Success", func(t *testing.T) {
		roles := []*domain.Role{{Id: "r1", Name: "Role 1"}}
		count := int64(1)

		mockUseCase.On("FindAll", mock.Anything, mock.Anything).Return(roles, count, nil).Once()

		req := httptest.NewRequest(http.MethodGet, "/roles", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})

	t.Run("Error", func(t *testing.T) {
		mockUseCase.On("FindAll", mock.Anything, mock.Anything).Return(([]*domain.Role)(nil), int64(0), errors.New("fail")).Once()

		req := httptest.NewRequest(http.MethodGet, "/roles", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})
}

func TestRoleHandler_GetPermissions(t *testing.T) {
	mockUseCase := new(mocks.RolesUseCaseMock)
	app := setupRoleApp(mockUseCase)

	t.Run("Success", func(t *testing.T) {
		perms := []*domain.Permission{{Code: "p1", Description: "Perm 1"}}
		mockUseCase.On("ListPermissions", mock.Anything, mock.Anything).Return(perms, nil).Once()

		req := httptest.NewRequest(http.MethodGet, "/roles/permissions", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})
}

func TestRoleHandler_CreateRole(t *testing.T) {
	mockUseCase := new(mocks.RolesUseCaseMock)
	app := setupRoleApp(mockUseCase)

	t.Run("Success", func(t *testing.T) {
		// Verify Struct in create_role.go to be safe
		reqBody := map[string]interface{}{
			"name":        "New Role",
			"permissions": []string{"p1", "p2"},
		}
		reqBytes, _ := json.Marshal(reqBody)

		mockUseCase.On("Create", mock.Anything, mock.MatchedBy(func(r *domain.Role) bool {
			return r.Name == "New Role" && len(r.Permissions) == 2 && r.InstitutionId == "inst-1"
		})).Return(nil).Once()

		req := httptest.NewRequest(http.MethodPost, "/roles", bytes.NewReader(reqBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusCreated, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})

	t.Run("BadRequest", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/roles", bytes.NewReader([]byte("invalid")))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})
}

func TestRoleHandler_UpdateRole(t *testing.T) {
	mockUseCase := new(mocks.RolesUseCaseMock)
	app := setupRoleApp(mockUseCase)

	t.Run("Success", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"name":        "Updated Role",
			"permissions": []string{"p1"},
		}
		reqBytes, _ := json.Marshal(reqBody)

		mockUseCase.On("Update", mock.Anything, mock.MatchedBy(func(r *domain.Role) bool {
			return r.Id == "r1" && r.Name == "Updated Role" && r.InstitutionId == "inst-1"
		})).Return(nil).Once()

		req := httptest.NewRequest(http.MethodPut, "/roles/r1", bytes.NewReader(reqBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})

	t.Run("EmptyName", func(t *testing.T) {
		reqBody := map[string]interface{}{"name": "", "permissions": []string{}}
		reqBytes, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPut, "/roles/r1", bytes.NewReader(reqBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})
}

func TestRoleHandler_DeleteRole(t *testing.T) {
	mockUseCase := new(mocks.RolesUseCaseMock)
	app := setupRoleApp(mockUseCase)

	t.Run("Success", func(t *testing.T) {
		mockUseCase.On("Delete", mock.Anything, "inst-1", "r1").Return(nil).Once()

		req := httptest.NewRequest(http.MethodDelete, "/roles/r1", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})

	t.Run("UseCaseError", func(t *testing.T) {
		mockUseCase.On("Delete", mock.Anything, "inst-1", "r1").Return(errors.New("fail")).Once()

		req := httptest.NewRequest(http.MethodDelete, "/roles/r1", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})

	t.Run("MissingContext", func(t *testing.T) {
		handler := deliverhttp.NewRoleHandler(mockUseCase, nil)
		app := fiber.New()
		app.Delete("/roles/:id", handler.DeleteRole)

		req := httptest.NewRequest(http.MethodDelete, "/roles/r1", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
}

func TestRoleHandler_GetRoleByID(t *testing.T) {
	mockUseCase := new(mocks.RolesUseCaseMock)
	app := setupRoleApp(mockUseCase)

	t.Run("Success", func(t *testing.T) {
		role := &domain.Role{Id: "r1", Name: "R1"}
		mockUseCase.On("Get", mock.Anything, "r1").Return(role, nil).Once()

		req := httptest.NewRequest(http.MethodGet, "/roles/r1", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})
}

func TestRoleHandler_CreateRole_Edges(t *testing.T) {
	mockUseCase := new(mocks.RolesUseCaseMock)

	t.Run("MissingContext", func(t *testing.T) {
		handler := deliverhttp.NewRoleHandler(mockUseCase, nil)
		app := fiber.New()
		app.Post("/roles", handler.CreateRole)

		req := httptest.NewRequest(http.MethodPost, "/roles", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("UseCaseError", func(t *testing.T) {
		app := setupRoleApp(mockUseCase)
		reqBody := map[string]interface{}{"name": "N", "permissions": []string{}}
		reqBytes, _ := json.Marshal(reqBody)

		mockUseCase.On("Create", mock.Anything, mock.Anything).Return(errors.New("fail")).Once()

		req := httptest.NewRequest(http.MethodPost, "/roles", bytes.NewReader(reqBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})
}

func TestRoleHandler_GetPermissions_Error(t *testing.T) {
	mockUseCase := new(mocks.RolesUseCaseMock)
	app := setupRoleApp(mockUseCase)

	t.Run("UseCaseError", func(t *testing.T) {
		mockUseCase.On("ListPermissions", mock.Anything, mock.Anything).Return(([]*domain.Permission)(nil), errors.New("fail")).Once()

		req := httptest.NewRequest(http.MethodGet, "/roles/permissions", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})
}

func TestRoleHandler_GetRoleByID_Error(t *testing.T) {
	mockUseCase := new(mocks.RolesUseCaseMock)
	app := setupRoleApp(mockUseCase)

	t.Run("UseCaseError", func(t *testing.T) {
		mockUseCase.On("Get", mock.Anything, "r1").Return((*domain.Role)(nil), errors.New("fail")).Once()

		req := httptest.NewRequest(http.MethodGet, "/roles/r1", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})

	t.Run("EmptyName", func(t *testing.T) {
		app := setupRoleApp(mockUseCase)
		reqBody := map[string]interface{}{"name": "", "permissions": []string{}}
		reqBytes, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/roles", bytes.NewReader(reqBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})
}

func TestRoleHandler_RegisterRoutes(t *testing.T) {
	mockUseCase := new(mocks.RolesUseCaseMock)
	authMiddleware := middleware.NewAuthorizationMiddleware(nil, nil, nil)

	handler := deliverhttp.NewRoleHandler(mockUseCase, authMiddleware)
	app := fiber.New()

	assert.NotPanics(t, func() {
		handler.RegisterRoutes(app)
	})
}
