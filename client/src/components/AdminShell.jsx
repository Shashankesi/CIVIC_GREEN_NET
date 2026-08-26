import React, { useContext, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, FileText, Users, Building2, Map, BarChart2,
  ShieldCheck, Bell, LogOut, ShieldAlert, Mail, Activity,
  ChevronsLeft, ChevronsRight, X, UserCheck, Sparkles, Clock, Layers, Award
} from 'lucide-react'
import CivicGreenNetLogo from './brand/CivicGreenNetLogo'
import AuthContext from '../context/AuthContext'
import Topbar from './Topbar'
import adminApi from '../services/admin'
import AIChatButton from './ai/AIChatButton'

// ── Admin sidebar navigation groups ─────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'EXECUTIVE COMMAND',
    items: [
      { tabKey: 'overview', label: 'Command Center', icon: LayoutDashboard }
    ]
  },
  {
    label: 'CITIZEN SERVICES',
    items: [
      { tabKey: 'complaints', label: 'Complaints Queue', icon: FileText, badgeKey: 'overdue' },
      { tabKey: 'notifications', label: 'Notifications', icon: Bell }
    ]
  },
  {
    label: 'CITY & GIS INTELLIGENCE',
    items: [
      { tabKey: 'intelligence', label: 'Civic Intelligence', icon: Sparkles },
      { tabKey: 'map', label: 'Municipal GIS', icon: Map },
      { tabKey: 'sla', label: 'SLA Intelligence', icon: Clock },
      { tabKey: 'wards', label: 'Wards & Zones', icon: Layers }
    ]
  },
  {
    label: 'MUNICIPAL GOVERNANCE',
    items: [
      { tabKey: 'departments', label: 'Departments', icon: Building2 },
      { tabKey: 'officer-approvals', label: 'Officers', icon: UserCheck, badgeKey: 'pendingApprovals' },
      { tabKey: 'reputation', label: 'Reputation & Scores', icon: Award },
      { tabKey: 'users', label: 'User Directory', icon: Users },
      { tabKey: 'reports', label: 'Performance & Reports', icon: BarChart2 },
      { tabKey: 'data-quality', label: 'Data Quality & Alerts', icon: ShieldCheck }
    ]
  },
  {
    label: 'SYSTEM & AUDIT',
    items: [
      { tabKey: 'audit-logs', label: 'Audit Logs', icon: ShieldAlert },
      { tabKey: 'email-center', label: 'Email Center', icon: Mail },
      { tabKey: 'system-health', label: 'System Health', icon: Activity }
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
      <div className={`flex h-16 items-center border-b border-slate-200 px-3.5 dark:border-slate-800 ${collapsed ? 'justify-center' : ''}`}>
        <CivicGreenNetLogo
          variant={collapsed ? 'symbol' : 'full'}
          size={collapsed ? 'sm' : 'sm'}
          descriptor="SMART CITY GOVERNANCE"
        />
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
                const badgeCount = stats?.[item.badgeKey] || 0
                return (
                  <button
                    key={item.tabKey}
                    onClick={() => { onTabClick(item.tabKey); onCloseMobile() }}
                    title={collapsed ? `${item.label}${badgeCount > 0 ? ` (${badgeCount})` : ''}` : undefined}
                    className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/12 dark:text-[#6EE7B7] font-semibold border-l-[3px] border-emerald-500 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-100'
                    } ${collapsed ? 'justify-center px-2' : ''}`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 transition-colors ${isActive ? 'text-emerald-600 dark:text-[#34D399]' : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} aria-hidden="true" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badgeKey && badgeCount > 0 && (
                      <span className="ml-auto inline-flex h-5 items-center justify-center rounded-full bg-rose-100 px-2 text-[10px] font-bold text-rose-600 dark:bg-rose-500/20 dark:text-rose-300">
                        {badgeCount}
                      </span>
                    )}
                    {collapsed && item.badgeKey && badgeCount > 0 && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-200 p-3 dark:border-[#24344A]">
        <div className={`mb-2 flex items-center gap-3 rounded-lg bg-emerald-50/80 p-2.5 dark:bg-[#111C2D] border border-emerald-100 dark:border-[#24344A] ${collapsed ? 'justify-center' : ''}`}>
          <div className="relative shrink-0">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="h-9 w-9 rounded-full object-cover border border-emerald-500/30" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-bold text-white shadow-xs">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            )}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111C2D]" title="Online" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-slate-900 dark:text-white">{user?.name || 'Administrator'}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-[#34D399] bg-emerald-100/80 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-300/50 dark:border-emerald-800/40">
                  <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />
                  ADMINISTRATOR
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  ● Online
                </span>
              </div>
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
      <aside className={`hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-[#24344A] dark:bg-[#081321] lg:block ${collapsed ? 'w-16' : 'w-64'}`}>
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
      <AIChatButton persona="admin" />
    </div>
  )
}
