import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import api from '../services/api'
import AuthLayout from '../components/AuthLayout'
import Button from '../ui/Button'

export default function EmailVerification() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true
    async function verify() {
      if (!token) {
        setStatus('error')
        setMessage('Missing verification token')
        return
      }
      try {
        await api.get('/auth/verify', { params: { token } })
        if (mounted) { setStatus('success'); setMessage('Your email has been verified!') }
      } catch (err) {
        if (mounted) { setStatus('error'); setMessage(err?.response?.data?.message || 'Verification failed') }
      }
    }
    verify()
    return () => { mounted = false }
  }, [token])

  return (
    <AuthLayout title="Email verification">
      {status === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand-600 dark:text-brand-400" aria-hidden="true" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Verifying your email…</p>
        </div>
      )}
      {status === 'success' && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-center dark:border-brand-900/40 dark:bg-brand-900/20">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-brand-600 dark:text-brand-400" aria-hidden="true" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Success</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{message}</p>
          <div className="mt-4">
            <Link to="/login"><Button>Go to sign in</Button></Link>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/20">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-red-600 dark:text-red-400" aria-hidden="true" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Verification failed</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{message}</p>
          <div className="mt-4">
            <Link to="/login"><Button variant="outline">Back to sign in</Button></Link>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
