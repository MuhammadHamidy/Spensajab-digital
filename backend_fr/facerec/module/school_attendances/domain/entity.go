package domain

import "time"

// Status Presensi Siswa
const (
	StatusPending   = "PENDING"
	StatusHadir     = "HADIR"
	StatusTerlambat = "TERLAMBAT"
	StatusSakit     = "SAKIT"
	StatusIzin      = "IZIN"
	StatusAlpha     = "ALPHA"
)

// Status Sesi Kelas
const (
	SessionStatusUpcoming = "UPCOMING"
	SessionStatusOpen     = "OPEN"
	SessionStatusClosed   = "CLOSED"
)

// Metode Presensi
const (
	MethodQRCode = "QR_CODE"
	MethodManual = "MANUAL"
)

// ClassSession merepresentasikan sesi pertemuan belajar di kelas
type ClassSession struct {
	ID            string     `json:"id" gorm:"primaryKey;type:varchar(36)"`
	ClassID       string     `json:"class_id" gorm:"type:varchar(36);not null"`
	ClassName     string     `json:"class_name" gorm:"->"`
	TeacherID     *string    `json:"teacher_id" gorm:"type:varchar(36)"`
	TeacherName   string     `json:"teacher_name" gorm:"->"`
	SessionNumber int        `json:"session_number" gorm:"not null"`
	Topic         string     `json:"topic" gorm:"type:varchar(200);not null"`
	Date          string     `json:"date" gorm:"type:date;not null"`
	StartTime     string     `json:"start_time" gorm:"type:varchar(10)"`
	EndTime       string     `json:"end_time" gorm:"type:varchar(10)"`
	Status        string     `json:"status" gorm:"type:varchar(20);not null;default:'UPCOMING'"`
	SessionToken  string     `json:"session_token" gorm:"type:varchar(100)"`
	OpenedAt      *time.Time `json:"opened_at"`
	LateCutoffAt  *time.Time `json:"late_cutoff_at"`
	ClosedAt      *time.Time `json:"closed_at"`
	TotalStudents int        `json:"total_students" gorm:"default:0"`
	TotalPresent  int        `json:"total_present" gorm:"default:0"`
	TotalLate     int        `json:"total_late" gorm:"default:0"`
	TotalAlpha    int        `json:"total_alpha" gorm:"default:0"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

func (ClassSession) TableName() string {
	return "class_sessions"
}

// Attendance merepresentasikan catatan kehadiran per siswa di sesi tertentu
type Attendance struct {
	ID              string     `json:"id" gorm:"primaryKey;type:varchar(36)"`
	SessionID       string     `json:"session_id" gorm:"type:varchar(36);not null"`
	StudentID       string     `json:"student_id" gorm:"type:varchar(36);not null"`
	StudentName     string     `json:"student_name" gorm:"->"`
	NISN            string     `json:"nisn" gorm:"->"`
	ClassName       string     `json:"class_name" gorm:"->"`
	Timestamp       *time.Time `json:"timestamp"`
	Status          string     `json:"status" gorm:"type:varchar(20);not null;default:'PENDING'"`
	Method          string     `json:"method" gorm:"type:varchar(30);default:'QR_CODE'"`
	ConfidenceScore float64    `json:"confidence_score" gorm:"default:0.0"`
	SnapshotURL     string     `json:"snapshot_url"`
	IsManualEdit    bool       `json:"is_manual_edit" gorm:"default:false"`
	EditedBy        *string    `json:"edited_by" gorm:"type:varchar(36)"`
	Notes           string     `json:"notes"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

func (Attendance) TableName() string {
	return "attendances"
}

// StudentProfile representasi siswa untuk pencocokan QR & validasi kelas
type StudentProfile struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	FullName    string `json:"full_name"`
	NISN        string `json:"nisn"`
	ClassName   string `json:"class_name"`
	QRCodeToken string `json:"qr_code_token"`
	IsActive    bool   `json:"is_active"`
}

// DTOs
type OpenSessionRequest struct {
	ClassID       string `json:"class_id"`
	Topic         string `json:"topic"`
	SessionNumber int    `json:"session_number"`
}

type ScanQRRequest struct {
	SessionID   string `json:"session_id"`
	QRCodeToken string `json:"qr_code_token"`
}

type ManualOverrideRequest struct {
	Status string `json:"status"` // HADIR, TERLAMBAT, SAKIT, IZIN, ALPHA
	Notes  string `json:"notes"`
}

type SessionSummary struct {
	TotalStudents int `json:"total_students"`
	TotalHadir    int `json:"total_hadir"`
	TotalLate     int `json:"total_late"`
	TotalSakit    int `json:"total_sakit"`
	TotalIzin     int `json:"total_izin"`
	TotalAlpha    int `json:"total_alpha"`
	TotalPending  int `json:"total_pending"`
}

type SessionDetailResponse struct {
	Session     *ClassSession  `json:"session"`
	Summary     SessionSummary `json:"summary"`
	Attendances []*Attendance  `json:"attendances"`
}

type ScanResultResponse struct {
	StudentID string `json:"student_id"`
	FullName  string `json:"full_name"`
	NISN      string `json:"nisn"`
	ClassName string `json:"class_name"`
	ScanTime  string `json:"scan_time"`
	Status    string `json:"status"`
	IsLate    bool   `json:"is_late"`
	Message   string `json:"message"`
}

// Course merepresentasikan data master mata pelajaran (Mapel)
type Course struct {
	ID          string `json:"id" gorm:"primaryKey;type:varchar(36)"`
	Code        string `json:"code" gorm:"type:varchar(30);not null;unique"`
	Name        string `json:"name" gorm:"type:varchar(150);not null"`
	SKS         int    `json:"sks" gorm:"default:3"`
	Description string `json:"description" gorm:"type:text"`
}

func (Course) TableName() string {
	return "courses"
}

type Class struct {
	ID                string `json:"id" gorm:"primaryKey;type:varchar(36)"`
	CourseID          string `json:"course_id"`
	CourseCode        string `json:"course_code"`
	CourseName        string `json:"course_name"`
	ClassCode         string `json:"class_code"`
	TeacherID         string `json:"teacher_id"`
	TeacherName       string `json:"teacher_name"`
	AcademicYear      string `json:"academic_year"`
	Room              string `json:"room"`
	ScheduleDay       string `json:"schedule_day"`
	ScheduleTime      string `json:"schedule_time"`
	ScheduleStartTime string `json:"schedule_start_time"`
	ScheduleEndTime   string `json:"schedule_end_time"`
}

func (Class) TableName() string {
	return "classes"
}
