-- Migration for Dividend Donation System
-- This script creates the necessary tables and indexes for dividend donation events

-- 1. Create dividend_donation_events table
CREATE TABLE IF NOT EXISTS dividend_donation_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_date DATE NOT NULL,
  event_name VARCHAR(255),
  share_price_at_event DECIMAL(10,2) NOT NULL,
  distribution_pool DECIMAL(15,2) NOT NULL,
  min_holding_months INTEGER NOT NULL DEFAULT 12,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'completed')),
  total_eligible_shares INTEGER DEFAULT 0,
  total_eligible_members INTEGER DEFAULT 0,
  company_investment_amount DECIMAL(15,2) DEFAULT 0,
  company_shares_purchased INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Create dividend_donation_allocations table
CREATE TABLE IF NOT EXISTS dividend_donation_allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES dividend_donation_events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  eligible_shares INTEGER NOT NULL DEFAULT 0,
  allocated_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  payment_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dividend_events_date ON dividend_donation_events(event_date);
CREATE INDEX IF NOT EXISTS idx_dividend_events_status ON dividend_donation_events(status);
CREATE INDEX IF NOT EXISTS idx_dividend_events_created_at ON dividend_donation_events(created_at);

CREATE INDEX IF NOT EXISTS idx_dividend_allocations_event ON dividend_donation_allocations(event_id);
CREATE INDEX IF NOT EXISTS idx_dividend_allocations_member ON dividend_donation_allocations(member_id);
CREATE INDEX IF NOT EXISTS idx_dividend_allocations_status ON dividend_donation_allocations(status);

-- 4. Create RLS policies
ALTER TABLE dividend_donation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividend_donation_allocations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all events and allocations
CREATE POLICY "Allow authenticated users to read dividend events" 
ON dividend_donation_events FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to read dividend allocations" 
ON dividend_donation_allocations FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to insert/update events (admin operations)
CREATE POLICY "Allow authenticated users to manage dividend events" 
ON dividend_donation_events FOR ALL 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to manage dividend allocations" 
ON dividend_donation_allocations FOR ALL 
TO authenticated 
USING (true);

-- 5. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dividend_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_dividend_allocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers for updated_at
CREATE TRIGGER update_dividend_events_updated_at
  BEFORE UPDATE ON dividend_donation_events
  FOR EACH ROW
  EXECUTE FUNCTION update_dividend_events_updated_at();

CREATE TRIGGER update_dividend_allocations_updated_at
  BEFORE UPDATE ON dividend_donation_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_dividend_allocations_updated_at();

-- 7. Add dividend donation fields to members table (if not exists)
DO $$ 
BEGIN
  -- Add dividend donation tracking fields to members table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'members' AND column_name = 'dividend_donation_data'
  ) THEN
    ALTER TABLE members ADD COLUMN dividend_donation_data JSONB DEFAULT '{}';
  END IF;
END $$;

-- 8. Create index on dividend_donation_data
CREATE INDEX IF NOT EXISTS idx_members_dividend_donation_data 
ON members USING GIN (dividend_donation_data);

-- 9. Create function to calculate eligible shares for a member at a specific date
CREATE OR REPLACE FUNCTION calculate_eligible_shares(
  p_member_id UUID,
  p_event_date DATE,
  p_min_holding_months INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  eligible_shares INTEGER := 0;
  member_record RECORD;
  investment_date DATE;
  months_held INTEGER;
BEGIN
  -- Get member's total shares
  SELECT total_shares INTO member_record FROM members WHERE id = p_member_id;
  
  IF member_record IS NULL OR member_record.total_shares IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Get member's investment date from payment data
  SELECT (payment->>'dateOfJoining')::DATE INTO investment_date
  FROM members 
  WHERE id = p_member_id;
  
  IF investment_date IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate months held
  months_held := EXTRACT(YEAR FROM AGE(p_event_date, investment_date)) * 12 + 
                 EXTRACT(MONTH FROM AGE(p_event_date, investment_date));
  
  -- If member has held for minimum period, return all shares
  IF months_held >= p_min_holding_months THEN
    RETURN member_record.total_shares;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 10. Create view for dividend donation summary
CREATE OR REPLACE VIEW dividend_donation_summary AS
SELECT 
  e.id as event_id,
  e.event_date,
  e.event_name,
  e.share_price_at_event,
  e.distribution_pool,
  e.min_holding_months,
  e.status,
  e.total_eligible_shares,
  e.total_eligible_members,
  e.company_investment_amount,
  e.company_shares_purchased,
  COUNT(a.id) as total_allocations,
  COUNT(CASE WHEN a.status = 'paid' THEN 1 END) as paid_allocations,
  COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_allocations,
  SUM(a.allocated_amount) as total_allocated_amount,
  e.created_at
FROM dividend_donation_events e
LEFT JOIN dividend_donation_allocations a ON e.id = a.event_id
GROUP BY e.id, e.event_date, e.event_name, e.share_price_at_event, 
         e.distribution_pool, e.min_holding_months, e.status,
         e.total_eligible_shares, e.total_eligible_members,
         e.company_investment_amount, e.company_shares_purchased, e.created_at
ORDER BY e.event_date DESC;

COMMENT ON TABLE dividend_donation_events IS 'Stores dividend donation events with eligibility rules and distribution details';
COMMENT ON TABLE dividend_donation_allocations IS 'Stores individual member allocations for each dividend donation event';
COMMENT ON VIEW dividend_donation_summary IS 'Summary view of dividend donation events with allocation statistics';
