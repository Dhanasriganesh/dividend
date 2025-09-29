/* eslint-disable no-console */
// Local script to create Supabase tables directly via SQL over Postgres
// Requires a direct Postgres connection string (service role) in .env as SUPABASE_DATABASE_URL

import 'dotenv/config'
import pg from 'pg'

const { Client } = pg

const sql = `
create extension if not exists "pgcrypto";

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  phone_no varchar(20) unique not null,
  name varchar(255) not null,
  email varchar(255),
  address text,
  age integer,
  gender varchar(20),
  marital_status varchar(20),
  blood_group varchar(10),
  occupation varchar(255),
  specialization varchar(255),
  relation varchar(255),
  total_members integer,
  family_members jsonb not null default '[]'::jsonb,
  nominees jsonb not null default '[]'::jsonb,
  financial jsonb not null default '{}'::jsonb,
  insurance jsonb not null default '{}'::jsonb,
  payment jsonb not null default '{}'::jsonb,
  activities jsonb not null default '{}'::jsonb,
  payments jsonb not null default '{}'::jsonb,
  total_shares numeric(15,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.share_prices (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  month varchar(10) not null,
  price numeric(10,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, month)
);

create table if not exists public.company_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete cascade,
  member_name varchar(255),
  membership_id varchar(50),
  type varchar(50) not null,
  amount numeric(15,2) not null,
  fine numeric(15,2) not null default 0,
  year integer,
  month varchar(10),
  custom_receipt varchar(255),
  share_price numeric(10,2),
  shares numeric(15,2),
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_members_phone_no on public.members(phone_no);
create index if not exists idx_members_name on public.members(name);
create index if not exists idx_share_prices_year_month on public.share_prices(year, month);
create index if not exists idx_company_tx_member_id on public.company_transactions(member_id);
create index if not exists idx_company_tx_created_at on public.company_transactions(created_at);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_members_updated_at on public.members;
create trigger trg_members_updated_at
before update on public.members
for each row execute function public.set_updated_at();

drop trigger if exists trg_share_prices_updated_at on public.share_prices;
create trigger trg_share_prices_updated_at
before update on public.share_prices
for each row execute function public.set_updated_at();

alter table public.members enable row level security;
alter table public.share_prices enable row level security;
alter table public.company_transactions enable row level security;

-- permissive RLS for authenticated role (adjust as needed)
do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'members_all_authenticated' and tablename = 'members' and schemaname = 'public'
  ) then
    create policy members_all_authenticated on public.members for all to authenticated using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where policyname = 'share_prices_all_authenticated' and tablename = 'share_prices' and schemaname = 'public'
  ) then
    create policy share_prices_all_authenticated on public.share_prices for all to authenticated using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where policyname = 'company_tx_all_authenticated' and tablename = 'company_transactions' and schemaname = 'public'
  ) then
    create policy company_tx_all_authenticated on public.company_transactions for all to authenticated using (true) with check (true);
  end if;
end $$;

create or replace view public.member_summary as
select
  id,
  phone_no,
  name,
  email,
  (payment->>'membershipId')::text as membership_id,
  (payment->>'payingMembershipAmount')::numeric as membership_amount,
  total_shares,
  created_at,
  updated_at
from public.members
where payment is not null and payment::text <> '{}';
grant select on public.member_summary to authenticated;
`

async function main() {
  const databaseUrl = process.env.SUPABASE_DATABASE_URL
  if (!databaseUrl) {
    console.error('Missing SUPABASE_DATABASE_URL in .env')
    process.exit(1)
  }
  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    await client.query('begin')
    await client.query(sql)
    await client.query('commit')
    console.log('Supabase database objects created/ensured successfully.')
  } catch (err) {
    await client.query('rollback')
    console.error('Failed to create database objects:', err)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

main()


