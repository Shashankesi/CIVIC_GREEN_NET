import React, { useContext } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutDashboard, Ticket, PlusCircle, Bell, Map, LogOut, ChevronsLeft, ChevronsRight, Sprout, X } from 'lucide-react'
import AuthContext from '../context/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/complaints', label: 'Complaints', icon: Ticket },
  { to: '/complaints/new', label: 'Report Issue', icon: PlusCircle },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/notifications', label: 'Notifications', icon: Bell }
]

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  const content = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={`flex h-16 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800 ${collapsed ? 'justify-center' : ''}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
          <Sprout className="h-5 w-5" aria-hidden="true" />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900 dark:text-white">Civic GreenNet</div>
            <div className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">Civic Tech</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {!collapsed && (
          <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Menu</div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                } ${collapsed ? 'justify-center px-2' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-500" aria-hidden="true" />}
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className={`mb-2 flex items-center gap-3 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50 ${collapsed ? 'justify-center' : ''}`}>
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Profile" className="h-9 w-9 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name || 'User'}</div>
              <div className="truncate text-xs capitalize text-slate-400">{user?.role || 'Citizen'}</div>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {!collapsed && (
            <button onClick={handleLogout} className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Logout
            </button>
          )}
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden flex-1 items-center justify-center rounded-lg px-3 py-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:flex"
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
      <aside className={`hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-slate-800 dark:bg-surface-darker lg:block ${collapsed ? 'w-16' : 'w-64'}`}>
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
