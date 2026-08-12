import React, { useContext, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, FileText, Users, Building2, Map, BarChart2,
  ShieldCheck, Bell, LogOut, Sprout,
  ChevronsLeft, ChevronsRight, X, UserCheck
} from 'lucide-react'
import AuthContext from '../context/AuthContext'
import Topbar from './Topbar'
import adminApi from '../services/admin'

// ── Admin sidebar navigation groups ─────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'OVERVIEW',
    items: [
      { tabKey: 'overview', label: 'Command Center', icon: LayoutDashboard }
    ]
  },
  {
    label: 'CITIZEN SERVICES',
    items: [
      { tabKey: 'complaints', label: 'Complaints', icon: FileText, badgeKey: 'overdue' },
      { tabKey: 'notifications', label: 'Notifications', icon: Bell }
    ]
  },
  {
    label: 'CITY INTELLIGENCE',
    items: [
      { tabKey: 'map', label: 'Live Map', icon: Map },
      { tabKey: 'reports', label: 'Analytics & Reports', icon: BarChart2 }
    ]
  },
  {
    label: 'GOVERNANCE',
    items: [
      { tabKey: 'users', label: 'User Directory', icon: Users },
      { tabKey: 'officer-approvals', label: 'Officer Approvals', icon: UserCheck, badgeKey: 'pendingApprovals' },
      { tabKey: 'departments', label: 'Departments', icon: Building2 }
    ]
  }
]

function SidebarContent({ collapsed, onToggleCollapse, onCloseMobile, activeTab, onTabClick, stats }) {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={`flex h-16 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800 ${collapsed ? 'justify-center' : ''}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-lg">
          <Sprout className="h-5 w-5" aria-hidden="true" />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">CIVIC GREENNET</div>
            <div className="truncate text-[9px] font-semibold uppercase tracking-wider text-emerald-600">Smart City Governance</div>
          </div>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="mb-1 px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.tabKey
                return (
                  <button
                    key={item.tabKey}
                    onClick={() => { onTabClick(item.tabKey); onCloseMobile() }}
                    className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    } ${collapsed ? 'justify-center px-2' : ''}`}
                  >
                    {isActive && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-emerald-600" aria-hidden="true" />}
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badgeKey && stats?.[item.badgeKey] > 0 && (
                      <span className="ml-auto inline-flex h-5 items-center justify-center rounded-full bg-red-100 px-2 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        {stats[item.badgeKey]}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className={`mb-2 flex items-center gap-3 rounded-lg bg-emerald-50/50 p-2 dark:bg-emerald-950/10 ${collapsed ? 'justify-center' : ''}`}>
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Profile" className="h-9 w-9 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </span>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name || 'Admin'}</div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold uppercase">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                Administrator
              </div>
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
}

export default function AdminShell({ children, title, activeTab, onTabClick }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [stats, setStats] = useState({ overdue: 0, pendingApprovals: 0 })

  useEffect(() => {
    let active = true
    async function fetchStats() {
      try {
        const d = await adminApi.getDashboard()
        if (active) {
          setStats({
            overdue: d?.complaints?.overdue || 0,
            pendingApprovals: d?.complaints?.pendingApprovals || 0
          })
        }
      } catch (e) {
        // non-fatal
      }
    }
    fetchStats()
    const timer = setInterval(fetchStats, 30000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  // If no external tab management provided, use URL search params
  const resolvedTab = activeTab ?? (searchParams.get('tab') || 'overview')
  function handleTabClick(key) {
    if (onTabClick) {
      onTabClick(key)
    } else {
      setSearchParams(key === 'overview' ? {} : { tab: key })
    }
  }

  const sidebarProps = {
    collapsed,
    onToggleCollapse: () => setCollapsed(!collapsed),
    onCloseMobile: () => setMobileOpen(false),
    activeTab: resolvedTab,
    onTabClick: handleTabClick,
    stats
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-surface-darker">
      {/* Desktop sidebar */}
      <aside className={`hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-slate-800 dark:bg-surface-darker lg:block ${collapsed ? 'w-16' : 'w-64'}`}>
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
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
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
              <SidebarContent {...sidebarProps} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onToggleSidebar={() => setMobileOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
