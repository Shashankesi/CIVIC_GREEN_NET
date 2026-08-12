import React, { useEffect, useRef, useState } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

export default function SearchBar({ value, onChange, onSearch, loading = false, placeholder = 'Search complaints…' }) {
  const [local, setLocal] = useState(value || '')
  const timer = useRef(null)

  // Sync external value
  useEffect(() => {
    setLocal(value || '')
  }, [value])

  function handleChange(e) {
    const v = e.target.value
    setLocal(v)
    onChange(v)
    // debounce auto-search
    clearTimeout(timer.current)
    if (!v.trim()) {
      onSearch && onSearch('')
      return
    }
    timer.current = setTimeout(() => onSearch && onSearch(v), 500)
  }

  function clear() {
    setLocal('')
    onChange('')
    clearTimeout(timer.current)
    onSearch && onSearch('')
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
        ) : local ? (
          <button onClick={clear} aria-label="Clear search" className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
) : null}
      </div>
    </div>
  )
}
