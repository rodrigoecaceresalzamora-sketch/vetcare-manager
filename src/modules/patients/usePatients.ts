// ============================================================
// VetCare Manager — Hook: usePatients
// Maneja creación y lectura de la tabla patients y guardians
// ============================================================

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Patient, Species, Sex } from '../../types'
import { generateId } from '../../lib/utils'

export interface NewPatientInput {
  // Tutor
  guardian_name: string
  guardian_rut: string
  guardian_phone: string
  guardian_email?: string
  // Mascota
  name: string
  species: Species
  breed: string
  date_of_birth: string
  sex: Sex
  weight_kg?: number
  is_reactive?: boolean
}

export function usePatients() {
  const { clinicId } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    // Traemos pacientes con la data de su tutor (join)
    const { data, error: err } = await supabase
      .from('patients')
      .select('*, guardian:guardians(*)')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
    } else {
      setPatients((data as unknown) as Patient[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  const savePatient = async (input: NewPatientInput) => {
    try {
      // 1. Insertamos o buscamos el Tutor. 
      // Por simplicidad, aquí como es un manager veterinario insertamos un nuevo registro
      // o podrías hacer un select por rut. Para este prototipo, insertemos.
      const guardianId = generateId()
      const { error: gErr } = await supabase.from('guardians').insert({
        id: guardianId,
        name: input.guardian_name,
        rut: input.guardian_rut,
        phone: input.guardian_phone,
        email: input.guardian_email || '',
        clinic_id: clinicId
      })

      if (gErr) throw new Error("Error creando tutor: " + gErr.message)

      // 2. Insertamos el Paciente
      const patientId = generateId()
      const { error: pErr } = await supabase.from('patients').insert({
        id: patientId,
        guardian_id: guardianId,
        name: input.name,
        species: input.species,
        breed: input.breed,
        date_of_birth: input.date_of_birth,
        sex: input.sex,
        weight_kg: input.weight_kg || 0,
        is_reactive: input.is_reactive || false,
        status: 'activo',
        clinic_id: clinicId
      })

      if (pErr) throw new Error("Error creando paciente: " + pErr.message)

      await fetchPatients()
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  const updatePatient = async (patientId: string, guardianId: string, input: NewPatientInput) => {
    try {
      // 1. Actualizamos el Tutor
      const { error: gErr } = await supabase
        .from('guardians')
        .update({
          name: input.guardian_name,
          rut: input.guardian_rut,
          phone: input.guardian_phone,
          email: input.guardian_email || '',
        })
        .eq('id', guardianId)

      if (gErr) throw new Error("Error actualizando tutor: " + gErr.message)

      // 2. Actualizamos el Paciente
      const { error: pErr } = await supabase
        .from('patients')
        .update({
          name: input.name,
          species: input.species,
          breed: input.breed,
          date_of_birth: input.date_of_birth,
          sex: input.sex,
          weight_kg: input.weight_kg,
          is_reactive: input.is_reactive,
        })
        .eq('id', patientId)

      if (pErr) throw new Error("Error actualizando paciente: " + pErr.message)

      await fetchPatients()
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  const deletePatient = async (patientId: string, guardianId: string) => {
    try {
      // 1. Primero eliminamos las citas vinculadas al paciente (FK constraint)
      const { error: aErr } = await supabase
        .from('appointments')
        .delete()
        .eq('patient_id', patientId)
      if (aErr) throw new Error('Error borrando citas del paciente: ' + aErr.message)

      // 2. Borramos el paciente
      const { error: pErr } = await supabase.from('patients').delete().eq('id', patientId)
      if (pErr) throw new Error('Error borrando paciente: ' + pErr.message)

      // 3. Verificar si el tutor tiene más pacientes antes de eliminarlo
      const { data: sibling } = await supabase
        .from('patients')
        .select('id')
        .eq('guardian_id', guardianId)
        .limit(1)
        .maybeSingle()

      if (!sibling) {
        // Sin más mascotas: borrar tutor
        const { error: gErr } = await supabase.from('guardians').delete().eq('id', guardianId)
        if (gErr) throw new Error('Error borrando tutor: ' + gErr.message)
      }

      await fetchPatients()
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  return { patients, loading, error, fetchPatients, savePatient, updatePatient, deletePatient }
}
