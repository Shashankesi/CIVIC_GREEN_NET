import React, { useState, useEffect } from 'react'
import {
  Mail, CheckCircle2, AlertTriangle, Clock, RefreshCw, Search, Eye, Filter, RotateCw, X, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import adminApi from '../../services/admin'

export default function EmailCenterView() {
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [recipientSearch, setRecipientSearch] = useState('')
  const [selectedLogModal, setSelectedLogModal] = useState(null)
  const [retryLoading, setRetryLoading] = useState(false)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [statsData, logsData] = await Promise.all([
        adminApi.getEmailStats(),
        adminApi.getEmailLogs({
          page,
          limit: 15,
          status: statusFilter || null,
          eventType: eventFilter || null,
          recipient: recipientSearch || null
        })
      ])
      setStats(statsData)
      setLogs(logsData.items || logsData.logs || logsData || [])
      setTotalLogs(logsData.total || (logsData.items || []).length)
    } catch (err) {
      console.error('Email center load failure:', err)
      setError(err?.response?.data?.message || err?.message || 'Email Center couldn\'t retrieve delivery logs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page, statusFilter, eventFilter])

  async function handleRetry(logId) {
    setRetryLoading(true)
    try {
      await adminApi.retryEmail(logId)
      toast.success('Email retry request submitted')
      loadData()
      if (selectedLogModal?.id === logId) {
        setSelectedLogModal(null)
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to retry email.')
    } finally {
      setRetryLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            Email Communications Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitor Resend email verification codes, officer notifications, complaint updates, and delivery logs.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
        </button>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900/40 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold">Unable to load email communications data</h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">{error}</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry Request
            </button>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#24344A] dark:bg-[#0B1628]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Emails</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{stats?.total || 0}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#24344A] dark:bg-[#0B1628]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Sent Successfully</div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats?.sent || 0}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#24344A] dark:bg-[#0B1628]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Failed Deliveries</div>
          <div className="mt-2 text-2xl font-extrabold text-rose-600 dark:text-rose-400">{stats?.failed || 0}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#24344A] dark:bg-[#0B1628]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Queue</div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400">{stats?.pending || 0}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#24344A] dark:bg-[#0B1628]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Last 24 Hours</div>
          <div className="mt-2 text-2xl font-extrabold text-blue-600 dark:text-blue-400">{stats?.last24h || 0}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#24344A] dark:bg-[#0B1628]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Last 7 Days</div>
          <div className="mt-2 text-2xl font-extrabold text-purple-600 dark:text-purple-400">{stats?.last7d || 0}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 dark:border-[#24344A] dark:bg-[#0B1628]">
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-[#0D1929] dark:text-white"
          >
            <option value="">All Delivery Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>

          <select
            value={eventFilter}
            onChange={(e) => { setEventFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-[#0D1929] dark:text-white"
          >
            <option value="">All Event Types</option>
            <option value="VERIFICATION">Email Verification</option>
            <option value="WELCOME">Welcome Email</option>
            <option value="OFFICER_APPROVAL">Officer Approval</option>
            <option value="COMPLAINT_UPDATE">Complaint Update</option>
          </select>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); loadData() }}
          className="relative min-w-[240px]"
        >
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={recipientSearch}
            onChange={(e) => setRecipientSearch(e.target.value)}
            placeholder="Recipient email search..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-[#0D1929] dark:text-white"
          />
        </form>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : error ? null : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#0B1628]">
          <Mail className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-white">No Email Logs Found</h3>
          <p className="mt-1 text-xs text-slate-400">No email log records match your filter criteria.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#24344A] dark:bg-[#0B1628]">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <tr>
                  <th className="px-5 py-3 font-bold whitespace-nowrap">Logged At</th>
                  <th className="px-5 py-3 font-bold whitespace-nowrap">Recipient</th>
                  <th className="px-5 py-3 font-bold whitespace-nowrap">Event Type</th>
                  <th className="px-5 py-3 font-bold whitespace-nowrap">Subject</th>
                  <th className="px-5 py-3 font-bold whitespace-nowrap">Status</th>
                  <th className="px-5 py-3 font-bold text-center whitespace-nowrap">Attempts</th>
                  <th className="px-5 py-3 font-bold text-right whitespace-nowrap pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 text-slate-400 font-mono whitespace-nowrap">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {log.recipient}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {log.event_type || 'NOTIFICATION'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-200 max-w-[200px] truncate">
                      {log.subject || 'Civic GreenNet Alert'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {log.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          ● Sent
                        </span>
                      ) : log.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                          ● Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          ● Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono font-semibold whitespace-nowrap">
                      {log.attempt_count || 1}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedLogModal(log)}
                          className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <Eye className="h-3.5 w-3.5 inline mr-1" /> Inspect
                        </button>
                        {log.status === 'failed' && (
                          <button
                            disabled={retryLoading}
                            onClick={() => handleRetry(log.id)}
                            className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            <RotateCw className="h-3.5 w-3.5 inline mr-1" /> Retry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setSelectedLogModal(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#0B1628] border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="h-5 w-5 text-emerald-600" />
                Email Delivery Record #{selectedLogModal.id}
              </h3>
              <button onClick={() => setSelectedLogModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111C2D]">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Recipient</div>
                  <div className="mt-1 font-bold text-slate-800 dark:text-slate-100">{selectedLogModal.recipient}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111C2D]">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Event Type</div>
                  <div className="mt-1 font-mono font-bold text-emerald-600 dark:text-emerald-400">{selectedLogModal.event_type}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111C2D] col-span-2">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Subject</div>
                  <div className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{selectedLogModal.subject}</div>
                </div>
              </div>

              {selectedLogModal.error_message && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/40 text-rose-700 dark:text-rose-300">
                  <div className="font-bold text-[10px] uppercase">Error Log Trace</div>
                  <div className="mt-1 font-mono">{selectedLogModal.error_message}</div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {selectedLogModal.status === 'failed' && (
                <button
                  disabled={retryLoading}
                  onClick={() => handleRetry(selectedLogModal.id)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50"
                >
                  Retry Delivery Now
                </button>
              )}
              <button
                onClick={() => setSelectedLogModal(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
