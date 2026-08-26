import React, { Suspense, lazy, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/ProtectedRoute'
import AuthContext from './context/AuthContext'
import RouteLoader from './ui/RouteLoader'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const EmailVerification = lazy(() => import('./pages/EmailVerification'))
const ComplaintForm = lazy(() => import('./pages/ComplaintForm'))
const ComplaintList = lazy(() => import('./pages/ComplaintList'))
const ComplaintView = lazy(() => import('./pages/ComplaintView'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Notifications = lazy(() => import('./pages/NotificationsPage'))
const MapPage = lazy(() => import('./pages/MapPage'))
const OfficerPortal = lazy(() => import('./pages/OfficerPortal'))
const OfficerAssignments = lazy(() => import('./pages/OfficerAssignments'))
const OfficerNearby = lazy(() => import('./pages/OfficerNearby'))
const OfficerMap = lazy(() => import('./pages/OfficerMap'))
const OfficerAI = lazy(() => import('./pages/OfficerAI'))
const OfficerProfile = lazy(() => import('./pages/OfficerProfile'))
const OfficerOnboarding = lazy(() => import('./pages/OfficerOnboarding'))
const AdminPortal = lazy(() => import('./pages/AdminPortal'))
const PendingApproval = lazy(() => import('./pages/PendingApproval'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))
const CivicImpact = lazy(() => import('./pages/CivicImpact'))
const OfficerPerformance = lazy(() => import('./pages/OfficerPerformance'))

function withLoader(node) {
  return <Suspense fallback={<RouteLoader />}>{node}</Suspense>
}

function getHomeRouteForRole(role, status, settings) {
  if (role === 'admin') return '/admin'
  if (role === 'officer') {
    if (status === 'pending') {
      if (settings?.onboarding_status === 'COMPLETED') {
        return '/pending-approval'
      }
      return '/officer/onboarding'
    }
    return '/officer'
  }
  return '/dashboard'
}

export default function App() {
  const { user, loading } = useContext(AuthContext);
  const homeRoute = getHomeRouteForRole(user?.role, user?.status, user?.settings)

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
          <Route path="/verify" element={withLoader(<EmailVerification />)} />
          <Route path="/verify-email" element={withLoader(<EmailVerification />)} />
          <Route path="/reset-password" element={withLoader(<ResetPassword />)} />
          <Route path="/forgot-password" element={withLoader(<ForgotPassword />)} />
          <Route path="/complaints" element={withLoader(<ComplaintList />)} />
          <Route path="/complaints/new" element={withLoader(<ComplaintForm />)} />
          <Route path="/complaints/:id" element={withLoader(<ComplaintView />)} />
          <Route path="/notifications" element={withLoader(<Notifications />)} />
          <Route path="/map" element={withLoader(<MapPage />)} />
          <Route path="/impact" element={withLoader(<CivicImpact />)} />
          <Route path="/civic-impact" element={withLoader(<CivicImpact />)} />
          <Route path="/profile" element={withLoader(<Profile />)} />
          <Route path="/settings" element={withLoader(<Settings />)} />
          <Route path="/pending-approval" element={withLoader(<ProtectedRoute roles={['officer']} isPendingApprovalRoute={true} redirectTo={homeRoute}><PendingApproval /></ProtectedRoute>)} />
          <Route path="/officer/onboarding" element={withLoader(<ProtectedRoute roles={['officer', 'admin']} isOnboardingRoute={true}><OfficerOnboarding /></ProtectedRoute>)} />
          <Route path="/officer" element={withLoader(<ProtectedRoute roles={['officer', 'admin']} redirectTo={homeRoute}><OfficerPortal /></ProtectedRoute>)} />
          <Route path="/officer/assignments" element={withLoader(<ProtectedRoute roles={['officer', 'admin']} redirectTo={homeRoute}><OfficerAssignments /></ProtectedRoute>)} />
          <Route path="/officer/performance" element={withLoader(<ProtectedRoute roles={['officer', 'admin']} redirectTo={homeRoute}><OfficerPerformance /></ProtectedRoute>)} />
          <Route path="/officer/nearby" element={withLoader(<ProtectedRoute roles={['officer', 'admin']} redirectTo={homeRoute}><OfficerNearby /></ProtectedRoute>)} />
          <Route path="/officer/map" element={withLoader(<ProtectedRoute roles={['officer', 'admin']} redirectTo={homeRoute}><OfficerMap /></ProtectedRoute>)} />
          <Route path="/officer/ai" element={withLoader(<ProtectedRoute roles={['officer', 'admin']} redirectTo={homeRoute}><OfficerAI /></ProtectedRoute>)} />
          <Route path="/officer/profile" element={withLoader(<ProtectedRoute roles={['officer', 'admin']} redirectTo={homeRoute}><OfficerProfile /></ProtectedRoute>)} />
          <Route path="/officer/complaints/:id" element={withLoader(<ProtectedRoute roles={['officer', 'admin']} redirectTo={homeRoute}><ComplaintView /></ProtectedRoute>)} />
          <Route path="/admin" element={withLoader(<ProtectedRoute roles={['admin']} redirectTo={homeRoute}><AdminPortal /></ProtectedRoute>)} />
          <Route path="/admin/complaints/:id" element={withLoader(<ProtectedRoute roles={['admin']} redirectTo={homeRoute}><AdminPortal /></ProtectedRoute>)} />
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
        <Route path="/verify" element={withLoader(<EmailVerification />)} />
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
