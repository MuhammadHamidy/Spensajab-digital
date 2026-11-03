package postgresql

import (
	"context"
	"errors"
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

func (r *repository) FindSessionByID(ctx context.Context, sessionID string) (*domain.ClassSession, error) {
	var s domain.ClassSession
	err := r.db.WithContext(ctx).Table("class_sessions").
		Select("class_sessions.*, classes.class_code as class_name, accounts.full_name as teacher_name").
		Joins("LEFT JOIN classes ON classes.id = class_sessions.class_id").
		Joins("LEFT JOIN accounts ON accounts.id = class_sessions.teacher_id").
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
		Select("class_sessions.*, classes.class_code as class_name, accounts.full_name as teacher_name").
		Joins("LEFT JOIN classes ON classes.id = class_sessions.class_id").
		Joins("LEFT JOIN accounts ON accounts.id = class_sessions.teacher_id").
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
	var list []*domain.ClassSession
	q := r.db.WithContext(ctx).Table("class_sessions").
		Select("class_sessions.*, classes.class_code as class_name, accounts.full_name as teacher_name").
		Joins("LEFT JOIN classes ON classes.id = class_sessions.class_id").
		Joins("LEFT JOIN accounts ON accounts.id = class_sessions.teacher_id").
		Order("class_sessions.created_at DESC")

	if teacherID != "" {
		q = q.Where("class_sessions.teacher_id = ?", teacherID)
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
	return r.db.WithContext(ctx).Table("class_sessions").Create(session).Error
}

func (r *repository) UpdateSession(ctx context.Context, session *domain.ClassSession) error {
	return r.db.WithContext(ctx).Table("class_sessions").Save(session).Error
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
	var list []*domain.StudentProfile
	err := r.db.WithContext(ctx).Table("accounts").
		Select("accounts.id, accounts.username, accounts.full_name, accounts.nisn, accounts.class_name, accounts.qr_code_token, accounts.is_active").
		Joins("JOIN class_enrollments ON class_enrollments.student_id = accounts.id").
		Where("class_enrollments.class_id = ?", classID).
		Find(&list).Error
	if err != nil {
		return nil, err
	}
	return list, nil
}

func (r *repository) FindStudentByQRToken(ctx context.Context, qrToken string) (*domain.StudentProfile, error) {
	var s domain.StudentProfile
	err := r.db.WithContext(ctx).Table("accounts").
		Select("id, username, full_name, nisn, class_name, qr_code_token, is_active").
		Where("qr_code_token = ?", qrToken).
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *repository) FindStudentByID(ctx context.Context, studentID string) (*domain.StudentProfile, error) {
	var s domain.StudentProfile
	err := r.db.WithContext(ctx).Table("accounts").
		Select("id, username, full_name, nisn, class_name, qr_code_token, is_active").
		Where("id = ?", studentID).
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *repository) IsStudentEnrolledInClass(ctx context.Context, studentID string, classID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Table("class_enrollments").
		Where("student_id = ? AND class_id = ?", studentID, classID).
		Count(&count).Error
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
	var list []*domain.Attendance
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
	return r.db.WithContext(ctx).Table("attendances").
		Where("session_id = ? AND student_id = ?", sessionID, studentID).
		Updates(updates).Error
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
	var rows []*domain.AttendanceReportRow
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
			COALESCE(
				100.0 * COUNT(*) FILTER (WHERE attendances.status IN (?, ?)) / NULLIF(COUNT(attendances.id), 0),
				0
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
		query = query.Where("LEFT(classes.class_code, 1) = ?", filter.Tingkat)
	}
	if filter.ClassID != "" && filter.ClassID != "ALL" {
		query = query.Where("classes.class_code = ? OR classes.id = ?", filter.ClassID, filter.ClassID)
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
	var list []*domain.ClassSession
	err := r.db.WithContext(ctx).Table("class_sessions").
		Select("class_sessions.*, classes.class_code as class_name, accounts.full_name as teacher_name").
		Joins("LEFT JOIN classes ON classes.id = class_sessions.class_id").
		Joins("LEFT JOIN accounts ON accounts.id = class_sessions.teacher_id").
		Where("class_sessions.status = ?", domain.SessionStatusOpen).
		Order("class_sessions.opened_at DESC").
		Find(&list).Error
	if err != nil {
		return nil, err
	}
	return list, nil
}

func (r *repository) FindAllCourses(ctx context.Context) ([]*domain.Course, error) {
	var list []*domain.Course
	err := r.db.WithContext(ctx).Table("courses").Order("code ASC").Find(&list).Error
	return list, err
}

func (r *repository) CreateCourse(ctx context.Context, course *domain.Course) error {
	return r.db.WithContext(ctx).Table("courses").Create(course).Error
}

func (r *repository) DeleteCourse(ctx context.Context, courseID string) error {
	return r.db.WithContext(ctx).Table("courses").Where("id = ?", courseID).Delete(&domain.Course{}).Error
}

func (r *repository) FindAllClasses(ctx context.Context) ([]*domain.Class, error) {
	var list []*domain.Class
	err := r.db.WithContext(ctx).Table("classes").
		Select("classes.*, classes.dosen_id AS teacher_id, courses.code AS course_code, courses.name AS course_name, accounts.full_name AS teacher_name").
		Joins("JOIN courses ON courses.id = classes.course_id").
		Joins("JOIN accounts ON accounts.id = classes.dosen_id").
		Order("classes.class_code ASC, courses.code ASC").
		Find(&list).Error
	return list, err
}

func (r *repository) CreateClass(ctx context.Context, class *domain.Class) error {
	return r.db.WithContext(ctx).Table("classes").Create(map[string]interface{}{
		"id": class.ID, "course_id": class.CourseID, "class_code": class.ClassCode,
		"dosen_id": class.TeacherID, "academic_year": class.AcademicYear,
		"room": class.Room, "schedule_day": class.ScheduleDay, "schedule_time": class.ScheduleTime,
		"schedule_start_time": class.ScheduleStartTime, "schedule_end_time": class.ScheduleEndTime,
	}).Error
}

func (r *repository) UpdateClass(ctx context.Context, class *domain.Class) error {
	return r.db.WithContext(ctx).Table("classes").Where("id = ?", class.ID).Updates(map[string]interface{}{
		"course_id": class.CourseID, "class_code": class.ClassCode, "dosen_id": class.TeacherID,
		"academic_year": class.AcademicYear, "room": class.Room,
		"schedule_day": class.ScheduleDay, "schedule_time": class.ScheduleTime,
		"schedule_start_time": class.ScheduleStartTime, "schedule_end_time": class.ScheduleEndTime,
	}).Error
}

func (r *repository) DeleteClass(ctx context.Context, classID string) error {
	return r.db.WithContext(ctx).Table("classes").Where("id = ?", classID).Delete(&domain.Class{}).Error
}
