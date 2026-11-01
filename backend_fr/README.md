# Sistem Presensi QR Barcode Siswa — Backend REST API

Sistem backend REST API untuk presensi pembelajaran kelas berbasis QR Code / Barcode Scanner. Dikembangkan menggunakan Go (Fiber) dengan database PostgreSQL dan Redis.

---

## 🚀 Cara Menjalankan dengan Docker Compose

Pastikan **Docker** dan **Docker Compose** telah terpasang di komputer Anda.

```bash
# 1. Jalankan service backend (PostgreSQL, Redis, Migrate, Seeder, api-service)
docker-compose up -d --build

# 2. Cek log status jalannya container
docker-compose logs -f
```

Setelah `docker-compose` berjalan:
- **`api-service` (Go API)**: `http://localhost:8080`
- **PostgreSQL**: `localhost:5435` (`database: presdig`)
- **Redis**: `localhost:6379`

---

## 🔑 Akun Administrator & Guru Default

- **Admin**: `admin` / `password123`
- **Guru**: `guru01` / `password123`

---

## 🌐 Daftar Environment Variables

| Variable | Service | Default | Deskripsi |
|---|---|---|---|
| `APP_PORT` | `api-service` | `8080` | Port publik HTTP server Go |
| `APP_ENV` | `api-service` | `local` | Environment mode (`local`/`production`) |
| `APP_POSTGRES_URL` | `api-service` | `postgres://user:pass@postgres:5432/presdig?sslmode=disable` | URL koneksi database PostgreSQL |
| `APP_REDIS_ADDRESS` | `api-service` | `redis:6379` | Host & port Redis cache |
| `APP_SERVICE_NAME` | `api-service` | `presdig` | Nama service aplikasi |

---

## 📁 Struktur Backend

```text
.
├── docker-compose.yml          # Orchestration PostgreSQL + Redis + Migrate + Seeder + api-service
├── config/                     # Konfigurasi database & service
├── framework/                  # Shared framework & HTTP utilities
├── libraries/                  # Helper libraries & database adapters
└── facerec/                    # Modul presensi sekolah
    ├── cmd/                    # Entrypoint aplikasi Go
    ├── migrations/             # Migration DDL schema SQL
    ├── module/
    │   ├── auth/               # Autentikasi JWT
    │   ├── roles/              # Pengelolaan role
    │   ├── school_attendances/ # Logika presensi QR, cut-off 15 menit, dan manual override
    │   ├── school_imports/     # Bulk import Excel
    │   └── users/              # Pengelolaan data guru dan siswa
    └── seeders/                # Data awal akun admin dan guru
```
