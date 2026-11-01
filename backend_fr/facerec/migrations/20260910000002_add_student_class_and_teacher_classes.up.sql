-- Migration UP: Add class_name to accounts and create teacher_classes table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS class_name VARCHAR(50) DEFAULT '';

CREATE TABLE IF NOT EXISTS teacher_classes (
    id VARCHAR(255) PRIMARY KEY,
    teacher_id VARCHAR(255) NOT NULL,
    class_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_teacher_classes_teacher FOREIGN KEY (teacher_id) REFERENCES accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_teacher_classes_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT unique_teacher_class UNIQUE(teacher_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher_id ON teacher_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_accounts_class_name ON accounts(class_name);
