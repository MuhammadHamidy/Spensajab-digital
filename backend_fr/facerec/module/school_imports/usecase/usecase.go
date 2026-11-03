package usecase

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/facerec/facerec-be/facerec/module/school_imports/domain"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type useCase struct {
	db *gorm.DB
}

func NewUseCase(db *gorm.DB) domain.UseCase {
	return &useCase{db: db}
}

func (u *useCase) ImportStudentsFromExcel(ctx context.Context, fileReader io.Reader) (*domain.ImportResultResponse, error) {
	f, err := excelize.OpenReader(fileReader)
	if err != nil {
		return nil, fmt.Errorf("gagal membaca file excel: %w", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, errors.New("file excel tidak memiliki sheet aktif")
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, fmt.Errorf("gagal membaca baris sheet: %w", err)
	}

	if len(rows) <= 1 {
		return nil, errors.New("file excel kosong atau hanya berisi baris header")
	}

	columns := detectStudentColumns(rows[0])

	// Cache kelas yang ada
	var classes []struct {
		ID        string
		ClassCode string
	}
	if err := u.db.WithContext(ctx).Table("classes").Select("id, class_code").Find(&classes).Error; err != nil {
		return nil, err
	}
	classMap := make(map[string][]string)
	for _, c := range classes {
		classMap[normalizeClassCode(c.ClassCode)] = append(classMap[normalizeClassCode(c.ClassCode)], c.ID)
	}

	var errorList []domain.ImportErrorDetail
	type validStudentRow struct {
		ID        string
		Username  string
		FullName  string
		NISN      string
		ClassName string
		ClassIDs  []string
		Gender    string
		Phone     string
		QRToken   string
	}
	var validRows []validStudentRow
	seenNISN := make(map[string]int)

	// Validasi baris demi baris
	for i, row := range rows {
		if i == 0 {
			continue // skip header
		}
		rowNum := i + 1

		emptyRow := true
		for _, cell := range row {
			if strings.TrimSpace(cell) != "" {
				emptyRow = false
				break
			}
		}
		if emptyRow {
			continue
		}

		nisn := cellValue(row, columns.nisn)
		fullName := cellValue(row, columns.fullName)
		className := cellValue(row, columns.className)
		gender, genderError := normalizeGender(cellValue(row, columns.gender))
		parentPhone := cellValue(row, columns.parentPhone)

		if genderError != "" {
			errorList = append(errorList, domain.ImportErrorDetail{
				Row:    rowNum,
				Column: "Jenis Kelamin",
				Error:  genderError,
			})
			continue
		}

		if nisn == "" {
			errorList = append(errorList, domain.ImportErrorDetail{
				Row:    rowNum,
				Column: "NISN",
				Error:  "Kolom NISN tidak boleh kosong",
			})
			continue
		}

		if prevRow, exists := seenNISN[nisn]; exists {
			errorList = append(errorList, domain.ImportErrorDetail{
				Row:    rowNum,
				Column: "NISN",
				Error:  fmt.Sprintf("NISN '%s' duplikat di file (sudah ada di baris %d)", nisn, prevRow),
			})
			continue
		}
		seenNISN[nisn] = rowNum

		if fullName == "" {
			errorList = append(errorList, domain.ImportErrorDetail{
				Row:    rowNum,
				Column: "Nama Lengkap",
				Error:  "Kolom Nama Lengkap tidak boleh kosong",
			})
			continue
		}

		var classIDs []string
		if className != "" {
			classIDs = classMap[normalizeClassCode(className)]
		}

		validRows = append(validRows, validStudentRow{
			ID:        uuid.New().String(),
			Username:  "siswa_" + nisn,
			FullName:  fullName,
			NISN:      nisn,
			ClassName: normalizeClassName(className),
			ClassIDs:  classIDs,
			Gender:    gender,
			Phone:     parentPhone,
			QRToken:   uuid.New().String(),
		})
	}

	if len(errorList) > 0 {
		return &domain.ImportResultResponse{
			TotalRows: len(rows) - 1,
			Inserted:  0,
			Failed:    len(errorList),
			Errors:    errorList,
		}, nil
	}

	// Eksekusi insert transaksional
	now := time.Now()
	hashedPwd, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)

	err = u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, vr := range validRows {
			var existing struct {
				ID      string
				QRToken string `gorm:"column:qr_code_token"`
			}
			err := tx.Table("accounts").
				Select("id, qr_code_token").
				Where("nisn = ? AND role_id = ?", vr.NISN, "role-siswa").
				First(&existing).Error
			studentID := vr.ID
			if err == nil {
				studentID = existing.ID
				updates := map[string]interface{}{
					"full_name":  vr.FullName,
					"class_name": vr.ClassName,
					"phone":      vr.Phone,
					"gender":     vr.Gender,
					"updated_at": now,
				}
				if err := tx.Table("accounts").Where("id = ?", existing.ID).Updates(updates).Error; err != nil {
					return fmt.Errorf("gagal memperbarui siswa %s (NISN: %s): %w", vr.FullName, vr.NISN, err)
				}
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("gagal mencari siswa (NISN: %s): %w", vr.NISN, err)
			}

			if err == nil {
				vr.QRToken = existing.QRToken
			}

			// 1. Insert ke accounts
			if studentID == vr.ID {
				accountData := map[string]interface{}{
					"id":            vr.ID,
					"username":      vr.Username,
					"password_hash": string(hashedPwd),
					"email":         fmt.Sprintf("%s@siswa.sekolah.sch.id", vr.NISN),
					"full_name":     vr.FullName,
					"role_id":       "role-siswa",
					"nim_nip":       vr.NISN,
					"nisn":          vr.NISN,
					"phone":         vr.Phone,
					"class_name":    vr.ClassName,
					"qr_code_token": vr.QRToken,
					"gender":        vr.Gender,
					"is_active":     true,
					"created_at":    now,
					"updated_at":    now,
				}
				if err := tx.Table("accounts").Create(accountData).Error; err != nil {
					return fmt.Errorf("gagal insert siswa %s (NISN: %s): %w", vr.FullName, vr.NISN, err)
				}
			}

			// 2. Enroll siswa ke semua kelas mapel dengan kode rombel yang sama.
			for _, classID := range vr.ClassIDs {
				var enrollmentCount int64
				if err := tx.Table("class_enrollments").
					Where("class_id = ? AND student_id = ?", classID, studentID).
					Count(&enrollmentCount).Error; err != nil {
					return fmt.Errorf("gagal memeriksa enrollment siswa %s: %w", vr.FullName, err)
				}
				if enrollmentCount > 0 {
					continue
				}

				enrollment := map[string]interface{}{
					"id":          uuid.New().String(),
					"class_id":    classID,
					"student_id":  studentID,
					"enrolled_at": now,
				}
				if err := tx.Table("class_enrollments").Create(&enrollment).Error; err != nil {
					return fmt.Errorf("gagal enroll kelas siswa %s: %w", vr.FullName, err)
				}
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return &domain.ImportResultResponse{
		TotalRows: len(rows) - 1,
		Inserted:  len(validRows),
		Failed:    0,
	}, nil
}

func normalizeClassCode(value string) string {
	normalized := strings.ToUpper(strings.TrimSpace(value))
	normalized = strings.ReplaceAll(normalized, "KELAS", "")
	normalized = strings.ReplaceAll(normalized, " ", "")
	normalized = strings.ReplaceAll(normalized, "-", "")
	normalized = strings.ReplaceAll(normalized, "_", "")

	for _, replacement := range []struct {
		from string
		to   string
	}{
		{"VIII", "8"},
		{"VII", "7"},
		{"IX", "9"},
		{"VI", "6"},
		{"XII", "12"},
		{"XI", "11"},
		{"X", "10"},
	} {
		if strings.HasPrefix(normalized, replacement.from) {
			return replacement.to + strings.TrimPrefix(normalized, replacement.from)
		}

	}
	return normalized
}

type studentColumns struct {
	nisn        int
	fullName    int
	className   int
	gender      int
	parentPhone int
}

func detectStudentColumns(header []string) studentColumns {
	columns := studentColumns{nisn: 0, fullName: 1, className: 2, gender: 3, parentPhone: 4}
	for index, value := range header {
		normalized := strings.ToUpper(strings.TrimSpace(value))
		normalized = strings.NewReplacer(" ", "", "_", "", "-", "", "(", "", ")", "", "/", "").Replace(normalized)
		switch {
		case strings.Contains(normalized, "NISN"):
			columns.nisn = index
		case strings.Contains(normalized, "NAMALENGKAP") || normalized == "NAMA":
			columns.fullName = index
		case strings.Contains(normalized, "KODEKELAS") || normalized == "KELAS" || strings.Contains(normalized, "ROMBEL"):
			columns.className = index
		case strings.Contains(normalized, "JENISKELAMIN") || strings.Contains(normalized, "GENDER"):
			columns.gender = index
		case strings.Contains(normalized, "NOHP") || strings.Contains(normalized, "TELEPON"):
			columns.parentPhone = index
		}
	}
	return columns
}

func cellValue(row []string, index int) string {
	if index < 0 || index >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[index])
}

func normalizeGender(value string) (string, string) {
	normalized := strings.ToUpper(strings.TrimSpace(value))
	normalized = strings.NewReplacer(" ", "", "_", "", "-", "", "(", "", ")", "", ".", "").Replace(normalized)
	switch normalized {
	case "", "L", "LAKILAKI", "LAKI", "MALE", "PRIA", "1":
		return "L", ""
	case "P", "PEREMPUAN", "WANITA", "FEMALE", "PUTRI", "2":
		return "P", ""
	default:
		return "", fmt.Sprintf("Nilai '%s' tidak dikenali. Gunakan L/Laki-laki atau P/Perempuan.", value)
	}
}

func normalizeClassName(value string) string {
	return normalizeClassCode(value)
}

func (u *useCase) ImportTeachersFromExcel(ctx context.Context, fileReader io.Reader) (*domain.ImportResultResponse, error) {
	f, err := excelize.OpenReader(fileReader)
	if err != nil {
		return nil, fmt.Errorf("gagal membaca file excel: %w", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, errors.New("file excel tidak memiliki sheet aktif")
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, fmt.Errorf("gagal membaca baris sheet: %w", err)
	}

	if len(rows) <= 1 {
		return nil, errors.New("file excel kosong atau hanya berisi baris header")
	}

	var errorList []domain.ImportErrorDetail
	type validTeacherRow struct {
		ID       string
		NIP      string
		FullName string
		Username string
		Email    string
		Password string
		Phone    string
	}
	var validRows []validTeacherRow
	seenNIP := make(map[string]int)
	seenUser := make(map[string]int)

	for i, row := range rows {
		if i == 0 {
			continue
		}
		rowNum := i + 1

		nip := ""
		if len(row) > 0 {
			nip = strings.TrimSpace(row[0])
		}
		fullName := ""
		if len(row) > 1 {
			fullName = strings.TrimSpace(row[1])
		}
		username := ""
		if len(row) > 2 {
			username = strings.TrimSpace(row[2])
		}
		email := ""
		if len(row) > 3 {
			email = strings.TrimSpace(row[3])
		}
		password := "password123"
		if len(row) > 4 && strings.TrimSpace(row[4]) != "" {
			password = strings.TrimSpace(row[4])
		}
		phone := ""
		if len(row) > 5 {
			phone = strings.TrimSpace(row[5])
		}

		if nip == "" {
			errorList = append(errorList, domain.ImportErrorDetail{
				Row:    rowNum,
				Column: "NIP",
				Error:  "NIP guru tidak boleh kosong",
			})
			continue
		}
		if prev, exists := seenNIP[nip]; exists {
			errorList = append(errorList, domain.ImportErrorDetail{
				Row:    rowNum,
				Column: "NIP",
				Error:  fmt.Sprintf("NIP '%s' duplikat di baris %d", nip, prev),
			})
			continue
		}
		seenNIP[nip] = rowNum

		if fullName == "" {
			errorList = append(errorList, domain.ImportErrorDetail{
				Row:    rowNum,
				Column: "Nama Lengkap",
				Error:  "Nama Lengkap guru tidak boleh kosong",
			})
			continue
		}
		if username == "" {
			username = "guru_" + strings.ToLower(strings.ReplaceAll(nip, " ", ""))
		}
		if prev, exists := seenUser[username]; exists {
			errorList = append(errorList, domain.ImportErrorDetail{
				Row:    rowNum,
				Column: "Username",
				Error:  fmt.Sprintf("Username '%s' duplikat di baris %d", username, prev),
			})
			continue
		}
		seenUser[username] = rowNum

		if email == "" {
			email = fmt.Sprintf("%s@guru.sekolah.sch.id", username)
		}

		validRows = append(validRows, validTeacherRow{
			ID:       uuid.New().String(),
			NIP:      nip,
			FullName: fullName,
			Username: username,
			Email:    email,
			Password: password,
			Phone:    phone,
		})
	}

	if len(errorList) > 0 {
		return &domain.ImportResultResponse{
			TotalRows: len(rows) - 1,
			Inserted:  0,
			Failed:    len(errorList),
			Errors:    errorList,
		}, nil
	}

	now := time.Now()
	err = u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, vr := range validRows {
			hashedPwd, _ := bcrypt.GenerateFromPassword([]byte(vr.Password), bcrypt.DefaultCost)
			var existing struct {
				ID string
			}
			findErr := tx.Table("accounts").
				Select("id").
				Where("username = ? OR email = ? OR nim_nip = ? OR nim_nip = ?", vr.Username, vr.Email, vr.NIP, "NIP. "+vr.NIP).
				First(&existing).Error
			if findErr == nil && existing.ID != "" {
				updates := map[string]interface{}{
					"username":   vr.Username,
					"email":      vr.Email,
					"full_name":  vr.FullName,
					"role_id":    "role-guru",
					"nim_nip":    vr.NIP,
					"phone":      vr.Phone,
					"is_active":  true,
					"updated_at": now,
				}
				if err := tx.Table("accounts").Where("id = ?", existing.ID).Updates(updates).Error; err != nil {
					return fmt.Errorf("gagal memperbarui guru %s (NIP: %s): %w", vr.FullName, vr.NIP, err)
				}
				continue
			}

			accountData := map[string]interface{}{
				"id":            vr.ID,
				"username":      vr.Username,
				"password_hash": string(hashedPwd),
				"email":         vr.Email,
				"full_name":     vr.FullName,
				"role_id":       "role-guru",
				"nim_nip":       vr.NIP,
				"phone":         vr.Phone,
				"is_active":     true,
				"created_at":    now,
				"updated_at":    now,
			}
			if err := tx.Table("accounts").Create(accountData).Error; err != nil {
				return fmt.Errorf("gagal insert guru %s (NIP: %s): %w", vr.FullName, vr.NIP, err)
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return &domain.ImportResultResponse{
		TotalRows: len(rows) - 1,
		Inserted:  len(validRows),
		Failed:    0,
	}, nil
}

func (u *useCase) GenerateStudentTemplateExcel() ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Data_Siswa"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"NISN (Wajib)", "Nama Lengkap (Wajib)", "Kode Kelas (Contoh: VII-A)", "Jenis Kelamin (L/P)", "No HP Orang Tua"}
	for colIdx, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		_ = f.SetCellValue(sheet, cell, h)
	}

	// Contoh data baris 2 & 3
	_ = f.SetCellValue(sheet, "A2", "0081293820")
	_ = f.SetCellValue(sheet, "B2", "Muhammad Rizky Pratama")
	_ = f.SetCellValue(sheet, "C2", "VII-D")
	_ = f.SetCellValue(sheet, "D2", "L")
	_ = f.SetCellValue(sheet, "E2", "081298765432")

	_ = f.SetCellValue(sheet, "A3", "0081293821")
	_ = f.SetCellValue(sheet, "B3", "Aisyah Putri Azzahra")
	_ = f.SetCellValue(sheet, "C3", "VII-D")
	_ = f.SetCellValue(sheet, "D3", "P")
	_ = f.SetCellValue(sheet, "E3", "081298765433")

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func (u *useCase) GenerateTeacherTemplateExcel() ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Data_Guru"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"NIP (Wajib)", "Nama Lengkap (Wajib)", "Username", "Email", "Password", "No WhatsApp/HP"}
	for colIdx, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		_ = f.SetCellValue(sheet, cell, h)
	}

	// Contoh data
	_ = f.SetCellValue(sheet, "A2", "198503122010121001")
	_ = f.SetCellValue(sheet, "B2", "Budi Santoso, S.Pd")
	_ = f.SetCellValue(sheet, "C2", "budi_guru")
	_ = f.SetCellValue(sheet, "D2", "budi@smpn1jabon.sch.id")
	_ = f.SetCellValue(sheet, "E2", "password123")
	_ = f.SetCellValue(sheet, "F2", "081234567891")

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
