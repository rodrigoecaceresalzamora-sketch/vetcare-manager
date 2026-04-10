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

  // 2. Obligar verificación de email
  if (!user.email_confirmed_at && location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace />
  }

  // 3. Si no tiene clínica y no es tutor (es staff/admin nuevo), mandar a onboarding
  const { clinicId, clinicLoading } = useAuth()
  if (!clinicLoading && !clinicId && role !== 'tutor' && 
      location.pathname !== '/onboarding' && location.pathname !== '/verify-email') {
    return <Navigate to="/onboarding" replace />
  }

  // 4. Si requiere EXACTAMENTE Admin y no lo es (ej: es ayudante o tutor)
  if (requireAdmin && role !== 'admin') {
    return <Navigate to="/tutor" replace />
  }

  // 5. Si requiere ser Staff (Admin o Ayudante) y es Tutor
  if (requireStaff && role === 'tutor') {
    return <Navigate to="/tutor" replace />
  }

  // 6. Si es tutor y está en una ruta administrativa, redirigir a Home
  // (Asumimos que no deberían navegar manualmente fuera de /c/:id o /reserva/:id)
  const isTutorSpecificRoute = location.pathname.startsWith('/c/') || 
                               location.pathname.startsWith('/reserva/');

  if (role === 'tutor' && !isTutorSpecificRoute) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
