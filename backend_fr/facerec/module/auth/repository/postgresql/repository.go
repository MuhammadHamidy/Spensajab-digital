package postgresql

import (
	"context"
	"errors"
	"strings"
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

func normalizeGenderDB(gender string) string {
	g := strings.ToUpper(strings.TrimSpace(gender))
	if strings.HasPrefix(g, "P") || g == "FEMALE" || g == "WANITA" {
		return "P"
	}
	return "L"
}

func normalizeClassKey(value string) string {
	s := strings.ToUpper(strings.TrimSpace(value))
	s = strings.ReplaceAll(s, "KELAS", "")
	s = strings.ReplaceAll(s, " ", "")
	s = strings.ReplaceAll(s, "-", "")
	s = strings.ReplaceAll(s, "_", "")
	return s
}

func (r *Repository) FindByUsername(ctx context.Context, username string) (*domain.Account, error) {
	trimmed := strings.TrimSpace(username)
	if trimmed == "" {
		return nil, nil
	}

	var account domain.Account
	err := r.db.WithContext(ctx).
		Where(
			"username = ? OR email = ? OR (COALESCE(nim_nip, '') <> '' AND (nim_nip = ? OR nim_nip = ?)) OR (COALESCE(nisn, '') <> '' AND (nisn = ? OR nisn = ?))",
			trimmed,
			trimmed,
			trimmed,
			"NIP. "+trimmed,
			trimmed,
			"NISN. "+trimmed,
		).
		First(&account).Error
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
	accounts := make([]*domain.Account, 0)
	query := r.db.WithContext(ctx).Table("accounts")

	var matchedRole *domain.Role
	if strings.TrimSpace(roleName) != "" {
		var role domain.Role
		if err := r.db.WithContext(ctx).Where("UPPER(name) = UPPER(?)", strings.TrimSpace(roleName)).First(&role).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return accounts, nil
			}
			return nil, err
		}
		matchedRole = &role
		query = query.Where("accounts.role_id = ?", role.Id)
	}

	err := query.Order("created_at DESC").Find(&accounts).Error
	if err != nil {
		return nil, err
	}

	roleCache := make(map[string]string)
	if matchedRole != nil {
		roleCache[matchedRole.Id] = matchedRole.Name
	} else {
		var allRoles []domain.Role
		if err := r.db.WithContext(ctx).Find(&allRoles).Error; err == nil {
			for _, rl := range allRoles {
				roleCache[rl.Id] = rl.Name
			}
		}
	}

	for _, a := range accounts {
		a.RoleName = roleCache[a.RoleId]
		if a.RoleId == "role-siswa" && (a.QrCodeToken == nil || *a.QrCodeToken == "") {
			fallbackToken := a.Id
			a.QrCodeToken = &fallbackToken
		}

		if a.RoleId == "role-guru" || strings.EqualFold(a.RoleName, "GURU") {
			courseIDs, courseNames, _ := r.getTeacherCourses(ctx, a.Id)
			a.CourseIds = courseIDs
			a.CourseNames = courseNames

			classIDs, classCodes, _ := r.getTeacherClasses(ctx, a.Id)
			a.ClassIds = classIDs
			a.ClassCodes = classCodes
		}
	}

	return accounts, nil
}

func (r *Repository) StoreAccount(ctx context.Context, account *domain.Account) error {
	if account.Id == "" {
		account.Id = uuid.New().String()
	}
	account.Gender = normalizeGenderDB(account.Gender)
	if account.IsActive == nil {
		active := true
		account.IsActive = &active
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
	if account.RoleId == "role-siswa" && strings.TrimSpace(account.ClassName) != "" {
		r.syncStudentClassEnrollments(ctx, account.Id, account.ClassName)
	}
	return nil
}

func (r *Repository) UpdateAccount(ctx context.Context, account *domain.Account) error {
	if account.Gender != "" {
		account.Gender = normalizeGenderDB(account.Gender)
	}
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
	if strings.TrimSpace(account.ClassName) != "" {
		r.syncStudentClassEnrollments(ctx, account.Id, account.ClassName)
	}
	return nil
}

func (r *Repository) syncStudentClassEnrollments(ctx context.Context, studentID string, className string) {
	targetKey := normalizeClassKey(className)
	if targetKey == "" {
		return
	}
	var classes []struct {
		ID        string
		ClassCode string
	}
	if err := r.db.WithContext(ctx).Table("classes").Select("id, class_code").Find(&classes).Error; err != nil {
		return
	}
	now := time.Now()
	for _, cls := range classes {
		if normalizeClassKey(cls.ClassCode) != targetKey {
			continue
		}
		var count int64
		_ = r.db.WithContext(ctx).Table("class_enrollments").
			Where("class_id = ? AND student_id = ?", cls.ID, studentID).
			Count(&count).Error
		if count == 0 {
			_ = r.db.WithContext(ctx).Table("class_enrollments").Create(map[string]interface{}{
				"id":          uuid.New().String(),
				"class_id":    cls.ID,
				"student_id":  studentID,
				"enrolled_at": now,
			}).Error
		}
	}
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
	err := r.db.WithContext(ctx).Raw(`
		SELECT DISTINCT c.id AS course_id, c.name AS course_name
		FROM courses c
		WHERE c.id IN (
			SELECT tc.course_id FROM teacher_courses tc WHERE tc.teacher_id = ?
			UNION
			SELECT cl.course_id FROM classes cl WHERE cl.dosen_id = ?
		)
		ORDER BY c.name ASC
	`, teacherId, teacherId).Scan(&results).Error

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
	err := r.db.WithContext(ctx).Raw(`
		SELECT DISTINCT c.id AS class_id, c.class_code
		FROM classes c
		WHERE c.dosen_id = ?
		   OR c.id IN (SELECT tc.class_id FROM teacher_classes tc WHERE tc.teacher_id = ?)
		ORDER BY c.class_code ASC
	`, teacherId, teacherId).Scan(&results).Error

	if err != nil {
		return nil, nil, err
	}

	var ids []string
	var codes []string
	seenCode := make(map[string]bool)
	for _, res := range results {
		ids = append(ids, res.ClassId)
		if !seenCode[res.ClassCode] {
			seenCode[res.ClassCode] = true
			codes = append(codes, res.ClassCode)
		}
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
