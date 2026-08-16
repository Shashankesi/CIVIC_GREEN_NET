import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Enterprise KPI card for the Officer portal workload summary.
 * Uses restrained status colors and clear typography.
 * All data comes from backend props.
 */
export default function OfficerMetricCard({ to, icon: Icon, label, value, subtitle, accentColor = 'emerald' }) {
  const accentClasses = {
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-800/40',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/40',
    slate: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/40',
  }

  const iconStyle = accentClasses[accentColor] || accentClasses.slate

  return (
    <Link to={to} className="officer-kpi-card shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all p-4 rounded-xl">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${iconStyle}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="text-2xl font-black text-slate-900 dark:text-white">{value}</span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">{subtitle}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] font-bold text-slate-400">
        <span>Workload Queue</span>
        <span className="text-emerald-600 dark:text-emerald-400">View →</span>
      </div>
    </Link>
  )
}
