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

  // Fetch dividend donation events to include company investment amounts
  const [dividendEvents, setDividendEvents] = useState([]);
  useEffect(() => {
    const fetchDividendEvents = async () => {
      const { data, error } = await supabase
        .from('dividend_donation_events')
        .select('*')
        .order('event_date', { ascending: false });
      if (!error) setDividendEvents(data || []);
    };
    fetchDividendEvents();
    const sub = supabase
      .channel('dividend_events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dividend_donation_events' }, fetchDividendEvents)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, []);

  // Registration amounts captured during member registration (final step Payment.jsx)
  // Only include PAID amount, exclude any due amounts
  const registrationRows = useMemo(() => {
    return members
      .map((m) => {
        const payment = m.payment || {};
        const totalAmount = parseFloat(payment.payingMembershipAmount || 0) || 0;
        const dueAmount = parseFloat(payment.dueAmount || 0) || 0;
        const paymentStatus = payment.paymentStatus || m.payment_status;
        
        // Calculate paid amount: total - due (only if status is 'due')
        const paidAmount = paymentStatus === 'due' ? (totalAmount - dueAmount) : totalAmount;
        
        if (paidAmount <= 0) return null;
        return {
          name: m.name || '',
          phone: m.phoneNo || m.mobile || '',
          membershipId: payment.membershipId || '',
          dateOfJoining: payment.dateOfJoining || '',
          amount: paidAmount, // This is the amount that goes into company balance
          totalAmount: totalAmount,
          dueAmount: dueAmount,
          paymentStatus: paymentStatus
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
      
      // Include due payments that were marked as paid (from MemberDetail.jsx)
      const payment = m.payment || {};
      const paymentStatus = payment.paymentStatus || m.payment_status;
      const duePaymentDate = payment.duePaymentDate;
      
      if (paymentStatus === 'paid' && duePaymentDate && payment.duePaymentMethod) {
        // This means a due amount was marked as paid in MemberDetail.jsx
        // We need to track the original due amount that was paid
        const originalDueAmount = parseFloat(payment.originalDueAmount || payment.dueAmount || 0) || 0;
        if (originalDueAmount > 0) {
          // Create a virtual fine entry for the due payment
          const dueDate = new Date(duePaymentDate);
          const year = dueDate.getFullYear();
          const month = months[dueDate.getMonth()];
          
          rows.push({
            name: m.name || '',
            phone: m.phoneNo || m.mobile || '',
            year: year.toString(),
            month: month,
            fine: originalDueAmount,
          });
        }
      }
    });
    return rows.sort((a, b) => {
      if (Number(a.year) !== Number(b.year)) return Number(a.year) - Number(b.year);
      return months.indexOf(a.month) - months.indexOf(b.month);
    });
  }, [members]);

  const totalFine = fineRows.reduce((sum, r) => sum + (r.fine || 0), 0);
  const totalRegistration = registrationRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  
  // Calculate total dividend donation company investments
  const totalDividendDonationInvestment = useMemo(() => {
    return dividendEvents.reduce((sum, event) => {
      return sum + (parseFloat(event.company_investment_amount || 0) || 0);
    }, 0);
  }, [dividendEvents]);
  
  // Calculate company balance from transactions (including registration, fine, and dividend donation amounts)
  const companyBalance = useMemo(() => {
    const totalCompanyIncome = totalRegistration + totalFine + totalDividendDonationInvestment; // Include registration + fines + dividend donations
    return companyTransactions.reduce((balance, transaction) => {
      if (transaction.type === 'investment') {
        return balance - transaction.amount; // Company pays out investment
      }
      return balance;
    }, totalCompanyIncome); // Start with total company income
  }, [companyTransactions, totalRegistration, totalFine, totalDividendDonationInvestment]);

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

      // Fetch current month's share price
      const { data: priceRow, error: priceErr } = await supabase
        .from('share_prices')
        .select('price')
        .eq('year', yr)
        .eq('month', mon)
        .single();
      if (priceErr) {
        alert(`Share price not available for ${mon} ${yr}.`);
        setInvesting(false);
        return;
      }
      const price = priceRow?.price ? parseFloat(priceRow.price) : 0;
      if (!(price > 0)) {
        alert(`Share price not set for ${mon} ${yr}.`);
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

      // Insert transaction record (includes both registration and fine amounts)
      const { error: txErr } = await supabase
        .from('company_transactions')
        .insert({
          member_id: company.id,
          member_name: company.name || 'Company Account',
          membership_id: '2025-002',
          type: 'investment',
          amount: amountToInvest,
          fine: totalFine, // Include total fine amount in the transaction
          year: yr,
          month: mon,
          custom_receipt: `AUTO-BAL-${Date.now()}`,
          share_price: price,
          shares,
          created_at: new Date().toISOString(),
          description: `Auto-invest company balance (Reg: ₹${totalRegistration.toFixed(2)} + Fines: ₹${totalFine.toFixed(2)}) - ${mon} ${yr}`
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
      alert(`Company balance invested successfully! Amount: ₹${amountToInvest.toFixed(2)} (Registration: ₹${totalRegistration.toFixed(2)} + Fines: ₹${totalFine.toFixed(2)})`);
    } catch (e) {
      setInvesting(false);
      alert('Failed to invest company balance.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <button
                onClick={() => navigate('/admin')}
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-4 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Company Financial Overview</h1>
              <p className="text-lg text-gray-600">Track all company income sources and investment activities</p>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Registration Amount Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Registration</span>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Registration</h3>
            <p className="text-2xl font-bold text-gray-900">₹{totalRegistration.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Paid membership fees</p>
          </div>

          {/* Fine Amount Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">Fines</span>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Fines</h3>
            <p className="text-2xl font-bold text-gray-900">₹{totalFine.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Late payments & dues</p>
          </div>

          {/* Dividend Donation Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Dividends</span>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Dividend Investment</h3>
            <p className="text-2xl font-bold text-gray-900">₹{totalDividendDonationInvestment.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">From donation events</p>
          </div>

          {/* Company Balance Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${companyBalance >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {companyBalance >= 0 ? 'Available' : 'Deficit'}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Available Balance</h3>
            <p className={`text-2xl font-bold ${companyBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{companyBalance.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">Ready to invest</p>
          </div>
        </div>

        {/* Summary Overview Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Total Company Income</h2>
              <p className="text-indigo-100 mb-4">Combined revenue from all sources</p>
              <div className="text-4xl font-bold mb-2">
                ₹{(totalRegistration + totalFine + totalDividendDonationInvestment).toLocaleString()}
              </div>
              <div className="flex items-center gap-4 text-sm text-indigo-200">
                <span>Registration: ₹{totalRegistration.toLocaleString()}</span>
                <span>•</span>
                <span>Fines: ₹{totalFine.toLocaleString()}</span>
                <span>•</span>
                <span>Dividends: ₹{totalDividendDonationInvestment.toLocaleString()}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="mb-4">
                <div className="text-sm text-indigo-200 mb-1">Total Invested</div>
                <div className="text-xl font-bold">₹{totalCompanyInvested.toLocaleString()}</div>
              </div>
              <button
                onClick={handleInvestAll}
                disabled={investing || companyBalance <= 0}
                className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 font-medium transition-all ${
                  companyBalance > 0 
                    ? 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg hover:shadow-xl' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } disabled:opacity-50`}
              >
                {investing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Investing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Invest Current Balance
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Registration Amount Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-green-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Registration Payments</h2>
                <p className="text-sm text-gray-600">Paid membership fees (excludes due amounts)</p>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                  {registrationRows.length} members
                </span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membership ID</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registrationRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500 text-lg font-medium">No registration payments</p>
                        <p className="text-gray-400 text-sm">Registration fees will appear here once members join</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  registrationRows.map((r, idx) => (
                    <tr key={`${r.membershipId}-${r.phone}-${idx}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-emerald-600">
                                {r.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{r.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{r.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {r.membershipId}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(r.dateOfJoining).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-emerald-600">₹{r.amount.toLocaleString()}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Company Transactions Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Investment Transactions</h2>
                <p className="text-sm text-gray-600">Company member investment activities</p>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {companyTransactions.length} transactions
                </span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fine</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companyTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <p className="text-gray-500 text-lg font-medium">No investment transactions</p>
                        <p className="text-gray-400 text-sm">Investment activities will appear here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  companyTransactions
                    .sort((a, b) => {
                      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                      return dateB - dateA;
                    })
                    .map((transaction, idx) => (
                      <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.createdAt?.toDate 
                            ? transaction.createdAt.toDate().toLocaleDateString()
                            : new Date(transaction.createdAt).toLocaleDateString()
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-xs font-medium text-blue-600">
                                  {transaction.memberName?.charAt(0).toUpperCase() || 'C'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{transaction.memberName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-semibold text-red-600">
                            -₹{transaction.amount?.toLocaleString() || '0'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-gray-500">₹{transaction.fine?.toLocaleString() || '0'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.customReceipt || transaction.custom_receipt || '—'}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dividend Donation Events Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-yellow-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Dividend Donation Events</h2>
                <p className="text-sm text-gray-600">Company investments from ineligible member portions</p>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                  {dividendEvents.length} events
                </span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Share Price</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Distribution</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Company Investment</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dividendEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <p className="text-gray-500 text-lg font-medium">No dividend donation events</p>
                        <p className="text-gray-400 text-sm">Dividend events will appear here when created</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  dividendEvents.map((event, idx) => (
                    <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-amber-600">
                                {event.event_name?.charAt(0).toUpperCase() || 'D'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{event.event_name || 'Unnamed Event'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(event.event_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        ₹{event.share_price_at_event}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        ₹{event.distribution_pool?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-amber-600">
                          ₹{event.company_investment_amount?.toLocaleString() || '0'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        {event.company_shares_purchased?.toLocaleString() || 0} shares
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : event.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {event.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fine Amount Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-red-50 to-rose-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Fine Collection</h2>
                <p className="text-sm text-gray-600">Late payment fines and due amounts paid later</p>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  {fineRows.length} fines
                </span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fine Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fineRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500 text-lg font-medium">No fines recorded</p>
                        <p className="text-gray-400 text-sm">Late payment fines will appear here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  fineRows.map((r, idx) => (
                    <tr key={`${r.name}-${r.phone}-${r.year}-${r.month}-${idx}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-red-600">
                                {r.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{r.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {r.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {r.month} {r.year}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-red-600">₹{r.fine.toLocaleString()}</div>
                      </td>
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

