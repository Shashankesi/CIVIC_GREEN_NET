import React from 'react'

const statusConfig = {
  open: { tone: 'blue', label: 'Open' },
  in_progress: { tone: 'amber', label: 'In Progress' },
  resolved: { tone: 'brand', label: 'Resolved' },
  rejected: { tone: 'red', label: 'Rejected' },
  pending: { tone: 'slate', label: 'Pending' }
}

const priorityConfig = {
  low: 'slate',
  medium: 'amber',
  high: 'red',
  critical: 'red'
}

export default function StatusBadge({ status, type = 'status' }) {
  const cfg = type === 'priority' ? { tone: priorityConfig[status] || 'slate', label: status ? status.replace(/_/g, ' ') : '—' } : (statusConfig[status] || { tone: 'slate', label: status ? status.replace(/_/g, ' ') : '—' })
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
      cfg.tone === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
      : cfg.tone === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
      : cfg.tone === 'brand' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
      : cfg.tone === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    }`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {cfg.label}
    </span>
  )
}
