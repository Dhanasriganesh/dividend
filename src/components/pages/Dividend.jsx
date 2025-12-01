import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/config';
import { useNavigate } from 'react-router-dom';

const Dividend = () => {
  const navigate = useNavigate();
  
  // State management
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalShares, setTotalShares] = useState(0);
  const [totalProfitLoss, setTotalProfitLoss] = useState(0);
  const [originalCalculatedProfit, setOriginalCalculatedProfit] = useState(0);
  const [profitDistributionPerShare, setProfitDistributionPerShare] = useState(0);
  const [tableData, setTableData] = useState([]);
  const [distributedProfits, setDistributedProfits] = useState(false);
  const [showReportPopup, setShowReportPopup] = useState(false);
  const [reportOption, setReportOption] = useState('');
  const [reportData, setReportData] = useState([]);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [totalIneligibleProfit, setTotalIneligibleProfit] = useState(0);
  const [donationTransferred, setDonationTransferred] = useState(false);
  const [reportOptionUsed, setReportOptionUsed] = useState('');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [donationHistory, setDonationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Manual profit entry state
  const [showProfitEntry, setShowProfitEntry] = useState(false);
  const [profitAmount, setProfitAmount] = useState('');
  const [profitDescription, setProfitDescription] = useState('');
  const [savingProfit, setSavingProfit] = useState(false);
  const [currentManualProfit, setCurrentManualProfit] = useState(null);

  // Fetch all members on component mount
  useEffect(() => {
    fetchMembers();
    fetchDonationHistory();
    fetchCurrentManualProfit();
  }, []);

  // Fetch current manual profit entry
  const fetchCurrentManualProfit = async () => {
    try {
      const { data, error } = await supabase
        .from('manual_profit_entries')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      setCurrentManualProfit(data?.[0] || null);
    } catch (error) {
      console.error('Error fetching manual profit:', error);
    }
  };

  const handleSaveProfit = async () => {
    if (!profitAmount.trim()) {
      alert('Please enter a profit amount');
      return;
    }

    const amount = parseFloat(profitAmount);
    if (isNaN(amount)) {
      alert('Please enter a valid number');
      return;
    }

    setSavingProfit(true);
    try {
      // Deactivate previous entries
      await supabase
        .from('manual_profit_entries')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert new entry
      const { error } = await supabase
        .from('manual_profit_entries')
        .insert({
          profit_amount: amount,
          description: profitDescription.trim() || 'Manual profit entry',
          is_active: true,
          created_by: 'admin',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      alert('Profit amount saved successfully!');
      setShowProfitEntry(false);
      setProfitAmount('');
      setProfitDescription('');
      fetchCurrentManualProfit();
    } catch (error) {
      console.error('Error saving profit:', error);
      alert('Error saving profit: ' + error.message);
    } finally {
      setSavingProfit(false);
    }
  };

  // Fetch members from database
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      alert('Error fetching members: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch dividend donation history
  const fetchDonationHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('dividend_donation_events')
        .select('*')
        .eq('status', 'confirmed')
        .order('event_date', { ascending: false });

      if (error) throw error;
      setDonationHistory(data || []);
    } catch (error) {
      console.error('Error fetching donation history:', error);
      // Don't show alert for history fetch errors, just log it
    } finally {
      setLoadingHistory(false);
    }
  };

  // Helper function to get quarter from month
  const getQuarterFromMonth = (month) => {
    const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month);
    if (monthIndex === -1) return 'Q1';
    const quarterIndex = Math.floor(monthIndex / 3);
    return `Q${quarterIndex + 1}`;
  };

  // Helper function to get quarter label
  const getQuarterLabel = (month) => {
    const quarter = getQuarterFromMonth(month);
    const quarterLabels = {
      'Q1': 'Q1 (January, February, March)',
      'Q2': 'Q2 (April, May, June)',
      'Q3': 'Q3 (July, August, September)',
      'Q4': 'Q4 (October, November, December)'
    };
    return quarterLabels[quarter] || quarter;
  };

  // Fetch share price for a specific year and month
  // Note: Since we store month-based records (3 per quarter with same price), 
  // this lookup still works correctly
  const fetchSharePrice = async (year, month) => {
    try {
      const { data, error } = await supabase
        .from('share_prices')
        .select('price')
        .eq('year', year)
        .eq('month', month)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 error

      if (error || !data) {
        return null;
      }
      return data?.price || null;
    } catch (e) {
      return null;
    }
  };

  // Handle Apply Filters button click
  const handleApplyFilters = async () => {
    // Validate dates
    if (!startDate || !endDate) {
      alert('Please select both start date and end date');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      alert('End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      // Extract year and month from dates
      const startYear = start.getFullYear();
      const startMonth = start.toLocaleString('default', { month: 'short' });
      const endYear = end.getFullYear();
      const endMonth = end.toLocaleString('default', { month: 'short' });

      // Fetch share prices
      const startPrice = await fetchSharePrice(startYear, startMonth);
      const endPrice = await fetchSharePrice(endYear, endMonth);

      if (startPrice === null) {
        const startQuarter = getQuarterLabel(startMonth);
        alert(`Share price not found for ${startQuarter} ${startYear}. Please set the quarterly share price on the Share Price page.`);
        setLoading(false);
        return;
      }

      if (endPrice === null) {
        const endQuarter = getQuarterLabel(endMonth);
        alert(`Share price not found for ${endQuarter} ${endYear}. Please set the quarterly share price on the Share Price page.`);
        setLoading(false);
        return;
      }

      // Calculate total shares (sum of all members including company account)
      const totalSharesValue = members.reduce((sum, member) => {
        return sum + (parseFloat(member.total_shares) || 0);
      }, 0);

      // Calculate profit/loss per share
      const profitPerShare = Number(parseFloat(endPrice) - parseFloat(startPrice));
      
      // Calculate total profit/loss
      const totalProfitLossValue = Number(profitPerShare * totalSharesValue);

      // Update state
      setTotalShares(totalSharesValue);
      setTotalProfitLoss(totalProfitLossValue);
      setOriginalCalculatedProfit(totalProfitLossValue); // Store original calculated profit
      setProfitDistributionPerShare(profitPerShare);
      setDistributedProfits(false);

      // Prepare table data
      const preparedTableData = members.map((member, index) => {
        const membershipId = member.payment?.membershipId || 'N/A';
        const phoneNumber = member.phone_no || 'N/A';
        const name = member.name || 'N/A';
        const totalSharesMember = parseFloat(member.total_shares) || 0;

        return {
          id: member.id,
          sNo: index + 1,
          membershipId: membershipId,
          name: name,
          mobileNumber: phoneNumber,
          totalShares: totalSharesMember,
          profitToDistribute: null, // Will be calculated when Distribute Profits is clicked
        };
      });

      setTableData(preparedTableData);
      setFiltersApplied(true);
      // Reset donation state when filters are applied
      setTotalIneligibleProfit(0);
      setDonationTransferred(false);
      setReportOptionUsed('');
      setReportStartDate('');
      setReportEndDate('');
      setReportData([]); // Clear previous report
    } catch (error) {
      console.error('Error applying filters:', error);
      alert('Error applying filters: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Distribute Profits button click
  const handleDistributeProfits = async () => {
    if (!filtersApplied) {
      alert('Please apply filters first to calculate profit distribution');
      return;
    }

    // Fetch manual profit entry
    try {
      const { data: manualProfitData, error } = await supabase
        .from('manual_profit_entries')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      const manualProfit = manualProfitData?.[0];
      if (!manualProfit || manualProfit.profit_amount <= 0) {
        alert('No manual profit amount set. Please set profit amount using the Manual Profit Entry tile.');
        return;
      }

      const totalManualProfit = parseFloat(manualProfit.profit_amount);
      const manualProfitPerShare = totalManualProfit / totalShares;

      // Subtract manual profit from original calculated profit
      const remainingProfit = originalCalculatedProfit - totalManualProfit;
      setTotalProfitLoss(remainingProfit);
      
      // Update the profit distribution per share for calculations
      setProfitDistributionPerShare(manualProfitPerShare);

      // Calculate profit for each member using manual profit
      const updatedTableData = tableData.map(member => ({
        ...member,
        profitToDistribute: member.totalShares * manualProfitPerShare,
      }));

      setTableData(updatedTableData);
      setDistributedProfits(true);

      alert(`Using manual profit: ₹${totalManualProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${manualProfit.description})`);
    } catch (error) {
      console.error('Error fetching manual profit:', error);
      alert('Error fetching manual profit: ' + error.message);
    }
  };

  // Handle opening report popup
  const handleOpenReportPopup = () => {
    if (!filtersApplied || tableData.length === 0) {
      alert('Please apply filters first to generate report');
      return;
    }
    setShowReportPopup(true);
    setReportOption('');
  };

  // Handle closing report popup
  const handleCloseReportPopup = () => {
    setShowReportPopup(false);
    setReportOption('');
    setReportData([]);
  };

  // Helper function to get member joining date
  const getMemberJoiningDate = (member) => {
    return member.payment?.dateOfJoining || null;
  };

  // Helper function to get member investment dates
  const getMemberInvestments = (member) => {
    const investments = [];
    const activities = member.activities || {};
    
    Object.keys(activities).forEach(year => {
      const yearData = activities[year];
      Object.keys(yearData).forEach(month => {
        const monthData = yearData[month];
        const investment = monthData?.investment;
        
        if (investment && investment.type === 'investment') {
          // Create date from year and month
          const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month);
          if (monthIndex !== -1) {
            investments.push(new Date(parseInt(year), monthIndex, 1));
          }
        }
      });
    });
    
    return investments;
  };

  // Helper function to check if date is in last month of range (the end date's month)
  const isDateInLastMonth = (date, endDate) => {
    if (!date) return false;
    const end = new Date(endDate);
    const dateToCheck = new Date(date);
    
    // Check if the date is in the same month and year as the end date
    return dateToCheck.getFullYear() === end.getFullYear() && 
           dateToCheck.getMonth() === end.getMonth();
  };

  // Helper function to check if date is in last 3 months of range (including end date month)
  const isDateInLast3Months = (date, endDate) => {
    if (!date) return false;
    const end = new Date(endDate);
    const dateToCheck = new Date(date);
    
    // Calculate start of 3-month period: go back 2 months from end date month
    // This gives us: (endMonth - 2), (endMonth - 1), endMonth = 3 months total
    const threeMonthsStart = new Date(end.getFullYear(), end.getMonth() - 2, 1);
    
    return dateToCheck >= threeMonthsStart && dateToCheck <= end;
  };

  // Handle Generate Report
  const handleGenerateReport = async () => {
    if (!reportOption) {
      alert('Please select a report option');
      return;
    }

    if (!endDate) {
      alert('Please apply filters with end date first');
      return;
    }

    if (!distributedProfits) {
      alert('Please click "Distribute Profits" first before generating the report');
      return;
    }

    setLoading(true);
    let reportDataCopy = [...tableData];
    let ineligibleProfitTotal = 0.0; // Initialize as float
    let ineligibleCount = 0;

    if (reportOption === 'no exception') {
      // Add Donation column with "Eligible" for all
      reportDataCopy = reportDataCopy.map(member => ({
        ...member,
        donation: 'Eligible',
      }));
    } else if (reportOption === 'except last month') {
      // Check each member's joining date only (not investment dates)
      reportDataCopy = reportDataCopy.map(member => {
        const fullMember = members.find(m => m.id === member.id);
        if (!fullMember) {
          return { ...member, donation: 'Eligible' };
        }

        // Company Account (2025-002) is always eligible - EXCEPTION
        const isCompanyAccount = fullMember?.payment?.membershipId === '2025-002' || 
                                fullMember?.payment_membership_id === '2025-002';
        if (isCompanyAccount) {
          return { ...member, donation: 'Eligible' };
        }

        const joiningDate = getMemberJoiningDate(fullMember);

        // Check if joined in last month
        const joinedInLastMonth = joiningDate ? isDateInLastMonth(new Date(joiningDate), endDate) : false;

        const isIneligible = joinedInLastMonth;
        
        // If ineligible, add their profit to donation pool and set their profit to 0
        if (isIneligible && member.profitToDistribute !== null && member.profitToDistribute !== undefined) {
          const memberProfit = Number(member.profitToDistribute) || 0;
          ineligibleProfitTotal = Number(ineligibleProfitTotal) + Number(memberProfit);
          ineligibleCount++;
          return { 
            ...member, 
            donation: 'Ineligible',
            profitToDistribute: 0 // Ineligible members don't receive profit
          };
        }
        
        return { ...member, donation: 'Eligible' };
      });
    } else if (reportOption === 'except last 3 months') {
      // Check each member's joining date only (not investment dates)
      reportDataCopy = reportDataCopy.map(member => {
        const fullMember = members.find(m => m.id === member.id);
        if (!fullMember) {
          return { ...member, donation: 'Eligible' };
        }

        // Company Account (2025-002) is always eligible - EXCEPTION
        const isCompanyAccount = fullMember?.payment?.membershipId === '2025-002' || 
                                fullMember?.payment_membership_id === '2025-002';
        if (isCompanyAccount) {
          return { ...member, donation: 'Eligible' };
        }

        const joiningDate = getMemberJoiningDate(fullMember);

        // Check if joined in last 3 months
        const joinedInLast3Months = joiningDate ? isDateInLast3Months(new Date(joiningDate), endDate) : false;

        const isIneligible = joinedInLast3Months;
        
        // If ineligible, add their profit to donation pool and set their profit to 0
        if (isIneligible && member.profitToDistribute !== null && member.profitToDistribute !== undefined) {
          const memberProfit = Number(member.profitToDistribute) || 0;
          ineligibleProfitTotal = Number(ineligibleProfitTotal) + Number(memberProfit);
          ineligibleCount++;
          return { 
            ...member, 
            donation: 'Ineligible',
            profitToDistribute: 0 // Ineligible members don't receive profit
          };
        }
        
        return { ...member, donation: 'Eligible' };
      });
    }

    // Store the ineligible profit and report details for later transfer
    setTotalIneligibleProfit(ineligibleProfitTotal);
    setReportOptionUsed(reportOption);
    setReportStartDate(startDate);
    setReportEndDate(endDate);
    
    // Check if donation already exists for this period
    let donationAlreadyExists = false;
    if (ineligibleProfitTotal > 0 && (reportOption === 'except last month' || reportOption === 'except last 3 months')) {
      try {
        const { data: existingEvents, error: checkError } = await supabase
          .from('dividend_donation_events')
          .select('id')
          .eq('event_date', endDate);
        
        if (!checkError && existingEvents && existingEvents.length > 0) {
          // Check if any event matches the same period and option
          const start = new Date(startDate);
          const eventNamePattern = `Dividend Distribution ${start.toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()} (${reportOption.replace('except ', '')})`;
          
          const { data: matchingEvents } = await supabase
            .from('dividend_donation_events')
            .select('id')
            .eq('event_date', endDate)
            .ilike('event_name', `%${eventNamePattern}%`);
          
          if (matchingEvents && matchingEvents.length > 0) {
            donationAlreadyExists = true;
            setDonationTransferred(true);
          }
        }
      } catch (error) {
        console.error('Error checking existing donations:', error);
      }
    }

    // Don't automatically create dividend donation event - user will click button separately

    setReportData(reportDataCopy);
    // Close the popup after generating report
    setShowReportPopup(false);
    setReportOption('');
    setLoading(false);
    
    if (ineligibleProfitTotal > 0 && (reportOption === 'except last month' || reportOption === 'except last 3 months')) {
      if (donationAlreadyExists) {
        alert(`✅ Report generated successfully!\n\nIneligible Members: ${ineligibleCount}\nDividend Donation: ₹${ineligibleProfitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nNote: Donation for this period has already been transferred.`);
      } else {
        alert(`✅ Report generated successfully!\n\nIneligible Members: ${ineligibleCount}\nDividend Donation: ₹${ineligibleProfitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nClick "Transfer Donation to Company" button to add this amount to Company Owns Amount page.`);
      }
    } else {
      alert('✅ Report generated successfully!');
    }
  };

  // Handle Transfer Donation to Company
  const handleTransferDonation = async () => {
    if (totalIneligibleProfit <= 0) {
      alert('No donation amount to transfer.');
      return;
    }

    if (donationTransferred) {
      alert('Donation for this period has already been transferred.');
      return;
    }

    // Check if donation already exists for this period
    try {
      const start = new Date(reportStartDate);
      const end = new Date(reportEndDate);
      const eventNamePattern = `Dividend Distribution ${start.toLocaleDateString()} - ${end.toLocaleDateString()} (${reportOptionUsed.replace('except ', '')})`;
      
      const { data: existingEvents, error: checkError } = await supabase
        .from('dividend_donation_events')
        .select('id')
        .eq('event_date', reportEndDate)
        .ilike('event_name', `%${eventNamePattern}%`);
      
      if (!checkError && existingEvents && existingEvents.length > 0) {
        alert('Donation for this period has already been transferred. Cannot transfer again.');
        setDonationTransferred(true);
        return;
      }
    } catch (error) {
      console.error('Error checking existing donations:', error);
    }

    setLoading(true);
    try {
      // Get end date share price for calculating shares
      const end = new Date(reportEndDate);
      const endYear = end.getFullYear();
      const endMonth = end.toLocaleString('default', { month: 'short' });
      const endSharePrice = await fetchSharePrice(endYear, endMonth);

      if (endSharePrice && endSharePrice > 0) {
        const companyShares = totalIneligibleProfit / endSharePrice;
        
        // Generate event name based on dates and option
        const start = new Date(reportStartDate);
        const eventName = `Dividend Distribution ${start.toLocaleDateString()} - ${end.toLocaleDateString()} (${reportOptionUsed.replace('except ', '')})`;
        
        // Create dividend donation event
        // Get manual profit amount for distributed amount column
        const manualProfitAmount = currentManualProfit ? parseFloat(currentManualProfit.profit_amount) : 0;
        
        // Ensure all numeric values are properly parsed and rounded to 2 decimals for currency
        const sharePrice = parseFloat(Number(endSharePrice).toFixed(2));
        const distributionPool = parseFloat(Number(totalProfitLoss).toFixed(2));
        const companyInvestment = parseFloat(Number(totalIneligibleProfit).toFixed(2));
        const sharesPurchased = parseFloat(Number(companyShares).toFixed(2));
        const distributedAmount = parseFloat(Number(manualProfitAmount).toFixed(2));
        
        const eventData = {
          event_name: String(eventName),
          event_date: String(reportEndDate),
          share_price_at_event: sharePrice,
          distribution_pool: distributionPool,
          distributed_amount: distributedAmount,
          company_investment_amount: companyInvestment,
          company_shares_purchased: sharesPurchased,
          status: 'confirmed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: insertedData, error: eventError } = await supabase
          .from('dividend_donation_events')
          .insert(eventData)
          .select();

        if (eventError) {
          console.error('Error creating dividend donation event:', eventError);
          console.error('Event data that failed:', eventData);
          // Try to identify which field is causing the issue
          if (eventError.message && eventError.message.includes('integer')) {
            alert('Failed to transfer donation.\n\nError: A field expects integer but received decimal.\n\nPlease check the database schema - monetary fields should be numeric type, not integer.\n\nError details: ' + eventError.message);
          } else {
            alert('Failed to transfer donation: ' + eventError.message);
          }
        } else {
          setDonationTransferred(true);
          alert(`✅ Donation transferred successfully!\n\nAmount: ₹${totalIneligibleProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nThis amount has been added to Company Owns Amount page.`);
        }
      } else {
        alert('Could not transfer donation: Share price not found for end date.');
      }
    } catch (error) {
      console.error('Error transferring donation:', error);
      alert('Failed to transfer donation: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-amber-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/admin')}
            className="mb-4 flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Dividend Distribution</h1>
          <p className="text-gray-600 mt-2">Calculate and distribute profits based on share price changes</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Tiles Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Number of Shares Tile */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total Number of Shares</div>
            <div className="text-3xl font-bold text-gray-900">
              {totalShares.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Total Profit/Loss Tile */}
          <div className={`rounded-lg shadow-sm border p-6 ${
            totalProfitLoss >= 0 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className={`text-sm mb-1 ${
              totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              Total Profit/Loss
              {distributedProfits && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Manual Entry
                </span>
              )}
            </div>
            <div className={`text-3xl font-bold ${
              totalProfitLoss >= 0 ? 'text-green-800' : 'text-red-800'
            }`}>
              ₹{totalProfitLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Manual Profit Entry Tile */}
          <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-6">
            <div className="text-sm text-blue-600 mb-1">Manual Profit Entry</div>
            <div className="text-2xl font-bold text-blue-800 mb-3">
              {currentManualProfit ? 
                `₹${parseFloat(currentManualProfit.profit_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 
                'Not Set'
              }
            </div>
            {currentManualProfit && (
              <div className="text-xs text-blue-600 mb-3">{currentManualProfit.description}</div>
            )}
            <button
              onClick={() => setShowProfitEntry(true)}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              {currentManualProfit ? 'Update Profit' : 'Set Profit'}
            </button>
          </div>
        </div>

        {/* Profit Distribution Per Share Tile */}
        {filtersApplied && profitDistributionPerShare !== 0 && (
          <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-4 mb-6 max-w-md">
            <div className="text-sm text-blue-600 mb-1">Profit Distribution Per Share</div>
            <div className="text-xl font-bold text-blue-800">
              ₹{profitDistributionPerShare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        )}

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Date Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleApplyFilters}
                disabled={loading || !startDate || !endDate}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Applying...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>

        {/* Table Section */}
        {filtersApplied && tableData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Member Details</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        S.No.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mobile Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Number of Shares
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profit to be Distributed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.sNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {member.membershipId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.mobileNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {member.totalShares.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {member.profitToDistribute !== null ? (
                            <span className={`font-medium ${
                              member.profitToDistribute > 0 ? 'text-green-600' : 
                              member.profitToDistribute < 0 ? 'text-red-600' : 
                              'text-gray-500'
                            }`}>
                              ₹{member.profitToDistribute.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Distribute Profits Button */}
        {filtersApplied && (
          <div className="flex justify-end mb-6">
            <button
              onClick={handleDistributeProfits}
              disabled={distributedProfits || profitDistributionPerShare === 0}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Distribute Profits
            </button>
          </div>
        )}

        {/* Generate Report Button */}
        {filtersApplied && (
          <div className="mb-6">
            <button
              onClick={handleOpenReportPopup}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Generate Report
            </button>
          </div>
        )}

        {/* Dividend Donation History Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Dividend Donation History</h2>
              <button
                onClick={fetchDonationHistory}
                disabled={loadingHistory}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:opacity-50"
              >
                {loadingHistory ? 'Refreshing...' : '🔄 Refresh'}
              </button>
            </div>
            
            {loadingHistory ? (
              <div className="text-center py-8 text-gray-500">Loading history...</div>
            ) : donationHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No dividend donation history found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        S.No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Share Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Available Distribution Pool
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Distributed Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company Investment
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shares Purchased
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {donationHistory.map((event, index) => {
                      const eventDate = event.event_date ? new Date(event.event_date).toLocaleDateString('en-IN') : 'N/A';
                      const createdDate = event.created_at ? new Date(event.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A';
                      
                      return (
                        <tr key={event.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                            <div className="truncate" title={event.event_name || 'N/A'}>
                              {event.event_name || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {eventDate}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            ₹{parseFloat(event.share_price_at_event || 0).toLocaleString('en-IN', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            ₹{parseFloat(event.distribution_pool || 0).toLocaleString('en-IN', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600 text-right">
                            ₹{parseFloat(event.distributed_amount || 0).toLocaleString('en-IN', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                            ₹{parseFloat(event.company_investment_amount || 0).toLocaleString('en-IN', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {parseFloat(event.company_shares_purchased || 0).toLocaleString('en-IN', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              event.status === 'confirmed' 
                                ? 'bg-green-100 text-green-800' 
                                : event.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {event.status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {createdDate}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {donationHistory.length > 0 && (
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="4" className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                          Total:
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                          ₹{donationHistory.reduce((sum, event) => 
                            sum + parseFloat(event.distribution_pool || 0), 0
                          ).toLocaleString('en-IN', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-blue-600 text-right">
                          ₹{donationHistory.reduce((sum, event) => 
                            sum + parseFloat(event.distributed_amount || 0), 0
                          ).toLocaleString('en-IN', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">
                          ₹{donationHistory.reduce((sum, event) => 
                            sum + parseFloat(event.company_investment_amount || 0), 0
                          ).toLocaleString('en-IN', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                          {donationHistory.reduce((sum, event) => 
                            sum + parseFloat(event.company_shares_purchased || 0), 0
                          ).toLocaleString('en-IN', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Report Display */}
        {reportData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Generated Report</h2>
                <div className="flex gap-2">
                  {totalIneligibleProfit > 0 && (reportOptionUsed === 'except last month' || reportOptionUsed === 'except last 3 months') && (
                    <button
                      onClick={handleTransferDonation}
                      disabled={donationTransferred || loading}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        donationTransferred
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      {donationTransferred 
                        ? `Donation Transferred ✓ (₹${totalIneligibleProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                        : `Transfer Donation to Company (₹${totalIneligibleProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                      }
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setReportData([]);
                      setTotalIneligibleProfit(0);
                      setDonationTransferred(false);
                      setReportOptionUsed('');
                      setReportStartDate('');
                      setReportEndDate('');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Close Report
                  </button>
                </div>
              </div>
              {totalIneligibleProfit > 0 && (reportOptionUsed === 'except last month' || reportOptionUsed === 'except last 3 months') && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Donation Amount:</strong> ₹{totalIneligibleProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {donationTransferred && <span className="ml-2 text-green-600">✓ Already Transferred</span>}
                  </p>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        S.No.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mobile Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Number of Shares
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profit to be Distributed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Donation
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.sNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {member.membershipId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.mobileNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {member.totalShares.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {member.profitToDistribute !== null ? (
                            <span className={`font-medium ${
                              member.profitToDistribute > 0 ? 'text-green-600' : 
                              member.profitToDistribute < 0 ? 'text-red-600' : 
                              'text-gray-500'
                            }`}>
                              ₹{member.profitToDistribute.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            member.donation === 'Eligible' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {member.donation}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Report Popup Modal */}
      {showReportPopup && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md"
          onClick={handleCloseReportPopup}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Generate Report</h3>
              <button
                onClick={handleCloseReportPopup}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Report Option:
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="reportOption"
                    value="no exception"
                    checked={reportOption === 'no exception'}
                    onChange={(e) => setReportOption(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-gray-700">No exception</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="reportOption"
                    value="except last month"
                    checked={reportOption === 'except last month'}
                    onChange={(e) => setReportOption(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-gray-700">Except last month</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="reportOption"
                    value="except last 3 months"
                    checked={reportOption === 'except last 3 months'}
                    onChange={(e) => setReportOption(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-gray-700">Except last 3 months</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerateReport}
                disabled={!reportOption || loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Profit Entry Modal */}
      {showProfitEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Set Manual Profit</h2>
              <button
                onClick={() => setShowProfitEntry(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profit Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={profitAmount}
                  onChange={(e) => setProfitAmount(e.target.value)}
                  placeholder="Enter profit amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={profitDescription}
                  onChange={(e) => setProfitDescription(e.target.value)}
                  placeholder="e.g., Q4 2024 Profit Distribution"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {currentManualProfit && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Current:</strong> ₹{parseFloat(currentManualProfit.profit_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">{currentManualProfit.description}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowProfitEntry(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfit}
                disabled={savingProfit}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {savingProfit ? 'Saving...' : 'Save Profit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dividend;
