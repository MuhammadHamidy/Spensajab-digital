# DESAIN SKEMA DATABASE & SPESIFIKASI API BACKEND GO
# Sistem Presensi QR Code Sekolah (Go Fiber REST API)

**Acuan Dokumen:** [PRD.md](file:///c:/Kuliah/Kebutuhan%20Kerja/Kerja/absen_sekolah/PRD.md) v1.1 & [DESIGN_BRIEF.md](file:///c:/Kuliah/Kebutuhan%20Kerja/Kerja/absen_sekolah/DESIGN_BRIEF.md)  
**Database Engine:** PostgreSQL 16+  
**Backend Framework:** Go Fiber v2 + pgx/v5 (Clean Architecture + Uber Fx)  

---

## 1. Arsitektur Relasi Database (Entity Relationship)

```
                    +-----------------------+
                    |        roles          |
                    +-----------------------+
                    | id (PK)               |
                    | name (VARCHAR, U)     |
                    +-----------+-----------+
                                | 1
                                | 
                                | N
                    +-----------v-----------+
                    |       accounts        |<-------------------------+
                    +-----------------------+                          |
                    | id (PK, UUID)         |                          |
                    | username (U)          |                          |
                    | password_hash         |                          |
                    | role_id (FK -> roles) |                          |
                    | full_name             |                          |
                    | nim_nip (U)           |                          |
                    | nisn (U, nullable)    |                          |
                    | qr_code_token (U, idx)|                          |
                    | class_name            |                          |
                    +-----+-----------+-----+                          |
                          |           |                                |
       (Guru Pengampu) 1  |           | 1 (Siswa)                      |
                          |           |                                |
                          | N         | N                              |
                          |     +-----v---------------+                |
                          |     |  class_enrollments  |                |
                          |     +---------------------+                |
                          |     | class_id (FK)       |                |
                          |     | student_id (FK)     |                |
                          |     +---------+-----------+                |
                          |               |                            |
                          |               | N                          |
                          |               |                            |
                          |     +---------v-----------+                |
                          |     |       classes       |                |
                          |     +---------------------+                |
                          |     | id (PK)             |                |
                          |     | class_code (U)      |                |
                          |     | course_id (FK)      |                |
                          |     +---------+-----------+                |
                          |               | 1                          |
                          |               |                            |
                          |               | N                          |
                          |     +---------v-----------+                |
                          +---->|   class_sessions    |                |
                                +---------------------+                |
                                | id (PK, UUID)       |                |
                                | class_id (FK)       |                |
                                | teacher_id (FK)     |                |
                                | status (OPEN/CLOSED)|                |
                                | opened_at (TIMESTMP)|                |
                                | late_cutoff_at (+15m|                |
                                | closed_at           |                |
                                +---------+-----------+                |
                                          | 1                          |
                                          |                            |
                                          | N                          |
                                +---------v-----------+                |
                                |     attendances     |                |
                                +---------------------+                |
                                | id (PK, UUID)       |                |
                                | session_id (FK)     |                |
                                | student_id (FK)-----+----------------+
                                | timestamp           |
                                | status (HADIR/LATE/ |
                                |         ALPHA/IZIN) |
                                | method (QR_CODE)    |
                                | is_manual_edit      |
                                +---------------------+
```

---

## 2. Struktur Modul Backend Go (Clean Architecture)

Sistem akan memanfaatkan modul terstruktur di dalam `backend_fr/facerec/module/`:

```
backend_fr/facerec/module/
├── auth/                 # Login JWT & Middleware Context
├── users/                # Akun Guru, Admin, Siswa
├── school_classes/       # CRUD Kelas, Rombel, Enrollments Siswa
├── school_sessions/      # Sesi Kelas Buka/Tutup & Timer Cutoff 15 Menit
│   ├── delivery/http/    # Fiber Handlers (Buka, Tutup, Status Sesi)
│   ├── domain/           # Entitas Session & Rule 15 Menit
│   ├── repository/       # Query pgx / GORM class_sessions
│   └── usecase/          # Business Logic Buka/Tutup & Auto Alpha
├── school_attendances/   # Barcode/QR Scanning & Manual Override
│   ├── delivery/http/    # Handler /scan, /override
│   ├── domain/           # Entitas Attendance & Validasi QR
│   ├── repository/       # Lock atomic scanning & indexing
│   └── usecase/          # Debounce logic & cut-off check
└── school_imports/       # Bulk Excel Processor (.xlsx via excelize)
    ├── delivery/http/    # Handler Upload Siswa & Guru
    └── usecase/          # Parse sheet, validasi baris, batch insert
```

---

## 3. Spesifikasi Kontrak REST API

### A. Autentikasi (`/api/auth`)
Semua endpoint terproteksi memerlukan Header: `Authorization: Bearer <JWT_TOKEN>`.

| Method | Endpoint | Role | Deskripsi |
|---|---|---|---|
| `POST` | `/api/auth/login` | Publik | Login pengguna (Super Admin, Admin, Guru). Mengembalikan JWT token + payload peran (`role_name`). |
| `GET` | `/api/auth/me` | Terautentikasi | Profil akun yang sedang login dan daftar izin (*permissions*). |

---

### B. Modul Sesi Kelas & Presensi QR Guru (`/api/sessions`)

#### 1. Buka Sesi Kelas Baru
* **Endpoint:** `POST /api/sessions/open`
* **Role Akses:** `GURU`
* **Request Body:**
```json
{
  "class_id": "class-7d",
  "topic": "Pengenalan Algoritma Pemrograman",
  "session_number": 3
}
```
* **Logika Bisnis:**
  * Validasi apakah guru ini mengajar kelas tersebut.
  * Buat baris `class_sessions` baru dengan status `OPEN`.
  * Hitung `late_cutoff_at = opened_at + 15 MINUTES`.
  * Inisialisasi seluruh siswa di kelas tersebut ke tabel `attendances` dengan status `PENDING`.
* **Response (201 Created):**
```json
{
  "success": true,
  "message": "Sesi kelas berhasil dibuka",
  "data": {
    "session_id": "sess-uuid-12345",
    "class_id": "class-7d",
    "class_name": "VII-D",
    "teacher_name": "Budi Santoso, S.Pd",
    "status": "OPEN",
    "opened_at": "2026-09-18T07:00:00Z",
    "late_cutoff_at": "2026-09-18T07:15:00Z",
    "total_students": 36,
    "total_present": 0
  }
}
```

---

#### 2. Pemindaian QR Code Siswa (High-Throughput Sub-Second)
* **Endpoint:** `POST /api/sessions/:id/scan`
* **Role Akses:** `GURU`
* **Request Body:**
```json
{
  "qr_code_token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```
* **Logika Bisnis:**
  1. Cari siswa berdasarkan `accounts.qr_code_token`. Jika tidak ditemukan $\rightarrow$ Error `404 NOT_FOUND` ("Kartu QR tidak terdaftar").
  2. Verifikasi apakah siswa terdaftar di `class_id` sesi ini. Jika tidak $\rightarrow$ Error `400 BAD_REQUEST` ("Siswa bukan anggota kelas ini").
  3. Cek catatan `attendances`:
     * Jika sudah `HADIR` / `TERLAMBAT`: Tolak `409 CONFLICT` ("Siswa sudah diabsen pada HH:mm:ss").
  4. Cek Waktu Saat Ini vs `late_cutoff_at`:
     * Jika `NOW() <= late_cutoff_at`: Simpan status `HADIR`.
     * Jika `NOW() > late_cutoff_at`: Simpan status `TERLAMBAT`.
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Presensi berhasil dicatat",
  "data": {
    "student_id": "user-siswa-1",
    "nisn": "0081293812",
    "full_name": "Andi Saputra",
    "class_name": "VII-D",
    "scan_time": "2026-09-18T07:04:12Z",
    "status": "HADIR",
    "is_late": false
  }
}
```

---

#### 3. Manual Override Kehadiran Siswa
* **Endpoint:** `PUT /api/sessions/:id/attendance/:student_id`
* **Role Akses:** `GURU`
* **Request Body:**
```json
{
  "status": "SAKIT", // Pilihan: HADIR, TERLAMBAT, SAKIT, IZIN, ALPHA
  "notes": "Surat dokter diserahkan wali kelas"
}
```
* **Response (200 OK):** Mengembalikan data kehadiran yang telah diperbarui dengan `is_manual_edit = true`.

---

#### 4. Tutup Sesi Kelas
* **Endpoint:** `POST /api/sessions/:id/close`
* **Role Akses:** `GURU`
* **Logika Bisnis:**
  * Seluruh siswa yang masih berstatus `PENDING` otomatis diubah statusnya menjadi `ALPHA`.
  * Set `status = 'CLOSED'`, `closed_at = NOW()`.
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Sesi kelas resmi ditutup",
  "data": {
    "session_id": "sess-uuid-12345",
    "status": "CLOSED",
    "summary": {
      "total_students": 36,
      "hadir": 32,
      "terlambat": 2,
      "sakit": 1,
      "izin": 0,
      "alpha": 1
    }
  }
}
```

---

### C. Master Data, Mapel & Bulk Import (Khusus `ADMIN`)

#### 1. Kelola Data Mata Pelajaran (Mapel)
* **Endpoint:** `GET /api/school/courses` | Ambil seluruh daftar mata pelajaran
* **Endpoint:** `POST /api/school/courses` | Tambah mata pelajaran baru
* **Endpoint:** `DELETE /api/school/courses/:id` | Hapus mata pelajaran
* **Role Akses:** `ADMIN`

---

#### 2. Bulk Import Siswa via Excel
* **Endpoint:** `POST /api/school/import/students`
* **Role Akses:** `ADMIN`
* **Content-Type:** `multipart/form-data` (File key: `file`)
* **Spesifikasi Header Kolom Excel:**
  * Kolom A: `NISN` (Teks 10 digit, Unik)
  * Kolom B: `Nama Lengkap`
  * Kolom C: `Kode Kelas` (Contoh: `VII-D`, `X-RPL-1`)
  * Kolom D: `Jenis Kelamin` (`L` / `P`)
  * Kolom E: `No HP Ortu` (Opsional)

---

#### 3. Unduh Format Template Excel Import
* **Endpoint:** `GET /api/school/import/template/:type` (`type`: `students` atau `teachers`)
* **Role Akses:** `ADMIN`
* **Response:** File `.xlsx` terformat dengan contoh data.

---

### D. Monitoring & Rekapitulasi Presensi (`ADMIN`)

#### 1. Live Class Monitoring
* **Endpoint:** `GET /api/school/monitoring/live`
* **Role Akses:** `ADMIN`
* **Response:** Daftar seluruh kelas yang saat ini berstatus `OPEN`, nama guru, jam buka, sisa menit menuju cut-off 15 menit, dan persentase siswa hadir live.

#### 2. Export Rekapitulasi Presensi Excel
* **Endpoint:** `GET /api/admin/reports/attendance/export?class_id=...&start_date=...&end_date=...`
* **Role Akses:** `ADMIN`
* **Response:** File `.xlsx` dengan format rekapitulasi matriks kehadiran tanggal vs siswa lengkap dengan total persentase.
