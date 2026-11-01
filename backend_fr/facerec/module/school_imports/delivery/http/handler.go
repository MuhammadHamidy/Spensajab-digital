package http

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/facerec/facerec-be/facerec/module/school_imports/domain"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

type SchoolImportHandler struct {
	useCase domain.UseCase
}

func NewSchoolImportHandler(useCase domain.UseCase) *SchoolImportHandler {
	return &SchoolImportHandler{useCase: useCase}
}

func (h *SchoolImportHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/school/import")

	api.Post("/students", h.ImportStudents)
	api.Post("/teachers", h.ImportTeachers)
	api.Get("/template/students", h.DownloadStudentTemplate)
	api.Get("/template/teachers", h.DownloadTeacherTemplate)
}

func (h *SchoolImportHandler) ImportStudents(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "File excel (.xlsx) wajib diunggah"))
	}

	if !strings.HasSuffix(strings.ToLower(file.Filename), ".xlsx") {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Ekstensi file harus berformat .xlsx"))
	}

	src, err := file.Open()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("FILE_OPEN_ERROR", err.Error()))
	}
	defer src.Close()

	res, err := h.useCase.ImportStudentsFromExcel(c.Context(), src)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("IMPORT_FAILED", err.Error()))
	}

	if len(res.Errors) > 0 {
		return c.Status(http.StatusUnprocessableEntity).JSON(responses.Response[any]{
			Success: false,
			Message: fmt.Sprintf("Ditemukan %d kesalahan pada file Excel", len(res.Errors)),
			Data:    res,
			Error: &responses.Error{
				Code:    "VALIDATION_ERROR",
				Message: fmt.Sprintf("Ditemukan %d kesalahan pada file Excel", len(res.Errors)),
			},
		})
	}

	return c.Status(http.StatusOK).JSON(responses.Success(res, fmt.Sprintf("Berhasil mengimpor %d siswa", res.Inserted)))
}

func (h *SchoolImportHandler) ImportTeachers(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "File excel (.xlsx) wajib diunggah"))
	}

	if !strings.HasSuffix(strings.ToLower(file.Filename), ".xlsx") {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Ekstensi file harus berformat .xlsx"))
	}

	src, err := file.Open()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("FILE_OPEN_ERROR", err.Error()))
	}
	defer src.Close()

	res, err := h.useCase.ImportTeachersFromExcel(c.Context(), src)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("IMPORT_FAILED", err.Error()))
	}

	if len(res.Errors) > 0 {
		return c.Status(http.StatusUnprocessableEntity).JSON(responses.Response[any]{
			Success: false,
			Message: fmt.Sprintf("Ditemukan %d kesalahan pada file Excel", len(res.Errors)),
			Data:    res,
			Error: &responses.Error{
				Code:    "VALIDATION_ERROR",
				Message: fmt.Sprintf("Ditemukan %d kesalahan pada file Excel", len(res.Errors)),
			},
		})
	}

	return c.Status(http.StatusOK).JSON(responses.Success(res, fmt.Sprintf("Berhasil mengimpor %d guru", res.Inserted)))
}

func (h *SchoolImportHandler) DownloadStudentTemplate(c *fiber.Ctx) error {
	bytes, err := h.useCase.GenerateStudentTemplateExcel()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("TEMPLATE_GEN_ERROR", err.Error()))
	}

	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", "attachment; filename=template_import_siswa.xlsx")
	return c.Status(http.StatusOK).Send(bytes)
}

func (h *SchoolImportHandler) DownloadTeacherTemplate(c *fiber.Ctx) error {
	bytes, err := h.useCase.GenerateTeacherTemplateExcel()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("TEMPLATE_GEN_ERROR", err.Error()))
	}

	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", "attachment; filename=template_import_guru.xlsx")
	return c.Status(http.StatusOK).Send(bytes)
}
