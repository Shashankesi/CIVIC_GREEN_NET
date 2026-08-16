import React, { useState, useEffect } from 'react'
import {
  ShieldAlert, Search, Download, RefreshCw, Calendar, User, Shield
} from 'lucide-react'
import toast from 'react-hot-toast'
import adminApi from '../../services/admin'

export default function AuditLogsView() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)

  async function loadLogs() {
    setLoading(true)
    try {
      const data = await adminApi.getAuditLogs({
        page,
        limit: 20,
        search: search || null,
        role: roleFilter || null,
        action: actionFilter || null
      })
      setLogs(data.logs || data.items || data || [])
      setTotal(data.total || (data.logs || []).length)
    } catch (err) {
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [page, roleFilter, actionFilter])

  async function handleExport() {
    try {
      const res = await adminApi.exportAuditLogs({
        search: search || null,
        role: roleFilter || null,
        action: actionFilter || null
      })
      const blob = new Blob([res], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      toast.success('Audit logs exported successfully!')
    } catch (err) {
      toast.error('Failed to export audit logs')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            Governance & Security Audit Logs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable log trail recording administrator actions, status changes, officer approvals, and system operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 transition-all"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 dark:border-[#24344A] dark:bg-[#0B1628]">
        <div className="flex flex-wrap gap-2">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-[#0D1929] dark:text-white"
          >
            <option value="">All Actor Roles</option>
            <option value="admin">Admin</option>
            <option value="officer">Officer</option>
            <option value="citizen">Citizen</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-[#0D1929] dark:text-white"
          >
            <option value="">All Actions</option>
            <option value="officer_approval">Officer Approval</option>
            <option value="complaint_assignment">Complaint Assignment</option>
            <option value="complaint_update">Complaint Status Update</option>
            <option value="role_change">Role Change</option>
            <option value="status_change">User Status Change</option>
          </select>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); loadLogs() }} className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor or target..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-[#0D1929] dark:text-white"
          />
        </form>
      </div>

      {/* Audit Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#0B1628]">
          <Shield className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-white">No Audit Records Found</h3>
          <p className="mt-1 text-xs text-slate-400">No activity logs match your filter criteria.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#24344A] dark:bg-[#0B1628]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Timestamp</th>
                  <th className="px-5 py-3.5 font-bold">Actor</th>
                  <th className="px-5 py-3.5 font-bold">Role</th>
                  <th className="px-5 py-3.5 font-bold">Action</th>
                  <th className="px-5 py-3.5 font-bold">Target</th>
                  <th className="px-5 py-3.5 font-bold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 text-slate-400 font-mono">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {log.actor_name || 'System Auto'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {log.actor_role || 'system'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {log.action}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-200 capitalize">
                      {log.target_type} #{log.target_id || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px] max-w-[250px] truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
