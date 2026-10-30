import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Database,
  ArrowUpRight,
  Activity
} from 'lucide-react'

export default function CitizenSection({ stats, user }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  const citizenFeatures = [
    {
      num: '01',
      title: 'GEO-TAGGED REPORTS',
      desc: 'Accurate street pins prevent confusion and direct teams straight to the site.',
      icon: MapPin,
      badgeColor: 'text-[#138808] dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/25',
      accentBorder: 'hover:border-emerald-500/50',
      glowColor: 'group-hover:shadow-[0_12px_28px_-6px_rgba(19,136,8,0.18)]'
    },
    {
      num: '02',
      title: 'TRANSPARENT STATUS TRACKING',
      desc: 'Follow each status change from dispatch to on-site municipal action.',
      icon: Clock,
      badgeColor: 'text-[#FF9933] bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/25',
      accentBorder: 'hover:border-[#FF9933]/50',
      glowColor: 'group-hover:shadow-[0_12px_28px_-6px_rgba(255,153,51,0.18)]'
    },
    {
      num: '03',
      title: 'AI-ASSISTED CLASSIFICATION',
      desc: 'Intelligent analysis helps categorize reports, identify duplicates and prioritize critical hazards.',
      icon: Sparkles,
      badgeColor: 'text-[#009B72] dark:text-teal-400 bg-teal-500/10 dark:bg-teal-500/20 border-teal-500/25',
      accentBorder: 'hover:border-teal-500/50',
      glowColor: 'group-hover:shadow-[0_12px_28px_-6px_rgba(0,155,114,0.18)]'
    },
    {
      num: '04',
      title: 'MUNICIPAL ACCOUNTABILITY',
      desc: 'Resolution photographs and status updates help citizens verify completed work.',
      icon: ShieldCheck,
      badgeColor: 'text-[#138808] dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/25',
      accentBorder: 'hover:border-emerald-500/50',
      glowColor: 'group-hover:shadow-[0_12px_28px_-6px_rgba(19,136,8,0.18)]'
    }
  ]

  const total = stats?.totalReports ?? 0
  const resolved = stats?.resolvedReports ?? 0
  const inProgress = stats?.inProgressReports ?? 0
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100

  return (
    <section
      id="citizens"
      className="relative py-16 sm:py-20 lg:py-24 bg-[#F1F7F3] dark:bg-[#0A1219] border-b border-slate-200/80 dark:border-slate-800 overflow-hidden select-none"
    >
      {/* ── Top Indian Tricolour Decorative Accent Line ─────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-[3px] flex z-20">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#138808]" />
      </div>

      {/* ── Ambient Radial Lighting Accents ─────────────────────────────────── */}
      <div className="absolute -top-32 -left-20 w-[500px] h-[500px] bg-[#FF9933]/[0.05] rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-20 w-[500px] h-[500px] bg-[#138808]/[0.06] rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[450px] h-[450px] bg-emerald-500/[0.04] rounded-full blur-[100px] pointer-events-none" />

      {/* ── Subtle Architectural Grid Pattern (58px 58px) ───────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.045] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #111827 1px, transparent 1px),
            linear-gradient(to bottom, #111827 1px, transparent 1px)
          `,
          backgroundSize: '58px 58px'
        }}
      />

      {/* ── Subtle Topographic Vector Overlay ───────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035] dark:opacity-[0.05] pointer-events-none select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="citizen-light-topo-contours" width="600" height="400" patternUnits="userSpaceOnUse">
            <path
              d="M0,70 Q160,15 320,85 T600,55 M0,150 Q190,80 360,160 T600,130 M0,230 Q170,170 340,240 T600,210 M0,310 Q210,260 370,320 T600,290"
              fill="none"
              stroke="#138808"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#citizen-light-topo-contours)" />
      </svg>

      {/* ── Softly Integrated City Landscape Background (Light Theme Blending) ─── */}
      <div
        className="absolute inset-x-0 bottom-0 h-96 pointer-events-none opacity-[0.14] dark:opacity-[0.09] mix-blend-multiply dark:mix-blend-luminosity bg-bottom bg-no-repeat bg-cover"
        style={{
          backgroundImage: "url('/images/civicgreennet-citizen-impact.png')",
          maskImage: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)'
        }}
      />

      {/* ── Main Foreground Content ─────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* ── Two-Column Layout ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* ── Left Column: Content, Headings & Light Submissions Badges ─────── */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            
            {/* Eyebrow badge with saffron indicator */}
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-extrabold tracking-widest text-[#FF9933] uppercase bg-amber-500/10 dark:bg-amber-500/20 px-3.5 py-1.5 rounded-full border border-amber-500/25 mb-4 shadow-xs self-start backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF9933] animate-pulse" />
              <span>CITIZEN VOICE & IMPACT</span>
            </div>

            {/* Main Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-[#0f172a] dark:text-white leading-[1.16]">
              Every Report{' '}
              <span className="bg-gradient-to-r from-[#138808] via-emerald-600 to-[#009B72] dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-400 bg-clip-text text-transparent inline-block">
                Creates Visibility.
              </span>
            </h2>

            {/* Saffron & Green Decorative Accent Line */}
            <div className="flex items-center gap-1.5 my-4">
              <span className="h-1 w-6 rounded-full bg-[#FF9933]" />
              <span className="h-1 w-14 rounded-full bg-gradient-to-r from-[#FF9933] via-amber-300 to-[#138808]" />
              <span className="h-1 w-6 rounded-full bg-[#138808]" />
            </div>

            {/* Description Text */}
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl font-normal">
              A civic issue becomes easier to solve when it is visible, location-aware, prioritized and trackable.
            </p>

            {/* Light Glass Floating Badges */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {/* Badge 1: Citywide Submissions */}
              <div className="inline-flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 px-4 py-2.5 rounded-2xl shadow-[0_8px_24px_-6px_rgba(17,24,39,0.08)] transition-all">
                <div className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#138808]" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Citywide Submissions
                  </div>
                  <div className="text-sm font-black text-[#0f172a] dark:text-white">
                    {total} Reports Active
                  </div>
                </div>
              </div>

              {/* Badge 2: GPS & Geo-Fence Checked */}
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 dark:bg-emerald-500/20 backdrop-blur-md border border-emerald-500/25 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-[0_8px_20px_-6px_rgba(19,136,8,0.10)]">
                <ShieldCheck className="w-4 h-4 text-[#138808] dark:text-emerald-400 shrink-0" />
                <span>GPS & Geo-Fence Checked</span>
              </div>
            </div>
          </div>

          {/* ── Right Column: 4 Light Glassmorphism Feature Cards in 2x2 Grid ─── */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {citizenFeatures.map((item, idx) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.num}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: idx * 0.08 }}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`group relative p-4.5 sm:p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-[0_10px_30px_-8px_rgba(17,24,39,0.06)] hover:shadow-xl ${item.accentBorder} ${item.glowColor} transition-all duration-300 hover:-translate-y-1.5 cursor-default flex flex-col justify-between`}
                  >
                    <div>
                      {/* Top Row: Icon Container + Category Index */}
                      <div className="flex items-center justify-between mb-3.5">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs transition-transform duration-300 group-hover:scale-110 ${item.badgeColor}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 group-hover:text-[#138808] dark:group-hover:text-emerald-400 transition-colors">
                          {item.num}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xs sm:text-sm font-extrabold text-[#0f172a] dark:text-white group-hover:text-[#138808] dark:group-hover:text-emerald-400 transition-colors tracking-wide">
                        {item.title}
                      </h3>

                      {/* Description */}
                      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                        {item.desc}
                      </p>
                    </div>

                    {/* Bottom subtle accent line indicator */}
                    <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      <span className="group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Smart Civic Fabric</span>
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-[#138808] dark:text-emerald-400" />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Live Impact Statistics: Light Glass Dashboard Bar ───────────────── */}
        <div className="mt-10 lg:mt-12 rounded-3xl bg-white/92 dark:bg-slate-900/92 backdrop-blur-xl border border-emerald-500/25 dark:border-emerald-500/35 p-5 sm:p-6 lg:p-7 shadow-[0_16px_40px_-12px_rgba(19,136,8,0.10),0_4px_16px_-4px_rgba(15,23,42,0.04)] relative overflow-hidden">
          
          {/* Subtle Top Inner Edge Highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

          {/* Header Row: Live Indicator + Database Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#138808] dark:bg-emerald-400" />
              </span>
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#0f172a] dark:text-white">
                Live Impact Statistics
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                Real-Time Telemetry
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 px-3 py-1 rounded-full text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <Database className="w-3.5 h-3.5 text-[#138808] dark:text-emerald-400" />
              <span>Database Synced</span>
            </div>
          </div>

          {/* 3 Prominent Stat Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
            
            {/* 1. Reports Filed */}
            <div className="pt-2 sm:pt-0 sm:px-4 first:sm:pl-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Reports Filed
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-[#0f172a] dark:text-white leading-tight">
                {total}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Citywide total submissions
              </div>
            </div>

            {/* 2. In Progress */}
            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-2 w-2 rounded-full bg-[#FF9933] animate-pulse" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  In Progress
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-[#FF9933] leading-tight">
                {inProgress}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Crew dispatched & active
              </div>
            </div>

            {/* 3. Resolved */}
            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-2 w-2 rounded-full bg-[#138808]" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Resolved
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-[#138808] dark:text-emerald-400 leading-tight">
                {resolved}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Verified closed ({resolutionRate}% rate)
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}
