// ============================================================
// VetCare Manager — ConsultationForm.tsx
// Ficha Clínica: Guarda Examen Físico, Anamnesis y Dx
// ============================================================

import { useState, useEffect } from 'react'
import type { Consultation, Service } from '../../types'
import { supabase } from '../../lib/supabase'

interface Props {
  patientId: string
  initialData?: Consultation
  onClose: () => void
  onSave: (data: any, vaccineData?: any, existingId?: string, selectedService?: Service) => Promise<{ error: string | null }>
  readOnly?: boolean
}

export function ConsultationForm({ patientId, initialData, onClose, onSave, readOnly = false }: Props) {
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState(initialData?.service_id || '')

  useEffect(() => {
    supabase.from('services').select('*').order('name').then(({ data }) => {
      if (data) setServices(data as Service[])
    })
  }, [])

  // Campos libres base
  const [reason, setReason] = useState(initialData?.reason_for_consultation || '')
  const [currentAna, setCurrentAna] = useState(initialData?.current_anamnesis || '')
  const [remoteAna, setRemoteAna] = useState(initialData?.remote_anamnesis || '')
  const [weight, setWeight] = useState(initialData?.weight_kg ? String(initialData.weight_kg) : '')
  
  // Examen Físico
  const [hr, setHr] = useState(initialData?.heart_rate || '')
  const [rr, setRr] = useState(initialData?.respiratory_rate || '')
  const [temp, setTemp] = useState(initialData?.temperature || '')
  const [capRefill, setCapRefill] = useState(initialData?.capillary_refill || '')
  const [skinFold, setSkinFold] = useState(initialData?.skin_fold || '')
  const [hydration, setHydration] = useState(initialData?.hydration || '')
  const [lymphNodes, setLymphNodes] = useState(initialData?.lymph_nodes || '')
  const [bodyCond, setBodyCond] = useState(initialData?.body_condition || '')
  const [pulse, setPulse] = useState(initialData?.pulse || '')

  // Conclusiones
  const [observations, setObservations] = useState(initialData?.observations || '')
  const [diagnosis, setDiagnosis] = useState(initialData?.diagnosis || '')
  const [treatment, setTreatment] = useState(initialData?.treatment || '')
  const [complementary, setComplementary] = useState(initialData?.complementary_exams || '')
  const [referral, setReferral] = useState(initialData?.referral || '')

  // AUTO-SAVE LOGIC (Silent)
  useEffect(() => {
    if (readOnly || initialData) return // No auto-save on edit or read-only

    const draftKey = `consultation_draft_${patientId}`
    const savedDraft = localStorage.getItem(draftKey)
    if (savedDraft) {
      try {
        const d = JSON.parse(savedDraft)
        setReason(d.reason || '')
        setCurrentAna(d.currentAna || '')
        setRemoteAna(d.remoteAna || '')
        setWeight(d.weight || '')
        setHr(d.hr || '')
        setRr(d.rr || '')
        setTemp(d.temp || '')
        setCapRefill(d.capRefill || '')
        setSkinFold(d.skinFold || '')
        setHydration(d.hydration || '')
        setLymphNodes(d.lymphNodes || '')
        setBodyCond(d.bodyCond || '')
        setPulse(d.pulse || '')
        setObservations(d.observations || '')
        setDiagnosis(d.diagnosis || '')
        setTreatment(d.treatment || '')
        setComplementary(d.complementary || '')
        setReferral(d.referral || '')
      } catch (e) {
        console.error("Error loading draft", e)
      }
    }
  }, [patientId, initialData, readOnly])

  useEffect(() => {
    if (readOnly || initialData) return

    const timer = setTimeout(() => {
      const draftKey = `consultation_draft_${patientId}`
      const draftData = {
        reason, currentAna, remoteAna, weight, hr, rr, temp, 
        capRefill, skinFold, hydration, lymphNodes, bodyCond, pulse,
        observations, diagnosis, treatment, complementary, referral
      }
      localStorage.setItem(draftKey, JSON.stringify(draftData))
    }, 1000)

    return () => clearTimeout(timer)
  }, [
    patientId, initialData, readOnly, reason, currentAna, remoteAna, weight, hr, rr, temp, 
    capRefill, skinFold, hydration, lymphNodes, bodyCond, pulse,
    observations, diagnosis, treatment, complementary, referral
  ])

  // Clear draft on successful save
  const clearDraft = () => {
    localStorage.removeItem(`consultation_draft_${patientId}`)
  }

  // Vacunas (Múltiples)
  const [vaccineEntries, setVaccineEntries] = useState<any[]>(() => {
    if (initialData?.applied_vaccine_name) {
      return [{
        name: initialData.applied_vaccine_name,
        date: initialData.applied_vaccine_date || new Date().toISOString().split('T')[0],
        lot: initialData.applied_vaccine_lot || '',
        lot2: (initialData as any).applied_vaccine_lot_2 || '',
        boost: '1y'
      }]
    }
    return []
  })
  
  const addVaccineEntry = (name = '') => {
    setVaccineEntries([...vaccineEntries, {
      name,
      date: new Date().toISOString().split('T')[0],
      lot: '',
      lot2: '',
      boost: '1y'
    }])
  }

  const removeVaccineEntry = (index: number) => {
    setVaccineEntries(vaccineEntries.filter((_, i) => i !== index))
  }

  const updateVaccineEntry = (index: number, fields: any) => {
    const newEntries = [...vaccineEntries]
    newEntries[index] = { ...newEntries[index], ...fields }
    setVaccineEntries(newEntries)
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    
    // Para compatibilidad con la tabla consultations (que solo tiene 1 slot principal)
    // Usamos el primero de la lista si existe
    const firstVac = vaccineEntries[0]

    const consultationPayload = {
      service_id: selectedServiceId || null,
      reason_for_consultation: reason,
      current_anamnesis: currentAna,
      remote_anamnesis: remoteAna,
      weight_kg: weight ? parseFloat(weight) : null,
      heart_rate: hr,
      respiratory_rate: rr,
      temperature: temp,
      capillary_refill: capRefill,
      skin_fold: skinFold,
      hydration: hydration,
      lymph_nodes: lymphNodes,
      body_condition: bodyCond,
      pulse: pulse,
      observations: observations,
      diagnosis: diagnosis,
      treatment: treatment,
      complementary_exams: complementary,
      referral: referral,
      applied_vaccine_name: firstVac?.name || null,
      applied_vaccine_date: firstVac?.date || null,
      applied_vaccine_lot: firstVac?.lot || null,
      applied_vaccine_lot_2: firstVac?.lot2 || null,
    }

    const vacData = vaccineEntries.map(v => ({
      vaccine_name: v.name,
      applied_date: v.date,
      lot_number: v.lot,
      lot_number_2: v.lot2,
      boost_interval: v.boost
    })).filter(v => !!v.vaccine_name)

    // Pass service selected so patientDetail can deduct stock
    const selectedService = services.find(s => s.id === selectedServiceId)
    
    // We send selectedService to onSave
    const res = await onSave(consultationPayload, vacData.length > 0 ? vacData : undefined, initialData?.id, selectedService)

    setSaving(false)
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      clearDraft()
      onClose()
    }
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-vet-rose/20 focus:border-vet-rose"
  const areaCls = inputCls + " min-h-[60px] resize-y"

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-y-auto max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-pink-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">
            {readOnly ? 'Ver Consulta Médica' : (initialData ? 'Editar Consulta Médica' : 'Registrar Nueva Consulta Médica')}
          </h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-pink-50 p-4 border border-pink-100 rounded-xl">
            <h3 className="text-sm font-bold text-vet-dark mb-3">Servicio o Vacuna Asociada</h3>
            <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">
              Seleccionar servicio registrado (Opcional - Descuenta stock según configuración)
              <select
                className={inputCls}
                disabled={readOnly}
                value={selectedServiceId}
                onChange={e => {
                  const sid = e.target.value
                  setSelectedServiceId(sid)
                  const s = services.find(x => x.id === sid)
                  if (s?.name.startsWith('Vacunación:')) {
                    const vName = s.name.replace('Vacunación: ', '')
                    if (!vaccineEntries.some(v => v.name === vName)) {
                      addVaccineEntry(vName)
                    }
                  } else if (s && !reason) {
                    setReason(s.name)
                  }
                }}
              >
                <option value="">-- Sin servicio asociado --</option>
                {services.filter(s => s.name !== 'DATOS_TRANSFERENCIA').map(s => (
                  <option key={s.id} value={s.id}>{s.name} {(s.stock_usage && s.stock_usage.length > 0) ? '(Descuenta stock)' : ''}</option>
                ))}
              </select>
            </label>
          </div>

          {/* FASE 1: Motivo y Anamnesis */}
          <div>
            <h3 className="text-sm font-bold text-vet-dark mb-3">1. Motivo y Anamnesis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium md:col-span-2">Motivo de Consulta
                <input disabled={readOnly} className={inputCls} placeholder="Ej: Vómitos recurrentes y decaimiento" value={reason} onChange={e => setReason(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Anamnesis Remota (Antecedentes previos)
                <textarea disabled={readOnly} className={areaCls} placeholder="Historial relevant previo a la dolencia actual..." value={remoteAna} onChange={e => setRemoteAna(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Anamnesis Actual (Problema presente)
                <textarea disabled={readOnly} className={areaCls} placeholder="Signos actuales explicados por el tutor..." value={currentAna} onChange={e => setCurrentAna(e.target.value)} />
              </label>
            </div>
          </div>

          <hr className="border-pink-50" />

          {/* FASE 2: Examen Físico */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-vet-dark">2. Examen Físico</h3>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                Peso (Kg) <input disabled={readOnly} type="number" step="0.01" className="w-20 px-2 py-1 text-sm border border-gray-200 rounded" value={weight} onChange={e => setWeight(e.target.value)} />
              </label>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-vet-light/30 p-4 rounded-xl border border-pink-100">
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Frec. Cardíaca (lpm)
                <input disabled={readOnly} className={inputCls} placeholder="Ej: 120" value={hr} onChange={e => setHr(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Frec. Respiratoria (rpm)
                <input disabled={readOnly} className={inputCls} placeholder="Ej: 30" value={rr} onChange={e => setRr(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Temperatura (°C)
                <input disabled={readOnly} className={inputCls} placeholder="Ej: 38.5" value={temp} onChange={e => setTemp(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">T. Llene Capilar (seg)
                <input disabled={readOnly} className={inputCls} placeholder="Ej: 2" value={capRefill} onChange={e => setCapRefill(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Pliegue Cutáneo
                <input disabled={readOnly} className={inputCls} placeholder="Ej: Normal" value={skinFold} onChange={e => setSkinFold(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Estado Hidratación
                <input disabled={readOnly} className={inputCls} placeholder="Ej: 5% DHT" value={hydration} onChange={e => setHydration(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Linfonodos
                <input disabled={readOnly} className={inputCls} placeholder="Ej: Normales" value={lymphNodes} onChange={e => setLymphNodes(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Condición Corporal
                <input disabled={readOnly} className={inputCls} placeholder="Ej: 3/5 Ideal" value={bodyCond} onChange={e => setBodyCond(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Pulso
                <input disabled={readOnly} className={inputCls} placeholder="Ej: Fuerte y rítmico" value={pulse} onChange={e => setPulse(e.target.value)} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium mt-3">Observaciones Adicionales / Hallazgos
              <textarea disabled={readOnly} className={areaCls} placeholder="Alteraciones de piel, mucosas anormales..." value={observations} onChange={e => setObservations(e.target.value)} />
            </label>
          </div>

          <hr className="border-pink-50" />

          {/* FASE 3: Diagnóstico y Acciones */}
          <div>
            <h3 className="text-sm font-bold text-vet-dark mb-3">3. Resolución Clínica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium md:col-span-2">Diagnóstico Resultante (o Presuntivo)
                <textarea disabled={readOnly} className={areaCls} placeholder="Diagnóstico definitivo o diferencial..." value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium md:col-span-2">Tratamiento e Indicaciones
                <textarea disabled={readOnly} className={areaCls + " min-h-[80px]"} placeholder="Terapias inyectadas y receta a casa..." value={treatment} onChange={e => setTreatment(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Exámenes Complementarios (Texto libre)
                <textarea disabled={readOnly} className={areaCls} placeholder="Radiografía de tórax solicitada, Hemograma..." value={complementary} onChange={e => setComplementary(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Derivación Especialista (Texto libre)
                <textarea disabled={readOnly} className={areaCls} placeholder="Derivado a cardiología..." value={referral} onChange={e => setReferral(e.target.value)} />
              </label>
            </div>
          </div>

          <hr className="border-pink-50" />

          {/* FASE 4: Vacunación (Múltiple) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-vet-dark">4. Inmunización (Vacunas Aplicadas)</h3>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => addVaccineEntry()}
                  className="bg-vet-rose text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-vet-dark transition shadow-sm"
                >
                  + Agregar Vacuna
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {vaccineEntries.length === 0 && (
                <p className="text-[10px] text-gray-400 italic">No se han registrado vacunas en esta consulta.</p>
              )}
              {vaccineEntries.map((v, idx) => (
                <div key={idx} className="bg-vet-bone/40 p-4 rounded-xl border border-pink-100 relative pt-8 md:pt-4">
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeVaccineEntry(idx)}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded-full text-xs hover:bg-red-200 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium md:col-span-2">Nombre de Vacuna
                      <input 
                        disabled={readOnly} 
                        required 
                        className={inputCls} 
                        placeholder="Ej: Séxtuple, Antirrábica..." 
                        value={v.name} 
                        onChange={e => updateVaccineEntry(idx, { name: e.target.value })} 
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Fecha de Aplicación
                      <input 
                        disabled={readOnly} 
                        required 
                        type="date" 
                        className={inputCls} 
                        value={v.date} 
                        onChange={e => updateVaccineEntry(idx, { date: e.target.value })} 
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Próximo Refuerzo
                      <select 
                        disabled={readOnly} 
                        className={inputCls} 
                        value={v.boost} 
                        onChange={e => updateVaccineEntry(idx, { boost: e.target.value })}
                      >
                        <option value="3w">21 días</option>
                        <option value="4w">4 semanas</option>
                        <option value="6m">6 meses</option>
                        <option value="1y">1 año</option>
                        <option value="3y">3 años</option>
                        <option value="1yo">Al año de vida</option>
                      </select>
                    </label>
                    
                    <div className="md:col-span-4 grid grid-cols-2 gap-4 mt-1 border-t border-pink-50 pt-3">
                      <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Nº Lote Principal
                        <input 
                          disabled={readOnly} 
                          className={inputCls} 
                          placeholder="Lote A" 
                          value={v.lot} 
                          onChange={e => updateVaccineEntry(idx, { lot: e.target.value })} 
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Nº Lote 2 (Opcional - Ej: Diluyente)
                        <input 
                          disabled={readOnly} 
                          className={inputCls} 
                          placeholder="Lote B" 
                          value={v.lot2} 
                          onChange={e => updateVaccineEntry(idx, { lot2: e.target.value })} 
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {errorMsg && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{errorMsg}</div>}

          <div className="flex justify-end gap-3 pt-3 border-t border-pink-100 sticky bottom-0 bg-white pb-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">{readOnly ? 'Cerrar' : 'Cancelar'}</button>
            {!readOnly && (
              <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-medium bg-vet-dark text-white rounded-lg hover:bg-black disabled:opacity-50 transition-colors flex gap-2 items-center">
                {saving ? 'Guardando Registro Clínico...' : (initialData ? '✔ Guardar Cambios' : '✔ Crear Consulta Oficial')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
