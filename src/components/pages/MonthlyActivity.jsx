import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabase/config';
import jsPDF from 'jspdf';

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
  const [invManualReceipt, setInvManualReceipt] = useState('');
  const [calculatedShares, setCalculatedShares] = useState(0);
  const [saving, setSaving] = useState(false);

  // Withdrawal form state
  const [wdAmountToWithdraw, setWdAmountToWithdraw] = useState('');
  const [wdApproved, setWdApproved] = useState(false);
  const [wdSharePrice, setWdSharePrice] = useState('');

  // Share price state
  const [currentSharePrice, setCurrentSharePrice] = useState(null);
  const [loadingSharePrice, setLoadingSharePrice] = useState(true);

  // Member and existing investment state
  const [member, setMember] = useState(null);
  const [existingInvestment, setExistingInvestment] = useState(null);
  const [loadingMember, setLoadingMember] = useState(true);
  const [isCompanyAccount, setIsCompanyAccount] = useState(false);
  
  // Report generation state
  const [generatingReport, setGeneratingReport] = useState(false);

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
        
        // Check if this is a company account
        const isCompany = (memberData?.payment?.membershipId === "2025-002") || (memberData?.payment_membership_id === "2025-002");
        setIsCompanyAccount(isCompany);
        
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
        setIsCompanyAccount(false);
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
          // Initialize withdrawal share price with current share price
          setWdSharePrice(data.price.toString());
        } else {
          setCurrentSharePrice(null);
          setWdSharePrice('');
        }
      } catch (error) {
        console.error('Error fetching share price:', error);
        setCurrentSharePrice(null);
        setWdSharePrice('');
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

  // reset fine input whenever member changes (prevents accidental reuse)
  useEffect(() => {
    setInvFine('');
  }, [member?.id]);

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
      
      // Check if this is the Company Account member (Member-ID: "2025-002")
      const isCompanyMember = (member?.payment?.membershipId === "2025-002") || (member?.payment_membership_id === "2025-002");
      
      // For company account, set fine to 0; otherwise use the entered fine amount
      const enteredFine = parseFloat(invFine);
      const investmentFine = isCompanyMember ? 0 : (Number.isFinite(enteredFine) && enteredFine > 0 ? enteredFine : 0);
      
      // Generate fallback system receipt if admin didn't edit or prefill failed
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
      // System receipt pattern: MON-001, MON-002, ... per calendar month
      const monthAbbrev = (months[monthIdx] || month || '').slice(0, 3).toUpperCase();
      const systemReceipt = `${monthAbbrev}-${String(sequence).padStart(3, '0')}`;
      const generatedReceipt = systemReceipt;
      const customReceiptToUse = (invCustomReceipt && invCustomReceipt.trim()) ? invCustomReceipt.trim() : generatedReceipt;
      
      const payload = {
        investment: {
          type: 'investment',
          amount: investmentAmount,
          fine: investmentFine,
          sharePrice: currentSharePrice || 0,
          shares: calculatedShares || 0,
          systemReceipt,
          customReceipt: customReceiptToUse,
          manualReceipt: invManualReceipt || '',
          createdAt: new Date()
        }
      };
      
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
            manual_receipt: invManualReceipt || '',
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
    const sharePrice = parseFloat(wdSharePrice || 0) || 0;
    if (!wdSharePrice || sharePrice <= 0) {
      alert('Share price must be set and greater than 0.');
      return;
    }
    if (amount <= 0) {
      alert('Enter a valid withdrawal amount.');
      return;
    }

    const availableShares = parseFloat(member?.total_shares || 0) || 0;
    const sharesToWithdraw = amount / sharePrice;
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
            sharePrice: sharePrice,
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

  // Function to generate consolidated statement PDF
  const handleGenerateConsolidatedStatement = async () => {
    if (!member || !year || !month) return;
    
    setGeneratingReport(true);
    try {
      // Get current share price for the month
      const effectSharePrice = currentSharePrice || 0;
      
      // Calculate investment in this specific month
      const monthActivity = member?.activities?.[year]?.[month] || {};
      const monthInvestment = monthActivity?.investment || (monthActivity?.type === 'investment' ? monthActivity : null);
      const monthWithdrawal = monthActivity?.withdrawal || (monthActivity?.type === 'withdrawal' ? monthActivity : null);
      
      const investmentInMonth = monthInvestment?.amount || 0;
      const fineInMonth = monthInvestment?.fine || 0;
      const sharesInMonth = monthInvestment?.shares || 0;
      const withdrawalInMonth = monthWithdrawal?.amount || 0;
      const sharesWithdrawnInMonth = monthWithdrawal?.shares || 0;
      
      // Calculate total invested amount from all activities
      let totalInvested = 0;
      let totalFines = 0;
      if (member.activities) {
        Object.keys(member.activities).forEach(activityYear => {
          const yearActivities = member.activities[activityYear];
          Object.keys(yearActivities).forEach(activityMonth => {
            const activity = yearActivities[activityMonth];
            const inv = activity?.investment || (activity?.type === 'investment' ? activity : null);
            if (inv) {
              totalInvested += parseFloat(inv.amount || 0);
              totalFines += parseFloat(inv.fine || 0);
            }
          });
        });
      }
      
      const totalShares = parseFloat(member.total_shares || 0);
      const valuationOfShares = totalShares * effectSharePrice;
      
      // Create PDF
      const pdf = new jsPDF();
      
      // Header
      pdf.setFontSize(18);
      pdf.setTextColor(217, 119, 6); // Amber color
      pdf.text('CONSOLIDATED STATEMENT', 105, 20, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Member: ${member.name || 'N/A'}`, 20, 35);
      pdf.text(`Membership ID: ${member?.payment?.membershipId || member?.payment_membership_id || 'N/A'}`, 20, 42);
      pdf.text(`Period: ${month} ${year}`, 20, 49);
      pdf.text(`Generated On: ${new Date().toLocaleDateString()}`, 20, 56);
      
      // Line separator
      pdf.setDrawColor(217, 119, 6);
      pdf.line(20, 62, 190, 62);
      
      let yPos = 75;
      
      // Current Month Summary
      pdf.setFontSize(14);
      pdf.setTextColor(217, 119, 6);
      pdf.text('CURRENT MONTH SUMMARY', 20, yPos);
      
      yPos += 10;
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      
      pdf.text(`Investment Amount: ₹${investmentInMonth.toFixed(2)}`, 25, yPos);
      yPos += 7;
      
      if (fineInMonth > 0) {
        pdf.text(`Fine Applied: ₹${fineInMonth.toFixed(2)}`, 25, yPos);
        yPos += 7;
      }
      
      pdf.text(`Shares Acquired: ${sharesInMonth.toFixed(2)}`, 25, yPos);
      yPos += 7;
      
      pdf.text(`Share Price: ₹${effectSharePrice.toFixed(2)}`, 25, yPos);
      yPos += 7;
      
      if (withdrawalInMonth > 0) {
        pdf.text(`Withdrawal Amount: ₹${withdrawalInMonth.toFixed(2)}`, 25, yPos);
        yPos += 7;
        pdf.text(`Shares Withdrawn: ${sharesWithdrawnInMonth.toFixed(2)}`, 25, yPos);
        yPos += 7;
      }
      
      yPos += 5;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, yPos, 190, yPos);
      yPos += 10;
      
      // Consolidated Summary
      pdf.setFontSize(14);
      pdf.setTextColor(217, 119, 6);
      pdf.text('CONSOLIDATED SUMMARY', 20, yPos);
      
      yPos += 10;
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      
      pdf.text(`Total Invested: ₹${totalInvested.toFixed(2)}`, 25, yPos);
      yPos += 7;
      
      if (totalFines > 0) {
        pdf.text(`Total Fines: ₹${totalFines.toFixed(2)}`, 25, yPos);
        yPos += 7;
      }
      
      pdf.text(`Total Shares: ${totalShares.toFixed(2)}`, 25, yPos);
      yPos += 7;
      
      pdf.text(`Share Price (${month} ${year}): ₹${effectSharePrice.toFixed(2)}`, 25, yPos);
      yPos += 7;
      
      pdf.text(`Valuation of Shares: ₹${valuationOfShares.toFixed(2)}`, 25, yPos);
      yPos += 10;
      
      // Bottom line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, yPos, 190, yPos);
      
      yPos += 10;
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('This is a computer-generated document.', 20, yPos, { align: 'center' });
      
      // Save PDF
      const fileName = `Statement_${member.name?.replace(/\s+/g, '_')}_${month}_${year}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate consolidated statement');
    }
    setGeneratingReport(false);
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
                <div className="text-sm font-semibold text-slate-900">Statement</div>
                <div className="text-xs text-slate-500">Generate consolidated statement</div>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Fine (₹) — optional
                    </label>
                    {isCompanyAccount ? (
                      <div className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-700">
                        Company account investments never incur fines.
                      </div>
                    ) : (
                      <input 
                        type="number" 
                        value={invFine} 
                        onChange={(e) => setInvFine(e.target.value)} 
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Enter fine (leave empty for none)" 
                        disabled={loadingMember || !isEditablePeriod}
                      />
                    )}
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
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Manual receipt — optional</label>
                    <input 
                      type="text" 
                      value={invManualReceipt} 
                      onChange={(e) => setInvManualReceipt(e.target.value)} 
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500" 
                      placeholder="Enter manual receipt reference" 
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
                    type="number" 
                    value={loadingSharePrice ? '' : wdSharePrice} 
                    onChange={(e) => setWdSharePrice(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${wdSharePrice && parseFloat(wdSharePrice) > 0 ? 'border-amber-300' : 'border-red-300 bg-red-50'} focus:outline-none focus:ring-2 focus:ring-amber-500`}
                    placeholder={loadingSharePrice ? 'Loading...' : 'Enter share price'} 
                    disabled={loadingSharePrice || !isEditablePeriod}
                  />
                  {!wdSharePrice && !loadingSharePrice && (
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
                      member?.total_shares && wdSharePrice && parseFloat(wdSharePrice) > 0
                        ? `₹${(member.total_shares * parseFloat(wdSharePrice)).toFixed(2)}` 
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
                    className={`w-full px-3 py-2 rounded-lg border ${wdSharePrice && parseFloat(wdSharePrice) > 0 ? 'border-amber-300' : 'border-red-300 bg-red-50'} focus:outline-none focus:ring-2 focus:ring-amber-500`} 
                    placeholder="Enter amount" 
                    disabled={!wdSharePrice || parseFloat(wdSharePrice) <= 0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Shares to withdraw</label>
                  <input 
                    type="text" 
                    value={
                      wdAmountToWithdraw && wdSharePrice && parseFloat(wdSharePrice) > 0
                        ? (parseFloat(wdAmountToWithdraw) / parseFloat(wdSharePrice)).toFixed(2)
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
                  <button onClick={handleApproveWithdrawal} disabled={!wdAmountToWithdraw || !isEditablePeriod || !wdSharePrice || parseFloat(wdSharePrice) <= 0} className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50">
                    {!wdSharePrice || parseFloat(wdSharePrice) <= 0 ? 'Share Price Required' : 'Approve'}
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
                          member?.total_shares && wdSharePrice && parseFloat(wdSharePrice) > 0
                            ? `₹${((member.total_shares * parseFloat(wdSharePrice)) - (parseFloat(wdAmountToWithdraw) || 0)).toFixed(2)}` 
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
                          member?.total_shares && wdAmountToWithdraw && wdSharePrice && parseFloat(wdSharePrice) > 0
                            ? (member.total_shares - (parseFloat(wdAmountToWithdraw) / parseFloat(wdSharePrice))).toFixed(2)
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
                    <button onClick={handleConfirmWithdrawal} disabled={!isEditablePeriod || !wdSharePrice || parseFloat(wdSharePrice) <= 0} className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50">
                      {!wdSharePrice || parseFloat(wdSharePrice) <= 0 ? 'Share Price Required' : 'Confirm'}
                    </button>
                    <button onClick={handleDenyWithdrawal} className="rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-sm font-semibold px-4 py-2">Deny</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedOption === 'dividend' && (
            <div className="rounded-2xl border border-amber-200 p-5 space-y-4 bg-amber-50/30">
              <h3 className="text-sm font-semibold text-slate-700">Consolidated Statement</h3>
              <p className="text-sm text-slate-500 mb-4">
                Generate a comprehensive PDF report for this member showing all investment details, shares, and valuations for {month} {year}.
              </p>
              
              {member && (
                <div className="space-y-3">
                  <div className="bg-white rounded-lg border border-amber-200 p-4">
                    <h4 className="text-xs font-semibold text-slate-700 mb-3">Report Preview</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Member Name:</span>
                        <span className="font-medium text-slate-900">{member.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Membership ID:</span>
                        <span className="font-medium text-slate-900">{member?.payment?.membershipId || member?.payment_membership_id || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Shares:</span>
                        <span className="font-medium text-slate-900">{member.total_shares?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Share Price ({month} {year}):</span>
                        <span className="font-medium text-slate-900">₹{currentSharePrice?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-100 border border-amber-300 rounded-lg p-3">
                    <p className="text-xs text-amber-800">
                      <strong>Note:</strong> The PDF will include:
                    </p>
                    <ul className="text-xs text-amber-800 mt-2 ml-4 list-disc space-y-1">
                      <li>Investment details for {month} {year}</li>
                      <li>Total invested amount across all periods</li>
                      <li>Total shares and current month shares</li>
                      <li>Valuation of shares at current price</li>
                      <li>Withdrawal information (if any) for this month</li>
                    </ul>
                  </div>
                  
                  <button 
                    onClick={handleGenerateConsolidatedStatement}
                    disabled={generatingReport || !member}
                    className="w-full rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-3 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {generatingReport ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        <span>Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <span>📄</span>
                        <span>Download Consolidated Statement</span>
                      </>
                    )}
                  </button>
                </div>
              )}
              
              {!member && (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500">Loading member information...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MonthlyActivity;


