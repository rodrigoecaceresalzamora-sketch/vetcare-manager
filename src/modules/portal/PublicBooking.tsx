// ============================================================
// VetCare Manager — Módulo 4: PublicBooking
//
// Página pública de agendamiento (sin login).
// Se accede desde: https://tudominio.cl/reserva
// ============================================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { generateId } from '../../lib/utils'
import type { PublicBookingFormData } from '../../types'

// ── Cargar servicios dinámicos ──────────────────────────────────
async function fetchPublicServices() {
  const { data } = await supabase
    .from('services')
    .select('*')
    .order('name', { ascending: true })
  return data || []
}

// ── Próximos 7 días permitidos ──────────────────────────────────
function getAvailableDates(): { label: string; value: string; dow: number }[] {
  const dates: { label: string; value: string; dow: number }[] = []
  const d = new Date()
  d.setDate(d.getDate() + 1) // Mañana en adelante

  const ALLOWED_DAYS = [2, 3, 6, 0] // Mar, Mié, Sáb, Dom

  while (dates.length < 14) { // Buscamos en los próximos 14 días
    const dow = d.getDay()
    if (ALLOWED_DAYS.includes(dow)) {
      dates.push({
        label: d.toLocaleDateString('es-CL', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        value: d.toISOString().split('T')[0],
        dow
      })
    }
    d.setDate(d.getDate() + 1)
  }
  return dates.slice(0, 8) 
}

// ── Slots de horario dinámicos ─────────────────────────────────
function getTimeSlots(dow: number): string[] {
  if (dow === 2 || dow === 3) { // Mar, Mié: 10:00 - 16:00
    return [
      '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
      '14:00', '14:30', '15:00', '15:30', '16:00'
    ]
  }
  if (dow === 6 || dow === 0) { // Sáb, Dom: 10:00 - 14:00
    return [
      '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30'
    ]
  }
  return []
}

type Step = 1 | 2 | 3 | 4 | 'confirmed'

export function PublicBooking() {
  const { user } = useAuth()
  const [step, setStep]             = useState<Step>(1)
  const [service, setService]       = useState<any | null>(null)
  const [dbServices, setDbServices] = useState<any[]>([])
  const [date, setDate]             = useState<string | null>(null)
  const [time, setTime]             = useState<string | null>(null)
  const [takenSlots, setTakenSlots] = useState<string[]>([])
  const [form, setForm]             = useState<PublicBookingFormData>({
    guardian_name:  user?.user_metadata?.full_name || '',
    guardian_email: user?.email || '',
    guardian_phone: '',
    pet_name:       '',
    service:        '',
    scheduled_at:   '',
    is_home_visit:  false,
    address:        '',
    guardian_rut:   '',
  })
  const [saving, setSaving]       = useState(false)
  const [fieldError, setFieldError] = useState('')
  const [, setBookingId]   = useState<string | null>(null)

  const availableDates = getAvailableDates()

  useEffect(() => {
    fetchPublicServices().then(setDbServices)
  }, [])

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


  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setFieldError('')
    if (!form.guardian_name)  return setFieldError('Ingresa tu nombre')
    if (!form.guardian_email) return setFieldError('Ingresa tu correo')
    if (!form.pet_name)       return setFieldError('Ingresa el nombre de tu mascota')
    if (form.is_home_visit && !form.address) return setFieldError('Ingresa tu dirección')

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString()
    const id = generateId()

    setSaving(true)
    const { error: dbErr } = await supabase.from('appointments').insert({
      id,
      guardian_name:    form.guardian_name,
      guardian_email:   form.guardian_email,
      guardian_phone:   form.guardian_phone,
      guardian_rut:     form.guardian_rut,
      pet_name:         form.pet_name,
      service:          service.name,
      scheduled_at:     scheduledAt,
      duration_minutes: service.duration_minutes || 30,
      status:           'pendiente',
      source:           'portal',
      is_home_visit:    form.is_home_visit,
      address:          form.address,
    })

    if (dbErr) {
      setSaving(false)
      setFieldError('Error al confirmar. Por favor intenta nuevamente.')
      return
    }

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

  if (step === 'confirmed') {
    return (
      <PortalShell>
        <div className="max-w-md mx-auto py-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">¡Reserva enviada!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Tu reserva para <strong>{form.pet_name}</strong> ha sido enviada. Aparece como <strong>pendiente</strong> hasta que sea confirmada por la Dra. Sofía.
          </p>
          <div className="bg-vet-light/60 rounded-xl p-4 text-left space-y-2 mb-6 text-sm">
            <Row label="Servicio"  value={`${service?.icon || '🩺'} ${service?.name}`} />
            <Row label="Fecha"     value={availableDates.find(d => d.value === date)?.label ?? date ?? ''} />
            <Row label="Hora"      value={time ?? ''} />
            {form.is_home_visit && <Row label="Dirección" value={form.address || 'Sí'} />}
          </div>
          <button
            onClick={() => { setStep(1); setService(null); setDate(null); setTime(null); }}
            className="px-6 py-2.5 bg-vet-rose text-white text-sm font-medium rounded-lg hover:bg-vet-dark transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell>
      <StepIndicator current={step as number} />
      {step === 1 && (
        <section>
          <SectionTitle step={1} title="Selecciona el servicio" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dbServices.map((svc) => (
              <button
                key={svc.id}
                onClick={() => { setService(svc); setStep(2) }}
                className={`text-left p-4 rounded-xl border transition-all hover:border-vet-rose hover:bg-vet-light/40
                            ${service?.id === svc.id ? 'border-vet-rose bg-vet-light' : 'border-gray-200 bg-white'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="text-2xl mb-2">{svc.icon || '🩺'}</div>
                  <span className="text-sm font-bold text-gray-900">${svc.price.toLocaleString('es-CL')}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{svc.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{svc.description}</p>
                <div className="flex gap-3 mt-2">
                  <span className="text-xs text-vet-rose font-medium">⏱ {svc.duration_minutes} min</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <SectionTitle step={2} title="Elige la fecha" />
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
            {availableDates.map((d) => (
              <button
                key={d.value}
                onClick={() => { setDate(d.value); setStep(3) }}
                className={`flex-shrink-0 px-3 py-2 rounded-lg border text-sm capitalize transition-all
                            ${date === d.value ? 'bg-vet-rose text-white border-vet-rose' : 'bg-white border-gray-200 text-gray-700 hover:border-vet-rose'}`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <BackButton onClick={() => setStep(1)} />
        </section>
      )}

      {step === 3 && (
        <section>
          <SectionTitle step={3} title="Horario disponible" sub={availableDates.find(d => d.value === date)?.label} />
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
            {getTimeSlots(availableDates.find(d => d.value === date)?.dow ?? 0).map((slot) => {
              const taken = takenSlots.includes(slot)
              return (
                <button
                  key={slot}
                  disabled={taken}
                  onClick={() => { setTime(slot); setStep(4) }}
                  className={`py-2 rounded-lg border text-sm font-medium transition-all
                              ${taken ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through' : 
                                time === slot ? 'bg-vet-rose text-white border-vet-rose' : 
                                'bg-white border-gray-200 text-gray-700 hover:border-vet-rose'}`}
                >
                  {slot}
                </button>
              )
            })}
          </div>
          <BackButton onClick={() => setStep(2)} />
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4">
          <SectionTitle step={4} title="Tus datos" />
          <div className="bg-vet-light/50 border border-pink-200 rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-1">
            <span className="text-xs text-vet-dark"><strong>{service?.icon}</strong> {service?.name}</span>
            <span className="text-xs text-gray-500">{availableDates.find(d => d.value === date)?.label} · {time}</span>
          </div>

          {!user ? (
            <div className="bg-white border-2 border-dashed border-vet-rose/30 rounded-2xl p-8 text-center">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Identifícate para agendar</h3>
              <Link to="/login" state={{ from: { pathname: '/reserva' } }}
                    className="inline-block px-8 py-3 bg-vet-rose text-white text-xs font-bold rounded-xl hover:bg-vet-dark transition-all">
                Ir al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <Field label="Nombre completo">
                  <input className={inputCls} value={form.guardian_name} onChange={(e) => setField('guardian_name', e.target.value)} required />
                </Field>
                <Field label="Nombre mascota">
                  <input className={inputCls} value={form.pet_name} onChange={(e) => setField('pet_name', e.target.value)} required />
                </Field>
                <Field label="Correo electrónico">
                  <input type="email" className={inputCls} value={form.guardian_email} onChange={(e) => setField('guardian_email', e.target.value)} placeholder="tu@email.com" required />
                </Field>
                <Field label="Teléfono">
                  <input className={inputCls} value={form.guardian_phone} onChange={(e) => setField('guardian_phone', e.target.value)} placeholder="+56 9..." />
                </Field>
                <Field label="RUT (Opcional)">
                  <input className={inputCls} value={form.guardian_rut} onChange={(e) => setField('guardian_rut', e.target.value)} placeholder="12.345.678-9" />
                </Field>
              </div>

              <div className="py-2 border-t border-pink-50 text-left">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_home_visit} onChange={(e) => setField('is_home_visit', e.target.checked)} />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">🏠 ¿Es atención a domicilio?</span>
                    <span className="text-[10px] text-vet-rose font-bold uppercase tracking-tight">
                      * Se agregarán cargos de transporte / domicilio a convenir
                    </span>
                  </div>
                </label>
              </div>

              {form.is_home_visit && (
                <Field label="Dirección del domicilio">
                  <input className={inputCls} value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="Dirección completa..." required />
                </Field>
              )}

              {fieldError && <p className="text-xs text-red-600">⚠️ {fieldError}</p>}

              <div className="flex gap-2">
                <BackButton onClick={() => setStep(3)} />
                <button type="submit" disabled={saving}
                        className="flex-1 py-3 bg-vet-rose text-white text-sm font-bold rounded-xl hover:bg-vet-dark disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Confirmar Reserva
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </PortalShell>
  )
}

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-vet-bone">
      <header className="bg-vet-dark py-5 px-4"><div className="max-w-2xl mx-auto flex items-center gap-3 text-white">🏥 VetCare Manager</div></header>
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      <footer className="text-center py-10 text-xs text-gray-400">© 2026 Clínica Veterinaria Dram. Sofía Cáceres</footer>
    </div>
  )
}

function StepIndicator({ current }: { current: number }) {
  const steps = ['Servicio', 'Fecha', 'Horario', 'Tus datos']
  return (
    <div className="flex items-center mb-10">
      {steps.map((label, i) => (
        <div key={label} className="flex-1 text-center">
          <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center text-xs font-bold mb-1
                         ${i+1 < current ? 'bg-vet-rose text-white' : i+1 === current ? 'bg-vet-dark text-white' : 'bg-gray-200'}`}>
            {i+1 < current ? '✓' : i+1}
          </div>
          <p className="text-[10px] text-gray-400">{label}</p>
        </div>
      ))}
    </div>
  )
}

function SectionTitle({ step, title, sub }: any) {
  return (
    <div className="mb-6 text-left">
      <p className="text-[10px] font-bold text-vet-rose uppercase tracking-widest mb-1">Paso {step}</p>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {sub && <p className="text-sm text-gray-500">{sub}</p>}
    </div>
  )
}

function BackButton({ onClick }: any) {
  return <button type="button" onClick={onClick} className="text-xs text-gray-400 hover:text-vet-rose">← Volver</button>
}

function Row({ label, value }: any) {
  return <div className="flex justify-between py-1 border-b border-pink-50"><span className="text-gray-500">{label}</span><span className="font-bold text-gray-900">{value}</span></div>
}

function Field({ label, children }: any) {
  return <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-gray-500 uppercase">{label}</label>{children}</div>
}

const inputCls = "w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-vet-rose/5 focus:border-vet-rose transition-all"
