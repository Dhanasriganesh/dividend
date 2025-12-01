-- Add distributed_amount column to dividend_donation_events table
-- Run this in Supabase SQL Editor

-- Step 1: Check current table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'dividend_donation_events' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Add the distributed_amount column
ALTER TABLE dividend_donation_events 
ADD COLUMN IF NOT EXISTS distributed_amount NUMERIC(15,2) DEFAULT 0;

-- Step 3: Update existing records to set distributed_amount to 0 (or you can set it to distribution_pool if needed)
UPDATE dividend_donation_events 
SET distributed_amount = 0 
WHERE distributed_amount IS NULL;

-- Step 4: Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'dividend_donation_events' 
  AND table_schema = 'public'
  AND column_name = 'distributed_amount';

-- Step 5: Show sample data with new column
SELECT 
  id,
  event_name,
  event_date,
  distribution_pool,
  distributed_amount,
  company_investment_amount,
  status,
  created_at
FROM dividend_donation_events 
ORDER BY created_at DESC 
LIMIT 5;
