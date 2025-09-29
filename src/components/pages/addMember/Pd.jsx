import React, { useState, useEffect } from 'react';
import { ChevronRight, User, Users, Heart, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabase/config';

const PersonalDetailsForm = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        relation: '',
        age: '',
        gender: '',
        maritalStatus: '',
        bloodGroup: '',
        occupation: '',
        specialization: '',
        address: '',
        phoneNo: '',
        email: '',
        totalMembers: '',
        familyMembers: [
            { name: '', age: '', education: '', work: '' },
            { name: '', age: '', education: '', work: '' },
            { name: '', age: '', education: '', work: '' },
            { name: '', age: '', education: '', work: '' }
        ],
        nominees: ['', '', '']
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Note: Do not clear localStorage or reset form on mount.
    // If returning from later steps, we want to load previously saved data below.

    // Fetch member data from Supabase
    useEffect(() => {
        const phone = localStorage.getItem('currentMemberPhone');
        if (!phone) return;
        const fetchMember = async () => {
            try {
                const { data, error } = await supabase
                    .from('members')
                    .select('*')
                    .eq('phone_no', phone)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                    console.error('Failed to load personal details:', error);
                } else if (data) {
                    setFormData(prev => ({
                        ...prev,
                        ...data
                    }));
                }
            } catch (e) {
                console.error('Failed to load personal details:', e);
            }
        };
        fetchMember();
    }, []);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleFamilyMemberChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            familyMembers: prev.familyMembers.map((member, i) =>
                i === index ? { ...member, [field]: value } : member
            )
        }));
    };

    const handleNomineeChange = (index, value) => {
        setFormData(prev => ({
            ...prev,
            nominees: prev.nominees.map((nominee, i) =>
                i === index ? value : nominee
            )
        }));
    };

    const validate = () => {
        const newErrors = {};
        
        // Required fields validation
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.relation.trim()) newErrors.relation = 'Relation is required';
        if (!formData.age) newErrors.age = 'Age is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.maritalStatus) newErrors.maritalStatus = 'Marital status is required';
        // Blood group is optional
        if (!formData.occupation.trim()) newErrors.occupation = 'Occupation is required';
        if (!formData.specialization.trim()) newErrors.specialization = 'Specialization is required';
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.phoneNo.trim()) newErrors.phoneNo = 'Phone number is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.totalMembers) newErrors.totalMembers = 'Total members is required';
        
        // Phone number validation
        if (formData.phoneNo && !/^\d{10,}$/.test(formData.phoneNo)) {
            newErrors.phoneNo = 'Enter valid phone number (minimum 10 digits)';
        }
        
        // Email validation
        if (formData.email && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) {
            newErrors.email = 'Enter valid email address';
        }
        
        // Age validation
        if (formData.age && (parseInt(formData.age) < 1 || parseInt(formData.age) > 120)) {
            newErrors.age = 'Age must be between 1 and 120';
        }
        
        // Total members validation
        if (formData.totalMembers && (parseInt(formData.totalMembers) < 1)) {
            newErrors.totalMembers = 'Total members must be at least 1';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const saveToSupabase = async () => {
        try {
            // Prepare data for Supabase
            const supabaseData = {
                phone_no: formData.phoneNo,
                name: formData.name,
                email: formData.email,
                address: formData.address,
                age: parseInt(formData.age) || null,
                gender: formData.gender,
                marital_status: formData.maritalStatus,
                blood_group: formData.bloodGroup,
                occupation: formData.occupation,
                specialization: formData.specialization,
                relation: formData.relation,
                total_members: parseInt(formData.totalMembers) || null,
                family_members: formData.familyMembers.filter(member => 
                    member.name.trim() || member.age || member.education.trim() || member.work.trim()
                ),
                nominees: formData.nominees.filter(nominee => nominee.trim()),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from('members')
                .upsert(supabaseData, { 
                    onConflict: 'phone_no',
                    ignoreDuplicates: false 
                });

            if (error) {
                console.error('Error saving to Supabase:', error);
                return false;
            }
            
            console.log('Member data saved successfully to Supabase');
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

        // Uniqueness check for phone number
        try {
            const existingPhone = localStorage.getItem('currentMemberPhone') || '';
            const targetPhone = formData.phoneNo;
            if (!existingPhone || existingPhone !== targetPhone) {
                const { data: existingMember, error: checkError } = await supabase
                    .from('members')
                    .select('phone_no')
                    .eq('phone_no', targetPhone)
                    .single();

                if (checkError && checkError.code !== 'PGRST116') {
                    console.error('Error checking phone uniqueness:', checkError);
                    setErrors(prev => ({ ...prev, submit: 'Unable to verify phone number uniqueness. Please try again.' }));
                    return;
                }

                if (existingMember) {
                    setErrors(prev => ({
                        ...prev,
                        phoneNo: 'A member with this mobile number already exists. Please use a different mobile number.'
                    }));
                    // Focus/scroll to phone field
                    const el = document.querySelector('[name="phoneNo"]');
                    if (el && el.scrollIntoView) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    return;
                }
            }
        } catch (checkErr) {
            console.error('Error checking phone uniqueness:', checkErr);
            setErrors(prev => ({ ...prev, submit: 'Unable to verify phone number uniqueness. Please try again.' }));
            return;
        }

        setIsSubmitting(true);
        
        try {
            const saveSuccess = await saveToSupabase();
            if (saveSuccess) {
                localStorage.setItem('currentMemberPhone', formData.phoneNo);
                navigate('/insurance');
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
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-2xl font-bold text-yellow-800">Personal Information</h1>
                            <p className="text-xs md:text-sm text-yellow-600">Fill in the member's personal & family details</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {/* Sticky progress mini */}
                        <div className="hidden md:flex items-center bg-yellow-50 rounded-lg px-3 py-2 shadow-sm text-sm border border-yellow-200">
                            <div className="flex items-center mr-3">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 text-white flex items-center justify-center text-sm font-medium">1</div>
                                <div className="ml-2 text-sm font-medium text-yellow-700">Personal</div>
                            </div>
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
                                <li>All fields marked with * are required</li>
                                <li>Use valid phone & email to get policy related updates</li>
                                <li>Family members details are optional</li>
                                <li>Data will be saved using your phone number as ID</li>
                            </ul>
                        </div>

                        <div className="mt-5 p-4 rounded-xl border border-yellow-200 shadow-sm bg-white">
                            <h4 className="text-sm font-semibold text-yellow-800 mb-2">Progress</h4>
                            <div className="w-full bg-yellow-100 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all"
                                    style={{ width: '33%' }}
                                />
                            </div>
                            <p className="text-xs text-yellow-600 mt-2">Step 1 of 3</p>
                        </div>
                    </aside>

                    {/* Middle column — main form */}
                    <section className="lg:col-span-2 space-y-6">
                        {/* Basic Info */}
                        <div className="p-6 rounded-xl border border-yellow-200 shadow-sm bg-white transition-transform transform hover:-translate-y-0.5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-yellow-800 flex items-center">
                                    <span className="mr-2 p-2 rounded-md bg-yellow-50 text-yellow-700"><User className="w-4 h-4" /></span>
                                    Basic Information
                                </h2>
                                <p className="text-xs text-yellow-500">Personal & contact</p>
                            </div>
                            
                            {/*Name, s/o/d/o/m/o and Age*/}
                            <div className="flex gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-yellow-800 mb-1">Name *</label>
                                    <input
                                        name="name"
                                        type="text"
                                        value={formData.name}
                                        onChange={e => handleInputChange('name', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors.name ? 'border-red-400' : 'border-yellow-300'}`}
                                        placeholder="Full name"
                                    />
                                    {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-yellow-800 mb-1">S/O / D/O / M/O *</label>
                                    <input
                                        name="relation"
                                        type="text"
                                        value={formData.relation}
                                        onChange={e => handleInputChange('relation', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors.relation ? 'border-red-400' : 'border-yellow-300'}`}
                                        placeholder="Father/Mother name"
                                    />
                                    {errors.relation && <span className="text-xs text-red-500">{errors.relation}</span>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-yellow-800 mb-1">Age *</label>
                                    <input
                                        name="age"
                                        type="number"
                                        value={formData.age}
                                        onChange={e => handleInputChange('age', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors.age ? 'border-red-400' : 'border-yellow-300'}`}
                                        placeholder="Age"
                                        min={1}
                                        max={120}
                                    />
                                    {errors.age && <span className="text-xs text-red-500">{errors.age}</span>}
                                </div>
                            </div>
                            
                            {/*phone and email and total members*/}
                            <div className='flex gap-4 mb-6'>
                               <div>
  <label className="block text-sm font-medium text-yellow-800 mb-1">
    Phone Number *
  </label>
  <input
    name="phoneNo"
    type="tel"
    value={formData.phoneNo}
    onChange={e => {
      const value = e.target.value.replace(/\D/g, ''); // remove non-digits
      if (value.length <= 10) {
        handleInputChange('phoneNo', value);
      }
    }}
    placeholder="Phone Number"
    maxLength={10}
    pattern="[0-9]{10}"
    className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${
      errors.phoneNo ? 'border-red-400' : 'border-yellow-300'
    }`}
  />
  {errors.phoneNo && (
    <span className="text-xs text-red-500">{errors.phoneNo}</span>
  )}
</div>


                                <div>
                                    <label className="block text-sm font-medium text-yellow-800 mb-1">Email *</label>
                                    <input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={e => handleInputChange('email', e.target.value)}
                                        placeholder="Email"
                                        className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors.email ? 'border-red-400' : 'border-yellow-300'}`}
                                    />
                                    {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-yellow-800 mb-1">Total Members in the family *</label>
                                    <input
                                        name="totalMembers"
                                        type="number"
                                        value={formData.totalMembers}
                                        onChange={e => handleInputChange('totalMembers', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors.totalMembers ? 'border-red-400' : 'border-yellow-300'}`}
                                        placeholder="Total count"
                                        min={1}
                                    />
                                    {errors.totalMembers && <span className="text-xs text-red-500">{errors.totalMembers}</span>}
                                </div>
                            </div>
                            
                            {/*blood group and occupation and specialization */}
                            <div className='flex gap-4 mb-6'>
                                <div>
                                    <label className="block text-sm font-medium text-yellow-800 mb-1">Blood Group</label>
                                    <select
                                        name="bloodGroup"
                                        value={formData.bloodGroup}
                                        onChange={e => handleInputChange('bloodGroup', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors.bloodGroup ? 'border-red-400' : 'border-yellow-300'}`}
                                    >
                                        <option value="">Select Blood Group</option>
                                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                            <option key={bg} value={bg}>{bg}</option>
                                        ))}
                                    </select>
                                    {errors.bloodGroup && <span className="text-xs text-red-500">{errors.bloodGroup}</span>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-yellow-800 mb-1">Occupation *</label>
                                    <input
                                        name="occupation"
                                        type="text"
                                        value={formData.occupation}
                                        onChange={e => handleInputChange('occupation', e.target.value)}
                                        placeholder="Occupation"
                                        className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors.occupation ? 'border-red-400' : 'border-yellow-300'}`}
                                    />
                                    {errors.occupation && <span className="text-xs text-red-500">{errors.occupation}</span>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-yellow-800 mb-1">Specialization *</label>
                                    <input
                                        name="specialization"
                                        type="text"
                                        value={formData.specialization}
                                        onChange={e => handleInputChange('specialization', e.target.value)}
                                        placeholder="Specialization"
                                        className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors.specialization ? 'border-red-400' : 'border-yellow-300'}`}
                                    />
                                    {errors.specialization && <span className="text-xs text-red-500">{errors.specialization}</span>}
                                </div>
                            </div>
                            
                            {/* Gender & Marital */}
                            <div className="flex flex-wrap justify-between mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-yellow-800 mb-1">Gender *</label>
                                    <div className="flex space-x-4">
                                        {['MALE', 'FEMALE', 'OTHERS'].map(gender => (
                                            <label key={gender} className="flex items-center cursor-pointer select-none">
                                                <input
                                                    name="gender"
                                                    type="radio"
                                                    value={gender}
                                                    checked={formData.gender === gender}
                                                    onChange={() => handleInputChange('gender', gender)}
                                                    className="w-4 h-4 text-yellow-600 accent-yellow-600"
                                                />
                                                <span className="ml-2 text-sm text-yellow-800 hover:text-yellow-900 transition">{gender}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {errors.gender && <span className="text-xs text-red-500">{errors.gender}</span>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-yellow-800 mb-1">Marital Status *</label>
                                    <div className="flex space-x-4">
                                        {['MARRIED', 'UNMARRIED'].map(status => (
                                            <label key={status} className="flex items-center cursor-pointer select-none">
                                                <input
                                                    name="maritalStatus"
                                                    type="radio"
                                                    value={status}
                                                    checked={formData.maritalStatus === status}
                                                    onChange={() => handleInputChange('maritalStatus', status)}
                                                    className="w-4 h-4 text-yellow-600 accent-yellow-600"
                                                />
                                                <span className="ml-2 text-sm text-yellow-800 hover:text-yellow-900 transition">{status}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {errors.maritalStatus && <span className="text-xs text-red-500">{errors.maritalStatus}</span>}
                                </div>
                            </div>
                            
                            {/* Address */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-yellow-800 mb-1">Address *</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={e => handleInputChange('address', e.target.value)}
                                    rows={4}
                                    placeholder="Address"
                                    className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors.address ? 'border-red-400' : 'border-yellow-300'}`}
                                />
                                {errors.address && <span className="text-xs text-red-500">{errors.address}</span>}
                            </div>
                            
                            {/* Family Members */}
                            <div className="mt-6">
                                <div className="flex items-center mb-4">
                                    <Users className="w-5 h-5 text-yellow-700 mr-2" />
                                    <h3 className="text-xl font-semibold text-yellow-800">Family Members Details (Optional)</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {formData.familyMembers.map((member, i) => (
                                        <div key={i} className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 hover:shadow-md transition">
                                            <h4 className="mb-3 font-semibold text-yellow-800 flex items-center">
                                                <span className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2">{i + 1}</span>
                                                Member {i + 1}
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="Name"
                                                    value={member.name}
                                                    onChange={e => handleFamilyMemberChange(i, 'name', e.target.value)}
                                                    className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-100 outline-none"
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Age"
                                                    value={member.age}
                                                    onChange={e => handleFamilyMemberChange(i, 'age', e.target.value)}
                                                    className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-100 outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Education"
                                                    value={member.education}
                                                    onChange={e => handleFamilyMemberChange(i, 'education', e.target.value)}
                                                    className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-100 outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Work"
                                                    value={member.work}
                                                    onChange={e => handleFamilyMemberChange(i, 'work', e.target.value)}
                                                    className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-100 outline-none"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Nominees */}
                            <div className="mt-8">
                                <div className="flex items-center mb-4">
                                    <Heart className="w-5 h-5 text-red-500 mr-2" />
                                    <h3 className="text-xl font-semibold text-yellow-800">Nominee Details (Optional)</h3>
                                </div>

                                <div className="space-y-4">
                                    {formData.nominees.map((nominee, i) => (
                                        <input
                                            key={i}
                                            type="text"
                                            value={nominee}
                                            onChange={e => handleNomineeChange(i, e.target.value)}
                                            placeholder={`Nominee ${i + 1}`}
                                            className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-100 outline-none transition"
                                        />
                                    ))}
                                </div>
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

export default PersonalDetailsForm;