import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Role } from '../types'

interface AuthContextType {
  session: Session | null
  user: User | null
  role: Role
  clinicId: string | null
  planType: 'basic' | 'pro' | null
  isPaid: boolean
  loading: boolean
  clinicLoading: boolean
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [planType, setPlanType] = useState<'basic' | 'pro' | null>(null)
  const [isPaid, setIsPaid] = useState(false)
  const [loading, setLoading] = useState(true)
  const [clinicLoading, setClinicLoading] = useState(false)

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
      setClinicId(null)
      setPlanType(null)
      setIsPaid(false)
      return
    }

    setClinicLoading(true)
    const userEmail = user.email?.toLowerCase()

    try {
      // 1. Buscar en la tabla staff para obtener el rol y la clínica
      const { data: staffData, error: staffErr } = await supabase
        .from('staff')
        .select('role, clinic_id')
        .eq('email', userEmail)
        .maybeSingle()

      if (staffErr) throw staffErr

      if (staffData) {
        setRole(staffData.role as Role)
        setClinicId(staffData.clinic_id)
        
        // 2. Obtener información del plan de la clínica
        if (staffData.clinic_id) {
          const { data: clinicData } = await supabase
            .from('clinics')
            .select('plan_type, is_paid')
            .eq('id', staffData.clinic_id)
            .single()
          
          if (clinicData) {
            setPlanType(clinicData.plan_type as 'basic' | 'pro')
            setIsPaid(!!clinicData.is_paid)
          }
        }
      } else {
        // 3. Fallback: Si no está en staff, podría ser el DUEÑO de una clínica
        const { data: ownedClinic } = await supabase
          .from('clinics')
          .select('id, plan_type, is_paid')
          .eq('owner_id', user.id)
          .maybeSingle()

        if (ownedClinic) {
          setRole('admin')
          setClinicId(ownedClinic.id)
          setPlanType(ownedClinic.plan_type as 'basic' | 'pro')
          setIsPaid(!!ownedClinic.is_paid)
        } else if (userEmail === 'scaceresalzamora@gmail.com') {
          setRole('admin')
          setPlanType('pro')
          setIsPaid(true)
          
          // AUTO-PROVISIÓN: Si no hay clínica, crearla ahora mismo
          const { data: newClinic } = await supabase
            .from('clinics')
            .insert({ name: 'VetCare Principal', owner_id: user.id, plan_type: 'pro', is_paid: true })
            .select()
            .single()
          
          if (newClinic) {
            setClinicId(newClinic.id)
          } else {
             // Si falló el insert (ej: ya existía pero el select falló antes), buscar de nuevo
             const { data: retryClinic } = await supabase
               .from('clinics')
               .select('id')
               .eq('owner_id', user.id)
               .maybeSingle()
             if (retryClinic) setClinicId(retryClinic.id)
          }
        } else {
          // Si no es dueño ni staff, es un tutor
          setRole('tutor')
        }
      }
    } catch (err) {
      console.error('Error in updateRole:', err)
      setRole('tutor') // Default safe role
    } finally {
      setClinicLoading(false)
    }
  }

  const refreshAuth = async () => {
    await updateRole(user)
  }

  const signOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setRole(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ session, user, role, clinicId, planType, isPaid, loading, clinicLoading, signOut, refreshAuth }}>
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
