import React from 'react'

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]'
}

export default function Spinner({ size = 'md', className = '', label = 'Loading' }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} role="status" aria-live="polite">
      <span className={`inline-block animate-spin rounded-full border-current border-t-transparent text-brand-600 dark:text-brand-400 ${sizes[size]}`} aria-hidden="true" />
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  )
}
