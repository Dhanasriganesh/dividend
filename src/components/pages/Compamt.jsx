import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/config';

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function Compamt() {
  const [members, setMembers] = useState([]);
  const [companyTransactions, setCompanyTransactions] = useState([]);
  const [investing, setInvesting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase.from('members').select('*');
      if (!error) setMembers(data || []);
    };
    fetchMembers();
    const sub = supabase
      .channel('members_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, fetchMembers)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, []);

  useEffect(() => {
    const fetchTx = async () => {
      const { data, error } = await supabase.from('company_transactions').select('*');
      if (!error) setCompanyTransactions(data || []);
    };
    fetchTx();
    const sub = supabase
      .channel('company_tx_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_transactions' }, fetchTx)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, []);

  // Registration amounts captured during member registration (final step Payment.jsx)
  const registrationRows = useMemo(() => {
    return members
      .map((m) => {
        const payment = m.payment || {};
        const amount = parseFloat(payment.payingMembershipAmount || 0) || 0;
        if (amount <= 0) return null;
        return {
          name: m.name || '',
          phone: m.phoneNo || m.mobile || '',
          membershipId: payment.membershipId || '',
          dateOfJoining: payment.dateOfJoining || '',
          amount,
        };
      })
      .filter(Boolean);
  }, [members]);

  const fineRows = useMemo(() => {
    const rows = [];
    members.forEach((m) => {
      // Prefer fines stored under activities -> investment (new), fallback to legacy payments fine
      const activities = m.activities || {};
      Object.keys(activities).forEach((yearKey) => {
        const yearMap = activities[yearKey] || {};
        months.forEach((mon) => {
          const act = yearMap[mon];
          const inv = act?.investment || (act?.type === 'investment' ? act : null);
          const fine = inv ? parseFloat(inv.fine || 0) || 0 : 0;
          if (fine > 0) {
            rows.push({
              name: m.name || '',
              phone: m.phoneNo || m.mobile || '',
              year: yearKey,
              month: mon,
              fine,
            });
          }
        });
      });
      // Legacy path: payments[year][month].fine
      const payments = m.payments || {};
      Object.keys(payments).forEach((yearKey) => {
        const yearMap = payments[yearKey] || {};
        months.forEach((mon) => {
          const val = yearMap[mon];
          if (val && typeof val === 'object' && (parseFloat(val.fine || 0) || 0) > 0) {
            rows.push({
              name: m.name || '',
              phone: m.phoneNo || m.mobile || '',
              year: yearKey,
              month: mon,
              fine: parseFloat(val.fine || 0) || 0,
            });
          }
        });
      });
    });
    return rows.sort((a, b) => {
      if (Number(a.year) !== Number(b.year)) return Number(a.year) - Number(b.year);
      return months.indexOf(a.month) - months.indexOf(b.month);
    });
  }, [members]);

  const totalFine = fineRows.reduce((sum, r) => sum + (r.fine || 0), 0);
  const totalRegistration = registrationRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  
  // Calculate company balance from transactions
  const companyBalance = useMemo(() => {
    return companyTransactions.reduce((balance, transaction) => {
      if (transaction.type === 'investment') {
        return balance - transaction.amount; // Company pays out investment
      }
      return balance;
    }, totalRegistration); // Start with registration amounts
  }, [companyTransactions, totalRegistration]);

  // Total invested by the company account (sum of investment transactions)
  const totalCompanyInvested = useMemo(() => {
    return companyTransactions.reduce((sum, tx) => {
      if (tx.type === 'investment') {
        return sum + (parseFloat(tx.amount || 0) || 0);
      }
      return sum;
    }, 0);
  }, [companyTransactions]);

  const handleInvestAll = async () => {
    if (investing) return;
    const amountToInvest = parseFloat(companyBalance || 0) || 0;
    if (amountToInvest <= 0) {
      alert('No available balance to invest.');
      return;
    }
    setInvesting(true);
    try {
      const now = new Date();
      const yr = now.getFullYear();
      const mon = now.toLocaleString('default', { month: 'short' });

      // Fetch current share price for this month
      const { data: priceRow, error: priceErr } = await supabase
        .from('share_prices')
        .select('price')
        .eq('year', yr)
        .eq('month', mon)
        .single();
      if (priceErr) {
        alert('Share price not available for current month.');
        setInvesting(false);
        return;
      }
      const price = priceRow?.price ? parseFloat(priceRow.price) : 0;
      if (!(price > 0)) {
        alert('Share price not set for current month.');
        setInvesting(false);
        return;
      }
      const shares = amountToInvest / price;

      // Find Company Account member (Member-ID: 2025-002)
      const { data: company, error: compErr } = await supabase
        .from('members')
        .select('id, name, activities, total_shares, payment, payment_membership_id')
        .or('payment_membership_id.eq.2025-002,payment->>membershipId.eq.2025-002')
        .maybeSingle();
      if (compErr || !company?.id) {
        alert('Company Account member (2025-002) not found.');
        setInvesting(false);
        return;
      }

      // Insert transaction record (no additional fine here; balance already reflects registrations)
      const { error: txErr } = await supabase
        .from('company_transactions')
        .insert({
          member_id: company.id,
          member_name: company.name || 'Company Account',
          membership_id: '2025-002',
          type: 'investment',
          amount: amountToInvest,
          fine: 0,
          year: yr,
          month: mon,
          custom_receipt: `AUTO-BAL-${Date.now()}`,
          share_price: price,
          shares,
          created_at: new Date().toISOString(),
          description: `Auto-invest company balance (${mon} ${yr})`
        });
      if (txErr) {
        alert('Failed to record company transaction.');
        setInvesting(false);
        return;
      }

      // Merge into activities for company member and update total_shares
      const currentActivities = company.activities || {};
      const monthExisting = currentActivities?.[yr]?.[mon] || {};
      const existingInv = monthExisting.investment || null;
      const mergedInvestment = existingInv ? {
        ...existingInv,
        amount: (parseFloat(existingInv.amount || 0) || 0) + amountToInvest,
        shares: (parseFloat(existingInv.shares || 0) || 0) + shares,
        sharePrice: price,
      } : {
        type: 'investment', amount: amountToInvest, shares, sharePrice: price, customReceipt: `AUTO-BAL-${Date.now()}`, createdAt: new Date().toISOString()
      };
      const updatedActivities = {
        ...currentActivities,
        [yr]: {
          ...currentActivities[yr],
          [mon]: { ...monthExisting, investment: mergedInvestment }
        }
      };

      let totalShares = 0;
      Object.values(updatedActivities).forEach((monthsMap) => {
        Object.values(monthsMap || {}).forEach((entry) => {
          const inv = entry?.investment; const wd = entry?.withdrawal;
          if (inv?.shares) totalShares += parseFloat(inv.shares) || 0;
          if (wd?.shares) totalShares -= parseFloat(wd.shares) || 0;
        });
      });

      const { error: updErr } = await supabase
        .from('members')
        .update({ activities: updatedActivities, total_shares: totalShares })
        .eq('id', company.id);
      if (updErr) {
        alert('Failed to update company shares.');
        setInvesting(false);
        return;
      }

      // Success: realtime listeners will refresh the page data
      setInvesting(false);
      alert('Company balance invested successfully.');
    } catch (e) {
      setInvesting(false);
      alert('Failed to invest company balance.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Company Amount Overview</h1>
                <p className="text-sm text-slate-600">Registration fees and late payment fines</p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div>
                <div className="text-xs text-slate-500">Total Registration Amount</div>
                <div className="text-2xl font-extrabold text-emerald-600">₹{totalRegistration.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Fine Amount</div>
                <div className="text-2xl font-extrabold text-rose-600">₹{totalFine.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Company Balance</div>
                <div className={`text-2xl font-extrabold ${companyBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  ₹{companyBalance.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Invested by Company</div>
                <div className="text-2xl font-extrabold text-slate-900">₹{totalCompanyInvested.toFixed(2)}</div>
              </div>
              <div>
                <button
                  onClick={handleInvestAll}
                  disabled={investing || companyBalance <= 0}
                  className={`mt-2 inline-flex items-center gap-2 rounded-lg ${companyBalance > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300'} text-white text-xs font-medium px-3 py-2 disabled:opacity-50`}
                >
                  {investing ? 'Investing…' : 'Invest Current Balance'}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Registration Amount Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-800">Registration Amount</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100 text-slate-700 text-sm">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Mobile Number</th>
                  <th className="px-4 py-3 text-left font-semibold">Membership ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Date of Joining</th>
                  <th className="px-4 py-3 text-left font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {registrationRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">No registration payments recorded</td>
                  </tr>
                ) : (
                  registrationRows.map((r, idx) => (
                    <tr key={`${r.membershipId}-${r.phone}-${idx}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">{r.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.phone}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.membershipId}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.dateOfJoining}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-600">₹{r.amount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Company Transactions Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-800">Company Transactions</h2>
            <p className="text-xs text-slate-500">Company member (SMDB-1) investment transactions</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100 text-slate-700 text-sm">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Member</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">Fine</th>
                  <th className="px-4 py-3 text-left font-semibold">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {companyTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">No company transactions recorded</td>
                  </tr>
                ) : (
                  companyTransactions
                    .sort((a, b) => {
                      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                      return dateB - dateA;
                    })
                    .map((transaction, idx) => (
                      <tr key={transaction.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {transaction.createdAt?.toDate 
                            ? transaction.createdAt.toDate().toLocaleDateString()
                            : new Date(transaction.createdAt).toLocaleDateString()
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">{transaction.memberName}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-red-600">
                          -₹{transaction.amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">₹{transaction.fine?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{transaction.customReceipt || '—'}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fine Amount Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-800">Fine Amount</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100 text-slate-700 text-sm">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Mobile Number</th>
                  <th className="px-4 py-3 text-left font-semibold">Year</th>
                  <th className="px-4 py-3 text-left font-semibold">Month</th>
                  <th className="px-4 py-3 text-left font-semibold">Fine Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {fineRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">No fines recorded</td>
                  </tr>
                ) : (
                  fineRows.map((r, idx) => (
                    <tr key={`${r.name}-${r.phone}-${r.year}-${r.month}-${idx}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">{r.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.phone}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.year}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.month}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-rose-600">₹{r.fine.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Compamt;

