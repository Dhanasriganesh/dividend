-- Migration script to convert share_prices table from monthly to rolling quarterly system
-- Run this in Supabase SQL Editor

-- Step 1: Add quarter column
ALTER TABLE share_prices ADD COLUMN quarter VARCHAR(20);

-- Step 2: Create a function to determine rolling quarter from month and year
CREATE OR REPLACE FUNCTION get_rolling_quarter_from_month(month_name VARCHAR(10), year_val INTEGER)
RETURNS VARCHAR(20) AS $$
BEGIN
  CASE month_name
    WHEN 'Jan', 'Feb', 'Mar' THEN RETURN 'Jan-Mar-' || year_val;
    WHEN 'Apr', 'May', 'Jun' THEN RETURN 'Apr-Jun-' || year_val;
    WHEN 'Jul', 'Aug', 'Sep' THEN RETURN 'Jul-Sep-' || year_val;
    WHEN 'Oct', 'Nov', 'Dec' THEN RETURN 'Oct-Dec-' || year_val;
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update existing records to set quarter based on month and year
UPDATE share_prices 
SET quarter = get_rolling_quarter_from_month(month, year);

-- Step 4: Make quarter column NOT NULL
ALTER TABLE share_prices ALTER COLUMN quarter SET NOT NULL;

-- Step 5: Update unique constraint to use quarter instead of month
ALTER TABLE share_prices DROP CONSTRAINT IF EXISTS share_prices_year_month_key;
ALTER TABLE share_prices ADD CONSTRAINT share_prices_year_quarter_key UNIQUE (year, quarter);

-- Step 6: Update index to use quarter instead of month
DROP INDEX IF EXISTS idx_share_prices_year_month;
CREATE INDEX idx_share_prices_year_quarter ON share_prices(year, quarter);

-- Step 7: Make month column nullable or remove it
-- Option 1: Make month column nullable (recommended for backward compatibility)
ALTER TABLE share_prices ALTER COLUMN month DROP NOT NULL;

-- Option 2: Remove month column completely (uncomment if you want to remove it)
-- ALTER TABLE share_prices DROP COLUMN month;

-- Step 8: Clean up the function (optional)
-- DROP FUNCTION get_rolling_quarter_from_month(VARCHAR(10), INTEGER);

-- Verify the changes
SELECT * FROM share_prices ORDER BY year DESC, quarter DESC;
