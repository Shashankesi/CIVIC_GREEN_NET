import React from 'react'
import { Trophy, TrendingUp, Clock, Zap } from 'lucide-react'

/**
 * SLA Compliance & Performance card for the Officer dashboard.
 * Shows a large SVG progress ring + performance metrics.
 * All values come from props (real backend data).
 */
export default function OfficerSLA({ sla, performance }) {
  const complianceRate = sla.complianceRate ?? 100
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - complianceRate / 100)

  // Semantic color based on compliance
  const ringColor = complianceRate >= 80 ? '#10b981' : complianceRate >= 50 ? '#f59e0b' : '#ef4444'
  const ringTrack = 'rgba(0,0,0,0.06)'

  const stats = [
    {
      label: 'On-time Resolution',
      value: `${sla.onTime || 0} / ${sla.totalResolved || 0}`,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10'
    },
    {
      label: 'Average Resolution Time',
      value: `${performance.averageResolutionTime || '0.0'} days`,
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10'
    },
    {
      label: 'Active Resolution Rate',
      value: `${performance.resolutionRate || 100}%`,
      icon: Zap,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10'
    }
  ]

  return (
    <div className="officer-card p-6">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10">
          <Trophy className="h-4 w-4 text-amber-500" />
        </div>
        SLA Compliance & Performance
        <span className="ml-auto text-[10px] font-semibold text-slate-400 uppercase tracking-wide">View Details</span>
      </h3>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Progress Ring */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="officer-sla-ring" width="130" height="130" viewBox="0 0 130 130">
            {/* Track */}
            <circle
              cx="65" cy="65" r={radius}
              fill="none" stroke={ringTrack} strokeWidth="10"
              className="dark:stroke-slate-700/50"
            />
            {/* Progress */}
            <circle
              cx="65" cy="65" r={radius}
              fill="none" stroke={ringColor} strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 65 65)"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-slate-800 dark:text-white">{complianceRate}%</span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">SLA</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3 w-full">
          {stats.map((stat, idx) => {
            const StatIcon = stat.icon
            return (
              <div key={idx} className="flex items-center justify-between gap-3 rounded-lg p-2.5 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.bg}`}>
                    <StatIcon className={`h-3.5 w-3.5 ${stat.color}`} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{stat.label}</span>
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-white">{stat.value}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
