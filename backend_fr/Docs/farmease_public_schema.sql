-- =========================================================================
-- facerec DATABASE SCHEMA (UNIFIED PUBLIC SCHEMA FOR DOCUMENTATION)
-- =========================================================================
-- This file compiles all facerec database tables into a single 'public' schema
-- with explicit FOREIGN KEY constraints to ensure compatibility with SQL
-- parsers like drawdb.app, dbdiagram.io, and DBeaver.
-- =========================================================================

-- Enable UUID Extensions in public schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Farms Table
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(45) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE,
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID
);
CREATE INDEX IF NOT EXISTS idx_farms_code ON farms(code);


-- 2. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id_role SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    permissions VARCHAR(20) NOT NULL DEFAULT 'view',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- 3. Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id_account SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255),
    operator_category VARCHAR(20) NOT NULL,
    id_role INT,
    farm_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_role) REFERENCES roles(id_role),
    FOREIGN KEY (farm_id) REFERENCES farms(id)
);


-- 4. Sheep Types Table
CREATE TABLE IF NOT EXISTS sheep_types (
    id_type SERIAL PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL,
    type_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- 5. Cages Table
CREATE TABLE IF NOT EXISTS cages (
    id_cage SERIAL PRIMARY KEY,
    cage_code VARCHAR(20) UNIQUE NOT NULL,
    capacity INT NOT NULL,
    cage_type VARCHAR(20) NOT NULL,
    cage_name VARCHAR(100),
    farm_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(id)
);
CREATE INDEX IF NOT EXISTS idx_cages_farm_id ON cages(farm_id);


-- 6. Sheep (Livestock) Table
CREATE TABLE IF NOT EXISTS sheep (
    id_sheep SERIAL PRIMARY KEY,
    sheep_code VARCHAR(20) UNIQUE NOT NULL,
    sheep_name VARCHAR(100),
    gender VARCHAR(10) NOT NULL,
    date_of_birth DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'aktif',
    origin VARCHAR(50),
    id_cage INT,
    id_type INT,
    id_sire INT,
    id_dam INT,
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cage) REFERENCES cages(id_cage),
    FOREIGN KEY (id_type) REFERENCES sheep_types(id_type),
    FOREIGN KEY (id_sire) REFERENCES sheep(id_sheep),
    FOREIGN KEY (id_dam) REFERENCES sheep(id_sheep),
    FOREIGN KEY (created_by) REFERENCES accounts(id_account),
    FOREIGN KEY (updated_by) REFERENCES accounts(id_account)
);
CREATE INDEX IF NOT EXISTS idx_sheep_code ON sheep(sheep_code);
CREATE INDEX IF NOT EXISTS idx_sheep_cage ON sheep(id_cage);


-- 7. Weights Table
CREATE TABLE IF NOT EXISTS weights (
    id_weight SERIAL PRIMARY KEY,
    id_sheep INT NOT NULL,
    weighing_date DATE NOT NULL,
    weight_kg DECIMAL(5,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_sheep) REFERENCES sheep(id_sheep) ON DELETE CASCADE
);


-- 8. Healths Table
CREATE TABLE IF NOT EXISTS healths (
    id_health SERIAL PRIMARY KEY,
    id_sheep INT NOT NULL,
    checkup_date DATE NOT NULL,
    diagnosis TEXT NOT NULL,
    action TEXT,
    medicine_given TEXT,
    inspector_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_sheep) REFERENCES sheep(id_sheep) ON DELETE CASCADE
);


-- 9. Matings Table (Breeding)
CREATE TABLE IF NOT EXISTS matings (
    id_mating SERIAL PRIMARY KEY,
    id_sheep_male INT NOT NULL,
    id_sheep_female INT NOT NULL,
    mating_date DATE NOT NULL,
    mating_method VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'proses',
    inbreeding_flag BOOLEAN DEFAULT FALSE,
    coefficient_of_inbreeding DECIMAL(10,8) DEFAULT 0.0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_sheep_male) REFERENCES sheep(id_sheep) ON DELETE CASCADE,
    FOREIGN KEY (id_sheep_female) REFERENCES sheep(id_sheep) ON DELETE CASCADE
);


-- 10. Pregnancies Table (Breeding)
CREATE TABLE IF NOT EXISTS pregnancies (
    id_pregnancy SERIAL PRIMARY KEY,
    id_mating INT NOT NULL,
    pregnancy_date DATE NOT NULL,
    pregnancy_status VARCHAR(20) NOT NULL DEFAULT 'dikandung',
    expected_birth_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_mating) REFERENCES matings(id_mating) ON DELETE CASCADE
);


-- 11. Births Table (Breeding)
CREATE TABLE IF NOT EXISTS births (
    id_birth SERIAL PRIMARY KEY,
    id_pregnancy INT NOT NULL,
    birth_date DATE NOT NULL,
    number_of_offspring INT NOT NULL,
    offspring_gender VARCHAR(20),
    offspring_condition VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pregnancy) REFERENCES pregnancies(id_pregnancy) ON DELETE CASCADE
);


-- 12. Feeds Table (Logistics)
CREATE TABLE IF NOT EXISTS feeds (
    id_feed SERIAL PRIMARY KEY,
    feed_name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    available_stock DECIMAL(10,2) DEFAULT 0.0,
    price_per_unit DECIMAL(15,2),
    category VARCHAR(20),
    external_source_id VARCHAR(100),
    source_type VARCHAR(50) DEFAULT 'internal',
    source_api_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_feeds_external_source ON feeds(external_source_id);


-- 13. Feedings Table (Logistics)
CREATE TABLE IF NOT EXISTS feedings (
    id_feeding SERIAL PRIMARY KEY,
    id_sheep INT NOT NULL,
    id_feed INT NOT NULL,
    feeding_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_sheep) REFERENCES sheep(id_sheep) ON DELETE CASCADE,
    FOREIGN KEY (id_feed) REFERENCES feeds(id_feed) ON DELETE CASCADE
);


-- 14. Manures Table (Logistics)
CREATE TABLE IF NOT EXISTS manures (
    id_manure SERIAL PRIMARY KEY,
    id_sheep INT NOT NULL,
    activity_type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    external_destination_id VARCHAR(100),
    destination_type VARCHAR(50) DEFAULT 'internal',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_sheep) REFERENCES sheep(id_sheep) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_manures_external_dest ON manures(external_destination_id);


-- 15. Tasks Table (Operations)
CREATE TABLE IF NOT EXISTS tasks (
    id_task SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending',
    id_account INT,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_account) REFERENCES accounts(id_account) ON DELETE CASCADE
);


-- 16. Notifications Table (Operations)
CREATE TABLE IF NOT EXISTS notifications (
    id_notification SERIAL PRIMARY KEY,
    title VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    id_account INT NOT NULL,
    type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_account) REFERENCES accounts(id_account) ON DELETE CASCADE
);
