package http

import (
	"net/http"
	"strconv"

	"github.com/facerec/facerec-be/facerec/module/school_attendances/domain"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

type SchoolAttendanceHandler struct {
	useCase domain.UseCase
}

func NewSchoolAttendanceHandler(useCase domain.UseCase) *SchoolAttendanceHandler {
	return &SchoolAttendanceHandler{useCase: useCase}
}

func (h *SchoolAttendanceHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/school")

	// Sesi Kelas
	api.Post("/sessions/open", h.OpenSession)
	api.Post("/sessions/:id/close", h.CloseSession)
	api.Get("/sessions/:id", h.GetSessionDetail)
	api.Get("/sessions", h.GetSessions)

	// Pemindaian & Override Kehadiran
	api.Post("/sessions/:id/scan", h.ScanQRCode)
	api.Put("/sessions/:id/attendances/:student_id", h.ManualOverride)

	// Monitoring Live & Tools
	api.Get("/monitoring/live", h.GetLiveMonitoring)
	api.Get("/reports/attendance", h.GetAttendanceReport)
	api.Get("/qrcode/:token", h.GetQRCodeImage)

	// Kelola Mata Pelajaran (1 Admin)
	api.Get("/courses", h.GetCourses)
	api.Post("/courses", h.CreateCourse)
	api.Delete("/courses/:id", h.DeleteCourse)
	api.Get("/classes", h.GetClasses)
	api.Post("/classes", h.CreateClass)
	api.Put("/classes/:id", h.UpdateClass)
	api.Delete("/classes/:id", h.DeleteClass)
}

func (h *SchoolAttendanceHandler) OpenSession(c *fiber.Ctx) error {
	var req domain.OpenSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	// Identitas guru harus berasal dari request yang sudah diautentikasi.
	teacherID := c.Get("X-User-Id", "")

	sess, err := h.useCase.OpenSession(c.Context(), teacherID, req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("OPEN_SESSION_ERROR", err.Error()))
	}

	return c.Status(http.StatusCreated).JSON(responses.Success(sess, "Sesi kelas berhasil dibuka. Timer 15 menit berjalan."))
}

func (h *SchoolAttendanceHandler) CloseSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	teacherID := c.Get("X-User-Id", "")

	summary, err := h.useCase.CloseSession(c.Context(), teacherID, sessionID)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("CLOSE_SESSION_ERROR", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(summary, "Sesi kelas resmi ditutup. Siswa tanpa keterangan telah ditandai ALPHA."))
}

func (h *SchoolAttendanceHandler) GetSessionDetail(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	detail, err := h.useCase.GetSessionDetail(c.Context(), sessionID)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(detail, "Detail sesi berhasil dimuat"))
}

func (h *SchoolAttendanceHandler) GetSessions(c *fiber.Ctx) error {
	teacherID := c.Query("teacher_id", "")
	if teacherID == "" {
		headerUser := c.Get("X-User-Id", "")
		if headerUser != "user-admin-1" {
			teacherID = headerUser
		}
	}
	classID := c.Query("class_id", "")
	status := c.Query("status", "")

	list, err := h.useCase.GetTeacherSessions(c.Context(), teacherID, classID, status)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("INTERNAL_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Daftar sesi berhasil dimuat"))
}

func (h *SchoolAttendanceHandler) ScanQRCode(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	var req domain.ScanQRRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format request tidak valid"))
	}

	res, err := h.useCase.ScanQRCode(c.Context(), sessionID, req.QRCodeToken)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("SCAN_FAILED", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(res, res.Message))
}

func (h *SchoolAttendanceHandler) ManualOverride(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	studentID := c.Params("student_id")
	teacherID := c.Get("X-User-Id", "")

	var req domain.ManualOverrideRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	if err := h.useCase.ManualOverride(c.Context(), teacherID, sessionID, studentID, req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("OVERRIDE_FAILED", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(true, "Status kehadiran siswa berhasil diubah secara manual"))
}

func (h *SchoolAttendanceHandler) GetLiveMonitoring(c *fiber.Ctx) error {
	list, err := h.useCase.GetLiveMonitoring(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("MONITORING_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Data monitoring kelas aktif berhasil dimuat"))
}

func (h *SchoolAttendanceHandler) GetAttendanceReport(c *fiber.Ctx) error {
	filter := domain.AttendanceReportFilter{
		StartDate: c.Query("start_date"),
		EndDate:   c.Query("end_date"),
		Tingkat:   c.Query("tingkat"),
		ClassID:   c.Query("class_id"),
		Search:    c.Query("search"),
	}
	rows, err := h.useCase.GetAttendanceReport(c.Context(), filter)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("REPORT_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(rows, "Rekap presensi berhasil dimuat"))
}

func (h *SchoolAttendanceHandler) GetQRCodeImage(c *fiber.Ctx) error {
	token := c.Params("token")
	sizeStr := c.Query("size", "256")
	size, _ := strconv.Atoi(sizeStr)

	pngBytes, err := h.useCase.GenerateQRCodePNG(c.Context(), token, size)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("QR_GEN_ERROR", err.Error()))
	}

	c.Set("Content-Type", "image/png")
	return c.Status(http.StatusOK).Send(pngBytes)
}

func (h *SchoolAttendanceHandler) GetCourses(c *fiber.Ctx) error {
	courses, err := h.useCase.GetCourses(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("INTERNAL_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(courses, "Daftar mata pelajaran berhasil dimuat"))
}

func (h *SchoolAttendanceHandler) CreateCourse(c *fiber.Ctx) error {
	var course domain.Course
	if err := c.BodyParser(&course); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format input tidak valid"))
	}
	if err := h.useCase.CreateCourse(c.Context(), &course); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("CREATE_FAILED", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(course, "Mata pelajaran berhasil ditambahkan"))
}

func (h *SchoolAttendanceHandler) DeleteCourse(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.useCase.DeleteCourse(c.Context(), id); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("DELETE_FAILED", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(true, "Mata pelajaran berhasil dihapus"))
}

func (h *SchoolAttendanceHandler) GetClasses(c *fiber.Ctx) error {
	list, err := h.useCase.GetClasses(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("INTERNAL_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Daftar kelas berhasil dimuat"))
}

func (h *SchoolAttendanceHandler) CreateClass(c *fiber.Ctx) error {
	var class domain.Class
	if err := c.BodyParser(&class); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format input kelas tidak valid"))
	}
	if err := h.useCase.CreateClass(c.Context(), &class); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("CREATE_FAILED", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(class, "Kelas berhasil ditambahkan"))
}

func (h *SchoolAttendanceHandler) UpdateClass(c *fiber.Ctx) error {
	var class domain.Class
	if err := c.BodyParser(&class); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format input kelas tidak valid"))
	}
	class.ID = c.Params("id")
	if err := h.useCase.UpdateClass(c.Context(), &class); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("UPDATE_FAILED", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(class, "Kelas berhasil diperbarui"))
}

func (h *SchoolAttendanceHandler) DeleteClass(c *fiber.Ctx) error {
	if err := h.useCase.DeleteClass(c.Context(), c.Params("id")); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("DELETE_FAILED", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(true, "Kelas berhasil dihapus"))
}
