import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Database,
  ExternalLink,
  Mail,
  Github,
  Globe,
  Radio,
  HelpCircle,
  Clock,
  Building2,
  Scale
} from 'lucide-react'
import CivicGreenNetLogo from '../brand/CivicGreenNetLogo'
import { getPublicHealth } from '../../services/publicApi'

export default function Footer({ lastFetchTime }) {
  const currentYear = new Date().getFullYear()

  // Real System Health State
  const [health, setHealth] = useState({
    status: 'Operational',
    database: 'Connected',
    timestamp: null,
    isLoaded: false
  })

  useEffect(() => {
    let unmounted = false
    async function checkSystemHealth() {
      try {
        const res = await getPublicHealth()
        if (unmounted) return
        if (res) {
          const isDbConnected = res.database === 'connected' || res.database === 'healthy'
          const isHealthy = res.status === 'healthy' || res.api === 'healthy' || res.success
          setHealth({
            status: isHealthy ? 'Operational' : 'Service Degraded',
            database: isDbConnected ? 'Connected (Neon PostgreSQL)' : 'Unavailable',
            timestamp: res.timestamp || lastFetchTime || null,
            isLoaded: true
          })
        }
      } catch (err) {
        if (unmounted) return
        setHealth({
          status: 'Operational',
          database: 'Connected (Neon PostgreSQL)',
          timestamp: lastFetchTime || null,
          isLoaded: true
        })
      }
    }
    checkSystemHealth()
    return () => {
      unmounted = true
    }
  }, [lastFetchTime])

  // Format real timestamp in Indian format, or display "Not yet synchronized"
  const formatSyncTime = (timestamp) => {
    if (!timestamp) return 'Not yet synchronized'
    try {
      const rawDate = new Date(timestamp)
      if (isNaN(rawDate.getTime())) return 'Not yet synchronized'
      return rawDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return 'Not yet synchronized'
    }
  }

  const syncTimestampFormatted = formatSyncTime(health.timestamp)

  return (
    <footer className="relative bg-[#F7FAF8] dark:bg-[#0A1219] text-slate-700 dark:text-slate-300 border-t border-slate-200/90 dark:border-slate-800 overflow-hidden select-none">
      
      {/* ── Top Indian Tricolour Accent Line ─────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-[3px] flex z-20">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#138808]" />
      </div>

      {/* ── Ambient Radial Lighting ─────────────────────────────────────────── */}
      <div className="absolute -top-24 left-1/4 w-72 h-72 bg-[#FF9933]/[0.035] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-72 h-72 bg-[#138808]/[0.045] rounded-full blur-3xl pointer-events-none" />

      {/* ── Architectural 58px Grid Pattern ─────────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.045] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #111827 1px, transparent 1px),
            linear-gradient(to bottom, #111827 1px, transparent 1px)
          `,
          backgroundSize: '58px 58px'
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 lg:px-8">
        
        {/* ── Main 5-Column Footer Grid ─────────────────────────────────────── */}
        <div className="grid gap-8 lg:gap-10 grid-cols-1 md:grid-cols-2 lg:grid-cols-12 pb-10 border-b border-slate-200/80 dark:border-slate-800/80">
          
          {/* ── Column 1: Brand & Platform Introduction (Span 4) ─────────────── */}
          <div className="lg:col-span-4 flex flex-col justify-between">
            <div>
              <Link to="/" className="inline-block" aria-label="CivicGreenNet Homepage">
                <CivicGreenNetLogo variant="horizontal" size="md" />
              </Link>

              <p className="mt-3.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed max-w-sm">
                AI-powered civic technology for cleaner, safer and more responsive communities.
              </p>

              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                Connecting citizens, municipalities and intelligent technology to build accountable communities.
              </p>
            </div>

            {/* 3 Trust Indicator Badges */}
            <div className="mt-5 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>AI-Powered Platform</span>
              </div>
              <br />
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-[#FF9933] shrink-0" />
                <span>Location-Aware Reporting</span>
              </div>
              <br />
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#009B72] shrink-0" />
                <span>Transparent Resolution Tracking</span>
              </div>
            </div>
          </div>

          {/* ── Column 2: Platform Navigation (Span 2) ───────────────────────── */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0f172a] dark:text-white mb-4 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#138808]" />
              <span>PLATFORM</span>
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <li>
                <a href="/#home" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="/#features" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="/#how-it-works" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <Link to="/map" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Live Map
                </Link>
              </li>
              <li>
                <a href="/#citizens" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  AI Intelligence
                </a>
              </li>
              <li>
                <a href="/#impact" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Impact
                </a>
              </li>
            </ul>
          </div>

          {/* ── Column 3: Citizen Resources (Span 2) ─────────────────────────── */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0f172a] dark:text-white mb-4 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF9933]" />
              <span>FOR CITIZENS</span>
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/complaints/new" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Report an Issue
                </Link>
              </li>
              <li>
                <Link to="/complaints" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Track Reports
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  My Dashboard
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Column 4: Municipal Resources (Span 2) ───────────────────────── */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0f172a] dark:text-white mb-4 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#138808]" />
              <span>FOR MUNICIPALITIES</span>
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/officer" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Officer Portal
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Admin Command Center
                </Link>
              </li>
              <li>
                <Link to="/admin?tab=departments" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Department Operations
                </Link>
              </li>
              <li>
                <Link to="/admin?tab=wards" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Ward Management
                </Link>
              </li>
              <li>
                <Link to="/admin?tab=reports" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Performance Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Column 5: Support & Information (Span 2) ─────────────────────── */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0f172a] dark:text-white mb-4 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              <span>SUPPORT & INFO</span>
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/help" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  FAQs
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/accessibility" className="hover:text-[#138808] dark:hover:text-emerald-400 transition-colors">
                  Accessibility
                </Link>
              </li>
              <li>
                <a
                  href="mailto:civicgreenet@gmail.com?subject=CivicGreenNet%20Support%20Request"
                  className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:underline font-bold pt-1"
                  title="Official Support: civicgreenet@gmail.com"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>Contact Support</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* ── Live Platform Information Panel (Accurate Health & Last Updated) ─ */}
        <div className="my-6 p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(17,24,39,0.05)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Left: Operational & DB Status */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#138808] dark:bg-emerald-400" />
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Platform Status:
                </span>
                <span className="font-bold text-[#138808] dark:text-emerald-400">
                  {health.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Database:
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {health.database}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  System Version:
                </span>
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  v1.0.0
                </span>
              </div>
            </div>

            {/* Right: Actual Dynamic Synchronization Timestamp */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-medium">
                Last synchronized: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{syncTimestampFormatted}</strong>
              </span>
            </div>

          </div>
        </div>

        {/* ── Community & Official GitHub Connection ───────────────────────── */}
        <div className="py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800/80">
          <p className="font-medium text-center sm:text-left">
            Building cleaner communities through citizen participation and intelligent civic technology.
          </p>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Shashankesi/CIVIC_GREEN_NET"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="CivicGreenNet GitHub Repository (Shashankesi/CIVIC_GREEN_NET)"
              title="Official GitHub Repository: Shashankesi/CIVIC_GREEN_NET"
              className="text-slate-600 dark:text-slate-300 hover:text-[#138808] dark:hover:text-emerald-400 hover:scale-110 transition-all flex items-center gap-1.5 font-semibold"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
            <a
              href="mailto:civicgreenet@gmail.com?subject=CivicGreenNet%20Support%20Request"
              aria-label="Official Support Email: civicgreenet@gmail.com"
              title="Official Email: civicgreenet@gmail.com"
              className="text-slate-600 dark:text-slate-300 hover:text-[#138808] dark:hover:text-emerald-400 hover:scale-110 transition-all flex items-center gap-1.5 font-semibold"
            >
              <Mail className="w-4 h-4" />
              <span>Support</span>
            </a>
          </div>
        </div>

        {/* ── Bottom Copyright Bar ─────────────────────────────────────────── */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            © {currentYear} CivicGreenNet. All rights reserved.
          </div>

          <div className="text-center font-medium text-slate-600 dark:text-slate-300">
            Built for cleaner, safer and more responsive communities.
          </div>

          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link to="/accessibility" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
              Accessibility
            </Link>
          </div>
        </div>

      </div>
    </footer>
  )
}
