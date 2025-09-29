import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabase/config';
import { ChevronLeft, Calendar, CreditCard, CheckCircle, X } from 'lucide-react';

const Payment = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    dateOfJoining: new Date().toISOString().split('T')[0], // Today's date by default
    membershipId: '',
    payingMembershipAmount: '',
    membershipType: '',
    paymentStatus: 'due', // 'paid' or 'due'
    dueAmount: '',
    passportImageUrl: '',
    signatureImageBase64: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentMemberPhone, setCurrentMemberPhone] = useState('');

  useEffect(() => {
    const phone = localStorage.getItem('currentMemberPhone') || '';
    setCurrentMemberPhone(phone);
  }, []);

  useEffect(() => {
    const loadExisting = async () => {
      if (!currentMemberPhone) return;
      try {
        const { data, error } = await supabase
          .from('members')
          .select('payment, payment_date_of_joining, payment_membership_id, payment_paying_membership_amount, payment_membership_type, payment_status, payment_due_amount, payment_passport_image_url, payment_signature_image_base64')
          .eq('phone_no', currentMemberPhone)
          .single();
        if (error && error.code !== 'PGRST116') {
          console.error('Failed to load existing payment data:', error);
        } else if (data) {
          const nested = data.payment || {};
          setFormData(prev => ({
            ...prev,
            dateOfJoining: data.payment_date_of_joining || nested.dateOfJoining || prev.dateOfJoining,
            membershipId: data.payment_membership_id || nested.membershipId || prev.membershipId,
            payingMembershipAmount: data.payment_paying_membership_amount || nested.payingMembershipAmount || prev.payingMembershipAmount,
            membershipType: data.payment_membership_type || nested.membershipType || prev.membershipType,
            paymentStatus: data.payment_status || nested.paymentStatus || prev.paymentStatus,
            dueAmount: data.payment_due_amount || nested.dueAmount || '',
            passportImageUrl: data.payment_passport_image_url || nested.passportImageUrl || '',
            signatureImageBase64: data.payment_signature_image_base64 || nested.signatureImageBase64 || '',
            notes: nested.notes || prev.notes,
          }));
        }
      } catch (e) {
        console.error('Failed to load existing payment data:', e);
      }
    };
    loadExisting();
  }, [currentMemberPhone]);

  // Generate unique membership ID based on year and sequential order
  useEffect(() => {
    const generateMembershipId = async () => {
      if (!formData.dateOfJoining || !currentMemberPhone) return;
      // Do not auto-generate if user already has provided/edited an ID
      if (formData.membershipId && formData.membershipId.trim() !== '') return;
      
      try {
        // Check if this member already has a membership ID
        const { data: existing, error: loadErr } = await supabase
          .from('members')
          .select('payment_membership_id, payment')
          .eq('phone_no', currentMemberPhone)
          .single();
        if (!loadErr && (existing?.payment_membership_id || existing?.payment?.membershipId)) {
          setFormData(prev => ({
            ...prev,
            membershipId: existing.payment_membership_id || existing.payment.membershipId
          }));
          return;
        }

        // Extract year from joining date
        const joiningDate = new Date(formData.dateOfJoining);
        const year = joiningDate.getFullYear();
        
        // Get ALL membership IDs to find the highest number for this year
        const { data: rows, error: listErr } = await supabase
          .from('members')
          .select('payment');
        let maxNumberForYear = 0;
        if (!listErr && Array.isArray(rows)) {
          rows.forEach(r => {
            const membershipId = r?.payment?.membershipId;
            if (membershipId) {
              const match = membershipId.match(/^(\d{4})-(\d{3})$/);
              if (match) {
                const idYear = parseInt(match[1]);
                const idNumber = parseInt(match[2]);
                if (idYear === year) {
                  maxNumberForYear = Math.max(maxNumberForYear, idNumber);
                }
              }
            }
          });
        }
        
        // Generate the next sequential number for this year
        const nextNumber = maxNumberForYear + 1;
        
        // Format: YYYY-XXX (e.g., 2025-001, 2025-002, 2026-001, etc.)
        const membershipId = `${year}-${nextNumber.toString().padStart(3, '0')}`;
        
        setFormData(prev => ({
          ...prev,
          membershipId
        }));
        
      } catch (error) {
        console.error('Error generating membership ID:', error);
        // Fallback: use year-based ID with timestamp
        const joiningDate = new Date(formData.dateOfJoining);
        const year = joiningDate.getFullYear();
        const timestamp = Date.now();
        const fallbackId = `${year}-${timestamp.toString().slice(-3)}`;
        
        setFormData(prev => ({
          ...prev,
          membershipId: fallbackId
        }));
      }
    };

    generateMembershipId();
  }, [formData.dateOfJoining, currentMemberPhone, formData.membershipId]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Convert image files to base64 for storage (signature only)
  const handleImageToBase64 = (file, cbField) => {
    if (!file) {
      setFormData(prev => ({ ...prev, [cbField]: '' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString() || '';
      setFormData(prev => ({ ...prev, [cbField]: result }));
    };
    reader.onerror = () => {
      setFormData(prev => ({ ...prev, [cbField]: '' }));
    };
    reader.readAsDataURL(file);
  };

  // Upload passport image to Supabase Storage (max 1MB)
  const handleUploadPassport = async (file) => {
    if (!file) {
      setFormData(prev => ({ ...prev, passportImageUrl: '' }));
      return;
    }
    if (file.size > 1024 * 1024) {
      setErrors(prev => ({ ...prev, submit: 'Passport image exceeds 1 MB limit' }));
      return;
    }
    try {
      const ext = (file.name?.split('.')?.pop() || 'jpg').toLowerCase();
      const phone = currentMemberPhone || 'unknown';
      const path = `${phone}/passport_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('passportpic').upload(path, file, {
        cacheControl: '3600', upsert: true, contentType: file.type || 'image/jpeg'
      });
      if (upErr) {
        setErrors(prev => ({ ...prev, submit: upErr.message || 'Failed to upload passport image' }));
        return;
      }
      const { data } = supabase.storage.from('passportpic').getPublicUrl(path);
      const publicUrl = data?.publicUrl || '';
      setFormData(prev => ({ ...prev, passportImageUrl: publicUrl }));
    } catch (e) {
      setErrors(prev => ({ ...prev, submit: 'Failed to upload passport image' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.payingMembershipAmount.trim()) {
      newErrors.payingMembershipAmount = 'Membership amount is required';
    }
    
    if (!formData.membershipType.trim()) {
      newErrors.membershipType = 'Membership type is required';
    }
    if (formData.paymentStatus === 'due' && !String(formData.dueAmount).trim()) {
      newErrors.dueAmount = 'Enter due amount';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveToSupabase = async () => {
    if (!currentMemberPhone) return { ok: false, reason: 'MISSING_PHONE' };
    try {
      // Ensure person exists (created in Personal step) to satisfy NOT NULL columns like name
      const { data: exists, error: fetchErr } = await supabase
        .from('members')
        .select('id')
        .eq('phone_no', currentMemberPhone)
        .single();
      if (fetchErr && fetchErr.code === 'PGRST116') {
        return { ok: false, reason: 'Personal details not found. Please save Personal step first.' };
      }
      if (fetchErr) {
        return { ok: false, reason: fetchErr.message || 'Lookup failed' };
      }

      const payload = {
        phone_no: currentMemberPhone,
        // Separate top-level columns
        payment_date_of_joining: formData.dateOfJoining,
        payment_membership_id: formData.membershipId,
        payment_paying_membership_amount: formData.payingMembershipAmount,
        payment_membership_type: formData.membershipType,
        payment_status: formData.paymentStatus,
        payment_due_amount: formData.paymentStatus === 'due' ? (formData.dueAmount || '') : '',
        payment_passport_image_url: formData.passportImageUrl || '',
        payment_signature_image_base64: formData.signatureImageBase64 || '',
        // Legacy nested copy for backward compatibility
        payment: {
          dateOfJoining: formData.dateOfJoining,
          membershipId: formData.membershipId,
          payingMembershipAmount: formData.payingMembershipAmount,
          membershipType: formData.membershipType,
          paymentStatus: formData.paymentStatus,
          dueAmount: formData.paymentStatus === 'due' ? (formData.dueAmount || '') : '',
          passportImageUrl: formData.passportImageUrl || '',
          signatureImageBase64: formData.signatureImageBase64 || '',
          notes: formData.notes
        },
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      };
      const { error } = await supabase
        .from('members')
        .update(payload)
        .eq('phone_no', currentMemberPhone);
      if (error) {
        console.error('Error saving payment to Supabase:', error);
        return { ok: false, reason: error.message || 'SUPABASE' };
      }

      // Auto-invest into Company Account for registration + due amounts
      try {
        const regAmount = parseFloat(formData.payingMembershipAmount || 0) || 0;
        const dueAmount = formData.paymentStatus === 'due' ? (parseFloat(formData.dueAmount || 0) || 0) : 0;
        const totalToInvest = regAmount + dueAmount;
        if (totalToInvest > 0) {
          const now = new Date();
          const yr = now.getFullYear();
          const mon = now.toLocaleString('default', { month: 'short' });

          // Get current share price for this month
          const { data: priceRow } = await supabase
            .from('share_prices')
            .select('price')
            .eq('year', yr)
            .eq('month', mon)
            .single();
          const price = priceRow?.price ? parseFloat(priceRow.price) : 0;
          if (price > 0) {
            const shares = totalToInvest / price;

            // Find Company Account member by Member-ID 2025-002 (top-level or legacy nested)
            const { data: company } = await supabase
              .from('members')
              .select('id, name, activities, total_shares, payment, payment_membership_id')
              .or('payment_membership_id.eq.2025-002,payment->>membershipId.eq.2025-002')
              .maybeSingle();

            if (company?.id) {
              // Insert transaction record
              await supabase
                .from('company_transactions')
                .insert({
                  member_id: company.id,
                  member_name: company.name || 'Company Account',
                  membership_id: '2025-002',
                  type: 'investment',
                  amount: totalToInvest,
                  fine: dueAmount,
                  year: yr,
                  month: mon,
                  custom_receipt: `AUTO-${Date.now()}`,
                  share_price: price,
                  shares,
                  created_at: new Date().toISOString(),
                  description: `Auto-invest registration (${mon} ${yr})`
                });

              // Merge into activities for company member
              const currentActivities = company.activities || {};
              const monthExisting = currentActivities?.[yr]?.[mon] || {};
              const existingInv = monthExisting.investment || null;
              const mergedInvestment = existingInv ? {
                ...existingInv,
                amount: (parseFloat(existingInv.amount || 0) || 0) + totalToInvest,
                fine: (parseFloat(existingInv.fine || 0) || 0) + dueAmount,
                shares: (parseFloat(existingInv.shares || 0) || 0) + shares,
                sharePrice: price,
              } : {
                type: 'investment', amount: totalToInvest, fine: dueAmount, shares, sharePrice: price, customReceipt: `AUTO-${Date.now()}`, createdAt: new Date().toISOString()
              };
              const updatedActivities = {
                ...currentActivities,
                [yr]: {
                  ...currentActivities[yr],
                  [mon]: { ...monthExisting, investment: mergedInvestment }
                }
              };

              // Recompute total shares
              let totalShares = 0;
              Object.values(updatedActivities).forEach((monthsMap) => {
                Object.values(monthsMap || {}).forEach((entry) => {
                  const inv = entry?.investment; const wd = entry?.withdrawal;
                  if (inv?.shares) totalShares += parseFloat(inv.shares) || 0;
                  if (wd?.shares) totalShares -= parseFloat(wd.shares) || 0;
                });
              });

              await supabase
                .from('members')
                .update({ activities: updatedActivities, total_shares: totalShares })
                .eq('id', company.id);
            }
          }
        }
      } catch (autoErr) {
        console.error('Auto-invest company account failed:', autoErr);
      }

      return { ok: true };
    } catch (e) {
      console.error('Error saving payment to Supabase:', e);
      return { ok: false, reason: e.message || 'SUPABASE' };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    if (!currentMemberPhone) {
      setErrors(prev => ({
        ...prev,
        submit: 'No member selected. Please fill Personal details first.'
      }));
      return;
    }

    setIsSubmitting(true);
    const result = await saveToSupabase();
    setIsSubmitting(false);

    if (result.ok) {
      setShowSuccess(true);
    } else if (result.reason === 'MISSING_PHONE') {
      setErrors(prev => ({ 
        ...prev, 
        submit: 'Missing member phone. Go back and save Personal details.' 
      }));
    } else {
      setErrors(prev => ({ 
        ...prev, 
        submit: result.reason || 'Failed to save data. Please try again.' 
      }));
    }
  };

  const handleGoToDashboard = () => {
    // Clear localStorage to prevent data persistence
    localStorage.removeItem('currentMemberPhone');
    navigate('/admin');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-yellow-50 to-yellow-100 flex items-start justify-center py-10">
      <div className="relative w-full max-w-4xl mx-4 md:mx-6 lg:mx-12 bg-white/85 backdrop-blur-sm rounded-2xl shadow-2xl border border-yellow-200 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-yellow-200 sticky top-0 bg-white/75 backdrop-blur-sm z-20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-700 text-white shadow-md">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-yellow-800">Membership Payment</h1>
              <p className="text-xs md:text-sm text-yellow-600">Complete the membership registration</p>
            </div>
          </div>

          <div className="hidden md:flex items-center bg-yellow-50 rounded-lg px-3 py-2 shadow-sm text-sm border border-yellow-200">
            <div className="text-yellow-500">Personal</div>
            <div className="mx-2 text-yellow-400">•</div>
            <div className="text-yellow-500">Insurance</div>
            <div className="mx-2 text-yellow-400">•</div>
            <div className="flex items-center mr-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 text-white flex items-center justify-center text-sm font-medium">3</div>
              <div className="ml-2 text-sm font-medium text-yellow-700">Payment</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="p-6 md:p-8 lg:p-10 space-y-6">
          {/* Date of Joining */}
          <div className="p-6 rounded-xl border border-yellow-200 shadow-sm bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-yellow-800 flex items-center">
                <span className="mr-2 p-2 rounded-md bg-yellow-50 text-yellow-700">
                  <Calendar className="w-4 h-4" />
                </span>
                Membership Details
              </h2>
              <p className="text-xs text-yellow-500">Registration information</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-yellow-800 mb-1">Date of Joining</label>
                <input
                  type="date"
                  value={formData.dateOfJoining}
                  onChange={(e) => handleInputChange('dateOfJoining', e.target.value)}
                  className="w-full px-3 py-2 border border-yellow-300 rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-yellow-800 mb-1">Membership ID</label>
                <input
                  type="text"
                  value={formData.membershipId}
                  onChange={(e) => handleInputChange('membershipId', e.target.value)}
                  className="w-full px-3 py-2 border border-yellow-300 rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none"
                  placeholder="Auto-generated or enter manually"
                />
                <p className="text-xs text-gray-500 mt-1">You can edit this ID if needed. If left empty, it will auto-generate in format YYYY-XXX (e.g., 2025-001).</p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="p-6 rounded-xl border border-yellow-200 shadow-sm bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-yellow-800 flex items-center">
                <span className="mr-2 p-2 rounded-md bg-yellow-50 text-yellow-700">
                  <CreditCard className="w-4 h-4" />
                </span>
                Payment Information
              </h2>
              <p className="text-xs text-yellow-500">Membership fees & status</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-yellow-800 mb-1">Paying Membership Amount *</label>
                <input
                  type="number"
                  value={formData.payingMembershipAmount}
                  onChange={(e) => handleInputChange('payingMembershipAmount', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors.payingMembershipAmount ? 'border-red-400' : 'border-yellow-300'}`}
                  placeholder="Enter amount"
                  min="0"
                />
                {errors.payingMembershipAmount && <span className="text-xs text-red-500">{errors.payingMembershipAmount}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-yellow-800 mb-1">Membership Type *</label>
                <select
                  value={formData.membershipType}
                  onChange={(e) => handleInputChange('membershipType', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors.membershipType ? 'border-red-400' : 'border-yellow-300'}`}
                >
                  <option value="">Select Membership Type</option>
                  <option value="Class-A">Class-A</option>
                  <option value="Class-B">Class-B</option>
                  <option value="Class-C">Class-C</option>
                </select>
                {errors.membershipType && <span className="text-xs text-red-500">{errors.membershipType}</span>}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-yellow-800 mb-2">Payment Status</label>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center cursor-pointer select-none">
                  <input
                    type="radio"
                    name="paymentStatus"
                    value="paid"
                    checked={formData.paymentStatus === 'paid'}
                    onChange={() => handleInputChange('paymentStatus', 'paid')}
                    className="w-4 h-4 text-yellow-600 accent-yellow-600"
                  />
                  <span className="ml-2 text-sm font-medium text-green-600">Paid</span>
                </label>
                <label className="flex items-center cursor-pointer select-none">
                  <input
                    type="radio"
                    name="paymentStatus"
                    value="due"
                    checked={formData.paymentStatus === 'due'}
                    onChange={() => handleInputChange('paymentStatus', 'due')}
                    className="w-4 h-4 text-yellow-600 accent-yellow-600"
                  />
                  <span className="ml-2 text-sm font-medium text-red-600">Due</span>
                </label>
                {formData.paymentStatus === 'due' && (
                  <input
                    type="number"
                    value={formData.dueAmount}
                    onChange={(e) => handleInputChange('dueAmount', e.target.value)}
                    placeholder="Enter how much amount due"
                    className="px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-200 outline-none"
                    min="0"
                  />
                )}
              </div>
            </div>

            {/* Image uploads */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-yellow-800 mb-1">Passport size image (max 1 MB)</label>
                <input type="file" accept="image/*" onChange={(e) => handleUploadPassport(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-700" />
                {formData.passportImageUrl && (
                  <img alt="passport" src={formData.passportImageUrl} className="mt-2 h-20 w-20 object-cover rounded" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-yellow-800 mb-1">Signature image</label>
                <input type="file" accept="image/*" onChange={(e) => handleImageToBase64(e.target.files?.[0] || null, 'signatureImageBase64')} className="block w-full text-sm text-slate-700" />
                {formData.signatureImageBase64 && (
                  <img alt="signature" src={formData.signatureImageBase64} className="mt-2 h-20 w-20 object-contain bg-white border border-yellow-200 rounded" />
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="p-6 rounded-xl border border-yellow-200 shadow-sm bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-yellow-800">Additional Notes</h2>
              <p className="text-xs text-yellow-500">Optional information</p>
            </div>
            
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              placeholder="Write any additional notes or comments here..."
              className="w-full px-3 py-2 border border-yellow-300 rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none resize-none"
            />
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Bottom actions */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/insurance')}
              className="flex items-center text-yellow-800 hover:text-yellow-900 bg-white border border-yellow-300 rounded-lg px-4 py-2 shadow-sm transition"
            >
              <ChevronLeft className="w-5 h-5 mr-2" /> Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition transform hover:-translate-y-0.5 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Processing...' : 'Confirm & Complete'}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl transform animate-bounce-in">
            {/* Success Icon */}
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            
            {/* Success Message */}
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
            <p className="text-gray-600 mb-6">
              Member registration completed successfully. The member has been added to the system.
            </p>
            
            {/* Membership ID Display */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800 font-medium">Membership ID</p>
              <p className="text-lg font-bold text-green-900">{formData.membershipId}</p>
            </div>
            
            {/* Action Button */}
            <button
              onClick={handleGoToDashboard}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition transform hover:-translate-y-0.5"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payment;