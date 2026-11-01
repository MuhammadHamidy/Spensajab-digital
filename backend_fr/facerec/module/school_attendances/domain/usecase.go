package domain

import (
	"context"
)

// UseCase interface mendefinisikan seluruh business logic presensi QR
type UseCase interface {
	OpenSession(ctx context.Context, teacherID string, req OpenSessionRequest) (*ClassSession, error)
	CloseSession(ctx context.Context, teacherID string, sessionID string) (*SessionSummary, error)
	GetSessionDetail(ctx context.Context, sessionID string) (*SessionDetailResponse, error)
	GetTeacherSessions(ctx context.Context, teacherID string, classID string, status string) ([]*ClassSession, error)
	ScanQRCode(ctx context.Context, sessionID string, qrToken string) (*ScanResultResponse, error)
	ManualOverride(ctx context.Context, teacherID string, sessionID string, studentID string, req ManualOverrideRequest) error
	GetLiveMonitoring(ctx context.Context) ([]*ClassSession, error)
	GenerateQRCodePNG(ctx context.Context, qrToken string, size int) ([]byte, error)

	// Courses (Mata Pelajaran)
	GetCourses(ctx context.Context) ([]*Course, error)
	CreateCourse(ctx context.Context, course *Course) error
	DeleteCourse(ctx context.Context, courseID string) error
	GetClasses(ctx context.Context) ([]*Class, error)
	CreateClass(ctx context.Context, class *Class) error
	UpdateClass(ctx context.Context, class *Class) error
	DeleteClass(ctx context.Context, classID string) error
}
