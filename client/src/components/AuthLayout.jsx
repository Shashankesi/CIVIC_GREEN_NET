import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Sparkles, ShieldCheck, TrendingUp } from 'lucide-react'
import CivicGreenNetLogo from './brand/CivicGreenNetLogo'
import ThemeContext from '../context/ThemeContext'

export default function AuthLayout({ children, title, subtitle }) {
  const { dark, setDark } = useContext(ThemeContext)

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-surface-darker">
      {/* Left branding panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-brand-700 via-emerald-800 to-slate-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Decorative blobs */}
        <div className="gradient-blob absolute -left-20 top-20 h-72 w-72 rounded-full bg-teal-400/40" aria-hidden="true" />
        <div className="gradient-blob absolute bottom-10 right-0 h-80 w-80 rounded-full bg-indigo-500/30" aria-hidden="true" />
        <div className="gradient-blob absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-cyan-400/30" aria-hidden="true" />

        {/* Logo */}
        <div className="relative z-10">
          <CivicGreenNetLogo variant="horizontal" theme="white" size="lg" />
        </div>

        {/* Center content */}
        <div className="relative z-10 max-w-md">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-200"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> AI-Powered Civic Platform
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl font-bold leading-tight text-white"
          >
            Build smarter, cleaner and more responsive communities.
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 space-y-4"
          >
            {[
              { icon: MapPin, text: 'Report civic issues in seconds from anywhere' },
              { icon: Sparkles, text: 'AI classification, severity & department assignment' },
              { icon: TrendingUp, text: 'Track resolution progress transparently' },
              { icon: ShieldCheck, text: 'Secure, role-based access for citizens & officials' }
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-sm text-emerald-100/90">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-emerald-200">
                  <f.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {f.text}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-xs text-emerald-200/60">
          © {new Date().getFullYear()} Civic GreenNet. Smart governance for every city.
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-1 flex-col p-6 sm:p-10">
        {/* Mobile top bar */}
        <div className="mb-8 flex items-center justify-between lg:justify-end">
          <Link to="/" className="flex items-center lg:hidden">
            <CivicGreenNetLogo variant="horizontal" size="sm" />
          </Link>
          <button
            onClick={() => setDark(!dark)}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {title && <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{title}</h1>}
            {subtitle && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
