import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, MapPin, Calendar, FileText, Sparkles, Repeat,
  ChevronRight, Copy, Shield, Clock, User, Image as ImageIcon,
  ChevronLeft, X, ExternalLink, Briefcase, AlertCircle, CheckCircle2,
  Upload, AlertTriangle, RefreshCw, Check, ThumbsUp, Bookmark, MessageSquare,
  Send, CheckCheck, UploadCloud, Plus, EyeOff
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import toast from 'react-hot-toast'

import complaintsApi from '../services/complaints'
import * as adminApi from '../services/admin'
import officerApi from '../services/officer'
import AuthContext from '../context/AuthContext'
import ThemeContext from '../context/ThemeContext'
import AppShell from '../components/AppShell'
import StatusBadge from '../ui/StatusBadge'
import Timeline from '../components/Timeline'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import Button from '../ui/Button'
import { getTileConfig, STATUS_META, PRIORITY_META } from '../config/mapConfig'
import AIChatPanel from '../components/ai/AIChatPanel'

const VALID_TRANSITIONS = {
  open: ['in_progress', 'rejected'],
  pending: ['in_progress', 'rejected'],
  in_progress: ['resolved', 'rejected'],
  rejected: ['open', 'in_progress'],
  resolved: ['closed', 'reopened'],
  reopened: ['in_progress', 'resolved', 'rejected'],
  closed: ['reopened']
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  const base = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
  const serverHost = base.replace(/\/api$/, '');
  return `${serverHost}${url.startsWith('/') ? '' : '/'}${url}`;
};

function getSlaStatus(slaDueAt, status) {
  if (status === 'resolved' || status === 'closed' || status === 'rejected') {
    return { label: 'Resolved / Completed', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800/80 dark:text-slate-400', isBreached: false }
  }
  if (!slaDueAt) {
    return { label: 'Standard Resolution', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800/80 dark:text-slate-400', isBreached: false }
  }
  const now = new Date()
  const due = new Date(slaDueAt)
  const isOverdue = now > due
  if (isOverdue) {
    return { label: 'SLA Overdue', color: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-400', isBreached: true }
  }
  const diffHours = (due - now) / (1000 * 60 * 60)
  if (diffHours < 24) {
    return { label: 'Due Soon (<24h)', color: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-400', isBreached: false }
  }
  return { label: 'Within SLA', color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-400', isBreached: false }
}

function formatSlaCountdown(slaDueAt, status) {
  if (status === 'resolved' || status === 'closed' || status === 'rejected') return 'Resolved'
  if (!slaDueAt) return 'Standard timeline'
  const now = new Date()
  const due = new Date(slaDueAt)
  const diffMs = due - now
  const isOverdue = diffMs < 0
  const absDiffHours = Math.abs(diffMs) / (1000 * 60 * 60)

  if (absDiffHours < 1) {
    const mins = Math.max(1, Math.round(Math.abs(diffMs) / (1000 * 60)))
    return isOverdue ? `${mins}m overdue` : `${mins}m remaining`
  }
  if (absDiffHours < 24) {
    const hours = Math.round(absDiffHours)
    return isOverdue ? `${hours}h overdue` : `${hours}h remaining`
  } else {
    const days = Math.floor(absDiffHours / 24)
    const hours = Math.round(absDiffHours % 24)
    return `${days}d ${hours}h remaining`
  }
}

function MapPreview({ lat, lng, status, priority, address }) {
  const { dark } = useContext(ThemeContext)
  const tileConfig = getTileConfig(dark)
  const position = [parseFloat(lat), parseFloat(lng)]
  
  const markerIcon = useMemo(() => {
    const sm = STATUS_META[status] || { color: '#64748b', icon: '●' }
    const pm = PRIORITY_META[priority] || { color: '#94a3b8', ring: 0 }
    const size = pm.ring ? 28 + pm.ring : 24
    const html = `
      <div class="cgn-pin" style="width:${size}px;height:${size}px;">
        <div class="cgn-pin-inner" style="background:${sm.color};">
          <span class="cgn-pin-icon">${sm.icon}</span>
        </div>
        ${pm.ring ? `<div class="cgn-pin-ring" style="border:2.5px solid ${pm.color};"></div>` : ''}
      </div>
    `
    return L.divIcon({
      className: 'cgn-marker-icon',
      html,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2]
    })
  }, [status, priority])

  return (
    <div className="h-[280px] w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative z-0">
      <MapContainer center={position} zoom={15} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution={tileConfig.attribution}
          url={tileConfig.url}
          maxZoom={tileConfig.maxZoom}
        />
        <Marker position={position} icon={markerIcon}>
          <Popup>
            <div className="text-xs p-1">
              <div className="text-slate-500 uppercase tracking-wide text-[9px] font-bold mb-0.5">Report location</div>
              <div className="text-slate-800 dark:text-slate-100 font-bold leading-tight">{address || 'Complaint location'}</div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">{parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}</div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

export default function ComplaintView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  const { dark } = useContext(ThemeContext)

  useEffect(() => {
    if (user?.role === 'admin') {
      navigate(`/admin/complaints/${id}`, { replace: true })
    }
  }, [user, id, navigate])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [complaint, setComplaint] = useState(null)
  const [similar, setSimilar] = useState([])
  const [aiChatOpen, setAiChatOpen] = useState(false)

  // Community support, follows, and comments state
  const [votes, setVotes] = useState({ count: 0, hasVoted: false })
  const [follow, setFollow] = useState({ count: 0, isFollowing: false })
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [isCommentAnon, setIsCommentAnon] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)

  // Evidence upload modal state
  const [showEvidenceModal, setShowEvidenceModal] = useState(false)
  const [evidenceFiles, setEvidenceFiles] = useState([])
  const [uploadingEvidence, setUploadingEvidence] = useState(false)

  // Image gallery states
  const [activeImgIndex, setActiveImgIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  // Workflow / Action panel states
  const [updating, setUpdating] = useState(false)
  const [feedbackNote, setFeedbackNote] = useState('')
  
  // Modals
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  // Support Team & Resource Requests State
  const [supportTeam, setSupportTeam] = useState(null)
  const [resourceRequests, setResourceRequests] = useState([])
  const [showResourceModal, setShowResourceModal] = useState(false)
  const [reqType, setReqType] = useState('TEAM')
  const [reqPeople, setReqPeople] = useState(2)
  const [reqSkills, setReqSkills] = useState('')
  const [reqEquipment, setReqEquipment] = useState('')
  const [reqPriority, setReqPriority] = useState('medium')
  const [reqReason, setReqReason] = useState('')
  const [submittingResourceReq, setSubmittingResourceReq] = useState(false)

  // Officer workflow
  const [officerStatus, setOfficerStatus] = useState('')
  const [resolutionFile, setResolutionFile] = useState(null)
  
  // Admin workflow lists
  const [officers, setOfficers] = useState([])
  const [departments, setDepartments] = useState([])
  const [adminStatus, setAdminStatus] = useState('')
  const [adminPriority, setAdminPriority] = useState('')
  const [adminDeptId, setAdminDeptId] = useState('')
  const [adminOfficerId, setAdminOfficerId] = useState('')

  const fetchTeamAndRequests = useCallback(async () => {
    try {
      const [tRes, rRes] = await Promise.all([
        officerApi.getComplaintTeam(id).catch(() => null),
        officerApi.getResourceRequests(id).catch(() => [])
      ]);
      setSupportTeam(tRes);
      setResourceRequests(Array.isArray(rRes) ? rRes : (rRes?.items || []));
    } catch (e) {}
  }, [id]);

  const fetchComplaintDetails = useCallback(async () => {
    try {
      const cData = await complaintsApi.getComplaint(id)
      setComplaint(cData)
      
      if (cData.votes) setVotes(cData.votes)
      if (cData.follow) setFollow(cData.follow)
      if (cData.comments) setComments(cData.comments)

      const currentSt = cData.status || 'open'
      const validNext = VALID_TRANSITIONS[currentSt] || []
      setOfficerStatus(validNext[0] || currentSt)
      setAdminStatus(currentSt)
      setAdminPriority(cData.priority || 'medium')
      setAdminDeptId(cData.department_id ? String(cData.department_id) : '')
      setAdminOfficerId(cData.officer_id ? String(cData.officer_id) : '')

      fetchTeamAndRequests();
      return cData
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.errors?.[0]?.msg || 'Complaint details could not be retrieved.'
      setError(errMsg)
      throw err
    }
  }, [id, fetchTeamAndRequests])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    Promise.allSettled([
      fetchComplaintDetails(),
      complaintsApi.getSimilar(id)
    ]).then(([_, sRes]) => {
      if (!mounted) return
      if (sRes.status === 'fulfilled') {
        const similarData = sRes.value
        setSimilar(Array.isArray(similarData) ? similarData : (similarData?.items || []))
      }
    }).finally(() => { if (mounted) setLoading(false) })
    
    return () => { mounted = false }
  }, [id, fetchComplaintDetails])

  useEffect(() => {
    if (user && user.role === 'admin') {
      adminApi.listDepartments().then((res) => setDepartments(Array.isArray(res) ? res : (res?.items || []))).catch(() => {})
      adminApi.listOfficers().then((res) => setOfficers(Array.isArray(res) ? res : (res?.items || []))).catch(() => {})
    }
  }, [user])

  // Primary vs cross-department available officers based on selected department
  const primaryOfficers = useMemo(() => {
    if (!adminDeptId) return officers
    return officers.filter(o => o.isDeptMatch || String(o.department_id) === String(adminDeptId))
  }, [officers, adminDeptId])

  const otherOfficers = useMemo(() => {
    if (!adminDeptId) return []
    return officers.filter(o => !o.isDeptMatch && String(o.department_id) !== String(adminDeptId))
  }, [officers, adminDeptId])

  // Handle department dropdown change
  const handleDepartmentChange = (newDeptId) => {
    setAdminDeptId(newDeptId)
    if (newDeptId && adminOfficerId) {
      const matching = officers.find(o => String(o.id) === String(adminOfficerId))
      if (matching && String(matching.department_id) !== String(newDeptId)) {
        setAdminOfficerId('')
      }
    }
  }

  // Lightbox keyboard navigation
  useEffect(() => {
    if (!isLightboxOpen || !complaint?.images?.length) return

    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsLightboxOpen(false)
      else if (e.key === 'ArrowRight') {
        setActiveImgIndex((prev) => (prev === complaint.images.length - 1 ? 0 : prev + 1))
      } else if (e.key === 'ArrowLeft') {
        setActiveImgIndex((prev) => (prev === 0 ? complaint.images.length - 1 : prev - 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLightboxOpen, complaint])

  const formattedId = complaint ? `CGN-${String(complaint.id).padStart(5, '0')}` : ''

  // Valid next status options based on current complaint status
  const availableOfficerNextStatuses = useMemo(() => {
    if (!complaint) return []
    return VALID_TRANSITIONS[complaint.status] || []
  }, [complaint])

  // Citizen Resolution Verification Loop
  async function handleVerify(verifiedStatus) {
    setUpdating(true)
    try {
      const isSatisfied = verifiedStatus === 'closed'
      const updated = await complaintsApi.verifyResolution(complaint.id, isSatisfied, {
        note: feedbackNote || (isSatisfied ? 'Citizen confirmed resolution.' : 'Citizen requested reopening.'),
        reason: feedbackNote || ''
      })
      setComplaint(updated)
      if (isSatisfied) {
        toast.success('Resolution confirmed! You earned +5 Civic Contribution Points.')
      } else {
        toast.success('Complaint reopened and routed back to operations for review.')
      }
      setFeedbackNote('')
      await fetchComplaintDetails()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit resolution verification')
    } finally {
      setUpdating(false)
    }
  }

  async function handleReportComment(commentId) {
    const reason = window.prompt('Please enter the reason for reporting this comment:')
    if (!reason || !reason.trim()) return
    try {
      await complaintsApi.reportComment(commentId, reason.trim())
      toast.success('Comment reported for moderation review.')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to report comment.')
    }
  }

  // Officer Action Handlers
  async function handleOfficerAccept() {
    setUpdating(true)
    try {
      await officerApi.acceptComplaint(complaint.id)
      toast.success('Assignment accepted.')
      await fetchComplaintDetails()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to accept assignment.')
    } finally {
      setUpdating(false)
    }
  }

  async function handleOfficerStartWork() {
    setUpdating(true)
    try {
      await officerApi.startWork(complaint.id)
      toast.success('Work started on assignment.')
      await fetchComplaintDetails()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to start work.')
    } finally {
      setUpdating(false)
    }
  }

  async function handleOfficerDecline(e) {
    e.preventDefault()
    if (!declineReason.trim()) {
      toast.error('Decline reason is required')
      return
    }
    setUpdating(true)
    try {
      await officerApi.declineAssignment(complaint.id, declineReason)
      toast.success('Assignment declined.')
      setShowDeclineModal(false)
      setDeclineReason('')
      navigate('/officer')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to decline assignment.')
    } finally {
      setUpdating(false)
    }
  }

  async function handleCreateResourceRequest(e) {
    e.preventDefault()
    if (!reqReason.trim()) {
      toast.error('Please provide a justification for this resource request.')
      return
    }
    setSubmittingResourceReq(true)
    try {
      await officerApi.createResourceRequest(complaint.id, {
        requestType: reqType,
        requiredPeople: parseInt(reqPeople, 10) || 1,
        requiredSkills: reqSkills ? reqSkills.trim() : null,
        equipment: reqEquipment ? reqEquipment.trim() : null,
        priority: reqPriority,
        reason: reqReason.trim()
      })
      toast.success('Resource request submitted for administrative review.')
      setShowResourceModal(false)
      setReqReason('')
      setReqSkills('')
      setReqEquipment('')
      fetchTeamAndRequests()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit resource request.')
    } finally {
      setSubmittingResourceReq(false)
    }
  }

  async function handleConfirmOfficerResolve(e) {
    e.preventDefault()
    if (!feedbackNote.trim()) {
      toast.error('Resolution note/summary is required')
      return
    }

    if (resolutionFile) {
      const allowedExts = ['pdf', 'jpg', 'jpeg', 'png']
      const ext = resolutionFile.name.split('.').pop().toLowerCase()
      if (!allowedExts.includes(ext)) {
        toast.error('Only PDF, JPG, JPEG, and PNG files are allowed.')
        return
      }
      if (resolutionFile.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds the 10 MB limit.')
        return
      }
    }

    setUpdating(true)
    try {
      const fd = new FormData()
      fd.append('status', 'resolved')
      fd.append('note', feedbackNote)
      if (resolutionFile) {
        fd.append('image', resolutionFile)
      }
      const updated = await complaintsApi.changeStatus(complaint.id, fd)
      setComplaint(updated)
      toast.success('Complaint marked as resolved.')
      setFeedbackNote('')
      setResolutionFile(null)
      setShowResolveModal(false)
      await fetchComplaintDetails()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to resolve complaint.')
    } finally {
      setUpdating(false)
    }
  }

  async function handleOfficerStatusUpdate(e) {
    e.preventDefault()
    if (!officerStatus) return
    if (officerStatus === 'resolved') {
      setShowResolveModal(true)
      return
    }
    setUpdating(true)
    try {
      const fd = new FormData()
      fd.append('status', officerStatus)
      fd.append('note', feedbackNote || `Status updated to ${officerStatus.replace('_', ' ')}`)
      if (resolutionFile) {
        fd.append('image', resolutionFile)
      }
      const updated = await complaintsApi.changeStatus(complaint.id, fd)
      setComplaint(updated)
      toast.success('Complaint status updated successfully.')
      setFeedbackNote('')
      setResolutionFile(null)
      await fetchComplaintDetails()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update complaint status.')
    } finally {
      setUpdating(false)
    }
  }

  // Operational Notes state
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [noteIsInternal, setNoteIsInternal] = useState(true)

  const loadNotes = useCallback(async () => {
    if (!user) return
    try {
      const res = await officerApi.getNotes(id)
      setNotes(res || [])
    } catch (e) {
      console.error('Failed to load notes', e)
    }
  }, [id, user])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  async function handleAddNote(e) {
    e.preventDefault()
    if (!newNote.trim()) return
    try {
      await officerApi.addNote(id, { note: newNote, isInternal: noteIsInternal })
      setNewNote('')
      toast.success('Note added successfully.')
      loadNotes()
    } catch (err) {
      toast.error('Failed to add note.')
    }
  }

  // Admin Case Assignment Handler
  async function handleAdminAssignClick() {
    // Prevent duplicate assignment if assignment parameters match existing state
    if (String(complaint.department_id || '') === String(adminDeptId || '') &&
        String(complaint.officer_id || '') === String(adminOfficerId || '')) {
      toast.success('Case is already assigned to this officer & department.')
      return
    }

    if (complaint.officer_id && String(complaint.officer_id) !== String(adminOfficerId)) {
      setShowReassignModal(true)
    } else {
      executeAdminAssignment()
    }
  }

  async function executeAdminAssignment() {
    setUpdating(true)
    try {
      const payload = {
        complaintId: complaint.id,
        departmentId: adminDeptId ? parseInt(adminDeptId, 10) : null,
        officerId: adminOfficerId ? parseInt(adminOfficerId, 10) : null
      }
      await adminApi.assignComplaint(payload.complaintId, payload.officerId, payload.departmentId)
      toast.success('Case assignment updated successfully.')
      setShowReassignModal(false)
      await fetchComplaintDetails()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not update case assignment.')
    } finally {
      setUpdating(false)
    }
  }

  // Admin Status & Priority Save Handler
  async function handleAdminSaveStatusAndPriority() {
    if (adminStatus === complaint.status && adminPriority === complaint.priority) {
      toast.success('No changes made to status or priority.')
      return
    }

    setUpdating(true)
    try {
      if (adminStatus !== complaint.status) {
        const fd = new FormData()
        fd.append('status', adminStatus)
        fd.append('note', `Administrative status override to ${adminStatus}`)
        await complaintsApi.changeStatus(complaint.id, fd)
      }
      if (adminPriority !== complaint.priority) {
        await adminApi.updateAdminComplaint(complaint.id, { priority: adminPriority })
      }
      toast.success('Status & Priority updated.')
      await fetchComplaintDetails()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not update status & priority.')
    } finally {
      setUpdating(false)
    }
  }

  // Community Support Voting Handler
  const handleToggleVote = async () => {
    if (!user) {
      toast.error('Please login to support this complaint')
      return
    }
    try {
      const res = await complaintsApi.toggleVote(complaint.id)
      setVotes({ count: res.count, hasVoted: res.hasVoted })
      toast.success(res.hasVoted ? 'You supported this complaint' : 'Removed support')
    } catch (e) {
      toast.error('Could not update support vote')
    }
  }

  // Follow Updates Handler
  const handleToggleFollow = async () => {
    if (!user) {
      toast.error('Please login to follow this complaint')
      return
    }
    try {
      const res = await complaintsApi.toggleFollow(complaint.id)
      setFollow({ count: res.count, isFollowing: res.isFollowing })
      toast.success(res.isFollowing ? 'Following complaint updates' : 'Unfollowed complaint')
    } catch (e) {
      toast.error('Could not update follow status')
    }
  }

  // Citizen Public Comment Handler
  const handleAddCitizenComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setSubmittingComment(true)
    try {
      const commentObj = await complaintsApi.addComment(complaint.id, newComment.trim(), isCommentAnon)
      setComments(prev => [...prev, commentObj])
      setNewComment('')
      toast.success('Comment posted successfully')
    } catch (e) {
      toast.error('Failed to post comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  // Citizen Additional Photo Evidence Upload Handler
  const handleUploadEvidence = async (e) => {
    e.preventDefault()
    if (!evidenceFiles.length) return
    setUploadingEvidence(true)
    try {
      const fd = new FormData()
      evidenceFiles.forEach(f => fd.append('images', f))
      await complaintsApi.addEvidence(complaint.id, fd)
      toast.success('Evidence photos uploaded successfully')
      setShowEvidenceModal(false)
      setEvidenceFiles([])
      await fetchComplaintDetails()
    } catch (e) {
      toast.error('Failed to upload evidence')
    } finally {
      setUploadingEvidence(false)
    }
  }

  // SLA calculations
  const slaStatus = useMemo(() => {
    if (!complaint) return null
    return getSlaStatus(complaint.sla_due_at, complaint.status)
  }, [complaint])

  const slaProgressPercent = useMemo(() => {
    if (!complaint || !complaint.sla_due_at || !complaint.created_at) return 0
    const total = new Date(complaint.sla_due_at).getTime() - new Date(complaint.created_at).getTime()
    const elapsed = Date.now() - new Date(complaint.created_at).getTime()
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }, [complaint])

  const aiRecord = complaint?.ai && complaint.ai.length > 0 ? complaint.ai[0] : null
  const aiAnalysis = aiRecord ? (typeof aiRecord.analysis === 'string' ? JSON.parse(aiRecord.analysis) : aiRecord.analysis) : null

  // Lookup target officer name for reassignment modal
  const targetOfficer = useMemo(() => {
    return officers.find(o => String(o.id) === String(adminOfficerId))
  }, [officers, adminOfficerId])

  const targetDept = useMemo(() => {
    return departments.find(d => String(d.id) === String(adminDeptId))
  }, [departments, adminDeptId])

  return (
    <AppShell title={complaint ? `Case File #${formattedId}` : 'Complaint File'}>
      {/* Top Breadcrumb Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <Link to="/complaints" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Operations Queue
        </Link>
        {complaint && (
          <span className="text-xs font-mono font-bold text-slate-400">
            RECORD #{formattedId}
          </span>
        )}
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Skeleton className="h-96 rounded-xl lg:col-span-2" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      )}

      {error && !loading && (
        <ErrorState
          title="Unable to load complaint details"
          message={error}
          onRetry={fetchComplaintDetails}
        />
      )}

      {complaint && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Header Card */}
          <div className="card overflow-hidden border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <div className="p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      #{formattedId}
                    </span>
                    <StatusBadge status={complaint.status} />
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold capitalize text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {complaint.category}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-bold capitalize text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                      Priority: {complaint.priority || 'medium'}
                    </span>
                  </div>

                  <h1 className="mt-3 text-xl font-black text-slate-900 dark:text-white md:text-2xl tracking-tight">
                    {complaint.title}
                  </h1>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      Reported: {formatDate(complaint.created_at)}
                    </span>
                    {complaint.address && (
                      <span className="flex items-center gap-1.5 truncate max-w-md">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        {complaint.address}
                      </span>
                    )}
                  </div>
                </div>

                {/* AI Assistant Context Trigger */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setAiChatOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs px-4 py-2.5 shadow-md hover:shadow-lg transition-all active:scale-95"
                  >
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <span>Ask AI About Case</span>
                  </button>
                </div>
              </div>

              {/* SLA Target Banner */}
              {slaStatus && (
                <div className={`mt-5 rounded-xl p-3.5 border ${slaStatus.color} flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner`}>
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-5 w-5 shrink-0" />
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wide">
                        SLA Status: {slaStatus.label}
                      </div>
                      <div className="text-[11px] font-medium opacity-90">
                        {formatSlaCountdown(complaint.sla_due_at, complaint.status)} · Target: {formatDate(complaint.sla_due_at)}
                      </div>
                    </div>
                  </div>

                  {complaint.status !== 'resolved' && complaint.status !== 'closed' && (
                    <div className="w-full sm:w-48 shrink-0">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            slaStatus.isBreached ? 'bg-red-600' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${slaProgressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Community Engagement & Citizen Actions Bar */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Upvote / Community Support */}
                  <button
                    type="button"
                    onClick={handleToggleVote}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                      votes.hasVoted
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20'
                        : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    <ThumbsUp className={`h-4 w-4 ${votes.hasVoted ? 'fill-white' : ''}`} />
                    <span>{votes.hasVoted ? 'Supported' : 'Support Issue'}</span>
                    <span className="ml-1 rounded-md bg-black/15 px-1.5 py-0.5 text-[10px] font-black">
                      {votes.count}
                    </span>
                  </button>

                  {/* Follow Updates */}
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                      follow.isFollowing
                        ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/20'
                        : 'bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${follow.isFollowing ? 'fill-white' : ''}`} />
                    <span>{follow.isFollowing ? 'Following' : 'Follow Updates'}</span>
                  </button>

                  {/* Add Photo Evidence (for Citizen Owner or Officer/Admin) */}
                  {user && (user.role === 'admin' || user.role === 'officer' || user.id === complaint.user_id) && (
                    <button
                      type="button"
                      onClick={() => setShowEvidenceModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                    >
                      <UploadCloud className="h-4 w-4 text-emerald-600" />
                      <span>Add Photos</span>
                    </button>
                  )}
                </div>

                <div className="text-xs font-medium text-slate-400">
                  {complaint.is_anonymous ? '🔒 Anonymous Citizen Report' : `👤 Filed by ${complaint.owner?.name || 'Citizen'}`}
                </div>
              </div>
            </div>
          </div>

          {/* Main 2-Column Content Layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            
            {/* Left Column: Complaint Details, Images, Location, Notes */}
            <div className="space-y-6 lg:col-span-2">
              
              {/* Description Card */}
              <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-500" /> Issue Description
                </h3>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line font-normal">
                  {complaint.description || 'No detailed description provided.'}
                </p>

                {/* Evidence Photo Gallery */}
                {complaint.images && complaint.images.length > 0 && (
                  <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-5">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-slate-400" /> Photo Evidence ({complaint.images.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {complaint.images.map((img, idx) => (
                        <div
                          key={img.id || idx}
                          onClick={() => {
                            setActiveImgIndex(idx)
                            setIsLightboxOpen(true)
                          }}
                          className="group relative h-28 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-sm hover:shadow-md transition-all"
                        >
                          <img
                            src={resolveImageUrl(img.url)}
                            alt={`Evidence photo ${idx + 1}`}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          {img.metadata?.resolution && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold shadow">
                              Resolution Proof
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Location Map Card */}
              {complaint.lat && complaint.lng && (
                <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-500" /> Geographic Location
                  </h3>
                  <MapPreview
                    lat={complaint.lat}
                    lng={complaint.lng}
                    status={complaint.status}
                    priority={complaint.priority}
                    address={complaint.address}
                  />
                </div>
              )}

              {/* Case History Timeline */}
              <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-500" /> Authoritative Case History Timeline
                </h3>
                <Timeline complaintId={complaint.id} />
              </div>

              {/* Operational Case Notes */}
              {(user?.role === 'officer' || user?.role === 'admin') && (
                <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-emerald-500" /> Operational Case Notes
                  </h3>

                  <form onSubmit={handleAddNote} className="space-y-3">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add an operational note or progress record..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      rows={2.5}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={noteIsInternal}
                          onChange={(e) => setNoteIsInternal(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Internal Note (Hidden from citizen)</span>
                      </label>
                      <Button type="submit" disabled={!newNote.trim()} className="bg-slate-800 hover:bg-slate-900 text-white text-xs py-2 px-4 font-bold">
                        Add Note
                      </Button>
                    </div>
                  </form>

                  {notes.length > 0 ? (
                    <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {notes.map((n) => (
                        <div key={n.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                            <span>{n.author_name || 'Officer'}</span>
                            <div className="flex items-center gap-2">
                              {n.is_internal && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">Internal</span>}
                              <span>{formatDate(n.created_at)}</span>
                            </div>
                          </div>
                          <p className="text-slate-700 dark:text-slate-200">{n.note}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-2">No operational notes recorded yet.</p>
                  )}
                </div>
              )}

              {/* Community Comments & Public Updates Thread */}
              <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-emerald-500" /> Community Updates &amp; Comments ({comments.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">Public thread</span>
                </div>

                {/* Comment Submission Form */}
                <form onSubmit={handleAddCitizenComment} className="space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Leave a helpful comment, location update, or question regarding this issue..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    rows={2.5}
                    required
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCommentAnon}
                        onChange={(e) => setIsCommentAnon(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Post anonymously</span>
                    </label>
                    <Button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 px-4 font-bold flex items-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {submittingComment ? 'Posting…' : 'Post Comment'}
                    </Button>
                  </div>
                </form>

                {/* Comments List */}
                {comments.length > 0 ? (
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {comments.map((cm) => (
                      <div key={cm.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {cm.user_name || 'Citizen'}
                            </span>
                            {cm.user_role && cm.user_role !== 'citizen' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                {cm.user_role}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">{formatDate(cm.created_at)}</span>
                            {user && (
                              <button
                                type="button"
                                onClick={() => handleReportComment(cm.id)}
                                title="Report inappropriate comment"
                                className="text-[10px] text-slate-400 hover:text-rose-600 transition-colors"
                              >
                                Flag
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-slate-700 dark:text-slate-200 mt-1 whitespace-pre-wrap leading-relaxed">{cm.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-3">No comments posted yet. Be the first to share an update.</p>
                )}
              </div>

            </div>

            {/* Right Column: Dedicated Role Action Panels */}
            <div className="space-y-6">

              {/* ADMIN ACTION PANEL */}
              {user && user.role === 'admin' && (
                <div className="space-y-6">
                  
                  {/* Dedicated CASE ASSIGNMENT Panel */}
                  <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-emerald-600" /> Case Assignment
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Route issue to responsible department & officer</p>
                    </div>

                    {/* Current Assignment Status Banner */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Assignment</div>
                      {complaint.officer_name ? (
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <User className="h-4 w-4 text-emerald-500" />
                            {complaint.officer_name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Department: <span className="font-semibold text-slate-700 dark:text-slate-200">{complaint.department_name || 'General Municipal'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4" /> Unassigned
                        </div>
                      )}
                    </div>

                    {/* Department Dropdown */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Department</label>
                      <select
                        value={adminDeptId}
                        onChange={(e) => handleDepartmentChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 shadow-sm"
                      >
                        <option value="">— Unassigned Department —</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Assigned Officer Dropdown */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Assigned Officer</label>
                      <select
                        value={adminOfficerId}
                        onChange={(e) => {
                          const newOffId = e.target.value;
                          setAdminOfficerId(newOffId);
                          if (newOffId) {
                            const selected = officers.find(o => String(o.id) === String(newOffId));
                            if (selected && selected.department_id && String(selected.department_id) !== String(adminDeptId)) {
                              setAdminDeptId(String(selected.department_id));
                            }
                          }
                        }}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 shadow-sm"
                      >
                        <option value="">— Unassigned Officer —</option>
                        {primaryOfficers.length > 0 && (
                          <optgroup label="🎯 Primary Department Officers">
                            {primaryOfficers.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.name} — {o.designation || 'Officer'} ({o.availability || 'AVAILABLE'} · {o.currentWorkload || 0} active)
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {otherOfficers.length > 0 && (
                          <optgroup label="🌐 Available Officers (Cross-Department)">
                            {otherOfficers.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.name} — {o.department_name || 'Officer'} ({o.availability || 'AVAILABLE'})
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    {/* Assign Action Button */}
                    <Button
                      onClick={handleAdminAssignClick}
                      disabled={updating}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs shadow-md transition-all active:scale-95"
                    >
                      {updating ? 'Assigning Case…' : complaint.officer_id ? 'Reassign Case' : 'Assign Case'}
                    </Button>
                  </div>

                  {/* Dedicated CASE STATUS & PRIORITY Panel */}
                  <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="h-4 w-4 text-emerald-600" /> Case Status & Priority
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Admin operational status overrides</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Status</label>
                      <select
                        value={adminStatus}
                        onChange={(e) => setAdminStatus(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value={complaint.status}>Current: {complaint.status.replace('_', ' ')}</option>
                        {(VALID_TRANSITIONS[complaint.status] || []).map(st => (
                          <option key={st} value={st}>{st.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Operational Priority</label>
                      <select
                        value={adminPriority}
                        onChange={(e) => setAdminPriority(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    <Button
                      onClick={handleAdminSaveStatusAndPriority}
                      disabled={updating}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 text-xs"
                    >
                      {updating ? 'Updating…' : 'Save Status & Priority'}
                    </Button>
                  </div>

                </div>
              )}

              {/* OFFICER ACTION PANEL */}
              {user && user.role === 'officer' && (
                <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-600" /> Case Status
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Update field work & submit evidence</p>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Current Status Display */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Current Status:</span>
                      <StatusBadge status={complaint.status} />
                    </div>

                    {/* DYNAMIC LOGICAL STATE CONTROLS */}
                    {/* DYNAMIC LOGICAL STATE CONTROLS */}
                    {complaint.status === 'closed' ? (
                      /* CASE IS CLOSED: OFFER ONLY REOPEN ACTION */
                      <div className="space-y-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700 text-center">
                        <CheckCircle2 className="h-6 w-6 mx-auto text-slate-500" />
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Complaint Closed</h4>
                        <p className="text-[11px] text-slate-400">
                          This case file has been verified and closed.
                        </p>
                        <Button
                          onClick={() => handleVerify('reopened')}
                          disabled={updating}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 text-xs shadow"
                        >
                          {updating ? 'Reopening…' : 'Reopen Complaint File'}
                        </Button>
                      </div>
                    ) : complaint.status === 'resolved' ? (
                      /* CASE IS RESOLVED: AWAITING CITIZEN VERIFICATION */
                      <div className="space-y-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 p-4 border border-emerald-200 dark:border-emerald-800/40 text-center">
                        <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-600" />
                        <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Resolution Submitted</h4>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Field work marked complete. Awaiting citizen verification or closure.
                        </p>
                        <Button
                          onClick={() => handleVerify('closed')}
                          disabled={updating}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs shadow"
                        >
                          {updating ? 'Closing…' : 'Close Complaint'}
                        </Button>
                      </div>
                    ) : complaint.status === 'assigned' ? (
                      /* CASE IS ASSIGNED: ACCEPT OR DECLINE */
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 leading-relaxed font-semibold">
                          You have been assigned this complaint. Please accept assignment to proceed.
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleOfficerAccept}
                            disabled={updating}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs"
                          >
                            {updating ? 'Accepting…' : 'Accept'}
                          </Button>
                          <Button
                            onClick={() => setShowDeclineModal(true)}
                            disabled={updating}
                            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 text-xs"
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    ) : complaint.status === 'accepted' ? (
                      /* CASE IS ACCEPTED: START WORK OR DECLINE */
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-200 leading-relaxed font-semibold">
                          You have accepted this assignment. Click start work to begin resolution.
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleOfficerStartWork}
                            disabled={updating}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs"
                          >
                            {updating ? 'Starting…' : 'Start Work'}
                          </Button>
                          <Button
                            onClick={() => setShowDeclineModal(true)}
                            disabled={updating}
                            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 text-xs"
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* CASE IS IN_PROGRESS / REOPENED: RESOLVE COMPLAINT & RESOURCE CONTROLS */
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-semibold">
                          This assignment is currently in progress. Complete task to resolve it.
                        </div>

                        {/* SUPPORT TEAM SUMMARY */}
                        {supportTeam && (
                          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs space-y-1.5">
                            <div className="flex items-center justify-between font-bold text-indigo-950 dark:text-indigo-200">
                              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-indigo-600" /> {supportTeam.team_name}</span>
                              <span className="text-[10px] bg-indigo-200 dark:bg-indigo-900 px-1.5 py-0.2 rounded font-extrabold">Active</span>
                            </div>
                            <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                              Leader: <strong>{supportTeam.leader_name || 'Assigned Officer'}</strong> · Crew: {supportTeam.members?.length || 0} members
                            </p>
                            {supportTeam.members && supportTeam.members.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {supportTeam.members.map((m, idx) => (
                                  <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-slate-700 dark:text-slate-300 font-semibold">
                                    👤 {m.member_name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* RESOURCE REQUESTS STATUS */}
                        {resourceRequests.length > 0 && (
                          <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs space-y-1.5">
                            <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between">
                              <span>Resource Requests ({resourceRequests.length})</span>
                            </div>
                            {resourceRequests.map((r) => (
                              <div key={r.id} className="text-[11px] flex items-center justify-between border-t border-amber-200/50 pt-1 text-slate-700 dark:text-slate-300">
                                <span>{r.request_type} ({r.required_people} people)</span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase ${
                                  r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                  r.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                                  'bg-amber-200 text-amber-900'
                                }`}>{r.status}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <Button
                          onClick={() => setShowResolveModal(true)}
                          disabled={updating}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs shadow-sm"
                        >
                          Mark Case Resolved
                        </Button>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowResourceModal(true)}
                            className="w-full rounded-xl border border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300 font-bold py-2 text-2xs transition-colors text-center"
                          >
                            + Request Crew
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowEvidenceModal(true)}
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold py-2 text-2xs transition-colors text-center"
                          >
                            + Add Photos
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* CITIZEN RESOLUTION VERIFICATION */}
              {user && user.role === 'citizen' && complaint.user_id === user.id && (
                <div className="card bg-white p-6 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  {complaint.status === 'resolved' ? (
                    <div className="space-y-4 rounded-xl bg-emerald-50/80 p-4 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40">
                      <div className="flex items-start gap-2.5 text-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider">✓ Complaint Resolved</h4>
                          <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed font-medium">
                            Work has been completed by the municipal team.
                          </p>
                          <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 mt-1">
                            Resolved: {formatDate(complaint.resolution_at || complaint.updated_at)}
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                            ⏰ Auto-closes in 24 hours if unconfirmed
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
                        <label className="block text-2xs font-bold uppercase text-slate-600 dark:text-slate-400">
                          Verification Feedback / Reopen Reason
                        </label>
                        <textarea
                          value={feedbackNote}
                          onChange={(e) => setFeedbackNote(e.target.value)}
                          placeholder="Add confirmation notes or specify why the issue requires reopening..."
                          className="w-full rounded-xl border border-emerald-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          rows={2.5}
                        />
                      </div>

                      <div className="flex flex-col gap-2 pt-1">
                        <Button
                          onClick={() => handleVerify('closed')}
                          disabled={updating}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs flex justify-center items-center gap-1.5 shadow-sm"
                        >
                          ✓ Confirm Resolution
                        </Button>
                        <button
                          onClick={() => {
                            if (!feedbackNote.trim()) {
                              toast.error('Please enter a reason for reopening the complaint.');
                              return;
                            }
                            handleVerify('reopened');
                          }}
                          disabled={updating}
                          className="w-full rounded-xl border border-purple-500 bg-transparent text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20 font-bold py-2 text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          ↻ Reopen Complaint
                        </button>
                      </div>
                    </div>
                  ) : complaint.status === 'closed' ? (
                    <div className="text-center p-4 bg-slate-900 text-white dark:bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <CheckCheck className="h-6 w-6 mx-auto text-emerald-400" />
                      <h4 className="text-xs font-bold">✓ Complaint Closed</h4>
                      <p className="text-[11px] text-slate-300">
                        Resolution confirmed & case file officially closed.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                      <Clock className="h-8 w-8 mx-auto text-slate-400 stroke-[1.5]" />
                      <h4 className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">Under Department Processing</h4>
                      <p className="mt-1 text-[11px] text-slate-400 leading-normal">
                        This complaint is undergoing active municipal workflow and will be routed for resolution.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* AI Analysis Summary Card */}
              <div className="card overflow-hidden border-indigo-200/50 dark:border-indigo-900/40 bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 px-5 py-4 dark:border-slate-800 dark:from-slate-800/30 dark:to-slate-800/10">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Intelligence Metrics</h3>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Groq Classification Engine</p>
                  </div>
                </div>

                <div className="p-5 space-y-3.5 text-xs">
                  {aiRecord ? (
                    <>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category Classification</span>
                        <div className="text-xs font-bold capitalize text-slate-800 dark:text-slate-100 mt-0.5">
                          {aiAnalysis?.category || complaint.category || '—'}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Escalation Severity</span>
                        <div className="text-xs font-bold capitalize text-slate-800 dark:text-slate-100 mt-0.5">
                          {aiAnalysis?.severity || '—'}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Suggested Priority</span>
                        <div className="text-xs font-bold capitalize text-slate-800 dark:text-slate-100 mt-0.5">
                          {aiAnalysis?.priority || '—'}
                        </div>
                      </div>

                      {aiRecord.confidence != null && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-400">Model Confidence</span>
                            <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{Math.round(aiRecord.confidence * 100)}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                              style={{ width: `${Math.min(100, aiRecord.confidence * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4 text-slate-400">
                      <Sparkles className="h-5 w-5 mx-auto mb-1 text-slate-400" />
                      <span className="font-bold text-xs">AI analysis loaded</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* ADMIN REASSIGNMENT CONFIRMATION MODAL */}
          <AnimatePresence>
            {showReassignModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" /> Reassign Complaint?
                    </h3>
                    <button onClick={() => setShowReassignModal(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <p className="text-slate-600 dark:text-slate-300">
                      Reassigning complaint <span className="font-extrabold text-emerald-600">#{formattedId}</span> will update case ownership and notify the involved officers.
                    </p>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">Current Officer:</span>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{complaint.officer_name || 'Unassigned'}</div>
                      </div>
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-2">
                        <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">New Officer Assignment:</span>
                        <div className="font-bold text-emerald-700 dark:text-emerald-300">
                          {targetOfficer ? `${targetOfficer.name} · ${targetDept ? targetDept.name : 'Department'}` : 'Unassigned'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setShowReassignModal(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <Button
                      onClick={executeAdminAssignment}
                      disabled={updating}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs"
                    >
                      {updating ? 'Confirming…' : 'Confirm Reassignment'}
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* OFFICER RESOLUTION CONFIRMATION MODAL */}
          <AnimatePresence>
            {showResolveModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Mark Complaint as Resolved
                    </h3>
                    <button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleConfirmOfficerResolve} className="space-y-4">
                    <p className="text-xs text-slate-605 dark:text-slate-300 leading-relaxed">
                      Confirming resolution for complaint <span className="font-extrabold text-emerald-600">#{formattedId}</span>. Add resolution summary notes and optional proof of completed work.
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-slate-705 dark:text-slate-350 mb-1">Resolution Summary Note *</label>
                      <textarea
                        value={feedbackNote}
                        onChange={(e) => setFeedbackNote(e.target.value)}
                        placeholder="Describe physical work completed to resolve this complaint..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 dark:border-slate-750 dark:bg-slate-950 dark:text-white"
                        rows={3}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-705 dark:text-slate-350 mb-1">Resolution Evidence Photo (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setResolutionFile(e.target.files[0] || null)}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-750 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-200"
                      />
                      {resolutionFile && (
                        <div className="mt-1.5 text-[10px] text-emerald-650 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {resolutionFile.name} ({(resolutionFile.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowResolveModal(false)}
                        className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <Button
                        type="submit"
                        disabled={updating}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs shadow-sm"
                      >
                        {updating ? 'Submitting…' : 'Confirm Resolution'}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* OFFICER DECLINE CONFIRMATION MODAL */}
          <AnimatePresence>
            {showDeclineModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-rose-500" /> Decline Assignment?
                    </h3>
                    <button onClick={() => setShowDeclineModal(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleOfficerDecline} className="space-y-4">
                    <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
                      Please state the reason for declining this assignment. Declining will return the complaint to the unassigned pool and notify administrators.
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-slate-755 dark:text-slate-350 mb-1">Reason for Decline *</label>
                      <textarea
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder="e.g. Issue lies outside my geographic ward boundary..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 dark:border-slate-750 dark:bg-slate-950 dark:text-white"
                        rows={3}
                        required
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowDeclineModal(false)}
                        className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <Button
                        type="submit"
                        disabled={updating}
                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 text-xs shadow-sm"
                      >
                        {updating ? 'Declining…' : 'Decline Assignment'}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* OFFICER REQUEST TEAM / RESOURCES MODAL */}
          <AnimatePresence>
            {showResourceModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-600" /> Request Support Team / Resources
                    </h3>
                    <button onClick={() => setShowResourceModal(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateResourceRequest} className="space-y-3.5 text-xs">
                    <p className="text-slate-600 dark:text-slate-400 font-medium">
                      Submit a formal request for auxiliary workforce or specialized equipment to resolve this complaint.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Request Type</label>
                        <select
                          value={reqType}
                          onChange={(e) => setReqType(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="TEAM">Support Crew</option>
                          <option value="SPECIALIST">Specialist Officer</option>
                          <option value="EQUIPMENT">Heavy Equipment</option>
                          <option value="ESCALATION">Inter-Dept Taskforce</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">People Required</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={reqPeople}
                          onChange={(e) => setReqPeople(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Required Skills / Roles</label>
                      <input
                        type="text"
                        value={reqSkills}
                        onChange={(e) => setReqSkills(e.target.value)}
                        placeholder="e.g. Asphalt paving, drainage excavation"
                        className="w-full rounded-xl border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Justification & Scope *</label>
                      <textarea
                        value={reqReason}
                        onChange={(e) => setReqReason(e.target.value)}
                        placeholder="Explain why extra workforce or specialized tools are necessary..."
                        rows={3}
                        required
                        className="w-full rounded-xl border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowResourceModal(false)}
                        className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <Button
                        type="submit"
                        disabled={submittingResourceReq}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 text-xs shadow-sm"
                      >
                        {submittingResourceReq ? 'Submitting…' : 'Submit Request'}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CITIZEN / USER ADDITIONAL EVIDENCE UPLOAD MODAL */}
          <AnimatePresence>
            {showEvidenceModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <UploadCloud className="h-5 w-5 text-emerald-600" /> Add Photo Evidence
                    </h3>
                    <button onClick={() => setShowEvidenceModal(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleUploadEvidence} className="space-y-4">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Upload additional photos for complaint <span className="font-extrabold text-emerald-600">#{formattedId}</span> to provide extra context to field officers.
                    </p>

                    <div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []))}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-950/50 dark:file:text-emerald-300 cursor-pointer"
                        required
                      />
                    </div>

                    {evidenceFiles.length > 0 && (
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {evidenceFiles.length} file(s) selected
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowEvidenceModal(false)
                          setEvidenceFiles([])
                        }}
                        className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <Button
                        type="submit"
                        disabled={uploadingEvidence || !evidenceFiles.length}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs shadow-sm"
                      >
                        {uploadingEvidence ? 'Uploading…' : 'Upload Evidence'}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lightbox Evidence Modal */}
          <AnimatePresence>
            {isLightboxOpen && complaint.images && complaint.images.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/95 p-4 backdrop-blur-sm"
                onClick={() => setIsLightboxOpen(false)}
              >
                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
                >
                  <X className="h-6 w-6" />
                </button>

                {complaint.images.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveImgIndex((prev) => (prev === 0 ? complaint.images.length - 1 : prev - 1))
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </button>
                )}

                <img
                  src={resolveImageUrl(complaint.images[activeImgIndex].url)}
                  alt="Evidence Lightbox inspect"
                  className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl select-none"
                  onClick={(e) => e.stopPropagation()}
                />

                {complaint.images.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveImgIndex((prev) => (prev === complaint.images.length - 1 ? 0 : prev + 1))
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
                  >
                    <ChevronRight className="h-8 w-8" />
                  </button>
                )}

                <div className="absolute bottom-6 text-center text-white/80 text-xs bg-slate-900/60 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <div className="font-semibold">Photo Evidence {activeImgIndex + 1} of {complaint.images.length}</div>
                  <div className="text-[10px] text-white/50 mt-0.5">Press ESC to exit · Arrow keys to navigate</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      )}

      {/* Contextual AI Assistant Drawer */}
      {aiChatOpen && complaint && (
        <AIChatPanel
          persona={user?.role || 'citizen'}
          title={`AI Assistant — CGN-${String(complaint.id).padStart(5, '0')}`}
          subtitle="Scoped complaint analysis & SLA advice"
          accentColor={user?.role === 'admin' ? 'indigo' : user?.role === 'officer' ? 'brand' : 'emerald'}
          complaintId={complaint.id}
          isOpen={aiChatOpen}
          onClose={() => setAiChatOpen(false)}
        />
      )}
    </AppShell>
  )
}
