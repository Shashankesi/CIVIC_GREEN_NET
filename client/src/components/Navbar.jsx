import React, { useState, useEffect, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X, CheckCircle, AlertTriangle, Shield, ArrowRight } from 'lucide-react'
import CivicGreenNetLogo from './brand/CivicGreenNetLogo'
import AuthContext from '../context/AuthContext'
import ThemeContext from '../context/ThemeContext'
import Button from '../ui/Button'
import { getPublicHealth } from '../services/publicApi'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Live Map', href: '#live-map' },
  { label: 'Impact', href: '#impact' },
  { label: 'For Citizens', href: '#citizens' },
  { label: 'For Municipalities', href: '#municipalities' }
]

export default function Navbar() {
  const { user } = useContext(AuthContext)
  const { dark, setDark } = useContext(ThemeContext)
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [healthStatus, setHealthStatus] = useState('checking') // 'operational' | 'degraded' | 'offline' | 'checking'

  // Scroll detection for backdrop styling
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Live health status polling (every 45s)
  useEffect(() => {
    let unmounted = false
    let failureCount = 0

    async function checkHealth() {
      try {
        const res = await getPublicHealth()
        if (unmounted) return

        const isDbConnected = res?.database === 'connected' || res?.database === 'healthy'
        const isApiHealthy = res?.api === 'healthy' || res?.status === 'healthy'

        if (res?.success && isApiHealthy && isDbConnected) {
          setHealthStatus('operational')
          failureCount = 0
        } else if (res?.success || isApiHealthy || isDbConnected) {
          setHealthStatus('degraded')
          failureCount = 0
        } else {
          failureCount += 1
          if (failureCount >= 2) {
            setHealthStatus('offline')
          }
        }
      } catch (err) {
        if (!unmounted) {
          failureCount += 1
          if (failureCount >= 2) {
            setHealthStatus('offline')
          }
        }
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 45000)
    return () => {
      unmounted = true
      clearInterval(interval)
    }
  }, [])

  const handleNav = (e, href) => {
    if (window.location.pathname !== '/') {
      e.preventDefault()
      navigate('/')
      setTimeout(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
      }, 150)
    } else {
      e.preventDefault()
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
    }
    setOpen(false)
  }

  const renderHealthBadge = (isMobile = false) => {
    let dotColor = 'bg-slate-400'
    let pingColor = 'bg-slate-400'
    let label = 'Connecting...'
    let toneClass = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'

    if (healthStatus === 'operational') {
      dotColor = 'bg-emerald-500'
      pingColor = 'bg-emerald-400'
      label = 'Systems Operational'
      toneClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
    } else if (healthStatus === 'degraded') {
      dotColor = 'bg-amber-500'
      pingColor = 'bg-amber-400'
      label = 'Limited Availability'
      toneClass = 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
    } else if (healthStatus === 'offline') {
      dotColor = 'bg-rose-500'
      pingColor = 'bg-rose-400'
      label = 'System Offline'
      toneClass = 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
    }

    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium tracking-tight shadow-2xs ${toneClass} ${
          isMobile ? 'w-fit' : ''
        }`}
        title={`Live Backend & Database Health: ${label}`}
      >
        <span className="relative flex h-2 w-2">
          {healthStatus === 'operational' && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pingColor}`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
        </span>
        <span>{label}</span>
      </div>
    )
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Main Navigation">
        {/* Left: Brand & Health Badge */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl" onClick={() => setOpen(false)}>
            <CivicGreenNetLogo variant="horizontal" size="md" descriptor="CIVIC TECHNOLOGY PLATFORM" />
          </Link>

          {/* Desktop Health Status Indicator */}
          <div className="hidden xl:block">
            {renderHealthBadge(false)}
          </div>
        </div>

        {/* Center: Desktop Navigation Links */}
        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => handleNav(e, l.href)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Right: Desktop Actions & Theme */}
        <div className="hidden items-center gap-2.5 lg:flex">
          {/* Health Badge for screens between lg and xl */}
          <div className="hidden lg:block xl:hidden">
            {renderHealthBadge(false)}
          </div>

          <button
            onClick={() => setDark(!dark)}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 border border-slate-200/80 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {dark ? <span aria-hidden="true" className="text-sm">☀️</span> : <span aria-hidden="true" className="text-sm">🌙</span>}
          </button>

          {user ? (
            <Button
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              Dashboard <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:text-emerald-600 hover:bg-slate-100/60 dark:text-slate-200 dark:hover:text-emerald-400 dark:hover:bg-slate-800/60"
              >
                Login
              </Link>
              <Button
                size="sm"
                onClick={() => navigate('/signup')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                Get Started
              </Button>
            </div>
          )}
        </div>

        {/* Mobile: Hamburger & Theme toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={() => setDark(!dark)}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 border border-slate-200 dark:border-slate-700 dark:text-slate-300"
          >
            {dark ? '☀️' : '🌙'}
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 overflow-hidden lg:hidden"
          >
            <div className="space-y-1.5 px-4 py-4">
              <div className="pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                {renderHealthBadge(true)}
              </div>

              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={(e) => handleNav(e, l.href)}
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                >
                  {l.label}
                </a>
              ))}

              <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                {user ? (
                  <Button
                    onClick={() => {
                      setOpen(false)
                      navigate('/dashboard')
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOpen(false)
                        navigate('/login')
                      }}
                      className="w-full"
                    >
                      Login
                    </Button>
                    <Button
                      onClick={() => {
                        setOpen(false)
                        navigate('/signup')
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
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
  )
}
