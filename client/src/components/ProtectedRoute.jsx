import React, { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import AuthContext from '../context/AuthContext'

export default function ProtectedRoute({
  children,
  roles = [],
  redirectTo = '/dashboard',
  isOnboardingRoute = false,
  isPendingApprovalRoute = false
}) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (user.status === 'suspended') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-center dark:bg-slate-950">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/40 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400">Account Suspended</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your officer account has been suspended. Contact your administrator.</p>
        </div>
      </div>
    );
  }

  if (user.status === 'rejected') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-center dark:bg-slate-950">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/40 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400">Registration Rejected</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your officer registration was rejected.</p>
        </div>
      </div>
    );
  }

  if (user.role === 'officer' && user.status === 'pending') {
    const onboardingStatus = user.settings?.onboarding_status;
    if (onboardingStatus === 'COMPLETED') {
      if (!isPendingApprovalRoute) {
        return <Navigate to="/pending-approval" replace />;
      }
    } else {
      if (!isOnboardingRoute) {
        return <Navigate to="/officer/onboarding" replace />;
      }
    }
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
