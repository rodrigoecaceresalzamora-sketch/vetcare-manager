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
  const { clinicId: authClinicId, user } = useAuth()
  const [config, setConfig] = useState<ClinicConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // Para rutas públicas, el clinicId vendrá de la URL. Para privadas, del AuthContext.
  const [currentClinicId, setCurrentClinicId] = useState<string | null>(null)

  useEffect(() => {
     if (authClinicId) setCurrentClinicId(authClinicId)
  }, [authClinicId])

  const applyColors = useCallback((primary: string, secondary: string, primaryText?: string, secondaryText?: string) => {
    const root = document.documentElement
    root.style.setProperty('--vet-pink', primary || '#a65d80')
    root.style.setProperty('--vet-rose', primary || '#a65d80')
    root.style.setProperty('--vet-bone', secondary || '#fdf2f7')
    root.style.setProperty('--vet-text-primary', primaryText || '#111827')
    root.style.setProperty('--vet-text-secondary', secondaryText || '#6b7280')
  }, [])

  const fetchConfig = useCallback(async () => {
    if (!currentClinicId) {
      setLoading(false)
      return
    }
    try {
      // Intentamos buscar por ID o por SLUG de forma segura
      const isUUID = /^[0-9a-fA-F-]{36}$/.test(currentClinicId);
      let query = supabase.from('clinic_config').select('*')
      
      if (isUUID) {
        query = query.eq('clinic_id', currentClinicId)
      } else {
        query = query.eq('slug', currentClinicId)
      }

      const { data } = await query.maybeSingle()

      if (data) {
        let finalData = { ...data };
        
        // AUTO-LIMPIEZA DE DATOS FILTRADOS DE SOFÍA
        if (finalData.clinic_id !== '332ada4e-5a26-4010-985b-fb72be386d09' && 
           (finalData.contact_phone === '+56951045611' || finalData.clinic_logo_url === 'https://raw.githubusercontent.com/rodrigoecaceresalzamora-sketch/vetxora/main/public/logo.png')) {
           finalData.contact_phone = '';
           finalData.contact_email = '';
           finalData.address = '';
           finalData.transfer_details = '';
           finalData.google_maps_embed_url = '';
           finalData.show_booking_limit_notice = false;
           finalData.booking_limit_notice = '';
           finalData.schedule = {};
           finalData.clinic_logo_url = '/favicon.png';

           // update DB in background
           supabase.from('clinic_config').update({
             contact_phone: '',
             contact_email: '',
             address: '',
             transfer_details: '',
             google_maps_embed_url: '',
             show_booking_limit_notice: false,
             booking_limit_notice: '',
             schedule: {},
             clinic_logo_url: '/favicon.png'
           }).eq('clinic_id', finalData.clinic_id).then();
        }

        // Si entramos por slug, actualizamos el clinicId interno para consistencia
        if (currentClinicId !== finalData.clinic_id) {
           // No cambiamos currentClinicId inmediatamente para evitar loops, 
           // pero el config tendrá el ID real.
        }

        setConfig(finalData as ClinicConfig)
        applyColors(finalData.primary_color, finalData.secondary_color, finalData.primary_text_color, finalData.secondary_text_color)
      } else {
        // Solo intentamos auto-crear si parece un UUID válido (no un slug)
        const isUUID = /^[0-9a-fA-F-]{36}$/.test(currentClinicId);
        if (isUUID) {
          const insertData = { clinic_id: currentClinicId, clinic_name: 'Mi Clínica' };

          const { data: newC } = await supabase
            .from('clinic_config')
            .upsert(insertData)
            .select()
            .single()
          if (newC) {
            setConfig(newC as ClinicConfig)
            applyColors(newC.primary_color, newC.secondary_color, newC.primary_text_color, newC.secondary_text_color)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching clinic config:', err)
    } finally {
      setLoading(false)
    }
  }, [currentClinicId, applyColors, user?.email])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  // Actualizar el título de la pestaña dinámicamente
  useEffect(() => {
    if (config?.clinic_name) {
      document.title = config.clinic_name
    } else {
      document.title = 'Vetxora'
    }
  }, [config?.clinic_name])

  const updateConfig = async (newConfig: Partial<ClinicConfig>): Promise<boolean> => {
    if (!currentClinicId) return false
    try {
      // Sanitizar para evitar enviar 'id' si viene en el objeto
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...cleanConfig } = newConfig as Partial<ClinicConfig> & { id?: string };

      const { error: _error } = await supabase
        .from('clinic_config')
        .upsert({ 
          ...cleanConfig, 
          clinic_id: currentClinicId,
          updated_at: new Date().toISOString() 
        }, { onConflict: 'clinic_id' })

      if (_error) {
        console.error('Supabase error updating config:', _error)
        throw _error
      }
      await fetchConfig()
      return true
    } catch (err) {
      console.error('Error updating config (Full Error):', err)
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

// eslint-disable-next-line react-refresh/only-export-components
export const useClinicConfig = () => {
  const context = useContext(ClinicConfigContext)
  if (context === undefined) {
    throw new Error('useClinicConfig must be used within a ClinicConfigProvider')
  }
  return context
}
