import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/config';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES, TILE_PERMISSIONS, EMPLOYEE_CREDENTIALS } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
// Icons
const AddIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
  </svg>
);
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const Admin = () => {
  const [members, setMembers] = useState([]);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [adding, setAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().toLocaleString('default', { month: 'short' }));
  const [showEmployeeAccess, setShowEmployeeAccess] = useState(false);
  const [showReportAccess, setShowReportAccess] = useState(false);
  // Members table moved to a separate page
  const navigate = useNavigate();
  const { 
    currentUser,
    logout, 
    userRole, 
    hasTileAccess, 
    updateEmployeePermission, 
    employeePermissions,
    updateEmployeeReportAccess,
    loadEmployeeReportAccess,
    employeeReportAccess
  } = useAuth();

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .not('payment', 'is', null);

      if (error) {
        console.error('Error fetching members:', error);
      } else {
        setMembers(data || []);
      }
    };

    fetchMembers();

    // Set up real-time subscription
    const subscription = supabase
      .channel('members_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'members' },
        () => {
          fetchMembers(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) return;
    setAdding(true);
    try {
      const { error } = await supabase
        .from('members')
        .insert({
          phone_no: mobile,
          name,
          created_at: new Date().toISOString(),
          payments: {}
        });

      if (error) {
        alert('Error adding member: ' + error.message);
      } else {
        setName('');
        setMobile('');
      }
    } catch (err) {
      alert('Error adding member');
    }
    setAdding(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      alert('Logout failed');
    }
  };

  // Employee access management functions
  const handleToggleEmployeePermission = (employeeEmail, tileKey) => {
    const currentAccess = employeePermissions[employeeEmail]?.[tileKey] || false;
    updateEmployeePermission(employeeEmail, tileKey, !currentAccess);
  };

  const getEmployeeDisplayName = (email) => {
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phoneNo.includes(searchTerm)
  );
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const aTime = a.createdAt?.seconds ? a.createdAt.seconds : (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
    const bTime = b.createdAt?.seconds ? b.createdAt.seconds : (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
    return bTime - aTime; // Newest first
  });

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
      // 'Sep'
      candidates.push(monthLabel);
      // 'Sept' special case
      if (monthLabel === 'Sep') candidates.push('Sept');
      // full name
      candidates.push(monthFullNames[idx]);
      // numeric forms
      candidates.push(String(idx + 1)); // '9'
      candidates.push(String(idx + 1).padStart(2, '0')); // '09'
    } else {
      // fallback: try original and capitalized
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

  const totalMembers = members.length;
  const currentYear = new Date().getFullYear();
  const totalPaidThisMonth = members.reduce((total, member) => {
    const val = getPaymentFor(member, reportYear, reportMonth);
    const amount = typeof val === 'object' ? parseFloat(val?.amount || 0) : parseFloat(val || 0);
    return total + (amount > 0 ? 1 : 0);
  }, 0);

  const yearsOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Company Account quick access (Member name: Company Account, Member-ID: 2025-002)
  const companyMember = React.useMemo(() => {
    return members.find(m => (m.name || '').trim().toLowerCase() === 'company account' && (m.payment?.membershipId || '') === '2025-002');
  }, [members]);

  const handleDownloadReport = async () => {
    // Resolve month date range
    const monthIdx = months.indexOf(reportMonth);
    const rangeStart = new Date(reportYear, monthIdx, 1);
    const rangeEnd = new Date(reportYear, monthIdx + 1, 0); // last day

    // Build rows from activities (investment entries only) for the selected month/year
    const entries = [];
    const formatDate = (d) => {
      const day = String(d.getDate()).padStart(2, '0');
      const mon = d.toLocaleString('default', { month: 'short' });
      const yr = d.getFullYear();
      return `${day} ${mon} ${yr}`;
    };
    const getCreatedAtDate = (inv) => {
      const ca = inv?.createdAt;
      if (!ca) return rangeStart;
      if (ca?.seconds) return new Date(ca.seconds * 1000);
      const parsed = new Date(ca);
      return isNaN(parsed.getTime()) ? rangeStart : parsed;
    };
    const receiptNum = (r) => {
      const m = (r || '').toString().match(/\d+/);
      return m ? parseInt(m[0], 10) : 0;
    };

    // Fetch all members to avoid excluding those without `payment` field
    const { data: allMembers, error: membersError } = await supabase
      .from('members')
      .select('*');

    if (membersError) {
      console.error('Error fetching members for report:', membersError);
      return;
    }

    allMembers.forEach((m) => {
      // Resolve year node (string vs number keys)
      const yearNode = m.activities?.[reportYear] || m.activities?.[String(reportYear)] || {};
      // Resolve possible month key variants
      const monthCandidates = getMonthKeyCandidates(reportMonth);
      let monthData = null;
      for (const key of monthCandidates) {
        if (yearNode && Object.prototype.hasOwnProperty.call(yearNode, key)) {
          monthData = yearNode[key];
          break;
        }
      }
      if (!monthData) return;

      const inv = monthData?.investment || (monthData?.type === 'investment' ? monthData : null);
      if (!inv) return;

      const createdAtDate = getCreatedAtDate(inv);

      // ID can be under payment.membershipId or other id fields
      const memberId = m.payment?.membershipId || m.membershipId || m.memberId || '';
      const nameCombined = `${memberId ? memberId + ' ' : ''}${m.name || ''}`.trim();
      const amount = parseFloat(inv.amount || 0) || 0;
      const fine = parseFloat(inv.fine || 0) || 0;
      const receipt = inv.customReceipt || '';

      entries.push({
        sNo: 0, // placeholder, will set after sorting
        date: formatDate(createdAtDate),
        memberName: nameCombined,
        receipt,
        amount,
        fine,
        auditVno: '',
        auditSign: '',
        passbookSign: '',
        dateOfPbe: '',
        memberSign: ''
      });
    });

    // Sort by receipt numeric sequence
    entries.sort((a, b) => receiptNum(a.receipt) - receiptNum(b.receipt));
    // Assign serial numbers
    entries.forEach((row, idx) => { row.sNo = idx + 1; });

    // Prepare sheet with required headers
    const rows = entries.map(r => ({
      'S. No.': r.sNo,
      'Date': r.date,
      'MEMBER NAME': r.memberName,
      'RECEIPT': r.receipt,
      'INVESTED AMOUNT': r.amount,
      'FINE AMOUNT': r.fine,
      'AUDIT V.NO': r.auditVno,
      'AUDIT SIGN': r.auditSign,
      'PASSBOOK ENTRY SIGN': r.passbookSign,
      'DATE OF PBE': r.dateOfPbe,
      'MEMBER SIGN': r.memberSign,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
    const workbook = XLSX.utils.book_new();

    // Optional: add a title row similar to the example image
    const title = `${formatDate(rangeStart)} to ${formatDate(rangeEnd)}`;
    XLSX.utils.sheet_add_aoa(worksheet, [[title]], { origin: 'E1' });

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `investment_report_${reportYear}_${reportMonth}.xlsx`);
  };

  const infoCards = React.useMemo(() => [
    {
      label: 'Total Members',
      value: totalMembers.toLocaleString('en-IN'),
      subtext: 'Active registrations in the system'
    },
    {
      label: 'Paid This Month',
      value: `${totalPaidThisMonth.toLocaleString('en-IN')} / ${totalMembers.toLocaleString('en-IN')}`,
      subtext: `${reportMonth} ${reportYear} investments`
    },
    {
      label: 'Access Level',
      value: userRole === USER_ROLES.ADMIN ? 'Administrator' : 'Employee',
      subtext: userRole === USER_ROLES.ADMIN ? 'Full control enabled' : 'Limited privileges'
    }
  ], [totalMembers, totalPaidThisMonth, reportMonth, reportYear, userRole]);

  const canAccessMembers = hasTileAccess(TILE_PERMISSIONS.MEMBERS);
  const canAccessSharePrice = hasTileAccess(TILE_PERMISSIONS.SHARE_PRICE);
  const canAccessCompanyAmount = hasTileAccess(TILE_PERMISSIONS.COMPANY_AMOUNT);
  const canAccessCompanyAccount = hasTileAccess(TILE_PERMISSIONS.COMPANY_ACCOUNT);
  const canAccessDividend = hasTileAccess(TILE_PERMISSIONS.DIVIDEND_DONATION);
  const canAccessAddMember = hasTileAccess(TILE_PERMISSIONS.ADD_MEMBER);
  const canAccessReports = hasTileAccess(TILE_PERMISSIONS.DOWNLOAD_REPORT);
  const canAccessMembershipRefund = hasTileAccess(TILE_PERMISSIONS.MEMBERSHIP_REFUND);
  const canAccessReminders = hasTileAccess(TILE_PERMISSIONS.REMINDERS);

  const dashboardSections = React.useMemo(() => [
    {
      title: 'Admin Controls',
      description: 'Configure employee access and report visibility.',
      tiles: [
        {
          key: 'employeeAccess',
          title: 'Access To Employees',
          description: 'Manage employee permissions.',
          icon: '👥',
          badge: 'Admin',
          show: userRole === USER_ROLES.ADMIN,
          onClick: () => setShowEmployeeAccess(true)
        },
        {
          key: 'reportAccess',
          title: 'Report Access',
          description: 'Select reports available for employees.',
          icon: '📊',
          badge: 'Admin',
          show: userRole === USER_ROLES.ADMIN,
          onClick: () => setShowReportAccess(true)
        }
      ]
    },
    {
      title: 'Member Operations',
      description: 'Day-to-day member management tasks.',
      tiles: [
        {
          key: 'members',
          title: 'Members',
          description: 'Browse and search members.',
          icon: <SearchIcon />,
          show: canAccessMembers,
          onClick: () => navigate('/members')
        },
        {
          key: 'addMember',
          title: 'Add Member',
          description: 'Create a new member entry.',
          icon: <AddIcon />,
          show: canAccessAddMember,
          onClick: () => { localStorage.removeItem('currentMemberPhone'); navigate('/personal'); }
        },
        {
          key: 'membershipRefund',
          title: 'Membership Refunds',
          description: 'Settle ₹10,000 refunds (eligible after 5 years).',
          icon: '💰',
          show: canAccessMembershipRefund,
          onClick: () => navigate('/membership-refund')
        },
        {
          key: 'dividend',
          title: 'Dividend',
          description: 'Record and manage dividend donations.',
          icon: '💝',
          show: canAccessDividend,
          onClick: () => navigate('/dividend')
        },
        {
          key: 'reminders',
          title: 'Reminders',
          description: 'Insurance expiry & interest reminders.',
          icon: '🔔',
          show: canAccessReminders,
          onClick: () => navigate('/reminders')
        }
      ]
    },
    {
      title: 'Finance & Analytics',
      description: 'Share price, company funds, and reporting.',
      tiles: [
        {
          key: 'sharePrice',
          title: 'Quarterly Share Price',
          description: 'Set prices month by month.',
          icon: '₹',
          show: canAccessSharePrice,
          onClick: () => navigate('/share-price')
        },
        {
          key: 'companyAmount',
          title: 'Company Owns Amount',
          description: 'Manage company capital.',
          icon: '🏦',
          show: canAccessCompanyAmount,
          onClick: () => navigate('/company-amount')
        },
        {
          key: 'reports',
          title: 'Reports',
          description: 'Generate and download reports.',
          icon: '📑',
          show: canAccessReports,
          onClick: () => navigate('/reports')
        },
        {
          key: 'companyAccount',
          title: 'Company Own Account',
          description: 'Member-ID: 2025-002.',
          icon: '🏛️',
          show: companyMember && canAccessCompanyAccount,
          onClick: () => companyMember && navigate(`/member/${companyMember.id}`)
        }
      ]
    }
  ], [
    userRole,
    canAccessMembers,
    canAccessSharePrice,
    canAccessCompanyAmount,
    canAccessCompanyAccount,
    canAccessDividend,
    canAccessAddMember,
    canAccessReports,
    canAccessMembershipRefund,
    canAccessReminders,
    companyMember
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-amber-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 py-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">K-G Admin</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {userRole === USER_ROLES.ADMIN ? 'Admin Panel' : 'Employee Dashboard'}
              </p>
              <p className="text-xs text-gray-400 truncate sm:hidden">
                {currentUser?.email}
              </p>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs sm:text-sm border border-red-200 flex-shrink-0 ml-2"
            >
              <LogoutIcon />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-10">
        {/* Overview Cards */}
        {infoCards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {infoCards.map(card => (
              <div key={card.label} className="rounded-xl border border-amber-200 bg-white p-4 sm:p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-amber-600 font-semibold">{card.label}</p>
                <p className="mt-2 text-xl sm:text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">{card.subtext}</p>
              </div>
            ))}
          </div>
        )}

        {/* Dashboard Sections */}
        <div className="space-y-6 sm:space-y-10">
          {dashboardSections
            .filter(section => section.tiles.some(tile => tile.show))
            .map(section => (
              <section key={section.title} className="bg-white rounded-xl sm:rounded-2xl border border-amber-100 shadow-sm p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">{section.title}</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">{section.description}</p>
                  </div>
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 sm:px-3 py-1 rounded-full self-start sm:self-auto">
                    {section.tiles.filter(tile => tile.show).length} options
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {section.tiles
                    .filter(tile => tile.show)
                    .map(tile => (
                      <button
                        key={tile.key}
                        onClick={tile.onClick}
                        className="group relative overflow-hidden rounded-xl border border-amber-200 bg-white p-4 sm:p-5 text-left shadow-sm hover:shadow-md transition-shadow"
                      >
                        {tile.badge && (
                          <span className="absolute top-2 right-2 sm:top-3 sm:right-3 text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            {tile.badge}
                          </span>
                        )}
                        <div className="flex items-start sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">{tile.title}</h3>
                            <p className="mt-1 text-xs sm:text-sm text-gray-500 line-clamp-2">{tile.description}</p>
                          </div>
                          <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-md bg-amber-50 flex items-center justify-center text-amber-600 text-lg sm:text-xl">
                            {typeof tile.icon === 'string' ? tile.icon : tile.icon}
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </section>
            ))}
        </div>

        {/* Report Access Management Modal */}
        {showReportAccess && userRole === USER_ROLES.ADMIN && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl p-4 sm:p-6 max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 flex-1 pr-2">Report Access Management</h2>
                <button
                  onClick={() => setShowReportAccess(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl flex-shrink-0"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                Select which reports should be accessible to employees. Only selected reports will be displayed in the Reports page for employees.
              </p>
              
              <div className="space-y-3 sm:space-y-4">
                {Object.entries({
                  'DIVIDEND_REPORT': 'Dividend Report',
                  'CONSOLIDATED_REPORT': 'Company Valuation Report',
                  'DIRECTORS_REPORT': 'Directors Valuation Report',
                  'FETCH_ALL_DETAILS': 'Complete System Report',
                  'CONSOLIDATED_SHARES': 'Share Distribution Report',
                  'TOTAL_COMPANY_POOLED': 'Company Funds Report',
                  'MONTHLY_FUNDING_AUDIT': 'Monthly Audit Report',
                  'NEW_SHARES_CURRENT': 'Current Month Shares Report',
                  'NEW_SHARES_MONTHWISE': 'Monthly Shares Report'
                }).map(([reportKey, reportName]) => {
                  const hasAccess = loadEmployeeReportAccess()[reportKey] || false;
                  
                  return (
                    <div key={reportKey} className="flex items-start sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-gray-900 block">{reportName}</span>
                        <p className="text-xs text-gray-500 mt-1">
                          {reportKey === 'DIVIDEND_REPORT' && 'Member shares and dividend eligibility'}
                          {reportKey === 'CONSOLIDATED_REPORT' && 'Company financial summary and valuation'}
                          {reportKey === 'DIRECTORS_REPORT' && 'Share price history and valuations'}
                          {reportKey === 'FETCH_ALL_DETAILS' && 'Complete system data export'}
                          {reportKey === 'CONSOLIDATED_SHARES' && 'Member share ownership distribution'}
                          {reportKey === 'TOTAL_COMPANY_POOLED' && 'Company funds with date range'}
                          {reportKey === 'MONTHLY_FUNDING_AUDIT' && 'Monthly audit verification forms'}
                          {reportKey === 'NEW_SHARES_CURRENT' && 'Current month new shares issued'}
                          {reportKey === 'NEW_SHARES_MONTHWISE' && 'Month-wise share issuance breakdown'}
                        </p>
                      </div>
                      <button
                        onClick={() => updateEmployeeReportAccess(reportKey, !hasAccess)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                          hasAccess ? 'bg-amber-600' : 'bg-gray-200'
                        }`}
                        aria-label={`Toggle ${reportName} access`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            hasAccess ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 sm:mt-6 flex justify-end">
                <button
                  onClick={() => setShowReportAccess(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Employee Access Management Modal */}
        {showEmployeeAccess && userRole === USER_ROLES.ADMIN && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl p-4 sm:p-6 max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 flex-1 pr-2">Employee Access Management</h2>
                <button
                  onClick={() => setShowEmployeeAccess(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl flex-shrink-0"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4 sm:space-y-6">
                {Object.keys(EMPLOYEE_CREDENTIALS).map(employeeEmail => (
                  <div key={employeeEmail} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                    <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 break-words">
                      <span className="block sm:inline">{getEmployeeDisplayName(employeeEmail)}</span>
                      <span className="block text-xs sm:text-sm text-gray-500 sm:inline sm:ml-1 sm:text-gray-900">
                        ({employeeEmail})
                      </span>
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                      {Object.entries(TILE_PERMISSIONS)
                        .filter(([key, value]) => value !== TILE_PERMISSIONS.EMPLOYEE_ACCESS)
                        .map(([key, tileKey]) => {
                          const hasAccess = employeePermissions[employeeEmail]?.[tileKey] || false;
                          const tileNames = {
                            [TILE_PERMISSIONS.COMPANY_ACCOUNT]: 'Company Account',
                            [TILE_PERMISSIONS.MEMBERS]: 'Members',
                            [TILE_PERMISSIONS.DIVIDEND_DONATION]: 'Dividend Donation',
                            [TILE_PERMISSIONS.ADD_MEMBER]: 'Add Member',
                            [TILE_PERMISSIONS.COMPANY_AMOUNT]: 'Company Owns Amount',
                            [TILE_PERMISSIONS.SHARE_PRICE]: 'Share Price',
                            [TILE_PERMISSIONS.DOWNLOAD_REPORT]: 'Download Report',
                            [TILE_PERMISSIONS.MEMBERSHIP_REFUND]: 'Membership Refunds',
                            [TILE_PERMISSIONS.REMINDERS]: 'Reminders'
                          };
                          
                          return (
                            <div key={tileKey} className="flex items-center justify-between p-2 sm:p-3 border border-gray-100 rounded-lg gap-2">
                              <span className="text-xs sm:text-sm font-medium text-gray-700 flex-1 min-w-0">
                                {tileNames[tileKey]}
                              </span>
                              <button
                                onClick={() => handleToggleEmployeePermission(employeeEmail, tileKey)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                                  hasAccess ? 'bg-amber-600' : 'bg-gray-200'
                                }`}
                                aria-label={`Toggle ${tileNames[tileKey]} access for ${getEmployeeDisplayName(employeeEmail)}`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    hasAccess ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 sm:mt-6 flex justify-end">
                <button
                  onClick={() => setShowEmployeeAccess(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Members Section moved to dedicated page at /members */}
      </main>
    </div>
  );
};
export default Admin;
