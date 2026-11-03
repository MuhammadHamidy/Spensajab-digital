package postgresql

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/facerec/facerec-be/facerec/module/school_attendances/domain"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) domain.Repository {
	return &repository{db: db}
}

func normalizeClassKey(value string) string {
	s := strings.ToUpper(strings.TrimSpace(value))
	s = strings.ReplaceAll(s, "KELAS", "")
	s = strings.ReplaceAll(s, " ", "")
	s = strings.ReplaceAll(s, "-", "")
	s = strings.ReplaceAll(s, "_", "")
	return s
}

const sessionSelectFields = `
	class_sessions.*,
	classes.class_code AS class_name,
	classes.course_id AS course_id,
	COALESCE(courses.name, '') AS course_name,
	COALESCE(courses.code, '') AS course_code,
	COALESCE(classes.schedule_day, '') AS schedule_day,
	COALESCE(NULLIF(classes.schedule_time, ''), CONCAT_WS(' - ', NULLIF(classes.schedule_start_time, ''), NULLIF(classes.schedule_end_time, ''))) AS schedule_time,
	COALESCE(classes.room, '') AS room,
	COALESCE(accounts.full_name, class_teacher.full_name) AS teacher_name
`

func (r *repository) FindSessionByID(ctx context.Context, sessionID string) (*domain.ClassSession, error) {
	var s domain.ClassSession
	err := r.db.WithContext(ctx).Table("class_sessions").
		Select(sessionSelectFields).
		Joins("LEFT JOIN classes ON classes.id = class_sessions.class_id").
		Joins("LEFT JOIN courses ON courses.id = classes.course_id").
		Joins("LEFT JOIN accounts ON accounts.id = class_sessions.teacher_id").
		Joins("LEFT JOIN accounts AS class_teacher ON class_teacher.id = classes.dosen_id").
		Where("class_sessions.id = ?", sessionID).
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *repository) FindActiveSessionByClass(ctx context.Context, classID string) (*domain.ClassSession, error) {
	var s domain.ClassSession
	err := r.db.WithContext(ctx).Table("class_sessions").
		Select(sessionSelectFields).
		Joins("LEFT JOIN classes ON classes.id = class_sessions.class_id").
		Joins("LEFT JOIN courses ON courses.id = classes.course_id").
		Joins("LEFT JOIN accounts ON accounts.id = class_sessions.teacher_id").
		Joins("LEFT JOIN accounts AS class_teacher ON class_teacher.id = classes.dosen_id").
		Where("class_sessions.class_id = ? AND class_sessions.status = ?", classID, domain.SessionStatusOpen).
		First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *repository) FindSessions(ctx context.Context, teacherID string, classID string, status string) ([]*domain.ClassSession, error) {
	list := make([]*domain.ClassSession, 0)
	q := r.db.WithContext(ctx).Table("class_sessions").
		Select(sessionSelectFields).
		Joins("LEFT JOIN classes ON classes.id = class_sessions.class_id").
		Joins("LEFT JOIN courses ON courses.id = classes.course_id").
		Joins("LEFT JOIN accounts ON accounts.id = class_sessions.teacher_id").
		Joins("LEFT JOIN accounts AS class_teacher ON class_teacher.id = classes.dosen_id").
		Order("CASE WHEN class_sessions.status = 'OPEN' THEN 0 ELSE 1 END ASC, class_sessions.created_at DESC")

	if teacherID != "" && teacherID != "user-admin-1" {
		var acc struct {
			RoleID   string
			FullName string
		}
		_ = r.db.WithContext(ctx).Table("accounts").Select("role_id, full_name").Where("id = ?", teacherID).Scan(&acc).Error
		if acc.RoleID != "role-admin" {
			cleanName := strings.TrimSpace(acc.FullName)
			if cleanName != "" {
				q = q.Where(`(
					class_sessions.status = ?
					OR class_sessions.teacher_id = ?
					OR classes.dosen_id = ?
					OR classes.id IN (SELECT tc.class_id FROM teacher_classes tc WHERE tc.teacher_id = ?)
					OR LOWER(TRIM(COALESCE(accounts.full_name, ''))) = LOWER(?)
					OR LOWER(TRIM(COALESCE(class_teacher.full_name, ''))) = LOWER(?)
				)`, domain.SessionStatusOpen, teacherID, teacherID, teacherID, cleanName, cleanName)
			} else {
				q = q.Where(`(
					class_sessions.status = ?
					OR class_sessions.teacher_id = ?
					OR classes.dosen_id = ?
					OR classes.id IN (SELECT tc.class_id FROM teacher_classes tc WHERE tc.teacher_id = ?)
				)`, domain.SessionStatusOpen, teacherID, teacherID, teacherID)
			}
		}
	}
	if classID != "" {
		q = q.Where("class_sessions.class_id = ?", classID)
	}
	if status != "" {
		q = q.Where("class_sessions.status = ?", status)
	}

	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *repository) CreateSession(ctx context.Context, session *domain.ClassSession) error {
	if session.TeacherID != nil && *session.TeacherID == "user-admin-1" && session.ClassID != "" {
		var classDosenID string
		if err := r.db.WithContext(ctx).Table("classes").Select("dosen_id").Where("id = ?", session.ClassID).Scan(&classDosenID).Error; err == nil && classDosenID != "" {
			session.TeacherID = &classDosenID
		}
	}
	return r.db.WithContext(ctx).Table("class_sessions").Create(session).Error
}

func (r *repository) UpdateSession(ctx context.Context, session *domain.ClassSession) error {
	return r.db.WithContext(ctx).Table("class_sessions").Save(session).Error
}

func (r *repository) DeleteSession(ctx context.Context, sessionID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Table("attendances").Where("session_id = ?", sessionID).Delete(&domain.Attendance{}).Error; err != nil {
			return err
		}
		return tx.Table("class_sessions").Where("id = ?", sessionID).Delete(&domain.ClassSession{}).Error
	})
}

func (r *repository) CloseSessionAndMarkAlpha(ctx context.Context, sessionID string) (*domain.SessionSummary, error) {
	var summary domain.SessionSummary
	now := time.Now()

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. Update status semua PENDING jadi ALPHA
		if err := tx.Table("attendances").
			Where("session_id = ? AND status = ?", sessionID, domain.StatusPending).
			Updates(map[string]interface{}{
				"status":     domain.StatusAlpha,
				"updated_at": now,
			}).Error; err != nil {
			return err
		}

		// 2. Hitung agregat kehadiran
		var total, hadir, late, sakit, izin, alpha int64
		_ = tx.Table("attendances").Where("session_id = ?", sessionID).Count(&total)
		_ = tx.Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusHadir).Count(&hadir)
		_ = tx.Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusTerlambat).Count(&late)
		_ = tx.Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusSakit).Count(&sakit)
		_ = tx.Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusIzin).Count(&izin)
		_ = tx.Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusAlpha).Count(&alpha)

		summary = domain.SessionSummary{
			TotalStudents: int(total),
			TotalHadir:    int(hadir),
			TotalLate:     int(late),
			TotalSakit:    int(sakit),
			TotalIzin:     int(izin),
			TotalAlpha:    int(alpha),
			TotalPending:  0,
		}

		// 3. Update class_sessions
		return tx.Table("class_sessions").
			Where("id = ?", sessionID).
			Updates(map[string]interface{}{
				"status":         domain.SessionStatusClosed,
				"closed_at":      now,
				"total_students": summary.TotalStudents,
				"total_present":  summary.TotalHadir,
				"total_late":     summary.TotalLate,
				"total_alpha":    summary.TotalAlpha,
				"updated_at":     now,
			}).Error
	})

	if err != nil {
		return nil, err
	}
	return &summary, nil
}

func (r *repository) FindStudentsByClass(ctx context.Context, classID string) ([]*domain.StudentProfile, error) {
	list := make([]*domain.StudentProfile, 0)
	err := r.db.WithContext(ctx).Raw(`
		SELECT DISTINCT
			a.id,
			a.username,
			a.full_name,
			a.nisn,
			a.class_name,
			COALESCE(NULLIF(a.qr_code_token, ''), a.id) AS qr_code_token,
			COALESCE(a.is_active, true) AS is_active
		FROM accounts a
		JOIN classes c ON c.id = ?
		LEFT JOIN class_enrollments ce ON ce.student_id = a.id AND ce.class_id = c.id
		WHERE a.role_id = 'role-siswa'
		  AND (
			ce.id IS NOT NULL
			OR (
				COALESCE(a.class_name, '') <> ''
				AND UPPER(REPLACE(REPLACE(a.class_name, '-', ''), ' ', '')) = UPPER(REPLACE(REPLACE(c.class_code, '-', ''), ' ', ''))
			)
		  )
		ORDER BY a.full_name ASC
	`, classID).Scan(&list).Error
	if err != nil {
		return nil, err
	}
	return list, nil
}

func (r *repository) FindStudentByQRToken(ctx context.Context, qrToken string) (*domain.StudentProfile, error) {
	var s domain.StudentProfile
	trimmed := strings.TrimSpace(qrToken)
	err := r.db.WithContext(ctx).Table("accounts").
		Select("id, username, full_name, nisn, class_name, COALESCE(NULLIF(qr_code_token, ''), id) AS qr_code_token, COALESCE(is_active, true) AS is_active").
		Where("(qr_code_token = ? OR id = ? OR nisn = ?) AND role_id = 'role-siswa'", trimmed, trimmed, trimmed).
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *repository) FindStudentByID(ctx context.Context, studentID string) (*domain.StudentProfile, error) {
	var s domain.StudentProfile
	err := r.db.WithContext(ctx).Table("accounts").
		Select("id, username, full_name, nisn, class_name, COALESCE(NULLIF(qr_code_token, ''), id) AS qr_code_token, COALESCE(is_active, true) AS is_active").
		Where("id = ?", studentID).
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *repository) IsStudentEnrolledInClass(ctx context.Context, studentID string, classID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Raw(`
		SELECT COUNT(1)
		FROM accounts a
		JOIN classes c ON c.id = ?
		LEFT JOIN class_enrollments ce ON ce.student_id = a.id AND ce.class_id = c.id
		WHERE a.id = ?
		  AND (
			ce.id IS NOT NULL
			OR (
				COALESCE(a.class_name, '') <> ''
				AND UPPER(REPLACE(REPLACE(a.class_name, '-', ''), ' ', '')) = UPPER(REPLACE(REPLACE(c.class_code, '-', ''), ' ', ''))
			)
		  )
	`, classID, studentID).Scan(&count).Error
	return count > 0, err
}

func (r *repository) InitializeAttendances(ctx context.Context, sessionID string, studentIDs []string) error {
	if len(studentIDs) == 0 {
		return nil
	}
	now := time.Now()
	var records []domain.Attendance
	for _, sid := range studentIDs {
		records = append(records, domain.Attendance{
			ID:        uuid.New().String(),
			SessionID: sessionID,
			StudentID: sid,
			Status:    domain.StatusPending,
			Method:    domain.MethodQRCode,
			CreatedAt: now,
			UpdatedAt: now,
		})
	}
	return r.db.WithContext(ctx).Table("attendances").Create(&records).Error
}

func (r *repository) FindAttendancesBySession(ctx context.Context, sessionID string) ([]*domain.Attendance, error) {
	list := make([]*domain.Attendance, 0)
	err := r.db.WithContext(ctx).Table("attendances").
		Select("attendances.*, accounts.full_name as student_name, accounts.nisn as nisn, accounts.class_name as class_name").
		Joins("JOIN accounts ON accounts.id = attendances.student_id").
		Where("attendances.session_id = ?", sessionID).
		Order("attendances.timestamp DESC NULLS LAST, accounts.full_name ASC").
		Find(&list).Error
	if err != nil {
		return nil, err
	}
	return list, nil
}

func (r *repository) FindAttendanceBySessionAndStudent(ctx context.Context, sessionID string, studentID string) (*domain.Attendance, error) {
	var att domain.Attendance
	err := r.db.WithContext(ctx).Table("attendances").
		Select("attendances.*, accounts.full_name as student_name, accounts.nisn as nisn, accounts.class_name as class_name").
		Joins("JOIN accounts ON accounts.id = attendances.student_id").
		Where("attendances.session_id = ? AND attendances.student_id = ?", sessionID, studentID).
		First(&att).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &att, nil
}

func (r *repository) SaveAttendance(ctx context.Context, attendance *domain.Attendance) error {
	return r.db.WithContext(ctx).Table("attendances").Save(attendance).Error
}

func (r *repository) UpdateAttendanceStatus(ctx context.Context, sessionID string, studentID string, status string, notes string, editedBy *string) error {
	now := time.Now()
	updates := map[string]interface{}{
		"status":         status,
		"notes":          notes,
		"is_manual_edit": true,
		"edited_by":      editedBy,
		"updated_at":     now,
	}
	if status == domain.StatusHadir || status == domain.StatusTerlambat {
		updates["timestamp"] = now
	}
	res := r.db.WithContext(ctx).Table("attendances").
		Where("session_id = ? AND student_id = ?", sessionID, studentID).
		Updates(updates)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		var ts *time.Time
		if status == domain.StatusHadir || status == domain.StatusTerlambat {
			ts = &now
		}
		newAtt := domain.Attendance{
			ID:           uuid.New().String(),
			SessionID:    sessionID,
			StudentID:    studentID,
			Timestamp:    ts,
			Status:       status,
			Method:       domain.MethodManual,
			IsManualEdit: true,
			EditedBy:     editedBy,
			Notes:        notes,
			CreatedAt:    now,
			UpdatedAt:    now,
		}
		return r.db.WithContext(ctx).Table("attendances").Create(&newAtt).Error
	}
	return nil
}

func (r *repository) GetSessionSummary(ctx context.Context, sessionID string) (*domain.SessionSummary, error) {
	var total, hadir, late, sakit, izin, alpha, pending int64
	_ = r.db.WithContext(ctx).Table("attendances").Where("session_id = ?", sessionID).Count(&total)
	_ = r.db.WithContext(ctx).Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusHadir).Count(&hadir)
	_ = r.db.WithContext(ctx).Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusTerlambat).Count(&late)
	_ = r.db.WithContext(ctx).Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusSakit).Count(&sakit)
	_ = r.db.WithContext(ctx).Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusIzin).Count(&izin)
	_ = r.db.WithContext(ctx).Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusAlpha).Count(&alpha)
	_ = r.db.WithContext(ctx).Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusPending).Count(&pending)

	return &domain.SessionSummary{
		TotalStudents: int(total),
		TotalHadir:    int(hadir),
		TotalLate:     int(late),
		TotalSakit:    int(sakit),
		TotalIzin:     int(izin),
		TotalAlpha:    int(alpha),
		TotalPending:  int(pending),
	}, nil
}

func (r *repository) GetAttendanceReport(ctx context.Context, filter domain.AttendanceReportFilter) ([]*domain.AttendanceReportRow, error) {
	rows := make([]*domain.AttendanceReportRow, 0)
	query := r.db.WithContext(ctx).Table("attendances").
		Select(`
			accounts.id AS student_id,
			accounts.nisn,
			accounts.full_name AS name,
			LEFT(classes.class_code, 1) AS tingkat,
			classes.class_code AS class_name,
			COUNT(attendances.id) AS total_meetings,
			COUNT(*) FILTER (WHERE attendances.status = ?) AS hadir_count,
			COUNT(*) FILTER (WHERE attendances.status = ?) AS late_count,
			COUNT(*) FILTER (WHERE attendances.status = ?) AS sakit_count,
			COUNT(*) FILTER (WHERE attendances.status = ?) AS izin_count,
			COUNT(*) FILTER (WHERE attendances.status = ?) AS alpha_count,
			ROUND(
				COALESCE(
					100.0 * COUNT(*) FILTER (WHERE attendances.status IN (?, ?)) / NULLIF(COUNT(attendances.id), 0),
					0
				)::numeric,
				1
			) AS percentage`,
			domain.StatusHadir,
			domain.StatusTerlambat,
			domain.StatusSakit,
			domain.StatusIzin,
			domain.StatusAlpha,
			domain.StatusHadir,
			domain.StatusTerlambat,
		).
		Joins("JOIN accounts ON accounts.id = attendances.student_id").
		Joins("JOIN class_sessions ON class_sessions.id = attendances.session_id").
		Joins("JOIN classes ON classes.id = class_sessions.class_id").
		Where("class_sessions.date BETWEEN ? AND ?", filter.StartDate, filter.EndDate).
		Group("accounts.id, accounts.nisn, accounts.full_name, classes.class_code").
		Order("classes.class_code ASC, accounts.full_name ASC")

	if filter.Tingkat != "" && filter.Tingkat != "ALL" {
		query = query.Where(
			"UPPER(LEFT(TRIM(REPLACE(REPLACE(UPPER(COALESCE(NULLIF(accounts.class_name, ''), classes.class_code)), 'KELAS', ''), '-', '')), 1)) = UPPER(?)",
			filter.Tingkat,
		)
	}
	if filter.ClassID != "" && filter.ClassID != "ALL" {
		normFilterClass := normalizeClassKey(filter.ClassID)
		query = query.Where(
			"classes.id = ? OR UPPER(REPLACE(REPLACE(REPLACE(classes.class_code, 'KELAS', ''), '-', ''), ' ', '')) = ? OR UPPER(REPLACE(REPLACE(REPLACE(COALESCE(accounts.class_name, ''), 'KELAS', ''), '-', ''), ' ', '')) = ?",
			filter.ClassID, normFilterClass, normFilterClass,
		)
	}
	if filter.Search != "" {
		search := "%" + filter.Search + "%"
		query = query.Where("accounts.full_name ILIKE ? OR accounts.nisn ILIKE ?", search, search)
	}

	if err := query.Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repository) GetLiveOpenSessions(ctx context.Context) ([]*domain.ClassSession, error) {
	list := make([]*domain.ClassSession, 0)
	err := r.db.WithContext(ctx).Table("class_sessions").
		Select(sessionSelectFields).
		Joins("LEFT JOIN classes ON classes.id = class_sessions.class_id").
		Joins("LEFT JOIN courses ON courses.id = classes.course_id").
		Joins("LEFT JOIN accounts ON accounts.id = class_sessions.teacher_id").
		Joins("LEFT JOIN accounts AS class_teacher ON class_teacher.id = classes.dosen_id").
		Where("class_sessions.status = ?", domain.SessionStatusOpen).
		Order("class_sessions.opened_at DESC").
		Find(&list).Error
	if err != nil {
		return nil, err
	}
	return list, nil
}

func (r *repository) FindAllCourses(ctx context.Context) ([]*domain.Course, error) {
	list := make([]*domain.Course, 0)
	err := r.db.WithContext(ctx).Table("courses").Order("code ASC").Find(&list).Error
	return list, err
}

func (r *repository) CreateCourse(ctx context.Context, course *domain.Course) error {
	course.Code = strings.TrimSpace(course.Code)
	course.Name = strings.TrimSpace(course.Name)
	if len(course.Code) > 50 {
		course.Code = course.Code[:50]
	}

	var existing domain.Course
	err := r.db.WithContext(ctx).Table("courses").
		Where("UPPER(code) = UPPER(?) OR UPPER(name) = UPPER(?)", course.Code, course.Name).
		First(&existing).Error
	if err == nil && existing.ID != "" {
		*course = existing
		return nil
	}

	return r.db.WithContext(ctx).Table("courses").Create(course).Error
}

func (r *repository) DeleteCourse(ctx context.Context, courseID string) error {
	return r.db.WithContext(ctx).Table("courses").Where("id = ?", courseID).Delete(&domain.Course{}).Error
}

func (r *repository) FindAllClasses(ctx context.Context) ([]*domain.Class, error) {
	list := make([]*domain.Class, 0)
	err := r.db.WithContext(ctx).Table("classes").
		Select("classes.*, classes.dosen_id AS teacher_id, classes.dosen_id AS dosen_id, courses.code AS course_code, courses.name AS course_name, accounts.full_name AS teacher_name").
		Joins("LEFT JOIN courses ON courses.id = classes.course_id").
		Joins("LEFT JOIN accounts ON accounts.id = classes.dosen_id").
		Order("classes.class_code ASC, courses.code ASC").
		Find(&list).Error
	return list, err
}

func (r *repository) CreateClass(ctx context.Context, class *domain.Class) error {
	class.ClassCode = strings.TrimSpace(class.ClassCode)
	normalizedCode := normalizeClassKey(class.ClassCode)

	if strings.TrimSpace(class.ScheduleDay) != "" {
		var existingID string
		q := r.db.WithContext(ctx).Table("classes").
			Select("id").
			Where("course_id = ? AND UPPER(REPLACE(REPLACE(class_code, '-', ''), ' ', '')) = ? AND COALESCE(schedule_day, '') = ''", class.CourseID, normalizedCode)
		if class.TeacherID != "" {
			q = q.Where("(COALESCE(dosen_id, '') = '' OR dosen_id = ?)", class.TeacherID)
		}
		if err := q.Limit(1).Scan(&existingID).Error; err == nil && existingID != "" {
			class.ID = existingID
			return r.UpdateClass(ctx, class)
		}
	}

	err := r.db.WithContext(ctx).Table("classes").Create(map[string]interface{}{
		"id":                  class.ID,
		"course_id":           class.CourseID,
		"class_code":          class.ClassCode,
		"dosen_id":            class.TeacherID,
		"academic_year":       class.AcademicYear,
		"room":                class.Room,
		"schedule_day":        class.ScheduleDay,
		"schedule_time":       class.ScheduleTime,
		"schedule_start_time": class.ScheduleStartTime,
		"schedule_end_time":   class.ScheduleEndTime,
	}).Error
	if err != nil {
		return err
	}
	r.syncClassRelations(ctx, class)
	return nil
}

func (r *repository) UpdateClass(ctx context.Context, class *domain.Class) error {
	class.ClassCode = strings.TrimSpace(class.ClassCode)
	err := r.db.WithContext(ctx).Table("classes").Where("id = ?", class.ID).Updates(map[string]interface{}{
		"course_id":           class.CourseID,
		"class_code":          class.ClassCode,
		"dosen_id":            class.TeacherID,
		"academic_year":       class.AcademicYear,
		"room":                class.Room,
		"schedule_day":        class.ScheduleDay,
		"schedule_time":       class.ScheduleTime,
		"schedule_start_time": class.ScheduleStartTime,
		"schedule_end_time":   class.ScheduleEndTime,
	}).Error
	if err != nil {
		return err
	}
	r.syncClassRelations(ctx, class)
	return nil
}

func (r *repository) syncClassRelations(ctx context.Context, class *domain.Class) {
	if class.TeacherID != "" && class.CourseID != "" {
		var tcCount int64
		_ = r.db.WithContext(ctx).Table("teacher_courses").
			Where("teacher_id = ? AND course_id = ?", class.TeacherID, class.CourseID).
			Count(&tcCount).Error
		if tcCount == 0 {
			_ = r.db.WithContext(ctx).Table("teacher_courses").Create(map[string]interface{}{
				"id":         uuid.New().String(),
				"teacher_id": class.TeacherID,
				"course_id":  class.CourseID,
				"created_at": time.Now(),
			}).Error
		}
	}

	if class.TeacherID != "" && class.ID != "" {
		var tclCount int64
		_ = r.db.WithContext(ctx).Table("teacher_classes").
			Where("teacher_id = ? AND class_id = ?", class.TeacherID, class.ID).
			Count(&tclCount).Error
		if tclCount == 0 {
			_ = r.db.WithContext(ctx).Table("teacher_classes").Create(map[string]interface{}{
				"id":         uuid.New().String(),
				"teacher_id": class.TeacherID,
				"class_id":   class.ID,
				"created_at": time.Now(),
			}).Error
		}
	}

	targetKey := normalizeClassKey(class.ClassCode)
	if targetKey == "" || class.ID == "" {
		return
	}
	var students []struct {
		ID        string
		ClassName string
	}
	if err := r.db.WithContext(ctx).Table("accounts").
		Select("id, class_name").
		Where("role_id = 'role-siswa' AND COALESCE(class_name, '') <> ''").
		Find(&students).Error; err != nil {
		return
	}
	now := time.Now()
	for _, s := range students {
		if normalizeClassKey(s.ClassName) != targetKey {
			continue
		}
		var count int64
		_ = r.db.WithContext(ctx).Table("class_enrollments").
			Where("class_id = ? AND student_id = ?", class.ID, s.ID).
			Count(&count).Error
		if count == 0 {
			_ = r.db.WithContext(ctx).Table("class_enrollments").Create(map[string]interface{}{
				"id":          uuid.New().String(),
				"class_id":    class.ID,
				"student_id":  s.ID,
				"enrolled_at": now,
			}).Error
		}
	}
}

func (r *repository) DeleteClass(ctx context.Context, classID string) error {
	return r.db.WithContext(ctx).Table("classes").Where("id = ?", classID).Delete(&domain.Class{}).Error
}
