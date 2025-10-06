-- Migration script for membership refund functionality
-- Run this in Supabase SQL Editor

-- Step 1: Check current structure of members table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'members' AND column_name LIKE '%payment%'
ORDER BY ordinal_position;

-- Step 2: The payment JSONB column should already exist
-- We'll add refund tracking fields to the payment JSONB structure

-- Step 3: Update existing members to ensure they have proper payment structure
UPDATE members 
SET payment = COALESCE(payment, '{}'::jsonb)
WHERE payment IS NULL;

-- Step 4: Add default refund fields to existing members (if not already present)
UPDATE members 
SET payment = payment || '{"membershipRefunded": false}'::jsonb
WHERE payment->>'membershipRefunded' IS NULL;

-- Step 5: Verify the structure
SELECT 
  id,
  name,
  phone_no,
  payment->>'dateOfJoining' as joining_date,
  payment->>'payingMembershipAmount' as membership_amount,
  payment->>'membershipRefunded' as refunded,
  payment->>'refundDate' as refund_date,
  payment->>'refundAmount' as refund_amount
FROM members 
LIMIT 5;

-- Step 6: Create indexes for efficient refund queries
-- Create GIN index on the entire payment JSONB column for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_members_payment_gin 
ON members USING GIN (payment);

-- Create B-tree indexes on extracted text values for equality searches
CREATE INDEX IF NOT EXISTS idx_members_payment_refunded 
ON members ((payment->>'membershipRefunded')) 
WHERE payment->>'membershipRefunded' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_members_payment_joining_date 
ON members ((payment->>'dateOfJoining')) 
WHERE payment->>'dateOfJoining' IS NOT NULL;

-- Step 7: Verify indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'members' 
AND indexname LIKE '%refund%' OR indexname LIKE '%joining%';

-- The membership refund system is now ready!
-- Members with payment->>'membershipRefunded' = 'true' have been refunded
-- Members with payment->>'dateOfJoining' older than 1 year are eligible for refund
