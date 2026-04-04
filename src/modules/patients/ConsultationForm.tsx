// ============================================================
// VetCare Manager — ConsultationForm.tsx
// Ficha Clínica: Guarda Examen Físico, Anamnesis y Dx
// ============================================================

import { useState } from 'react'
import type { BoostInterval, Consultation } from '../../types'

interface Props {
  initialData?: Consultation
  onClose: () => void
  onSave: (data: any, vaccineData?: any, existingId?: string) => Promise<{ error: string | null }>
}

export function ConsultationForm({ initialData, onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

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

  // Vacunas
  const [didVaccinate, setDidVaccinate] = useState(!!initialData?.applied_vaccine_name)
  const [vName, setVName] = useState(initialData?.applied_vaccine_name || '')
  const [vDate, setVDate] = useState(initialData?.applied_vaccine_date || new Date().toISOString().split('T')[0])
  const [vLot, setVLot] = useState(initialData?.applied_vaccine_lot || '')
  const [vBoost, setVBoost] = useState<BoostInterval>('1y')
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    
    const consultationPayload = {
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
      applied_vaccine_name: didVaccinate ? vName : null,
      applied_vaccine_date: didVaccinate ? vDate : null,
      applied_vaccine_lot: didVaccinate ? vLot : null,
    }

    const vacData = (didVaccinate && !initialData) ? {
      vaccine_name: vName,
      applied_date: vDate,
      lot_number: vLot,
      boost_interval: vBoost
    } : undefined

    const res = await onSave(consultationPayload, vacData, initialData?.id)

    setSaving(false)
    if (res.error) setErrorMsg(res.error)
    else onClose()
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-vet-rose/20 focus:border-vet-rose"
  const areaCls = inputCls + " min-h-[60px] resize-y"

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-y-auto max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-pink-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">{initialData ? 'Ver y Editar Consulta Médica' : 'Registrar Nueva Consulta Médica'}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* FASE 1: Motivo y Anamnesis */}
          <div>
            <h3 className="text-sm font-bold text-vet-dark mb-3">1. Motivo y Anamnesis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium md:col-span-2">Motivo de Consulta
                <input className={inputCls} placeholder="Ej: Vómitos recurrentes y decaimiento" value={reason} onChange={e => setReason(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Anamnesis Remota (Antecedentes previos)
                <textarea className={areaCls} placeholder="Historial relevant previo a la dolencia actual..." value={remoteAna} onChange={e => setRemoteAna(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Anamnesis Actual (Problema presente)
                <textarea className={areaCls} placeholder="Signos actuales explicados por el tutor..." value={currentAna} onChange={e => setCurrentAna(e.target.value)} />
              </label>
            </div>
          </div>

          <hr className="border-pink-50" />

          {/* FASE 2: Examen Físico */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-vet-dark">2. Examen Físico</h3>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                Peso (Kg) <input type="number" step="0.01" className="w-20 px-2 py-1 text-sm border border-gray-200 rounded" value={weight} onChange={e => setWeight(e.target.value)} />
              </label>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-vet-light/30 p-4 rounded-xl border border-pink-100">
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Frec. Cardíaca (lpm)
                <input className={inputCls} placeholder="Ej: 120" value={hr} onChange={e => setHr(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Frec. Respiratoria (rpm)
                <input className={inputCls} placeholder="Ej: 30" value={rr} onChange={e => setRr(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Temperatura (°C)
                <input className={inputCls} placeholder="Ej: 38.5" value={temp} onChange={e => setTemp(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">T. Llene Capilar (seg)
                <input className={inputCls} placeholder="Ej: 2" value={capRefill} onChange={e => setCapRefill(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Pliegue Cutáneo
                <input className={inputCls} placeholder="Ej: Normal" value={skinFold} onChange={e => setSkinFold(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Estado Hidratación
                <input className={inputCls} placeholder="Ej: 5% DHT" value={hydration} onChange={e => setHydration(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Linfonodos
                <input className={inputCls} placeholder="Ej: Normales" value={lymphNodes} onChange={e => setLymphNodes(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Condición Corporal
                <input className={inputCls} placeholder="Ej: 3/5 Ideal" value={bodyCond} onChange={e => setBodyCond(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Pulso
                <input className={inputCls} placeholder="Ej: Fuerte y rítmico" value={pulse} onChange={e => setPulse(e.target.value)} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium mt-3">Observaciones Adicionales / Hallazgos
              <textarea className={areaCls} placeholder="Alteraciones de piel, mucosas anormales..." value={observations} onChange={e => setObservations(e.target.value)} />
            </label>
          </div>

          <hr className="border-pink-50" />

          {/* FASE 3: Diagnóstico y Acciones */}
          <div>
            <h3 className="text-sm font-bold text-vet-dark mb-3">3. Resolución Clínica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium md:col-span-2">Diagnóstico Resultante (o Presuntivo)
                <textarea className={areaCls} placeholder="Diagnóstico definitivo o diferencial..." value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium md:col-span-2">Tratamiento e Indicaciones
                <textarea className={areaCls + " min-h-[80px]"} placeholder="Terapias inyectadas y receta a casa..." value={treatment} onChange={e => setTreatment(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Exámenes Complementarios (Texto libre)
                <textarea className={areaCls} placeholder="Radiografía de tórax solicitada, Hemograma..." value={complementary} onChange={e => setComplementary(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Derivación Especialista (Texto libre)
                <textarea className={areaCls} placeholder="Derivado a cardiología..." value={referral} onChange={e => setReferral(e.target.value)} />
              </label>
            </div>
          </div>

          <hr className="border-pink-50" />

          {/* FASE 4: Vacunación (Opcional) */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-bold text-vet-dark">4. Inmunización</h3>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer bg-pink-50 px-3 py-1 rounded-full border border-pink-100 hover:bg-pink-100 transition-colors">
                <input type="checkbox" checked={didVaccinate} onChange={e => setDidVaccinate(e.target.checked)} className="rounded text-vet-rose focus:ring-vet-rose accent-vet-rose" />
                Se aplicó una vacuna en esta misma consulta
              </label>
            </div>
            
            {didVaccinate && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-vet-bone/50 p-4 rounded-xl border border-pink-100 mb-2">
                <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium md:col-span-2">Nombre de Vacuna
                  <input required={didVaccinate} className={inputCls} placeholder="Ej: Séxtuple, Antirrábica..." value={vName} onChange={e => setVName(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Día (Hoy)
                  <input required={didVaccinate} type="date" className={inputCls} value={vDate} onChange={e => setVDate(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Nº Lote (Opcional)
                  <input className={inputCls} placeholder="Ej: L89123" value={vLot} onChange={e => setVLot(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium md:col-span-2">Próximo Refuerzo
                  <select className={inputCls} value={vBoost} onChange={e => setVBoost(e.target.value as BoostInterval)}>
                    <option value="2w">2 semanas</option>
                    <option value="4w">4 semanas</option>
                    <option value="6m">6 meses</option>
                    <option value="1y">1 año</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          {errorMsg && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{errorMsg}</div>}

          <div className="flex justify-end gap-3 pt-3 border-t border-pink-100 sticky bottom-0 bg-white pb-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-medium bg-vet-dark text-white rounded-lg hover:bg-black disabled:opacity-50 transition-colors flex gap-2 items-center">
              {saving ? 'Guardando Registro Clínico...' : (initialData ? '✔ Guardar Cambios' : '✔ Crear Consulta Oficial')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
