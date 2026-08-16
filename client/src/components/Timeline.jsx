import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2, Clock, XCircle, User, FileText, UserPlus,
  Repeat, RefreshCw, ImageIcon, AlertCircle
} from 'lucide-react'
import complaintsApi from '../services/complaints'
import { API_BASE } from '../services/api'
import StatusBadge from '../ui/StatusBadge'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'

function relativeTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (isNaN(s)) return ''
  if (s < 10) return 'Just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
}

function resolveImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = API_BASE;
  const serverHost = base.replace(/\/api$/, '');
  return `${serverHost}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getEventTone(ev) {
  if (ev.action_type === 'COMPLAINT_CREATED') {
    return { icon: FileText, cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 dark:border dark:border-blue-500/30' }
  }
  if (ev.action_type === 'ASSIGNED' || ev.action_type === 'REASSIGNED') {
    return { icon: UserPlus, cls: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 dark:border dark:border-purple-500/30' }
  }
  if (ev.status_to === 'in_progress') {
    return { icon: Clock, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 dark:border dark:border-amber-500/30' }
  }
  if (ev.status_to === 'resolved') {
    return { icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-[#34D399] dark:border dark:border-emerald-500/30' }
  }
  if (ev.status_to === 'closed') {
    return { icon: CheckCircle2, cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:border dark:border-slate-700' }
  }
  if (ev.status_to === 'rejected') {
    return { icon: XCircle, cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 dark:border dark:border-rose-500/30' }
  }
  if (ev.status_to === 'reopened') {
    return { icon: RefreshCw, cls: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 dark:border dark:border-purple-500/30' }
  }
  return { icon: Clock, cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border dark:border-cyan-500/30' }
}

export default function Timeline({ complaintId }) {
  const [events, setEvents] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    complaintsApi.getTimeline(complaintId)
      .then((r) => { if (mounted) setEvents(r) })
      .catch((e) => { if (mounted) console.error('Failed loading timeline:', e) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [complaintId])

  const history = events?.history || []
  const resolutionImages = events?.resolutionImages || []

  return (
    <div className="space-y-4">
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      )}

      {!loading && history.length === 0 && (
        <EmptyState title="No timeline events yet" subtitle="Authoritative history events will appear as actions occur." icon={Clock} />
      )}

      {history.length > 0 && (
        <ol className="relative space-y-6 border-l-2 border-slate-200 pl-6 dark:border-slate-800">
          {history.map((ev) => {
            const cfg = getEventTone(ev)
            const Icon = cfg.icon

            return (
              <motion.li
                key={ev.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="relative"
              >
                {/* Status Dot / Icon */}
                <span className={`absolute -left-[35px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900 shadow-sm ${cfg.cls}`}>
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>

                {/* Event Card Content */}
                <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 p-3.5 space-y-1.5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {ev.changed_by_name || 'User'}
                      </span>
                      <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                        {ev.changed_by_role || 'Citizen'}
                      </span>
                    </div>

                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      {relativeTime(ev.created_at)}
                    </span>
                  </div>

                  {/* Action Title */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {ev.action_title || 'Action Event'}
                    </span>
                    {ev.status_to && <StatusBadge status={ev.status_to} />}
                  </div>

                  {/* Fact-based note from database (only if provided by user) */}
                  {ev.note && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal pt-1 border-t border-slate-200/60 dark:border-slate-700/60 font-normal">
                      "{ev.note}"
                    </p>
                  )}
                </div>
              </motion.li>
            )
          })}
        </ol>
      )}

      {/* Resolution Proof Evidence Images */}
      {resolutionImages.length > 0 && (
        <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4 text-emerald-500" /> Resolution Evidence ({resolutionImages.length})
          </h4>
          <div className="flex flex-wrap gap-2.5">
            {resolutionImages.map((img) => (
              <a
                key={img.id}
                href={resolveImageUrl(img.url)}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all"
              >
                <img src={resolveImageUrl(img.url)} alt="Resolution Evidence Proof" className="h-20 w-28 object-cover hover:scale-105 transition-transform" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
