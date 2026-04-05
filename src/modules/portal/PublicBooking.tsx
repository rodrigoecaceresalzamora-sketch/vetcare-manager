// ============================================================
// VetCare Manager — Módulo 4: PublicBooking
//
// Página pública de agendamiento (sin login).
// Se accede desde: https://tudominio.cl/reserva
//
// Flujo de 4 pasos:
//   1. Seleccionar servicio
//   2. Elegir fecha
//   3. Elegir horario disponible
//   4. Ingresar datos personales → confirmar
//
// Al confirmar:
//   • Inserta cita en Supabase (RLS permite INSERT anon)
//   • Invoca Edge Function 'confirm-booking' para enviar email
//   • Muestra pantalla de confirmación
// ============================================================

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { generateId, isValidPhone } from '../../lib/utils'
import type { AppointmentService, PublicBookingFormData } from '../../types'

// ── Datos de servicios ────────────────────────────────────────
const SERVICES: {
  id: AppointmentService
  icon: string
  name: string
  desc: string
  duration: string
  price: string
}[] = [
  {
    id:       'Consulta General',
    icon:     '🩺',
    name:     'Consulta General',
    desc:     'Revisión clínica completa, diagnóstico y tratamiento',
    duration: '30 min',
    price:    '$25.000',
  },
  {
    id:       'Vacunación',
    icon:     '💉',
    name:     'Vacunación',
    desc:     'Aplicación de vacunas con registro en carnet digital',
    duration: '20 min',
    price:    '$18.000',
  },
  {
    id:       'Control',
    icon:     '📋',
    name:     'Control',
    desc:     'Seguimiento de tratamiento o post-operatorio',
    duration: '20 min',
    price:    '$15.000',
  },
  {
    id:       'Telemedicina',
    icon:     '💻',
    name:     'Telemedicina',
    desc:     'Videoconsulta desde la comodidad de tu hogar',
    duration: '25 min',
    price:    '$12.000',
  },
]

// ── Próximos 7 días hábiles ───────────────────────────────────
function getAvailableDates(): { label: string; value: string }[] {
  const dates: { label: string; value: string }[] = []
  const d = new Date()
  d.setDate(d.getDate() + 1) // Mañana en adelante

  while (dates.length < 7) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) { // Excluir fines de semana
      dates.push({
        label: d.toLocaleDateString('es-CL', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        value: d.toISOString().split('T')[0],
      })
    }
    d.setDate(d.getDate() + 1)
  }
  return dates
}

// ── Slots de horario ─────────────────────────────────────────
const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30',
  '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
]

// ── Tipos internos ────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4 | 'confirmed'

export function PublicBooking() {
  const { user } = useAuth()
  const [step, setStep]             = useState<Step>(1)
  const [service, setService]       = useState<AppointmentService | null>(null)
  const [date, setDate]             = useState<string | null>(null)
  const [time, setTime]             = useState<string | null>(null)
  const [takenSlots, setTakenSlots] = useState<string[]>([])
  const [form, setForm]             = useState<PublicBookingFormData>({
    guardian_name:  user?.user_metadata?.full_name || '',
    guardian_email: user?.email || '',
    guardian_phone: '',
    pet_name:       '',
    service:        'Consulta General',
    scheduled_at:   '',
  })
  const [saving, setSaving]       = useState(false)
  const [fieldError, setFieldError] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setBookingId]   = useState<string | null>(null)

  const availableDates = getAvailableDates()

  // Carga slots ocupados cuando cambia la fecha
  useEffect(() => {
    if (!date) return
    supabase
      .from('appointments')
      .select('scheduled_at')
      .gte('scheduled_at', date + 'T00:00:00')
      .lt('scheduled_at',  date + 'T23:59:59')
      .neq('status', 'cancelada')
      .then(({ data }) => {
        const taken = (data ?? []).map((a) =>
          new Date(a.scheduled_at).toTimeString().slice(0, 5)
        )
        setTakenSlots(taken)
      })
  }, [date])

  function setField<K extends keyof PublicBookingFormData>(
    key: K, value: PublicBookingFormData[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const phoneValid = useMemo(() => !form.guardian_phone || isValidPhone(form.guardian_phone), [form.guardian_phone])

  // ── Confirmar reserva ─────────────────────────────────────────
  async function handleConfirm(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setFieldError('')

    if (!form.guardian_name)  return setFieldError('Ingresa tu nombre')
    if (!form.guardian_email) return setFieldError('Ingresa tu correo')
    if (!form.pet_name)       return setFieldError('Ingresa el nombre de tu mascota')

    const scheduledAt = `${date}T${time}:00`
    const id = generateId()

    setSaving(true)
    const { error: dbErr } = await supabase.from('appointments').insert({
      id,
      guardian_name:    form.guardian_name,
      guardian_email:   form.guardian_email,
      guardian_phone:   form.guardian_phone,
      pet_name:         form.pet_name,
      service:          service,
      scheduled_at:     scheduledAt,
      duration_minutes: 30,
      status:           'pendiente',
      source:           'portal',
    })

    if (dbErr) {
      setSaving(false)
      setFieldError('Error al confirmar. Por favor intenta nuevamente.')
      return
    }

    // Enviar email de confirmación (best-effort)
    try {
      await supabase.functions.invoke('confirm-booking', {
        body: { appointment_id: id },
      })
    } catch {
      console.warn('Email de confirmación no pudo enviarse')
    }

    setBookingId(id)
    setSaving(false)
    setStep('confirmed')
  }

  // ── Pantalla de confirmación ──────────────────────────────────
  if (step === 'confirmed') {
    const svc = SERVICES.find((s) => s.id === service)
    return (
      <PortalShell>
        <div className="max-w-md mx-auto py-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center
                          justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">
            ¡Reserva confirmada!
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Se envió un correo a <strong>{form.guardian_email}</strong> con
            todos los detalles.
          </p>

          <div className="bg-vet-light/60 rounded-xl p-4 text-left space-y-2 mb-6">
            <Row label="Servicio"  value={`${svc?.icon} ${svc?.name}`} />
            <Row label="Mascota"   value={form.pet_name} />
            <Row label="Fecha"     value={availableDates.find(d => d.value === date)?.label ?? date ?? ''} />
            <Row label="Hora"      value={time ?? ''} />
            {service === 'Telemedicina' ? (
              <Row label="Enlace" value="Google Meet (enviado por email)" accent />
            ) : (
              <Row label="Dirección" value="Av. Las Flores 1234, Viña del Mar" />
            )}
          </div>

          <button
            onClick={() => {
              setStep(1)
              setService(null)
              setDate(null)
              setTime(null)
              setForm({ guardian_name:'', guardian_email:'', guardian_phone:'', pet_name:'', service:'Consulta General', scheduled_at:'' })
            }}
            className="px-6 py-2.5 bg-vet-rose text-white text-sm font-medium
                       rounded-lg hover:bg-vet-dark transition-colors"
          >
            Hacer otra reserva
          </button>
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell>
      {/* Indicador de pasos */}
      <StepIndicator current={step as number} />

      {/* ── Paso 1: Servicio ─────────────────────────────────── */}
      {step === 1 && (
        <section>
          <SectionTitle step={1} title="Selecciona el servicio" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SERVICES.map((svc) => (
              <button
                key={svc.id}
                onClick={() => { setService(svc.id); setStep(2) }}
                className={`text-left p-4 rounded-xl border transition-all
                            hover:border-vet-rose hover:bg-vet-light/40
                            ${service === svc.id
                              ? 'border-vet-rose bg-vet-light'
                              : 'border-gray-200 bg-white'
                            }`}
              >
                <div className="text-2xl mb-2">{svc.icon}</div>
                <p className="text-sm font-medium text-gray-900">{svc.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{svc.desc}</p>
                <div className="flex gap-3 mt-2">
                  <span className="text-xs text-vet-rose font-medium">
                    ⏱ {svc.duration}
                  </span>
                  <span className="text-xs text-gray-500">{svc.price}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Paso 2: Fecha ────────────────────────────────────── */}
      {step === 2 && (
        <section>
          <SectionTitle step={2} title="Elige la fecha" />
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
            {availableDates.map((d) => (
              <button
                key={d.value}
                onClick={() => { setDate(d.value); setStep(3) }}
                className={`flex-shrink-0 px-3 py-2 rounded-lg border text-sm
                            capitalize transition-all
                            ${date === d.value
                              ? 'bg-vet-rose text-white border-vet-rose'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-vet-rose'
                            }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <BackButton onClick={() => setStep(1)} />
        </section>
      )}

      {/* ── Paso 3: Horario ──────────────────────────────────── */}
      {step === 3 && (
        <section>
          <SectionTitle
            step={3}
            title="Horario disponible"
            sub={availableDates.find(d => d.value === date)?.label}
          />
          <div className="grid grid-cols-4 gap-2 mb-4">
            {TIME_SLOTS.map((slot) => {
              const taken = takenSlots.includes(slot)
              return (
                <button
                  key={slot}
                  disabled={taken}
                  onClick={() => { setTime(slot); setStep(4) }}
                  className={`py-2 rounded-lg border text-sm font-medium
                              transition-all
                              ${taken
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                                : time === slot
                                ? 'bg-vet-rose text-white border-vet-rose'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-vet-rose hover:bg-vet-light/30'
                              }`}
                >
                  {slot}
                  {taken && (
                    <div className="text-[9px] font-normal">Ocupado</div>
                  )}
                </button>
              )
            })}
          </div>
          <BackButton onClick={() => setStep(2)} />
        </section>
      )}

      {/* ── Paso 4: Datos personales ─────────────────────────── */}
      {step === 4 && (
        <section>
          <SectionTitle step={4} title="Tus datos" />

          {/* Resumen de la reserva */}
          <div className="bg-vet-light/50 border border-pink-200 rounded-xl
                          p-3 mb-4 flex flex-wrap gap-x-4 gap-y-1">
            <span className="text-xs text-vet-dark">
              <strong>{SERVICES.find(s => s.id === service)?.icon}</strong>{' '}
              {service}
            </span>
            <span className="text-xs text-gray-500">
              {availableDates.find(d => d.value === date)?.label} · {time}
            </span>
          </div>

          {!user ? (
            <div className="bg-white border-2 border-dashed border-vet-rose/30 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-vet-rose/5 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                🔒
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">Inicia sesi&oacute;n para continuar</h3>
              <p className="text-xs text-gray-500 mb-6 max-w-[200px] mx-auto">
                Para confirmar tu reserva y enviarte el recordatorio, necesitamos que tengas una cuenta.
              </p>
              <Link
                to="/login"
                state={{ from: { pathname: '/reserva' } }}
                className="inline-block px-8 py-3 bg-vet-rose text-white text-xs font-bold rounded-xl hover:bg-vet-dark transition-all"
              >
                Cerrar sesión e Identificarme
              </Link>
            </div>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Tu nombre completo">
                  <input
                    className={inputCls}
                    value={form.guardian_name}
                    onChange={(e) => setField('guardian_name', e.target.value)}
                    placeholder="Ana García López"
                    required
                  />
                </Field>
                <Field label="Nombre de tu mascota">
                  <input
                    className={inputCls}
                    value={form.pet_name}
                    onChange={(e) => setField('pet_name', e.target.value)}
                    placeholder="Firulais"
                    required
                  />
                </Field>
                <Field label="Correo electrónico">
                  <input
                    type="email"
                    readOnly
                    className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`}
                    value={form.guardian_email}
                    required
                  />
                </Field>
                <Field label="Teléfono (opcional)">
                  <input
                    className={`${inputCls} ${!phoneValid ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-200' : ''}`}
                    value={form.guardian_phone}
                    onChange={(e) => setField('guardian_phone', e.target.value)}
                    placeholder="+56 9 1234 5678"
                  />
                </Field>
              </div>

              {service === 'Telemedicina' && (
                <div className="flex items-start gap-2 px-3 py-2 bg-indigo-50
                                border border-indigo-100 rounded-lg text-xs text-indigo-700">
                  <span>💻</span>
                  Recibirás un enlace de Google Meet por correo. Asegúrate de
                  ingresar un correo válido.
                </div>
              )}

              <div className="text-xs text-gray-400">
                Tus datos se usan únicamente para gestionar tu cita. Cumplimos
                con la Ley 19.628 de Protección de Datos Personales (Chile).
              </div>

              {fieldError && (
                <p className="text-xs text-red-600">{fieldError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <BackButton onClick={() => setStep(3)} />
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-vet-rose text-white text-sm
                             font-medium rounded-lg hover:bg-vet-dark
                             disabled:opacity-50 transition-colors
                             flex items-center justify-center gap-2"
                >
                  {saving && (
                    <div className="w-4 h-4 border-2 border-white
                                    border-t-transparent rounded-full animate-spin" />
                  )}
                  Confirmar reserva
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </PortalShell>
  )
}

// ── Sub-componentes del portal ────────────────────────────────

/** Envuelve el portal con header de marca */
function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-vet-bone">
      {/* Header */}
      <header className="bg-vet-dark py-5 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center
                          justify-center text-white text-base">
            🏥
          </div>
          <div>
            <h1 className="text-white text-base font-medium">VetCare Manager</h1>
            <p className="text-white/50 text-xs">Reserva tu cita en línea</p>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400">
        Clínica Veterinaria · Av. Las Flores 1234, Viña del Mar
        <br />
        <span className="text-vet-rose">+56 32 234 5678</span>
        {' '}· contacto@vetcare.cl
      </footer>
    </div>
  )
}

/** Barra de progreso de pasos */
function StepIndicator({ current }: { current: number }) {
  const steps = ['Servicio', 'Fecha', 'Horario', 'Tus datos']
  return (
    <div className="flex items-center mb-6">
      {steps.map((label, i) => {
        const n = i + 1
        const done    = n < current
        const active  = n === current
        return (
          <div key={label} className="flex-1 flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center
                             text-xs font-medium transition-colors
                             ${done
                               ? 'bg-vet-rose text-white'
                               : active
                               ? 'bg-vet-dark text-white'
                               : 'bg-gray-200 text-gray-500'
                             }`}
              >
                {done ? '✓' : n}
              </div>
              <span className={`text-[10px] mt-1 hidden sm:block
                               ${active ? 'text-vet-dark font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 transition-colors
                             ${n < current ? 'bg-vet-rose' : 'bg-gray-200'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SectionTitle({
  step, title, sub,
}: { step: number; title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-medium text-vet-rose uppercase tracking-widest mb-1">
        Paso {step}
      </div>
      <h2 className="text-base font-medium text-gray-900">{title}</h2>
      {sub && <p className="text-sm text-gray-500 mt-0.5 capitalize">{sub}</p>}
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-sm text-gray-500
                 hover:text-vet-rose transition-colors"
    >
      ← Volver
    </button>
  )
}

function Row({ label, value, accent = false }: {
  label: string; value: string; accent?: boolean
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${accent ? 'text-vet-rose' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-vet-rose/20 focus:border-vet-rose ' +
  'transition-colors text-gray-900'
