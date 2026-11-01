# PRODUCT REQUIREMENT DOCUMENT (PRD)
# Sistem Presensi QR Code Siswa Berbasis Kelas (Go + Next.js)

**Versi:** 1.2 (Single Admin Architecture)  
**Author:** Senior Product Manager  
**Tech Stack:** Go (Backend REST API) + Next.js (Frontend App)  
**Target Pengguna:** 1 Admin Tunggal, 20 Guru Pengajar, dan Siswa  

---

## 1. Problem Statement

* **Siapa yang dirugikan:** Guru pengajar, staf tata usaha (Admin), dan siswa.
* **Akar Masalah:**
  1. **Pemborosan Jam Belajar:** Metode presensi konvensional (panggilan lisan/kertas absensi manual) memakan waktu 10–15 menit dari jam pelajaran efektif.
  2. **Human Error & Beban Rekapitulasi Admin:** 1 Admin harus mengumpulkan, merekap, dan memasukkan data absensi secara manual ke spreadsheet di akhir bulan.
  3. **Inkonsistensi Penegakan Disiplin:** Batasan toleransi keterlambatan (15 menit) sulit ditegakkan secara objektif tanpa pencatatan waktu (*timestamp*) yang akurat per detik.

---

## 2. Target User & Persona

### Hak Akses & Matriks Pengguna
* **1 Admin Tunggal:**
  * Mengelola import dan export data siswa serta 20 akun guru (via Excel `.xlsx`).
  * Mengelola master data Mata Pelajaran (Mapel) dan pembagian kelas.
  * Mengakses rekapitulasi absensi lengkap seluruh kelas & mengunduh laporan bulanan.
  * Memantau status kelas yang sedang aktif secara terpusat.
* **20 Guru Pengajar:** Membuka sesi kelas, memindai QR code kartu siswa via webcam/scanner USB di meja guru, manual override (Sakit/Izin/Terlambat), dan menutup sesi kelas.
* **Siswa:** Pemegang kartu fisik 2D QR Code untuk dipindai saat jam pelajaran dimulai.

---

### Persona 1: Pak Budi (Guru Mata Pelajaran)
* **Karakteristik:** Mengajar 4–5 sesi per hari di ruang kelas yang berbeda.
* **Alur Kerja:**
  1. Masuk kelas, membuka laptop, login ke Next.js.
  2. Memilih kelas dan mata pelajaran, lalu klik **"Buka Kelas"**.
  3. Mengarahkan webcam/scanner USB ke arah barisan siswa yang maju menunjukkan kartu QR.
  4. Dalam 2 menit seluruh siswa terdata; sistem otomatis menandai siswa yang belum scan setelah 15 menit sebagai `ALPHA`.
  5. Selesai jam pelajaran, klik **"Tutup Kelas"**.

### Persona 2: Pak Hendra (Admin Sekolah / Tata Usaha)
* **Karakteristik:** Penanggung jawab seluruh operasional data akademik sekolah.
* **Tanggung Jawab:**
  1. Mengelola mata pelajaran (Mapel) yang diajarkan di sekolah.
  2. Menyiapkan 20 akun guru dan ratusan data siswa baru di awal semester via bulk import Excel.
  3. Mengunduh rekap absensi berkala untuk laporan pimpinan sekolah.

---

## 3. Goals dan Non-Goals

### Goals
1. **Kecepatan Presensi:** Durasi pemindaian QR code $\le 1.5$ detik per siswa, menyelesaikan presensi satu kelas (30–36 siswa) dalam waktu kurang dari 2 menit.
2. **Otomatisasi Status Disiplin (Aturan 15 Menit):** 
   * Scan $0 \le t \le 15$ menit sejak sesi dibuka: tercatat `HADIR`.
   * Lewat dari 15 menit: sistem otomatis mengunci status siswa yang belum scan menjadi `ALPHA`. (Jika siswa datang terlambat, status dapat diubah guru secara manual menjadi `TERLAMBAT`).
3. **Pemisahan Otoritas Ketat:** Hanya 1 Super Admin yang dapat melakukan mutasi data master dan upload Excel.
4. **Alur Hardware Opsi A (Kios Meja Guru):** Siswa membawa kartu fisik 2D QR Code dan mengarahkannya ke webcam laptop guru atau scanner barcode 2D USB di meja guru.
5. **Dukungan Bulk Import Excel:** Pengisian data master 20 guru dan seluruh siswa via template Excel `.xlsx` pada rilis MVP.

### Non-Goals (Out of Scope untuk MVP)
* Aplikasi smartphone khusus siswa (siswa hanya memegang kartu fisik; tidak memiliki akses login aplikasi).
* Face recognition / integrasi biometrik wajah.
* Notifikasi instan via WhatsApp Gateway API (dialokasikan ke rilis v2).
* Sinkronisasi otomatis ke sistem Dapodik Kemendikbud (dialokasikan ke rilis v3).

---

## 4. User Stories

| ID | Sebagai | Saya Ingin | Supaya |
|---|---|---|---|
| US-01 | Super Admin | Mengunggah file template Excel berisi daftar guru dan siswa | Seluruh data master dan akun langsung terbentuk dalam hitungan detik tanpa input manual satu per satu. |
| US-02 | Super Admin | Mengunduh lembar cetak kartu QR code siswa | Kartu fisik dapat dibagikan kepada siswa sebelum tahun ajaran berjalan. |
| US-03 | Guru | Memilih kelas dan mata pelajaran lalu menekan "Buka Kelas" | Sesi aktif dimulai dan timer 15 menit berjalan secara otomatis. |
| US-04 | Guru | Memindai kartu QR Code siswa menggunakan webcam laptop atau scanner USB | Data kehadiran siswa langsung tercatat real-time tanpa mengetik. |
| US-05 | Guru | Menutup sesi kelas ("Tutup Kelas") | Data kehadiran terkunci dan tidak bisa diubah kembali oleh pemindaian baru. |
| US-06 | Guru | Mengubah status kehadiran siswa secara manual (Sakit/Izin/Terlambat) | Kasus siswa sakit dengan surat atau dispensasi resmi tetap tercatat akurat. |
| US-07 | Admin (10 Staf) | Melihat dashboard pemantauan kelas aktif dan mengunduh laporan Excel | Mendapatkan rekap absensi harian/bulanan tanpa hak mengubah data master. |

---

## 5. Roadmap Fitur: MVP vs v2 vs Nanti

```
+-----------------------------------------------------------------------------------+
| MVP (Fase 1)                                                                      |
| - RBAC: 1 Super Admin, 10 Admin Monitoring, 20 Guru                               |
| - Bulk Import Siswa & Guru dari Template Excel (.xlsx)                            |
| - Generator 2D QR Code Siswa (Go) & Print Label Kartu                             |
| - Siklus Kelas: Buka Kelas -> QR Scan -> Lock 15 Menit -> Tutup Kelas             |
| - Scanner Engine (Webcam Next.js + USB Barcode/QR Reader)                         |
| - Manual Override Kehadiran (Sakit / Izin / Terlambat)                            |
| - Export Laporan Rekap Presensi (.xlsx)                                           |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| Versi 2 (Fase 2)                                                                  |
| - Notifikasi WhatsApp otomatis ke wali murid (Alpha / Terlambat)                  |
| - Dynamic rotating QR Code (mencegah duplikasi foto QR antar siswa)               |
| - Dashboard Analitik Kehadiran & Peringatan Dini Siswa Sering Membolos            |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| Nanti (Fase 3)                                                                    |
| - Portal Siswa & Orang Tua (Web Progressive Web App)                              |
| - Integrasi API Dapodik / Sistem Informasi Akademik Sekolah                       |
+-----------------------------------------------------------------------------------+
```

---

## 6. Functional Requirements Detail (MVP)

### FR-01: Autentikasi & Kontrol Akses Berbasis Peran (RBAC)
* Sistem menyediakan 3 level peran:
  1. `SUPER_ADMIN` (Tepat 1 Akun): Akses seluruh menu, manajemen akun guru, import Excel, cetak kartu QR, audit log.
  2. `ADMIN` (10 Akun Staf): Hanya dapat mengakses menu monitoring dashboard dan export laporan kehadiran. Menu kelola master data dinonaktifkan (*hidden & forbidden* di tingkat API).
  3. `GURU` (20 Akun): Hanya dapat mengakses menu jadwal/kelas yang diampu, antarmuka pemindaian QR saat sesi buka kelas, dan manual override untuk kelas yang diampunya.

### FR-02: Bulk Import Data Master via Excel
* Backend menyediakan endpoint `POST /api/admin/import/students` dan `POST /api/admin/import/teachers` (menerima `.xlsx`).
* Format Excel Siswa wajib memvalidasi kolom:
  `NISN (Wajib, Unik)`, `Nama Lengkap`, `Kelas`, `Jenis Kelamin`, `Tahun Ajaran`.
* Format Excel Guru:
  `NIP/Kode Guru (Wajib, Unik)`, `Nama Lengkap`, `Email/Username`, `Password Default`.
* Validasi sistem:
  * Jika ada NISN atau Username duplikat dalam file, sistem melakukan *rollback transactional* dan mengembalikan nomor baris error.
  * Setiap siswa yang berhasil diimport otomatis dibuatkan nilai `qr_code_token` acak kriptografis (UUIDv4) untuk mencegah tebak-tebakan nomor QR.

### FR-03: Generator & Pencetakan Kartu 2D QR Code
* Backend Go meng-generate gambar QR Code standar ISO/IEC 18004 menggunakan payload `qr_code_token`.
* Next.js menyediakan fitur cetak halaman (Print Preview) dalam format grid kartu pelajar (standar ID-1 / CR80 atau stiker ukuran A4) yang memuat Nama Siswa, NISN, Kelas, dan gambar 2D QR Code.

### FR-04: Antarmuka Pemindai QR & Hardware Dual-Mode (Next.js)
* **Mode 1 (Webcam Laptop Guru):** Menggunakan library client-side (`html5-qrcode` atau `@zxing/browser`) yang mengaktifkan kamera depan laptop guru.
* **Mode 2 (Scanner Barcode 2D USB):** Scanner USB eksternal yang bertindak sebagai *keyboard wedge* (membaca input serial dan diakhiri karakter `Enter`). Frontend Next.js menangkap input global buffer tanpa mewajibkan kursor berada di input text tertentu.
* Umpan Balik Antarmuka:
  * Suara audio beep ringkas (Success sound) dan layar hijau saat scan valid.
  * Suara buzzer (Error sound) dan layar merah saat QR tidak dikenal, siswa salah kelas, atau scan berulang.

### FR-05: Logika Aturan 15 Menit & Status Kehadiran
* Saat guru menekan **"Buka Kelas"**:
  * Rekaman `class_sessions` dibuat dengan `status = 'OPEN'`, `opened_at = NOW()`.
  * Seluruh siswa terdaftar di kelas tersebut diinisialisasi dalam tabel `attendances` dengan status `PENDING`.
* Selama $0 \le t \le 15$ menit:
  * Siswa yang memindai QR Code langsung berganti status menjadi `HADIR` dengan `scan_time = NOW()`.
* Setelah $t > 15$ menit:
  * Seluruh siswa yang masih berstatus `PENDING` otomatis diperbarui oleh backend/trigger menjadi `ALPHA`.
  * Jika siswa datang setelah menit ke-15, pemindaian QR akan ditolak atau masuk status `TERLAMBAT` (berdasarkan konfirmasi manual guru).
* Saat guru menekan **"Tutup Kelas"**:
  * `status` berubah menjadi `CLOSED`, `closed_at = NOW()`.
  * Sesi terkunci permanen.

### FR-06: Export Laporan Presensi
* Filter laporan: Rentang Tanggal, Kelas, Guru Pengampu, Status Kehadiran.
* Output: Format Microsoft Excel (`.xlsx`) rapi dengan rekapitulasi persentase kehadiran:
  $\text{Tingkat Kehadiran} = \frac{\text{Hadir}}{\text{Total Pertemuan}} \times 100\%$.

---

## 7. Sketsa Data Model

```
+-------------------------------------------------------------+
|                          users                              |
+-------------------------------------------------------------+
| id             : UUID (PK)                                  |
| username       : VARCHAR(50) (UNIQUE)                       |
| password_hash  : VARCHAR(255)                               |
| full_name      : VARCHAR(100)                               |
| role           : ENUM('SUPER_ADMIN', 'ADMIN', 'GURU')       |
| nip            : VARCHAR(30) (NULLABLE, UNIQUE)             |
| created_at     : TIMESTAMP                                  |
+------------------------------+------------------------------+
                               |
                               | 1:N (sebagai pengajar)
                               v
+-------------------------------------------------------------+
|                     class_sessions                          |
+-------------------------------------------------------------+
| id             : UUID (PK)                                  |
| teacher_id     : UUID (FK -> users.id)                      |
| class_id       : UUID (FK -> classes.id)                    |
| subject_name   : VARCHAR(100)                               |
| status         : ENUM('OPEN', 'CLOSED')                     |
| opened_at      : TIMESTAMP                                  |
| late_cutoff_at : TIMESTAMP (opened_at + 15 menit)           |
| closed_at      : TIMESTAMP (NULLABLE)                       |
+------------------------------+------------------------------+
                               |
                               | 1:N
                               v
+-------------------------------------------------------------+
|                       attendances                           |
+-------------------------------------------------------------+
| id             : UUID (PK)                                  |
| session_id     : UUID (FK -> class_sessions.id)             |
| student_id     : UUID (FK -> students.id)                   |
| scan_time      : TIMESTAMP (NULLABLE)                       |
| status         : ENUM('PENDING','HADIR','TERLAMBAT',        |
|                       'SAKIT','IZIN','ALPHA')               |
| is_manual_edit : BOOLEAN (DEFAULT FALSE)                    |
| notes          : VARCHAR(255) (NULLABLE)                    |
| CONSTRAINT uq_session_student UNIQUE(session_id, student_id)|
+-------------------------------------------------------------+
                               ^
                               | 1:N
+------------------------------+------------------------------+
|                        students                             |
+-------------------------------------------------------------+
| id             : UUID (PK)                                  |
| nisn           : VARCHAR(20) (UNIQUE)                       |
| full_name      : VARCHAR(100)                               |
| class_id       : UUID (FK -> classes.id)                    |
| qr_code_token  : VARCHAR(64) (UNIQUE, INDEXED)             |
| gender         : ENUM('L', 'P')                             |
| is_active      : BOOLEAN (DEFAULT TRUE)                     |
+-------------------------------------------------------------+
                               ^
                               | N:1
+------------------------------+------------------------------+
|                        classes                              |
+-------------------------------------------------------------+
| id             : UUID (PK)                                  |
| name           : VARCHAR(50) (Contoh: "X IPA 1")            |
| academic_year  : VARCHAR(10) (Contoh: "2026/2027")          |
+-------------------------------------------------------------+
```

---

## 8. Edge Cases dan Failure States

| Skenario Kegagalan | Penyebab | Solusi & Penanganan Sistem |
|---|---|---|
| **Kartu QR Rusak / Tertinggal** | Fisik kartu kotor, basah, atau siswa lupa membawa. | Guru menggunakan fitur **"Cari & Absen Manual"** di samping pemindai kamera (ketik nama siswa $\rightarrow$ pilih status Hadir/Izin). |
| **Siswa Melakukan Double Scan** | Siswa menempelkan kartu lebih dari sekali dalam beberapa detik. | Sistem menerapkan **debounce 2 detik** di frontend dan database menolak lewat *Unique Constraint* `(session_id, student_id)`. Muncul dialog info ringan: *"Siswa [Nama] sudah tercatat!"*. |
| **Siswa Pindah Kelas / Salah Masuk** | Kartu siswa kelas lain di-scan di sesi kelas yang tidak sesuai. | Sistem memeriksa relasi `students.class_id == class_sessions.class_id`. Jika tidak cocok, tolak dan beri audio buzzer merah: *"Bukan siswa kelas ini"*. |
| **Koneksi Internet Kelas Drop** | WiFi sekolah mati saat sesi presensi sedang berjalan. | Next.js menyimpan log antrean scan di browser LocalStorage/IndexedDB. Begitu koneksi aktif kembali sebelum kelas ditutup, tombol sinkronisasi otomatis mengirim data ke Go backend. |
| **Guru Lupa Menekan "Tutup Kelas"** | Guru buru-buru keluar kelas setelah jam mengajar usai. | Worker latar belakang di Go backend secara otomatis menjalankan proses auto-close jika sesi `OPEN` sudah melewati 3 jam sejak `opened_at`. |
| **Data Excel Rusak / Tidak Sesuai Header** | Admin salah format kolom saat upload. | Go backend melakukan pre-validation terhadap seluruh nama header dan tipe data. Jika 1 baris salah, transaksi dibatalkan (*atomic rollback*) dan nomor baris penyebab ditampilkan ke user. |

---

## 9. Success Metrics

1. **Efisiensi Waktu:** Total durasi presensi per sesi kelas $\le 2$ menit untuk 36 siswa (pemangkasan waktu $>80\%$ dibanding manual).
2. **Scan Latency:** Respons pemindaian QR code dari frontend ke backend Go $\le 300$ ms.
3. **Integritas Data:** 0% kasus duplikasi presensi (*zero duplicate records*) dalam database.
4. **Keberhasilan Onboarding:** Import massal 20 guru dan seluruh siswa selesai tanpa kendala dalam $< 5$ menit oleh Super Admin.
5. **Kepatuhan Sistem:** 100% sesi kelas ditutup dengan status definitif (`HADIR`, `TERLAMBAT`, `SAKIT`, `IZIN`, atau `ALPHA`).

---

## 10. Pertanyaan Terbuka / Keputusan Lanjutan (Untuk Iterasi Berikutnya)

1. **Pemberian Dispensasi Guru (Override Late Policy):**
   * Saat ini, setelah 15 menit siswa otomatis menjadi `ALPHA`. Apakah guru diizinkan mengubah status `ALPHA` menjadi `HADIR` biasa jika ada alasan kuat, atau sistem mewajibkannya masuk ke status `TERLAMBAT`?
2. **Spesifikasi Fisik Cetak Kartu:**
   * Apakah sekolah sudah memiliki printer kartu PVC standar ID Card, atau kartu QR akan dicetak di atas kertas foto/stiker A4 lalu dilaminasi manual?
