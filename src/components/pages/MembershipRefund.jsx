import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/config';
import { useAuth } from '../../context/AuthContext';

// Icons
const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const RefundIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const MembershipRefund = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRefund, setProcessingRefund] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching members:', error);
        alert('Error loading members: ' + error.message);
      } else {
        setMembers(data || []);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      alert('Error loading members');
    }
    setLoading(false);
  };

  const isEligibleForRefund = (member) => {
    if (!member.payment?.dateOfJoining) return false;
    
    const joiningDate = new Date(member.payment.dateOfJoining);
    const fiveYearsLater = new Date(joiningDate);
    fiveYearsLater.setFullYear(fiveYearsLater.getFullYear() + 5);
    
    return new Date() >= fiveYearsLater;
  };

  const isLeavingCompany = (member) => {
    return member.payment?.leavingCompany === true;
  };

  const getDaysUntilEligible = (member) => {
    if (!member.payment?.dateOfJoining) return null;
    
    const joiningDate = new Date(member.payment.dateOfJoining);
    const fiveYearsLater = new Date(joiningDate);
    fiveYearsLater.setFullYear(fiveYearsLater.getFullYear() + 5);
    
    const diffTime = fiveYearsLater - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  const getYearsSinceJoining = (member) => {
    if (!member.payment?.dateOfJoining) return 0;
    
    const joiningDate = new Date(member.payment.dateOfJoining);
    const diffTime = new Date() - joiningDate;
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    
    return diffYears.toFixed(1);
  };

  const hasRefunded = (member) => {
    return member.payment?.membershipRefunded === true;
  };

  const handleMarkLeaving = async (member) => {
    const yearsSinceJoining = getYearsSinceJoining(member);
    const confirmMessage = `Mark ${member.name} as leaving the company?\n\nThis will make them eligible for membership refund of ₹10,000.\n\nYears since joining: ${yearsSinceJoining}`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setProcessingRefund(true);
    try {
      // Update member record to mark as leaving company
      const { error: updateError } = await supabase
        .from('members')
        .update({
          payment: {
            ...member.payment,
            leavingCompany: true,
            leavingDate: new Date().toISOString()
          }
        })
        .eq('id', member.id);

      if (updateError) {
        throw updateError;
      }

      alert(`✅ Member marked as leaving company!\n\nMember: ${member.name}\nThey are now eligible for membership refund.`);
      fetchMembers(); // Refresh the list
    } catch (error) {
      console.error('Error marking member as leaving:', error);
      alert('❌ Error marking member as leaving: ' + error.message);
    }
    setProcessingRefund(false);
  };

  const handleSettleRefund = async (member) => {
    const yearsSinceJoining = getYearsSinceJoining(member);
    const confirmMessage = `Settle membership refund of ₹10,000 for ${member.name}?\n\nThis member is leaving the company and is eligible for refund.\n\nYears since joining: ${yearsSinceJoining}`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setProcessingRefund(true);
    try {
      // Update member record to mark as refunded/settled
      const { error: updateError } = await supabase
        .from('members')
        .update({
          payment: {
            ...member.payment,
            membershipRefunded: true,
            refundDate: new Date().toISOString(),
            refundAmount: 10000
          }
        })
        .eq('id', member.id);

      if (updateError) {
        throw updateError;
      }

      // Create a company transaction record for the refund
      const { error: txError } = await supabase
        .from('company_transactions')
        .insert({
          member_id: member.id,
          member_name: member.name,
          membership_id: member.payment?.membershipId || '',
          type: 'membership_refund',
          amount: 10000,
          fine: 0,
          year: new Date().getFullYear(),
          month: new Date().toLocaleString('default', { month: 'short' }),
          custom_receipt: `REFUND-${Date.now()}`,
          share_price: 0,
          shares: 0,
          created_at: new Date().toISOString(),
          description: `Membership refund settled for ${member.name} - leaving company after ${yearsSinceJoining} years`
        });

      if (txError) {
        throw txError;
      }

      alert(`✅ Membership refund settled successfully!\n\nMember: ${member.name}\nAmount: ₹10,000\nYears since joining: ${yearsSinceJoining}`);
      fetchMembers(); // Refresh the list
    } catch (error) {
      console.error('Error settling refund:', error);
      alert('❌ Error settling refund: ' + error.message);
    }
    setProcessingRefund(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      alert('Logout failed');
    }
  };

  // Separate members into four categories
  const settledMembers = members.filter(member => hasRefunded(member));
  
  const leavingMembers = members.filter(member => 
    isLeavingCompany(member) && !hasRefunded(member)
  );

  const eligibleMembers = members.filter(member => 
    isEligibleForRefund(member) && !isLeavingCompany(member) && !hasRefunded(member)
  );

  const pendingMembers = members.filter(member => 
    !isEligibleForRefund(member) && !isLeavingCompany(member) && !hasRefunded(member)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-amber-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <BackIcon />
                <span>Back to Admin</span>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Membership Refund Management</h1>
                <p className="text-sm text-gray-500">Process membership refunds (Refund only when member leaves company)</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm border border-red-200"
            >
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white shadow-sm rounded-lg border border-amber-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-50 rounded-lg">
                <RefundIcon className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Leaving Company</p>
                <p className="text-2xl font-bold text-red-600">{leavingMembers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-amber-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Eligible (5+ Years)</p>
                <p className="text-2xl font-bold text-green-600">{eligibleMembers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-amber-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <ClockIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending (Under 5 Years)</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingMembers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-amber-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-50 rounded-lg">
                <CheckIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Settled</p>
                <p className="text-2xl font-bold text-blue-600">{settledMembers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">Loading members...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Members Leaving Company */}
            {leavingMembers.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg border border-amber-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-200 bg-red-50">
                  <h2 className="text-lg font-semibold text-red-800">Members Leaving Company (₹10,000 refund)</h2>
                  <p className="text-sm text-red-600">These members are leaving and eligible for membership refund</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-amber-100 text-sm">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Member</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Membership ID</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Joining Date</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Years Since Joining</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Leaving Date</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {leavingMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-amber-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{member.name}</div>
                              <div className="text-gray-500">{member.phone_no}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-700">{member.payment?.membershipId || 'N/A'}</td>
                          <td className="px-6 py-4 text-gray-700">
                            {member.payment?.dateOfJoining ? 
                              new Date(member.payment.dateOfJoining).toLocaleDateString() : 
                              'N/A'
                            }
                          </td>
                          <td className="px-6 py-4 text-gray-700 font-medium">
                            {getYearsSinceJoining(member)} years
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {member.payment?.leavingDate ? 
                              new Date(member.payment.leavingDate).toLocaleDateString() : 
                              'N/A'
                            }
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleSettleRefund(member)}
                              disabled={processingRefund}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium shadow-sm"
                            >
                              <CheckIcon />
                              {processingRefund ? 'Processing...' : 'Settle Refund'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Eligible Members (Completed 5 Years but staying) */}
            {eligibleMembers.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg border border-amber-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-200 bg-green-50">
                  <h2 className="text-lg font-semibold text-green-800">Eligible Members (5+ Years, Still Active)</h2>
                  <p className="text-sm text-green-600">Members who have completed 5 years but are still with the company</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-amber-100 text-sm">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Member</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Membership ID</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Joining Date</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Years Since Joining</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {eligibleMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-amber-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{member.name}</div>
                              <div className="text-gray-500">{member.phone_no}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-700">{member.payment?.membershipId || 'N/A'}</td>
                          <td className="px-6 py-4 text-gray-700">
                            {member.payment?.dateOfJoining ? 
                              new Date(member.payment.dateOfJoining).toLocaleDateString() : 
                              'N/A'
                            }
                          </td>
                          <td className="px-6 py-4 text-gray-700 font-medium">
                            {getYearsSinceJoining(member)} years
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleMarkLeaving(member)}
                              disabled={processingRefund}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg text-sm font-medium shadow-sm"
                            >
                              <RefundIcon />
                              {processingRefund ? 'Processing...' : 'Mark as Leaving'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pending Members (Under 5 Years) */}
            {pendingMembers.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg border border-amber-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-200 bg-yellow-50">
                  <h2 className="text-lg font-semibold text-yellow-800">Active Members (Under 5 Years)</h2>
                  <p className="text-sm text-yellow-600">Members who haven't completed 5 years yet - can be marked as leaving if they decide to leave</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-amber-100 text-sm">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Member</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Membership ID</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Joining Date</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Years Since Joining</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Days Until 5 Years</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {pendingMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-amber-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{member.name}</div>
                              <div className="text-gray-500">{member.phone_no}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-700">{member.payment?.membershipId || 'N/A'}</td>
                          <td className="px-6 py-4 text-gray-700">
                            {member.payment?.dateOfJoining ? 
                              new Date(member.payment.dateOfJoining).toLocaleDateString() : 
                              'N/A'
                            }
                          </td>
                          <td className="px-6 py-4 text-gray-700 font-medium">
                            {getYearsSinceJoining(member)} years
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {getDaysUntilEligible(member) !== null ? 
                              `${getDaysUntilEligible(member)} days` : 
                              'N/A'
                            }
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleMarkLeaving(member)}
                              disabled={processingRefund}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg text-sm font-medium shadow-sm"
                            >
                              <RefundIcon />
                              {processingRefund ? 'Processing...' : 'Mark as Leaving'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Settled Members */}
            {settledMembers.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg border border-amber-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-200 bg-blue-50">
                  <h2 className="text-lg font-semibold text-blue-800">Settled Members</h2>
                  <p className="text-sm text-blue-600">Members whose refunds have been settled</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-amber-100 text-sm">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Member</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Membership ID</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Joining Date</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Settled Date</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Refund Amount</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {settledMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-amber-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{member.name}</div>
                              <div className="text-gray-500">{member.phone_no}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-700">{member.payment?.membershipId || 'N/A'}</td>
                          <td className="px-6 py-4 text-gray-700">
                            {member.payment?.dateOfJoining ? 
                              new Date(member.payment.dateOfJoining).toLocaleDateString() : 
                              'N/A'
                            }
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {member.payment?.refundDate ? 
                              new Date(member.payment.refundDate).toLocaleDateString() : 
                              'N/A'
                            }
                          </td>
                          <td className="px-6 py-4 font-semibold text-green-600">
                            ₹{member.payment?.refundAmount?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              disabled
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium cursor-not-allowed"
                            >
                              <CheckIcon />
                              Settled
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* No members message */}
            {members.length === 0 && (
              <div className="bg-white shadow-sm rounded-lg border border-amber-200 p-12 text-center">
                <p className="text-gray-500 text-lg">No members found</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default MembershipRefund;
