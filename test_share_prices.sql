-- Test SQL queries to check share_prices table structure
-- Run these in Supabase SQL Editor

-- 1. Check if share_prices table exists and its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'share_prices' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check existing data in share_prices table
SELECT * FROM share_prices ORDER BY year DESC, month DESC LIMIT 10;

-- 3. Check if there are any constraints or indexes
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'share_prices' AND tc.table_schema = 'public';

-- 4. Try to insert a test record (remove this after testing)
-- INSERT INTO share_prices (year, month, price, created_at, updated_at) 
-- VALUES (2025, 'Oct', 0.03, NOW(), NOW());



