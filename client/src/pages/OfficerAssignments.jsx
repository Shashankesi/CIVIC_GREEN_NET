import React, { useEffect, useState, useCallback, useContext } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ClipboardList, LayoutGrid, List, MapPin, Calendar, ArrowRight, RefreshCw, Clock, AlertTriangle } from 'lucide-react'
import complaintsApi from '../services/complaints'
import api, { unwrapResponse } from '../services/api'
import AuthContext from '../context/AuthContext'
import AppShell from '../components/AppShell'
import PageHeader from '../ui/PageHeader'
import SearchBar from '../components/SearchBar'
import FilterPanel from '../components/FilterPanel'
import ComplaintCard from '../components/ComplaintCard'
import StatusBadge from '../ui/StatusBadge'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import Button from '../ui/Button'

function relativeTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return d.toLocaleDateString()
}

function getSlaIndicator(dueDateStr, status) {
  if (!dueDateStr || status === 'resolved' || status === 'closed') return null;
  const due = new Date(dueDateStr);
  const diffMs = due.getTime() - Date.now();
  if (diffMs < 0) {
    return { text: 'OVERDUE', color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40' };
  }
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffHours < 24) {
    return { text: `${diffHours}h ${diffMins}m remaining`, color: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40' };
  }
  const diffDays = Math.floor(diffHours / 24);
  return { text: `${diffDays}d remaining`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40' };
}

export default function OfficerAssignments() {
  const { user } = useContext(AuthContext)
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [view, setView] = useState('grid')
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState(null)

  // Initialize stats and filters
  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/officer/workload')
      setStats(unwrapResponse(res))
    } catch (err) {
      console.error('Failed to load workload stats', err)
    }
  }, [])

  const load = useCallback(async (p = 1, q = query, f = filters) => {
    setLoading(true)
    setError(null)
    try {
      const params = { page: p, limit: 12, q: q || null, mine: true, ...f }
      const r = await complaintsApi.searchComplaints(params)
      const list = r?.items || []
      if (p === 1) setItems(list)
      else setItems((prev) => prev.concat(list))
      setPage(p)
    } catch (e) {
      setError('Could not load assigned complaints.')
    } finally {
      setLoading(false)
    }
  }, [query, filters])

  useEffect(() => {
    load(1, query, filters)
    loadStats()
  }, [filters, load, loadStats])

  function submitSearch(q) {
    setQuery(q)
    load(1, q, filters)
  }

  return (
    <AppShell title="My Assignments">
      <PageHeader
        title="My Assignments"
        subtitle="Manage and resolve your assigned municipal complaints."
        actions={
          <button
            onClick={() => { load(1); loadStats(); }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Refresh Queue"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
        }
      />

      {/* Stats Summary Widget */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-xl border border-slate-100 bg-white p-4 text-center shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned to Me</div>
            <div className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.assigned_to_me ?? stats.total ?? 0}</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-4 text-center shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Open Queue</div>
            <div className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{stats.open || 0}</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-4 text-center shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Progress</div>
            <div className="mt-1 text-2xl font-black text-amber-500 dark:text-amber-400">{stats.in_progress || 0}</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-4 text-center shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SLA Due Soon</div>
            <div className="mt-1 text-2xl font-black text-orange-500 dark:text-orange-400">{stats.due_soon || 0}</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-4 text-center shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolved</div>
            <div className="mt-1 text-2xl font-black text-slate-800 dark:text-white">{stats.resolved || 0}</div>
          </div>
        </div>
      )}

      {/* Quick filters for Queue Status */}
      <div className="mb-5 flex flex-wrap gap-2">
        {['all', 'open', 'in_progress', 'resolved', 'reopened'].map((st) => {
          const active = (filters.status || 'all') === st;
          const label = st === 'all' ? 'All Assignments' : st === 'in_progress' ? 'In Progress' : st.charAt(0).toUpperCase() + st.slice(1);
          return (
            <button
              key={st}
              onClick={() => setFilters((prev) => ({ ...prev, status: st === 'all' ? undefined : st }))}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 shadow-sm border ${
                active
                  ? 'bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-500'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mb-5">
        <SearchBar value={query} onChange={setQuery} onSearch={submitSearch} loading={loading} />
      </div>
      <div className="mb-5">
        <FilterPanel filters={filters} setFilters={setFilters} />
      </div>

      {error && !loading && <ErrorState title="Unable to load assignments" message={error} onRetry={() => load(1)} />}

      {loading && page === 1 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card overflow-hidden">
              <Skeleton className="h-40" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No assigned issues in queue"
          subtitle="You do not have any complaints matching this query assigned to you."
          action={
            <Link to="/complaints">
              <Button>Browse All Complaints</Button>
            </Link>
          }
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => {
              const sla = getSlaIndicator(c.sla_due_at, c.status);
              return (
                <div key={c.id} className="relative flex flex-col">
                  <ComplaintCard complaint={c} showProgress={true} />
                  {/* Floating SLA Badge */}
                  {sla && (
                    <div className={`absolute top-[44%] right-4 border text-[9px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5 shadow-sm ${sla.color}`}>
                      SLA: {sla.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {items.length >= 12 && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => load(page + 1, query, filters)}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </AppShell>
  )
}
