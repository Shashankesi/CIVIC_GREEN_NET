import React from 'react'
import { motion } from 'framer-motion'

const variants = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-sm font-semibold',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-[#172438] dark:text-slate-100 dark:hover:bg-[#24344A] dark:border dark:border-[#24344A]',
  outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-[#24344A] dark:text-slate-200 dark:hover:bg-[#172438]',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#172438]',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500',
  ai: 'bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 shadow-sm'
}

const sizes = {
  xs: 'px-2 py-1 text-[11px]',
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base'
}

export default function Button({ children, variant = 'primary', size = 'md', className = '', loading = false, disabled = false, ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      whileHover={disabled || loading ? undefined : { scale: 1.01 }}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-60 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      )}
      {children}
    </motion.button>
  )
}
