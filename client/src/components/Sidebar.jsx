import React, { useContext, useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Ticket, PlusCircle, Bell, Map, LogOut, ChevronsLeft, ChevronsRight,
  X, ShieldAlert, Cpu, User, Bookmark, Navigation2, Settings, Compass, Sparkles, MessageSquare, Award, Trophy
} from 'lucide-react'
import CivicGreenNetLogo from './brand/CivicGreenNetLogo'
import AuthContext from '../context/AuthContext'
import api, { unwrapResponse } from '../services/api'

// Pure navigation builder based on user role
function getNavSectionsForRole(role) {
  if (role === 'admin') {
    return [
      {
        title: 'Admin Control',
        items: [
          { to: '/admin', label: 'Admin Dashboard', icon: ShieldAlert },
          { to: '/complaints', label: 'Complaints', icon: Ticket },
          { to: '/map', label: 'Map Overview', icon: Map },
          { to: '/notifications', label: 'Notifications', icon: Bell }
        ]
      }
    ];
  }
  if (role === 'officer') {
    return [
      {
        title: 'OPERATIONS',
        items: [
          { to: '/officer', label: 'Operations Center', icon: LayoutDashboard },
          { to: '/officer/assignments', label: 'My Assignments', icon: Ticket },
          { to: '/officer/performance', label: 'Performance & Score', icon: Award },
          { to: '/complaints', label: 'All Complaints', icon: Ticket },
          { to: '/officer/nearby', label: 'Nearby Issues', icon: Map },
          { to: '/officer/map', label: 'Map Operations', icon: Navigation2 },
          { to: '/notifications', label: 'Notifications', icon: Bell, badge: true }
        ]
      },
      {
        title: 'TOOLS',
        items: [
          { to: '/officer/ai', label: 'AI Assistant', icon: Cpu }
        ]
      },
      {
        title: 'PERSONAL',
        items: [
          { to: '/officer/profile', label: 'Profile', icon: User },
          { to: '/settings', label: 'Settings', icon: Settings }
        ]
      }
    ];
  }
  // Citizen categorized sections
  return [
    {
      title: 'Home',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'My Civic Activity',
      items: [
        { to: '/impact', label: 'Civic Impact', icon: Award },
        { to: '/complaints?view=mine', label: 'My Complaints', icon: Ticket },
        { to: '/complaints/new', label: 'Report an Issue', icon: PlusCircle, highlight: true },
        { to: '/complaints?view=followed', label: 'Followed Issues', icon: Bookmark }
      ]
    },
    {
      title: 'Explore',
      items: [
        { to: '/map', label: 'City Map', icon: Map },
        { to: '/map?filter=nearby', label: 'Nearby Issues', icon: Navigation2 }
      ]
    },
    {
      title: 'Communication',
      items: [
        { to: '/notifications', label: 'Notifications', icon: Bell, badge: true }
      ]
    },
    {
      title: 'Account',
      items: [
        { to: '/profile', label: 'Profile & Activity', icon: User },
        { to: '/settings', label: 'Settings', icon: Settings }
      ]
    }
  ];
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  const isOfficer = user?.role === 'officer'
  const isCitizen = !user?.role || user?.role === 'citizen'

  const navSections = React.useMemo(() => getNavSectionsForRole(user?.role), [user?.role]);
  const navItems = React.useMemo(() => (navSections || []).flatMap(s => s.items || []), [navSections]);
  const roleLabel = user?.role === 'admin' ? 'ADMIN PANEL' : user?.role === 'officer' ? 'OFFICER OPERATIONS' : 'CITIZEN PORTAL';

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      api.get('/notifications/unread-count')
        .then(res => {
          const data = unwrapResponse(res)
          setUnreadCount(data?.count || 0)
        })
        .catch(() => {})
    }
    fetchUnread()
    const intv = setInterval(fetchUnread, 15000)
    return () => clearInterval(intv)
  }, [user])

  function handleLogout() {
    logout()
    navigate('/')
  }

  /* ============================================================
   * OFFICER-THEMED SIDEBAR
   * ============================================================ */
  if (isOfficer) {
    const officerContent = (
      <div className="officer-sidebar flex h-full flex-col">
        {/* Brand Area */}
        <div className={`flex h-16 items-center border-b border-white/10 px-3.5 ${collapsed ? 'justify-center' : ''}`}>
          <CivicGreenNetLogo
            variant={collapsed ? 'symbol' : 'full'}
            size={collapsed ? 'sm' : 'sm'}
            theme="white"
            descriptor={roleLabel}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              {!collapsed && (
                <div className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200/50">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/officer'}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'officer-nav-active text-white'
                          : 'officer-nav-item'
                      } ${collapsed ? 'justify-center px-2' : ''}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="relative flex items-center">
                          <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`} aria-hidden="true" />
                          {collapsed && item.badge && unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-emerald-900" />
                          )}
                        </div>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!collapsed && item.badge && unreadCount > 0 && (
                          <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                            {unreadCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Officer Profile & Logout */}
        <div className="border-t border-white/10 p-3">
          <div className={`mb-2 flex items-center gap-3 rounded-lg bg-white/8 p-2.5 backdrop-blur-sm ${collapsed ? 'justify-center' : ''}`}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-emerald-400/30" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-sm font-semibold text-white ring-2 ring-emerald-400/30">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <div className="truncate text-sm font-semibold text-white">{user?.name || 'Officer'}</div>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0 animate-officer-status-pulse" title="Online" />
                </div>
                <div className="truncate text-xs capitalize text-white/50">{user?.role || 'Officer'}</div>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {!collapsed && (
              <button onClick={handleLogout} className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-300/80 transition-colors hover:bg-white/8 hover:text-red-300">
                <LogOut className="h-4 w-4" aria-hidden="true" /> Logout
              </button>
            )}
            <button
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden flex-1 items-center justify-center rounded-lg px-3 py-2 text-white/50 transition-colors hover:bg-white/8 hover:text-white lg:flex"
            >
              {collapsed ? <ChevronsRight className="h-4 w-4" aria-hidden="true" /> : <ChevronsLeft className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    )

    return (
      <>
        {/* Desktop */}
        <aside className={`hidden shrink-0 transition-[width] duration-200 lg:block ${collapsed ? 'w-16' : 'w-64'}`}>
          {officerContent}
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onCloseMobile}
                className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
                aria-hidden="true"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.25 }}
                className="fixed inset-y-0 left-0 z-50 w-72 shadow-xl lg:hidden"
              >
                <button onClick={onCloseMobile} aria-label="Close menu" className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white">
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
                {officerContent}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </>
    )
  }

  /* ============================================================
   * DEFAULT SIDEBAR (citizen / admin)
   * ============================================================ */
  const content = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={`flex h-16 items-center border-b border-slate-200 px-3.5 dark:border-slate-800 ${collapsed ? 'justify-center' : ''}`}>
        <CivicGreenNetLogo
          variant={collapsed ? 'symbol' : 'full'}
          size={collapsed ? 'sm' : 'sm'}
          descriptor={roleLabel}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  className={({ isActive }) => {
                    const isCurrentActive = isActive || (item.to === '/impact' && location.pathname === '/civic-impact');
                    return `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                      item.highlight && !isCurrentActive
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20'
                        : isCurrentActive
                          ? 'bg-emerald-600 text-white dark:bg-emerald-500 shadow-sm font-bold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white'
                    } ${collapsed ? 'justify-center px-2' : ''}`
                  }}
                >
                  {({ isActive }) => {
                    const isCurrentActive = isActive || (item.to === '/impact' && location.pathname === '/civic-impact');
                    return (
                      <>
                        <div className="relative flex items-center">
                          <Icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${isCurrentActive ? 'text-white' : item.highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} aria-hidden="true" />
                          {collapsed && item.badge && unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                          )}
                        </div>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!collapsed && item.badge && unreadCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">
                            {unreadCount}
                          </span>
                        )}
                      </>
                    );
                  }}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User Info & Settings */}
      <div className="border-t border-slate-200 p-3 dark:border-[#24344A]">
        <div className={`mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 dark:bg-[#111C2D] border border-slate-100 dark:border-[#24344A] ${collapsed ? 'justify-center' : ''}`}>
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Profile" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-emerald-500/20" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white shadow-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-slate-900 dark:text-white">{user?.name || 'User'}</div>
              <div className="truncate text-[11px] text-slate-400">{user?.email || 'Citizen'}</div>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {!collapsed && (
            <button onClick={handleLogout} className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-rose-400 dark:hover:bg-rose-950/40">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Logout
            </button>
          )}
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden flex-1 items-center justify-center rounded-lg px-3 py-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#172438] lg:flex"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" aria-hidden="true" /> : <ChevronsLeft className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className={`hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-[#24344A] dark:bg-[#081321] lg:block ${collapsed ? 'w-16' : 'w-64'}`}>
        {content}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl dark:bg-surface-darker lg:hidden"
            >
              <button onClick={onCloseMobile} aria-label="Close menu" className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
