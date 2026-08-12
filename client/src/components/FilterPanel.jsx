import React from 'react'
import { SlidersHorizontal, RotateCcw } from 'lucide-react'

const categories = ['Sanitation', 'Roads', 'Water', 'Electricity', 'Public Safety', 'Waste', 'Parks', 'Other']
const statuses = ['open', 'in_progress', 'resolved', 'rejected']
const priorities = ['low', 'medium', 'high', 'critical']

export default function FilterPanel({ filters, setFilters }) {
  function update(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value || null }))
  }

  function reset() {
    setFilters({})
  }

  const selectCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
  const labelCls = "mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400"

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" aria-hidden="true" /> Filters
        </span>
        <button onClick={reset} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
          <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelCls} htmlFor="f-cat">Category</label>
          <select id="f-cat" value={filters.category || ''} onChange={(e) => update('category', e.target.value)} className={selectCls}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c.toLowerCase()}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="f-status">Status</label>
          <select id="f-status" value={filters.status || ''} onChange={(e) => update('status', e.target.value)} className={selectCls}>
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="f-priority">Priority</label>
          <select id="f-priority" value={filters.priority || ''} onChange={(e) => update('priority', e.target.value)} className={selectCls}>
            <option value="">Any priority</option>
            {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="f-from">From date</label>
          <input id="f-from" type="date" value={filters.dateFrom || ''} onChange={(e) => update('dateFrom', e.target.value)} className={selectCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="f-to">To date</label>
          <input id="f-to" type="date" value={filters.dateTo || ''} onChange={(e) => update('dateTo', e.target.value)} className={selectCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="f-sort">Sort by</label>
          <select id="f-sort" value={filters.sortBy || 'created_at'} onChange={(e) => update('sortBy', e.target.value)} className={selectCls}>
            <option value="created_at">Newest</option>
            <option value="priority">Priority</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>
    </div>
  )
}
