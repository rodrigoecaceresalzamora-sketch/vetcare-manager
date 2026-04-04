// ============================================================
// VetCare Manager — Hook: useVaccineAlerts
// Módulo 2: Vacunas y notificaciones
//
// Responsabilidades:
//   • Cargar vacunas con datos del paciente y tutor
//   • Calcular estado (urgente/proxima/vigente/vencida)
//   • Guardar nueva vacuna
//   • Marcar recordatorio como enviado
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import {
  calcVaccineStatus,
  calcNextDueDate,
  generateId,
} from '../../lib/utils'
import type {
  Vaccination,
  VaccineAlert,
  BoostInterval,
} from '../../types'

interface NewVaccineInput {
  patient_id: string
  vaccine_name: string
  applied_date: string
  lot_number: string
  boost_interval: BoostInterval
}

export function useVaccineAlerts() {
  const [alerts, setAlerts] = useState<VaccineAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Carga todas las vacunas con joins a patients y guardians ──
  const fetchVaccinations = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('vaccinations')
      .select(`
        *,
        patient:patients (
          *,
          guardian:guardians (*)
        )
      `)
      .order('next_due_date', { ascending: true })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    // Transforma los datos crudos en VaccineAlert con status calculado
    const mapped: VaccineAlert[] = (data ?? [])
      .filter((v) => v.patient && v.patient.guardian)
      .map((v) => ({
        vaccination: v as Vaccination,
        patient: v.patient,
        guardian: v.patient.guardian,
        days_left: Math.ceil(
          (new Date(v.next_due_date + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) /
          (1000 * 60 * 60 * 24)
        ),
        status: calcVaccineStatus(v.next_due_date),
      }))

    setAlerts(mapped)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchVaccinations()
  }, [fetchVaccinations])

  // ── Guardar nueva vacuna ──────────────────────────────────────
  const saveVaccination = useCallback(
    async (input: NewVaccineInput): Promise<{ error: string | null }> => {
      const next_due_date = calcNextDueDate(input.applied_date, input.boost_interval)

      const record: Omit<Vaccination, 'patient'> = {
        id: generateId(),
        patient_id: input.patient_id,
        vaccine_name: input.vaccine_name,
        applied_date: input.applied_date,
        lot_number: input.lot_number,
        next_due_date,
        reminder_sent: false,
      }

      const { error: err } = await supabase.from('vaccinations').insert(record)

      if (err) return { error: err.message }

      await fetchVaccinations()
      return { error: null }
    },
    [fetchVaccinations]
  )

  // ── Enviar recordatorio por email (llama a Edge Function) ─────
  const sendReminder = useCallback(
    async (vaccinationId: string): Promise<{ error: string | null }> => {
      const { error: err } = await supabase.functions.invoke('send-vaccine-reminder', {
        body: { vaccination_id: vaccinationId },
      })

      if (err) return { error: err.message }

      // Marcar reminder_sent = true en la BD
      await supabase
        .from('vaccinations')
        .update({ reminder_sent: true })
        .eq('id', vaccinationId)

      await fetchVaccinations()
      return { error: null }
    },
    [fetchVaccinations]
  )

  // ── Alertas filtradas por urgencia ────────────────────────────
  const urgentAlerts   = alerts.filter((a) => a.status === 'urgente')
  const upcomingAlerts = alerts.filter((a) => a.status === 'proxima')
  const allSorted      = [...alerts].sort((a, b) => {
    const order = { urgente: 0, vencida: 1, proxima: 2, vigente: 3 }
    return order[a.status] - order[b.status]
  })

  // ── Borrado individual de Vacuna ──────────────────────────────
  const deleteVaccination = useCallback(
    async (vaccinationId: string): Promise<{ error: string | null }> => {
      const { error: err } = await supabase.from('vaccinations').delete().eq('id', vaccinationId)
      if (err) return { error: err.message }
      await fetchVaccinations()
      return { error: null }
    },
    [fetchVaccinations]
  )

  return {
    alerts: allSorted,
    urgentAlerts,
    upcomingAlerts,
    loading,
    error,
    saveVaccination,
    sendReminder,
    deleteVaccination,
    refresh: fetchVaccinations,
  }
}
