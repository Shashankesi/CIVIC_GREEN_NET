import React, { useState, useEffect, useContext } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Leaf, Menu, X } from 'lucide-react'
import AuthContext from '../context/AuthContext'
import ThemeContext from '../context/ThemeContext'
import Button from '../ui/Button'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'AI', href: '#ai' },
  { label: 'For Citizens', href: '#citizens' },
  { label: 'For Municipalities', href: '#municipalities' }
]

export default function Navbar() {
  const { user } = useContext(AuthContext)
  const { dark, setDark } = useContext(ThemeContext)
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleNav = (e, href) => {
    // If on landing, smooth scroll; otherwise navigate home then scroll
    if (window.location.pathname !== '/') {
      e.preventDefault()
      navigate('/')
      setTimeout(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
    setOpen(false)
  }

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'glass shadow-sm' : 'bg-transparent'}`}>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Main">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-glow">
            <Leaf className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Civic<span className="text-brand-600 dark:text-brand-400">GreenNet</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => handleNav(e, l.href)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <button
            onClick={() => setDark(!dark)}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {dark ? <span aria-hidden="true">☀️</span> : <span aria-hidden="true">🌙</span>}
          </button>
          {user ? (
            <Button onClick={() => navigate('/dashboard')}>Dashboard</Button>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400">
                Login
              </Link>
              <Button onClick={() => navigate('/signup')}>Get Started</Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="glass overflow-hidden lg:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={(e) => handleNav(e, l.href)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {l.label}
                </a>
              ))}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setDark(!dark)}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                  {dark ? '☀️ Light mode' : '🌙 Dark mode'}
                </button>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                {user ? (
                  <Button onClick={() => { setOpen(false); navigate('/dashboard') }}>Dashboard</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => { setOpen(false); navigate('/login') }}>Login</Button>
                    <Button onClick={() => { setOpen(false); navigate('/signup') }}>Get Started</Button>
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
