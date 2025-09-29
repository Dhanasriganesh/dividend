import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/config';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  // Members table moved to a separate page
  const navigate = useNavigate();
  const { logout } = useAuth();

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-amber-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-bold text-gray-900">K-G Admin</h1>
              <p className="text-sm text-gray-500">Member Management</p>
            </div>

            

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm border border-red-200"
            >
              <LogoutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tiles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {companyMember && (
            <button
              onClick={() => navigate(`/member/${companyMember.id}`)}
              className="group relative overflow-hidden rounded-xl border border-amber-200 bg-white p-5 text-left shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-600 font-medium">Quick Access</p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900">Company Account</h3>
                  <p className="mt-1 text-sm text-gray-500">Member-ID: 2025-002</p>
                </div>
                <div className="h-10 w-10 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
                  ₹
                </div>
              </div>
            </button>
          )}
          <button
            onClick={() => navigate('/members')}
            className="group relative overflow-hidden rounded-xl border border-amber-200 bg-white p-5 text-left shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-medium">Directory</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900">Members</h3>
                <p className="mt-1 text-sm text-gray-500">Browse and search members</p>
              </div>
              <div className="h-10 w-10 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
                <SearchIcon />
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/dividend')}
            className="group relative overflow-hidden rounded-xl border border-amber-200 bg-white p-5 text-left shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-medium">Donations</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900">Dividend Donation</h3>
                <p className="mt-1 text-sm text-gray-500">Record and manage donations</p>
              </div>
              <div className="h-10 w-10 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
                💝
              </div>
            </div>
          </button>

          <button
            onClick={() => { localStorage.removeItem('currentMemberPhone'); navigate('/personal'); }}
            className="group relative overflow-hidden rounded-xl border border-amber-200 bg-white p-5 text-left shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-medium">Quick Action</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900">Add Member</h3>
                <p className="mt-1 text-sm text-gray-500">Create a new member</p>
              </div>
              <div className="h-10 w-10 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
                <AddIcon />
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/company-amount')}
            className="group relative overflow-hidden rounded-xl border border-amber-200 bg-white p-5 text-left shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-medium">Finance</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900">Company Amount</h3>
                <p className="mt-1 text-sm text-gray-500">Manage company capital</p>
              </div>
              <div className="h-10 w-10 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
                ₹
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/share-price')}
            className="group relative overflow-hidden rounded-xl border border-amber-200 bg-white p-5 text-left shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-medium">Insights</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900">Monthly Share Price</h3>
                <p className="mt-1 text-sm text-gray-500">Update and view prices</p>
              </div>
              <div className="h-10 w-10 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
                ₹
              </div>
            </div>
          </button>

          <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-white p-5 text-left shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-amber-600 font-medium">Reports</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900">Download Report</h3>
              </div>
              <div className="h-10 w-10 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
                ⤓
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                className="px-3 py-2 border border-amber-300 rounded-lg text-sm"
                value={reportYear}
                onChange={(e) => setReportYear(parseInt(e.target.value))}
              >
                {yearsOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                className="px-3 py-2 border border-amber-300 rounded-lg text-sm"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
              >
                {months.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <button
                onClick={handleDownloadReport}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm shadow"
              >
                Download
              </button>
            </div>
          </div>
        </div>

        {/* Members Section moved to dedicated page at /members */}
      </main>
    </div>
  );
};
export default Admin;
