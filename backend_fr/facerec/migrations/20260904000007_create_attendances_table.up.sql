CREATE TABLE IF NOT EXISTS attendances (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    student_id VARCHAR(36) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'HADIR', -- HADIR, IZIN, SAKIT, ALPA
    method VARCHAR(30) NOT NULL DEFAULT 'FACE_RECOGNITION', -- FACE_RECOGNITION, MANUAL, QR_CODE
    confidence_score DOUBLE PRECISION DEFAULT 0.0,
    snapshot_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_session_student UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendances_session ON attendances(session_id);
CREATE INDEX IF NOT EXISTS idx_attendances_student ON attendances(student_id);
