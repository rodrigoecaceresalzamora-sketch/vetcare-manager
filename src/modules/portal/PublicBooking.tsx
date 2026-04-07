// ============================================================
// VetCare Manager — Módulo 4: PublicBooking
//
// Página pública de agendamiento (sin login).
// Se accede desde: https://tudominio.cl/reserva
// ============================================================

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { generateId, speciesEmoji } from '../../lib/utils'
import type { PublicBookingFormData } from '../../types'

// ── Cargar servicios dinámicos ──────────────────────────────────
async function fetchPublicServices() {
  const { data } = await supabase
    .from('services')
    .select('*')
    .order('name', { ascending: true })
  
  let services = data || []

  // Ensure base Vacunación exists so the conditional flow works
  if (!services.some(s => s.name === 'Vacunación')) {
    services.push({ id: 'vac-base-virtual', name: 'Vacunación', price: 0, duration_minutes: 15, icon: '💉', description: 'Programa tu esquema de vacunación y escoge la vacuna específica' })
  }
  
  return services
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
  const navigate = useNavigate()
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
    is_home_visit:  false,
    address:        '',
    guardian_rut:   '',
    service:        '',
    scheduled_at:   '',
    pet_name:       '',
    pet_species:    'Perro',
    pet_breed:      '',
    pet_sex:        'Macho',
    pet_date_of_birth: '',
    pet_adopted_since: '',
  })
  const [selectedVaccines, setSelectedVaccines] = useState<any[]>([])
  const [saving, setSaving]       = useState(false)
  const [fieldError, setFieldError] = useState('')
  const [, setBookingId]   = useState<string | null>(null)
  
  // ── Cargar mascotas del tutor logueado ───────────────────────
  const [myPets, setMyPets] = useState<any[]>([])

  useEffect(() => {
    if (!user?.email) return
    const fetchMyPets = async () => {
      const { data: g } = await supabase.from('guardians').select('id').eq('email', user.email).maybeSingle()
      if (g) {
        setForm(f => ({ ...f, guardian_id: g.id }))
        const { data: p } = await supabase.from('patients').select('*').eq('guardian_id', g.id).eq('status', 'activo')
        if (p) setMyPets(p)
      }
    }
    fetchMyPets()
  }, [user?.email])

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
    if (!user) {
      setFieldError('Debes iniciar sesión para confirmar tu reserva.')
      return
    }
    setFieldError('')
    if (!form.guardian_name)  return setFieldError('Ingresa tu nombre')
    if (!form.guardian_email) return setFieldError('Ingresa tu correo')
    if (!form.pet_name)       return setFieldError('Ingresa el nombre de tu mascota')
    if (form.is_home_visit && !form.address) return setFieldError('Ingresa tu dirección')

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString()
    const id = generateId()

    const insertPayload: Record<string, any> = {
      id,
      guardian_name:    form.guardian_name,
      guardian_email:   form.guardian_email,
      guardian_phone:   form.guardian_phone || '',
      pet_name:         form.pet_name,
      service:          service.name + (selectedVaccines.length > 0 ? ` (${selectedVaccines.map((v: any) => v.name.replace('Vacunación: ', '')).join(', ')})` : ''),
      scheduled_at:     scheduledAt,
      duration_minutes: service.duration_minutes || 30,
      status:           'pendiente',
      source:           'portal',
      is_home_visit:    form.is_home_visit,
      address:          form.address || '',
    }

    // guardian_rut optional — add only if column exists (silently skip on error)
    if (form.guardian_rut) insertPayload.guardian_rut = form.guardian_rut
    
    // Vincular IDs si existen
    if (form.patient_id)   insertPayload.patient_id   = form.patient_id
    if (form.guardian_id)  insertPayload.guardian_id  = form.guardian_id

    setSaving(true)
    const { error: dbErr } = await supabase.from('appointments').insert(insertPayload)

    if (dbErr) {
      setSaving(false)
      setFieldError('Error: ' + dbErr.message)
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
            onClick={() => navigate('/tutor')}
            className="w-full px-6 py-2.5 bg-vet-rose text-white text-sm font-bold rounded-xl hover:bg-vet-dark transition-colors"
          >
            Volver a mis mascotas
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
          <div className="bg-vet-rose/10 border-l-4 border-vet-rose p-4 rounded-r-xl mb-6">
            <h3 className="font-bold text-vet-rose text-sm mb-1">Pago y Transferencia 💸</h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              Para confirmar tu reserva, se requiere un <strong>abono del 20%</strong> del valor del servicio. Transfiere el abono a la siguiente cuenta:
            </p>
            {dbServices.find(s => s.name === 'DATOS_TRANSFERENCIA') && (
              <div className="text-xs mt-3 bg-white rounded-lg p-3 text-gray-800 whitespace-pre-wrap font-mono shadow-sm border border-pink-100">
                {dbServices.find(s => s.name === 'DATOS_TRANSFERENCIA')?.description}
              </div>
            )}
            <p className="text-[10px] text-gray-500 mt-3 p-2 bg-white rounded-lg border border-pink-100 italic">
              * Los abonos no son reembolsables en caso de inasistencia. No atendemos urgencias graves, en dicho caso acude a un hospital 24 hrs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dbServices.filter(s => !s.name.startsWith('Vacunación:') && s.name !== 'DATOS_TRANSFERENCIA').map((svc) => (
              <button
                key={svc.id}
                onClick={() => { 
                  setService(svc)
                  setSelectedVaccines([])
                  if (svc.name === 'Vacunación') {
                    // Si es vacunación, se mantiene en step 1 para elegir vacunas
                  } else {
                    setStep(2) 
                  }
                }}
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

          {service?.name === 'Vacunación' && (
            <div className="mt-8 animate-fade-in">
              <h3 className="text-sm font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">Selecciona la vacuna</h3>
              <div className="space-y-2">
                {dbServices.filter(s => s.name.startsWith('Vacunación:')).map(vac => {
                  const isSelected = selectedVaccines.some(v => v.id === vac.id)
                  return (
                    <label key={vac.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-vet-rose bg-vet-light/30' : 'border-gray-200 bg-white hover:border-vet-rose/50'}`}>
                      <input 
                        type="radio" 
                        name="vaccine_selection"
                        checked={isSelected}
                        className="mt-1 border-gray-300 text-vet-rose focus:ring-vet-rose"
                        onChange={() => {
                          setSelectedVaccines([vac]) // Sólo permite 1 a la vez
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-900">{vac.name.replace('Vacunación: ', '')}</span>
                          <span className="text-xs font-medium text-vet-rose">${vac.price.toLocaleString('es-CL')}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">{vac.description}</p>
                      </div>
                    </label>
                  )
                })}
                {dbServices.filter(s => s.name.startsWith('Vacunación:')).length === 0 && (
                  <p className="text-sm text-gray-500">No hay vacunas registradas en el sistema en este momento.</p>
                )}
              </div>
              
              {selectedVaccines.length > 0 && (
                <>
                  <div className="mt-4 flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                    <span className="text-xs font-bold text-gray-500">Total Base + Vacuna:</span>
                    <span className="text-lg font-black text-gray-900">
                      ${((service?.price || 0) + (selectedVaccines[0]?.price || 0)).toLocaleString('es-CL')}
                    </span>
                  </div>
                  <p className="text-[10px] text-right text-vet-rose font-bold mb-4 mt-1">
                    Abono 20% requerido: ${(((service?.price || 0) + (selectedVaccines[0]?.price || 0)) * 0.20).toLocaleString('es-CL')}
                  </p>
                </>
              )}
              
              <button
                onClick={() => setStep(2)}
                disabled={selectedVaccines.length === 0}
                className="w-full mt-4 py-3 bg-vet-rose text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-all hover:bg-vet-dark"
              >
                Continuar a Fecha
              </button>
            </div>
          )}
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
          <div className="bg-vet-light/50 border border-pink-200 rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-1 justify-between items-start">
            <div>
              <span className="text-xs text-vet-dark block"><strong>{service?.icon}</strong> {service?.name} {selectedVaccines.length > 0 ? `+ ${selectedVaccines.length} vacuna(s)` : ''}</span>
              <span className="text-xs text-gray-500 block mt-1">{availableDates.find(d => d.value === date)?.label} · {time}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block">A pagar hoy (Abono 20%)</span>
              <span className="text-sm font-black text-vet-rose">${(((service?.price || 0) + selectedVaccines.reduce((sum: number, v: any) => sum + v.price, 0)) * 0.20).toLocaleString('es-CL')}</span>
            </div>
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
              {/* Selector de Mascota Existente */}
              {myPets.length > 0 && (
                <div className="bg-white border-2 border-vet-rose/10 rounded-2xl p-4 mb-4">
                  <label className="text-[10px] font-bold text-vet-rose uppercase tracking-widest block mb-2">
                    ¿Agendar para una mascota guardada?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {myPets.map(pet => (
                      <button
                        key={pet.id}
                        type="button"
                        onClick={() => {
                          setField('pet_name', pet.name)
                          setField('pet_species', pet.species)
                          setField('pet_breed', pet.breed)
                          setField('pet_sex', pet.sex)
                          setField('pet_date_of_birth', pet.date_of_birth)
                          setField('pet_is_reactive', pet.is_reactive)
                          setField('patient_id', pet.id)
                        }}
                        className={`flex flex-col items-center p-3 rounded-xl border transition-all
                                    ${form.pet_name === pet.name ? 'border-vet-rose bg-vet-light' : 'border-gray-100 bg-gray-50 hover:border-pink-200'}`}
                      >
                        <span className="text-xl mb-1">{speciesEmoji(pet.species)}</span>
                        <span className="text-xs font-bold text-gray-900">{pet.name}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setForm(f => ({
                          ...f,
                          pet_name: '',
                          pet_species: 'Perro',
                          pet_breed: '',
                          pet_sex: 'Macho',
                          pet_date_of_birth: '',
                          pet_is_reactive: false,
                          patient_id: undefined
                        }))
                      }}
                      className={`flex flex-col items-center p-3 rounded-xl border transition-all
                                  ${!myPets.some(p => p.name === form.pet_name) && form.pet_name === '' ? 'border-vet-rose bg-vet-light' : 'border-gray-100 bg-gray-50 hover:border-pink-200'}`}
                    >
                      <span className="text-xl mb-1">✨</span>
                      <span className="text-xs font-bold text-gray-900">Otra</span>
                    </button>
                  </div>
                </div>
              )}

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

              <div className="bg-vet-light/30 p-4 rounded-xl space-y-4 border border-vet-rose/10">
                <h4 className="text-xs font-bold text-vet-rose uppercase tracking-widest">Ficha de la Mascota</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <Field label="Especie">
                    <select className={inputCls} value={form.pet_species} onChange={(e) => setField('pet_species', e.target.value as any)}>
                      <option value="Perro">Perro</option>
                      <option value="Gato">Gato</option>
                    </select>
                  </Field>
                  <Field label="Sexo">
                    <select className={inputCls} value={form.pet_sex} onChange={(e) => setField('pet_sex', e.target.value as any)}>
                      <option value="Macho">Macho</option>
                      <option value="Hembra">Hembra</option>
                      <option value="No determinado">No determinado</option>
                    </select>
                  </Field>
                  <Field label="Raza">
                    <input className={inputCls} value={form.pet_breed} onChange={(e) => setField('pet_breed', e.target.value)} placeholder="Ej: Poodle, Mestizo..." />
                  </Field>
                  <Field label="Fecha Nacimiento (Opcional)">
                    <input type="date" className={inputCls} value={form.pet_date_of_birth} onChange={(e) => setField('pet_date_of_birth', e.target.value)} />
                  </Field>
                  <Field label="Adoptado desde (Opcional)">
                    <input type="date" className={inputCls} value={form.pet_adopted_since} onChange={(e) => setField('pet_adopted_since', e.target.value)} />
                  </Field>
                </div>
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
                <div className="animate-fade-in mb-3 text-left">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                    Dirección Completa
                  </label>
                  <input
                    type="text"
                    required
                    className={inputCls}
                    value={form.address || ''}
                    onChange={(e) => setField('address', e.target.value)}
                    placeholder="Ej. Gran Avenida 1234, Depto 402, San Miguel"
                  />
                </div>
              )}

              {dbServices.find(s => s.name === 'DATOS_TRANSFERENCIA') && (
                <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 animate-fade-in text-left">
                  <h4 className="text-xs font-bold text-blue-900 mb-2 uppercase">🏦 Datos de transferencia para el Abono del 20%</h4>
                  <div className="text-sm text-blue-800 font-mono whitespace-pre-wrap">
                    {dbServices.find(s => s.name === 'DATOS_TRANSFERENCIA')?.description}
                  </div>
                </div>
              )}

              {fieldError && (
                <p className="text-xs font-medium text-red-500 bg-red-50 p-2 rounded mb-4 text-left">
                  ⚠️ {fieldError}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-3 bg-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors"
                  disabled={saving}
                >
                  ← Volver
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-vet-rose text-white text-sm font-bold rounded-xl hover:bg-vet-dark transition-colors disabled:opacity-50"
                >
                  {saving ? 'Confirmando...' : 'Confirmar Reserva'}
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
    <div className="min-h-screen bg-vet-bone font-sans">
      <header className="bg-[#a65d80] py-4 px-4 shadow-lg border-b border-pink-200/20">
        <div className="max-w-2xl mx-auto flex items-center gap-3 text-white">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
            <img src="/logo.png" alt="VetCare" className="w-7 h-7 object-contain" />
          </div>
          <span className="font-black text-sm uppercase tracking-[0.2em]">VetCare — Gesti&oacute;n Cl&iacute;nica</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      <footer className="text-center py-10 px-4 text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">
        &copy; 2026 Clínica Veterinaria Dram. Sofía Cáceres &middot; Todos los derechos reservados
      </footer>
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
