CREATE TABLE IF NOT EXISTS iam.permissions
(
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id     UUID NOT NULL REFERENCES auth.institutions(id),

    code               VARCHAR(260) NOT NULL, -- allow growth
    description        TEXT,

    module             VARCHAR(80) NOT NULL,
    sub_module         VARCHAR(80) NOT NULL, -- use '*' if wildcard
    page               VARCHAR(80) NOT NULL, -- use '*' if wildcard
    action             VARCHAR(30) NOT NULL,

    scope_type         VARCHAR(20) NOT NULL CHECK (scope_type IN ('api', 'ui', 'both')),

    requires_context   BOOLEAN NOT NULL DEFAULT false,
    context_attributes JSONB   NOT NULL DEFAULT '[]'::JSONB,

    is_system          BOOLEAN NOT NULL DEFAULT false,

    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT valid_code_format CHECK (
      code ~ '^[a-z_]+\.[a-z_*]+\.[a-z_*]+\.[a-z_]+$'
    ),
    CONSTRAINT code_matches_components CHECK (
      code = module || '.' || sub_module || '.' || page || '.' || action
    )
);

-- Unique permission code per tenant
ALTER TABLE iam.permissions
    DROP CONSTRAINT IF EXISTS permissions_institution_id_code_key;
ALTER TABLE iam.permissions
    ADD CONSTRAINT permissions_institution_id_code_key UNIQUE (institution_id, code);
