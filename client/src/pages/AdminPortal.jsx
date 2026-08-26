import React, { useEffect, useState, useCallback, useMemo, useContext, useRef } from 'react'
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom'
import {
  Users, FileText, CheckCircle2, Clock, Building2, UserCog, TrendingUp,
  Download, Plus, Trash2, ShieldCheck, Map, AlertTriangle, X, ChevronRight,
  RefreshCw, Eye, UserCheck, AlertCircle, BarChart2, ShieldAlert, Activity,
  Server, Database, AlertOctagon, Sparkles, MapPin, CheckCircle, Mail,
  Bell, CheckCheck, UserX, Layers, ArrowLeft, Shield, Image as ImageIcon,
  Calendar, User, LogIn, LogOut, Award
} from 'lucide-react'
import Chart from 'chart.js/auto'
import ThemeContext from '../context/ThemeContext'
import AuthContext from '../context/AuthContext'
import MapView from '../components/MapView'
import Timeline from '../components/Timeline'
import { STATUS_OPTIONS, PRIORITY_OPTIONS, CATEGORY_OPTIONS, TIME_OPTIONS, RADIUS_OPTIONS } from '../config/mapConfig'
import adminApi from '../services/admin'
import officerApi from '../services/officer'
import notificationsApi from '../services/notifications'
import AdminShell from '../components/AdminShell'
import CommandCenterOverview from '../components/admin/CommandCenterOverview'
import OfficerApprovals from '../components/admin/OfficerApprovals'
import SystemHealthView from '../components/admin/SystemHealthView'
import EmailCenterView from '../components/admin/EmailCenterView'
import AuditLogsView from '../components/admin/AuditLogsView'
import RoleChangeModal from '../components/admin/RoleChangeModal'
import ReputationManagementView from '../components/admin/ReputationManagementView'
import UserDirectoryView from '../components/admin/UserDirectoryView'
import CivicIntelligenceView from '../components/admin/CivicIntelligenceView'
import GovernanceOverview from '../components/governance/GovernanceOverview'
import DepartmentGovernanceView from '../components/governance/DepartmentGovernanceView'
import OfficerGovernanceView from '../components/governance/OfficerGovernanceView'
import SlaIntelligenceView from '../components/governance/SlaIntelligenceView'
import WardGovernanceView from '../components/governance/WardGovernanceView'
import ReportCenterView from '../components/governance/ReportCenterView'
import DataQualityAlertsView from '../components/governance/DataQualityAlertsView'
import AIExecutiveSummaryModal from '../components/governance/AIExecutiveSummaryModal'
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
import { API_BASE } from '../services/api'

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = API_BASE;
  const serverHost = base.replace(/\/api$/, '');
  return `${serverHost}${url.startsWith('/') ? '' : '/'}${url}`;
};

// ── Constants ──────────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview', label: 'Command Center', icon: TrendingUp },
  { key: 'complaints', label: 'Complaints Queue', icon: FileText },
  { key: 'intelligence', label: 'Civic Intelligence', icon: Sparkles },
  { key: 'map', label: 'Municipal GIS', icon: Map },
  { key: 'sla', label: 'SLA Intelligence', icon: Clock },
  { key: 'wards', label: 'Wards & Zones', icon: Layers },
  { key: 'departments', label: 'Departments', icon: Building2 },
  { key: 'officer-approvals', label: 'Officer Management', icon: UserCheck },
  { key: 'reputation', label: 'Reputation & Scores', icon: Award },
  { key: 'users', label: 'User Directory', icon: Users },
  { key: 'reports', label: 'Analytics & Reports', icon: BarChart2 },
  { key: 'data-quality', label: 'Data Quality & Alerts', icon: ShieldAlert },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck },
  { key: 'email-center', label: 'Email Center', icon: Mail },
  { key: 'system-health', label: 'System Health', icon: Activity }
]

const ROLE_BADGE = {
  admin: { tone: 'purple', label: 'Admin' },
  officer: { tone: 'cyan', label: 'Officer' },
  citizen: { tone: 'slate', label: 'Citizen' }
}

function SubmittedResolvedChart({ trend, dark }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!trend || trend.length === 0 || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    
    // Sort trend by day
    const sorted = [...(trend || [])].sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());
    
    // Format day labels
    const labels = sorted.map(d => {
      const dt = new Date(d.day);
      return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });
    
    const createdVals = sorted.map(d => d.created || 0);
    const resolvedVals = sorted.map(d => d.resolved || 0);

    const gridColor = dark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)';
    const textColor = dark ? '#94a3b8' : '#64748b';

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Submitted',
            data: createdVals,
            borderColor: '#6366f1', // Indigo
            backgroundColor: dark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.05)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#6366f1',
            pointRadius: 2
          },
          {
            label: 'Resolved',
            data: resolvedVals,
            borderColor: '#10b981', // Emerald Green
            backgroundColor: dark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.05)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#10b981',
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: textColor,
              boxWidth: 10,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: dark ? '#1e293b' : '#ffffff',
            titleColor: dark ? '#e2e8f0' : '#0f172a',
            bodyColor: dark ? '#cbd5e1' : '#334155',
            borderColor: 'rgba(148,163,184,0.2)',
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, maxTicksLimit: 10 }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, precision: 0 },
            beginAtZero: true
          }
        }
      }
    });

    return () => {
      chart.destroy();
    };
  }, [trend, dark]);

  if (!trend || trend.length === 0) {
    return (
      <div className="h-[280px] flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-405">
        <AlertCircle className="h-8 w-8 mb-2 text-slate-300" />
        <span className="text-xs font-semibold text-slate-400">No analytics data available</span>
      </div>
    );
  }

  return (
    <div className="h-[280px]">
      <canvas ref={canvasRef} />
    </div>
  );
}

const SELECT_CLS = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-purple-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'

const STATUS_COLORS = {
  open: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
  submitted: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
  in_progress: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
  resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-[#34D399] dark:border-emerald-500/30',
  closed: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  reopened: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30',
  rejected: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30',
  pending: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
}

const PRIORITY_COLORS = {
  critical: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30',
  high: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
  low: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
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

// ── Full-Page Admin Case Workspace ───────────────────────────────────────────
function AdminCaseWorkspace({ complaintId, onBack, officers: initialOfficers = [], departments: initialDepartments = [], onRefreshQueue }) {
  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [caseTab, setCaseTab] = useState('overview') // 'overview', 'timeline', 'assignment', 'evidence', 'ai', 'audit'

  // Departments & Officers State
  const [deptList, setDeptList] = useState(initialDepartments || [])
  const [deptOfficers, setDeptOfficers] = useState([])
  const [loadingOfficers, setLoadingOfficers] = useState(false)

  // Teams & Resource Requests
  const [supportTeam, setSupportTeam] = useState(null)
  const [resourceRequests, setResourceRequests] = useState([])
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [selectedReqForApproval, setSelectedReqForApproval] = useState(null)
  const [customTeamName, setCustomTeamName] = useState('')
  const [customMembersText, setCustomMembersText] = useState('')
  const [reworkModalOpen, setReworkModalOpen] = useState(false)
  const [reworkReason, setReworkReason] = useState('')

  // Edit State
  const [status, setStatus] = useState('open')
  const [priority, setPriority] = useState('medium')
  const [departmentId, setDepartmentId] = useState('')
  const [officerId, setOfficerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  // Modals State
  const [reassignModalOpen, setReassignModalOpen] = useState(false)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState('')

  // Fetch all departments if not supplied
  useEffect(() => {
    if (!deptList || deptList.length === 0) {
      adminApi.listDepartments().then(d => {
        setDeptList(Array.isArray(d) ? d : (d?.items || []));
      }).catch(() => {});
    }
  }, [deptList]);

  // Load Department Officers dynamically whenever departmentId changes
  const loadDeptOfficers = useCallback(async (targetDeptId) => {
    setLoadingOfficers(true);
    try {
      const res = await adminApi.listOfficers({ departmentId: targetDeptId || null });
      const list = Array.isArray(res) ? res : (res?.items || res?.officers || []);
      setDeptOfficers(list);
    } catch (e) {
      setDeptOfficers([]);
    } finally {
      setLoadingOfficers(false);
    }
  }, []);

  const fetchTeamAndResources = useCallback(async (cid) => {
    if (!cid) return;
    try {
      const [teamData, reqsData] = await Promise.all([
        officerApi.getComplaintTeam(cid).catch(() => null),
        officerApi.getResourceRequests(cid).catch(() => [])
      ]);
      setSupportTeam(teamData);
      setResourceRequests(Array.isArray(reqsData) ? reqsData : (reqsData?.items || []));
    } catch (e) {}
  }, []);

  const fetchDetails = useCallback(async () => {
    if (!complaintId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getAdminComplaint(complaintId);
      setComplaint(data);
      setStatus(data.status || 'open');
      setPriority(data.priority || 'medium');
      const dId = data.department_id ? String(data.department_id) : '';
      const oId = data.officer_id ? String(data.officer_id) : '';
      setDepartmentId(dId);
      setOfficerId(oId);

      // Load officers for this department immediately
      loadDeptOfficers(dId);
      fetchTeamAndResources(complaintId);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load complaint case file.');
    } finally {
      setLoading(false);
    }
  }, [complaintId, loadDeptOfficers, fetchTeamAndResources]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // When department changes in UI, reload officers
  const handleDepartmentChange = (newDeptId) => {
    setDepartmentId(newDeptId);
    setOfficerId(''); // reset officer if department switches
    loadDeptOfficers(newDeptId);
  };

  // 15s background polling for live updates
  useEffect(() => {
    const timer = setInterval(() => {
      adminApi.getAdminComplaint(complaintId).then((d) => {
        if (d) setComplaint(d);
      }).catch(() => {});
      fetchTeamAndResources(complaintId);
    }, 15000);
    return () => clearInterval(timer);
  }, [complaintId, fetchTeamAndResources]);

  // Deterministic lowest workload recommendation
  const recommendedOfficer = useMemo(() => {
    if (!deptOfficers || deptOfficers.length === 0) return null;
    const sorted = [...deptOfficers].sort((a, b) => (a.currentWorkload || a.activeAssignments || 0) - (b.currentWorkload || b.activeAssignments || 0));
    return sorted[0];
  }, [deptOfficers]);

  // Valid next status options map
  const availableNextStatuses = useMemo(() => {
    if (!complaint) return [];
    const cur = (complaint.status || 'open').toLowerCase();
    switch (cur) {
      case 'open':
      case 'pending':
        return ['assigned', 'in_progress', 'rejected'];
      case 'assigned':
      case 'accepted':
        return ['in_progress', 'resolved', 'rejected'];
      case 'in_progress':
        return ['resolved', 'rejected'];
      case 'resolved':
        return ['closed', 'reopened'];
      case 'reopened':
        return ['assigned', 'in_progress', 'resolved'];
      case 'closed':
        return ['reopened'];
      case 'rejected':
        return ['open', 'in_progress'];
      default:
        return ['in_progress', 'resolved', 'closed'];
    }
  }, [complaint]);

  async function handleApplyChanges(overrideStatus, overrideDept, overrideOfficer, overridePriority) {
    setSaving(true);
    try {
      const targetSt = overrideStatus || status;
      const targetDept = overrideDept !== undefined ? overrideDept : departmentId;
      const targetOfficer = overrideOfficer !== undefined ? overrideOfficer : officerId;
      const targetPriority = overridePriority || priority;

      const fields = {
        status: targetSt,
        priority: targetPriority,
        department_id: targetDept ? parseInt(targetDept, 10) : null,
        officer_id: targetOfficer ? parseInt(targetOfficer, 10) : null
      };
      await adminApi.updateAdminComplaint(complaint.id, fields);
      toast.success('Case assignment updated successfully');
      fetchDetails();
      if (onRefreshQueue) onRefreshQueue();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update complaint');
    } finally {
      setSaving(false);
      setReassignModalOpen(false);
      setStatusModalOpen(false);
    }
  }

  // Administrative Resolution Verification Handler
  async function handleVerifyResolution(action, note) {
    setSaving(true);
    try {
      await adminApi.verifyResolutionAdmin(complaint.id, {
        action,
        note: note || (action === 'verify' ? 'Administrative verification passed' : 'Rework requested'),
        reason: note
      });
      toast.success(action === 'verify' ? 'Complaint resolution verified & closed' : 'Complaint reopened for rework');
      setReworkModalOpen(false);
      setReworkReason('');
      fetchDetails();
      if (onRefreshQueue) onRefreshQueue();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to process verification');
    } finally {
      setSaving(false);
    }
  }

  // Approve Resource Request Handler
  async function handleApproveResourceRequest() {
    if (!selectedReqForApproval) return;
    setSaving(true);
    try {
      const members = customMembersText
        ? customMembersText.split(',').map(m => ({ name: m.trim(), role: 'Crew Member' })).filter(m => m.name)
        : [];

      await adminApi.approveResourceRequest(selectedReqForApproval.id, {
        teamName: customTeamName || undefined,
        memberNames: members.length > 0 ? members : undefined
      });
      toast.success('Support team dispatched & resource request approved');
      setTeamModalOpen(false);
      setSelectedReqForApproval(null);
      setCustomTeamName('');
      setCustomMembersText('');
      fetchTeamAndResources(complaint.id);
      fetchDetails();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to approve resource request');
    } finally {
      setSaving(false);
    }
  }

  // Reject Resource Request Handler
  async function handleRejectResourceRequest(reqId) {
    const reason = window.prompt('Please enter the reason for declining this resource request:') || 'Declined by administration';
    setSaving(true);
    try {
      await adminApi.rejectResourceRequest(reqId, { reason });
      toast.success('Resource request declined');
      fetchTeamAndResources(complaint.id);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to decline request');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-2">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="card bg-white p-8 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto stroke-[1.5]" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Unable to load complaint case</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error || 'Complaint record not found.'}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-black transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Complaints Queue
        </button>
      </div>
    );
  }

  const formattedId = String(complaint.id).padStart(5, '0');
  const citizen = complaint.is_anonymous ? 'Anonymous Citizen' : (complaint.citizen_name || 'Unknown Citizen');
  const images = complaint.images || [];

  // Parse AI Analysis JSON
  let aiData = null;
  if (complaint.ai_analysis?.analysis) {
    if (typeof complaint.ai_analysis.analysis === 'object') {
      aiData = complaint.ai_analysis.analysis;
    } else {
      try {
        aiData = JSON.parse(complaint.ai_analysis.analysis);
      } catch (e) {
        aiData = { raw: complaint.ai_analysis.analysis };
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Top Case Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" /> ← Back to Complaints Queue
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-lg border border-purple-200 dark:border-purple-800/60">
            CASE FILE #CGN-{formattedId}
          </span>
        </div>
      </div>

      {/* 2. Full Case Header Card */}
      <div className="card bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge status={complaint.status} type="status" />
              <StatusBadge status={complaint.priority} type="priority" />
              {complaint.category && (
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 capitalize border border-slate-200 dark:border-slate-700">
                  {complaint.category.replace('_', ' ')}
                </span>
              )}
              {supportTeam && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-3 py-0.5 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <Users className="h-3 w-3" /> Team: {supportTeam.team_name}
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {complaint.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Reported {new Date(complaint.created_at).toLocaleString('en-IN')} · {complaint.address || 'Location Unspecified'}
            </p>
          </div>

          {/* Quick Action Controls for Valid Next Transitions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {availableNextStatuses.map((st) => (
              <Button
                key={st}
                onClick={() => {
                  setPendingStatus(st);
                  setStatusModalOpen(true);
                }}
                disabled={saving}
                className={`text-xs font-bold py-2 px-3.5 shadow-xs transition-all ${
                  st === 'in_progress' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                  st === 'resolved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                  st === 'closed' ? 'bg-slate-900 hover:bg-black text-white' :
                  st === 'reopened' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                  'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                Move to {st === 'in_progress' ? 'In Progress' : st === 'reopened' ? 'Reopened' : st.charAt(0).toUpperCase() + st.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* RESOLUTION QUALITY VERIFICATION BANNER (if status === 'resolved') */}
      {complaint.status === 'resolved' && (
        <div className="card bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 p-5 rounded-2xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-100">
                  Resolution Verification Required
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Assigned officer has marked this case resolved. Please review field proof before closing.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => handleVerifyResolution('verify')}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 shadow-sm"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Verify & Close Case
              </Button>
              <Button
                onClick={() => setReworkModalOpen(true)}
                disabled={saving}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 px-4 shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Request Rework / Reopen
              </Button>
            </div>
          </div>
          {complaint.resolution_note && (
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Officer Resolution Note: </span>
              <span className="text-slate-600 dark:text-slate-400 italic font-medium">"{complaint.resolution_note}"</span>
            </div>
          )}
        </div>
      )}

      {/* 3. Tabbed Case Navigation Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview', icon: FileText },
          { key: 'timeline', label: 'Timeline', icon: Clock },
          { key: 'assignment', label: 'Assignment & Crew', icon: UserCheck },
          { key: 'evidence', label: 'Evidence', icon: ImageIcon },
          { key: 'ai', label: 'AI Analysis', icon: Sparkles },
          { key: 'audit', label: 'Audit', icon: ShieldCheck }
        ].map((tb) => {
          const Icon = tb.icon;
          const isActive = caseTab === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => setCaseTab(tb.key)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tb.label}</span>
              {tb.key === 'evidence' && images.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-extrabold">
                  {images.length}
                </span>
              )}
              {tb.key === 'assignment' && resourceRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-extrabold animate-pulse">
                  {resourceRequests.filter(r => r.status === 'pending').length} Req
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Tab Content & Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT TWO COLUMNS: Tab Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* TAB 1: OVERVIEW */}
          {caseTab === 'overview' && (
            <div className="space-y-6">
              <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-500" /> Incident Description
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-wrap">
                  {complaint.description || 'No description provided.'}
                </p>
              </div>

              {/* Citizen Details */}
              <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-500" /> Reporting Citizen Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-2xs font-extrabold uppercase text-slate-400">Citizen Name</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{citizen}</span>
                  </div>
                  <div>
                    <span className="block text-2xs font-extrabold uppercase text-slate-400">Contact Email / Phone</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {complaint.citizen_email || complaint.citizen_phone || 'Confidential / Anonymous'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Geographic Coordinates & Location */}
              <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" /> Location & Ward GIS Data
                </h3>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <p className="font-bold text-slate-850 dark:text-slate-100">{complaint.address || 'Address not resolved'}</p>
                  <p className="text-2xs text-slate-500 font-mono">
                    Latitude: {complaint.latitude || '—'} · Longitude: {complaint.longitude || '—'} · Ward ID: {complaint.ward_id || 'Ward 14'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIMELINE */}
          {caseTab === 'timeline' && (
            <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
              <Timeline complaintId={complaint.id} />
            </div>
          )}

          {/* TAB 3: ASSIGNMENT & SUPPORT CREW */}
          {caseTab === 'assignment' && (
            <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-500" /> Department & Officer Assignment
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                  Live Workload Aggregation
                </span>
              </div>

              {/* Current Assignment Status Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="block text-2xs font-extrabold uppercase text-slate-400">Assigned Department</span>
                  <span className="font-bold text-slate-850 dark:text-slate-100">{complaint.department_name || '— Unassigned —'}</span>
                </div>
                <div>
                  <span className="block text-2xs font-extrabold uppercase text-slate-400">Assigned Primary Officer</span>
                  <span className="font-bold text-slate-850 dark:text-slate-100">{complaint.officer_name ? `👤 ${complaint.officer_name}` : '— Unassigned —'}</span>
                </div>
              </div>

              {/* SUPPORT CREW CARD */}
              {supportTeam ? (
                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-indigo-600" /> Assigned Support Team: {supportTeam.team_name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[10px] font-bold">
                      Active Crew
                    </span>
                  </div>
                  <p className="text-indigo-700 dark:text-indigo-300 font-medium">
                    Team Leader: <strong className="font-bold">{supportTeam.leader_name || complaint.officer_name || 'Officer'}</strong>
                  </p>
                  {supportTeam.members && supportTeam.members.length > 0 && (
                    <div className="pt-2">
                      <span className="block text-2xs font-bold text-indigo-500 uppercase mb-1">Assigned Field Crew:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {supportTeam.members.map((m, idx) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-slate-700 dark:text-slate-300 font-semibold text-2xs">
                            👤 {m.member_name} ({m.member_role || 'Field Crew'})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center justify-between">
                  <span>No auxiliary support team currently assigned to this complaint.</span>
                </div>
              )}

              {/* RESOURCE REQUESTS SECTION */}
              {resourceRequests.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-2">
                    <Layers className="h-4 w-4 text-amber-500" /> Officer Resource & Crew Requests ({resourceRequests.length})
                  </h4>
                  <div className="space-y-2">
                    {resourceRequests.map((req) => (
                      <div key={req.id} className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                            <span>Request: {req.request_type} ({req.required_people} Personnel)</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                              req.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-200 text-amber-900'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 font-medium">"{req.reason}"</p>
                          {req.required_skills && <p className="text-2xs text-slate-500">Skills needed: {req.required_skills}</p>}
                        </div>
                        {req.status === 'pending' && (
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              onClick={() => {
                                setSelectedReqForApproval(req);
                                setCustomTeamName(`${complaint.department_name || 'Municipal'} Crew #${complaint.id}`);
                                setCustomMembersText('');
                                setTeamModalOpen(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-3 shadow-xs"
                            >
                              Approve & Assign Crew
                            </Button>
                            <Button
                              onClick={() => handleRejectResourceRequest(req.id)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs py-1.5 px-2.5 shadow-xs"
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CHANGE ASSIGNMENT FORM */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Update Case Assignment</h4>

                {recommendedOfficer && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
                    <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                      💡 Recommended: <strong className="font-bold">{recommendedOfficer.name}</strong> ({recommendedOfficer.currentWorkload || 0} active cases · SLA: {recommendedOfficer.slaRisk || 'Low'})
                    </span>
                    <button
                      type="button"
                      onClick={() => setOfficerId(String(recommendedOfficer.id))}
                      className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-2xs hover:bg-emerald-700 transition-colors"
                    >
                      Select Recommended
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs font-bold text-slate-600 dark:text-slate-400 mb-1">Department</label>
                    <select
                      value={departmentId}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2.5 font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">— Select Department —</option>
                      {deptList.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Assign Primary Officer {loadingOfficers && <span className="text-slate-400 text-2xs font-normal">(Loading...)</span>}
                    </label>
                    <select
                      value={officerId}
                      onChange={(e) => setOfficerId(e.target.value)}
                      disabled={loadingOfficers}
                      className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2.5 font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">— Select Active Officer —</option>
                      {deptOfficers.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.name} — {o.designation || 'Officer'} ({o.currentWorkload || o.activeAssignments || 0} active, Overdue: {o.overdueCount || 0}, SLA: {o.slaRisk || 'Low'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {departmentId && deptOfficers.length === 0 && !loadingOfficers && (
                  <p className="text-2xs font-bold text-amber-600 dark:text-amber-400">
                    ⚠️ No active officers are currently available for this department.
                  </p>
                )}

                <Button
                  onClick={() => setReassignModalOpen(true)}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-6 shadow-sm"
                >
                  {saving ? 'Saving Assignment...' : 'Save & Dispatch Assignment'}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 4: EVIDENCE */}
          {caseTab === 'evidence' && (
            <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-emerald-500" /> Photo Evidence Gallery ({images.length})
              </h3>

              {images.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                  <ImageIcon className="h-10 w-10 text-slate-400 mx-auto stroke-[1.5]" />
                  <h4 className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">No Evidence Uploaded</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">No images uploaded for this complaint.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {images.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      onClick={() => setLightboxIndex(idx)}
                      className="group relative h-40 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-sm hover:shadow-md transition-all"
                    >
                      <img
                        src={resolveImageUrl(img.url)}
                        alt={`Evidence photo ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {img.metadata?.resolution && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-extrabold shadow">
                          Resolution Proof
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: AI ANALYSIS */}
          {caseTab === 'ai' && (
            <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" /> AI Classification Engine
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded">Advisory Only</span>
              </div>

              {aiData ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-2xs font-extrabold uppercase text-slate-400 mb-0.5">Detected Category</span>
                    <span className="font-bold text-purple-800 dark:text-purple-400 capitalize">
                      {aiData.detected_category || aiData.category || 'Road Issue'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-2xs font-extrabold uppercase text-slate-400 mb-0.5">Suggested Department</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {aiData.suggested_department || 'Roads & Infrastructure'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-2xs font-extrabold uppercase text-slate-400 mb-1">Severity Rating</span>
                    <StatusBadge status={aiData.severity || 'medium'} type="priority" />
                  </div>
                  <div>
                    <span className="block text-2xs font-extrabold uppercase text-slate-400 mb-1">Confidence Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-28 h-2 rounded-full bg-purple-100 overflow-hidden dark:bg-purple-900/30">
                        <div className="h-full bg-purple-600 rounded-full" style={{ width: `${Math.round((aiData.confidence || 0.85) * 100)}%` }} />
                      </div>
                      <span className="font-bold text-purple-700">{Math.round((aiData.confidence || 0.85) * 100)}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No AI analysis data available for this complaint.</p>
              )}
            </div>
          )}

          {/* TAB 6: AUDIT */}
          {caseTab === 'audit' && (
            <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Persisted Audit Event Log
              </h3>

              {(!complaint.status_history || complaint.status_history.length === 0) ? (
                <p className="text-xs text-slate-400">No audit events recorded for this complaint.</p>
              ) : (
                <div className="space-y-3">
                  {complaint.status_history.map((h) => (
                    <div key={h.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="flex items-center justify-between text-slate-500 font-bold mb-1">
                        <span>{h.changed_by_name || 'System User'} ({h.changed_by_role || 'user'})</span>
                        <span className="text-[11px] font-normal">{new Date(h.created_at).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 font-semibold">
                        Status Transition: <span className="capitalize">{h.status_from}</span> → <span className="capitalize">{h.status_to}</span>
                      </div>
                      {h.note && <div className="text-slate-500 italic mt-1 font-normal">"{h.note}"</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Permanent Desktop Case Control Center */}
        <div className="space-y-6">
          <div className="card bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Shield className="h-4 w-4 text-emerald-500" /> Case Control Center
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <span className="block text-2xs font-extrabold uppercase text-slate-400 mb-1">Current Status</span>
                <StatusBadge status={complaint.status} type="status" />
              </div>

              <div>
                <span className="block text-2xs font-extrabold uppercase text-slate-400 mb-1">SLA Resolution Target</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {complaint.sla_due_at ? new Date(complaint.sla_due_at).toLocaleString('en-IN') : 'Standard SLA Window'}
                </div>
              </div>

              <div>
                <span className="block text-2xs font-extrabold uppercase text-slate-400 mb-1">Priority Level</span>
                <StatusBadge status={complaint.priority} type="priority" />
              </div>

              <div>
                <span className="block text-2xs font-extrabold uppercase text-slate-400 mb-1">Assigned Department</span>
                <div className="font-semibold text-slate-850 dark:text-slate-100">
                  {complaint.department_name || '— Unassigned —'}
                </div>
              </div>

              <div>
                <span className="block text-2xs font-extrabold uppercase text-slate-400 mb-1">Assigned Officer</span>
                <div className="font-semibold text-slate-850 dark:text-slate-100">
                  {complaint.officer_name ? `👤 ${complaint.officer_name}` : '— Unassigned —'}
                </div>
              </div>
            </div>

            {/* Quick Operational Controls */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-2xs font-extrabold uppercase text-slate-400">Quick Assignment Controls</h4>
              <div>
                <label className="block text-2xs font-bold text-slate-600 dark:text-slate-400 mb-1">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">— Unassigned —</option>
                  {deptList.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Officer {loadingOfficers && <span className="text-slate-400 font-normal">(Loading...)</span>}
                </label>
                <select
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  disabled={loadingOfficers}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">— Unassigned —</option>
                  {deptOfficers.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.currentWorkload || 0} active, SLA: {o.slaRisk || 'Low'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 dark:text-slate-400 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <Button
                onClick={() => handleApplyChanges(status, departmentId, officerId, priority)}
                disabled={saving}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold text-xs py-2.5 shadow-sm"
              >
                {saving ? 'Saving Changes…' : 'Save Case Changes'}
              </Button>
            </div>
          </div>
        </div>

      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightboxIndex(null)}>
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-xl">
            <img src={resolveImageUrl(images[lightboxIndex].url)} alt="Full view" className="max-h-[85vh] w-auto object-contain" />
            <button onClick={() => setLightboxIndex(null)} className="absolute top-3 right-3 text-white bg-black/60 p-2 rounded-full hover:bg-black">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Reassign Confirmation Modal */}
      {reassignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="card bg-white dark:bg-slate-900 max-w-md w-full p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">ASSIGN / REASSIGN COMPLAINT CASE?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Confirm assigning complaint <strong className="text-purple-600">#CGN-{formattedId}</strong> to the selected department and officer.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button onClick={() => setReassignModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 px-4">
                Cancel
              </Button>
              <Button onClick={() => handleApplyChanges(status, departmentId, officerId, priority)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 px-4 font-bold">
                Confirm Assignment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="card bg-white dark:bg-slate-900 max-w-md w-full p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">CONFIRM STATUS CHANGE?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Transition complaint <strong className="text-purple-600">#CGN-{formattedId}</strong> status from <strong className="uppercase">{complaint.status}</strong> to <strong className="uppercase text-emerald-600">{pendingStatus}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button onClick={() => setStatusModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 px-4">
                Cancel
              </Button>
              <Button onClick={() => handleApplyChanges(pendingStatus, departmentId, officerId, priority)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 px-4 font-bold">
                Confirm Status Transition
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Relative Time Helper ───────────────────────────────────────────
function relativeTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (isNaN(s)) return '—';
  if (s < 10) return 'Just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Audit Action Badge Component ──────────────────────────────────────────
function AuditActionBadge({ action }) {
  const act = (action || '').toLowerCase();

  let Icon = Activity;
  let bgCls = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  if (act.includes('login') || act.includes('logout')) {
    Icon = LogIn;
    bgCls = 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/60';
  } else if (act.includes('created') || act.includes('update') || act.includes('status')) {
    Icon = FileText;
    bgCls = 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800/60';
  } else if (act.includes('assign')) {
    Icon = UserCheck;
    bgCls = 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/60';
  } else if (act.includes('resolved') || act.includes('closed')) {
    Icon = CheckCircle2;
    bgCls = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
  } else if (act.includes('reopen')) {
    Icon = RefreshCw;
    bgCls = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';
  } else if (act.includes('role') || act.includes('approval') || act.includes('permission') || act.includes('reject') || act.includes('block')) {
    Icon = ShieldAlert;
    bgCls = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/60';
  } else if (act.includes('notification') || act.includes('email')) {
    Icon = Mail;
    bgCls = 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/60';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs font-extrabold rounded-full border uppercase tracking-wider ${bgCls}`}>
      <Icon className="h-3 w-3 shrink-0" />
      <span>{action.replace(/_/g, ' ')}</span>
    </span>
  );
}

function getHumanReadableDescription(log) {
  const action = (log.action || '').toLowerCase();
  const actor = log.actor_name || 'System';
  const targetType = log.target_type;
  const targetId = log.target_id;

  if (action === 'admin_login' || action === 'user_login') {
    return `${actor} authenticated to Civic GreenNet`;
  }
  if (action === 'user_logout') {
    return `${actor} logged out of session`;
  }
  if (action === 'complaint_created') {
    return `${actor} reported new complaint #${targetId || ''}`;
  }
  if (action === 'complaint_update' || action === 'complaint_status_changed') {
    return `${actor} updated complaint #${targetId || ''}`;
  }
  if (action === 'complaint_assignment' || action === 'complaint_assigned') {
    return `${actor} updated assignment for complaint #${targetId || ''}`;
  }
  if (action === 'complaint_reassigned') {
    return `${actor} reassigned complaint #${targetId || ''}`;
  }
  if (action === 'complaint_resolved') {
    return `${actor} resolved complaint #${targetId || ''}`;
  }
  if (action === 'complaint_closed') {
    return `${actor} closed complaint #${targetId || ''}`;
  }
  if (action === 'complaint_reopened') {
    return `${actor} reopened complaint #${targetId || ''}`;
  }
  if (action === 'officer_approval') {
    return `${actor} approved officer account #${targetId || ''}`;
  }
  if (action === 'role_change') {
    return `${actor} updated user role for account #${targetId || ''}`;
  }
  return `${actor} performed ${action.replace(/_/g, ' ')}${targetId ? ` on ${targetType || 'target'} #${targetId}` : ''}`;
}

// ── Full-Page Audit & Security Center ─────────────────────────────────────
function AdminAuditCenter({ navigate }) {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ totalEvents: 0, todayEvents: 0, adminToday: 0, officerToday: 0, citizenToday: 0, securityToday: 0 })
  const [totalLogs, setTotalLogs] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const limit = 20

  // Filters
  const [searchQ, setSearchQ] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [datePreset, setDatePreset] = useState('')

  // Slide-over detail log
  const [selectedLog, setSelectedLog] = useState(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.listAuditLogs({
        search: searchQ || undefined,
        role: roleFilter || undefined,
        action: actionFilter || undefined,
        datePreset: datePreset || undefined,
        page,
        limit
      })
      setLogs(res.items || [])
      setTotalLogs(res.total || 0)
      if (res.stats) {
        setStats(res.stats)
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load audit logs.')
    } finally {
      setLoading(false)
    }
  }, [searchQ, roleFilter, actionFilter, datePreset, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // 15s background polling for live real-time audit stream
  useEffect(() => {
    const timer = setInterval(() => {
      adminApi.listAuditLogs({
        search: searchQ || undefined,
        role: roleFilter || undefined,
        action: actionFilter || undefined,
        datePreset: datePreset || undefined,
        page,
        limit
      }).then(res => {
        if (res?.items) setLogs(res.items)
        if (res?.total !== undefined) setTotalLogs(res.total)
        if (res?.stats) setStats(res.stats)
      }).catch(() => {})
    }, 15000)
    return () => clearInterval(timer)
  }, [searchQ, roleFilter, actionFilter, datePreset, page])

  async function handleExportCsv() {
    try {
      const data = await adminApi.exportAuditLogs({
        search: searchQ || undefined,
        role: roleFilter || undefined,
        action: actionFilter || undefined,
        datePreset: datePreset || undefined
      })
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-activity-log-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Audit log CSV exported successfully')
    } catch (e) {
      console.error('Audit CSV Export failed:', e)
      toast.error('Could not export audit logs')
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="card bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" /> Audit & Security Activity Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Track administrative, officer, citizen, complaint, assignment, authentication, notification, and system activity.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-bold">
              <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-700 dark:text-slate-300">
                {stats.totalEvents || 0} Total Events
              </span>
              <span className="bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                Today {stats.todayEvents || 0}
              </span>
              <span className="bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-full text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                Admin {stats.adminToday || 0}
              </span>
              <span className="bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                Officer {stats.officerToday || 0}
              </span>
            </div>
          </div>

          <Button
            onClick={handleExportCsv}
            className="bg-slate-900 hover:bg-black text-white font-bold text-xs py-2.5 px-4 shadow-sm inline-flex items-center gap-2 shrink-0"
          >
            <Download className="h-4 w-4" /> Export Audit Log
          </Button>
        </div>
      </div>

      {/* 2. 5 Compact Statistic Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <DashboardCard title="Total Events Today" value={stats.todayEvents || 0} icon={Activity} tone="brand" subtitle="Live system activity" />
        <DashboardCard title="Admin Actions" value={stats.adminToday || 0} icon={ShieldCheck} tone="emerald" subtitle="Today's admin updates" />
        <DashboardCard title="Officer Actions" value={stats.officerToday || 0} icon={UserCheck} tone="blue" subtitle="Field & resolution activity" />
        <DashboardCard title="Citizen Actions" value={stats.citizenToday || 0} icon={Users} tone="indigo" subtitle="Submissions & verification" />
        <DashboardCard title="Security Events" value={stats.securityToday || 0} icon={ShieldAlert} tone="red" subtitle="Role & approval audits" />
      </div>

      {/* 3. Modern Filter Toolbar */}
      <div className="bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Search Activity</label>
            <Input
              placeholder="Search by actor name, email, action, complaint ID, IP..."
              value={searchQ}
              onChange={(e) => { setSearchQ(e.target.value); setPage(1); }}
            />
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Actor Role</label>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-200"
            >
              <option value="">All Roles</option>
              <option value="admin">Administrator</option>
              <option value="officer">Officer</option>
              <option value="citizen">Citizen</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* Action Category Filter */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Action Category</label>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-200"
            >
              <option value="">All Actions</option>
              <option value="auth">Authentication (Logins)</option>
              <option value="complaint">Complaint Activity</option>
              <option value="assignment">Assignments</option>
              <option value="notification">Notifications & Emails</option>
              <option value="security">Security & Approvals</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Date Preset</label>
            <select
              value={datePreset}
              onChange={(e) => { setDatePreset(e.target.value); setPage(1); }}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-200"
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        {(searchQ || roleFilter || actionFilter || datePreset) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearchQ('');
                setRoleFilter('');
                setActionFilter('');
                setDatePreset('');
                setPage(1);
              }}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline dark:text-purple-400"
            >
              Clear Active Filters
            </button>
          </div>
        )}
      </div>

      {/* 4. Activity Feed Timeline */}
      <div className="card bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" /> Real Audit Activity Feed ({totalLogs})
          </h3>
          <span className="text-2xs font-semibold text-slate-400">15s Live Background Refetch Active</span>
        </div>

        {loading && (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        )}

        {error && !loading && (
          <div className="p-6 text-center text-rose-500 space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto" />
            <p className="text-xs font-bold">{error}</p>
            <Button onClick={fetchLogs} className="text-xs bg-rose-600 text-white py-1.5 px-4">Retry</Button>
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
            <ShieldCheck className="h-10 w-10 text-slate-400 mx-auto stroke-[1.5]" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Audit Activity Found</h4>
            <p className="text-xs text-slate-400">There are no audit events matching your current filters.</p>
          </div>
        )}

        {!loading && !error && logs.length > 0 && (
          <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-6 space-y-4 ml-2">
            {logs.map((log) => {
              const formattedDate = new Date(log.created_at).toLocaleString('en-IN');
              const humanDesc = getHumanReadableDescription(log);
              const isComplaintTarget = log.target_type === 'complaint' && log.target_id;

              return (
                <div key={log.id} className="relative group">
                  {/* Dot */}
                  <span className="absolute -left-[31px] top-4 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900 shadow-xs" />

                  {/* Event Card */}
                  <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 shadow-2xs hover:shadow-sm transition-all space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {/* Actor Avatar */}
                        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow-xs">
                          {log.actor_name ? log.actor_name.charAt(0).toUpperCase() : 'S'}
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {log.actor_name || 'System Event'}
                            </span>
                            <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.2 text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-300">
                              {log.actor_role || 'System'}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                            {humanDesc}
                          </p>
                        </div>
                      </div>

                      {/* Right Action Badge & Time */}
                      <div className="flex items-center gap-2 shrink-0">
                        <AuditActionBadge action={log.action} />
                        <span className="text-[11px] font-semibold text-slate-400" title={formattedDate}>
                          {relativeTime(log.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Target Link & Details Button */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 text-slate-500 font-medium">
                        {isComplaintTarget && (
                          <button
                            onClick={() => navigate(`/admin/complaints/${log.target_id}`)}
                            className="font-mono text-purple-600 dark:text-purple-400 font-bold hover:underline"
                          >
                            Target: Complaint #CGN-{String(log.target_id).padStart(5, '0')}
                          </button>
                        )}
                        {log.ip_address && (
                          <span className="font-mono text-[11px] text-slate-400">
                            IP: {log.ip_address}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalLogs > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 font-medium">
              Showing {Math.min((page - 1) * limit + 1, totalLogs)}–{Math.min(page * limit, totalLogs)} of {totalLogs} events
            </span>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-xs py-1.5 px-3"
              >
                Previous
              </Button>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Page {page} of {Math.ceil(totalLogs / limit) || 1}
              </span>
              <Button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(totalLogs / limit)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-xs py-1.5 px-3"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Event Details Slide-Over Panel */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setSelectedLog(null)} />
          <div className="relative ml-auto h-full w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">AUDIT EVENT DETAILS</h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Structured Details */}
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div>
                  <span className="block text-2xs font-extrabold uppercase text-slate-400">Actor</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedLog.actor_name || 'System'} ({selectedLog.actor_role || 'system'})</span>
                </div>
                <div>
                  <span className="block text-2xs font-extrabold uppercase text-slate-400">Action</span>
                  <AuditActionBadge action={selectedLog.action} />
                </div>
                <div>
                  <span className="block text-2xs font-extrabold uppercase text-slate-400">Timestamp</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(selectedLog.created_at).toLocaleString('en-IN')}</span>
                </div>
                {selectedLog.target_type && (
                  <div>
                    <span className="block text-2xs font-extrabold uppercase text-slate-400">Target</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      {selectedLog.target_type} #{selectedLog.target_id || ''}
                    </span>
                  </div>
                )}
                {selectedLog.ip_address && (
                  <div>
                    <span className="block text-2xs font-extrabold uppercase text-slate-400">IP Address</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{selectedLog.ip_address}</span>
                  </div>
                )}
              </div>

              {/* Formatted Changes / Details Object */}
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-2xs font-extrabold uppercase text-slate-400">Event Key-Value Metadata</h4>
                  <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    {Object.entries(selectedLog.details).map(([key, val]) => (
                      <div key={key} className="flex justify-between border-b border-slate-200/50 dark:border-slate-700/50 pb-1.5 last:border-0 last:pb-0">
                        <span className="font-extrabold text-slate-500 uppercase text-[10px]">{key.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-slate-850 dark:text-slate-100 text-right">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collapsible Raw JSON */}
              <details className="text-2xs font-mono bg-slate-900 text-emerald-400 p-3.5 rounded-xl border border-slate-800">
                <summary className="cursor-pointer font-bold text-slate-300 select-none">Show Raw Audit JSON</summary>
                <pre className="mt-2 overflow-x-auto text-[11px] whitespace-pre-wrap">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminPortal() {
  const { user } = useContext(AuthContext)
  const { dark } = useContext(ThemeContext)
  const [searchParams, setSearchParams] = useSearchParams()
  const routeParams = useParams()
  const navigate = useNavigate()
  const activeComplaintId = routeParams.id || (searchParams.get('tab') === 'complaint' ? searchParams.get('id') : null)

  const tabParam = searchParams.get('tab') || 'overview'
  const [tab, setTab] = useState(tabParam)

  // Sync tab from URL param
  useEffect(() => {
    setTab(searchParams.get('tab') || 'overview')
  }, [searchParams])

  function switchTab(key) {
    setTab(key)
    if (routeParams.id) {
      navigate(key === 'overview' ? '/admin' : `/admin?tab=${key}`)
    } else {
      setSearchParams(key === 'overview' ? {} : { tab: key })
    }
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
  const [debouncedComplaintSearch, setDebouncedComplaintSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedComplaintSearch(complaintSearch.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [complaintSearch])

  const [complaintStatusFilter, setComplaintStatusFilter] = useState('')
  const [complaintPriorityFilter, setComplaintPriorityFilter] = useState('')
  const [complaintCategoryFilter, setComplaintCategoryFilter] = useState('')
  const [complaintDepartmentFilter, setComplaintDepartmentFilter] = useState('')
  const [complaintAssignmentFilter, setComplaintAssignmentFilter] = useState('')
  const [complaintDateFilter, setComplaintDateFilter] = useState('')
  const [complaintDateFrom, setComplaintDateFrom] = useState('')
  const [complaintDateTo, setComplaintDateTo] = useState('')
  const [complaintDueSoonFilter, setComplaintDueSoonFilter] = useState(false)
  const [complaintOverdueFilter, setComplaintOverdueFilter] = useState(false)
  const [activeQuickChip, setActiveQuickChip] = useState('all')
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [selectedImg, setSelectedImg] = useState(null)
  const [activeMenuRowId, setActiveMenuRowId] = useState(null)

  // ── Users tab state
  const [users, setUsers] = useState([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [userQ, setUserQ] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState(null)
  const [roleChangeModalData, setRoleChangeModalData] = useState(null)

  // ── Departments tab state
  const [departments, setDepartments] = useState([])
  const [deptName, setDeptName] = useState('')
  const [deptDesc, setDeptDesc] = useState('')

  // ── Reports tab state
  const [reportSummary, setReportSummary] = useState(null)
  const [reportRows, setReportRows] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState(null)

  // ── Redesigned Analytics tab state
  const [reportsDatePreset, setReportsDatePreset] = useState('all')
  const [reportsStartDate, setReportsStartDate] = useState('')
  const [reportsEndDate, setReportsEndDate] = useState('')
  const [reportsDashData, setReportsDashData] = useState(null)
  const [reportsDashLoading, setReportsDashLoading] = useState(false)
  const [reportsDashError, setReportsDashError] = useState(null)

  // ── Admin Notification Center state
  const [adminNotifs, setAdminNotifs] = useState([])
  const [notifsLoading, setNotifsLoading] = useState(false)
  const [notifsError, setNotifsError] = useState(null)
  const [notifsPage, setNotifsPage] = useState(1)
  const [notifsHasMore, setNotifsHasMore] = useState(true)
  const [notifsFilter, setNotifsFilter] = useState('all') // all, unread, COMPLAINT, OFFICER, SLA, SYSTEM

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
  const [officerSubTab, setOfficerSubTab] = useState('approvals')
  const [officersFilter, setOfficersFilter] = useState(null)
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
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not load admin dashboard.'
      setDashError({ message: msg, endpoint: 'GET /api/admin/dashboard' })
    } finally {
      setDashLoading(false)
    }
  }, [])

  // ── Load officers for dropdowns ──────────────────────────────────────────
  const loadOfficers = useCallback(async () => {
    try {
      const r = await adminApi.listOfficers()
      setOfficers(Array.isArray(r) ? r : (r?.items || []))
    } catch (e) {
      // non-fatal
    }
  }, [])

  // ── Load complaints ──────────────────────────────────────────────────────
  const loadComplaints = useCallback(async (page = 1, search = '', status = '', priority = '', category = '', deptId = '', assignment = '', dateFrom = '', dateTo = '', dueSoon = false, overdue = false) => {
    setComplaintsLoading(true)
    setComplaintsError(null)
    try {
      const params = { page, limit: 20 }
      if (search) params.search = search
      if (status) params.status = status
      if (priority) params.priority = priority
      if (category) params.category = category
      if (deptId) params.departmentId = deptId
      if (assignment) params.assignment = assignment
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo
      if (dueSoon) params.dueSoon = dueSoon
      if (overdue) params.overdue = overdue
      const r = await adminApi.listAdminComplaints(params)
      const list = r?.items || (Array.isArray(r) ? r : [])
      setComplaints(list)
      setComplaintsTotal(typeof r?.total === 'number' ? r.total : list.length)
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

  // ── Load date-filtered reports analytics ──────────────────────────────────
  const loadReportsAnalytics = useCallback(async () => {
    if (reportsDatePreset === 'all' && dashData) {
      setReportsDashData(dashData)
      setReportsDashLoading(false)
      return
    }
    setReportsDashLoading(true)
    setReportsDashError(null)
    try {
      let params = {}
      if (reportsDatePreset !== 'all') {
        let start = null
        let end = new Date()
        if (reportsDatePreset === '7d') {
          start = new Date()
          start.setDate(end.getDate() - 7)
        } else if (reportsDatePreset === '30d') {
          start = new Date()
          start.setDate(end.getDate() - 30)
        } else if (reportsDatePreset === '90d') {
          start = new Date()
          start.setDate(end.getDate() - 90)
        } else if (reportsDatePreset === 'year') {
          start = new Date(new Date().getFullYear(), 0, 1)
        } else if (reportsDatePreset === 'custom') {
          if (reportsStartDate) start = new Date(reportsStartDate)
          if (reportsEndDate) end = new Date(reportsEndDate)
        }
        if (start) params.startDate = start.toISOString().split('T')[0]
        if (end) params.endDate = end.toISOString().split('T')[0]
      }
      const d = await adminApi.getDashboard(params)
      setReportsDashData(d)
    } catch (e) {
      setReportsDashError(e?.response?.data?.message || e?.message || 'Could not load analytics')
    } finally {
      setReportsDashLoading(false)
    }
  }, [reportsDatePreset, reportsStartDate, reportsEndDate, dashData])

  // ── Load notifications ───────────────────────────────────────────────────
  const loadNotifications = useCallback(async (p = 1, append = false) => {
    setNotifsLoading(true)
    setNotifsError(null)
    try {
      const r = await notificationsApi.list(p)
      const list = r?.items || r || []
      setAdminNotifs(prev => append ? prev.concat(list) : list)
      setNotifsPage(p)
      setNotifsHasMore(list.length >= 20)
    } catch (e) {
      setNotifsError('Could not load notifications.')
    } finally {
      setNotifsLoading(false)
    }
  }, [])

  const markNotifRead = async (n) => {
    setAdminNotifs(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item))
    try {
      await notificationsApi.markRead(n.id)
    } catch (e) {
      toast.error('Failed to mark notification as read')
    }
  }

  const markAllNotifsRead = async () => {
    setAdminNotifs(prev => prev.map(item => ({ ...item, is_read: true })))
    try {
      await notificationsApi.markAll()
      toast.success('All marked as read')
    } catch (e) {
      toast.error('Failed to mark all notifications as read')
    }
  }

  // ── Load officer approvals ───────────────────────────────────────────────
  const loadOfficerApprovals = useCallback(async (status = null, page = 1) => {
    setOfficersLoading(true)
    setOfficersError(null)
    try {
      const params = { role: 'officer', page, limit: 50 }
      if (status) params.status = status
      const r = await adminApi.listUsers(params)
      setOfficerApprovals(r?.items || [])
      setOfficersTotal(r?.total || 0)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not load officer approvals.'
      setOfficersError({ message: msg, endpoint: `GET /api/admin/users?role=officer` })
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

  const handleDatePresetChange = (preset) => {
    setComplaintDateFilter(preset)
    setComplaintsPage(1)
    if (!preset) {
      setComplaintDateFrom('')
      setComplaintDateTo('')
      return
    }
    const todayStr = new Date().toISOString().split('T')[0]
    if (preset === 'today') {
      setComplaintDateFrom(todayStr)
      setComplaintDateTo(todayStr)
    } else if (preset === '7_days') {
      const pastStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      setComplaintDateFrom(pastStr)
      setComplaintDateTo(todayStr)
    } else if (preset === '30_days') {
      const pastStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      setComplaintDateFrom(pastStr)
      setComplaintDateTo(todayStr)
    }
  }

  const handleQuickChipClick = (chip) => {
    setActiveQuickChip(chip)
    setComplaintsPage(1)
    
    // Reset filters
    setComplaintAssignmentFilter('')
    setComplaintPriorityFilter('')
    setComplaintStatusFilter('')
    setComplaintDueSoonFilter(false)
    setComplaintOverdueFilter(false)
    
    if (chip === 'unassigned') {
      setComplaintAssignmentFilter('unassigned')
    } else if (chip === 'high_priority') {
      setComplaintPriorityFilter('high')
    } else if (chip === 'critical') {
      setComplaintPriorityFilter('critical')
    } else if (chip === 'due_soon') {
      setComplaintDueSoonFilter(true)
    } else if (chip === 'overdue') {
      setComplaintOverdueFilter(true)
    } else if (chip === 'in_progress') {
      setComplaintStatusFilter('in_progress')
    } else if (chip === 'resolved') {
      setComplaintStatusFilter('resolved')
    } else if (chip === 'reopened') {
      setComplaintStatusFilter('reopened')
    } else if (chip === 'closed') {
      setComplaintStatusFilter('closed')
    }
  }

  // ── Tab activation effect (Fires when tab changes) ─────────────────────────
  useEffect(() => {
    loadDepartments()
    loadOfficers()
    if (tab === 'overview' || !tab) {
      loadDashboard()
    } else if (tab === 'users') {
      loadUsers(userQ, userPage)
    } else if (tab === 'departments') {
      loadDepartments()
    } else if (tab === 'reports') {
      loadReports()
      loadReportsAnalytics()
    } else if (tab === 'notifications') {
      loadNotifications(1)
    } else if (tab === 'officer-approvals') {
      loadOfficerApprovals(null, 1)
    } else if (tab === 'system-health') {
      loadSystemHealth()
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when analytics date range parameters change
  useEffect(() => {
    if (tab === 'reports') {
      loadReportsAnalytics()
    }
  }, [reportsDatePreset, reportsStartDate, reportsEndDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when notifications parameters change
  useEffect(() => {
    if (tab === 'notifications') {
      loadNotifications(notifsPage)
    }
  }, [notifsPage]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Reload when complaints filters or tab change
  useEffect(() => {
    if (tab === 'complaints') {
      loadComplaints(
        complaintsPage,
        debouncedComplaintSearch,
        complaintStatusFilter,
        complaintPriorityFilter,
        complaintCategoryFilter,
        complaintDepartmentFilter,
        complaintAssignmentFilter,
        complaintDateFrom,
        complaintDateTo,
        complaintDueSoonFilter,
        complaintOverdueFilter
      )
    }
  }, [
    tab,
    complaintsPage,
    debouncedComplaintSearch,
    complaintStatusFilter,
    complaintPriorityFilter,
    complaintCategoryFilter,
    complaintDepartmentFilter,
    complaintAssignmentFilter,
    complaintDateFrom,
    complaintDateTo,
    complaintDueSoonFilter,
    complaintOverdueFilter
  ]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Background polling timer for Complaints Queue and Dashboard (60s) ───
  useEffect(() => {
    if (tab !== 'complaints' && tab !== 'overview') return

    const timer = setInterval(() => {
      if (document.hidden) return;
      if (tab === 'complaints') {
        loadComplaints(
          complaintsPage,
          debouncedComplaintSearch,
          complaintStatusFilter,
          complaintPriorityFilter,
          complaintCategoryFilter,
          complaintDepartmentFilter,
          complaintAssignmentFilter,
          complaintDateFrom,
          complaintDateTo,
          complaintDueSoonFilter,
          complaintOverdueFilter
        )
      } else if (tab === 'overview') {
        loadDashboard()
      }
    }, 60000)

    return () => clearInterval(timer)
  }, [
    tab,
    complaintsPage,
    debouncedComplaintSearch,
    complaintStatusFilter,
    complaintPriorityFilter,
    complaintCategoryFilter,
    complaintDepartmentFilter,
    complaintAssignmentFilter,
    complaintDateFrom,
    complaintDateTo,
    complaintDueSoonFilter,
    complaintOverdueFilter,
    loadComplaints,
    loadDashboard
  ])

  // Reload when user search/page changes
  useEffect(() => {
    if (tab === 'users') loadUsers(userQ, userPage)
  }, [userQ, userPage]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── User action handlers ─────────────────────────────────────────────────
  function triggerRoleChange(user, targetRole) {
    if (user.role === targetRole) return
    setRoleChangeModalData({ user, targetRole })
  }

  async function handleConfirmRoleChange({ role, departmentId, designation, reason }) {
    if (!roleChangeModalData?.user) return
    const { user } = roleChangeModalData
    try {
      await adminApi.updateUserRole(user.id, role, departmentId, designation, reason)
      toast.success(`Role for ${user.name} updated to ${role.toUpperCase()}`)
      loadUsers(userQ, userPage)
      loadOfficerApprovals(null, officersPage)
      loadDashboard()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not update user role')
      throw e
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
    let reason = ''
    if (nextStatus === 'rejected') {
      reason = prompt('Please enter the reason for rejecting this officer registration:')
      if (reason === null) return // user cancelled
      if (!reason.trim()) {
        toast.error('Rejection reason is required')
        return
      }
    }
    try {
      await adminApi.updateUserStatus(id, nextStatus, reason)
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
  function openComplaint(id) {
    if (departments.length === 0) loadDepartments()
    navigate(`/admin/complaints/${id}`)
  }

  const handleOpenComplaint = (row) => {
    openComplaint(row.id)
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
  const [aiSummaryModalOpen, setAiSummaryModalOpen] = useState(false)

  // ── Render ───────────────────────────────────────────────────────────────
  if (activeComplaintId) {
    return (
      <AdminShell title="Case File Workspace" activeTab="complaints" onTabClick={switchTab}>
        <AdminCaseWorkspace
          complaintId={activeComplaintId}
          onBack={() => {
            navigate('/admin?tab=complaints')
            switchTab('complaints')
          }}
          officers={officers}
          departments={departments}
          onRefreshQueue={() => loadComplaints(complaintsPage)}
        />
      </AdminShell>
    )
  }

  const activeTabMeta = TABS.find((t) => t.key === tab) || TABS[0]

  return (
    <AdminShell title={activeTabMeta.label} activeTab={tab} onTabClick={switchTab}>
      {/* ── Overview (Municipal Governance Command Center) ────────────────────── */}
      {tab === 'overview' && (
        <GovernanceOverview
          onNavigateTab={(targetTab, filters) => {
            const nextParams = { tab: targetTab, ...(filters || {}) }
            setSearchParams(nextParams)
          }}
          onOpenAiSummary={() => setAiSummaryModalOpen(true)}
        />
      )}

      {/* ── Civic Intelligence ────────────────────────────────────────────────── */}
      {tab === 'intelligence' && (
        <CivicIntelligenceView
          onNavigateTab={(targetTab, filters) => {
            const nextParams = { tab: targetTab, ...(filters || {}) }
            setSearchParams(nextParams)
          }}
        />
      )}

      {/* ── Complaints ──────────────────────────────────────────────────────── */}
      {tab === 'complaints' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4 gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-850 dark:text-white">Complaints Queue</h2>
              <p className="text-xs text-slate-400">Manage, assign and monitor all citizen complaints.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700">
                {complaintsTotal} Complaints
              </span>
              <button
                onClick={() =>
                  loadComplaints(
                    complaintsPage,
                    complaintSearch,
                    complaintStatusFilter,
                    complaintPriorityFilter,
                    complaintCategoryFilter,
                    complaintDepartmentFilter,
                    complaintAssignmentFilter,
                    complaintDateFrom,
                    complaintDateTo,
                    complaintDueSoonFilter,
                    complaintOverdueFilter
                  )
                }
                className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                aria-label="Refresh complaints list"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap gap-2 mb-4 pb-1">
            {[
              {
                key: 'all',
                label: 'All',
                count: dashData?.complaints?.total || complaintsTotal || 0,
                icon: Layers,
                inactiveCls: 'bg-emerald-50/90 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50',
                activeCls: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
                badgeInactiveCls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
                badgeActiveCls: 'bg-emerald-700/80 text-white'
              },
              {
                key: 'unassigned',
                label: 'Unassigned',
                count: dashData?.complaints?.unassigned || 0,
                icon: UserX,
                inactiveCls: 'bg-slate-50/90 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800',
                activeCls: 'bg-slate-800 text-white border-slate-800 shadow-sm dark:bg-slate-700 dark:border-slate-600',
                badgeInactiveCls: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                badgeActiveCls: 'bg-slate-900/60 text-white'
              },
              {
                key: 'high_priority',
                label: 'High Priority',
                count: dashData?.complaints?.highPriority || 0,
                icon: AlertTriangle,
                inactiveCls: 'bg-orange-50/90 text-orange-800 border-orange-200 hover:bg-orange-100/80 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/50',
                activeCls: 'bg-orange-600 text-white border-orange-600 shadow-sm',
                badgeInactiveCls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200',
                badgeActiveCls: 'bg-orange-700/80 text-white'
              },
              {
                key: 'critical',
                label: 'Critical',
                count: dashData?.complaints?.critical || 0,
                icon: AlertOctagon,
                inactiveCls: 'bg-red-50/90 text-red-800 border-red-200 hover:bg-red-100/80 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/50',
                activeCls: 'bg-red-600 text-white border-red-600 shadow-sm',
                badgeInactiveCls: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
                badgeActiveCls: 'bg-red-700/80 text-white'
              },
              {
                key: 'due_soon',
                label: 'Due Soon',
                count: dashData?.complaints?.dueSoon || 0,
                icon: Clock,
                inactiveCls: 'bg-amber-50/90 text-amber-800 border-amber-200 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/50',
                activeCls: 'bg-amber-600 text-white border-amber-600 shadow-sm',
                badgeInactiveCls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
                badgeActiveCls: 'bg-amber-700/80 text-white'
              },
              {
                key: 'overdue',
                label: 'Overdue',
                count: dashData?.complaints?.overdue || 0,
                icon: AlertCircle,
                inactiveCls: 'bg-red-50/90 text-red-800 border-red-200 hover:bg-red-100/80 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/50',
                activeCls: 'bg-red-600 text-white border-red-600 shadow-sm',
                badgeInactiveCls: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
                badgeActiveCls: 'bg-red-700/80 text-white'
              },
              {
                key: 'in_progress',
                label: 'In Progress',
                count: dashData?.complaints?.inProgress || 0,
                icon: Activity,
                inactiveCls: 'bg-blue-50/90 text-blue-800 border-blue-200 hover:bg-blue-100/80 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/50',
                activeCls: 'bg-blue-600 text-white border-blue-600 shadow-sm',
                badgeInactiveCls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
                badgeActiveCls: 'bg-blue-700/80 text-white'
              },
              {
                key: 'resolved',
                label: 'Resolved',
                count: dashData?.complaints?.resolved || 0,
                icon: CheckCircle2,
                inactiveCls: 'bg-emerald-50/90 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50',
                activeCls: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
                badgeInactiveCls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
                badgeActiveCls: 'bg-emerald-700/80 text-white'
              },
              {
                key: 'reopened',
                label: 'Reopened',
                count: dashData?.complaints?.reopened || 0,
                icon: RefreshCw,
                inactiveCls: 'bg-purple-50/90 text-purple-800 border-purple-200 hover:bg-purple-100/80 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/50',
                activeCls: 'bg-purple-600 text-white border-purple-600 shadow-sm',
                badgeInactiveCls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
                badgeActiveCls: 'bg-purple-700/80 text-white'
              },
              {
                key: 'closed',
                label: 'Closed',
                count: dashData?.complaints?.closed || 0,
                icon: CheckCheck,
                inactiveCls: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200/80 dark:bg-slate-850 dark:text-slate-200 dark:border-slate-700',
                activeCls: 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-slate-950 dark:border-slate-800',
                badgeInactiveCls: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
                badgeActiveCls: 'bg-slate-800 text-white'
              }
            ].map((chip) => {
              const isActive = activeQuickChip === chip.key;
              const ChipIcon = chip.icon;

              return (
                <button
                  key={chip.key}
                  onClick={() => handleQuickChipClick(chip.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[10px] border transition-all duration-150 active:scale-95 ${
                    isActive ? chip.activeCls : chip.inactiveCls
                  }`}
                >
                  <ChipIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : ''}`} />
                  <span>{chip.label}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full min-w-[20px] text-center ${
                    isActive ? chip.badgeActiveCls : chip.badgeInactiveCls
                  }`}>
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filter Toolbar */}
          <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-4 dark:bg-slate-900/40 dark:border-slate-800/80 mb-4 space-y-3 shadow-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Search</label>
                <Input
                  value={complaintSearch}
                  onChange={(e) => { setComplaintSearch(e.target.value); setComplaintsPage(1) }}
                  placeholder="ID, title, category, citizen..."
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Status</label>
                <select
                  value={complaintStatusFilter}
                  onChange={(e) => { setComplaintStatusFilter(e.target.value); setComplaintsPage(1) }}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-slate-700 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-250 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="reopened">Reopened</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Priority</label>
                <select
                  value={complaintPriorityFilter}
                  onChange={(e) => { setComplaintPriorityFilter(e.target.value); setComplaintsPage(1) }}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-slate-700 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-250 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Category</label>
                <select
                  value={complaintCategoryFilter}
                  onChange={(e) => { setComplaintCategoryFilter(e.target.value); setComplaintsPage(1) }}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-slate-700 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-250 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">All Categories</option>
                  <option value="roads">Roads</option>
                  <option value="sanitation">Sanitation</option>
                  <option value="lighting">Street Lighting</option>
                  <option value="utilities">Water & Utilities</option>
                  <option value="drainage">Drainage</option>
                  <option value="parks">Parks</option>
                  <option value="public_safety">Traffic / Public Safety</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Department</label>
                <select
                  value={complaintDepartmentFilter}
                  onChange={(e) => { setComplaintDepartmentFilter(e.target.value); setComplaintsPage(1) }}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-slate-700 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-250 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Assignment</label>
                <select
                  value={complaintAssignmentFilter}
                  onChange={(e) => { setComplaintAssignmentFilter(e.target.value); setComplaintsPage(1) }}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-slate-700 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-250 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">All</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div>
                  <select
                    value={complaintDateFilter}
                    onChange={(e) => handleDatePresetChange(e.target.value)}
                    className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-250 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">All Date Ranges</option>
                    <option value="today">Today</option>
                    <option value="7_days">Last 7 Days</option>
                    <option value="30_days">Last 30 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {complaintDateFilter === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={complaintDateFrom}
                      onChange={(e) => { setComplaintDateFrom(e.target.value); setComplaintsPage(1) }}
                      className="text-xs rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-250 focus:outline-none"
                    />
                    <span className="text-slate-400 text-xs">to</span>
                    <input
                      type="date"
                      value={complaintDateTo}
                      onChange={(e) => { setComplaintDateTo(e.target.value); setComplaintsPage(1) }}
                      className="text-xs rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-250 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setComplaintSearch('')
                  setComplaintStatusFilter('')
                  setComplaintPriorityFilter('')
                  setComplaintCategoryFilter('')
                  setComplaintDepartmentFilter('')
                  setComplaintAssignmentFilter('')
                  setComplaintDateFilter('')
                  setComplaintDateFrom('')
                  setComplaintDateTo('')
                  setComplaintDueSoonFilter(false)
                  setComplaintOverdueFilter(false)
                  setActiveQuickChip('all')
                  setComplaintsPage(1)
                }}
                className="text-xs font-semibold text-purple-655 hover:text-purple-700 hover:underline dark:text-purple-400 dark:hover:text-purple-300"
              >
                Clear Active Filters
              </button>
            </div>
          </div>

          {/* Error State */}
          {complaintsError && !complaintsLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">Unable to load complaints</span>
              </div>
              <p className="mt-1 text-xs text-red-400 font-mono">{complaintsError.endpoint}</p>
              <button
                onClick={() =>
                  loadComplaints(
                    complaintsPage,
                    complaintSearch,
                    complaintStatusFilter,
                    complaintPriorityFilter,
                    complaintCategoryFilter,
                    complaintDepartmentFilter,
                    complaintAssignmentFilter,
                    complaintDateFrom,
                    complaintDateTo,
                    complaintDueSoonFilter,
                    complaintOverdueFilter
                  )
                }
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:underline"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {/* Skeleton Loaders */}
          {complaintsLoading && (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          )}

          {/* Box-wise Card List */}
          {!complaintsLoading && !complaintsError && (
            <div className="space-y-3">
              {complaints.map((row) => {
                const imgUrl = row.images?.[0]?.url;
                const [mainAddr, ...restAddr] = (row.address || 'Unknown').split(',');
                
                // Helper function for relative times
                const dateStr = row.created_at;
                let relativeText = '—';
                if (dateStr) {
                  const date = new Date(dateStr);
                  const diffHrs = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60);
                  if (diffHrs < 1) {
                    relativeText = `${Math.max(1, Math.round(diffHrs * 60))}m ago`;
                  } else if (diffHrs < 24) {
                    relativeText = `${Math.round(diffHrs)}h ago`;
                  } else {
                    relativeText = `${Math.floor(diffHrs / 24)}d ago`;
                  }
                }

                return (
                  <div
                    key={row.id}
                    onClick={() => handleOpenComplaint(row)}
                    className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-slate-150 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
                  >
                    {/* LEFT: Image Thumbnail */}
                    <div className="w-full md:w-28 h-20 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-850 dark:bg-slate-950 flex items-center justify-center">
                      {imgUrl ? (
                        <img
                          src={resolveImageUrl(imgUrl)}
                          alt="Thumbnail"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="text-[9px] font-bold uppercase tracking-wider text-slate-400 select-none flex items-center justify-center h-full w-full"
                        style={{ display: imgUrl ? 'none' : 'flex' }}
                      >
                        No Photo
                      </div>
                    </div>

                    {/* MAIN CONTENT: ID, Title, Description, Category */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold text-slate-400 select-all">
                          #CGN-{String(row.id).padStart(5, '0')}
                        </span>
                        
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <StatusBadge status={row.status} type="status" />
                          <StatusBadge status={row.priority} type="priority" />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug truncate">
                          {row.title || 'Untitled'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {row.summary || row.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* Metadata row */}
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-2xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 capitalize">
                          {row.category?.replace('_', ' ') || 'General'}
                        </span>

                        <span className="flex items-center gap-0.5 truncate max-w-[150px]" title={row.address}>
                          <span>📍</span>
                          <span>{mainAddr?.trim() || 'Chandigarh'}</span>
                          {restAddr.length > 0 && <span className="text-slate-400 dark:text-slate-500 ml-1 truncate">({restAddr[0]?.trim()})</span>}
                        </span>

                        <span className="flex items-center gap-1">
                          <span>👤</span>
                          {row.officer_name ? (
                            <span className="truncate max-w-[200px] font-semibold text-slate-700 dark:text-slate-300">
                              {row.officer_name} {row.department_name ? `· ${row.department_name}` : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
                              Unassigned
                            </span>
                          )}
                        </span>

                        <span className="text-slate-400 dark:text-slate-500">
                          {relativeText}
                        </span>
                      </div>
                    </div>

                    {/* RIGHT SIDE: Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 md:justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenComplaint(row)}
                        className="w-full md:w-auto inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-slate-50 hover:text-emerald-700 dark:border-slate-750 dark:bg-slate-900 dark:text-emerald-450 dark:hover:bg-slate-855 transition-colors shadow-3xs"
                      >
                        View →
                      </button>

                      {/* Operations Menu (⋮) */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuRowId(activeMenuRowId === row.id ? null : row.id)}
                          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 dark:border-slate-750 dark:bg-slate-900 dark:hover:bg-slate-855 transition-colors"
                          aria-label="Open operations menu"
                        >
                          <span className="font-extrabold text-sm tracking-widest text-slate-500 block leading-3 pb-1">...</span>
                        </button>
                        {activeMenuRowId === row.id && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setActiveMenuRowId(null)} />
                            <div className="absolute right-0 mt-1 w-44 rounded-lg border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 z-40 p-1">
                              <button
                                onClick={() => { handleOpenComplaint(row); setActiveMenuRowId(null); }}
                                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-semibold text-slate-750 hover:bg-purple-50 hover:text-purple-700 dark:text-slate-355 dark:hover:bg-purple-950/20"
                              >
                                <Eye className="h-3.5 w-3.5" /> View Details
                              </button>
                              
                              <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />
                              
                              <div className="px-3 py-1 text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Quick Actions</div>
                              <button
                                onClick={() => { handleOpenComplaint(row); setActiveMenuRowId(null); }}
                                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-semibold text-slate-755 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-850"
                              >
                                Assign / Reassign
                              </button>
                              <button
                                onClick={() => { handleOpenComplaint(row); setActiveMenuRowId(null); }}
                                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-semibold text-slate-755 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-850"
                              >
                                Change Status
                              </button>
                              <button
                                onClick={() => { handleOpenComplaint(row); setActiveMenuRowId(null); }}
                                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-semibold text-slate-755 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-850"
                              >
                                Change Priority
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {complaints.length === 0 && (
                <EmptyState title="No complaints found" subtitle="Try adjusting your filters or chip presets." />
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

      {/* ── Map (Municipal GIS Command Center) ─────────────────────────────────── */}
      {tab === 'map' && (
        <div className="space-y-4">
          {/* GIS Header & Quick Stats */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-2 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-850 dark:text-white">Municipal GIS & Geospatial Command Center</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40">
                  PostGIS Live
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Real-time geospatial intelligence, AI hotspots, SLA risk layers, and municipal ward boundaries.</p>
            </div>
          </div>

          {/* GIS Filter Toolbar */}
          <div className="card p-4 rounded-2xl">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div>
                <label htmlFor="admin-map-status" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Status</label>
                <select id="admin-map-status" value={mapFilters.status || ''} onChange={(e) => setMapFilters((p) => ({ ...p, status: e.target.value || undefined }))} className={SELECT_CLS}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="admin-map-cat" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Category</label>
                <select id="admin-map-cat" value={mapFilters.category || ''} onChange={(e) => setMapFilters((p) => ({ ...p, category: e.target.value || undefined }))} className={SELECT_CLS}>
                  {CATEGORY_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="admin-map-prio" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Priority</label>
                <select id="admin-map-prio" value={mapFilters.priority || ''} onChange={(e) => setMapFilters((p) => ({ ...p, priority: e.target.value || undefined }))} className={SELECT_CLS}>
                  {PRIORITY_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="admin-map-sla" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">SLA Risk</label>
                <select id="admin-map-sla" value={mapFilters.slaRisk || ''} onChange={(e) => setMapFilters((p) => ({ ...p, slaRisk: e.target.value || undefined }))} className={SELECT_CLS}>
                  <option value="">All SLA Tiers</option>
                  <option value="overdue">🔴 Overdue</option>
                  <option value="due_soon">🟡 Due Soon (&lt;24h)</option>
                  <option value="on_time">🟢 On Time</option>
                </select>
              </div>
              <div>
                <label htmlFor="admin-map-time" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Time Range</label>
                <select id="admin-map-time" value={mapFilters.timeframe || ''} onChange={(e) => setMapFilters((p) => ({ ...p, timeframe: e.target.value || undefined }))} className={SELECT_CLS}>
                  {TIME_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Interactive GIS Map */}
          <MapView
            height={620}
            filters={mapFilters}
            userRole="admin"
            showAdminDrawer={true}
            onComplaintClick={(c) => {
              // Synchronize complaint click with admin action
            }}
          />
        </div>
      )}

      {/* ── SLA Intelligence ─────────────────────────────────────────────────── */}
      {tab === 'sla' && (
        <SlaIntelligenceView />
      )}

      {/* ── Wards & Zones ─────────────────────────────────────────────────────── */}
      {tab === 'wards' && (
        <WardGovernanceView onNavigateToMap={() => setTab('map')} />
      )}

      {/* ── Data Quality & Governance Alerts ──────────────────────────────────── */}
      {tab === 'data-quality' && (
        <DataQualityAlertsView />
      )}

      {/* ── Civic Reputation & Performance ──────────────────────────────────── */}
      {tab === 'reputation' && (
        <ReputationManagementView />
      )}

      {/* ── Users ───────────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <UserDirectoryView onNavigateToOfficer={() => setTab('officer-approvals')} />
      )}

      {/* ── Officer Management & Governance ─────────────────────────────────── */}
      {tab === 'officer-approvals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setOfficerSubTab('approvals')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  officerSubTab === 'approvals'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Officer Approvals &amp; Roster
              </button>
              <button
                onClick={() => setOfficerSubTab('governance')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  officerSubTab === 'governance'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Performance &amp; Fair Governance
              </button>
            </div>
          </div>

          {officerSubTab === 'governance' ? (
            <OfficerGovernanceView />
          ) : (
            <OfficerApprovals
              pendingOfficers={officerApprovals.filter(o => o.status === 'pending')}
              allOfficers={officerApprovals}
              loading={officersLoading}
              onRefresh={() => loadOfficerApprovals(null, officersPage)}
            />
          )}
        </div>
      )}

      {/* ── Departments Governance & Management ──────────────────────────────── */}
      {tab === 'departments' && (
        <div className="space-y-6">
          <DepartmentGovernanceView
            onNavigateToMap={() => setTab('map')}
            onNavigateToReports={() => setTab('reports')}
          />

          <div className="card p-5 mt-6 border-t-2 border-emerald-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create New Department</h3>
                <p className="text-xs text-slate-400">Add a new operational department to the municipal roster.</p>
              </div>
            </div>
            <form onSubmit={handleCreateDept} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Department Name" value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g. Street Lighting & Electricals" required />
              <Input label="Description" value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} placeholder="Operational purview..." />
              <div className="flex items-end">
                <Button type="submit" className="w-full py-2.5"><Plus className="h-4 w-4" aria-hidden="true" /> Create Department</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Notifications Center ──────────────────────────────────────────────── */}
      {tab === 'notifications' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">Admin Notification Center</h2>
              <p className="text-xs text-slate-400 mt-0.5">Stay updated on complaints, officer activity, and system events.</p>
            </div>
            {adminNotifs.filter(n => !n.is_read).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllNotifsRead}
                className="flex items-center gap-2"
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all read
              </Button>
            )}
          </div>

          {/* Filter categories tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            {[
              { key: 'all', label: 'All Notifications', count: adminNotifs.length },
              { key: 'unread', label: 'Unread', count: adminNotifs.filter(n => !n.is_read).length },
              { key: 'COMPLAINT', label: 'Complaints', count: adminNotifs.filter(n => n.type === 'COMPLAINT').length },
              { key: 'OFFICER', label: 'Officer Approvals', count: adminNotifs.filter(n => n.type === 'OFFICER').length },
              { key: 'SLA', label: 'SLA Alerts', count: adminNotifs.filter(n => n.type === 'SLA').length },
              { key: 'SYSTEM', label: 'System', count: adminNotifs.filter(n => n.type === 'SYSTEM').length }
            ].map(cat => {
              const active = notifsFilter === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setNotifsFilter(cat.key)}
                  className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    active 
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {cat.label}
                  {cat.count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Skeletons loading */}
          {notifsLoading && adminNotifs.length === 0 && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          )}

          {/* Error state */}
          {notifsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">Unable to load notifications</span>
              </div>
              <button onClick={() => loadNotifications(1)} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:underline">
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {/* Cards listing */}
          {!notifsLoading && !notifsError && (
            <>
              {(() => {
                const filtered = adminNotifs.filter(n => {
                  if (notifsFilter === 'all') return true;
                  if (notifsFilter === 'unread') return !n.is_read;
                  return n.type === notifsFilter;
                });

                if (filtered.length === 0) {
                  return (
                    <EmptyState
                      icon={Bell}
                      title="You're all caught up"
                      subtitle="No notifications match the selected category right now."
                    />
                  );
                }

                return (
                  <div className="space-y-3">
                    {filtered.map(n => {
                      const type = n.type || 'COMPLAINT';
                      let iconColor = 'bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400';
                      let cardBorder = 'border-slate-100 dark:border-slate-800';
                      
                      if (type === 'OFFICER') {
                        iconColor = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400';
                      } else if (type === 'SLA') {
                        iconColor = 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400';
                      } else if (type === 'SYSTEM') {
                        iconColor = 'bg-purple-100 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400';
                      }

                      // highlight unread states
                      if (!n.is_read) {
                        cardBorder = 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/10 dark:bg-emerald-950/10';
                      }

                      return (
                        <div
                          key={n.id}
                          onClick={async () => {
                            await markNotifRead(n);
                            if (n.payload?.complaintId) {
                              openComplaint(n.payload.complaintId);
                            } else if (n.payload?.officerId) {
                              setTab('officer-approvals');
                            } else if (n.type === 'SYSTEM') {
                              setTab('system-health');
                            }
                          }}
                          className={`card flex flex-col sm:flex-row items-start gap-4 p-4 border transition-all hover:shadow-md cursor-pointer ${cardBorder}`}
                        >
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconColor}`}>
                            <Bell className="h-4 w-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-baseline gap-2">
                              <h4 className={`text-sm font-semibold truncate ${n.is_read ? 'text-slate-700 dark:text-slate-200' : 'text-slate-900 dark:text-white font-extrabold'}`}>
                                {n.payload?.title || n.payload?.message || n.type || 'Notification'}
                              </h4>
                              {!n.is_read && (
                                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {n.payload?.message || n.payload?.subtitle || 'System notification check'}
                            </p>
                            {n.payload?.subtitle && n.payload?.message && (
                              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                {n.payload.subtitle}
                              </p>
                            )}
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(n.created_at).toLocaleString()}
                            </span>
                            {!n.is_read && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await markNotifRead(n);
                                }}
                                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {adminNotifs.length > 20 && notifsHasMore && (
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => loadNotifications(notifsPage + 1, true)}
                    disabled={notifsLoading}
                  >
                    {notifsLoading ? 'Loading...' : 'Load more'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Reports ─────────────────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <ReportCenterView />
      )}
      {false && tab === 'reports' && (
        <div className="space-y-6">
          {reportsLoading && !reportsDashData && <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>}

          {reportsError && !reportsLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">Unable to load reports</span>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{reportsError.message}</p>
              <button onClick={loadReports} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:underline">
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {!reportsError && (
            <>
              {/* Header & Date Range Selectors */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">Municipal Intelligence Dashboard</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Comprehensive analytics, operational KPIs, SLA status and recent activity logs.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Date Range:</span>
                    <select
                      value={reportsDatePreset}
                      onChange={(e) => {
                        setReportsDatePreset(e.target.value)
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                    >
                      <option value="all">All Time</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                      <option value="90d">Last 90 Days</option>
                      <option value="year">This Year</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  {reportsDatePreset === 'custom' && (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <input
                        type="date"
                        value={reportsStartDate}
                        onChange={(e) => setReportsStartDate(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                      <span className="text-xs text-slate-400">to</span>
                      <input
                        type="date"
                        value={reportsEndDate}
                        onChange={(e) => setReportsEndDate(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                    </div>
                  )}

                  <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5">
                    <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
                  </Button>
                </div>
              </div>

              {/* Dynamic KPI Row */}
              {reportsDashLoading && !reportsDashData ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 animate-fade-in">
                  {[
                    {
                      title: 'Total Complaints',
                      value: reportsDashData?.complaints?.total || 0,
                      subtitle: reportsDatePreset === 'all' ? 'All time records' : 'In chosen range',
                      color: 'text-slate-900 dark:text-white',
                      bg: 'bg-slate-50 dark:bg-slate-800/40'
                    },
                    {
                      title: 'Open Issues',
                      value: reportsDashData?.complaints?.open || 0,
                      subtitle: `${reportsDashData?.complaints?.total ? Math.round((reportsDashData.complaints.open / reportsDashData.complaints.total) * 100) : 0}% of total`,
                      color: 'text-blue-600 dark:text-blue-400',
                      bg: 'bg-blue-50/40 dark:bg-blue-950/10'
                    },
                    {
                      title: 'In Progress',
                      value: reportsDashData?.complaints?.inProgress || 0,
                      subtitle: `${reportsDashData?.complaints?.total ? Math.round((reportsDashData.complaints.inProgress / reportsDashData.complaints.total) * 100) : 0}% active resolution`,
                      color: 'text-amber-500',
                      bg: 'bg-amber-50/40 dark:bg-amber-950/10'
                    },
                    {
                      title: 'Resolved',
                      value: reportsDashData?.complaints?.resolved || 0,
                      subtitle: `${reportsDashData?.complaints?.resolutionRate || 0}% resolution rate`,
                      color: 'text-emerald-600 dark:text-emerald-400',
                      bg: 'bg-emerald-50/40 dark:bg-emerald-950/10'
                    },
                    {
                      title: 'Overdue SLA',
                      value: reportsDashData?.complaints?.overdue || 0,
                      subtitle: 'Deadline breached',
                      color: reportsDashData?.complaints?.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500',
                      bg: reportsDashData?.complaints?.overdue > 0 ? 'bg-red-50/40 dark:bg-red-950/10' : 'bg-slate-50 dark:bg-slate-800/40'
                    },
                    {
                      title: 'Avg Resolution',
                      value: `${reportsDashData?.complaints?.avgResolutionHours || 0}h`,
                      subtitle: 'Hours response time',
                      color: 'text-purple-600 dark:text-purple-400',
                      bg: 'bg-purple-50/40 dark:bg-purple-950/10'
                    }
                  ].map((kpi, idx) => (
                    <div key={idx} className={`rounded-xl border border-slate-100 dark:border-slate-800/60 p-4 shadow-sm ${kpi.bg}`}>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{kpi.title}</div>
                      <div className={`text-2xl font-black mt-1 ${kpi.color}`}>{kpi.value}</div>
                      <div className="text-[10px] text-slate-400 mt-1 truncate">{kpi.subtitle}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className="card p-5 lg:col-span-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white">Complaint Volume Trend</h3>
                      <p className="text-xs text-slate-400">Comparing newly submitted vs resolved tickets over time.</p>
                    </div>
                  </div>
                  {reportsDashLoading ? (
                    <Skeleton className="h-[280px] rounded-lg" />
                  ) : (
                    <SubmittedResolvedChart trend={reportsDashData?.resolutionTrend} dark={dark} />
                  )}
                </div>

                {/* Status Donut Chart */}
                <div className="card p-5 flex flex-col justify-between">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">Status Distribution</h3>
                    <p className="text-xs text-slate-400">Share of complaints in each workflow state.</p>
                  </div>
                  {reportsDashLoading ? (
                    <Skeleton className="h-[220px] rounded-lg" />
                  ) : (
                    <ChartPie
                      type="doughnut"
                      data={[
                        { label: 'Open', value: reportsDashData?.complaints?.open || 0 },
                        { label: 'In Progress', value: reportsDashData?.complaints?.inProgress || 0 },
                        { label: 'Resolved', value: reportsDashData?.complaints?.resolved || 0 },
                        { label: 'Rejected', value: reportsDashData?.complaints?.rejected || 0 }
                      ]}
                      height={220}
                    />
                  )}
                </div>
              </div>

              {/* Category Breakdown & Priority Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Categories progress bars */}
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Complaints by Category</h3>
                  {reportsDashLoading ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 rounded-lg" />)}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const cats = reportsDashData?.categories || [];
                        const total = cats.reduce((sum, c) => sum + (c.count || 0), 0) || 1;
                        if (cats.length === 0) return <div className="text-xs text-slate-400 py-8 text-center">No category data logged</div>;
                        return cats.map(c => {
                          const pct = Math.round((c.count / total) * 100);
                          return (
                            <div key={c.category} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-slate-700 dark:text-slate-300 capitalize">{c.category}</span>
                                <span className="text-slate-400">{c.count} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                                <div
                                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                {/* Priority Breakdown Cards */}
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Priority Distribution</h3>
                  {reportsDashLoading ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {(() => {
                        const prios = reportsDashData?.priorities || [];
                        const total = prios.reduce((sum, p) => sum + (p.count || 0), 0) || 1;
                        const keys = ['critical', 'high', 'medium', 'low'];
                        return keys.map(key => {
                          const record = prios.find(p => String(p.priority).toLowerCase() === key);
                          const count = record?.count || 0;
                          const pct = Math.round((count / total) * 100);
                          
                          let bg = 'bg-slate-50 border-slate-100 dark:bg-slate-800/40 dark:border-slate-800';
                          let titleColor = 'text-slate-400';
                          let countColor = 'text-slate-800 dark:text-slate-100';

                          if (key === 'critical') {
                            bg = 'bg-red-50/20 border-red-100 dark:bg-red-950/5 dark:border-red-900/30';
                            titleColor = 'text-red-400 dark:text-red-500';
                            countColor = 'text-red-600 dark:text-red-400';
                          } else if (key === 'high') {
                            bg = 'bg-orange-50/20 border-orange-100 dark:bg-orange-950/5 dark:border-orange-900/30';
                            titleColor = 'text-orange-400';
                            countColor = 'text-orange-600 dark:text-orange-400';
                          } else if (key === 'medium') {
                            bg = 'bg-amber-50/20 border-amber-100 dark:bg-amber-950/5 dark:border-amber-900/30';
                            titleColor = 'text-amber-400';
                            countColor = 'text-amber-600 dark:text-amber-400';
                          }

                          return (
                            <div key={key} className={`border rounded-xl p-3 flex flex-col justify-between ${bg}`}>
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${titleColor}`}>{key}</span>
                              <div className="flex items-baseline justify-between mt-2">
                                <span className={`text-xl font-extrabold ${countColor}`}>{count}</span>
                                <span className="text-[10px] text-slate-400 font-semibold">{pct}%</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Department Performance */}
              <div className="card p-5 animate-fade-in">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Departmental Resolution Compliance</h3>
                {reportsDashLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-xs text-slate-500 dark:text-slate-400">
                      <thead className="border-b border-slate-200 bg-slate-50 uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Department</th>
                          <th className="px-4 py-3 font-semibold text-center">Total Complaints</th>
                          <th className="px-4 py-3 font-semibold text-center text-blue-500">Pending</th>
                          <th className="px-4 py-3 font-semibold text-center text-amber-500">In Progress</th>
                          <th className="px-4 py-3 font-semibold text-center text-emerald-500">Resolved</th>
                          <th className="px-4 py-3 font-semibold text-center text-red-500">Overdue SLA</th>
                          <th className="px-4 py-3 font-semibold text-right">Resolution Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {(reportsDashData?.departments || []).map((dept) => (
                          <tr key={dept.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{dept.name}</td>
                            <td className="px-4 py-3 text-center font-semibold">{dept.complaint_count || 0}</td>
                            <td className="px-4 py-3 text-center">{dept.pending_count || 0}</td>
                            <td className="px-4 py-3 text-center">{dept.in_progress_count || 0}</td>
                            <td className="px-4 py-3 text-center">{dept.resolved_count || 0}</td>
                            <td className="px-4 py-3 text-center font-bold text-red-550 dark:text-red-400">{dept.overdue_count || 0}</td>
                            <td className="px-4 py-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                              {dept.resolution_rate || 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Hotspots & Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                {/* Top Geographic Hotspots */}
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Top Geographic Hotspots</h3>
                  <p className="text-[11px] text-slate-400 mb-3">High density complaint zones/addresses.</p>
                  <div className="space-y-3">
                    {(() => {
                      const hotspots = getHotspots().slice(0, 5);
                      if (hotspots.length === 0) return <div className="text-xs text-slate-400 py-6 text-center">No hotspot metrics detected.</div>;
                      return hotspots.map((h, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{h.location}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{h.category} Category</div>
                          </div>
                          <span className="shrink-0 text-xs font-black text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {h.count} issues
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Dynamic Operational Insights */}
                <div className="card p-5 border border-emerald-105 bg-emerald-50/5 dark:border-emerald-950/20 dark:bg-emerald-950/5">
                  <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-3 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-500" /> Operational Insights
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4 leading-relaxed">
                    {(() => {
                      const stats = reportsDashData?.complaints || {};
                      const unassignedCount = stats.unassigned || 0;
                      const criticalCount = stats.critical || 0;
                      const overdueCount = stats.overdue || 0;
                      const dueSoonCount = stats.dueSoon || 0;
                      
                      const insights = [];
                      if (unassignedCount > 0) {
                        insights.push(`There are currently ${unassignedCount} complaints awaiting officer assignment.`);
                      } else {
                        insights.push("All logged complaints have been successfully assigned to municipal officers.");
                      }

                      if (overdueCount > 0) {
                        insights.push(`SLA Breach Alert: ${overdueCount} complaints have exceeded resolution window deadlines.`);
                      } else {
                        insights.push("Excellent! No active SLA breaches detected in this cycle.");
                      }

                      if (dueSoonCount > 0) {
                        insights.push(`${dueSoonCount} complaints are approaching SLA breach within the next 24 hours.`);
                      }

                      if (criticalCount > 0) {
                        insights.push(`Urgent: ${criticalCount} critical-severity complaints require immediate attention.`);
                      }

                      const topCat = (reportsDashData?.categories || [])[0];
                      if (topCat) {
                        insights.push(`Category '${topCat.category}' has the highest volume with ${topCat.count} filed tickets.`);
                      }

                      if (insights.length === 0) {
                        return <li>All services are running normally. No warnings detected.</li>;
                      }

                      return insights.map((ins, i) => <li key={i}>{ins}</li>);
                    })()}
                  </ul>
                </div>

                {/* Recent Activity stream */}
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Recent Activity</h3>
                  <p className="text-[11px] text-slate-400 mb-3">Latest audit actions recorded.</p>
                  <div className="space-y-3 overflow-y-auto max-h-[220px]">
                    {auditLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="text-xs border-b border-slate-50 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-700 dark:text-slate-200 capitalize truncate max-w-[140px]">
                            {log.actor_name || 'System'} ({log.actor_role})
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {log.created_at ? new Date(log.created_at).toLocaleTimeString() : '—'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          Action: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{log.action}</strong>
                        </div>
                      </div>
                    ))}
                    {auditLogs.length === 0 && <div className="text-xs text-slate-400 py-6 text-center">No recent activities logged.</div>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Audit Logs ──────────────────────────────────────────────────────── */}
      {tab === 'audit-logs' && (
        <AuditLogsView />
      )}

      {/* ── Email Center ────────────────────────────────────────────────────── */}
      {tab === 'email-center' && (
        <EmailCenterView />
      )}

      {/* ── System Health ────────────────────────────────────────────────────── */}
      {tab === 'system-health' && (
        <SystemHealthView />
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
            if (tab === 'complaints') {
              loadComplaints(
                complaintsPage,
                complaintSearch,
                complaintStatusFilter,
                complaintPriorityFilter,
                complaintCategoryFilter,
                complaintDepartmentFilter,
                complaintAssignmentFilter,
                complaintDateFrom,
                complaintDateTo,
                complaintDueSoonFilter,
                complaintOverdueFilter
              )
            }
            if (tab === 'reports') loadReports()
          }}
        />
      )}

      {/* Role Change Modal */}
      {roleChangeModalData && (
        <RoleChangeModal
          user={roleChangeModalData.user}
          targetRole={roleChangeModalData.targetRole}
          departments={departments}
          isOpen={Boolean(roleChangeModalData)}
          onClose={() => setRoleChangeModalData(null)}
          onConfirm={handleConfirmRoleChange}
        />
      )}

      {/* Lightbox Modal */}
      {selectedImg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 p-4 transition-all duration-300" onClick={() => setSelectedImg(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors" aria-label="Close photo preview">
            <X className="h-8 w-8" />
          </button>
          <img src={selectedImg.startsWith('http') ? selectedImg : `${(import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace(/\/api$/, '')}${selectedImg.startsWith('/') ? '' : '/'}${selectedImg}`} alt="Enlarged view" className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
        </div>
      )}

      {/* AI Executive Summary Modal */}
      <AIExecutiveSummaryModal
        isOpen={aiSummaryModalOpen}
        onClose={() => setAiSummaryModalOpen(false)}
      />
    </AdminShell>
  )
}
