-- Update roles with GURU and SISWA
INSERT INTO roles (id, name, description) VALUES
('role-guru', 'GURU', 'Guru Mata Pelajaran'),
('role-siswa', 'SISWA', 'Siswa Sekolah')
ON CONFLICT (name) DO NOTHING;

-- Add new columns to accounts table for student & teacher metadata
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS nisn VARCHAR(50);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(30);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create teacher_courses table for mapping teachers to multiple subjects (M:N)
CREATE TABLE IF NOT EXISTS teacher_courses (
    id VARCHAR(36) PRIMARY KEY,
    teacher_id VARCHAR(36) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_teacher_course UNIQUE (teacher_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_courses_teacher ON teacher_courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_courses_course ON teacher_courses(course_id);
