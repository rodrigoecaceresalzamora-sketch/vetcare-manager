import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { ClinicConfig } from '../types'

interface ClinicConfigContextType {
  config: ClinicConfig | null
  loading: boolean
  refreshConfig: () => Promise<void>
  updateConfig: (newConfig: Partial<ClinicConfig>) => Promise<boolean>
  setPublicClinicId: (id: string) => void
}

const ClinicConfigContext = createContext<ClinicConfigContextType | undefined>(undefined)

export const ClinicConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { clinicId: authClinicId } = useAuth()
  const [config, setConfig] = useState<ClinicConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // Para rutas públicas, el clinicId vendrá de la URL. Para privadas, del AuthContext.
  const [currentClinicId, setCurrentClinicId] = useState<string | null>(null)

  useEffect(() => {
     if (authClinicId) setCurrentClinicId(authClinicId)
  }, [authClinicId])

  const applyColors = useCallback((primary: string, secondary: string) => {
    const root = document.documentElement
    root.style.setProperty('--vet-pink', primary || '#a65d80')
    root.style.setProperty('--vet-rose', primary || '#a65d80')
    root.style.setProperty('--vet-bone', secondary || '#fdf2f7')
  }, [])

  const fetchConfig = useCallback(async () => {
    if (!currentClinicId) {
      setLoading(false)
      return
    }
    try {
      const { data } = await supabase
        .from('clinic_config')
        .select('*')
        .eq('clinic_id', currentClinicId)
        .single()

      if (data) {
        const configWithDefaults = {
          ...data,
          wa_template_reminder: data.wa_template_reminder || 'Hola {tutor}, te recordamos la vacuna de {mascota} ({vacuna}) para el día {fecha} en {direccion}.',
          wa_template_confirmation: data.wa_template_confirmation || '¡Hola {tutor}! Tu cita para {mascota} el día {fecha} a las {hora} ha sido registrada. ¡Te esperamos!',
          email_subject_booking: data.email_subject_booking || 'Confirmación de Cita - VetCare',
          email_body_booking: data.email_body_booking || 'Hola {tutor}, tu cita para {mascota} ha sido recibida correctamente para el día {fecha} a las {hora}.',
          email_subject_reminder: data.email_subject_reminder || 'Recordatorio de Vacunación - VetCare',
          email_body_reminder: data.email_body_reminder || 'Hola {tutor}, te recordamos que se acerca el refuerzo de la vacuna {vacuna} para {mascota}. Fecha sugerida: {fecha}.'
        }
        setConfig(configWithDefaults as ClinicConfig)
        applyColors(data.primary_color, data.secondary_color)
      } else {
        // AUTO-CREAR CONFIGURACIÓN SI NO EXISTE
        const { data: newConfig } = await supabase
          .from('clinic_config')
          .insert({ clinic_id: currentClinicId, clinic_name: 'Mi Clínica Veterinaria' })
          .select()
          .single()
        
        if (newConfig) {
          setConfig(newConfig as ClinicConfig)
          applyColors(newConfig.primary_color, newConfig.secondary_color)
        }
      }
    } catch (err) {
      console.error('Error fetching clinic config:', err)
      setConfig(null) // Reset config on error
    } finally {
      setLoading(false)
    }
  }, [applyColors])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const updateConfig = async (newConfig: Partial<ClinicConfig>): Promise<boolean> => {
    if (!currentClinicId) return false
    try {
      const { error: _error } = await supabase
        .from('clinic_config')
        .update({ ...newConfig, updated_at: new Date().toISOString() })
        .eq('clinic_id', currentClinicId)

      if (_error) throw _error
      await fetchConfig()
      return true
    } catch (err) {
      console.error('Error updating clinic config:', err)
      return false
    }
  }

  const setPublicClinicId = (id: string) => {
    setCurrentClinicId(id)
  }

  return (
    <ClinicConfigContext.Provider value={{ config, loading, refreshConfig: fetchConfig, updateConfig, setPublicClinicId }}>
      {children}
    </ClinicConfigContext.Provider>
  )
}

export const useClinicConfig = () => {
  const context = useContext(ClinicConfigContext)
  if (context === undefined) {
    throw new Error('useClinicConfig must be used within a ClinicConfigProvider')
  }
  return context
}
