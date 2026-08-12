import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PlusCircle, LayoutGrid, List, MapPin, Calendar, ArrowRight } from 'lucide-react'
import complaintsApi from '../services/complaints'
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

export default function ComplaintList() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [view, setView] = useState('grid')
  const [page, setPage] = useState(1)

  const load = useCallback(async (p = 1, q = query, f = filters) => {
    setLoading(true)
    setError(null)
    try {
      const params = { page: p, limit: 12, q: q || null, ...f }
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
  }, [])

  useEffect(() => { load(1) }, [])

  function submitSearch(q) {
    setQuery(q)
    load(1, q, filters)
  }

  useEffect(() => {
    load(1, query, filters)
    // eslint-disable-next-line
  }, [filters])

  return (
    <AppShell title="Complaints">
      <PageHeader
        title="Complaints"
        subtitle="Browse and track all civic issues."
        actions={
          <>
            <div className="hidden items-center rounded-lg border border-slate-200 p-0.5 dark:border-slate-700 sm:flex">
              <button onClick={() => setView('grid')} aria-label="Grid view" className={`flex h-8 w-8 items-center justify-center rounded-md ${view === 'grid' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              </button>
              <button onClick={() => setView('list')} aria-label="List view" className={`flex h-8 w-8 items-center justify-center rounded-md ${view === 'list' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <Link to="/complaints/new">
              <Button><PlusCircle className="h-4 w-4" aria-hidden="true" /> Report Issue</Button>
            </Link>
          </>
        }
      />

      <div className="mb-5">
        <SearchBar value={query} onChange={setQuery} onSearch={submitSearch} loading={loading} />
      </div>
      <div className="mb-5">
        <FilterPanel filters={filters} setFilters={setFilters} />
      </div>

      {error && !loading && <ErrorState title="Unable to load complaints" message={error} onRetry={() => load(1)} />}

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
          icon={MapPin}
          title="No complaints found"
          subtitle="Try adjusting your filters or report a new issue."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          {view === 'grid' ? (
            <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => <ComplaintCard key={c.id} complaint={c} />)}
            </motion.div>
          ) : (
            <div className="card divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((c) => (
                <Link key={c.id} to={`/complaints/${c.id}`} className="group flex items-center gap-4 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-400">#{c.id}</span>
                      <span className="truncate text-sm font-semibold text-slate-800 group-hover:text-brand-600 dark:text-slate-100 dark:group-hover:text-brand-400">
                        {c.title || 'Untitled'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      {c.category && <span>{c.category}</span>}
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" aria-hidden="true" /> {relativeTime(c.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={c.status} />
                    <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600" aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          )}

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
