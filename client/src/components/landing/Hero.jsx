import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, MapPin, ArrowRight, Crosshair, Sparkles, Zap, ShieldCheck } from 'lucide-react'
import Button from '../../ui/Button'
import MapView from '../MapView'

export default function Hero({ stats, loadingStats, user, onScrollToSection }) {
  const navigate = useNavigate()

  const totalMapped = stats?.totalReports ?? 0
  const openCount = stats?.openReports ?? 0
  const inProgressCount = stats?.inProgressReports ?? 0
  const resolvedCount = stats?.resolvedReports ?? 0
  const overdueCount = stats?.overdueReports ?? 0

  const featureBadges = [
    { icon: Crosshair, label: 'Geo-tagged Reports' },
    { icon: Sparkles, label: 'AI-Assisted Classification' },
    { icon: Zap, label: 'Real-Time Tracking' },
    { icon: ShieldCheck, label: 'Transparent Resolution' }
  ]

  return (
    <section
      id="home"
      className="relative overflow-hidden -mt-14 sm:-mt-15"
      style={{ minHeight: 'clamp(500px, 40vw, 620px)' }}
    >
      {/* ═══ FULL-WIDTH BACKGROUND IMAGE EXTENDING BEHIND NAVBAR ═══ */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/hero-bg.png"
          alt="CivicGreenNet — India Gate civic landscape with tricolor accents"
          className="h-full w-full object-cover select-none pointer-events-none"
          style={{ objectPosition: 'center 28%' }}
          loading="eager"
        />
        {/* Left-side readability gradient — preserves background imagery while ensuring crystal clear text contrast */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.68) 28%, rgba(255,255,255,0.22) 48%, rgba(255,255,255,0.04) 65%, transparent 100%)'
          }}
        />
        {/* Subtle top atmospheric glow right under translucent navbar */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 20%, transparent 85%, rgba(255,255,255,0.3) 100%)'
          }}
        />
      </div>

      {/* Dark-mode overlay */}
      <div
        className="absolute inset-0 z-0 hidden dark:block"
        style={{
          background:
            'linear-gradient(to right, rgba(16,24,40,0.92) 0%, rgba(16,24,40,0.72) 28%, rgba(16,24,40,0.25) 48%, transparent 65%)'
        }}
      />

      {/* ═══ TRICOLOR BOTTOM ACCENT ═══ */}
      <div className="absolute bottom-0 left-0 right-0 z-20 h-1 flex pointer-events-none">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* ═══ CONTENT (Offset accounted for navbar height) ═══ */}
      <div className="relative z-10 mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-28 pb-8 sm:pb-10 lg:pb-12" style={{ maxWidth: '1240px' }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-8">

          {/* ──── LEFT COLUMN (text — ~45%) ──── */}
          <div className="lg:max-w-[48%] xl:max-w-[46%] shrink-0">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-[#138808]/10 dark:bg-emerald-900/40 px-3 py-1 mb-4 border border-[#138808]/20 dark:border-emerald-700/30">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF9933]" />
              <span className="text-[10px] font-bold tracking-wider text-[#138808] dark:text-emerald-300 uppercase">
                AI-POWERED CIVIC GOVERNANCE PLATFORM
              </span>
            </div>

            {/* Heading — compact sizing */}
            <h1 className="text-3xl sm:text-4xl lg:text-[2.55rem] xl:text-[2.75rem] font-black tracking-tight text-[#101828] dark:text-white leading-[1.08]">
              BUILDING<br />
              <span className="text-[#138808]">SMARTER CITIES</span><br />
              THROUGH CITIZEN<br />
              ACTION.
            </h1>

            {/* Supporting paragraph */}
            <p className="mt-3 max-w-sm text-[13px] sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
              Report civic issues, track every step of the resolution journey, and help municipal teams build cleaner, safer, and more responsive communities.
            </p>

            {/* Buttons */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <Button
                size="md"
                onClick={() => navigate(user ? '/complaints/new' : '/signup')}
                className="bg-[#138808] hover:bg-[#0e6306] text-white font-bold px-5 h-10 text-sm shadow-sm"
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Report an Issue
              </Button>

              <Button
                size="md"
                variant="outline"
                onClick={() => onScrollToSection('#live-map')}
                className="border-slate-300 bg-white/90 text-slate-800 font-semibold px-4 h-10 text-sm hover:bg-white dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-800 shadow-2xs"
              >
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-[#FF9933]" />
                Explore Live Map
              </Button>

              <button
                onClick={() => onScrollToSection('#how-it-works')}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#138808] transition-colors ml-0.5"
              >
                View How It Works <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Feature Badges */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-700 dark:text-slate-400">
              {featureBadges.map((badge) => {
                const Icon = badge.icon
                return (
                  <span key={badge.label} className="inline-flex items-center gap-1">
                    <Icon className="h-3 w-3 text-[#138808]" />
                    <span className="font-semibold">{badge.label}</span>
                  </span>
                )
              })}
            </div>
          </div>

          {/* ──── RIGHT COLUMN — Floating Map Card (~38%) ──── */}
          <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0">
            <div className="relative overflow-hidden rounded-xl bg-white shadow-2xl border border-slate-200/70 dark:bg-slate-900 dark:border-slate-700">
              {/* Map Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#138808]" />
                  <span className="font-bold tracking-tight text-slate-800 dark:text-slate-200 text-xs">
                    Live Civic Map Preview
                  </span>
                </div>
                <span className="text-[10px] text-[#138808] font-semibold">
                  {loadingStats ? 'Loading...' : `${totalMapped.toLocaleString()} Reports Mapped`}
                </span>
              </div>

              {/* Embedded Live Map */}
              <div className="relative w-full" style={{ height: '260px' }}>
                <MapView
                  preview={true}
                  height={260}
                  showLegend={true}
                  showControls={true}
                  showSidebar={false}
                />
              </div>

              {/* Status Legend Bar */}
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Open ({openCount})
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  In Progress ({inProgressCount})
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#138808]" />
                  Resolved ({resolvedCount})
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Overdue ({overdueCount ?? 0})
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
