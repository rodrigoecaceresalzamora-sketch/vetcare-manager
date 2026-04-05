import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireStaff?: boolean
  requireAdmin?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireStaff = false,
  requireAdmin = false 
}) => {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vet-bone">
        <div className="w-10 h-10 border-4 border-vet-rose border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // 1. Si no hay usuario, mandar al login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 2. Si requiere EXACTAMENTE Admin y no lo es (ej: es ayudante o tutor)
  if (requireAdmin && role !== 'admin') {
    return <Navigate to="/tutor" replace />
  }

  // 3. Si requiere ser Staff (Admin o Ayudante) y es Tutor
  if (requireStaff && role === 'tutor') {
    return <Navigate to="/tutor" replace />
  }

  // 4. Si es tutor y está en una ruta protegida (no /tutor ni /reserva)
  if (role === 'tutor' && !location.pathname.startsWith('/tutor') && !location.pathname.startsWith('/reserva')) {
    return <Navigate to="/tutor" replace />
  }

  return <>{children}</>
}
