// ============================================================
// VetCare Manager — Módulo 3: AppointmentModal
//
// Modal para crear citas internas.
// Al guardar, intenta sincronizar con Google Calendar
// via la Edge Function 'sync-gcal'.
// ============================================================

import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { usePatients } from '../patients/usePatients'
import { PatientForm } from '../patients/PatientForm'
import { useAuth } from '../../contexts/AuthContext'
import type { Appointment, AppointmentFormData, AppointmentService } from '../../types'
import { generateId, isValidPhone, isValidRUT, formatRUT } from '../../lib/utils'

const SERVICES: AppointmentService[] = [
  'Consulta General',
  'Vacunación',
  'Control',
  'Telemedicina',
]

const DURATIONS = [
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
]

interface Props {
  /** Datetime pre-seleccionado desde la grilla (ISO local) */
  initialDateTime?: string
  editingAppointment?: Appointment
  onClose: () => void
  onSaved: (petName: string) => void
}

export function AppointmentModal({ initialDateTime, editingAppointment, onClose, onSaved }: Props) {
  const [form, setForm] = useState<AppointmentFormData>({
    guardian_name:    editingAppointment?.guardian_name ?? '',
    guardian_email:   editingAppointment?.guardian_email ?? '',
    guardian_phone:   editingAppointment?.guardian_phone ?? '',
    guardian_rut:     (editingAppointment as any)?.guardian_rut ?? '',
    pet_name:         editingAppointment?.pet_name ?? '',
    service:          editingAppointment?.service ?? 'Consulta General',
    scheduled_at:     editingAppointment 
                      ? new Date(editingAppointment.scheduled_at).toISOString().slice(0, 16)
                      : initialDateTime ?? '',
    duration_minutes: editingAppointment?.duration_minutes ?? 30,
    notes:            (editingAppointment as any)?.notes ?? '',
  })
  
  const { patients, savePatient } = usePatients()
  const { role } = useAuth()
  const [showPatientForm, setShowPatientForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [fieldError, setFieldError] = useState('')
  const [searchTerm, setSearchTerm] = useState(editingAppointment?.pet_name ?? '')
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const isReadOnly = editingAppointment && role === 'ayudante'

  const phoneValid = useMemo(() => !form.guardian_phone || isValidPhone(form.guardian_phone), [form.guardian_phone])
  const rutValid = useMemo(() => !form.guardian_rut || isValidRUT(form.guardian_rut), [form.guardian_rut])

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return []
    return patients.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.guardian?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm, patients])

  function set<K extends keyof AppointmentFormData>(
    key: K,
    value: AppointmentFormData[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Auto-fill logic
  function handlePatientSelect(p: any) {
    setForm(f => ({
      ...f,
      pet_name: p.name,
      guardian_name: p.guardian?.name || '',
      guardian_phone: p.guardian?.phone || '',
      guardian_email: p.guardian?.email || '',
      guardian_rut: p.guardian?.rut || '',
    }))
    setSearchTerm(p.name)
    setShowSuggestions(false)
  }



    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldError('')

    if (!form.guardian_name)  return setFieldError('Nombre del tutor requerido')
    if (!form.guardian_email) return setFieldError('Correo del tutor requerido')
    if (!form.pet_name)       return setFieldError('Nombre de la mascota requerido')
    if (!form.scheduled_at)   return setFieldError('Fecha y hora requerida')

    const date = new Date(form.scheduled_at)
    const hours = date.getHours()
    if (hours < 9 || hours > 18) {
      return setFieldError('El horario de atención es de 09:00 a 18:00. Por favor, selecciona una hora válida.')
    }
    
    setSaving(true)

    const payload = {
      guardian_name:    form.guardian_name,
      guardian_email:   form.guardian_email,
      guardian_phone:   form.guardian_phone,
      guardian_rut:     (form as any).guardian_rut,
      pet_name:         form.pet_name,
      service:          form.service,
      scheduled_at:     new Date(form.scheduled_at).toISOString(),
      duration_minutes: form.duration_minutes,
      notes:            form.notes,
      status:           'confirmada',
      source:           editingAppointment?.source ?? 'interno',
    }

    let id = editingAppointment?.id

    if (editingAppointment) {
      // Actualizar
      const { error: dbErr } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', editingAppointment.id)
      
      if (dbErr) {
        setSaving(false)
        setFieldError('Error al actualizar: ' + dbErr.message)
        return
      }
    } else {
      // Insertar
      id = generateId()
      const { error: dbErr } = await supabase.from('appointments').insert({
        id,
        ...payload
      })

      if (dbErr) {
        setSaving(false)
        setFieldError('Error al guardar: ' + dbErr.message)
        return
      }
    }

    setSaving(false)
    onSaved(form.pet_name)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-pink-100">
          <div>
            <h2 className="text-base font-medium text-gray-900">
              {editingAppointment ? 'Editar cita' : 'Nueva cita'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg
                       bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Sección tutor */}
          <Section title="Datos del tutor">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre completo">
                <input
                  className={inputCls}
                  value={form.guardian_name}
                  onChange={(e) => set('guardian_name', e.target.value)}
                  placeholder="Ana García"
                  disabled={isReadOnly}
                  required
                />
              </Field>
              <Field label="Teléfono">
                <input
                  className={`${inputCls} ${!phoneValid ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-200' : ''}`}
                  value={form.guardian_phone}
                  onChange={(e) => set('guardian_phone', e.target.value)}
                  placeholder="+56 9 1234 5678"
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="RUT">
                <input
                  className={`${inputCls} ${!rutValid ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-200' : ''}`}
                  value={(form as any).guardian_rut}
                  onChange={(e) => set('guardian_rut' as any, formatRUT(e.target.value))}
                  placeholder="12.345.678-9"
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Correo electrónico" className="col-span-2">
                <input
                  type="email"
                  className={inputCls}
                  value={form.guardian_email}
                  onChange={(e) => set('guardian_email', e.target.value)}
                  placeholder="correo@ejemplo.cl"
                  disabled={isReadOnly}
                  required
                />
              </Field>
            </div>
          </Section>

          {/* Sección cita */}
          <Section title="Detalles de la cita">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mascota" className="relative">
                <div className="flex gap-1">
                  <div className="relative flex-1">
                    <input
                      className={inputCls}
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        set('pet_name', e.target.value)
                        setShowSuggestions(true)
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Buscar o ingresar nombre..."
                      disabled={isReadOnly}
                      required
                    />
                    {showSuggestions && filteredPatients.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredPatients.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-vet-light/50 transition-colors border-b border-gray-50 last:border-0"
                            onClick={() => handlePatientSelect(p)}
                          >
                            <span className="font-bold">{p.name}</span>
                            <span className="text-[10px] text-gray-500 ml-2">({p.guardian?.name})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPatientForm(true)}
                    className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-vet-rose text-white rounded-lg hover:bg-vet-dark transition-colors disabled:opacity-50"
                    title="Registrar nueva mascota"
                    disabled={isReadOnly}
                  >
                    +
                  </button>
                </div>
              </Field>
              <Field label="Servicio">
                <select
                  className={inputCls}
                  value={form.service}
                  onChange={(e) => set('service', e.target.value as AppointmentService)}
                  disabled={isReadOnly}
                >
                  {SERVICES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha y hora">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={form.scheduled_at}
                  onChange={(e) => set('scheduled_at', e.target.value)}
                  disabled={isReadOnly}
                  required
                />
              </Field>
              <Field label="Duración">
                <select
                  className={inputCls}
                  value={form.duration_minutes}
                  onChange={(e) => set('duration_minutes', Number(e.target.value))}
                  disabled={isReadOnly}
                >
                  {DURATIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Notas (opcional)" className="col-span-2">
                <input
                  className={inputCls}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Motivo de la consulta…"
                />
              </Field>
            </div>
          </Section>

          {/* Aviso telemedicina */}
          {form.service === 'Telemedicina' && (
            <div className="flex items-start gap-2 px-3 py-2 bg-indigo-50
                            border border-indigo-100 rounded-lg text-xs text-indigo-700">
              <span className="text-sm">💻</span>
              Se generará un enlace de Google Meet y se enviará automáticamente
              al correo del tutor.
            </div>
          )}

          {/* Error */}
          {fieldError && (
            <p className="text-xs text-red-600">{fieldError}</p>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-1">
            {editingAppointment && role === 'admin' && (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (window.confirm('¿Estás segura de ELIMINAR esta cita?')) {
                    setSaving(true)
                    
                    const { error: delErr } = await supabase.from('appointments').delete().eq('id', editingAppointment.id)
                    if (delErr) {
                      setFieldError('Error al borrar: ' + delErr.message)
                      setSaving(false)
                    } else {
                      onSaved(form.pet_name) // Refresca agenda
                    }
                  }
                }}
                className="mr-auto px-4 py-2 text-sm font-medium text-red-600 border border-red-100
                           bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Eliminar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg
                         hover:bg-gray-50 transition-colors text-gray-700"
            >
              {isReadOnly ? 'Cerrar' : 'Cancelar'}
            </button>
            {!isReadOnly && (
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
                {editingAppointment ? 'Actualizar cita' : 'Guardar cita'}
              </button>
            )}
          </div>
        </form>
      </div>

      {showPatientForm && (
        <PatientForm
          onClose={() => setShowPatientForm(false)}
          onSavePatient={savePatient}
          onSaved={(name) => {
            setShowPatientForm(false)
            handlePatientSelect(name)
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-widest
                    text-vet-rose mb-3 pb-1.5 border-b border-pink-100">
        {title}
      </p>
      {children}
    </div>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      {children}
    </div>
  )
}
