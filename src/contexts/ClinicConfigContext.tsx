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
        .maybeSingle()

      if (data) {
        setConfig(data as ClinicConfig)
        applyColors(data.primary_color, data.secondary_color)
      } else {
        // Si no hay config, se creará al guardar o podemos crear una base aquí
        const { data: newC } = await supabase
          .from('clinic_config')
          .upsert({ clinic_id: currentClinicId, clinic_name: 'VetCare Manager' })
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
  }, [currentClinicId, applyColors])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const updateConfig = async (newConfig: Partial<ClinicConfig>): Promise<boolean> => {
    if (!currentClinicId) return false
    try {
      const { error: _error } = await supabase
        .from('clinic_config')
        .upsert({ 
          ...newConfig, 
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
