-- SQL script to create investment data for Harsha and Ganesh
-- Harsha: Random investments Mar-Nov, fine in June
-- Ganesh: Random investments Mar-Nov, fines in May, August, October
-- Run this in Supabase SQL Editor

-- Step 1: Check current state of Harsha and Ganesh
SELECT 
  id,
  name,
  phone_no,
  (payment->>'membershipId') as membership_id,
  total_shares,
  created_at,
  'BEFORE - Current member data' as status
FROM members 
WHERE payment->>'membershipId' IN ('2025-0001', '2025-0002') 
   OR name ILIKE '%harsha%' 
   OR name ILIKE '%ganesh%'
ORDER BY name;

-- Step 2: Create/Update Harsha (2025-0001) with investment data
UPDATE members 
SET 
  activities = '{
    "2025": {
      "Mar": {
        "type": "investment",
        "investment": {
          "amount": 6800,
          "fine": 0,
          "shares": 98.55,
          "sharePrice": 69,
          "date": "2025-03-10"
        }
      },
      "Apr": {
        "type": "investment",
        "investment": {
          "amount": 8500,
          "fine": 0,
          "shares": 123.19,
          "sharePrice": 69,
          "date": "2025-04-10"
        }
      },
      "May": {
        "type": "investment",
        "investment": {
          "amount": 7200,
          "fine": 0,
          "shares": 104.35,
          "sharePrice": 69,
          "date": "2025-05-10"
        }
      },
      "Jun": {
        "type": "investment",
        "investment": {
          "amount": 5900,
          "fine": 300,
          "shares": 85.51,
          "sharePrice": 69,
          "date": "2025-06-10"
        }
      },
      "Jul": {
        "type": "investment",
        "investment": {
          "amount": 9200,
          "fine": 0,
          "shares": 133.33,
          "sharePrice": 69,
          "date": "2025-07-10"
        }
      },
      "Aug": {
        "type": "investment",
        "investment": {
          "amount": 6500,
          "fine": 0,
          "shares": 94.20,
          "sharePrice": 69,
          "date": "2025-08-10"
        }
      },
      "Sep": {
        "type": "investment",
        "investment": {
          "amount": 7800,
          "fine": 0,
          "shares": 113.04,
          "sharePrice": 69,
          "date": "2025-09-10"
        }
      },
      "Oct": {
        "type": "investment",
        "investment": {
          "amount": 5400,
          "fine": 0,
          "shares": 78.26,
          "sharePrice": 69,
          "date": "2025-10-10"
        }
      },
      "Nov": {
        "type": "investment",
        "investment": {
          "amount": 6900,
          "fine": 0,
          "shares": 100.00,
          "sharePrice": 69,
          "date": "2025-11-10"
        }
      }
    }
  }'::jsonb,
  total_shares = 930.43,
  created_at = '2025-03-10T00:00:00Z',
  payment = jsonb_set(
    jsonb_set(
      COALESCE(payment, '{}'::jsonb),
      '{membershipId}',
      '"2025-0001"'
    ),
    '{dateOfJoining}',
    '"2025-03-10"'
  ),
  updated_at = NOW()
WHERE payment->>'membershipId' = '2025-0001' OR name ILIKE '%harsha%';

-- Step 3: Create/Update Ganesh (2025-0002) with investment data and multiple fines
UPDATE members 
SET 
  activities = '{
    "2025": {
      "Mar": {
        "type": "investment",
        "investment": {
          "amount": 7600,
          "fine": 0,
          "shares": 110.14,
          "sharePrice": 69,
          "date": "2025-03-05"
        }
      },
      "Apr": {
        "type": "investment",
        "investment": {
          "amount": 8900,
          "fine": 0,
          "shares": 129.00,
          "sharePrice": 69,
          "date": "2025-04-05"
        }
      },
      "May": {
        "type": "investment",
        "investment": {
          "amount": 6400,
          "fine": 400,
          "shares": 92.75,
          "sharePrice": 69,
          "date": "2025-05-05"
        }
      },
      "Jun": {
        "type": "investment",
        "investment": {
          "amount": 9500,
          "fine": 0,
          "shares": 137.68,
          "sharePrice": 69,
          "date": "2025-06-05"
        }
      },
      "Jul": {
        "type": "investment",
        "investment": {
          "amount": 5800,
          "fine": 0,
          "shares": 84.06,
          "sharePrice": 69,
          "date": "2025-07-05"
        }
      },
      "Aug": {
        "type": "investment",
        "investment": {
          "amount": 7300,
          "fine": 600,
          "shares": 105.80,
          "sharePrice": 69,
          "date": "2025-08-05"
        }
      },
      "Sep": {
        "type": "investment",
        "investment": {
          "amount": 8200,
          "fine": 0,
          "shares": 118.84,
          "sharePrice": 69,
          "date": "2025-09-05"
        }
      },
      "Oct": {
        "type": "investment",
        "investment": {
          "amount": 4800,
          "fine": 350,
          "shares": 69.57,
          "sharePrice": 69,
          "date": "2025-10-05"
        }
      },
      "Nov": {
        "type": "investment",
        "investment": {
          "amount": 6700,
          "fine": 0,
          "shares": 97.10,
          "sharePrice": 69,
          "date": "2025-11-05"
        }
      }
    }
  }'::jsonb,
  total_shares = 944.94,
  created_at = '2025-03-05T00:00:00Z',
  payment = jsonb_set(
    jsonb_set(
      COALESCE(payment, '{}'::jsonb),
      '{membershipId}',
      '"2025-0002"'
    ),
    '{dateOfJoining}',
    '"2025-03-05"'
  ),
  updated_at = NOW()
WHERE payment->>'membershipId' = '2025-0002' OR name ILIKE '%ganesh%';

-- Step 4: Verify both members were updated
SELECT 
  id,
  name,
  phone_no,
  (payment->>'membershipId') as membership_id,
  total_shares,
  created_at,
  'AFTER - Updated member data' as status
FROM members 
WHERE payment->>'membershipId' IN ('2025-0001', '2025-0002')
ORDER BY (payment->>'membershipId');

-- Step 5: Test specific months and fines
SELECT 
  name,
  (payment->>'membershipId') as membership_id,
  'March amount:' as mar_label,
  (activities->'2025'->'Mar'->'investment'->>'amount')::numeric as mar_amount,
  'June fine (Harsha):' as jun_fine_label,
  COALESCE((activities->'2025'->'Jun'->'investment'->>'fine')::numeric, 0) as jun_fine,
  'May fine (Ganesh):' as may_fine_label,
  COALESCE((activities->'2025'->'May'->'investment'->>'fine')::numeric, 0) as may_fine
FROM members 
WHERE payment->>'membershipId' IN ('2025-0001', '2025-0002')
ORDER BY (payment->>'membershipId');

-- Step 6: Show all fines for both members
SELECT 
  name,
  (payment->>'membershipId') as membership_id,
  'May fine:' as may_label,
  COALESCE((activities->'2025'->'May'->'investment'->>'fine')::numeric, 0) as may_fine,
  'June fine:' as jun_label,
  COALESCE((activities->'2025'->'Jun'->'investment'->>'fine')::numeric, 0) as jun_fine,
  'August fine:' as aug_label,
  COALESCE((activities->'2025'->'Aug'->'investment'->>'fine')::numeric, 0) as aug_fine,
  'October fine:' as oct_label,
  COALESCE((activities->'2025'->'Oct'->'investment'->>'fine')::numeric, 0) as oct_fine
FROM members 
WHERE payment->>'membershipId' IN ('2025-0001', '2025-0002')
ORDER BY (payment->>'membershipId');

-- Step 7: Show investment breakdown for Harsha
SELECT 
  'Harsha Investment Details (2025-0001)' as member_name,
  'Mar: ₹6,800 (0 fine) = 98.55 shares' as march,
  'Apr: ₹8,500 (0 fine) = 123.19 shares' as april,
  'May: ₹7,200 (0 fine) = 104.35 shares' as may,
  'Jun: ₹5,900 (₹300 fine) = 85.51 shares' as june,
  'Jul: ₹9,200 (0 fine) = 133.33 shares' as july,
  'Aug: ₹6,500 (0 fine) = 94.20 shares' as august,
  'Sep: ₹7,800 (0 fine) = 113.04 shares' as september,
  'Oct: ₹5,400 (0 fine) = 78.26 shares' as october,
  'Nov: ₹6,900 (0 fine) = 100.00 shares' as november;

-- Step 8: Show investment breakdown for Ganesh
SELECT 
  'Ganesh Investment Details (2025-0002)' as member_name,
  'Mar: ₹7,600 (0 fine) = 110.14 shares' as march,
  'Apr: ₹8,900 (0 fine) = 129.00 shares' as april,
  'May: ₹6,400 (₹400 fine) = 92.75 shares' as may,
  'Jun: ₹9,500 (0 fine) = 137.68 shares' as june,
  'Jul: ₹5,800 (0 fine) = 84.06 shares' as july,
  'Aug: ₹7,300 (₹600 fine) = 105.80 shares' as august,
  'Sep: ₹8,200 (0 fine) = 118.84 shares' as september,
  'Oct: ₹4,800 (₹350 fine) = 69.57 shares' as october,
  'Nov: ₹6,700 (0 fine) = 97.10 shares' as november;

-- Step 9: Summary for both members
SELECT 
  'Investment Summary' as title,
  'Harsha (2025-0001): ₹64,200 total, ₹300 fine (June), 930.43 shares, joined Mar 10' as harsha_summary,
  'Ganesh (2025-0002): ₹65,500 total, ₹1,350 fines (May ₹400 + Aug ₹600 + Oct ₹350), 944.94 shares, joined Mar 5' as ganesh_summary,
  'Both should show 10 months (Mar-Dec) in UI' as expected_ui_result;

-- Step 10: Check member_summary view
SELECT 
  name,
  membership_id,
  total_shares,
  created_at
FROM member_summary
WHERE membership_id IN ('2025-0001', '2025-0002')
ORDER BY membership_id;
