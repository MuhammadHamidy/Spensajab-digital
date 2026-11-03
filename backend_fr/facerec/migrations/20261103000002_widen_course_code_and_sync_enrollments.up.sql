-- 1. Widen courses.code to VARCHAR(50) so auto-generated codes from subject names do not fail with VARCHAR(20) overflow
ALTER TABLE courses ALTER COLUMN code TYPE VARCHAR(50);

-- 2. Ensure all SISWA accounts have a non-empty qr_code_token
UPDATE accounts
SET qr_code_token = id
WHERE role_id = 'role-siswa'
  AND (qr_code_token IS NULL OR qr_code_token = '');

-- 3. Sync teacher_courses and teacher_classes from existing classes
INSERT INTO teacher_courses (id, teacher_id, course_id)
SELECT DISTINCT md5(dosen_id || ':' || course_id), dosen_id, course_id
FROM classes
WHERE dosen_id IS NOT NULL AND dosen_id <> '' AND course_id IS NOT NULL AND course_id <> ''
ON CONFLICT (teacher_id, course_id) DO NOTHING;

INSERT INTO teacher_classes (id, teacher_id, class_id)
SELECT DISTINCT md5(dosen_id || ':' || id), dosen_id, id
FROM classes
WHERE dosen_id IS NOT NULL AND dosen_id <> ''
ON CONFLICT (teacher_id, class_id) DO NOTHING;

-- 4. Backfill class_enrollments for any students whose normalized class_name matches classes.class_code
INSERT INTO class_enrollments (id, class_id, student_id)
SELECT
    md5(c.id || ':' || a.id),
    c.id,
    a.id
FROM classes c
JOIN accounts a
  ON a.role_id = 'role-siswa'
 AND UPPER(REPLACE(REPLACE(COALESCE(a.class_name, ''), '-', ''), ' ', '')) =
     UPPER(REPLACE(REPLACE(COALESCE(c.class_code, ''), '-', ''), ' ', ''))
WHERE COALESCE(a.class_name, '') <> ''
ON CONFLICT (class_id, student_id) DO NOTHING;

