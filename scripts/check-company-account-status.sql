-- Check the status of Company Account and fix if needed
-- Run this in Supabase SQL Editor

-- Step 1: Check all members with Company-related names or IDs
SELECT 
  id,
  name,
  phone_no,
  (payment->>'membershipId') as membership_id,
  total_shares,
  created_at,
  'Current company-related members' as status
FROM members 
WHERE name ILIKE '%company%' 
   OR payment->>'membershipId' IN ('2025-002', '2025-0002')
ORDER BY name;

-- Step 2: Check if Company Account exists properly
SELECT 
  id,
  name,
  phone_no,
  (payment->>'membershipId') as membership_id,
  (payment->>'paymentStatus') as payment_status,
  total_shares,
  created_at,
  'Company Account check' as note
FROM members 
WHERE payment->>'membershipId' = '2025-002'
   AND name ILIKE '%company%';

-- Step 3: Check if there are duplicate company accounts
SELECT 
  COUNT(*) as company_account_count,
  'Should be exactly 1' as expected
FROM members 
WHERE payment->>'membershipId' = '2025-002'
   OR (name ILIKE '%company%' AND name ILIKE '%individual%' AND name ILIKE '%entity%');

-- Step 4: Show what the Company Account should look like
SELECT 
  'Expected Company Account Structure' as info,
  '2025-002' as membership_id,
  'Company as Individual Entity' as name,
  'Should have company transactions and investments' as purpose,
  'Should NOT appear in regular member lists' as note;
