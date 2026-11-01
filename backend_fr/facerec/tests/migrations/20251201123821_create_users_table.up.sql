CREATE TABLE IF NOT EXISTS auth.users
(
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id    UUID NOT NULL REFERENCES auth.institutions(id),

    external_subject  VARCHAR(128) NOT NULL,       -- "sub" from Central
    identity_provider VARCHAR(30)  NOT NULL DEFAULT 'central',

    metadata          JSONB NOT NULL DEFAULT '{}'::JSONB, -- optional attributes

    status            VARCHAR(10) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES auth.users(id),

    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by        UUID REFERENCES auth.users(id),

    deleted_at        TIMESTAMPTZ,
    deleted_by        UUID REFERENCES auth.users(id)
);

-- Soft-delete aware unique mapping for IdP subject
DROP INDEX IF EXISTS auth.ux_users_institution_idp_subject_active;
CREATE UNIQUE INDEX ux_users_institution_idp_subject_active
ON auth.users (institution_id, identity_provider, external_subject)
WHERE deleted_at IS NULL;

-- Minimal, high-signal indexes
DROP INDEX IF EXISTS auth.idx_users_institution_status;
CREATE INDEX idx_users_institution_status
ON auth.users (institution_id, status)
WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS auth.idx_users_institution_created_at_desc;
CREATE INDEX idx_users_institution_created_at_desc
ON auth.users (institution_id, created_at DESC)
WHERE deleted_at IS NULL;