-- Fix Company Account to proper state
-- Run this in Supabase SQL Editor

-- Step 1: Check current state of Company Account
SELECT 
  id,
  name,
  phone_no,
  (payment->>'membershipId') as membership_id,
  total_shares,
  created_at,
  'BEFORE FIX - Current Company Account' as status
FROM members 
WHERE payment->>'membershipId' = '2025-002'
   OR name ILIKE '%company%';

-- Step 2: Fix Company Account to proper name and structure
UPDATE members 
SET 
  name = 'Company Account',
  phone_no = '1234567890',  -- Standard company phone
  payment = jsonb_set(
    COALESCE(payment, '{}'::jsonb),
    '{membershipId}',
    '"2025-002"'
  ),
  -- Keep existing activities and total_shares if they exist
  updated_at = NOW()
WHERE payment->>'membershipId' = '2025-002';

-- Step 3: If no Company Account exists, create it
INSERT INTO members (
  phone_no,
  name,
  email,
  address,
  age,
  gender,
  marital_status,
  blood_group,
  occupation,
  specialization,
  relation,
  total_members,
  family_members,
  nominees,
  financial,
  insurance,
  payment,
  activities,
  total_shares,
  created_at,
  updated_at
)
SELECT 
  '1234567890',
  'Company Account',
  'company@example.com',
  'Company Address',
  NULL,
  NULL,
  NULL,
  NULL,
  'Company Entity',
  'Investment Management',
  'Company',
  1,
  '[]'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  '{
    "membershipId": "2025-002",
    "membershipAmount": 0,
    "payingMembershipAmount": 0,
    "dueAmount": 0,
    "paymentStatus": "paid",
    "paymentDate": "2025-01-01"
  }'::jsonb,
  '{}'::jsonb,
  0,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM members WHERE payment->>'membershipId' = '2025-002'
);

-- Step 4: Remove any incorrectly named company entities
DELETE FROM members 
WHERE name ILIKE '%company as individual entity%'
  AND payment->>'membershipId' != '2025-002';

-- Step 5: Verify the fix
SELECT 
  id,
  name,
  phone_no,
  (payment->>'membershipId') as membership_id,
  total_shares,
  created_at,
  'AFTER FIX - Company Account should be correct' as status
FROM members 
WHERE payment->>'membershipId' = '2025-002';

-- Step 6: Check that only one Company Account exists
SELECT 
  COUNT(*) as company_account_count,
  'Should be exactly 1' as expected
FROM members 
WHERE payment->>'membershipId' = '2025-002';

-- Step 7: Show expected structure
SELECT 
  'Expected Company Account' as info,
  'Name: Company Account' as name_should_be,
  'ID: 2025-002' as id_should_be,
  'Purpose: Company-level transactions and investments' as purpose,
  'Access: Via Admin Dashboard > Company Own Account tile' as access_method;
