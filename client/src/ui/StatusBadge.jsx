import React from 'react'

const statusConfig = {
  open: { tone: 'blue', label: 'Open' },
  submitted: { tone: 'blue', label: 'Submitted' },
  pending: { tone: 'amber', label: 'Pending' },
  unassigned: { tone: 'slate', label: 'Unassigned' },
  assigned: { tone: 'blue', label: 'Assigned' },
  accepted: { tone: 'purple', label: 'Accepted' },
  in_progress: { tone: 'amber', label: 'In Progress' },
  resolved: { tone: 'emerald', label: 'Resolved' },
  closed: { tone: 'slate', label: 'Closed' },
  reopened: { tone: 'purple', label: 'Reopened' },
  rejected: { tone: 'red', label: 'Rejected' },
  overdue: { tone: 'red', label: 'Overdue' },
  critical: { tone: 'red', label: 'Critical' }
}

const priorityConfig = {
  low: { tone: 'slate', label: 'Low' },
  medium: { tone: 'amber', label: 'Medium' },
  high: { tone: 'orange', label: 'High' },
  critical: { tone: 'red', label: 'Critical' }
}

export default function StatusBadge({ status, type = 'status', className = '' }) {
  if (!status) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 ${className}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        —
      </span>
    )
  }

  const normKey = String(status).toLowerCase().trim()
  
  if (type === 'priority') {
    const cfg = priorityConfig[normKey] || { tone: 'slate', label: normKey.replace(/_/g, ' ') }
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize border ${
        cfg.tone === 'red' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'
        : cfg.tone === 'orange' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30'
        : cfg.tone === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700'
      } ${className}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${
          cfg.tone === 'red' ? 'bg-rose-500' : cfg.tone === 'orange' ? 'bg-orange-500' : cfg.tone === 'amber' ? 'bg-amber-500' : 'bg-slate-400'
        }`} />
        {cfg.label}
      </span>
    )
  }

  const cfg = statusConfig[normKey] || { tone: 'slate', label: normKey.replace(/_/g, ' ') }
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
      cfg.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-[#34D399] dark:border-emerald-500/30'
      : cfg.tone === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30'
      : cfg.tone === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
      : cfg.tone === 'purple' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30'
      : cfg.tone === 'red' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'
      : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700'
    } ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        cfg.tone === 'emerald' ? 'bg-emerald-500'
        : cfg.tone === 'blue' ? 'bg-blue-500'
        : cfg.tone === 'amber' ? 'bg-amber-500'
        : cfg.tone === 'purple' ? 'bg-purple-500'
        : cfg.tone === 'red' ? 'bg-rose-500'
        : 'bg-slate-400'
      }`} />
      {cfg.label}
    </span>
  )
}
