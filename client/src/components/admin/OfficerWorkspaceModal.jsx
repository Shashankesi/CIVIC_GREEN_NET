import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, X, User, Mail, Phone, MapPin, Building2, Briefcase, Calendar,
  CheckCircle2, AlertTriangle, Clock, RefreshCw, FileText, Activity, ShieldAlert,
  Send, Lock, ChevronRight, Ban, CheckCircle, ArrowUpRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import adminApi, { getOfficerFullProfile, updateUserRole, updateUserStatus, approveOfficer } from '../../services/admin'
import StatusBadge from '../../ui/StatusBadge'
import Skeleton from '../../components/Skeleton'

export default function OfficerWorkspaceModal({ officerId, onClose, onRefresh }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'complaints' | 'audit' | 'logs'
  const [complaintFilter, setComplaintFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState(false)
  const [departments, setDepartments] = useState([])

  // Documents rejection state
  const [rejectingDocType, setRejectingDocType] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectSubmitting, setRejectSubmitting] = useState(false)

  // Department edit state
  const [editingDept, setEditingDept] = useState(false)
  const [selectedDeptId, setSelectedDeptId] = useState('')

  const loadFullProfile = useCallback(async () => {
    if (!officerId) return
    setLoading(true)
    setError(null)
    try {
      try {
        const res = await getOfficerFullProfile(officerId)
        if (res && res.officer) {
          setData(res)
          setSelectedDeptId(res.officer.department_id || '')
          return
        }
      } catch (e1) {
        // Fallback to getUser if full-profile endpoint returns 404
        const user = await adminApi.getUser(officerId)
        if (user) {
          setData({
            officer: user,
            statistics: { totalAssigned: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, overdue: 0, critical: 0, resolutionRate: 0 },
            complaints: [],
            auditLogs: [],
            emailLogs: [],
            notifications: []
          })
          setSelectedDeptId(user.department_id || '')
          return
        }
        throw e1
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load complete officer profile.')
    } finally {
      setLoading(false)
    }
  }, [officerId])

  useEffect(() => {
    loadFullProfile()
    adminApi.listDepartments().then(r => setDepartments(r || [])).catch(() => {})
  }, [loadFullProfile])

  const handleApprove = async () => {
    if (!data?.officer) return
    setActionLoading(true)
    try {
      await approveOfficer(data.officer.id)
      toast.success(`${data.officer.name} approved as Officer successfully!`)
      loadFullProfile()
      if (onRefresh) onRefresh()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to approve officer.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleVerifyDoc = async (type) => {
    setActionLoading(true)
    try {
      await adminApi.verifyDocument(officerId, type)
      toast.success('Document verified successfully!')
      loadFullProfile()
      if (onRefresh) onRefresh()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to verify document.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectDocSubmit = async (e) => {
    e.preventDefault()
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required.')
      return
    }
    setRejectSubmitting(true)
    try {
      await adminApi.rejectDocument(officerId, rejectingDocType, rejectionReason.trim())
      toast.success('Document rejected successfully.')
      setRejectingDocType(null)
      setRejectionReason('')
      loadFullProfile()
      if (onRefresh) onRefresh()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to reject document.')
    } finally {
      setRejectSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!data?.officer) return
    setActionLoading(true)
    try {
      await updateUserStatus(data.officer.id, newStatus, `Admin set status to ${newStatus}`)
      toast.success(`Officer status updated to ${newStatus.toUpperCase()}`)
      loadFullProfile()
      if (onRefresh) onRefresh()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update status.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDepartmentChange = async (e) => {
    e.preventDefault()
    if (!data?.officer || !selectedDeptId) return
    setActionLoading(true)
    try {
      await adminApi.updateUser(data.officer.id, { department_id: parseInt(selectedDeptId, 10) })
      toast.success('Department updated successfully!')
      setEditingDept(false)
      loadFullProfile()
      if (onRefresh) onRefresh()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update department.')
    } finally {
      setActionLoading(false)
    }
  }

  const officer = data?.officer
  const stats = data?.statistics || {}
  const complaints = data?.complaints || []
  const auditLogs = data?.auditLogs || []
  const emailLogs = data?.emailLogs || []
  const notifications = data?.notifications || []

  const filteredComplaints = complaints.filter(c => {
    if (complaintFilter === 'all') return true
    if (complaintFilter === 'open') return c.status === 'open'
    if (complaintFilter === 'in_progress') return c.status === 'in_progress'
    if (complaintFilter === 'resolved') return ['resolved', 'closed'].includes(c.status)
    return true
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-6 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0B1628] border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-6 py-4 bg-slate-50/50 dark:bg-[#0D1929]">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Municipal Officer Command Workspace
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Full Operational Record, Registration &amp; Audit History</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 space-y-6">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Unable to load profile</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">{error}</p>
            <button
              onClick={loadFullProfile}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : officer ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Identity & Actions Banner */}
            <div className="border-b border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-[#0B1628]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="relative">
                    {officer.avatar_url ? (
                      <img src={officer.avatar_url} alt={officer.name} className="h-16 w-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-black text-white shadow-md">
                        {officer.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]">
                      ✓
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">{officer.name}</h3>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        OFFICER
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                        officer.status === 'active' || officer.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                          : officer.status === 'suspended'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                      }`}>
                        {officer.status || 'PENDING'}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-mono font-bold text-slate-700 dark:text-slate-200">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        {officer.employee_id || 'Generating ID...'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {officer.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {officer.department_name || 'Unassigned Department'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Admin Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  {officer.status === 'pending' && (
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" /> Approve Officer
                    </button>
                  )}

                  {officer.status === 'suspended' ? (
                    <button
                      onClick={() => handleStatusChange('active')}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Reactivate Officer
                    </button>
                  ) : officer.status === 'active' || officer.status === 'approved' ? (
                    <button
                      onClick={() => handleStatusChange('suspended')}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 shadow-sm disabled:opacity-50"
                    >
                      <Ban className="h-4 w-4" /> Suspend Officer
                    </button>
                  ) : null}

                  <button
                    onClick={() => setEditingDept(!editingDept)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Building2 className="h-4 w-4" /> Reassign Dept
                  </button>
                </div>
              </div>

              {/* Department Inline Reassignment Panel */}
              {editingDept && (
                <form onSubmit={handleDepartmentChange} className="mt-4 flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#111C2D] border border-slate-200 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select New Department:</label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Save Assignment
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingDept(false)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    Cancel
                  </button>
                </form>
              )}

              {/* Tab Navigation */}
              <div className="mt-6 flex border-b border-slate-200 dark:border-slate-800 gap-6">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
                    activeTab === 'overview'
                      ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Overview &amp; Registration
                </button>

                <button
                  onClick={() => setActiveTab('complaints')}
                  className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'complaints'
                      ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Complaint History
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {stats.totalAssigned || 0}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('audit')}
                  className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'audit'
                      ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Audit Logs
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {auditLogs.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('logs')}
                  className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'logs'
                      ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Notifications &amp; Emails
                </button>

                <button
                  onClick={() => setActiveTab('documents')}
                  className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'documents'
                      ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Verification Docs
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                    (data?.documents || []).filter(d => d.status === 'VERIFIED').length === 3
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                  }`}>
                    {(data?.documents || []).filter(d => d.status === 'VERIFIED').length}/3
                  </span>
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-[#07101E]">
              {/* TAB 1: OVERVIEW & REGISTRATION */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#0B1628]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Assigned</div>
                      <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.totalAssigned || 0}</div>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#0B1628]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Cases</div>
                      <div className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">{(stats.open || 0) + (stats.inProgress || 0)}</div>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#0B1628]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolved Cases</div>
                      <div className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.resolved || 0}</div>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#0B1628]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SLA Resolution Rate</div>
                      <div className="mt-1 text-2xl font-black text-brand-600 dark:text-brand-400">{stats.resolutionRate || 0}%</div>
                    </div>
                  </div>

                  {/* Personal & Professional Info Grid */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Personal Information */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0B1628]">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b dark:border-slate-800 flex items-center gap-2">
                        <User className="h-4 w-4 text-emerald-600" />
                        Personal Information
                      </h4>

                      <div className="space-y-3.5 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                          <span className="text-slate-400">Full Name:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{officer.name}</span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                          <span className="text-slate-400">Email Address:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{officer.email}</span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                          <span className="text-slate-400">Phone Contact:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{officer.settings?.phone || officer.phone || 'Not Provided'}</span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                          <span className="text-slate-400">City / Municipality:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{officer.municipality_name || officer.settings?.city || 'Not Specified'}</span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                          <span className="text-slate-400">Assigned Zone:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{officer.zone_name || 'All Zones'}</span>
                        </div>

                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">Assigned Ward:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{officer.ward_name || 'All Wards'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Professional & System Info */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0B1628]">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b dark:border-slate-800 flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-emerald-600" />
                        Professional &amp; Administrative Details
                      </h4>

                      <div className="space-y-3.5 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                          <span className="text-slate-400">Availability Status:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {officer.availability === 'BUSY' ? '🟡 Busy' : officer.availability === 'ON_FIELD' ? '🟠 On Field' : officer.availability === 'OFFLINE' ? '🔴 Offline' : '🟢 Available'}
                          </span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                          <span className="text-slate-400">Employee ID:</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{officer.employee_id || 'Not Assigned'}</span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                          <span className="text-slate-400">Department:</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">{officer.department_name || 'Unassigned'}</span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                          <span className="text-slate-400">Designation:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{officer.designation || officer.settings?.designation || 'Municipal Officer'}</span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                          <span className="text-slate-400">Jurisdiction Area:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{officer.jurisdiction || 'General Jurisdiction'}</span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                          <span className="text-slate-400">Application Date:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {officer.created_at ? new Date(officer.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                          </span>
                        </div>

                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">Approved By:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{officer.approved_by_name || 'System Administrator'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: COMPLAINT HISTORY */}
              {activeTab === 'complaints' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Assigned Complaints Record</h4>
                    <div className="flex gap-1.5">
                      {['all', 'open', 'in_progress', 'resolved'].map(st => (
                        <button
                          key={st}
                          onClick={() => setComplaintFilter(st)}
                          className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                            complaintFilter === st
                              ? 'bg-slate-900 text-white dark:bg-emerald-600'
                              : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredComplaints.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#0B1628]">
                      <p className="text-xs text-slate-400">No complaint records found matching current filter.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0B1628]">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-[#0D1929] text-slate-400 uppercase font-bold text-[10px]">
                          <tr>
                            <th className="p-3">Case ID</th>
                            <th className="p-3">Title &amp; Category</th>
                            <th className="p-3">Priority</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Assigned / Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {filteredComplaints.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                              <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">#{c.id}</td>
                              <td className="p-3">
                                <div className="font-bold text-slate-800 dark:text-slate-200">{c.title}</div>
                                <div className="text-[10px] text-slate-400">{c.category} • {c.department_name || 'General'}</div>
                              </td>
                              <td className="p-3">
                                <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold capitalize ${
                                  c.priority === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                  {c.priority}
                                </span>
                              </td>
                              <td className="p-3">
                                <StatusBadge status={c.status} />
                              </td>
                              <td className="p-3 text-slate-500">
                                {new Date(c.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: AUDIT LOGS */}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Officer Audit &amp; System Event History</h4>
                  {auditLogs.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#0B1628]">
                      <p className="text-xs text-slate-400">No audit events recorded for this officer yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {auditLogs.map(log => (
                        <div key={log.id} className="flex items-start justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 dark:border-slate-800 dark:bg-[#0B1628] text-xs">
                          <div className="flex items-start gap-3">
                            <Activity className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">{log.action}</div>
                              <div className="text-[11px] text-slate-500">By: {log.actor_name || 'System'}</div>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: NOTIFICATIONS & EMAILS */}
              {activeTab === 'logs' && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Notifications */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0B1628] space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2 dark:border-slate-800">
                      Website Notifications ({notifications.length})
                    </h4>
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No notifications sent.</p>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {notifications.map(n => (
                          <div key={n.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#111C2D] text-xs">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{n.payload?.title || n.type}</div>
                            <div className="mt-0.5 text-slate-500">{n.payload?.message || 'Notification dispatched'}</div>
                            <div className="mt-1 text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Emails */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0B1628] space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2 dark:border-slate-800">
                      Sent Email History ({emailLogs.length})
                    </h4>
                    {emailLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No email logs found.</p>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {emailLogs.map(m => (
                          <div key={m.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#111C2D] text-xs">
                            <div className="flex justify-between">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{m.event_type}</span>
                              <span className={`text-[10px] font-bold uppercase ${m.status === 'sent' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {m.status}
                              </span>
                            </div>
                            <div className="mt-0.5 text-slate-500">{m.subject}</div>
                            <div className="mt-1 text-[10px] text-slate-400">{new Date(m.created_at).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: VERIFICATION DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Officer Onboarding Verification Documents</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { type: 'IDENTITY', label: 'Government Identity Document', subtitle: 'Aadhaar / Voter ID / Passport' },
                      { type: 'ADDRESS', label: 'Address Verification Document', subtitle: 'Utility Bill / Resident Certificate' },
                      { type: 'QUALIFICATION', label: 'Qualification & Service Record', subtitle: 'Degree Certificate / Appointment Order' }
                    ].map(docItem => {
                      const doc = (data?.documents || []).find(d => d.type === docItem.type) || { status: 'NOT_UPLOADED' };

                      return (
                        <div key={docItem.type} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0B1628] flex flex-col justify-between space-y-4 shadow-sm">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20">
                                <FileText className="h-5 w-5" />
                              </span>
                              <span className={`rounded-lg px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
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

                            <div>
                              <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">{docItem.label}</h5>
                              <p className="text-[11px] text-slate-550 dark:text-slate-400">{docItem.subtitle}</p>
                            </div>

                            {doc.status !== 'NOT_UPLOADED' && (
                              <div className="text-[11px] text-slate-500 space-y-1">
                                {doc.original_file_name && (
                                  <div className="font-mono text-[10px] truncate">
                                    <strong>File:</strong> {doc.original_file_name}
                                  </div>
                                )}
                                {doc.file_size && (
                                  <div>
                                    <strong>Size:</strong> {(doc.file_size / (1024 * 1024)).toFixed(2)} MB
                                  </div>
                                )}
                                {doc.uploaded_at && (
                                  <div>
                                    <strong>Uploaded:</strong> {new Date(doc.uploaded_at).toLocaleString()}
                                  </div>
                                )}
                                <div>
                                  <strong>Version:</strong> v{doc.version || 1}
                                </div>
                                {doc.status === 'REJECTED' && doc.rejection_reason && (
                                  <div className="rounded-lg bg-rose-50/40 p-2 text-rose-750 dark:bg-rose-950/20 dark:text-rose-300 border border-rose-100 dark:border-rose-900 mt-2">
                                    <strong>Rejection Reason:</strong> {doc.rejection_reason}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-105 dark:border-slate-800/80 flex flex-wrap gap-2 justify-end">
                            {doc.status !== 'NOT_UPLOADED' && doc.document_url && (
                              <a
                                href={doc.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                              >
                                View Document
                              </a>
                            )}
                            {doc.status !== 'NOT_UPLOADED' && doc.status !== 'VERIFIED' && (
                              <>
                                <button
                                  onClick={() => handleVerifyDoc(docItem.type)}
                                  disabled={actionLoading}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => setRejectingDocType(docItem.type)}
                                  disabled={actionLoading}
                                  className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Custom Rejection Dialog Modal */}
        {rejectingDocType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0B1628] shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Reject Verification Document</h3>
                <button
                  onClick={() => {
                    setRejectingDocType(null)
                    setRejectionReason('')
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleRejectDocSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this document is invalid or needs to be replaced..."
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-105 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingDocType(null)
                      setRejectionReason('')
                    }}
                    className="rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold px-4 py-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rejectSubmitting}
                    className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 disabled:opacity-50 cursor-pointer"
                  >
                    {rejectSubmitting ? 'Rejecting...' : 'Reject Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
