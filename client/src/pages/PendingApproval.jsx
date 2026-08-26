import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Clock3 } from 'lucide-react'
import AuthContext from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'

export default function PendingApproval() {
  const { user } = useContext(AuthContext)

  return (
    <AuthLayout
      title="Account pending approval"
      subtitle="Your officer account is being reviewed by the admin team."
    >
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/40">
            <Clock3 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold">Thanks for joining Civic GreenNet</p>
            <p className="mt-1">{user?.name || 'Your account'} is waiting for admin approval before you can access the officer workspace.</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-amber-200 bg-white/70 p-4 dark:border-amber-900/40 dark:bg-slate-900/40">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            What happens next?
          </div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>An administrator will review your officer profile and verify your credentials.</li>
            <li>Once approved, you’ll be redirected to the officer portal automatically.</li>
            <li>You can still browse public complaint information while your account is pending.</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/dashboard" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
            Go to dashboard
          </Link>
          <button
            onClick={() => {
              auth.logout()
              window.location.href = '/login'
            }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}
