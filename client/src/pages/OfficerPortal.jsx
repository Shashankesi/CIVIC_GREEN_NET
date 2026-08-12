import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Inbox, Loader, CheckCircle2, XCircle, Building2, ArrowRight, Map } from 'lucide-react'
import officerApi from '../services/officer'
import AppShell from '../components/AppShell'
import PageHeader from '../ui/PageHeader'
import DashboardCard from '../components/DashboardCard'
import MapView from '../components/MapView'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../ui/StatusBadge'
import Button from '../ui/Button'

const statuses = [
  { key: null, label: 'All', icon: Inbox },
  { key: 'pending', label: 'Pending', icon: ClipboardList },
  { key: 'open', label: 'Open', icon: Inbox },
  { key: 'in_progress', label: 'In Progress', icon: Loader },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle2 },
  { key: 'rejected', label: 'Rejected', icon: XCircle }
]

export default function OfficerPortal() {
  const [workload, setWorkload] = useState(null)
  const [dept, setDept] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [wl, ds] = await Promise.allSettled([officerApi.getWorkload(), officerApi.getDepartmentStats()])
      if (wl.status === 'fulfilled') setWorkload(wl.value)
      if (ds.status === 'fulfilled') setDept(ds.value)
    } catch (e) {
      setError('Could not load officer data.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAssigned = useCallback(async () => {
    try {
      const r = await officerApi.getAssignedComplaints({ status: filter, limit: 50 })
      setItems(r?.items || [])
    } catch (e) {
      setItems([])
    }
  }, [filter])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadAssigned() }, [loadAssigned])

  const wl = workload || {}

  return (
    <AppShell title="Officer Portal">
      <PageHeader
        title="Officer Portal"
        subtitle="Manage your assigned complaints and department workload."
        actions={
          <Button variant="outline" onClick={() => window.location.href = '/map'}>
            <Building2 className="h-4 w-4" aria-hidden="true" /> Open Map
          </Button>
        }
      />

      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
          <Skeleton className="h-72 rounded-lg" />
        </div>
      )}

      {error && !loading && <ErrorState title="Unable to load portal" message={error} onRetry={load} />}

      {!loading && !error && (
        <div className="space-y-6">
          {/* Workload KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard title="Assigned" value={wl.total || 0} icon={ClipboardList} tone="brand" subtitle="All assigned" />
            <DashboardCard title="Pending" value={wl.pending || 0} icon={ClipboardList} tone="slate" subtitle="Awaiting action" />
            <DashboardCard title="In Progress" value={wl.in_progress || 0} icon={Loader} tone="amber" subtitle="Being worked" />
            <DashboardCard title="Resolved" value={wl.resolved || 0} icon={CheckCircle2} tone="brand" subtitle="Completed" />
          </div>

          {/* Department summary */}
          {dept?.department && (
            <div className="card p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Your Department</h3>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-lg bg-brand-100 px-3 py-1.5 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  <Building2 className="h-4 w-4" aria-hidden="true" /> {dept.department.name}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {dept.stats?.total || 0} complaints • {dept.stats?.resolved || 0} resolved ({dept.stats?.resolutionRate || 0}% rate)
                </span>
              </div>
            </div>
          )}

{/* Officer map */}
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-0">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Map className="h-4 w-4 text-brand-500" aria-hidden="true" />
                  Assigned Complaints Map
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">Locations within your assigned &amp; high-priority queue</p>
              </div>
              <Link to="/map" className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                Explore full map <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="p-5">
              <MapView height={320} filters={{ status: filter || null }} />
            </div>
          </div>

          {/* Assigned complaints queue */}
          <div className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Assigned Complaints</h3>
              <div className="flex flex-wrap gap-1">
                {statuses.map((s) => (
                  <button
                    key={s.key || 'all'}
                    onClick={() => setFilter(s.key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      filter === s.key
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    <s.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {items.length === 0 ? (
              <EmptyState title="No complaints here" subtitle="No assigned complaints match this filter." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((c) => (
                  <li key={c.id} className="py-3">
                    <Link to={`/complaints/${c.id}`} className="group flex items-center justify-between gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-400">#{c.id}</span>
                          <span className="truncate text-sm font-medium text-slate-800 group-hover:text-brand-600 dark:text-slate-100 dark:group-hover:text-brand-400">
                            {c.title || 'Untitled'}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                          <span>{c.category || 'General'}</span>
                          {c.priority && <span className="capitalize">{c.priority} priority</span>}
                          <span>{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={c.status} />
                        <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" aria-hidden="true" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
