import React, { useEffect, useState, useCallback, useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusCircle, LayoutGrid, List, MapPin, Calendar, ArrowRight,
  RefreshCw, Map, Filter, ChevronDown, ChevronUp, AlertCircle, Clock, ShieldAlert, CheckCircle2, User
} from 'lucide-react'
import complaintsApi from '../services/complaints'
import citizenApi from '../services/citizen'
import api, { unwrapResponse } from '../services/api'
import AuthContext from '../context/AuthContext'
import AppShell from '../components/AppShell'
import PageHeader from '../ui/PageHeader'
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

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  const base = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
  const serverHost = base.replace(/\/api$/, '');
  return `${serverHost}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function ComplaintList() {
  const { user } = useContext(AuthContext)
  const location = useLocation()
  const navigate = useNavigate()

  const handleOpenComplaint = (c) => {
    navigate(`/complaints/${c.id}`)
  }

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [view, setView] = useState('list')
  const [page, setPage] = useState(1)
  const [viewTab, setViewTab] = useState('all')
  const [stats, setStats] = useState(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [quickChip, setQuickChip] = useState('all')

  // Initialize tab and status filter selection from query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get('view');
    if (v === 'mine') {
      setViewTab('mine');
    } else if (v === 'followed') {
      setViewTab('followed');
    } else {
      setViewTab('all');
    }
    const statusParam = params.get('status');
    if (statusParam) {
      setFilters(prev => ({ ...prev, status: statusParam }));
    }
  }, [location.search, user]);

  const [statsLoading, setStatsLoading] = useState(false)

  // Load stats and summary
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      if (user?.role === 'officer') {
        const res = await api.get('/officer/workload')
        setStats(unwrapResponse(res))
      } else if (user?.role === 'citizen') {
        const res = await api.get('/complaints/stats/summary')
        const body = unwrapResponse(res)
        setStats(body?.stats || body)
      }
    } catch (err) {
      console.error('Failed to load stats', err)
    } finally {
      setStatsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadStats()
  }, [loadStats, viewTab])

  const load = useCallback(async (p = 1, q = query, f = filters, tab = viewTab, chip = quickChip) => {
    setLoading(true)
    setError(null)
    try {
      if (tab === 'followed') {
        const res = await citizenApi.getFollowed({ page: p, limit: 12 })
        const list = res?.items || []
        if (p === 1) setItems(list)
        else setItems((prev) => prev.concat(list))
        setPage(p)
        return
      }

      const params = { page: p, limit: 12, q: q || null, ...f }
      
      // Handle citizen vs officer tabs
      if (tab === 'mine') {
        params.mine = true
      }
      
      // Handle quick filter chips
      if (chip === 'assigned') {
        params.assigned = 'true'
      } else if (chip === 'unassigned') {
        params.assigned = 'false'
      } else if (chip === 'critical') {
        params.priority = 'critical'
      } else if (chip === 'due_soon') {
        params.dueSoon = 'true'
      }

      const r = await complaintsApi.searchComplaints(params)
      const list = r?.items || []
      if (p === 1) setItems(list)
      else setItems((prev) => prev.concat(list))
      setPage(p)
    } catch (e) {
      setError('Could not load complaints.')
    } finally {
      setLoading(false)
    }
  }, [query, filters, viewTab, quickChip])

  useEffect(() => {
    load(1, query, filters, viewTab, quickChip)
    // eslint-disable-next-line
  }, [filters, viewTab, quickChip])

  const handleRefresh = () => {
    load(1, query, filters, viewTab, quickChip)
    loadStats()
  }

  const handleQuickChipChange = (chip) => {
    setQuickChip(chip)
  }

  const clearAdvancedFilters = () => {
    setFilters({})
    setQuery('')
    setQuickChip('all')
  }

  return (
    <AppShell title="Complaints">
      <PageHeader
        title="Complaints"
        subtitle={
          user?.role === 'officer'
            ? 'Monitor and manage civic issues within your operational jurisdiction.'
            : viewTab === 'mine'
            ? 'Track every issue you have reported.'
            : 'Browse and track all civic issues.'
        }
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {user?.role === 'officer' && (
              <Link to="/officer/map">
                <Button variant="outline" size="sm" className="h-8.5 font-bold">
                  <Map className="h-3.5 w-3.5" /> Map View
                </Button>
              </Link>
            )}

            {user?.role === 'citizen' && (
              <Link to="/complaints/new">
                <Button size="sm" className="h-8.5 font-bold">
                  <PlusCircle className="h-4 w-4" /> Report Issue
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Summary strip widget */}
      {user?.role === 'officer' && (
        statsLoading && !stats ? (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[0, 1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : stats ? (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Operational</span>
              <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">{stats.total || 0}</span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Open Queue</span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 block">{stats.open || 0}</span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">In Progress</span>
              <span className="text-xl font-black text-amber-500 mt-1 block">{stats.in_progress || 0}</span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Critical Alerts</span>
              <span className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 block">{stats.critical || 0}</span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Unassigned</span>
              <span className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 block">{stats.unassigned || 0}</span>
            </div>
          </div>
        ) : null
      )}

      {/* Role Tabs */}
      {user && (user.role === 'citizen' || user.role === 'officer') && (
        <div className="flex border-b border-slate-200 dark:border-slate-700/60 mb-6">
          <button
            onClick={() => {
              setViewTab('all');
              setPage(1);
              navigate('/complaints');
            }}
            className={`px-4 py-2.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
              viewTab === 'all'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {user.role === 'officer' ? `All Complaints (${stats?.total || 0})` : 'All City Complaints'}
          </button>
          <button
            onClick={() => {
              setViewTab('mine');
              setPage(1);
              navigate('/complaints?view=mine');
            }}
            className={`px-4 py-2.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
              viewTab === 'mine'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {user.role === 'citizen' ? 'My Complaints' : `My Assignments (${stats?.assigned_to_me || 0})`}
          </button>
          {user.role === 'citizen' && (
            <button
              onClick={() => {
                setViewTab('followed');
                setPage(1);
                navigate('/complaints?view=followed');
              }}
              className={`px-4 py-2.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
                viewTab === 'followed'
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Followed Issues
            </button>
          )}
        </div>
      )}

      {/* Search and Filters Layout */}
      <div className="mb-6 space-y-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1, query, filters, viewTab, quickChip)}
            placeholder="Search by complaint ID, title, category, or address..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-4 pr-12 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            onClick={() => load(1, query, filters, viewTab, quickChip)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Search
          </button>
        </div>

        {/* Quick Filters Chips */}
        {user?.role === 'officer' && (
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Operational', tone: 'emerald' },
              { id: 'assigned', label: 'Assigned to Officer', tone: 'purple' },
              { id: 'unassigned', label: 'Unassigned Issues', tone: 'slate' },
              { id: 'critical', label: 'Critical Priority', tone: 'rose' },
              { id: 'due_soon', label: 'SLA Due Soon', tone: 'amber' }
            ].map((chip) => {
              const active = quickChip === chip.id
              const chipStyles = {
                emerald: active ? 'bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500/20 dark:border-emerald-500/50 dark:text-[#34D399]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300',
                purple: active ? 'bg-purple-600 border-purple-600 text-white dark:bg-purple-500/20 dark:border-purple-500/50 dark:text-purple-300' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-300',
                slate: active ? 'bg-slate-700 border-slate-700 text-white dark:bg-slate-500/20 dark:border-slate-500/50 dark:text-slate-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-500/10 dark:border-slate-500/20 dark:text-slate-400',
                rose: active ? 'bg-rose-600 border-rose-600 text-white dark:bg-rose-500/20 dark:border-rose-500/50 dark:text-rose-300' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400',
                amber: active ? 'bg-amber-600 border-amber-600 text-white dark:bg-amber-500/20 dark:border-amber-500/50 dark:text-amber-300' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400'
              }
              return (
                <button
                  key={chip.id}
                  onClick={() => handleQuickChipChange(chip.id)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-all shadow-sm ${chipStyles[chip.tone]}`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Advanced Filters Expandable Card */}
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex w-full items-center justify-between px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Advanced Query Filters
            </div>
            {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          <AnimatePresence>
            {advancedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-slate-50 p-5 dark:border-slate-800/80 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Category</label>
                    <select
                      value={filters.category || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">All Categories</option>
                      <option value="Roads & Infrastructure">Roads & Infrastructure</option>
                      <option value="Sanitation & Waste">Sanitation & Waste</option>
                      <option value="Water Supply">Water Supply</option>
                      <option value="Street Lighting">Street Lighting</option>
                      <option value="Drainage">Drainage</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Status</label>
                    <select
                      value={filters.status || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">All Statuses</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Priority</label>
                    <select
                      value={filters.priority || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value || undefined }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">All Priorities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3 flex justify-end gap-2 border-t border-slate-50 pt-4 dark:border-slate-800/80">
                    <Button variant="outline" size="sm" onClick={clearAdvancedFilters} className="text-xs">
                      Clear Filters
                    </Button>
                    <Button size="sm" onClick={() => { setAdvancedOpen(false); load(1, query, filters, viewTab, quickChip) }} className="text-xs">
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {error && !loading && <ErrorState title="Unable to load complaints" message={error} onRetry={() => load(1)} />}

      {loading && page === 1 && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={MapPin}
          title="No complaints found"
          subtitle="No complaints match your current search queries or operational scope."
          action={
            (query || Object.keys(filters).length > 0 || quickChip !== 'all') ? (
              <Button variant="outline" onClick={clearAdvancedFilters}>Reset Search Filters</Button>
            ) : null
          }
        />
      )}

      {/* Complaints List Table / Grid Render */}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-3">
            {items.map((c) => {
              const imgUrl = c.images?.[0]?.url;
              const [mainAddr, ...restAddr] = (c.address || 'Unknown').split(',');
              
              // Status pill styling matching Admin
              const statusPillColors = {
                open: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
                assigned: 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
                in_progress: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
                on_hold: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700',
                resolved: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30',
                closed: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
                rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
                pending: 'bg-slate-100 text-slate-750 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
              };

              const priorityPillColors = {
                critical: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30',
                high: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30',
                medium: 'bg-slate-50 text-slate-700 border-slate-250 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
                low: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
              };

              return (
                <div
                  key={c.id}
                  onClick={() => handleOpenComplaint(c)}
                  className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-slate-150 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
                >
                  {/* LEFT: Image Thumbnail */}
                  <div className="w-full md:w-28 h-20 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-850 dark:bg-slate-955 flex items-center justify-center">
                    {imgUrl ? (
                      <img
                        src={resolveImageUrl(imgUrl)}
                        alt="Thumbnail"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="text-[9px] font-bold uppercase tracking-wider text-slate-400 select-none flex items-center justify-center h-full w-full"
                      style={{ display: imgUrl ? 'none' : 'flex' }}
                    >
                      No Photo
                    </div>
                  </div>

                  {/* MAIN CONTENT: ID, Title, Description, Category */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold text-slate-400 select-all">
                        #CGN-{String(c.id).padStart(5, '0')}
                      </span>
                      
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-3xs font-extrabold uppercase tracking-wider ${statusPillColors[c.status] || statusPillColors.pending}`}>
                          {c.status?.replace('_', ' ') || 'open'}
                        </span>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-3xs font-extrabold uppercase tracking-wider ${priorityPillColors[c.priority] || priorityPillColors.medium}`}>
                          {c.priority || 'medium'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug truncate">
                        {c.title || 'Untitled'}
                      </h3>
                      <p className="text-xs text-slate-455 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {c.summary || c.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Metadata row */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-2xs text-slate-455 dark:text-slate-400 font-medium mt-1">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-350 capitalize">
                        {c.category?.replace('_', ' ') || 'General'}
                      </span>

                      <span className="flex items-center gap-0.5 truncate max-w-[150px]" title={c.address}>
                        <span>📍</span>
                        <span>{mainAddr?.trim() || 'Chandigarh'}</span>
                        {restAddr.length > 0 && <span className="text-slate-350 dark:text-slate-550 ml-1 truncate">({restAddr[0]?.trim()})</span>}
                      </span>

                      <span className="flex items-center gap-1">
                        <span>👤</span>
                        {c.officer_id ? (
                          <span className="truncate max-w-[100px] font-semibold text-slate-700 dark:text-slate-300">
                            {c.officer_name || 'Assigned Officer'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded border border-amber-250 bg-amber-50/60 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
                            Unassigned
                          </span>
                        )}
                      </span>

                      <span className="text-slate-400 dark:text-slate-500">
                        {relativeTime(c.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* RIGHT SIDE: Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 md:justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenComplaint(c)}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-slate-50 hover:text-emerald-700 dark:border-slate-750 dark:bg-slate-900 dark:text-emerald-450 dark:hover:bg-slate-855 transition-colors shadow-3xs"
                    >
                      View →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {items.length >= 12 && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => load(page + 1, query, filters, viewTab, quickChip)}>
                Load More Issues
              </Button>
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}
