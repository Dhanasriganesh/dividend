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
    const oneYearLater = new Date(joiningDate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    
    return new Date() >= oneYearLater;
  };

  const getDaysUntilEligible = (member) => {
    if (!member.payment?.dateOfJoining) return null;
    
    const joiningDate = new Date(member.payment.dateOfJoining);
    const oneYearLater = new Date(joiningDate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    
    const diffTime = oneYearLater - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  const hasRefunded = (member) => {
    return member.payment?.membershipRefunded === true;
  };

  const handleProcessRefund = async (member) => {
    if (!window.confirm(`Are you sure you want to process a refund of ₹10,000 for ${member.name}?`)) {
      return;
    }

    setProcessingRefund(true);
    try {
      // Update member record to mark as refunded
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
          description: `Membership refund for ${member.name} - 1 year after joining`
        });

      if (txError) {
        throw txError;
      }

      alert('Membership refund processed successfully!');
      fetchMembers(); // Refresh the list
    } catch (error) {
      console.error('Error processing refund:', error);
      alert('Error processing refund: ' + error.message);
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

  const eligibleMembers = members.filter(member => 
    isEligibleForRefund(member) && !hasRefunded(member)
  );

  const ineligibleMembers = members.filter(member => 
    !isEligibleForRefund(member) && !hasRefunded(member)
  );

  const refundedMembers = members.filter(member => hasRefunded(member));

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
                <p className="text-sm text-gray-500">Process membership refunds after 1 year from joining</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white shadow-sm rounded-lg border border-amber-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Eligible for Refund</p>
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
                <p className="text-sm font-medium text-gray-500">Waiting Period</p>
                <p className="text-2xl font-bold text-yellow-600">{ineligibleMembers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-amber-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-50 rounded-lg">
                <RefundIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Refunded</p>
                <p className="text-2xl font-bold text-blue-600">{refundedMembers.length}</p>
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
            {/* Eligible Members */}
            {eligibleMembers.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg border border-amber-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-200 bg-green-50">
                  <h2 className="text-lg font-semibold text-green-800">Eligible for Refund (₹10,000 each)</h2>
                  <p className="text-sm text-green-600">Members who have completed 1 year and can request refund</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-amber-100 text-sm">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Member</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Membership ID</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Joining Date</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Days Since Joining</th>
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
                          <td className="px-6 py-4 text-gray-700">
                            {member.payment?.dateOfJoining ? 
                              Math.floor((new Date() - new Date(member.payment.dateOfJoining)) / (1000 * 60 * 60 * 24)) + ' days' : 
                              'N/A'
                            }
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleProcessRefund(member)}
                              disabled={processingRefund}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium"
                            >
                              <RefundIcon />
                              {processingRefund ? 'Processing...' : 'Process Refund'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Ineligible Members */}
            {ineligibleMembers.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg border border-amber-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-200 bg-yellow-50">
                  <h2 className="text-lg font-semibold text-yellow-800">Waiting Period</h2>
                  <p className="text-sm text-yellow-600">Members who haven't completed 1 year yet</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-amber-100 text-sm">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Member</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Membership ID</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Joining Date</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Days Until Eligible</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {ineligibleMembers.map((member) => (
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
                            {getDaysUntilEligible(member) !== null ? 
                              `${getDaysUntilEligible(member)} days` : 
                              'N/A'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Refunded Members */}
            {refundedMembers.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg border border-amber-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-200 bg-blue-50">
                  <h2 className="text-lg font-semibold text-blue-800">Refunded Members</h2>
                  <p className="text-sm text-blue-600">Members who have already received their refund</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-amber-100 text-sm">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Member</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Membership ID</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Joining Date</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Refund Date</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Refund Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {refundedMembers.map((member) => (
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
