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

      // --- CONFIGURACIÓN DE EMERGENCIA PARA SOFIA ---
      const isSofia = currentClinicId && authClinicId && (authClinicId === '332ada4e-5a26-4010-985b-fb72be386d09' || authClinicId.startsWith('332ada'));
      const sofiaDefaults = {
        clinic_name: 'VetCare Principal',
        primary_color: '#e11d48',
        secondary_color: '#fdf2f8',
        contact_phone: '+56951045611',
        contact_email: 'scaceresalzamora@gmail.com',
        address: 'San Enrique 1380, Retiro, Quilpué',
        transfer_details: 'NOMBRE: SOFIA CACERES\nBANCO: BANCO ESTADO\nCTA RUT: 12345678',
        clinic_logo_url: 'https://raw.githubusercontent.com/rodrigoecaceresalzamora-sketch/vetcare-manager/main/public/logo.png',
        schedule: {"1": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"], "2": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"], "3": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"], "4": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"], "5": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"], "6": ["10:00", "11:00", "12:00", "13:00"]}
      };

      if (data) {
        let finalData = { ...data };
        // Si los datos están notablemente vacíos y es Sofia, rescatarlos del código
        if (isSofia && (data.clinic_name === 'VetCare Manager' || !data.contact_phone)) {
           finalData = { ...finalData, ...sofiaDefaults };
           // Persistir para no tener que hacerlo de nuevo
           supabase.from('clinic_config').update(sofiaDefaults).eq('clinic_id', currentClinicId).then(() => {});
        }

        const configWithDefaults = {
          ...finalData,
          wa_template_reminder: finalData.wa_template_reminder || 'Hola {tutor}, te recordamos la vacuna de {mascota} ({vacuna}) para el día {fecha} en {direccion}.',
          wa_template_confirmation: finalData.wa_template_confirmation || '¡Hola {tutor}! Tu cita para {mascota} el día {fecha} a las {hora} ha sido registrada. ¡Te esperamos!',
          email_subject_booking: finalData.email_subject_booking || 'Confirmación de Cita - VetCare',
          email_body_booking: finalData.email_body_booking || 'Hola {tutor}, tu cita para {mascota} ha sido recibida correctamente para el día {fecha} a las {hora}.',
          email_subject_reminder: finalData.email_subject_reminder || 'Recordatorio de Vacunación - VetCare',
          email_body_reminder: finalData.email_body_reminder || 'Hola {tutor}, te recordamos que se acerca el refuerzo de la vacuna {vacuna} para {mascota}. Fecha sugerida: {fecha}.'
        }
        setConfig(configWithDefaults as ClinicConfig)
        applyColors(finalData.primary_color, finalData.secondary_color)
      } else {
        // AUTO-CREAR CONFIGURACIÓN SI NO EXISTE
        const insertPayload = isSofia 
          ? { clinic_id: currentClinicId, ...sofiaDefaults }
          : { clinic_id: currentClinicId, clinic_name: 'VetCare Manager' };

        const { data: newConfig } = await supabase
          .from('clinic_config')
          .insert(insertPayload)
          .select()
          .single()
        
        if (newConfig) {
          const configWithDefaults = {
            ...newConfig,
            wa_template_reminder: newConfig.wa_template_reminder || 'Hola {tutor}, te recordamos la vacuna de {mascota} ({vacuna}) para el día {fecha} en {direccion}.',
            wa_template_confirmation: newConfig.wa_template_confirmation || '¡Hola {tutor}! Tu cita para {mascota} el día {fecha} a las {hora} ha sido registrada. ¡Te esperamos!',
            email_subject_booking: newConfig.email_subject_booking || 'Confirmación de Cita - VetCare',
            email_body_booking: newConfig.email_body_booking || 'Hola {tutor}, tu cita para {mascota} ha sido recibida correctamente para el día {fecha} a las {hora}.',
            email_subject_reminder: newConfig.email_subject_reminder || 'Recordatorio de Vacunación - VetCare',
            email_body_reminder: newConfig.email_body_reminder || 'Hola {tutor}, te recordamos que se acerca el refuerzo de la vacuna {vacuna} para {mascota}. Fecha sugerida: {fecha}.'
          }
          setConfig(configWithDefaults as ClinicConfig)
          applyColors(newConfig.primary_color, newConfig.secondary_color)
        }
      }
    } catch (err) {
      console.error('Error fetching clinic config:', err)
      setConfig(null)
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
