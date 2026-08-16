import React, { forwardRef } from 'react'

const Input = forwardRef(function Input({ label, error, hint, className = '', id, ...props }, ref) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-emerald-500 dark:bg-[#0D1929] dark:text-[#F8FAFC] dark:placeholder:text-[#64748B] ${
          error ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 dark:border-[#26374D]'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
})

export default Input
