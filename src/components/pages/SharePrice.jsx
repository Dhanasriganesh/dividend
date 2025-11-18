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

const quarters = [
  { value: 'Q1', label: 'Q1 (January, February, March)', months: ['Jan', 'Feb', 'Mar'] },
  { value: 'Q2', label: 'Q2 (April, May, June)', months: ['Apr', 'May', 'Jun'] },
  { value: 'Q3', label: 'Q3 (July, August, September)', months: ['Jul', 'Aug', 'Sep'] },
  { value: 'Q4', label: 'Q4 (October, November, December)', months: ['Oct', 'Nov', 'Dec'] }
];

const SharePrice = () => {
  const [sharePrices, setSharePrices] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState('Q1');
  const [price, setPrice] = useState('');
  const [editingQuarter, setEditingQuarter] = useState(null);
  const [editingPrice, setEditingPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

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
        // Group by quarter and year
        const groupedData = groupByQuarter(data || []);
        setSharePrices(groupedData);
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

  // Group share prices by quarter and year
  const groupByQuarter = (prices) => {
    const grouped = {};
    
    prices.forEach(price => {
      const quarterKey = getQuarterFromMonth(price.month);
      const key = `${price.year}-${quarterKey}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          year: price.year,
          quarter: quarterKey,
          price: price.price,
          months: quarters.find(q => q.value === quarterKey)?.months || [],
          ids: []
        };
      }
      
      // Store all IDs for this quarter
      if (!grouped[key].ids.includes(price.id)) {
        grouped[key].ids.push(price.id);
      }
      
      // Update price (should be same for all months in quarter)
      grouped[key].price = price.price;
    });
    
    return Object.values(grouped).sort((a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year;
      }
      const quarterOrder = ['Q4', 'Q3', 'Q2', 'Q1'];
      return quarterOrder.indexOf(b.quarter) - quarterOrder.indexOf(a.quarter);
    });
  };

  // Get quarter from month
  const getQuarterFromMonth = (month) => {
    const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month);
    if (monthIndex === -1) return 'Q1';
    return quarters[Math.floor(monthIndex / 3)].value;
  };

  // Get months for a quarter
  const getMonthsForQuarter = (quarterValue) => {
    const quarterData = quarters.find(q => q.value === quarterValue);
    return quarterData ? quarterData.months : [];
  };


  // Handle Add Share Price
  const handleAddSharePrice = async (e) => {
    e.preventDefault();
    if (!price.trim() || !year || !quarter) return;
    
    setLoading(true);
    try {
      // Check if share price already exists for this quarter and year
      const months = getMonthsForQuarter(quarter);
      const checkPromises = months.map(month => 
        supabase
          .from('share_prices')
          .select('id')
          .eq('year', year)
          .eq('month', month)
          .maybeSingle()
      );
      
      const checkResults = await Promise.all(checkPromises);
      const existing = checkResults.find(result => result.data !== null);
      
      if (existing && existing.data) {
        alert('Share price already exists for this quarter and year. Please edit the existing entry.');
        setLoading(false);
        return;
      }

      // Insert 3 records (one for each month in the quarter)
      // Generate quarter string for backward compatibility (format: "Jan-Mar-2025")
      // If there's a unique constraint on (year, quarter), we need unique values
      // So we'll use format: "Jan-Mar-2025" for all months, but handle constraint if it exists
      const quarterString = `${months[0]}-${months[2]}-${year}`;
      
      // Insert all 3 months in a single batch insert for better reliability
      // Try with same quarter value first - if unique constraint exists, it will fail and we'll handle it
      const recordsToInsert = months.map(month => ({
        year: parseInt(year),
        month: month,
        quarter: quarterString, // Required NOT NULL field - same value for all 3 months
        price: parseFloat(price),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Try batch insert first
      let { data, error } = await supabase
        .from('share_prices')
        .insert(recordsToInsert)
        .select();

      // If unique constraint on (year, quarter) exists, insert one by one with unique quarter values
      if (error && error.message && error.message.includes('share_prices_year_quarter_key')) {
        console.warn('Unique constraint on (year, quarter) detected. Inserting with unique quarter values per month.');
        
        // Insert one by one with month-specific quarter values to avoid constraint violation
        const insertResults = [];
        for (const month of months) {
          const { data: insertData, error: insertError } = await supabase
            .from('share_prices')
            .insert({
              year: parseInt(year),
              month: month,
              quarter: `${month}-${quarterString}`, // Make it unique by including month
              price: parseFloat(price),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (insertError) {
            insertResults.push({ error: insertError });
          } else {
            insertResults.push({ data: insertData });
          }
        }
        
        const errors = insertResults.filter(r => r.error);
        if (errors.length > 0) {
          console.error('Error adding share prices:', errors);
          alert('Error adding share price: ' + errors[0].error.message);
        } else {
          data = insertResults.map(r => r.data).filter(Boolean);
          error = null;
        }
      }

      if (error) {
        console.error('Error adding share prices:', error);
        alert('Error adding share price: ' + error.message);
      } else {
        // Verify all 3 months were inserted
        if (data && data.length === 3) {
          setPrice('');
          alert('✅ Share price added successfully for ' + quarters.find(q => q.value === quarter)?.label + '!');
        } else if (data && data.length > 0) {
          console.warn('Not all months were inserted. Expected 3, got:', data.length);
          alert('⚠️ Share price partially added. Please check and edit if needed.');
        } else {
          alert('⚠️ Share price could not be added. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error adding share price:', err);
      alert('Error adding share price');
    }
    setLoading(false);
  };

  // Handle Edit
  const handleEdit = (quarterData) => {
    setEditingQuarter(quarterData);
    setEditingPrice(quarterData.price.toString());
  };

  // Handle Update
  const handleUpdate = async () => {
    if (!editingPrice.trim() || !editingQuarter) return;
    
    setLoading(true);
    try {
      // Update all 3 months for this quarter
      const { error } = await supabase
        .from('share_prices')
        .update({
          price: parseFloat(editingPrice),
          updated_at: new Date().toISOString()
        })
        .in('id', editingQuarter.ids);

      if (error) {
        console.error('Error updating share price:', error);
        alert('Error updating share price: ' + error.message);
      } else {
        setEditingQuarter(null);
        setEditingPrice('');
        alert('✅ Share price updated successfully!');
      }
    } catch (err) {
      console.error('Error updating share price:', err);
      alert('Error updating share price');
    }
    setLoading(false);
  };

  // Handle Delete
  const handleDelete = async (quarterData) => {
    if (!window.confirm(`Are you sure you want to delete share price for ${quarterData.quarter} ${quarterData.year}? This will delete prices for all 3 months in this quarter.`)) return;
    
    setLoading(true);
    try {
      // Delete all 3 months for this quarter
      const { error } = await supabase
        .from('share_prices')
        .delete()
        .in('id', quarterData.ids);

      if (error) {
        console.error('Error deleting share price:', error);
        alert('Error deleting share price: ' + error.message);
      } else {
        alert('✅ Share price deleted successfully!');
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
                <h1 className="text-xl font-bold text-gray-900">Quarterly Share Price</h1>
                <p className="text-sm text-gray-500">Set and manage share prices for each quarter</p>
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
        {/* Add New Share Price Form */}
        <div className="bg-white shadow-sm rounded-lg border border-amber-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Quarterly Share Price</h2>
          <p className="text-sm text-gray-600 mb-4">Set share price for a specific quarter and year. The price will apply to all 3 months in the quarter.</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Quarter</label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              >
                {quarters.map(q => (
                  <option key={q.value} value={q.value}>{q.label}</option>
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
            <p className="text-sm text-gray-600 mt-1">Prices are set quarterly and apply to all 3 months in each quarter</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-amber-100 text-sm">
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Year</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Quarter</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Months</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Price (₹)</th>
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
                  sharePrices.map((quarterData) => (
                    <tr key={`${quarterData.year}-${quarterData.quarter}`} className="hover:bg-amber-50">
                      <td className="px-6 py-4 text-gray-900 font-medium">{quarterData.year}</td>
                      <td className="px-6 py-4 text-gray-700 font-semibold">{quarterData.quarter}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {quarterData.months.join(', ')}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {editingQuarter && editingQuarter.year === quarterData.year && editingQuarter.quarter === quarterData.quarter ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingPrice}
                            onChange={(e) => setEditingPrice(e.target.value)}
                            className="w-32 px-2 py-1 border border-amber-300 rounded text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            autoFocus
                          />
                        ) : (
                          `₹${quarterData.price.toFixed(2)}`
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {editingQuarter && editingQuarter.year === quarterData.year && editingQuarter.quarter === quarterData.quarter ? (
                            <>
                              <button
                                onClick={handleUpdate}
                                disabled={loading}
                                className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                                title="Save"
                              >
                                <SaveIcon />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingQuarter(null);
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
                                onClick={() => handleEdit(quarterData)}
                                className="p-1 text-blue-600 hover:text-blue-700"
                                title="Edit"
                              >
                                <EditIcon />
                              </button>
                              <button
                                onClick={() => handleDelete(quarterData)}
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
