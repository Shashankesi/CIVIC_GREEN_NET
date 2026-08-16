import React from 'react'
import { motion } from 'framer-motion'

export default function DashboardCard({ title, value, icon: Icon, tone = 'brand', trend, trendDir = 'up', subtitle }) {
  const iconTones = {
    brand: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-[#34D399] border border-emerald-200 dark:border-emerald-500/30',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-[#34D399] border border-emerald-200 dark:border-emerald-500/30',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30',
    red: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30',
    cyan: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30'
  }

  const borderAccents = {
    brand: 'dark:border-t-emerald-500/40',
    emerald: 'dark:border-t-emerald-500/40',
    blue: 'dark:border-t-blue-500/40',
    amber: 'dark:border-t-amber-500/40',
    red: 'dark:border-t-rose-500/40',
    purple: 'dark:border-t-purple-500/40',
    cyan: 'dark:border-t-cyan-500/40'
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`card card-hover p-5 border-t-2 ${borderAccents[tone] || borderAccents.brand}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</div>
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</div>
        </div>
        {Icon && (
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ${iconTones[tone] || iconTones.brand}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </div>
      {(trend || subtitle) && (
        <div className="mt-3 flex items-center gap-2">
          {trend && (
            <span className={`inline-flex items-center gap-1 text-xs font-bold ${trendDir === 'up' ? 'text-emerald-600 dark:text-[#34D399]' : 'text-rose-600 dark:text-rose-400'}`}>
              <span aria-hidden="true">{trendDir === 'up' ? '↑' : '↓'}</span> {trend}
            </span>
          )}
          {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
        </div>
      )}
    </motion.div>
  )
}
