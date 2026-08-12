import React, { Suspense, lazy, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/ProtectedRoute'
import AuthContext from './context/AuthContext'
import RouteLoader from './ui/RouteLoader'

// Custom lazy loading wrapper that enforces a minimum animation delay so transitions feel complete.
function lazyWithDelay(importFunc, delayMs = 1200) {
  return lazy(() => 
    Promise.all([
      importFunc(),
      new Promise(resolve => setTimeout(resolve, delayMs))
    ]).then(([moduleExports]) => moduleExports)
  );
}

const Landing = lazyWithDelay(() => import('./pages/Landing'))
const Login = lazyWithDelay(() => import('./pages/Login'))
const Signup = lazyWithDelay(() => import('./pages/Signup'))
const ForgotPassword = lazyWithDelay(() => import('./pages/ForgotPassword'))
const ResetPassword = lazyWithDelay(() => import('./pages/ResetPassword'))
const EmailVerification = lazyWithDelay(() => import('./pages/EmailVerification'))
const ComplaintForm = lazyWithDelay(() => import('./pages/ComplaintForm'))
const ComplaintList = lazyWithDelay(() => import('./pages/ComplaintList'))
const ComplaintView = lazyWithDelay(() => import('./pages/ComplaintView'))
const Dashboard = lazyWithDelay(() => import('./pages/Dashboard'))
const Notifications = lazyWithDelay(() => import('./pages/NotificationsPage'))
const MapPage = lazyWithDelay(() => import('./pages/MapPage'))
const OfficerPortal = lazyWithDelay(() => import('./pages/OfficerPortal'))
const AdminPortal = lazyWithDelay(() => import('./pages/AdminPortal'))
const PendingApproval = lazyWithDelay(() => import('./pages/PendingApproval'))
const Profile = lazyWithDelay(() => import('./pages/Profile'))
const Settings = lazyWithDelay(() => import('./pages/Settings'))
const NotFound = lazyWithDelay(() => import('./pages/NotFound'))

function withLoader(node) {
  return <Suspense fallback={<RouteLoader />}>{node}</Suspense>
}

function getHomeRouteForRole(role, status) {
  if (role === 'admin') return '/admin'
  if (role === 'officer' && status === 'pending') return '/pending-approval'
  if (role === 'officer') return '/officer'
  return '/dashboard'
}

export default function App() {
  const { user, loading } = useContext(AuthContext);
  const homeRoute = getHomeRouteForRole(user?.role, user?.status)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-surface-darker">
        <RouteLoader />
      </div>
    );
  }

// if authenticated, use authenticated layout
  if (user) {
    return (
      <>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/dashboard" element={withLoader(<Dashboard />)} />
          <Route path="/complaints" element={withLoader(<ComplaintList />)} />
          <Route path="/complaints/new" element={withLoader(<ComplaintForm />)} />
          <Route path="/complaints/:id" element={withLoader(<ComplaintView />)} />
          <Route path="/notifications" element={withLoader(<Notifications />)} />
          <Route path="/map" element={withLoader(<MapPage />)} />
          <Route path="/profile" element={withLoader(<Profile />)} />
          <Route path="/settings" element={withLoader(<Settings />)} />
          <Route path="/pending-approval" element={withLoader(<ProtectedRoute roles={['officer']} redirectTo={homeRoute}><PendingApproval /></ProtectedRoute>)} />
          <Route path="/officer" element={withLoader(<ProtectedRoute roles={['officer', 'admin']} redirectTo={homeRoute}><OfficerPortal /></ProtectedRoute>)} />
          <Route path="/admin" element={withLoader(<ProtectedRoute roles={['admin']} redirectTo={homeRoute}><AdminPortal /></ProtectedRoute>)} />
          <Route path="/" element={<Navigate to={homeRoute} replace />} />
          <Route path="*" element={withLoader(<NotFound />)} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={withLoader(<Landing />)} />
        <Route path="/login" element={withLoader(<Login />)} />
        <Route path="/signin" element={withLoader(<Login />)} />
        <Route path="/sign-in" element={withLoader(<Login />)} />
        <Route path="/signup" element={withLoader(<Signup />)} />
        <Route path="/register" element={withLoader(<Signup />)} />
        <Route path="/sign-up" element={withLoader(<Signup />)} />
        <Route path="/forgot-password" element={withLoader(<ForgotPassword />)} />
        <Route path="/reset-password" element={withLoader(<ResetPassword />)} />
        <Route path="/verify-email" element={withLoader(<EmailVerification />)} />
        <Route path="/complaints" element={withLoader(<ComplaintList />)} />
        <Route path="/complaints/new" element={withLoader(<ProtectedRoute><ComplaintForm /></ProtectedRoute>)} />
        <Route path="/complaints/:id" element={withLoader(<ComplaintView />)} />
        <Route path="/map" element={withLoader(<MapPage />)} />
        <Route path="*" element={withLoader(<Landing />)} />
      </Routes>
    </>
  )
}
