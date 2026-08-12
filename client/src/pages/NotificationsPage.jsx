import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, CheckCheck, ChevronRight } from 'lucide-react'
import notificationsApi from '../services/notifications'
import AppShell from '../components/AppShell'
import PageHeader from '../ui/PageHeader'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

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

function titleFor(n) {
  if (n.title) return n.title
  return (n.type || 'notification').replace(/_/g, ' ')
}

export default function NotificationsPage() {
  const [items, setItems] = useState([])
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
    try { await notificationsApi.markAll(); toast.success('All marked as read') }
    catch (e) { toast.error('Failed to mark all') }
  }

  const unread = items.filter((n) => !n.is_read).length

  return (
    <AppShell title="Notifications">
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'You are all caught up.'}
        icon={Bell}
        actions={
          unread > 0 && <Button variant="outline" onClick={markAllRead} className="inline-flex items-center gap-2"><CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all read</Button>
        }
      />

      {error && !loading && <ErrorState title="Unable to load notifications" message={error} onRetry={() => load(1)} />}

      {loading && page === 1 && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState icon={Bell} title="No notifications yet" subtitle="Updates about your complaints will appear here." />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((n) => {
              const complaintId = n.payload?.complaintId
              const content = (
                <div className={`flex items-start gap-3 p-4 transition-colors ${n.is_read ? '' : 'bg-brand-50/50 dark:bg-brand-900/10'}`}>
                  <span className={`mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full ${n.is_read ? 'bg-slate-300 dark:bg-slate-600' : 'bg-brand-500'}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{titleFor(n)}</span>
                      <span className="shrink-0 text-xs text-slate-400">{relativeTime(n.created_at)}</span>
                    </div>
                    {n.payload && Object.keys(n.payload).length > 0 && (
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {n.payload.message || n.payload.summary || Object.values(n.payload)[0]}
                      </div>
                    )}
                  </div>
                  {!n.is_read && (
                    <button onClick={() => markRead(n)} className="shrink-0 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">Mark read</button>
                  )}
                </div>
              )
              return (
                <motion.div key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {complaintId ? (
                    <Link to={`/complaints/${complaintId}`} onClick={() => !n.is_read && markRead(n)} className="block">
                      {content}
                    </Link>
                  ) : content}
                </motion.div>
              )
            })}
          </div>

          {hasMore && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => load(page + 1, true)}>Load more</Button>
            </div>
          )}
        </>
      )}
    </AppShell>
  )
}
