import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Sparkles, ShieldCheck, TrendingUp, Sun, Moon, ArrowLeft } from 'lucide-react'
import CivicGreenNetLogo from './brand/CivicGreenNetLogo'
import ThemeContext from '../context/ThemeContext'

const BRAND_FEATURES = [
  {
    icon: MapPin,
    title: 'Location-Aware Reporting',
    description: 'Report civic issues in seconds from anywhere.'
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Classification',
    description: 'Intelligent issue identification, severity assessment and department assignment.'
  },
  {
    icon: TrendingUp,
    title: 'Transparent Resolution Tracking',
    description: 'Track complaint progress and municipal action in real time.'
  },
  {
    icon: ShieldCheck,
    title: 'Secure Civic Governance',
    description: 'Privacy-conscious reporting and role-based access for citizens and officials.'
  }
]

export default function AuthLayout({
  children,
  title = 'Welcome Back',
  subtitle = 'Sign in to track your civic issues and stay updated.',
  badge = null,
  headerExtra = null,
  cardMaxWidth = 'max-w-[480px]',
  showFeatures = true,
  leftDescription = 'Join CivicGreenNet and help connect citizens, municipalities and intelligent technology to build cleaner, safer and more accountable communities.'
}) {
  const { dark, setDark } = useContext(ThemeContext)

  return (
    <div className="auth-page flex min-h-screen flex-col lg:flex-row relative selection:bg-emerald-500 selection:text-white">
      {/* Ambient background lighting accents */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 h-[440px] w-[440px] rounded-full bg-[#FF922B]/[0.05] blur-[100px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 h-[520px] w-[520px] rounded-full bg-[#078B24]/[0.06] blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/3 -translate-y-1/2 h-[380px] w-[380px] rounded-full bg-emerald-500/[0.04] blur-[90px]"
        aria-hidden="true"
      />

      {/* ── Left Branding Panel (Desktop & Tablet) ─────────────────────────── */}
      <div className="auth-panel-mint relative hidden w-full lg:flex lg:w-[45%] xl:w-[42%] lg:sticky lg:top-0 lg:h-screen lg:self-start lg:flex-col lg:justify-between p-8 sm:p-10 lg:p-12 xl:p-14 border-r border-emerald-900/10 dark:border-emerald-950/40 shrink-0 overflow-hidden">
        {/* Subtle decorative glows within left panel */}
        <div
          className="pointer-events-none absolute -top-12 -left-12 h-64 w-64 rounded-full bg-[#FF922B]/[0.07] blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-12 right-0 h-72 w-72 rounded-full bg-[#078B24]/[0.08] blur-3xl"
          aria-hidden="true"
        />

        {/* Top: Logo with navigation back to home */}
        <div className="relative z-10">
          <Link
            to="/"
            className="group inline-flex items-center transition-transform hover:scale-[1.01]"
            title="Return to CivicGreenNet Homepage"
          >
            <CivicGreenNetLogo
              variant="horizontal"
              size="lg"
              descriptor="CIVIC TECH PLATFORM"
              theme="auto"
            />
          </Link>
        </div>

        {/* Center: Branding & Platform Features */}
        <div className="relative z-10 max-w-lg my-auto py-6">
          {/* Badge: AI-POWERED CIVIC PLATFORM */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-600/25 bg-emerald-600/10 dark:bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-900 dark:text-emerald-300 shadow-xs backdrop-blur-xs"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#078B24] dark:bg-emerald-400 animate-pulse" />
            <Sparkles className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span className="tracking-wider uppercase text-[10.5px]">AI-POWERED CIVIC PLATFORM</span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-2xl sm:text-3xl xl:text-[32px] font-extrabold leading-[1.25] text-[#111827] dark:text-white tracking-tight"
          >
            Build smarter, cleaner and more responsive communities.
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-3 text-sm sm:text-base leading-relaxed text-[#64748B] dark:text-slate-300"
          >
            {leftDescription}
          </motion.p>

          {/* Subtle Indian Tricolour Decorative Accent */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="origin-left w-32 h-[3.5px] rounded-full flex overflow-hidden my-5 shadow-xs"
            aria-hidden="true"
          >
            <div className="w-1/3 bg-[#FF922B]" />
            <div className="w-1/3 bg-white dark:bg-slate-300" />
            <div className="w-1/3 bg-[#078B24]" />
          </motion.div>

          {/* Four Feature Highlights */}
          {showFeatures && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              className="space-y-2.5"
            >
              {BRAND_FEATURES.map((feature) => {
                const IconComponent = feature.icon
                return (
                  <div
                    key={feature.title}
                    className="group flex items-start gap-3 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-emerald-900/10 dark:border-emerald-500/15 shadow-xs backdrop-blur-xs transition-all duration-200 hover:border-emerald-500/40 hover:bg-white dark:hover:bg-slate-900"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-[#078B24] dark:text-emerald-400 group-hover:scale-105 transition-transform">
                      <IconComponent className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs sm:text-[13px] font-bold text-[#111827] dark:text-white leading-tight">
                        {feature.title}
                      </h3>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-300 leading-normal mt-0.5">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}
        </div>

        {/* Bottom Copyright */}
        <div className="relative z-10 text-xs text-[#64748B] dark:text-slate-400 pt-3 border-t border-emerald-900/10 dark:border-emerald-950/40">
          © {new Date().getFullYear()} CivicGreenNet. Building better communities through technology.
        </div>
      </div>

      {/* ── Right Form Panel (Single Global Scroll) ───────────────────────── */}
      <div className="auth-form-container relative z-10 flex w-full flex-1 flex-col justify-between p-4 sm:p-8 lg:p-10 xl:p-12 min-h-screen">
        {/* Top bar with mobile branding, back link and theme toggle */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center lg:hidden" title="CivicGreenNet Home">
            <CivicGreenNetLogo variant="horizontal" size="sm" descriptor="CIVIC TECH PLATFORM" />
          </Link>

          <Link
            to="/"
            className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#078B24] dark:text-slate-300 dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to homepage
          </Link>

          {/* Theme switcher */}
          <button
            onClick={() => setDark(!dark)}
            type="button"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-[#64748B] shadow-xs hover:border-emerald-500/40 hover:bg-white hover:text-[#078B24] dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-400 transition-all"
          >
            {dark ? (
              <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-[#64748B]" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Centered Form Card */}
        <div className={`mx-auto flex w-full ${cardMaxWidth} flex-1 flex-col justify-center my-6 sm:my-8`}>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative rounded-2xl bg-white dark:bg-[#111C2D] border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-emerald-950/[0.04] p-6 sm:p-8 lg:p-9"
          >
            {/* Indian tricolor top border accent line */}
            <div className="absolute top-0 inset-x-0 h-[3px] flex rounded-t-2xl overflow-hidden" aria-hidden="true">
              <div className="w-1/3 bg-[#FF922B]" />
              <div className="w-1/3 bg-white dark:bg-slate-300" />
              <div className="w-1/3 bg-[#078B24]" />
            </div>

            {/* Status Badge if provided */}
            {badge && (
              <div className="mb-2">
                {typeof badge === 'string' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 text-2xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF922B] animate-pulse" />
                    {badge}
                  </span>
                ) : (
                  badge
                )}
              </div>
            )}

            {/* Header & Extra info */}
            {title && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white">
                  {title}
                </h2>
                {headerExtra}
              </div>
            )}
            {subtitle && (
              <p className="mt-2 text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
                {subtitle}
              </p>
            )}

            {/* Form Content */}
            <div className="mt-6 sm:mt-7">{children}</div>
          </motion.div>
        </div>

        {/* Bottom security assurance */}
        <div className="text-center text-[11px] text-[#64748B] dark:text-slate-400 py-2">
          Protected by 256-bit encrypted authentication & municipal SLA standards.
        </div>
      </div>
    </div>
  )
}
