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

    const rows = members.map((member, index) => {
      const payment = member.payment || {};
      const totalShares = member.total_shares || 0;
      
      return {
        'S. No.': index + 1,
        'Member ID': payment.membershipId || '',
        'Member Name': member.name || '',
        'Phone': member.phoneNo || member.mobile || '',
        'Date of Joining': payment.dateOfJoining || '',
        'Total Shares': totalShares,
        'Share Price (Current)': currentSharePrice,
        'Total Value': totalShares * currentSharePrice,
        'Investment Date': payment.dateOfJoining || '',
        'Shares Allotment Date': payment.dateOfJoining || '',
        'Dividend Eligibility': totalShares > 0 ? 'Eligible' : 'Not Eligible',
        'Report Month': reportMonth,
        'Report Year': reportYear
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dividend Report');
    XLSX.writeFile(workbook, `dividend_report_${reportYear}_${reportMonth}.xlsx`);
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

    const totalShares = members.reduce((sum, member) => sum + (member.total_shares || 0), 0);
    const totalInvestment = members.reduce((sum, member) => {
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

    const companyValuation = totalShares * currentSharePrice;

    const rows = [
      {
        'Report Type': 'COMPANY VALUATION REPORT',
        'Total Members': members.length,
        'Total Shares Outstanding': totalShares,
        'Total Investment Amount': totalInvestment,
        'Current Share Price': currentSharePrice,
        'Company Valuation (Market Value)': companyValuation,
        'Report Month': reportMonth,
        'Report Year': reportYear,
        'Report Date': new Date().toLocaleDateString()
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Company Valuation');
    XLSX.writeFile(workbook, `company_valuation_report_${reportYear}_${reportMonth}.xlsx`);
  };

  const generateDirectorsReport = async () => {
    // Filter share prices for the selected year
    const { data: sharePrices, error: priceError } = await supabase
      .from('share_prices')
      .select('*')
      .eq('year', reportYear)
      .order('created_at', { ascending: false });

    if (priceError) {
      console.error('Error fetching share prices:', priceError);
      return;
    }
    
    const rows = sharePrices.map((price, index) => ({
      'S. No.': index + 1,
      'Year': price.year,
      'Share Price': price.price,
      'Valuation Date': price.created_at ? new Date(price.created_at).toLocaleDateString() : '',
      'Status': index === 0 ? 'Latest' : 'Previous',
      'Notes': 'Directors approved valuation',
      'Report Month': reportMonth
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Directors Report');
    XLSX.writeFile(workbook, `directors_report_${reportYear}_${reportMonth}.xlsx`);
  };

  const generateFetchAllDetailsReport = async () => {
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*');

    const { data: transactions, error: transError } = await supabase
      .from('company_transactions')
      .select('*');

    const { data: sharePrices, error: priceError } = await supabase
      .from('share_prices')
      .select('*');

    if (membersError || transError || priceError) {
      console.error('Error fetching data:', { membersError, transError, priceError });
      return;
    }

    // Create multiple sheets for comprehensive report
    const workbook = XLSX.utils.book_new();

    // Members sheet
    const membersRows = members.map((member, index) => ({
      'S. No.': index + 1,
      'Member ID': member.payment?.membershipId || '',
      'Name': member.name || '',
      'Phone': member.phoneNo || member.mobile || '',
      'Total Shares': member.total_shares || 0,
      'Payment Status': member.payment?.paymentStatus || '',
      'Created Date': member.createdAt ? new Date(member.createdAt).toLocaleDateString() : ''
    }));

    const membersSheet = XLSX.utils.json_to_sheet(membersRows);
    XLSX.utils.book_append_sheet(workbook, membersSheet, 'All Members');

    // Transactions sheet
    const transRows = transactions.map((transaction, index) => ({
      'S. No.': index + 1,
      'Date': transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : '',
      'Type': transaction.type,
      'Amount': transaction.amount,
      'Description': transaction.description
    }));

    const transSheet = XLSX.utils.json_to_sheet(transRows);
    XLSX.utils.book_append_sheet(workbook, transSheet, 'All Transactions');

    // Share prices sheet
    const priceRows = sharePrices.map((price, index) => ({
      'S. No.': index + 1,
      'Year': price.year,
      'Price': price.price,
      'Date': price.created_at ? new Date(price.created_at).toLocaleDateString() : ''
    }));

    const priceSheet = XLSX.utils.json_to_sheet(priceRows);
    XLSX.utils.book_append_sheet(workbook, priceSheet, 'Share Prices');

    XLSX.writeFile(workbook, `all_details_report_${reportYear}.xlsx`);
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

    const totalCompanyShares = members.reduce((sum, m) => sum + (m.total_shares || 0), 0);

    const rows = members.map((member, index) => {
      const totalShares = member.total_shares || 0;
      const payment = member.payment || {};
      
      return {
        'S. No.': index + 1,
        'Member ID': payment.membershipId || '',
        'Member Name': member.name || '',
        'Total Shares': totalShares,
        'Share Percentage': totalShares > 0 ? `${((totalShares / totalCompanyShares) * 100).toFixed(2)}%` : '0%',
        'Investment Status': totalShares > 0 ? 'Active' : 'No Investment',
        'Report Month': reportMonth,
        'Report Year': reportYear,
        'Total Company Shares': totalCompanyShares
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Share Distribution');
    XLSX.writeFile(workbook, `share_distribution_report_${reportYear}_${reportMonth}.xlsx`);
  };

  const generateTotalCompanyPooledReport = async () => {
    if (!customStartDate || !customEndDate) {
      alert('Please select both start and end dates for this report.');
      return;
    }

    const { data: transactions, error } = await supabase
      .from('company_transactions')
      .select('*')
      .gte('created_at', customStartDate)
      .lte('created_at', customEndDate);

    if (error) {
      console.error('Error fetching transactions:', error);
      return;
    }

    const totalPooled = transactions.reduce((sum, trans) => sum + (parseFloat(trans.amount || 0) || 0), 0);

    const rows = [
      {
        'Report Period': `${customStartDate} to ${customEndDate}`,
        'Total Company Pooled Amount': totalPooled,
        'Number of Transactions': transactions.length,
        'Average Transaction': transactions.length > 0 ? (totalPooled / transactions.length).toFixed(2) : 0,
        'Report Generated': new Date().toLocaleDateString()
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Company Pooled Amount');
    XLSX.writeFile(workbook, `company_pooled_amount_${customStartDate}_to_${customEndDate}.xlsx`);
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

    const rows = members.map((member, index) => {
      const activities = member.activities || {};
      const yearData = activities[reportYear] || activities[String(reportYear)] || {};
      const monthData = yearData[reportMonth] || {};
      const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
      
      return {
        'S. No.': index + 1,
        'Member ID': member.payment?.membershipId || '',
        'Member Name': member.name || '',
        'Investment Amount': inv ? (parseFloat(inv.amount || 0) || 0) : 0,
        'Fine Amount': inv ? (parseFloat(inv.fine || 0) || 0) : 0,
        'Total Amount': inv ? ((parseFloat(inv.amount || 0) || 0) + (parseFloat(inv.fine || 0) || 0)) : 0,
        'Receipt Number': inv?.customReceipt || '',
        'Physical Verification': '',
        'Audit Signature': '',
        'Date of Verification': ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Funding Audit');
    XLSX.writeFile(workbook, `monthly_funding_audit_${reportYear}_${reportMonth}.xlsx`);
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

    const currentMonthShares = members.reduce((sum, member) => {
      const activities = member.activities || {};
      const yearData = activities[reportYear] || activities[String(reportYear)] || {};
      const monthData = yearData[reportMonth] || {};
      const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
      return sum + (inv ? (parseFloat(inv.shares || 0) || 0) : 0);
    }, 0);

    const cumulativeShares = members.reduce((sum, member) => sum + (member.total_shares || 0), 0);

    const rows = [
      {
        'Report Month': `${reportMonth} ${reportYear}`,
        'Current Month New Shares': currentMonthShares,
        'Cumulative Total Shares': cumulativeShares,
        'Previous Month Shares': cumulativeShares - currentMonthShares,
        'Growth Rate': cumulativeShares > 0 ? `${((currentMonthShares / (cumulativeShares - currentMonthShares)) * 100).toFixed(2)}%` : '0%'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'New Shares Current');
    XLSX.writeFile(workbook, `new_shares_current_${reportYear}_${reportMonth}.xlsx`);
  };

  const generateNewSharesMonthwiseReport = async () => {
    const { data: members, error } = await supabase
      .from('members')
      .select('*');

    if (error) {
      console.error('Error fetching members:', error);
      return;
    }

    const monthwiseData = {};
    
    // Initialize all months with 0
    months.forEach(month => {
      monthwiseData[month] = 0;
    });

    // Calculate shares for each month
    members.forEach(member => {
      const activities = member.activities || {};
      Object.keys(activities).forEach(year => {
        if (parseInt(year) === reportYear) {
          const yearData = activities[year];
          months.forEach(month => {
            const monthData = yearData[month];
            const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
            if (inv) {
              monthwiseData[month] += (parseFloat(inv.shares || 0) || 0);
            }
          });
        }
      });
    });

    const rows = months.map((month, index) => ({
      'S. No.': index + 1,
      'Month': month,
      'Year': reportYear,
      'New Shares Issued': monthwiseData[month],
      'Cumulative Shares': months.slice(0, index + 1).reduce((sum, m) => sum + monthwiseData[m], 0)
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'New Shares Monthwise');
    XLSX.writeFile(workbook, `new_shares_monthwise_${reportYear}.xlsx`);
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
