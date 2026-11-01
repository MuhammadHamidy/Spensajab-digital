CREATE TABLE IF NOT EXISTS iam.user_roles
(
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES auth.institutions(id),

    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id        UUID NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE,

    group_id       UUID NOT NULL REFERENCES iam.groups(id) ON DELETE CASCADE,

    assigned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by    UUID REFERENCES auth.users(id),
    expires_at     TIMESTAMPTZ,

    context        JSONB NOT NULL DEFAULT '{}'::JSONB,
    is_active      BOOLEAN NOT NULL DEFAULT true,

    UNIQUE (institution_id, user_id, group_id, role_id)
);

-- AuthZ hot-path: lookup all roles for a user in a tenant
DROP INDEX IF EXISTS iam.idx_user_roles_institution_user_active;
CREATE INDEX idx_user_roles_institution_user_active
ON iam.user_roles (institution_id, user_id)
WHERE is_active = true;

-- Useful for group-scoped queries (e.g., list staff/dosen per department/program)
DROP INDEX IF EXISTS iam.idx_user_roles_institution_group_active;
CREATE INDEX idx_user_roles_institution_group_active
ON iam.user_roles (institution_id, group_id)
WHERE is_active = true;

-- Ensure that user_roles assignments are tenant-consistent
CREATE OR REPLACE FUNCTION iam.ensure_user_roles_tenant_consistency()
RETURNS trigger AS $$
DECLARE
    u_inst UUID;
    r_inst UUID;
    g_inst UUID;
BEGIN
    SELECT institution_id INTO u_inst FROM auth.users WHERE id = NEW.user_id;
    SELECT institution_id INTO r_inst FROM iam.roles  WHERE id = NEW.role_id;
    SELECT institution_id INTO g_inst FROM iam.groups WHERE id = NEW.group_id;

    IF u_inst IS NULL OR r_inst IS NULL OR g_inst IS NULL THEN
        RAISE EXCEPTION 'Invalid FK reference (user/role/group not found)';
    END IF;

    IF NEW.institution_id <> u_inst OR NEW.institution_id <> r_inst OR NEW.institution_id <> g_inst THEN
        RAISE EXCEPTION 'Cross-tenant assignment is not allowed';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_roles_tenant_consistency ON iam.user_roles;
CREATE TRIGGER trg_user_roles_tenant_consistency
BEFORE INSERT OR UPDATE ON iam.user_roles
FOR EACH ROW EXECUTE FUNCTION iam.ensure_user_roles_tenant_consistency();