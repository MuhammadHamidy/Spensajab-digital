package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/facerec/facerec-be/facerec/module/school_attendances/domain"
	"github.com/google/uuid"
	qrcode "github.com/skip2/go-qrcode"
)

type useCase struct {
	repo domain.Repository
}

func NewUseCase(repo domain.Repository) domain.UseCase {
	return &useCase{repo: repo}
}

func (u *useCase) OpenSession(ctx context.Context, teacherID string, req domain.OpenSessionRequest) (*domain.ClassSession, error) {
	if teacherID == "" {
		return nil, errors.New("teacher_id wajib diisi")
	}
	if req.ClassID == "" {
		return nil, errors.New("class_id wajib diisi")
	}

	// 1. Cek apakah ada sesi yang masih OPEN di kelas ini
	existing, err := u.repo.FindActiveSessionByClass(ctx, req.ClassID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		if existing.TeacherID == nil || (*existing.TeacherID != teacherID && teacherID != "user-admin-1") {
			return nil, errors.New("kelas sudah memiliki sesi aktif oleh guru lain")
		}
		return existing, nil
	}

	// 2. Siapkan waktu buka & cut-off 15 menit
	now := time.Now()
	cutoff := now.Add(15 * time.Minute)
	todayStr := now.Format("2006-01-02")
	timeStr := now.Format("15:04")

	sessionNumber := req.SessionNumber
	if sessionNumber <= 0 {
		sessionNumber = 1
	}
	topic := req.Topic
	if topic == "" {
		topic = fmt.Sprintf("Pertemuan Sesi %d", sessionNumber)
	}

	sessionID := uuid.New().String()
	sess := &domain.ClassSession{
		ID:            sessionID,
		ClassID:       req.ClassID,
		TeacherID:     &teacherID,
		SessionNumber: sessionNumber,
		Topic:         topic,
		Date:          todayStr,
		StartTime:     timeStr,
		Status:        domain.SessionStatusOpen,
		SessionToken:  uuid.New().String(),
		OpenedAt:      &now,
		LateCutoffAt:  &cutoff,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// 3. Simpan sesi ke database
	if err := u.repo.CreateSession(ctx, sess); err != nil {
		return nil, fmt.Errorf("gagal membuat sesi: %w", err)
	}

	// 4. Ambil seluruh siswa terdaftar dan inisialisasi kehadiran sebagai PENDING
	students, err := u.repo.FindStudentsByClass(ctx, req.ClassID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil siswa kelas: %w", err)
	}
	if len(students) > 0 {
		var studentIDs []string
		for _, s := range students {
			studentIDs = append(studentIDs, s.ID)
		}
		if err := u.repo.InitializeAttendances(ctx, sessionID, studentIDs); err != nil {
			return nil, fmt.Errorf("gagal menyiapkan presensi siswa: %w", err)
		}
		sess.TotalStudents = len(students)
		if err := u.repo.UpdateSession(ctx, sess); err != nil {
			return nil, fmt.Errorf("gagal memperbarui jumlah siswa sesi: %w", err)
		}
	}

	return u.repo.FindSessionByID(ctx, sessionID)
}

func (u *useCase) CloseSession(ctx context.Context, teacherID string, sessionID string) (*domain.SessionSummary, error) {
	if teacherID == "" {
		return nil, errors.New("teacher_id wajib diisi")
	}
	sess, err := u.repo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("sesi tidak ditemukan: %w", err)
	}
	if sess.TeacherID == nil || (*sess.TeacherID != teacherID && teacherID != "user-admin-1") {
		return nil, errors.New("guru tidak berwenang menutup sesi ini")
	}
	if sess.Status == domain.SessionStatusClosed {
		return u.repo.GetSessionSummary(ctx, sessionID)
	}

	return u.repo.CloseSessionAndMarkAlpha(ctx, sessionID)
}

func (u *useCase) GetSessionDetail(ctx context.Context, sessionID string) (*domain.SessionDetailResponse, error) {
	sess, err := u.repo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("sesi tidak ditemukan: %w", err)
	}

	attendances, err := u.repo.FindAttendancesBySession(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	summary, err := u.repo.GetSessionSummary(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	return &domain.SessionDetailResponse{
		Session:     sess,
		Summary:     *summary,
		Attendances: attendances,
	}, nil
}

func (u *useCase) GetTeacherSessions(ctx context.Context, teacherID string, classID string, status string) ([]*domain.ClassSession, error) {
	return u.repo.FindSessions(ctx, teacherID, classID, status)
}

func (u *useCase) ScanQRCode(ctx context.Context, sessionID string, qrToken string) (*domain.ScanResultResponse, error) {
	if sessionID == "" || qrToken == "" {
		return nil, errors.New("session_id dan qr_code_token wajib diisi")
	}

	// 1. Ambil detail sesi kelas
	sess, err := u.repo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return nil, errors.New("sesi kelas tidak ditemukan")
	}
	if sess.Status != domain.SessionStatusOpen {
		return nil, errors.New("sesi kelas sudah ditutup atau belum dibuka")
	}

	// 2. Cari data siswa berdasarkan token QR
	student, err := u.repo.FindStudentByQRToken(ctx, qrToken)
	if err != nil || student == nil {
		return nil, errors.New("kartu QR tidak terdaftar di sistem")
	}

	// 3. Verifikasi apakah siswa terdaftar di kelas ini
	enrolled, err := u.repo.IsStudentEnrolledInClass(ctx, student.ID, sess.ClassID)
	if err != nil || !enrolled {
		return nil, fmt.Errorf("siswa %s bukan anggota kelas %s", student.FullName, sess.ClassName)
	}

	// 4. Periksa catatan presensi saat ini
	att, err := u.repo.FindAttendanceBySessionAndStudent(ctx, sessionID, student.ID)
	now := time.Now()

	if att != nil && (att.Status == domain.StatusHadir || att.Status == domain.StatusTerlambat) {
		formattedTime := ""
		if att.Timestamp != nil {
			formattedTime = att.Timestamp.Format("15:04:05")
		}
		return nil, fmt.Errorf("siswa %s sudah diabsen sebelumnya pada %s", student.FullName, formattedTime)
	}

	// 5. Evaluasi status berdasarkan batas cut-off 15 menit
	status := domain.StatusHadir
	isLate := false
	msg := fmt.Sprintf("Presensi BERHASIL dicatat: %s", student.FullName)

	if sess.LateCutoffAt != nil && now.After(*sess.LateCutoffAt) {
		status = domain.StatusTerlambat
		isLate = true
		msg = fmt.Sprintf("Presensi dicatat TERLAMBAT (lewat batas 15 menit): %s", student.FullName)
	}

	// 6. Simpan / Perbarui kehadiran
	if att == nil {
		att = &domain.Attendance{
			ID:        uuid.New().String(),
			SessionID: sessionID,
			StudentID: student.ID,
			Timestamp: &now,
			Status:    status,
			Method:    domain.MethodQRCode,
			CreatedAt: now,
			UpdatedAt: now,
		}
		if err := u.repo.SaveAttendance(ctx, att); err != nil {
			return nil, err
		}
	} else {
		if err := u.repo.UpdateAttendanceStatus(ctx, sessionID, student.ID, status, "", nil); err != nil {
			return nil, err
		}
	}

	// 7. Update counter pada class_sessions
	summary, _ := u.repo.GetSessionSummary(ctx, sessionID)
	if summary != nil {
		sess.TotalPresent = summary.TotalHadir
		sess.TotalLate = summary.TotalLate
		sess.TotalAlpha = summary.TotalAlpha
		_ = u.repo.UpdateSession(ctx, sess)
	}

	return &domain.ScanResultResponse{
		StudentID: student.ID,
		FullName:  student.FullName,
		NISN:      student.NISN,
		ClassName: student.ClassName,
		ScanTime:  now.Format("15:04:05 WIB"),
		Status:    status,
		IsLate:    isLate,
		Message:   msg,
	}, nil
}

func (u *useCase) ManualOverride(ctx context.Context, teacherID string, sessionID string, studentID string, req domain.ManualOverrideRequest) error {
	if teacherID == "" {
		return errors.New("teacher_id wajib diisi")
	}
	if req.Status == "" {
		return errors.New("status presensi wajib diisi")
	}

	// Validasi status yang diizinkan
	validStatus := map[string]bool{
		domain.StatusHadir:     true,
		domain.StatusTerlambat: true,
		domain.StatusSakit:     true,
		domain.StatusIzin:      true,
		domain.StatusAlpha:     true,
	}
	if !validStatus[req.Status] {
		return fmt.Errorf("status '%s' tidak valid", req.Status)
	}

	sess, err := u.repo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("sesi tidak ditemukan: %w", err)
	}
	if sess.TeacherID == nil || (*sess.TeacherID != teacherID && teacherID != "user-admin-1") {
		return errors.New("guru tidak berwenang mengubah presensi sesi ini")
	}
	if sess.Status == domain.SessionStatusClosed {
		return errors.New("sesi kelas sudah ditutup")
	}

	err = u.repo.UpdateAttendanceStatus(ctx, sessionID, studentID, req.Status, req.Notes, &teacherID)
	if err != nil {
		return err
	}

	// Update counter summary
	summary, err := u.repo.GetSessionSummary(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("gagal menghitung ringkasan sesi: %w", err)
	}
	sess.TotalPresent = summary.TotalHadir
	sess.TotalLate = summary.TotalLate
	sess.TotalAlpha = summary.TotalAlpha
	if err := u.repo.UpdateSession(ctx, sess); err != nil {
		return fmt.Errorf("gagal memperbarui ringkasan sesi: %w", err)
	}

	return nil
}

func (u *useCase) GetLiveMonitoring(ctx context.Context) ([]*domain.ClassSession, error) {
	return u.repo.GetLiveOpenSessions(ctx)
}

func (u *useCase) GetAttendanceReport(ctx context.Context, filter domain.AttendanceReportFilter) ([]*domain.AttendanceReportRow, error) {
	if filter.StartDate == "" || filter.EndDate == "" {
		return nil, errors.New("start_date dan end_date wajib diisi")
	}
	if filter.StartDate > filter.EndDate {
		return nil, errors.New("start_date tidak boleh setelah end_date")
	}
	return u.repo.GetAttendanceReport(ctx, filter)
}

func (u *useCase) GenerateQRCodePNG(ctx context.Context, qrToken string, size int) ([]byte, error) {
	if size <= 0 {
		size = 256
	}
	return qrcode.Encode(qrToken, qrcode.Medium, size)
}

func (u *useCase) GetCourses(ctx context.Context) ([]*domain.Course, error) {
	return u.repo.FindAllCourses(ctx)
}

func (u *useCase) CreateCourse(ctx context.Context, course *domain.Course) error {
	if course.Code == "" || course.Name == "" {
		return errors.New("kode dan nama mata pelajaran wajib diisi")
	}
	if course.ID == "" {
		course.ID = uuid.New().String()
	}
	return u.repo.CreateCourse(ctx, course)
}

func (u *useCase) DeleteCourse(ctx context.Context, courseID string) error {
	if courseID == "" {
		return errors.New("course_id wajib diisi")
	}
	return u.repo.DeleteCourse(ctx, courseID)
}

func (u *useCase) GetClasses(ctx context.Context) ([]*domain.Class, error) {
	return u.repo.FindAllClasses(ctx)
}

func (u *useCase) CreateClass(ctx context.Context, class *domain.Class) error {
	if class.TeacherID == "" && class.DosenID != "" {
		class.TeacherID = class.DosenID
	}
	if class.CourseID == "" || class.ClassCode == "" || class.TeacherID == "" {
		return errors.New("course_id, class_code dan teacher_id wajib diisi")
	}
	if class.AcademicYear == "" {
		class.AcademicYear = "2026/2027"
	}
	if class.ID == "" {
		class.ID = uuid.New().String()
	}
	class.DosenID = class.TeacherID
	return u.repo.CreateClass(ctx, class)
}

func (u *useCase) UpdateClass(ctx context.Context, class *domain.Class) error {
	if class.TeacherID == "" && class.DosenID != "" {
		class.TeacherID = class.DosenID
	}
	if class.ID == "" {
		return errors.New("id kelas wajib diisi")
	}
	class.DosenID = class.TeacherID
	return u.repo.UpdateClass(ctx, class)
}

func (u *useCase) DeleteClass(ctx context.Context, classID string) error {
	if classID == "" {
		return errors.New("class_id wajib diisi")
	}
	return u.repo.DeleteClass(ctx, classID)
}
