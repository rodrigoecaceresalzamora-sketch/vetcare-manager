// ============================================================
// VetCare Manager — Hook: usePatientDetail
// Fetches y mutations para Ficha Clínica (Consultas y Storage)
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Patient, Consultation, PatientFile, BoostInterval } from '../../types'
import { generateId, calcNextDueDate } from '../../lib/utils'

export function usePatientDetail(patientId: string) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [files, setFiles] = useState<PatientFile[]>([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    setError(null)
    try {
      // 1. Obtener datos cabecera
      const { data: pData, error: pErr } = await supabase
        .from('patients')
        .select('*, guardian:guardians(*)')
        .eq('id', patientId)
        .single()
      
      if (pErr) throw new Error(pErr.message)
      setPatient((pData as unknown) as Patient)

      // 2. Obtener Historial Médico
      const { data: cData, error: cErr } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
      
      if (cErr) throw new Error(cErr.message)
      setConsultations(cData as Consultation[])

      // 3. Obtener Archivos del paciente
      await fetchFiles()
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [patientId])

  const fetchFiles = async () => {
    const { data: fData, error: fErr } = await supabase.storage
      .from('patient_files')
      .list(patientId, { sortBy: { column: 'created_at', order: 'desc' }})
      
    if (!fErr && fData) {
      const mappedFiles = fData
        .filter(f => f.name !== '.emptyFolderPlaceholder') // ignora falsos logs
        .map(file => {
          const { data: publicUrlData } = supabase.storage
            .from('patient_files')
            .getPublicUrl(`${patientId}/${file.name}`)
          
          return {
            id: file.id || file.name,
            name: file.name,
            url: publicUrlData.publicUrl,
            created_at: file.created_at || undefined
          }
        })
      setFiles(mappedFiles)
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Mutation: Guardar Consulta (y opcionalmente una vacuna)
  const saveConsultation = async (
    input: Partial<Consultation>, 
    vaccineData?: { vaccine_name: string; lot_number: string; boost_interval: BoostInterval; applied_date: string },
    existingId?: string
  ) => {
    
    // 1. Guardar la consulta clínica (Editar vs Nuevo)
    let insError = null
    if (existingId) {
      const { error } = await supabase.from('consultations').update(input).eq('id', existingId)
      insError = error?.message
    } else {
      const { error } = await supabase.from('consultations').insert({
        ...input,
        id: generateId(),
        patient_id: patientId
      })
      insError = error?.message
    }
    
    if (insError) return { error: insError }

    // 2. Si hay data de vacuna, guardarla también en la otra tabla
    if (vaccineData && vaccineData.vaccine_name) {
      const next_due_date = calcNextDueDate(vaccineData.applied_date, vaccineData.boost_interval)
      const { error: vacErr } = await supabase.from('vaccinations').insert({
        id: generateId(),
        patient_id: patientId,
        vaccine_name: vaccineData.vaccine_name,
        lot_number: vaccineData.lot_number,
        applied_date: vaccineData.applied_date,
        next_due_date,
        reminder_sent: false
      })
      if (vacErr) return { error: vacErr.message }
    }

    await fetchData()
    return { error: null }
  }

  // Mutation: Subir Archivo
  const uploadFile = async (file: File) => {
    // Renombrar ligeramente para evitar colisiones
    const uniqueName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    const filePath = `${patientId}/${uniqueName}`
    
    const { error: uploadErr } = await supabase.storage
      .from('patient_files')
      .upload(filePath, file)
      
    if (uploadErr) return { error: uploadErr.message }
    await fetchFiles()
    return { error: null }
  }

  // Mutation: Borrar Archivo
  const deleteFile = async (fileName: string) => {
    const filePath = `${patientId}/${fileName}`
    const { error: delErr } = await supabase.storage
      .from('patient_files')
      .remove([filePath])
      
    if (delErr) return { error: delErr.message }
    await fetchFiles()
    return { error: null }
  }

  // Mutation: Borrar Consulta
  const deleteConsultation = async (id: string) => {
    const { error: delErr } = await supabase.from('consultations').delete().eq('id', id)
    if (delErr) return { error: delErr.message }
    await fetchData()
    return { error: null }
  }

  return { patient, consultations, files, loading, error, saveConsultation, deleteConsultation, uploadFile, deleteFile }
}
