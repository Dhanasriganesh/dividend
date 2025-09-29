-- Supabase Database Schema for Investment Management System
-- Run these SQL commands in your Supabase SQL Editor

-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_no VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  age INTEGER,
  gender VARCHAR(20),
  marital_status VARCHAR(20),
  blood_group VARCHAR(10),
  occupation VARCHAR(255),
  specialization VARCHAR(255),
  relation VARCHAR(255), -- S/O, D/O, M/O
  total_members INTEGER,
  family_members JSONB DEFAULT '[]'::jsonb,
  nominees JSONB DEFAULT '[]'::jsonb,
  financial JSONB DEFAULT '{}'::jsonb,
  insurance JSONB DEFAULT '{}'::jsonb,
  payment JSONB DEFAULT '{}'::jsonb,
  activities JSONB DEFAULT '{}'::jsonb,
  payments JSONB DEFAULT '{}'::jsonb, -- Legacy structure
  total_shares DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create share_prices table
CREATE TABLE IF NOT EXISTS share_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month VARCHAR(10) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year, month)
);

-- Create company_transactions table
CREATE TABLE IF NOT EXISTS company_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  member_name VARCHAR(255),
  membership_id VARCHAR(50),
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  fine DECIMAL(15,2) DEFAULT 0,
  year INTEGER,
  month VARCHAR(10),
  custom_receipt VARCHAR(255),
  share_price DECIMAL(10,2),
  shares DECIMAL(15,2),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_phone_no ON members(phone_no);
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
CREATE INDEX IF NOT EXISTS idx_share_prices_year_month ON share_prices(year, month);
CREATE INDEX IF NOT EXISTS idx_company_transactions_member_id ON company_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_company_transactions_created_at ON company_transactions(created_at);

-- Enable Row Level Security on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your auth requirements)
-- For now, allowing all operations for authenticated users
-- You may want to restrict this based on user roles

-- Members table policies
CREATE POLICY "Allow all operations for authenticated users" ON members
  FOR ALL USING (auth.role() = 'authenticated');

-- Share prices table policies
CREATE POLICY "Allow all operations for authenticated users" ON share_prices
  FOR ALL USING (auth.role() = 'authenticated');

-- Company transactions table policies
CREATE POLICY "Allow all operations for authenticated users" ON company_transactions
  FOR ALL USING (auth.role() = 'authenticated');

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_share_prices_updated_at BEFORE UPDATE ON share_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
-- You can uncomment these if you want sample data

-- INSERT INTO share_prices (year, month, price) VALUES 
-- (2024, 'Jan', 100.00),
-- (2024, 'Feb', 105.00),
-- (2024, 'Mar', 110.00);

-- Create a view for member summary (optional)
CREATE OR REPLACE VIEW member_summary AS
SELECT 
  id,
  phone_no,
  name,
  email,
  (payment->>'membershipId')::text as membership_id,
  (payment->>'payingMembershipAmount')::decimal as membership_amount,
  total_shares,
  created_at,
  updated_at
FROM members
WHERE payment IS NOT NULL AND payment != '{}'::jsonb;

-- Grant permissions
GRANT ALL ON members TO authenticated;
GRANT ALL ON share_prices TO authenticated;
GRANT ALL ON company_transactions TO authenticated;
GRANT ALL ON member_summary TO authenticated;

