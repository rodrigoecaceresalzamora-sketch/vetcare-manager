import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ClinicConfig } from '../types'

interface ClinicConfigContextType {
  config: ClinicConfig | null
  loading: boolean
  refreshConfig: () => Promise<void>
  updateConfig: (newConfig: Partial<ClinicConfig>) => Promise<boolean>
}

const ClinicConfigContext = createContext<ClinicConfigContextType | undefined>(undefined)

export const ClinicConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<ClinicConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const applyColors = useCallback((primary: string, secondary: string) => {
    const root = document.documentElement
    root.style.setProperty('--vet-pink', primary || '#a65d80')
    root.style.setProperty('--vet-rose', primary || '#a65d80')
    root.style.setProperty('--vet-bone', secondary || '#fdf2f7')
  }, [])

  const fetchConfig = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('clinic_config')
        .select('*')
        .eq('id', 1)
        .single()

      if (data) {
        setConfig(data as ClinicConfig)
        applyColors(data.primary_color, data.secondary_color)
      }
    } catch (err) {
      console.error('Error fetching clinic config:', err)
    } finally {
      setLoading(false)
    }
  }, [applyColors])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const updateConfig = async (newConfig: Partial<ClinicConfig>): Promise<boolean> => {
    try {
      const { error: _error } = await supabase
        .from('clinic_config')
        .update({ ...newConfig, updated_at: new Date().toISOString() })
        .eq('id', 1)

      if (_error) throw _error
      await fetchConfig()
      return true
    } catch (err) {
      console.error('Error updating clinic config:', err)
      return false
    }
  }

  return (
    <ClinicConfigContext.Provider value={{ config, loading, refreshConfig: fetchConfig, updateConfig }}>
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
