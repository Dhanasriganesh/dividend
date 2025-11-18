-- Fix dividend_donation_events table schema
-- Run this in Supabase SQL Editor to fix integer fields that should be numeric

-- Step 1: Drop the view if it exists (it depends on columns we need to alter)
drop view if exists public.dividend_donation_summary cascade;

-- Step 2: Create table if it doesn't exist with correct schema
create table if not exists public.dividend_donation_events (
  id uuid primary key default gen_random_uuid(),
  event_name varchar(255),
  event_date date not null,
  share_price_at_event numeric(10,2) not null,
  distribution_pool numeric(15,2) not null,
  company_investment_amount numeric(15,2) not null,
  company_shares_purchased numeric(15,2) not null,
  status varchar(50) default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Step 3: Fix existing table if fields are integer instead of numeric
do $$ 
begin
  -- Check and alter share_price_at_event if it's integer
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'dividend_donation_events' 
    and column_name = 'share_price_at_event' 
    and data_type = 'integer'
  ) then
    alter table public.dividend_donation_events 
    alter column share_price_at_event type numeric(10,2) using share_price_at_event::numeric(10,2);
    raise notice 'Fixed share_price_at_event: integer -> numeric(10,2)';
  end if;
  
  -- Check and alter distribution_pool if it's integer
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'dividend_donation_events' 
    and column_name = 'distribution_pool' 
    and data_type = 'integer'
  ) then
    alter table public.dividend_donation_events 
    alter column distribution_pool type numeric(15,2) using distribution_pool::numeric(15,2);
    raise notice 'Fixed distribution_pool: integer -> numeric(15,2)';
  end if;
  
  -- Check and alter company_investment_amount if it's integer
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'dividend_donation_events' 
    and column_name = 'company_investment_amount' 
    and data_type = 'integer'
  ) then
    alter table public.dividend_donation_events 
    alter column company_investment_amount type numeric(15,2) using company_investment_amount::numeric(15,2);
    raise notice 'Fixed company_investment_amount: integer -> numeric(15,2)';
  end if;
  
  -- Check and alter company_shares_purchased if it's integer
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'dividend_donation_events' 
    and column_name = 'company_shares_purchased' 
    and data_type = 'integer'
  ) then
    alter table public.dividend_donation_events 
    alter column company_shares_purchased type numeric(15,2) using company_shares_purchased::numeric(15,2);
    raise notice 'Fixed company_shares_purchased: integer -> numeric(15,2)';
  end if;
  
  raise notice 'Schema check completed';
end $$;

-- Step 4: Recreate the view (if it was dropped)
-- Note: Adjust this view definition based on your actual view structure
-- This is a placeholder - you may need to check your Supabase dashboard for the exact view definition
create or replace view public.dividend_donation_summary as
select
  id,
  event_name,
  event_date,
  share_price_at_event,
  distribution_pool,
  company_investment_amount,
  company_shares_purchased,
  status,
  created_at,
  updated_at
from public.dividend_donation_events;


