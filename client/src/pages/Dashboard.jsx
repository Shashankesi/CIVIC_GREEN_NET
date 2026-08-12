import React, { useEffect, useState, useContext, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, Clock, RefreshCw, CheckCircle2, PlusCircle, Ticket, Map, ArrowRight } from 'lucide-react'
import AuthContext from '../context/AuthContext'
import api, { unwrapResponse } from '../services/api'
import AppShell from '../components/AppShell'
import PageHeader from '../ui/PageHeader'
import DashboardCard from '../components/DashboardCard'
import TrendChart from '../components/TrendChart'
import ChartPie from '../components/ChartPie'
import AIInsights from '../components/AIInsights'
import ActivityFeed from '../components/ActivityFeed'
import MapView from '../components/MapView'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../ui/StatusBadge'
import Button from '../ui/Button'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useContext(AuthContext)
  const [data, setData] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, notifRes] = await Promise.allSettled([
        api.get('/complaints/stats/summary'),
        api.get('/notifications', { params: { page: 1 } })
      ])
      if (statsRes.status === 'fulfilled') {
        const body = unwrapResponse(statsRes.value)
        setData(body?.stats ? body : { stats: body })
      } else {
        setError('Could not load dashboard data.')
      }
      if (notifRes.status === 'fulfilled') {
        const nbody = unwrapResponse(notifRes.value)
        const items = (nbody?.items) || []
        setActivity(items.slice(0, 8))
      }
    } catch (e) {
      setError('Something went wrong loading your dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const stats = data?.stats
  const trend = useMemo(() => (data?.trend || []).map((r) => ({ label: r.day || r.month || '—', count: Number(r.count) || 0 })), [data])
  const monthly = useMemo(() => (data?.monthly || []).map((r) => ({ label: r.month, count: parseInt(r.count, 10) || 0 })), [data])
  const categories = useMemo(() => (data?.categories || []).map((c) => ({ label: c.category, value: Number(c.count) || 0 })), [data])
  const recent = data?.recent || []

  const head = greeting()
  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <AppShell title="Dashboard">
      <PageHeader
        title={`${head}, ${firstName}`}
        subtitle="Here's what's happening with your civic reports."
        actions={
          <>
            <Button variant="outline" onClick={() => window.location.href = '/complaints'}>
              <Ticket className="h-4 w-4" aria-hidden="true" /> View Complaints
            </Button>
            <Button onClick={() => window.location.href = '/complaints/new'}>
              <PlusCircle className="h-4 w-4" aria-hidden="true" /> Report Issue
            </Button>
          </>
        }
      />

      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-lg lg:col-span-2" />
            <Skeleton className="h-72 rounded-lg" />
          </div>
        </div>
      )}

      {error && !loading && <ErrorState title="Unable to load dashboard" message={error} onRetry={load} />}

      {data && !loading && !error && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard title="Total Complaints" value={stats?.total || 0} icon={FileText} tone="brand" subtitle="All time" />
            <DashboardCard title="Open" value={stats?.open || 0} icon={Clock} tone="blue" subtitle="Awaiting action" />
            <DashboardCard title="In Progress" value={stats?.in_progress || 0} icon={RefreshCw} tone="amber" subtitle="Being worked on" />
            <DashboardCard title="Resolved" value={stats?.resolved || 0} icon={CheckCircle2} tone="brand" subtitle="Completed" />
          </div>

{/* Map preview */}
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-0">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Civic Issues Map</h3>
                <p className="mt-0.5 text-xs text-slate-400">Live complaint density across your area</p>
              </div>
              <Link to="/map" className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                Explore full map <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="p-5">
              <MapView height={300} showLegend={false} preview showControls={false} />
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Complaint Trend (30 days)</h3>
              {trend.length ? <TrendChart data={trend} /> : <EmptyState title="No trend data yet" />}
            </div>
            <div className="card p-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Category Distribution</h3>
              {categories.length ? <ChartPie data={categories} /> : <EmptyState title="No categories yet" />}
            </div>
          </div>

          {/* Monthly + AI insights */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Monthly Trend</h3>
              {monthly.length ? <TrendChart data={monthly} height={220} /> : <EmptyState title="No monthly data yet" />}
            </div>
            <AIInsights stats={stats} categories={data?.categories || []} />
          </div>

          {/* Recent + Activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Complaints</h3>
                <Link to="/complaints" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">View all</Link>
              </div>
              {recent.length === 0 ? (
                <EmptyState title="No complaints yet" subtitle="Report your first issue to get started." icon={FileText} />
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recent.map((r) => (
                    <li key={r.id} className="py-3">
                      <Link to={`/complaints/${r.id}`} className="group block">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-slate-800 group-hover:text-brand-600 dark:text-slate-100 dark:group-hover:text-brand-400">
                            {r.title || `Complaint #${r.id}`}
                          </span>
                          <StatusBadge status={r.status} />
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                          <span>{r.category || 'General'}</span>
                          <span>•</span>
                          <span>{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <ActivityFeed items={activity} />
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link to="/complaints/new" className="card card-hover flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300"><PlusCircle className="h-5 w-5" /></span>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-white">Report Issue</div>
                <div className="text-xs text-slate-400">Submit a civic complaint</div>
              </div>
            </Link>
            <Link to="/complaints" className="card card-hover flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"><Ticket className="h-5 w-5" /></span>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-white">View Complaints</div>
                <div className="text-xs text-slate-400">Track all reports</div>
              </div>
            </Link>
            <Link to="/map" className="card card-hover flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300"><Map className="h-5 w-5" /></span>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-white">Explore Map</div>
                <div className="text-xs text-slate-400">See issues nearby</div>
              </div>
            </Link>
          </div>
        </motion.div>
      )}
    </AppShell>
  )
}
