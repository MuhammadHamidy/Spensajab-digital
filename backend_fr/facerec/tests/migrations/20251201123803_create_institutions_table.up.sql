CREATE TABLE auth.institutions
(
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        VARCHAR(50) UNIQUE NOT NULL,
    name        VARCHAR(255)       NOT NULL,
    description TEXT,
    settings    JSONB            DEFAULT '{}',
    max_users   INTEGER,
    max_roles   INTEGER,
    features    JSONB            DEFAULT '[]',
    is_active   BOOLEAN          DEFAULT true,
    created_at  TIMESTAMPTZ      DEFAULT now(),
    updated_at  TIMESTAMPTZ      DEFAULT now()
);