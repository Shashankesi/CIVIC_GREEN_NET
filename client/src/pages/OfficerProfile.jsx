import React, { useState, useEffect, useCallback, useContext } from 'react'
import {
  User, Mail, Shield, Building2, Phone, MapPin, Briefcase, FileText,
  CheckCircle2, Clock, Edit2, Save, X, ShieldAlert, Cpu, BarChart3,
  Calendar, KeyRound, AlertTriangle, Upload, Eye, FileDown, Activity, Settings
} from 'lucide-react'
import toast from 'react-hot-toast'
import officerApi from '../services/officer'
import api, { unwrapResponse } from '../services/api'
import AuthContext from '../context/AuthContext'
import AppShell from '../components/AppShell'
import PageHeader from '../ui/PageHeader'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import Button from '../ui/Button'
import StatusBadge from '../ui/StatusBadge'

export default function OfficerProfile() {
  const { user, refreshUser } = useContext(AuthContext)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [saving, setSaving] = useState(false)

  // Profile data state
  const [profile, setProfile] = useState(null)
  const [performance, setPerformance] = useState(null)
  const [activity, setActivity] = useState([])
  const [documents, setDocuments] = useState([])

  // Personal form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  // Document upload state
  const [uploadingDocType, setUploadingDocType] = useState(null)

  const loadAllData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Get dashboard data (contains profile, performance metrics, unread activity etc.)
      const dash = await officerApi.getDashboard()
      setProfile(dash.officer)
      setPerformance(dash.performance)
      setActivity(dash.recentActivity || [])

      // Initialize form fields
      setName(dash.officer.name || '')
      setPhone(dash.officer.settings?.phone || '')
      setAddress(dash.officer.settings?.address || '')
      setCity(dash.officer.settings?.city || '')
      setState(dash.officer.settings?.state || '')
      setPostalCode(dash.officer.settings?.postal_code || '')
      setAvatarPreview(dash.officer.avatar_url || '')

      // 2. Get onboarding documents
      const docs = await officerApi.getAssignedComplaints({ documentsOnly: true }) // fallback or direct api
      const docsRes = await api.get('/officer/onboarding/documents')
      setDocuments(unwrapResponse(docsRes) || [])
    } catch (e) {
      console.error(e)
      setError('Could not load officer profile details.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAllData() }, [loadAllData])

  // Pincode lookup integration
  const handlePinCodeChange = async (pin) => {
    setPostalCode(pin)
    if (pin.length === 6) {
      const loadingToast = toast.loading('Looking up PIN code...')
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
        const data = await res.json()
        if (data?.[0]?.Status === 'Success') {
          const postOffice = data[0].PostOffice?.[0]
          if (postOffice) {
            setCity(postOffice.District || postOffice.Name)
            setState(postOffice.State)
            toast.success('City and State auto-filled!', { id: loadingToast })
          } else {
            toast.error('PIN code details not found.', { id: loadingToast })
          }
        } else {
          toast.error('Invalid PIN code.', { id: loadingToast })
        }
      } catch (e) {
        toast.error('Failed to lookup PIN code.', { id: loadingToast })
      }
    }
  }

  // Personal Info Form Submission
  const handleSavePersonal = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      let finalAvatarUrl = avatarPreview

      // Upload avatar to Cloudinary if selected
      if (avatarFile) {
        const formData = new FormData()
        formData.append('avatar', avatarFile)
        formData.append('name', name)
        const uploadRes = await api.put('/auth/profile', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        const resData = unwrapResponse(uploadRes)
        finalAvatarUrl = resData.avatar_url || avatarPreview
      } else {
        // Just update text details
        await api.put('/auth/profile', { name })
      }

      // Update remaining settings details
      await officerApi.updateProfile({
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim()
      })

      toast.success('Personal profile details updated successfully!')
      refreshUser() // Synchronize auth token state
      loadAllData()
    } catch (err) {
      console.error(err)
      toast.error(err?.response?.data?.message || 'Failed to update personal details.')
    } finally {
      setSaving(false)
    }
  }

  // Document Upload integration
  const handleDocUpload = async (docType, file) => {
    if (!file) return;
    setUploadingDocType(docType)
    const loadToast = toast.loading(`Uploading document...`)
    try {
      const formData = new FormData()
      formData.append('documentType', docType)
      formData.append('file', file)

      await api.post('/officer/onboarding/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Document uploaded successfully!', { id: loadToast })
      loadAllData()
    } catch (e) {
      console.error(e)
      toast.error(e?.response?.data?.message || 'Failed to upload document.', { id: loadToast })
    } finally {
      setUploadingDocType(null)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'personal', label: 'Personal Details', icon: Edit2 },
    { id: 'professional', label: 'Professional Profile', icon: Briefcase },
    { id: 'documents', label: 'Verification Docs', icon: FileText },
    { id: 'performance', label: 'Performance Analytics', icon: BarChart3 },
    { id: 'activity', label: 'Audit Trail', icon: Activity },
    { id: 'security', label: 'Security & Logs', icon: KeyRound }
  ]

  return (
    <AppShell title="Officer Profile">
      <div className="space-y-6 p-8">
        <PageHeader
          title="Officer Profile Center"
          subtitle="Manage your professional municipal identity, residential details, security settings, and document audits."
        />

        {loading && (
          <div className="space-y-6">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        )}

        {error && !loading && <ErrorState title="Unable to load profile" message={error} onRetry={loadAllData} />}

        {!loading && !error && profile && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* Left side: Navigation tabs */}
            <div className="card p-4 space-y-1.5 lg:col-span-1 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl">
              <div className="flex flex-col items-center pb-4 mb-4 border-b dark:border-slate-800 text-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="h-20 w-20 rounded-full object-cover border-2 border-emerald-500 shadow-sm" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-2 border-emerald-500 font-black text-2xl shadow-sm">
                    {profile.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 className="mt-3 font-bold text-slate-800 dark:text-white text-sm">{profile.name}</h3>
                <span className="text-2xs font-mono font-bold text-slate-400 mt-0.5">{profile.employee_id || 'CGN-OFFICER'}</span>
                <span className="inline-flex items-center mt-2.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 uppercase tracking-wide">
                  🟢 Available
                </span>
              </div>

              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-850 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Right side: Tab Content Pane */}
            <div className="lg:col-span-3 card p-6 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl min-h-[480px]">
              
              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white border-b pb-3 dark:border-slate-800">Operational Overview</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Official Designation</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{profile.designation}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Assigned Department</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{profile.department?.name || 'General Municipal Service'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Primary Jurisdiction</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {profile.municipality?.name} {profile.zone?.name && `· ${profile.zone.name}`} {profile.ward?.name && `· ${profile.ward.name}`}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Workload Assignments</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{performance?.assignedCount || 0} Total Active Tasks</p>
                    </div>
                  </div>

                  {/* KPIs Row */}
                  <div className="border-t dark:border-slate-800 pt-6">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-4">Performance Highlights</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border dark:border-slate-800 text-center">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-450">SLA Compliance</span>
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{performance?.slaCompliance}%</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border dark:border-slate-800 text-center">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-450">Resolution Rate</span>
                        <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 block">{performance?.resolutionRate}%</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border dark:border-slate-800 text-center">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-450">Avg Resolution</span>
                        <span className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 block">{performance?.averageResolutionTime} days</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Personal Details */}
              {activeTab === 'personal' && (
                <form onSubmit={handleSavePersonal} className="space-y-6">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white border-b pb-3 dark:border-slate-800">Edit Personal Information</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-950 dark:text-white focus:border-emerald-500 focus:outline-none dark:border-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 "
                        className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-950 dark:text-white focus:border-emerald-500 focus:outline-none dark:border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Postal Code (PIN)</label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => handlePinCodeChange(e.target.value)}
                        placeholder="160017"
                        className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-950 dark:text-white focus:border-emerald-500 focus:outline-none dark:border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">City / Municipality</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-950 dark:text-white focus:border-emerald-500 focus:outline-none dark:border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">State</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-950 dark:text-white focus:border-emerald-500 focus:outline-none dark:border-slate-800"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Residential Address</label>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows="2"
                        className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-950 dark:text-white focus:border-emerald-500 focus:outline-none dark:border-slate-800"
                      ></textarea>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Upload Profile Photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setAvatarFile(file)
                            setAvatarPreview(URL.createObjectURL(file))
                          }
                        }}
                        className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t dark:border-slate-800">
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Profile Changes'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Tab 3: Professional Info */}
              {activeTab === 'professional' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white border-b pb-3 dark:border-slate-800">Professional Identity</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Officer ID (Employee Code)</span>
                      <div className="bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 rounded-xl border dark:border-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {profile.employee_id}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Official Designation</span>
                      <div className="bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 rounded-xl border dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {profile.designation}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Department</span>
                      <div className="bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 rounded-xl border dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {profile.department?.name || 'Sanitation & Waste Management'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Joining Date</span>
                      <div className="bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 rounded-xl border dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {profile.settings?.joining_date ? new Date(profile.settings.joining_date).toLocaleDateString('en-IN') : 'N/A'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Highest Qualification</span>
                      <div className="bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 rounded-xl border dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {profile.settings?.qualification || 'Bachelor\'s Degree'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Civic Experience</span>
                      <div className="bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 rounded-xl border dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {profile.settings?.experience || '3 to 5 Years'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Verification Documents */}
              {activeTab === 'documents' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white border-b pb-3 dark:border-slate-800">Uploaded Verification Documents</h3>
                  
                  <div className="space-y-4">
                    {documents.map((doc) => {
                      const docLabels = {
                        IDENTITY: 'Government Identity Document',
                        ADDRESS: 'Address Verification Document',
                        QUALIFICATION: 'Qualification & Service Document'
                      }
                      const label = docLabels[doc.type] || doc.type
                      const hasDoc = doc.status !== 'NOT_UPLOADED'

                      return (
                        <div key={doc.type} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border dark:border-slate-800 rounded-xl gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</span>
                            <div className="flex items-center gap-2">
                              {hasDoc ? (
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-250 truncate max-w-[240px]">{doc.fileName || 'document.pdf'}</span>
                              ) : (
                                <span className="text-xs font-bold text-rose-500">Not Uploaded</span>
                              )}
                              <StatusBadge status={doc.status} />
                            </div>
                            {doc.rejectionReason && (
                              <p className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-1 rounded border border-rose-250 mt-1">
                                Rejection Reason: {doc.rejectionReason}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {hasDoc && doc.documentUrl && (
                              <a
                                href={doc.documentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 border dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-650 dark:text-slate-300"
                              >
                                <Eye className="h-4 w-4" />
                                Preview
                              </a>
                            )}
                            
                            {(doc.status === 'NOT_UPLOADED' || doc.status === 'REJECTED') && (
                              <label className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer">
                                <Upload className="h-4 w-4" />
                                {uploadingDocType === doc.type ? 'Uploading...' : doc.status === 'REJECTED' ? 'Replace' : 'Upload'}
                                <input
                                  type="file"
                                  accept=".pdf,image/*"
                                  className="hidden"
                                  disabled={uploadingDocType === doc.type}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleDocUpload(doc.type, file)
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tab 5: Performance Analytics */}
              {activeTab === 'performance' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white border-b pb-3 dark:border-slate-800">Detailed Performance KPIs</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="border dark:border-slate-800 p-4 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Assigned Queue</span>
                      <span className="text-2xl font-black text-slate-800 dark:text-white mt-1.5 block">{performance?.assignedCount || 0}</span>
                    </div>
                    <div className="border dark:border-slate-800 p-4 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SLA compliance rate</span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 block">{performance?.slaCompliance}%</span>
                    </div>
                    <div className="border dark:border-slate-800 p-4 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Resolution Time</span>
                      <span className="text-2xl font-black text-blue-650 mt-1.5 block">{performance?.averageResolutionTime} Days</span>
                    </div>
                  </div>

                  {performance?.monthlyTrend && performance.monthlyTrend.length > 0 && (
                    <div className="border dark:border-slate-800 p-4 rounded-xl mt-6">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-4">Monthly Workload Trend</h4>
                      <div className="space-y-3">
                        {performance.monthlyTrend.map((t) => (
                          <div key={t.month} className="space-y-1">
                            <div className="flex justify-between text-2xs font-bold text-slate-500">
                              <span>{t.month}</span>
                              <span>{t.resolved_count} Resolved / {t.assigned_count} Assigned</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${t.assigned_count > 0 ? (t.resolved_count / t.assigned_count) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 6: Audit Trail */}
              {activeTab === 'activity' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white border-b pb-3 dark:border-slate-800">Your Action Logs & Trail</h3>
                  
                  {activity.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                      <Activity className="h-8 w-8 text-slate-350" />
                      <span className="mt-2 text-xs font-bold">No activity logs recorded.</span>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {activity.map((act) => {
                        const date = new Date(act.created_at).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })
                        const labelMap = {
                          ROLE_CHANGED: 'Officer role assigned',
                          OFFICER_PROFILE_UPDATED: 'Profile settings updated',
                          DOCUMENT_UPLOADED: 'Verification doc uploaded',
                          ASSIGNMENT_ACCEPTED: 'Complaint assignment accepted',
                          ASSIGNMENT_DECLINED: 'Complaint assignment declined',
                          COMPLAINT_STARTED: 'Work started on complaint',
                          COMPLAINT_RESOLVED: 'Complaint resolution marked'
                        }
                        const label = labelMap[act.action] || act.action.replace(/_/g, ' ')
                        return (
                          <div key={act.id} className="flex justify-between items-start gap-4 p-3 border dark:border-slate-800 rounded-xl text-xs">
                            <div>
                              <span className="block font-bold text-slate-750 dark:text-slate-150 capitalize">{label}</span>
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">{act.details?.type || act.details?.from || ''}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 font-medium">{date}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 7: Security & Logs */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white border-b pb-3 dark:border-slate-800">Account Security</h3>
                  
                  <div className="flex items-center gap-3 p-4 border border-amber-250 bg-amber-50/15 dark:border-amber-900/30 rounded-xl text-xs text-amber-700 dark:text-amber-400 font-medium">
                    <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
                    <span>To reset or change your account credentials, please click "Forgot Password" on the Login screen, or contact your district system administrator.</span>
                  </div>

                  <div className="border dark:border-slate-800 p-4 rounded-xl space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <KeyRound className="h-4.5 w-4.5 text-emerald-500" />
                      Session & Access Protocol
                    </h4>
                    <p className="text-xs text-slate-450 leading-relaxed">
                      All administrative login activity and changes are logged securely. Unauthorized profile alterations will be flagged for review.
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}
      </div>
    </AppShell>
  )
}
