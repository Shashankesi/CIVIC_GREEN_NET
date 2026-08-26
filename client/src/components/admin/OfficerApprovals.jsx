import React, { useState, useEffect } from 'react'
import {
  UserCheck, ShieldCheck, UserX, Search, AlertCircle, RefreshCw, CheckCircle,
  Building2, Mail, MapPin, Calendar, FileText, Check, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import adminApi from '../../services/admin'
import OfficerWorkspaceModal from './OfficerWorkspaceModal'

export default function OfficerApprovals({
  pendingOfficers = [],
  allOfficers = [],
  loading,
  onRefresh
}) {
  const [activeSubTab, setActiveSubTab] = useState('pending') // 'pending' | 'approved' | 'all'
  const [search, setSearch] = useState('')
  const [rejectingOfficer, setRejectingOfficer] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedOfficerModal, setSelectedOfficerModal] = useState(null)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    async function loadSummary() {
      try {
        const s = await adminApi.getOfficerSummary()
        setSummary(s)
      } catch (e) {
        // non-fatal
      }
    }
    loadSummary()
    if (activeSubTab === 'pending' && pendingOfficers.length === 0 && allOfficers.length > 0) {
      setActiveSubTab('approved')
    }
  }, [pendingOfficers.length, allOfficers.length])



  async function handleApprove(officer) {
    setActionLoading(true)
    try {
      await adminApi.approveOfficer(officer.id)
      toast.success(`Officer ${officer.name} approved successfully!`)
      onRefresh()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to approve officer.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRejectSubmit(e) {
    e.preventDefault()
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason.')
      return
    }
    setActionLoading(true)
    try {
      await adminApi.updateUserStatus(rejectingOfficer.id, 'rejected', rejectReason.trim())
      toast.success(`Officer application for ${rejectingOfficer.name} rejected.`)
      setRejectingOfficer(null)
      setRejectReason('')
      onRefresh()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reject officer.')
    } finally {
      setActionLoading(false)
    }
  }

  const allList = React.useMemo(() => {
    const pList = Array.isArray(pendingOfficers) ? pendingOfficers : []
    const aList = Array.isArray(allOfficers) ? allOfficers : []
    const combined = [...pList, ...aList]
    const map = new Map()
    combined.forEach(o => {
      if (o && o.id) map.set(o.id, o)
    })
    return Array.from(map.values())
  }, [pendingOfficers, allOfficers])

  const pendingDetailsList = React.useMemo(() => {
    return allList.filter(o => o.status === 'pending' && (!o.settings?.onboarding_status || o.settings?.onboarding_status === 'PENDING_DETAILS'))
  }, [allList])

  const pendingReviewList = React.useMemo(() => {
    return allList.filter(o => o.status === 'pending' && o.settings?.onboarding_status === 'COMPLETED')
  }, [allList])

  const approvedList = React.useMemo(() => {
    return allList.filter(o => o.status === 'approved' || o.status === 'active')
  }, [allList])

  const listToDisplay = activeSubTab === 'pending_details'
    ? pendingDetailsList
    : activeSubTab === 'pending_review' || activeSubTab === 'pending'
      ? (pendingReviewList.length > 0 ? pendingReviewList : pendingOfficers)
      : activeSubTab === 'approved'
        ? approvedList
        : allList

  const filteredList = listToDisplay.filter((officer) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      officer.name?.toLowerCase().includes(q) ||
      officer.email?.toLowerCase().includes(q) ||
      officer.department_name?.toLowerCase().includes(q) ||
      officer.employee_id?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            Municipal Officer Management & Roster
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review registration applications, verify credentials, manage departments, and monitor active field officers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-[#111C2D] flex-wrap gap-1">
            <button
              onClick={() => setActiveSubTab('pending_review')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                activeSubTab === 'pending_review' || activeSubTab === 'pending'
                  ? 'bg-white text-emerald-600 shadow-sm dark:bg-emerald-600 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Pending Review ({pendingReviewList.length})
            </button>
            <button
              onClick={() => setActiveSubTab('pending_details')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                activeSubTab === 'pending_details'
                  ? 'bg-white text-emerald-600 shadow-sm dark:bg-emerald-600 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Pending Details ({pendingDetailsList.length})
            </button>
            <button
              onClick={() => setActiveSubTab('approved')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                activeSubTab === 'approved'
                  ? 'bg-white text-emerald-600 shadow-sm dark:bg-emerald-600 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Approved Roster ({approvedList.length})
            </button>
            <button
              onClick={() => setActiveSubTab('all')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                activeSubTab === 'all'
                  ? 'bg-white text-emerald-600 shadow-sm dark:bg-emerald-600 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All Records ({allList.length})
            </button>
          </div>
          <button
            onClick={onRefresh}
            title="Refresh list"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-[#24344A] dark:bg-[#0B1628]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Officers</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{summary?.total ?? (pendingOfficers.length + allOfficers.length)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-[#24344A] dark:bg-[#0B1628]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active / Approved</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{summary?.active ?? allOfficers.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-[#24344A] dark:bg-[#0B1628]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Applications</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-600 dark:text-amber-400">{summary?.pending ?? pendingOfficers.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-[#24344A] dark:bg-[#0B1628]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Suspended / Rejected</div>
          <div className="mt-1 text-2xl font-extrabold text-rose-600 dark:text-rose-400">{(summary?.suspended || 0) + (summary?.rejected || 0)}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by officer name, email, department..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-[#0D1929] dark:text-white"
        />
      </div>

      {/* List / Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#0B1628]">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-400 opacity-60" />
          <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-white">
            {activeSubTab === 'pending' ? 'No Officer Registrations Pending' : 'No Officers Found'}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {activeSubTab === 'pending' ? 'All officer registration applications have been reviewed.' : 'No officers match your search criteria.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#24344A] dark:bg-[#0B1628]">
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <tr>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">Officer</th>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">Department</th>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">Designation</th>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">Employee ID</th>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">Requested On</th>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">Status</th>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap text-right pr-6 min-w-[220px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredList.map((officer) => (
                  <tr key={officer.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold dark:bg-emerald-950/60 dark:text-emerald-400">
                          {officer.name?.charAt(0)?.toUpperCase() || 'O'}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{officer.name}</div>
                          <div className="text-[11px] text-slate-400">{officer.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {officer.department_name || 'General Municipal Service'}
                    </td>

                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {officer.designation || 'Field Inspector'}
                    </td>

                    <td className="px-5 py-4 font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {officer.employee_id || <span className="text-slate-400 font-normal">Pending Code</span>}
                    </td>

                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                      {officer.created_at ? new Date(officer.created_at).toLocaleDateString() : '—'}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      {officer.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          ● Pending Review
                        </span>
                      ) : officer.status === 'active' || officer.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          ● Active / Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                          ● {officer.status}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap pr-6">
                      <div className="inline-flex items-center justify-end gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedOfficerModal(officer)}
                          className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          Details
                        </button>
                        {officer.status === 'pending' && (
                          <>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleApprove(officer)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm transition-all disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => { setRejectingOfficer(officer); setRejectReason('') }}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900/40 dark:text-rose-300 disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </button>
                          </>
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

      {/* Reject Modal */}
      {rejectingOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#0B1628] border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserX className="h-5 w-5 text-rose-600" />
              Reject Officer Application
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Provide an official explanation for rejecting <strong>{rejectingOfficer.name}</strong>'s application.
            </p>

            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Rejection Reason</label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Employee ID verification failed or departmental credentials missing..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-[#0D1929] dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingOfficer(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-rose-500 disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Officer Workspace Modal */}
      {selectedOfficerModal && (
        <OfficerWorkspaceModal
          officerId={selectedOfficerModal.id}
          onClose={() => setSelectedOfficerModal(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  )
}
