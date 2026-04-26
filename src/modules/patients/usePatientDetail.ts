// ============================================================
// VetCare Manager — Hook: usePatientDetail
// Fetches y mutations para Ficha Clínica (Consultas y Storage)
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Patient, Consultation, PatientFile, BoostInterval, Appointment, Vaccination, Service } from '../../types'
import { generateId, calcNextDueDate } from '../../lib/utils'

export function usePatientDetail(patientId: string) {
  const { clinicId } = useAuth()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [files, setFiles] = useState<PatientFile[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  
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

      // 3. Obtener Vacunas
      const { data: vData } = await supabase
        .from('vaccinations')
        .select('*')
        .eq('patient_id', patientId)
        .order('next_due_date', { ascending: true })
      setVaccinations((vData || []) as Vaccination[])

      // 4. Obtener Citas futuras (basado en nombre mascota/tutor por ahora)
        const { data: aData } = await supabase
          .from('appointments')
          .select('*')
          .eq('clinic_id', clinicId)
          .eq('pet_name', pData.name)
          .eq('guardian_name', pData.guardian?.name)
          .gte('scheduled_at', new Date().toISOString())
          .neq('status', 'cancelada')
          .order('scheduled_at', { ascending: true })
        setUpcomingAppointments((aData || []) as Appointment[])

      // 5. Obtener Archivos del paciente
      await fetchFiles()
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [patientId])

  const fetchFiles = async () => {
    // 1. Obtener archivos seguros del bucket privado (nuevos)
    const { data: privateData } = await supabase.storage
      .from('medical_documents')
      .list(patientId, { sortBy: { column: 'created_at', order: 'desc' }})

    // 2. Obtener archivos legacy del bucket público antiguo
    const { data: legacyData } = await supabase.storage
      .from('patient_files')
      .list(patientId, { sortBy: { column: 'created_at', order: 'desc' }})
      
    const allFiles: PatientFile[] = []

    if (privateData) {
      const pFiles = await Promise.all(
        privateData
          .filter(f => f.name !== '.emptyFolderPlaceholder' && !f.name.startsWith('avatar'))
          .map(async file => {
            const { data } = await supabase.storage
              .from('medical_documents')
              .createSignedUrl(`${patientId}/${file.name}`, 60 * 60) // Expira en 1 hora
            return {
              id: file.id || file.name,
              name: file.name,
              url: data?.signedUrl || '',
              created_at: file.created_at || undefined,
              isLegacy: false
            }
          })
      )
      allFiles.push(...pFiles)
    }

    if (legacyData) {
      const lFiles = legacyData
        .filter(f => f.name !== '.emptyFolderPlaceholder' && !f.name.startsWith('avatar'))
        .map(file => {
          const { data: publicUrlData } = supabase.storage
            .from('patient_files')
            .getPublicUrl(`${patientId}/${file.name}`)
          return {
            id: `legacy-${file.id || file.name}`,
            name: file.name,
            url: publicUrlData.publicUrl,
            created_at: file.created_at || undefined,
            isLegacy: true
          }
        })
      allFiles.push(...lFiles)
    }

    // Ordenar de más reciente a más antiguo
    allFiles.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    setFiles(allFiles)
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Mutation: Guardar Consulta (y opcionalmente múltiples vacunas)
  const saveConsultation = async (
    input: Partial<Consultation>, 
    vaccineData?: Array<{ vaccine_name: string; lot_number: string; lot_number_2?: string; boost_interval: BoostInterval; applied_date: string }>,
    existingId?: string,
    selectedService?: Service
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
        patient_id: patientId,
        clinic_id: clinicId
      })
      insError = error?.message
    }
    
    if (insError) return { error: insError }

    // 2. Si hay data de vacunas, guardarlas también en la otra tabla
    if (vaccineData && vaccineData.length > 0) {
      for (const vac of vaccineData) {
        if (!vac.vaccine_name) continue
        const next_due_date = calcNextDueDate(vac.applied_date, vac.boost_interval, patient?.date_of_birth)
        const { error: vacErr } = await supabase.from('vaccinations').insert({
          id: generateId(),
          patient_id: patientId,
          vaccine_name: vac.vaccine_name,
          lot_number: vac.lot_number,
          lot_number_2: vac.lot_number_2 || null,
          applied_date: vac.applied_date,
          next_due_date,
          reminder_sent: false,
          clinic_id: clinicId
        })
        if (vacErr) return { error: vacErr.message }
      }
    }

    // 3. Descontar stock (sólo si es NUEVA consulta y hay servicio asociado)
    if (!existingId && selectedService && selectedService.stock_usage && selectedService.stock_usage.length > 0) {
      // Por cada item, restar de la base de datos de manera atómica llamando a supabase o trayendo el stock viejo
      for (const usage of selectedService.stock_usage) {
        // En supabase lo ideal es una RPC, pero aquí traemos la cantidad actual y restamos.
        const { data: stockData } = await supabase.from('stock_items').select('quantity').eq('id', usage.item_id).single()
        if (stockData) {
          const newQty = Math.max(0, stockData.quantity - usage.quantity)
          await supabase.from('stock_items').update({ quantity: newQty }).eq('id', usage.item_id)
        }
      }
    }

    await fetchData()
    return { error: null }
  }

  // Mutation: Subir Archivo
  const uploadFile = async (file: File) => {
    const uniqueName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    const filePath = `${patientId}/${uniqueName}`
    
    let mimeType = file.type
    if (!mimeType) {
      if (file.name.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      else if (file.name.endsWith('.doc')) mimeType = 'application/msword'
      else mimeType = 'application/octet-stream'
    }

    const { error: uploadErr } = await supabase.storage.from('medical_documents').upload(filePath, file, {
      upsert: true,
      contentType: mimeType
    })
    if (uploadErr) return { error: uploadErr.message }
    await fetchFiles()
    return { error: null }
  }

  const deleteFile = async (fileName: string, isLegacy?: boolean) => {
    const filePath = `${patientId}/${fileName}`
    const bucket = isLegacy ? 'patient_files' : 'medical_documents'
    const { error: delErr } = await supabase.storage.from(bucket).remove([filePath])
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

  // Mutation: Subir Avatar
  const uploadAvatar = async (file: File) => {
    try {
      const { compressImage } = await import('../../lib/utils')
      const compressedBlob = await compressImage(file)
      const fileName = `avatar_${Date.now()}.jpg`
      const filePath = `${patientId}/${fileName}`
      
      const { error: uploadErr } = await supabase.storage
        .from('patient_files')
        .upload(filePath, compressedBlob, { contentType: 'image/jpeg', upsert: true })
        
      if (uploadErr) throw new Error(uploadErr.message)
      
      const { data: { publicUrl } } = supabase.storage
        .from('patient_files')
        .getPublicUrl(filePath)
        
      const { error: updateErr } = await supabase
        .from('patients')
        .update({ photo_url: publicUrl })
        .eq('id', patientId)
        
      if (updateErr) throw new Error(updateErr.message)
      
      await fetchData()
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  return { 
    patient, 
    consultations, 
    files, 
    upcomingAppointments, 
    vaccinations,
    loading, 
    error, 
    saveConsultation, 
    deleteConsultation, 
    uploadFile, 
    deleteFile,
    uploadAvatar
  }
}
