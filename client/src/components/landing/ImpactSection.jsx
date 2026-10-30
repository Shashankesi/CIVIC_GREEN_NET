import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp,
  RotateCw,
  Users,
  Zap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Activity,
  Layers,
  CheckCheck
} from 'lucide-react'

/**
 * ImpactSection
 * 
 * Section: "Our Impact — Building Better Communities Together"
 * Features:
 * 1. Database-backed statistics dashboard (Total, Resolved, In Progress, Active Wards, Resolution Rate)
 * 2. 4 Impact Highlights (Citizen Participation, Faster Issue Resolution, Transparent Governance, Cleaner Communities)
 * 3. Civic Progress Visualization: Citizen Reports → AI Analysis → Department Assignment → Issue Resolution → Citizen Verification
 */
export default function ImpactSection({
  stats,
  loadingStats = false,
  statsError = false,
  secondsAgo = 0,
  onRefresh = () => {}
}) {
  const [hoveredCard, setHoveredCard] = useState(null)

  // Database-backed metrics
  const total = stats?.reportsSubmitted ?? stats?.totalReports ?? 0
  const resolved = stats?.issuesResolved ?? stats?.resolvedReports ?? 0
  const inProgress = stats?.activeIssues ?? ((stats?.openReports ?? 0) + (stats?.inProgressReports ?? 0))
  const activeWards = stats?.activeWards ?? 16
  const resolutionRate = stats?.resolutionRate ?? (total > 0 ? Math.round((resolved / total) * 100) : 0)

  // 1. Statistics Cards Configuration
  const statMetrics = [
    {
      id: 'total',
      label: 'Total Civic Issues Reported',
      value: total,
      suffix: '',
      icon: FileText,
      accent: 'emerald',
      tag: 'Verified Submissions',
      borderClass: 'hover:border-emerald-500/50',
      badgeClass: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-800/60',
      glow: 'group-hover:shadow-[0_12px_32px_-6px_rgba(16,185,129,0.18)]'
    },
    {
      id: 'resolved',
      label: 'Issues Successfully Resolved',
      value: resolved,
      suffix: '',
      icon: CheckCircle2,
      accent: 'green',
      tag: 'Action Completed',
      borderClass: 'hover:border-[#138808]/50',
      badgeClass: 'text-[#138808] bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/60 border-emerald-300/80 dark:border-emerald-800/60',
      glow: 'group-hover:shadow-[0_12px_32px_-6px_rgba(19,136,8,0.2)]'
    },
    {
      id: 'in-progress',
      label: 'Issues Currently In Progress',
      value: inProgress,
      suffix: '',
      icon: Clock,
      accent: 'amber',
      tag: 'Field Officers Dispatched',
      borderClass: 'hover:border-amber-500/50',
      badgeClass: 'text-amber-800 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800/60',
      glow: 'group-hover:shadow-[0_12px_32px_-6px_rgba(245,158,11,0.2)]'
    },
    {
      id: 'wards',
      label: 'Active Municipal Wards',
      value: activeWards,
      suffix: '',
      icon: MapPin,
      accent: 'teal',
      tag: 'Civic Coverage',
      borderClass: 'hover:border-teal-500/50',
      badgeClass: 'text-teal-800 bg-teal-50 dark:text-teal-300 dark:bg-teal-950/60 border-teal-200/80 dark:border-teal-800/60',
      glow: 'group-hover:shadow-[0_12px_32px_-6px_rgba(20,184,166,0.2)]'
    },
    {
      id: 'rate',
      label: 'Resolution Rate',
      value: resolutionRate,
      suffix: '%',
      icon: TrendingUp,
      accent: 'emerald',
      tag: 'Platform Benchmark',
      borderClass: 'hover:border-emerald-600/50',
      badgeClass: 'text-[#138808] bg-emerald-100/70 dark:text-emerald-300 dark:bg-emerald-950/70 border-emerald-300/80 dark:border-emerald-800/70',
      glow: 'group-hover:shadow-[0_12px_32px_-6px_rgba(19,136,8,0.22)]'
    }
  ]

  // 2. Impact Highlights Configuration
  const impactHighlights = [
    {
      id: 'participation',
      num: '01',
      title: 'Citizen Participation',
      desc: 'Citizens actively shape cleaner neighbourhoods by geotagging and documenting infrastructure faults, hazardous road potholes, overflowing waste bins, and environmental concerns.',
      icon: Users,
      badge: 'Community Action',
      accentColor: 'from-[#10B981] to-[#047857]'
    },
    {
      id: 'resolution',
      num: '02',
      title: 'Faster Issue Resolution',
      desc: 'Our neural classification engine automatically triages incoming complaints, assesses urgency, and routes tickets directly to designated ward supervisors without bureaucratic delays.',
      icon: Zap,
      badge: 'Automated Dispatch',
      accentColor: 'from-[#FF9933] to-[#D97706]'
    },
    {
      id: 'transparency',
      num: '03',
      title: 'Transparent Governance',
      desc: 'Citizens follow live resolution journeys with timestamped audit trails, officer assignments, and photographic evidence submitted upon complaint closure.',
      icon: ShieldCheck,
      badge: '100% Public Audit',
      accentColor: 'from-[#0284C7] to-[#0369A1]'
    },
    {
      id: 'cleaner',
      num: '04',
      title: 'Cleaner Communities',
      desc: 'Continuous spatial monitoring eliminates chronic sanitation bottlenecks, unclogs stormwater drainage networks, and helps urban local bodies maintain pristine public spaces.',
      icon: Sparkles,
      badge: 'Urban Sustainability',
      accentColor: 'from-[#138808] to-[#047857]'
    }
  ]

  // 3. Civic Progress Visualization Lifecycle
  const progressSteps = [
    {
      step: '01',
      title: 'Citizen Reports',
      desc: 'Resident captures photo evidence with GPS coordinates and submits issue.',
      icon: FileText
    },
    {
      step: '02',
      title: 'AI Analysis',
      desc: 'System classifies category, detects duplicate complaints, and flags urgency.',
      icon: Zap
    },
    {
      step: '03',
      title: 'Department Assignment',
      desc: 'Ticket automatically assigned to the responsible municipal ward officer.',
      icon: Layers
    },
    {
      step: '04',
      title: 'Issue Resolution',
      desc: 'On-ground field crew remediates the problem and uploads proof of work.',
      icon: CheckCheck
    },
    {
      step: '05',
      title: 'Citizen Verification',
      desc: 'Citizen confirms successful fix; system permanently closes ticket.',
      icon: ShieldCheck
    }
  ]

  const formatFreshness = () => {
    if (loadingStats) return 'Refreshing...'
    if (statsError) return 'Offline fallback active'
    if (secondsAgo === 0) return 'Just updated'
    if (secondsAgo < 60) return `${secondsAgo}s ago`
    return `${Math.floor(secondsAgo / 60)}m ago`
  }

  return (
    <section
      id="impact"
      className="scroll-mt-14 relative py-16 sm:py-24 bg-[#F4F8F5] dark:bg-[#0A1219] border-b border-slate-200/80 dark:border-slate-800 overflow-hidden select-none transition-colors duration-200"
    >
      {/* ── Top Indian Tricolour Accent Line ── */}
      <div className="absolute top-0 left-0 right-0 h-[3px] flex z-20 pointer-events-none">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#138808]" />
      </div>

      {/* ── Subtle Ambient Saffron & Green Lighting Accents ── */}
      <div className="absolute -top-32 -left-20 w-[500px] h-[500px] bg-[#FF9933]/[0.06] rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-20 w-[500px] h-[500px] bg-[#138808]/[0.07] rounded-full blur-[110px] pointer-events-none" />

      {/* ── Architectural City Grid Texture ── */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #111827 1px, transparent 1px),
            linear-gradient(to bottom, #111827 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      {/* ── Subtle Topographic Contour Vector Overlay ── */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.05] pointer-events-none select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="impact-topo-contours" width="600" height="400" patternUnits="userSpaceOnUse">
            <path
              d="M0,80 Q150,20 300,90 T600,60 M0,160 Q200,90 350,170 T600,140 M0,240 Q180,180 320,250 T600,220 M0,320 Q220,270 380,330 T600,300 M50,0 Q120,150 70,300 T90,400 M250,0 Q320,150 280,300 T300,400 M450,0 Q520,150 470,300 T500,400"
              fill="none"
              stroke="#138808"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#impact-topo-contours)" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ═══ 1. SECTION HEADER ═══ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-12">
          <div>
            {/* Eyebrow Label with Indian Tricolour Beacon */}
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-extrabold tracking-widest text-[#138808] dark:text-emerald-400 uppercase bg-emerald-500/10 dark:bg-emerald-500/20 px-3.5 py-1.5 rounded-full border border-emerald-500/25 mb-3 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#138808] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#138808]" />
              </span>
              <span>MEASURABLE CIVIC IMPACT</span>
            </div>

            {/* Exact Required Title */}
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-[#111827] dark:text-white leading-tight">
              Our Impact —{' '}
              <span className="text-[#138808] dark:text-emerald-400">
                Building Better Communities Together
              </span>
            </h2>

            {/* Saffron, White & Green Decorative Accent Line */}
            <div className="flex items-center gap-1.5 my-3">
              <span className="h-1 w-6 rounded-full bg-[#FF9933]" />
              <span className="h-1 w-14 rounded-full bg-gradient-to-r from-[#FF9933] via-amber-300 to-[#138808]" />
              <span className="h-1 w-6 rounded-full bg-[#138808]" />
            </div>

            {/* Exact Required Subtitle */}
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Every reported issue creates an opportunity for improvement. Track how CivicGreenNet connects citizens, intelligent technology and municipal authorities to create cleaner, safer and more responsive communities.
            </p>
          </div>

          {/* Freshness Timestamp & Refresh Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#138808] animate-pulse" />
              <span>Last Updated: {formatFreshness()}</span>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loadingStats}
              title="Refresh database statistics"
              className="p-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
            >
              <RotateCw className={`h-4 w-4 ${loadingStats ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* ═══ 2. IMPACT STATISTICS DASHBOARD (5 Cards) ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4.5 mb-14 sm:mb-16">
          {statMetrics.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.id}
                className={`group relative rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 ${stat.borderClass} ${stat.glow}`}
              >
                {/* Header Icon + Tag */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className={`p-2 rounded-xl border ${stat.badgeClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {stat.tag}
                  </span>
                </div>

                {/* Number Display with loading state */}
                <div className="mb-1">
                  {loadingStats ? (
                    <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  ) : (
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-0.5">
                      <span>{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</span>
                      {stat.suffix && <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{stat.suffix}</span>}
                    </div>
                  )}
                </div>

                {/* Label */}
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-snug">
                  {stat.label}
                </p>
              </div>
            )
          })}
        </div>

        {/* ═══ 3. IMPACT HIGHLIGHTS (4 Cards) ═══ */}
        <div className="mb-14 sm:mb-18">
          <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              Transforming Urban Living
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              Key Pillars of CivicGreenNet Impact
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {impactHighlights.map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredCard(idx)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="group relative rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-[0_8px_28px_-6px_rgba(15,23,42,0.06)] hover:shadow-[0_16px_36px_-8px_rgba(19,136,8,0.14)] hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Number + Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-black text-slate-200 dark:text-slate-800 group-hover:text-emerald-600/30 transition-colors">
                        {item.num}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    </div>

                    {/* Icon in refined gradient squircle */}
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${item.accentColor} flex items-center justify-center text-white mb-4 shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Title */}
                    <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                      {item.title}
                    </h4>

                    {/* Description */}
                    <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-xs font-semibold text-[#138808] dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                    <span>Explore Metric</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ═══ 4. CIVIC PROGRESS VISUALIZATION (Connected Lifecycle) ═══ */}
        <div className="rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 p-6 sm:p-8 lg:p-10 border border-slate-200/80 dark:border-slate-800 shadow-[0_12px_36px_-8px_rgba(15,23,42,0.08)]">
          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#138808] dark:text-emerald-400 mb-2">
              <Activity className="h-3.5 w-3.5" />
              <span>END-TO-END CIVIC LIFECYCLE</span>
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              From Citizen Report to Verified Resolution
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2">
              How CivicGreenNet’s connected workflow ensures every issue is tracked, addressed, and publicly verified.
            </p>
          </div>

          {/* Timeline Nodes */}
          <div className="relative">
            {/* Desktop Connector Line */}
            <div className="hidden lg:block absolute top-7 left-12 right-12 h-0.5 bg-gradient-to-r from-emerald-400 via-amber-400 to-[#138808] z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4 relative z-10">
              {progressSteps.map((step, idx) => {
                const Icon = step.icon
                return (
                  <div key={step.step} className="flex flex-col items-center text-center group">
                    {/* Circular Step Node with Indian tricolour rim */}
                    <div className="relative mb-3.5">
                      <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-900 border-2 border-emerald-500/50 shadow-md flex items-center justify-center text-slate-800 dark:text-slate-100 group-hover:border-[#138808] group-hover:scale-105 transition-all duration-300">
                        <Icon className="h-5 w-5 text-[#138808] dark:text-emerald-400" />
                      </div>
                      <span className="absolute -top-1 -right-1 text-[9px] font-black bg-[#138808] text-white px-1.5 py-0.2 rounded-full border border-white">
                        {step.step}
                      </span>
                    </div>

                    <h5 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                      {step.title}
                    </h5>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[200px]">
                      {step.desc}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

