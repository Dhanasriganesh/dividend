#!/usr/bin/env node
/**
 * Utility script to wipe legacy company investment data so that
 * "Total Invested" matches "Total Company Income".
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/reset-company-investments.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  COMPANY_MEMBERSHIP_ID = '2025-002',
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchCompanyMember() {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, activities, total_shares, payment, payment_membership_id')
    .or(`payment_membership_id.eq.${COMPANY_MEMBERSHIP_ID},payment->>membershipId.eq.${COMPANY_MEMBERSHIP_ID}`)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Company member ${COMPANY_MEMBERSHIP_ID} not found`);
  return data;
}

async function deleteCompanyTransactions() {
  const { error, count } = await supabase
    .from('company_transactions')
    .delete({ count: 'estimated' })
    .eq('membership_id', COMPANY_MEMBERSHIP_ID);

  if (error) throw error;
  return count ?? 0;
}

async function resetCompanyMember(company) {
  const { error } = await supabase
    .from('members')
    .update({
      activities: {},
      total_shares: 0,
    })
    .eq('id', company.id);

  if (error) throw error;
}

async function main() {
  console.log('Fetching company member...');
  const company = await fetchCompanyMember();
  console.log(`Found company member: ${company.name || 'Company Account'} (${company.id})`);

  console.log('Deleting company investment transactions...');
  const deleted = await deleteCompanyTransactions();
  console.log(`Deleted ${deleted} legacy company transaction(s).`);

  console.log('Resetting company member share history...');
  await resetCompanyMember(company);
  console.log('Company member activities cleared and total_shares reset to 0.');

  console.log('All done ✅');
}

main().catch((err) => {
  console.error('Failed to reset company investments:', err);
  process.exit(1);
});


