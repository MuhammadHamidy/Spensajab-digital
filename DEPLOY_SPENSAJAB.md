# Panduan Deployment Spensajab ke VPS Hostinger (Multi-Domain)

Panduan ini digunakan untuk mendeploy aplikasi **Spensajab** ke VPS Hostinger yang sudah menjalankan aplikasi sekolah lain menggunakan **Nginx** dan **Docker**.

---

## 1. Persiapan Awal di Hostinger

### A. Konfigurasi DNS Domain Baru
Di panel Domain Manager (Hostinger DNS Zone / Cloudflare):
- Buat **A Record**:
  - `spensajab.sch.id` $\rightarrow$ `IP_PUBLIC_VPS`
  - `www.spensajab.sch.id` $\rightarrow$ `IP_PUBLIC_VPS`

### B. Cek Ketersediaan Port di VPS
Masuk ke terminal VPS via SSH:
```bash
ssh user@IP_PUBLIC_VPS
```
Pastikan port target (`3001`, `8081`, `5435`) belum dipakai oleh web lama:
```bash
sudo netstat -tulpn | grep -E '3001|8081|5435'
```
*(Jika tidak ada output, berarti semua port tersebut aman digunakan)*.

---

## 2. Setup Folder Proyek di VPS

1. Masuk ke direktori web, misalnya `/var/www`:
   ```bash
   cd /var/www
   git clone <URL_REPOSITORY_ANDA> spensajab
   cd spensajab
   ```

2. Buat file `.env` dari template:
   ```bash
   cp .env.prod.example .env
   nano .env
   ```
   *Sesuaikan `DOMAIN`, password database, dan kredensial WhatsApp/SMTP sesuai kebutuhan.*

---

## 3. Jalankan Aplikasi dengan Docker Compose

Jalankan build dan jalankan semua container di background:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Cek status container:
```bash
docker compose -f docker-compose.prod.yml ps
```
Pastikan service berikut berjalan:
- `spensajab_postgres` (Up, healthy)
- `spensajab_redis` (Up, healthy)
- `spensajab_migrate` (Completed)
- `spensajab_seeder` (Completed)
- `spensajab_backend` (Up)
- `spensajab_frontend` (Up)

---

## 4. Konfigurasi Nginx di Host VPS

1. Salin template konfigurasi Nginx:
   ```bash
   sudo cp nginx-spensajab.conf.example /etc/nginx/sites-available/spensajab.conf
   ```

2. Jika domain Anda berbeda, edit nama domain di file tersebut:
   ```bash
   sudo nano /etc/nginx/sites-available/spensajab.conf
   ```

3. Aktifkan konfigurasi dan reload Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/spensajab.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## 5. Pasang Sertifikat SSL Gratis (HTTPS)

Jalankan Certbot:
```bash
sudo certbot --nginx -d spensajab.sch.id -d www.spensajab.sch.id
```
Pilih opsi **Redirect HTTP to HTTPS (2)** jika ditanya.

---

## 6. Login Pertama Kali

Setelah selesai, buka di browser:
`https://spensajab.sch.id/login`

Kredensial bawaan admin:
- **Username / Email**: `admin` atau `admin@smpn1jabon.sch.id`
- **Password**: `password`

*(Segera ubah password setelah login pertama melalui menu profil/kelola akun).*
