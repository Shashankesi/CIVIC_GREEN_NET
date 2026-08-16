import React, { useState, useEffect } from 'react'
import { Clock, AlertTriangle, CheckCircle2, ShieldAlert, TrendingUp } from 'lucide-react'
import governanceApi from '../../services/governance'

export default function SlaIntelligenceView() {
  const [timeframe, setTimeframe] = useState('30d')
  const [slaData, setSlaData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSla()
  }, [timeframe])

  const loadSla = async () => {
    setLoading(true)
    try {
      const data = await governanceApi.getSlaIntelligence({ timeframe })
      setSlaData(data)
    } catch (err) {
      console.error('Failed to load SLA data:', err)
    } finally {
      setLoading(false)
    }
  }

  const s = slaData?.summary || {
    totalCases: 0,
    overallSlaCompliance: 100,
    activeOnTime: 0,
    activeDueSoon: 0,
    activeOverdue: 0,
    criticalSlaRisk: 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">SLA Intelligence &amp; Breach Analytics</h2>
          <p className="text-xs text-slate-400 mt-0.5">Automated SLA tracking, deadline countdowns, department compliance rankings, and breach alerts.</p>
        </div>
      </div>

      {/* Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase">OVERALL SLA COMPLIANCE</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 my-1 block">{s.overallSlaCompliance}%</span>
          <span className="text-[10px] text-slate-400">Target: &gt;= 90%</span>
        </div>
        <div className="card p-4 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase">ACTIVE ON TIME</span>
          <span className="text-2xl font-black text-teal-600 dark:text-teal-400 my-1 block">{s.activeOnTime}</span>
          <span className="text-[10px] text-slate-400">Within deadline</span>
        </div>
        <div className="card p-4 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase">DUE SOON (&lt; 24H)</span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 my-1 block">{s.activeDueSoon}</span>
          <span className="text-[10px] text-amber-600 font-semibold">Priority resolution</span>
        </div>
        <div className="card p-4 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase">ACTIVE OVERDUE</span>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 my-1 block">{s.activeOverdue}</span>
          <span className="text-[10px] text-rose-600 font-semibold">SLA breached</span>
        </div>
      </div>

      {/* Department Ranking & Category Breaches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department SLA Ranking */}
        <div className="card p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Department SLA Rankings</h3>
          <div className="space-y-2.5">
            {slaData?.departmentRankings.map((d, i) => (
              <div key={d.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                    i === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {i + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white block">{d.name}</span>
                    <span className="text-[10px] text-slate-400">{d.total} total cases · {d.overdueActive} overdue</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-black ${d.slaCompliance >= 90 ? 'text-emerald-600' : d.slaCompliance >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {d.slaCompliance}%
                  </span>
                  <span className="text-[10px] text-slate-400 block">compliance</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breaches */}
        <div className="card p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Category SLA Risk Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Category</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 text-right">Overdue</th>
                  <th className="pb-2 text-right">Compliance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {slaData?.categoryBreaches.map(c => (
                  <tr key={c.category} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 font-bold capitalize text-slate-800 dark:text-slate-200">{c.category}</td>
                    <td className="py-2.5 text-right text-slate-500">{c.total}</td>
                    <td className="py-2.5 text-right text-rose-600 font-bold">{c.activeOverdue}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-600">{c.slaRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
