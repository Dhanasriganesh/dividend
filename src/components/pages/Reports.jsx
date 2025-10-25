import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/config';
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
  const [reportType, setReportType] = useState('DIVIDEND_REPORT');
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().toLocaleString('default', { month: 'short' }));
  const [generating, setGenerating] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const currentYear = new Date().getFullYear();
  const yearsOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Report type definitions
  const reportTypes = {
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
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .not('payment', 'is', null);

    if (error) {
      console.error('Error fetching members:', error);
      return;
    }

    // Get current share price for the selected month/year
    const { data: sharePriceData } = await supabase
      .from('share_prices')
      .select('price')
      .eq('year', reportYear)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const currentSharePrice = sharePriceData?.price || 30;
    const dividendRate = 0.05; // 5% dividend rate

    const rows = members.map((member, index) => {
      const payment = member.payment || {};
      const totalShares = member.total_shares || 0;
      
      // Calculate dividend amount
      const dividendAmount = totalShares > 0 ? (totalShares * currentSharePrice * dividendRate) : 0;
      
      // Format member name (similar to the image format)
      const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();
      
      return {
        'S. No.': index + 1,
        'MEMBER NAME': memberDisplayName,
        'TOTAL NO.OF SHARES/ CUMMULATIVE SHARES': totalShares,
        'DIVIDEND': dividendAmount.toFixed(2)
      };
    });

    // Add summary row at the end
    const totalShares = members.reduce((sum, member) => sum + (member.total_shares || 0), 0);
    const totalDividend = totalShares * currentSharePrice * dividendRate;

    const summaryRow = {
      'S. No.': members.length + 1,
      'MEMBER NAME': 'TOTAL COMPANY SUMMARY',
      'TOTAL NO.OF SHARES/ CUMMULATIVE SHARES': totalShares,
      'DIVIDEND': totalDividend.toFixed(2)
    };

    rows.push(summaryRow);

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dividend Report');
    XLSX.writeFile(workbook, `admin-DIVIDEND REPORT WITH CUSTOM DATE OF SHARES ALLOTMENT BASIS_${reportYear}_${reportMonth}.xlsx`);
  };

  const generateConsolidatedReport = async () => {
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .not('payment', 'is', null);

    if (error) {
      console.error('Error fetching members:', error);
      return;
    }

    // Get current share price
    const { data: sharePriceData } = await supabase
      .from('share_prices')
      .select('price')
      .eq('year', reportYear)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const currentSharePrice = sharePriceData?.price || 30;

    // Create PART-A MEMBERS CAPITAL section
    const memberCapitalRows = members.map((member, index) => {
      const payment = member.payment || {};
      const totalShares = member.total_shares || 0;
      const valuation = totalShares * currentSharePrice;
      
      // Format member name (similar to other reports)
      const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();

      return {
        'S. No.': index + 1,
        'MEMBER NAME': memberDisplayName,
        'PRESENT SHARE PRICE': currentSharePrice,
        'TOTAL SHARES': totalShares,
        'VALUATION': valuation
      };
    });

    // Add summary row at the end
    const totalShares = members.reduce((sum, member) => sum + (member.total_shares || 0), 0);
    const totalValuation = totalShares * currentSharePrice;

    const summaryRow = {
      'S. No.': members.length + 1,
      'MEMBER NAME': 'TOTAL COMPANY SUMMARY',
      'PRESENT SHARE PRICE': currentSharePrice,
      'TOTAL SHARES': totalShares,
      'VALUATION': totalValuation
    };

    memberCapitalRows.push(summaryRow);

    const workbook = XLSX.utils.book_new();
    
    // PART-A MEMBERS CAPITAL sheet
    const memberCapitalSheet = XLSX.utils.json_to_sheet(memberCapitalRows);
    XLSX.utils.book_append_sheet(workbook, memberCapitalSheet, 'PART-A MEMBERS CAPITAL');
    
    XLSX.writeFile(workbook, `admin-CONSOLIDATED REPORT OF VALUATION OF THE COMPANY IN THE SHARES AND AMOUNT_${reportYear}_${reportMonth}.xlsx`);
  };

  const generateDirectorsReport = async () => {
    // Get current share price for the selected year
    const { data: sharePriceData, error: priceError } = await supabase
      .from('share_prices')
      .select('*')
      .eq('year', reportYear)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (priceError) {
      console.error('Error fetching share prices:', priceError);
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

    const currentSharePrice = sharePriceData?.price || 30;

    // Create member-wise directors report
    const rows = members.map((member, index) => {
      const payment = member.payment || {};
      const totalShares = member.total_shares || 0;
      
      // Calculate pooled investment (excluding fines)
      let pooledInvestment = 0;
      const activities = member.activities || {};
      Object.values(activities).forEach(yearData => {
        Object.values(yearData || {}).forEach(monthData => {
          const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
          if (inv) {
            // Add investment amount but exclude fine amount
            pooledInvestment += parseFloat(inv.amount || 0) || 0;
            // Explicitly exclude fine: pooledInvestment += parseFloat(inv.fine || 0) || 0;
          }
        });
      });

      const valuation = totalShares * currentSharePrice;
      
      // Format member name with ID and name (similar to the image format)
      const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();

      return {
      'S. No.': index + 1,
        'MEMBER NAME': memberDisplayName,
        'POOLED INVESTMENT': pooledInvestment > 0 ? pooledInvestment : 'FETCH AMOUNT OF INVESTMENT EXCEPT FINE',
        'PRESENT SHARE PRICE': currentSharePrice,
        'TOTAL SHARES': totalShares,
        'VALUATION': valuation
      };
    });

    // Add summary row at the end
    const totalPooledInvestment = members.reduce((sum, member) => {
      const activities = member.activities || {};
      let memberTotal = 0;
      Object.values(activities).forEach(yearData => {
        Object.values(yearData || {}).forEach(monthData => {
          const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
          if (inv) {
            memberTotal += parseFloat(inv.amount || 0) || 0;
          }
        });
      });
      return sum + memberTotal;
    }, 0);

    const totalShares = members.reduce((sum, member) => sum + (member.total_shares || 0), 0);
    const totalValuation = totalShares * currentSharePrice;

    const summaryRow = {
      'S. No.': members.length + 1,
      'MEMBER NAME': 'TOTAL COMPANY SUMMARY',
      'POOLED INVESTMENT': totalPooledInvestment,
      'PRESENT SHARE PRICE': currentSharePrice,
      'TOTAL SHARES': totalShares,
      'VALUATION': totalValuation
    };

    rows.push(summaryRow);

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Directors Report');
    XLSX.writeFile(workbook, `admin-DIRECTORS REPORT FOR VALUTION OF THE COMPANY_${reportYear}_${reportMonth}.xlsx`);
  };

  const generateFetchAllDetailsReport = async () => {
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*');

    const { data: sharePrices, error: priceError } = await supabase
      .from('share_prices')
      .select('*')
      .eq('year', reportYear)
      .order('created_at', { ascending: false });

    if (membersError || priceError) {
      console.error('Error fetching data:', { membersError, priceError });
      return;
    }

    const currentSharePrice = sharePrices[0]?.price || 30;
    const dividendRate = 0.05; // 5% dividend rate

    // Create comprehensive system report with all 19 columns
    const allRows = [];
    let sNo = 1;
    let cumulativeAmount = 0;

    members.forEach(member => {
      const activities = member.activities || {};
      const payment = member.payment || {};
      
      // Format member name with ID (similar to the image format)
      const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();

      // Process all activities for the selected year
      Object.keys(activities).forEach(year => {
        if (parseInt(year) === reportYear) {
          const yearData = activities[year];
          months.forEach(month => {
            const monthData = yearData[month];
            const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
            
            if (inv && parseFloat(inv.amount || 0) > 0) {
              const investmentDate = inv.date ? new Date(inv.date).toLocaleDateString() : '';
              const amount = parseFloat(inv.amount || 0) || 0;
              const fineAmount = parseFloat(inv.fine || 0) || 0;
              const newAllottedShares = parseFloat(inv.shares || 0) || 0;
              
              // Calculate cumulative amount (excluding fine)
              cumulativeAmount += amount;
              
              // Calculate previous shares (total shares - new allotted shares)
              const previousShares = (member.total_shares || 0) - newAllottedShares;
              
              // Calculate cumulative shares
              const cumulativeShares = member.total_shares || 0;
              
              // Calculate dividend
              const dividend = cumulativeShares * currentSharePrice * dividendRate;

              allRows.push({
                'S. No.': sNo++,
                'Date': investmentDate,
                'MEMBER NAME': memberDisplayName,
                'SYSTEM RECEIPT': inv.systemReceipt || '',
                'CUSTOM RECEIPT': inv.customReceipt || '',
                'AMOUNT': amount,
                'FINE AMOUNT': fineAmount,
                'CUMMULATIVE AMOUNT': cumulativeAmount,
                'SHARE PRICE': currentSharePrice,
                'NEW ALLOTED SHARES': newAllottedShares,
                'PREVIOUS SHARES': previousShares,
                'CUMMULATIVE SHARES': cumulativeShares,
                'DIVIDEND': dividend.toFixed(2),
                'AUDIT V.NO': null, // Empty for physical audit
                'AUDIT SIGN': null, // Empty for physical audit
                'PASSBOOK Yes': null, // Empty for physical audit
                'ENTRY SIGN': null, // Empty for physical audit
                'DATE OF PBE': null, // Empty for physical audit
                'MEMBER SIGN': null // Empty for physical audit
              });
            }
          });
        }
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(allRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'System Report');
    XLSX.writeFile(workbook, `1. STARTING POINTWHILE FUNDING TIME RECORDED DATA to fetch all the details in background_${reportYear}.xlsx`);
  };

  const generateConsolidatedSharesReport = async () => {
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .not('payment', 'is', null);

    if (error) {
      console.error('Error fetching members:', error);
      return;
    }

    // Create simplified consolidated shares report
    const rows = members.map((member, index) => {
      const totalShares = member.total_shares || 0;
      const payment = member.payment || {};
      
      // Format member name (similar to other reports)
      const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();
      
      return {
        'S. No.': index + 1,
        'MEMBER NAME': memberDisplayName,
        'TOTAL SHARES': totalShares
      };
    });

    // Add summary row at the end
    const totalCompanyShares = members.reduce((sum, member) => sum + (member.total_shares || 0), 0);

    const summaryRow = {
      'S. No.': members.length + 1,
      'MEMBER NAME': 'TOTAL COMPANY SUMMARY',
      'TOTAL SHARES': totalCompanyShares
    };

    rows.push(summaryRow);

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidated Shares Report');
    XLSX.writeFile(workbook, `admin-REPORT OF CONSOLIDATED SHARES IN THE COMPANY_${reportYear}_${reportMonth}.xlsx`);
  };

  const generateTotalCompanyPooledReport = async () => {
    if (!customStartDate || !customEndDate) {
      alert('Please select both start and end dates for this report.');
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

    // Create member-wise pooled amount report
    const rows = members.map((member, index) => {
      const payment = member.payment || {};
      
      // Calculate total amount invested by member (excluding fines)
      let totalAmountInvested = 0;
      const activities = member.activities || {};
      Object.values(activities).forEach(yearData => {
        Object.values(yearData || {}).forEach(monthData => {
          const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
          if (inv) {
            // Add investment amount but exclude fine amount
            totalAmountInvested += parseFloat(inv.amount || 0) || 0;
          }
        });
      });
      
      // Format member name (similar to other reports)
      const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();

      return {
        'S. No.': index + 1,
        'MEMBER NAME': memberDisplayName,
        'TOTAL AMOUNT INVESTED': totalAmountInvested
      };
    });

    // Add summary row at the end
    const totalPooledAmount = members.reduce((sum, member) => {
      const activities = member.activities || {};
      let memberTotal = 0;
      Object.values(activities).forEach(yearData => {
        Object.values(yearData || {}).forEach(monthData => {
          const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
          if (inv) {
            memberTotal += parseFloat(inv.amount || 0) || 0;
          }
        });
      });
      return sum + memberTotal;
    }, 0);

    const summaryRow = {
      'S. No.': members.length + 1,
      'MEMBER NAME': 'TOTAL COMPANY POOLED AMOUNT',
      'TOTAL AMOUNT INVESTED': totalPooledAmount
    };

    rows.push(summaryRow);

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Total Company Pooled Amount');
    XLSX.writeFile(workbook, `admin-TOTAL COMPANY POOLED AMOUNT (FROM DATE TO TO DATE)_${customStartDate}_to_${customEndDate}.xlsx`);
  };

  const generateMonthlyFundingAuditReport = async () => {
    const monthIdx = months.indexOf(reportMonth);
    const rangeStart = new Date(reportYear, monthIdx, 1);
    const rangeEnd = new Date(reportYear, monthIdx + 1, 0);

    const { data: members, error } = await supabase
      .from('members')
      .select('*');

    if (error) {
      console.error('Error fetching members:', error);
      return;
    }

    // Filter members with investments in the selected month
    const membersWithInvestments = members.filter(member => {
      const activities = member.activities || {};
      const yearData = activities[reportYear] || activities[String(reportYear)] || {};
      const monthData = yearData[reportMonth] || {};
      const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
      return inv && parseFloat(inv.amount || 0) > 0;
    });

    // Create audit verification form rows
    const rows = membersWithInvestments.map((member, index) => {
      const activities = member.activities || {};
      const yearData = activities[reportYear] || activities[String(reportYear)] || {};
      const monthData = yearData[reportMonth] || {};
      const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
      const payment = member.payment || {};
      
      // Format member name with ID (similar to the image format)
      const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();
      
      // Format date for the report
      const reportDate = inv?.date || new Date().toLocaleDateString();
      
      return {
        'S. No.': index + 1,
        'Date': reportDate,
        'MEMBER NAME': memberDisplayName,
        'RECEIPT': inv?.customReceipt || '',
        'AMOUNT': inv ? (parseFloat(inv.amount || 0) || 0) : 0,
        'AUDIT V.NO': null, // Completely empty for physical audit
        'AUDIT SIGN': null, // Completely empty for physical audit
        'PASSBOOK': null, // Completely empty for physical audit
        'ENTRY SIGN': null, // Completely empty for physical audit
        'DATE OF PBE': null, // Completely empty for physical audit
        'MEMBER SIGN': null // Completely empty for physical audit
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Funding Physical Audit');
    XLSX.writeFile(workbook, `employee-MONTHLY FUNDING PHYSICAL AUDIT VERIFIVATION FORM & REPORT_${reportYear}_${reportMonth}.xlsx`);
  };

  const generateNewSharesCurrentReport = async () => {
    const monthIdx = months.indexOf(reportMonth);
    const rangeStart = new Date(reportYear, monthIdx, 1);
    const rangeEnd = new Date(reportYear, monthIdx + 1, 0);

    const { data: members, error } = await supabase
      .from('members')
      .select('*');

    if (error) {
      console.error('Error fetching members:', error);
      return;
    }

    // Get current share price
    const { data: sharePriceData } = await supabase
      .from('share_prices')
      .select('price')
      .eq('year', reportYear)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const currentSharePrice = sharePriceData?.price || 30;

    // Filter members with investments in the selected month
    const membersWithInvestments = members.filter(member => {
      const activities = member.activities || {};
      const yearData = activities[reportYear] || activities[String(reportYear)] || {};
      const monthData = yearData[reportMonth] || {};
      const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
      return inv && parseFloat(inv.amount || 0) > 0;
    });

    // Create detailed shares report
    const rows = membersWithInvestments.map((member, index) => {
      const activities = member.activities || {};
      const yearData = activities[reportYear] || activities[String(reportYear)] || {};
      const monthData = yearData[reportMonth] || {};
      const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
      const payment = member.payment || {};
      
      // Format member name with ID (similar to other reports)
      const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();
      
      // Calculate allotted shares for current month
      const allottedShares = inv ? (parseFloat(inv.shares || 0) || 0) : 0;
      
      // Get cumulative shares (total shares)
      const cumulativeShares = member.total_shares || 0;
      
      // Format date
      const reportDate = inv?.date || new Date().toLocaleDateString();
      
      return {
        'S. No.': index + 1,
        'Date': reportDate,
        'MEMBER NAME': memberDisplayName,
        'SYSTEM RECEIPT': inv?.systemReceipt || '',
        'CUSTOM RECEIPT': inv?.customReceipt || '',
        'AMOUNT': inv ? (parseFloat(inv.amount || 0) || 0) : 0,
        'SHARE PRICE': currentSharePrice,
        'ALLOTED SHARES': allottedShares,
        'CUMMULATIVE SHARES': cumulativeShares
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Current Month New Shares Report');
    XLSX.writeFile(workbook, `employee-CURRENT MONTH ISSUED NEW SHARES & CUMMULATIVE SHARE REPORT_${reportYear}_${reportMonth}.xlsx`);
  };

  const generateNewSharesMonthwiseReport = async () => {
    const { data: members, error } = await supabase
      .from('members')
      .select('*');

    if (error) {
      console.error('Error fetching members:', error);
      return;
    }

    // Get current share price
    const { data: sharePriceData } = await supabase
      .from('share_prices')
      .select('price')
      .eq('year', reportYear)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const currentSharePrice = sharePriceData?.price || 30;

    // Create detailed transaction-level report
    const allRows = [];
    let sNo = 1;

    members.forEach(member => {
      const activities = member.activities || {};
      const payment = member.payment || {};
      
      // Format member name with ID (similar to other reports)
      const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();

      Object.keys(activities).forEach(year => {
        if (parseInt(year) === reportYear) {
          const yearData = activities[year];
          months.forEach(month => {
            const monthData = yearData[month];
            const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
            
            if (inv && parseFloat(inv.shares || 0) > 0) {
              const investmentDate = inv.date ? new Date(inv.date).toLocaleDateString() : '';
              const allottedShares = parseFloat(inv.shares || 0) || 0;
              const amount = parseFloat(inv.amount || 0) || 0;

              allRows.push({
                'S. No.': sNo++,
                'Date': investmentDate,
                'MEMBER NAME': memberDisplayName,
                'SYSTEM RECEIPT': inv.systemReceipt || '',
                'CUSTOM RECEIPT': inv.customReceipt || '',
                'AMOUNT': amount,
                'SHARE PRICE': currentSharePrice,
                'ALLOTED SHARES': allottedShares
              });
            }
          });
        }
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(allRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'New Shares Month Wise');
    XLSX.writeFile(workbook, `employee-ISSUED NEW SHARES MONTH WISE_${reportYear}.xlsx`);
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
