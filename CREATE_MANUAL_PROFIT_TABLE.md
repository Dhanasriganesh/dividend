# Create Manual Profit Entries Table

## Error Fix
The error `404 (Not Found)` for `manual_profit_entries` means the table doesn't exist in your Supabase database.

## Solution
Run this SQL in your **Supabase Dashboard → SQL Editor**:

```sql
-- Create manual_profit_entries table for admin to set profit amounts manually
CREATE TABLE manual_profit_entries (
  id SERIAL PRIMARY KEY,
  profit_amount DECIMAL(15,2) NOT NULL,
  description TEXT DEFAULT 'Manual profit entry',
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies
ALTER TABLE manual_profit_entries ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (admin/employees)
CREATE POLICY "Allow all operations for authenticated users" ON manual_profit_entries
  FOR ALL USING (true);

-- Create index for better performance
CREATE INDEX idx_manual_profit_entries_active ON manual_profit_entries(is_active, created_at DESC);

-- Insert a sample entry
INSERT INTO manual_profit_entries (profit_amount, description, is_active, created_by) 
VALUES (0.00, 'Initial entry - please set actual profit amount', true, 'system');
```

## Steps:
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Paste the SQL above
4. Click "Run" button
5. Refresh your application

The manual profit entry functionality should work after creating this table.
