-- Migration: Add lot_id and program_id to vaccination_schedules table
-- Run this script to enable per-lot vaccination schedules

-- Add lot_id column with foreign key to lots table
ALTER TABLE vaccination_schedules
ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES lots(id) ON DELETE CASCADE;

-- Add program_id column to track which program template was used
ALTER TABLE vaccination_schedules
ADD COLUMN IF NOT EXISTS program_id VARCHAR(50);

-- Create index for faster lookups by lot_id
CREATE INDEX IF NOT EXISTS idx_vaccination_schedules_lot_id
ON vaccination_schedules(lot_id);

-- Create index for faster lookups by program_id
CREATE INDEX IF NOT EXISTS idx_vaccination_schedules_program_id
ON vaccination_schedules(program_id);
