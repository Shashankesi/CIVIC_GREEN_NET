import React, { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import AuthContext from '../context/AuthContext'

export default function ProtectedRoute({ children, roles = [], redirectTo = '/dashboard' }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'officer' && user.status === 'pending' && roles.includes('officer')) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
