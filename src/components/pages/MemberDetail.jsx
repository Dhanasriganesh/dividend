import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/config';
import * as XLSX from 'xlsx';
const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
const currentYear = new Date().getFullYear();
const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DollarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

const MemberDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' | 'online'
  const [fineAmount, setFineAmount] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportScope, setReportScope] = useState('year'); // 'year' | 'all'
  const [monthlyInvestments, setMonthlyInvestments] = useState({});

  useEffect(() => {
    if (!id) return;
    let subscription;
    const fetchMember = async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        const memberData = data;
        setMember(memberData);
        
        // Extract investment and withdrawal data from activities (supports nested or legacy)
        const activities = {};
        if (memberData.activities) {
          Object.keys(memberData.activities).forEach(year => {
            const yearActivities = memberData.activities[year];
            Object.keys(yearActivities).forEach(month => {
              const activity = yearActivities[month];
              const inv = activity?.investment || (activity?.type === 'investment' ? activity : null);
              const wd = activity?.withdrawal || (activity?.type === 'withdrawal' ? activity : null);
              const key = `${year}-${month}`;
              if (inv && inv.amount) {
                activities[key] = {
                  type: 'investment',
                  amount: inv.amount,
                  shares: inv.shares || 0,
                  sharePrice: inv.sharePrice || 0,
                  status: inv.status || 'confirmed'
                };
              }
              if (wd && wd.amount) {
                activities[key] = {
                  type: 'withdrawal',
                  amount: wd.amount,
                  shares: wd.shares || 0,
                  sharePrice: wd.sharePrice || 0,
                  status: wd.status || 'confirmed'
                };
              }
            });
          });
        }
        setMonthlyInvestments(activities);
      } else {
        setMember(null);
        setMonthlyInvestments({});
      }
    };
    fetchMember();
    subscription = supabase
      .channel('member_detail_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `id=eq.${id}` }, fetchMember)
      .subscribe();
    return () => { if (subscription) subscription.unsubscribe(); };
  }, [id]);

  const handlePaymentUpdate = async (month, amount) => {
    if (!member) return;
    setLoading(true);
    const yearPayments = member.payments?.[selectedYear] || {};
    const updatedPayments = {
      ...member.payments,
      [selectedYear]: {
        ...yearPayments,
        [month]: { amount, mode: paymentMode, fine: parseFloat(fineAmount || 0) || 0 }
      }
    };
    try {
      const { error } = await supabase
        .from('members')
        .update({ payments: updatedPayments })
        .eq('id', member.id);
      if (error) throw error;
      setShowPaymentModal(false);
      setPaymentAmount('');
      setSelectedMonth('');
    } catch (err) {
      alert('Error updating payment');
    }
    setLoading(false);
  };

  const handleMonthClick = (month) => {
    setSelectedMonth(month);
    const val = member.payments?.[selectedYear]?.[month];
    if (val && typeof val === 'object') {
      setPaymentAmount((val.amount ?? 0).toString());
      setPaymentMode(val.mode || 'cash');
      setFineAmount((val.fine ?? 0).toString());
    } else {
      const currentAmount = val || '';
    setPaymentAmount(currentAmount.toString());
      setPaymentMode('cash');
      setFineAmount('');
    }
    setShowPaymentModal(true);
  };

  const handleRemovePayment = async (month) => {
    if (!member) return;
    setLoading(true);
    const yearPayments = member.payments?.[selectedYear] || {};
    const updatedPayments = {
      ...member.payments,
      [selectedYear]: {
        ...yearPayments,
        [month]: null
      }
    };
    try {
      const { error } = await supabase
        .from('members')
        .update({ payments: updatedPayments })
        .eq('id', member.id);
      if (error) throw error;
    } catch (err) {
      alert('Error removing payment');
    }
    setLoading(false);
  };

  const handleMarkDueAsPaid = async (dueAmount) => {
    if (!member) return;
    
    const confirmPayment = window.confirm(
      `Mark due amount ₹${dueAmount.toFixed(2)} as paid?\n\nThis will update the payment status to "Paid" and clear the due amount. The amount will be added to fine collection.`
    );
    
    if (!confirmPayment) return;
    
    setLoading(true);
    
    try {
      // Update both top-level columns and nested payment object
      const updateData = {
        payment_status: 'paid',
        payment_due_amount: '',
        payment: {
          ...member.payment,
          paymentStatus: 'paid',
          dueAmount: '', // Clear current due amount
          originalDueAmount: dueAmount, // Store original due amount for fine tracking
          duePaymentDate: new Date().toISOString(),
          duePaymentMethod: 'cash' // Default to cash
        },
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', member.id);

      if (error) throw error;

      // Show success message
      alert(`✅ Due amount of ₹${dueAmount.toFixed(2)} has been marked as paid!\n\nThis amount will now appear in the fine collection in Company Amount page.`);
      
      // The page will automatically refresh due to the real-time subscription
      
    } catch (err) {
      console.error('Error marking due as paid:', err);
      alert('❌ Error updating payment status. Please try again.');
    }
    
    setLoading(false);
  };

  const createdDate = member?.createdAt?.toDate ? member.createdAt.toDate() : (member?.createdAt?.seconds ? new Date(member.createdAt.seconds * 1000) : null);
  const paymentJoinDate = member?.payment?.dateOfJoining ? new Date(member.payment.dateOfJoining) : null;
  const joiningDate = paymentJoinDate || createdDate;
  const startingYear = joiningDate ? joiningDate.getFullYear() : null;
  const startingMonthIndex = joiningDate ? joiningDate.getMonth() : null;

  const availableYears = useMemo(() => {
    const keys = Object.keys(member?.payments || {}).map(y => parseInt(y, 10)).filter(Boolean);
    if (startingYear && !keys.includes(startingYear)) keys.push(startingYear);
    if (!keys.includes(currentYear)) keys.push(currentYear);
    return keys.sort((a, b) => b - a);
  }, [member, startingYear]);

  const yearPayments = member?.payments?.[selectedYear] || {};
  const paidMonths = Object.entries(yearPayments).filter(([m, value]) => {
    const amt = typeof value === 'object' ? parseFloat(value.amount || 0) : parseFloat(value || 0);
    return amt && amt > 0;
  });
  const paidCount = paidMonths.length;
  const totalMonths = 12;
  const paymentPercentage = Math.round((paidCount / totalMonths) * 100);
  const totalAmount = paidMonths.reduce((sum, [month, value]) => {
    const amt = typeof value === 'object' ? parseFloat(value.amount || 0) : parseFloat(value || 0);
    return sum + (amt || 0);
  }, 0);
  const membershipPaidAmount = parseFloat(member?.payment?.payingMembershipAmount || 0);

  // Payment status logic
  const getPaymentStatus = (amount) => {
    if (!amount || amount === 0) return 'unpaid';
    if (amount >= 2000) return 'fully-paid';
    return 'partially-paid';
  };

  const getPaymentColor = (amount) => {
    const status = getPaymentStatus(amount);
    switch (status) {
      case 'fully-paid':
        return 'bg-green-500/20 border-green-500/50 hover:border-green-400/70';
      case 'partially-paid':
        return 'bg-yellow-500/20 border-yellow-500/50 hover:border-yellow-400/70';
      default:
        return 'bg-red-500/20 border-red-500/50 hover:border-red-400/70';
    }
  };

  const getPaymentTextColor = (amount) => {
    const status = getPaymentStatus(amount);
    switch (status) {
      case 'fully-paid':
        return 'text-green-400';
      case 'partially-paid':
        return 'text-yellow-400';
      default:
        return 'text-red-400';
    }
  };

  const getPaymentStatusText = (amount) => {
    const status = getPaymentStatus(amount);
    switch (status) {
      case 'fully-paid':
        return 'Fully Paid';
      case 'partially-paid':
        return 'Partially Paid';
      default:
        return 'Unpaid';
    }
  };

  const getActivityForMonth = (year, month) => {
    const key = `${year}-${month}`;
    return monthlyInvestments[key] || null;
  };

  const generateReport = () => {
    if (!member) return;
    const years = reportScope === 'all' ? [...availableYears].sort((a, b) => a - b) : [selectedYear];
    const rows = [];
    years.forEach((y) => {
      const yPayments = member.payments?.[y] || {};
      months.forEach((m) => {
        const val = yPayments[m];
        const amount = typeof val === 'object' ? (val.amount ?? 0) : (val ?? 0);
        rows.push({
          Name: member?.name || '',
          Phone: member?.phoneNo || member?.mobile || '',
          Year: y,
          Month: m,
          Amount: amount
        });
      });
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    const filename = `${member.name || 'member'}_${reportScope === 'all' ? 'all_years' : selectedYear}_payments.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar: Profile & Overview */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-amber-600 text-white flex items-center justify-center text-2xl font-bold">
                  {(member?.name?.[0] || '?').toUpperCase()}
                </div>
              <div>
                  <h2 className="text-xl font-bold text-slate-900">{member?.name || 'Member'}</h2>
                  <p className="text-sm text-slate-600">ID: {member?.payment?.membershipId || '—'}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Phone</span>
                  <span className="font-medium text-slate-900">{member?.phoneNo || member?.mobile || '—'}</span>
            </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Joined</span>
                  <span className="font-medium text-slate-900">{joiningDate ? joiningDate.toLocaleDateString() : 'N/A'}</span>
              </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Overview</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-amber-50 p-3 text-center border border-amber-200">
                  <div className="text-2xl font-bold text-amber-700">{paidCount}</div>
                  <div className="text-xs text-slate-500">Paid</div>
            </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center border border-amber-200">
                  <div className="text-2xl font-bold text-amber-700">₹{totalAmount}</div>
                  <div className="text-xs text-slate-500">Total Paid</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center border border-amber-200">
                  <div className="text-2xl font-bold text-amber-700">{Math.min(paymentPercentage, 100)}%</div>
                  <div className="text-xs text-slate-500">Completion</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Membership Amount</h3>
              <div className="text-3xl font-extrabold text-slate-900">₹{parseFloat(member?.payment?.payingMembershipAmount || 0)}</div>
              <p className="text-xs text-slate-500 mt-1">Configured on Payment step</p>
              
              {/* Due Amount Section */}
              {(() => {
                const paymentStatus = member?.payment?.paymentStatus || member?.payment_status;
                const dueAmount = parseFloat(member?.payment?.dueAmount || member?.payment_due_amount || 0);
                const isDue = paymentStatus === 'due' && dueAmount > 0;
                
                return isDue ? (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-800">Due Amount</p>
                        <p className="text-lg font-bold text-red-900">₹{dueAmount.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => handleMarkDueAsPaid(dueAmount)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Processing...' : 'Paid Now'}
                      </button>
                    </div>
                    <p className="text-xs text-red-600 mt-1">Outstanding payment from registration</p>
                  </div>
                ) : paymentStatus === 'paid' ? (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckIcon className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Fully Paid</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">All membership fees settled</p>
                  </div>
                ) : null;
              })()}
              
              <button
                onClick={() => navigate('/admin')}
                className="mt-4 w-full rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium py-2.5"
              >
                Back to Dashboard
              </button>
            </div>
          </aside>

          {/* Content: Filters + Months list */}
          <section className="lg:col-span-2 space-y-6 max-h-[80vh] overflow-y-auto pr-2">
            <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900">Payments</h1>
                <p className="text-xs text-slate-500">Manage monthly payments and export reports</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={reportScope}
                  onChange={(e) => setReportScope(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm"
                >
                  <option value="year">Selected Year</option>
                  <option value="all">All Years</option>
                </select>
                <button
                  onClick={generateReport}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2"
                >
                  Download Report
                </button>
          </div>
        </div>

            <div className="bg-white rounded-xl shadow-sm border border-amber-200">
              <div className="px-4 py-3 border-b border-amber-200 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">{selectedYear} — Monthly Breakdown</h2>
               
              </div>

              {/* Months List */}
              <ul className="divide-y divide-slate-200">
                {(months.filter((_, idx) => selectedYear !== startingYear || idx >= (startingMonthIndex ?? 0))).map((month, idxMapped) => {
                  const realIdx = selectedYear === startingYear ? (startingMonthIndex ?? 0) + idxMapped : idxMapped;
                  const rawVal = yearPayments[month];
                  const displayAmount = typeof rawVal === 'object' ? rawVal?.amount ?? 0 : rawVal ?? 0;
                  const isPaid = displayAmount && displayAmount > 0;
                  const status = getPaymentStatus(displayAmount);
                  const isStarting = startingYear === selectedYear && startingMonthIndex === realIdx;
                  
                  // Get activity data for this month (investment or withdrawal)
                  const activity = getActivityForMonth(selectedYear, month);

                  const badge = status === 'fully-paid' ? 'bg-emerald-100 text-emerald-700' : status === 'partially-paid' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
                  const amountText = isPaid ? `₹${displayAmount}` : '—';
              
              return (
                    <li key={month} className={`flex items-center justify-between px-4 py-3 ${isStarting ? 'relative' : ''}`}>
                      {isStarting && <span className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 rounded-r"></span>}
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-semibold">{realIdx + 1}</span>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{month}</div>
                          <div className="text-xs text-slate-500">{isStarting ? 'Starting month' : 'Regular month'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Status Column - Investment/Withdrawal Amount */}
                        <div className="text-right min-w-[120px]">
                          <div className="text-xs text-slate-500">Status</div>
                          <div className="text-sm font-medium text-slate-900">
                            {activity ? (
                              activity.type === 'investment' ? (
                                <span className="text-green-600">
                                  Invested: ₹{activity.amount}
                                </span>
                              ) : activity.type === 'withdrawal' ? (
                                <span className="text-red-600">
                                  Withdrawn: ₹{activity.amount}
                                </span>
                              ) : (
                                <span className="text-slate-400">No activity</span>
                              )
                            ) : (
                              <span className="text-slate-400">No activity</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/member/${id}/activity/${selectedYear}/${month}`)}
                          disabled={loading}
                          className="rounded-md border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                        >
                          Activity
                        </button>
                      </div>
                    </li>
              );
            })}
              </ul>
          </div>

            {!member && (
              <div className="bg-white rounded-xl shadow-sm border border-rose-200 p-6 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">!</div>
                <h3 className="font-semibold text-rose-700">Member Not Found</h3>
                <p className="text-sm text-rose-600 mt-1">The requested member could not be loaded.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-md border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-900">Update Payment — {selectedMonth}</h4>
            <button
                className="text-slate-400 hover:text-slate-600"
                onClick={() => { setShowPaymentModal(false); setPaymentAmount(''); setSelectedMonth(''); }}
              aria-label="Close"
            >
                ✕
            </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mode</label>
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="mode" value="cash" checked={paymentMode === 'cash'} onChange={() => setPaymentMode('cash')} />
                    <span>Cash</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="mode" value="online" checked={paymentMode === 'online'} onChange={() => setPaymentMode('online')} />
                    <span>Online</span>
                  </label>
                </div>
              </div>
              {(() => {
                const today = new Date();
                const showFine = today.getDate() > 15;
                return showFine ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fine Amount (₹)</label>
                    <input
                      type="number"
                      value={fineAmount}
                      onChange={(e) => setFineAmount(e.target.value)}
                      placeholder="Enter fine amount"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">Fine will be saved separately and not included in total paid.</p>
                  </div>
                ) : null;
              })()}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePaymentUpdate(selectedMonth, parseFloat(paymentAmount) || 0)}
                  disabled={loading || !paymentAmount}
                  className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 disabled:opacity-50"
                >
                  {loading ? 'Updating…' : 'Save'}
                </button>
                {yearPayments[selectedMonth] && (
                  <button
                    onClick={() => handleRemovePayment(selectedMonth)}
                    disabled={loading}
                    className="rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-sm font-semibold px-4 py-2 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberDetail;