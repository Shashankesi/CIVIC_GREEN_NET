import React from 'react'
import {
  Image,
  Layers,
  AlertTriangle,
  CopyCheck,
  Navigation,
  Eye,
  Zap,
  Cpu,
  Sparkles,
  Activity
} from 'lucide-react'

export default function AICivicIntelligence() {
  const capabilities = [
    {
      id: '01',
      title: 'Image Analysis',
      badge: 'VISION ENGINE',
      description: 'Analyzes uploaded photographs to understand the reported civic issue and extract relevant visual information.',
      icon: Image,
      accentColor: '#FF9933',
      glowColor: 'rgba(255, 153, 51, 0.22)',
      iconBg: 'from-amber-500/20 via-orange-500/15 to-amber-500/5',
      iconBorder: 'border-orange-500/35 dark:border-orange-500/40',
      iconColor: 'text-[#FF9933] dark:text-amber-400',
      badgeBg: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25',
      topBar: 'from-[#FF9933] via-amber-400 to-orange-500',
      nodeRing: 'ring-orange-400/25 dark:ring-orange-400/30',
      colSpan: 'sm:col-span-2'
    },
    {
      id: '02',
      title: 'Category Detection',
      badge: 'AUTO CLASSIFIER',
      description: 'Identifies the appropriate civic issue category, such as road damage, waste accumulation, drainage, or streetlight problems.',
      icon: Layers,
      accentColor: '#138808',
      glowColor: 'rgba(19, 136, 8, 0.22)',
      iconBg: 'from-emerald-500/20 via-teal-500/15 to-emerald-500/5',
      iconBorder: 'border-emerald-500/35 dark:border-emerald-500/40',
      iconColor: 'text-[#138808] dark:text-emerald-400',
      badgeBg: 'bg-[#138808]/10 text-emerald-800 dark:text-emerald-300 border-[#138808]/25',
      topBar: 'from-[#138808] via-emerald-400 to-teal-400',
      nodeRing: 'ring-emerald-400/25 dark:ring-emerald-400/30',
      colSpan: 'sm:col-span-2'
    },
    {
      id: '03',
      title: 'Priority Assessment',
      badge: 'URGENCY SCORING',
      description: 'Evaluates complaint severity and urgency to help prioritize issues that require faster attention.',
      icon: AlertTriangle,
      accentColor: '#F97316',
      glowColor: 'rgba(249, 115, 22, 0.22)',
      iconBg: 'from-orange-500/20 via-amber-500/15 to-orange-500/5',
      iconBorder: 'border-amber-500/35 dark:border-amber-500/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25',
      topBar: 'from-amber-500 via-orange-500 to-amber-600',
      nodeRing: 'ring-amber-400/25 dark:ring-amber-400/30',
      colSpan: 'sm:col-span-2'
    },
    {
      id: '04',
      title: 'Duplicate Detection',
      badge: 'SIMILARITY MATCH',
      description: 'Identifies potentially similar reports to reduce duplicate complaints and improve complaint management.',
      icon: CopyCheck,
      accentColor: '#8B5CF6',
      glowColor: 'rgba(139, 92, 246, 0.24)',
      iconBg: 'from-purple-500/20 via-indigo-500/15 to-purple-500/5',
      iconBorder: 'border-purple-500/35 dark:border-purple-500/40',
      iconColor: 'text-purple-600 dark:text-purple-400',
      badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25',
      topBar: 'from-purple-600 via-indigo-500 to-blue-500',
      nodeRing: 'ring-purple-400/25 dark:ring-purple-400/30',
      colSpan: 'sm:col-span-3'
    },
    {
      id: '05',
      title: 'Department Routing',
      badge: 'MUNICIPAL DISPATCH',
      description: 'Supports routing complaints to the appropriate municipal department based on their category, priority, and location.',
      icon: Navigation,
      accentColor: '#009B72',
      glowColor: 'rgba(0, 155, 114, 0.24)',
      iconBg: 'from-teal-500/20 via-emerald-500/15 to-teal-500/5',
      iconBorder: 'border-teal-500/35 dark:border-teal-500/40',
      iconColor: 'text-teal-700 dark:text-teal-400',
      badgeBg: 'bg-teal-500/10 text-teal-800 dark:text-teal-300 border-teal-500/25',
      topBar: 'from-teal-500 via-emerald-500 to-[#138808]',
      nodeRing: 'ring-teal-400/25 dark:ring-teal-400/30',
      colSpan: 'sm:col-span-3'
    }
  ]

  const indicators = [
    { label: 'Image Understanding', icon: Eye, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-200/80 dark:border-blue-800/60' },
    { label: 'Smart Classification', icon: Layers, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-200/80 dark:border-emerald-800/60' },
    { label: 'Priority-Based Processing', icon: Zap, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-200/80 dark:border-amber-800/60' }
  ]

  return (
    <section
      id="ai-intelligence"
      className="ai-civic-intelligence relative py-16 sm:py-20 lg:py-24 border-b border-slate-200/80 dark:border-slate-800 overflow-visible"
      style={{
        backgroundColor: '#F3F8F5',
        backgroundImage: `
          linear-gradient(rgba(12, 90, 55, 0.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(12, 90, 55, 0.045) 1px, transparent 1px),
          radial-gradient(ellipse at 15% 20%, rgba(16, 185, 129, 0.08), transparent 45%),
          radial-gradient(ellipse at 85% 80%, rgba(255, 153, 51, 0.06), transparent 40%)
        `,
        backgroundSize: '58px 58px, 58px 58px, auto, auto'
      }}
    >
      {/* 1. Indian Tricolour Top Accent Line — Matching Live Geospatial Intelligence exactly */}
      <div className="absolute top-0 left-0 right-0 h-[3px] flex z-10 pointer-events-none">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#138808]" />
      </div>

      {/* 2. Soft Ambient Radial Illumination */}
      <div className="pointer-events-none absolute -top-24 left-1/4 w-[520px] h-[520px] bg-[#FF9933]/[0.07] rounded-full blur-[110px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 w-[520px] h-[520px] bg-[#138808]/[0.07] rounded-full blur-[110px]" aria-hidden="true" />

      {/* 3. Subtle Topographic Contour Overlay — Matching Live Geospatial Intelligence */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.035] dark:opacity-[0.055] select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="ai-topo-contours" width="600" height="400" patternUnits="userSpaceOnUse">
            <path
              d="M0,80 Q150,20 300,90 T600,60 M0,160 Q200,90 350,170 T600,140 M0,240 Q180,180 320,250 T600,220 M0,320 Q220,270 380,330 T600,300 M50,0 Q120,150 70,300 T90,400 M250,0 Q320,150 280,300 T300,400 M450,0 Q520,150 470,300 T500,400"
              fill="none"
              stroke="#138808"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ai-topo-contours)" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-10 xl:gap-14">

          {/* ======================================================== */}
          {/* LEFT COLUMN: Header, Overview, Civic Neural Pipeline     */}
          {/* ======================================================== */}
          <div className="lg:w-[41%] xl:w-[39%] mb-12 lg:mb-0">
            {/* Eyebrow Label Badge */}
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-extrabold tracking-widest text-[#138808] dark:text-emerald-400 uppercase bg-emerald-500/10 dark:bg-emerald-500/20 px-3.5 py-1.5 rounded-full border border-emerald-500/25 mb-3 shadow-xs backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#138808] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#138808]" />
              </span>
              <span>INTELLIGENT CIVIC TECHNOLOGY</span>
            </div>

            {/* Main Section Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-[#0f172a] dark:text-white leading-[1.16]">
              AI-Powered{' '}
              <span className="bg-gradient-to-r from-[#138808] via-emerald-600 to-[#009B72] dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-400 bg-clip-text text-transparent inline-block">
                Civic Intelligence
              </span>
            </h2>

            {/* Tricolour Accent Line */}
            <div className="flex items-center gap-1.5 my-3.5">
              <span className="h-1 w-6 rounded-full bg-[#FF9933]" />
              <span className="h-1 w-14 rounded-full bg-gradient-to-r from-[#FF9933] via-amber-300 to-[#138808]" />
              <span className="h-1 w-6 rounded-full bg-[#138808]" />
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Our intelligent system analyzes civic complaints to understand reported issues, identify categories, assess urgency, detect potential duplicates, and support accurate departmental routing.
            </p>

            {/* ======================================================== */}
            {/* Civic Neural Pipeline Panel — Full Unclipped Visibility   */}
            {/* ======================================================== */}
            <div className="telemetry-pipeline mt-7 relative rounded-2xl bg-white/92 dark:bg-slate-900/92 backdrop-blur-xl border border-emerald-500/30 dark:border-emerald-500/40 p-6 sm:p-7 shadow-[0_16px_40px_-12px_rgba(19,136,8,0.14),0_4px_16px_-4px_rgba(15,23,42,0.04),inset_0_1px_1.5px_rgba(255,255,255,0.95)] dark:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.55),inset_0_1px_1.5px_rgba(255,255,255,0.1)] overflow-visible group">
              {/* Internal ambient illumination */}
              <div
                className="pointer-events-none absolute top-0 right-0 h-44 w-44 rounded-full bg-gradient-to-bl from-emerald-500/12 via-teal-400/6 to-transparent blur-2xl"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-gradient-to-tr from-[#FF9933]/8 to-transparent blur-xl"
                aria-hidden="true"
              />

              {/* Top Accent Header: Active Telemetry Pipeline badge & 24/7 LIVE */}
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/12 dark:bg-emerald-500/20 border border-emerald-500/25 text-[10px] font-bold tracking-wider text-emerald-800 dark:text-emerald-300 uppercase shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 dark:bg-emerald-400" />
                  </span>
                  <span>ACTIVE TELEMETRY PIPELINE</span>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700">
                  <Activity className="h-3 w-3 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                  <span>24/7 LIVE</span>
                </div>
              </div>

              {/* Central Processor Block */}
              <div className="relative flex items-center gap-4">
                {/* 3D Deep Navy / Dark Emerald Processor Icon */}
                <div className="relative shrink-0">
                  <div
                    className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-emerald-500/35 via-[#138808]/25 to-teal-400/35 blur-xs animate-pulse pointer-events-none"
                    aria-hidden="true"
                  />
                  <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#061811] via-[#0A261B] to-[#04120D] text-white shadow-[0_10px_24px_-4px_rgba(19,136,8,0.4),inset_0_1px_2px_rgba(52,211,153,0.35)] border border-emerald-500/40">
                    <Cpu className="h-7 w-7 text-emerald-400 drop-shadow-[0_2px_8px_rgba(16,185,129,0.5)]" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Civic Neural Pipeline
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-snug">
                    Continuous automated processing & departmental decision support
                  </p>
                </div>
              </div>

              {/* Live Citizen Workflow Status & Stages */}
              <div className="mt-4 pt-3.5 border-t border-slate-200/70 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <Sparkles className="h-3 w-3 text-[#FF9933]" />
                    <span>Real-Time Citizen Workflow</span>
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-bold">
                    HEALTH: OPTIMAL
                  </span>
                </div>

                {/* 3 Pipeline Stages */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="px-2 py-1.5 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-500/25 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                    Ingest & Parse
                  </div>
                  <div className="px-2 py-1.5 rounded-lg bg-amber-50/90 dark:bg-amber-950/40 border border-amber-500/25 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                    Classify & Prioritize
                  </div>
                  <div className="px-2 py-1.5 rounded-lg bg-teal-50/90 dark:bg-teal-950/40 border border-teal-500/25 text-[10px] font-bold text-teal-800 dark:text-teal-300">
                    Route to Ward
                  </div>
                </div>
              </div>

              {/* Three Capability Indicator Tags — Generously Padded & Fully Visible */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-2">
                {indicators.map((ind) => {
                  const IndIcon = ind.icon
                  return (
                    <div
                      key={ind.label}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${ind.bg} border text-[11px] font-bold text-slate-800 dark:text-slate-200 shadow-2xs transition-transform hover:scale-102`}
                    >
                      <IndIcon className={`h-3.5 w-3.5 ${ind.color}`} />
                      <span>{ind.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: Five 3D AI Intelligence Feature Cards      */}
          {/* ======================================================== */}
          <div className="lg:w-[59%] xl:w-[61%]">
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3.5 xl:gap-4 items-stretch">
              {capabilities.map((cap) => {
                const Icon = cap.icon
                return (
                  <div
                    key={cap.id}
                    className={`group relative flex flex-col ${cap.colSpan} transition-all duration-300`}
                    style={{ perspective: 1000 }}
                  >
                    {/* Soft ambient aura blooming on card hover */}
                    <div
                      className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10 pointer-events-none"
                      style={{ background: cap.glowColor }}
                      aria-hidden="true"
                    />

                    {/* 3D Elevated Card Body with Glassmorphism */}
                    <div className="relative flex-1 flex flex-col justify-between p-5 sm:p-5.5 rounded-2xl bg-white/92 dark:bg-slate-900/92 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.08),0_4px_12px_-2px_rgba(15,23,42,0.03),inset_0_1px_1.5px_rgba(255,255,255,0.95)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.12)] group-hover:shadow-[0_22px_48px_-10px_rgba(15,23,42,0.16),0_8px_20px_-4px_rgba(15,23,42,0.06)] group-hover:-translate-y-1.5 group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-all duration-300">
                      
                      {/* Top colored accent line */}
                      <div className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${cap.topBar}`} />

                      <div>
                        {/* Header Row: 3D Icon Container + Badge */}
                        <div className="flex items-start justify-between gap-2 mb-3.5">
                          {/* 3D Sculpted Icon Container */}
                          <div
                            className={`relative flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-xl bg-gradient-to-br ${cap.iconBg} border ${cap.iconBorder} shadow-[0_6px_16px_-2px_rgba(0,0,0,0.08),inset_0_1px_1.5px_rgba(255,255,255,0.9)] dark:shadow-[0_6px_16px_-2px_rgba(0,0,0,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.15)] ring-2 ${cap.nodeRing} group-hover:scale-108 group-hover:rotate-1 transition-all duration-300`}
                          >
                            <Icon className={`h-6 w-6 ${cap.iconColor} drop-shadow-xs`} />
                          </div>

                          {/* Feature Badge */}
                          <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${cap.badgeBg} shadow-2xs`}>
                            {cap.badge}
                          </span>
                        </div>

                        {/* Feature Heading */}
                        <h3 className="text-base sm:text-lg font-extrabold text-[#0f172a] dark:text-white tracking-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {cap.title}
                        </h3>

                        {/* Feature Description */}
                        <p className="mt-1.5 text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                          {cap.description}
                        </p>
                      </div>

                      {/* Bottom Decorative Indicator & Engine ID */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          <span
                            className="h-2 w-2 rounded-full animate-pulse"
                            style={{ backgroundColor: cap.accentColor }}
                          />
                          Active Engine
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700">
                          ID: {cap.id}
                        </span>
                      </div>
                    </div>
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
