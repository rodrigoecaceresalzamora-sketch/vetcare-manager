// ============================================================
// VetCare Manager — Módulo 4: PublicBooking
//
// Página pública de agendamiento (sin login).
// Se accede desde: https://tudominio.cl/reserva
// ============================================================

import React, { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { 
  generateId, 
  speciesEmoji, 
  isValidPhone, 
  isValidRUT, 
  isValidEmail,
  formatRUT 
} from '../../lib/utils'
import type { PublicBookingFormData } from '../../types'
import { BrandedLoginForm } from '../auth/BrandedLoginForm'
import { useClinicConfig } from '../../contexts/ClinicConfigContext'

// ── Cargar servicios dinámicos ──────────────────────────────────
async function fetchPublicServices(clinicId: string) {
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('name', { ascending: true })
  
  return data || []
}

// ── Próximos días permitidos (dinámicos) ──────────────────────
function getAvailableDates(schedule: Record<string, string[]>): { label: string; value: string; dow: number }[] {
  const dates: { label: string; value: string; dow: number }[] = []
  const allowedDows = Object.keys(schedule).map(Number)
  
  if (allowedDows.length === 0) return []

  const d = new Date()
  d.setDate(d.getDate() + 1) // Mañana en adelante

  let attempts = 0
  while (dates.length < 14 && attempts < 60) { 
    attempts++
    const dow = d.getDay()
    if (allowedDows.includes(dow)) {
      // Usar formato local YYYY-MM-DD para evitar desfases de zona horaria
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const localValue = `${year}-${month}-${day}`;

      dates.push({
        label: d.toLocaleDateString('es-CL', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        value: localValue,
        dow
      })
    }
    d.setDate(d.getDate() + 1)
  }
  return dates.slice(0, 8) 
}

// ── Slots de horario dinámicos ─────────────────────────────────
function getTimeSlots(dow: number, schedule: Record<string, string[]>): string[] {
  return schedule[String(dow)] || []
}

type Step = 1 | 2 | 3 | 4 | 'confirmed'

export function PublicBooking() {
  const { clinicId } = useParams()
  const [searchParams] = useSearchParams()
  const prefilledPetId = searchParams.get('petId')
  const { user } = useAuth()
  const { config, setPublicClinicId } = useClinicConfig()
  const [step, setStep]             = useState<Step>(1)

  useEffect(() => {
    if (clinicId) setPublicClinicId(clinicId)
  }, [clinicId, setPublicClinicId])
  const [service, setService]       = useState<any | null>(null)
  const [dbServices, setDbServices] = useState<any[]>([])
  const [date, setDate]             = useState<string | null>(null)
  const [time, setTime]             = useState<string | null>(null)
  const [takenSlots, setTakenSlots] = useState<string[]>([])
  const [consultationReason, setConsultationReason] = useState('')
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
  const [saving, setSaving]       = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [fieldError, setFieldError] = useState('')
  const [, setBookingId]   = useState<string | null>(null)
  
  // ── Cargar mascotas del tutor logueado ───────────────────────
  const [myPets, setMyPets] = useState<any[]>([])

  const fetchMyPets = useCallback(async () => {
    if (!user?.email || !config?.clinic_id) return
    const realClinicId = config.clinic_id
    const { data: g } = await supabase
      .from('guardians')
      .select('id')
      .eq('email', user.email)
      .eq('clinic_id', realClinicId)
      .maybeSingle()
    
    if (g) {
      setForm(f => ({ ...f, guardian_id: g.id }))
      const { data: p } = await supabase
        .from('patients')
        .select('*')
        .eq('guardian_id', g.id)
        .eq('clinic_id', realClinicId)
        .eq('status', 'activo')
      if (p) setMyPets(p)
    }
  }, [user?.email, config?.clinic_id])

  useEffect(() => {
    fetchMyPets()
  }, [fetchMyPets])

  // Prefill exact pet if provided via URL
  useEffect(() => {
    if (prefilledPetId && myPets.length > 0) {
      const target = myPets.find(p => p.id === prefilledPetId)
      if (target) {
        setForm(f => ({
          ...f,
          patient_id: target.id,
          pet_name: target.name,
          pet_species: target.species,
          pet_breed: target.breed,
          pet_sex: target.sex,
          pet_date_of_birth: target.date_of_birth,
          pet_adopted_since: target.adopted_since,
          pet_is_reactive: target.is_reactive
        }))
        // Saltar directo al paso 2 si ya tenemos mascota
        setStep(2)
      }
    }
  }, [prefilledPetId, myPets])

  const availableDates = getAvailableDates(config?.schedule || {})

  useEffect(() => {
    if (config?.clinic_id) fetchPublicServices(config.clinic_id).then(setDbServices)
  }, [config?.clinic_id])

  useEffect(() => {
    if (!date || !config?.clinic_id) return
    const realClinicId = config.clinic_id
    const start = new Date(date + 'T00:00:00').toISOString()
    const end   = new Date(date + 'T23:59:59').toISOString()

    supabase
      .from('appointments')
      .select('scheduled_at')
      .eq('clinic_id', realClinicId)
      .gte('scheduled_at', start)
      .lt('scheduled_at',  end)
      .neq('status', 'cancelada')
      .then(({ data }) => {
        const taken = (data ?? []).map((a) =>
          new Date(a.scheduled_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })
        )
        setTakenSlots(taken)
      })
  }, [date, config?.clinic_id])

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
    if (!config?.clinic_id) {
      setFieldError('Error: No se pudo verificar la clínica. Por favor, recarga la página.')
      return
    }
    const realClinicId = config.clinic_id

    setFieldError('')
    if (!form.guardian_name)  return setFieldError('Ingresa tu nombre')
    if (!form.guardian_email) return setFieldError('Ingresa tu correo')
    if (!isValidEmail(form.guardian_email)) return setFieldError('El correo electrónico no es válido')
    if (!form.guardian_rut)   return setFieldError('Ingresa tu RUT')
    if (!isValidRUT(form.guardian_rut)) return setFieldError('El RUT ingresado no es válido')
    if (!form.guardian_phone) return setFieldError('Ingresa tu teléfono')
    if (!isValidPhone(form.guardian_phone)) return setFieldError('El teléfono debe tener al menos 9 dígitos')
    
    if (!form.pet_name)       return setFieldError('Ingresa el nombre de tu mascota')
    if (form.is_home_visit && !form.address) return setFieldError('Ingresa tu dirección')

    setSaving(true)

    try {
      // 1. AUTO-PROVISIÓN: Asegurar que el GUARDIAN existe en esta clínica
      let finalGuardianId = form.guardian_id
      if (!finalGuardianId) {
        // Buscar por EMAIL o por RUT dentro de ESTA clínica
        const { data: existingG } = await supabase
          .from('guardians')
          .select('id')
          .or(`email.eq.${form.guardian_email.toLowerCase()},rut.eq.${form.guardian_rut}`)
          .eq('clinic_id', realClinicId)
          .maybeSingle()
        
        if (existingG) {
          finalGuardianId = existingG.id
          // OPCIONAL: Actualizar datos si han cambiado parcialmente
          await supabase.from('guardians').update({
            name: form.guardian_name,
            phone: form.guardian_phone
          }).eq('id', finalGuardianId)
        } else {
          const { data: newG, error: gErr } = await supabase
            .from('guardians')
            .insert({
              name: form.guardian_name,
              email: form.guardian_email.toLowerCase(),
              phone: form.guardian_phone,
              rut: form.guardian_rut,
              clinic_id: realClinicId
            })
            .select()
            .single()
          
          if (gErr) throw gErr
          finalGuardianId = newG.id
        }
      }

      // 2. AUTO-PROVISIÓN: Asegurar que el PACIENTE existe en esta clínica
      let finalPatientId = form.patient_id
      if (!finalPatientId) {
        const { data: existingP } = await supabase
          .from('patients')
          .select('id')
          .eq('guardian_id', finalGuardianId)
          .eq('name', form.pet_name)
          .eq('clinic_id', realClinicId)
          .maybeSingle()
        
        if (existingP) {
          finalPatientId = existingP.id
        } else {
          const { data: newP, error: pErr } = await supabase
            .from('patients')
            .insert({
              name: form.pet_name,
              species: form.pet_species,
              breed: form.pet_breed,
              sex: form.pet_sex,
              date_of_birth: form.pet_date_of_birth || new Date().toISOString().split('T')[0],
              guardian_id: finalGuardianId,
              clinic_id: realClinicId,
              status: 'activo'
            })
            .select()
            .single()
          
          if (pErr) throw pErr
          finalPatientId = newP.id
        }
      }

      // 3. AGENDAR CITA
      const scheduledAt = (() => {
        if (!date || !time) return '';
        const [year, month, day] = date.split('-').map(Number);
        const [hour, minute] = time.split(':').map(Number);
        const d = new Date(year, month - 1, day, hour, minute);
        return d.toISOString();
      })();
      const appointmentId = generateId()

      const { error: dbErr } = await supabase.from('appointments').insert({
        id: appointmentId,
        clinic_id:        realClinicId,
        guardian_id:      finalGuardianId,
        patient_id:       finalPatientId,
        guardian_name:    form.guardian_name,
        guardian_email:   form.guardian_email.toLowerCase(),
        guardian_phone:   form.guardian_phone,
        guardian_rut:     form.guardian_rut,
        pet_name:         form.pet_name,
        pet_species:      form.pet_species,
        pet_breed:        form.pet_breed,
        pet_sex:          form.pet_sex,
        service:          service.name,
        scheduled_at:     scheduledAt,
        duration_minutes: service.duration_minutes || 30,
        notes:            consultationReason || '',
        status:           'pendiente',
        source:           'portal'
      })

      if (dbErr) throw dbErr

      // 4. NOTIFICACIÓN (Opcional)
      try {
        let emailSubject = config?.email_subject_booking || 'Confirmación de Cita'
        let emailBody = config?.email_body_booking || 'Hola {tutor}, tu cita para {mascota} ha sido recibida.'
        const formattedDateForEmail = (availableDates.find(d => d.value === date)?.label || date) || ''
        const replaceAll = (str: string) => str
          .replace(/{tutor}/g, form.guardian_name)
          .replace(/{mascota}/g, form.pet_name)
          .replace(/{fecha}/g, formattedDateForEmail)
          .replace(/{hora}/g, time || '')

        await supabase.functions.invoke('confirm-booking', {
          body: { 
            appointment_id: appointmentId,
            custom_subject: replaceAll(emailSubject),
            custom_body: replaceAll(emailBody),
            wa_message: replaceAll(config?.wa_template_confirmation || '')
          },
        })
      } catch (e) {
        console.warn('Email notification failed', e)
      }

      setBookingId(appointmentId)
      setStep('confirmed')
    } catch (err: any) {
      console.error('Error in handleConfirm:', err)
      setFieldError('Error al procesar la reserva: ' + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  if (step === 'confirmed') {
    return (
      <PortalShell>
        <div className="max-w-md mx-auto py-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3 uppercase tracking-tight">¡RESERVA SOLICITADA! ✨</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            Tu hora para <strong className="text-gray-800">{form.pet_name}</strong> ha sido enviada correctamente.
            Quedará registrada como <strong className="text-amber-600">pendiente</strong> hasta ser
            confirmada por la veterinaria.
          </p>
          <div className="bg-white border border-vet-rose/10 rounded-3xl p-6 text-left space-y-3 mb-8 shadow-sm">
            <p className="text-[10px] font-black text-vet-rose uppercase tracking-[0.2em] mb-3">Resumen de tu solicitud</p>
            <Row label="Servicio"  value={service?.name || ''} />
            <Row label="Fecha"     value={availableDates.find(d => d.value === date)?.label ?? date ?? ''} />
            <Row label="Hora"      value={time ?? ''} />
            {consultationReason && <Row label="Motivo" value={consultationReason} />}
          </div>
          
          <Link
            to={`/c/${config?.slug || config?.clinic_id}`}
            className="inline-block w-full px-6 py-4 bg-vet-rose text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-vet-dark transition-all transform active:scale-95 shadow-xl shadow-vet-rose/10"
          >
            Volver a mi Panel de Mascotas
          </Link>
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell>
      <StepIndicator current={step as number} />
      {step === 1 && (
        <section>
           <div className="bg-vet-rose/10 border-l-4 border-vet-rose p-4 rounded-r-xl mb-6">
            <h3 className="font-black text-vet-dark text-sm mb-2 flex items-center gap-2">
              📍 Atención en Tienda: {config?.clinic_name || 'VetCare'}
            </h3>
            <p className="text-xs text-gray-700 leading-relaxed mb-3">
              <strong>Dirección:</strong> {config?.address}<br/>
              <em>* Atención presencial solo en horarios establecidos.</em>
            </p>
            
            {/* Mapa Interactivo */}
            <div className="w-full h-40 rounded-xl overflow-hidden mb-4 border border-vet-rose/10 shadow-sm bg-gray-50">
              <iframe 
                src={config?.google_maps_embed_url} 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <h3 className="font-bold text-vet-rose text-xs mb-1">🏠 Consultas a Domicilio</h3>
            <p className="text-[10px] text-gray-600 mb-4 px-2 py-1 bg-white/50 rounded-lg">
              Para atención a domicilio, por favor contactar directamente por WhatsApp al <strong className="text-green-600">{config?.contact_phone}</strong>. No agendar por este medio.
            </p>

            {config?.advance_payment_percentage && config?.advance_payment_percentage > 0 && (
              <>
                <h3 className="font-bold text-vet-rose text-sm mb-1">Pago y Transferencia 💸</h3>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Para confirmar tu reserva, se requiere un <strong>abono del {config?.advance_payment_percentage}%</strong> del valor del servicio. Transfiere el abono a la siguiente cuenta:
                </p>
                <div className="text-xs mt-3 bg-white rounded-lg p-3 text-gray-800 whitespace-pre-wrap font-mono shadow-sm border border-vet-rose/10">
                  {config?.transfer_details}
                </div>
              </>
            )}
            <p className="text-[10px] text-gray-500 mt-3 p-2 bg-white rounded-lg border border-vet-rose/10 italic">
              * Los abonos no son reembolsables en caso de inasistencia. No atendemos urgencias graves, en dicho caso acude a un hospital 24 hrs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dbServices.filter(s => s.name !== 'DATOS_TRANSFERENCIA').map((svc) => (
              <button
                key={svc.id}
                onClick={() => { 
                  setService(svc)
                  setStep(2) 
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
        </section>
      )}

      {step === 2 && (
        <section>
          <SectionTitle step={2} title="Elige la fecha" />
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
            {getAvailableDates(config?.schedule || {}).map((d) => (
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
          <SectionTitle step={3} title="Horario disponible" sub={getAvailableDates(config?.schedule || {}).find(d => d.value === date)?.label} />
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
            {getTimeSlots(getAvailableDates(config?.schedule || {}).find(d => d.value === date)?.dow ?? 0, config?.schedule || {}).map((slot) => {
              const taken = takenSlots.includes(slot)
              return (
                <button
                  key={slot}
                  disabled={taken}
                  onClick={() => { setTime(slot) }}
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

          {/* Continuar button for step 3 */}
          {time && (
            <div className="mt-4 animate-fade-in">
              <button
                onClick={() => setStep(4)}
                className="w-full py-3 bg-vet-rose text-white text-sm font-bold rounded-xl hover:bg-vet-dark transition-all"
              >
                Continuar
              </button>
            </div>
          )}

          <div className="mt-4">
            <BackButton onClick={() => setStep(2)} />
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4">
          <SectionTitle step={4} title="Tus datos" />
          <div className="bg-vet-light/50 border border-vet-rose/20 rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-1 justify-between items-start">
            <div>
              <span className="text-xs text-vet-dark block"><strong>{service?.icon}</strong> {service?.name}</span>
              <span className="text-xs text-gray-500 block mt-1">{availableDates.find(d => d.value === date)?.label} · {time}</span>
              {consultationReason && <span className="text-xs text-gray-400 block mt-0.5 italic">{consultationReason}</span>}
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block">A pagar hoy (Abono {config?.advance_payment_percentage}%)</span>
              <span className="text-sm font-black text-vet-rose">${((service?.price || 0) * (config?.advance_payment_percentage || 0) / 100).toLocaleString('es-CL')}</span>
            </div>
          </div>

          {/* Aviso abono obligatorio */}
          {(config?.advance_payment_percentage || 0) > 0 && (
            <div className="bg-gray-900 text-white rounded-xl px-5 py-4 text-center">
              <p className="text-base font-black uppercase tracking-wide leading-snug">
                Sin abono del {config?.advance_payment_percentage}% no se aceptará la consulta
              </p>
              <p className="text-xs text-gray-300 mt-1 font-medium">
                Realiza la transferencia antes de confirmar tu reserva
              </p>
            </div>
          )}

          {!user ? (
            <div className="bg-white border-2 border-dashed border-vet-rose/30 rounded-2xl p-6 text-center">
              {showLogin ? (
                <BrandedLoginForm 
                  clinicName={config?.clinic_name || 'Veterinaria'}
                  logoUrl={config?.clinic_logo_url || null}
                  primaryColor={config?.primary_color || '#a65d80'}
                  onSuccess={() => {
                    setShowLogin(false)
                    fetchMyPets()
                  }}
                />
              ) : (
                <>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Identifícate para agendar</h3>
                  <p className="text-[10px] text-gray-500 mb-6">Para continuar con la reserva, necesitamos saber quién eres.</p>
                  <button 
                    onClick={() => setShowLogin(true)}
                    className="inline-block px-8 py-3 bg-vet-rose text-white text-xs font-bold rounded-xl hover:bg-vet-dark transition-all shadow-lg shadow-vet-rose/20"
                  >
                    Entrar o Crear Cuenta ✨
                  </button>
                </>
              )}
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
                                    ${form.pet_name === pet.name ? 'border-vet-rose bg-vet-light' : 'border-gray-100 bg-gray-50 hover:border-vet-rose/20'}`}
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
                                  ${!myPets.some(p => p.name === form.pet_name) && form.pet_name === '' ? 'border-vet-rose bg-vet-light' : 'border-gray-100 bg-gray-50 hover:border-vet-rose/20'}`}
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
                  <input 
                    className={`${inputCls} ${!isValidPhone(form.guardian_phone) && form.guardian_phone ? 'border-red-500 bg-red-50' : ''}`} 
                    value={form.guardian_phone} 
                    onChange={(e) => setField('guardian_phone', e.target.value)} 
                    placeholder="+56 9..." 
                    required 
                  />
                </Field>
                <div className="sm:col-span-2 space-y-2 mb-4">
                   <label className="text-[10px] font-bold text-vet-dark uppercase tracking-widest block">RUT (Busca tus datos 🔍)</label>
                   <div className="flex gap-2">
                    <input 
                      className={`${inputCls} flex-1 ${!isValidRUT(form.guardian_rut || '') && form.guardian_rut ? 'border-red-500 bg-red-50' : ''}`} 
                      value={form.guardian_rut || ''} 
                      onChange={(e) => setField('guardian_rut', formatRUT(e.target.value))} 
                      placeholder="12.345.678-9" 
                      required 
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!form.guardian_rut || !isValidRUT(form.guardian_rut)) return
                        setSaving(true)
                        try {
                          const { data } = await supabase
                            .from('guardians')
                            .select('*')
                            .eq('rut', form.guardian_rut)
                            .eq('clinic_id', config?.clinic_id)
                            .maybeSingle()
                          if (data) {
                            setForm(f => ({
                              ...f,
                              guardian_name: data.name,
                              guardian_email: data.email,
                              guardian_phone: data.phone,
                              guardian_id: data.id
                            }))
                            setFieldError('✅ Datos recuperados con éxito')
                            setTimeout(() => setFieldError(''), 3000)
                          } else {
                            setFieldError('ℹ️ No hay registros con este RUT.')
                            setTimeout(() => setFieldError(''), 3000)
                          }
                        } catch (e) {
                          console.error(e)
                        } finally {
                          setSaving(false)
                        }
                      }}
                      className="px-4 py-2 bg-vet-rose text-white rounded-xl text-xs font-bold hover:bg-vet-dark transition-all disabled:opacity-50"
                    >
                      {saving ? '...' : 'Cargar'}
                    </button>
                   </div>
                </div>
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

              {/* Motivo de Consulta Obligatorio */}
              <div className="bg-white border-2 border-vet-rose/10 rounded-2xl p-4 my-4">
                <label className="text-[10px] font-bold text-vet-dark uppercase tracking-widest block mb-2">
                  Motivo de consulta (Requerido)
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-vet-rose/5 focus:border-vet-rose transition-all resize-none mb-3"
                  rows={3}
                  required
                  placeholder="Describe el motivo de la consulta..."
                  value={consultationReason}
                  onChange={(e) => setConsultationReason(e.target.value)}
                />
              </div>


              {(config?.advance_payment_percentage || 0) > 0 && (
                <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-4 animate-fade-in text-left">
                  <h4 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                    <span>🏦</span> Datos de transferencia — Abono {config?.advance_payment_percentage}%
                  </h4>
                  <div className="text-sm text-gray-800 font-mono whitespace-pre-wrap bg-white rounded-lg p-3 border border-gray-100 mb-3">
                    {config?.transfer_details}
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                    <p className="text-xs font-black text-amber-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                      ⚠️ Importante — Mensaje de la Transferencia
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed mb-3">
                      Al hacer la transferencia en tu banco, asegúrate de escribir el nombre de tu mascota en el campo <strong>Asunto</strong> o <strong>Comentario/Glosa</strong>. A continuación, un ejemplo de cómo debería verse:
                    </p>
                    <div className="bg-white border text-[11px] border-amber-200 rounded p-3 text-amber-900 font-mono space-y-1.5 shadow-sm">
                      <p className="font-bold underline mb-2">EJEMPLO DE TRANSFERENCIA</p>
                      <p><strong>NOMBRE:</strong> {config?.clinic_name}</p>
                      <p><strong>PROPIETARIO:</strong> {config?.clinic_name}</p>
                      <p><strong>BANCO:</strong> SELECCIONADO</p>
                      <p><strong>CORREO:</strong> {config?.contact_email}</p>
                      <p className="bg-amber-100/50 p-1 rounded inline-block font-black mt-1"><strong>ASUNTO:</strong> {form.pet_name ? form.pet_name.toUpperCase() : 'NOMBRE DE LA MASCOTA'}</p>
                    </div>
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
  const { config } = useClinicConfig()
  return (
    <div className="min-h-screen bg-vet-bone font-sans">
      <header className="bg-vet-pink py-4 px-4 shadow-lg border-b border-white/10">
        <div className="max-w-2xl mx-auto flex items-center gap-3 text-white">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
            <img src={config?.clinic_logo_url || "/logo.png"} alt="VetCare" className="w-7 h-7 object-contain rounded-lg" />
          </div>
          <span className="font-black text-sm uppercase tracking-[0.2em]">{config?.clinic_name || 'VetCare'} — Gestión Clínica</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      <footer className="text-center py-10 px-4 text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">
        &copy; {new Date().getFullYear()} {config?.clinic_name || 'VetCare'} &middot; Todos los derechos reservados
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
