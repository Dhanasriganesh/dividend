import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/config';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

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
  const [useDateRange, setUseDateRange] = useState(false);
  const [availableQuarters, setAvailableQuarters] = useState([]);

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

  // Fetch available quarterly price periods
  useEffect(() => {
    fetchAvailableQuarters();
  }, []);

  const fetchAvailableQuarters = async () => {
    try {
      const { data: sharePrices, error } = await supabase
        .from('share_prices')
        .select('year, month, price')
        .order('year', { ascending: false })
        .order('month', { ascending: true });

      if (error) throw error;

      // Group by year and create quarter periods
      const quarters = [];
      const yearGroups = {};
      
      sharePrices.forEach(price => {
        if (!yearGroups[price.year]) {
          yearGroups[price.year] = [];
        }
        yearGroups[price.year].push({
          month: price.month,
          monthIndex: months.indexOf(price.month),
          price: price.price
        });
      });

      // Create quarter periods from available prices
      // Find the earliest available price date to use as default start date
      let earliestDate = null;
      Object.entries(yearGroups).forEach(([year, monthData]) => {
        monthData.sort((a, b) => a.monthIndex - b.monthIndex);
        
        monthData.forEach((month) => {
          const monthDate = new Date(year, month.monthIndex, 1);
          if (!earliestDate || monthDate < earliestDate) {
            earliestDate = monthDate;
          }
          
          quarters.push({
            id: `${year}-${month.month}`,
            label: `${month.month} ${year} (₹${month.price})`,
            year: parseInt(year),
            month: month.month,
            price: month.price
          });
        });
      });

      // Set the earliest date as the default start date
      if (earliestDate && !customStartDate) {
        setCustomStartDate(earliestDate.toISOString().split('T')[0]);
      }

      setAvailableQuarters(quarters.sort((a, b) => b.year - a.year || months.indexOf(b.month) - months.indexOf(a.month)));
    } catch (error) {
      console.error('Error fetching quarterly periods:', error);
    }
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

  // Helper function to get date range for reports
  const getDateRangeForReport = () => {
    if (useDateRange && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate).toLocaleDateString();
      const endDate = new Date(customEndDate).toLocaleDateString();
      return `${startDate} to ${endDate}`;
    } else {
      // Traditional year/month mode
      return `${reportMonth} ${reportYear}`;
    }
  };

  // Helper function to apply yellow background to a cell/row
  const applyYellowStyling = (cell, mergeRange = null, worksheet = null) => {
    // Store the original value before applying styling
    const originalValue = cell.value;
    
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' } // Yellow background
    };
    cell.font = {
      bold: true,
      size: 12,
      color: { argb: 'FF000000' } // Black text
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    
    // Ensure the original value is preserved
    if (originalValue !== undefined && originalValue !== null) {
      cell.value = originalValue;
      console.log('🔒 Preserved cell value:', originalValue);
    }
    
    // If merge range is provided, merge the cells
    if (mergeRange && worksheet) {
      console.log('🔗 Merging cells:', mergeRange);
      worksheet.mergeCells(mergeRange);
    }
  };

  // Helper to safely parse numeric values
  const safeParseNumber = (value) => {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : 0;
  };

  // Helper: build share price lookup map for quick quarter-wise calculations
  const buildSharePriceMap = (sharePrices) => {
    const map = {};
    sharePrices.forEach(sp => {
      const year = sp.year;
      const month = sp.month;
      if (!map[year]) map[year] = {};
      map[year][month] = safeParseNumber(sp.price);
    });
    return map;
  };

  // Helper: calculate cumulative shares & pooled amount quarter‑wise for a member
  // Shares for each period = amount in that period / share price of that period
  const calculateQuarterWiseTotals = (member, sharePriceMap, upToYear, upToMonthIdx) => {
    let totalAmount = 0;
    let totalShares = 0;
    const activities = member.activities || {};

    Object.keys(activities).forEach(yearKey => {
      const yNum = parseInt(String(yearKey), 10);
      if (Number.isNaN(yNum) || yNum > upToYear) return;

      const yData = activities[yearKey] || {};
      Object.keys(yData).forEach(monKey => {
        let mIdx = -1;
        for (let i = 0; i < months.length && mIdx === -1; i++) {
          const candidates = getMonthKeyCandidates(months[i]);
          if (candidates.includes(monKey)) {
            mIdx = i;
          }
        }

        if (mIdx === -1) return;
        if (yNum === upToYear && mIdx > upToMonthIdx) return;

        const mData = yData[monKey];
        const inv = mData?.investment || (mData?.type === 'investment' ? mData : null);
        if (!inv) return;

        const amount = safeParseNumber(inv.amount);
        if (!amount) return;

        const priceYearMap = sharePriceMap[yNum];
        const price = priceYearMap ? safeParseNumber(priceYearMap[monKey]) : 0;
        if (!price) return;

        const shares = amount / price;
        totalAmount += amount;
        totalShares += shares;
      });
    });

    return {
      totalAmount,
      totalShares
    };
  };

  // Helper function to create Excel file with proper yellow styling using ExcelJS
  const createStyledExcelFile = async (data, reportName, fileName, mergeToColumn = 'D') => {
    console.log('🚀 Creating styled Excel with ExcelJS...');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportName);
    
    const dateRange = getDateRangeForReport();
    const heading = `${reportName} (${dateRange})`;
    
    console.log('📝 Adding main heading:', heading);
    
    // Add main heading in row 1
    worksheet.getCell('A1').value = heading;
    const mainMergeRange = `A1:${mergeToColumn}1`;
    applyYellowStyling(worksheet.getCell('A1'), mainMergeRange, worksheet);
    worksheet.getCell('A1').font.size = 14; // Larger font for main heading
    
    console.log('✅ Applied yellow styling to main header');
    
    // Find Part-B sections in the data and handle them specially
    let partBSections = [];
    if (data && data.length > 0) {
      data.forEach((row, index) => {
        const rowText = Array.isArray(row) ? row.join(' ').toUpperCase() : String(row).toUpperCase();
        const isPartHeader = rowText.includes('PART-A') || 
                            rowText.includes('PART-B') || 
                            rowText.includes('MEMBERS CAPITAL') ||
                            rowText.includes('COMPANY OWN CAPITAL') || 
                            rowText.includes('INDIVIDUAL CAPITAL') ||
                            (rowText.includes('COMPANY') && rowText.includes('CAPITAL') && rowText.includes('DIVIDEND'));
        
        if (isPartHeader) {
          const partText = row.find(cell => cell && cell.trim()) || row.join(' ').trim();
          partBSections.push({
            originalIndex: index,
            text: partText,
            newRowIndex: index + 3 // Will be adjusted
          });
          console.log('🎯 Found Part section:', partText);
        }
      });
    }
    
    // Add data starting from row 3 (leaving row 2 empty for spacing)
    if (data && data.length > 0) {
      console.log('📊 Adding data rows:', data.length);
      
      data.forEach((row, index) => {
        const rowIndex = index + 3; // Start from row 3
        
        // Check if this is a Part header row (A or B)
        const partSection = partBSections.find(section => section.originalIndex === index);
        
        if (partSection) {
          // Handle Part header specially
          console.log('🎨 Creating Part header row:', partSection.text);
          
          // Set the Part text in cell A
          const partCell = worksheet.getCell(`A${rowIndex}`);
          partCell.value = partSection.text;
          
          // Apply yellow styling - SAME as main header
          partCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF00' }
          };
          partCell.font = {
            bold: true,
            size: 14, // SAME size as main header
            color: { argb: 'FF000000' }
          };
          partCell.alignment = {
            horizontal: 'center',
            vertical: 'middle'
          };
          partCell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          // Set row height - SAME as main header would have
          worksheet.getRow(rowIndex).height = 25;
          
          // Merge cells
          const partMergeRange = `A${rowIndex}:${mergeToColumn}${rowIndex}`;
          worksheet.mergeCells(partMergeRange);
          
          console.log('✅ Part header created successfully:', partSection.text);
        } else {
          // Handle normal data rows
          const rowText = Array.isArray(row) ? row.join(' ').toUpperCase() : String(row).toUpperCase();
          const isBlueTotalRow =
            rowText.includes('TOTAL COMPANY SUMMARY') ||
            rowText.includes('TOTAL PART B SUMMARY');
          const isGreenGrandTotalRow = rowText.includes('GRAND TOTAL PART A+B');
          
          row.forEach((cell, colIndex) => {
            const colLetter = String.fromCharCode(65 + colIndex); // A, B, C, D...
            const cellRef = worksheet.getCell(`${colLetter}${rowIndex}`);
            cellRef.value = cell;
            
            // Apply blue styling to normal total rows (Part A & Part B)
            if (isBlueTotalRow) {
              cellRef.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' } // Blue background
              };
              cellRef.font = {
                bold: true,
                color: { argb: 'FFFFFFFF' } // White text
              };
              cellRef.alignment = {
                horizontal: colIndex === 0 ? 'left' : 'right',
                vertical: 'middle'
              };
              cellRef.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              };
            }

            // Apply green styling to GRAND TOTAL A+B summary row
            if (isGreenGrandTotalRow) {
              cellRef.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF00B050' } // Green background
              };
              cellRef.font = {
                bold: true,
                color: { argb: 'FFFFFFFF' } // White text
              };
              cellRef.alignment = {
                horizontal: colIndex === 0 ? 'left' : 'right',
                vertical: 'middle'
              };
              cellRef.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              };
            }
          });
        }
      });
    }
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20;
    });
    
    console.log('💾 Writing Excel file...');
    
    // Write file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Excel file created successfully with yellow backgrounds!');
  };

  // Helper: format date as DD-MM-YYYY for flat reports
  const formatDateDDMMYYYY = (value) => {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Helper: download simple CSV (for very large flat reports like Complete System Report)
  const downloadCsvFile = (rows, reportName, fileName) => {
    if (!rows || rows.length === 0) return;
    const escapeCell = (cell) => {
      if (cell == null) return '';
      const str = String(cell);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const csv = rows
      .map(row => row.map(escapeCell).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Helper function to add yellow heading to Excel worksheet
  const addYellowHeading = (worksheet, reportName, startRow = 1, mergeToColumn = 'D') => {
    console.log('🎨 Adding yellow heading:', reportName, 'Row:', startRow, 'Merge to:', mergeToColumn);
    
    const dateRange = getDateRangeForReport();
    const heading = `*** ${reportName} (${dateRange}) ***`;
    
    console.log('📝 Heading text:', heading);
    
    // Add the heading
    XLSX.utils.sheet_add_aoa(worksheet, [[heading]], { origin: `A${startRow}` });
    
    // Initialize merges and cols if they don't exist
    if (!worksheet['!merges']) worksheet['!merges'] = [];
    if (!worksheet['!cols']) worksheet['!cols'] = [];
    
    // Merge cells from A to the specified column
    const mergeRange = `A${startRow}:${mergeToColumn}${startRow}`;
    console.log('🔗 Merging cells:', mergeRange);
    worksheet['!merges'].push(XLSX.utils.decode_range(mergeRange));
    
    // Set column widths for better visibility
    worksheet['!cols'][0] = { wch: 25 };
    worksheet['!cols'][1] = { wch: 25 };
    worksheet['!cols'][2] = { wch: 20 };
    worksheet['!cols'][3] = { wch: 20 };
    
    // Get column letters for the merge range
    const endColIndex = mergeToColumn.charCodeAt(0) - 'A'.charCodeAt(0);
    console.log('📊 Styling columns 0 to', endColIndex);
    
    // Try different styling approaches
    const styleOptions = [
      // Option 1: Standard XLSX styling
      {
        fill: { patternType: "solid", fgColor: { rgb: "FFFF00" } },
        font: { bold: true, sz: 14 },
        alignment: { horizontal: "center" }
      },
      // Option 2: Alternative format
      {
        fill: { fgColor: { rgb: "FFFF00" } },
        font: { bold: true, size: 14 },
        alignment: { horizontal: "center" }
      },
      // Option 3: Simple format
      {
        fill: { fgColor: "FFFF00" },
        font: { bold: true },
        alignment: { horizontal: "center" }
      }
    ];
    
    // Apply styling to all cells in the merged range
    for (let i = 0; i <= endColIndex; i++) {
      const colLetter = String.fromCharCode('A'.charCodeAt(0) + i);
      const cellRef = `${colLetter}${startRow}`;
      
      console.log('🎯 Styling cell:', cellRef);
      
      if (!worksheet[cellRef]) {
        worksheet[cellRef] = { t: 's', v: i === 0 ? heading : '' };
      }
      
      // Try the first style option
      worksheet[cellRef].s = styleOptions[0];
      
      console.log('✅ Applied style to', cellRef, ':', JSON.stringify(worksheet[cellRef].s));
    }
    
    console.log('📋 Final worksheet merges:', worksheet['!merges']);
    console.log('📋 Sample cell A1:', worksheet[`A${startRow}`]);
    
    return startRow + 2; // Return next available row (with spacing)
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

    // Preload all share prices for quarter-wise member share calculations
    const { data: allSharePrices, error: allSharePricesError } = await supabase
      .from('share_prices')
      .select('year, month, price');

    if (allSharePricesError) {
      console.error('Error fetching share prices for dividend report:', allSharePricesError);
      alert('Unable to fetch share prices for the dividend report.');
      return;
    }

    const sharePriceMap = buildSharePriceMap(allSharePrices || []);

    // First try to find dividend event in the selected month
    let { data: dividendEventsData, error: eventsError } = await supabase
      .from('dividend_donation_events')
      .select('*')
      .eq('status', 'confirmed')
      .gte('event_date', monthStartISO)
      .lte('event_date', monthEndISO)
      .order('event_date', { ascending: false });
    
    // If no event found in selected month, try to find the most recent event
    // This handles cases where the event might be in a different month but is the active one
    if ((!dividendEventsData || dividendEventsData.length === 0) && !eventsError) {
      console.log('⚠️ No dividend event found in selected month, searching for most recent event...');
      const { data: recentEvents, error: recentError } = await supabase
        .from('dividend_donation_events')
        .select('*')
        .eq('status', 'confirmed')
        .order('event_date', { ascending: false })
        .limit(1);
      
      if (!recentError && recentEvents && recentEvents.length > 0) {
        console.log('✅ Found most recent dividend event:', recentEvents[0].event_name);
        dividendEventsData = recentEvents;
      }
    }

    if (eventsError) {
      console.error('Error fetching dividend events:', eventsError);
    }

    const dividendEvents = dividendEventsData || [];
    const dividendEvent = dividendEvents[0] || null;
    const dividendOccurred = Boolean(dividendEvent);
    
    if (!dividendOccurred) {
      console.warn('⚠️ No dividend event found. Will check both exception rules as fallback.');
    }

    // Calculate total shares quarter‑wise for all members (up to report month)
    let totalShares = 0;
    const memberSharesMap = new Map();
    members.forEach(member => {
      const { totalShares: memberShares } = calculateQuarterWiseTotals(
        member,
        sharePriceMap,
        reportYear,
        monthIdx
      );
      memberSharesMap.set(member.id, memberShares);
      totalShares += memberShares;
    });

    // Fetch manual profit entry to calculate actual profit distribution
    const { data: manualProfitData, error: manualProfitError } = await supabase
      .from('manual_profit_entries')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    let totalMemberDistribution = 0;
    let dividendPerShare = 0;

    if (!manualProfitError && manualProfitData && manualProfitData.length > 0) {
      const manualProfit = manualProfitData[0];
      const totalManualProfit = parseAmount(manualProfit.profit_amount || 0);
      
      if (totalManualProfit > 0 && totalShares > 0) {
        // Use manual profit amount (profits distributed)
        totalMemberDistribution = totalManualProfit;
        dividendPerShare = totalMemberDistribution / totalShares;
      }
    } else if (dividendOccurred) {
      // Fallback to distributed_amount from dividend event if manual profit not found
      totalMemberDistribution = parseAmount(dividendEvent.distributed_amount || 0);
      dividendPerShare = totalShares > 0 ? totalMemberDistribution / totalShares : 0;
    }

    // Helper function to get member joining date
    const getMemberJoiningDate = (member) => {
      return member.payment?.dateOfJoining || null;
    };

    // Helper function to check if date is in last month of range (the end date's month)
    const isDateInLastMonth = (date, endDate) => {
      if (!date) return false;
      const end = new Date(endDate);
      const dateToCheck = new Date(date);
      
      // Check if the date is in the same month and year as the end date
      // Normalize to avoid timezone issues
      return dateToCheck.getFullYear() === end.getFullYear() && 
             dateToCheck.getMonth() === end.getMonth();
    };

    // Helper function to check if date is in last 3 months of range (including end date month)
    const isDateInLast3Months = (date, endDate) => {
      if (!date) return false;
      const end = new Date(endDate);
      const dateToCheck = new Date(date);
      
      // Set time to start of day for accurate comparison
      end.setHours(23, 59, 59, 999);
      dateToCheck.setHours(0, 0, 0, 0);
      
      // Calculate start of 3-month period: go back 2 months from end date month
      // This gives us: (endMonth - 2), (endMonth - 1), endMonth = 3 months total
      const threeMonthsStart = new Date(end.getFullYear(), end.getMonth() - 2, 1);
      threeMonthsStart.setHours(0, 0, 0, 0);
      
      return dateToCheck >= threeMonthsStart && dateToCheck <= end;
    };

    // Determine donation eligibility - use the same logic as Dividend page
    // Use monthEndDate (end of selected month) as reference, matching Dividend page's endDate
    // monthEndDate is already declared above as: new Date(Date.UTC(reportYear, monthIdx + 1, 0))
    
    // Parse exception rule from event_name
    const eventName = dividendEvent ? (dividendEvent.event_name || '').toLowerCase() : '';
    let exceptionRule = null; // Will be determined or use fallback
    
    console.log('🔍 Dividend Report - Event Name:', dividendEvent?.event_name || 'No event');
    console.log('🔍 Dividend Report - Event Name (lowercase):', eventName);
    
    // Check for "last 3 months" first (more specific)
    if (eventName.includes('last 3 months') || eventName.includes('last3months') || eventName.includes('3 months')) {
      exceptionRule = 'except last 3 months';
    } else if (eventName.includes('last month') || eventName.includes('lastmonth')) {
      exceptionRule = 'except last month';
    } else if (eventName.includes('no exception')) {
      exceptionRule = 'no exception';
    }
    
    console.log('🔍 Dividend Report - Parsed Exception Rule:', exceptionRule || 'Not found - will use fallback');
    console.log('🔍 Dividend Report - Month End Date:', monthEndDate);
    console.log('🔍 Dividend Report - Month End ISO:', monthEndISO);
    
    const getDonationStatus = (member) => {
      const payment = member.payment || {};
      const membershipId = payment.membershipId || '';
      const name = (member.name || '').trim().toLowerCase();
      
      // Company Account (2025-002) is always eligible
      if (membershipId === '2025-002' && name === 'company account') {
        console.log(`✅ ${name} (${membershipId}): Company Account - Always Eligible`);
        return 'Eligible';
      }

      // Apply the same logic as Dividend page based on exception rule
      if (exceptionRule === 'no exception') {
        console.log(`✅ ${name} (${membershipId}): No exception rule - Eligible`);
        return 'Eligible';
      } else if (exceptionRule === 'except last month') {
        const joiningDate = getMemberJoiningDate(member);
        console.log(`🔍 ${name} (${membershipId}): Joining Date:`, joiningDate);
        if (!joiningDate) {
          console.log(`⚠️ ${name} (${membershipId}): No joining date - Defaulting to Eligible`);
          return 'Eligible';
        }
        // Check if joined in the same month as the end date (matching Dividend page logic)
        const joinedInLastMonth = isDateInLastMonth(new Date(joiningDate), monthEndDate);
        console.log(`🔍 ${name} (${membershipId}): Joined in last month?`, joinedInLastMonth);
        const status = joinedInLastMonth ? 'Ineligible' : 'Eligible';
        console.log(`📊 ${name} (${membershipId}): Final Status = ${status}`);
        return status;
      } else if (exceptionRule === 'except last 3 months') {
        const joiningDate = getMemberJoiningDate(member);
        console.log(`🔍 ${name} (${membershipId}): Joining Date:`, joiningDate);
        if (!joiningDate) {
          console.log(`⚠️ ${name} (${membershipId}): No joining date - Defaulting to Eligible`);
          return 'Eligible';
        }
        // Check if joined in last 3 months of the end date (matching Dividend page logic)
        const joinedInLast3Months = isDateInLast3Months(new Date(joiningDate), monthEndDate);
        console.log(`🔍 ${name} (${membershipId}): Joined in last 3 months?`, joinedInLast3Months);
        const status = joinedInLast3Months ? 'Ineligible' : 'Eligible';
        console.log(`📊 ${name} (${membershipId}): Final Status = ${status}`);
        return status;
      } else {
        // Fallback: If exception rule not found, check both conditions to be safe
        // This ensures members who should be ineligible are correctly identified
        console.log(`⚠️ ${name} (${membershipId}): Exception rule not found - Checking both conditions as fallback`);
        const joiningDate = getMemberJoiningDate(member);
        if (!joiningDate) {
          console.log(`⚠️ ${name} (${membershipId}): No joining date - Defaulting to Eligible`);
          return 'Eligible';
        }
        const joinedInLastMonth = isDateInLastMonth(new Date(joiningDate), monthEndDate);
        const joinedInLast3Months = isDateInLast3Months(new Date(joiningDate), monthEndDate);
        console.log(`🔍 ${name} (${membershipId}): Joined in last month?`, joinedInLastMonth, '| Joined in last 3 months?', joinedInLast3Months);
        const status = (joinedInLastMonth || joinedInLast3Months) ? 'Ineligible' : 'Eligible';
        console.log(`📊 ${name} (${membershipId}): Final Status (fallback) = ${status}`);
        return status;
      }
    };

    // Build Part A rows and track only ELIGIBLE totals for summary
    let eligibleSharesPartA = 0;
    let eligibleDividendPartA = 0;

    const partARows = members.map((member, index) => {
      const payment = member.payment || {};
      const memberShares = memberSharesMap.get(member.id) || 0;
      const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();
      // Calculate dividend amount from profit per share (using manual profit or dividend event)
      const dividendAmount = dividendPerShare > 0 ? Number((memberShares * dividendPerShare).toFixed(2)) : 0;
      const donationStatus = getDonationStatus(member);

      // Only count ELIGIBLE members toward Part A summary totals
      if (donationStatus === 'Eligible') {
        eligibleSharesPartA += memberShares;
        eligibleDividendPartA += dividendAmount;
      }

      return {
        'S. No.': index + 1,
        'MEMBER NAME': memberDisplayName,
        'TOTAL NO.OF SHARES/ CUMMULATIVE SHARES': Number(memberShares.toFixed(2)),
        'DIVIDEND': dividendAmount,
        'DONATION': donationStatus
      };
    });

    const summaryRow = {
      'S. No.': '', // Remove serial number from total row
      'MEMBER NAME': 'TOTAL COMPANY SUMMARY',
      // Use ONLY eligible members' totals in the summary
      'TOTAL NO.OF SHARES/ CUMMULATIVE SHARES': Number(eligibleSharesPartA.toFixed(2)),
      'DIVIDEND': Number(eligibleDividendPartA.toFixed(2)),
      'DONATION': '' // Empty for summary row
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
    // Start from MEMBER NAME column (column B) so ID NUMBER aligns under Member Name
    const partBHeaders = ['ID NUMBER', 'TOTAL COMPANY OWNED SHARES', 'DIVIDEND AMOUNT'];
    XLSX.utils.sheet_add_aoa(worksheet, [partBHeaders], { origin: `B${partBStartRow + 1}` });
    
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
      const companyDividend = dividendPerShare > 0 
        ? Number((companyShares * dividendPerShare).toFixed(2))
        : 0;
      
      // Add company account row to Part B
      partBRows.push([
        '2025-002', // ID NUMBER
        Number(companyShares.toFixed(2)), // TOTAL COMPANY OWNED SHARES
        companyDividend // DIVIDEND AMOUNT
      ]);
    }
    
    // Add Part B data rows
    // Place data starting from column B to align with the headers above
    partBRows.forEach((row, index) => {
      XLSX.utils.sheet_add_aoa(worksheet, [row], { origin: `B${partBStartRow + 2 + index}` });
    });

    // Add Part B summary row (TOTAL) and Grand Total A+B if there is at least one Part B row
    if (partBRows.length > 0) {
      // Calculate numeric totals here (json_to_sheet/sheet_to_json will strip formula objects)
      const totalCompanySharesPartB = partBRows.reduce((sum, row) => {
        const shares = parseAmount(row[1] || 0); // TOTAL COMPANY OWNED SHARES
        return sum + shares;
      }, 0);

      const totalDividendPartB = partBRows.reduce((sum, row) => {
        const div = parseAmount(row[2] || 0); // DIVIDEND AMOUNT
        return sum + div;
      }, 0);

      console.log('📊 Part B Summary - Total Shares:', totalCompanySharesPartB, 'Total Dividend:', totalDividendPartB);

      const partBSummaryRow = [
        // Avoid the exact text "PART-B" so this row is not treated as a yellow section header
        'TOTAL PART B SUMMARY',
        Number(totalCompanySharesPartB.toFixed(2)),
        Number(totalDividendPartB.toFixed(2))
      ];

      // Summary row goes just after the last Part B data row, starting from column B
      const partBSummaryRowIndex = partBStartRow + 2 + partBRows.length;
      XLSX.utils.sheet_add_aoa(worksheet, [partBSummaryRow], { origin: `B${partBSummaryRowIndex}` });

      // Grand Total A + B (green row)
      // IMPORTANT: Use ONLY eligible Part A totals so ineligible members are not counted
      const grandTotalShares = Number((eligibleSharesPartA + totalCompanySharesPartB).toFixed(2));
      const grandTotalDividend = Number((eligibleDividendPartA + totalDividendPartB).toFixed(2));

      console.log('📊 Grand Total A+B - Shares:', grandTotalShares, 'Dividend:', grandTotalDividend);

      const grandTotalRow = [
        'GRAND TOTAL PART A+B',
        grandTotalShares,
        grandTotalDividend
      ];

      const grandTotalRowIndex = partBSummaryRowIndex + 1;
      XLSX.utils.sheet_add_aoa(worksheet, [grandTotalRow], { origin: `B${grandTotalRowIndex}` });
    }

    // Create a new worksheet with heading first
    const finalWorksheet = XLSX.utils.aoa_to_sheet([]);
    
    // Add yellow heading at the top (merged across columns A to E)
    const nextRow = addYellowHeading(finalWorksheet, 'Dividend Report', 1, 'E');
    
    // Get all existing data from the current worksheet
    const existingData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    // Add the existing data starting from nextRow
    if (existingData.length > 0) {
      XLSX.utils.sheet_add_aoa(finalWorksheet, existingData, { origin: `A${nextRow}` });
    }
    
    // Copy any existing formatting and properties
    if (worksheet['!cols']) finalWorksheet['!cols'] = worksheet['!cols'];
    if (worksheet['!rows']) finalWorksheet['!rows'] = worksheet['!rows'];
    
    // Use ExcelJS for proper yellow background styling
    console.log('🎨 Using ExcelJS for proper styling...');
    
    // Convert worksheet data to array format for ExcelJS
    const worksheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    console.log('📊 Converted data rows:', worksheetData.length);
    
    // Create styled Excel file with ExcelJS
    await createStyledExcelFile(
      worksheetData, 
      'Dividend Report', 
      `admin-DIVIDEND REPORT WITH CUSTOM DATE OF SHARES ALLOTMENT BASIS_${reportYear}_${reportMonth}.xlsx`,
      'E'
    );
    
    console.log('✅ Dividend Report created with proper yellow background!');
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

    // Preload all share prices for quarter-wise TOTAL SHARES calculation
    const { data: allSharePrices, error: allSharePricesError } = await supabase
      .from('share_prices')
      .select('year, month, price');

    if (allSharePricesError) {
      console.error('Error fetching share prices for consolidated report:', allSharePricesError);
      alert('Unable to fetch share prices for the valuation report.');
      return;
    }

    const sharePriceMap = buildSharePriceMap(allSharePrices || []);

    // Create PART-A MEMBERS CAPITAL section - TOTAL SHARES calculated quarter-wise
    const memberCapitalRows = members.map((member, index) => {
      const payment = member.payment || {};

      const { totalShares: totalSharesForMonth } = calculateQuarterWiseTotals(
        member,
        sharePriceMap,
        reportYear,
        monthIdx
      );

      const valuation = totalSharesForMonth * currentSharePrice;
      
      // Format member name (similar to other reports)
      const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();

      return {
        'S. No.': index + 1,
        'MEMBER NAME': memberDisplayName,
        'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
        'TOTAL SHARES': Number(totalSharesForMonth.toFixed(2)),
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

    // Add Part-A header before the member data
    const partAData = [
      ['PART-A MEMBERS CAPITAL'],
      [''], // Empty row for spacing
      ...XLSX.utils.sheet_to_json(XLSX.utils.json_to_sheet(memberCapitalRows), { header: 1, defval: '' })
    ];
    
    // Create worksheet with Part-A data
    const worksheet = XLSX.utils.aoa_to_sheet(partAData);
    
    // Get the range of Part A to find where Part B should start
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const partBStartRow = range.e.r + 4; // Start Part B a few rows after Part A ends
    
    // ========== PART B: COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL ==========
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
    
    // Build Part‑B table in the same structure as Part‑A
    const partBTableRows = [
      {
        'S. No.': 1,
        'MEMBER NAME': '(i). MEMBERSHIP AMOUNT',
        'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
        'TOTAL SHARES': Number(membershipShares.toFixed(2)),
        'VALUATION': Number((membershipShares * currentSharePrice).toFixed(2))
      },
      {
        'S. No.': 2,
        'MEMBER NAME': '(ii). FINE AMOUNT',
        'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
        'TOTAL SHARES': Number(fineShares.toFixed(2)),
        'VALUATION': Number((fineShares * currentSharePrice).toFixed(2))
      },
      {
        'S. No.': 3,
        'MEMBER NAME': '(iii). DIVIDEND DONATION',
        'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
        'TOTAL SHARES': Number(dividendShares.toFixed(2)),
        'VALUATION': Number((dividendShares * currentSharePrice).toFixed(2))
      }
    ];

    // Part‑B summary row (blue) and Grand Total A+B (green)
    const partBTotalShares = partBTableRows.reduce(
      (sum, row) => sum + parseAmount(row['TOTAL SHARES']),
      0
    );
    const partBTotalValuation = partBTableRows.reduce(
      (sum, row) => sum + parseAmount(row['VALUATION']),
      0
    );

    const partBSummaryRow = {
      'S. No.': partBTableRows.length + 1,
      'MEMBER NAME': 'TOTAL PART B SUMMARY',
      'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
      'TOTAL SHARES': Number(partBTotalShares.toFixed(2)),
      'VALUATION': Number(partBTotalValuation.toFixed(2))
    };

    partBTableRows.push(partBSummaryRow);

    const grandTotalShares = Number((totalShares + partBTotalShares).toFixed(2));
    const grandTotalValuation = Number((totalValuation + partBTotalValuation).toFixed(2));

    const grandTotalRow = {
      'S. No.': partBTableRows.length + 1,
      'MEMBER NAME': 'GRAND TOTAL PART A+B',
      'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
      'TOTAL SHARES': grandTotalShares,
      'VALUATION': grandTotalValuation
    };

    partBTableRows.push(grandTotalRow);

    const partBTableAoa = XLSX.utils.sheet_to_json(
      XLSX.utils.json_to_sheet(partBTableRows),
      { header: 1, defval: '' }
    );

    const partBData = [
      ['PART-B COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL'],
      [''],
      ...partBTableAoa
    ];

    // Write Part‑B table starting from partBStartRow
    XLSX.utils.sheet_add_aoa(worksheet, partBData, { origin: `A${partBStartRow}` });

    // Use ExcelJS for proper styling
    console.log('🎨 Using ExcelJS for Company Valuation Report...');
    
    const worksheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    await createStyledExcelFile(
      worksheetData, 
      'Company Valuation Report', 
      `admin-CONSOLIDATED REPORT OF VALUATION OF THE COMPANY IN THE SHARES AND AMOUNT_${reportYear}_${reportMonth}.xlsx`,
      'F'
    );
    
    console.log('✅ Company Valuation Report created with yellow backgrounds!');
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

    // Preload all share prices for quarter‑wise computations
    const { data: allSharePrices, error: allSharePricesError } = await supabase
      .from('share_prices')
      .select('year, month, price');

    if (allSharePricesError) {
      console.error('Error fetching share prices for directors report:', allSharePricesError);
      alert('Unable to fetch share prices for the directors report.');
      return;
    }

    const sharePriceMap = buildSharePriceMap(allSharePrices || []);

    // Create member-wise directors report - use cumulative investment & shares (quarter-wise)
    const rows = members.map((member, index) => {
      const payment = member.payment || {};
      const { totalAmount: pooledInvestment, totalShares } = calculateQuarterWiseTotals(
        member,
        sharePriceMap,
        reportYear,
        monthIdx
      );
      
      const valuation = totalShares * currentSharePrice;
      
      // Format member name with ID and name (similar to the image format)
      const memberDisplayName = `${payment.membershipId || ''} ${member.name || ''}`.trim();

      return {
        'S. No.': index + 1,
        'MEMBER NAME': memberDisplayName,
        'POOLED INVESTMENT': Number(pooledInvestment.toFixed(2)),
        'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
        'TOTAL SHARES': Number(totalShares.toFixed(2)),
        'VALUATION': Number(valuation.toFixed(2))
      };
    });

    // Add summary row at the end - totals based on cumulative quarter-wise data
    const totalPooledInvestment = rows.reduce(
      (sum, row) => sum + parseAmount(row['POOLED INVESTMENT']),
      0
    );

    const totalShares = rows.reduce(
      (sum, row) => sum + parseAmount(row['TOTAL SHARES']),
      0
    );
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
    // Build a table with same columns as Part A:
    // 'S. No.', 'MEMBER NAME', 'POOLED INVESTMENT', 'PRESENT SHARE PRICE', 'TOTAL SHARES', 'VALUATION'
    
    // Section (i): MEMBERSHIP AMOUNT - Calculate total membership amount collected up to report month
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

    // Section (ii): FINE AMOUNT - Calculate total fine amount collected (all time, like Company Valuation Part B)
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

    // Calculate quarter‑wise shares for membership & fine using company_transactions
    const { data: companyTransactions, error: txError } = await supabase
      .from('company_transactions')
      .select('*')
      .eq('membership_id', '2025-002')
      .eq('type', 'investment')
      .order('created_at', { ascending: true });

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

    // Calculate total dividend donation amount and shares (all confirmed events, quarter‑wise)
    const { data: dividendEvents, error: dividendError } = await supabase
      .from('dividend_donation_events')
      .select('company_investment_amount, company_shares_purchased')
      .eq('status', 'confirmed');

    let dividendDonationAmount = 0;
    let dividendShares = 0;
    if (!dividendError && dividendEvents) {
      dividendEvents.forEach(event => {
        dividendDonationAmount += parseAmount(event.company_investment_amount);
        dividendShares += parseAmount(event.company_shares_purchased);
      });
    }
    
    const partBTableRows = [
      {
        'S. No.': 1,
        'MEMBER NAME': '(i). MEMBERSHIP AMOUNT',
        'POOLED INVESTMENT': Number(totalRegistrationAmount.toFixed(2)),
        'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
        'TOTAL SHARES': Number(membershipShares.toFixed(2)),
        'VALUATION': Number((membershipShares * currentSharePrice).toFixed(2))
      },
      {
        'S. No.': 2,
        'MEMBER NAME': '(ii). FINE AMOUNT',
        'POOLED INVESTMENT': Number(totalFineAmount.toFixed(2)),
        'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
        'TOTAL SHARES': Number(fineShares.toFixed(2)),
        'VALUATION': Number((fineShares * currentSharePrice).toFixed(2))
      },
      {
        'S. No.': 3,
        'MEMBER NAME': '(iii). DIVIDEND DONATION',
        'POOLED INVESTMENT': Number(dividendDonationAmount.toFixed(2)),
        'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
        'TOTAL SHARES': Number(dividendShares.toFixed(2)),
        'VALUATION': Number((dividendShares * currentSharePrice).toFixed(2))
      }
    ];

    // Part‑B summary row (blue) and Grand Total A+B (green)
    const partBTotalPooledInvestment = partBTableRows.reduce(
      (sum, row) => sum + parseAmount(row['POOLED INVESTMENT']),
      0
    );
    const partBTotalShares = partBTableRows.reduce(
      (sum, row) => sum + parseAmount(row['TOTAL SHARES']),
      0
    );
    const partBTotalValuation = partBTableRows.reduce(
      (sum, row) => sum + parseAmount(row['VALUATION']),
      0
    );

    const partBSummaryRow = {
      'S. No.': partBTableRows.length + 1,
      'MEMBER NAME': 'TOTAL PART B SUMMARY',
      'POOLED INVESTMENT': Number(partBTotalPooledInvestment.toFixed(2)),
      'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
      'TOTAL SHARES': Number(partBTotalShares.toFixed(2)),
      'VALUATION': Number(partBTotalValuation.toFixed(2))
    };

    partBTableRows.push(partBSummaryRow);

    const grandTotalPooledInvestment = Number(
      (totalPooledInvestment + partBTotalPooledInvestment).toFixed(2)
    );
    const grandTotalShares = Number((totalShares + partBTotalShares).toFixed(2));
    const grandTotalValuation = Number((totalValuation + partBTotalValuation).toFixed(2));

    const grandTotalRow = {
      'S. No.': partBTableRows.length + 1,
      'MEMBER NAME': 'GRAND TOTAL PART A+B',
      'POOLED INVESTMENT': grandTotalPooledInvestment,
      'PRESENT SHARE PRICE': Number(currentSharePrice.toFixed(2)),
      'TOTAL SHARES': grandTotalShares,
      'VALUATION': grandTotalValuation
    };

    partBTableRows.push(grandTotalRow);

    const partBTableAoa = XLSX.utils.sheet_to_json(
      XLSX.utils.json_to_sheet(partBTableRows),
      { header: 1, defval: '' }
    );

    const partBData = [
      ['PART-B COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL'],
      [''],
      ...partBTableAoa
    ];

    // Write Part‑B table starting from partBStartRow
    XLSX.utils.sheet_add_aoa(worksheet, partBData, { origin: `A${partBStartRow}` });

    // Use ExcelJS for proper styling
    console.log('🎨 Using ExcelJS for Directors Report...');
    
    const worksheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    await createStyledExcelFile(
      worksheetData, 
      'Directors Valuation Report', 
      `admin-DIRECTORS REPORT FOR VALUTION OF THE COMPANY_${reportYear}_${reportMonth}.xlsx`,
      'F'
    );
    
    console.log('✅ Directors Report created with yellow backgrounds!');
  };

  const generateFetchAllDetailsReport = async () => {
    try {
      console.log('📘 [Complete System Report] Starting generation...');
      // Determine effective start/end for this report:
      // - If using date range mode, use customStartDate/customEndDate
      // - Otherwise, fall back to traditional year/month selection
      let startDate;
      let endDate;
      if (useDateRange && customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
      } else {
        // Fallback: use selected reportYear/reportMonth as both start & end month
        const fallbackMonthIdx = months.indexOf(reportMonth);
        if (fallbackMonthIdx === -1) {
          alert('Invalid month selected for the complete system report.');
          return;
        }
        startDate = new Date(reportYear, fallbackMonthIdx, 1);
        endDate = new Date(reportYear, fallbackMonthIdx + 1, 0);
      }

      const startYear = startDate.getFullYear();
      const startMonthIdx = startDate.getMonth();
      const endYear = endDate.getFullYear();
      const endMonthIdx = endDate.getMonth();
    
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('*');
    
      if (membersError) {
        console.error('❌ [Complete System Report] Error fetching members:', membersError);
        alert('Unable to fetch members data.');
        return;
      }
    
      if (!members || members.length === 0) {
        alert('No members found.');
        return;
      }
    
      // Get share price for the end month/year (like other reports)
      const sharePriceMonthCandidates = getMonthKeyCandidates(months[endMonthIdx]);
      const { data: sharePriceRows, error: priceError } = await supabase
        .from('share_prices')
        .select('price, month')
        .eq('year', endYear)
        .in('month', sharePriceMonthCandidates)
        .order('updated_at', { ascending: false })
        .limit(1);
    
      if (priceError) {
        console.error('❌ [Complete System Report] Error fetching share price:', priceError);
        alert('Unable to fetch share price for the selected period.');
        return;
      }
    
      const currentSharePrice = sharePriceRows?.[0]?.price;
      if (!currentSharePrice) {
        alert(`Share price not set for ${months[endMonthIdx]} ${endYear}. Please update the Share Price page first.`);
        return;
      }

      // Load all share prices for quarter-wise lookup per investment row
      const { data: allSharePrices, error: allSharePricesError } = await supabase
        .from('share_prices')
        .select('year, month, price');

      if (allSharePricesError) {
        console.error('❌ [Complete System Report] Error fetching all share prices:', allSharePricesError);
        alert('Unable to fetch share prices for the complete system report.');
        return;
      }

      const sharePriceMap = buildSharePriceMap(allSharePrices || []);

      const getSharePriceForPeriod = (yearNum, monthIdxForInv) => {
        const yearMap = sharePriceMap[yearNum];
        if (!yearMap) return currentSharePrice;
        const monthName = months[monthIdxForInv] || '';
        const candidates = getMonthKeyCandidates(monthName);
        for (const key of candidates) {
          if (yearMap[key] != null) {
            return yearMap[key];
          }
        }
        return currentSharePrice;
      };
    
      const parseAmount = (value) => {
        const num = parseFloat(value);
        return Number.isFinite(num) ? num : 0;
      };
    
      // Check for dividend event in the end month
      const monthStart = new Date(endYear, endMonthIdx, 1);
      const monthEnd = new Date(endYear, endMonthIdx + 1, 0, 23, 59, 59, 999);
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
        console.warn('⚠️ [Complete System Report] Error fetching dividend events:', eventsError);
      }
    
      const dividendEvent = dividendEventsData?.[0] || null;
      const dividendOccurred = Boolean(dividendEvent);
      const totalShares = members.reduce((sum, member) => sum + parseAmount(member?.total_shares || 0), 0);
      const totalMemberDistribution = dividendOccurred
        ? Math.max(0, parseAmount(dividendEvent?.distribution_pool || 0) - parseAmount(dividendEvent?.company_investment_amount || 0))
        : 0;
      const dividendPerShare = dividendOccurred && totalShares > 0 ? totalMemberDistribution / totalShares : 0;
    
      // Create comprehensive system report with all 19 columns
      const allRows = [];
      const reportYearStr = String(endYear);
      const monthKeyCandidates = getMonthKeyCandidates(months[endMonthIdx]);
      const currMonIdx = endMonthIdx;
    
      // Simplified approach: process investments in a single pass with member tracking
      const memberCumulativeAmount = {};
      const memberCumulativeSharesDisplay = {};
      
      // Process each member's investments chronologically
      for (let mIdx = 0; mIdx < members.length; mIdx++) {
        const member = members[mIdx];
        if (!member) continue;
        
        try {
          const activities = member?.activities || {};
          const payment = member?.payment || {};
          const memberDisplayName = `${payment?.membershipId || ''} ${member?.name || ''}`.trim();
          
          if (!activities || typeof activities !== 'object') continue;
          
          // Collect investments for this member
          const memberInvestments = [];
          
          const yearKeys = Object.keys(activities);
          for (let yIdx = 0; yIdx < yearKeys.length; yIdx++) {
            const yearKey = yearKeys[yIdx];
            try {
              const yearNum = parseInt(String(yearKey), 10);
              // Respect full date range: skip years outside [startYear, endYear]
              if (isNaN(yearNum) || yearNum < startYear || yearNum > endYear) continue;
              
              const yearData = activities[yearKey];
              if (!yearData || typeof yearData !== 'object') continue;
              
              const monthKeys = Object.keys(yearData);
              for (let monIdx = 0; monIdx < monthKeys.length; monIdx++) {
                const monKey = monthKeys[monIdx];
                try {
                  // Find month index
                  let monthIdxForInv = -1;
                  for (let i = 0; i < months.length && monthIdxForInv === -1; i++) {
                    const candidates = getMonthKeyCandidates(months[i]);
                    if (candidates.includes(monKey)) {
                      monthIdxForInv = i;
                    }
                  }
                  
                  if (monthIdxForInv !== -1) {
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
                          investmentDate = new Date(yearNum, monthIdxForInv, 1);
                        }
                      } else {
                        investmentDate = new Date(yearNum, monthIdxForInv, 1);
                      }
                    } catch (e) {
                      investmentDate = new Date(yearNum, monthIdxForInv, 1);
                    }

                    // Filter by full date range [startDate, endDate]
                    if (investmentDate < startDate || investmentDate > endDate) {
                      continue;
                    }

                    memberInvestments.push({
                      date: investmentDate,
                      yearNum,
                      monthIdx: monthIdxForInv,
                      inv,
                      amount: parseAmount(inv?.amount || 0),
                      fineAmount: parseAmount(inv?.fine || 0),
                      newAllottedShares: parseAmount(inv?.shares || 0),
                      // Share price should be the price set for that specific month/quarter
                      sharePrice: getSharePriceForPeriod(yearNum, monthIdxForInv)
                    });
                  }
                } catch (err) {
                  console.warn('⚠️ [Complete System Report] Error inside month loop for member:', memberDisplayName, err);
                }
              }
            } catch (err) {
              console.warn('⚠️ [Complete System Report] Error inside year loop for member:', memberDisplayName, err);
            }
          }
          
          
          // Sort member investments by date
          memberInvestments.sort((a, b) => {
            if (a.yearNum !== b.yearNum) return a.yearNum - b.yearNum;
            if (a.monthIdx !== b.monthIdx) return a.monthIdx - b.monthIdx;
            return a.date.getTime() - b.date.getTime();
          });
          
          // Process investments for this member in chronological order
          for (let invIdx = 0; invIdx < memberInvestments.length; invIdx++) {
            const invData = memberInvestments[invIdx];
            const { date, inv, amount, fineAmount, newAllottedShares, sharePrice } = invData;

            // For reporting, AMOUNT should exclude fines (show base investment only)
            const baseAmount = Math.max(0, amount - fineAmount);

            // Update per‑member cumulative amount (exclude fines)
            const prevCumAmt = memberCumulativeAmount[memberDisplayName] || 0;
            const newCumAmt = prevCumAmt + baseAmount;
            memberCumulativeAmount[memberDisplayName] = newCumAmt;

            // Derive shares from amount and share price (quarter‑wise)
            const newSharesDisplay = sharePrice > 0 ? baseAmount / sharePrice : 0;
            const prevSharesDisplay = memberCumulativeSharesDisplay[memberDisplayName] || 0;
            const cumulativeSharesDisplay = prevSharesDisplay + newSharesDisplay;
            memberCumulativeSharesDisplay[memberDisplayName] = cumulativeSharesDisplay;
            
            // Calculate dividend & formatted date
            const dividendAmount = dividendOccurred ? Number((cumulativeSharesDisplay * dividendPerShare).toFixed(2)) : undefined;
            const dateStr = formatDateDDMMYYYY(date);
    
            allRows.push({
              _sortDate: date.getTime(),
              'Date': dateStr,
              'MEMBER NAME': memberDisplayName || '',
              // We'll assign SYSTEM RECEIPT later after global date-wise sort
              'SYSTEM RECEIPT': inv?.systemReceipt || inv?.customReceipt || inv?.manualReceipt || '',
              // For this report, keep CUSTOM RECEIPT column intentionally empty
              'CUSTOM RECEIPT': '',
              'AMOUNT': Number(baseAmount.toFixed(2)),
              'FINE AMOUNT': Number(fineAmount.toFixed(2)),
              'CUMMULATIVE AMOUNT': Number(newCumAmt.toFixed(2)),
              'SHARE PRICE': Number(sharePrice.toFixed(2)),
              'NEW ALLOTED SHARES': Number(newSharesDisplay.toFixed(2)),
              'PREVIOUS SHARES': Number(prevSharesDisplay.toFixed(2)),
              'CUMMULATIVE SHARES': Number(cumulativeSharesDisplay.toFixed(2)),
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
          console.warn('⚠️ [Complete System Report] Error processing member:', member?.name || member?.id, err);
        }
      }
    
      // Sort all rows month-wise (by date) rather than by member name
      allRows.sort((a, b) => {
        const da = a._sortDate || 0;
        const db = b._sortDate || 0;
        if (da !== db) return da - db;
        const na = String(a['MEMBER NAME'] || '');
        const nb = String(b['MEMBER NAME'] || '');
        return na.localeCompare(nb);
      });

      // After sorting by date, assign month-wise system receipts in MON-001 order
      const monthSeqMap = {};
      allRows.forEach((row) => {
        const ts = row._sortDate;
        const d = ts ? new Date(ts) : null;
        if (!d || Number.isNaN(d.getTime())) return;
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`; // year-month index
        const seq = (monthSeqMap[monthKey] || 0) + 1;
        monthSeqMap[monthKey] = seq;
        const monthAbbrev = (months[d.getMonth()] || '').slice(0, 3).toUpperCase();
        row['SYSTEM RECEIPT'] = `${monthAbbrev}-${String(seq).padStart(3, '0')}`;
      });

      // Assign serial numbers in sorted order and remove helper field
      allRows.forEach((row, idx) => {
        row['S. No.'] = idx + 1;
        delete row._sortDate;
      });

      // If no rows, nothing to export
      if (allRows.length === 0) {
        alert('No investment data found for the selected period.');
        return;
      }

      // Build flat CSV rows (no XLSX/ExcelJS) for stability
      const csvRows = [];

      // ---------- PART A ----------
      const partAHeaderRow = [
        'S. No.',
        'Date',
        'MEMBER NAME',
        'SYSTEM RECEIPT',
        'CUSTOM RECEIPT',
        'AMOUNT',
        'FINE AMOUNT',
        'CUMMULATIVE AMOUNT',
        'SHARE PRICE',
        'NEW ALLOTED SHARES',
        'PREVIOUS SHARES',
        'CUMMULATIVE SHARES',
        'DIVIDEND',
        'AUDIT V.NO',
        'AUDIT SIGN',
        'PASSBOOK Yes (✓)/No',
        'ENTRY SIGN',
        'DATE OF PBE',
        'MEMBER SIGN'
      ];
      csvRows.push(partAHeaderRow);

      // Month‑wise differentiation: insert a label row when month/year changes
      let lastMonthLabel = '';
      allRows.forEach(row => {
        const dateStr = row['Date'] || '';
        let monthLabel = '';
        if (dateStr) {
          const [dd, mm, yyyy] = dateStr.split('-');
          if (dd && mm && yyyy) {
            monthLabel = `${mm}-${yyyy}`; // e.g. 03-2025
          }
        }

        if (monthLabel && monthLabel !== lastMonthLabel) {
          // Blank spacer then month header row
          if (lastMonthLabel) {
            csvRows.push([]);
          }
          csvRows.push([`MONTH: ${monthLabel}`]);
          lastMonthLabel = monthLabel;
        }

        csvRows.push([
          row['S. No.'] ?? '',
          dateStr,
          row['MEMBER NAME'] ?? '',
          row['SYSTEM RECEIPT'] ?? '',
          row['CUSTOM RECEIPT'] ?? '',
          row['AMOUNT'] ?? '',
          row['FINE AMOUNT'] ?? '',
          row['CUMMULATIVE AMOUNT'] ?? '',
          row['SHARE PRICE'] ?? '',
          row['NEW ALLOTED SHARES'] ?? '',
          row['PREVIOUS SHARES'] ?? '',
          row['CUMMULATIVE SHARES'] ?? '',
          row['DIVIDEND'] ?? '',
          row['AUDIT V.NO'] ?? '',
          row['AUDIT SIGN'] ?? '',
          row['PASSBOOK Yes'] ?? '',
          row['ENTRY SIGN'] ?? '',
          row['DATE OF PBE'] ?? '',
          row['MEMBER SIGN'] ?? ''
        ]);
      });

      // Blank line before Part‑B
      csvRows.push([]);
      csvRows.push(['PART-B  COMPANY OWN CAPITAL/ INDIVIDUAL CAPITAL']);
      csvRows.push([]);

      // -------- (i). MEMBERSHIP AMOUNT --------
      csvRows.push(['(i). MEMBERSHIP AMOUNT']);
      csvRows.push(['DATE', 'MEMBERSHIP ID NAME', 'CUSTOM RECEIPT', 'AMOUNT']);

      // Fetch membership/registration data for the END month in range
      const membershipRows = [];
      members.forEach(member => {
        try {
          const payment = member?.payment || {};
          const dateOfJoining = payment?.dateOfJoining || payment?.date_of_joining || member?.created_at;
          
          if (!dateOfJoining) return;
          
          const joinDate = new Date(dateOfJoining);
          if (Number.isNaN(joinDate.getTime())) return;
          
          const joinYear = joinDate.getFullYear();
          const joinMonth = joinDate.toLocaleString('default', { month: 'short' });
          const joinMonthIdx = months.indexOf(joinMonth);
          
          // Include if registration is in the end month/year
          if (joinYear === endYear && joinMonthIdx === endMonthIdx) {
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
          console.warn('⚠️ [Complete System Report] Error processing member for membership:', err);
        }
      });
    
      // Add membership data rows
      membershipRows.forEach(row => {
        csvRows.push([
          row.date,
          row.name,
          row.receipt,
          Number(row.amount.toFixed(2))
        ]);
      });
    
      // Add empty rows if less than 3 entries (to match template look)
      while (membershipRows.length < 3) {
        csvRows.push(['', '', '', '']);
        membershipRows.push({}); // keep count in sync
      }

      // -------- (ii). FINE AMOUNT --------
      csvRows.push([]);
      csvRows.push(['(ii). FINE AMOUNT']);
      csvRows.push(['DATE', 'MEMBERSHIP ID NAME', 'CUSTOM RECEIPT', 'AMOUNT']);

      const fineRows = [];
      members.forEach(member => {
        try {
          const activities = member?.activities || {};
          const payment = member?.payment || {};
          const yearData = activities[reportYearStr] || activities[endYear] || {};
          
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
                  if (!Number.isNaN(dateObj.getTime())) {
                    invDate = dateObj.toLocaleDateString();
                  }
                }
              } catch {
                // ignore date parse errors
              }
              fineRows.push({
                date: invDate,
                name: memberDisplayName,
                receipt: customReceipt,
                amount: fineAmount
              });
            }
          }
        } catch (err) {
          console.warn('⚠️ [Complete System Report] Error processing member for fines:', err);
        }
      });
    
      fineRows.forEach(row => {
        csvRows.push([
          row.date,
          row.name,
          row.receipt,
          Number(row.amount.toFixed(2))
        ]);
      });
    
      while (fineRows.length < 3) {
        csvRows.push(['', '', '', '']);
        fineRows.push({});
      }
    
      // -------- (iii). DIVIDEND DONATION --------
      csvRows.push([]);
      csvRows.push(['(iii). DIVIDEND DONATION']);
      csvRows.push(['DATE', 'MEMBERSHIP ID NAME', 'CUSTOM RECEIPT', 'AMOUNT']);

      const dividendRows = [];
      if (dividendEvent) {
        try {
          let eventDate = '';
          if (dividendEvent?.event_date) {
            const dateObj = new Date(dividendEvent.event_date);
            if (!Number.isNaN(dateObj.getTime())) {
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
          console.warn('⚠️ [Complete System Report] Error processing dividend event:', err);
        }
      }
    
      dividendRows.forEach(row => {
        csvRows.push([
          row.date,
          row.name,
          row.receipt,
          Number(row.amount.toFixed(2))
        ]);
      });
    
      while (dividendRows.length < 3) {
        csvRows.push(['', '', '', '']);
        dividendRows.push({});
      }
    
      // Use ExcelJS styled export for Complete System Report (AOA -> Excel)
      await createStyledExcelFile(
        csvRows,
        'Complete System Report',
        `1. STARTING POINTWHILE FUNDING TIME RECORDED DATA to fetch all the details in background_${reportYear}_${reportMonth}.xlsx`,
        'T' // merge heading across all Part‑A columns
      );
      
    } catch (error) {
      console.error('❌ [Complete System Report] Error generating report:', error);
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

      // Use ExcelJS for proper styling
      console.log('🎨 Using ExcelJS for Share Distribution Report...');
      
      const worksheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      await createStyledExcelFile(
        worksheetData, 
        'Share Distribution Report', 
        `admin-REPORT OF CONSOLIDATED SHARES IN THE COMPANY_${reportYear}_${reportMonth}.xlsx`,
        'E'
      );
      
      console.log('✅ Share Distribution Report created with yellow backgrounds!');
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

      // Use ExcelJS for proper styling
      console.log('🎨 Using ExcelJS for Company Funds Report...');
      
      const worksheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      await createStyledExcelFile(
        worksheetData, 
        'Company Funds Report', 
        `admin-REPORT OF TOTAL COMPANY POOLED AMOUNT_${reportYear}_${reportMonth}.xlsx`,
        'F'
      );
      
      console.log('✅ Company Funds Report created with yellow backgrounds!');
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

            {/* Date Selection Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Selection</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="dateMode"
                    checked={!useDateRange}
                    onChange={() => setUseDateRange(false)}
                    className="mr-2"
                  />
                  <span className="text-sm">Use Year/Month</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="dateMode"
                    checked={useDateRange}
                    onChange={() => setUseDateRange(true)}
                    className="mr-2"
                  />
                  <span className="text-sm">Use Date Range (Quarterly Periods)</span>
                </label>
              </div>
            </div>

          </div>

          {/* Year/Month Selection (Traditional Mode) */}
          {!useDateRange && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>
          )}

          {/* Date Range Selection (New Mode) */}
          {useDateRange && (
            <div className="mt-6">
              {/* Show automatic start date */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs">ℹ</span>
                  </div>
                  <span className="text-sm font-medium text-blue-800">Automatic Start Date</span>
                </div>
                <p className="text-sm text-blue-700">
                  Start Date: <strong>{customStartDate ? new Date(customStartDate).toLocaleDateString() : 'Loading...'}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Automatically set to the first day of the earliest quarterly price period
                </p>
              </div>

              {/* End date selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 max-w-xs"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Choose any end date for your report range
                </p>
              </div>

            </div>
          )}

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
