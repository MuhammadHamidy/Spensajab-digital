-- Seed hanya definisi role aplikasi.
-- Akun, mata pelajaran, kelas, dan enrollment dibuat melalui panel admin.
INSERT INTO roles (id, name, description) VALUES
('role-admin', 'ADMIN', 'Administrator sekolah'),
('role-guru', 'GURU', 'Guru pengampu kelas'),
('role-siswa', 'SISWA', 'Siswa yang mengikuti kelas')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

DELETE FROM attendances;
DELETE FROM class_sessions;
DELETE FROM class_enrollments;
DELETE FROM teacher_classes;
DELETE FROM teacher_courses;
DELETE FROM student_faces;
DELETE FROM classes;
DELETE FROM accounts;
DELETE FROM courses;
DELETE FROM roles WHERE name NOT IN ('ADMIN', 'GURU', 'SISWA');

-- Akun awal untuk masuk ke panel admin.
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
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    password_hash = EXCLUDED.password_hash;
