import React, { useState, useEffect } from 'react'
import { ShieldCheck, ShieldAlert, User, Mail, AlertTriangle, X, CheckCircle, ArrowRight, Building2, Briefcase } from 'lucide-react'

export default function RoleChangeModal({
  user,
  targetRole,
  departments = [],
  isOpen,
  onClose,
  onConfirm
}) {
  const [departmentId, setDepartmentId] = useState('')
  const [designation, setDesignation] = useState('Municipal Officer')
  const [reason, setReason] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)

  // Prevent background body scroll & capture Escape key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = 'unset'
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (user) {
      setDepartmentId(user.department_id || (departments[0]?.id ? String(departments[0].id) : ''))
      setDesignation(user.designation || 'Municipal Officer')
      setReason('')
      setAcceptedTerms(false)
    }
  }, [user, targetRole, departments])

  if (!isOpen || !user || !targetRole) return null

  const currentRole = (user.role || 'citizen').toLowerCase()
  const newRole = targetRole.toLowerCase()

  const isUpgradingToOfficer = newRole === 'officer'
  const isUpgradingToAdmin = newRole === 'admin'
  const isDowngradingFromOfficer = currentRole === 'officer' && newRole === 'citizen'
  const isDowngradingFromAdmin = currentRole === 'admin' && newRole !== 'admin'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!acceptedTerms) return

    setLoading(true)
    try {
      await onConfirm({
        role: newRole,
        departmentId: departmentId ? parseInt(departmentId, 10) : null,
        designation: designation.trim(),
        reason: reason.trim()
      })
      onClose()
    } catch (err) {
      // Error handled in parent onConfirm toast
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-sm transition-all"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
    >
      <div
        className="flex flex-col w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0B1628] border border-slate-200 dark:border-slate-800 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/80 dark:bg-[#0D1929]">
          <div className="flex items-center gap-2.5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              isUpgradingToAdmin
                ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                : isUpgradingToOfficer
                  ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
            }`}>
              {isUpgradingToAdmin ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </span>
            <div>
              <h3 id="role-modal-title" className="text-base font-extrabold text-slate-900 dark:text-white">Change User Role &amp; Access</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Review permission updates and operational setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Container with Scrollable Body and Fixed Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          
          {/* Scrollable Body Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
            {/* User Target Card */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-[#111C2D] border border-slate-100 dark:border-slate-800">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="h-12 w-12 rounded-full object-cover border border-emerald-500" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-base font-extrabold text-white">
                  {user.name?.charAt(0)?.toUpperCase()}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
              </div>
            </div>

            {/* Role Transformation Indicator */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-100/70 dark:bg-[#07101E] border border-slate-200/60 dark:border-slate-800">
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Role</div>
                <span className="mt-1 inline-block rounded-md bg-slate-200 px-2.5 py-1 text-xs font-extrabold uppercase text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  {currentRole}
                </span>
              </div>

              <ArrowRight className="h-5 w-5 text-slate-400" />

              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">New Role</div>
                <span className={`mt-1 inline-block rounded-md px-2.5 py-1 text-xs font-extrabold uppercase ${
                  newRole === 'admin'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    : newRole === 'officer'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-300'
                }`}>
                  {newRole}
                </span>
              </div>
            </div>

            {/* Role-Specific Alert Box */}
            {isUpgradingToAdmin && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/30 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div>
                  <strong className="block font-bold">Privileged Access Warning</strong>
                  Granting Administrator access provides full permission over municipal operations, user roles, system health, and audit logs.
                </div>
              </div>
            )}

            {isUpgradingToOfficer && (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/40 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-extrabold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Officer Onboarding Required
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    The user will be promoted to Officer and will receive an onboarding request. They must complete their officer profile before they can be fully activated.
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    After submission, an administrator will review and approve the profile in Officer Management.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#111C2D] border border-slate-200/80 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Officer ID</span>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200">Auto-Generated</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Initial Status</span>
                    <div className="font-bold text-amber-600 dark:text-amber-400">Pending Details</div>
                  </div>
                </div>
              </div>
            )}

            {isDowngradingFromOfficer && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <strong className="block font-bold">Officer Privileges Revocation</strong>
                  This user will no longer be eligible for officer assignments. Existing complaint history and past activity will remain preserved in historical records.
                </div>
              </div>
            )}

            {/* Reason input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for Role Change (Optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Promoted to Field Inspector or Administrative Transfer"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-[#111C2D] dark:text-white"
              />
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="confirmCheck"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
              />
              <label htmlFor="confirmCheck" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                I understand this role change will modify <strong className="text-slate-800 dark:text-slate-100">{user.name}</strong>'s system permissions and access rights.
              </label>
            </div>
          </div>

          {/* Fixed Sticky Footer */}
          <div className="flex-shrink-0 flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0D1929]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!acceptedTerms || loading}
              className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-md transition-all ${
                isUpgradingToAdmin
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {loading ? (isUpgradingToOfficer ? 'Promoting...' : 'Changing Role...') : isUpgradingToOfficer ? 'Promote to Officer' : isUpgradingToAdmin ? 'Confirm & Apply Privileges' : 'Confirm Role Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
