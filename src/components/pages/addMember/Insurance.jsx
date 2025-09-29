import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabase/config';
import { ChevronLeft, ChevronRight, Shield, ClipboardList } from 'lucide-react';

// Move SectionCard outside to prevent re-creation on each render
const SectionCard = React.memo(({ title, sectionKey, data, errors, setSectionEnabled, setSectionType, setSectionField, setReminder }) => (
  <div className="p-6 rounded-xl border border-yellow-200 shadow-sm bg-white transition-transform transform hover:-translate-y-0.5">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-yellow-800 flex items-center">
        <span className="mr-2 p-2 rounded-md bg-yellow-50 text-yellow-700"><Shield className="w-4 h-4" /></span>
        {title}
      </h2>
      <p className="text-xs text-yellow-500">Coverage Details</p>
    </div>

    <div className="mb-4">
      <label className="block text-sm font-medium text-yellow-800 mb-1">Do you have this insurance? *</label>
      <div className="flex space-x-6">
        {['YES','NO'].map(val => (
          <label key={val} className="flex items-center cursor-pointer select-none">
            <input
              type="radio"
              name={`${sectionKey}-enabled`}
              value={val}
              checked={data.enabled === val}
              onChange={() => setSectionEnabled(sectionKey, val)}
              className="w-4 h-4 text-yellow-600 accent-yellow-600"
            />
            <span className="ml-2 text-sm text-yellow-800 hover:text-yellow-900 transition">{val === 'YES' ? 'Yes' : 'No'}</span>
          </label>
        ))}
      </div>
      {errors[`${sectionKey}.enabled`] && <span className="text-xs text-red-500">{errors[`${sectionKey}.enabled`]}</span>}
    </div>

    {data.enabled === 'NO' && (
      <div className="mb-4">
        <label className="block text-sm font-medium text-yellow-800 mb-1">Do you want this insurance?</label>
        <div className="flex space-x-6">
          {['YES','NO'].map(val => (
            <label key={val} className="flex items-center cursor-pointer select-none">
              <input
                type="radio"
                name={`${sectionKey}-want`}
                value={val}
                checked={data.wantInsurance === val}
                onChange={() => setSectionField(sectionKey,'wantInsurance', val)}
                className="w-4 h-4 text-yellow-600 accent-yellow-600"
              />
              <span className="ml-2 text-sm text-yellow-800 hover:text-yellow-900 transition">{val === 'YES' ? 'Yes' : 'No'}</span>
            </label>
          ))}
        </div>
      </div>
    )}

    {data.enabled === 'YES' && (
      <>
        <div className="mb-4">
          <label className="block text-sm font-medium text-yellow-800 mb-1">Type (select all that apply) *</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center"><input type="checkbox" className="mr-2 accent-yellow-600" checked={data.types.individualOwn} onChange={(e) => setSectionType(sectionKey,'individualOwn', e.target.checked)} />Individual (own)</label>
            <label className="flex items-center"><input type="checkbox" className="mr-2 accent-yellow-600" checked={data.types.individualCompany} onChange={(e) => setSectionType(sectionKey,'individualCompany', e.target.checked)} />Individual company offered</label>
            <label className="flex items-center"><input type="checkbox" className="mr-2 accent-yellow-600" checked={data.types.groupInstitution} onChange={(e) => setSectionType(sectionKey,'groupInstitution', e.target.checked)} />Group (Institutions)</label>
            <label className="flex items-center"><input type="checkbox" className="mr-2 accent-yellow-600" checked={data.types.groupCompany} onChange={(e) => setSectionType(sectionKey,'groupCompany', e.target.checked)} />Group company offered</label>
          </div>
          {errors[`${sectionKey}.types`] && <span className="text-xs text-red-500">{errors[`${sectionKey}.types`]}</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-yellow-800 mb-1">Company name and plan *</label>
            <input type="text" value={data.companyPlan} onChange={(e) => setSectionField(sectionKey,'companyPlan', e.target.value)} className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors[`${sectionKey}.companyPlan`] ? 'border-red-400' : 'border-yellow-300'}`} placeholder="e.g., ABC Health - Gold" />
            {errors[`${sectionKey}.companyPlan`] && <span className="text-xs text-red-500">{errors[`${sectionKey}.companyPlan`]}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-yellow-800 mb-1">Premium amount *</label>
            <input
              type="number"
              value={data.premiumAmount}
              onChange={e => setSectionField(sectionKey, 'premiumAmount', e.target.value)}
              step="any"
              min="0"
              className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors[`${sectionKey}.premiumAmount`] ? 'border-red-400' : 'border-yellow-300'}`}
              placeholder="e.g., 12000"
            />
            {errors[`${sectionKey}.premiumAmount`] && <span className="text-xs text-red-500">{errors[`${sectionKey}.premiumAmount`]}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-yellow-800 mb-1">Number of members covered *</label>
            <input
              type="number"
              value={data.membersCovered}
              onChange={e => setSectionField(sectionKey, 'membersCovered', e.target.value)}
              step="any"
              min="0"
              className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors[`${sectionKey}.membersCovered`] ? 'border-red-400' : 'border-yellow-300'}`}
              placeholder="e.g., 4"
            />
            {errors[`${sectionKey}.membersCovered`] && <span className="text-xs text-red-500">{errors[`${sectionKey}.membersCovered`]}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-yellow-800 mb-1">Sum insured *</label>
            <input
              type="number"
              value={data.sumInsured}
              onChange={e => setSectionField(sectionKey, 'sumInsured', e.target.value)}
              step="any"
              min="0"
              className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors[`${sectionKey}.sumInsured`] ? 'border-red-400' : 'border-yellow-300'}`}
              placeholder="e.g., 500000"
            />
            {errors[`${sectionKey}.sumInsured`] && <span className="text-xs text-red-500">{errors[`${sectionKey}.sumInsured`]}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-yellow-800 mb-1">Policy Anniversary date *</label>
            <input type="date" value={data.policyAnniversaryDate} onChange={(e) => setSectionField(sectionKey,'policyAnniversaryDate', e.target.value)} className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors[`${sectionKey}.policyAnniversaryDate`] ? 'border-red-400' : 'border-yellow-300'}`} />
            {errors[`${sectionKey}.policyAnniversaryDate`] && <span className="text-xs text-red-500">{errors[`${sectionKey}.policyAnniversaryDate`]}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-yellow-800 mb-1">Reminder *</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center"><input type="checkbox" className="mr-2 accent-yellow-600" checked={data.reminders.before2Months} onChange={(e) => setReminder(sectionKey,'before2Months', e.target.checked)} />Before 2 months</label>
              <label className="flex items-center"><input type="checkbox" className="mr-2 accent-yellow-600" checked={data.reminders.before1Month} onChange={(e) => setReminder(sectionKey,'before1Month', e.target.checked)} />Before 1 month</label>
            </div>
            {errors[`${sectionKey}.reminders`] && <span className="text-xs text-red-500">{errors[`${sectionKey}.reminders`]}</span>}
          </div>
        </div>

        <div className="mb-2">
          <label className="block text-sm font-medium text-yellow-800 mb-1">Notes</label>
          <textarea value={data.notes} onChange={(e) => setSectionField(sectionKey,'notes', e.target.value)} rows={3} placeholder="Any notes..." className="w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none border-yellow-300" />
        </div>
      </>
    )}
  </div>
));

function Insurance() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    health: {
      enabled: '', // 'YES' | 'NO' | ''
      types: {
        individualOwn: false,
        individualCompany: false,
        groupInstitution: false,
        groupCompany: false,
      },
      wantInsurance: '',
      companyPlan: '',
      premiumAmount: '',
      membersCovered: '',
      sumInsured: '',
      policyAnniversaryDate: '', // yyyy-mm-dd
      reminders: {
        before2Months: false,
        before1Month: false,
      },
      notes: '',
    },
    accidental: {
      enabled: '',
      types: {
        individualOwn: false,
        individualCompany: false,
        groupInstitution: false,
        groupCompany: false,
      },
      wantInsurance: '',
      companyPlan: '',
      premiumAmount: '',
      membersCovered: '',
      sumInsured: '',
      policyAnniversaryDate: '',
      reminders: {
        before2Months: false,
        before1Month: false,
      },
      notes: '',
    },
    termLife: {
      enabled: '',
      types: {
        individualOwn: false,
        individualCompany: false,
        groupInstitution: false,
        groupCompany: false,
      },
      wantInsurance: '',
      companyPlan: '',
      premiumAmount: '',
      membersCovered: '',
      sumInsured: '',
      policyAnniversaryDate: '',
      reminders: {
        before2Months: false,
        before1Month: false,
      },
      notes: '',
    },
    willingToWork: '', // 'YES' | 'NO' | ''
    willingWorkerDetails: {
      name: '',
      phone: '',
    },
    reference: {
      name: '',
      phone: '',
      registrationId: '',
    },
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentMemberPhone, setCurrentMemberPhone] = useState('');
  const [willingSaveLoading, setWillingSaveLoading] = useState(false);
  const [willingSaved, setWillingSaved] = useState(false);

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
          .select('health_insurance, accidental_insurance, term_life_insurance, willing_to_work, willing_worker_details, insurance_reference, insurance')
          .eq('phone_no', currentMemberPhone)
          .single();
        if (error && error.code !== 'PGRST116') {
          console.error('Failed to load existing insurance data:', error);
        } else if (data) {
          const ins = data.insurance || {};
          setFormData(prev => ({
            ...prev,
            health: { ...prev.health, ...(data.health_insurance || ins.health || {}) },
            accidental: { ...prev.accidental, ...(data.accidental_insurance || ins.accidental || {}) },
            termLife: { ...prev.termLife, ...(data.term_life_insurance || ins.termLife || {}) },
            willingToWork: data.willing_to_work || ins.willingToWork || prev.willingToWork,
            willingWorkerDetails: { ...prev.willingWorkerDetails, ...(data.willing_worker_details || ins.willingWorkerDetails || {}) },
            reference: { ...prev.reference, ...(data.insurance_reference || ins.reference || {}) },
          }));
        }
      } catch (e) {
        console.error('Failed to load existing insurance data:', e);
      }
    };
    loadExisting();
  }, [currentMemberPhone]);

  const setSectionEnabled = useCallback((section, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        enabled: value,
      },
    }));
    setErrors(prev => {
      if (prev[`${section}.enabled`]) {
        const newErrors = { ...prev };
        delete newErrors[`${section}.enabled`];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const setSectionType = useCallback((section, typeKey, checked) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        types: {
          ...prev[section].types,
          [typeKey]: checked,
        },
      },
    }));
  }, []);

  const setSectionField = useCallback((section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setErrors(prev => {
      if (prev[`${section}.${field}`]) {
        const newErrors = { ...prev };
        delete newErrors[`${section}.${field}`];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const setReminder = useCallback((section, field, checked) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        reminders: {
          ...prev[section].reminders,
          [field]: checked,
        },
      },
    }));
  }, []);

  const setReferenceField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      reference: {
        ...prev.reference,
        [field]: value,
      },
    }));
    setErrors(prev => {
      if (prev[`reference.${field}`]) {
        const newErrors = { ...prev };
        delete newErrors[`reference.${field}`];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const validateSection = (sectionKey, section) => {
    const newErrors = {};
    if (section.enabled === 'YES') {
      const anyType = Object.values(section.types).some(Boolean);
      if (!anyType) newErrors[`${sectionKey}.types`] = 'Select at least one type';
      if (!section.companyPlan.trim()) newErrors[`${sectionKey}.companyPlan`] = 'Required';
      if (!section.premiumAmount.trim()) newErrors[`${sectionKey}.premiumAmount`] = 'Required';
      if (!section.membersCovered.trim()) newErrors[`${sectionKey}.membersCovered`] = 'Required';
      if (!section.sumInsured.trim()) newErrors[`${sectionKey}.sumInsured`] = 'Required';
      if (!section.policyAnniversaryDate) newErrors[`${sectionKey}.policyAnniversaryDate`] = 'Required';
      if (!section.reminders.before2Months && !section.reminders.before1Month) {
        newErrors[`${sectionKey}.reminders`] = 'Select at least one reminder';
      }
    } else if (section.enabled === '') {
      newErrors[`${sectionKey}.enabled`] = 'Please choose Yes or No';
    }
    return newErrors;
  };

  const validate = () => {
    let newErrors = {};

    newErrors = { ...newErrors, ...validateSection('health', formData.health) };
    newErrors = { ...newErrors, ...validateSection('accidental', formData.accidental) };
    newErrors = { ...newErrors, ...validateSection('termLife', formData.termLife) };

    if (!formData.willingToWork) newErrors['willingToWork'] = 'Please choose Yes or No';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveToSupabase = async () => {
    if (!currentMemberPhone) return { ok: false, reason: 'MISSING_PHONE' };
    try {
      // Ensure the member row (created in Personal step) exists to satisfy NOT NULL (name)
      const { data: existing, error: fetchErr } = await supabase
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
        // New separate storage (preferred)
        health_insurance: formData.health,
        accidental_insurance: formData.accidental,
        term_life_insurance: formData.termLife,
        willing_to_work: formData.willingToWork,
        willing_worker_details: formData.willingWorkerDetails,
        insurance_reference: formData.reference,
        // Keep legacy nested field updated for backward compatibility
        insurance: {
          health: formData.health,
          accidental: formData.accidental,
          termLife: formData.termLife,
          willingToWork: formData.willingToWork,
          willingWorkerDetails: formData.willingWorkerDetails,
          reference: formData.reference,
        },
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('members')
        .update(payload)
        .eq('phone_no', currentMemberPhone);
      if (error) {
        console.error('Error saving insurance to Supabase:', error);
        return { ok: false, reason: error.message || 'SUPABASE' };
      }
      return { ok: true };
    } catch (e) {
      console.error('Error saving insurance to Supabase:', e);
      return { ok: false, reason: e.message || 'SUPABASE' };
    }
  };

  const handleSaveWillingWorker = async () => {
    if (!currentMemberPhone) return;
    const { name, phone } = formData.willingWorkerDetails || {};
    if (!name?.trim() || !phone?.trim()) return;
    try {
      setWillingSaveLoading(true);
      setWillingSaved(false);
      // Update only if row exists
      const { error: fetchErr } = await supabase
        .from('members')
        .select('id')
        .eq('phone_no', currentMemberPhone)
        .single();
      if (fetchErr) return;

      const payload = {
        phone_no: currentMemberPhone,
        willing_to_work: formData.willingToWork,
        willing_worker_details: { name, phone },
        insurance: {
          health: formData.health,
          accidental: formData.accidental,
          termLife: formData.termLife,
          willingToWork: formData.willingToWork,
          willingWorkerDetails: { name, phone },
          reference: formData.reference,
        },
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('members').update(payload).eq('phone_no', currentMemberPhone);
      if (!error) {
        setWillingSaved(true);
      }
    } catch (e) {
      // ignore here; main save handles errors
    } finally {
      setWillingSaveLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;
    if (!currentMemberPhone) {
      setErrors(prev => ({
        ...prev,
        submit: 'No member selected. Please fill Personal details first.',
      }));
      return;
    }

    setIsSubmitting(true);
    const result = await saveToSupabase();
    setIsSubmitting(false);

    if (result.ok) {
      navigate('/payment');
    } else if (result.reason === 'MISSING_PHONE') {
      setErrors(prev => ({ ...prev, submit: 'Missing member phone. Go back and save Personal details.' }));
    } else {
      setErrors(prev => ({ ...prev, submit: result.reason || 'Failed to save data. Please try again.' }));
    }
  };

  const handleWillingToWorkChange = useCallback((val) => {
    setFormData(prev => ({ ...prev, willingToWork: val }));
    setErrors(prev => {
      if (prev['willingToWork']) {
        const newErrors = { ...prev };
        delete newErrors['willingToWork'];
        return newErrors;
      }
      return prev;
    });
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-yellow-50 to-yellow-100 flex items-start justify-center py-10">
      <div className="relative w-full max-w-6xl mx-4 md:mx-6 lg:mx-12 bg-white/85 backdrop-blur-sm rounded-2xl shadow-2xl border border-yellow-200 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-yellow-200 sticky top-0 bg-white/75 backdrop-blur-sm z-20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-700 text-white shadow-md">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-yellow-800">Insurance Details</h1>
              <p className="text-xs md:text-sm text-yellow-600">Provide your insurance coverages</p>
            </div>
          </div>

            <div className="hidden md:flex items-center bg-yellow-50 rounded-lg px-3 py-2 shadow-sm text-sm border border-yellow-200">
            <div className="text-yellow-500">Personal</div>
            <div className="mx-2 text-yellow-400">•</div>
            <div className="flex items-center mr-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 text-white flex items-center justify-center text-sm font-medium">2</div>
              <div className="ml-2 text-sm font-medium text-yellow-700">Insurance</div>
            </div>
            <div className="mx-2 text-yellow-400">•</div>
            <div className="text-yellow-500">Payment</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="grid grid-cols-1 gap-6 p-6 md:p-8 lg:p-10">
          <SectionCard 
            title="Health Insurance" 
            sectionKey="health" 
            data={formData.health}
            errors={errors}
            setSectionEnabled={setSectionEnabled}
            setSectionType={setSectionType}
            setSectionField={setSectionField}
            setReminder={setReminder}
          />
          <SectionCard 
            title="Accidental Insurance" 
            sectionKey="accidental" 
            data={formData.accidental}
            errors={errors}
            setSectionEnabled={setSectionEnabled}
            setSectionType={setSectionType}
            setSectionField={setSectionField}
            setReminder={setReminder}
          />
          <SectionCard 
            title="Term Life Insurance" 
            sectionKey="termLife" 
            data={formData.termLife}
            errors={errors}
            setSectionEnabled={setSectionEnabled}   
            setSectionType={setSectionType}
            setSectionField={setSectionField}
            setReminder={setReminder}
          />

          {/* Willing to work */}
          <div className="p-6 rounded-xl border border-yellow-200 shadow-sm bg-white">
            <label className="block text-sm font-medium text-yellow-800 mb-2">Family members willing to work in the organization? *</label>
            <div className="flex space-x-6">
              {['YES','NO'].map(val => (
                <label key={val} className="flex items-center cursor-pointer select-none">
                  <input type="radio" name="willingToWork" value={val} checked={formData.willingToWork === val} onChange={() => handleWillingToWorkChange(val)} className="w-4 h-4 text-yellow-600 accent-yellow-600" />
                  <span className="ml-2 text-sm text-yellow-800 hover:text-yellow-900 transition">{val === 'YES' ? 'Yes' : 'No'}</span>
                </label>
              ))}
            </div>
            {errors['willingToWork'] && <span className="text-xs text-red-500">{errors['willingToWork']}</span>}
            {formData.willingToWork === 'YES' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-yellow-800 mb-1">Name</label>
                  <input type="text" value={formData.willingWorkerDetails.name} onChange={(e) => setFormData(prev => ({ ...prev, willingWorkerDetails: { ...prev.willingWorkerDetails, name: e.target.value } }))} className="w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none border-yellow-300" placeholder="Name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-yellow-800 mb-1">Mobile number</label>
                  <input
                    type="tel"
                    value={formData.willingWorkerDetails.phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData(prev => ({ ...prev, willingWorkerDetails: { ...prev.willingWorkerDetails, phone: digits } }));
                    }}
                    maxLength={10}
                    pattern="[0-9]{10}"
                    className="w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none border-yellow-300"
                    placeholder="10-digit mobile"
                  />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={handleSaveWillingWorker} disabled={willingSaveLoading} className={`px-4 py-2 rounded-lg text-sm shadow ${willingSaved ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-yellow-600 hover:bg-yellow-700 text-white'} ${willingSaveLoading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    {willingSaveLoading ? 'Saving...' : (willingSaved ? 'Saved' : 'Save')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reference */}
          <div className="p-6 rounded-xl border border-yellow-200 shadow-sm bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-yellow-800 flex items-center">
                <span className="mr-2 p-2 rounded-md bg-yellow-50 text-yellow-700"><Shield className="w-4 h-4" /></span>
                Reference Details
              </h2>
              <p className="text-xs text-yellow-500">Contact for reference</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-yellow-800 mb-1">Name </label>
                <input type="text" value={formData.reference.name} onChange={(e) => setReferenceField('name', e.target.value)} className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors['reference.name'] ? 'border-red-400' : 'border-yellow-300'}`} placeholder="Reference name" />
                {errors['reference.name'] && <span className="text-xs text-red-500">{errors['reference.name']}</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-yellow-800 mb-1">Phone number </label>
                <input type="tel" value={formData.reference.phone} onChange={(e) => setReferenceField('phone', e.target.value)} className={`w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none ${errors['reference.phone'] ? 'border-red-400' : 'border-yellow-300'}`} placeholder="Reference phone" />
                {errors['reference.phone'] && <span className="text-xs text-red-500">{errors['reference.phone']}</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-yellow-800 mb-1">Registration ID</label>
                <input type="text" value={formData.reference.registrationId} onChange={(e) => setReferenceField('registrationId', e.target.value)} className="w-full px-3 py-2 border rounded-lg transition focus:ring-2 focus:ring-yellow-200 outline-none border-yellow-300" placeholder="Registration ID" />
              </div>
            </div>
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Bottom actions */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => navigate('/personal')} className="flex items-center text-yellow-800 hover:text-yellow-900 bg-white border border-yellow-300 rounded-lg px-4 py-2 shadow-sm">
              <ChevronLeft className="w-5 h-5 mr-2" /> Back
            </button>
            <button type="submit" disabled={isSubmitting} className={`flex items-center bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition transform hover:-translate-y-0.5 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isSubmitting ? 'Saving...' : 'Save & Next'}
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Insurance;