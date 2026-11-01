CREATE TABLE IF NOT EXISTS iam.role_permissions
(
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id       UUID NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES iam.permissions(id) ON DELETE CASCADE,

    conditions    JSONB NOT NULL DEFAULT '{}'::JSONB,
    granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by    UUID REFERENCES auth.users(id),
    expires_at    TIMESTAMPTZ,

    UNIQUE (role_id, permission_id)
);

--- Trigger to ensure tenant consistency between roles and permissions
CREATE OR REPLACE FUNCTION iam.ensure_role_permissions_tenant_consistency()
RETURNS trigger AS $$
DECLARE
    r_inst UUID;
    p_inst UUID;
BEGIN
    SELECT institution_id INTO r_inst FROM iam.roles WHERE id = NEW.role_id;
    SELECT institution_id INTO p_inst FROM iam.permissions WHERE id = NEW.permission_id;

    IF r_inst IS NULL OR p_inst IS NULL THEN
        RAISE EXCEPTION 'Invalid FK reference (role/permission not found)';
    END IF;

    IF r_inst <> p_inst THEN
        RAISE EXCEPTION 'Cross-tenant role_permission is not allowed';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_role_permissions_tenant_consistency ON iam.role_permissions;
CREATE TRIGGER trg_role_permissions_tenant_consistency
BEFORE INSERT OR UPDATE ON iam.role_permissions
FOR EACH ROW EXECUTE FUNCTION iam.ensure_role_permissions_tenant_consistency();