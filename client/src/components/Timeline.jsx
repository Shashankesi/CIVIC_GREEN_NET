import React, { useEffect, useState, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, XCircle, Sparkles, User, CornerDownRight, ImagePlus, Loader2 } from 'lucide-react'
import complaintsApi from '../services/complaints'
import AuthContext from '../context/AuthContext'
import StatusBadge from '../ui/StatusBadge'
import Button from '../ui/Button'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import toast from 'react-hot-toast'

function relativeTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString()
}

function statusTone(status) {
  if (status === 'resolved') return { icon: CheckCircle2, cls: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300' }
  if (status === 'rejected') return { icon: XCircle, cls: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' }
  if (status === 'in_progress') return { icon: Clock, cls: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300' }
  return { icon: Clock, cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' }
}

export default function Timeline({ complaintId }) {
  const [events, setEvents] = useState(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('in_progress')
  const [submitting, setSubmitting] = useState(false)
  const { user } = useContext(AuthContext)

  const canUpdate = user && (user.role === 'officer' || user.role === 'admin')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    complaintsApi.getTimeline(complaintId)
      .then((r) => { if (mounted) setEvents(r) })
      .catch((e) => { if (mounted) console.error(e) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [complaintId])

  async function submitStatus(e) {
    e.preventDefault()
    if (!note.trim() && !file) {
      toast.error('Add a note or image to update status.')
      return
    }
    setSubmitting(true)
    const form = new FormData()
    form.append('status', status)
    form.append('note', note)
    if (file) form.append('image', file)
    try {
      await complaintsApi.changeStatus(complaintId, form)
      const refreshed = await complaintsApi.getTimeline(complaintId)
      setEvents(refreshed)
      setNote(''); setFile(null)
      toast.success('Status updated')
    } catch (err) {
      toast.error('Failed to update status')
    } finally {
      setSubmitting(false)
    }
  }

  const history = events?.history || []
  const resolutionImages = events?.resolutionImages || []
  const ai = events?.ai || []

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Timeline</h3>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      )}

      {!loading && history.length === 0 && (
        <EmptyState title="No timeline events yet" subtitle="Status updates will appear here." icon={Clock} />
      )}

      {history.length > 0 && (
        <ol className="relative space-y-6 border-l border-slate-200 pl-6 dark:border-slate-700">
          {history.map((ev, idx) => {
            const cfg = statusTone(ev.status_to)
            const Icon = cfg.icon
            const isLast = idx === history.length - 1
            return (
              <motion.li
                key={ev.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative"
              >
                <span className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-800 ${cfg.cls}`}>
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                    <User className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    {ev.changed_by_name || 'System'}
                  </span>
                  <span className="text-xs text-slate-400">{ev.changed_by_role}</span>
                  <StatusBadge status={ev.status_to} />
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{ev.note || 'Status changed'}</div>
                <div className="mt-0.5 text-xs text-slate-400">{relativeTime(ev.created_at)}</div>
              </motion.li>
            )
          })}
        </ol>
      )}

      {/* Resolution images */}
      {resolutionImages.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-2 text-sm font-semibold text-slate-800 dark:text-white">Resolution Images</h4>
          <div className="flex flex-wrap gap-3">
            {resolutionImages.map((img) => (
              <a key={img.id} href={img.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <img src={img.url} alt="Resolution" className="h-24 w-32 object-cover transition-transform duration-300 hover:scale-105" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* AI analysis */}
      {ai.length > 0 && (
        <div className="mt-6 rounded-lg border border-ai/20 bg-gradient-to-br from-ai/5 to-indigo-500/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ai/10 text-ai"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-white">AI Analysis</h4>
          </div>
          <div className="space-y-3">
            {ai.map((a) => (
              <div key={a.id} className="rounded-lg bg-white/70 p-3 dark:bg-slate-900/40">
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {a.analysis?.summary || (typeof a.analysis === 'object' ? JSON.stringify(a.analysis) : a.analysis) || 'AI analysis complete.'}
                </p>
                {a.confidence != null && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className="h-full rounded-full bg-gradient-to-r from-ai to-indigo-500" style={{ width: `${Math.min(100, a.confidence * 100)}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{Math.round(a.confidence * 100)}% confidence</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Officer update form */}
      {canUpdate && (
        <form onSubmit={submitStatus} className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <CornerDownRight className="h-4 w-4 text-slate-400" aria-hidden="true" /> Update Status
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="tl-status" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">New Status</label>
              <select id="tl-status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label htmlFor="tl-file" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Resolution Image (optional)</label>
              <input id="tl-file" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:file:bg-slate-700" />
            </div>
          </div>
          <div className="mt-3">
            <label htmlFor="tl-note" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Note</label>
            <textarea id="tl-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add a note about this update…" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
          </div>
          <div className="mt-3 flex justify-end">
            <Button type="submit" disabled={submitting} className="inline-flex items-center gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? 'Updating…' : 'Update Status'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
