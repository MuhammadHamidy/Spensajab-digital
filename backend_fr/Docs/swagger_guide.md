# Panduan Penggunaan Swagger UI

Dokumen ini menjelaskan cara mengakses dan menggunakan Swagger UI untuk **facerec Backend**, termasuk cara melakukan otentikasi menggunakan token Bearer.

## 1. Akses Swagger UI

Buka browser dan akses alamat berikut:

```
http://localhost:8080/swagger/index.html
```

## 2. Cara Otentikasi (Authorize)

Agar bisa mengakses endpoint yang dilindungi (seperti `POST`, `PUT`, `DELETE`, atau `GET` yang butuh permission), Anda harus login terlebih dahulu di Swagger.

1.  Klik tombol **Authorize** (ikon gembok terbuka) di bagian kanan atas atau di setiap endpoint.
2.  Akan muncul popup **Available authorizations**.
3.  Isi kolom **Value** dengan format berikut:
    ```text
    Bearer <token>
    ```
    > **PENTING:** Jangan lupa menulis kata `Bearer` diikuti spasi sebelum token.

## 3. Akun Admin untuk Testing
 
Gunakan akun berikut untuk mendapatkan token:
 
- **Username**: `admin`
- **Password**: `password`
 
### Langkah mendapatkan token:
1. Cari endpoint `POST /api/auth/login`.
2. Klik **Try it out**.
3. Masukkan username dan password di atas dalam body JSON.
4. Klik **Execute**.
5. Copy nilai `token` dari response body.
6. Klik tombol **Authorize** di atas, lalu paste token dengan format `Bearer <token>`.


## 4. Cara Test Endpoint

1.  Pilih endpoint yang ingin ditest, misal `GET /api/kandang`.
2.  Klik **Try it out**.
3.  Isi parameter jika ada (misal `page`, `limit`).
4.  Klik **Execute**.
5.  Lihat **Server response** di bawahnya.
    - **200 OK**: Berhasil.
    - **401 Unauthorized**: Token salah, expired, atau permission kurang.

---

---

## 5. Panduan Update Documentation (Untuk Developer)

Jika Anda melakukan perubahan pada API (menambah endpoint, mengubah request/response, atau mengubah permission), Anda harus mengupdate dokumentasi agar tetap akurat.

### A. Update Annotations di Code

Semua dokumentasi Swagger didefinisikan secara langsung di atas fungsi handler di file `delivery/http/*.go`.

**Contoh Struktur Standar:**

```go
// CreateRoom godoc
// @Summary      Create a new room
// @Description  Create a new room with the given details
// @Tags         rooms
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request body      CreateRoomRequest  true  "Room details"
// @Success      201     {object}  responses.Response[domain.Room]
// @Failure      400     {object}  responses.Response[any]
// @Failure      500     {object}  responses.Response[any]
// @Router       /rooms [post]
func (h *RoomHandler) CreateRoom(c *fiber.Ctx) error { ... }
```

**Poin Penting:**

- **@Summary**: Judul singkat endpoint.
- **@Tags**: Nama module (untuk grouping di UI). Gunakan lowercase dan snake_case.
- **@Security ApiKeyAuth**: Wajib ada untuk endpoint yang butuh autentikasi.
- **@Param**: Definisi parameter (path, query, atau body).
- **@Success / @Failure**: Definisi response. Kita menggunakan generic `responses.Response[T]`.

### B. Regenerasi Dokumentasi

Setelah mengubah anotasi di code, Anda harus menjalankan perintah berikut di terminal (di dalam direktori `facerec`):

```bash
swag init -g cmd/serve.go --output docs --parseDependency --parseInternal
```

**Penjelasan Flag:**

- `-g cmd/serve.go`: Menentukan entry point aplikasi.
- `--output docs`: Folder tempat hasil generate (`docs/docs.go`, `docs/swagger.json`).
- `--parseDependency`: Membaca struct dari library/folder lain.
- `--parseInternal`: Membaca struct dari folder internal.

### C. Verifikasi Perubahan

1.  Jalankan perintah regenerasi di atas.
2.  Refresh halaman Swagger UI di browser.
3.  Cek apakah perubahan deskripsi atau skema sudah muncul.

> **Tips:** Pastikan setiap fungsi handler memiliki anotasi yang unik dan `@Router` yang benar.
