import React, { useState, useEffect, useCallback } from 'react'
import {
  Users, UserCheck, Shield, UserCog, Search, RefreshCw, Download, Plus,
  AlertCircle, CheckCircle2, X, Filter, SlidersHorizontal, Check, Eye, Lock, Mail, Phone, Building2
} from 'lucide-react'
import toast from 'react-hot-toast'
import adminApi from '../../services/admin'
import OfficerWorkspaceModal from './OfficerWorkspaceModal'

export default function UserDirectoryView({ onNavigateToOfficer }) {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, citizens: 0, officers: 0, admins: 0, suspended: 0 })
  const [departments, setDepartments] = useState([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dbConnected, setDbConnected] = useState(true)

  // Filters
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const limit = 15

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Modals & Drawers
  const [selectedUserDrawer, setSelectedUserDrawer] = useState(null)
  const [roleModalData, setRoleModalData] = useState(null)
  const [suspendModalData, setSuspendModalData] = useState(null)
  const [addUserModalOpen, setAddUserModalOpen] = useState(false)
  const [officerModalId, setOfficerModalId] = useState(null)

  // Form states
  const [actionLoading, setActionLoading] = useState(false)
  const [roleReason, setRoleReason] = useState('')
  const [roleAck, setRoleAck] = useState(false)

  const [suspendReason, setSuspendReason] = useState('')
  const [suspendDuration, setSuspendDuration] = useState('indefinite')
  const [suspendAck, setSuspendAck] = useState(false)

  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', role: 'citizen', departmentId: '' })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersRes, statsRes, deptRes] = await Promise.all([
        adminApi.listUsers({
          q: debouncedSearch || undefined,
          role: roleFilter || undefined,
          status: statusFilter || undefined,
          departmentId: deptFilter || undefined,
          page,
          limit
        }),
        adminApi.getUserStats(),
        adminApi.listDepartments({ limit: 100 }).catch(() => [])
      ])
      setUsers(usersRes.items || usersRes || [])
      setTotalUsers(usersRes.total || (usersRes.items || []).length)
      if (statsRes) setStats(statsRes)
      if (Array.isArray(deptRes)) setDepartments(deptRes)
      else if (deptRes?.items) setDepartments(deptRes.items)
      setDbConnected(true)
    } catch (err) {
      console.error('Failed to load user directory data:', err)
      setError(err?.response?.data?.message || err?.message || 'Could not retrieve user directory data.')
      setDbConnected(false)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, roleFilter, statusFilter, deptFilter, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleConfirmRoleChange(e) {
    e.preventDefault()
    if (!roleAck) {
      toast.error('Please acknowledge the role change consequences.')
      return
    }
    setActionLoading(true)
    try {
      const { user, targetRole } = roleModalData
      const res = await adminApi.updateUserRole(user.id, targetRole, null, null, roleReason)
      toast.success(`Role updated: ${user.name} is now an ${targetRole.toUpperCase()}`)
      setRoleModalData(null)
      setRoleReason('')
      setRoleAck(false)
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update user role.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleConfirmSuspend(e) {
    e.preventDefault()
    if (!suspendAck) {
      toast.error('Please acknowledge the suspension warning.')
      return
    }
    setActionLoading(true)
    try {
      const { user, newStatus } = suspendModalData
      await adminApi.updateUserStatus(user.id, newStatus, suspendReason)
      toast.success(`Account ${newStatus === 'suspended' ? 'suspended' : 'reactivated'} successfully.`)
      setSuspendModalData(null)
      setSuspendReason('')
      setSuspendAck(false)
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update account status.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleAddUserSubmit(e) {
    e.preventDefault()
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast.error('Please provide both name and email.')
      return
    }
    setActionLoading(true)
    try {
      await adminApi.createUser({
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        phone: newUser.phone.trim(),
        role: newUser.role,
        departmentId: newUser.departmentId || null
      })
      toast.success(`User ${newUser.name} created successfully!`)
      setAddUserModalOpen(false)
      setNewUser({ name: '', email: '', phone: '', role: 'citizen', departmentId: '' })
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create user.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleExportCsv() {
    try {
      const csv = await adminApi.exportUsersCsv({
        q: debouncedSearch || searchInput || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        departmentId: deptFilter || undefined
      })
      const blob = csv instanceof Blob ? csv : new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user-directory-export-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('User directory exported successfully')
    } catch (e) {
      console.error('Export failed:', e)
      toast.error('Could not export user directory')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              USER DIRECTORY
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wider ${dbConnected ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}>
              <span className={`h-2 w-2 rounded-full ${dbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              {dbConnected ? 'Database Connected' : 'Database Connection Issue'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage citizens, municipal officers, administrators, account access, and user lifecycle.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" /> Export CSV
          </button>

          <button
            onClick={() => setAddUserModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-500 transition-all"
          >
            <Plus className="h-4 w-4" /> Add User
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <button
          onClick={() => { setRoleFilter(''); setStatusFilter(''); setPage(1) }}
          className={`rounded-2xl border p-3.5 text-left transition-all ${!roleFilter && !statusFilter ? 'border-purple-500 bg-purple-50/20 dark:bg-purple-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
        >
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Users</div>
          <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.total}</div>
        </button>

        <button
          onClick={() => { setStatusFilter('active'); setRoleFilter(''); setPage(1) }}
          className={`rounded-2xl border p-3.5 text-left transition-all ${statusFilter === 'active' ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
        >
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active Users</div>
          <div className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.active}</div>
        </button>

        <button
          onClick={() => { setRoleFilter('citizen'); setStatusFilter(''); setPage(1) }}
          className={`rounded-2xl border p-3.5 text-left transition-all ${roleFilter === 'citizen' ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
        >
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">Citizens</div>
          <div className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{stats.citizens}</div>
        </button>

        <button
          onClick={() => { setRoleFilter('officer'); setStatusFilter(''); setPage(1) }}
          className={`rounded-2xl border p-3.5 text-left transition-all ${roleFilter === 'officer' ? 'border-cyan-500 bg-cyan-50/20 dark:bg-cyan-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
        >
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Officers</div>
          <div className="mt-1 text-2xl font-black text-cyan-600 dark:text-cyan-400">{stats.officers}</div>
        </button>

        <button
          onClick={() => { setRoleFilter('admin'); setStatusFilter(''); setPage(1) }}
          className={`rounded-2xl border p-3.5 text-left transition-all ${roleFilter === 'admin' ? 'border-purple-500 bg-purple-50/20 dark:bg-purple-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
        >
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">Admins</div>
          <div className="mt-1 text-2xl font-black text-purple-600 dark:text-purple-400">{stats.admins}</div>
        </button>

        <button
          onClick={() => { setStatusFilter('suspended'); setRoleFilter(''); setPage(1) }}
          className={`rounded-2xl border p-3.5 text-left transition-all ${statusFilter === 'suspended' ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
        >
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Suspended</div>
          <div className="mt-1 text-2xl font-black text-rose-600 dark:text-rose-400">{stats.suspended}</div>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPage(1) }}
              placeholder="Search by full name, email, employee ID, designation..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Roles</option>
              <option value="citizen">Citizen</option>
              <option value="officer">Officer</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="active">Active / Approved</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended / Blocked</option>
            </select>

            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setPage(1) }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white max-w-[180px]"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(roleFilter || statusFilter || deptFilter || searchInput) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-400">Active Filters:</span>
            {roleFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-2xs font-bold text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                Role: {roleFilter}
                <button onClick={() => setRoleFilter('')} className="hover:text-purple-950"><X className="h-3 w-3" /></button>
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-2xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter('')} className="hover:text-emerald-950"><X className="h-3 w-3" /></button>
              </span>
            )}
            {deptFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-0.5 text-2xs font-bold text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300">
                Dept: {departments.find(d => String(d.id) === String(deptFilter))?.name || deptFilter}
                <button onClick={() => setDeptFilter('')} className="hover:text-cyan-950"><X className="h-3 w-3" /></button>
              </span>
            )}
            {searchInput && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-2xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                Query: "{searchInput}"
                <button onClick={() => setSearchInput('')} className="hover:text-slate-950"><X className="h-3 w-3" /></button>
              </span>
            )}
            <button
              onClick={() => { setRoleFilter(''); setStatusFilter(''); setDeptFilter(''); setSearchInput(''); setPage(1) }}
              className="text-2xs font-bold text-purple-600 hover:underline ml-auto"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900/40 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold">Unable to load user directory</h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry Request
          </button>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : error ? null : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-white">No Users Found</h3>
          <p className="mt-1 text-xs text-slate-400">No account records match your current filter criteria.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-5 py-3.5 font-bold">User</th>
                  <th className="px-5 py-3.5 font-bold">Role</th>
                  <th className="px-5 py-3.5 font-bold">Account Status</th>
                  <th className="px-5 py-3.5 font-bold">Professional Details</th>
                  <th className="px-5 py-3.5 font-bold">Joined</th>
                  <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const isOfficer = u.role === 'officer'
                  const isAdmin = u.role === 'admin'
                  const settings = typeof u.settings === 'string' ? JSON.parse(u.settings) : (u.settings || {})
                  const isApproved = u.status === 'approved' || u.status === 'active'

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* User Column */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.name} className="h-9 w-9 rounded-full object-cover" />
                            ) : (
                              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black text-white ${isAdmin ? 'bg-purple-600' : isOfficer ? 'bg-cyan-600' : 'bg-slate-600'}`}>
                                {u.name?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {u.name}
                              <span className="text-[10px] font-mono text-slate-400">#UID-{u.id}</span>
                            </div>
                            <div className="text-[11px] text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wider ${isAdmin ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' : isOfficer ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {isAdmin && <Shield className="h-3 w-3" />}
                          {isOfficer && <UserCheck className="h-3 w-3" />}
                          {u.role}
                        </span>
                      </td>

                      {/* Status Column */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isApproved ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : u.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'}`}>
                            ● {u.status || 'active'}
                          </span>
                          {isOfficer && (
                            <span className="text-[10px] font-bold text-slate-400">
                              {u.availability === 'BUSY' ? '🟡 Busy' : u.availability === 'ON_FIELD' ? '🟠 On Field' : u.availability === 'OFFLINE' ? '🔴 Offline' : '🟢 Available'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Professional Info Column */}
                      <td className="px-5 py-3.5">
                        {isOfficer ? (
                          <div>
                            <div className="font-mono font-bold text-slate-800 dark:text-slate-100">{u.employee_id || 'Pending Code'}</div>
                            <div className="text-[10px] text-slate-400">{u.department_name || 'General Services'}</div>
                          </div>
                        ) : isAdmin ? (
                          <div className="text-slate-500 font-semibold">Administrator Access</div>
                        ) : (
                          <div className="text-slate-400">Registered Citizen</div>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="px-5 py-3.5 text-slate-400 font-mono">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>

                      {/* Actions Column */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedUserDrawer(u)}
                            className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            Details
                          </button>

                          <button
                            onClick={() => setRoleModalData({ user: u, targetRole: u.role === 'officer' ? 'citizen' : u.role === 'citizen' ? 'officer' : 'citizen' })}
                            className="rounded-lg bg-purple-50 border border-purple-200 px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:border-purple-900/40 dark:text-purple-300 transition-colors"
                          >
                            Change Role
                          </button>

                          <button
                            onClick={() => setSuspendModalData({ user: u, newStatus: isApproved ? 'suspended' : 'active' })}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-colors ${isApproved ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900/40 dark:text-rose-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/40 dark:text-emerald-300'}`}
                          >
                            {isApproved ? 'Suspend' : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalUsers > limit && (
        <div className="flex items-center justify-between pt-4 text-xs text-slate-500">
          <div>Showing {Math.min((page - 1) * limit + 1, totalUsers)}–{Math.min(page * limit, totalUsers)} of {totalUsers} users</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900"
            >
              Prev
            </button>
            <span className="font-bold text-slate-800 dark:text-slate-200">Page {page} of {Math.ceil(totalUsers / limit)}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(totalUsers / limit)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Custom Role Change Modal (No Browser Alerts) ───────────────────── */}
      {roleModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#0B1628] border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCog className="h-5 w-5 text-purple-600" />
                Change User Role & Access
              </h3>
              <button onClick={() => setRoleModalData(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-slate-900 dark:text-white">{roleModalData.user.name} ({roleModalData.user.email})</div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold">
                <span>Current: <strong className="uppercase text-purple-600">{roleModalData.user.role}</strong></span>
                <span>→</span>
                <span>New: <strong className="uppercase text-emerald-600">{roleModalData.targetRole}</strong></span>
              </div>
            </div>

            {roleModalData.targetRole === 'officer' && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                <div className="font-bold">Officer Onboarding Consequences:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>Backend generates a new Employee ID</li>
                  <li>Account status set to Pending Officer Onboarding</li>
                  <li>User receives onboarding notification and email</li>
                </ul>
              </div>
            )}

            <form onSubmit={handleConfirmRoleChange} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Reason for Role Change (Optional)</label>
                <input
                  type="text"
                  value={roleReason}
                  onChange={(e) => setRoleReason(e.target.value)}
                  placeholder="e.g. Promoted to municipal department officer..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <label className="flex items-start gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={roleAck}
                  onChange={(e) => setRoleAck(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <span>I understand that changing this user's role will modify their access permissions.</span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRoleModalData(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !roleAck}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-500 disabled:opacity-50"
                >
                  {actionLoading ? 'Updating Role...' : 'Confirm Role Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Custom Suspend Modal ───────────────────────────────────────────── */}
      {suspendModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#0B1628] border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-600" />
                {suspendModalData.newStatus === 'suspended' ? 'Suspend Account' : 'Reactivate Account'}
              </h3>
              <button onClick={() => setSuspendModalData(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="font-bold text-slate-900 dark:text-white">{suspendModalData.user.name} ({suspendModalData.user.email})</div>
              <div className="text-slate-500 mt-0.5">Role: <strong className="uppercase">{suspendModalData.user.role}</strong></div>
            </div>

            <form onSubmit={handleConfirmSuspend} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Reason for Action</label>
                <input
                  type="text"
                  required
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Provide an official administrative reason..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <label className="flex items-start gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={suspendAck}
                  onChange={(e) => setSuspendAck(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <span>I confirm that I want to {suspendModalData.newStatus === 'suspended' ? 'suspend' : 'reactivate'} this account.</span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSuspendModalData(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !suspendAck}
                  className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition-all ${suspendModalData.newStatus === 'suspended' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'} disabled:opacity-50`}
                >
                  {actionLoading ? 'Updating Status...' : suspendModalData.newStatus === 'suspended' ? 'Confirm Suspension' : 'Confirm Reactivation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Custom Add User Modal ───────────────────────────────────────────── */}
      {addUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#0B1628] border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-purple-600" />
                Add New Municipal User
              </h3>
              <button onClick={() => setAddUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="e.g. ramesh@gmail.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Assigned Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="citizen">Citizen</option>
                  <option value="officer">Officer</option>
                </select>
              </div>

              {newUser.role === 'officer' && (
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Department (Optional)</label>
                  <select
                    value={newUser.departmentId}
                    onChange={(e) => setNewUser({ ...newUser, departmentId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddUserModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-500 disabled:opacity-50"
                >
                  {actionLoading ? 'Creating User...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Slide-Over User Details Drawer ─────────────────────────────────── */}
      {selectedUserDrawer && (
        <div className="fixed inset-0 z-50 flex" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setSelectedUserDrawer(null)} />
          <div className="relative ml-auto h-full w-full max-w-lg bg-white dark:bg-[#0B1628] shadow-2xl p-6 overflow-y-auto space-y-6 border-l border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600 text-sm font-black text-white">
                  {selectedUserDrawer.name?.charAt(0)?.toUpperCase()}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedUserDrawer.name}</h3>
                  <p className="text-xs text-slate-400">{selectedUserDrawer.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUserDrawer(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Overview Details */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Account ID</div>
                  <div className="mt-1 font-mono font-bold text-slate-800 dark:text-slate-100">#UID-{selectedUserDrawer.id}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Role</div>
                  <div className="mt-1 font-bold text-purple-600 dark:text-purple-400 uppercase">{selectedUserDrawer.role}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Status</div>
                  <div className="mt-1 font-bold text-emerald-600 dark:text-emerald-400 capitalize">{selectedUserDrawer.status || 'active'}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Email Verification</div>
                  <div className="mt-1 font-bold text-emerald-600 dark:text-emerald-400">Verified</div>
                </div>
              </div>

              {selectedUserDrawer.role === 'officer' && (
                <div className="p-4 rounded-xl bg-cyan-50/40 border border-cyan-100 dark:bg-cyan-950/20 dark:border-cyan-900/30 space-y-2">
                  <div className="text-xs font-extrabold uppercase text-cyan-800 dark:text-cyan-300">Officer Record</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Employee ID</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{selectedUserDrawer.employee_id || 'Pending'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Department</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{selectedUserDrawer.department_name || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Designation</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedUserDrawer.designation || 'Municipal Officer'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Availability</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedUserDrawer.availability || 'AVAILABLE'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              {selectedUserDrawer.role === 'officer' && (
                <button
                  onClick={() => { setOfficerModalId(selectedUserDrawer.id); setSelectedUserDrawer(null) }}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 transition-colors"
                >
                  View Full Officer Workspace →
                </button>
              )}
              <button
                onClick={() => setSelectedUserDrawer(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Officer Workspace Modal */}
      {officerModalId && (
        <OfficerWorkspaceModal
          officerId={officerModalId}
          onClose={() => setOfficerModalId(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  )
}
