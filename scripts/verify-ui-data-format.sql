-- Verify data format matches what UI expects
-- Run this to see exactly what the UI should receive

-- Check the exact data structure the UI gets
SELECT 
  name,
  (payment->>'membershipId') as membership_id,
  jsonb_pretty(activities->'2025') as activities_2025_formatted
FROM members 
WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
ORDER BY (payment->>'membershipId');

-- Check if all required fields are present for each month
SELECT 
  name,
  (payment->>'membershipId') as membership_id,
  'Mar' as month,
  activities->'2025'->'Mar'->'type' as type,
  activities->'2025'->'Mar'->'investment'->>'amount' as amount,
  activities->'2025'->'Mar'->'investment'->>'fine' as fine,
  activities->'2025'->'Mar'->'investment'->>'shares' as shares,
  activities->'2025'->'Mar'->'investment'->>'date' as date
FROM members 
WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
UNION ALL
SELECT 
  name,
  (payment->>'membershipId') as membership_id,
  'Apr' as month,
  activities->'2025'->'Apr'->'type' as type,
  activities->'2025'->'Apr'->'investment'->>'amount' as amount,
  activities->'2025'->'Apr'->'investment'->>'fine' as fine,
  activities->'2025'->'Apr'->'investment'->>'shares' as shares,
  activities->'2025'->'Apr'->'investment'->>'date' as date
FROM members 
WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
ORDER BY membership_id, month;
