import React from 'react'
import { Sparkles, TrendingUp, MapPin, Repeat, Target } from 'lucide-react'
import AIBadge from '../ui/AIBadge'

export default function AIInsights({ stats, categories }) {
  // Derive insights from real backend data passed in.
  const topCategory = categories && categories.length ? categories[0] : null

  const insights = []

  if (topCategory) {
    insights.push({
      icon: Target,
      title: 'Top issue category',
      text: `${topCategory.category || topCategory.label || '—'} leads with ${topCategory.count || topCategory.value || 0} reports.`
    })
  }

  if (stats) {
    const total = Number(stats.total) || 0
    const resolved = Number(stats.resolved) || 0
    if (total > 0) {
      const rate = Math.round((resolved / total) * 100)
      insights.push({
        icon: TrendingUp,
        title: 'Resolution rate',
        text: `${rate}% of complaints have been resolved.`
      })
    }
  }

  return (
    <div className="card overflow-hidden border-ai/20">
      <div className="flex items-center gap-2 border-b border-ai/10 bg-gradient-to-r from-ai/5 to-indigo-500/5 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ai/10 text-ai">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI Civic Insights</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Smart observations from your data</p>
        </div>
      </div>
      <div className="p-5">
        {insights.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-slate-400">
            <Sparkles className="h-8 w-8 text-ai/40" aria-hidden="true" />
            <p>Not enough data yet for AI insights.</p>
            <p className="text-xs">Start reporting complaints to unlock insights.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((ins) => (
              <div key={ins.title} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/40">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ai/10 text-ai">
                  <ins.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{ins.title}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{ins.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
