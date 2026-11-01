# Prompt Templates — Vibe Coding Workflow
Sumber: @haloziq (TikTok)

---

## 1/ Tulis PRD Lengkap
*Berhenti mulai dengan "buatin aplikasi." Mulai dengan spek yang ditulis bareng AI.*

```
Kamu adalah senior product manager. Saya butuh PRD lengkap untuk produk di bawah ini.

Ide produk: [JELASKAN IDE KAMU]

Sebelum menulis apa pun, tanyakan maksimal 5 pertanyaan klarifikasi soal target user, scope must-have vs nice-to-have, batasan teknis, dan seperti apa "selesai" itu. Tunggu jawaban saya.

Lalu buat PRD dengan bagian berikut:
1. Problem statement — siapa yang dirugikan dan kenapa
2. Target user + 2 persona
3. Goals dan non-goals
4. User stories format "Sebagai... saya ingin... supaya..."
5. Daftar fitur dibagi MVP / v2 / nanti
6. Functional requirement detail per fitur MVP
7. Sketsa data model (entitas + field kunci)
8. Edge case dan failure state
9. Success metrics
10. Open questions

Spesifik dan tegas. Tanpa basa-basi. Kalau ada requirement ambigu, tandai sebagai pertanyaan terbuka, jangan mengarang sendiri.
```

---

## 2/ Full UI & UX Design Brief
*Desain dulu sebelum ngoding. Ini yang bikin aplikasimu nggak keliatan template purple gradient generik.*

```
Kamu adalah senior product designer. Berdasarkan PRD di atas, buatkan design brief lengkap sebelum satu baris kode pun ditulis.

Hasilkan:
1. Design principles — 3 aturan yang wajib dipatuhi UI ini
2. Visual direction — mood, referensi, apa yang dihindari
3. Design tokens — palet warna + hex, skala tipografi, skala spacing, radius, shadow
4. Screen inventory — setiap screen beserta tujuannya
5. User flow — langkah demi langkah tiap journey utama
6. Layout per screen — section, hierarki, primary action, komponen yang dipakai
7. Component library — tiap komponen reusable + variant dan state-nya
8. State — empty, loading, error, success, offline untuk tiap screen kunci
9. Responsive behaviour — mobile, tablet, desktop
10. Accessibility — rasio kontras, focus order, keyboard nav, kebutuhan ARIA

Ambil keputusan yang tegas dan jelaskan alasannya. Hindari default yang generic. Kalau pilih font atau warna, jelaskan kenapa itu cocok untuk produk ini.
```

---

## 3/ Temukan Celah Keamanan
*Step yang paling sering dilewatin. Jalankan sebelum deploy, bukan sesudah.*

```
Berperanlah sebagai application security engineer yang melakukan audit pre-launch pada codebase ini.

Review untuk:
- Kelemahan autentikasi dan session handling
- Celah otorisasi (bisa nggak user A akses data user B?)
- Secret, key, atau token hardcoded; apapun sensitif yang terekspos di client-side
- Risiko injection (SQL, NoSQL, command, XSS)
- API route yang tidak dilindungi atau tidak divalidasi
- Input validation dan sanitization yang hilang
- Rate limiting / proteksi brute force yang hilang
- Insecure direct object reference
- CORS terlalu longgar, security header hilang, cookie flag tidak aman
- Dependency yang sudah diketahui rentan
- Data sensitif yang bocor ke log atau error response

Untuk tiap temuan, berikan:
- Severity: Critical / High / Medium / Low
- File dan baris
- Cara nyatanya dieksploitasi
- Fix kode yang pasti

Lalu urutkan semua temuan berdasarkan severity. JANGAN ubah kode apapun sebelum saya approve. Kalau satu kategori bersih, katakan eksplisit, jangan diam saja.
```

---

## 4/ Debug Error dengan Cepat
*Membunuh death loop "coba ini... eh coba yang ini deh".*

```
Saya ada bug. JANGAN tulis fix dulu.

Error / perilaku yang tidak diharapkan: [TEMPEL ERROR]
Yang saya harapkan: [JELASKAN]
Yang sebenarnya terjadi: [JELASKAN]
Kode relevan: [TEMPEL ATAU TUNJUK FILE]
Yang sudah saya coba: [DAFTAR]

Langkah 1: Restate masalahnya pakai kata-katamu sendiri supaya kita satu pemahaman.
Langkah 2: Daftar 3-5 kemungkinan root cause paling besar, urut berdasarkan probabilitas, tiap poin sertakan alasan.
Langkah 3: Untuk tiap penyebab, kasih satu cara tercepat untuk konfirmasi atau eliminasi — satu log line, satu pengecekan, satu test singkat.
Langkah 4: Berhenti dan tunggu hasil dari saya.
Langkah 5: Setelah penyebabnya terkonfirmasi, baru tulis fix paling minimal, jelaskan kenapa itu berhasil, dan beri tahu persis apa yang harus saya tes untuk verifikasi.

Jangan shotgun perubahan. Jangan refactor kode yang tidak terkait. Jangan benerin hal yang tidak saya minta.
```

---

## 5/ E2E Test Aplikasimu (Playwright)
*Ship tanpa deg-degan.*

```
Setup end-to-end testing untuk aplikasi ini dengan Playwright.

1. Install dan konfigurasi Playwright untuk stack ini. Tambahkan config untuk local + CI, dengan retry, trace saat gagal, dan screenshot.
2. Identifikasi critical user journey dari codebase dan list untuk saya approve DULU sebelum menulis test apapun.
3. Untuk tiap journey yang disetujui, tulis test yang mencakup happy path plus failure state realistis (input salah, session expired, network error, data kosong).
4. Pakai selector yang resilient — utamakan role-based atau data-testid. Tambahkan atribut data-testid yang hilang ke komponen yang perlu.
5. Buat auth fixture supaya test yang sudah login tidak mengulang flow login tiap kali jalan.
6. Tambahkan seeding dan cleanup data test supaya test terisolasi dan bisa diulang.
7. Tambahkan npm script: test:e2e, test:e2e:ui, test:e2e:ci
8. Tambahkan CI workflow yang menjalankan suite di tiap PR.

Jelaskan cara menjalankan semuanya. Tandai journey yang tidak bisa dites secara reliable dan jelaskan kenapa.
```

---

## 6/ Bersihkan & Refactor Dead Code
*Vibecoding ninggalin banyak sampah kode. Codebase yang ramping bikin respons AI ke depannya makin pintar.*

```
Berperanlah sebagai senior engineer yang melakukan cleanup pass di repo ini. Kerjakan dalam dua fase dan berhenti di antaranya.

FASE 1 — AUDIT (jangan ubah apapun):
Temukan dan list, dengan bukti, yang benar-benar tidak terpakai:
- File, komponen, hook, util yang tidak terpakai
- Import, variabel, fungsi, export yang tidak terpakai
- Dependency yang tidak terpakai di package.json
- Env var, route, API endpoint yang tidak terpakai
- Blok kode yang di-comment out
- Logic yang terduplikasi di 2+ tempat
- File yang sudah kebesaran dan sebaiknya dipecah

Sajikan sebagai tabel dengan risk level tiap item yang mau dihapus. Tandai apapun yang confidence-nya di bawah 90% — JANGAN hapus itu. Lalu berhenti dan tunggu.

FASE 2 — EKSEKUSI (hanya setelah saya approve):
- Hapus yang sudah saya approve
- Extract logic terduplikasi ke shared utilities
- Pecah file yang kebesaran sesuai garis tanggung jawab

Aturan: behaviour harus tetap identik, tidak ada dependency baru, tidak ada rename public API. Kasih saya ringkasan tiap perubahan supaya bisa saya review diff-nya.
```

---

## 8/ Ubah Task Jadi Skill
*Yang paling compounding. Kerjain sekali, nggak usah jelasin ulang lagi.*

```
Kita baru saja menyelesaikan satu task bersama. Ubah jadi reusable Skill supaya saya tidak perlu menjelaskannya lagi.

Task-nya: [JELASKAN, ATAU BILANG "apa yang baru kita kerjakan"]

Hasilkan:
1. Nama — singkat, action-oriented
2. Deskripsi — trigger yang presisi: kapan persis Skill ini harus dan tidak boleh dipakai, termasuk kalimat yang mungkin diucapkan user. Cukup spesifik supaya selalu terpicu di task yang tepat dan tidak pernah terpicu di task yang tidak terkait.
3. Instructions — bernomor, langkah demi langkah, ditulis untuk model tanpa konteks sebelumnya. Sertakan apa yang harus dicek duluan, apa yang harus ditanyakan ke user, dan urutan pengerjaannya.
4. Rules dan constraint — requirement wajib, dan hal yang tidak boleh terjadi.
5. Output format — persis seperti apa hasilnya, lengkap dengan template.
6. Contoh lengkap — satu contoh input sampai output.
7. Failure mode — 3-5 cara task ini biasa gagal dan cara menghindarinya.

Tulis supaya berdiri sendiri. Anggap pembacanya tidak tahu apa-apa soal project ini.
```

*(Catatan: gambar untuk poin 7/ tidak diunggah, jadi tidak disertakan di file ini.)*
