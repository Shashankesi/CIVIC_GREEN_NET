import React from 'react'
import { Link } from 'react-router-dom'
import { FileText, Activity, CheckCircle2, Sparkles, UserPlus } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'

function eventIcon(type) {
  if (type === 'complaint_submitted') return { icon: FileText, tone: 'brand' }
  if (type === 'complaint_assigned') return { icon: UserPlus, tone: 'blue' }
  if (type === 'complaint_resolved') return { icon: CheckCircle2, tone: 'brand' }
  if (type && type.includes('review') || (type && type.includes('status'))) return { icon: Activity, tone: 'amber' }
  return { icon: Sparkles, tone: 'purple' }
}

function relativeTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  return `${days}d ago`
}

export default function ActivityFeed({ items = [] }) {
  const tones = {
    brand: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
    purple: 'bg-ai/10 text-ai'
  }

  if (items.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
        <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-slate-400">
          <Activity className="h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden="true" />
          <p>No activity yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
      <ul className="space-y-1">
        {items.map((it, idx) => {
          const cfg = eventIcon(it.type)
          const Icon = cfg.icon
          const complaintId = it.payload?.complaintId || it.complaint_id
          return (
            <li key={it.id || idx} className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tones[cfg.tone] || tones.brand}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium capitalize text-slate-800 dark:text-slate-100">
                    {it.type?.replace(/_/g, ' ') || 'Activity'}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{relativeTime(it.created_at)}</span>
                </div>
                {complaintId && (
                  <Link to={`/complaints/${complaintId}`} className="text-xs text-brand-600 hover:underline dark:text-brand-400">
                    View complaint →
                  </Link>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
