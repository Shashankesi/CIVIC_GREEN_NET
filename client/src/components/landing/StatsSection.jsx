import React from 'react'
import { RefreshCw, FileText, CheckCircle2, Clock, MapPin, TrendingUp } from 'lucide-react'

export default function StatsSection({
  stats,
  loadingStats,
  statsError,
  secondsAgo,
  onRefresh
}) {
  const hasStats = stats !== null && stats !== undefined
  const reportsSubmitted = stats?.reportsSubmitted ?? stats?.totalReports ?? 0
  const issuesResolved = stats?.issuesResolved ?? stats?.resolvedReports ?? 0
  const activeIssues = stats?.activeIssues ?? ((stats?.openReports ?? 0) + (stats?.inProgressReports ?? 0))
  const activeWards = stats?.activeWards ?? 16
  const resolutionRate = stats?.resolutionRate ?? (reportsSubmitted > 0 ? Math.round((issuesResolved / reportsSubmitted) * 100) : 0)

  const statCards = [
    {
      icon: FileText,
      value: reportsSubmitted,
      label: 'Reports Submitted',
      iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-slate-200/90 hover:border-blue-400/60 dark:border-slate-700/80 dark:hover:border-blue-500/60'
    },
    {
      icon: CheckCircle2,
      value: issuesResolved,
      label: 'Issues Resolved',
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      iconColor: 'text-[#138808] dark:text-emerald-400',
      borderColor: 'border-slate-200/90 hover:border-emerald-400/60 dark:border-slate-700/80 dark:hover:border-emerald-500/60'
    },
    {
      icon: Clock,
      value: activeIssues,
      label: 'Active Issues',
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      borderColor: 'border-slate-200/90 hover:border-amber-400/60 dark:border-slate-700/80 dark:hover:border-amber-500/60'
    },
    {
      icon: MapPin,
      value: activeWards,
      label: 'Active Wards',
      iconBg: 'bg-purple-500/10 dark:bg-purple-500/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-slate-200/90 hover:border-purple-400/60 dark:border-slate-700/80 dark:hover:border-purple-500/60'
    },
    {
      icon: TrendingUp,
      value: `${resolutionRate}%`,
      label: 'Resolution Rate',
      iconBg: 'bg-rose-500/10 dark:bg-rose-500/20',
      iconColor: 'text-rose-600 dark:text-rose-400',
      borderColor: 'border-slate-200/90 hover:border-rose-400/60 dark:border-slate-700/80 dark:hover:border-rose-500/60'
    }
  ]

  const renderValue = (val) => {
    if (hasStats) {
      return typeof val === 'number' ? val.toLocaleString() : val
    }
    if (loadingStats) {
      return <span className="inline-block h-6 w-12 sm:w-14 rounded-md bg-slate-200/90 dark:bg-slate-700/90 animate-pulse my-0.5" />
    }
    if (statsError) {
      return <span className="text-xs text-rose-500 font-semibold">N/A</span>
    }
    return typeof val === 'number' ? val.toLocaleString() : val
  }

  return (
    <section id="features" className="live-civic-overview relative w-full pt-4 sm:pt-6 pb-2 sm:pb-3 bg-transparent">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Subtle Translucent Frosted Glass Dashboard Container */}
        <div className="rounded-2xl sm:rounded-3xl bg-white/88 dark:bg-slate-900/88 backdrop-blur-md border border-white/90 dark:border-slate-800/90 shadow-[0_10px_32px_-8px_rgba(15,23,42,0.08),0_2px_8px_-2px_rgba(15,23,42,0.02)] p-4 sm:p-5 lg:p-6 transition-all">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-5 lg:gap-6 xl:gap-8">
            
            {/* LEFT SIDE: Badge, Heading, Description, Freshness Sync */}
            <div className="shrink-0 lg:w-[195px] xl:w-[215px]">
              {/* Preserved Green Live Data Badge */}
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#138808] dark:text-emerald-400 uppercase bg-emerald-500/12 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/25 mb-1.5 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-[#138808] dark:bg-emerald-400 animate-pulse" />
                <span>LIVE CIVIC DATA</span>
              </div>

              {/* High-Contrast Heading in Dark Navy */}
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#0B1528] dark:text-white leading-tight">
                Live Civic Overview
              </h2>

              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-snug font-normal">
                Real-time snapshot of reported civic issues across active wards.
              </p>

              {/* Freshness sync indicator with proper states */}
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span className="font-mono">
                  {loadingStats && !hasStats
                    ? 'Syncing telemetry...'
                    : statsError
                    ? 'Data offline'
                    : secondsAgo < 5
                    ? 'Synced just now'
                    : `Synced ${secondsAgo}s ago`}
                </span>
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={loadingStats}
                  className="p-1 rounded-md text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  title="Refresh civic statistics"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingStats ? 'animate-spin text-emerald-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* RIGHT SIDE: Five Consistently Sized 3D Glass Stat Cards */}
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                {statCards.map((card, idx) => {
                  const Icon = card.icon
                  const isFifthCard = idx === 4
                  return (
                    <div
                      key={card.label}
                      className={`flex items-center gap-2.5 sm:gap-3 rounded-xl border ${card.borderColor} bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-3 sm:p-3.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all h-[76px] sm:h-[84px] ${
                        isFifthCard ? 'col-span-2 sm:col-span-1' : ''
                      }`}
                    >
                      {/* Standardized 3D Icon Container */}
                      <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl ${card.iconBg} border border-slate-200/60 dark:border-slate-700/60 shadow-2xs`}>
                        <Icon className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${card.iconColor}`} />
                      </div>

                      {/* Number and Label */}
                      <div className="min-w-0 flex-1">
                        <span className="text-lg sm:text-xl xl:text-2xl font-black text-[#0B1528] dark:text-white block leading-none tracking-tight">
                          {renderValue(card.value)}
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block leading-tight">
                          {card.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}
