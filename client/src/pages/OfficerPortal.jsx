import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ClipboardList, Inbox, Loader2, CheckCircle2, XCircle, Building2,
  ArrowRight, Map, Cpu, AlertTriangle, Clock, User, ShieldAlert,
  AlertCircle, ChevronRight, ShieldCheck, MapPin, BellRing, Trophy, BarChart3
} from 'lucide-react'
import toast from 'react-hot-toast'
import officerApi from '../services/officer'
import AppShell from '../components/AppShell'
import PageHeader from '../ui/PageHeader'
import MapView from '../components/MapView'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import StatusBadge from '../ui/StatusBadge'
import Button from '../ui/Button'

// Officer-specific extracted components
import OfficerHero from '../components/officer/OfficerHero'
import OfficerMetricCard from '../components/officer/OfficerMetricCard'
import OfficerSLA from '../components/officer/OfficerSLA'
import OfficerQuickActions from '../components/officer/OfficerQuickActions'

export default function OfficerPortal() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingAvailability, setUpdatingAvailability] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await officerApi.getDashboard()
      setData(res)
    } catch (e) {
      console.error(e)
      setError('Could not load officer operations data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAvailabilityChange = async (newVal) => {
    setUpdatingAvailability(true)
    try {
      await officerApi.updateAvailability(newVal)
      toast.success(`Availability status updated to ${newVal}`)
      setData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          officer: {
            ...prev.officer,
            availability: newVal
          }
        }
      })
    } catch (e) {
      toast.error('Failed to update availability status.')
    } finally {
      setUpdatingAvailability(false)
    }
  }

  const profile = data?.officer || {}
  const metrics = data?.metrics || {}
  const sla = data?.sla || {}
  const assignments = data?.assignments || []
  const nearbyIssues = data?.nearbyIssues || []
  const recentActivity = data?.recentActivity || []
  const notifications = data?.notifications || []
  const performance = data?.performance || {}

  // Greeting based on time of day
  const getGreeting = () => {
    const hr = new Date().getHours()
    if (hr < 12) return 'Good morning'
    if (hr < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // Attention Required calculations
  const slaAlerts = []
  if (metrics.overdue > 0) {
    slaAlerts.push({
      type: 'overdue',
      text: `${metrics.overdue} complaint${metrics.overdue > 1 ? 's' : ''} overdue (SLA breached)`,
      icon: XCircle,
      color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400',
      link: '/officer/assignments?status=overdue'
    })
  }
  if (metrics.highPriority > 0) {
    slaAlerts.push({
      type: 'high_priority',
      text: `${metrics.highPriority} high priority assignment${metrics.highPriority > 1 ? 's' : ''}`,
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400',
      link: '/officer/assignments?priority=high'
    })
  }
  if (metrics.dueSoon > 0) {
    slaAlerts.push({
      type: 'due_soon',
      text: `${metrics.dueSoon} complaint${metrics.dueSoon > 1 ? 's' : ''} due within 24 hours`,
      icon: Clock,
      color: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/30 dark:text-orange-400',
      link: '/officer/assignments?sla=soon'
    })
  }
  if (notifications.length > 0) {
    slaAlerts.push({
      type: 'notifications',
      text: `${notifications.length} unread notification${notifications.length > 1 ? 's' : ''} in portal`,
      icon: BellRing,
      color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400',
      link: '/notifications'
    })
  }

  // KPI card definitions using real metrics
  const kpiCards = [
    {
      to: '/officer/assignments',
      accentColor: 'emerald',
      icon: ClipboardList,
      label: 'Total Assigned',
      value: metrics.totalAssigned || 0,
      subtitle: 'Active workload'
    },
    {
      to: '/complaints',
      accentColor: 'blue',
      icon: Inbox,
      label: 'Open Queue',
      value: metrics.openQueue || 0,
      subtitle: 'Unassigned cases'
    },
    {
      to: '/officer/assignments?status=accepted',
      accentColor: 'slate',
      icon: CheckCircle2,
      label: 'Accepted',
      value: metrics.accepted || 0,
      subtitle: 'Pending fieldwork'
    },
    {
      to: '/officer/assignments?status=in_progress',
      accentColor: 'amber',
      icon: Loader2,
      label: 'In Progress',
      value: metrics.inProgress || 0,
      subtitle: 'Field operations'
    },
    {
      to: '/officer/assignments?status=resolved',
      accentColor: 'emerald',
      icon: CheckCircle2,
      label: 'Resolved',
      value: metrics.resolved || 0,
      subtitle: 'Completed cases'
    },
    {
      to: '/officer/assignments?status=overdue',
      accentColor: 'rose',
      icon: AlertCircle,
      label: 'SLA Overdue',
      value: metrics.overdue || 0,
      subtitle: 'Requires action'
    }
  ]

  return (
    <AppShell title="Officer Operations Center">
      <div className="space-y-6 pb-8">

        {loading && (
          <div className="space-y-6">
            <Skeleton className="h-40 rounded-2xl" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        )}

        {error && !loading && <ErrorState title="Unable to load operations portal" message={error} onRetry={load} />}

        {!loading && !error && data && (
          <div className="space-y-6">

            {/* ========== HERO CARD ========== */}
            <OfficerHero
              profile={profile}
              getGreeting={getGreeting}
              updatingAvailability={updatingAvailability}
              onAvailabilityChange={handleAvailabilityChange}
              Loader2Icon={Loader2}
            />

            {/* ========== ATTENTION REQUIRED ========== */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Attention Required</h3>
              {slaAlerts.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/30 px-4 py-3 text-xs text-emerald-850 dark:border-emerald-950/25 dark:bg-emerald-950/15 dark:text-emerald-400 shadow-sm">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-500 shrink-0" />
                  <span className="font-semibold">✓ You are fully up to date. No pending overdue assignments or critical SLA warnings detected.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {slaAlerts.map((alert, idx) => {
                    const Icon = alert.icon
                    return (
                      <Link key={idx} to={alert.link} className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-xs transition-all hover:shadow-md ${alert.color}`}>
                        <div className="flex items-center gap-2.5">
                          <Icon className="h-4.5 w-4.5 shrink-0" />
                          <span className="font-bold">{alert.text}</span>
                        </div>
                        <ChevronRight className="h-4.5 w-4.5 shrink-0 opacity-60" />
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ========== KPI METRIC CARDS ========== */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Operational Workload Metrics</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {kpiCards.map((kpi, idx) => (
                  <OfficerMetricCard key={idx} {...kpi} />
                ))}
              </div>
            </div>

            {/* ========== SLA + QUICK ACTIONS ROW ========== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <OfficerSLA sla={sla} performance={performance} />
              <OfficerQuickActions />
            </div>

            {/* ========== ASSIGNMENTS + MAP ROW ========== */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-10 items-start">

              {/* Workload Assignments */}
              <div className="officer-card p-5 lg:col-span-6 min-h-[420px] flex flex-col">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                        <ClipboardList className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      Workload Assignments
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Current active tasks under your direct scope</p>
                  </div>
                  <Link to="/officer/assignments" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 transition-colors">
                    Full Queue <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="flex-1">
                  {assignments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/30 p-8 text-center dark:border-slate-700 dark:bg-slate-800/20 h-full min-h-[260px]">
                      {/* Empty state SVG */}
                      <svg className="h-16 w-16 mb-3" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                        <rect x="14" y="8" width="36" height="48" rx="4" stroke="currentColor" strokeWidth="2" className="text-slate-200 dark:text-slate-700" fill="none" />
                        <path d="M24 4h16v8a4 4 0 01-4 4H28a4 4 0 01-4-4V4z" className="text-slate-200 dark:text-slate-700" fill="currentColor" />
                        <line x1="22" y1="24" x2="42" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-200 dark:text-slate-700" />
                        <line x1="22" y1="32" x2="36" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-200 dark:text-slate-700" />
                        <line x1="22" y1="40" x2="30" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-200 dark:text-slate-700" />
                        <circle cx="46" cy="46" r="12" className="text-emerald-100 dark:text-emerald-900/30" fill="currentColor" />
                        <path d="M41 46l3 3 5-6" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No active assignments</h4>
                      <p className="text-[11px] text-slate-400 max-w-[280px] mt-1">You're all caught up! Great job. New complaints assigned to you will appear here dynamically.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {assignments.map((c) => (
                        <div key={c.id} className="group relative flex flex-col justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 transition-all hover:border-slate-200 hover:shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:border-slate-700 sm:flex-row sm:items-center">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400">#CGN-{String(c.id).padStart(5, '0')}</span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{c.category || 'General'}</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {c.title || 'Untitled'}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
                              <span className="capitalize font-semibold">{c.priority || 'medium'} priority</span>
                              <span>•</span>
                              <span className="max-w-[220px] truncate">{c.address || 'No location specified'}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 sm:border-t-0 sm:pt-0 gap-3 shrink-0">
                            <StatusBadge status={c.status} />
                            <Link to={`/complaints/${c.id}`}>
                              <Button size="xs" variant="secondary" className="flex items-center gap-1 font-bold">
                                View <ArrowRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Command Map */}
              <div className="officer-card p-5 lg:col-span-4 min-h-[420px] flex flex-col">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                        <Map className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      Command Map
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Geographical view of local incidents</p>
                  </div>
                  <Link to="/officer/map" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 transition-colors">
                    Full View <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {/* Map */}
                <div className="flex-1 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 min-h-[280px]">
                  <MapView height={300} complaints={[...assignments, ...nearbyIssues]} />
                </div>

                {/* Legend */}
                <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-bold text-slate-400 justify-center">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Assigned
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span> Critical
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span> Nearby
                  </span>
                </div>
              </div>

            </div>

          </div>
        )}
      </div>
    </AppShell>
  )
}
