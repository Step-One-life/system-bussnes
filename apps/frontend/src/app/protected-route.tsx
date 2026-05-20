import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from 'entities/auth/api/use-auth'

export function ProtectedRoute() {
  const { user } = useAuth()
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
