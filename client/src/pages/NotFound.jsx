import React, { useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Compass } from 'lucide-react'
import Button from '../ui/Button'
import AppShell from '../components/AppShell'
import AuthContext from '../context/AuthContext'

function NotFoundContent({ home }) {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
        <Compass className="h-10 w-10" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">404</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        The page you're looking for doesn't exist or has been moved. Let's get you back on track.
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Go Back</Button>
        <Link to={home}>
          <Button><Home className="h-4 w-4" aria-hidden="true" /> Go Home</Button>
        </Link>
      </div>
    </div>
  )
}

export default function NotFound() {
  const { user } = useContext(AuthContext)
  const home = user ? '/dashboard' : '/'

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-surface-darker">
        <NotFoundContent home={home} />
      </div>
    )
  }

  return (
    <AppShell title="Not Found">
      <NotFoundContent home={home} />
    </AppShell>
  )
}
