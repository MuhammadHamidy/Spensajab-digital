package postgresql

import (
	"context"
	"errors"
	"time"

	"github.com/facerec/facerec-be/facerec/module/auth/domain"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) domain.AuthRepository {
	return &Repository{db: db}
}

func (r *Repository) FindByUsername(ctx context.Context, username string) (*domain.Account, error) {
	var account domain.Account
	err := r.db.WithContext(ctx).Where("username = ? OR email = ? OR nim_nip = ? OR nisn = ?", username, username, username, username).First(&account).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var role domain.Role
	_ = r.db.WithContext(ctx).Where("id = ?", account.RoleId).First(&role).Error
	account.RoleName = role.Name

	var count int64
	_ = r.db.WithContext(ctx).Table("student_faces").Where("user_id = ?", account.Id).Count(&count).Error
	account.HasFace = count > 0

	courseIDs, courseNames, _ := r.getTeacherCourses(ctx, account.Id)
	account.CourseIds = courseIDs
	account.CourseNames = courseNames

	classIDs, classCodes, _ := r.getTeacherClasses(ctx, account.Id)
	account.ClassIds = classIDs
	account.ClassCodes = classCodes

	return &account, nil
}

func (r *Repository) FindAccountByID(ctx context.Context, id string) (*domain.Account, error) {
	var account domain.Account
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&account).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var role domain.Role
	_ = r.db.WithContext(ctx).Where("id = ?", account.RoleId).First(&role).Error
	account.RoleName = role.Name

	var count int64
	_ = r.db.WithContext(ctx).Table("student_faces").Where("user_id = ?", account.Id).Count(&count).Error
	account.HasFace = count > 0

	courseIDs, courseNames, _ := r.getTeacherCourses(ctx, account.Id)
	account.CourseIds = courseIDs
	account.CourseNames = courseNames

	classIDs, classCodes, _ := r.getTeacherClasses(ctx, account.Id)
	account.ClassIds = classIDs
	account.ClassCodes = classCodes

	return &account, nil
}

func (r *Repository) FindAllAccounts(ctx context.Context, roleName string) ([]*domain.Account, error) {
	var accounts []*domain.Account
	query := r.db.WithContext(ctx).Table("accounts")

	if roleName != "" {
		var role domain.Role
		if err := r.db.WithContext(ctx).Where("UPPER(name) = UPPER(?)", roleName).First(&role).Error; err != nil {
			return nil, err
		}
		query = query.Where("accounts.role_id = ?", role.Id)
	}

	err := query.Order("created_at DESC").Find(&accounts).Error
	if err != nil {
		return nil, err
	}

	for _, a := range accounts {
		var role domain.Role
		_ = r.db.WithContext(ctx).Where("id = ?", a.RoleId).First(&role).Error
		a.RoleName = role.Name

		var count int64
		_ = r.db.WithContext(ctx).Table("student_faces").Where("user_id = ?", a.Id).Count(&count).Error
		a.HasFace = count > 0

		courseIDs, courseNames, _ := r.getTeacherCourses(ctx, a.Id)
		a.CourseIds = courseIDs
		a.CourseNames = courseNames

		classIDs, classCodes, _ := r.getTeacherClasses(ctx, a.Id)
		a.ClassIds = classIDs
		a.ClassCodes = classCodes
	}

	return accounts, nil
}

func (r *Repository) StoreAccount(ctx context.Context, account *domain.Account) error {
	if account.Id == "" {
		account.Id = uuid.New().String()
	}
	err := r.db.WithContext(ctx).Create(account).Error
	if err != nil {
		return err
	}
	if len(account.CourseIds) > 0 {
		_ = r.AssignTeacherCourses(ctx, account.Id, account.CourseIds)
	}
	if len(account.ClassIds) > 0 {
		_ = r.AssignTeacherClasses(ctx, account.Id, account.ClassIds)
	}
	return nil
}

func (r *Repository) UpdateAccount(ctx context.Context, account *domain.Account) error {
	err := r.db.WithContext(ctx).Model(&domain.Account{}).Where("id = ?", account.Id).Updates(account).Error
	if err != nil {
		return err
	}
	if account.CourseIds != nil {
		_ = r.AssignTeacherCourses(ctx, account.Id, account.CourseIds)
	}
	if account.ClassIds != nil {
		_ = r.AssignTeacherClasses(ctx, account.Id, account.ClassIds)
	}
	return nil
}

func (r *Repository) DeleteAccount(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.Account{}).Error
}

func (r *Repository) AssignTeacherCourses(ctx context.Context, teacherId string, courseIds []string) error {
	_ = r.db.WithContext(ctx).Where("teacher_id = ?", teacherId).Delete(&domain.TeacherCourse{}).Error

	for _, cID := range courseIds {
		if cID == "" {
			continue
		}
		tc := domain.TeacherCourse{
			Id:        uuid.New().String(),
			TeacherId: teacherId,
			CourseId:  cID,
		}
		_ = r.db.WithContext(ctx).Create(&tc).Error
	}
	return nil
}

func (r *Repository) GetTeacherCourseIDs(ctx context.Context, teacherId string) ([]string, error) {
	cIDs, _, err := r.getTeacherCourses(ctx, teacherId)
	return cIDs, err
}

func (r *Repository) getTeacherCourses(ctx context.Context, teacherId string) ([]string, []string, error) {
	type Result struct {
		CourseId   string
		CourseName string
	}
	var results []Result
	err := r.db.WithContext(ctx).Table("teacher_courses tc").
		Select("tc.course_id, c.name as course_name").
		Joins("JOIN courses c ON c.id = tc.course_id").
		Where("tc.teacher_id = ?", teacherId).
		Scan(&results).Error

	if err != nil {
		return nil, nil, err
	}

	var ids []string
	var names []string
	for _, res := range results {
		ids = append(ids, res.CourseId)
		names = append(names, res.CourseName)
	}
	return ids, names, nil
}

func (r *Repository) AssignTeacherClasses(ctx context.Context, teacherId string, classIds []string) error {
	_ = r.db.WithContext(ctx).Where("teacher_id = ?", teacherId).Delete(&domain.TeacherClass{}).Error

	for _, cID := range classIds {
		if cID == "" {
			continue
		}
		tc := domain.TeacherClass{
			Id:        uuid.New().String(),
			TeacherId: teacherId,
			ClassId:   cID,
		}
		_ = r.db.WithContext(ctx).Create(&tc).Error
	}
	return nil
}

func (r *Repository) GetTeacherClassIDs(ctx context.Context, teacherId string) ([]string, error) {
	cIDs, _, err := r.getTeacherClasses(ctx, teacherId)
	return cIDs, err
}

func (r *Repository) getTeacherClasses(ctx context.Context, teacherId string) ([]string, []string, error) {
	type Result struct {
		ClassId   string
		ClassCode string
	}
	var results []Result
	err := r.db.WithContext(ctx).Table("teacher_classes tc").
		Select("tc.class_id, c.class_code").
		Joins("JOIN classes c ON c.id = tc.class_id").
		Where("tc.teacher_id = ?", teacherId).
		Scan(&results).Error

	if err != nil {
		return nil, nil, err
	}

	var ids []string
	var codes []string
	for _, res := range results {
		ids = append(ids, res.ClassId)
		codes = append(codes, res.ClassCode)
	}
	return ids, codes, nil
}

func (r *Repository) FindAllRoles(ctx context.Context) ([]*domain.Role, error) {
	var roles []*domain.Role
	err := r.db.WithContext(ctx).Find(&roles).Error
	return roles, err
}

func (r *Repository) FindRoleByID(ctx context.Context, id string) (*domain.Role, error) {
	var role domain.Role
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&role).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &role, err
}

func (r *Repository) ResetPassword(ctx context.Context, id string, newPasswordHash string) error {
	updates := map[string]interface{}{
		"password_hash": newPasswordHash,
		"updated_at":    time.Now(),
	}
	result := r.db.WithContext(ctx).Model(&domain.Account{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("akun tidak ditemukan")
	}
	return nil
}

func (r *Repository) UpdateProfile(ctx context.Context, id string, req domain.UpdateProfileRequest, newPasswordHash string) (*domain.Account, error) {
	updates := map[string]interface{}{
		"updated_at": time.Now(),
	}
	if req.Username != "" {
		updates["username"] = req.Username
	}
	if req.FullName != "" {
		updates["full_name"] = req.FullName
	}
	if req.Phone != "" {
		updates["phone"] = req.Phone
	}
	if req.PhotoUrl != "" {
		updates["photo_url"] = req.PhotoUrl
	}
	if newPasswordHash != "" {
		updates["password_hash"] = newPasswordHash
	}

	err := r.db.WithContext(ctx).Model(&domain.Account{}).Where("id = ?", id).Updates(updates).Error
	if err != nil {
		return nil, err
	}

	return r.FindAccountByID(ctx, id)
}
