import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Role } from '../types'

interface AuthContextType {
  session: Session | null
  user: User | null
  role: Role
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Obtener sesión inicial
    const handleAuthChange = async (session: Session | null) => {
      setLoading(true) // Aseguramos que cargamos mientras validamos rol
      setSession(session)
      const user = session?.user ?? null
      setUser(user)
      await updateRole(user)
      setLoading(false)
    }

    // 1. Cargar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session)
    })

    // 2. Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const updateRole = async (user: User | null) => {
    if (!user) {
      setRole(null)
      return
    }

    const userEmail = user.email?.toLowerCase()

    try {
      const { data, error } = await supabase
        .from('staff')
        .select('role')
        .eq('email', userEmail)
        .single()

      if (error || !data) {
        // Fallback de seguridad: Si la tabla no existe o el correo no está registrado,
        // pero es el administrador principal, le damos acceso de admin.
        if (userEmail === 'scaceresalzamora@gmail.com') {
          setRole('admin')
        } else {
          setRole('tutor')
        }
      } else {
        setRole(data.role as Role)
      }
    } catch (err) {
      console.error('Error fetching role:', err)
      // Fallback en caso de error de red o tabla inexistente
      if (userEmail === 'scaceresalzamora@gmail.com') {
        setRole('admin')
      } else {
        setRole('tutor')
      }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
