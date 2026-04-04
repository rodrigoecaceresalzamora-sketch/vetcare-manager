// ============================================================
// VetCare Manager — Módulo 2: VaccineForm
//
// Modal para registrar una nueva vacuna.
// Calcula automáticamente la fecha de próximo refuerzo
// según el intervalo seleccionado.
// ============================================================

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useVaccineAlerts } from './useVaccineAlerts'
import { usePatients } from '../patients/usePatients'
import { PatientForm } from '../patients/PatientForm'
import { calcNextDueDate, formatDate } from '../../lib/utils'
import type { Patient, BoostInterval } from '../../types'

const BOOST_OPTIONS: { value: BoostInterval; label: string }[] = [
  { value: '2w', label: '2 semanas' },
  { value: '4w', label: '4 semanas' },
  { value: '6m', label: '6 meses' },
  { value: '1y', label: '1 año' },
]

interface Props {
  onClose: () => void
  onSaved: (patientName: string) => void
  /** Pre-selecciona un paciente si se abre desde la ficha */
  preselectedPatientId?: string
}

export function VaccineForm({ onClose, onSaved, preselectedPatientId }: Props) {
  const { saveVaccination } = useVaccineAlerts()
  const { savePatient } = usePatients()

  const [patients, setPatients]     = useState<Patient[]>([])
  const [patientId, setPatientId]   = useState(preselectedPatientId ?? '')
  const [vaccineName, setVaccineName] = useState('')
  const [appliedDate, setAppliedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [lotNumber, setLotNumber]   = useState('')
  const [boost, setBoost]           = useState<BoostInterval>('1y')
  const [saving, setSaving]         = useState(false)
  const [fieldError, setFieldError] = useState('')
  const [showPatientForm, setShowPatientForm] = useState(false)

  // Fecha calculada del próximo refuerzo
  const previewDate =
    appliedDate ? calcNextDueDate(appliedDate, boost) : null

  // Cargar lista de pacientes para el selector
  function loadPatientsList() {
    supabase
      .from('patients')
      .select('id, name, species, breed')
      .eq('status', 'activo')
      .order('name')
      .then(({ data }) => {
        if (data) setPatients(data as Patient[])
      })
  }

  useEffect(() => {
    loadPatientsList()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError('')

    if (!patientId)    return setFieldError('Selecciona un paciente')
    if (!vaccineName)  return setFieldError('Ingresa el nombre de la vacuna')
    if (!appliedDate)  return setFieldError('Ingresa la fecha de aplicación')

    setSaving(true)
    const { error } = await saveVaccination({
      patient_id:    patientId,
      vaccine_name:  vaccineName,
      applied_date:  appliedDate,
      lot_number:    lotNumber,
      boost_interval: boost,
    })
    setSaving(false)

    if (error) {
      setFieldError('Error al guardar: ' + error)
      return
    }

    const pat = patients.find((p) => p.id === patientId)
    onSaved(pat?.name ?? 'paciente')
  }

  return (
    // Overlay
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-pink-100">
          <h2 className="text-base font-medium text-gray-900">
            Registrar vacuna
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg
                       bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors
                       text-sm"
          >
            ✕
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Paciente */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-500 font-medium">Paciente</label>
              <button
                type="button"
                onClick={() => setShowPatientForm(true)}
                className="text-[10px] text-vet-rose hover:underline font-medium px-1"
              >
                + Nuevo Paciente
              </button>
            </div>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className={inputCls}
              required
            >
              <option value="">Seleccionar paciente…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.species} {p.breed}
                </option>
              ))}
            </select>
          </div>

          {/* Vacuna + lote */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre de la vacuna">
              <input
                className={inputCls}
                value={vaccineName}
                onChange={(e) => setVaccineName(e.target.value)}
                placeholder="Ej: Polivalente"
                required
              />
            </Field>
            <Field label="N° de lote">
              <input
                className={inputCls}
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="POL2501"
              />
            </Field>
          </div>

          {/* Fecha aplicación + refuerzo */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de aplicación">
              <input
                type="date"
                className={inputCls}
                value={appliedDate}
                onChange={(e) => setAppliedDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Próximo refuerzo">
              <select
                className={inputCls}
                value={boost}
                onChange={(e) => setBoost(e.target.value as BoostInterval)}
              >
                {BOOST_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Vista previa fecha calculada */}
          {previewDate && (
            <div className="flex items-center gap-2 px-3 py-2 bg-vet-light
                            rounded-lg text-xs text-vet-dark">
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Próximo refuerzo calculado:{' '}
              <strong className="font-medium">{formatDate(previewDate)}</strong>
              {' '}— se programará recordatorio.
            </div>
          )}

          {/* Error */}
          {fieldError && (
            <p className="text-xs text-red-600">{fieldError}</p>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg
                         hover:bg-gray-50 transition-colors text-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-vet-rose text-white
                         rounded-lg hover:bg-vet-dark disabled:opacity-50
                         transition-colors flex items-center gap-2"
            >
              {saving && (
                <div className="w-3.5 h-3.5 border border-white border-t-transparent
                                rounded-full animate-spin" />
              )}
              Guardar vacuna
            </button>
          </div>
        </form>
      </div>

      {showPatientForm && (
        <PatientForm
          onClose={() => setShowPatientForm(false)}
          onSavePatient={savePatient}
          onSaved={() => {
            setShowPatientForm(false)
            loadPatientsList() // Recargamos la lista para que el paciente nuevo aparezca disponible
          }}
        />
      )}
    </div>
  )
}

// ── Helpers locales ───────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-vet-rose/20 focus:border-vet-rose ' +
  'transition-colors text-gray-900'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      {children}
    </div>
  )
}
