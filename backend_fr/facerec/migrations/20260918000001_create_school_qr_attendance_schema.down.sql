-- Revert School QR Attendance Schema Migration

DROP FUNCTION IF EXISTS mark_pending_to_alpha(VARCHAR);

DROP INDEX IF EXISTS idx_attendances_student_time;
DROP INDEX IF EXISTS idx_attendances_session_status;
DROP INDEX IF EXISTS idx_class_sessions_opened_at;
DROP INDEX IF EXISTS idx_class_sessions_teacher;
DROP INDEX IF EXISTS idx_class_sessions_status;
DROP INDEX IF EXISTS idx_accounts_qr_token;

ALTER TABLE attendances DROP COLUMN IF EXISTS edited_by;
ALTER TABLE attendances DROP COLUMN IF EXISTS is_manual_edit;

ALTER TABLE class_sessions DROP COLUMN IF EXISTS total_alpha;
ALTER TABLE class_sessions DROP COLUMN IF EXISTS total_late;
ALTER TABLE class_sessions DROP COLUMN IF EXISTS total_present;
ALTER TABLE class_sessions DROP COLUMN IF EXISTS total_students;
ALTER TABLE class_sessions DROP COLUMN IF EXISTS closed_at;
ALTER TABLE class_sessions DROP COLUMN IF EXISTS late_cutoff_at;
ALTER TABLE class_sessions DROP COLUMN IF EXISTS opened_at;
ALTER TABLE class_sessions DROP COLUMN IF EXISTS teacher_id;

ALTER TABLE accounts DROP COLUMN IF EXISTS is_active;
ALTER TABLE accounts DROP COLUMN IF EXISTS gender;
ALTER TABLE accounts DROP COLUMN IF EXISTS qr_code_token;
