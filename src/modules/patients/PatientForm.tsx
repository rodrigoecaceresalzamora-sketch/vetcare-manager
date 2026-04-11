// ============================================================
// VetCare Manager — PatientForm.tsx
// Modal para crear Tutor y su Mascota
// ============================================================

import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import type { Species, Sex, Patient } from '../../types'
import { isValidRUT, isValidPhone, formatRUT } from '../../lib/utils'

interface Props {
  initialData?: Patient
  onClose: () => void
  onSaved: (name: string) => void
  onSavePatient: (data: any, patientId?: string, guardianId?: string) => Promise<{ error: string | null }>
}

function calculateAgeAndMonths(dateString: string | null | undefined) {
  if (!dateString) return 'Desconocida'
  const dob = new Date(dateString)
  if (isNaN(dob.getTime())) return 'Desconocida'
  
  const today = new Date()
  let years = today.getFullYear() - dob.getFullYear()
  let months = today.getMonth() - dob.getMonth()
  
  if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
    years--
    months += 12
  }
  
  if (years === 0 && months === 0) return 'Menos de un mes'
  return `${years > 0 ? years + ' años ' : ''}${months > 0 ? months + ' meses' : ''}`.trim()
}

export function PatientForm({ initialData, onClose, onSaved, onSavePatient }: Props) {
  // Tutor
  const [gName, setGName] = useState(initialData?.guardian?.name || '')
  const [gRut, setGRut] = useState(initialData?.guardian?.rut || '')
  const [gPhone, setGPhone] = useState(initialData?.guardian?.phone || '')
  const [gEmail, setGEmail] = useState(initialData?.guardian?.email || '')

  // Paciente
  const [pName, setPName] = useState(initialData?.name || '')
  const [pSpecies, setPSpecies] = useState<Species>(initialData?.species || 'Perro')
  const [pBreed, setPBreed] = useState(initialData?.breed || '')
  const [pDob, setPDob] = useState(initialData?.date_of_birth || new Date().toISOString().split('T')[0])
  const [pDobUnknown, setPDobUnknown] = useState(!initialData?.date_of_birth && !!initialData)
  const [pSex, setPSex] = useState<Sex>(initialData?.sex || 'No determinado')
  const [pAdopted, setPAdopted] = useState(initialData?.adopted_since || '')
  const [pIsReactive, setPIsReactive] = useState(initialData?.is_reactive || false)

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const ageText = useMemo(() => pDobUnknown ? 'Desconocida' : calculateAgeAndMonths(pDob), [pDob, pDobUnknown])

  const rutValid = useMemo(() => !gRut || isValidRUT(gRut), [gRut])
  const phoneValid = useMemo(() => !gPhone || isValidPhone(gPhone), [gPhone])

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRUT(e.target.value)
    setGRut(formatted)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    setSaving(true)

    const res = await onSavePatient({
      guardian_name: gName,
      guardian_rut: gRut,
      guardian_phone: gPhone,
      guardian_email: gEmail,
      name: pName,
      species: pSpecies,
      breed: pBreed,
      date_of_birth: pDobUnknown ? null : (pDob || null),
      sex: pSex,
      adopted_since: pAdopted || undefined,
      is_reactive: pIsReactive
    }, initialData?.id, initialData?.guardian_id)

    setSaving(false)
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      onSaved(pName)
    }
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-vet-rose/20 focus:border-vet-rose"

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-pink-100">
          <h2 className="text-base font-medium text-gray-900">{initialData ? 'Editar Paciente' : 'Registrar Nuevo Paciente'}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          {/* Seccion Tutor */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-vet-rose">1.</span> Datos del Tutor
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Nombre completo
                <input required className={inputCls} placeholder="Ej: Pedro Pérez" value={gName} onChange={e => setGName(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">RUT
                <div className="flex gap-1">
                  <input className={`${inputCls} flex-1 ${!rutValid ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-200' : ''}`} placeholder="12.345.678-9" value={gRut} onChange={handleRutChange} />
                  <button 
                    type="button"
                    onClick={async () => {
                      if (!gRut || !isValidRUT(gRut)) return
                      setSaving(true)
                      try {
                        const { data } = await supabase
                          .from('guardians')
                          .select('*')
                          .eq('rut', gRut)
                          .maybeSingle()
                        if (data) {
                          setGName(data.name)
                          setGPhone(data.phone)
                          setGEmail(data.email || '')
                        }
                      } catch (e) {
                        console.error(e)
                      } finally {
                        setSaving(false)
                      }
                    }}
                    className="px-2 bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-bold hover:bg-gray-200 transition-colors"
                  >
                    🔍
                  </button>
                </div>
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Teléfono
                <input required className={`${inputCls} ${!phoneValid ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-200' : ''}`} placeholder="+56 9 1234 5678" value={gPhone} onChange={e => setGPhone(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Email (Opcional)
                <input type="email" className={inputCls} placeholder="correo@ejemplo.com" value={gEmail} onChange={e => setGEmail(e.target.value)} />
              </label>
            </div>
          </div>

          <hr className="border-pink-50" />

          {/* Seccion Paciente */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-vet-rose">2.</span> Datos del Paciente (Mascota)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Nombre
                <input className={inputCls} placeholder="Ej: Firulais" value={pName} onChange={e => setPName(e.target.value)} />
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Especie
                  <select className={inputCls} value={pSpecies} onChange={e => setPSpecies(e.target.value as Species)}>
                    <option value="Perro">Perro</option>
                    <option value="Gato">Gato</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Sexo
                  <select className={inputCls} value={pSex} onChange={e => setPSex(e.target.value as Sex)}>
                    <option value="Macho">Macho</option>
                    <option value="Hembra">Hembra</option>
                    <option value="No determinado">N/D</option>
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Raza
                <input className={inputCls} placeholder="Ej: Poodle, Mestizo..." value={pBreed} onChange={e => setPBreed(e.target.value)} />
              </label>
              
              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium">Adoptado desde (Opcional)
                <input type="date" className={inputCls} value={pAdopted} onChange={e => setPAdopted(e.target.value)} max={new Date().toISOString().split('T')[0]} />
              </label>

              <label className="flex flex-col gap-1 text-xs text-gray-500 font-medium md:col-span-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>Fecha de Nacimiento</span>
                    <label className="inline-flex items-center gap-1 cursor-pointer ml-4">
                      <input type="checkbox" className="w-3 h-3 rounded text-vet-rose" checked={pDobUnknown} onChange={e => setPDobUnknown(e.target.checked)} />
                      <span className="text-[10px] text-gray-400 font-normal">Desconocida</span>
                    </label>
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md font-bold">Edad: {ageText}</span>
                </div>
                <input disabled={pDobUnknown} type="date" className={`${inputCls} ${pDobUnknown ? 'opacity-50' : ''}`} value={pDob} onChange={e => setPDob(e.target.value)} max={new Date().toISOString().split('T')[0]} />
              </label>

              {/* Botón Reactivo */}
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => setPIsReactive(!pIsReactive)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all 
                              ${pIsReactive 
                                ? 'bg-red-50 border-red-200 text-red-700' 
                                : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{pIsReactive ? '🚩' : '🐾'}</span>
                    <div className="text-left">
                      <p className="text-sm font-bold leading-none">¿Paciente Reactivo / Agresivo?</p>
                      <p className="text-[10px] mt-0.5 opacity-80">Activa esto para alertar al personal médico</p>
                    </div>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${pIsReactive ? 'bg-red-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${pIsReactive ? 'translate-x-5' : ''}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

          <div className="flex justify-end gap-2 pt-1 border-t border-pink-100 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium bg-vet-rose text-white rounded-lg hover:bg-vet-dark disabled:opacity-50 flex items-center gap-2">
              {saving ? 'Guardando...' : 'Guardar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
