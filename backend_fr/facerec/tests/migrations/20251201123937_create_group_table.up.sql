CREATE TABLE IF NOT EXISTS iam.groups
(
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id  UUID NOT NULL REFERENCES auth.institutions(id),
    parent_group_id UUID REFERENCES iam.groups(id),

    name            VARCHAR(100) NOT NULL,
    group_type      VARCHAR(30)  NOT NULL, -- department, faculty, program, course_section, etc
    description     TEXT,

    path            TEXT,   -- optional materialized path
    level           INTEGER NOT NULL DEFAULT 0,

    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID REFERENCES auth.users(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by      UUID REFERENCES auth.users(id),

    UNIQUE (institution_id, name, group_type)
);