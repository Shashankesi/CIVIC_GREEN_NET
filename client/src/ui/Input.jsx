import React, { forwardRef } from 'react'

const Input = forwardRef(function Input({ label, error, hint, className = '', id, ...props }, ref) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 dark:bg-surface-dark dark:text-slate-100 dark:placeholder:text-slate-500 ${
          error ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
})

export default Input
