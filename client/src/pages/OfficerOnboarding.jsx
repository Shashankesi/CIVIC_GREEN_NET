import React, { useState, useEffect, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ShieldCheck, User, Phone, MapPin, Building2, Briefcase, FileText,
  CheckCircle, ArrowRight, ArrowLeft, Upload, CheckCircle2, AlertCircle, Clock,
  Sun, Moon
} from 'lucide-react'
import toast from 'react-hot-toast'
import AuthContext from '../context/AuthContext'
import ThemeContext from '../context/ThemeContext'
import api, { unwrapResponse } from '../services/api'

export default function OfficerOnboarding() {
  const { user, refreshUser } = useContext(AuthContext)
  const { dark, setDark } = useContext(ThemeContext)
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  
  // Document states
  const [uploadedDocs, setUploadedDocs] = useState([])
  const [uploadProgress, setUploadProgress] = useState({}) // { type: boolean }

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '+91 ',
    address: '',
    city: 'New Delhi',
    state: 'Delhi',
    postalCode: '',
    employeeId: '',
    designation: 'Municipal Officer',
    qualification: '',
    experience: '',
    joiningDate: new Date().toISOString().split('T')[0],
    departmentId: '',
    documents: {
      identityDocument: 'Government ID Card (Verified)',
      addressProof: 'Utility Bill / Residence Cert',
      qualificationDocument: 'Degree Certificate'
    }
  })

  useEffect(() => {
    // Load departments
    api.get('/departments')
      .then(res => {
        const data = unwrapResponse(res)
        setDepartments(Array.isArray(data) ? data : data?.departments || [])
      })
      .catch(() => {
        // Fallback default departments
        setDepartments([
          { id: 1, name: 'Sanitation & Solid Waste Management' },
          { id: 2, name: 'Roads & Infrastructure' },
          { id: 3, name: 'Sewerage & Drainage' },
          { id: 4, name: 'Street Lighting & Electrical' },
          { id: 5, name: 'Parks & Horticulture' },
          { id: 6, name: 'Public Health' },
          { id: 7, name: 'Traffic & Transport' }
        ])
      })

    // Load designations
    api.get('/designations')
      .then(res => {
        const data = unwrapResponse(res)
        const list = Array.isArray(data) ? data : data?.data || []
        if (list.length > 0) {
          setDesignations(list)
        } else {
          throw new Error('Empty list')
        }
      })
      .catch(() => {
        setDesignations([
          'Municipal Officer',
          'Senior Municipal Officer',
          'Field Inspector',
          'Ward Officer',
          'Sanitation Officer',
          'Environmental Officer',
          'Waste Management Officer',
          'Public Works Officer',
          'Water & Utilities Officer',
          'Health & Safety Officer',
          'Administrative Officer'
        ])
      })
  }, [])

  useEffect(() => {
    if (refreshUser) {
      refreshUser().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (user) {
      const settings = user.settings || {}
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: settings.phone || user.phone || '+91 ',
        address: settings.address || '',
        city: settings.city || 'New Delhi',
        state: settings.state || 'Delhi',
        postalCode: settings.postal_code || '',
        employeeId: user.employee_id || settings.employee_id || '',
        designation: user.designation || settings.designation || 'Municipal Officer',
        qualification: settings.qualification || prev.qualification,
        experience: settings.experience || prev.experience,
        departmentId: user.department_id ? String(user.department_id) : prev.departmentId,
        documents: settings.documents || prev.documents
      }))
    }
  }, [user])

  const loadDocuments = () => {
    api.get('/officer/onboarding/documents')
      .then(res => {
        const data = unwrapResponse(res)
        if (Array.isArray(data)) {
          setUploadedDocs(data)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (step === 4 || step === 5) {
      loadDocuments()
    }
  }, [step])

  // Pincode lookup API
  useEffect(() => {
    const pin = formData.postalCode?.trim()
    if (pin && pin.length === 6 && /^\d+$/.test(pin)) {
      fetch(`https://api.postalpincode.in/pincode/${pin}`)
        .then(res => res.json())
        .then(data => {
          if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
            const po = data[0].PostOffice[0]
            setFormData(prev => ({
              ...prev,
              state: po.State || prev.state,
              city: po.District || po.Circle || prev.city
            }))
            toast.success(`Location auto-filled: ${po.District}, ${po.State}`)
          }
        })
        .catch(() => {})
    }
  }, [formData.postalCode])

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }))
  }

  const handlePhoneChange = (e) => {
    let val = e.target.value
    if (!val.startsWith('+91')) {
      if (val.length < 4) {
        val = '+91 '
      } else {
        const digits = val.replace(/\D/g, '')
        if (digits.startsWith('91')) {
          val = '+91 ' + digits.slice(2)
        } else {
          val = '+91 ' + digits
        }
      }
    } else {
      const after = val.slice(4).replace(/\D/g, '')
      val = '+91 ' + after
    }
    handleChange('phone', val)
  }

  const handleUpload = async (type, file) => {
    if (!file) return

    // Enforce 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB.')
      return
    }

    // Verify extension
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!allowed.includes(ext)) {
      toast.error('Only PDF, JPG, JPEG, and PNG files are allowed.')
      return
    }

    const form = new FormData()
    form.append('documentType', type)
    form.append('file', file)

    setUploadProgress(prev => ({ ...prev, [type]: true }))
    try {
      const res = await api.post('/officer/onboarding/documents', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      unwrapResponse(res)
      toast.success('Document uploaded successfully.')
      loadDocuments()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to upload document.')
    } finally {
      setUploadProgress(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.departmentId) {
      toast.error('Please select a department')
      setStep(3)
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/officer/onboarding', formData)
      unwrapResponse(res)
      toast.success('Officer profile submitted successfully! Awaiting administrator approval.')
      if (refreshUser) await refreshUser()
      setStep(5)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit officer profile')
    } finally {
      setLoading(false)
    }
  }

  const isOnboardingSubmitted = user?.settings?.onboarding_status === 'COMPLETED'
  const isApproved = user?.status === 'approved' || user?.status === 'active'

  const selectOptions = [...new Set([...designations, formData.designation].filter(Boolean))]

  const allDocumentsUploaded = ['IDENTITY', 'ADDRESS', 'QUALIFICATION'].every(type => {
    const doc = uploadedDocs.find(d => d.type === type)
    return doc && (doc.status === 'UPLOADED' || doc.status === 'VERIFIED' || doc.status === 'UNDER_REVIEW')
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-8 transition-colors duration-200">
      <div className="mx-auto w-full max-w-4xl space-y-6">

        {/* Top Branding */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-wide">CIVIC GREENNET</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Municipal Officer Onboarding Portal</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark(!dark)}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/60 dark:text-slate-355 dark:hover:bg-slate-800 transition-colors"
            >
              {dark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-600" />}
            </button>
            <Link to="/" className="text-xs font-semibold text-slate-550 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              Exit to Main Site &rarr;
            </Link>
          </div>
        </div>

        {/* Approved Banner */}
        {isApproved && (
          <div className="rounded-2xl border border-emerald-250 bg-emerald-50/50 dark:border-emerald-500/40 dark:bg-emerald-950/40 p-6 text-center space-y-3 shadow-md animate-fade-in">
            <CheckCircle className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Officer Account Approved &amp; Active</h2>
            <p className="text-sm text-slate-600 dark:text-emerald-200">
              Your Municipal Officer account has been fully verified. You can now access field operations and assigned complaints.
            </p>
            <button
              onClick={() => navigate('/officer')}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-550 transition-all shadow-lg"
            >
              Open Officer Operations Dashboard &rarr;
            </button>
          </div>
        )}

        {/* Pending Review Banner */}
        {!isApproved && isOnboardingSubmitted && step !== 5 && (
          <div className="rounded-2xl border border-amber-205 bg-amber-50/50 dark:border-amber-500/40 dark:bg-amber-950/40 p-6 text-center space-y-3 shadow-md animate-fade-in">
            <Clock className="h-12 w-12 text-amber-600 dark:text-amber-400 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile Submitted &amp; Pending Approval</h2>
            <p className="text-sm text-slate-600 dark:text-amber-200">
              Your profile has been submitted for administrator review. You will receive an in-app notification and email once approved.
            </p>
          </div>
        )}

        {/* Main Step Container */}
        {!isApproved && !isOnboardingSubmitted && (
          <div className="rounded-2xl bg-white dark:bg-[#0B1628] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-8 transition-colors duration-200">

            {/* Stepper Navigation */}
            <div className="grid grid-cols-5 gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-6 text-center">
              {[
                { num: 1, label: 'Personal Info' },
                { num: 2, label: 'Professional' },
                { num: 3, label: 'Department' },
                { num: 4, label: 'Documents' },
                { num: 5, label: 'Review & Submit' }
              ].map((s) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(s.num)}
                  className={`flex flex-col items-center gap-1 transition-all ${
                    step === s.num
                      ? 'text-emerald-600 dark:text-emerald-405 font-extrabold'
                      : step > s.num
                        ? 'text-slate-800 dark:text-slate-300 font-semibold'
                        : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    step === s.num
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 ring-4 ring-emerald-500/20'
                      : step > s.num
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-250 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-500/40'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                  }`}>
                    {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                  </span>
                  <span className="text-[11px] hidden sm:inline">{s.label}</span>
                </button>
              ))}
            </div>

            {/* STEP 1: PERSONAL INFORMATION */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Step 1 — Personal Information
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Verify your personal contact details and residential address</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address (Read Only)</label>
                    <input
                      type="email"
                      value={formData.email}
                      readOnly
                      className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Residential Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="Civil Lines, Ward 14"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Postal Code (PIN)</label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => handleChange('postalCode', e.target.value)}
                      placeholder="110001"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">City / District</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      placeholder="Delhi"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-705 transition-all shadow-md"
                  >
                    Next: Professional Details &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PROFESSIONAL INFORMATION */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Step 2 — Professional Information
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Provide your official designation and qualifications</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Officer ID (System Generated)</label>
                    <input
                      type="text"
                      value={formData.employeeId || 'Auto-Generated on Approval'}
                      readOnly
                      className="w-full rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-405 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Official Designation *</label>
                    <select
                      value={formData.designation}
                      onChange={(e) => handleChange('designation', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors"
                      required
                    >
                      <option value="" disabled>Select designation</option>
                      {selectOptions.map((desig) => (
                        <option key={desig} value={desig}>{desig}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Highest Qualification *</label>
                    <select
                      value={formData.qualification}
                      onChange={(e) => handleChange('qualification', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors"
                      required
                    >
                      <option value="" disabled>Select qualification</option>
                      {["Bachelor's Degree", "Master's Degree", "Doctorate / Ph.D.", "Professional Diploma", "Higher Secondary Education"].map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Civic Operations Experience *</label>
                    <select
                      value={formData.experience}
                      onChange={(e) => handleChange('experience', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors"
                      required
                    >
                      <option value="" disabled>Select experience level</option>
                      {["Under 1 Year", "1 to 3 Years", "3 to 5 Years", "5 to 10 Years", "10+ Years"].map((exp) => (
                        <option key={exp} value={exp}>{exp}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-750 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 px-4 py-2 text-xs font-semibold"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md"
                  >
                    Next: Department Selection &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: DEPARTMENT SELECTION */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-450" />
                    Step 3 — Department &amp; Assignment Selection
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Select your requested department for municipal operations</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Requested Municipal Department <span className="text-rose-500">*</span></label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {departments.map((d) => (
                        <label
                          key={d.id}
                          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                            String(formData.departmentId) === String(d.id)
                              ? 'border-emerald-500 bg-emerald-50/60 dark:border-emerald-500 dark:bg-emerald-950/40 text-emerald-800 dark:text-white shadow-sm'
                              : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 text-slate-650 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="departmentSelection"
                            value={d.id}
                            checked={String(formData.departmentId) === String(d.id)}
                            onChange={() => handleChange('departmentId', String(d.id))}
                            className="mt-0.5 h-4 w-4 text-emerald-505 focus:ring-emerald-505"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">{d.name}</div>
                            {d.description && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{d.description}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-750 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 px-4 py-2 text-xs font-semibold"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.departmentId) {
                        toast.error('Please select a department')
                        return
                      }
                      setStep(4)
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md"
                  >
                    Next: Documents &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: DOCUMENTS */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-650 dark:text-emerald-400" />
                    Step 4 — Verification Documents
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Attached identity and qualification proof records</p>
                </div>

                <div className="space-y-4">
                  {[
                    { type: 'IDENTITY', title: 'Government Identity Document', subtitle: 'Aadhaar / Voter ID / Passport' },
                    { type: 'ADDRESS', title: 'Address Verification Document', subtitle: 'Utility Bill / Resident Certificate' },
                    { type: 'QUALIFICATION', title: 'Qualification & Service Record', subtitle: 'Degree Certificate / Appointment Order' }
                  ].map((docItem) => {
                    const doc = uploadedDocs.find(d => d.type === docItem.type) || { status: 'NOT_UPLOADED' }
                    const isUploading = !!uploadProgress[docItem.type]

                    return (
                      <div key={docItem.type} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 space-y-4 transition-all shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                              <FileText className="h-5 w-5" />
                            </span>
                            <div>
                              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">{docItem.title}</h3>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">{docItem.subtitle}</p>
                              {doc.fileName && (
                                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-500 mt-1">
                                  File: {doc.fileName} (v{doc.version || 1})
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                            doc.status === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/20'
                              : doc.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-500/20'
                                : doc.status === 'UPLOADED' || doc.status === 'UNDER_REVIEW'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-500/20'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                          }`}>
                            {doc.status === 'NOT_UPLOADED' ? 'Not Uploaded' : doc.status}
                          </span>
                        </div>

                        {/* Rejection Reason */}
                        {doc.status === 'REJECTED' && doc.rejectionReason && (
                          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 text-[11px] text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
                            <strong>Rejection Reason:</strong> {doc.rejectionReason}
                          </div>
                        )}

                        {/* Upload Trigger / Options */}
                        {doc.status !== 'VERIFIED' && (
                          <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-all text-white px-4 py-2 text-xs font-bold cursor-pointer shadow-sm">
                              {isUploading ? 'Uploading...' : doc.status === 'NOT_UPLOADED' ? 'Upload Document' : 'Replace Document'}
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => handleUpload(docItem.type, e.target.files[0])}
                              />
                            </label>

                            {doc.documentUrl && (
                              <a
                                href={doc.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-slate-650 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                              >
                                View Document &rarr;
                              </a>
                            )}
                          </div>
                        )}

                        {doc.status === 'VERIFIED' && doc.documentUrl && (
                          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Verified by Administrator
                            <a
                              href={doc.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:underline ml-auto"
                            >
                              View &rarr;
                            </a>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {!allDocumentsUploaded && (
                  <div className="rounded-xl border border-amber-250 bg-amber-50/50 p-4 text-xs text-amber-800 flex items-center gap-2.5">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    <span>Please upload all required verification documents before continuing.</span>
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-750 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 px-4 py-2 text-xs font-semibold"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!allDocumentsUploaded) {
                        toast.error('Please upload all required verification documents before continuing.')
                        return
                      }
                      setStep(5)
                    }}
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md ${
                      allDocumentsUploaded 
                        ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' 
                        : 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed opacity-50'
                    }`}
                    disabled={!allDocumentsUploaded}
                  >
                    Next: Review &amp; Submit &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW & SUBMIT */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Step 5 — Final Profile Review
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Review all details before submitting for administrator approval</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase">Personal Details</span>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{formData.name}</div>
                    <div className="text-slate-655 dark:text-slate-300">{formData.email}</div>
                    <div className="text-slate-500 dark:text-slate-400">{formData.phone || 'Phone Not Set'}</div>
                    <div className="text-slate-500 dark:text-slate-400">{formData.address}, {formData.city}, {formData.state}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase">Professional Setup</span>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{formData.designation}</div>
                    <div className="text-emerald-600 dark:text-emerald-405 font-mono font-bold">{formData.employeeId || 'ID Auto-Generated'}</div>
                    <div className="text-slate-655 dark:text-slate-300">{formData.qualification}</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase block mb-1">Uploaded Verification Documents</span>
                  {['IDENTITY', 'ADDRESS', 'QUALIFICATION'].map(type => {
                    const doc = uploadedDocs.find(d => d.type === type)
                    const label = type === 'IDENTITY' ? 'Government Identity' : type === 'ADDRESS' ? 'Address Verification' : 'Qualification & Service'
                    return (
                      <div key={type} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500"><CheckCircle2 className="h-4 w-4" /></span>
                          <span className="text-slate-700 dark:text-slate-300">{label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono text-slate-450 dark:text-slate-500">{doc?.fileName || 'document.pdf'}</span>
                          {doc?.documentUrl && (
                            <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-650 dark:text-emerald-400 font-bold hover:underline">
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-255 dark:border-emerald-500/30 text-xs text-emerald-805 dark:text-emerald-300 flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-emerald-600 dark:text-emerald-450 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Requested Department</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {departments.find(d => String(d.id) === String(formData.departmentId))?.name || 'Department Selected'}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-755 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 px-4 py-2 text-xs font-semibold"
                  >
                    &larr; Back to Edit
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-lg disabled:opacity-50"
                  >
                    {loading ? 'Submitting Profile...' : 'Submit Profile for Approval'}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}
