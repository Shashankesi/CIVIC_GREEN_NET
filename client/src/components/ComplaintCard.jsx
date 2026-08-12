import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Calendar, Image as ImageIcon, ArrowRight } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import AIBadge from '../ui/AIBadge'

function relativeTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return d.toLocaleDateString()
}

export default function ComplaintCard({ complaint }) {
  const image = complaint.images?.[0]?.url || complaint.thumbnail
  const priority = complaint.priority
  const hasConfidence = typeof complaint.ai_confidence === 'number'

  return (
    <Link
      to={`/complaints/${complaint.id}`}
      className="card card-hover group flex flex-col overflow-hidden"
    >
      {/* Image */}
      <div className="relative h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {image ? (
          <img src={image} alt={complaint.title || 'Complaint'} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
            <ImageIcon className="h-10 w-10" aria-hidden="true" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <StatusBadge status={complaint.status} />
        </div>
        {priority && (
          <div className="absolute right-3 top-3">
            <StatusBadge status={priority} type="priority" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="text-xs font-medium text-slate-400">#{complaint.id}</div>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
          {complaint.title || `Complaint #${complaint.id}`}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
          {complaint.summary || complaint.description || 'No description provided.'}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          {complaint.category && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {complaint.category}
            </span>
          )}
          {complaint.location?.lat != null && (
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden="true" /> Mapped</span>
          )}
          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" aria-hidden="true" /> {relativeTime(complaint.created_at)}</span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {hasConfidence && <AIBadge confidence={complaint.ai_confidence} />}
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 transition-transform group-hover:translate-x-0.5 dark:text-brand-400">
            View <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  )
}
