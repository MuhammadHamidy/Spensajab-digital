# Dokumentasi API — Sistem Presensi QR Barcode Sekolah

**Versi:** 1.0.0  
**Base URL:** `http://localhost:8080/api`  
**Spesifikasi:** RESTful API Go Fiber + PostgreSQL (GORM & pgx)  
**Target Pengguna:** 1 Admin Sekolah, 20 Guru Pengajar, dan Siswa (SMPN 1 Jabon)  

---

## 1. Fitur Utama & Ruang Lingkup Sistem

1. **Autentikasi & RBAC Presisi**:
   * `ADMIN` (1 User Tunggal): Akses impor/ekspor data siswa/guru, rekap absensi, kelola mapel, dan monitoring terpusat.
   * `GURU` (20 Pengajar): Membuka/menutup sesi kelas, memindai barcode/QR siswa, dan manual override.
   * `SISWA`: Pemegang kartu fisik 2D QR Code.
2. **Siklus Sesi Kelas Guru**: Buka kelas (`POST /api/school/sessions/open`), hitung mundur cut-off 15 menit, dan tutup kelas (`POST /api/school/sessions/:id/close`) dengan penguncian otomatis siswa mangkir ke status `ALPHA`.
3. **High-Speed QR Barcode Scanner**: Validasi token QR siswa sub-detik (< 150ms) dengan pencegahan *double-scan* dan validasi anggota rombel kelas.
4. **Bulk Import Excel (.xlsx)**: Unggah massal ratusan data siswa dan 20 akun guru sekaligus dengan *atomic transactional rollback* jika ada nomor baris error.
5. **Master Data Mata Pelajaran (Mapel)**: CRUD kurikulum mapel, alokasi jam/SKS, dan pembagian pengajar.
6. **Rekapitulasi & Reporting**: Filter multi-parameter tanggal & kelas serta ekspor matriks kehadiran ke Microsoft Excel (`.xlsx`).
7. **QR Generator Service**: Menghasilkan gambar QR Code format PNG langsung via endpoint backend (`GET /api/school/qrcode/:token`).

---

## 2. Format Respons Standar

**Sukses:**
```json
{
  "success": true,
  "message": "Operasi berhasil",
  "data": { ... }
}
```

**Gagal:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Pesan deskripsi kesalahan"
  }
}
```

---

## 3. Daftar Endpoint Lengkap

### A. Autentikasi (`/api/auth`)
| Metode | Endpoint | Role | Deskripsi |
|---|---|---|---|
| POST | `/api/auth/login` | Publik | Login Admin & Guru (mendapatkan JWT Token & Role) |
| GET | `/api/auth/me` | Terautentikasi | Ambil profil akun dan wewenang pengguna |

---

### B. Sesi Kelas & Scanner Presensi (`/api/school/sessions`)
| Metode | Endpoint | Role | Deskripsi |
|---|---|---|---|
| POST | `/api/school/sessions/open` | GURU | Buka sesi kelas baru & inisialisasi cut-off 15 menit |
| POST | `/api/school/sessions/:id/close` | GURU | Tutup sesi kelas & ubah sisa siswa pending jadi ALPHA |
| GET | `/api/school/sessions/:id` | GURU, ADMIN | Detail sesi kelas beserta daftar hadir roster siswa |
| GET | `/api/school/sessions` | GURU, ADMIN | Riwayat sesi kelas (filter by kelas, tanggal, guru) |
| POST | `/api/school/sessions/:id/scan` | GURU | Pemindaian token QR Code kartu siswa (Hadir/Terlambat) |
| PUT | `/api/school/sessions/:id/attendances/:student_id` | GURU | Manual override status (Sakit, Izin, Terlambat) |

---

### C. Monitoring Live & QR Generator (`/api/school`)
| Metode | Endpoint | Role | Deskripsi |
|---|---|---|---|
| GET | `/api/school/monitoring/live` | ADMIN | Monitoring langsung seluruh kelas yang berstatus OPEN |
| GET | `/api/school/qrcode/:token` | Publik/Semua | Stream gambar PNG QR Code untuk kartu pelajar siswa |

---

### D. Bulk Import Excel Data Master (`/api/school/import`)
| Metode | Endpoint | Role | Deskripsi |
|---|---|---|---|
| POST | `/api/school/import/students` | ADMIN | Upload file Excel (.xlsx) data siswa & auto-generate QR |
| POST | `/api/school/import/teachers` | ADMIN | Upload file Excel (.xlsx) daftar 20 akun guru |
| GET | `/api/school/import/template/students` | ADMIN | Download file template resmi Excel siswa |
| GET | `/api/school/import/template/teachers` | ADMIN | Download file template resmi Excel guru |

---

### E. Kelola Mata Pelajaran (`/api/school/courses`)
| Metode | Endpoint | Role | Deskripsi |
|---|---|---|---|
| GET | `/api/school/courses` | ADMIN, GURU | Daftar seluruh mata pelajaran |
| POST | `/api/school/courses` | ADMIN | Tambah mata pelajaran baru |
| DELETE | `/api/school/courses/:id` | ADMIN | Hapus mata pelajaran |
