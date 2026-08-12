import React, { useContext, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, Search, Bell, Sun, Moon, User, Settings, LogOut, MessageSquare } from 'lucide-react'
import AuthContext from '../context/AuthContext'
import ThemeContext from '../context/ThemeContext'
import notificationsApi from '../services/notifications'

export default function Topbar({ onToggleSidebar, title }) {
  const { user, logout } = useContext(AuthContext)
  const { dark, setDark } = useContext(ThemeContext)
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)
  const [query, setQuery] = useState('')
  const [systemHealth, setSystemHealth] = useState('operational')
  const profileRef = useRef(null)
  const notifRef = useRef(null)

  useEffect(() => {
    let active = true
    async function checkHealth() {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          if (active) setSystemHealth('operational')
        } else {
          if (active) setSystemHealth('degradation')
        }
      } catch (err) {
        if (active) setSystemHealth('degradation')
      }
    }
    checkHealth()
    const timer = setInterval(checkHealth, 30000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  async function fetchNotifs() {
    try {
      const r = await notificationsApi.list(1)
      const items = r.items || r || []
      setNotifs(items.slice(0, 6))
      setUnread(items.filter((i) => !i.is_read).length || 0)
    } catch (e) {
      /* silent */
    }
  }

  useEffect(() => {
    fetchNotifs()
    const t = setInterval(fetchNotifs, 30000)
    return () => clearInterval(t)
  }, [])

  // close dropdowns on outside click
  useEffect(() => {
    function onClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function handleLogout() {
    logout()
    navigate('/')
  }

  async function markOne(id) {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    setUnread((u) => Math.max(0, u - 1))
    try { await notificationsApi.markRead(id) } catch (e) { /* silent */ }
  }

  function handleSearch(e) {
    e.preventDefault()
    if (query.trim()) navigate(`/complaints?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 backdrop-blur dark:border-slate-800 dark:bg-surface-darker">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="hidden sm:block">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Smart Civic Governance Platform
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-white">
            {title || 'Municipal Operations & Citizen Services'}
          </div>
        </div>
        <div className="sm:hidden font-bold text-slate-800 dark:text-white text-sm">
          {title || 'Civic Operations'}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Global system search…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800"
        />
      </form>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* System status */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold">
          <span className={`h-2 w-2 rounded-full ${systemHealth === 'operational' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
          <span className={systemHealth === 'operational' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
            {systemHealth === 'operational' ? 'Systems Operational' : 'Service Degradation'}
          </span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setDark(!dark)}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {dark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-surface-card"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</span>
                  <button onClick={() => navigate('/notifications')} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">View all</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifs.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">You're all caught up</div>
                  )}
                  {notifs.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markOne(n.id)}
                      className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${n.is_read ? '' : 'bg-emerald-50/10 dark:bg-emerald-950/20'}`}
                    >
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${n.is_read ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                        <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100 capitalize">{n.type?.replace(/_/g, ' ')}</span>
                        <span className="block text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                      </span>
                      {!n.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
            aria-label="Profile menu"
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white transition-transform hover:scale-105 overflow-hidden"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || 'U'
            )}
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-surface-card"
              >
                <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name || 'User'}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email || ''}</div>
                  <div className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{user?.role || 'Citizen'}</div>
                </div>
                <div className="p-1">
                  <button onClick={() => { setProfileOpen(false); navigate('/profile') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                    <User className="h-4 w-4" aria-hidden="true" /> Profile
                  </button>
                  <button onClick={() => { setProfileOpen(false); navigate('/settings') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                    <Settings className="h-4 w-4" aria-hidden="true" /> Settings
                  </button>
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
                    <LogOut className="h-4 w-4" aria-hidden="true" /> Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
