import React, { useState, useEffect } from 'react'
import { Users, Search, ChevronRight, X, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react'
import governanceApi from '../../services/governance'

export default function OfficerGovernanceView() {
  const [timeframe, setTimeframe] = useState('30d')
  const [officers, setOfficers] = useState([])
  const [selectedOfficer, setSelectedOfficer] = useState(null)
  const [officerWorkspace, setOfficerWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadOfficers()
  }, [timeframe])

  const loadOfficers = async () => {
    setLoading(true)
    try {
      const data = await governanceApi.getOfficers({ timeframe })
      setOfficers(data)
    } catch (err) {
      console.error('Failed to load officers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOfficer = async (off) => {
    setSelectedOfficer(off)
    try {
      const ws = await governanceApi.getOfficerWorkspace(off.id, { timeframe })
      setOfficerWorkspace(ws)
    } catch (err) {
      console.error('Failed to load officer workspace:', err)
    }
  }

  const filteredOfficers = officers.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.departmentName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Officer Performance &amp; Fair Governance</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Multi-factor scoring considering case complexity, SLA compliance, resolution rate, and active workload balance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search officer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Officers Table */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-bold uppercase text-[10px]">
                <th className="p-3.5">Officer</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5 text-center">Active Workload</th>
                <th className="p-3.5 text-center">Resolved</th>
                <th className="p-3.5 text-center">Overdue</th>
                <th className="p-3.5 text-center">Avg Time</th>
                <th className="p-3.5 text-center">SLA %</th>
                <th className="p-3.5 text-center">Fair Score</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredOfficers.map(o => (
                <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5">
                    <span className="font-bold text-slate-900 dark:text-white block">{o.name}</span>
                    <span className="text-[10px] text-slate-400">{o.email}</span>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300 font-semibold">{o.departmentName}</td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold">
                      {o.activeWorkload}
                    </span>
                  </td>
                  <td className="p-3.5 text-center text-emerald-600 font-bold">{o.resolvedCount}</td>
                  <td className="p-3.5 text-center">
                    <span className={`font-bold ${o.overdueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {o.overdueCount}
                    </span>
                  </td>
                  <td className="p-3.5 text-center text-slate-600 dark:text-slate-300 font-semibold">
                    {o.avgResolutionHours}h
                  </td>
                  <td className="p-3.5 text-center font-bold text-teal-600">{o.slaCompliance}%</td>
                  <td className="p-3.5 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black text-xs">
                        {o.fairScore} / 100
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleSelectOfficer(o)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors font-bold text-[11px]"
                    >
                      Workspace
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Officer Workspace Modal */}
      {selectedOfficer && officerWorkspace && (
        <div className="fixed inset-0 z-[5000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Officer Workspace</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{officerWorkspace.officer.name}</h3>
                <span className="text-xs text-slate-400">{officerWorkspace.officer.department_name}</span>
              </div>
              <button onClick={() => setSelectedOfficer(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Fair Score Transparent Breakdown */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/20 via-teal-950/20 to-slate-900/40 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Fair Governance Score Breakdown</span>
                <span className="text-sm font-black text-white">{selectedOfficer.fairScore} / 100</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">SLA (40%)</span>
                  <strong className="text-emerald-400 text-sm">{selectedOfficer.scoreBreakdown?.slaScore || selectedOfficer.slaCompliance}%</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">VELOCITY (30%)</span>
                  <strong className="text-teal-400 text-sm">{selectedOfficer.scoreBreakdown?.velocityScore || 85} pts</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">COMPLEXITY (15%)</span>
                  <strong className="text-indigo-400 text-sm">{selectedOfficer.scoreBreakdown?.complexityScore || 90} pts</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">WORKLOAD (15%)</span>
                  <strong className="text-blue-400 text-sm">{selectedOfficer.scoreBreakdown?.workloadBalanceScore || 95} pts</strong>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                Formula: 0.40 × SLA + 0.30 × Resolution Velocity + 0.15 × Case Complexity + 0.15 × Workload Balance
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-bold">TOTAL ASSIGNED</span>
                <span className="text-lg font-black text-slate-800 dark:text-white">{officerWorkspace.stats.totalAssigned}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-bold">ACTIVE CASES</span>
                <span className="text-lg font-black text-blue-600">{officerWorkspace.stats.activeCases}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-bold">RESOLVED</span>
                <span className="text-lg font-black text-emerald-600">{officerWorkspace.stats.completed}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-bold">SLA COMPLIANCE</span>
                <span className="text-lg font-black text-teal-600">{officerWorkspace.stats.slaCompliance}%</span>
              </div>
            </div>

            {/* Recent Cases */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Assigned Cases &amp; SLA Status</h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                {officerWorkspace.cases.map(c => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-600 mr-2">{c.ticketId}</span>
                      <span className="font-semibold text-slate-800 dark:text-white">{c.title}</span>
                      <span className="text-[10px] text-slate-400 block">{c.address}</span>
                    </div>
                    <div className="text-right text-[10px] font-bold">
                      <span className="capitalize block">{c.status}</span>
                      {c.isOverdue && <span className="text-rose-500 font-black">OVERDUE</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
