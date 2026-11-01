# DESIGN BRIEF — Sistem Presensi QR Code Siswa
**Versi:** 2.0 (Revisi "Biasa Saja" — untuk Antigravity)
**Dasar Acuan:** PRD.md v1.2, menggantikan design brief v1 sebelumnya
**Target Pengguna:** 1 Admin, 30 Guru, Siswa
**Tech Stack:** Go (REST API) + Next.js

---

## 0. Kenapa Dokumen Ini Ada

Hasil desain sebelumnya untuk website absensi ini terasa "dibuat AI": badge sukses/gagal pakai glow shadow warna-warni, modal pakai efek kaca buram (backdrop blur), overlay kamera scanner punya sudut bercahaya yang berdenyut terus-menerus, ada campuran badge gelap-neon di tengah tema terang, dan tipografi memakai tiga keluarga font sekaligus. Semuanya terlihat "keren" tapi tidak cocok untuk software administrasi sekolah yang dipakai guru setiap hari di kelas.

Dokumen ini menggantikan seluruh arahan visual sebelumnya. **Aturan untuk Antigravity: kalau ada dua opsi implementasi dan salah satunya terlihat lebih "wah"/dekoratif, selalu pilih opsi yang lebih polos.** Struktur layar dan alur fungsional dari PRD tidak berubah — yang berubah adalah bagaimana semuanya divisualisasikan.

---

## 1. Prinsip Desain (Wajib)

1. **Keterbacaan jarak 2 meter** — status scan, foto/nama siswa yang baru discan, dan sisa waktu 15 menit wajib berukuran besar dan kontras tinggi. Ini kebutuhan fungsional, bukan alasan untuk mendekorasi.
2. **Feedback instan (<150ms)** — setiap scan wajib memicu perubahan visual + audio seketika. Bentuknya perubahan warna solid biasa, bukan animasi atau efek menyala.
3. **Proteksi aksi permanen** — "Tutup Kelas", "Rollback Import Excel", dan aksi destruktif lain wajib modal konfirmasi berisi ringkasan dampak.
4. **Kesan biasa, bukan hasil AI** — target rasanya adalah software administrasi sekolah yang memang sudah ada (mirip Dapodik, SIAKAD, atau ERP back-office instansi), datar dan fungsional, bukan landing page produk atau demo AI.

---

## 2. Larangan Eksplisit (Anti Kesan "Dibuat AI")

Jangan dipakai dalam kondisi apa pun, di layar mana pun:

| Dilarang | Ganti Dengan |
|---|---|
| Gradient warna (tombol, background, teks) | Warna solid flat |
| Background utama gelap/hitam (dashboard, login, layar mana pun) | Background terang sesuai `--bg-app`/`--bg-surface` — tema terang konsisten di semua layar |
| Shadow berwarna/glow (`shadow-glow-success`, dsb.) | Perubahan warna border/background solid |
| Backdrop blur / efek kaca pada modal | Overlay gelap solid semi-transparan |
| Animasi dekoratif yang jalan sendiri (pulsing, breathing, sudut kamera berdenyut) | Diam secara default; animasi hanya boleh merespons aksi nyata dan selesai <200ms |
| Badge status gelap/neon (bg gelap + teks menyala) | Badge pastel terang saja (lihat Bagian 4) |
| Label ALL CAPS untuk teks kecil/eyebrow | Sentence case biasa |
| Teks tombol berakhiran panah ("Buka Kelas →") | Kalimat aksi biasa ("Buka Kelas") |
| Lebih dari satu warna aksen di luar biru primer + warna status semantik | Satu warna aksen saja |
| Font monospace khusus untuk NISN/jam/token | Font UI yang sama + `font-variant-numeric: tabular-nums` |
| Ikon dekoratif yang tidak menambah makna | Ikon hanya dipakai kalau fungsional (mis. centang = hadir) |
| Icon library eksternal (Lucide, Heroicons, Font Awesome, dll.) | Pakai ikon dari folder `public/icon` (aset lokal proyek) — kalau ikon yang dibutuhkan belum tersedia di situ, pakai teks/label biasa dulu, jangan pasang library baru |
| Hover/transition seragam di semua kartu (lift, scale, shadow membesar) | Hover cukup ubah warna background sedikit, atau tanpa hover sama sekali |

---

## 3. Arah Visual

* **Referensi:** dashboard admin instansi/sekolah yang sudah biasa dipakai sehari-hari (Dapodik, SIAKAD, ERP back-office) — bukan Linear, Vercel, atau produk SaaS modern.
* **Karakter:** datar, padat informasi seperti tabel data instansi, minim dekorasi, mudah dibaca cepat oleh staf tata usaha maupun guru yang terburu-buru masuk kelas.
* **Kartu:** border 1px solid, tanpa shadow. Shadow hanya dipakai untuk modal (satu token abu-abu netral, tidak berwarna).
* **Layout:** padat dan fungsional, bukan layout lega bergaya halaman marketing.

---

## 4. Design Tokens

### A. Warna
Palet neutral dan warna status semantik dari draf sebelumnya tetap dipakai (sudah cukup polos, tidak diubah). Yang **dihapus**: seluruh token glow dan varian badge gelap/neon.

```css
/* Base Neutral */
--bg-app            : #F8FAFC;
--bg-surface        : #FFFFFF;
--bg-surface-hover  : #F1F5F9;
--border-subtle     : #E2E8F0;
--border-strong     : #CBD5E1;

--text-primary      : #0F172A;
--text-secondary    : #64748B;
--text-muted        : #94A3B8;

/* Aksen tunggal */
--primary-500       : #2563EB;
--primary-600       : #1D4ED8;
--primary-focus     : rgba(37, 99, 235, 0.20);

/* Status kehadiran — pastel terang saja */
--status-hadir-bg      : #ECFDF5; --status-hadir-border      : #A7F3D0; --status-hadir-fg      : #047857;
--status-terlambat-bg  : #FFFBEB; --status-terlambat-border  : #FDE68A; --status-terlambat-fg  : #B45309;
--status-alpha-bg      : #FFF1F2; --status-alpha-border      : #FECDD3; --status-alpha-fg      : #BE123C;
--status-sakit-bg      : #F0F9FF; --status-sakit-border      : #BAE6FD; --status-sakit-fg      : #0369A1;
--status-izin-bg       : #EEF2FF; --status-izin-border       : #C7D2FE; --status-izin-fg       : #4338CA;

/* Shadow — hanya untuk modal, satu token, tidak berwarna */
--shadow-modal : 0 4px 12px rgba(15, 23, 42, 0.12);
```

### B. Tipografi
Satu keluarga font untuk seluruh antarmuka: **Inter**, atau kalau ingin lebih polos lagi pakai font sistem (`-apple-system, "Segoe UI", Roboto, Arial, sans-serif`). Tidak ada font kedua atau ketiga.

| Token | Ukuran | Weight | Penggunaan |
|---|---|---|---|
| `text-display` | 40px | 700 | Jam digital live & nama siswa saat discan (besar karena kebutuhan jarak baca, bukan gaya) |
| `text-h1` | 24px | 600 | Judul halaman |
| `text-h2` | 18px | 600 | Judul kartu / section |
| `text-body` | 14px | 400 | Isi tabel, teks instruksi |
| `text-caption` | 12px | 500 | Label status, timestamp (sentence case, bukan ALL CAPS) |

Angka yang butuh sejajar rapi (jam, NISN, countdown 15 menit) cukup diberi `font-variant-numeric: tabular-nums` pada font yang sama — tidak perlu keluarga font terpisah.

### C. Spacing & Radius
* Grid 4px: `4 / 8 / 12 / 16 / 24 / 32px`.
* Radius disederhanakan jadi 2 level: `6px` (input, badge, tombol), `10px` (kartu, modal).

---

## 5. Pola Feedback Scan

* **Scan berhasil:** border kotak viewfinder berubah warna solid `--status-hadir-border` selama ±600ms lalu kembali normal, dibarengi bunyi beep singkat.
* **Scan gagal:** border berubah solid `--status-alpha-border` + buzzer.
* Tidak ada glow, tidak ada shadow menyala, tidak ada efek partikel/confetti.
* Kotak "Hasil Scan Terakhir" (foto + nama + status) cukup kotak putih berbatas 1px tanpa efek tambahan apa pun.

---

## 6. Screen Inventory

| Kode | Nama Screen | Role | Tujuan Utama |
|---|---|---|---|
| SCR-01 | Login | Semua Role | Autentikasi username/NIP + password |
| SCR-02 | Master Data Siswa | Admin | CRUD siswa, filter kelas, unduh kartu QR, import Excel |
| SCR-03 | Master Akun Guru | Admin | Kelola 30 akun guru |
| SCR-04 | Modal Bulk Import Excel | Admin | Upload, unduh template Excel, validasi baris, preview import |
| SCR-05 | Dashboard Kelas & Jadwal | Guru | Daftar kelas diampu, riwayat sesi, "Buka Sesi Baru" |
| SCR-06 | Active Class Session & Scanner | Guru | Layar utama presensi — hero screen |
| SCR-07 | Modal Manual Attendance Override | Guru | Ubah status manual (Sakit/Izin/Terlambat) |
| SCR-08 | Monitoring Dashboard | Admin | Pantau kelas yang sedang `OPEN` |
| SCR-09 | Rekapitulasi & Export Report | Admin | Filter (mencakup tingkat 7, 8, dan 9) & unduh laporan `.xlsx` |
| SCR-10 | Cetak Kartu Siswa | Admin | Print layout grid kartu QR (A4 / ID-1) |

---

## 7. Layout SCR-06 (Core Hero Screen)

Split-screen 45:55 — kiri area scanner, kanan roster kelas. Struktur sama seperti draf sebelumnya, hanya elemen visualnya yang didatarkan (tanpa sudut bercahaya, tanpa glow):

```
+-------------------------------------------------------------------------------------------+
|  SMP NEGERI 1 KOTA | Kelas: 7A | Mapel: Matematika | Guru: Budi Santoso, S.Pd                 |
|  Status: SESI TERBUKA   Sisa Waktu Hadir: 08:45 (dari 15 menit)     [ Tutup Kelas ]         |
+---------------------------------------------------+---------------------------------------+
| KIRI (45%) — SCANNER                               | KANAN (55%) — ROSTER                  |
|                                                     |                                       |
|  +-----------------------------------------------+  | Total: 36 | Hadir: 28 | Sisa: 8       |
|  | Bingkai kamera statis, border tipis            |  | [Cari siswa...]  [Filter: Semua]      |
|  | Status: "Menunggu Kartu QR..."                 |  |                                       |
|  +-----------------------------------------------+  | 1. Ahmad Fauzi     07:05  HADIR       |
|                                                     | 2. Bella Safitri   07:06  HADIR       |
|  +-----------------------------------------------+  | 3. Dimas Arya      07:07  HADIR       |
|  | Hasil Scan Terakhir (kotak besar, border 1px)  |  | 4. Fajar Pratama   --     PENDING [...] |
|  | Foto | MUHAMMAD RIZKY PRATAMA                  |  | ...                                   |
|  |      | NISN 0071289311 | 7A                     |  | (roster scroll)                       |
|  |      | HADIR — 07:04:12 WIB                    |  |                                       |
|  +-----------------------------------------------+  |                                       |
+-----------------------------------------------------+---------------------------------------+
```

---

## 8. Component Library

* **Button** — varian `primary` (biru solid), `danger` (merah solid), `secondary` (outline), `ghost` (teks saja). Tidak ada gradient di varian mana pun. State: default, hover (warna sedikit lebih gelap), focus (ring biru), loading (spinner), disabled (`opacity-40`).
* **AttendanceBadge** — hanya versi pastel dari Bagian 4A (HADIR/TERLAMBAT/ALPHA/SAKIT/IZIN/PENDING). Tidak ada varian gelap/neon.
* **ViewfinderScanner** — bingkai kamera statis (garis solid atau putus-putus tipis), label status teks biasa yang berubah sesuai state. Toggle dropdown: "Webcam" / "Scanner USB". Tanpa animasi berdenyut.
* **ModalDialog** — overlay solid `rgba(15,23,42,0.4)`, panel putih dengan `--shadow-modal`, tanpa `backdrop-filter`. Slot: Header, Body, Footer Actions. Wajib trap keyboard `Tab` dan `Escape` untuk menutup.
* **Ikon** — semua ikon diambil dari folder `public/icon` (aset lokal proyek), bukan dari icon library pihak ketiga.
* **ImportExcelDropzone** — dropzone upload `.xlsx` dilengkapi tombol/link "Unduh Template Excel" di bagian atas (mengunduh file template kosong berisi kolom yang benar untuk siswa/guru), diikuti area drag-and-drop, hasil validasi, dan tabel error per baris.
* **FilterLaporan (SCR-09)** — filter tingkat mencakup 7, 8, dan 9; bisa difilter per tingkat (semua kelas dalam satu tingkat) atau per kelas spesifik (mis. 7A, 8B, 9C).

---

## 9. State Matrix

| Screen | Empty | Loading | Error | Success | Offline |
|---|---|---|---|---|---|
| SCR-06 Scanner | "0 Siswa Hadir. Minta siswa scan kartu." | Skeleton abu-abu + teks "Menghubungkan kamera..." | Kamera ditolak: tombol "Izinkan Akses Kamera" / "Ganti ke Mode USB" | Border hijau solid + beep + nama muncul | Banner solid kuning: "Mode offline aktif, scan tersimpan lokal" |
| SCR-04 Import Excel | Dropzone kosong + tombol "Unduh Template Excel" di atasnya: "Tarik file .xlsx atau klik untuk browse" | Progress bar 0–100%: "Memverifikasi data..." | Tabel error merah: "Baris 12 kolom NISN kosong" | "120 siswa siap diimpor" + tombol submit aktif | Tombol upload nonaktif: "Perlu koneksi internet" |

---

## 10. Responsive Behaviour

* **Desktop/Laptop guru (1280–1920px)** — target utama, split-screen 45:55 penuh, tanpa scroll body.
* **Tablet (768–1024px)** — susun vertikal: viewfinder + hasil scan sticky di atas, roster scroll di bawah.
* **Smartphone (<768px)** — untuk cek cepat admin/guru; mode kamera beralih ke kamera belakang dengan tombol trigger sentuh.

---

## 11. Accessibility

1. Kontras teks utama `#0F172A` di atas `#FFFFFF` (tema terang, konsisten di seluruh layar — tidak ada campuran tema gelap).
2. Badge status memiliki kontras teks-terhadap-background minimal 4.5:1 (AA) di atas warna pastel masing-masing.
3. Di SCR-06, fokus keyboard bisa ditangkap oleh listener scanner global sehingga input USB langsung terproses tanpa perlu klik ke input tertentu.
4. Viewfinder pakai `aria-live="polite"` untuk mengumumkan nama siswa yang baru discan. Timer pakai `role="timer"`. Banner offline/error pakai `role="alert"`.

---

## 12. Checklist Sebelum Selesai (untuk Antigravity)

Sebelum satu layar dianggap selesai, periksa satu per satu:

- [ ] Tidak ada gradient di mana pun
- [ ] Tidak ada shadow berwarna/glow
- [ ] Tidak ada `backdrop-filter: blur()`
- [ ] Tidak ada animasi yang jalan sendiri tanpa aksi user
- [ ] Semua badge status pakai versi pastel, bukan gelap/neon
- [ ] Hanya satu keluarga font dipakai di seluruh halaman
- [ ] Tidak ada label ALL CAPS atau tombol berakhiran "→"
- [ ] Kartu pakai border, bukan shadow (kecuali modal)

Kalau ada satu poin saja yang gagal, sederhanakan lagi. Tujuan akhirnya: UI yang terasa dibuat untuk kebutuhan administrasi sekolah sehari-hari, bukan hasil generate cepat yang "terlalu didesain".
