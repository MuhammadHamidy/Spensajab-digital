package mailer

import (
	"context"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strconv"
	"strings"
)

type Mailer interface {
	SendTeacherAccessEmail(ctx context.Context, teacherEmail, teacherName, username, password string, courseNames, classCodes []string) error
	SendPasswordResetEmail(ctx context.Context, teacherEmail, teacherName, username, newPassword string) error
}

type smtpMailer struct {
	host       string
	port       int
	username   string
	password   string
	fromEmail  string
	senderName string
	portalURL  string
}

func NewMailer() Mailer {
	port, _ := strconv.Atoi(os.Getenv("SMTP_PORT"))
	if port == 0 {
		port = 587
	}

	senderName := os.Getenv("SMTP_SENDER_NAME")
	if senderName == "" {
		senderName = "SMPN 1 Prambon - Sistem Absensi Face Recognition"
	}

	fromEmail := os.Getenv("SMTP_FROM")
	if fromEmail == "" {
		fromEmail = os.Getenv("SMTP_USERNAME")
		if fromEmail == "" {
			fromEmail = "noreply@smpn1prambon.sch.id"
		}
	}

	portalURL := os.Getenv("APP_PORTAL_URL")
	if portalURL == "" {
		portalURL = "http://localhost:3000/login"
	}

	rawPassword := strings.ReplaceAll(os.Getenv("SMTP_PASSWORD"), " ", "")

	return &smtpMailer{
		host:       os.Getenv("SMTP_HOST"),
		port:       port,
		username:   os.Getenv("SMTP_USERNAME"),
		password:   rawPassword,
		fromEmail:  fromEmail,
		senderName: senderName,
		portalURL:  portalURL,
	}
}


func (m *smtpMailer) SendTeacherAccessEmail(ctx context.Context, teacherEmail, teacherName, username, password string, courseNames, classCodes []string) error {
	if teacherEmail == "" {
		log.Printf("[MAILER] Skipped SendTeacherAccessEmail: teacherEmail is empty for %s", teacherName)
		return nil
	}

	courseList := "Belum diatur"
	if len(courseNames) > 0 {
		courseList = strings.Join(courseNames, ", ")
	}

	classList := "Semua / Belum diatur"
	if len(classCodes) > 0 {
		classList = strings.Join(classCodes, ", ")
	}

	subject := fmt.Sprintf("Akses Login Portal Absensi Guru - %s", teacherName)

	body := fmt.Sprintf(`Yth. Bapak/Ibu %s,

Selamat! Akun Anda untuk mengakses Portal Absensi Siswa Berbasis Face Recognition di SMPN 1 Prambon telah aktif.

Berikut adalah informasi kredensial login Anda:
--------------------------------------------------
URL Portal      : %s
Username        : %s
Password        : %s
--------------------------------------------------
Mata Pelajaran  : %s
Kelas Diampu    : %s
--------------------------------------------------

Demi keamanan dan privasi, Anda disarankan untuk segera masuk dan memperbarui username serta password Anda melalui menu "Profil Saya" setelah login pertama kali.

Jika Anda membutuhkan bantuan, silakan hubungi tim Administrator IT Sekolah.

Salam hangat,
%s`,
		teacherName,
		m.portalURL,
		username,
		password,
		courseList,
		classList,
		m.senderName,
	)

	return m.sendEmail(teacherEmail, subject, body)
}

func (m *smtpMailer) SendPasswordResetEmail(ctx context.Context, teacherEmail, teacherName, username, newPassword string) error {
	if teacherEmail == "" {
		log.Printf("[MAILER] Skipped SendPasswordResetEmail: teacherEmail is empty for %s", teacherName)
		return nil
	}

	subject := fmt.Sprintf("Reset Password Akun Guru - %s", teacherName)

	body := fmt.Sprintf(`Yth. Bapak/Ibu %s,

Kami menginformasikan bahwa Administrator sekolah telah melakukan reset kata sandi (password) untuk akun Anda pada Portal Absensi SMPN 1 Prambon.

Berikut informasi kredensial akun terbaru Anda:
--------------------------------------------------
URL Portal      : %s
Username        : %s
Password Baru   : %s
--------------------------------------------------

Seluruh riwayat absensi, sesi kelas, serta daftar mata pelajaran dan kelas yang Anda ampu tetap aman dan tidak terhapus.

Setelah login, Anda dapat mengubah kembali password ini pada menu "Profil Saya" demi menjaga privasi Anda.

Salam hangat,
%s`,
		teacherName,
		m.portalURL,
		username,
		newPassword,
		m.senderName,
	)

	return m.sendEmail(teacherEmail, subject, body)
}

func (m *smtpMailer) sendEmail(toEmail, subject, textBody string) error {
	log.Printf("\n=======================================================\n"+
		"[MAILER NOTIFICATION]\n"+
		"To: %s\n"+
		"Subject: %s\n"+
		"Body:\n%s\n"+
		"=======================================================\n",
		toEmail, subject, textBody)

	// If SMTP host is not configured, fallback gracefully with console log
	if m.host == "" || m.username == "" {
		log.Printf("[MAILER] SMTP host/username not set. Email logged to console successfully.")
		return nil
	}

	addr := fmt.Sprintf("%s:%d", m.host, m.port)
	auth := smtp.PlainAuth("", m.username, m.password, m.host)

	header := make(map[string]string)
	header["From"] = fmt.Sprintf("%s <%s>", m.senderName, m.fromEmail)
	header["To"] = toEmail
	header["Subject"] = subject
	header["MIME-Version"] = "1.0"
	header["Content-Type"] = "text/plain; charset=\"UTF-8\""

	message := ""
	for k, v := range header {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + textBody

	err := smtp.SendMail(addr, auth, m.fromEmail, []string{toEmail}, []byte(message))
	if err != nil {
		log.Printf("[MAILER ERROR] Failed to send email via SMTP to %s: %v", toEmail, err)
		// Do not crash execution if third-party SMTP server fails, return error for logging
		return err
	}

	log.Printf("[MAILER SUCCESS] Email sent successfully to %s", toEmail)
	return nil
}
