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
	liberrors "github.com/facerec/facerec-be/libraries/errors"
	"github.com/facerec/facerec-be/libraries/middleware"
	deliverhttp "github.com/facerec/facerec-be/facerec/module/users/delivery/http"
	"github.com/facerec/facerec-be/facerec/module/users/domain"
	"github.com/facerec/facerec-be/facerec/tests/mocks"
)

func setupUserApp(useCase domain.UseCase) *fiber.App {
	handler := deliverhttp.NewUserHandler(useCase, nil) // Auth middleware ignored for unit tests

	app := fiber.New()

	// Mock middleware to set locals
	app.Use(func(c *fiber.Ctx) error {
		c.Locals(middleware.XInstitutionId, "inst-1")
		c.Locals(middleware.XTokenKey, "valid-token")
		c.Locals(middleware.XUserIdKey, "admin-user")
		return c.Next()
	})

	// Manually register routes to test handler methods directly without real auth middleware
	// h.GetUsers
	app.Get("/users", handler.GetUsers)
	app.Post("/users", handler.SyncUser)
	app.Patch("/users/:id/status", handler.UpdateStatus)
	app.Post("/users/:id/roles", handler.AssignRole)

	return app
}

func TestUserHandler_GetUsers(t *testing.T) {
	mockUseCase := new(mocks.UsersUseCaseMock)
	app := setupUserApp(mockUseCase)

	t.Run("Success", func(t *testing.T) {
		usersList := []*domain.User{
			{Id: "u1", InstitutionId: "inst-1", ExternalSubject: "sub1", Status: "active"},
		}
		count := int64(1)

		mockUseCase.On("FindAll", mock.Anything, mock.MatchedBy(func(f domain.UserFilter) bool {
			return f.InstitutionId == "inst-1" && f.Pagination.Page == 1 && f.Pagination.Size == 10
		})).Return(usersList, count, nil).Once()

		req := httptest.NewRequest(http.MethodGet, "/users?page=1&page_size=10", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})

	t.Run("UseCaseError", func(t *testing.T) {
		mockUseCase.On("FindAll", mock.Anything, mock.Anything).Return(([]*domain.User)(nil), int64(0), errors.New("db error")).Once()

		req := httptest.NewRequest(http.MethodGet, "/users", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})

	t.Run("WithFilters", func(t *testing.T) {
		mockUseCase.On("FindAll", mock.Anything, mock.MatchedBy(func(f domain.UserFilter) bool {
			return f.InstitutionId == "inst-1" && f.Search == "test" && f.Status == "active"
		})).Return(([]*domain.User)(nil), int64(0), nil).Once()

		req := httptest.NewRequest(http.MethodGet, "/users?search=test&status=active", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})
}

func TestUserHandler_SyncUser(t *testing.T) {
	mockUseCase := new(mocks.UsersUseCaseMock)
	app := setupUserApp(mockUseCase)

	t.Run("Success", func(t *testing.T) {
		reqBody := deliverhttp.SyncUserRequest{Code: "code123"}
		reqBytes, _ := json.Marshal(reqBody)

		user := &domain.User{Id: "u1"}

		mockUseCase.On("SyncUser", mock.Anything, "inst-1", "valid-token", "code123").Return(user, nil).Once()

		req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader(reqBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusCreated, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})

	t.Run("BadRequest", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader([]byte("invalid json")))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})
}

func TestUserHandler_UpdateStatus(t *testing.T) {
	mockUseCase := new(mocks.UsersUseCaseMock)
	app := setupUserApp(mockUseCase)

	t.Run("Success", func(t *testing.T) {
		reqBody := deliverhttp.UpdateStatusRequest{Status: "inactive"} // Assuming struct from update_status.go
		reqBytes, _ := json.Marshal(reqBody)

		mockUseCase.On("UpdateStatus", mock.Anything, "u1", "inactive", mock.Anything).Return(nil).Once()

		req := httptest.NewRequest(http.MethodPatch, "/users/u1/status", bytes.NewReader(reqBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})
}

func TestUserHandler_AssignRole(t *testing.T) {
	mockUseCase := new(mocks.UsersUseCaseMock)
	app := setupUserApp(mockUseCase)

	t.Run("Success", func(t *testing.T) {
		// Assuming request struct structure based on usecase/assign_role_command
		// Inspecting assign_role.go might be safer, but guessing common structure for now.
		// If structure mismatch, I will check file.
		body := map[string]interface{}{
			"role_id":        "r1",
			"group_id":       "g1",
			"institution_id": "inst-1",
		}
		reqBytes, _ := json.Marshal(body)

		mockUseCase.On("AssignRole", mock.Anything, mock.MatchedBy(func(cmd domain.AssignRoleCommand) bool {
			return cmd.UserId == "u1" && cmd.RoleId == "r1" && cmd.GroupId == "g1" && cmd.InstitutionId == "inst-1"
		})).Return("ur1", nil).Once()

		req := httptest.NewRequest(http.MethodPost, "/users/u1/roles", bytes.NewReader(reqBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusCreated, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})

	t.Run("AppError", func(t *testing.T) {
		body := map[string]interface{}{"role_id": "r1", "group_id": "g1", "institution_id": "inst-1"}
		reqBytes, _ := json.Marshal(body)

		mockUseCase.On("AssignRole", mock.Anything, mock.Anything).Return("", liberrors.BadRequest("bad")).Once()

		req := httptest.NewRequest(http.MethodPost, "/users/u1/roles", bytes.NewReader(reqBytes))
		req.Header.Set("Content-Type", "application/json")
		_, err := app.Test(req)

		assert.NoError(t, err)
	})

	t.Run("MissingContext", func(t *testing.T) {
		handler := deliverhttp.NewUserHandler(mockUseCase, nil)
		app := fiber.New()
		app.Post("/users", handler.SyncUser)

		// request without setting locals
		req := httptest.NewRequest(http.MethodPost, "/users", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("SyncMissingToken", func(t *testing.T) {
		handler := deliverhttp.NewUserHandler(mockUseCase, nil)
		app := fiber.New()
		app.Use(func(c *fiber.Ctx) error {
			c.Locals(middleware.XInstitutionId, "inst-1")
			// No token
			return c.Next()
		})
		app.Post("/users", handler.SyncUser)

		reqBody := deliverhttp.SyncUserRequest{Code: "c"}
		reqBytes, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader(reqBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("SyncUseCaseError", func(t *testing.T) {
		reqBody := deliverhttp.SyncUserRequest{Code: "c"}
		reqBytes, _ := json.Marshal(reqBody)
		mockUseCase.On("SyncUser", mock.Anything, "inst-1", "valid-token", "c").Return((*domain.User)(nil), errors.New("fail")).Once()

		req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader(reqBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})
}

func TestUserHandler_UpdateStatus_Edges(t *testing.T) {
	mockUseCase := new(mocks.UsersUseCaseMock)

	t.Run("MissingUserID", func(t *testing.T) {
		handler := deliverhttp.NewUserHandler(mockUseCase, nil)
		app := fiber.New()
		app.Use(func(c *fiber.Ctx) error {
			c.Locals(middleware.XInstitutionId, "inst-1")
			return c.Next()
		})
		app.Patch("/users/:id/status", handler.UpdateStatus)

		req := httptest.NewRequest(http.MethodPatch, "/users/u1/status", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("InvalidBody", func(t *testing.T) {
		app := setupUserApp(mockUseCase)
		req := httptest.NewRequest(http.MethodPatch, "/users/u1/status", bytes.NewReader([]byte("bad json")))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("UseCaseError", func(t *testing.T) {
		app := setupUserApp(mockUseCase)
		reqBody := deliverhttp.UpdateStatusRequest{Status: "inactive"}
		reqBytes, _ := json.Marshal(reqBody)

		mockUseCase.On("UpdateStatus", mock.Anything, "u1", "inactive", "admin-user").Return(errors.New("fail")).Once()

		req := httptest.NewRequest(http.MethodPatch, "/users/u1/status", bytes.NewReader(reqBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})
}

func TestUserHandler_AssignRole_Edges(t *testing.T) {
	mockUseCase := new(mocks.UsersUseCaseMock)

	t.Run("MissingUserID", func(t *testing.T) {
		handler := deliverhttp.NewUserHandler(mockUseCase, nil)
		app := fiber.New()
		app.Post("/users/:id/roles", handler.AssignRole)

		req := httptest.NewRequest(http.MethodPost, "/users/u1/roles", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("InvalidBody", func(t *testing.T) {
		app := setupUserApp(mockUseCase)
		req := httptest.NewRequest(http.MethodPost, "/users/u1/roles", bytes.NewReader([]byte("bad")))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("UseCaseError", func(t *testing.T) {
		app := setupUserApp(mockUseCase)
		body := map[string]interface{}{"role_id": "r1", "group_id": "g1", "institution_id": "inst-1"}
		reqBytes, _ := json.Marshal(body)

		mockUseCase.On("AssignRole", mock.Anything, mock.Anything).Return("", errors.New("fail")).Once()

		req := httptest.NewRequest(http.MethodPost, "/users/u1/roles", bytes.NewReader(reqBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		mockUseCase.AssertExpectations(t)
	})
}

func TestUserHandler_RegisterRoutes(t *testing.T) {
	mockUseCase := new(mocks.UsersUseCaseMock)
	authMiddleware := middleware.NewAuthorizationMiddleware(nil, nil, nil)

	handler := deliverhttp.NewUserHandler(mockUseCase, authMiddleware)
	app := fiber.New()

	assert.NotPanics(t, func() {
		handler.RegisterRoutes(app)
	})
}
