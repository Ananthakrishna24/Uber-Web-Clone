-- Migration 002: Add driver-specific fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_info JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT false;
