# FULL UI & UX DESIGN BRIEF
# Sistem Presensi QR Code Sekolah (Next.js + Go)

**Role:** Senior Product Designer  
**Dasar Acuan:** [PRD.md](file:///c:/Kuliah/Kebutuhan%20Kerja/Kerja/absen_sekolah/PRD.md) v1.1  
**Target Pengguna:** 1 Super Admin, 10 Admin Monitoring, 20 Guru, dan Siswa  
**Konteks Lingkungan:** Ruang kelas dengan pencahayaan bervariasi, layar proyektor / laptop guru jarak pandang 1–2 meter, dan meja tata usaha.

---

## 1. Design Principles (3 Aturan Wajib)

1. **High-Legibility at 2-Meter Distance (Keterbacaan Jarak Jauh)**
   * Antarmuka scanner kelas harus dapat dibaca jelas oleh guru dan siswa dari jarak 1.5–2 meter (saat laptop ditaruh di meja guru dan siswa berdiri di depannya).
   * Elemen status scan, foto/nama siswa yang baru saja diabsen, dan sisa waktu 15 menit wajib berukuran *display/jumbo* dengan kontras tinggi.
2. **Sub-Second Zero-Friction Feedback (Umpan Balik Instan)**
   * Pemindaian tidak boleh membuat guru menebak apakah kartu QR terbaca atau tidak.
   * Setiap *event* pemindaian wajib memicu feedback multi-sensori secara instan (< 150ms): visual (border kilat hijau/merah), audio (chime nada tinggi untuk sukses, double-thud nada rendah untuk gagal), dan teks konfirmasi nama.
3. **Fail-Safe Task Execution (Perlindungan Aksi Kritis)**
   * Aksi destruktif atau pengubah status permanen (seperti "Tutup Kelas", "Kunci 15 Menit", atau "Import Excel Rollback") harus memiliki konfirmasi modal eksplisit dengan ringkasan dampak (*summary count*) sebelum dieksekusi.

---

## 2. Visual Direction

* **Mood & Karakter:**
  * *Utilitarian, Crisp, Authoritative, & Modern Academic.*
  * Bukan nuansa "aplikasi SaaS startup mainan" dengan gradien ungu neon generik, melainkan sistem operasional sekolah yang kokoh, bersih, profesional, dan minim distraksi visual.
* **Referensi Estetika:**
  * Mengadopsi arsitektur visual dashboard industrial modern (seperti Linear & Vercel Dashboard) yang dipadukan dengan tipografi tabular data institusi pendidikan terkemuka.
* **Hal yang Dihindari:**
  * Hindari gradien ungu/pink pastel generik (*AI generic templates*).
  * Hindari font serif ornamen atau font dekoratif yang lambat dipindai mata.
  * Hindari animasi transisi lambat (> 200ms) pada area scanner kasir/meja guru karena akan menghambat ritme barisan siswa.
  * Hindari elemen dekoratif tanpa fungsi (*visual clutter*) di layar pemindaian aktif.

---

## 3. Design Tokens

### A. Palet Warna & Hex Code (Crisp Modern Light Theme)
Sistem warna menggunakan nuansa Slate Light bernilai estetika tinggi, kartu putih bersih dengan batas halus, serta warna status semantik berkontras tinggi (*WCAG AAA standard*).

```css
/* Base Neutrals (Light Slate Architecture) */
--bg-app            : #F8FAFC; /* Crisp slate-50 canvas */
--bg-surface        : #FFFFFF; /* Pure elevated white card & container */
--bg-surface-hover  : #F1F5F9; /* Slate-100 hover row */
--border-subtle     : #E2E8F0; /* Slate-200 boundary border */
--border-strong     : #CBD5E1; /* Slate-300 input border */

/* Text Neutrals */
--text-primary      : #0F172A; /* Slate-900 high contrast readable text */
--text-secondary    : #64748B; /* Slate-500 metadata & labels */
--text-muted        : #94A3B8; /* Slate-400 placeholder & disabled */

/* Brand & Interactive (Academic Royal Cobalt Blue) */
--primary-500       : #2563EB; /* Tombol utama & active state */
--primary-600       : #1D4ED8; /* Hover tombol utama */
--primary-focus     : rgba(37, 99, 235, 0.20); /* Focus ring */

/* Semantic Attendance Status (Light Tinted Chips) */
--status-hadir-bg   : #ECFDF5; /* Emerald-50 */
--status-hadir-border: #A7F3D0; /* Emerald-200 */
--status-hadir-fg   : #047857; /* Emerald-700 */

--status-terlambat-bg: #FFFBEB; /* Amber-50 */
--status-terlambat-border: #FDE68A; /* Amber-200 */
--status-terlambat-fg: #B45309; /* Amber-700 */

--status-alpha-bg   : #FFF1F2; /* Rose-50 */
--status-alpha-border: #FECDD3; /* Rose-200 */
--status-alpha-fg   : #BE123C; /* Rose-700 */

--status-sakit-bg   : #F0F9FF; /* Sky-50 */
--status-sakit-border: #BAE6FD; /* Sky-200 */
--status-sakit-fg   : #0369A1; /* Sky-700 */

--status-izin-bg    : #EEF2FF; /* Indigo-50 */
--status-izin-border: #C7D2FE; /* Indigo-200 */
--status-izin-fg    : #4338CA; /* Indigo-700 */
```

> **Alasan Pemilihan Tema Terang (*Light Theme*):**
> Tema *Clean Light* memberikan keterbacaan jernih dan nyaman untuk lingkungan administrasi sekolah, mudah dicetak (*print-friendly*), serta memberikan kesan institusi pendidikan yang modern, bersih, dan profesional.

---

### B. Tipografi
* **Font Family:** `Plus Jakarta Sans` (Display & UI Header) + `Inter` (Data Table & Form) + `JetBrains Mono` (NISN, Token QR, Jam Digital).
* **Alasan:** `Plus Jakarta Sans` memberikan kesan modern dan tegas untuk antarmuka publik/pendidikan; `JetBrains Mono` memastikan angka jam dan NISN tidak bergeser (*zero jitter*) saat timer berjalan detik demi detik.

| Token | Ukuran | Weight | Line Height | Penggunaan |
|---|---|---|---|---|
| `text-display` | 48px | 800 (ExtraBold) | 1.1 | Jam digital live & Nama siswa saat di-scan |
| `text-h1` | 30px | 700 (Bold) | 1.25 | Judul halaman utama & modal |
| `text-h2` | 24px | 600 (SemiBold) | 1.3 | Judul sesi & kartu statistik |
| `text-h3` | 18px | 600 (SemiBold) | 1.4 | Section header & nama kelas |
| `text-body` | 14px | 400/500 | 1.5 | Teks tabel, body instruksi |
| `text-caption`| 12px | 500 (Medium) | 1.4 | Label status, timestamp, breadcrumb |
| `text-mono` | 13px | 600 | 1.0 | Angka NISN, QR token, Countdown 15 Menit |

---

### C. Spacing Scale & Radius

* **Spacing Grid (Base 4px):**
  * `space-1` (4px), `space-2` (8px), `space-3` (12px), `space-4` (16px), `space-6` (24px), `space-8` (32px), `space-12` (48px).
* **Corner Radius:**
  * `radius-sm` (6px): Badge status & chip.
  * `radius-md` (8px): Input text, tombol, dropdown.
  * `radius-lg` (12px): Kartu, kontainer webcam scanner.
  * `radius-xl` (16px): Modal dialog, drawer.
* **Shadow System:**
  * `shadow-card`: `0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4)`
  * `shadow-glow-success`: `0 0 24px rgba(52, 211, 153, 0.35)`
  * `shadow-glow-error`: `0 0 24px rgba(248, 113, 113, 0.4)`

---

## 4. Screen Inventory

| Kode | Nama Screen | Role Akses | Tujuan Utama |
|---|---|---|---|
| **SCR-01** | Login Page | Semua Role | Autentikasi user via username/NIP dan password. |
| **SCR-02** | Super Admin: Master Data Siswa | Super Admin | CRUD siswa, filter kelas, unduh kartu QR, buka modal import Excel. |
| **SCR-03** | Super Admin: Master Akun Guru | Super Admin | Kelola 20 akun guru (tambah, reset password, nonaktifkan). |
| **SCR-04** | Super Admin: Modal Bulk Import Excel | Super Admin | Drag-and-drop file Excel siswa/guru, validasi baris, dan preview import. |
| **SCR-05** | Guru: Dashboard Kelas & Jadwal | Guru | Daftar kelas yang diampu guru, riwayat sesi lampau, tombol "Buka Sesi Baru". |
| **SCR-06** | Guru: Active Class Session & Scanner | Guru | Layar utama presensi (Webcam + USB listener), timer 15 menit, live roster kehadiran, tombol "Tutup Kelas". |
| **SCR-07** | Guru: Modal Manual Attendance Override | Guru | Mengubah status siswa secara manual (Sakit, Izin, Terlambat) beserta catatan. |
| **SCR-08** | Admin: Monitoring Dashboard | 10 Admin | Pemantauan waktu nyata kelas mana saja yang sedang `OPEN` hari ini. |
| **SCR-09** | Admin: Rekapitulasi & Export Report | 10 Admin + Super Admin | Filter laporan multi-parameter dan unduh file `.xlsx`. |
| **SCR-10** | Cetak Kartu Siswa (Print Layout) | Super Admin | Halaman khusus print CSS (A4 / ID-1 layout) berisi grid kartu QR siswa. |

---

## 5. User Flows

### Flow 1: Guru Membuka Kelas & Memindai Barisan Siswa
```
[Login Guru]
     |
     v
[Pilih Kelas & Mapel] ---> Klik "Buka Kelas"
                                |
                                v
                   [Screen Scanner Aktif (SCR-06)]
                   - Kamera otomatis menyala
                   - Timer 15 Menit mulai menghitung mundur
                                |
        +-----------------------+-----------------------+
        |                                               |
  (Siswa Scan QR)                               (Siswa Scan QR)
  Waktu <= 15 Menit                              Waktu > 15 Menit
        |                                               |
        v                                               v
  [Beep Positif (Hijau)]                         [Buzzer Peringatan (Kuning)]
  Status: HADIR                                  Status: TERLAMBAT
  Roster ter-update otomatis                     (Perlu persetujuan guru)
        |                                               |
        +-----------------------+-----------------------+
                                |
                  (Jam Pelajaran Selesai)
                                |
                                v
                     Klik "Tutup Kelas"
                                |
                   Modal Konfirmasi Ringkasan:
             [32 Hadir | 2 Terlambat | 2 Alpha]
                                |
                                v
                     [Sesi Ditutup Permanen]
```

---

### Flow 2: Super Admin Melakukan Bulk Import Excel Siswa
```
[Login Super Admin] ---> [Menu Siswa (SCR-02)] ---> [Klik "Import Excel"]
                                                          |
                                                          v
                                               [Upload Box .xlsx]
                                                          |
                                                          v
                                              (Backend Pre-validasi)
                                               - Cek header
                                               - Cek duplikasi NISN
                                                          |
                      +-----------------------------------+-------------------+
                      |                                                       |
                 (Ada Error)                                             (Valid 100%)
                      |                                                       |
                      v                                                       v
            Tampilkan Tabel Error                                 Tampilkan Preview Ringkasan:
          (Baris 14: NISN Duplikat)                              - 120 Siswa Terdeteksi
                      |                                          - 4 Rombel Kelas
         [Batalkan & Upload Ulang]                                            |
                                                                              v
                                                                 Klik "Proses Import Sekarang"
                                                                              |
                                                                              v
                                                                 Siswa Tersimpan + Token QR Auto-Generated
```

---

## 6. Layout per Screen

### SCR-06: Guru - Active Class Session & Scanner (Core Hero Screen)
Layout dirancang dengan sistem split-screen asimetris 45:55 yang dioptimalkan untuk meja guru.

```
+---------------------------------------------------------------------------------------------------+
|  [Header] SMKN 1 KOTA | Kelas: X-RPL-1 | Mapel: Pemrograman Web | Guru: Budi Santoso, S.Kom       |
|  Status: [● SESI TERBUKA]   Timer Batas Hadir: [ 08:45 ] (Sisa 15 Menit)    [TUTUP KELAS (Merah)] |
+-----------------------------------------------------------------+---------------------------------+
| SECTION KIRI (45% - THE SCANNER PORTAL)                         | SECTION KANAN (55% - ROSTER)    |
|                                                                 |                                 |
|  +-----------------------------------------------------------+  | Ringkasan:                      |
|  | [Webcam Viewfinder / USB Standby Area]                    |  | Total: 36 | Hadir: 28 | Sisa: 8 |
|  | (Frame visual dengan sudut bidik QR bercahaya)            |  |                                 |
|  |                                                           |  | [Search Siswa...] [Filter: All] |
|  | Status: Menunggu Kartu QR... (Kamera / USB Siap)          |  |                                 |
|  +-----------------------------------------------------------+  | Daftar Siswa:                   |
|                                                                 | 1. Ahmad Fauzi      [07:05 HADIR] |
|  +-----------------------------------------------------------+  | 2. Bella Safitri    [07:06 HADIR] |
|  | LAST SCANNED RESULT (KOTAK JUMBO 160px)                   |  | 3. Dimas Arya       [07:07 HADIR] |
|  | [Foto Siswa]  MUHAMMAD RIZKY PRATAMA                      |  | 4. Fajar Pratama    [-- PENDING] |
|  |               NISN: 0071289311  | Kelas: X-RPL-1          |  |    -> Tombol [...] (Ubah Manual)|
|  |               STATUS: [ HADIR - 07:04:12 WIB ]            |  | ...                             |
|  +-----------------------------------------------------------+  | (Scrollable roster container)   |
+-----------------------------------------------------------------+---------------------------------+
```

* **Hierarki Visual:**
  1. *Primary Action*: Tombol "Tutup Kelas" di pojok kanan atas (warna merah mencolok dengan proteksi konfirmasi).
  2. *Focus Center*: Viewfinder kamera & Banner jumbo hasil scan terakhir.
  3. *Secondary Action*: Tombol titik tiga `[...]` pada setiap baris siswa untuk manual override (Izin/Sakit).

---

## 7. Component Library (Reusable Components)

### 1. `Button`
* **Variants:**
  * `primary` (Solid blue `#2563EB`) $\rightarrow$ aksi konfirmasi, Buka Kelas, Download.
  * `danger` (Solid red `#DC2626`) $\rightarrow$ Tutup Kelas, Hapus Siswa.
  * `secondary` (Outlined `#374151`) $\rightarrow$ Filter, Cancel, Tutup Modal.
  * `ghost` $\rightarrow$ Tombol icon `[...]` dan toggle kamera.
* **States:** Default, Hover, Focused, Loading (spinner svg), Disabled (`opacity-40`).

### 2. `AttendanceBadge`
* **Variants:**
  * `HADIR`: Background `#064E3B`, Text `#34D399`, Icon Centang.
  * `TERLAMBAT`: Background `#78350F`, Text `#FBBF24`, Icon Jam Kuning.
  * `ALPHA`: Background `#7F1D1D`, Text `#F87171`, Icon Silang Merah.
  * `IZIN / SAKIT`: Background `#1E3A5F`, Text `#38BDF8`, Icon Dokumen Biru.
  * `PENDING`: Background `#1F2937`, Text `#9CA3AF`, Icon Titik Tiga Abu.

### 3. `ViewfinderScanner`
* Wadah webcam interaktif dengan overlay 4 sudut (*corner brackets*) animasi pulsa saat memindai.
* Mendukung toggle dropdown: "Gunakan Webcam Depan" / "Gunakan Kamera Belakang" / "Mode USB Scanner Saja (Hemat CPU)".

### 4. `ModalDialog`
* Komponen modal berbasis backdrop blur (`backdrop-filter: blur(8px)`).
* Memiliki slot: Header, Body, Footer Actions. Wajib trap keyboard `Tab` dan tombol `Escape` untuk menutup.

---

## 8. State Matrix untuk Halaman Kunci

| Screen | Empty State | Loading State | Error State | Success State | Offline State |
|---|---|---|---|---|---|
| **SCR-06: Active Scanner** | Sesi baru dibuka: "0 Siswa Hadir. Silakan minta siswa scan kartu." | Inisialisasi modul kamera: Skeleton kotak abu-abu + spinner teks "Menghubungkan kamera..." | Kamera tidak diizinkan / ditolak browser: Tampilkan tombol "Izinkan Akses Kamera" atau "Ganti ke Mode Scanner USB". | Scan valid: Border hijau menyala, suara beep pendek, nama siswa muncul. | Koneksi terputus: Banner kuning melayang di atas: "Mode Offline Aktif. Scan tetap disimpan di memori lokal." |
| **SCR-04: Import Excel** | Area dropzone kosong dengan ikon spreadsheet: "Tarik file .xlsx ke sini atau Klik untuk browse." | "Memverifikasi integritas data file Excel..." (Progress bar 0-100%). | "Gagal memproses file. Baris 12 kolom NISN kosong." (Tabel ringkasan merah). | "Validasi sukses! 120 siswa siap diimpor." Tombol submit berubah biru menyala. | Disable tombol upload: "Koneksi internet diperlukan untuk mengimpor data." |

---

## 9. Responsive Behaviour

* **Desktop / Laptop Guru (1280px - 1920px) — Target Utama:**
  * Layout split-screen 45:55 penuh.
  * Seluruh kontrol terlihat dalam 1 viewport tanpa kebutuhan scrolling window utama (zero body scroll).
* **Tablet (768px - 1024px):**
  * Layout berubah menjadi single column bertumpuk:
    * Bagian atas: Viewfinder scanner & hasil scan kartu terakhir (sticky).
    * Bagian bawah: Tab daftar siswa hadir dan belum hadir yang dapat di-scroll vertikal.
* **Smartphone (< 768px) — Mobile View Admin & Guru Check:**
  * Digunakan untuk monitoring kilat oleh 10 staf admin atau guru saat memeriksa riwayat.
  * Pada layar mobile, mode scanner kamera dialihkan ke mode kamera belakang dengan tombol trigger sentuh agar tidak membebani baterai.

---

## 10. Accessibility (A11y Standards)

1. **Rasio Kontras (WCAG 2.1 Level AAA):**
   * Teks putih `#F9FAFB` di atas surface `#111827` menghasilkan kontras rasio **14.2:1** (jauh melampaui batas minimum AAA 7:1).
   * Badge teks status memiliki rasio kontras minimal 4.8:1 di atas background gelap masing-masing.
2. **Focus Order & Keyboard Navigation:**
   * Di layar scanner (SCR-06), fokus keyboard secara bawaan ditangkap oleh *global scanner listener* sehingga input barcode USB langsung terproses tanpa memerlukan fokus visual pada elemen input tertentu.
   * Tombol modal dan aksi darurat mendukung navigasi penuh dengan tombol `Tab`, `Shift+Tab`, `Space`, dan `Enter`.
3. **Kebutuhan ARIA:**
   * Viewfinder kamera dilengkapi `aria-live="polite"` untuk mengumumkan nama siswa yang baru saja terabsen kepada screen reader.
   * Timer 15 menit menggunakan `role="timer"` dengan `aria-atomic="true"`.
   * Banner offline/error menggunakan `role="alert"`.
