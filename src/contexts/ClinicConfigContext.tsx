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

const SOFIA_DEFAULTS = {
  clinic_name: 'VetCare Principal',
  primary_color: '#e11d48',
  secondary_color: '#fdf2f8',
  contact_phone: '+56951045611',
  contact_email: 'scaceresalzamora@gmail.com',
  address: 'San Enrique 1380, Retiro, Quilpué',
  transfer_details: 'NOMBRE: SOFIA CACERES\nBANCO: BANCO ESTADO\nCTA RUT: 12345678\nCORREO: scaceresalzamora@gmail.com',
  clinic_logo_url: 'https://raw.githubusercontent.com/rodrigoecaceresalzamora-sketch/vetcare-manager/main/public/logo.png',
  schedule: {"1": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"], "2": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"], "3": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"], "4": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"], "5": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"], "6": ["10:00", "11:00", "12:00", "13:00"]}
};

export const ClinicConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { clinicId: authClinicId, user } = useAuth()
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
        .maybeSingle()

      if (data) {
        let finalData = { ...data };
        // AUTO-CURACIÓN AGRESIVA: Si los datos parecen basura o están vacíos y es la clínica de Sofia
        const isTrash = (data.transfer_details?.includes('sefeds') || !data.contact_phone || data.clinic_name === 'VetCare Manager');
        const isSofiaClinic = currentClinicId === '332ada4e-5a26-4010-985b-fb72be386d09';

        if (isSofiaClinic && isTrash) {
           finalData = { ...finalData, ...SOFIA_DEFAULTS };
           // Corregir en DB silenciosamente
           supabase.from('clinic_config').upsert({ clinic_id: currentClinicId, ...SOFIA_DEFAULTS }).then(() => {});
        }
        setConfig(finalData as ClinicConfig)
        applyColors(finalData.primary_color, finalData.secondary_color)
      } else {
        // AUTO-CREAR SI NO EXISTE
        const insertData = user?.email === 'scaceresalzamora@gmail.com' 
          ? { clinic_id: currentClinicId, ...SOFIA_DEFAULTS }
          : { clinic_id: currentClinicId, clinic_name: 'VetCare Manager' };

        const { data: newC } = await supabase
          .from('clinic_config')
          .upsert(insertData)
          .select()
          .single()
        if (newC) {
          setConfig(newC as ClinicConfig)
          applyColors(newC.primary_color, newC.secondary_color)
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

  const updateConfig = async (newConfig: Partial<ClinicConfig>): Promise<boolean> => {
    if (!currentClinicId) return false
    try {
      // Sanitizar para evitar enviar 'id' si viene en el objeto
      const { id: _, ...cleanConfig } = newConfig as any;

      const { error: _error } = await supabase
        .from('clinic_config')
        .upsert({ 
          ...cleanConfig, 
          clinic_id: currentClinicId,
          updated_at: new Date().toISOString() 
        }, { onConflict: 'clinic_id' })

      if (_error) throw _error
      await fetchConfig()
      return true
    } catch (err) {
      console.error('Error updating config:', err)
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
