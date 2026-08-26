import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, MapPin, TrendingUp, ShieldCheck, Bell, BarChart3, Building2,
  FileText, Search, AlertTriangle, CheckCircle2, ArrowRight, ChevronRight,
  Clock, Landmark, Users, RefreshCw, Layers, Filter, Check, Eye, HelpCircle,
  Activity, ShieldAlert, Cpu, ArrowUpRight, CheckCircle, Smartphone
} from 'lucide-react'
import CivicGreenNetLogo from '../components/brand/CivicGreenNetLogo'
import Navbar from '../components/Navbar'
import AuthContext from '../context/AuthContext'
import ThemeContext from '../context/ThemeContext'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import AIBadge from '../ui/AIBadge'
import StatusBadge from '../ui/StatusBadge'
import MapView from '../components/MapView'
import { faqs, aiFeatureList, workflowSteps } from '../data/landing'
import publicApi from '../services/publicApi'

// ─── Animation Helper ────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Relative Time Formatter ─────────────────────────────────────────────────
function formatRelativeTime(dateString) {
  if (!dateString) return 'recently'
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

// ─── Category Icon/Color Mapping ─────────────────────────────────────────────
function getCategoryColor(category) {
  const cat = (category || '').toLowerCase()
  if (cat.includes('road') || cat.includes('pothole')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  if (cat.includes('sanitat') || cat.includes('garbage') || cat.includes('waste')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  if (cat.includes('water') || cat.includes('drain')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  if (cat.includes('light') || cat.includes('electr')) return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
  if (cat.includes('park') || cat.includes('tree')) return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
  if (cat.includes('safety') || cat.includes('traffic')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
  return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
}

// ─── FAQ Accordion Item ──────────────────────────────────────────────────────
function FaqItem({ q, a, id }) {
  const [open, setOpen] = useState(false)
  const itemKey = `faq-item-${id}`

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900/60 overflow-hidden transition-colors shadow-2xs">
      <button
        className="flex w-full items-center justify-between px-6 py-4.5 text-left transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={itemKey}
      >
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 pr-4">{q}</span>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : ''}`}>
          <ChevronRight className="h-4 w-4 rotate-90" aria-hidden="true" />
        </span>
      </button>
      <div
        id={itemKey}
        role="region"
        className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-6 pb-5 pt-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800/60 dark:text-slate-400">
            {a}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Hero Visual Interactive Component ───────────────────────────────────────
function HeroVisual({ stats, loadingStats }) {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      {/* Decorative ambient gradients */}
      <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-indigo-500/20 blur-xl opacity-75 dark:opacity-50" />

      <div className="relative rounded-3xl border border-slate-200/90 bg-white/90 p-4 shadow-xl backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-900/90">
        {/* Map Header bar */}
        <div className="mb-3 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">Live Civic Map Preview</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {loadingStats ? 'Querying...' : `${stats?.totalReports || 0} Reports Mapped`}
          </span>
        </div>

        {/* Embedded Live Map */}
        <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-slate-200/80 shadow-inner dark:border-slate-800">
          <MapView preview={true} height={288} showLegend={false} showControls={false} />
          
          {/* Top-left live badge overlay */}
          <div className="absolute top-3 left-3 z-[999] flex items-center gap-1.5 rounded-xl bg-slate-900/85 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-md">
            <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
            <span>{stats?.openReports != null ? `${stats.openReports} Active Issues` : 'Live Operations'}</span>
            <span className="text-slate-400">•</span>
            <span className="text-emerald-400">{stats?.resolvedReports || 0} Resolved</span>
          </div>

          {/* Bottom-right quick navigation button */}
          <Link
            to="/map"
            className="absolute bottom-3 right-3 z-[999] inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-md transition-all hover:bg-slate-50 hover:scale-105 dark:bg-slate-800/95 dark:text-white dark:hover:bg-slate-700"
          >
            <span>Open Full Map</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Floating AI Routing Showcase Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-3 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-3.5 shadow-xs dark:border-indigo-950/60 dark:from-slate-800/80 dark:to-slate-900/80"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AIBadge>AI Civic Intelligence</AIBadge>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Live Workflow</span>
            </div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">96% Accuracy</span>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-white/80 p-2 border border-slate-200/50 dark:bg-slate-800/60 dark:border-slate-700/50">
              <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Classification</div>
              <div className="font-bold text-slate-900 dark:text-white truncate">Roads & Sanitation</div>
            </div>
            <div className="rounded-xl bg-white/80 p-2 border border-slate-200/50 dark:bg-slate-800/60 dark:border-slate-700/50">
              <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Urgency</div>
              <div className="font-bold text-amber-600 dark:text-amber-400">High Priority</div>
            </div>
            <div className="rounded-xl bg-white/80 p-2 border border-slate-200/50 dark:bg-slate-800/60 dark:border-slate-700/50">
              <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Routing</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400">Ward Inspector</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ─── MAIN LANDING PAGE COMPONENT ─────────────────────────────────────────────
export default function Landing() {
  const { user } = useContext(AuthContext)
  const { dark } = useContext(ThemeContext)
  const navigate = useNavigate()

  // ---- State management for real PostgreSQL data ----
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState(false)
  const [lastStatsFetchTime, setLastStatsFetchTime] = useState(null)
  const [secondsAgo, setSecondsAgo] = useState(0)

  const [activity, setActivity] = useState([])
  const [loadingActivity, setLoadingActivity] = useState(true)
  const [activityError, setActivityError] = useState(false)

  const [recentReports, setRecentReports] = useState([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [recentError, setRecentError] = useState(false)

  const [categoriesData, setCategoriesData] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const [impactData, setImpactData] = useState(null)
  const [loadingImpact, setLoadingImpact] = useState(true)

  // Map section category & status filter state
  const [selectedMapCategory, setSelectedMapCategory] = useState('all')
  const [selectedMapStatus, setSelectedMapStatus] = useState('all')

  // ---- Data Fetching with AbortController ----
  const loadAllPublicData = useCallback(async (signal = null) => {
    // 1. Fetch Public Stats
    try {
      setLoadingStats(true)
      setStatsError(false)
      const s = await publicApi.getPublicStats(signal)
      if (s) {
        setStats(s)
        setLastStatsFetchTime(Date.now())
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('Failed to load public stats:', err)
        setStatsError(true)
      }
    } finally {
      setLoadingStats(false)
    }

    // 2. Fetch Live Activity
    try {
      setLoadingActivity(true)
      setActivityError(false)
      const a = await publicApi.getPublicActivity(6, signal)
      if (Array.isArray(a)) {
        setActivity(a)
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('Failed to load public activity:', err)
        setActivityError(true)
      }
    } finally {
      setLoadingActivity(false)
    }

    // 3. Fetch Recent Reports
    try {
      setLoadingRecent(true)
      setRecentError(false)
      const r = await publicApi.getPublicRecent(6, signal)
      if (Array.isArray(r)) {
        setRecentReports(r)
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('Failed to load recent reports:', err)
        setRecentError(true)
      }
    } finally {
      setLoadingRecent(false)
    }

    // 4. Fetch Category Aggregations
    try {
      setLoadingCategories(true)
      const c = await publicApi.getPublicCategories(signal)
      if (Array.isArray(c)) {
        setCategoriesData(c)
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('Failed to load categories:', err)
      }
    } finally {
      setLoadingCategories(false)
    }

    // 5. Fetch Impact Data
    try {
      setLoadingImpact(true)
      const i = await publicApi.getPublicImpact(signal)
      if (i) {
        setImpactData(i)
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('Failed to load impact metrics:', err)
      }
    } finally {
      setLoadingImpact(false)
    }
  }, [])

  // Initial load + periodic 45s refresh
  useEffect(() => {
    const controller = new AbortController()
    loadAllPublicData(controller.signal)

    const interval = setInterval(() => {
      loadAllPublicData(controller.signal)
    }, 45000)

    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [loadAllPublicData])

  // Freshness timer ('Updated X seconds ago')
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastStatsFetchTime) {
        setSecondsAgo(Math.floor((Date.now() - lastStatsFetchTime) / 1000))
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [lastStatsFetchTime])

  const handleScrollToSection = (id) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  // Categories list for interactive map filters
  const mapCategoryOptions = [
    { label: 'All Categories', value: 'all' },
    { label: 'Roads', value: 'roads' },
    { label: 'Sanitation', value: 'sanitation' },
    { label: 'Street Lighting', value: 'lighting' },
    { label: 'Water Supply', value: 'water' },
    { label: 'Drainage', value: 'drainage' },
    { label: 'Public Safety', value: 'safety' },
    { label: 'Parks', value: 'parks' }
  ]

  const mapStatusOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Active Issues', value: 'active' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved / Closed', value: 'resolved' }
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-surface-darker dark:text-slate-50 selection:bg-emerald-500 selection:text-white">
      {/* 1. STICKY NAVBAR */}
      <Navbar />

      {/* 2. HERO SECTION */}
      <section id="home" className="relative overflow-hidden pt-6 pb-16 lg:pt-14 lg:pb-24">
        {/* Soft Background Radial Ambient Glows */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[550px] w-full max-w-7xl rounded-full bg-radial from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 right-0 h-96 w-96 rounded-full bg-radial from-indigo-500/10 to-transparent blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left: Headline, Subtitle, and CTAs */}
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>AI-POWERED CIVIC GOVERNANCE PLATFORM</span>
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white leading-[1.08]"
              >
                BUILDING<br />
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
                  SMARTER CITIES
                </span><br />
                THROUGH CITIZEN ACTION.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-350 font-normal"
              >
                Report civic issues, track every step of the resolution journey, and help municipal teams build cleaner, safer, and more responsive communities.
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-8 flex flex-wrap items-center gap-3.5"
              >
                <Button
                  size="lg"
                  onClick={() => navigate(user ? '/complaints/new' : '/signup')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all hover:scale-102"
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  Report an Issue
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleScrollToSection('#live-map')}
                  className="border-slate-300 font-bold dark:border-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <MapPin className="h-4 w-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                  Explore Live Map
                </Button>

                <button
                  onClick={() => handleScrollToSection('#how-it-works')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 px-3 py-2 transition-colors"
                >
                  <span>View How It Works</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 flex flex-wrap items-center gap-6 border-t border-slate-200/80 pt-6 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Public Transparency</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>100% Real PostgreSQL Data</span>
                </div>
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Municipal Verified</span>
                </div>
              </motion.div>
            </div>

            {/* Right: Live Civic Intelligence Visual */}
            <div className="lg:col-span-5">
              <HeroVisual stats={stats} loadingStats={loadingStats} />
            </div>
          </div>
        </div>
      </section>

      {/* 3. LIVE CIVIC PULSE (Real PostgreSQL Metrics) */}
      <section className="border-y border-slate-200/80 bg-white/80 dark:border-slate-800/80 dark:bg-slate-900/60 backdrop-blur-md py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Live Civic Pulse
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
                City-Wide Operations at a Glance
              </h2>
            </div>

            {/* Freshness Status & Manual Refresh */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {loadingStats ? 'Refreshing...' : secondsAgo < 5 ? 'Updated just now' : `Updated ${secondsAgo}s ago`}
              </span>
              <button
                onClick={() => loadAllPublicData()}
                disabled={loadingStats}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                title="Refresh live metrics"
                aria-label="Refresh live metrics"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? 'animate-spin text-emerald-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          {statsError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
              <AlertTriangle className="h-6 w-6 mx-auto text-rose-500 mb-2" />
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Unable to load live platform statistics</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => loadAllPublicData()}>
                Retry Fetch
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'Total Reports', value: stats?.totalReports ?? 0, tone: 'text-slate-900 dark:text-white' },
                { label: 'Open Issues', value: stats?.openReports ?? 0, tone: 'text-amber-600 dark:text-amber-400' },
                { label: 'In Progress', value: stats?.inProgressReports ?? 0, tone: 'text-indigo-600 dark:text-indigo-400' },
                { label: 'Resolved', value: stats?.resolvedReports ?? 0, tone: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Active Officers', value: stats?.activeOfficers ?? 0, tone: 'text-teal-600 dark:text-teal-400' },
                { label: 'Departments', value: stats?.departments ?? 0, tone: 'text-slate-900 dark:text-white' }
              ].map((item, idx) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/60"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {item.label}
                  </div>
                  <div className={`mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight ${item.tone}`}>
                    {loadingStats ? (
                      <span className="inline-block h-8 w-12 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
                    ) : (
                      item.value
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. LIVE CIVIC ACTIVITY (Real Recent Submissions & Updates) */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <Badge tone="brand" className="mb-2 uppercase text-[10px] tracking-wider font-bold">
              <Activity className="h-3 w-3 mr-1" /> Live Civic Activity
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Latest Activity Across Wards
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Live, public-safe signal stream of newly submitted and updated civic issues.
            </p>
          </div>
          <Link
            to="/complaints"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            <span>View All Public Reports</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loadingActivity ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
            ))}
          </div>
        ) : activityError ? (
          <div className="rounded-2xl border border-slate-200 p-8 text-center dark:border-slate-800">
            <p className="text-xs text-slate-500">Unable to load live activity stream</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => loadAllPublicData()}>
              Retry
            </Button>
          </div>
        ) : activity.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800/80 dark:bg-slate-900/40">
            <Activity className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No public civic activity yet.</p>
            <p className="text-xs text-slate-500 mt-1">New citizen reports and updates will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activity.map((item, idx) => (
              <Reveal key={item.id} delay={idx * 0.04}>
                <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all hover:border-emerald-500/40 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                    <StatusBadge status={item.status} size="xs" />
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <div className="flex items-center gap-1 truncate max-w-[160px]">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{item.area}</span>
                    </div>
                    <span className="shrink-0 font-medium">{formatRelativeTime(item.createdAt)}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* 5. INTERACTIVE CITY MAP SECTION */}
      <section id="live-map" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <Badge tone="emerald" className="mb-2 uppercase text-[10px] tracking-wider font-bold">
              <MapPin className="h-3 w-3 mr-1" /> Geospatial Intelligence
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Live City Operations Map
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              See where civic issues are being reported and how municipal teams are responding across wards.
            </p>
          </div>

          {/* Map Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900">
              {mapCategoryOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedMapCategory(opt.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    selectedMapCategory === opt.value
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900">
              {mapStatusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedMapStatus(opt.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    selectedMapStatus === opt.value
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Map Container Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xl dark:border-slate-800/90 dark:bg-slate-900">
          <div className="relative h-[480px] w-full">
            <MapView
              height={480}
              showLegend={true}
              showControls={true}
              showSidebar={true}
              initialRadius={10000}
              filters={{
                status: selectedMapStatus !== 'all' ? selectedMapStatus : null,
                category: selectedMapCategory !== 'all' ? selectedMapCategory : null
              }}
            />
          </div>

          {/* Privacy Notice & Interactive Map Link Footer */}
          <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80 gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Public coordinates are mapped safely. Private citizen details (emails, phone numbers) are masked.
              </span>
            </div>

            <Link
              to="/map"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              <span>Explore Full Screen Map</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. FROM REPORT TO RESOLUTION (6-Step Lifecycle) */}
      <section id="how-it-works" className="border-t border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-16">
            <Badge tone="cyan" className="mb-3 uppercase text-[10px] tracking-wider font-bold">
              Resolution Journey
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              From Report to Verified Resolution
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              A transparent 6-stage operating lifecycle that guarantees accountability at every single milestone.
            </p>
          </Reveal>

          {/* Stepper Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {workflowSteps.map((step, idx) => (
              <Reveal key={step.step} delay={idx * 0.05}>
                <div className="relative rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 dark:border-slate-800/80 dark:bg-slate-900/60 transition-all hover:border-emerald-500/30 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-extrabold text-sm dark:bg-emerald-600 shadow-xs">
                      {step.step}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                      {step.badge}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 7. AI-POWERED CIVIC INTELLIGENCE */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 border-t border-slate-200/80 dark:border-slate-800/80">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <Badge tone="purple" className="mb-3 uppercase text-[10px] tracking-wider font-bold">
            <Sparkles className="h-3 w-3 mr-1" /> Google Gemini Powered
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            From Raw Reports to Actionable City Intelligence
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Intelligent AI tools that assist municipal administrators, eliminate duplicate reports, and ensure accurate dispatch.
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {aiFeatureList.map((f, idx) => (
            <Reveal key={f.id} delay={idx * 0.05}>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/60 transition-all hover:border-indigo-500/30 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                    {f.tag}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">{f.badge}</span>
                </div>

                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  {f.title}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {f.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 8. RECENT CIVIC REPORTS (Real PostgreSQL Complaint Snapshots) */}
      <section className="border-t border-slate-200/80 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-900/20 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <Badge tone="brand" className="mb-2 uppercase text-[10px] tracking-wider font-bold">
                Real Reports
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Recent Civic Reports
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Verified public complaints filed by community citizens.
              </p>
            </div>
            <Link
              to="/complaints"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              <span>Explore All Issues</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loadingRecent ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : recentError ? (
            <div className="rounded-2xl border border-slate-200 p-8 text-center dark:border-slate-800">
              <p className="text-xs text-slate-500">Unable to load recent complaints.</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => loadAllPublicData()}>
                Retry
              </Button>
            </div>
          ) : recentReports.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center dark:border-slate-800/80 dark:bg-slate-900/40">
              <FileText className="h-10 w-10 mx-auto text-slate-400 mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No public reports have been submitted yet.</h3>
              <p className="mt-1 text-xs text-slate-500">Be the first citizen to report an issue in your community.</p>
              <Button size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => navigate(user ? '/complaints/new' : '/signup')}>
                Report the first issue
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recentReports.map((report, idx) => (
                <Reveal key={report.id} delay={idx * 0.05}>
                  <div className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all hover:border-emerald-500/40 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/60">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getCategoryColor(report.category)}`}>
                          {report.category}
                        </span>
                        <StatusBadge status={report.status} size="xs" />
                      </div>

                      <h3 className="mt-3.5 text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                        {report.title}
                      </h3>

                      {report.summary && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {report.summary}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{report.area}</span>
                        </div>
                        <span>{formatRelativeTime(report.createdAt)}</span>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/complaints/${report.id}`)}
                        className="w-full justify-center text-xs font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View Report #{report.id}
                      </Button>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 9. RESOLUTION TRANSPARENCY & CIVIC IMPACT */}
      <section id="impact" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="grid gap-12 lg:grid-cols-12 items-center">
          {/* Left: Resolution Journey Statement */}
          <div className="lg:col-span-6">
            <Badge tone="emerald" className="mb-3 uppercase text-[10px] tracking-wider font-bold">
              Accountability
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl leading-tight">
              Every Report Has a Resolution Journey.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Citizens can follow the progress of an issue instead of wondering what happened after submitting it. From initial intake and field dispatch to verified photo closure, our system records every transition.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 dark:border-slate-800/80 dark:bg-slate-900/60">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Resolution Rate</div>
                <div className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {stats?.resolutionRate != null ? `${stats.resolutionRate}%` : 'Not enough data yet'}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">Calculated from completed reports</div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 dark:border-slate-800/80 dark:bg-slate-900/60">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Turnaround</div>
                <div className="mt-1 text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {stats?.avgResolutionHours != null ? `${stats.avgResolutionHours}h` : 'Not enough data yet'}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">Average resolution time</div>
              </div>
            </div>

            <div className="mt-8">
              <Button
                onClick={() => navigate('/complaints')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                View Public Reports
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Right: Category Distribution from PostgreSQL */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xl dark:border-slate-800/80 dark:bg-slate-900/60">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">What Your City Is Reporting</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Real category distribution calculated directly from Neon DB</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                  SQL Aggregated
                </span>
              </div>

              {loadingCategories ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
                  ))}
                </div>
              ) : categoriesData.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No category data recorded yet.</div>
              ) : (
                <div className="space-y-4">
                  {categoriesData.map((cat) => (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="capitalize text-slate-800 dark:text-slate-200">{cat.category}</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {cat.count} reports ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <motion.div
                          className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${cat.percentage}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 10. FOR CITIZENS & FOR MUNICIPALITIES */}
      <section className="border-t border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-surface-card py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* For Citizens Card */}
            <div id="citizens" className="rounded-3xl border border-slate-200/80 bg-slate-50/60 p-8 dark:border-slate-800/80 dark:bg-slate-900/60 flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 mb-6">
                  <Users className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  For Citizens
                </span>
                <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  Your report should never disappear into a system.
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Make your voice heard, report infrastructure problems with high-precision GPS, follow real-time milestones, and verify resolutions directly.
                </p>

                <ul className="mt-6 space-y-3">
                  {[
                    'Report issues in seconds with exact location mapping',
                    'Photo evidence attachments and anonymous filing option',
                    'AI-assisted category & department auto-detection',
                    'Track step-by-step resolution journey on live timelines',
                    'Receive instant alerts on status changes and assignments',
                    'Verify resolution proof before tickets are officially closed'
                  ].map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
                <Button
                  onClick={() => navigate(user ? '/complaints/new' : '/signup')}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Start Reporting
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>

            {/* For Municipalities Card */}
            <div id="municipalities" className="rounded-3xl border border-slate-200/80 bg-slate-50/60 p-8 dark:border-slate-800/80 dark:bg-slate-900/60 flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 mb-6">
                  <Building2 className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  For Municipal Teams
                </span>
                <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  Turn civic complaints into an operational intelligence system.
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Streamline municipal workflows, dispatch officers based on AI routing, prevent overdue SLA breaches, and generate comprehensive city analytics.
                </p>

                <ul className="mt-6 space-y-3">
                  {[
                    'Admin Command Center & unified complaint queue management',
                    'Field officer assignments, mobile check-ins, and evidence uploads',
                    'SLA breach warnings and automatic urgency escalation alerts',
                    'Geospatial clustering and heatmap analysis for civic hot-spots',
                    'Officer workload distribution and performance auditing',
                    'Audit logs and transparent public reporting exports'
                  ].map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
                <Button
                  onClick={() => navigate('/signup')}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Municipal Operations
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. PORTAL SELECTION (Protected Entrance Points) */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 border-t border-slate-200/80 dark:border-slate-800/80">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <Badge tone="cyan" className="mb-3 uppercase text-[10px] tracking-wider font-bold">
            Portal Access
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Access Your Specialized Workplace
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Dedicated portals configured specifically for citizens, field officers, and city administrators.
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Citizen Portal */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/60 flex flex-col justify-between">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 mb-4">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Citizen Portal</h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Report infrastructure problems, track personal complaints, discover neighborhood issues, and confirm resolution quality.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold justify-center"
            >
              Open Citizen Portal <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          {/* Officer Portal */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/60 flex flex-col justify-between">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 mb-4">
                <Smartphone className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Officer Portal</h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Manage assigned tickets, navigate to reported locations, log progress notes, and upload photo evidence upon completion.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/officer')}
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold justify-center"
            >
              Open Officer Portal <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          {/* Admin Portal */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/60 flex flex-col justify-between">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-800 dark:text-emerald-400 mb-4">
                <Landmark className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Admin Command Center</h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                City-wide operational oversight, automated routing management, department dispatch, SLA monitoring, and platform analytics.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/admin')}
              className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold justify-center dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              Open Admin Portal <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* 12. FAQ ACCORDION SECTION */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 border-t border-slate-200/80 dark:border-slate-800/80">
        <Reveal className="text-center mb-12">
          <Badge tone="cyan" className="mb-3 uppercase text-[10px] tracking-wider font-bold">
            Frequently Asked Questions
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Everything You Need to Know
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Answers to common questions about reporting, AI routing, data privacy, and resolution verification.
          </p>
        </Reveal>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <Reveal key={f.q} delay={i * 0.03}>
              <FaqItem q={f.q} a={f.a} id={i} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* 13. FINAL CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 px-8 py-16 text-center sm:px-16 shadow-2xl border border-emerald-900/30">
            <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-teal-500/20 blur-3xl" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                BUILD A MORE RESPONSIVE CITY.
              </h2>
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-emerald-100/80">
                Every report is a signal. Every resolution is measurable. Every citizen can contribute to safer, cleaner neighborhoods.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3.5">
                <Button
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-6 shadow-lg shadow-emerald-500/20"
                  onClick={() => navigate(user ? '/complaints/new' : '/signup')}
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  Report an Issue
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10 font-bold"
                  onClick={() => handleScrollToSection('#live-map')}
                >
                  <MapPin className="h-4 w-4 mr-1.5 text-emerald-400" />
                  Explore the Live Map
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 14. ENTERPRISE FOOTER */}
      <footer className="border-t border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-5">
            {/* Brand column */}
            <div className="md:col-span-2">
              <div className="flex items-center">
                <CivicGreenNetLogo variant="horizontal" size="md" />
              </div>
              <p className="mt-3 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                India's intelligent civic issue operating platform connecting citizens, municipal departments, and field teams with AI classification and spatial intelligence.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  PostgreSQL Synchronized
                </span>
              </div>
            </div>

            {/* Platform links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Platform</h4>
              <ul className="mt-3.5 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><a href="#features" className="hover:text-emerald-600">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-emerald-600">How It Works</a></li>
                <li><a href="#live-map" className="hover:text-emerald-600">Live Map</a></li>
                <li><a href="#impact" className="hover:text-emerald-600">Impact & Transparency</a></li>
              </ul>
            </div>

            {/* Citizens links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Citizens</h4>
              <ul className="mt-3.5 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><Link to="/complaints/new" className="hover:text-emerald-600">Report an Issue</Link></li>
                <li><Link to="/complaints" className="hover:text-emerald-600">Track Complaints</Link></li>
                <li><Link to="/dashboard" className="hover:text-emerald-600">Citizen Dashboard</Link></li>
                <li><Link to="/map" className="hover:text-emerald-600">Neighborhood Map</Link></li>
              </ul>
            </div>

            {/* Municipalities & Contact */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Municipalities</h4>
              <ul className="mt-3.5 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><Link to="/admin" className="hover:text-emerald-600">Admin Command Center</Link></li>
                <li><Link to="/officer" className="hover:text-emerald-600">Officer Operations</Link></li>
                <li><Link to="/signup" className="hover:text-emerald-600">Officer Registration</Link></li>
                <li><span className="text-slate-400">Support: civicgreennet@gmail.com</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-200/80 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 dark:border-slate-800">
            <p>© {new Date().getFullYear()} Civic GreenNet. Built for smarter, more responsive communities.</p>
            <p className="mt-2 sm:mt-0 font-medium">Civic GreenNet — Turning citizen reports into measurable civic action.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
