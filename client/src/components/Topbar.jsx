import React, { useContext, useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, Search, Bell, Sun, Moon, User, Settings, LogOut, MessageSquare, Radio } from 'lucide-react'
import AuthContext from '../context/AuthContext'
import ThemeContext from '../context/ThemeContext'
import { useRealtime } from '../context/RealtimeContext'
import api from '../services/api'
import notificationsApi from '../services/notifications'

export default function Topbar({ onToggleSidebar, title }) {
  const { user, logout } = useContext(AuthContext)
  const { dark, setDark } = useContext(ThemeContext)
  const { status: realtimeStatus, unreadCount: rtUnreadCount, subscribe } = useRealtime()
  const isOfficer = user?.role === 'officer'
  const navigate = useNavigate()
  const location = useLocation()
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
        const endpoint = user?.role === 'admin' ? '/admin/system-health' : '/health'
        const response = await api.get(endpoint)
        if (response.status >= 200 && response.status < 300) {
          if (active) setSystemHealth('operational')
        } else {
          if (active) setSystemHealth('degradation')
        }
      } catch (err) {
        if (active) setSystemHealth('degradation')
      }
    }
    checkHealth()
    const timer = setInterval(checkHealth, 60000)
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

  // Initial fetch
  useEffect(() => {
    fetchNotifs()
  }, [])

  // Sync with real-time notification count and stream
  useEffect(() => {
    if (typeof rtUnreadCount === 'number') {
      setUnread(rtUnreadCount)
    }
  }, [rtUnreadCount])

  // Real-time event subscriptions
  useEffect(() => {
    const unsubNotif = subscribe('NOTIFICATION_CREATED', (evt) => {
      if (evt.notification) {
        setNotifs((prev) => [evt.notification, ...prev.slice(0, 5)])
      }
      if (typeof evt.unreadCount === 'number') {
        setUnread(evt.unreadCount)
      } else {
        setUnread((u) => u + 1)
      }
    })

    const unsubRead = subscribe('NOTIFICATION_READ', (evt) => {
      if (evt.notificationId) {
        setNotifs((prev) => prev.map((n) => (n.id === evt.notificationId ? { ...n, is_read: true } : n)))
      }
      if (typeof evt.unreadCount === 'number') {
        setUnread(evt.unreadCount)
      }
    })

    const unsubAllRead = subscribe('NOTIFICATIONS_MARKED_ALL_READ', () => {
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnread(0)
    })

    const unsubComplaint = subscribe('COMPLAINT_STATUS_CHANGED', () => {
      fetchNotifs()
    })

    return () => {
      unsubNotif()
      unsubRead()
      unsubAllRead()
      unsubComplaint()
    }
  }, [subscribe])

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

  const searchInputRef = useRef(null)

  // Hotkey handler for Ctrl+K or Cmd+K
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        if (searchInputRef.current) {
          searchInputRef.current.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    if (query.trim()) {
      if (location.pathname.startsWith('/admin')) {
        navigate(`/admin?tab=complaints&search=${encodeURIComponent(query.trim())}`)
      } else {
        navigate(`/complaints?q=${encodeURIComponent(query.trim())}`)
      }
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 backdrop-blur-md dark:border-[#1E293B] dark:bg-[#0B132B]/95">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#172438] lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="hidden sm:block min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {user?.role === 'admin' ? 'CIVICGREENNET • MUNICIPAL GOVERNANCE' : isOfficer ? 'CIVICGREENNET • FIELD OPERATIONS' : 'CIVICGREENNET • CITIZEN PORTAL'}
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 truncate">
            <span>{title || (user?.role === 'admin' ? 'Command Center' : isOfficer ? 'Operations Center' : 'Civic Dashboard')}</span>
            {user?.role === 'admin' && (
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800/90 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase text-slate-700 dark:text-slate-300 border border-slate-300/50 dark:border-slate-700/50">
                GOVERNANCE
              </span>
            )}
          </div>
        </div>
        <div className="sm:hidden font-bold text-slate-900 dark:text-white text-sm truncate">
          {title || 'Civic Operations'}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative hidden max-w-md flex-1 md:block mx-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <input
          ref={searchInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search complaints, officers, wards, departments…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-12 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white dark:border-[#24344A] dark:bg-[#0D1929] dark:text-[#F8FAFC] dark:placeholder:text-[#64748B] dark:focus:border-emerald-500 transition-colors"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          Ctrl K
        </kbd>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Real-time connection badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 dark:bg-[#111C2D] dark:border-[#24344A] text-[11px] font-medium">
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
              realtimeStatus === 'connected' ? 'bg-emerald-400 animate-ping' : realtimeStatus === 'reconnecting' ? 'bg-amber-400 animate-ping' : 'bg-slate-400'
            }`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${
              realtimeStatus === 'connected' ? 'bg-emerald-500' : realtimeStatus === 'reconnecting' ? 'bg-amber-500' : 'bg-slate-500'
            }`} />
          </span>
          <span className={
            realtimeStatus === 'connected' ? 'text-emerald-700 dark:text-[#34D399]' : realtimeStatus === 'reconnecting' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
          }>
            {realtimeStatus === 'connected' ? 'Live Stream Connected' : realtimeStatus === 'reconnecting' ? 'Reconnecting…' : 'Offline'}
          </span>
        </div>

        {/* System status badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 dark:bg-[#111C2D] dark:border-[#24344A] text-[11px] font-medium">
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${systemHealth === 'operational' ? 'bg-emerald-400 animate-ping' : 'bg-rose-400 animate-ping'}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${systemHealth === 'operational' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </span>
          <span className={systemHealth === 'operational' ? 'text-emerald-700 dark:text-[#34D399]' : 'text-rose-700 dark:text-rose-400'}>
            {systemHealth === 'operational' ? 'Systems Operational' : 'Degraded'}
          </span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setDark(!dark)}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          {dark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
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
                  {notifs.map((n) => {
                    const title = n.payload?.title || n.type?.replace(/_/g, ' ')
                    const message = n.payload?.message || n.payload?.subtitle || ''
                    return (
                      <button
                        key={n.id}
                        onClick={async () => {
                          await markOne(n.id)
                          setNotifOpen(false)
                          if (n.payload?.actionUrl) {
                            navigate(n.payload.actionUrl)
                          } else if (n.payload?.complaintId) {
                            navigate(`/complaints/${n.payload.complaintId}`)
                          } else if (n.type === 'OFFICER' || n.type === 'ROLE_CHANGED') {
                            navigate('/officer/onboarding')
                          } else if (n.payload?.officerId && user?.role === 'admin') {
                            navigate('/admin?tab=officer-approvals')
                          }
                        }}
                        className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${n.is_read ? '' : 'bg-emerald-50/10 dark:bg-emerald-950/20'}`}
                      >
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${n.is_read ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">{title}</span>
                          {message && <span className="block text-[11px] text-slate-500 dark:text-slate-300 line-clamp-2 mt-0.5">{message}</span>}
                          <span className="block text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</span>
                        </span>
                        {!n.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                      </button>
                    )
                  })}
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
