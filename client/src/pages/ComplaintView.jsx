import React, { useEffect, useState, useContext } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Calendar, FileText, Sparkles, Repeat, ChevronRight, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import complaintsApi from '../services/complaints'
import AuthContext from '../context/AuthContext'
import AppShell from '../components/AppShell'
import PageHeader from '../ui/PageHeader'
import StatusBadge from '../ui/StatusBadge'
import Timeline from '../components/Timeline'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import Button from '../ui/Button'

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString()
}

export default function ComplaintView() {
  const { id } = useParams()
  const { user } = useContext(AuthContext)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [complaint, setComplaint] = useState(null)
  const [similar, setSimilar] = useState([])

  const [updating, setUpdating] = useState(false)
  const [feedbackNote, setFeedbackNote] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    Promise.allSettled([
      complaintsApi.getComplaint(id),
      complaintsApi.getSimilar(id)
    ]).then(([cRes, sRes]) => {
      if (!mounted) return
      if (cRes.status === 'fulfilled') {
        setComplaint(cRes.value)
      } else {
        setError('Complaint not found.')
      }
      if (sRes.status === 'fulfilled') {
        const similarData = sRes.value
        setSimilar(Array.isArray(similarData) ? similarData : (similarData?.items || []))
      }
    }).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [id])

  const canManage = user && (user.role === 'officer' || user.role === 'admin')

  async function handleVerify(status) {
    setUpdating(true)
    try {
      const fd = new FormData()
      fd.append('status', status)
      fd.append('note', feedbackNote || `Citizen marked resolution as: ${status === 'closed' ? 'Satisfied' : 'Unsatisfied'}`)
      const updated = await complaintsApi.changeStatus(complaint.id, fd)
      setComplaint(updated)
      toast.success(status === 'closed' ? 'Complaint closed. Thank you!' : 'Complaint reopened and returned to operations.')
      setFeedbackNote('')
    } catch (err) {
      toast.error('Failed to submit feedback')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <AppShell title={complaint ? `Complaint #${complaint.id}` : 'Complaint'}>
      <div className="mb-4">
        <Link to="/complaints" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to complaints
        </Link>
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-lg lg:col-span-2" />
            <Skeleton className="h-72 rounded-lg" />
          </div>
        </div>
      )}

      {error && !loading && <ErrorState title="Unable to load complaint" message={error} onRetry={() => window.location.reload()} />}

      {complaint && !loading && !error && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header card */}
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">#{complaint.id}</span>
                  <StatusBadge status={complaint.status} />
                  {complaint.priority && <StatusBadge status={complaint.priority} type="priority" />}
                </div>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{complaint.title || 'Untitled complaint'}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  {complaint.category && <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" aria-hidden="true" /> {complaint.category}</span>}
                  {complaint.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {complaint.address}</span>}
                  {complaint.created_at && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" aria-hidden="true" /> {formatDate(complaint.created_at)}</span>}
                </div>
              </div>
              {canManage && (
                <Link to={`/complaints/${complaint.id}`}>
                  <Button variant="outline" className="inline-flex items-center gap-2"><Copy className="h-4 w-4" aria-hidden="true" /> Manage</Button>
                </Link>
              )}
            </div>
            {complaint.image_url && (
              <div className="border-t border-slate-100 dark:border-slate-800">
                <img src={complaint.image_url} alt={complaint.title} className="max-h-80 w-full object-cover" />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mt-6 card p-5">
            <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Description</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {complaint.description || complaint.summary || 'No description provided.'}
            </p>
          </div>

          {/* Images */}
          {complaint.images && complaint.images.length > 0 && (
            <div className="mt-6 card p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Images</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {complaint.images.map((img) => (
                  <a key={img.id} href={img.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    <img src={img.url} alt={complaint.title} className="h-40 w-full object-cover transition-transform duration-300 hover:scale-105" loading="lazy" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Citizen Verification Feedback Loop */}
          {complaint.status === 'resolved' && user && user.id === complaint.user_id && (
            <div className="mt-6 border border-emerald-200 bg-emerald-50/50 p-6 rounded-xl dark:border-emerald-800/40 dark:bg-emerald-950/20">
              <h3 className="text-sm font-bold text-slate-800 dark:text-emerald-300">Resolution Verification</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                This complaint has been marked as resolved by the assigned officer. Please verify if the issue has been successfully resolved.
              </p>
              <textarea
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="Add details, comments, or reason for reopening..."
                className="mt-3 w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                rows={2}
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  onClick={() => handleVerify('closed')}
                  disabled={updating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5"
                >
                  Yes, Issue Resolved
                </Button>
                <button
                  onClick={() => handleVerify('reopened')}
                  disabled={updating}
                  className="border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5"
                >
                  No, Reopen Complaint
                </button>
              </div>
            </div>
          )}

          {/* AI + Timeline */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Timeline complaintId={id} />
            </div>
            <div>
              {/* AI Analysis summary */}
              <div className="card overflow-hidden border-ai/20">
                <div className="flex items-center gap-2 border-b border-ai/10 bg-gradient-to-r from-ai/5 to-indigo-500/5 px-5 py-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ai/10 text-ai"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI Analysis</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Smart classification</p>
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  {complaint.ai ? (
                    <>
                      <div>
                        <div className="text-xs font-medium text-slate-400">Category</div>
                        <div className="text-sm font-medium capitalize text-slate-800 dark:text-slate-100">{complaint.ai.category || complaint.category || '—'}</div>
                      </div>
                      {complaint.ai.department && (
                        <div>
                          <div className="text-xs font-medium text-slate-400">Suggested Department</div>
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{complaint.ai.department}</div>
                        </div>
                      )}
                      {complaint.ai.severity && (
                        <div>
                          <div className="text-xs font-medium text-slate-400">Severity</div>
                          <div className="text-sm font-medium capitalize text-slate-800 dark:text-slate-100">{complaint.ai.severity}</div>
                        </div>
                      )}
                      {complaint.ai.confidence != null && (
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-400">Confidence</span>
                            <span className="font-medium text-ai">{Math.round(complaint.ai.confidence * 100)}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-gradient-to-r from-ai to-indigo-500" style={{ width: `${Math.min(100, complaint.ai.confidence * 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <EmptyState icon={Sparkles} title="No AI analysis yet" subtitle="AI analysis will appear here once available." />
                  )}
                </div>
              </div>

              {/* Similar complaints */}
              {similar.length > 0 && (
                <div className="card mt-6 p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Repeat className="h-4 w-4 text-slate-400" aria-hidden="true" /> Similar Complaints
                  </h3>
                  <ul className="space-y-2">
                    {similar.map((s) => (
                      <li key={s.id}>
                        <Link to={`/complaints/${s.id}`} className="group flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 transition-colors hover:border-brand-200 hover:bg-brand-50 dark:border-slate-800 dark:hover:border-brand-500/40 dark:hover:bg-slate-800/50">
                          <span className="text-sm font-medium text-slate-700 group-hover:text-brand-600 dark:text-slate-200 dark:group-hover:text-brand-400">
                            Complaint #{s.id}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            {s.score != null && <span>{Math.round(s.score * 100)}%</span>}
                            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AppShell>
  )
}
