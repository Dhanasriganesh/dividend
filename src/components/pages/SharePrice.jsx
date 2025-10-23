import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/config';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Icons
const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const SharePrice = () => {
  const [sharePrices, setSharePrices] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'short' }));
  const [price, setPrice] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingPrice, setEditingPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Financial Indicators section state (moved from Financial.jsx)
  const [fiUpdatedPrice, setFiUpdatedPrice] = useState('');

  useEffect(() => {
    const fetchSharePrices = async () => {
      const { data, error } = await supabase
        .from('share_prices')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) {
        console.error('Error fetching share prices:', error);
      } else {
        // Sort by year desc, then by month desc locally
        const sortedData = (data || []).sort((a, b) => {
          if (a.year !== b.year) {
            return b.year - a.year;
          }
          const monthOrder = ['Dec', 'Nov', 'Oct', 'Sep', 'Aug', 'Jul', 'Jun', 'May', 'Apr', 'Mar', 'Feb', 'Jan'];
          return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month);
        });
        setSharePrices(sortedData);
      }
    };

    fetchSharePrices();

    // Set up real-time subscription
    const subscription = supabase
      .channel('share_prices_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'share_prices' },
        () => {
          fetchSharePrices(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // When month/year changes, initialize Financial Indicators inputs from existing entry
  useEffect(() => {
    const existing = sharePrices.find(sp => sp.year === year && sp.month === month);
    const present = existing?.price ? existing.price.toString() : '';
    setFiUpdatedPrice(present);
  }, [year, month, sharePrices]);

  const handleAddSharePrice = async (e) => {
    e.preventDefault();
    if (!price.trim() || !year || !month) return;
    
    setLoading(true);
    try {
      // Check if share price already exists for this year and month
      const existingPrice = sharePrices.find(sp => sp.year === year && sp.month === month);
      if (existingPrice) {
        alert('Share price already exists for this month and year');
        setLoading(false);
        return;
      }

      // Generate quarter string based on month for backward compatibility
      const getQuarterFromMonth = (monthName) => {
        const monthIndex = months.indexOf(monthName);
        if (monthIndex === -1) return `${monthName}-${year}`;
        
        const quarterStartMonth = Math.floor(monthIndex / 3) * 3;
        const quarterEndMonth = quarterStartMonth + 2;
        const startMonthName = months[quarterStartMonth];
        const endMonthName = months[quarterEndMonth];
        
        return `${startMonthName}-${endMonthName}-${year}`;
      };

      const quarter = getQuarterFromMonth(month);

      const { error } = await supabase
        .from('share_prices')
        .insert({
          year: parseInt(year),
          month,
          quarter: quarter,
          price: parseFloat(price),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error adding share price:', error);
        alert('Error adding share price: ' + error.message);
      } else {
        setPrice('');
        alert('✅ Share price added successfully!');
      }
    } catch (err) {
      console.error('Error adding share price:', err);
      alert('Error adding share price');
    }
    setLoading(false);
  };

  const handleSaveFinancial = async () => {
    if (!year || !month) return;
    setLoading(true);
    try {
      // Generate quarter string based on month for backward compatibility
      const getQuarterFromMonth = (monthName, yearNum) => {
        const monthIndex = months.indexOf(monthName);
        if (monthIndex === -1) return `${monthName}-${yearNum}`;
        
        const quarterStartMonth = Math.floor(monthIndex / 3) * 3;
        const quarterEndMonth = quarterStartMonth + 2;
        const startMonthName = months[quarterStartMonth];
        const endMonthName = months[quarterEndMonth];
        
        return `${startMonthName}-${endMonthName}-${yearNum}`;
      };

      const quarter = getQuarterFromMonth(month, year);
      
      const existing = sharePrices.find(sp => sp.year === year && sp.month === month);
      if (existing) {
        const { error } = await supabase
          .from('share_prices')
          .update({
            price: fiUpdatedPrice ? parseFloat(fiUpdatedPrice) : existing.price,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (error) {
          alert('Error updating share price: ' + error.message);
        } else {
          alert('✅ Share price updated successfully!');
        }
      } else {
        const { error } = await supabase
          .from('share_prices')
          .insert({
            year: parseInt(year),
            month,
            quarter: quarter,
            price: fiUpdatedPrice ? parseFloat(fiUpdatedPrice) : 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        if (error) {
          alert('Error creating share price: ' + error.message);
        } else {
          alert('✅ Share price created successfully!');
        }
      }
    } catch (e) {
      alert('Error saving share price');
    }
    setLoading(false);
  };

  const handleEdit = (sharePrice) => {
    setEditingId(sharePrice.id);
    setEditingPrice(sharePrice.price.toString());
  };

  const handleUpdate = async (id) => {
    if (!editingPrice.trim()) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('share_prices')
        .update({
          price: parseFloat(editingPrice),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating share price:', error);
        alert('Error updating share price: ' + error.message);
      } else {
        setEditingId(null);
        setEditingPrice('');
      }
    } catch (err) {
      console.error('Error updating share price:', err);
      alert('Error updating share price');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this share price?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('share_prices')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting share price:', error);
        alert('Error deleting share price: ' + error.message);
      }
    } catch (err) {
      console.error('Error deleting share price:', err);
      alert('Error deleting share price');
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

  const yearsOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

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
                <h1 className="text-xl font-bold text-gray-900">Monthly Share Price</h1>
                <p className="text-sm text-gray-500">Set and manage share prices for each month</p>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Update Existing Month Section */}
        <div className="bg-white shadow-sm rounded-lg border border-amber-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Existing Month Price</h2>
          <p className="text-sm text-gray-600 mb-4">Select a month to view or update its share price</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Share Price</label>
              <input
                type="text"
                value={(sharePrices.find(sp => sp.year === year && sp.month === month)?.price ?? '') === '' ? 'Not Set' : `₹${(sharePrices.find(sp => sp.year === year && sp.month === month)?.price || 0).toFixed(2)}`}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-amber-50 font-semibold"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Updated Share Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fiUpdatedPrice}
                onChange={(e) => setFiUpdatedPrice(e.target.value)}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm"
                placeholder="Enter new share price"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveFinancial}
              disabled={loading || !fiUpdatedPrice}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg font-medium text-sm shadow-sm"
            >
              <SaveIcon />
              {loading ? 'Saving...' : 'Update Price'}
            </button>
          </div>
        </div>
        {/* Add New Share Price Form */}
        <div className="bg-white shadow-sm rounded-lg border border-amber-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Monthly Share Price</h2>
          <p className="text-sm text-gray-600 mb-4">Set share price for a specific month and year</p>
          <form onSubmit={handleAddSharePrice} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              >
                {yearsOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              >
                {months.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter share price"
                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg font-medium text-sm shadow-sm"
              >
                <SaveIcon />
                {loading ? 'Adding...' : 'Add Price'}
              </button>
            </div>
          </form>
        </div>

        {/* Share Prices List */}
        <div className="bg-white shadow-sm rounded-lg border border-amber-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-200">
            <h2 className="text-lg font-semibold text-gray-900">Share Prices History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-amber-100 text-sm">
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Year</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Month</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Price (₹)</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Created</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {sharePrices.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No share prices added yet
                    </td>
                  </tr>
                ) : (
                  sharePrices.map((sharePrice) => (
                    <tr key={sharePrice.id} className="hover:bg-amber-50">
                      <td className="px-6 py-4 text-gray-900 font-medium">{sharePrice.year}</td>
                      <td className="px-6 py-4 text-gray-700">{sharePrice.month}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {editingId === sharePrice.id ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingPrice}
                            onChange={(e) => setEditingPrice(e.target.value)}
                            className="w-24 px-2 py-1 border border-amber-300 rounded text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            autoFocus
                          />
                        ) : (
                          `₹${sharePrice.price.toFixed(2)}`
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {sharePrice.created_at
                          ? new Date(sharePrice.created_at).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {editingId === sharePrice.id ? (
                            <>
                              <button
                                onClick={() => handleUpdate(sharePrice.id)}
                                disabled={loading}
                                className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                                title="Save"
                              >
                                <SaveIcon />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingPrice('');
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(sharePrice)}
                                className="p-1 text-blue-600 hover:text-blue-700"
                                title="Edit"
                              >
                                <EditIcon />
                              </button>
                              <button
                                onClick={() => handleDelete(sharePrice.id)}
                                disabled={loading}
                                className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                                title="Delete"
                              >
                                <DeleteIcon />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SharePrice;
