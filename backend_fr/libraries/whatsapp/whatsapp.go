package whatsapp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

type Notifier interface {
	SendLateNotification(ctx context.Context, parentPhone, studentName, className, sessionTime string) error
	SendAbsentNotification(ctx context.Context, parentPhone, studentName, className, sessionDate string) error
	SendAttendanceConfirmation(ctx context.Context, parentPhone, studentName, className, sessionTime, location string) error
	SendTeacherAccessNotification(ctx context.Context, teacherPhone, teacherName, username, password, portalURL string) error
}

type Client struct {
	apiURL string
	apiKey string
}

func NewNotifier() Notifier {
	apiURL := os.Getenv("WA_API_URL")
	if apiURL == "" {
		apiURL = "https://api.fonnte.com/send"
	}
	apiKey := os.Getenv("WA_API_KEY")
	if apiKey == "" {
		apiKey = "BZ2ULnUerGn1T74V8Uu8"
	}

	return &Client{
		apiURL: apiURL,
		apiKey: apiKey,
	}
}

func (c *Client) SendLateNotification(ctx context.Context, parentPhone, studentName, className, sessionTime string) error {
	if parentPhone == "" {
		log.Printf("[WHATSAPP] Skipped: Parent phone is empty for student %s", studentName)
		return nil
	}

	msg := fmt.Sprintf(
		"⚠️ *PEMBERITAHUAN KETERLAMBATAN SISWA*\n\nYth. Orang Tua/Wali dari *%s*,\n\nKami menginformasikan bahwa siswa atas nama *%s* dicatat *TERLAMBAT* mengikuti mata pelajaran/kelas *%s* pada %s.\n\nMohon perhatian dan bimbingannya agar siswa dapat hadir tepat waktu. Terima kasih.\n\n_Sistem Absensi Face Recognition SMPN 1 Prambon_",
		studentName, studentName, className, sessionTime,
	)

	return c.send(ctx, parentPhone, msg)
}

func (c *Client) SendAbsentNotification(ctx context.Context, parentPhone, studentName, className, sessionDate string) error {
	if parentPhone == "" {
		log.Printf("[WHATSAPP] Skipped: Parent phone is empty for student %s", studentName)
		return nil
	}

	msg := fmt.Sprintf(
		"🚨 *PEMBERITAHUAN KETIDAKHADIRAN (ALPA) SISWA*\n\nYth. Orang Tua/Wali dari *%s*,\n\nKami menginformasikan bahwa siswa atas nama *%s* *TIDAK HADIR (ALPA)* pada mata pelajaran/kelas *%s* tanggal %s.\n\nJika terdapat kekeliruan atau surat izin/sakit, mohon segera menghubungi Wali Kelas/Guru Mata Pelajaran.\n\n_Sistem Absensi Face Recognition SMPN 1 Prambon_",
		studentName, studentName, className, sessionDate,
	)

	return c.send(ctx, parentPhone, msg)
}

func (c *Client) SendAttendanceConfirmation(ctx context.Context, parentPhone, studentName, className, sessionTime, location string) error {
	if parentPhone == "" {
		return nil
	}

	locInfo := ""
	if location != "" {
		locInfo = fmt.Sprintf("\n📍 *Lokasi*: %s", location)
	}

	msg := fmt.Sprintf(
		"✅ *KONFIRMASI KEHADIRAN SISWA*\n\nYth. Orang Tua/Wali dari *%s*,\n\nSiswa atas nama *%s* telah terdata *HADIR* pada kelas *%s* pada waktu *%s*.%s\n\n_Sistem Absensi Face Recognition SMPN 1 Prambon_",
		studentName, studentName, className, sessionTime, locInfo,
	)

	return c.send(ctx, parentPhone, msg)
}

func (c *Client) SendTeacherAccessNotification(ctx context.Context, teacherPhone, teacherName, username, password, portalURL string) error {
	if teacherPhone == "" {
		return nil
	}

	msg := fmt.Sprintf(
		"👨‍🏫 *AKSES PORTAL GURU - SMP NEGERI 1 PRAMBON*\n\nHalo Bapak/Ibu *%s*,\n\nAkun Anda telah aktif pada Sistem Absensi Face Recognition SMPN 1 Prambon.\n\nBerikut informasi login Anda:\n🔹 *Username*: %s\n🔹 *Password*: %s\n🔹 *Portal*: %s\n\n_Harap jaga kerahasiaan password Anda._",
		teacherName, username, password, portalURL,
	)

	return c.send(ctx, teacherPhone, msg)
}

func (c *Client) send(ctx context.Context, phone, message string) error {
	log.Printf("[WHATSAPP NOTIFICATION SENT] To: %s | Message: %s", phone, message)

	if c.apiURL == "" || c.apiKey == "" {
		return nil
	}

	payload := map[string]string{
		"target":  phone,
		"message": message,
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.apiURL, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", c.apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[WHATSAPP API ERROR] %v", err)
		return err
	}
	defer resp.Body.Close()

	log.Printf("[WHATSAPP API SUCCESS] Response Status: %s", resp.Status)
	return nil
}
