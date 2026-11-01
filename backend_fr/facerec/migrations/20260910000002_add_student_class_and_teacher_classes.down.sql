-- Migration DOWN
DROP TABLE IF EXISTS teacher_classes;
ALTER TABLE accounts DROP COLUMN IF EXISTS class_name;
