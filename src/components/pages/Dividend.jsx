import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/config';
import { useNavigate } from 'react-router-dom';

const Dividend = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  
  // Form state for creating new dividend donation event
  const [formData, setFormData] = useState({
    eventDate: new Date().toISOString().split('T')[0],
    eventName: '',
    sharePrice: '',
    distributionPool: '',
    minHoldingMonths: 12,
    notes: ''
  });

  // Fetch existing events and members
  useEffect(() => {
    fetchEvents();
    fetchMembers();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('dividend_donation_summary')
        .select('*')
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      alert('Error fetching dividend events');
    }
  };

  const fetchMembers = async () => {
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

  // Generate preview of dividend donation event
  const generatePreview = async () => {
    if (!formData.sharePrice || !formData.distributionPool) {
      alert('Please enter share price and distribution pool amount');
      return;
    }

    const sharePrice = parseFloat(formData.sharePrice);
    const distributionPool = parseFloat(formData.distributionPool);
    const minHoldingMonths = parseInt(formData.minHoldingMonths);

    // Calculate eligibility for each member
    const eligibleMembers = [];
    let totalEligibleShares = 0;

    members.forEach(member => {
      const eligibleShares = calculateEligibleShares(member, formData.eventDate, minHoldingMonths);
      
      if (eligibleShares > 0) {
        eligibleMembers.push({
          ...member,
          eligibleShares,
          payment: member.payment || {}
        });
        totalEligibleShares += eligibleShares;
      }
    });

    // Calculate allocations
    const allocations = eligibleMembers.map(member => {
      const allocation = (member.eligibleShares / totalEligibleShares) * distributionPool;
      return {
        memberId: member.id,
        memberName: member.name,
        memberPhone: member.phoneNo || member.mobile,
        eligibleShares: member.eligibleShares,
        allocatedAmount: allocation,
        joiningDate: member.payment.dateOfJoining
      };
    });

    // Calculate company investment amount (non-eligible portion)
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocatedAmount, 0);
    const companyInvestmentAmount = distributionPool - totalAllocated;
    const companySharesPurchased = companyInvestmentAmount / sharePrice;

    const preview = {
      eventData: formData,
      eligibleMembers: eligibleMembers.length,
      totalEligibleShares,
      allocations,
      companyInvestmentAmount,
      companySharesPurchased,
      sharePrice
    };

    setPreviewData(preview);
    setShowPreview(true);
  };

  // Create dividend donation event
  const createEvent = async () => {
    if (!previewData) return;

    setLoading(true);
    try {
      const { eventData, allocations, companyInvestmentAmount, companySharesPurchased, totalEligibleShares, eligibleMembers } = previewData;

      // Create the event
      const { data: eventResult, error: eventError } = await supabase
        .from('dividend_donation_events')
        .insert({
          event_date: eventData.eventDate,
          event_name: eventData.eventName,
          share_price_at_event: parseFloat(eventData.sharePrice),
          distribution_pool: parseFloat(eventData.distributionPool),
          min_holding_months: parseInt(eventData.minHoldingMonths),
          notes: eventData.notes,
          status: 'confirmed',
          total_eligible_shares: totalEligibleShares,
          total_eligible_members: eligibleMembers.length,
          company_investment_amount: companyInvestmentAmount,
          company_shares_purchased: Math.floor(companySharesPurchased)
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create allocations
      const allocationInserts = allocations.map(alloc => ({
        event_id: eventResult.id,
        member_id: alloc.memberId,
        eligible_shares: alloc.eligibleShares,
        allocated_amount: alloc.allocatedAmount,
        status: 'pending'
      }));

      const { error: allocationError } = await supabase
        .from('dividend_donation_allocations')
        .insert(allocationInserts);

      if (allocationError) throw allocationError;

      // Create company investment transaction if there's an amount to invest
      if (companyInvestmentAmount > 0) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().toLocaleString('default', { month: 'short' });
        
        // Get or create company member record
        let { data: companyMember } = await supabase
          .from('members')
          .select('id')
          .eq('name', 'Company Account')
          .single();

        if (!companyMember) {
          // Create company member if doesn't exist
          const { data: newCompanyMember, error: companyError } = await supabase
            .from('members')
            .insert({
              name: 'Company Account',
              phoneNo: '0000000000',
              total_shares: 0,
              payment: {
                dateOfJoining: new Date().toISOString(),
                paymentStatus: 'paid'
              }
            })
            .select()
            .single();

          if (companyError) throw companyError;
          companyMember = newCompanyMember;
        }

        // Add company investment to activities
        const { error: activityError } = await supabase
          .from('members')
          .update({
            activities: {
              ...companyMember.activities || {},
              [currentYear]: {
                ...companyMember.activities?.[currentYear] || {},
                [currentMonth]: {
                  investment: {
                    amount: companyInvestmentAmount,
                    shares: Math.floor(companySharesPurchased),
                    sharePrice: parseFloat(eventData.sharePrice),
                    fine: 0,
                    type: 'dividend_donation_company_investment',
                    eventId: eventResult.id,
                    description: `Company investment from dividend donation event: ${eventData.eventName}`
                  }
                }
              }
            },
            total_shares: (companyMember.total_shares || 0) + Math.floor(companySharesPurchased),
            updated_at: new Date().toISOString()
          })
          .eq('id', companyMember.id);

        if (activityError) throw activityError;
      }

      alert('✅ Dividend donation event created successfully!');
      setShowCreateForm(false);
      setShowPreview(false);
      setPreviewData(null);
      setFormData({
        eventDate: new Date().toISOString().split('T')[0],
        eventName: '',
        sharePrice: '',
        distributionPool: '',
        minHoldingMonths: 12,
        notes: ''
      });
      fetchEvents();

    } catch (error) {
      console.error('Error creating event:', error);
      alert('❌ Error creating dividend donation event');
    }
    setLoading(false);
  };

  // Mark allocation as paid
  const markAsPaid = async (allocationId, paymentMethod = 'cash') => {
    try {
      const { error } = await supabase
        .from('dividend_donation_allocations')
        .update({
          status: 'paid',
          payment_method: paymentMethod,
          payment_date: new Date().toISOString(),
          payment_reference: `DD-${Date.now()}`
        })
        .eq('id', allocationId);

      if (error) throw error;

      alert('✅ Allocation marked as paid successfully!');
      fetchEvents();
    } catch (error) {
      console.error('Error updating allocation:', error);
      alert('❌ Error updating allocation');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
            <h1 className="text-3xl font-bold text-gray-900">Dividend Donation</h1>
            <p className="text-gray-600 mt-2">Manage discretionary profit distribution events</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            + Create New Event
          </button>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Events</h2>
            {events.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No dividend donation events yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Share Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Distribution Pool
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Eligible Members
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company Investment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {events.map((event) => (
                      <tr key={event.event_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {event.event_name || 'Unnamed Event'}
                            </div>
                            <div className="text-sm text-gray-500">
                              Min holding: {event.min_holding_months} months
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(event.event_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{event.share_price_at_event}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{event.distribution_pool?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.total_eligible_members} members
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{event.company_investment_amount?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            event.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800' 
                              : event.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {event.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Create Event Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Dividend Donation Event</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Name
                  </label>
                  <input
                    type="text"
                    name="eventName"
                    value={formData.eventName}
                    onChange={handleInputChange}
                    placeholder="e.g., Annual Dividend 2025"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Date
                  </label>
                  <input
                    type="date"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Share Price at Event (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="sharePrice"
                    value={formData.sharePrice}
                    onChange={handleInputChange}
                    placeholder="30.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Distribution Pool Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="distributionPool"
                    value={formData.distributionPool}
                    onChange={handleInputChange}
                    placeholder="100000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Holding Period (months)
                  </label>
                  <select
                    name="minHoldingMonths"
                    value={formData.minHoldingMonths}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={12}>12 months</option>
                    <option value={18}>18 months</option>
                    <option value={24}>24 months</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Additional notes about this event..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={generatePreview}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Preview Event
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && previewData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Preview</h2>
              
              {/* Summary */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">Event Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Event Name:</span> {previewData.eventData.eventName}
                  </div>
                  <div>
                    <span className="font-medium">Event Date:</span> {new Date(previewData.eventData.eventDate).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Share Price:</span> ₹{previewData.sharePrice}
                  </div>
                  <div>
                    <span className="font-medium">Distribution Pool:</span> ₹{previewData.eventData.distributionPool}
                  </div>
                  <div>
                    <span className="font-medium">Eligible Members:</span> {previewData.eligibleMembers}
                  </div>
                  <div>
                    <span className="font-medium">Total Eligible Shares:</span> {previewData.totalEligibleShares}
                  </div>
                </div>
              </div>

              {/* Allocations */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Member Allocations</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Eligible Shares</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Allocation</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Joining Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.allocations.map((alloc, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm">
    <div>
                              <div className="font-medium">{alloc.memberName}</div>
                              <div className="text-gray-500">{alloc.memberPhone}</div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm">{alloc.eligibleShares}</td>
                          <td className="px-4 py-2 text-sm font-medium">₹{alloc.allocatedAmount.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm">{new Date(alloc.joiningDate).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Company Investment */}
              {previewData.companyInvestmentAmount > 0 && (
                <div className="bg-amber-50 p-4 rounded-lg mb-6">
                  <h3 className="font-semibold text-amber-900 mb-2">Company Investment</h3>
                  <div className="text-sm">
                    <div>
                      <span className="font-medium">Amount to invest:</span> ₹{previewData.companyInvestmentAmount.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Shares to purchase:</span> {Math.floor(previewData.companySharesPurchased)} shares
                    </div>
                    <div className="text-amber-700 mt-2">
                      This amount represents the portion that would have gone to ineligible members (holding period &lt; {previewData.eventData.minHoldingMonths} months)
                    </div>
                  </div>
    </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                  Back to Edit
                </button>
                <button
                  onClick={createEvent}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Confirm & Create Event'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default Dividend;
