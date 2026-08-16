import React, { useState, useEffect } from 'react'
import { Sparkles, X, Loader2, CheckCircle2, ShieldAlert, FileText, Download } from 'lucide-react'
import governanceApi from '../../services/governance'

export default function AIExecutiveSummaryModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false)
  const [summaryData, setSummaryData] = useState(null)
  const [timeframe, setTimeframe] = useState('30d')

  useEffect(() => {
    if (isOpen) {
      generateSummary()
    }
  }, [isOpen, timeframe])

  const generateSummary = async () => {
    setLoading(true)
    try {
      const data = await governanceApi.generateAiExecutiveSummary({ timeframe })
      setSummaryData(data)
    } catch (err) {
      console.error('Failed to generate AI executive summary:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[5000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0B132B] rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-900 dark:bg-emerald-950 border border-slate-700 dark:border-emerald-800 flex items-center justify-center text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                EXECUTIVE INTELLIGENCE
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                AI Executive Municipal Briefing
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-200/80 dark:border-slate-800">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Analysis Timeframe:</span>
          <div className="flex items-center gap-1">
            {['today', '7d', '30d', '90d'].map(t => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  timeframe === t
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {t === 'today' ? 'Today' : t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Body Content */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400 animate-spin" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Synthesizing executive briefing from PostgreSQL operational data...
            </span>
          </div>
        ) : summaryData ? (
          <div className="space-y-4 text-xs">
            {/* Grounded KPIs */}
            {summaryData.verifiedKpis && (
              <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 text-center">
                <div>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">TOTAL CASES</span>
                  <strong className="text-sm font-bold text-slate-900 dark:text-white">{summaryData.verifiedKpis.total}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">RESOLUTION RATE</span>
                  <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{summaryData.verifiedKpis.resolutionRate}%</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">SLA COMPLIANCE</span>
                  <strong className="text-sm font-bold text-teal-600 dark:text-teal-400">{summaryData.verifiedKpis.slaCompliance}%</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">CRITICAL TICKETS</span>
                  <strong className="text-sm font-bold text-rose-600 dark:text-rose-400">{summaryData.verifiedKpis.critical}</strong>
                </div>
              </div>
            )}

            {/* Markdown briefing */}
            <div className="p-4 rounded-lg bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line font-medium text-xs">
              {summaryData.summary}
            </div>

            <p className="text-[10px] font-mono text-slate-400 text-center">
              Generated from real-time database state at {new Date(summaryData.generatedAt).toLocaleTimeString('en-IN')}.
            </p>
          </div>
        ) : null}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
