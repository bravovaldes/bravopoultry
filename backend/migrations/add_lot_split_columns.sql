-- Migration: Add lot split functionality columns
-- Date: 2026-01-30

-- Add split tracking columns to lots table
ALTER TABLE lots ADD COLUMN IF NOT EXISTS parent_lot_id UUID REFERENCES lots(id);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS split_date DATE;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS split_ratio NUMERIC(5, 4);

-- Add split tracking columns to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS from_split_lot_id UUID REFERENCES lots(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS original_expense_id UUID REFERENCES expenses(id);

-- Create index for faster split queries
CREATE INDEX IF NOT EXISTS idx_lots_parent_lot_id ON lots(parent_lot_id);
CREATE INDEX IF NOT EXISTS idx_expenses_from_split_lot_id ON expenses(from_split_lot_id);
