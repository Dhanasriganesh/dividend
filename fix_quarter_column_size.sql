-- Fix quarter column issues for existing database
-- Run this in Supabase SQL Editor if you get column constraint errors

-- Step 1: Check current column sizes and constraints
SELECT column_name, character_maximum_length, is_nullable
FROM information_schema.columns 
WHERE table_name = 'share_prices' AND column_name IN ('quarter', 'month');

-- Step 2: Alter the quarter column to increase size from VARCHAR(10) to VARCHAR(20)
ALTER TABLE share_prices ALTER COLUMN quarter TYPE VARCHAR(20);

-- Step 3: Make month column nullable (since we're not using it anymore)
ALTER TABLE share_prices ALTER COLUMN month DROP NOT NULL;

-- Step 4: Verify the changes
SELECT column_name, character_maximum_length, is_nullable
FROM information_schema.columns 
WHERE table_name = 'share_prices' AND column_name IN ('quarter', 'month');

-- The quarter column should now accept values like "Oct-Dec-2025" (12 characters)
-- The month column should now be nullable
