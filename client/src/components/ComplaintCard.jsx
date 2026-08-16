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

export default function ComplaintCard({ complaint, showProgress = false }) {
  const image = complaint.images?.[0]?.url || complaint.thumbnail
  const priority = complaint.priority
  const hasConfidence = typeof complaint.ai_confidence === 'number'
  const formattedId = `CGN-${String(complaint.id).padStart(5, '0')}`

  return (
    <Link
      to={`/complaints/${complaint.id}`}
      className="card card-hover group flex flex-col overflow-hidden border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Image Gallery Thumbnail */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        {image ? (
          <img
            src={image}
            alt={complaint.title || 'Complaint Evidence'}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-slate-400 dark:text-slate-600">
            <ImageIcon className="h-8 w-8 stroke-[1.5]" aria-hidden="true" />
            <span className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400/80 dark:text-slate-500">No Photo Evidence</span>
          </div>
        )}
        
        {/* Status & Priority Badges */}
        <div className="absolute left-3 top-3">
          <StatusBadge status={complaint.status} />
        </div>
        {priority && (
          <div className="absolute right-3 top-3">
            <StatusBadge status={priority} type="priority" />
          </div>
        )}

        {/* Multi-photo indicator */}
        {complaint.images && complaint.images.length > 1 && (
          <div className="absolute bottom-3 right-3 rounded-md bg-slate-900/80 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm shadow-sm">
            +{complaint.images.length - 1} photos
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">#{formattedId}</div>
        <h3 className="mt-1 line-clamp-1 text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors duration-200 dark:text-white dark:group-hover:text-emerald-400">
          {complaint.title || `Complaint #${complaint.id}`}
        </h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {complaint.summary || complaint.description || 'No description provided.'}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-50 pt-3 dark:border-slate-800/40">
          {complaint.category && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 capitalize">
              {complaint.category}
            </span>
          )}
          {(complaint.address || complaint.location?.lat != null) && (
            <span className="inline-flex items-center gap-1 max-w-[150px] truncate" title={complaint.address || 'Mapped'}>
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              {complaint.address || 'Mapped'}
            </span>
          )}
          <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" aria-hidden="true" /> {relativeTime(complaint.created_at)}</span>
        </div>

        {/* Progress Tracker Stepper for My Complaints */}
        {showProgress && (
          <div className="mt-3.5 border-t border-slate-100 pt-3 dark:border-slate-800/60">
            <div className="flex w-full items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              {['Reported', 'Assigned', 'Working', 'Resolved', 'Closed'].map((label, idx) => {
                let currentStageIndex = 0; // Reported
                if (complaint.officer_id || complaint.assigned_at) currentStageIndex = 1; // Assigned
                if (complaint.status === 'in_progress') currentStageIndex = 2; // Working
                if (complaint.status === 'resolved') currentStageIndex = 3; // Resolved
                if (complaint.status === 'closed') currentStageIndex = 4; // Closed
                if (complaint.status === 'reopened') currentStageIndex = 2; // Reopened acts like working

                const isPast = idx <= currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <React.Fragment key={label}>
                    <div className="flex flex-col items-center">
                      <span className={`h-2.5 w-2.5 rounded-full border transition-all duration-300 ${
                        isCurrent 
                          ? 'bg-emerald-600 border-emerald-600 ring-4 ring-emerald-100 dark:bg-emerald-400 dark:border-emerald-400 dark:ring-emerald-950' 
                          : isPast 
                            ? 'bg-slate-700 border-slate-700 dark:bg-slate-300 dark:border-slate-300' 
                            : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                      }`} />
                      <span className={`mt-1 text-[8px] font-bold tracking-tight uppercase ${
                        isCurrent 
                          ? 'text-slate-800 dark:text-slate-100' 
                          : isPast 
                            ? 'text-slate-500' 
                            : 'text-slate-300 dark:text-slate-700'
                      }`}>{label}</span>
                    </div>
                    {idx < 4 && (
                      <div className={`h-[1px] flex-1 mx-0.5 transition-colors duration-300 ${
                        idx < currentStageIndex 
                          ? 'bg-slate-400 dark:bg-slate-500' 
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {hasConfidence && <AIBadge confidence={complaint.ai_confidence} />}
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 transition-transform group-hover:translate-x-0.5 dark:text-emerald-400">
            View & Track <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  )
}
