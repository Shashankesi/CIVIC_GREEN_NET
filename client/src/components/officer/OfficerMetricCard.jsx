import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Enterprise KPI card for the Officer portal workload summary.
 * Uses restrained status colors and clear typography.
 * All data comes from backend props.
 */
export default function OfficerMetricCard({ to, icon: Icon, label, value, subtitle, accentColor = 'emerald' }) {
  const accentClasses = {
    emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 border-emerald-400/40',
    blue: 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-md shadow-blue-500/20 border-blue-400/40',
    amber: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20 border-amber-400/40',
    rose: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20 border-rose-400/40',
    slate: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-md shadow-slate-500/20 border-slate-400/40',
  }

  const iconStyle = accentClasses[accentColor] || accentClasses.slate

  return (
    <Link to={to} className="officer-kpi-card transition-all p-4 rounded-xl group block">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        <div className={`officer-icon-3d flex h-8 w-8 items-center justify-center rounded-lg border ${iconStyle} transition-transform duration-200 group-hover:scale-105`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">{subtitle}</span>
      </div>
      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
        <span>Workload Queue</span>
        <span className="text-emerald-600 dark:text-emerald-400 transition-transform duration-200 group-hover:translate-x-0.5">View →</span>
      </div>
    </Link>
  )
}
