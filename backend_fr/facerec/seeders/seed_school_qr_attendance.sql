-- Seed hanya definisi role aplikasi dan akun admin awal (idempotent, tanpa menghapus data).
-- Akun, mata pelajaran, kelas, dan enrollment dibuat melalui panel admin.
INSERT INTO roles (id, name, description) VALUES
('role-admin', 'ADMIN', 'Administrator sekolah'),
('role-guru', 'GURU', 'Guru pengampu kelas'),
('role-siswa', 'SISWA', 'Siswa yang mengikuti kelas')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Akun awal untuk masuk ke panel admin (hanya dibuat jika belum ada).
-- Password awal: password (segera ganti setelah login)
INSERT INTO accounts (
    id, username, password_hash, email, full_name, role_id, nim_nip, phone
) VALUES (
    'user-admin-1',
    'admin',
    '$2a$10$LOQmzILymmWdzSSrUyQdZ.6Hc/xlqkDRzQ6DaiyuCYH1Y1qMidb8i',
    'admin@smpn1jabon.sch.id',
    'Administrator Sekolah',
    'role-admin',
    'ADMIN-001',
    ''
)
ON CONFLICT (id) DO NOTHING;
