-- Fix joining dates so UI shows all months correctly
-- The UI uses created_at and payment.dateOfJoining to determine which months to show

-- Step 1: Check current created_at dates
SELECT 
  name,
  (payment->>'membershipId') as membership_id,
  created_at,
  (payment->>'dateOfJoining') as payment_date_of_joining,
  'BEFORE FIX - Current dates' as status
FROM members 
WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
ORDER BY (payment->>'membershipId');

-- Step 2: Fix Sandesh's dates (should join March 15, 2025)
UPDATE members 
SET 
  created_at = '2025-03-15T00:00:00Z',
  payment = jsonb_set(
    COALESCE(payment, '{}'::jsonb),
    '{dateOfJoining}',
    '"2025-03-15"'
  ),
  updated_at = NOW()
WHERE payment->>'membershipId' = '2025-0003';

-- Step 3: Fix Goutham's dates (should join March 26, 2025)
UPDATE members 
SET 
  created_at = '2025-03-26T00:00:00Z',
  payment = jsonb_set(
    COALESCE(payment, '{}'::jsonb),
    '{dateOfJoining}',
    '"2025-03-26"'
  ),
  updated_at = NOW()
WHERE payment->>'membershipId' = '2025-0004';

-- Step 4: Verify the fixes
SELECT 
  name,
  (payment->>'membershipId') as membership_id,
  created_at,
  (payment->>'dateOfJoining') as payment_date_of_joining,
  'AFTER FIX - Updated dates' as status
FROM members 
WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
ORDER BY (payment->>'membershipId');

-- Step 5: Calculate what months should be visible in UI
SELECT 
  name,
  (payment->>'membershipId') as membership_id,
  created_at,
  EXTRACT(YEAR FROM created_at) as starting_year,
  EXTRACT(MONTH FROM created_at) - 1 as starting_month_index,
  CASE 
    WHEN EXTRACT(MONTH FROM created_at) = 3 THEN 'March (index 2) - should show Mar-Dec'
    WHEN EXTRACT(MONTH FROM created_at) = 4 THEN 'April (index 3) - should show Apr-Dec'
    ELSE 'Other month'
  END as expected_ui_behavior
FROM members 
WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
ORDER BY (payment->>'membershipId');

-- Step 6: Show what the UI logic will calculate
SELECT 
  'UI Logic Explanation' as info,
  'Sandesh: created_at = March 15 → startingMonthIndex = 2 → shows months 2-11 (Mar-Dec)' as sandesh_logic,
  'Goutham: created_at = March 26 → startingMonthIndex = 2 → shows months 2-11 (Mar-Dec)' as goutham_logic,
  'Both should now show 10 months: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec' as expected_result;

-- Step 7: Verify member_summary view reflects the changes
SELECT 
  name,
  membership_id,
  total_shares,
  created_at
FROM member_summary
WHERE membership_id IN ('2025-0003', '2025-0004')
ORDER BY membership_id;
