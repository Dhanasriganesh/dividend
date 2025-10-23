import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/config';
import { useNavigate } from 'react-router-dom';

const Dividend = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filter configuration
  const [config, setConfig] = useState({
    eventDate: new Date().toISOString().split('T')[0],
    minHoldingMonths: 12
  });

  // Filtered results
  const [eligibleMembers, setEligibleMembers] = useState([]);
  const [ineligibleMembers, setIneligibleMembers] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // Fetch members on component mount
  useEffect(() => {
    fetchMembers();
  }, []);

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
      alert('Error fetching members');
    }
    setLoading(false);
  };

  // Calculate eligible shares for a member
  const calculateEligibleShares = (member, eventDate, minHoldingMonths) => {
    const totalShares = member.total_shares || 0;
    if (totalShares === 0) return 0;

    const payment = member.payment || {};
    const joiningDate = payment.dateOfJoining;
    
    if (!joiningDate) return 0;

    const investmentDate = new Date(joiningDate);
    const eventDateObj = new Date(eventDate);
    
    const monthsHeld = (eventDateObj.getFullYear() - investmentDate.getFullYear()) * 12 + 
                      (eventDateObj.getMonth() - investmentDate.getMonth());

    return monthsHeld >= minHoldingMonths ? totalShares : 0;
  };

  // Filter members by eligibility
  const filterMembers = () => {
    const minHoldingMonths = parseInt(config.minHoldingMonths);

    // Separate eligible and ineligible members
    const eligible = [];
    const ineligible = [];

    members.forEach(member => {
      const eligibleShares = calculateEligibleShares(member, config.eventDate, minHoldingMonths);
      const joiningDate = member.payment?.dateOfJoining;
      const membershipId = member.payment?.membershipId || 'N/A';
      const email = member.email || 'N/A';
      
      const memberData = {
        id: member.id,
        name: member.name,
        phone: member.phoneNo || member.mobile || 'N/A',
        email: email,
        membershipId: membershipId,
        totalShares: member.total_shares || 0,
        joiningDate: joiningDate || 'N/A',
        eligibleShares: eligibleShares,
        monthsHeld: joiningDate ? calculateMonthsHeld(joiningDate, config.eventDate) : 0
      };

      if (eligibleShares > 0) {
        eligible.push(memberData);
      } else {
        ineligible.push(memberData);
      }
    });

    setEligibleMembers(eligible);
    setIneligibleMembers(ineligible);
    setShowResults(true);
  };

  // Helper function to calculate months held
  const calculateMonthsHeld = (joiningDate, eventDate) => {
    const investmentDate = new Date(joiningDate);
    const eventDateObj = new Date(eventDate);
    
    return (eventDateObj.getFullYear() - investmentDate.getFullYear()) * 12 + 
           (eventDateObj.getMonth() - investmentDate.getMonth());
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilter = () => {
    setShowResults(false);
    setEligibleMembers([]);
    setIneligibleMembers([]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate('/admin')}
            className="mb-4 flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Dividend Donation - Member Eligibility</h1>
          <p className="text-gray-600 mt-2">View member details eligible for dividend donation</p>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Filter Criteria</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Date
              </label>
              <input
                type="date"
                name="eventDate"
                value={config.eventDate}
                onChange={handleConfigChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Holding Period (months)
              </label>
              <select
                name="minHoldingMonths"
                value={config.minHoldingMonths}
                onChange={handleConfigChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
                <option value={18}>18 months</option>
                <option value={24}>24 months</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="flex gap-3 w-full">
                <button
                  onClick={filterMembers}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Show Eligible Members'}
                </button>
                {showResults && (
                  <button
                    onClick={resetFilter}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {showResults && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Total Members</div>
              <div className="text-2xl font-bold text-gray-900">{members.length}</div>
            </div>
            <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-4">
              <div className="text-sm text-green-600 mb-1">Eligible Members</div>
              <div className="text-2xl font-bold text-green-800">{eligibleMembers.length}</div>
            </div>
            <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4">
              <div className="text-sm text-red-600 mb-1">Ineligible Members</div>
              <div className="text-2xl font-bold text-red-800">{ineligibleMembers.length}</div>
            </div>
          </div>

          {/* Eligible Members Table */}
          {eligibleMembers.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Eligible Members ({eligibleMembers.length})
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Members who meet the minimum holding period of {config.minHoldingMonths} months
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joining Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Months Held</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Shares</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {eligibleMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {member.membershipId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {member.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.phone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.joiningDate !== 'N/A' ? new Date(member.joiningDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.monthsHeld} months
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.eligibleShares.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Ineligible Members Table */}
          {ineligibleMembers.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Ineligible Members ({ineligibleMembers.length})
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  These members do not meet the minimum holding period of {config.minHoldingMonths} months.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joining Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Months Held</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {ineligibleMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {member.membershipId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {member.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.phone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.joiningDate !== 'N/A' ? new Date(member.joiningDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.monthsHeld} months
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            {member.totalShares === 0 ? 'No shares' : 
                             member.joiningDate === 'N/A' ? 'No joining date' :
                             `Only ${member.monthsHeld} months`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      </div>
  );
};

export default Dividend;
