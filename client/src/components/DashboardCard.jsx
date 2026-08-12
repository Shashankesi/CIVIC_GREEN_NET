import React from 'react'
import { motion } from 'framer-motion'

export default function DashboardCard({ title, value, icon: Icon, tone = 'brand', trend, trendDir = 'up', subtitle }) {
  const tones = {
    brand: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300'
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="card card-hover p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{title}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone] || tones.brand}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </div>
      {(trend || subtitle) && (
        <div className="mt-3 flex items-center gap-2">
          {trend && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${trendDir === 'up' ? 'text-brand-600 dark:text-brand-400' : 'text-red-600 dark:text-red-400'}`}>
              <span aria-hidden="true">{trendDir === 'up' ? '↑' : '↓'}</span> {trend}
            </span>
          )}
          {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
        </div>
      )}
    </motion.div>
  )
}
