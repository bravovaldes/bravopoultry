-- Migration: Add inheritance tracking fields to health_events table
-- Date: 2026-01-30
-- Purpose: Track health events inherited from parent lots during split operations

-- Add inherited_from_lot_id column
ALTER TABLE health_events ADD COLUMN inherited_from_lot_id VARCHAR(36) REFERENCES lots(id) ON DELETE SET NULL;

-- Add original_event_id column
ALTER TABLE health_events ADD COLUMN original_event_id VARCHAR(36) REFERENCES health_events(id) ON DELETE SET NULL;
