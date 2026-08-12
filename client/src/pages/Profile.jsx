import React, { useContext, useState, useEffect } from 'react'
import { User, Mail, ShieldCheck, Camera, FileText } from 'lucide-react'
import AuthContext from '../context/AuthContext'
import api, { updateProfile, unwrapResponse } from '../services/api'
import AppShell from '../components/AppShell'
import PageHeader from '../ui/PageHeader'
import DashboardCard from '../components/DashboardCard'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Skeleton from '../components/Skeleton'
import toast from 'react-hot-toast'

const ROLE_BADGE = {
  admin: { tone: 'purple', label: 'Admin' },
  officer: { tone: 'cyan', label: 'Officer' },
  citizen: { tone: 'brand', label: 'Citizen' }
}

export default function Profile() {
  const { user, setUser } = useContext(AuthContext)
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    api.get('/complaints/stats/summary')
      .then((r) => {
        const payload = unwrapResponse(r);
        setStats(payload?.stats || payload);
      })
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const updated = await updateProfile({ name: name.trim() })
      // Apply server-persisted result to context so the UI reflects the saved value.
      setUser({
        ...user,
        name: updated.name ?? name.trim(),
        avatar_url: updated.avatar_url ?? user?.avatar_url
      })
      setName(updated.name ?? name.trim())
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const toastId = toast.loading('Uploading profile picture...')
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const updated = await updateProfile(formData)
      setUser({
        ...user,
        avatar_url: updated.avatar_url
      })
      toast.success('Profile picture updated', { id: toastId })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not upload profile picture', { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  const roleCfg = ROLE_BADGE[user?.role] || ROLE_BADGE.citizen

  return (
    <AppShell title="Profile">
      <PageHeader title="Your Profile" subtitle="Manage your personal information and account activity." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Identity card */}
        <div className="card p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="h-24 w-24 rounded-full object-cover border-2 border-brand-500 shadow-sm" />
              ) : (
                <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-600 text-3xl font-bold text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
              <input type="file" id="avatar-input" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
              <button
                type="button"
                onClick={() => document.getElementById('avatar-input').click()}
                disabled={uploading}
                aria-label="Upload avatar"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{user?.name || 'User'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email || ''}</p>
            <div className="mt-2"><Badge tone={roleCfg.tone}>{roleCfg.label}</Badge></div>
          </div>

          <div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center gap-3 py-2.5">
              <User className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span className="text-sm text-slate-500 dark:text-slate-400">Name</span>
              <span className="ml-auto truncate text-sm font-medium text-slate-800 dark:text-slate-100">{user?.name || '—'}</span>
            </div>
            <div className="flex items-center gap-3 py-2.5">
              <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span className="text-sm text-slate-500 dark:text-slate-400">Email</span>
              <span className="ml-auto truncate text-sm font-medium text-slate-800 dark:text-slate-100">{user?.email || '—'}</span>
            </div>
            <div className="flex items-center gap-3 py-2.5">
              <ShieldCheck className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span className="text-sm text-slate-500 dark:text-slate-400">Role</span>
              <span className="ml-auto text-sm font-medium capitalize text-slate-800 dark:text-slate-100">{user?.role || '—'}</span>
            </div>
          </div>
        </div>

        {/* Edit / stats */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Edit Profile</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              <Input label="Email" value={user?.email || ''} disabled className="cursor-not-allowed opacity-60" />
              <Button type="submit" loading={saving}>Save Changes</Button>
            </form>
          </div>

          <div className="card p-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Your Civic Activity</h3>
            {loadingStats ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <DashboardCard title="Total Complaints" value={stats?.total || 0} icon={FileText} tone="brand" />
                <DashboardCard title="Open" value={stats?.open || 0} icon={FileText} tone="blue" />
                <DashboardCard title="Resolved" value={stats?.resolved || 0} icon={FileText} tone="brand" />
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
