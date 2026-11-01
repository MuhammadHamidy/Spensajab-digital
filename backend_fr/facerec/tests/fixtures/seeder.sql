-- facerec Test Seeder
-- Populates the test database with initial data

DO $$
BEGIN
    -- ==========================================
    -- ROLES
    -- ==========================================
    INSERT INTO roles (id, code, name, description, is_active, created_by)
    VALUES
        (gen_random_uuid(), 'admin', 'Administrator', 'Full system access', true, 'system'),
        (gen_random_uuid(), 'operator', 'Operator', 'Farm operator', true, 'system'),
        (gen_random_uuid(), 'viewer', 'Viewer', 'Read-only access', true, 'system')
    ON CONFLICT (code) DO NOTHING;

    RAISE NOTICE 'Seeder completed successfully!';
END $$;
