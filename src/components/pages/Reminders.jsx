import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/config';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';

// Icons
const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L12.828 7H4.828z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const WorkIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
  </svg>
);

const Reminders = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
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
        .not('insurance', 'is', null);

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

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      alert('Logout failed');
    }
  };

  // Insurance expiry reminder logic
  const getInsuranceExpiryReminders = () => {
    const reminders = [];
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

    members.forEach(member => {
      const insurance = member.insurance || {};
      
      // Check Health Insurance
      if (insurance.health?.enabled === 'YES' && insurance.health?.policyAnniversaryDate) {
        const expiryDate = new Date(insurance.health.policyAnniversaryDate);
        if (expiryDate <= twoMonthsFromNow) {
          reminders.push({
            memberName: member.name,
            memberId: member.payment?.membershipId || '',
            phone: member.phone_no,
            insuranceType: 'Health Insurance',
            companyPlan: insurance.health.companyPlan || '',
            expiryDate: insurance.health.policyAnniversaryDate,
            daysUntilExpiry: Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24))
          });
        }
      }

      // Check Accidental Insurance
      if (insurance.accidental?.enabled === 'YES' && insurance.accidental?.policyAnniversaryDate) {
        const expiryDate = new Date(insurance.accidental.policyAnniversaryDate);
        if (expiryDate <= twoMonthsFromNow) {
          reminders.push({
            memberName: member.name,
            memberId: member.payment?.membershipId || '',
            phone: member.phone_no,
            insuranceType: 'Accidental Insurance',
            companyPlan: insurance.accidental.companyPlan || '',
            expiryDate: insurance.accidental.policyAnniversaryDate,
            daysUntilExpiry: Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24))
          });
        }
      }

      // Check Term Life Insurance
      if (insurance.termLife?.enabled === 'YES' && insurance.termLife?.policyAnniversaryDate) {
        const expiryDate = new Date(insurance.termLife.policyAnniversaryDate);
        if (expiryDate <= twoMonthsFromNow) {
          reminders.push({
            memberName: member.name,
            memberId: member.payment?.membershipId || '',
            phone: member.phone_no,
            insuranceType: 'Term Life Insurance',
            companyPlan: insurance.termLife.companyPlan || '',
            expiryDate: insurance.termLife.policyAnniversaryDate,
            daysUntilExpiry: Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24))
          });
        }
      }
    });

    return reminders.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  };

  // Get members interested in insurance
  const getInsuranceInterestedMembers = () => {
    return members.filter(member => {
      const insurance = member.insurance || {};
      return (
        (insurance.health?.enabled === 'NO' && insurance.health?.wantInsurance === 'YES') ||
        (insurance.accidental?.enabled === 'NO' && insurance.accidental?.wantInsurance === 'YES') ||
        (insurance.termLife?.enabled === 'NO' && insurance.termLife?.wantInsurance === 'YES')
      );
    });
  };

  // Get members interested in working
  const getWorkInterestedMembers = () => {
    return members.filter(member => {
      const insurance = member.insurance || {};
      return insurance.willingToWork === 'YES';
    });
  };

  // Download insurance interest list
  const downloadInsuranceInterestList = async () => {
    setDownloading(true);
    try {
      const interestedMembers = getInsuranceInterestedMembers();
      
      const rows = interestedMembers.map((member, index) => {
        const insurance = member.insurance || {};
        const healthWant = insurance.health?.enabled === 'NO' && insurance.health?.wantInsurance === 'YES';
        const accidentalWant = insurance.accidental?.enabled === 'NO' && insurance.accidental?.wantInsurance === 'YES';
        const termLifeWant = insurance.termLife?.enabled === 'NO' && insurance.termLife?.wantInsurance === 'YES';
        
        return {
          'S. No.': index + 1,
          'Member Name': member.name,
          'Member ID': member.payment?.membershipId || '',
          'Phone Number': member.phone_no,
          'Email': member.email || '',
          'Health Insurance Interest': healthWant ? 'Yes' : 'No',
          'Accidental Insurance Interest': accidentalWant ? 'Yes' : 'No',
          'Term Life Insurance Interest': termLifeWant ? 'Yes' : 'No',
          'Date Added': member.created_at ? new Date(member.created_at).toLocaleDateString() : ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Insurance Interest List');
      XLSX.writeFile(workbook, `Insurance_Interest_List_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error downloading insurance interest list:', error);
      alert('Error downloading file');
    }
    setDownloading(false);
  };

  // Download work interest list
  const downloadWorkInterestList = async () => {
    setDownloading(true);
    try {
      const workInterestedMembers = getWorkInterestedMembers();
      
      const rows = workInterestedMembers.map((member, index) => {
        const insurance = member.insurance || {};
        const workerDetails = insurance.willingWorkerDetails || {};
        
        return {
          'S. No.': index + 1,
          'Member Name': member.name,
          'Member ID': member.payment?.membershipId || '',
          'Phone Number': member.phone_no,
          'Email': member.email || '',
          'Worker Name': workerDetails.name || '',
          'Worker Phone': workerDetails.phone || '',
          'Date Added': member.created_at ? new Date(member.created_at).toLocaleDateString() : ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Work Interest List');
      XLSX.writeFile(workbook, `Work_Interest_List_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error downloading work interest list:', error);
      alert('Error downloading file');
    }
    setDownloading(false);
  };

  const expiryReminders = getInsuranceExpiryReminders();
  const insuranceInterestedCount = getInsuranceInterestedMembers().length;
  const workInterestedCount = getWorkInterestedMembers().length;

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
                <h1 className="text-xl font-bold text-gray-900">Reminders & Interest Lists</h1>
                <p className="text-sm text-gray-500">Manage insurance expiry reminders and member interests</p>
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
              <div className="p-2 bg-red-50 rounded-lg">
                <BellIcon className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Insurance Expiring</p>
                <p className="text-2xl font-bold text-red-600">{expiryReminders.length}</p>
                <p className="text-xs text-gray-400">Within 2 months</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-amber-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-50 rounded-lg">
                <ShieldIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Insurance Interest</p>
                <p className="text-2xl font-bold text-blue-600">{insuranceInterestedCount}</p>
                <p className="text-xs text-gray-400">Want insurance</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-amber-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <WorkIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Work Interest</p>
                <p className="text-2xl font-bold text-green-600">{workInterestedCount}</p>
                <p className="text-xs text-gray-400">Want to work</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">Loading reminders...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Insurance Expiry Reminders */}
            {expiryReminders.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg border border-amber-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-200 bg-red-50">
                  <h2 className="text-lg font-semibold text-red-800">Insurance Expiry Reminders</h2>
                  <p className="text-sm text-red-600">Members with insurance expiring within 2 months</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-amber-100 text-sm">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Member</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Insurance Type</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Company Plan</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Expiry Date</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Days Until Expiry</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {expiryReminders.map((reminder, index) => (
                        <tr key={index} className="hover:bg-amber-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{reminder.memberName}</div>
                              <div className="text-gray-500">{reminder.memberId} • {reminder.phone}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-700">{reminder.insuranceType}</td>
                          <td className="px-6 py-4 text-gray-700">{reminder.companyPlan}</td>
                          <td className="px-6 py-4 text-gray-700">
                            {new Date(reminder.expiryDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              reminder.daysUntilExpiry <= 30 ? 'bg-red-100 text-red-800' :
                              reminder.daysUntilExpiry <= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {reminder.daysUntilExpiry} days
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Download Interest Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Insurance Interest Download */}
              <div className="bg-white shadow-sm rounded-lg border border-amber-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-50 rounded-lg mr-3">
                      <ShieldIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Insurance Interest List</h3>
                      <p className="text-sm text-gray-500">{insuranceInterestedCount} members interested</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Download list of members who expressed interest in getting insurance coverage.
                </p>
                <button
                  onClick={downloadInsuranceInterestList}
                  disabled={downloading || insuranceInterestedCount === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium shadow-sm"
                >
                  <DownloadIcon />
                  {downloading ? 'Downloading...' : 'Download Insurance Interest List'}
                </button>
              </div>

              {/* Work Interest Download */}
              <div className="bg-white shadow-sm rounded-lg border border-amber-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-50 rounded-lg mr-3">
                      <WorkIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Work Interest List</h3>
                      <p className="text-sm text-gray-500">{workInterestedCount} members interested</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Download list of members who are willing to work in the organization.
                </p>
                <button
                  onClick={downloadWorkInterestList}
                  disabled={downloading || workInterestedCount === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium shadow-sm"
                >
                  <DownloadIcon />
                  {downloading ? 'Downloading...' : 'Download Work Interest List'}
                </button>
              </div>
            </div>

            {/* No reminders message */}
            {expiryReminders.length === 0 && insuranceInterestedCount === 0 && workInterestedCount === 0 && (
              <div className="bg-white shadow-sm rounded-lg border border-amber-200 p-12 text-center">
                <BellIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No reminders or interests found</p>
                <p className="text-gray-400 text-sm">All insurance policies are up to date</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Reminders;
