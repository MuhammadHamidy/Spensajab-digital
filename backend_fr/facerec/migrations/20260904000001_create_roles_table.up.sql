CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (id, name, description) VALUES
('role-admin', 'ADMIN', 'Administrator Sistem'),
('role-dosen', 'DOSEN', 'Dosen Pengampu Kelas'),
('role-mahasiswa', 'MAHASISWA', 'Mahasiswa Peserta Kelas')
ON CONFLICT (name) DO NOTHING;
