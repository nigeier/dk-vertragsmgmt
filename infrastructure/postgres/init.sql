-- Drykorn Vertragsmanagement - PostgreSQL Initialization
-- This script runs once when the PostgreSQL container is first created

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create additional indexes for full-text search (Prisma will create base tables)
-- Note: These will be created after Prisma migrations run

-- Grant permissions (if using separate schemas)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO drykorn;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO drykorn;

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'PostgreSQL initialized for Drykorn Vertragsmanagement';
END $$;
