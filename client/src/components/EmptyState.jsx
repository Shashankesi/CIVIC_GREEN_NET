import React from 'react'
import { Inbox } from 'lucide-react'

export default function EmptyState({ title = 'No data', subtitle = '', icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
