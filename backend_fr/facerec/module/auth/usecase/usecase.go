package usecase

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/facerec/facerec-be/facerec/module/auth/domain"
	"github.com/facerec/facerec-be/facerec/module/auth/mailer"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type useCase struct {
	repo      domain.AuthRepository
	jwtSecret string
	mailer    mailer.Mailer
}

func NewUseCase(repo domain.AuthRepository, jwtSecret string, mailer mailer.Mailer) domain.UseCase {
	if jwtSecret == "" {
		jwtSecret = "absensi-fr-secret-key-2026"
	}
	return &useCase{
		repo:      repo,
		jwtSecret: jwtSecret,
		mailer:    mailer,
	}
}

func generateRandomPassword() string {
	chars := "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	for i := range b {
		b[i] = chars[int(b[i])%len(chars)]
	}
	return "Guru#" + string(b)
}

func (u *useCase) Login(ctx context.Context, req domain.LoginRequest) (*domain.LoginResponse, error) {
	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" || req.Password == "" {
		return nil, errors.New("username dan password wajib diisi")
	}

	account, err := u.repo.FindByUsername(ctx, req.Username)
	if err != nil || account == nil {
		return nil, errors.New("username atau password salah")
	}

	err = bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, errors.New("username atau password salah")
	}

	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	claims := jwt.MapClaims{
		"id":        account.Id,
		"username":  account.Username,
		"role_id":   account.RoleId,
		"role_name": account.RoleName,
		"exp":       expiresAt.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(u.jwtSecret))
	if err != nil {
		return nil, err
	}

	account.PasswordHash = ""

	return &domain.LoginResponse{
		Token:     tokenString,
		ExpiresAt: expiresAt.Format(time.RFC3339),
		Account:   account,
	}, nil
}

func (u *useCase) GetAccountList(ctx context.Context, roleName string) ([]*domain.Account, error) {
	accounts, err := u.repo.FindAllAccounts(ctx, roleName)
	if err != nil {
		return nil, err
	}
	for _, a := range accounts {
		a.PasswordHash = ""
	}
	return accounts, nil
}

func (u *useCase) CreateAccount(ctx context.Context, account *domain.Account) error {
	account.Username = strings.TrimSpace(account.Username)
	account.Email = strings.TrimSpace(account.Email)
	account.FullName = strings.TrimSpace(account.FullName)
	account.NimNip = strings.TrimSpace(account.NimNip)
	account.Nisn = strings.TrimSpace(account.Nisn)

	if account.RoleId == "" {
		switch strings.ToUpper(strings.TrimSpace(account.RoleName)) {
		case "ADMIN":
			account.RoleId = "role-admin"
		case "GURU", "DOSEN":
			account.RoleId = "role-guru"
		case "SISWA", "MAHASISWA":
			account.RoleId = "role-siswa"
		default:
			account.RoleId = "role-guru"
		}
	}

	if account.Username == "" {
		if account.NimNip != "" {
			account.Username = account.NimNip
		} else if account.Nisn != "" {
			account.Username = "siswa_" + account.Nisn
		}
	}

	if account.Username == "" {
		return errors.New("username atau NIP/NISN wajib diisi")
	}

	if account.FullName == "" {
		account.FullName = account.Username
	}

	if account.Email == "" {
		domainSuffix := "sekolah.sch.id"
		if account.RoleId == "role-siswa" {
			domainSuffix = "siswa.sekolah.sch.id"
		} else if account.RoleId == "role-guru" {
			domainSuffix = "guru.sekolah.sch.id"
		}
		account.Email = fmt.Sprintf("%s@%s", strings.ToLower(strings.ReplaceAll(account.Username, " ", "_")), domainSuffix)
	}

	if account.RoleId == "role-guru" || strings.EqualFold(account.RoleName, "GURU") {
		if account.Password == "" {
			account.Password = generateRandomPassword()
		}
	} else if account.RoleId == "role-siswa" || strings.EqualFold(account.RoleName, "SISWA") {
		if account.Password == "" {
			account.Password = "password123"
		}
		if account.QrCodeToken == nil || strings.TrimSpace(*account.QrCodeToken) == "" {
			token := uuid.New().String()
			account.QrCodeToken = &token
		}
	} else if account.Password == "" {
		return errors.New("password wajib diisi")
	}

	existing, _ := u.repo.FindByUsername(ctx, account.Username)
	if existing != nil {
		return errors.New("username atau NIP/NISN sudah terdaftar")
	}
	if account.Email != "" && !strings.EqualFold(account.Email, account.Username) {
		existingByEmail, _ := u.repo.FindByUsername(ctx, account.Email)
		if existingByEmail != nil {
			return errors.New("alamat email sudah digunakan oleh akun lain")
		}
	}

	rawPassword := account.Password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(account.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	account.PasswordHash = string(hashedPassword)
	account.GeneratedPassword = rawPassword
	account.Password = ""

	err = u.repo.StoreAccount(ctx, account)
	if err != nil {
		return err
	}

	// Send access email to teacher if role is GURU and email is present
	if (account.RoleId == "role-guru" || strings.EqualFold(account.RoleName, "GURU")) && account.Email != "" && rawPassword != "" {
		createdAccount, errFind := u.repo.FindAccountByID(ctx, account.Id)
		if errFind == nil && createdAccount != nil {
			go func() {
				_ = u.mailer.SendTeacherAccessEmail(
					context.Background(),
					createdAccount.Email,
					createdAccount.FullName,
					createdAccount.Username,
					rawPassword,
					createdAccount.CourseNames,
					createdAccount.ClassCodes,
				)
			}()
		}
	}

	return nil
}

func (u *useCase) UpdateAccount(ctx context.Context, id string, account *domain.Account) error {
	account.Id = id
	if account.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(account.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		account.PasswordHash = string(hashedPassword)
		account.Password = ""
	}
	return u.repo.UpdateAccount(ctx, account)
}

func (u *useCase) DeleteAccount(ctx context.Context, id string) error {
	return u.repo.DeleteAccount(ctx, id)
}

func (u *useCase) GetRoleList(ctx context.Context) ([]*domain.Role, error) {
	return u.repo.FindAllRoles(ctx)
}

func (u *useCase) ResetPassword(ctx context.Context, id string, req domain.ResetPasswordRequest) (*domain.ResetPasswordResponse, error) {
	account, err := u.repo.FindAccountByID(ctx, id)
	if err != nil || account == nil {
		return nil, errors.New("akun tidak ditemukan")
	}

	newPassword := req.NewPassword
	if newPassword == "" {
		newPassword = generateRandomPassword()
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	err = u.repo.ResetPassword(ctx, id, string(hashedPassword))
	if err != nil {
		return nil, err
	}

	emailSent := false
	if req.SendEmail && account.Email != "" {
		errMail := u.mailer.SendPasswordResetEmail(ctx, account.Email, account.FullName, account.Username, newPassword)
		if errMail == nil {
			emailSent = true
		}
	}

	return &domain.ResetPasswordResponse{
		NewPassword: newPassword,
		EmailSent:   emailSent,
		Message:     "Password berhasil direset tanpa menghapus data guru",
	}, nil
}

func (u *useCase) SendAccessEmail(ctx context.Context, id string, customPassword string) error {
	account, err := u.repo.FindAccountByID(ctx, id)
	if err != nil || account == nil {
		return errors.New("akun tidak ditemukan")
	}

	if account.Email == "" {
		return errors.New("guru ini belum memiliki alamat email terdaftar")
	}

	password := customPassword
	if password == "" {
		password = generateRandomPassword()
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		_ = u.repo.ResetPassword(ctx, id, string(hashedPassword))
	}

	return u.mailer.SendTeacherAccessEmail(
		ctx,
		account.Email,
		account.FullName,
		account.Username,
		password,
		account.CourseNames,
		account.ClassCodes,
	)
}

func (u *useCase) UpdateProfile(ctx context.Context, id string, req domain.UpdateProfileRequest) (*domain.Account, error) {
	current, err := u.repo.FindAccountByID(ctx, id)
	if err != nil || current == nil {
		return nil, errors.New("akun tidak ditemukan")
	}

	if req.Username != "" && req.Username != current.Username {
		existing, _ := u.repo.FindByUsername(ctx, req.Username)
		if existing != nil && existing.Id != id {
			return nil, errors.New("username sudah digunakan oleh pengguna lain")
		}
	}

	var newPasswordHash string
	if req.NewPassword != "" {
		if req.OldPassword != "" {
			err = bcrypt.CompareHashAndPassword([]byte(current.PasswordHash), []byte(req.OldPassword))
			if err != nil {
				return nil, errors.New("password lama salah")
			}
		}
		hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		newPasswordHash = string(hashed)
	}

	updated, err := u.repo.UpdateProfile(ctx, id, req, newPasswordHash)
	if err != nil {
		return nil, err
	}
	if updated != nil {
		updated.PasswordHash = ""
	}
	return updated, nil
}
