import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Camera,
  Brain,
  Navigation,
  Activity,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from 'lucide-react'

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(null)

  const steps = [
    {
      step: '01',
      title: 'Report an Issue',
      badgeText: 'CITIZEN REPORT',
      description: 'Citizens upload a photo, provide the issue description, and share their precise GPS location.',
      icon: Camera,
      accentColor: '#FF9933',
      glowColor: 'rgba(255, 153, 51, 0.28)',
      iconBg: 'from-orange-500/15 via-amber-500/10 to-orange-500/5',
      iconBorder: 'border-orange-500/35',
      iconColor: 'text-[#FF9933]',
      badgeBg: 'bg-orange-500/10 text-[#FF9933] border-orange-500/25',
      topBar: 'from-[#FF9933] to-amber-500',
      nodeRing: 'ring-orange-400/30'
    },
    {
      step: '02',
      title: 'AI-Powered Analysis',
      badgeText: 'AI INTELLIGENCE',
      isAi: true,
      description: 'AI analyzes uploaded images and descriptions to identify complaint categories, assess priority, detect potential duplicate reports, and generate concise summaries for faster processing.',
      icon: Brain,
      accentColor: '#8B5CF6',
      glowColor: 'rgba(139, 92, 246, 0.28)',
      iconBg: 'from-purple-500/15 via-indigo-500/10 to-emerald-500/5',
      iconBorder: 'border-purple-500/35',
      iconColor: 'text-purple-600 dark:text-purple-400',
      badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
      topBar: 'from-purple-600 via-indigo-500 to-emerald-500',
      nodeRing: 'ring-purple-400/30'
    },
    {
      step: '03',
      title: 'Smart Routing',
      badgeText: 'AUTOMATED ROUTE',
      description: 'Based on the issue category, priority, and location, complaints are routed to the appropriate municipal department and responsible ward.',
      icon: Navigation,
      accentColor: '#F59E0B',
      glowColor: 'rgba(245, 158, 11, 0.25)',
      iconBg: 'from-amber-500/15 via-orange-500/10 to-amber-500/5',
      iconBorder: 'border-amber-500/35',
      iconColor: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
      topBar: 'from-amber-500 to-orange-500',
      nodeRing: 'ring-amber-400/30'
    },
    {
      step: '04',
      title: 'Track Resolution',
      badgeText: 'SLA TRACKING',
      description: 'Citizens and municipal administrators monitor complaint progress through real-time status updates and SLA tracking.',
      icon: Activity,
      accentColor: '#10B981',
      glowColor: 'rgba(16, 185, 129, 0.25)',
      iconBg: 'from-emerald-500/15 via-teal-500/10 to-emerald-500/5',
      iconBorder: 'border-emerald-500/35',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
      topBar: 'from-emerald-500 to-teal-500',
      nodeRing: 'ring-emerald-400/30'
    },
    {
      step: '05',
      title: 'Citizen Verification',
      badgeText: 'COMMUNITY TRUST',
      description: 'Citizens receive resolution updates and can verify the completed work or request a review if necessary.',
      icon: ShieldCheck,
      accentColor: '#138808',
      glowColor: 'rgba(19, 136, 8, 0.28)',
      iconBg: 'from-[#138808]/15 via-emerald-500/10 to-[#138808]/5',
      iconBorder: 'border-[#138808]/35',
      iconColor: 'text-[#138808] dark:text-emerald-400',
      badgeBg: 'bg-[#138808]/10 text-[#138808] dark:text-emerald-400 border-[#138808]/25',
      topBar: 'from-[#138808] to-emerald-600',
      nodeRing: 'ring-emerald-500/30'
    }
  ]

  return (
    <section
      id="how-it-works"
      className="how-civic-green-net-works relative pt-4 sm:pt-6 lg:pt-8 pb-12 sm:pb-16 bg-transparent overflow-hidden"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* ======================================================== */}
        {/* SECTION HEADER — CENTER ALIGNED WITH TRANSLUCENT AURA     */}
        {/* ======================================================== */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 relative z-10">
          {/* Eyebrow Label badge */}
          <div className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-bold tracking-widest text-[#FF9933] uppercase bg-orange-500/10 dark:bg-orange-500/20 px-3.5 py-1 rounded-full border border-orange-500/25 mb-2.5 shadow-xs backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF9933] animate-pulse" />
            <span>SIMPLE & TRANSPARENT</span>
          </div>

          <div className="text-[10px] sm:text-[11px] font-extrabold tracking-widest text-slate-500 dark:text-slate-400 uppercase mb-1.5 px-2">
            FIVE-STAGE CIVIC RESOLUTION WORKFLOW
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#0B1528] dark:text-white leading-tight">
            How CivicGreenNet <span className="text-[#138808] dark:text-emerald-400">Works</span>
          </h2>

          {/* Tricolour gradient underline */}
          <div className="flex items-center justify-center gap-1.5 mt-3.5 mb-3.5">
            <span className="h-1 w-6 rounded-full bg-[#FF9933]" />
            <span className="h-1 w-16 rounded-full bg-gradient-to-r from-[#FF9933] via-amber-300 to-[#138808]" />
            <span className="h-1 w-6 rounded-full bg-[#138808]" />
          </div>

          {/* Subtitle with soft frosted backing for readability */}
          <div className="inline-block px-4 py-1.5 rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs border border-white/60 dark:border-slate-800/60 max-w-2xl mx-auto">
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              From reporting an issue to final resolution, AI and real-time tracking ensure faster and more accountable civic action.
            </p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DESKTOP (lg+): CONTINUOUS CONNECTED TIMELINE + 5 CARDS   */}
        {/* ======================================================== */}
        <div className="hidden lg:block relative pt-8 pb-4">
          
          {/* Continuous Horizontal Gradient Timeline Track */}
          {/* Spans from center of Card 1 (10%) to center of Card 5 (90%) */}
          <div className="absolute top-[20px] left-[10%] right-[10%] h-[3.5px] z-0 pointer-events-none">
            {/* Ambient blurred glow line */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF9933] via-[#8B5CF6] via-[#F59E0B] via-[#10B981] to-[#138808] blur-xs opacity-80" />
            {/* Crisp 3D core line */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF9933] via-[#8B5CF6] via-[#F59E0B] via-[#10B981] to-[#138808] rounded-full shadow-xs" />
            
            {/* Animated travelling light pulse */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 h-4 w-32 -ml-16 rounded-full bg-gradient-to-r from-transparent via-white to-transparent blur-[2px]"
              animate={{ left: ['0%', '100%'] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          {/* 5 Cards Grid in One Consistent Horizontal Row */}
          <div className="grid grid-cols-5 gap-4 xl:gap-5 relative z-10 items-stretch">
            {steps.map((step, idx) => {
              const Icon = step.icon
              const isHovered = activeStep === step.step

              return (
                <div
                  key={step.step}
                  onMouseEnter={() => setActiveStep(step.step)}
                  onMouseLeave={() => setActiveStep(null)}
                  className="group relative flex flex-col pt-5"
                  style={{ perspective: 1000 }}
                >
                  {/* ===================================================== */}
                  {/* STAGE NUMBER BADGE & VERTICAL CONNECTOR STEM          */}
                  {/* ===================================================== */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
                    {/* Circular Stage Number Node */}
                    <div
                      className={`flex items-center justify-center h-10 w-10 rounded-full font-mono font-black text-xs transition-all duration-300 shadow-md ${
                        isHovered
                          ? 'bg-white dark:bg-slate-800 scale-115 ring-4'
                          : 'bg-white/95 dark:bg-slate-800/95 ring-3 ring-white dark:ring-slate-900 text-slate-800 dark:text-slate-100'
                      }`}
                      style={{
                        borderColor: step.accentColor,
                        borderWidth: '2px',
                        color: isHovered ? step.accentColor : undefined,
                        boxShadow: isHovered ? `0 0 16px ${step.glowColor}` : undefined
                      }}
                    >
                      {step.step}
                    </div>

                    {/* Vertical Connector Stem leading naturally into upper card edge */}
                    <div
                      className={`w-[2.5px] h-3.5 transition-colors duration-300 ${
                        isHovered ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      style={{
                        backgroundColor: isHovered ? step.accentColor : undefined
                      }}
                    />
                  </div>

                  {/* Soft ambient bloom behind card on hover */}
                  <div
                    className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10 pointer-events-none"
                    style={{ background: step.glowColor }}
                    aria-hidden="true"
                  />

                  {/* ===================================================== */}
                  {/* 3D ELEVATED GLASS CARD BODY — CONSISTENT HEIGHT       */}
                  {/* ===================================================== */}
                  <div
                    className={`relative flex-1 flex flex-col items-center text-center p-5 xl:p-6 rounded-2xl bg-white/92 dark:bg-slate-900/92 backdrop-blur-xl border border-white/90 dark:border-slate-800/90 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.1),0_4px_12px_-2px_rgba(15,23,42,0.03)] transition-all duration-300 ${
                      isHovered
                        ? '-translate-y-2.5 shadow-[0_22px_44px_-10px_rgba(15,23,42,0.18),0_8px_20px_-4px_rgba(15,23,42,0.08)] border-slate-300 dark:border-slate-700'
                        : ''
                    }`}
                  >
                    {/* Top colored accent line */}
                    <div className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${step.topBar}`} />

                    {/* Elevated 3D Icon Container */}
                    <div className="relative mt-2 mb-3.5 group-hover:scale-108 transition-transform duration-300">
                      <div
                        className="absolute inset-0 rounded-2xl blur-md opacity-30 group-hover:opacity-80 transition-opacity duration-300"
                        style={{ background: step.glowColor }}
                      />
                      <div className={`relative flex h-14 w-14 xl:h-16 xl:w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${step.iconBg} border ${step.iconBorder} shadow-[0_8px_18px_-4px_rgba(0,0,0,0.1),inset_0_1px_1.5px_rgba(255,255,255,0.9)] dark:shadow-[0_8px_18px_-4px_rgba(0,0,0,0.4),inset_0_1px_1.5px_rgba(255,255,255,0.15)] ring-3 ${step.nodeRing}`}>
                        <Icon className={`h-6 w-6 xl:h-7 xl:w-7 ${step.iconColor} drop-shadow-xs`} />
                        {step.isAi && (
                          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-purple-500" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Standardized Stage Badge */}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${step.badgeBg} mb-2`}>
                      {step.isAi && <Sparkles className="h-2.5 w-2.5" />}
                      {step.badgeText}
                    </span>

                    {/* Step Title — Consistent Height Baseline */}
                    <h3 className="text-base font-extrabold text-[#0B1528] dark:text-white tracking-tight min-h-[28px] flex items-center justify-center">
                      {step.title}
                    </h3>

                    {/* Step Description */}
                    <p className="mt-2 text-xs xl:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal flex-1">
                      {step.description}
                    </p>

                    {/* Bottom Step Indicator Pill */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 w-full flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                      <span>STAGE {step.step}</span>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: step.accentColor }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* MOBILE & TABLET (< lg): CONNECTED VERTICAL TIMELINE      */}
        {/* ======================================================== */}
        <div className="lg:hidden relative pl-8 sm:pl-12 space-y-6 sm:space-y-7 my-4">
          
          {/* Continuous Vertical Gradient Timeline Line */}
          <div className="absolute left-[18px] sm:left-[26px] top-6 bottom-6 w-[3px] bg-gradient-to-b from-[#FF9933] via-[#8B5CF6] via-[#F59E0B] via-[#10B981] to-[#138808] rounded-full shadow-xs" />

          {steps.map((step) => {
            const Icon = step.icon
            return (
              <div key={step.step} className="relative group">
                
                {/* Numbered Stage Badge Node on the Vertical Timeline */}
                <div
                  className="absolute -left-[32px] sm:-left-[44px] top-5 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 border-2 shadow-md z-10 ring-4 ring-white/95 dark:ring-slate-900 font-mono font-black text-xs text-slate-900 dark:text-white"
                  style={{ borderColor: step.accentColor }}
                >
                  {step.step}
                </div>

                {/* Horizontal branch connector from node into card */}
                <div
                  className="absolute -left-[8px] sm:-left-[14px] top-9 h-[2px] w-[14px] sm:w-[20px] bg-slate-300 dark:bg-slate-700 z-0"
                  style={{ backgroundColor: step.accentColor }}
                />

                {/* 3D Elevated Card Body */}
                <div className="relative p-5 sm:p-6 rounded-2xl bg-white/92 dark:bg-slate-900/92 backdrop-blur-xl border border-white/90 dark:border-slate-800 shadow-md">
                  {/* Top colored accent line */}
                  <div className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${step.topBar}`} />

                  {/* Header Row: Badge & Stage Info */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${step.badgeBg}`}>
                      {step.isAi && <Sparkles className="h-2.5 w-2.5" />}
                      {step.badgeText}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: step.accentColor }} />
                      <span>STAGE {step.step}</span>
                    </div>
                  </div>

                  {/* Title & Icon Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${step.iconBg} border ${step.iconBorder}`}>
                      <Icon className={`h-5 w-5 ${step.iconColor}`} />
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-[#0B1528] dark:text-white tracking-tight">
                      {step.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* ======================================================== */}
        {/* SUBTLE BOTTOM CAPTION — CONNECTED CIVIC GOVERNANCE       */}
        {/* ======================================================== */}
        <div className="mt-8 sm:mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-[#138808] animate-pulse" />
            <span>From citizen reporting to verified resolution — every stage is transparent and trackable.</span>
          </div>
        </div>

      </div>
    </section>
  )
}
