import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabase/config';
import { ChevronRight, TrendingUp, DollarSign, X } from 'lucide-react';

const Financial = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        presentSharePrice: '',
        updatedSharePrice: '',
        dividendPerShare: '',
        notes: ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentMemberPhone, setCurrentMemberPhone] = useState('');

    useEffect(() => {
        const phone = localStorage.getItem('currentMemberPhone') || '';
        setCurrentMemberPhone(phone);
        console.log('Financial component loaded with phone:', phone);
    }, []);

    // Load existing financial data if returning to this step
    useEffect(() => {
        const loadExisting = async () => {
            if (!currentMemberPhone) return;
            try {
                const { data, error } = await supabase
                    .from('members')
                    .select('financial')
                    .eq('phone_no', currentMemberPhone)
                    .single();
                if (error && error.code !== 'PGRST116') {
                    console.error('Failed to load existing financial data:', error);
                } else if (data && data.financial) {
                    setFormData(prev => ({
                        ...prev,
                        ...data.financial
                    }));
                }
            } catch (e) {
                console.error('Failed to load existing financial data:', e);
            }
        };
        loadExisting();
    }, [currentMemberPhone]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};
        
        // Required fields validation
        if (!formData.presentSharePrice.trim()) {
            newErrors.presentSharePrice = 'Present share price is required';
        }
        if (!formData.updatedSharePrice.trim()) {
            newErrors.updatedSharePrice = 'Updated share price is required';
        }
        if (!formData.dividendPerShare.trim()) {
            newErrors.dividendPerShare = 'Dividend per share is required';
        }
        
        // Numeric validation
        if (formData.presentSharePrice && (isNaN(parseFloat(formData.presentSharePrice)) || parseFloat(formData.presentSharePrice) < 0)) {
            newErrors.presentSharePrice = 'Please enter a valid positive number';
        }
        if (formData.updatedSharePrice && (isNaN(parseFloat(formData.updatedSharePrice)) || parseFloat(formData.updatedSharePrice) < 0)) {
            newErrors.updatedSharePrice = 'Please enter a valid positive number';
        }
        if (formData.dividendPerShare && (isNaN(parseFloat(formData.dividendPerShare)) || parseFloat(formData.dividendPerShare) < 0)) {
            newErrors.dividendPerShare = 'Please enter a valid positive number';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const saveToSupabase = async () => {
        try {
            let phoneToUse = currentMemberPhone;
            
            console.log('Current phone before processing:', phoneToUse);
            
            if (!phoneToUse) {
                // Generate a temporary phone number for new members
                phoneToUse = `temp_${Date.now()}`;
                localStorage.setItem('currentMemberPhone', phoneToUse);
                setCurrentMemberPhone(phoneToUse);
                console.log('Generated new temp phone:', phoneToUse);
            }
            
            // Ensure the phone number is valid (at least 10 digits or temp format)
            if (!phoneToUse || (phoneToUse.length < 10 && !phoneToUse.startsWith('temp_'))) {
                console.error('Invalid phone number format:', phoneToUse);
                return false;
            }
            
            const updatePayload = {
                phone_no: phoneToUse,
                financial: {
                    presentSharePrice: formData.presentSharePrice,
                    updatedSharePrice: formData.updatedSharePrice,
                    dividendPerShare: formData.dividendPerShare,
                    notes: formData.notes
                },
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('members')
                .upsert(updatePayload, { onConflict: 'phone_no', ignoreDuplicates: false });
            if (error) {
                console.error('Error saving to Supabase:', error);
                return false;
            }
            console.log('Financial data saved successfully to Supabase');
            return true;
        } catch (error) {
            console.error('Error saving to Supabase:', error);
            return false;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) {
            // Scroll to first error
            const firstErrorKey = Object.keys(errors)[0];
            if (firstErrorKey) {
                const el = document.querySelector(`[name="${firstErrorKey}"]`);
                if (el && el.scrollIntoView) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            return;
        }

        setIsSubmitting(true);
        
        try {
            const saveSuccess = await saveToSupabase();
            if (saveSuccess) {
                navigate('/personal');
            } else {
                setErrors({ submit: 'Failed to save data. Please try again.' });
            }
        } catch (error) {
            console.error('Error during submission:', error);
            setErrors({ submit: 'An error occurred. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-white via-yellow-50 to-yellow-100 flex items-start justify-center py-10">
            {/* Card container */}
            <div className="relative w-full max-w-6xl mx-4 md:mx-6 lg:mx-12 bg-white/85 backdrop-blur-sm rounded-2xl shadow-2xl border border-yellow-200 overflow-hidden">
                {/* Top bar with close button */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-yellow-200 sticky top-0 bg-white/75 backdrop-blur-sm z-20">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-700 text-white shadow-md">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-2xl font-bold text-yellow-800">Financial Indicators</h1>
                            <p className="text-xs md:text-sm text-yellow-600">Key financial metrics for the organization</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {/* Sticky progress mini */}
                        <div className="hidden md:flex items-center bg-yellow-50 rounded-lg px-3 py-2 shadow-sm text-sm border border-yellow-200">
                            <div className="flex items-center mr-3">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 text-white flex items-center justify-center text-sm font-medium">1</div>
                                <div className="ml-2 text-sm font-medium text-yellow-700">Financial</div>
                            </div>
                            <div className="mx-2 text-yellow-400">•</div>
                            <div className="text-yellow-500">Personal</div>
                            <div className="mx-2 text-yellow-400">•</div>
                            <div className="text-yellow-500">Insurance</div>
                            <div className="mx-2 text-yellow-400">•</div>
                            <div className="text-yellow-500">Payment</div>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={() => navigate('/admin')}
                            className="group flex items-center justify-center w-10 h-10 rounded-full bg-white border border-yellow-200 shadow-sm hover:bg-red-50 hover:border-red-200 transition-all"
                            title="Close and go to Admin"
                        >
                            <X className="w-5 h-5 text-yellow-700 group-hover:text-red-600 transition-colors" />
                        </button>
                    </div>
                </div>

                {/* Main content area */}
                <form
                    onSubmit={handleSubmit}
                    autoComplete="off"
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 md:p-8 lg:p-10"
                >
                    {/* Left column — overview / side info */}
                    <aside className="lg:col-span-1 sticky top-24 self-start">
                        <div className="p-4 rounded-xl border border-yellow-200 shadow-sm bg-gradient-to-b from-white to-yellow-50">
                            <h3 className="text-sm font-semibold text-yellow-800 mb-2">Quick Tips</h3>
                            <ul className="text-xs text-yellow-700 space-y-2 list-disc ml-4">
                                <li>All financial fields are required</li>
                                <li>Enter values in the appropriate currency</li>
                                <li>Share prices should be current market values</li>
                                <li>Dividend per share is typically quarterly</li>
                            </ul>
                        </div>

                        <div className="mt-5 p-4 rounded-xl border border-yellow-200 shadow-sm bg-white">
                            <h4 className="text-sm font-semibold text-yellow-800 mb-2">Progress</h4>
                            <div className="w-full bg-yellow-100 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all"
                                    style={{ width: '25%' }}
                                />
                            </div>
                            <p className="text-xs text-yellow-600 mt-2">Step 1 of 4</p>
                        </div>
                    </aside>

                    {/* Middle column — main form */}
                    <section className="lg:col-span-2 space-y-6">
                        {/* Financial Indicators */}
                        <div className="p-6 rounded-xl border border-yellow-200 shadow-sm bg-white transition-transform transform hover:-translate-y-0.5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-yellow-800 flex items-center">
                                    <span className="mr-2 p-2 rounded-md bg-yellow-50 text-yellow-700">
                                        <DollarSign className="w-4 h-4" />
                                    </span>
                                    Key Financial Indicators
                                </h2>
                                <p className="text-xs text-yellow-500">Company financial metrics</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-yellow-800 mb-1">
                                        Present Share Price (Quarterly) *
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <DollarSign className="h-5 w-5 text-yellow-400" />
                                        </div>
                                        <input
                                            name="presentSharePrice"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.presentSharePrice}
                                            onChange={e => handleInputChange('presentSharePrice', e.target.value)}
                                            className={`w-full pl-10 pr-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors.presentSharePrice ? 'border-red-400' : 'border-yellow-300'}`}
                                            placeholder="Enter current share price"
                                        />
                                    </div>
                                    {errors.presentSharePrice && <span className="text-xs text-red-500">{errors.presentSharePrice}</span>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-yellow-800 mb-1">
                                        Updated Share Price *
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <TrendingUp className="h-5 w-5 text-yellow-400" />
                                        </div>
                                        <input
                                            name="updatedSharePrice"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.updatedSharePrice}
                                            onChange={e => handleInputChange('updatedSharePrice', e.target.value)}
                                            className={`w-full pl-10 pr-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors.updatedSharePrice ? 'border-red-400' : 'border-yellow-300'}`}
                                            placeholder="Enter updated share price"
                                        />
                                    </div>
                                    {errors.updatedSharePrice && <span className="text-xs text-red-500">{errors.updatedSharePrice}</span>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-yellow-800 mb-1">
                                        Dividend Per Share (Quarterly) *
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <DollarSign className="h-5 w-5 text-yellow-400" />
                                        </div>
                                        <input
                                            name="dividendPerShare"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.dividendPerShare}
                                            onChange={e => handleInputChange('dividendPerShare', e.target.value)}
                                            className={`w-full pl-10 pr-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors.dividendPerShare ? 'border-red-400' : 'border-yellow-300'}`}
                                            placeholder="Enter dividend per share"
                                        />
                                    </div>
                                    {errors.dividendPerShare && <span className="text-xs text-red-500">{errors.dividendPerShare}</span>}
                                </div>
                            </div>

                            {/* Additional Notes */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-yellow-800 mb-1">
                                    Additional Notes (Optional)
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={e => handleInputChange('notes', e.target.value)}
                                    rows={3}
                                    placeholder="Any additional financial notes or comments..."
                                    className="w-full px-3 py-2 border border-yellow-300 rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none resize-none"
                                />
                            </div>
                        </div>

                        {/* Error message for submission */}
                        {errors.submit && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-600 text-sm">{errors.submit}</p>
                            </div>
                        )}

                        {/* Bottom area with Next button */}
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`flex items-center bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition transform hover:-translate-y-0.5 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isSubmitting ? 'Saving...' : 'Save & Next'}
                                <ChevronRight className="w-5 h-5 ml-2" />
                            </button>
                        </div>
                    </section>
                </form>
            </div>
        </div>
    );
};

export default Financial;
