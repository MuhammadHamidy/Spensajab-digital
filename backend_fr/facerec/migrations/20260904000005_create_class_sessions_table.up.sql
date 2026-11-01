CREATE TABLE IF NOT EXISTS class_sessions (
    id VARCHAR(36) PRIMARY KEY,
    class_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    session_number INT NOT NULL,
    topic VARCHAR(200) NOT NULL,
    date DATE NOT NULL,
    start_time VARCHAR(10),
    end_time VARCHAR(10),
    status VARCHAR(20) NOT NULL DEFAULT 'UPCOMING',
    session_token VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_class_session_num UNIQUE (class_id, session_number)
);
