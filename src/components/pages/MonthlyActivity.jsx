import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabase/config';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function MonthlyActivity() {
  const navigate = useNavigate();
  const { id, year, month } = useParams();

  const [selectedOption, setSelectedOption] = useState(''); // 'investment' | 'withdrawal' | 'dividend'

  // Investment form state
  const [invAmount, setInvAmount] = useState('');
  const [invFine, setInvFine] = useState('');
  const [invSharePrice, setInvSharePrice] = useState(''); // placeholder
  const [invCustomReceipt, setInvCustomReceipt] = useState('');
  const [calculatedShares, setCalculatedShares] = useState(0);
  const [saving, setSaving] = useState(false);

  // Withdrawal form state
  const [wdAmountToWithdraw, setWdAmountToWithdraw] = useState('');
  const [wdApproved, setWdApproved] = useState(false);

  // Share price state
  const [currentSharePrice, setCurrentSharePrice] = useState(null);
  const [loadingSharePrice, setLoadingSharePrice] = useState(true);

  // Member and existing investment state
  const [member, setMember] = useState(null);
  const [existingInvestment, setExistingInvestment] = useState(null);
  const [loadingMember, setLoadingMember] = useState(true);

  const title = useMemo(() => {
    const monthIdx = Math.max(0, months.indexOf(month || ''));
    const prettyMonth = months[monthIdx] || month;
    return `${prettyMonth} ${year}`;
  }, [month, year]);

  // Allow editing only for current calendar month and year
  const isEditablePeriod = useMemo(() => {
    const now = new Date();
    const nowMonthLabel = months[now.getMonth()];
    const yr = parseInt(year, 10);
    return yr === now.getFullYear() && month === nowMonthLabel;
  }, [year, month]);

  // Fetch member data and check for existing investment
  useEffect(() => {
    if (!id) return;
    
    setLoadingMember(true);
    const fetchMember = async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        const memberData = data;
        setMember(memberData);
        
        // Check for existing investment in current month (supports nested or legacy)
        const yearActivities = memberData.activities?.[year] || {};
        const monthActivity = yearActivities[month];
        const inv = monthActivity?.investment || (monthActivity?.type === 'investment' ? monthActivity : null);
        if (inv) {
          setExistingInvestment(inv);
        } else {
          setExistingInvestment(null);
        }
      } else {
        setMember(null);
        setExistingInvestment(null);
      }
      setLoadingMember(false);
    };
    fetchMember();
    const sub = supabase
      .channel('member_monthly_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `id=eq.${id}` }, fetchMember)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [id, year, month]);

  // Fetch current month's share price
  useEffect(() => {
    const fetchSharePrice = async () => {
      if (!year || !month) return;
      
      setLoadingSharePrice(true);
      try {
        const { data, error } = await supabase
          .from('share_prices')
          .select('*')
          .eq('year', parseInt(year))
          .eq('month', month)
          .single();
        
        if (!error && data) {
          setCurrentSharePrice(data.price);
        } else {
          setCurrentSharePrice(null);
        }
      } catch (error) {
        console.error('Error fetching share price:', error);
        setCurrentSharePrice(null);
      } finally {
        setLoadingSharePrice(false);
      }
    };

    fetchSharePrice();
  }, [year, month]);

  // Calculate number of shares when amount or share price changes
  useEffect(() => {
    if (invAmount && currentSharePrice && currentSharePrice > 0) {
      const amount = parseFloat(invAmount);
      const shares = amount / currentSharePrice;
      setCalculatedShares(shares);
    } else {
      setCalculatedShares(0);
    }
  }, [invAmount, currentSharePrice]);

  // Generate and prefill a custom receipt number when switching to Investment
  useEffect(() => {
    const prefillReceipt = async () => {
      if (selectedOption !== 'investment' || !year || !month) return;
      try {
        const yr = parseInt(year, 10);
        const monthIdx = Math.max(0, months.indexOf(month || ''));
        const mm = String(monthIdx + 1).padStart(2, '0');
        const yy = String(yr).slice(-2);
        let monthInvestmentCount = 0;
        const { data: allMembers } = await supabase
          .from('members')
          .select('activities');
        (allMembers || []).forEach((m) => {
          const acts = m?.activities || {};
          const ym = acts?.[yr] || acts?.[String(yr)] || {};
          const md = ym?.[month] || ym?.[months[monthIdx]] || null;
          const inv = md?.investment || (md?.type === 'investment' ? md : null);
          if (inv) monthInvestmentCount += 1;
        });
        const sequence = monthInvestmentCount + 1;
        const candidate = `${mm}${yy}-${String(sequence).padStart(4, '0')}`;
        // Prefill only if empty to respect admin edits
        setInvCustomReceipt((prev) => (prev && prev.trim() ? prev : candidate));
      } catch (_) {
        // ignore prefill errors
      }
    };
    prefillReceipt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption, year, month]);

  // Function to calculate total shares from all investments
  const calculateTotalShares = (memberData) => {
    let totalShares = 0;
    if (memberData.activities) {
      Object.keys(memberData.activities).forEach(year => {
        const yearActivities = memberData.activities[year];
        Object.keys(yearActivities).forEach(month => {
          const activity = yearActivities[month];
          // Nested new structure
          const inv = activity?.investment;
          if (inv && inv.shares) totalShares += parseFloat(inv.shares) || 0;
          // Legacy flat structure
          if (activity && activity.type === 'investment' && activity.shares) {
            totalShares += parseFloat(activity.shares) || 0;
          }
          // Subtract withdrawals if represented as shares (nested or legacy)
          const wd = activity?.withdrawal;
          if (wd && wd.shares) totalShares -= parseFloat(wd.shares) || 0;
          if (activity && activity.type === 'withdrawal' && activity.shares) {
            totalShares -= parseFloat(activity.shares) || 0;
          }
        });
      });
    }
    return totalShares;
  };

  const handleSaveInvestment = async () => {
    if (!isEditablePeriod) {
      alert('You can only record activity for the current month.');
      return;
    }
    if (!id || !year || !month) return;
    
    // Double-check for existing investment before saving
    if (existingInvestment) {
      alert('Investment for this month already exists. Only one investment per month is allowed.');
      return;
    }

    setSaving(true);
    try {
      const investmentAmount = parseFloat(invAmount || 0) || 0;
      const investmentFine = parseFloat(invFine || 0) || 0;
      
      // Generate fallback receipt if admin didn't edit or prefill failed
      const yr = parseInt(year, 10);
      const monthIdx = Math.max(0, months.indexOf(month || ''));
      const mm = String(monthIdx + 1).padStart(2, '0');
      const yy = String(yr).slice(-2);
      let monthInvestmentCount = 0;
      try {
        const { data: allMembers } = await supabase
          .from('members')
          .select('activities');
        (allMembers || []).forEach((m) => {
          const acts = m?.activities || {};
          const ym = acts?.[yr] || acts?.[String(yr)] || {};
          const md = ym?.[month] || ym?.[months[monthIdx]] || null;
          const inv = md?.investment || (md?.type === 'investment' ? md : null);
          if (inv) monthInvestmentCount += 1;
        });
      } catch (_) {}
      const sequence = monthInvestmentCount + 1;
      const generatedReceipt = `${mm}${yy}-${String(sequence).padStart(4, '0')}`;
      const customReceiptToUse = (invCustomReceipt && invCustomReceipt.trim()) ? invCustomReceipt.trim() : generatedReceipt;
      
      const payload = {
        investment: {
          type: 'investment',
          amount: investmentAmount,
          fine: investmentFine,
          sharePrice: currentSharePrice || 0,
          shares: calculatedShares || 0,
          customReceipt: customReceiptToUse,
          createdAt: new Date()
        }
      };
      
      // Check if this is the Company Account member (Member-ID: "2025-002")
      const isCompanyMember = (member?.payment?.membershipId === "2025-002") || (member?.payment_membership_id === "2025-002");
      
      if (isCompanyMember) {
        // For company member, create a company transaction record
        const { error: txErr } = await supabase
          .from('company_transactions')
          .insert({
            member_id: member.id,
            member_name: member?.name || '',
            membership_id: member?.payment?.membershipId || '',
            type: 'investment',
            amount: investmentAmount,
            fine: investmentFine,
            year: parseInt(year),
            month: month,
            custom_receipt: customReceiptToUse,
            share_price: currentSharePrice || 0,
            shares: calculatedShares || 0,
            created_at: new Date(),
            description: `Company member investment - ${month} ${year}`
          });
        if (txErr) throw txErr;
      }
      
      // Calculate new total shares including this investment
      const currentActivities = member?.activities || {};
      const monthExisting = currentActivities?.[year]?.[month] || {};
      const updatedActivities = {
        ...currentActivities,
        [year]: {
          ...currentActivities[year],
          [month]: { ...monthExisting, ...payload }
        }
      };
      
      const updatedMemberData = { ...member, activities: updatedActivities };
      const newTotalShares = calculateTotalShares(updatedMemberData);
      
      // Store under member row. Also update totalShares
      const { error } = await supabase
        .from('members')
        .update({ activities: updatedActivities, total_shares: newTotalShares })
        .eq('id', id);
      if (error) throw error;
      navigate(`/member/${id}`);
    } catch (e) {
      alert('Failed to save investment');
    }
    setSaving(false);
  };

  const handleApproveWithdrawal = () => {
    if (!isEditablePeriod) {
      alert('You can only record activity for the current month.');
      return;
    }
    setWdApproved(true);
  };

  const handleDenyWithdrawal = () => {
    setWdApproved(false);
    setSelectedOption('');
  };

  const handleConfirmWithdrawal = async () => {
    if (!isEditablePeriod) {
      alert('You can only record activity for the current month.');
      return;
    }
    if (!id || !year || !month) return;
    // Validate inputs and balances
    const amount = parseFloat(wdAmountToWithdraw || 0) || 0;
    if (!currentSharePrice || currentSharePrice <= 0) {
      alert('Current share price not available.');
      return;
    }
    if (amount <= 0) {
      alert('Enter a valid withdrawal amount.');
      return;
    }

    const availableShares = parseFloat(member?.total_shares || 0) || 0;
    const sharesToWithdraw = amount / currentSharePrice;
    if (sharesToWithdraw > availableShares + 1e-8) {
      alert('Withdrawal exceeds available shares.');
      return;
    }

    setSaving(true);
    try {
      const newTotalShares = Math.max(0, availableShares - sharesToWithdraw);
      const currentActivities = member?.activities || {};
      const monthExisting = currentActivities?.[year]?.[month] || {};
      const updatedActivities = {
        ...currentActivities,
        [year]: {
          ...currentActivities[year],
          [month]: { ...monthExisting, withdrawal: {
            type: 'withdrawal',
            amount: amount,
            shares: sharesToWithdraw,
            sharePrice: currentSharePrice,
            status: 'confirmed',
            createdAt: new Date()
          } }
        }
      };
      const { error } = await supabase
        .from('members')
        .update({ activities: updatedActivities, total_shares: newTotalShares })
        .eq('id', id);
      if (error) throw error;
      navigate(`/member/${id}`);
    } catch (e) {
      alert('Failed to save withdrawal');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Monthly Activity</h1>
            <p className="text-xs text-slate-500">{title}</p>
          </div>
          <button onClick={() => navigate(-1)} className="rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-medium px-3 py-1.5">Back</button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6 space-y-6">
          {!isEditablePeriod && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              You are viewing {title}. Edits are restricted to the current month only.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className={`cursor-pointer rounded-xl border ${selectedOption==='investment' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-amber-200'} bg-white p-4 flex items-start gap-3`}>
              <input type="radio" name="activityType" value="investment" checked={selectedOption==='investment'} onChange={() => { if (!isEditablePeriod) return; setSelectedOption('investment'); setWdApproved(false); }} className="mt-1" disabled={!isEditablePeriod} />
              <div>
                <div className="text-sm font-semibold text-slate-900">Investment</div>
                <div className="text-xs text-slate-500">Record a new investment</div>
              </div>
            </label>
            <label className={`cursor-pointer rounded-xl border ${selectedOption==='withdrawal' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-amber-200'} bg-white p-4 flex items-start gap-3`}>
              <input type="radio" name="activityType" value="withdrawal" checked={selectedOption==='withdrawal'} onChange={() => { if (!isEditablePeriod) return; setSelectedOption('withdrawal'); setWdApproved(false); }} className="mt-1" disabled={!isEditablePeriod} />
              <div>
                <div className="text-sm font-semibold text-slate-900">Withdrawal</div>
                <div className="text-xs text-slate-500">Request a withdrawal</div>
              </div>
            </label>
            <label className={`cursor-pointer rounded-xl border ${selectedOption==='dividend' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-amber-200'} bg-white p-4 flex items-start gap-3`}>
              <input type="radio" name="activityType" value="dividend" checked={selectedOption==='dividend'} onChange={() => setSelectedOption('dividend')} className="mt-1" />
              <div>
                <div className="text-sm font-semibold text-slate-900">Dividend</div>
                <div className="text-xs text-slate-500">Record a dividend</div>
              </div>
            </label>
          </div>

          {selectedOption === 'investment' && (
            <div className="rounded-2xl border border-amber-200 p-5 space-y-4 bg-amber-50/30">
              <h3 className="text-sm font-semibold text-slate-700">Investment</h3>
              
              {existingInvestment ? (
                // Show existing investment details
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-green-800">Investment Already Made</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-green-600 font-medium">Amount:</span>
                        <span className="ml-2 text-green-800">₹{existingInvestment.amount}</span>
                      </div>
                      <div>
                        <span className="text-green-600 font-medium">Shares:</span>
                        <span className="ml-2 text-green-800">{existingInvestment.shares || 0}</span>
                      </div>
                      <div>
                        <span className="text-green-600 font-medium">Share Price:</span>
                        <span className="ml-2 text-green-800">₹{existingInvestment.sharePrice || 0}</span>
                      </div>
                      <div>
                        <span className="text-green-600 font-medium">Fine:</span>
                        <span className="ml-2 text-green-800">₹{existingInvestment.fine || 0}</span>
                      </div>
                      {existingInvestment.customReceipt && (
                        <div className="col-span-2">
                          <span className="text-green-600 font-medium">Receipt:</span>
                          <span className="ml-2 text-green-800">{existingInvestment.customReceipt}</span>
                        </div>
                      )}
                      {existingInvestment.createdAt && (
                        <div className="col-span-2">
                          <span className="text-green-600 font-medium">Date:</span>
                          <span className="ml-2 text-green-800">
                            {existingInvestment.createdAt.toDate ? 
                              existingInvestment.createdAt.toDate().toLocaleDateString() : 
                              new Date(existingInvestment.createdAt).toLocaleDateString()
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-amber-600">
                      Only one investment per month is allowed. Investment for this month is already recorded.
                    </p>
                  </div>
                </div>
              ) : (
                // Show investment form
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                    <input 
                      type="number" 
                      value={invAmount} 
                      onChange={(e) => setInvAmount(e.target.value)} 
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500" 
                      placeholder="Enter amount" 
                      disabled={loadingMember || !isEditablePeriod}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Number of shares for investing amount</label>
                    <input 
                      type="text" 
                      value={calculatedShares > 0 ? calculatedShares.toFixed(2) : '0'} 
                      readOnly 
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50" 
                      placeholder="Calculated automatically" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fine (₹) — optional</label>
                    <input 
                      type="number" 
                      value={invFine} 
                      onChange={(e) => setInvFine(e.target.value)} 
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500" 
                      placeholder="Enter fine" 
                      disabled={loadingMember || !isEditablePeriod}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Share price for {month} {year}</label>
                    <input 
                      type="text" 
                      value={loadingSharePrice ? 'Loading...' : (currentSharePrice ? `₹${currentSharePrice.toFixed(2)}` : 'No price set')} 
                      onChange={(e) => setInvSharePrice(e.target.value)} 
                      className={`w-full px-3 py-2 rounded-lg border ${currentSharePrice ? 'border-amber-300' : 'border-red-300 bg-red-50'} focus:outline-none focus:ring-2 focus:ring-amber-500`}
                      placeholder="—" 
                      disabled={loadingSharePrice || currentSharePrice !== null || loadingMember || !isEditablePeriod}
                    />
                    {!currentSharePrice && !loadingSharePrice && (
                      <p className="text-xs text-red-600 mt-1">⚠️ Share price must be set for {month} {year} before recording investments</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">System receipt</label>
                    <input 
                      type="text" 
                      value={invCustomReceipt} 
                      onChange={(e) => setInvCustomReceipt(e.target.value)} 
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500" 
                      placeholder="Enter receipt reference (required)" 
                      required
                      disabled={loadingMember || !isEditablePeriod}
                    />
                  </div>
                  <div className="flex items-center justify-end">
                    <button 
                      onClick={handleSaveInvestment} 
                      disabled={saving || !isEditablePeriod || !invAmount || !invCustomReceipt || !invCustomReceipt.trim() || loadingMember || loadingSharePrice || !currentSharePrice} 
                      className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : loadingMember ? 'Loading...' : !currentSharePrice ? 'Share Price Required' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedOption === 'withdrawal' && (
            <div className="rounded-2xl border border-amber-200 p-5 space-y-4 bg-amber-50/30">
              <h3 className="text-sm font-semibold text-slate-700">Withdrawal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Present share price for {month} {year}</label>
                  <input 
                    type="text" 
                    value={loadingSharePrice ? 'Loading...' : (currentSharePrice ? `₹${currentSharePrice.toFixed(2)}` : 'No price set')} 
                    readOnly 
                    className={`w-full px-3 py-2 rounded-lg border ${currentSharePrice ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50'}`}
                    placeholder="—" 
                  />
                  {!currentSharePrice && !loadingSharePrice && (
                    <p className="text-xs text-red-600 mt-1">⚠️ Share price must be set for {month} {year} before processing withdrawals</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total number of shares</label>
                  <input 
                    type="text" 
                    value={member?.total_shares ? member.total_shares.toFixed(2) : '0.00'} 
                    readOnly 
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50" 
                    placeholder="—" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total value of shares</label>
                  <input 
                    type="text" 
                    value={
                      member?.total_shares && currentSharePrice 
                        ? `₹${(member.total_shares * currentSharePrice).toFixed(2)}` 
                        : '—'
                    } 
                    readOnly 
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50" 
                    placeholder="—" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount to be withdrawn (₹)</label>
                  <input 
                    type="number" 
                    value={wdAmountToWithdraw} 
                    onChange={(e) => setWdAmountToWithdraw(e.target.value)} 
                    className={`w-full px-3 py-2 rounded-lg border ${currentSharePrice ? 'border-amber-300' : 'border-red-300 bg-red-50'} focus:outline-none focus:ring-2 focus:ring-amber-500`} 
                    placeholder="Enter amount" 
                    disabled={!currentSharePrice}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Shares to withdraw</label>
                  <input 
                    type="text" 
                    value={
                      wdAmountToWithdraw && currentSharePrice 
                        ? (parseFloat(wdAmountToWithdraw) / currentSharePrice).toFixed(2)
                        : '0.00'
                    } 
                    readOnly 
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50" 
                    placeholder="—" 
                  />
                </div>
              </div>

              {!wdApproved ? (
                <div className="flex items-center gap-3">
                  <button onClick={handleApproveWithdrawal} disabled={!wdAmountToWithdraw || !isEditablePeriod || !currentSharePrice} className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50">
                    {!currentSharePrice ? 'Share Price Required' : 'Approve'}
                  </button>
                  <button onClick={handleDenyWithdrawal} className="rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-sm font-semibold px-4 py-2">Deny</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount available at present share price</label>
                      <input 
                        type="text" 
                        value={
                          member?.total_shares && currentSharePrice 
                            ? `₹${((member.total_shares * currentSharePrice) - (parseFloat(wdAmountToWithdraw) || 0)).toFixed(2)}` 
                            : '—'
                        } 
                        readOnly 
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50" 
                        placeholder="—" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Remaining shares available</label>
                      <input 
                        type="text" 
                        value={
                          member?.total_shares && wdAmountToWithdraw && currentSharePrice
                            ? (member.total_shares - (parseFloat(wdAmountToWithdraw) / currentSharePrice)).toFixed(2)
                            : member?.total_shares 
                            ? member.total_shares.toFixed(2)
                            : '0.00'
                        } 
                        readOnly 
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50" 
                        placeholder="—" 
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={handleConfirmWithdrawal} disabled={!isEditablePeriod || !currentSharePrice} className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50">
                      {!currentSharePrice ? 'Share Price Required' : 'Confirm'}
                    </button>
                    <button onClick={handleDenyWithdrawal} className="rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-sm font-semibold px-4 py-2">Deny</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedOption === 'dividend' && (
            <div className="rounded-2xl border border-amber-200 p-5 space-y-4 bg-amber-50/30">
              <h3 className="text-sm font-semibold text-slate-700">Dividend</h3>
              <p className="text-sm text-slate-500">No fields yet. Future implementation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MonthlyActivity;


