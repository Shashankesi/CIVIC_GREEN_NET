import React from 'react'
import { Leaf } from 'lucide-react'

// Professional Suspense fallback used for lazy-loaded route modules.
// Kept intentionally small and eager so it shows instantly during navigation.
export default function RouteLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-6 px-4"
    >
      <div className="relative flex h-24 w-24 items-center justify-center" aria-hidden="true">
        {/* Outer Orbit Ring */}
        <span className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border border-dashed border-emerald-500/20" />
        
        {/* Inner Spinning Ring */}
        <span className="absolute inset-2 animate-[spin_1.5s_linear_infinite_reverse] rounded-full border-2 border-brand-500/10 border-t-brand-500" />
        
        {/* Central Pulsating Green Leaf */}
        <span className="cgn-leaf-pulse flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 shadow-sm border border-brand-100/50 dark:border-brand-900/20">
          <Leaf className="h-6 w-6 text-brand-500" fill="currentColor" fillOpacity={0.15} />
        </span>
      </div>

      <div className="flex flex-col items-center gap-2 max-w-xs text-center">
        <span className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-200">
          Syncing Civic Environment...
        </span>
        <span className="text-xs text-slate-400">
          Loading smart routing & coordinates
        </span>
        {/* Sweeping infinite progress line */}
        <span className="relative mt-2 h-1 w-32 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
          <span className="cgn-progress-sweep absolute inset-0 block rounded-full bg-gradient-to-r from-brand-400 to-emerald-600" />
        </span>
      </div>
    </div>
  )
}
