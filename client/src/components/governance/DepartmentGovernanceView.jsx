import React, { useState, useEffect } from 'react'
import { Building2, ArrowUpRight, Search, ChevronRight, X, User, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import governanceApi from '../../services/governance'

export default function DepartmentGovernanceView({ onNavigateToMap, onNavigateToReports }) {
  const [timeframe, setTimeframe] = useState('30d')
  const [departments, setDepartments] = useState([])
  const [selectedDept, setSelectedDept] = useState(null)
  const [deptWorkspace, setDeptWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('highest_workload')

  useEffect(() => {
    loadDepartments()
  }, [timeframe])

  const loadDepartments = async () => {
    setLoading(true)
    try {
      const data = await governanceApi.getDepartments({ timeframe })
      setDepartments(data)
    } catch (err) {
      console.error('Failed to load departments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectDepartment = async (dept) => {
    setSelectedDept(dept)
    try {
      const ws = await governanceApi.getDepartmentWorkspace(dept.id, { timeframe })
      setDeptWorkspace(ws)
    } catch (err) {
      console.error('Failed to load department workspace:', err)
    }
  }

  const sortedAndFilteredDepts = departments
    .filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.code && d.code.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'highest_workload': return (b.total || 0) - (a.total || 0);
        case 'highest_backlog': return ((b.open || 0) + (b.inProgress || 0)) - ((a.open || 0) + (a.inProgress || 0));
        case 'highest_sla': return (b.slaCompliance || 0) - (a.slaCompliance || 0);
        case 'lowest_sla': return (a.slaCompliance || 0) - (b.slaCompliance || 0);
        case 'highest_overdue': return (b.overdue || 0) - (a.overdue || 0);
        case 'fastest_resolution': return (a.avgResolutionHours || 0) - (b.avgResolutionHours || 0);
        case 'slowest_resolution': return (b.avgResolutionHours || 0) - (a.avgResolutionHours || 0);
        default: return (b.total || 0) - (a.total || 0);
      }
    })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Department Governance &amp; Workload</h2>
          <p className="text-xs text-slate-400 mt-0.5">Operational benchmarking, staffing balance, and SLA compliance across municipal departments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-semibold"
          >
            <option value="highest_workload">Sort: Highest Workload</option>
            <option value="highest_backlog">Sort: Highest Backlog</option>
            <option value="highest_sla">Sort: Highest SLA Compliance</option>
            <option value="lowest_sla">Sort: Lowest SLA Compliance</option>
            <option value="highest_overdue">Sort: Highest Overdue</option>
            <option value="fastest_resolution">Sort: Fastest Resolution</option>
            <option value="slowest_resolution">Sort: Slowest Resolution</option>
          </select>
          <input
            type="text"
            placeholder="Search department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedAndFilteredDepts.map(d => (
          <div
            key={d.id}
            onClick={() => handleSelectDepartment(d)}
            className="card p-5 rounded-2xl cursor-pointer hover:border-emerald-500/50 hover:shadow-lg transition-all space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {d.code || 'DEPT'}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{d.name}</h3>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">TOTAL</span>
                <strong className="text-slate-800 dark:text-white text-sm">{d.total}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">RESOLUTION</span>
                <strong className="text-emerald-600 text-sm">{d.resolutionRate}%</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">SLA</span>
                <strong className="text-teal-600 text-sm">{d.slaCompliance}%</strong>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <span>Active Officers: <strong>{d.activeOfficers}</strong></span>
              <span className={d.overdue > 0 ? 'text-rose-500 font-bold' : ''}>{d.overdue} Overdue</span>
            </div>
          </div>
        ))}
      </div>

      {/* Department Deep-Dive Modal / Slide-over */}
      {selectedDept && deptWorkspace && (
        <div className="fixed inset-0 z-[5000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Department Workspace</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{deptWorkspace.department.name}</h3>
              </div>
              <button onClick={() => setSelectedDept(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              {onNavigateToMap && (
                <button
                  onClick={() => {
                    setSelectedDept(null);
                    onNavigateToMap({ departmentId: selectedDept.id });
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  View on GIS
                </button>
              )}
              {onNavigateToReports && (
                <button
                  onClick={() => {
                    setSelectedDept(null);
                    onNavigateToReports({ reportType: 'department', departmentId: selectedDept.id });
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  Generate Department Report
                </button>
              )}
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-bold">TOTAL</span>
                <span className="text-lg font-black text-slate-800 dark:text-white">{deptWorkspace.stats.total}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-bold">RESOLVED</span>
                <span className="text-lg font-black text-emerald-600">{deptWorkspace.stats.completed}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-bold">RESOLUTION %</span>
                <span className="text-lg font-black text-emerald-600">{deptWorkspace.stats.resolutionRate}%</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-bold">SLA COMPLIANCE</span>
                <span className="text-lg font-black text-teal-600">{deptWorkspace.stats.slaCompliance}%</span>
              </div>
            </div>

            {/* Officer Workload Breakdown */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Assigned Officers</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {deptWorkspace.officers.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">No officers currently assigned to this department.</div>
                ) : (
                  deptWorkspace.officers.map(o => (
                    <div key={o.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white block">{o.name}</span>
                        <span className="text-[10px] text-slate-400">{o.email}</span>
                      </div>
                      <div className="text-right text-[11px]">
                        <span className="text-slate-600 dark:text-slate-300 font-semibold block">{o.activeWorkload} active cases</span>
                        <span className="text-emerald-600 font-bold">{o.resolutionRate}% res rate</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Category Distribution inside Department */}
            {deptWorkspace.categories && deptWorkspace.categories.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Category Distribution</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {deptWorkspace.categories.map(c => (
                    <div key={c.category} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
                      <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">{c.category}</span>
                      <span className="text-emerald-600 font-bold">{c.total} cases ({c.resolutionRate}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Cases */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Recent Department Cases</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                {deptWorkspace.recentComplaints.slice(0, 5).map(c => (
                  <div key={c.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 flex items-center justify-between">
                    <div>
                      <span className="font-black text-emerald-600 mr-2">{c.ticketId}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{c.title}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{c.status}</span>
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
