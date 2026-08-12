import React, { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Users, FileText, CheckCircle2, Clock, Building2, UserCog, TrendingUp,
  Download, Plus, Trash2, ShieldCheck, Map, AlertTriangle, X, ChevronRight,
  RefreshCw, Eye, UserCheck, AlertCircle, BarChart2, ShieldAlert, Activity,
  Server, Database, AlertOctagon, Sparkles, MapPin, CheckCircle, Mail
} from 'lucide-react'
import MapView from '../components/MapView'
import { STATUS_OPTIONS, PRIORITY_OPTIONS, CATEGORY_OPTIONS } from '../config/mapConfig'
import adminApi from '../services/admin'
import AdminShell from '../components/AdminShell'
import PageHeader from '../ui/PageHeader'
import DashboardCard from '../components/DashboardCard'
import TrendChart from '../components/TrendChart'
import ChartPie from '../components/ChartPie'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../ui/StatusBadge'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Input from '../ui/Input'
import toast from 'react-hot-toast'

// ── Constants ──────────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview', label: 'Command Center', icon: TrendingUp },
  { key: 'complaints', label: 'Complaints Queue', icon: FileText },
  { key: 'map', label: 'Live Map', icon: Map },
  { key: 'users', label: 'User Directory', icon: Users },
  { key: 'officer-approvals', label: 'Officer Approvals', icon: UserCheck },
  { key: 'departments', label: 'Departments', icon: Building2 },
  { key: 'reports', label: 'Analytics & Reports', icon: BarChart2 },
  { key: 'audit-logs', label: 'Audit Logs', icon: ShieldAlert },
  { key: 'email-center', label: 'Email Center', icon: Mail },
  { key: 'system-health', label: 'System Health', icon: Activity }
]

const ROLE_BADGE = {
  admin: { tone: 'purple', label: 'Admin' },
  officer: { tone: 'cyan', label: 'Officer' },
  citizen: { tone: 'slate', label: 'Citizen' }
}

const SELECT_CLS = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-purple-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'

const STATUS_COLORS = {
  open: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
}

function StatusPill({ status }) {
  const cls = STATUS_COLORS[status] || STATUS_COLORS.pending
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status?.replace('_', ' ') || 'open'}
    </span>
  )
}

function PriorityPill({ priority }) {
  const cls = PRIORITY_COLORS[priority] || PRIORITY_COLORS.low
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {priority || '—'}
    </span>
  )
}

// ── Complaint Detail Slide-over ────────────────────────────────────────────
function ComplaintDetailPanel({ complaint, onClose, onUpdate, officers, departments }) {
  const [status, setStatus] = useState(complaint.status || 'open')
  const [priority, setPriority] = useState(complaint.priority || 'medium')
  const [departmentId, setDepartmentId] = useState(complaint.department_id || '')
  const [officerId, setOfficerId] = useState(complaint.officer_id || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const fields = {
        status,
        priority,
        department_id: departmentId ? parseInt(departmentId, 10) : null,
        officer_id: officerId ? parseInt(officerId, 10) : null
      }
      await adminApi.updateAdminComplaint(complaint.id, fields)
      toast.success('Complaint updated')
      onUpdate()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not update complaint')
    } finally {
      setSaving(false)
    }
  }

  const citizen = complaint.is_anonymous ? 'Anonymous' : (complaint.citizen_name || 'Unknown')

  return (
    <div className="fixed inset-0 z-50 flex" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 p-6 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>#{complaint.id}</span>
              {complaint.external_id && <span>· {complaint.external_id}</span>}
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-2">{complaint.title || 'Untitled'}</h2>
          </div>
          <button onClick={onClose} className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status pills */}
          <div className="flex flex-wrap gap-2">
            <StatusPill status={complaint.status} />
            <PriorityPill priority={complaint.priority} />
            {complaint.category && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300 capitalize">
                {complaint.category}
              </span>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Citizen</div>
              <div className="font-medium text-slate-800 dark:text-slate-100">{citizen}</div>
              {!complaint.is_anonymous && complaint.citizen_email && (
                <div className="text-xs text-slate-400">{complaint.citizen_email}</div>
              )}
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Created</div>
              <div className="font-medium text-slate-800 dark:text-slate-100">
                {complaint.created_at ? new Date(complaint.created_at).toLocaleString() : '—'}
              </div>
            </div>
            {complaint.address && (
              <div className="col-span-2">
                <div className="text-xs text-slate-400 mb-0.5">Location</div>
                <div className="font-medium text-slate-800 dark:text-slate-100">{complaint.address}</div>
                {complaint.lat && complaint.lng && (
                  <div className="text-xs text-slate-400">{parseFloat(complaint.lat).toFixed(5)}, {parseFloat(complaint.lng).toFixed(5)}</div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {complaint.description && (
            <div>
              <div className="mb-1 text-xs font-medium text-slate-400 uppercase tracking-wide">Description</div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{complaint.description}</p>
            </div>
          )}

          {/* Images */}
          {complaint.images && complaint.images.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">Images</div>
              <div className="flex flex-wrap gap-2">
                {complaint.images.map((img) => (
                  <a key={img.id} href={img.url} target="_blank" rel="noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    <img src={img.url} alt="Complaint" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {complaint.ai_analysis && (
            <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
              <div className="mb-1 text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">AI Analysis</div>
              {complaint.ai_analysis.analysis && (
                <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
                  {typeof complaint.ai_analysis.analysis === 'object'
                    ? JSON.stringify(complaint.ai_analysis.analysis, null, 2)
                    : complaint.ai_analysis.analysis}
                </pre>
              )}
            </div>
          )}

          {/* Status History */}
          {complaint.status_history && complaint.status_history.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">Status History</div>
              <ol className="space-y-2">
                {complaint.status_history.map((h) => (
                  <li key={h.id} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span>
                      <span className="font-medium capitalize">{h.status_from?.replace('_', ' ')}</span>
                      {' → '}
                      <span className="font-medium capitalize">{h.status_to?.replace('_', ' ')}</span>
                      {h.changed_by_name && <span className="text-slate-400"> by {h.changed_by_name}</span>}
                      {h.note && <span className="block italic text-slate-400">"{h.note}"</span>}
                      <span className="block text-slate-400">{new Date(h.created_at).toLocaleString()}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Admin Actions */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Admin Actions</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT_CLS}>
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className={SELECT_CLS}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Department</label>
                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={SELECT_CLS}>
                  <option value="">— None —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Assign Officer</label>
                <select value={officerId} onChange={(e) => setOfficerId(e.target.value)} className={SELECT_CLS}>
                  <option value="">— Unassigned —</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminPortal() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') || 'overview'
  const [tab, setTab] = useState(tabParam)

  // Sync tab from URL param
  useEffect(() => {
    setTab(searchParams.get('tab') || 'overview')
  }, [searchParams])

  function switchTab(key) {
    setTab(key)
    setSearchParams(key === 'overview' ? {} : { tab: key })
  }

  function drillDownComplaints(filters = {}) {
    if (filters.status !== undefined) setComplaintStatusFilter(filters.status)
    if (filters.priority !== undefined) setComplaintPriorityFilter(filters.priority)
    if (filters.overdue) {
      setComplaintPriorityFilter('critical')
    }
    setComplaintsPage(1)
    switchTab('complaints')
  }

  function drillDownOfficers(status = 'pending') {
    setOfficersFilter(status)
    setOfficersPage(1)
    switchTab('officer-approvals')
  }

  // ── Dashboard state
  const [dashData, setDashData] = useState(null)
  const [dashLoading, setDashLoading] = useState(true)
  const [dashError, setDashError] = useState(null)

  // ── System Health state
  const [healthData, setHealthData] = useState(null)
  const [healthLoading, setHealthLoading] = useState(false)

  // ── Complaints tab state
  const [complaints, setComplaints] = useState([])
  const [complaintsTotal, setComplaintsTotal] = useState(0)
  const [complaintsPage, setComplaintsPage] = useState(1)
  const [complaintsLoading, setComplaintsLoading] = useState(false)
  const [complaintsError, setComplaintsError] = useState(null)
  const [complaintSearch, setComplaintSearch] = useState('')
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('')
  const [complaintPriorityFilter, setComplaintPriorityFilter] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState(null)

  // ── Users tab state
  const [users, setUsers] = useState([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [userQ, setUserQ] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState(null)

  // ── Departments tab state
  const [departments, setDepartments] = useState([])
  const [deptName, setDeptName] = useState('')
  const [deptDesc, setDeptDesc] = useState('')

  // ── Reports tab state
  const [reportSummary, setReportSummary] = useState(null)
  const [reportRows, setReportRows] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState(null)

  // ── Officers (for assignment dropdown)
  const [officers, setOfficers] = useState([])

  // ── Map tab state
  const [mapFilters, setMapFilters] = useState({})

  // ── Hotspots calculation
  const getHotspots = useCallback(() => {
    const groups = {}
    // We can group all currently loaded complaints to locate hotspots
    const list = complaints || []
    list.forEach((comp) => {
      const loc = comp.address || 'Central City'
      const cat = comp.category || 'General'
      const key = `${loc}-${cat}`
      if (!groups[key]) {
        groups[key] = {
          location: loc,
          category: cat,
          count: 0,
          unresolvedCount: 0
        }
      }
      groups[key].count++
      if (!['resolved', 'rejected', 'closed'].includes(comp.status)) {
        groups[key].unresolvedCount++
      }
    })
    return Object.values(groups).sort((a, b) => b.count - a.count).slice(0, 4)
  }, [complaints])

  // ── Audit Logs tab state
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLogsLoading, setAuditLogsLoading] = useState(false)
  const [auditLogsTotal, setAuditLogsTotal] = useState(0)
  const [auditLogsPage, setAuditLogsPage] = useState(1)
  const [auditLogsError, setAuditLogsError] = useState(null)
  const [auditActionFilter, setAuditActionFilter] = useState('')

  // ── Officer Approvals tab state
  const [officerApprovals, setOfficerApprovals] = useState([])
  const [officersFilter, setOfficersFilter] = useState('pending')
  const [officersPage, setOfficersPage] = useState(1)
  const [officersTotal, setOfficersTotal] = useState(0)
  const [officersLoading, setOfficersLoading] = useState(false)
  const [officersError, setOfficersError] = useState(null)

  // ── Email Center tab state
  const [emailLogs, setEmailLogs] = useState([])
  const [emailLogsLoading, setEmailLogsLoading] = useState(false)
  const [emailLogsTotal, setEmailLogsTotal] = useState(0)
  const [emailLogsPage, setEmailLogsPage] = useState(1)
  const [emailLogsError, setEmailLogsError] = useState(null)
  const [emailStats, setEmailStats] = useState(null)
  const [emailFilterStatus, setEmailFilterStatus] = useState('')
  const [emailFilterType, setEmailFilterType] = useState('')
  const [emailFilterRecipient, setEmailFilterRecipient] = useState('')
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [retryingEmailId, setRetryingEmailId] = useState(null)

  // ── Load dashboard on mount ──────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    setDashLoading(true)
    setDashError(null)
    try {
      const d = await adminApi.getDashboard()
      setDashData(d)
      try {
        const compRes = await adminApi.listAdminComplaints({ limit: 100 })
        setComplaints(compRes?.items || [])
      } catch (err) {
        // non-fatal
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not load admin dashboard.'
      setDashError({ message: msg, endpoint: 'GET /api/admin/dashboard' })
    } finally {
      setDashLoading(false)
    }
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  // ── Load officers for dropdowns ──────────────────────────────────────────
  const loadOfficers = useCallback(async () => {
    try {
      const r = await adminApi.listOfficers()
      setOfficers(Array.isArray(r) ? r : (r?.items || []))
    } catch (e) {
      // non-fatal
    }
  }, [])

  useEffect(() => { loadOfficers() }, [loadOfficers])

  // ── Load complaints ──────────────────────────────────────────────────────
  const loadComplaints = useCallback(async (page = 1, search = '', status = '', priority = '') => {
    setComplaintsLoading(true)
    setComplaintsError(null)
    try {
      const params = { page, limit: 20 }
      if (search) params.search = search
      if (status) params.status = status
      if (priority) params.priority = priority
      const r = await adminApi.listAdminComplaints(params)
      setComplaints(r?.items || [])
      setComplaintsTotal(r?.total || 0)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not load complaints'
      setComplaintsError({ message: msg, endpoint: 'GET /api/admin/complaints' })
    } finally {
      setComplaintsLoading(false)
    }
  }, [])

  // ── Load users ───────────────────────────────────────────────────────────
  const loadUsers = useCallback(async (q = '', page = 1) => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      const r = await adminApi.listUsers({ q: q || null, page, limit: 12 })
      setUsers(r?.items || [])
      setUsersTotal(r?.total || 0)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not load users'
      setUsersError({ message: msg, endpoint: 'GET /api/admin/users' })
    } finally {
      setUsersLoading(false)
    }
  }, [])

  // ── Load departments ─────────────────────────────────────────────────────
  const loadDepartments = useCallback(async () => {
    try {
      const r = await adminApi.listDepartments({ limit: 100 })
      setDepartments(r?.items || [])
    } catch (e) {
      toast.error('Could not load departments')
    }
  }, [])

  // ── Load reports ─────────────────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    setReportsLoading(true)
    setReportsError(null)
    try {
      const [sum, rows] = await Promise.all([
        adminApi.getReportSummary({}),
        adminApi.getReportComplaints({ limit: 50 })
      ])
      setReportSummary(sum)
      setReportRows(rows?.items || [])
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not load reports'
      setReportsError({ message: msg, endpoint: 'GET /api/admin/reports/complaints' })
    } finally {
      setReportsLoading(false)
    }
  }, [])

  // ── Load officer approvals ───────────────────────────────────────────────
  const loadOfficerApprovals = useCallback(async (status = 'pending', page = 1) => {
    setOfficersLoading(true)
    setOfficersError(null)
    try {
      // status: pending, active (Approved), rejected, suspended (Blocked)
      const r = await adminApi.listUsers({ role: 'officer', status, page, limit: 12 })
      setOfficerApprovals(r?.items || [])
      setOfficersTotal(r?.total || 0)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not load officer approvals.'
      setOfficersError({ message: msg, endpoint: `GET /api/admin/users?role=officer&status=${status}` })
    } finally {
      setOfficersLoading(false)
    }
  }, [])

  // ── Load audit logs ──────────────────────────────────────────────────────
  const loadAuditLogs = useCallback(async (action = '', page = 1) => {
    setAuditLogsLoading(true)
    setAuditLogsError(null)
    try {
      const r = await adminApi.listAuditLogs({ action: action || null, page, limit: 15 })
      setAuditLogs(r?.items || [])
      setAuditLogsTotal(r?.total || 0)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not load audit logs'
      setAuditLogsError({ message: msg, endpoint: 'GET /api/admin/audit-logs' })
    } finally {
      setAuditLogsLoading(false)
    }
  }, [])

  // ── Load system health ───────────────────────────────────────────────────
  const loadSystemHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const r = await adminApi.getSystemHealth()
      setHealthData(r)
    } catch (e) {
      toast.error('Could not load system health metrics')
    } finally {
      setHealthLoading(false)
    }
  }, [])

  // ── Load email logs & stats ──────────────────────────────────────────────
  const loadEmailLogs = useCallback(async (page = 1, recipient = '', status = '', eventType = '') => {
    setEmailLogsLoading(true)
    setEmailLogsError(null)
    try {
      const params = { page, limit: 15 }
      if (recipient) params.recipient = recipient
      if (status) params.status = status
      if (eventType) params.eventType = eventType
      const r = await adminApi.listEmailLogs(params)
      setEmailLogs(r?.items || [])
      setEmailLogsTotal(r?.total || 0)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not load email logs'
      setEmailLogsError({ message: msg, endpoint: 'GET /api/admin/email-logs' })
    } finally {
      setEmailLogsLoading(false)
    }
  }, [])

  const loadEmailStats = useCallback(async () => {
    try {
      const r = await adminApi.getEmailStats()
      setEmailStats(r)
    } catch (e) {
      // non-fatal
    }
  }, [])

  async function handleRetryEmail(id) {
    setRetryingEmailId(id)
    try {
      await adminApi.retryEmail(id)
      toast.success('Email retry request submitted')
      loadEmailLogs(emailLogsPage, emailFilterRecipient, emailFilterStatus, emailFilterType)
      loadEmailStats()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not retry email')
    } finally {
      setRetryingEmailId(null)
    }
  }

  // ── Tab effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab === 'complaints') loadComplaints(complaintsPage, complaintSearch, complaintStatusFilter, complaintPriorityFilter)
    if (tab === 'users') loadUsers(userQ, userPage)
    if (tab === 'departments') loadDepartments()
    if (tab === 'reports') loadReports()
    if (tab === 'officer-approvals') loadOfficerApprovals(officersFilter, officersPage)
    if (tab === 'audit-logs') loadAuditLogs(auditActionFilter, auditLogsPage)
    if (tab === 'email-center') {
      loadEmailLogs(emailLogsPage, emailFilterRecipient, emailFilterStatus, emailFilterType)
      loadEmailStats()
    }
    if (tab === 'system-health') loadSystemHealth()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when email logs parameters change
  useEffect(() => {
    if (tab === 'email-center') {
      loadEmailLogs(emailLogsPage, emailFilterRecipient, emailFilterStatus, emailFilterType)
    }
  }, [emailLogsPage, emailFilterRecipient, emailFilterStatus, emailFilterType]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when audit logs parameters change
  useEffect(() => {
    if (tab === 'audit-logs') {
      loadAuditLogs(auditActionFilter, auditLogsPage)
    }
  }, [auditActionFilter, auditLogsPage]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when officer approvals filters change
  useEffect(() => {
    if (tab === 'officer-approvals') {
      loadOfficerApprovals(officersFilter, officersPage)
    }
  }, [officersFilter, officersPage]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when complaints filters change
  useEffect(() => {
    if (tab === 'complaints') {
      loadComplaints(complaintsPage, complaintSearch, complaintStatusFilter, complaintPriorityFilter)
    }
  }, [complaintsPage, complaintSearch, complaintStatusFilter, complaintPriorityFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when user search/page changes
  useEffect(() => {
    if (tab === 'users') loadUsers(userQ, userPage)
  }, [userQ, userPage]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── User action handlers ─────────────────────────────────────────────────
  async function handleRoleChange(id, role) {
    try {
      await adminApi.updateUserRole(id, role)
      toast.success('Role updated')
      loadUsers(userQ, userPage)
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not update role')
    }
  }

  async function handleStatusToggle(id, current) {
    const next = current === 'active' ? 'suspended' : 'active'
    try {
      await adminApi.updateUserStatus(id, next)
      toast.success(`User ${next}`)
      loadUsers(userQ, userPage)
      loadOfficerApprovals(officersFilter, officersPage)
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not update status')
    }
  }

  async function handleApproveOfficer(id) {
    try {
      await adminApi.approveOfficer(id)
      toast.success('Officer approved')
      loadUsers(userQ, userPage)
      loadOfficerApprovals(officersFilter, officersPage)
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not approve officer')
    }
  }

  async function handleUpdateOfficerStatus(id, nextStatus) {
    try {
      await adminApi.updateUserStatus(id, nextStatus)
      toast.success(`Officer status updated to ${nextStatus}`)
      loadUsers(userQ, userPage)
      loadOfficerApprovals(officersFilter, officersPage)
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not update status')
    }
  }

  // ── Department handlers ──────────────────────────────────────────────────
  async function handleCreateDept(e) {
    e.preventDefault()
    if (!deptName.trim()) return
    try {
      await adminApi.createDepartment({ name: deptName, description: deptDesc })
      toast.success('Department created')
      setDeptName('')
      setDeptDesc('')
      loadDepartments()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not create department')
    }
  }

  async function handleDeleteDept(id) {
    if (!window.confirm('Delete this department?')) return
    try {
      await adminApi.deleteDepartment(id)
      toast.success('Department deleted')
      loadDepartments()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not delete department')
    }
  }

  // ── Export handler ───────────────────────────────────────────────────────
  async function handleExport() {
    try {
      const blob = await adminApi.exportReport({})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'complaints-report.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error('Could not export report')
    }
  }

  // ── Open complaint detail ────────────────────────────────────────────────
  async function openComplaint(id) {
    try {
      const c = await adminApi.getAdminComplaint(id)
      setSelectedComplaint(c)
      // Also load departments for the panel dropdowns
      if (departments.length === 0) loadDepartments()
    } catch (e) {
      toast.error('Could not load complaint details')
    }
  }

  const c = dashData?.complaints || {}
  const u = dashData?.users || {}

  const calculateCivicHealthScore = () => {
    const total = c.total || 0;
    if (total === 0) return null;

    let score = 100;
    const critical = c.critical || 0;
    score -= (critical * 10);

    const overdue = c.overdue || 0;
    score -= (overdue * 15);

    const open = c.open || 0;
    score -= (open * 2);

    return Math.max(0, Math.min(100, score));
  };
  const civicHealthScore = calculateCivicHealthScore();

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AdminShell title="Command Center" activeTab={tab} onTabClick={switchTab}>
      <PageHeader
        title="Municipal Operations Command Center"
        subtitle="Real-time overview of citizen complaints, municipal operations, and service performance."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Administrator
          </span>
        }
      />

      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <t.icon className="h-4 w-4" aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ────────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {dashLoading && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
              </div>
              <Skeleton className="h-72 rounded-lg" />
            </div>
          )}
          {dashError && !dashLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/20">
              <div className="flex items-center gap-2 mb-1 text-red-700 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">Unable to load dashboard</span>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400">{dashError.message}</p>
              <p className="mt-1 text-xs text-red-400 font-mono">{dashError.endpoint}</p>
              <button onClick={loadDashboard} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-red-700 hover:underline">
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          )}
          {!dashLoading && !dashError && dashData && (
            <>
              {/* 8 Clickable KPI cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div onClick={() => drillDownComplaints({})} className="cursor-pointer">
                  <DashboardCard title="Total Complaints" value={c.total || 0} icon={FileText} tone="brand" subtitle="Click to view queue" />
                </div>
                <div onClick={() => drillDownComplaints({ status: 'open' })} className="cursor-pointer">
                  <DashboardCard title="Open Complaints" value={c.open || 0} icon={Clock} tone="amber" subtitle="Awaiting assignment" />
                </div>
                <div onClick={() => drillDownComplaints({ status: 'in_progress' })} className="cursor-pointer">
                  <DashboardCard title="In Progress" value={c.inProgress || 0} icon={Activity} tone="emerald" subtitle="Active field operation" />
                </div>
                <div onClick={() => drillDownComplaints({ status: 'resolved' })} className="cursor-pointer">
                  <DashboardCard title="Resolved Issues" value={c.resolved || 0} icon={CheckCircle2} tone="emerald" subtitle={`${c.resolutionRate || 0}% resolution rate`} />
                </div>
                <div onClick={() => drillDownComplaints({ priority: 'critical' })} className="cursor-pointer">
                  <DashboardCard title="Critical Priority" value={c.critical || 0} icon={AlertTriangle} tone="red" subtitle="Immediate focus required" />
                </div>
                <div onClick={() => drillDownComplaints({ overdue: true })} className="cursor-pointer">
                  <DashboardCard title="Overdue SLA" value={c.overdue || 0} icon={AlertCircle} tone="red" subtitle="Response window breached" />
                </div>
                <div onClick={() => drillDownOfficers('pending')} className="cursor-pointer">
                  <DashboardCard title="Pending Approvals" value={c.pendingApprovals || 0} icon={UserCheck} tone="purple" subtitle="New officer registrations" />
                </div>
                <div onClick={() => drillDownOfficers('active')} className="cursor-pointer">
                  <DashboardCard title="Active Officers" value={c.activeOfficers || 0} icon={Users} tone="purple" subtitle="Deployed personnel" />
                </div>
              </div>

              {/* Live Operations status bar */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Live Operations Status</div>
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{c.open || 0} open complaints</span>
                  </div>
                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4 dark:border-slate-800">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>{c.inProgress || 0} in progress</span>
                  </div>
                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4 dark:border-slate-800">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span>{c.critical || 0} critical priority issues</span>
                  </div>
                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4 dark:border-slate-800">
                    <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
                    <span>{c.overdue || 0} SLA breached</span>
                  </div>
                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4 dark:border-slate-800">
                    <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
                    <span>{c.pendingApprovals || 0} approvals pending</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="card p-5 lg:col-span-2">
                  <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Operations Trend (Last 6 Months)</h3>
                  {(dashData?.monthly || []).length ? (
                    <TrendChart data={dashData.monthly.map((m) => ({ label: m.month, count: Number(m.count) || 0 }))} />
                  ) : (
                    <EmptyState title="No trend data yet" />
                  )}
                </div>
                {/* Civic Health Score Card */}
                <div className="card p-5">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">City Civic Health Score</h3>
                  {civicHealthScore === null ? (
                    <div className="mt-4 text-xs font-semibold text-slate-500">
                      Insufficient data to calculate civic health score.
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-5xl font-extrabold text-emerald-600 dark:text-emerald-400">
                          {civicHealthScore}
                        </span>
                        <span className="text-sm font-semibold text-slate-400">/ 100</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">Measurable health indicator computed transparently from active critical complaints, SLA compliance rates, and resolution backlog.</p>
                      <div className="mt-6 space-y-3">
                        {(dashData?.departments || []).slice(0, 4).map((d) => (
                          <div key={d.id} className="text-xs">
                            <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-300">
                              <span className="truncate max-w-[150px]">{d.name}</span>
                              <span>{Math.round(d.resolution_rate)}% resolved</span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${d.resolution_rate}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="card p-5">
                  <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Department Performance</h3>
                  {(dashData?.departments || []).length === 0 ? (
                    <EmptyState title="No departments" />
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {dashData.departments.map((d) => (
                        <li key={d.id} className="py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{d.name}</span>
                            <span className="text-xs text-slate-400">{d.resolved_count || 0}/{d.complaint_count || 0} resolved</span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-emerald-505 bg-emerald-500" style={{ width: `${d.resolution_rate || 0}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="card p-5">
                  <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Officer Performance</h3>
                  {(dashData?.officers || []).length === 0 ? (
                    <EmptyState title="No officers yet" />
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {dashData.officers.map((o) => (
                        <li key={o.id} className="flex items-center justify-between py-3">
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{o.name}</span>
                          <span className="text-xs text-slate-400">{o.assigned_count || 0} assigned · {o.resolution_rate || 0}% resolved</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Category distribution + Civic Hotspots */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
                <div className="card p-5">
                  <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Category Distribution</h3>
                  {(dashData?.categories || []).length ? (
                    <div className="h-64">
                      <ChartPie data={dashData.categories.map((x) => ({ name: x.category, value: Number(x.count) || 0 }))} />
                    </div>
                  ) : (
                    <EmptyState title="No category data yet" />
                  )}
                </div>

                <div className="card p-5">
                  <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Civic Hotspots</h3>
                  <p className="text-xs text-slate-400 mb-4">High complaint densities computed dynamically from active reports.</p>
                  {getHotspots().length === 0 ? (
                    <EmptyState title="No hotspots detected" subtitle="Civic health is stable across all city sectors." />
                  ) : (
                    <div className="space-y-3">
                      {getHotspots().map((h, i) => (
                        <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-slate-800 dark:text-white">{h.location}</div>
                            <div className="text-xs text-slate-500 capitalize">High {h.category} activity • {h.unresolvedCount} unresolved</div>
                          </div>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950/30 dark:text-red-400">
                            {h.count} issues
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Complaints ──────────────────────────────────────────────────────── */}
      {tab === 'complaints' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full max-w-xs">
              <Input
                value={complaintSearch}
                onChange={(e) => { setComplaintSearch(e.target.value); setComplaintsPage(1) }}
                placeholder="Search complaints…"
              />
            </div>
            <select
              value={complaintStatusFilter}
              onChange={(e) => { setComplaintStatusFilter(e.target.value); setComplaintsPage(1) }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={complaintPriorityFilter}
              onChange={(e) => { setComplaintPriorityFilter(e.target.value); setComplaintsPage(1) }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <span className="ml-auto text-sm text-slate-500">{complaintsTotal} complaint{complaintsTotal !== 1 ? 's' : ''}</span>
          </div>

          {/* Error */}
          {complaintsError && !complaintsLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">Unable to load complaints</span>
              </div>
              <p className="mt-1 text-xs text-red-400 font-mono">{complaintsError.endpoint}</p>
              <button onClick={() => loadComplaints(complaintsPage, complaintSearch, complaintStatusFilter, complaintPriorityFilter)} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:underline">
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {/* Skeleton */}
          {complaintsLoading && (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          )}

          {/* Table */}
          {!complaintsLoading && !complaintsError && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Priority</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Citizen</th>
                      <th className="px-4 py-3 font-medium">Department</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {complaints.map((row) => (
                      <tr key={row.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{row.id}</td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <div className="truncate font-medium text-slate-800 dark:text-slate-100">{row.title || 'Untitled'}</div>
                          {row.summary && <div className="truncate text-xs text-slate-400">{row.summary}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-500 capitalize dark:text-slate-400">{row.category || '—'}</td>
                        <td className="px-4 py-3"><PriorityPill priority={row.priority} /></td>
                        <td className="px-4 py-3"><StatusPill status={row.status} /></td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {row.is_anonymous ? <span className="italic text-xs">Anonymous</span> : (row.citizen_name || '—')}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{row.department_name || <span className="text-xs italic">Unassigned</span>}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openComplaint(row.id)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-purple-600 transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/30"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {complaints.length === 0 && !complaintsLoading && (
                <EmptyState title="No complaints found" subtitle="Try adjusting your filters." />
              )}
            </div>
          )}

          {/* Pagination */}
          {complaintsTotal > 20 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={complaintsPage <= 1} onClick={() => setComplaintsPage(complaintsPage - 1)}>Prev</Button>
              <span className="px-3 text-sm text-slate-500">Page {complaintsPage} of {Math.ceil(complaintsTotal / 20)}</span>
              <Button variant="outline" size="sm" disabled={complaintsPage * 20 >= complaintsTotal} onClick={() => setComplaintsPage(complaintsPage + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      {/* ── Map ─────────────────────────────────────────────────────────────── */}
      {tab === 'map' && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="admin-map-status" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
                <select id="admin-map-status" value={mapFilters.status || ''} onChange={(e) => setMapFilters((p) => ({ ...p, status: e.target.value || null }))} className={SELECT_CLS}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="admin-map-cat" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Category</label>
                <select id="admin-map-cat" value={mapFilters.category || ''} onChange={(e) => setMapFilters((p) => ({ ...p, category: e.target.value || null }))} className={SELECT_CLS}>
                  {CATEGORY_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="admin-map-prio" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Priority</label>
                <select id="admin-map-prio" value={mapFilters.priority || ''} onChange={(e) => setMapFilters((p) => ({ ...p, priority: e.target.value || null }))} className={SELECT_CLS}>
                  {PRIORITY_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          <MapView height={560} filters={mapFilters} />
        </div>
      )}

      {/* ── Users ───────────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="w-full max-w-sm">
              <Input value={userQ} onChange={(e) => { setUserQ(e.target.value); setUserPage(1) }} placeholder="Search users…" />
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">{usersTotal} users</span>
          </div>

          {usersError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">Unable to load users</span>
              </div>
              <p className="mt-1 text-xs text-red-400 font-mono">{usersError.endpoint}</p>
              <button onClick={() => loadUsers(userQ, userPage)} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:underline">
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {usersLoading && <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>}

          {!usersLoading && !usersError && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Joined</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map((user) => (
                      <tr key={user.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-xs font-semibold text-white">
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-800 dark:text-slate-100">{user.name}</div>
                              <div className="truncate text-xs text-slate-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            aria-label={`Change role for ${user.name}`}
                          >
                            <option value="citizen">Citizen</option>
                            <option value="officer">Officer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={user.status === 'active' ? 'brand' : 'red'} dot>{user.status || 'active'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {user.role === 'officer' && user.status === 'pending' && (
                              <button
                                onClick={() => handleApproveOfficer(user.id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700"
                              >
                                <UserCheck className="h-3.5 w-3.5" aria-hidden="true" /> Approve
                              </button>
                            )}
                            <button
                              onClick={() => handleStatusToggle(user.id, user.status)}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                user.status === 'active'
                                  ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                                  : 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                              }`}
                            >
                              <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                              {user.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users.length === 0 && <EmptyState title="No users found" />}
            </div>
          )}

          {usersTotal > 12 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={userPage <= 1} onClick={() => setUserPage(userPage - 1)}>Prev</Button>
              <span className="px-3 text-sm text-slate-500">Page {userPage}</span>
              <Button variant="outline" size="sm" disabled={userPage * 12 >= usersTotal} onClick={() => setUserPage(userPage + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      {/* ── Officer Approvals ─────────────────────────────────────────────────── */}
      {tab === 'officer-approvals' && (
        <div className="space-y-4">
          {/* Header tabs for statuses: pending, active (Approved), rejected, suspended (Blocked) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex gap-2">
              {[
                { key: 'pending', label: 'Pending Approvals' },
                { key: 'active', label: 'Approved Officers' },
                { key: 'rejected', label: 'Rejected' },
                { key: 'suspended', label: 'Blocked / Suspended' }
              ].map((subTab) => (
                <button
                  key={subTab.key}
                  onClick={() => { setOfficersFilter(subTab.key); setOfficersPage(1) }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    officersFilter === subTab.key
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {subTab.label}
                </button>
              ))}
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">{officersTotal} officers</span>
          </div>

          {officersError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">Unable to load officer approvals</span>
              </div>
              <p className="mt-1 text-xs text-red-400 font-mono">{officersError.endpoint}</p>
              <button onClick={() => loadOfficerApprovals(officersFilter, officersPage)} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:underline">
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {officersLoading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
            </div>
          )}

          {!officersLoading && !officersError && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {officerApprovals.map((officer) => {
                const metadata = officer.settings || {}
                const deptName = departments.find(d => d.id === officer.department_id)?.name || 'Unassigned Department'

                return (
                  <div key={officer.id} className="card p-5 flex flex-col justify-between h-full space-y-4 hover:shadow-md transition-shadow">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-semibold dark:bg-purple-900/30 dark:text-purple-300">
                          {officer.name?.charAt(0)?.toUpperCase() || 'O'}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{officer.name}</div>
                          <div className="truncate text-xs text-slate-400">{officer.email}</div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-400">Department:</span>
                          <span className="font-medium text-right truncate max-w-[150px]">{deptName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-400">Employee ID:</span>
                          <span className="font-medium font-mono text-right">{metadata.employee_id || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-400">City / Mun:</span>
                          <span className="font-medium text-right">{metadata.city || '—'}</span>
                        </div>
                        {metadata.designation && (
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-400">Designation:</span>
                            <span className="font-medium text-right">{metadata.designation}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-400">Joined:</span>
                          <span className="font-medium text-right">
                            {officer.created_at ? new Date(officer.created_at).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex gap-2">
                      {officersFilter === 'pending' && (
                        <>
                          <Button
                            onClick={() => handleApproveOfficer(officer.id)}
                            className="flex-1 text-xs py-1 px-2"
                            tone="brand"
                          >
                            Approve
                          </Button>
                          <button
                            onClick={() => handleUpdateOfficerStatus(officer.id, 'rejected')}
                            className="flex-1 text-xs py-1 px-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {officersFilter === 'active' && (
                        <button
                          onClick={() => handleUpdateOfficerStatus(officer.id, 'suspended')}
                          className="w-full text-xs py-1 px-2 border border-amber-500 text-amber-500 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20"
                        >
                          Suspend / Block
                        </button>
                      )}
                      {(officersFilter === 'rejected' || officersFilter === 'suspended') && (
                        <Button
                          onClick={() => handleApproveOfficer(officer.id)}
                          className="w-full text-xs py-1 px-2"
                          tone="brand"
                        >
                          Approve / Re-activate
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {officerApprovals.length === 0 && !officersLoading && !officersError && (
            <EmptyState
              title={`No ${officersFilter} officers`}
              subtitle={`There are no officer accounts in the "${officersFilter}" state.`}
            />
          )}

          {officersTotal > 12 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={officersPage <= 1} onClick={() => setOfficersPage(officersPage - 1)}>Prev</Button>
              <span className="px-3 text-sm text-slate-500">Page {officersPage}</span>
              <Button variant="outline" size="sm" disabled={officersPage * 12 >= officersTotal} onClick={() => setOfficersPage(officersPage + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      {/* ── Departments ─────────────────────────────────────────────────────── */}
      {tab === 'departments' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card p-5 lg:col-span-1">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Create Department</h3>
            <form onSubmit={handleCreateDept} className="space-y-3">
              <Input label="Name" value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g. Sanitation" required />
              <div>
                <label htmlFor="dept-desc" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  id="dept-desc"
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 dark:bg-surface-dark dark:text-slate-100 dark:border-slate-600"
                  placeholder="Optional description"
                />
              </div>
              <Button type="submit" className="w-full"><Plus className="h-4 w-4" aria-hidden="true" /> Create</Button>
            </form>
          </div>
          <div className="card p-5 lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Departments ({departments.length})</h3>
            {departments.length === 0 ? (
              <EmptyState title="No departments yet" subtitle="Create your first department to start assigning complaints." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {departments.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-purple-500" aria-hidden="true" />
                        <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{d.name}</span>
                      </div>
                      {d.description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">{d.description}</p>}
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                        <span>{d.officer_count || 0} officers</span>
                        <span>·</span>
                        <span>{d.complaint_count || 0} complaints</span>
                        <span>·</span>
                        <span>{d.resolved_count || 0} resolved</span>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteDept(d.id)} aria-label={`Delete ${d.name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Reports ─────────────────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <div className="space-y-6">
          {reportsLoading && <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>}

          {reportsError && !reportsLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">Unable to load reports</span>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{reportsError.message}</p>
              <p className="mt-1 text-xs text-red-400 font-mono">{reportsError.endpoint}</p>
              <button onClick={loadReports} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:underline">
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {!reportsLoading && !reportsError && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-4">
                  <DashboardCard title="Total" value={reportSummary?.total || 0} icon={FileText} tone="brand" />
                  <DashboardCard title="Resolved" value={reportSummary?.resolved || 0} icon={CheckCircle2} tone="brand" />
                  <DashboardCard title="Open" value={reportSummary?.open || 0} icon={AlertTriangle} tone="amber" />
                  <DashboardCard title="In Progress" value={reportSummary?.inProgress || 0} icon={Clock} tone="amber" />
                </div>
                <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</Button>
              </div>

              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">ID</th>
                        <th className="px-4 py-3 font-medium">Title</th>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium">Priority</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Citizen</th>
                        <th className="px-4 py-3 font-medium">Department</th>
                        <th className="px-4 py-3 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reportRows.map((r) => (
                        <tr key={r.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{r.id}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => openComplaint(r.id)}
                              className="font-medium text-slate-800 hover:text-purple-600 dark:text-slate-100 dark:hover:text-purple-400 text-left"
                            >
                              {r.title || 'Untitled'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 capitalize">{r.category || '—'}</td>
                          <td className="px-4 py-3"><PriorityPill priority={r.priority} /></td>
                          <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.citizen_name || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.department_name || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {reportRows.length === 0 && <EmptyState title="No complaints in this report" />}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Audit Logs ──────────────────────────────────────────────────────── */}
      {tab === 'audit-logs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <select
                value={auditActionFilter}
                onChange={(e) => { setAuditActionFilter(e.target.value); setAuditLogsPage(1) }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">All Actions</option>
                <option value="admin_login">Admin Logins</option>
                <option value="officer_approval">Officer Approvals</option>
                <option value="complaint_assignment">Assignments</option>
                <option value="complaint_update">Complaint Updates</option>
                <option value="role_change">Role Changes</option>
                <option value="user_blocking">User Blocks</option>
              </select>
            </div>
            <span className="text-xs font-bold text-slate-500">{auditLogsTotal} logs recorded</span>
          </div>

          {auditLogsLoading && <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>}

          {auditLogsError && !auditLogsLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">Unable to load audit logs</span>
              </div>
              <button onClick={() => loadAuditLogs(auditActionFilter, auditLogsPage)} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:underline">
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {!auditLogsLoading && !auditLogsError && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Timestamp</th>
                      <th className="px-4 py-3 font-semibold">Actor</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                      <th className="px-4 py-3 font-semibold">Target</th>
                      <th className="px-4 py-3 font-semibold">Details</th>
                      <th className="px-4 py-3 font-semibold">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-slate-400 font-mono">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold">{log.actor_name || 'System'}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{log.actor_role}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {log.target_id ? (
                            <span>{log.target_type || 'ID'}: <strong className="font-mono">#{log.target_id}</strong></span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 max-w-[250px] truncate animate-fade-in" title={JSON.stringify(log.details)}>
                          {JSON.stringify(log.details)}
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono">{log.ip_address || 'local'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {auditLogs.length === 0 && <EmptyState title="No audit logs found" subtitle="No actions recorded under this filter yet." />}
            </div>
          )}

          {auditLogsTotal > 15 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={auditLogsPage <= 1} onClick={() => setAuditLogsPage(auditLogsPage - 1)}>Prev</Button>
              <span className="px-3 text-sm text-slate-500">Page {auditLogsPage}</span>
              <Button variant="outline" size="sm" disabled={auditLogsPage * 15 >= auditLogsTotal} onClick={() => setAuditLogsPage(auditLogsPage + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      {/* ── Email Center ────────────────────────────────────────────────────── */}
      {tab === 'email-center' && (
        <div className="space-y-6 animate-fade-in">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { name: 'Total Emails', count: emailStats?.total, color: 'text-slate-900 dark:text-white' },
              { name: 'Sent Successfully', count: emailStats?.sent, color: 'text-emerald-600 dark:text-emerald-400' },
              { name: 'Failed Deliveries', count: emailStats?.failed, color: 'text-red-600 dark:text-red-400' },
              { name: 'Pending Queue', count: emailStats?.pending, color: 'text-amber-500' },
              { name: 'Last 24 Hours', count: emailStats?.last24h, color: 'text-blue-600 dark:text-blue-400' },
              { name: 'Last 7 Days', count: emailStats?.last7d, color: 'text-purple-600 dark:text-purple-400' }
            ].map((stat, idx) => (
              <div key={idx} className="card p-4 text-center">
                <div className="text-xs text-slate-400 font-medium mb-1 truncate">{stat.name}</div>
                <div className={`text-2xl font-black ${stat.color}`}>
                  {stat.count !== undefined ? stat.count : '—'}
                </div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={emailFilterRecipient}
                onChange={(e) => { setEmailFilterRecipient(e.target.value); setEmailLogsPage(1) }}
                placeholder="Search recipient email..."
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 w-48 outline-none"
              />
              <select
                value={emailFilterStatus}
                onChange={(e) => { setEmailFilterStatus(e.target.value); setEmailLogsPage(1) }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
              <select
                value={emailFilterType}
                onChange={(e) => { setEmailFilterType(e.target.value); setEmailLogsPage(1) }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">All Events</option>
                <option value="WELCOME">WELCOME</option>
                <option value="PASSWORD_RESET">PASSWORD_RESET</option>
                <option value="EMAIL_VERIFICATION">EMAIL_VERIFICATION</option>
                <option value="COMPLAINT_SUBMITTED">COMPLAINT_SUBMITTED</option>
                <option value="COMPLAINT_STATUS_CHANGED">COMPLAINT_STATUS_CHANGED</option>
                <option value="COMPLAINT_ASSIGNED">COMPLAINT_ASSIGNED</option>
                <option value="OFFICER_APPROVED">OFFICER_APPROVED</option>
                <option value="OFFICER_REJECTED">OFFICER_REJECTED</option>
                <option value="OFFICER_PENDING_APPROVAL">OFFICER_PENDING_APPROVAL</option>
                <option value="COMPLAINT_RESOLVED">COMPLAINT_RESOLVED</option>
                <option value="COMPLAINT_REOPENED">COMPLAINT_REOPENED</option>
                <option value="SLA_WARNING">SLA_WARNING</option>
                <option value="SLA_BREACH">SLA_BREACH</option>
              </select>
            </div>
            <span className="text-xs font-bold text-slate-500">{emailLogsTotal} emails logged</span>
          </div>

          {/* Logs Table */}
          {emailLogsLoading && <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>}

          {emailLogsError && !emailLogsLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">Unable to load email logs</span>
              </div>
              <button onClick={() => loadEmailLogs(emailLogsPage, emailFilterRecipient, emailFilterStatus, emailFilterType)} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:underline">
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {!emailLogsLoading && !emailLogsError && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Logged At</th>
                      <th className="px-4 py-3 font-semibold">Recipient</th>
                      <th className="px-4 py-3 font-semibold">Event Type</th>
                      <th className="px-4 py-3 font-semibold">Subject</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-center">Attempts</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {emailLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-slate-400 font-mono">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 font-medium">{log.recipient}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{log.event_type}</td>
                        <td className="px-4 py-3 truncate max-w-[200px]" title={log.subject}>{log.subject}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            log.status === 'sent' ? 'bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400' :
                            log.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">{log.attempt_count}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => setSelectedEmail(log)}
                            className="text-purple-600 hover:text-purple-800 font-semibold"
                          >
                            Details
                          </button>
                          {(log.status === 'failed' || log.status === 'pending') && (
                            <button
                              onClick={() => handleRetryEmail(log.id)}
                              disabled={retryingEmailId === log.id}
                              className="text-emerald-600 hover:text-emerald-800 font-semibold disabled:opacity-50"
                            >
                              {retryingEmailId === log.id ? 'Retrying...' : 'Retry'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {emailLogs.length === 0 && <EmptyState title="No email logs found" subtitle="No emails match the selected filters." />}
            </div>
          )}

          {emailLogsTotal > 15 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={emailLogsPage <= 1} onClick={() => setEmailLogsPage(emailLogsPage - 1)}>Prev</Button>
              <span className="px-3 text-sm text-slate-500">Page {emailLogsPage}</span>
              <Button variant="outline" size="sm" disabled={emailLogsPage * 15 >= emailLogsTotal} onClick={() => setEmailLogsPage(emailLogsPage + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedEmail(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Email Log Details</h3>
              <button onClick={() => setSelectedEmail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div><span className="font-bold text-slate-400 block mb-0.5">Recipient</span> <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">{selectedEmail.recipient}</span></div>
              <div><span className="font-bold text-slate-400 block mb-0.5">Subject</span> <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">{selectedEmail.subject}</span></div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-bold text-slate-400 block mb-0.5">Event Type</span> <span className="font-mono">{selectedEmail.event_type}</span></div>
                <div><span className="font-bold text-slate-400 block mb-0.5">Status</span> <span className="capitalize">{selectedEmail.status}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-bold text-slate-400 block mb-0.5">Logged At</span> <span>{selectedEmail.created_at ? new Date(selectedEmail.created_at).toLocaleString() : '—'}</span></div>
                <div><span className="font-bold text-slate-400 block mb-0.5">Sent At</span> <span>{selectedEmail.sent_at ? new Date(selectedEmail.sent_at).toLocaleString() : '—'}</span></div>
              </div>
              {selectedEmail.provider_message_id && (
                <div><span className="font-bold text-slate-400 block mb-0.5">Provider Message ID</span> <span className="font-mono">{selectedEmail.provider_message_id}</span></div>
              )}
              {selectedEmail.error_message && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 text-red-600 dark:text-red-400">
                  <span className="font-bold block mb-0.5">Delivery Error</span>
                  <p className="font-mono leading-relaxed">{selectedEmail.error_message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── System Health & Settings ─────────────────────────────────────────── */}
      {tab === 'system-health' && (
        <div className="space-y-6 animate-fade-in">
          {healthLoading && !healthData ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { name: 'Database Service', type: 'Neon PostgreSQL Instance', icon: Database, status: healthData?.database || 'unavailable' },
                { name: 'Backend API Server', type: 'Node Express Endpoint', icon: Server, status: 'operational' },
                { name: 'AI Intelligence Hub', type: 'Classification & Priority Engine', icon: Sparkles, status: healthData?.ai || 'unavailable' },
                { name: 'Map Search Service', type: 'Geoapify Geocoding API', icon: Map, status: healthData?.map || 'unavailable' },
                { name: 'Cloudinary CDN', type: 'Media resolution assets storage', icon: FileText, status: healthData?.cloudinary || 'unavailable' },
                { name: 'SMTP Email Delivery', type: 'Verification & Alert service', icon: Activity, status: healthData?.smtp || 'unavailable' }
              ].map((service, i) => {
                const isOp = service.status === 'operational';
                const isDeg = service.status === 'degraded';
                const isNotConfig = service.status === 'not_configured';
                
                let pillClass = 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400';
                let label = 'Unavailable';
                if (isOp) {
                  pillClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400';
                  label = 'Operational';
                } else if (isDeg) {
                  pillClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-400';
                  label = 'Degraded';
                } else if (isNotConfig) {
                  pillClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
                  label = 'Not Configured';
                }

                return (
                  <div key={i} className="card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <service.icon className="h-5 w-5" />
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${pillClass} capitalize`}>
                        ● {label}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">{service.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{service.type}</p>
                    </div>
                    <div className="text-xs border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between text-slate-400">
                      <span>Verification Check</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300 capitalize">{service.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="card p-6">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4">SLA Control Settings</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Critical Priority SLA</label>
                <input type="text" readOnly value="4 Hours" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 cursor-not-allowed text-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">High Priority SLA</label>
                <input type="text" readOnly value="12 Hours" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 cursor-not-allowed text-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Medium Priority SLA</label>
                <input type="text" readOnly value="48 Hours" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 cursor-not-allowed text-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Low Priority SLA</label>
                <input type="text" readOnly value="72 Hours" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 cursor-not-allowed text-slate-500" />
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">SLA windows dictate dynamic escalation triggers. When issues breach thresholds, alert states are logged automatically in audit history.</p>
          </div>
        </div>
      )}

      {/* ── Complaint Detail Slide-over ──────────────────────────────────────── */}
      {selectedComplaint && (
        <ComplaintDetailPanel
          complaint={selectedComplaint}
          officers={officers}
          departments={departments}
          onClose={() => setSelectedComplaint(null)}
          onUpdate={async () => {
            // Refresh the detail panel with fresh data
            try {
              const fresh = await adminApi.getComplaint(selectedComplaint.id)
              setSelectedComplaint(fresh)
            } catch (e) {
              setSelectedComplaint(null)
            }
            // Also refresh the relevant list
            if (tab === 'complaints') loadComplaints(complaintsPage, complaintSearch, complaintStatusFilter, complaintPriorityFilter)
            if (tab === 'reports') loadReports()
          }}
        />
      )}
    </AdminShell>
  )
}
