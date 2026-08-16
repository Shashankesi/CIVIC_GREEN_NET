import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bell, CheckCheck, ChevronRight, FileText, ThumbsUp, MessageSquare,
  ShieldCheck, AlertTriangle, Sparkles, Filter
} from 'lucide-react'
import notificationsApi from '../services/notifications'
import AppShell from '../components/AppShell'
import PageHeader from '../ui/PageHeader'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import Button from '../ui/Button'
import toast from 'react-hot-toast'
import { useTranslation } from '../utils/i18n'

function relativeTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString()
}

function getIconForType(type) {
  const t = String(type || '').toLowerCase()
  if (t.includes('vote') || t.includes('support')) return ThumbsUp
  if (t.includes('comment')) return MessageSquare
  if (t.includes('resolved') || t.includes('verify')) return ShieldCheck
  if (t.includes('sla') || t.includes('breach')) return AlertTriangle
  return FileText
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'complaints', label: 'Complaints' },
  { id: 'community', label: 'Community' },
  { id: 'system', label: 'System' }
]

export default function NotificationsPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)

  const load = useCallback(async (p = 1, append = false) => {
    setLoading(true)
    setError(null)
    try {
      const r = await notificationsApi.list(p)
      const list = r?.items || []
      setItems((prev) => append ? prev.concat(list) : list)
      setPage(p)
      setHasMore(list.length >= 20)
    } catch (e) {
      setError('Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(1) }, [load])

  async function markRead(n) {
    setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x))
    try { await notificationsApi.markRead(n.id) }
    catch (e) { toast.error('Failed to mark as read') }
  }

  async function markAllRead() {
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })))
    try {
      await notificationsApi.markAll()
      toast.success('All notifications marked as read')
    } catch (e) {
      toast.error('Failed to mark all')
    }
  }

  const unreadCount = items.filter((n) => !n.is_read).length

  // Filter items based on active tab
  const filteredItems = useMemo(() => {
    if (activeTab === 'unread') return items.filter(n => !n.is_read)
    if (activeTab === 'complaints') {
      return items.filter(n => {
        const t = String(n.type || '').toLowerCase()
        return t.includes('complaint') || t.includes('status') || t.includes('assigned') || t.includes('resolved')
      })
    }
    if (activeTab === 'community') {
      return items.filter(n => {
        const t = String(n.type || '').toLowerCase()
        return t.includes('vote') || t.includes('support') || t.includes('comment') || t.includes('follow')
      })
    }
    if (activeTab === 'system') {
      return items.filter(n => {
        const t = String(n.type || '').toLowerCase()
        return t.includes('security') || t.includes('welcome') || t.includes('otp') || t.includes('role')
      })
    }
    return items
  }, [items, activeTab])

  return (
    <AppShell title={t('notifications')}>
      <div className="space-y-6">
        <PageHeader
          title={t('notifications')}
          subtitle={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'You are all caught up.'}
          icon={Bell}
          actions={
            unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={markAllRead}
                className="inline-flex items-center gap-2 text-xs font-bold"
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all read
              </Button>
            )
          }
        />

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-xs font-bold">
          {TABS.map((tab) => {
            const count = tab.id === 'unread' ? unreadCount : null
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {tab.label} {count !== null && count > 0 ? `(${count})` : ''}
              </button>
            )
          })}
        </div>

        {error && !loading && <ErrorState title="Unable to load notifications" message={error} onRetry={() => load(1)} />}

        {loading && page === 1 && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <EmptyState
            icon={Bell}
            title={activeTab === 'unread' ? 'No unread notifications' : 'No notifications in this section'}
            subtitle="Updates regarding your complaints and community activity will appear here."
          />
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <div className="space-y-2.5">
            {filteredItems.map((n) => {
              const complaintId = n.payload?.complaintId || n.payload?.complaint_id
              const IconComponent = getIconForType(n.type)

              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n)}
                  className={`group rounded-2xl border p-4 transition-all ${
                    !n.is_read
                      ? 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20 shadow-xs'
                      : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#0B1628]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                        !n.is_read
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        <IconComponent className="h-4 w-4" />
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {n.title || (n.type || 'Notification').replace(/_/g, ' ')}
                          </span>
                          {!n.is_read && (
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                          {n.message || n.payload?.message || n.payload?.note || 'You have an update regarding your civic report.'}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                          <span>{relativeTime(n.created_at)}</span>
                          {complaintId && (
                            <Link
                              to={`/complaints/${complaintId}`}
                              className="font-bold text-emerald-600 hover:underline dark:text-emerald-400 flex items-center gap-1"
                            >
                              View Complaint #CGN-{String(complaintId).padStart(5, '0')} <ChevronRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
