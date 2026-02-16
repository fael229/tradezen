-- Migration: Add currency column to trades table
-- Run this in Supabase SQL Editor if you have existing data

-- Add currency column with default value USD
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';

-- Update any NULL values to USD (just in case)
UPDATE trades 
SET currency = 'USD' 
WHERE currency IS NULL;
