-- Comprehensive diagnostic and fix script for both Sandesh and Goutham
-- Run this in Supabase SQL Editor

-- Step 1: Check current state of both members
SELECT 
  name,
  (payment->>'membershipId') as membership_id,
  total_shares,
  created_at,
  'Current member data' as status
FROM members 
WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
ORDER BY (payment->>'membershipId');

-- Step 2: Check activities structure for both members
SELECT 
  name,
  (payment->>'membershipId') as membership_id,
  'Activities check:' as note,
  CASE 
    WHEN activities IS NULL THEN 'NULL activities'
    WHEN activities = '{}'::jsonb THEN 'Empty activities {}'
    WHEN activities->'2025' IS NULL THEN 'No 2025 data'
    ELSE 'Has 2025 data'
  END as activities_status,
  jsonb_pretty(activities) as current_activities
FROM members 
WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
ORDER BY (payment->>'membershipId');

-- Step 3: Fix Sandesh (2025-0003) completely
UPDATE members 
SET 
  activities = '{
    "2025": {
      "Mar": {
        "type": "investment",
        "investment": {
          "amount": 7500,
          "fine": 0,
          "shares": 108.70,
          "sharePrice": 69,
          "date": "2025-03-15"
        }
      },
      "Apr": {
        "type": "investment",
        "investment": {
          "amount": 6200,
          "fine": 500,
          "shares": 97.10,
          "sharePrice": 69,
          "date": "2025-04-15"
        }
      },
      "May": {
        "type": "investment",
        "investment": {
          "amount": 9800,
          "fine": 0,
          "shares": 142.03,
          "sharePrice": 69,
          "date": "2025-05-15"
        }
      },
      "Jun": {
        "type": "investment",
        "investment": {
          "amount": 5500,
          "fine": 0,
          "shares": 79.71,
          "sharePrice": 69,
          "date": "2025-06-15"
        }
      },
      "Jul": {
        "type": "investment",
        "investment": {
          "amount": 8300,
          "fine": 0,
          "shares": 120.29,
          "sharePrice": 69,
          "date": "2025-07-15"
        }
      },
      "Aug": {
        "type": "investment",
        "investment": {
          "amount": 7100,
          "fine": 0,
          "shares": 102.90,
          "sharePrice": 69,
          "date": "2025-08-15"
        }
      },
      "Sep": {
        "type": "investment",
        "investment": {
          "amount": 6800,
          "fine": 0,
          "shares": 98.55,
          "sharePrice": 69,
          "date": "2025-09-15"
        }
      },
      "Oct": {
        "type": "investment",
        "investment": {
          "amount": 4900,
          "fine": 0,
          "shares": 71.01,
          "sharePrice": 69,
          "date": "2025-10-15"
        }
      },
      "Nov": {
        "type": "investment",
        "investment": {
          "amount": 5800,
          "fine": 0,
          "shares": 84.06,
          "sharePrice": 69,
          "date": "2025-11-15"
        }
      }
    }
  }'::jsonb,
  total_shares = 904.35,
  created_at = '2025-03-15T00:00:00Z',
  updated_at = NOW()
WHERE payment->>'membershipId' = '2025-0003';

-- Step 4: Fix Goutham (2025-0004) completely
UPDATE members 
SET 
  activities = '{
    "2025": {
      "Mar": {
        "type": "investment",
        "investment": {
          "amount": 8000,
          "fine": 0,
          "shares": 115.94,
          "sharePrice": 69,
          "date": "2025-03-26"
        }
      },
      "Apr": {
        "type": "investment",
        "investment": {
          "amount": 9000,
          "fine": 0,
          "shares": 130.43,
          "sharePrice": 69,
          "date": "2025-04-26"
        }
      },
      "May": {
        "type": "investment",
        "investment": {
          "amount": 12000,
          "fine": 0,
          "shares": 173.91,
          "sharePrice": 69,
          "date": "2025-05-26"
        }
      },
      "Jun": {
        "type": "investment",
        "investment": {
          "amount": 6000,
          "fine": 0,
          "shares": 86.96,
          "sharePrice": 69,
          "date": "2025-06-26"
        }
      },
      "Jul": {
        "type": "investment",
        "investment": {
          "amount": 5000,
          "fine": 0,
          "shares": 72.46,
          "sharePrice": 69,
          "date": "2025-07-26"
        }
      },
      "Aug": {
        "type": "investment",
        "investment": {
          "amount": 8000,
          "fine": 0,
          "shares": 115.94,
          "sharePrice": 69,
          "date": "2025-08-26"
        }
      },
      "Sep": {
        "type": "investment",
        "investment": {
          "amount": 7000,
          "fine": 0,
          "shares": 101.45,
          "sharePrice": 69,
          "date": "2025-09-26"
        }
      },
      "Oct": {
        "type": "investment",
        "investment": {
          "amount": 4000,
          "fine": 0,
          "shares": 57.97,
          "sharePrice": 69,
          "date": "2025-10-26"
        }
      },
      "Nov": {
        "type": "investment",
        "investment": {
          "amount": 5000,
          "fine": 0,
          "shares": 72.46,
          "sharePrice": 69,
          "date": "2025-11-26"
        }
      }
    }
  }'::jsonb,
  total_shares = 927.52,
  created_at = '2025-03-26T00:00:00Z',
  updated_at = NOW()
WHERE payment->>'membershipId' = '2025-0004';

-- Step 5: Verify both fixes worked
SELECT 
  name,
  (payment->>'membershipId') as membership_id,
  total_shares,
  created_at,
  'AFTER FIX - Updated data' as status
FROM members 
WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
ORDER BY (payment->>'membershipId');

-- Step 6: Test specific months for both members
SELECT 
  name,
  (payment->>'membershipId') as membership_id,
  'March amount:' as label,
  (activities->'2025'->'Mar'->'investment'->>'amount')::numeric as march_amount,
  'April amount:' as label2,
  (activities->'2025'->'Apr'->'investment'->>'amount')::numeric as april_amount,
  'April fine:' as label3,
  COALESCE((activities->'2025'->'Apr'->'investment'->>'fine')::numeric, 0) as april_fine
FROM members 
WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
ORDER BY (payment->>'membershipId');

-- Step 7: Show all available months for both members
WITH member_months AS (
  SELECT 
    name,
    (payment->>'membershipId') as membership_id,
    'Mar' as month, (activities->'2025'->'Mar'->'investment'->>'amount')::numeric as amount
  FROM members WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
  UNION ALL
  SELECT 
    name,
    (payment->>'membershipId') as membership_id,
    'Apr' as month, (activities->'2025'->'Apr'->'investment'->>'amount')::numeric as amount
  FROM members WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
  UNION ALL
  SELECT 
    name,
    (payment->>'membershipId') as membership_id,
    'May' as month, (activities->'2025'->'May'->'investment'->>'amount')::numeric as amount
  FROM members WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
  UNION ALL
  SELECT 
    name,
    (payment->>'membershipId') as membership_id,
    'Jun' as month, (activities->'2025'->'Jun'->'investment'->>'amount')::numeric as amount
  FROM members WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
  UNION ALL
  SELECT 
    name,
    (payment->>'membershipId') as membership_id,
    'Jul' as month, (activities->'2025'->'Jul'->'investment'->>'amount')::numeric as amount
  FROM members WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
  UNION ALL
  SELECT 
    name,
    (payment->>'membershipId') as membership_id,
    'Aug' as month, (activities->'2025'->'Aug'->'investment'->>'amount')::numeric as amount
  FROM members WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
  UNION ALL
  SELECT 
    name,
    (payment->>'membershipId') as membership_id,
    'Sep' as month, (activities->'2025'->'Sep'->'investment'->>'amount')::numeric as amount
  FROM members WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
  UNION ALL
  SELECT 
    name,
    (payment->>'membershipId') as membership_id,
    'Oct' as month, (activities->'2025'->'Oct'->'investment'->>'amount')::numeric as amount
  FROM members WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
  UNION ALL
  SELECT 
    name,
    (payment->>'membershipId') as membership_id,
    'Nov' as month, (activities->'2025'->'Nov'->'investment'->>'amount')::numeric as amount
  FROM members WHERE payment->>'membershipId' IN ('2025-0003', '2025-0004')
)
SELECT 
  name,
  membership_id,
  month,
  amount,
  CASE WHEN amount IS NOT NULL THEN '✓' ELSE '✗' END as has_data
FROM member_months
WHERE amount IS NOT NULL
ORDER BY membership_id, 
  CASE month
    WHEN 'Mar' THEN 1
    WHEN 'Apr' THEN 2
    WHEN 'May' THEN 3
    WHEN 'Jun' THEN 4
    WHEN 'Jul' THEN 5
    WHEN 'Aug' THEN 6
    WHEN 'Sep' THEN 7
    WHEN 'Oct' THEN 8
    WHEN 'Nov' THEN 9
  END;

-- Step 8: Final summary
SELECT 
  'Summary for both members' as title,
  'Sandesh (2025-0003): Mar-Nov 2025, ₹61,900 total, ₹500 April fine' as sandesh_summary,
  'Goutham (2025-0004): Mar-Nov 2025, ₹64,000 total, no fines' as goutham_summary,
  'Both should show 9 months of data in UI' as expected_result;
