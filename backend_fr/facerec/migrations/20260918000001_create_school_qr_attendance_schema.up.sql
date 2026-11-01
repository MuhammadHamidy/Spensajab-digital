-- ==============================================================================
-- Migration: 20260918000001_create_school_qr_attendance_schema.up.sql
-- Description: Schema DDL for School QR Code Attendance System (PRD v1.1)
-- ==============================================================================

-- 1. Ensure Roles (1 Admin Sekolah, 20 Guru Pengampu, Siswa)
INSERT INTO roles (id, name, description) VALUES
('role-admin', 'ADMIN', 'Administrator Sekolah (Kelola Siswa, Guru, Mapel, Rekap, & Import/Export)'),
('role-guru', 'GURU', 'Guru Pengampu Kelas & Operator Scanner Presensi'),
('role-siswa', 'SISWA', 'Siswa Peserta Kelas')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 2. Enhance Accounts with QR Token & School Metadata
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS qr_code_token VARCHAR(64);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gender VARCHAR(1) DEFAULT 'L'; -- 'L' / 'P'
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create Unique Index on qr_code_token (only for non-null/active)
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_qr_token 
ON accounts(qr_code_token) 
WHERE qr_code_token IS NOT NULL;

-- 3. Enhance Class Sessions with 15-Minute Cutoff & Lifecycle Timestamps
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS teacher_id VARCHAR(36) REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS late_cutoff_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS total_students INT DEFAULT 0;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS total_present INT DEFAULT 0;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS total_late INT DEFAULT 0;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS total_alpha INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_class_sessions_status ON class_sessions(status);
CREATE INDEX IF NOT EXISTS idx_class_sessions_teacher ON class_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_opened_at ON class_sessions(opened_at);

-- 4. Enhance Attendances Table for Status Enum & Method
-- Status options: PENDING, HADIR, TERLAMBAT, SAKIT, IZIN, ALPHA
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS is_manual_edit BOOLEAN DEFAULT FALSE;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS edited_by VARCHAR(36) REFERENCES accounts(id) ON DELETE SET NULL;

-- Index for instant sub-second lookup during live scanning
CREATE INDEX IF NOT EXISTS idx_attendances_session_status ON attendances(session_id, status);
CREATE INDEX IF NOT EXISTS idx_attendances_student_time ON attendances(student_id, timestamp);

-- 5. Auto Cut-off Function & Trigger Helper (Optional Database Automation)
-- Menghitung sisa siswa PENDING menjadi ALPHA jika sesi melewati late_cutoff_at
CREATE OR REPLACE FUNCTION mark_pending_to_alpha(p_session_id VARCHAR)
RETURNS INT AS $$
DECLARE
    v_updated_count INT;
BEGIN
    UPDATE attendances
    SET status = 'ALPHA',
        updated_at = CURRENT_TIMESTAMP
    WHERE session_id = p_session_id 
      AND status = 'PENDING';
      
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    -- Update rekap di class_sessions
    UPDATE class_sessions
    SET total_alpha = total_alpha + v_updated_count
    WHERE id = p_session_id;

    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;
