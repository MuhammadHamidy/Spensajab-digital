package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/facerec/facerec-be/facerec/module/school_attendances/domain"
	"github.com/facerec/facerec-be/facerec/module/school_attendances/usecase"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRepository implements domain.Repository for testing
type MockRepository struct {
	mock.Mock
}

func (m *MockRepository) FindSessionByID(ctx context.Context, sessionID string) (*domain.ClassSession, error) {
	args := m.Called(ctx, sessionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ClassSession), args.Error(1)
}

func (m *MockRepository) FindActiveSessionByClass(ctx context.Context, classID string) (*domain.ClassSession, error) {
	args := m.Called(ctx, classID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ClassSession), args.Error(1)
}

func (m *MockRepository) FindSessions(ctx context.Context, teacherID string, classID string, status string) ([]*domain.ClassSession, error) {
	args := m.Called(ctx, teacherID, classID, status)
	return args.Get(0).([]*domain.ClassSession), args.Error(1)
}

func (m *MockRepository) CreateSession(ctx context.Context, session *domain.ClassSession) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockRepository) UpdateSession(ctx context.Context, session *domain.ClassSession) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockRepository) CloseSessionAndMarkAlpha(ctx context.Context, sessionID string) (*domain.SessionSummary, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).(*domain.SessionSummary), args.Error(1)
}

func (m *MockRepository) FindStudentsByClass(ctx context.Context, classID string) ([]*domain.StudentProfile, error) {
	args := m.Called(ctx, classID)
	return args.Get(0).([]*domain.StudentProfile), args.Error(1)
}

func (m *MockRepository) FindStudentByQRToken(ctx context.Context, qrToken string) (*domain.StudentProfile, error) {
	args := m.Called(ctx, qrToken)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.StudentProfile), args.Error(1)
}

func (m *MockRepository) FindStudentByID(ctx context.Context, studentID string) (*domain.StudentProfile, error) {
	args := m.Called(ctx, studentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.StudentProfile), args.Error(1)
}

func (m *MockRepository) IsStudentEnrolledInClass(ctx context.Context, studentID string, classID string) (bool, error) {
	args := m.Called(ctx, studentID, classID)
	return args.Bool(0), args.Error(1)
}

func (m *MockRepository) InitializeAttendances(ctx context.Context, sessionID string, studentIDs []string) error {
	args := m.Called(ctx, sessionID, studentIDs)
	return args.Error(0)
}

func (m *MockRepository) FindAttendancesBySession(ctx context.Context, sessionID string) ([]*domain.Attendance, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).([]*domain.Attendance), args.Error(1)
}

func (m *MockRepository) FindAttendanceBySessionAndStudent(ctx context.Context, sessionID string, studentID string) (*domain.Attendance, error) {
	args := m.Called(ctx, sessionID, studentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Attendance), args.Error(1)
}

func (m *MockRepository) SaveAttendance(ctx context.Context, attendance *domain.Attendance) error {
	args := m.Called(ctx, attendance)
	return args.Error(0)
}

func (m *MockRepository) UpdateAttendanceStatus(ctx context.Context, sessionID string, studentID string, status string, notes string, editedBy *string) error {
	args := m.Called(ctx, sessionID, studentID, status, notes, editedBy)
	return args.Error(0)
}

func (m *MockRepository) GetSessionSummary(ctx context.Context, sessionID string) (*domain.SessionSummary, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).(*domain.SessionSummary), args.Error(1)
}

func (m *MockRepository) GetLiveOpenSessions(ctx context.Context) ([]*domain.ClassSession, error) {
	args := m.Called(ctx)
	return args.Get(0).([]*domain.ClassSession), args.Error(1)
}

func (m *MockRepository) FindAllCourses(ctx context.Context) ([]*domain.Course, error) {
	args := m.Called(ctx)
	return args.Get(0).([]*domain.Course), args.Error(1)
}

func (m *MockRepository) CreateCourse(ctx context.Context, course *domain.Course) error {
	args := m.Called(ctx, course)
	return args.Error(0)
}

func (m *MockRepository) DeleteCourse(ctx context.Context, courseID string) error {
	args := m.Called(ctx, courseID)
	return args.Error(0)
}

func (m *MockRepository) FindAllClasses(ctx context.Context) ([]*domain.Class, error) {
	args := m.Called(ctx)
	return args.Get(0).([]*domain.Class), args.Error(1)
}

func (m *MockRepository) CreateClass(ctx context.Context, class *domain.Class) error {
	args := m.Called(ctx, class)
	return args.Error(0)
}

func (m *MockRepository) UpdateClass(ctx context.Context, class *domain.Class) error {
	args := m.Called(ctx, class)
	return args.Error(0)
}

func (m *MockRepository) DeleteClass(ctx context.Context, classID string) error {
	args := m.Called(ctx, classID)
	return args.Error(0)
}

func TestScanQRCode_HadirOnTime(t *testing.T) {
	mockRepo := new(MockRepository)
	uc := usecase.NewUseCase(mockRepo)
	ctx := context.Background()

	now := time.Now()
	cutoff := now.Add(10 * time.Minute) // Masih dalam 15 menit
	sessionID := "sess-1"
	qrToken := "token-qr-123"

	mockSess := &domain.ClassSession{
		ID:           sessionID,
		ClassID:      "class-7d",
		ClassName:    "VII-D",
		Status:       domain.SessionStatusOpen,
		LateCutoffAt: &cutoff,
	}
	mockStudent := &domain.StudentProfile{
		ID:        "student-1",
		FullName:  "Andi Saputra",
		NISN:      "0081293812",
		ClassName: "VII-D",
	}

	mockRepo.On("FindSessionByID", ctx, sessionID).Return(mockSess, nil)
	mockRepo.On("FindStudentByQRToken", ctx, qrToken).Return(mockStudent, nil)
	mockRepo.On("IsStudentEnrolledInClass", ctx, "student-1", "class-7d").Return(true, nil)
	mockRepo.On("FindAttendanceBySessionAndStudent", ctx, sessionID, "student-1").Return(&domain.Attendance{
		Status: domain.StatusPending,
	}, nil)
	mockRepo.On("UpdateAttendanceStatus", ctx, sessionID, "student-1", domain.StatusHadir, "", (*string)(nil)).Return(nil)
	mockRepo.On("GetSessionSummary", ctx, sessionID).Return(&domain.SessionSummary{
		TotalStudents: 1,
		TotalHadir:    1,
	}, nil)
	mockRepo.On("UpdateSession", ctx, mockSess).Return(nil)

	res, err := uc.ScanQRCode(ctx, sessionID, qrToken)
	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, domain.StatusHadir, res.Status)
	assert.False(t, res.IsLate)
	assert.Equal(t, "Andi Saputra", res.FullName)
}

func TestScanQRCode_TerlambatAfterCutoff(t *testing.T) {
	mockRepo := new(MockRepository)
	uc := usecase.NewUseCase(mockRepo)
	ctx := context.Background()

	now := time.Now()
	cutoff := now.Add(-5 * time.Minute) // Sudah lewat 15 menit
	sessionID := "sess-1"
	qrToken := "token-qr-late"

	mockSess := &domain.ClassSession{
		ID:           sessionID,
		ClassID:      "class-7d",
		ClassName:    "VII-D",
		Status:       domain.SessionStatusOpen,
		LateCutoffAt: &cutoff,
	}
	mockStudent := &domain.StudentProfile{
		ID:        "student-2",
		FullName:  "Budi Kurniawan",
		NISN:      "0081293813",
		ClassName: "VII-D",
	}

	mockRepo.On("FindSessionByID", ctx, sessionID).Return(mockSess, nil)
	mockRepo.On("FindStudentByQRToken", ctx, qrToken).Return(mockStudent, nil)
	mockRepo.On("IsStudentEnrolledInClass", ctx, "student-2", "class-7d").Return(true, nil)
	mockRepo.On("FindAttendanceBySessionAndStudent", ctx, sessionID, "student-2").Return(&domain.Attendance{
		Status: domain.StatusPending,
	}, nil)
	mockRepo.On("UpdateAttendanceStatus", ctx, sessionID, "student-2", domain.StatusTerlambat, "", (*string)(nil)).Return(nil)
	mockRepo.On("GetSessionSummary", ctx, sessionID).Return(&domain.SessionSummary{
		TotalStudents: 1,
		TotalLate:     1,
	}, nil)
	mockRepo.On("UpdateSession", ctx, mockSess).Return(nil)

	res, err := uc.ScanQRCode(ctx, sessionID, qrToken)
	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, domain.StatusTerlambat, res.Status)
	assert.True(t, res.IsLate)
}

func TestScanQRCode_AntiDoubleScan(t *testing.T) {
	mockRepo := new(MockRepository)
	uc := usecase.NewUseCase(mockRepo)
	ctx := context.Background()

	now := time.Now()
	cutoff := now.Add(10 * time.Minute)
	sessionID := "sess-1"
	qrToken := "token-qr-123"

	mockSess := &domain.ClassSession{
		ID:           sessionID,
		ClassID:      "class-7d",
		ClassName:    "VII-D",
		Status:       domain.SessionStatusOpen,
		LateCutoffAt: &cutoff,
	}
	mockStudent := &domain.StudentProfile{
		ID:       "student-1",
		FullName: "Andi Saputra",
	}

	mockRepo.On("FindSessionByID", ctx, sessionID).Return(mockSess, nil)
	mockRepo.On("FindStudentByQRToken", ctx, qrToken).Return(mockStudent, nil)
	mockRepo.On("IsStudentEnrolledInClass", ctx, "student-1", "class-7d").Return(true, nil)
	mockRepo.On("FindAttendanceBySessionAndStudent", ctx, sessionID, "student-1").Return(&domain.Attendance{
		Status:    domain.StatusHadir,
		Timestamp: &now,
	}, nil)

	res, err := uc.ScanQRCode(ctx, sessionID, qrToken)
	assert.Error(t, err)
	assert.Nil(t, res)
	assert.Contains(t, err.Error(), "sudah diabsen sebelumnya")
}

func TestGenerateQRCodePNG(t *testing.T) {
	mockRepo := new(MockRepository)
	uc := usecase.NewUseCase(mockRepo)

	pngBytes, err := uc.GenerateQRCodePNG(context.Background(), "sample-token-123", 256)
	assert.NoError(t, err)
	assert.NotEmpty(t, pngBytes)
	// Valid PNG signature: \x89PNG
	assert.Equal(t, byte(0x89), pngBytes[0])
	assert.Equal(t, byte('P'), pngBytes[1])
	assert.Equal(t, byte('N'), pngBytes[2])
	assert.Equal(t, byte('G'), pngBytes[3])
}
