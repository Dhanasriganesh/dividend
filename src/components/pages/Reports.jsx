import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/config';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const Reports = () => {
  const navigate = useNavigate();
  const { userRole, hasReportAccess } = useAuth();
  const [reportType, setReportType] = useState('DIVIDEND_REPORT');
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().toLocaleString('default', { month: 'short' }));
  const [generating, setGenerating] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const currentYear = new Date().getFullYear();
  const yearsOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Report type definitions
  const allReportTypes = {
    'DIVIDEND_REPORT': 'Dividend Report',
    'CONSOLIDATED_REPORT': 'Company Valuation Report',
    'DIRECTORS_REPORT': 'Directors Valuation Report',
    'FETCH_ALL_DETAILS': 'Complete System Report',
    'CONSOLIDATED_SHARES': 'Share Distribution Report',
    'TOTAL_COMPANY_POOLED': 'Company Funds Report',
    'MONTHLY_FUNDING_AUDIT': 'Monthly Audit Report',
    'NEW_SHARES_CURRENT': 'Current Month Shares Report',
    'NEW_SHARES_MONTHWISE': 'Monthly Shares Report'
  };

  // Filter report types based on user role and permissions
  const reportTypes = Object.fromEntries(
    Object.entries(allReportTypes).filter(([key]) => {
      // Admin has access to all reports
      if (userRole === 'admin') {
        return true;
      }
      // Employees only see reports they have access to
      return hasReportAccess(key);
    })
  );

  // Set default report type to first available report if current one is not accessible
  useEffect(() => {
    if (!reportTypes[reportType] && Object.keys(reportTypes).length > 0) {
      setReportType(Object.keys(reportTypes)[0]);
    }
  }, [reportTypes, reportType]);


  // Resolve possible month key variants in stored data
  const monthIndexMap = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const monthFullNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  
  const getMonthKeyCandidates = (monthLabel) => {
    const idx = monthIndexMap[monthLabel] ?? null;
    const candidates = [];
    if (idx !== null) {
      candidates.push(monthLabel);
      if (monthLabel === 'Sep') candidates.push('Sept');
      candidates.push(monthFullNames[idx]);
      candidates.push(String(idx + 1));
      candidates.push(String(idx + 1).padStart(2, '0'));
    } else {
      candidates.push(monthLabel);
      candidates.push(monthLabel?.slice(0,3));
    }
    return candidates;
  };

  const getPaymentFor = (member, year, monthLabel) => {
    const y = member.payments?.[year] || {};
    const keys = getMonthKeyCandidates(monthLabel);
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(y, k)) {
        return y[k];
      }
    }
    return undefined;
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    
    try {
      switch (reportType) {
        case 'DIVIDEND_REPORT':
          await generateDividendReport();
          break;
        case 'CONSOLIDATED_REPORT':
          await generateConsolidatedReport();
          break;
        case 'DIRECTORS_REPORT':
          await generateDirectorsReport();
          break;
        case 'FETCH_ALL_DETAILS':
          await generateFetchAllDetailsReport();
          break;
        case 'CONSOLIDATED_SHARES':
          await generateConsolidatedSharesReport();
          break;
        case 'TOTAL_COMPANY_POOLED':
          await generateTotalCompanyPooledReport();
          break;
        case 'MONTHLY_FUNDING_AUDIT':
          await generateMonthlyFundingAuditReport();
          break;
        case 'NEW_SHARES_CURRENT':
          await generateNewSharesCurrentReport();
          break;
        case 'NEW_SHARES_MONTHWISE':
          await generateNewSharesMonthwiseReport();
          break;
        default:
          alert('Please select a valid report type.');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    }
    
    setGenerating(false);
  };

  // Report generation functions for each document type
  const generateDividendReport = async () => {
    const monthIdx = months.indexOf(reportMonth);
    if (monthIdx === -1) {
      alert('Invalid month selected for the dividend report.');
      return;
    }

    const monthStartDate = new Date(Date.UTC(reportYear, monthIdx, 1));
    const monthEndDate = new Date(Date.UTC(reportYear, monthIdx + 1, 0));
    const formatISODate = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    const monthStartISO = formatISODate(monthStartDate);
    const monthEndISO = formatISODate(monthEndDate);

    const formatDateForReport = (value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const mon = months[date.getMonth()] || '';
      return `${day}-${mon}-${date.getFullYear()}`;
    };

    const isDateInSelectedMonth = (value) => {
      if (!value) return false;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return false;
      return (
        date.getFullYear() === reportYear &&
        date.getMonth() === monthIdx
      );
    };

    const parseAmount = (value) => {
      const num = parseFloat(value);
      return Number.isFinite(num) ? num : 0;
    };

    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .not('payment', 'is', null);

    if (error) {
      console.error('Error fetching members:', error);
      return;
    }

    const sharePriceMonthCandidates = getMonthKeyCandidates(reportMonth);
    const { data: sharePriceRows, error: sharePriceError } = await supabase
      .from('share_prices')
      .select('price, month')
      .eq('year', reportYear)
      .in('month', sharePriceMonthCandidates)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (sharePriceError) {
      console.error('Error fetching share price:', sharePriceError);
      alert('Unable to fetch share price for the selected period.');
      return;
    }

    const currentSharePrice = sharePriceRows?.[0]?.price;
    if (!currentSharePrice) {
      alert(`Share price not set for ${reportMonth} ${reportYear}. Please update the Share Price page first.`);
      return;
    }

    const { data: dividendEventsData, error: eventsError } = await supabase
      .from('dividend_donation_events')
      .select('*')
      .eq('status', 'confirmed')
      .gte('event_date', monthStartISO)
      .lte('event_date', monthEndISO)
      .order('event_date', { ascending: false });

    if (eventsError) {
      console.error('Error fetching dividend events:', eventsError);
      alert('Unable to fetch dividend events for the selected month.');
      return;
    }

    const dividendEvents = dividendEventsData || [];
    const dividendEvent = dividendEvents[0] || null;
    const dividendOccurred = Boolean(dividendEvent);
    const totalShares = members.reduce((sum, member) => sum + (parseAmount(member.total_shares) || 0), 0);

    const totalMemberDistribution = dividendOccurred
      ? Math.max(
          0,
          parseAmount(dividendEvent.distribution_pool) - parseAmount(dividendEvent.company_investment_amount)
        )
      : 0;

    const dividendPerShare = dividendOccurred && totalShares > 0
      ? totalMemberDistribution / totalShares
      : 0;

    const partARows = members.map((member, index) => {
      const payment = member.payment || {};
      const memberShares = parseAmount(member.total_shares);
      const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();
      const dividendAmount = dividendOccurred ? Number((memberShares * dividendPerShare).toFixed(2)) : undefined;

      return {
        'S. No.': index + 1,
        'MEMBER NAME': memberDisplayName,
        'TOTAL NO.OF SHARES/ CUMMULATIVE SHARES': Number(memberShares.toFixed(2)),
        'DIVIDEND': dividendAmount
      };
    });

    const summaryRow = {
      'S. No.': members.length + 1,
      'MEMBER NAME': 'TOTAL COMPANY SUMMARY',
      'TOTAL NO.OF SHARES/ CUMMULATIVE SHARES': Number(totalShares.toFixed(2)),
      'DIVIDEND': dividendOccurred ? Number(totalMemberDistribution.toFixed(2)) : undefined
    };

    partARows.push(summaryRow);

    const worksheet = XLSX.utils.json_to_sheet(partARows);

    // Get the range of Part A to find where Part B should start
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const partBStartRow = range.e.r + 4; // Start Part B a few rows after Part A ends
    
    // Add Part B header
    const partBHeader = 'PART-B COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL BASED DIVIDEND';
    XLSX.utils.sheet_add_aoa(worksheet, [[partBHeader]], { origin: `A${partBStartRow}` });
    
    // Add Part B column headers
    const partBHeaders = ['ID NUMBER', 'TOTAL COMPANY OWNED SHARES', 'DIVIDEND AMOUNT'];
    XLSX.utils.sheet_add_aoa(worksheet, [partBHeaders], { origin: `A${partBStartRow + 1}` });
    
    // Fetch Part B data - Company Account (membershipId: 2025-002)
    const companyAccount = members.find(m => {
      const payment = m.payment || {};
      const membershipId = payment.membershipId || '';
      const name = (m.name || '').trim().toLowerCase();
      return membershipId === '2025-002' && name === 'company account';
    });

    // Prepare Part B data rows
    const partBRows = [];
    if (companyAccount) {
      const companyShares = parseAmount(companyAccount.total_shares);
      const companyDividend = dividendOccurred 
        ? Number((companyShares * dividendPerShare).toFixed(2))
        : undefined;
      
      // Add company account row to Part B
      partBRows.push([
        '2025-002', // ID NUMBER
        Number(companyShares.toFixed(2)), // TOTAL COMPANY OWNED SHARES
        companyDividend // DIVIDEND AMOUNT (undefined if no dividend event)
      ]);
    }
    
    // Add Part B data rows
    partBRows.forEach((row, index) => {
      XLSX.utils.sheet_add_aoa(worksheet, [row], { origin: `A${partBStartRow + 2 + index}` });
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dividend Report');
    XLSX.writeFile(workbook, `admin-DIVIDEND REPORT WITH CUSTOM DATE OF SHARES ALLOTMENT BASIS_${reportYear}_${reportMonth}.xlsx`);
  };

  const generateConsolidatedReport = async () => {
    const monthIdx = months.indexOf(reportMonth);
    if (monthIdx === -1) {
      alert('Invalid month selected for the valuation report.');
      return;
    }

    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .not('payment', 'is', null);

    if (error) {
      console.error('Error fetching members:', error);
      return;
    }

    // Get share price for the selected month/year
    const sharePriceMonthCandidates = getMonthKeyCandidates(reportMonth);
    const { data: sharePriceRows, error: sharePriceError } = await supabase
      .from('share_prices')
      .select('price, month')
      .eq('year', reportYear)
      .in('month', sharePriceMonthCandidates)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (sharePriceError) {
      console.error('Error fetching share price:', sharePriceError);
      alert('Unable to fetch share price for the selected period.');
      return;
    }

    const currentSharePrice = sharePriceRows?.[0]?.price;
    if (!currentSharePrice) {
      alert(`Share price not set for ${reportMonth} ${reportYear}. Please update the Share Price page first.`);
      return;
    }

    const parseAmount = (value) => {
      const num = parseFloat(value);
      return Number.isFinite(num) ? num : 0;
    };

    // Create PART-A MEMBERS CAPITAL section - filter by selected month/year
    const reportYearStr = String(reportYear);
    const monthKeyCandidates = getMonthKeyCandidates(reportMonth);
    const currMonIdx = months.indexOf(reportMonth);

    const memberCapitalRows = members.map((member, index) => {
      const payment = member.payment || {};
      
      // Calculate shares ONLY for the selected month/year
      let monthShares = 0;
      const activities = member.activities || {};
      const yearData = activities[reportYearStr] || activities[reportYear] || {};
      
      // Check all month key candidates for the selected month
      let monthData = null;
      for (const monthKey of monthKeyCandidates) {
        if (yearData[monthKey]) {
          monthData = yearData[monthKey];
          break;
        }
      }
      
      const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
      if (inv) {
        monthShares = parseAmount(inv.shares);
      }
      
      const valuation = monthShares * currentSharePrice;
      
      // Format member name (similar to other reports)
      const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();

      return {
        'S. No.': index + 1,
        'MEMBER NAME': memberDisplayName,
        'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
        'TOTAL SHARES': Number(monthShares.toFixed(2)),
        'VALUATION': Number(valuation.toFixed(2))
      };
    });

    // Add summary row at the end - only for selected month
    const totalShares = memberCapitalRows.reduce((sum, row) => sum + parseAmount(row['TOTAL SHARES']), 0);
    const totalValuation = totalShares * currentSharePrice;

    const summaryRow = {
      'S. No.': members.length + 1,
      'MEMBER NAME': 'TOTAL COMPANY SUMMARY',
      'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
      'TOTAL SHARES': Number(totalShares.toFixed(2)),
      'VALUATION': Number(totalValuation.toFixed(2))
    };

    memberCapitalRows.push(summaryRow);

    // Create PART-A MEMBERS CAPITAL worksheet
    const worksheet = XLSX.utils.json_to_sheet(memberCapitalRows);
    
    // Get the range of Part A to find where Part B should start
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const partBStartRow = range.e.r + 4; // Start Part B a few rows after Part A ends
    
    // ========== PART B: COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL ==========
    
    // Add Part B header
    const partBHeader = 'PART-B COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL';
    XLSX.utils.sheet_add_aoa(worksheet, [[partBHeader]], { origin: `A${partBStartRow}` });
    
    // Add blank row for spacing
    XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 1}` });
    
    // Section (i): MEMBERSHIP AMOUNT - Calculate shares from registration fees
    const sectionIHeader = '(i). MEMBERSHIP AMOUNT';
    XLSX.utils.sheet_add_aoa(worksheet, [[sectionIHeader]], { origin: `A${partBStartRow + 2}` });
    const sectionIText = 'FETCH TOTAL SHARES THROUGH MEMBERSHIP';
    XLSX.utils.sheet_add_aoa(worksheet, [[sectionIText]], { origin: `A${partBStartRow + 3}` });
    
    // Fetch company transactions to calculate shares from different sources
    const { data: companyTransactions, error: txError } = await supabase
      .from('company_transactions')
      .select('*')
      .eq('membership_id', '2025-002')
      .eq('type', 'investment')
      .order('created_at', { ascending: true });

    // Calculate total registration amount from all members (paid amounts only)
    const totalRegistrationAmount = members.reduce((sum, member) => {
      const payment = member.payment || {};
      const totalAmount = parseAmount(payment.payingMembershipAmount || payment.membershipAmount);
      const dueAmount = parseAmount(payment.dueAmount);
      const paymentStatus = (payment.paymentStatus || '').toLowerCase();
      const paidAmount = paymentStatus === 'due' ? totalAmount - dueAmount : totalAmount;
      return sum + (paidAmount > 0 ? paidAmount : 0);
    }, 0);

    // Calculate total fine amount from all members
    const totalFineAmount = members.reduce((sum, member) => {
      const activities = member.activities || {};
      let memberFines = 0;
      Object.values(activities).forEach(yearData => {
        Object.values(yearData || {}).forEach(monthData => {
          const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
          if (inv) {
            memberFines += parseAmount(inv.fine);
          }
        });
      });
      // Also check legacy payments
      const payments = member.payments || {};
      Object.values(payments).forEach(yearData => {
        Object.values(yearData || {}).forEach(monthData => {
          if (monthData && typeof monthData === 'object') {
            memberFines += parseAmount(monthData.fine);
          }
        });
      });
      return sum + memberFines;
    }, 0);

    // Separate shares by transaction type
    let membershipShares = 0;
    let fineShares = 0;
    let mixedShares = 0;
    let mixedRegAmount = 0;
    let mixedFineAmount = 0;

    if (!txError && companyTransactions) {
      companyTransactions.forEach(tx => {
        const desc = (tx.description || '').toLowerCase();
        const txShares = parseAmount(tx.shares);
        const txAmount = parseAmount(tx.amount);
        const txFine = parseAmount(tx.fine);

        if (desc.includes('auto-invest registration')) {
          // Pure registration investment
          membershipShares += txShares;
        } else if (desc.includes('auto-invest company balance') || desc.includes('auto-bal')) {
          // Mixed investment (registration + fines)
          mixedShares += txShares;
          // Extract registration and fine amounts from description or use transaction amounts
          // Description format: "Auto-invest company balance (Reg: ₹X + Fines: ₹Y)"
          const regMatch = desc.match(/reg[:\s]*₹?([\d,]+\.?\d*)/i);
          const fineMatch = desc.match(/fine[:\s]*₹?([\d,]+\.?\d*)/i);
          const extractedReg = regMatch ? parseAmount(regMatch[1].replace(/,/g, '')) : 0;
          const extractedFine = fineMatch ? parseAmount(fineMatch[1].replace(/,/g, '')) : txFine;
          
          mixedRegAmount += extractedReg > 0 ? extractedReg : (txAmount - txFine);
          mixedFineAmount += extractedFine;
        }
        // Dividend investments are handled separately below
      });

      // Calculate proportional shares from mixed investments
      if (mixedShares > 0 && (mixedRegAmount + mixedFineAmount) > 0) {
        const regProportion = mixedRegAmount / (mixedRegAmount + mixedFineAmount);
        const fineProportion = mixedFineAmount / (mixedRegAmount + mixedFineAmount);
        membershipShares += mixedShares * regProportion;
        fineShares += mixedShares * fineProportion;
      }
    }

    // Add membership shares data (section header already added above)
    XLSX.utils.sheet_add_aoa(worksheet, [[Number(membershipShares.toFixed(2))]], { origin: `A${partBStartRow + 4}` });
    XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 5}` });
    
    // Section (ii): FINE AMOUNT - Calculate shares from fines
    const sectionIIHeader = '(ii). FINE AMOUNT';
    XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIHeader]], { origin: `A${partBStartRow + 6}` });
    const sectionIIText = 'FETCH TOTAL SHARES THROUGH FINE AMOUNT';
    XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIText]], { origin: `A${partBStartRow + 7}` });
    
    // Add fine shares data
    XLSX.utils.sheet_add_aoa(worksheet, [[Number(fineShares.toFixed(2))]], { origin: `A${partBStartRow + 8}` });
    XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 9}` });
    
    // Calculate total shares from dividend donations (before adding section)
    const { data: dividendEvents, error: dividendError } = await supabase
      .from('dividend_donation_events')
      .select('company_shares_purchased')
      .eq('status', 'confirmed');

    let dividendShares = 0;
    if (!dividendError && dividendEvents) {
      dividendShares = dividendEvents.reduce((sum, event) => {
        return sum + parseAmount(event.company_shares_purchased);
      }, 0);
    }
    
    // Section (iii): DIVIDEND DONATION - Get shares from dividend events
    const sectionIIIHeader = '(iii). DIVIDEND DONATION';
    XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIIHeader]], { origin: `A${partBStartRow + 10}` });
    const sectionIIIText = 'FETCH TOTAL SHARES THROUGH DIVIDEND DONATION';
    XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIIText]], { origin: `A${partBStartRow + 11}` });
    
    // Add dividend shares data
    XLSX.utils.sheet_add_aoa(worksheet, [[Number(dividendShares.toFixed(2))]], { origin: `A${partBStartRow + 12}` });
    XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 13}` });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PART-A MEMBERS CAPITAL');
    
    XLSX.writeFile(workbook, `admin-CONSOLIDATED REPORT OF VALUATION OF THE COMPANY IN THE SHARES AND AMOUNT_${reportYear}_${reportMonth}.xlsx`);
  };

  const generateDirectorsReport = async () => {
    const monthIdx = months.indexOf(reportMonth);
    if (monthIdx === -1) {
      alert('Invalid month selected for the directors report.');
      return;
    }

    // Get share price for the selected month/year
    const sharePriceMonthCandidates = getMonthKeyCandidates(reportMonth);
    const { data: sharePriceRows, error: priceError } = await supabase
      .from('share_prices')
      .select('price, month')
      .eq('year', reportYear)
      .in('month', sharePriceMonthCandidates)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (priceError) {
      console.error('Error fetching share prices:', priceError);
      alert('Unable to fetch share price for the selected period.');
      return;
    }

    const currentSharePrice = sharePriceRows?.[0]?.price;
    if (!currentSharePrice) {
      alert(`Share price not set for ${reportMonth} ${reportYear}. Please update the Share Price page first.`);
      return;
    }
    
    // Get all members with their investment data
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
      .not('payment', 'is', null);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return;
    }

    const parseAmount = (value) => {
      const num = parseFloat(value);
      return Number.isFinite(num) ? num : 0;
    };

    // Get month key candidates for filtering
    const monthKeyCandidates = getMonthKeyCandidates(reportMonth);
    const reportYearStr = String(reportYear);

    // Create member-wise directors report - filter by selected month/year ONLY
    const rows = members.map((member, index) => {
      const payment = member.payment || {};
      
      // Calculate pooled investment ONLY for the selected month/year
      let pooledInvestment = 0;
      let monthShares = 0;
      const activities = member.activities || {};
      const yearData = activities[reportYearStr] || activities[reportYear] || {};
      
      // Check all month key candidates for the selected month
      let monthData = null;
      for (const monthKey of monthKeyCandidates) {
        if (yearData[monthKey]) {
          monthData = yearData[monthKey];
          break;
        }
      }
      
      const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
      if (inv) {
        // Investment amount for this month only (excluding fines)
        pooledInvestment = parseAmount(inv.amount);
        monthShares = parseAmount(inv.shares);
      }

      // Use shares from selected month only for valuation
      const totalShares = monthShares;
      const valuation = totalShares * currentSharePrice;
      
      // Format member name with ID and name (similar to the image format)
      const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();

      return {
        'S. No.': index + 1,
        'MEMBER NAME': memberDisplayName,
        'POOLED INVESTMENT': pooledInvestment > 0 ? Number(pooledInvestment.toFixed(2)) : 'FETCH AMOUNT OF INVESTMENT EXCEPT FINE',
        'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
        'TOTAL SHARES': Number(totalShares.toFixed(2)),
        'VALUATION': Number(valuation.toFixed(2))
      };
    });

    // Add summary row at the end - calculate totals ONLY for selected month
    const totalPooledInvestment = members.reduce((sum, member) => {
      const activities = member.activities || {};
      const yearData = activities[reportYearStr] || activities[reportYear] || {};
      
      let monthData = null;
      for (const monthKey of monthKeyCandidates) {
        if (yearData[monthKey]) {
          monthData = yearData[monthKey];
          break;
        }
      }
      
      const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
      if (inv) {
        return sum + parseAmount(inv.amount);
      }
      return sum;
    }, 0);

    // Calculate total shares ONLY for selected month for all members
    const totalShares = members.reduce((sum, member) => {
      const activities = member.activities || {};
      const yearData = activities[reportYearStr] || activities[reportYear] || {};
      
      let monthData = null;
      for (const monthKey of monthKeyCandidates) {
        if (yearData[monthKey]) {
          monthData = yearData[monthKey];
          break;
        }
      }
      
      const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
      if (inv) {
        return sum + parseAmount(inv.shares);
      }
      return sum;
    }, 0);
    const totalValuation = totalShares * currentSharePrice;

    const summaryRow = {
      'S. No.': members.length + 1,
      'MEMBER NAME': 'TOTAL COMPANY SUMMARY',
      'POOLED INVESTMENT': Number(totalPooledInvestment.toFixed(2)),
      'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
      'TOTAL SHARES': Number(totalShares.toFixed(2)),
      'VALUATION': Number(totalValuation.toFixed(2))
    };

    rows.push(summaryRow);

    // Create Part A worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);
    
    // Get the range of Part A to find where Part B should start
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const partBStartRow = range.e.r + 4; // Start Part B a few rows after Part A ends
    
    // ========== PART B: COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL ==========
    
    // Add Part B header
    const partBHeader = 'PART-B COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL';
    XLSX.utils.sheet_add_aoa(worksheet, [[partBHeader]], { origin: `A${partBStartRow}` });
    
    // Add blank row for spacing
    XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 1}` });
    
    // Section (i): MEMBERSHIP AMOUNT - Calculate total membership amount collected for selected month
    const sectionIHeader = '(i). MEMBERSHIP AMOUNT';
    XLSX.utils.sheet_add_aoa(worksheet, [[sectionIHeader]], { origin: `A${partBStartRow + 2}` });
    const sectionIText = 'FETCH TOTAL MEMBERSHIP AMOUNT COLLECTED';
    XLSX.utils.sheet_add_aoa(worksheet, [[sectionIText]], { origin: `A${partBStartRow + 3}` });
    
    // Calculate total registration amount from all members for the selected month/year or before
    const totalRegistrationAmount = members.reduce((sum, member) => {
      const payment = member.payment || {};
      const dateOfJoining = payment.dateOfJoining || payment.date_of_joining || member.created_at;
      
      if (!dateOfJoining) return sum;
      
      const joinDate = new Date(dateOfJoining);
      const joinYear = joinDate.getFullYear();
      const joinMonth = joinDate.toLocaleString('default', { month: 'short' });
      const joinMonthIdx = months.indexOf(joinMonth);
      
      // Include if registration is in the selected month/year or before
      if (joinYear < reportYear || (joinYear === reportYear && joinMonthIdx <= monthIdx)) {
        const totalAmount = parseAmount(payment.payingMembershipAmount || payment.membershipAmount);
        const dueAmount = parseAmount(payment.dueAmount);
        const paymentStatus = (payment.paymentStatus || '').toLowerCase();
        const paidAmount = paymentStatus === 'due' ? totalAmount - dueAmount : totalAmount;
        return sum + (paidAmount > 0 ? paidAmount : 0);
      }
      
      return sum;
    }, 0);

    // Add membership amount data
    XLSX.utils.sheet_add_aoa(worksheet, [[Number(totalRegistrationAmount.toFixed(2))]], { origin: `A${partBStartRow + 4}` });
    XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 5}` });
    
    // Section (ii): FINE AMOUNT - Calculate total fine amount collected for selected month for selected month
    const sectionIIHeader = '(ii). FINE AMOUNT';
    XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIHeader]], { origin: `A${partBStartRow + 6}` });
    const sectionIIText = 'FETCH TOTAL AMOUNT COLLECTED';
    XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIText]], { origin: `A${partBStartRow + 7}` });
    
    // Calculate total fine amount from all members for the selected month/year
    const totalFineAmount = members.reduce((sum, member) => {
      const activities = member.activities || {};
      const yearData = activities[reportYearStr] || activities[reportYear] || {};
      
      // Check all month key candidates
      let monthData = null;
      for (const monthKey of monthKeyCandidates) {
        if (yearData[monthKey]) {
          monthData = yearData[monthKey];
          break;
        }
      }
      
      let memberFines = 0;
      const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
      if (inv) {
        memberFines += parseAmount(inv.fine);
      }
      
      // Also check legacy payments for the selected month/year
      const payments = member.payments || {};
      const paymentYearData = payments[reportYearStr] || payments[reportYear] || {};
      for (const monthKey of monthKeyCandidates) {
        if (paymentYearData[monthKey]) {
          const paymentMonthData = paymentYearData[monthKey];
          if (paymentMonthData && typeof paymentMonthData === 'object') {
            memberFines += parseAmount(paymentMonthData.fine);
          }
        }
      }
      
      return sum + memberFines;
    }, 0);
    
    // Add fine amount data
    XLSX.utils.sheet_add_aoa(worksheet, [[Number(totalFineAmount.toFixed(2))]], { origin: `A${partBStartRow + 8}` });
    XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 9}` });
    
    // Calculate total dividend donation amount for selected month/year (before adding section)
    const monthStart = new Date(reportYear, monthIdx, 1);
    const monthEnd = new Date(reportYear, monthIdx + 1, 0, 23, 59, 59, 999);
    const monthStartISO = monthStart.toISOString().split('T')[0];
    const monthEndISO = monthEnd.toISOString().split('T')[0];

    const { data: dividendEvents, error: dividendError } = await supabase
      .from('dividend_donation_events')
      .select('company_investment_amount, event_date')
      .eq('status', 'confirmed')
      .gte('event_date', monthStartISO)
      .lte('event_date', monthEndISO);

    let dividendDonationAmount = 0;
    if (!dividendError && dividendEvents) {
      dividendDonationAmount = dividendEvents.reduce((sum, event) => {
        return sum + parseAmount(event.company_investment_amount);
      }, 0);
    }
    
    // Section (iii): DIVIDEND DONATION - Get amount from dividend events
    const sectionIIIHeader = '(iii). DIVIDEND DONATION';
    XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIIHeader]], { origin: `A${partBStartRow + 10}` });
    const sectionIIIText = 'FETCH TOTAL AMOUNT COLLECTED';
    XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIIText]], { origin: `A${partBStartRow + 11}` });
    
    // Add dividend donation amount data
    XLSX.utils.sheet_add_aoa(worksheet, [[Number(dividendDonationAmount.toFixed(2))]], { origin: `A${partBStartRow + 12}` });
    XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 13}` });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Directors Report');
    XLSX.writeFile(workbook, `admin-DIRECTORS REPORT FOR VALUTION OF THE COMPANY_${reportYear}_${reportMonth}.xlsx`);
  };

  const generateFetchAllDetailsReport = async () => {
    try {
      const monthIdx = months.indexOf(reportMonth);
      if (monthIdx === -1) {
        alert('Invalid month selected for the complete system report.');
        return;
      }

      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('*');

      if (membersError) {
        console.error('Error fetching members:', membersError);
        alert('Unable to fetch members data.');
        return;
      }

      if (!members || members.length === 0) {
        alert('No members found.');
        return;
      }

      // Get share price for the selected month/year
      const sharePriceMonthCandidates = getMonthKeyCandidates(reportMonth);
      const { data: sharePriceRows, error: priceError } = await supabase
        .from('share_prices')
        .select('price, month')
        .eq('year', reportYear)
        .in('month', sharePriceMonthCandidates)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (priceError) {
        console.error('Error fetching share price:', priceError);
        alert('Unable to fetch share price for the selected period.');
        return;
      }

      const currentSharePrice = sharePriceRows?.[0]?.price;
      if (!currentSharePrice) {
        alert(`Share price not set for ${reportMonth} ${reportYear}. Please update the Share Price page first.`);
        return;
      }

    const parseAmount = (value) => {
      const num = parseFloat(value);
      return Number.isFinite(num) ? num : 0;
    };

      // Check for dividend event in selected month
      const monthStart = new Date(reportYear, monthIdx, 1);
      const monthEnd = new Date(reportYear, monthIdx + 1, 0, 23, 59, 59, 999);
      const monthStartISO = monthStart.toISOString().split('T')[0];
      const monthEndISO = monthEnd.toISOString().split('T')[0];

      const { data: dividendEventsData, error: eventsError } = await supabase
        .from('dividend_donation_events')
        .select('*')
        .eq('status', 'confirmed')
        .gte('event_date', monthStartISO)
        .lte('event_date', monthEndISO)
        .order('event_date', { ascending: false });

      if (eventsError) {
        console.warn('Error fetching dividend events:', eventsError);
      }

      const dividendEvent = dividendEventsData?.[0] || null;
      const dividendOccurred = Boolean(dividendEvent);
      const totalShares = members.reduce((sum, member) => sum + parseAmount(member?.total_shares || 0), 0);
      const totalMemberDistribution = dividendOccurred
        ? Math.max(0, parseAmount(dividendEvent?.distribution_pool || 0) - parseAmount(dividendEvent?.company_investment_amount || 0))
        : 0;
      const dividendPerShare = dividendOccurred && totalShares > 0 ? totalMemberDistribution / totalShares : 0;

      // Create comprehensive system report with all 19 columns - filter by selected month/year
      const allRows = [];
      let sNo = 1;
      let cumulativeAmount = 0;
      const reportYearStr = String(reportYear);
      const monthKeyCandidates = getMonthKeyCandidates(reportMonth);
      const currMonIdx = months.indexOf(reportMonth);

      // Simplified approach: process investments in a single pass with member tracking
      const memberCumulativeShares = {};
      
      // Process each member's investments chronologically
      for (let mIdx = 0; mIdx < members.length; mIdx++) {
        const member = members[mIdx];
        if (!member) continue;
        
        try {
          const activities = member?.activities || {};
          const payment = member?.payment || {};
          const memberDisplayName = `${payment?.membershipId || ''} ${member?.name || ''}`.trim();
          
          if (!activities || typeof activities !== 'object') continue;
          
          // Initialize member tracking
          if (!memberCumulativeShares[memberDisplayName]) {
            memberCumulativeShares[memberDisplayName] = 0;
          }
          
          // Collect investments for this member
          const memberInvestments = [];
          
          const yearKeys = Object.keys(activities);
          for (let yIdx = 0; yIdx < yearKeys.length; yIdx++) {
            const yearKey = yearKeys[yIdx];
            try {
              const yearNum = parseInt(String(yearKey), 10);
              if (isNaN(yearNum) || yearNum > reportYear) continue;
              
              const yearData = activities[yearKey];
              if (!yearData || typeof yearData !== 'object') continue;
              
              const monthKeys = Object.keys(yearData);
              for (let monIdx = 0; monIdx < monthKeys.length; monIdx++) {
                const monKey = monthKeys[monIdx];
                try {
                  // Find month index
                  let monthIdx = -1;
                  for (let i = 0; i < months.length && monthIdx === -1; i++) {
                    const candidates = getMonthKeyCandidates(months[i]);
                    if (candidates.includes(monKey)) {
                      monthIdx = i;
                    }
                  }
                  
                  // Check if this is the selected month/year ONLY
                  if (yearNum === reportYear && monthIdx !== -1 && monthIdx === currMonIdx) {
                    const monthData = yearData[monKey];
                    if (!monthData) continue;
                    
                    const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
                    if (!inv || parseAmount(inv?.amount || 0) <= 0) continue;
                    
                    // Create date
                    let investmentDate;
                    try {
                      if (inv?.date) {
                        investmentDate = new Date(inv.date);
                        if (isNaN(investmentDate.getTime())) {
                          investmentDate = new Date(yearNum, monthIdx !== -1 ? monthIdx : 0, 1);
                        }
                      } else {
                        investmentDate = new Date(yearNum, monthIdx !== -1 ? monthIdx : 0, 1);
                      }
                    } catch (e) {
                      investmentDate = new Date(yearNum, monthIdx !== -1 ? monthIdx : 0, 1);
                    }
                    
                    memberInvestments.push({
                      date: investmentDate,
                      yearNum,
                      monthIdx: monthIdx !== -1 ? monthIdx : 0,
                      inv,
                      amount: parseAmount(inv?.amount || 0),
                      fineAmount: parseAmount(inv?.fine || 0),
                      newAllottedShares: parseAmount(inv?.shares || 0),
                      sharePrice: parseAmount(inv?.sharePrice || currentSharePrice)
                    });
                  }
                } catch (err) {
                  // Skip this month
                }
              }
            } catch (err) {
              // Skip this year
            }
          }
          
          // Sort member investments by date
          memberInvestments.sort((a, b) => {
            if (a.yearNum !== b.yearNum) return a.yearNum - b.yearNum;
            if (a.monthIdx !== b.monthIdx) return a.monthIdx - b.monthIdx;
            return a.date.getTime() - b.date.getTime();
          });
          
          // Process investments for this member (only selected month)
          // For Complete System Report, we show investments from selected month but calculate cumulative from all previous months
          for (let invIdx = 0; invIdx < memberInvestments.length; invIdx++) {
            const invData = memberInvestments[invIdx];
            const { date, inv, amount, fineAmount, newAllottedShares, sharePrice, monthIdx: invMonthIdx } = invData;
            
            // Calculate previous shares (before this investment) - need to calculate from all previous months
            let previousShares = 0;
            const allActivities = member.activities || {};
            Object.keys(allActivities).forEach(yKey => {
              const yNum = parseInt(String(yKey), 10);
              if (yNum < reportYear || (yNum === reportYear)) {
                const yData = allActivities[yKey] || {};
                Object.keys(yData).forEach(mKey => {
                  let mIdx = -1;
                  for (let i = 0; i < months.length && mIdx === -1; i++) {
                    const candidates = getMonthKeyCandidates(months[i]);
                    if (candidates.includes(mKey)) {
                      mIdx = i;
                    }
                  }
                  
                  // Include if before the current investment's month
                  if (yNum < reportYear || (yNum === reportYear && mIdx !== -1 && mIdx < invMonthIdx)) {
                    const mData = yData[mKey];
                    const mInv = mData?.investment || (mData?.type === 'investment' ? mData : null);
                    if (mInv) {
                      previousShares += parseAmount(mInv.shares);
                    }
                  }
                });
              }
            });
            
            // Update cumulative values
            cumulativeAmount += amount;
            memberCumulativeShares[memberDisplayName] = previousShares + newAllottedShares;
            const cumulativeShares = memberCumulativeShares[memberDisplayName];
            
            // Calculate dividend
            const dividendAmount = dividendOccurred ? Number((cumulativeShares * dividendPerShare).toFixed(2)) : undefined;
            
            let dateStr = '';
            try {
              dateStr = date.toLocaleDateString();
            } catch (e) {
              dateStr = '';
            }

            allRows.push({
              'S. No.': sNo++,
              'Date': dateStr,
              'MEMBER NAME': memberDisplayName || '',
              'SYSTEM RECEIPT': inv?.systemReceipt || '',
              'CUSTOM RECEIPT': inv?.customReceipt || '',
              'AMOUNT': Number(amount.toFixed(2)),
              'FINE AMOUNT': Number(fineAmount.toFixed(2)),
              'CUMMULATIVE AMOUNT': Number(cumulativeAmount.toFixed(2)),
              'SHARE PRICE': Number(sharePrice.toFixed(2)),
              'NEW ALLOTED SHARES': Number(newAllottedShares.toFixed(2)),
              'PREVIOUS SHARES': Number(previousShares.toFixed(2)),
              'CUMMULATIVE SHARES': Number(cumulativeShares.toFixed(2)),
              'DIVIDEND': dividendAmount,
              'AUDIT V.NO': null,
              'AUDIT SIGN': null,
              'PASSBOOK Yes': null,
              'ENTRY SIGN': null,
              'DATE OF PBE': null,
              'MEMBER SIGN': null
            });
          }
        } catch (err) {
          console.warn('Error processing member:', member?.name || member?.id, err);
        }
      }

      // Create Part A worksheet
      if (allRows.length === 0) {
        alert('No investment data found for the selected period.');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(allRows);
      
      // Get the range of Part A to find where Part B should start
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const partBStartRow = range.e.r + 4; // Start Part B a few rows after Part A ends
    
    // ========== PART B: COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL ==========
    
    // Part B Header
    const partBHeader = 'PART-B COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL';
    XLSX.utils.sheet_add_aoa(worksheet, [[partBHeader]], { origin: `A${partBStartRow}` });
    
    let currentRow = partBStartRow + 2; // Skip header row and add spacing
    
    // Section (i): MEMBERSHIP AMOUNT - Fetch registration data for selected month
    const sectionIHeader = '(i). MEMBERSHIP AMOUNT';
    XLSX.utils.sheet_add_aoa(worksheet, [[sectionIHeader]], { origin: `A${currentRow}` });
    currentRow++;
    
    // Column headers for Section (i)
    const sectionIColumns = ['DATE', 'MEMBERSHIP ID NAME', 'CUSTOM RECEIPT', 'AMOUNT'];
    XLSX.utils.sheet_add_aoa(worksheet, [sectionIColumns], { origin: `A${currentRow}` });
    currentRow++;
    
      // Fetch membership/registration data for selected month
      const membershipRows = [];
      members.forEach(member => {
        try {
          const payment = member?.payment || {};
          const dateOfJoining = payment?.dateOfJoining || payment?.date_of_joining || member?.created_at;
          
          if (!dateOfJoining) return;
          
          const joinDate = new Date(dateOfJoining);
          if (isNaN(joinDate.getTime())) return;
          
          const joinYear = joinDate.getFullYear();
          const joinMonth = joinDate.toLocaleString('default', { month: 'short' });
          const joinMonthIdx = months.indexOf(joinMonth);
          
          // Include if registration is in the selected month/year
          if (joinYear === reportYear && joinMonthIdx === monthIdx) {
            const totalAmount = parseAmount(payment?.payingMembershipAmount || payment?.membershipAmount || 0);
            const dueAmount = parseAmount(payment?.dueAmount || 0);
            const paymentStatus = (payment?.paymentStatus || '').toLowerCase();
            const paidAmount = paymentStatus === 'due' ? totalAmount - dueAmount : totalAmount;
            
            if (paidAmount > 0) {
              const memberDisplayName = `${payment?.membershipId || ''} ${member?.name || ''}`.trim();
              const customReceipt = payment?.customReceipt || payment?.receiptNumber || '';
              membershipRows.push({
                date: joinDate.toLocaleDateString(),
                name: memberDisplayName,
                receipt: customReceipt,
                amount: paidAmount
              });
            }
          }
        } catch (err) {
          console.warn('Error processing member for membership:', err);
        }
      });
    
    // Add membership data rows
    let sectionITotal = 0;
    membershipRows.forEach(row => {
      XLSX.utils.sheet_add_aoa(worksheet, [[row.date, row.name, row.receipt, Number(row.amount.toFixed(2))]], { origin: `A${currentRow}` });
      sectionITotal += row.amount;
      currentRow++;
    });
    
    // Add empty rows if less than 3 entries
    while (membershipRows.length < 3) {
      XLSX.utils.sheet_add_aoa(worksheet, [['', '', '', '']], { origin: `A${currentRow}` });
      currentRow++;
    }
    
    // Add spacing before next section
    currentRow++;
    
    // Section (ii): FINE AMOUNT - Fetch fine data for selected month
    const sectionIIHeader = '(ii). FINE AMOUNT';
    XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIHeader]], { origin: `A${currentRow}` });
    currentRow++;
    
    // Column headers for Section (ii)
    const sectionIIColumns = ['DATE', 'MEMBERSHIP ID NAME', 'CUSTOM RECEIPT', 'AMOUNT'];
    XLSX.utils.sheet_add_aoa(worksheet, [sectionIIColumns], { origin: `A${currentRow}` });
    currentRow++;
    
      // Fetch fine data for selected month
      const fineRows = [];
      members.forEach(member => {
        try {
          const activities = member?.activities || {};
          const payment = member?.payment || {};
          const yearData = activities[reportYearStr] || activities[reportYear] || {};
          
          let monthData = null;
          for (const monthKey of monthKeyCandidates) {
            if (yearData?.[monthKey]) {
              monthData = yearData[monthKey];
              break;
            }
          }
          
          const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
          if (inv) {
            const fineAmount = parseAmount(inv?.fine || 0);
            if (fineAmount > 0) {
              const memberDisplayName = `${payment?.membershipId || ''} ${member?.name || ''}`.trim();
              const customReceipt = inv?.customReceipt || '';
              let invDate = '';
              try {
                if (inv?.date) {
                  const dateObj = new Date(inv.date);
                  if (!isNaN(dateObj.getTime())) {
                    invDate = dateObj.toLocaleDateString();
                  }
                }
              } catch (e) {
                // Ignore date parsing errors
              }
              fineRows.push({
                date: invDate,
                name: memberDisplayName,
                receipt: customReceipt,
                amount: fineAmount
              });
            }
          }
          
          // Also check legacy payments
          const payments = member?.payments || {};
          const paymentYearData = payments[reportYearStr] || payments[reportYear] || {};
          for (const monthKey of monthKeyCandidates) {
            if (paymentYearData?.[monthKey]) {
              const paymentMonthData = paymentYearData[monthKey];
              if (paymentMonthData && typeof paymentMonthData === 'object') {
                const fineAmount = parseAmount(paymentMonthData?.fine || 0);
                if (fineAmount > 0) {
                  const memberDisplayName = `${payment?.membershipId || ''} ${member?.name || ''}`.trim();
                  fineRows.push({
                    date: '',
                    name: memberDisplayName,
                    receipt: '',
                    amount: fineAmount
                  });
                }
              }
            }
          }
        } catch (err) {
          console.warn('Error processing member for fines:', err);
        }
      });
    
    // Add fine data rows
    let sectionIITotal = 0;
    fineRows.forEach(row => {
      XLSX.utils.sheet_add_aoa(worksheet, [[row.date, row.name, row.receipt, Number(row.amount.toFixed(2))]], { origin: `A${currentRow}` });
      sectionIITotal += row.amount;
      currentRow++;
    });
    
    // Add empty rows if less than 3 entries
    while (fineRows.length < 3) {
      XLSX.utils.sheet_add_aoa(worksheet, [['', '', '', '']], { origin: `A${currentRow}` });
      currentRow++;
    }
    
    // Add spacing before next section
    currentRow++;
    
    // Section (iii): DIVIDEND DONATION - Fetch dividend donation data for selected month
    const sectionIIIHeader = '(iii). DIVIDEND DONATION';
    XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIIHeader]], { origin: `A${currentRow}` });
    currentRow++;
    
    // Column headers for Section (iii)
    const sectionIIIColumns = ['DATE', 'MEMBERSHIP ID NAME', 'CUSTOM RECEIPT', 'AMOUNT'];
    XLSX.utils.sheet_add_aoa(worksheet, [sectionIIIColumns], { origin: `A${currentRow}` });
    currentRow++;
    
      // Fetch dividend donation data for selected month
      const dividendRows = [];
      if (dividendEvent) {
        try {
          let eventDate = '';
          if (dividendEvent?.event_date) {
            const dateObj = new Date(dividendEvent.event_date);
            if (!isNaN(dateObj.getTime())) {
              eventDate = dateObj.toLocaleDateString();
            }
          }
          const companyInvestment = parseAmount(dividendEvent?.company_investment_amount || 0);
          if (companyInvestment > 0) {
            dividendRows.push({
              date: eventDate,
              name: '2025-002 Company Account',
              receipt: `DIV-${dividendEvent?.id?.slice(0, 8) || ''}`,
              amount: companyInvestment
            });
          }
        } catch (err) {
          console.warn('Error processing dividend event:', err);
        }
      }
    
    // Add dividend donation data rows
    let sectionIIITotal = 0;
    dividendRows.forEach(row => {
      XLSX.utils.sheet_add_aoa(worksheet, [[row.date, row.name, row.receipt, Number(row.amount.toFixed(2))]], { origin: `A${currentRow}` });
      sectionIIITotal += row.amount;
      currentRow++;
    });
    
    // Add empty rows if less than 3 entries
    while (dividendRows.length < 3) {
      XLSX.utils.sheet_add_aoa(worksheet, [['', '', '', '']], { origin: `A${currentRow}` });
      currentRow++;
    }
    
    // Add spacing before grand total
    currentRow++;
    
    // GRAND TOTAL row
    const grandTotal = sectionITotal + sectionIITotal + sectionIIITotal;
    XLSX.utils.sheet_add_aoa(worksheet, [['GRAND TOTAL', '', '', Number(grandTotal.toFixed(2))]], { origin: `A${currentRow}` });
    
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'System Report');
      XLSX.writeFile(workbook, `1. STARTING POINTWHILE FUNDING TIME RECORDED DATA to fetch all the details in background_${reportYear}_${reportMonth}.xlsx`);
    } catch (error) {
      console.error('Error generating Complete System Report:', error);
      alert(`Error generating report: ${error.message || 'Unknown error'}`);
    }
  };

  const generateConsolidatedSharesReport = async () => {
    try {
      const monthIdx = months.indexOf(reportMonth);
      if (monthIdx === -1) {
        alert('Invalid month selected for the shares distribution report.');
        return;
      }

      const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .not('payment', 'is', null);

      if (error) {
        console.error('Error fetching members:', error);
        alert('Unable to fetch members data.');
        return;
      }

      const parseAmount = (value) => {
        const num = parseFloat(value);
        return Number.isFinite(num) ? num : 0;
      };

      // Create PART-A with shares ONLY for selected month
      const reportYearStr = String(reportYear);
      const monthKeyCandidates = getMonthKeyCandidates(reportMonth);

      const rows = members.map((member, index) => {
        const payment = member.payment || {};
        const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();
        
        // Calculate shares ONLY for the selected month/year
        let monthShares = 0;
        const activities = member.activities || {};
        const yearData = activities[reportYearStr] || activities[reportYear] || {};
        
        // Check all month key candidates for the selected month
        let monthData = null;
        for (const monthKey of monthKeyCandidates) {
          if (yearData[monthKey]) {
            monthData = yearData[monthKey];
            break;
          }
        }
        
        const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
        if (inv) {
          monthShares = parseAmount(inv.shares);
        }
        
        return {
          'S. No.': index + 1,
          'MEMBER NAME': memberDisplayName,
          'TOTAL SHARES': Number(monthShares.toFixed(2))
        };
      });

      // Add summary row at the end - only for selected month
      const totalCompanyShares = rows.reduce((sum, row) => sum + (parseAmount(row['TOTAL SHARES']) || 0), 0);

      const summaryRow = {
        'S. No.': members.length + 1,
        'MEMBER NAME': 'TOTAL COMPANY SUMMARY',
        'TOTAL SHARES': Number(totalCompanyShares.toFixed(2))
      };

      rows.push(summaryRow);

      // Create worksheet for Part A
      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Determine where to place Part B
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const partBStartRow = range.e.r + 4; // Leave some spacing after Part A

      // ========== PART B: COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL ==========
      
      // Part B Header
      const partBHeader = 'PART-B COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL';
      XLSX.utils.sheet_add_aoa(worksheet, [[partBHeader]], { origin: `A${partBStartRow}` });
      
      // Add blank row for spacing
      XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 1}` });

      // Section (i): MEMBERSHIP AMOUNT - Calculate shares from registration fees
      const sectionIHeader = '(i). MEMBERSHIP AMOUNT';
      XLSX.utils.sheet_add_aoa(worksheet, [[sectionIHeader]], { origin: `A${partBStartRow + 2}` });
      const sectionIText = 'FETCH TOTAL SHARES THROUGH MEMBERSHIP';
      XLSX.utils.sheet_add_aoa(worksheet, [[sectionIText]], { origin: `A${partBStartRow + 3}` });
      
      // Fetch company transactions to calculate shares from different sources
      const { data: companyTransactions, error: txError } = await supabase
        .from('company_transactions')
        .select('*')
        .eq('membership_id', '2025-002')
        .eq('type', 'investment')
        .order('created_at', { ascending: true });

      // Calculate total registration amount from all members (paid amounts only)
      const totalRegistrationAmount = members.reduce((sum, member) => {
        const payment = member.payment || {};
        const totalAmount = parseAmount(payment.payingMembershipAmount || payment.membershipAmount);
        const dueAmount = parseAmount(payment.dueAmount);
        const paymentStatus = (payment.paymentStatus || '').toLowerCase();
        const paidAmount = paymentStatus === 'due' ? totalAmount - dueAmount : totalAmount;
        return sum + (paidAmount > 0 ? paidAmount : 0);
      }, 0);

      // Calculate total fine amount from all members
      const totalFineAmount = members.reduce((sum, member) => {
        const activities = member.activities || {};
        let memberFines = 0;
        Object.values(activities).forEach(yearData => {
          Object.values(yearData || {}).forEach(monthData => {
            const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
            if (inv) {
              memberFines += parseAmount(inv.fine);
            }
          });
        });
        // Also check legacy payments
        const payments = member.payments || {};
        Object.values(payments).forEach(yearData => {
          Object.values(yearData || {}).forEach(monthData => {
            if (monthData && typeof monthData === 'object') {
              memberFines += parseAmount(monthData.fine);
            }
          });
        });
        return sum + memberFines;
      }, 0);

      // Separate shares by transaction type
      let membershipShares = 0;
      let fineShares = 0;
      let mixedShares = 0;
      let mixedRegAmount = 0;
      let mixedFineAmount = 0;

      if (!txError && companyTransactions) {
        companyTransactions.forEach(tx => {
          const desc = (tx.description || '').toLowerCase();
          const txShares = parseAmount(tx.shares);
          const txAmount = parseAmount(tx.amount);
          const txFine = parseAmount(tx.fine);

          if (desc.includes('auto-invest registration')) {
            // Pure registration investment
            membershipShares += txShares;
          } else if (desc.includes('auto-invest company balance') || desc.includes('auto-bal')) {
            // Mixed investment (registration + fines)
            mixedShares += txShares;
            // Extract registration and fine amounts from description or use transaction amounts
            // Description format: "Auto-invest company balance (Reg: ₹X + Fines: ₹Y)"
            const regMatch = desc.match(/reg[:\s]*₹?([\d,]+\.?\d*)/i);
            const fineMatch = desc.match(/fine[:\s]*₹?([\d,]+\.?\d*)/i);
            const extractedReg = regMatch ? parseAmount(regMatch[1].replace(/,/g, '')) : 0;
            const extractedFine = fineMatch ? parseAmount(fineMatch[1].replace(/,/g, '')) : txFine;
            
            mixedRegAmount += extractedReg > 0 ? extractedReg : (txAmount - txFine);
            mixedFineAmount += extractedFine;
          }
          // Dividend investments are handled separately below
        });

        // Calculate proportional shares from mixed investments
        if (mixedShares > 0 && (mixedRegAmount + mixedFineAmount) > 0) {
          const regProportion = mixedRegAmount / (mixedRegAmount + mixedFineAmount);
          const fineProportion = mixedFineAmount / (mixedRegAmount + mixedFineAmount);
          membershipShares += mixedShares * regProportion;
          fineShares += mixedShares * fineProportion;
        }
      }

      // Add membership shares data
      XLSX.utils.sheet_add_aoa(worksheet, [[Number(membershipShares.toFixed(2))]], { origin: `A${partBStartRow + 4}` });
      XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 5}` });
      
      // Section (ii): FINE AMOUNT - Calculate shares from fines
      const sectionIIHeader = '(ii). FINE AMOUNT';
      XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIHeader]], { origin: `A${partBStartRow + 6}` });
      const sectionIIText = 'FETCH TOTAL SHARES THROUGH FINE AMOUNT';
      XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIText]], { origin: `A${partBStartRow + 7}` });
      
      // Add fine shares data
      XLSX.utils.sheet_add_aoa(worksheet, [[Number(fineShares.toFixed(2))]], { origin: `A${partBStartRow + 8}` });
      XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 9}` });
      
      // Calculate total shares from dividend donations (before adding section)
      const { data: dividendEvents, error: dividendError } = await supabase
        .from('dividend_donation_events')
        .select('company_shares_purchased')
        .eq('status', 'confirmed');

      let dividendShares = 0;
      if (!dividendError && dividendEvents) {
        dividendShares = dividendEvents.reduce((sum, event) => {
          return sum + parseAmount(event.company_shares_purchased);
        }, 0);
      }
      
      // Section (iii): DIVIDEND DONATION - Get shares from dividend events
      const sectionIIIHeader = '(iii). DIVIDEND DONATION';
      XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIIHeader]], { origin: `A${partBStartRow + 10}` });
      const sectionIIIText = 'FETCH TOTAL SHARES THROUGH DIVIDEND DONATION';
      XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIIText]], { origin: `A${partBStartRow + 11}` });
      
      // Add dividend shares data
      XLSX.utils.sheet_add_aoa(worksheet, [[Number(dividendShares.toFixed(2))]], { origin: `A${partBStartRow + 12}` });
      XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 13}` });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidated Shares Report');
      XLSX.writeFile(workbook, `admin-REPORT OF CONSOLIDATED SHARES IN THE COMPANY_${reportYear}_${reportMonth}.xlsx`);
    } catch (error) {
      console.error('Error generating Share Distribution Report:', error);
      alert(`Error generating report: ${error.message || 'Unknown error'}`);
    }
  };

  const generateTotalCompanyPooledReport = async () => {
    try {
      const monthIdx = months.indexOf(reportMonth);
      if (monthIdx === -1) {
        alert('Invalid month selected for the company funds report.');
        return;
      }

      // Get all members with their investment data
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('*')
        .not('payment', 'is', null);

      if (membersError) {
        console.error('Error fetching members:', membersError);
        alert('Unable to fetch members data.');
        return;
      }

      const parseAmount = (value) => {
        const num = parseFloat(value);
        return Number.isFinite(num) ? num : 0;
      };

      // Create member-wise pooled amount report - ONLY for selected month
      const reportYearStr = String(reportYear);
      const monthKeyCandidates = getMonthKeyCandidates(reportMonth);

      const rows = members.map((member, index) => {
        const payment = member.payment || {};
        
        // Calculate total amount invested ONLY for the selected month/year
        let totalAmountInvested = 0;
        const activities = member.activities || {};
        const yearData = activities[reportYearStr] || activities[reportYear] || {};
        
        // Check all month key candidates for the selected month
        let monthData = null;
        for (const monthKey of monthKeyCandidates) {
          if (yearData[monthKey]) {
            monthData = yearData[monthKey];
            break;
          }
        }
        
        const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
        if (inv) {
          // Investment amount for this month only (excluding fines)
          totalAmountInvested = parseAmount(inv.amount);
        }
        
        // Format member name (similar to other reports)
        const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();

        return {
          'S. No.': index + 1,
          'MEMBER NAME': memberDisplayName,
          'TOTAL AMOUNT INVESTED': Number(totalAmountInvested.toFixed(2))
        };
      });

      // Add summary row at the end - only for selected month
      const totalPooledAmount = members.reduce((sum, member) => {
        const activities = member.activities || {};
        const yearData = activities[reportYearStr] || activities[reportYear] || {};
        
        let monthData = null;
        for (const monthKey of monthKeyCandidates) {
          if (yearData[monthKey]) {
            monthData = yearData[monthKey];
            break;
          }
        }
        
        const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
        if (inv) {
          return sum + parseAmount(inv.amount);
        }
        return sum;
      }, 0);

      const summaryRow = {
        'S. No.': members.length + 1,
        'MEMBER NAME': 'TOTAL COMPANY POOLED AMOUNT',
        'TOTAL AMOUNT INVESTED': Number(totalPooledAmount.toFixed(2))
      };

      rows.push(summaryRow);

      // Create worksheet for Part A
      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Determine where to start Part B
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const partBStartRow = range.e.r + 4;

      // ========== PART B: COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL ==========
      
      // Part B header
      const partBHeader = 'PART-B COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL';
      XLSX.utils.sheet_add_aoa(worksheet, [[partBHeader]], { origin: `A${partBStartRow}` });

      // Add blank row for spacing
      XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 1}` });

      // Section (i): MEMBERSHIP AMOUNT - Calculate total membership amount collected
      const sectionIHeader = '(i). MEMBERSHIP AMOUNT';
      XLSX.utils.sheet_add_aoa(worksheet, [[sectionIHeader]], { origin: `A${partBStartRow + 2}` });
      const sectionIText = 'FETCH TOTAL MEMBERSHIP AMOUNT COLLECTED';
      XLSX.utils.sheet_add_aoa(worksheet, [[sectionIText]], { origin: `A${partBStartRow + 3}` });
      
      // Calculate total registration amount from all members for the selected month/year or before
      const totalRegistrationAmount = members.reduce((sum, member) => {
        const payment = member.payment || {};
        const dateOfJoining = payment.dateOfJoining || payment.date_of_joining || member.created_at;
        
        if (!dateOfJoining) return sum;
        
        try {
          const joinDate = new Date(dateOfJoining);
          if (isNaN(joinDate.getTime())) return sum;
          
          const joinYear = joinDate.getFullYear();
          const joinMonth = joinDate.toLocaleString('default', { month: 'short' });
          const joinMonthIdx = months.indexOf(joinMonth);
          
          // Include if registration is in the selected month/year or before
          if (joinYear < reportYear || (joinYear === reportYear && joinMonthIdx <= monthIdx)) {
            const totalAmount = parseAmount(payment.payingMembershipAmount || payment.membershipAmount);
            const dueAmount = parseAmount(payment.dueAmount);
            const paymentStatus = (payment.paymentStatus || '').toLowerCase();
            const paidAmount = paymentStatus === 'due' ? totalAmount - dueAmount : totalAmount;
            return sum + (paidAmount > 0 ? paidAmount : 0);
          }
        } catch (e) {
          // Skip invalid dates
        }
        
        return sum;
      }, 0);

      // Add membership amount data
      XLSX.utils.sheet_add_aoa(worksheet, [[Number(totalRegistrationAmount.toFixed(2))]], { origin: `A${partBStartRow + 4}` });
      XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 5}` });
      
      // Calculate total fine amount from all members for the selected month/year
      const totalFineAmount = members.reduce((sum, member) => {
        const activities = member.activities || {};
        const yearData = activities[reportYearStr] || activities[reportYear] || {};
        
        let monthData = null;
        for (const monthKey of monthKeyCandidates) {
          if (yearData[monthKey]) {
            monthData = yearData[monthKey];
            break;
          }
        }
        
        let memberFines = 0;
        const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
        if (inv) {
          memberFines += parseAmount(inv.fine);
        }
        
        // Also check legacy payments for the selected month/year
        const payments = member.payments || {};
        const paymentYearData = payments[reportYearStr] || payments[reportYear] || {};
        for (const monthKey of monthKeyCandidates) {
          if (paymentYearData[monthKey]) {
            const paymentMonthData = paymentYearData[monthKey];
            if (paymentMonthData && typeof paymentMonthData === 'object') {
              memberFines += parseAmount(paymentMonthData.fine);
            }
          }
        }
        
        return sum + memberFines;
      }, 0);
      
      // Add fine amount data
      XLSX.utils.sheet_add_aoa(worksheet, [[Number(totalFineAmount.toFixed(2))]], { origin: `A${partBStartRow + 8}` });
      XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 9}` });
      
      // Calculate total dividend donation amount for selected month/year (before adding section)
      const monthStart = new Date(reportYear, monthIdx, 1);
      const monthEnd = new Date(reportYear, monthIdx + 1, 0, 23, 59, 59, 999);
      const monthStartISO = monthStart.toISOString().split('T')[0];
      const monthEndISO = monthEnd.toISOString().split('T')[0];

      const { data: dividendEvents, error: dividendError } = await supabase
        .from('dividend_donation_events')
        .select('company_investment_amount, event_date')
        .eq('status', 'confirmed')
        .gte('event_date', monthStartISO)
        .lte('event_date', monthEndISO);

      let dividendDonationAmount = 0;
      if (!dividendError && dividendEvents) {
        dividendDonationAmount = dividendEvents.reduce((sum, event) => {
          return sum + parseAmount(event.company_investment_amount);
        }, 0);
      }
      
      // Section (iii): DIVIDEND DONATION - Get amount from dividend events
      const sectionIIIHeader = '(iii). DIVIDEND DONATION';
      XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIIHeader]], { origin: `A${partBStartRow + 10}` });
      const sectionIIIText = 'FETCH TOTAL AMOUNT THROUGH DIVIDEND DONATION';
      XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIIText]], { origin: `A${partBStartRow + 11}` });
      
      // Add dividend donation amount data
      XLSX.utils.sheet_add_aoa(worksheet, [[Number(dividendDonationAmount.toFixed(2))]], { origin: `A${partBStartRow + 12}` });
      XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${partBStartRow + 13}` });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Company Funds Report');
      XLSX.writeFile(workbook, `admin-REPORT OF TOTAL COMPANY POOLED AMOUNT_${reportYear}_${reportMonth}.xlsx`);
    } catch (error) {
      console.error('Error generating Company Funds Report:', error);
      alert(`Error generating report: ${error.message || 'Unknown error'}`);
    }
  };

  const generateMonthlyFundingAuditReport = async () => {
    try {
      const monthIdx = months.indexOf(reportMonth);
      if (monthIdx === -1) {
        alert('Invalid month selected for the monthly audit report.');
        return;
      }

      const parseAmount = (value) => {
        const num = parseFloat(value);
        return Number.isFinite(num) ? num : 0;
      };

      const formatDateForReport = (value) => {
        if (!value) return '';
        try {
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return '';
          const day = String(date.getDate()).padStart(2, '0');
          const mon = months[date.getMonth()] || '';
          return `${day}-${mon}-${date.getFullYear()}`;
        } catch (e) {
          return '';
        }
      };

      const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .not('payment', 'is', null);

      if (error) {
        console.error('Error fetching members:', error);
        alert('Unable to fetch members data.');
        return;
      }

      // Filter members with investments in the selected month using month key candidates
      const reportYearStr = String(reportYear);
      const monthKeyCandidates = getMonthKeyCandidates(reportMonth);

      const membersWithInvestments = members.filter(member => {
        const activities = member.activities || {};
        const yearData = activities[reportYearStr] || activities[reportYear] || {};
        
        let monthData = null;
        for (const monthKey of monthKeyCandidates) {
          if (yearData[monthKey]) {
            monthData = yearData[monthKey];
            break;
          }
        }
        
        const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
        return inv && parseAmount(inv.amount) > 0;
      });

      // Create audit verification form rows - Part A
      const rows = membersWithInvestments.map((member, index) => {
        const activities = member.activities || {};
        const yearData = activities[reportYearStr] || activities[reportYear] || {};
        
        let monthData = null;
        for (const monthKey of monthKeyCandidates) {
          if (yearData[monthKey]) {
            monthData = yearData[monthKey];
            break;
          }
        }
        
        const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
        const payment = member.payment || {};
        
        // Format member name with ID
        const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();
        
        // Format date for the report
        const reportDate = inv?.date ? formatDateForReport(inv.date) : formatDateForReport(new Date());
        
        return {
          'S. No.': index + 1,
          'Date': reportDate,
          'MEMBER NAME': memberDisplayName,
          'SYSTEM RECEIPT': inv?.systemReceipt || inv?.customReceipt || '',
          'MANUAL RECEIPT': inv?.manualReceipt || '',
          'AMOUNT': Number(parseAmount(inv?.amount || 0).toFixed(2)),
          'AUDIT V.NO': null,
          'AUDIT SIGN': null,
          'PASSBOOK': null,
          'ENTRY SIGN': null,
          'DATE OF PBE': null,
          'MEMBER SIGN': null
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Determine where to insert Part B
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const partBStartRow = range.e.r + 4;

      // ========== PART B: COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL ==========
      
      // Part B header
      const partBHeader = 'PART-B COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL';
      XLSX.utils.sheet_add_aoa(worksheet, [[partBHeader]], { origin: `A${partBStartRow}` });

      let currentRow = partBStartRow + 2;

      // Section (i): MEMBERSHIP AMOUNT - Fetch registrations for selected month
      const sectionIHeader = '(i). MEMBERSHIP AMOUNT';
      XLSX.utils.sheet_add_aoa(worksheet, [[sectionIHeader]], { origin: `A${currentRow}` });
      currentRow++;

      const sectionIColumns = ['S. No.', 'DATE', 'MEMBERSHIP ID NAME', 'CUSTOM RECEIPT', 'AMOUNT'];
      XLSX.utils.sheet_add_aoa(worksheet, [sectionIColumns], { origin: `A${currentRow}` });
      currentRow++;

      // Fetch membership registrations for the selected month
      const membershipRows = [];
      members.forEach(member => {
        const payment = member.payment || {};
        const dateOfJoining = payment.dateOfJoining || payment.date_of_joining || member.created_at;
        
        if (!dateOfJoining) return;
        
        try {
          const joinDate = new Date(dateOfJoining);
          if (isNaN(joinDate.getTime())) return;
          
          const joinYear = joinDate.getFullYear();
          const joinMonth = joinDate.toLocaleString('default', { month: 'short' });
          const joinMonthIdx = months.indexOf(joinMonth);
          
          // Include if registration is in the selected month/year
          if (joinYear === reportYear && joinMonthIdx === monthIdx) {
            const totalAmount = parseAmount(payment.payingMembershipAmount || payment.membershipAmount);
            const dueAmount = parseAmount(payment.dueAmount);
            const paymentStatus = (payment.paymentStatus || '').toLowerCase();
            const paidAmount = paymentStatus === 'due' ? totalAmount - dueAmount : totalAmount;
            
            if (paidAmount > 0) {
              membershipRows.push({
                sNo: membershipRows.length + 1,
                date: formatDateForReport(joinDate),
                name: `${payment.membershipId || ''} ${member.name || ''}`.trim(),
                receipt: payment.customReceipt || payment.receiptNumber || '',
                amount: Number(paidAmount.toFixed(2))
              });
            }
          }
        } catch (e) {
          // Skip invalid dates
        }
      });

      // Add membership data rows
      membershipRows.forEach(row => {
        XLSX.utils.sheet_add_aoa(worksheet, [[row.sNo, row.date, row.name, row.receipt, row.amount]], { origin: `A${currentRow}` });
        currentRow++;
      });

      // Add empty rows if less than 3 entries
      while (membershipRows.length < 3) {
        XLSX.utils.sheet_add_aoa(worksheet, [[membershipRows.length + 1, '', '', '', '']], { origin: `A${currentRow}` });
        currentRow++;
        membershipRows.push({ sNo: membershipRows.length + 1 });
      }

      currentRow++;

      // Section (ii): FINE AMOUNT - Fetch fines for selected month
      const sectionIIHeader = '(ii). FINE AMOUNT';
      XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIHeader]], { origin: `A${currentRow}` });
      currentRow++;

      const sectionIIColumns = ['S. No.', 'DATE', 'MEMBERSHIP ID NAME', 'CUSTOM RECEIPT', 'AMOUNT'];
      XLSX.utils.sheet_add_aoa(worksheet, [sectionIIColumns], { origin: `A${currentRow}` });
      currentRow++;

      // Fetch fine amounts for the selected month
      const fineRows = [];
      members.forEach(member => {
        const activities = member.activities || {};
        const yearData = activities[reportYearStr] || activities[reportYear] || {};
        
        let monthData = null;
        for (const monthKey of monthKeyCandidates) {
          if (yearData[monthKey]) {
            monthData = yearData[monthKey];
            break;
          }
        }
        
        const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
        const fineAmount = inv ? parseAmount(inv.fine) : 0;
        
        if (fineAmount > 0) {
          const payment = member.payment || {};
          const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();
          const invDate = inv?.date ? formatDateForReport(inv.date) : formatDateForReport(new Date(reportYear, monthIdx, 1));
          
          fineRows.push({
            sNo: fineRows.length + 1,
            date: invDate,
            name: memberDisplayName,
            receipt: inv?.customReceipt || inv?.systemReceipt || '',
            amount: Number(fineAmount.toFixed(2))
          });
        }
      });

      // Add fine data rows
      fineRows.forEach(row => {
        XLSX.utils.sheet_add_aoa(worksheet, [[row.sNo, row.date, row.name, row.receipt, row.amount]], { origin: `A${currentRow}` });
        currentRow++;
      });

      // Add empty rows if less than 3 entries
      while (fineRows.length < 3) {
        XLSX.utils.sheet_add_aoa(worksheet, [[fineRows.length + 1, '', '', '', '']], { origin: `A${currentRow}` });
        currentRow++;
        fineRows.push({ sNo: fineRows.length + 1 });
      }

      currentRow++;

      // Section (iii): DIVIDEND DONATION - Fetch dividend donations for selected month
      const sectionIIIHeader = '(iii). DIVIDEND DONATION';
      XLSX.utils.sheet_add_aoa(worksheet, [[sectionIIIHeader]], { origin: `A${currentRow}` });
      currentRow++;

      const sectionIIIColumns = ['S. No.', 'DATE', 'MEMBERSHIP ID NAME', 'CUSTOM RECEIPT', 'AMOUNT'];
      XLSX.utils.sheet_add_aoa(worksheet, [sectionIIIColumns], { origin: `A${currentRow}` });
      currentRow++;

      // Fetch dividend donations for the selected month
      const monthStart = new Date(reportYear, monthIdx, 1);
      const monthEnd = new Date(reportYear, monthIdx + 1, 0, 23, 59, 59, 999);
      const monthStartISO = monthStart.toISOString().split('T')[0];
      const monthEndISO = monthEnd.toISOString().split('T')[0];

      const { data: dividendEvents, error: dividendError } = await supabase
        .from('dividend_donation_events')
        .select('*')
        .eq('status', 'confirmed')
        .gte('event_date', monthStartISO)
        .lte('event_date', monthEndISO)
        .order('event_date', { ascending: true });

      const dividendRows = [];
      if (!dividendError && dividendEvents) {
        dividendEvents.forEach((event, idx) => {
          const companyInvestment = parseAmount(event.company_investment_amount);
          if (companyInvestment > 0) {
            dividendRows.push({
              sNo: dividendRows.length + 1,
              date: formatDateForReport(event.event_date),
              name: 'COMPANY ACCOUNT',
              receipt: event.receipt_number || event.custom_receipt || '',
              amount: Number(companyInvestment.toFixed(2))
            });
          }
        });
      }

      // Add dividend donation data rows
      dividendRows.forEach(row => {
        XLSX.utils.sheet_add_aoa(worksheet, [[row.sNo, row.date, row.name, row.receipt, row.amount]], { origin: `A${currentRow}` });
        currentRow++;
      });

      // Add empty rows if less than 3 entries
      while (dividendRows.length < 3) {
        XLSX.utils.sheet_add_aoa(worksheet, [[dividendRows.length + 1, '', '', '', '']], { origin: `A${currentRow}` });
        currentRow++;
        dividendRows.push({ sNo: dividendRows.length + 1 });
      }

      currentRow++;

      // Calculate GRAND TOTAL
      const totalMembership = membershipRows.reduce((sum, row) => sum + (row.amount || 0), 0);
      const totalFine = fineRows.reduce((sum, row) => sum + (row.amount || 0), 0);
      const totalDividend = dividendRows.reduce((sum, row) => sum + (row.amount || 0), 0);
      const grandTotal = totalMembership + totalFine + totalDividend;

      // Grand total row
      XLSX.utils.sheet_add_aoa(worksheet, [['GRAND TOTAL', '', '', '', Number(grandTotal.toFixed(2))]], { origin: `A${currentRow}` });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Funding Physical Audit');
      XLSX.writeFile(workbook, `employee-MONTHLY FUNDING PHYSICAL AUDIT VERIFIVATION FORM & REPORT_${reportYear}_${reportMonth}.xlsx`);
    } catch (error) {
      console.error('Error generating Monthly Audit Report:', error);
      alert(`Error generating report: ${error.message || 'Unknown error'}`);
    }
  };

  const generateNewSharesCurrentReport = async () => {
    try {
      const monthIdx = months.indexOf(reportMonth);
      if (monthIdx === -1) {
        alert('Invalid month selected for the current month shares report.');
        return;
      }

      const parseAmount = (value) => {
        const num = parseFloat(value);
        return Number.isFinite(num) ? num : 0;
      };

      const formatDateForReport = (value) => {
        if (!value) return '';
        try {
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return '';
          const day = String(date.getDate()).padStart(2, '0');
          const mon = months[date.getMonth()] || '';
          return `${day}-${mon}-${date.getFullYear()}`;
        } catch (e) {
          return '';
        }
      };

      const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .not('payment', 'is', null);

      if (error) {
        console.error('Error fetching members:', error);
        alert('Unable to fetch members data.');
        return;
      }

      // Get share price for the selected month/year
      const sharePriceMonthCandidates = getMonthKeyCandidates(reportMonth);
      const { data: sharePriceRows, error: sharePriceError } = await supabase
        .from('share_prices')
        .select('price, month')
        .eq('year', reportYear)
        .in('month', sharePriceMonthCandidates)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (sharePriceError) {
        console.error('Error fetching share price:', sharePriceError);
      }

      const currentSharePrice = sharePriceRows?.[0]?.price || 30;

      // Filter members with investments in the selected month using month key candidates
      const reportYearStr = String(reportYear);
      const monthKeyCandidates = getMonthKeyCandidates(reportMonth);

      const membersWithInvestments = members.filter(member => {
        const activities = member.activities || {};
        const yearData = activities[reportYearStr] || activities[reportYear] || {};
        
        let monthData = null;
        for (const monthKey of monthKeyCandidates) {
          if (yearData[monthKey]) {
            monthData = yearData[monthKey];
            break;
          }
        }
        
        const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
        return inv && parseAmount(inv.amount) > 0;
      });

      // Create detailed shares report - Part A
      const rows = membersWithInvestments.map((member, index) => {
        const activities = member.activities || {};
        const yearData = activities[reportYearStr] || activities[reportYear] || {};
        
        let monthData = null;
        for (const monthKey of monthKeyCandidates) {
          if (yearData[monthKey]) {
            monthData = yearData[monthKey];
            break;
          }
        }
        
        const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
        const payment = member.payment || {};
        
        // Format member name with ID
        const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();
        
        // Calculate allotted shares for current month (selected month only)
        const allottedShares = inv ? parseAmount(inv.shares) : 0;
        
        // Calculate cumulative shares up to and including selected month
        let cumulativeShares = 0;
        Object.keys(activities).forEach(yearKey => {
          const yNum = parseInt(String(yearKey), 10);
          if (yNum <= reportYear) {
            const yData = activities[yearKey] || {};
            Object.keys(yData).forEach(monKey => {
              let mIdx = -1;
              for (let i = 0; i < months.length && mIdx === -1; i++) {
                const candidates = getMonthKeyCandidates(months[i]);
                if (candidates.includes(monKey)) {
                  mIdx = i;
                }
              }
              
              if (yNum < reportYear || (yNum === reportYear && mIdx !== -1 && mIdx <= monthIdx)) {
                const mData = yData[monKey];
                const mInv = mData?.investment || (mData?.type === 'investment' ? mData : null);
                if (mInv) {
                  cumulativeShares += parseAmount(mInv.shares);
                }
              }
            });
          }
        });
        
        // Format date
        const reportDate = inv?.date ? formatDateForReport(inv.date) : formatDateForReport(new Date(reportYear, monthIdx, 1));
        
        return {
          'S. No.': index + 1,
          'Date': reportDate,
          'MEMBER NAME': memberDisplayName,
          'SYSTEM RECEIPT': inv?.systemReceipt || inv?.customReceipt || '',
          'CUSTOM RECEIPT': inv?.customReceipt || '',
          'AMOUNT': Number(parseAmount(inv?.amount || 0).toFixed(2)),
          'SHARE PRICE': Number(currentSharePrice.toFixed(2)),
          'ALLOTED SHARES': Number(allottedShares.toFixed(2)),
          'CUMMULATIVE SHARES': Number(cumulativeShares.toFixed(2))
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Determine where to insert Part B
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const partBStartRow = range.e.r + 4;
      let currentRow = partBStartRow;

      // ========== PART B: COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL ==========
      
      // Part B header
      XLSX.utils.sheet_add_aoa(worksheet, [['PART-B  COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL']], { origin: `A${currentRow}` });
      currentRow += 2;

      const memberSectionColumns = ['S. No.', 'DATE', 'MEMBERSHIP ID NAME', 'CUSTOM RECEIPT', 'AMOUNT'];

      // Section (i): MEMBERSHIP AMOUNT - Fetch registrations for selected month
      XLSX.utils.sheet_add_aoa(worksheet, [['(i). MEMBERSHIP AMOUNT']], { origin: `A${currentRow}` });
      currentRow++;
      XLSX.utils.sheet_add_aoa(worksheet, [memberSectionColumns], { origin: `A${currentRow}` });
      currentRow++;

      // Fetch membership registrations for the selected month
      const membershipRows = [];
      members.forEach(member => {
        const payment = member.payment || {};
        const dateOfJoining = payment.dateOfJoining || payment.date_of_joining || member.created_at;
        
        if (!dateOfJoining) return;
        
        try {
          const joinDate = new Date(dateOfJoining);
          if (isNaN(joinDate.getTime())) return;
          
          const joinYear = joinDate.getFullYear();
          const joinMonth = joinDate.toLocaleString('default', { month: 'short' });
          const joinMonthIdx = months.indexOf(joinMonth);
          
          // Include if registration is in the selected month/year
          if (joinYear === reportYear && joinMonthIdx === monthIdx) {
            const totalAmount = parseAmount(payment.payingMembershipAmount || payment.membershipAmount);
            const dueAmount = parseAmount(payment.dueAmount);
            const paymentStatus = (payment.paymentStatus || '').toLowerCase();
            const paidAmount = paymentStatus === 'due' ? totalAmount - dueAmount : totalAmount;
            
            if (paidAmount > 0) {
              membershipRows.push({
                sNo: membershipRows.length + 1,
                date: formatDateForReport(joinDate),
                name: `${payment.membershipId || ''} ${member.name || ''}`.trim(),
                receipt: payment.customReceipt || payment.receiptNumber || '',
                amount: Number(paidAmount.toFixed(2))
              });
            }
          }
        } catch (e) {
          // Skip invalid dates
        }
      });

      // Add membership data rows
      membershipRows.forEach(row => {
        XLSX.utils.sheet_add_aoa(worksheet, [[row.sNo, row.date, row.name, row.receipt, row.amount]], { origin: `A${currentRow}` });
        currentRow++;
      });

      // Add empty rows if less than 3 entries
      while (membershipRows.length < 3) {
        XLSX.utils.sheet_add_aoa(worksheet, [[membershipRows.length + 1, '', '', '', '']], { origin: `A${currentRow}` });
        currentRow++;
        membershipRows.push({ sNo: membershipRows.length + 1 });
      }

      currentRow++;

      // Section (ii): FINE AMOUNT - Only AMOUNT column
      XLSX.utils.sheet_add_aoa(worksheet, [['(ii). FINE AMOUNT']], { origin: `A${currentRow}` });
      currentRow++;
      XLSX.utils.sheet_add_aoa(worksheet, [['AMOUNT']], { origin: `A${currentRow}` });
      currentRow++;

      // Fetch fine amounts for the selected month
      let totalFineAmount = 0;
      members.forEach(member => {
        const activities = member.activities || {};
        const yearData = activities[reportYearStr] || activities[reportYear] || {};
        
        let monthData = null;
        for (const monthKey of monthKeyCandidates) {
          if (yearData[monthKey]) {
            monthData = yearData[monthKey];
            break;
          }
        }
        
        const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
        if (inv) {
          totalFineAmount += parseAmount(inv.fine);
        }
      });

      // Add fine amount data (single value)
      XLSX.utils.sheet_add_aoa(worksheet, [[Number(totalFineAmount.toFixed(2))]], { origin: `A${currentRow}` });
      currentRow++;

      // Add empty rows if needed (to maintain structure)
      for (let i = 0; i < 2; i++) {
        XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${currentRow}` });
        currentRow++;
      }

      currentRow++;

      // Section (iii): DIVIDEND DONATION - Fetch dividend donations for selected month
      XLSX.utils.sheet_add_aoa(worksheet, [['(iii). DIVIDEND DONATION']], { origin: `A${currentRow}` });
      currentRow++;
      XLSX.utils.sheet_add_aoa(worksheet, [memberSectionColumns], { origin: `A${currentRow}` });
      currentRow++;

      // Fetch dividend donations for the selected month
      const monthStart = new Date(reportYear, monthIdx, 1);
      const monthEnd = new Date(reportYear, monthIdx + 1, 0, 23, 59, 59, 999);
      const monthStartISO = monthStart.toISOString().split('T')[0];
      const monthEndISO = monthEnd.toISOString().split('T')[0];

      const { data: dividendEvents, error: dividendError } = await supabase
        .from('dividend_donation_events')
        .select('*')
        .eq('status', 'confirmed')
        .gte('event_date', monthStartISO)
        .lte('event_date', monthEndISO)
        .order('event_date', { ascending: true });

      const dividendRows = [];
      if (!dividendError && dividendEvents) {
        dividendEvents.forEach((event, idx) => {
          const companyInvestment = parseAmount(event.company_investment_amount);
          if (companyInvestment > 0) {
            dividendRows.push({
              sNo: dividendRows.length + 1,
              date: formatDateForReport(event.event_date),
              name: 'COMPANY ACCOUNT',
              receipt: event.receipt_number || event.custom_receipt || '',
              amount: Number(companyInvestment.toFixed(2))
            });
          }
        });
      }

      // Add dividend donation data rows
      dividendRows.forEach(row => {
        XLSX.utils.sheet_add_aoa(worksheet, [[row.sNo, row.date, row.name, row.receipt, row.amount]], { origin: `A${currentRow}` });
        currentRow++;
      });

      // Add empty rows if less than 3 entries
      while (dividendRows.length < 3) {
        XLSX.utils.sheet_add_aoa(worksheet, [[dividendRows.length + 1, '', '', '', '']], { origin: `A${currentRow}` });
        currentRow++;
        dividendRows.push({ sNo: dividendRows.length + 1 });
      }

      currentRow++;

      // Calculate GRAND TOTAL
      const totalMembership = membershipRows.reduce((sum, row) => sum + (row.amount || 0), 0);
      const totalDividend = dividendRows.reduce((sum, row) => sum + (row.amount || 0), 0);
      const grandTotal = totalMembership + totalFineAmount + totalDividend;

      // Grand total row
      XLSX.utils.sheet_add_aoa(worksheet, [['GRAND TOTAL', '', '', '', Number(grandTotal.toFixed(2))]], { origin: `A${currentRow}` });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Current Month New Shares Report');
      XLSX.writeFile(workbook, `employee-CURRENT MONTH ISSUED NEW SHARES & CUMMULATIVE SHARE REPORT_${reportYear}_${reportMonth}.xlsx`);
    } catch (error) {
      console.error('Error generating Current Month Shares Report:', error);
      alert(`Error generating report: ${error.message || 'Unknown error'}`);
    }
  };

  const generateNewSharesMonthwiseReport = async () => {
    try {
      const monthIdx = months.indexOf(reportMonth);
      if (monthIdx === -1) {
        alert('Invalid month selected for the monthly shares report.');
        return;
      }

      const parseAmount = (value) => {
        const num = parseFloat(value);
        return Number.isFinite(num) ? num : 0;
      };

      const formatDateForReport = (value) => {
        if (!value) return '';
        try {
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return '';
          const day = String(date.getDate()).padStart(2, '0');
          const mon = months[date.getMonth()] || '';
          return `${day}-${mon}-${date.getFullYear()}`;
        } catch (e) {
          return '';
        }
      };

      const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .not('payment', 'is', null);

      if (error) {
        console.error('Error fetching members:', error);
        alert('Unable to fetch members data.');
        return;
      }

      // Get share price for the selected month/year
      const sharePriceMonthCandidates = getMonthKeyCandidates(reportMonth);
      const { data: sharePriceRows, error: sharePriceError } = await supabase
        .from('share_prices')
        .select('price, month')
        .eq('year', reportYear)
        .in('month', sharePriceMonthCandidates)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (sharePriceError) {
        console.error('Error fetching share price:', sharePriceError);
      }

      const currentSharePrice = sharePriceRows?.[0]?.price || 30;

      // Create detailed transaction-level report - filter by selected month/year
      const allRows = [];
      let sNo = 1;
      const reportYearStr = String(reportYear);
      const monthKeyCandidates = getMonthKeyCandidates(reportMonth);

      members.forEach(member => {
        const activities = member.activities || {};
        const payment = member.payment || {};
        
        // Format member name with ID
        const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();

        // Filter by selected year and month
        const yearData = activities[reportYearStr] || activities[reportYear] || {};
        
        // Check all month key candidates for the selected month
        let monthData = null;
        for (const monthKey of monthKeyCandidates) {
          if (yearData[monthKey]) {
            monthData = yearData[monthKey];
            break;
          }
        }
        
        const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
        
        if (inv && parseAmount(inv.shares) > 0) {
          const investmentDate = inv.date ? formatDateForReport(inv.date) : formatDateForReport(new Date(reportYear, monthIdx, 1));
          const allottedShares = parseAmount(inv.shares);
          const amount = parseAmount(inv.amount);

          allRows.push({
            'S. No.': sNo++,
            'Date': investmentDate,
            'MEMBER NAME': memberDisplayName,
            'SYSTEM RECEIPT': inv.systemReceipt || inv.customReceipt || '',
            'CUSTOM RECEIPT': inv.customReceipt || '',
            'AMOUNT': Number(amount.toFixed(2)),
            'SHARE PRICE': Number(currentSharePrice.toFixed(2)),
            'ALLOTED SHARES': Number(allottedShares.toFixed(2))
          });
        }
      });

      if (allRows.length === 0) {
        alert('No investment data found for the selected month.');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(allRows);

      // Determine where to insert Part B
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const partBStartRow = range.e.r + 4;
      let currentRow = partBStartRow;

      // ========== PART B: COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL ==========
      
      // Part B Header
      XLSX.utils.sheet_add_aoa(worksheet, [['PART-B  COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL']], { origin: `A${currentRow}` });
      currentRow += 2;

      const memberSectionColumns = ['S. No.', 'DATE', 'MEMBERSHIP ID NAME', 'CUSTOM RECEIPT', 'AMOUNT'];

      // Section (i): MEMBERSHIP AMOUNT - Fetch registrations for selected month
      XLSX.utils.sheet_add_aoa(worksheet, [['(i). MEMBERSHIP AMOUNT']], { origin: `A${currentRow}` });
      currentRow++;
      XLSX.utils.sheet_add_aoa(worksheet, [memberSectionColumns], { origin: `A${currentRow}` });
      currentRow++;

      // Fetch membership registrations for the selected month
      const membershipRows = [];
      members.forEach(member => {
        const payment = member.payment || {};
        const dateOfJoining = payment.dateOfJoining || payment.date_of_joining || member.created_at;
        
        if (!dateOfJoining) return;
        
        try {
          const joinDate = new Date(dateOfJoining);
          if (isNaN(joinDate.getTime())) return;
          
          const joinYear = joinDate.getFullYear();
          const joinMonth = joinDate.toLocaleString('default', { month: 'short' });
          const joinMonthIdx = months.indexOf(joinMonth);
          
          // Include if registration is in the selected month/year
          if (joinYear === reportYear && joinMonthIdx === monthIdx) {
            const totalAmount = parseAmount(payment.payingMembershipAmount || payment.membershipAmount);
            const dueAmount = parseAmount(payment.dueAmount);
            const paymentStatus = (payment.paymentStatus || '').toLowerCase();
            const paidAmount = paymentStatus === 'due' ? totalAmount - dueAmount : totalAmount;
            
            if (paidAmount > 0) {
              membershipRows.push({
                sNo: membershipRows.length + 1,
                date: formatDateForReport(joinDate),
                name: `${payment.membershipId || ''} ${member.name || ''}`.trim(),
                receipt: payment.customReceipt || payment.receiptNumber || '',
                amount: Number(paidAmount.toFixed(2))
              });
            }
          }
        } catch (e) {
          // Skip invalid dates
        }
      });

      // Add membership data rows
      membershipRows.forEach(row => {
        XLSX.utils.sheet_add_aoa(worksheet, [[row.sNo, row.date, row.name, row.receipt, row.amount]], { origin: `A${currentRow}` });
        currentRow++;
      });

      // Add empty rows if less than 3 entries
      while (membershipRows.length < 3) {
        XLSX.utils.sheet_add_aoa(worksheet, [[membershipRows.length + 1, '', '', '', '']], { origin: `A${currentRow}` });
        currentRow++;
        membershipRows.push({ sNo: membershipRows.length + 1 });
      }

      currentRow++;

      // Section (ii): FINE AMOUNT - Only AMOUNT column
      XLSX.utils.sheet_add_aoa(worksheet, [['(ii). FINE AMOUNT']], { origin: `A${currentRow}` });
      currentRow++;
      XLSX.utils.sheet_add_aoa(worksheet, [['AMOUNT']], { origin: `A${currentRow}` });
      currentRow++;

      // Fetch fine amounts for the selected month
      let totalFineAmount = 0;
      members.forEach(member => {
        const activities = member.activities || {};
        const yearData = activities[reportYearStr] || activities[reportYear] || {};
        
        let monthData = null;
        for (const monthKey of monthKeyCandidates) {
          if (yearData[monthKey]) {
            monthData = yearData[monthKey];
            break;
          }
        }
        
        const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
        if (inv) {
          totalFineAmount += parseAmount(inv.fine);
        }
      });

      // Add fine amount data (single value)
      XLSX.utils.sheet_add_aoa(worksheet, [[Number(totalFineAmount.toFixed(2))]], { origin: `A${currentRow}` });
      currentRow++;

      // Add empty rows if needed (to maintain structure)
      for (let i = 0; i < 2; i++) {
        XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${currentRow}` });
        currentRow++;
      }

      currentRow++;

      // Section (iii): DIVIDEND DONATION - Fetch dividend donations for selected month
      XLSX.utils.sheet_add_aoa(worksheet, [['(iii). DIVIDEND DONATION']], { origin: `A${currentRow}` });
      currentRow++;
      const ddColumns = ['S. No.', 'DATE', 'MEMBERSHIP ID NAME', 'CUSTOM RECEIPT', 'AMOUNT'];
      XLSX.utils.sheet_add_aoa(worksheet, [ddColumns], { origin: `A${currentRow}` });
      currentRow++;

      // Fetch dividend donations for the selected month
      const monthStart = new Date(reportYear, monthIdx, 1);
      const monthEnd = new Date(reportYear, monthIdx + 1, 0, 23, 59, 59, 999);
      const monthStartISO = monthStart.toISOString().split('T')[0];
      const monthEndISO = monthEnd.toISOString().split('T')[0];

      const { data: dividendEvents, error: dividendError } = await supabase
        .from('dividend_donation_events')
        .select('*')
        .eq('status', 'confirmed')
        .gte('event_date', monthStartISO)
        .lte('event_date', monthEndISO)
        .order('event_date', { ascending: true });

      const dividendRows = [];
      if (!dividendError && dividendEvents) {
        dividendEvents.forEach((event, idx) => {
          const companyInvestment = parseAmount(event.company_investment_amount);
          if (companyInvestment > 0) {
            dividendRows.push({
              sNo: dividendRows.length + 1,
              date: formatDateForReport(event.event_date),
              name: 'COMPANY ACCOUNT',
              receipt: event.receipt_number || event.custom_receipt || '',
              amount: Number(companyInvestment.toFixed(2))
            });
          }
        });
      }

      // Add dividend donation data rows
      dividendRows.forEach(row => {
        XLSX.utils.sheet_add_aoa(worksheet, [[row.sNo, row.date, row.name, row.receipt, row.amount]], { origin: `A${currentRow}` });
        currentRow++;
      });

      // Add empty rows if less than 3 entries
      while (dividendRows.length < 3) {
        XLSX.utils.sheet_add_aoa(worksheet, [[dividendRows.length + 1, '', '', '', '']], { origin: `A${currentRow}` });
        currentRow++;
        dividendRows.push({ sNo: dividendRows.length + 1 });
      }

      currentRow++;

      // Calculate GRAND TOTAL
      const totalMembership = membershipRows.reduce((sum, row) => sum + (row.amount || 0), 0);
      const totalDividend = dividendRows.reduce((sum, row) => sum + (row.amount || 0), 0);
      const grandTotal = totalMembership + totalFineAmount + totalDividend;

      // Grand Total row
      XLSX.utils.sheet_add_aoa(worksheet, [['GRAND TOTAL', '', '', '', Number(grandTotal.toFixed(2))]], { origin: `A${currentRow}` });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'New Shares Month Wise');
      XLSX.writeFile(workbook, `employee-ISSUED NEW SHARES MONTH WISE_${reportYear}_${reportMonth}.xlsx`);
    } catch (error) {
      console.error('Error generating Monthly Shares Report:', error);
      alert(`Error generating report: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-amber-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 text-amber-600 hover:text-amber-700"
              >
                <ArrowLeftIcon />
                <span className="text-sm font-medium">Back to Dashboard</span>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Reports</h1>
                <p className="text-sm text-gray-500">Generate and download system reports</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Report Configuration */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Report Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {Object.entries(reportTypes).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {reportType === 'DIVIDEND_REPORT' && 'Member shares and dividend eligibility for selected month'}
                {reportType === 'CONSOLIDATED_REPORT' && 'Company financial summary and valuation for selected month'}
                {reportType === 'DIRECTORS_REPORT' && 'Share price history and valuations for selected month'}
                {reportType === 'FETCH_ALL_DETAILS' && 'Complete system data export (year-wise)'}
                {reportType === 'CONSOLIDATED_SHARES' && 'Member share ownership distribution for selected month'}
                {reportType === 'TOTAL_COMPANY_POOLED' && 'Company funds with custom date range'}
                {reportType === 'MONTHLY_FUNDING_AUDIT' && 'Monthly audit verification forms for selected month'}
                {reportType === 'NEW_SHARES_CURRENT' && 'Current month new shares issued'}
                {reportType === 'NEW_SHARES_MONTHWISE' && 'Month-wise share issuance breakdown for selected year'}
              </p>
            </div>

            {/* Year Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {yearsOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Month Selection (for all reports that need monthly data) */}
            {(reportType === 'DIVIDEND_REPORT' || 
              reportType === 'CONSOLIDATED_REPORT' || 
              reportType === 'DIRECTORS_REPORT' || 
              reportType === 'CONSOLIDATED_SHARES' || 
              reportType === 'MONTHLY_FUNDING_AUDIT' || 
              reportType === 'NEW_SHARES_CURRENT' || 
              reportType === 'NEW_SHARES_MONTHWISE') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {months.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}


            {/* Custom Date Range (for TOTAL_COMPANY_POOLED report) */}
            {reportType === 'TOTAL_COMPANY_POOLED' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Generate Button */}
          <div className="mt-6">
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className={`flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-lg transition transform hover:-translate-y-0.5 ${generating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <DownloadIcon />
              {generating ? 'Generating...' : 'Generate & Download Report'}
            </button>
          </div>
        </div>

        {/* Available Report Types */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Report Types</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                  💰
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Dividend Report</h3>
              </div>
              <p className="text-xs text-gray-600">
                Member shares and dividend eligibility
              </p>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  📊
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Company Valuation</h3>
              </div>
              <p className="text-xs text-gray-600">
                Financial summary and valuation
              </p>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                  👔
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Directors Report</h3>
              </div>
              <p className="text-xs text-gray-600">
                Share price history and valuations
              </p>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                  📋
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Complete System</h3>
              </div>
              <p className="text-xs text-gray-600">
                All system data export
              </p>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                  📈
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Share Distribution</h3>
              </div>
              <p className="text-xs text-gray-600">
                Member ownership percentages
              </p>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                  🏦
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Company Funds</h3>
              </div>
              <p className="text-xs text-gray-600">
                Total funds with date range
              </p>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
                  🔍
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Monthly Audit</h3>
              </div>
              <p className="text-xs text-gray-600">
                Audit verification forms
              </p>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600">
                  📊
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Current Month Shares</h3>
              </div>
              <p className="text-xs text-gray-600">
                New shares issued this month
              </p>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600">
                  📅
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Monthly Shares</h3>
              </div>
              <p className="text-xs text-gray-600">
                Month-wise share breakdown
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reports;
