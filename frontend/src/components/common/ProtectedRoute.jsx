import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to={adminOnly ? "/auth/admin/login" : "/auth/login"} replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />

  return children
}
