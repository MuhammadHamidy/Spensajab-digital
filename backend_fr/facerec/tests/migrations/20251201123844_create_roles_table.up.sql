CREATE TABLE IF NOT EXISTS iam.roles
(
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id  UUID NOT NULL REFERENCES auth.institutions(id),

    name            VARCHAR(30) NOT NULL,
    display_name    VARCHAR(50),
    description     TEXT,

    parent_role_id  UUID REFERENCES iam.roles(id),
    role_level      INTEGER DEFAULT 0,

    scope_types     JSONB NOT NULL DEFAULT '["api","ui"]'::JSONB,
    is_system_role  BOOLEAN NOT NULL DEFAULT false,
    is_custom       BOOLEAN NOT NULL DEFAULT false,

    max_sessions      INTEGER DEFAULT 10,
    allowed_ip_ranges INET[],

    is_active       BOOLEAN NOT NULL DEFAULT true,
    tags            JSONB NOT NULL DEFAULT '{}'::JSONB,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID REFERENCES auth.users(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by      UUID REFERENCES auth.users(id)
);

-- Unique role names per tenant
ALTER TABLE iam.roles
    DROP CONSTRAINT IF EXISTS roles_institution_id_name_key;
ALTER TABLE iam.roles
    ADD CONSTRAINT roles_institution_id_name_key UNIQUE (institution_id, name);

-- Useful minimal index for role listing (optional but cheap)
DROP INDEX IF EXISTS iam.idx_roles_institution_active;
CREATE INDEX idx_roles_institution_active
ON iam.roles (institution_id)
WHERE is_active = true;