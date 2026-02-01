-- Migration: Add line_items column to sales table
-- This allows storing multiple price lines in a single sale

ALTER TABLE sales ADD COLUMN IF NOT EXISTS line_items JSON NULL;

-- Example data format:
-- [{"quantity": 5, "unit_price": 1900, "subtotal": 9500}, {"quantity": 5, "unit_price": 2000, "subtotal": 10000}]
