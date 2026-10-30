import React, { useState, useEffect, useRef, useContext, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Menu,
  X,
  ArrowRight,
  Activity,
  Database,
  Server,
  Zap,
  RotateCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown
} from 'lucide-react'
import CivicGreenNetLogo from './brand/CivicGreenNetLogo'
import TricolorDivider from './brand/TricolorDivider'
import AuthContext from '../context/AuthContext'
import ThemeContext from '../context/ThemeContext'
import Button from '../ui/Button'
import ServerWakeupBanner from './common/ServerWakeupBanner'
import { getPublicHealth } from '../services/publicApi'

// Main top-level navigation items
const navItems = [
  { label: 'Home', id: 'home', target: '#home', type: 'scroll' },
  { label: 'Features', id: 'features', target: '#features', type: 'scroll' },
  { label: 'How It Works', id: 'how-it-works', target: '#how-it-works', type: 'scroll' },
  { label: 'Live Map', id: 'live-map', target: '#live-map', type: 'scroll' },
  { label: 'Impact', id: 'impact', target: '#impact', type: 'scroll' },
  { label: 'For Citizens', id: 'citizens', target: '#citizens', type: 'scroll' },
  { label: 'For Municipalities', id: 'municipalities', target: '#municipalities', type: 'scroll' }
]

export default function Navbar() {
  const { user } = useContext(AuthContext)
  const { dark, setDark } = useContext(ThemeContext)
  const navigate = useNavigate()
  const location = useLocation()

  // Navbar visual states
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')

  // Telemetry & Server Wake-up states
  const [healthStatus, setHealthStatus] = useState('waking') // 'waking' | 'ready' | 'unavailable'
  const [telemetry, setTelemetry] = useState(null)
  const [lastCheckTime, setLastCheckTime] = useState(null)
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState(false)
  const [showWakeupBanner, setShowWakeupBanner] = useState(true)
  const [showTelemetryPopover, setShowTelemetryPopover] = useState(false)

  const popoverRef = useRef(null)
  const badgeRef = useRef(null)
  const initialCheckStartedRef = useRef(false)
  const autoDismissTimerRef = useRef(null)

  // 1. Scroll listener for seamless glass transition
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 2. Lock body scroll on mobile drawer open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // 3. Close popover on outside click
  useEffect(() => {
    if (!showTelemetryPopover) return
    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        badgeRef.current &&
        !badgeRef.current.contains(e.target)
      ) {
        setShowTelemetryPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTelemetryPopover])

  // 4. Smooth scrolling on direct hash load & refresh
  useEffect(() => {
    if (location.hash) {
      const hashId = location.hash.replace('#', '')
      const el = document.getElementById(hashId)
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' })
          setActiveSection(hashId)
        }, 150)
      }
    }
  }, [location.hash, location.pathname])

  // 5. Active Section Observer on Landing Page
  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('')
      return
    }

    const sectionIds = ['home', 'features', 'how-it-works', 'live-map', 'citizens', 'impact', 'municipalities']
    const handleScrollSpy = () => {
      if (window.scrollY < 120) {
        setActiveSection('home')
        return
      }

      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= 240 && rect.bottom >= 240) {
            setActiveSection(id)
            return
          }
        }
      }
    }

    handleScrollSpy()
    window.addEventListener('scroll', handleScrollSpy, { passive: true })
    return () => window.removeEventListener('scroll', handleScrollSpy)
  }, [location.pathname])

  // 6. Backend Health Check & Wake-Up Logic
  const executeHealthCheck = useCallback(async (isManualRetry = false) => {
    if (isManualRetry) {
      setIsRefreshingTelemetry(true)
      setHealthStatus('waking')
      setShowWakeupBanner(true)
    }

    try {
      const startTime = performance.now()
      const data = await getPublicHealth(null, 14000)
      const durationMs = Math.round(performance.now() - startTime)

      const isDbConnected = data?.database === 'connected' || data?.database === 'healthy'
      const isApiHealthy = data?.status === 'healthy' || data?.api === 'healthy' || data?.success

      if (data && (isApiHealthy || isDbConnected)) {
        setHealthStatus('ready')
        setTelemetry({
          ...data,
          latencyMs: data?.latencyMs || durationMs
        })
        setLastCheckTime(new Date())

        // Auto-dismiss banner after 3.5s in ready state
        if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current)
        autoDismissTimerRef.current = setTimeout(() => {
          setShowWakeupBanner(false)
        }, 3500)
      } else {
        setHealthStatus('unavailable')
        setTelemetry(data || { status: 'offline', database: 'disconnected' })
        setLastCheckTime(new Date())
      }
    } catch (err) {
      setHealthStatus('unavailable')
      setTelemetry({ status: 'unreachable', database: 'disconnected' })
      setLastCheckTime(new Date())
    } finally {
      setIsRefreshingTelemetry(false)
    }
  }, [])

  // Initial check on mount
  useEffect(() => {
    if (!initialCheckStartedRef.current) {
      initialCheckStartedRef.current = true
      executeHealthCheck(false)
    }

    const interval = setInterval(() => {
      getPublicHealth(null, 8000)
        .then((data) => {
          if (data?.status === 'healthy' || data?.success) {
            setHealthStatus('ready')
            setTelemetry(data)
            setLastCheckTime(new Date())
          }
        })
        .catch(() => {})
    }, 60000)

    return () => {
      clearInterval(interval)
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current)
    }
  }, [executeHealthCheck])

  // 7. Navigation click handler
  const handleNavClick = (e, item) => {
    e.preventDefault()
    setMobileMenuOpen(false)

    // If already on homepage, smoothly scroll to section
    if (location.pathname === '/') {
      if (item.target === '#home') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setActiveSection('home')
        return
      }

      const el = document.querySelector(item.target)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        setActiveSection(item.id)
      }
      return
    }

    // If currently on another page:
    navigate('/' + item.target)
    setTimeout(() => {
      if (item.target === '#home') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        document.querySelector(item.target)?.scrollIntoView({ behavior: 'smooth' })
      }
    }, 180)
  }

  // Format timestamp for display
  const formattedCheckTime = lastCheckTime
    ? lastCheckTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Pending verification'

  return (
    <>
      {/* ── 1. Temporary Server Status Notification (Above Navbar) ── */}
      <ServerWakeupBanner
        status={healthStatus}
        visible={showWakeupBanner}
        onDismiss={() => setShowWakeupBanner(false)}
        onRetry={() => executeHealthCheck(true)}
      />

      {/* ── 2. Master Glassmorphic Sticky Header with Tricolour Accent ── */}
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ease-in-out ${
          scrolled
            ? 'bg-white/94 dark:bg-[#0B131C]/94 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)]'
            : 'bg-white/78 dark:bg-[#0B131C]/78 backdrop-blur-[14px] border-b border-white/45 dark:border-white/10 shadow-none'
        }`}
        style={{
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'blur(14px)',
          backdropFilter: scrolled ? 'blur(12px)' : 'blur(14px)'
        }}
      >
        {/* Refined Indian Tricolour Top Accent Line */}
        <TricolorDivider height="h-[2.5px]" />

        <div className="mx-auto flex h-14 sm:h-15 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* ── Brand Logo ── */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/"
              className="flex items-center rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
              onClick={(e) => {
                if (location.pathname === '/') {
                  e.preventDefault()
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }
                setMobileMenuOpen(false)
              }}
              title="CivicGreenNet Homepage"
            >
              <CivicGreenNetLogo
                variant="horizontal"
                size="sm"
                descriptor="CIVIC TECH PLATFORM"
              />
            </Link>
          </div>

          {/* ── Center Desktop Navigation Links ── */}
          <nav className="hidden items-center gap-1 xl:gap-1.5 lg:flex" aria-label="Primary Navigation">
            {navItems.map((item) => {
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => handleNavClick(e, item)}
                  className={`rounded-lg px-2.5 py-1 text-xs xl:text-[13px] font-bold transition-all duration-150 select-none cursor-pointer ${
                    isActive
                      ? 'text-[#138808] dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/70 border border-emerald-300/80 dark:border-emerald-700/60 shadow-2xs'
                      : 'text-slate-800 dark:text-slate-200 hover:text-[#138808] hover:bg-white/60 dark:hover:text-white dark:hover:bg-slate-800/60'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* ── Right Actions: Systems Operational, Theme, Auth ── */}
          <div className="hidden items-center gap-2.5 lg:flex">
            {/* Interactive Systems Operational Indicator */}
            <div className="relative">
              <button
                ref={badgeRef}
                type="button"
                onClick={() => setShowTelemetryPopover(!showTelemetryPopover)}
                onMouseEnter={() => setShowTelemetryPopover(true)}
                className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold tracking-tight transition-all duration-200 cursor-pointer shadow-2xs select-none ${
                  healthStatus === 'ready'
                    ? 'text-emerald-900 bg-emerald-50/95 border-emerald-300/90 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
                    : healthStatus === 'unavailable'
                    ? 'text-rose-900 bg-rose-50/95 border-rose-300/90 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60'
                    : 'text-amber-900 bg-amber-50/95 border-amber-300/90 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
                }`}
                aria-expanded={showTelemetryPopover}
                aria-haspopup="true"
                title="Click or hover to inspect live platform telemetry"
              >
                {/* Status Dot with subtle pulse animation */}
                {healthStatus === 'ready' && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#138808]" />
                  </span>
                )}
                {healthStatus === 'waking' && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9933]" />
                  </span>
                )}
                {healthStatus === 'unavailable' && (
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                )}

                <span>
                  {healthStatus === 'ready'
                    ? 'Systems Operational'
                    : healthStatus === 'unavailable'
                    ? 'Backend Degraded'
                    : 'Waking Server...'}
                </span>

                <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-transform" />
              </button>

              {/* Telemetry Popover Card */}
              <AnimatePresence>
                {showTelemetryPopover && (
                  <motion.div
                    ref={popoverRef}
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    onMouseLeave={() => setShowTelemetryPopover(false)}
                    className="absolute right-0 mt-2 w-76 rounded-xl bg-white dark:bg-[#101828] border border-slate-200 dark:border-slate-800 shadow-xl p-3.5 z-50 text-xs"
                    role="dialog"
                    aria-label="Platform Health Details"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-[#138808] dark:text-emerald-400" />
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-[11px] uppercase tracking-wider">
                          CivicGreenNet Telemetry
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          healthStatus === 'ready'
                            ? 'text-emerald-700 bg-emerald-100/70 dark:text-emerald-300 dark:bg-emerald-950/60'
                            : healthStatus === 'unavailable'
                            ? 'text-rose-700 bg-rose-100/70 dark:text-rose-300 dark:bg-rose-950/60'
                            : 'text-amber-700 bg-amber-100/70 dark:text-amber-300 dark:bg-amber-950/60'
                        }`}
                      >
                        {healthStatus === 'ready' ? '100% HEALTHY' : healthStatus === 'unavailable' ? 'OFFLINE' : 'CONNECTING'}
                      </span>
                    </div>

                    {/* Telemetry Rows */}
                    <div className="space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Server className="h-3 w-3" /> Backend API
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {healthStatus === 'ready' ? 'Healthy (REST v1)' : healthStatus === 'unavailable' ? 'Unreachable' : 'Waking from sleep'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Database className="h-3 w-3" /> Database
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {telemetry?.database === 'connected' ? 'Connected (Neon PostgreSQL)' : healthStatus === 'ready' ? 'Connected' : 'Pending'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Zap className="h-3 w-3" /> Latency
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {telemetry?.latencyMs ? `${telemetry.latencyMs} ms` : 'Evaluating...'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Last Checked
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {formattedCheckTime}
                        </span>
                      </div>
                    </div>

                    {/* Diagnostics Refresh Button */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => executeHealthCheck(true)}
                        disabled={isRefreshingTelemetry}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-60 cursor-pointer"
                      >
                        <RotateCw className={`h-3 w-3 text-emerald-600 ${isRefreshingTelemetry ? 'animate-spin' : ''}`} />
                        <span>{isRefreshingTelemetry ? 'Running Diagnostics...' : 'Run Diagnostics Check'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setDark(!dark)}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 border border-slate-200/90 bg-white/70 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:bg-slate-800/70 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            >
              {dark ? <span className="text-xs">☀️</span> : <span className="text-xs">🌙</span>}
            </button>

            {/* Authentication actions */}
            {user ? (
              <Button
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="bg-[#138808] hover:bg-emerald-700 text-white font-bold text-xs px-3.5 h-8.5 rounded-lg shadow-xs"
              >
                Dashboard <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-2.5 py-1 text-xs xl:text-[13px] font-bold text-slate-800 hover:text-[#138808] dark:text-slate-200 dark:hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Button
                  size="sm"
                  onClick={() => navigate('/signup')}
                  className="bg-[#138808] hover:bg-emerald-700 text-white text-xs xl:text-[13px] font-bold px-3.5 h-8.5 rounded-lg shadow-xs transition-colors"
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>

          {/* ── Mobile Controls (Theme + Hamburger) ── */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setDark(!dark)}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 border border-slate-200/90 bg-white/70 dark:border-slate-700 dark:text-slate-200 dark:bg-slate-800/70"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/90 bg-white/70 text-slate-800 hover:bg-white dark:border-slate-700 dark:text-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800 shadow-2xs"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-panel"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Navigation Drawer ── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              id="mobile-nav-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-[#101828]/95 overflow-hidden lg:hidden"
            >
              <div className="space-y-1 px-4 py-3">
                {/* System Status Banner on Mobile */}
                <div className="pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Status</span>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                      healthStatus === 'ready'
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : healthStatus === 'unavailable'
                        ? 'text-rose-800 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'text-amber-800 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        healthStatus === 'ready' ? 'bg-[#138808]' : healthStatus === 'unavailable' ? 'bg-rose-500' : 'bg-[#FF9933]'
                      }`}
                    />
                    <span>
                      {healthStatus === 'ready' ? 'Operational' : healthStatus === 'unavailable' ? 'Offline' : 'Waking Server...'}
                    </span>
                  </div>
                </div>

                {/* Mobile Links */}
                {navItems.map((item) => {
                  const isActive = activeSection === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(e) => handleNavClick(e, item)}
                      className={`block w-full text-left rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        isActive
                          ? 'text-[#138808] bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60 font-bold'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}

                {/* Mobile Auth Actions */}
                <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {user ? (
                    <Button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        navigate('/dashboard')
                      }}
                      className="w-full bg-[#138808] hover:bg-emerald-700 text-white"
                    >
                      Go to Dashboard
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setMobileMenuOpen(false)
                          navigate('/login')
                        }}
                        className="w-full"
                      >
                        Login
                      </Button>
                      <Button
                        onClick={() => {
                          setMobileMenuOpen(false)
                          navigate('/signup')
                        }}
                        className="w-full bg-[#138808] hover:bg-emerald-700 text-white"
                      >
                        Get Started
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  )
}
