CREATE TABLE IF NOT EXISTS student_faces (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    photo_url TEXT,
    face_vector TEXT, -- JSON string representation of float32 array embeddings (e.g. 128-d or 512-d)
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_face UNIQUE (user_id)
);
