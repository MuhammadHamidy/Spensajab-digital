package http

import (
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/facerec/facerec-be/libraries/middleware"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/facerec/facerec-be/libraries/types"
	"github.com/facerec/facerec-be/facerec/module/users/domain"
)

type (
	GetUserResponse struct {
		Id              string         `json:"id"`
		InstitutionId   string         `json:"institution_id"`
		ExternalSubject string         `json:"external_subject"`
		Status          string         `json:"status"`
		Metadata        map[string]any `json:"metadata"`
	}
)

// GetUsers godoc
// @Summary      Get list of users
// @Description  Retrieve all users with pagination and search
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        page       query     int     false  "Page number"
// @Param        page_size  query     int     false  "Items per page"
// @Param        status     query     string  false  "Filter by status"
// @Param        search     query     string  false  "Search by external subject"
// @Success      200        {object}  responses.Response[[]GetUserResponse]
// @Failure      500        {object}  responses.Response[any]
// @Router       /users [get]
func (h *UserHandler) GetUsers(c *fiber.Ctx) error {
	ctx := c.UserContext()

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "10"))

	filter := domain.UserFilter{
		Pagination: types.Pagination{
			Page: page,
			Size: pageSize,
		},
		InstitutionId: c.Locals(middleware.XInstitutionId).(string),
		Status:        c.Query("status"),
		Search:        c.Query("search"),
	}

	users, total, err := h.useCase.FindAll(ctx, filter)
	if err != nil {
		return h.handleError(c, err)
	}

	result := make([]GetUserResponse, len(users))
	for i, userItem := range users {
		result[i] = GetUserResponse{
			Id:              userItem.Id,
			InstitutionId:   userItem.InstitutionId,
			ExternalSubject: userItem.ExternalSubject,
			Status:          userItem.Status,
			Metadata:        userItem.Metadata,
		}
	}

	meta := &responses.Meta{
		Page:       page,
		Size:       pageSize,
		Total:      total,
		TotalPages: (int(total) + pageSize - 1) / pageSize,
	}

	return c.Status(http.StatusOK).JSON(responses.SuccessWithMeta(result, "Users retrieved", meta))
}
