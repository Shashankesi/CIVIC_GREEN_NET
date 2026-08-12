import React from 'react'
import { AlertTriangle } from 'lucide-react'
import Button from '../ui/Button'

export default function ErrorState({ title = 'Something went wrong', message = '', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/50 p-10 text-center dark:border-red-900/40 dark:bg-red-950/20">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
        </div>
      )}
    </div>
  )
}
