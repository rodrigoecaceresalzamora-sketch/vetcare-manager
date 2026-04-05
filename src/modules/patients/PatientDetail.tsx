// ============================================================
// VetCare Manager — PatientDetail.tsx
// Ficha Clínica del paciente: Header, Histórico, Archivos
// ============================================================

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatientDetail } from './usePatientDetail'
import { ConsultationForm } from './ConsultationForm'
import { PatientForm } from './PatientForm'
import { supabase } from '../../lib/supabase'
import { speciesEmoji, calcVaccineStatus } from '../../lib/utils'
import type { Consultation } from '../../types'

function calculateAgeAndMonths(dateString: string) {
  if (!dateString) return ''
  const dob = new Date(dateString)
  if (isNaN(dob.getTime())) return ''
  
  const today = new Date()
  let years = today.getFullYear() - dob.getFullYear()
  let months = today.getMonth() - dob.getMonth()
  
  if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
    years--
    months += 12
  }
  
  if (years === 0 && months === 0) return 'Menos de 1 mes'
  return `${years > 0 ? years + ' años ' : ''}${months > 0 ? months + ' meses' : ''}`.trim()
}

export function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { 
    patient, 
    consultations, 
    files, 
    upcomingAppointments, 
    vaccinations,
    loading, 
    error, 
    saveConsultation, 
    uploadFile, 
    deleteFile, 
    deleteConsultation 
  } = usePatientDetail(id!)
  
  const [activeTab, setActiveTab] = useState<'historial' | 'archivos'>('historial')
  const [formConsultation, setFormConsultation] = useState<Consultation | 'new' | null>(null)
  const [isConsultationReadOnly, setIsConsultationReadOnly] = useState(false)
  const [showEditPatientForm, setShowEditPatientForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) return <div className="p-10 text-center"><div className="w-6 h-6 border-2 border-vet-rose border-t-transparent rounded-full animate-spin mx-auto"/></div>
  if (error || !patient) return <div className="p-10 text-center text-red-500">Error cargando ficha: {error || 'Paciente no encontrado'}</div>

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    setUploading(true)
    await uploadFile(e.target.files[0])
    setUploading(false)
    e.target.value = '' // reset
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      
      {/* Boton Volver */}
      <button onClick={() => navigate('/pacientes')} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
        <span>←</span> Volver a Pacientes
      </button>

      {/* ALERTA REACTIVO */}
      {patient.is_reactive && (
        <div className="bg-red-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-lg animate-pulse border-2 border-red-400">
          <span className="text-2xl">⚠️</span>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tighter italic">¡PACIENTE REACTIVO!</h2>
            <p className="text-xs font-bold opacity-90 leading-tight">Manejar con precaución extrema. Se recomienda el uso de bozal o protocolos de seguridad.</p>
          </div>
        </div>
      )}

      {/* HEADER DE LA FICHA (Read-Only) */}
      <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6 flex flex-col md:flex-row gap-6">
        <div className="w-20 h-20 bg-pink-50 border border-pink-100 rounded-full flex items-center justify-center text-4xl flex-shrink-0 mx-auto md:mx-0">
          {speciesEmoji(patient.species)}
        </div>
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {patient.name}
              {patient.is_reactive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white shadow-sm">
                  🚩 REACTIVO
                </span>
              )}
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${patient.status === 'activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {patient.status}
              </span>
            </h1>
            <p className="text-sm text-vet-dark mt-1 font-medium">{patient.species} • {patient.breed}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge label="Edad" value={calculateAgeAndMonths(patient.date_of_birth)} />
              <Badge label="Sexo" value={patient.sex} />
              <Badge label="Nacimiento" value={patient.date_of_birth} />
            </div>
          </div>
          
          <div className="bg-vet-light/40 rounded-xl p-4 border border-vet-light flex flex-col justify-between">
            <div>
              <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-2">Tutor Responsable</h3>
              <p className="font-medium text-gray-900 text-sm">{patient.guardian?.name}</p>
              <p className="text-xs text-gray-600 mt-1">RUT: <span className="font-medium">{patient.guardian?.rut}</span></p>
              <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-2">
                Tel: <span className="font-medium">{patient.guardian?.phone}</span>
                {patient.guardian?.phone && (
                  <a 
                    href={`https://wa.me/${patient.guardian.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-sm"
                    title="Abrir WhatsApp"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </a>
                )}
              </p>
            </div>
            <button
              onClick={() => setShowEditPatientForm(true)}
              className="mt-4 text-xs font-bold text-vet-rose bg-white border border-pink-100 py-2 rounded-lg hover:bg-vet-bone transition shadow-sm"
            >
              ✎ Editar Info Paciente
            </button>
          </div>
        </div>
      </div>

      {/* ALERTAS DE PRÓXIMOS EVENTOS */}
      {(upcomingAppointments.length > 0 || vaccinations.some(v => ['urgente', 'proxima', 'vencida'].includes(calcVaccineStatus(v.next_due_date)))) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingAppointments.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center gap-3">
              <span className="text-xl">📅</span>
              <div>
                <p className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Próxima Cita</p>
                <p className="text-sm font-bold text-indigo-900">
                  {upcomingAppointments[0].service} - {new Date(upcomingAppointments[0].scheduled_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )}
          {vaccinations.some(v => ['urgente', 'proxima', 'vencida'].includes(calcVaccineStatus(v.next_due_date))) && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
              <span className="text-xl">💉</span>
              <div>
                <p className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Alerta de Vacuna</p>
                <p className="text-sm font-bold text-amber-900">
                  {vaccinations.find(v => ['urgente', 'proxima', 'vencida'].includes(calcVaccineStatus(v.next_due_date)))?.vaccine_name} - {vaccinations.find(v => ['urgente', 'proxima', 'vencida'].includes(calcVaccineStatus(v.next_due_date)))?.next_due_date}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ZONA DE TABS */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button 
            onClick={() => setActiveTab('historial')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'historial' ? 'border-vet-rose text-vet-rose' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Historial Médico ({consultations.length})
          </button>
          <button 
            onClick={() => setActiveTab('archivos')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'archivos' ? 'border-vet-rose text-vet-rose' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Exámenes Complementarios y Archivos ({files.length})
          </button>
        </nav>
      </div>

      {/* CONTENIDO DEL TAB */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
        {activeTab === 'historial' ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">Registros Clínicos</h2>
              <button 
                onClick={() => {
                  setFormConsultation('new')
                  setIsConsultationReadOnly(false)
                }}
                className="bg-vet-rose text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-600 transition"
              >
                + Nueva Consulta / R.M.
              </button>
            </div>

            {consultations.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                Aún no hay visitas registradas para este paciente. Emite su primera evaluación clínica.
              </div>
            ) : (
              <div className="space-y-4">
                {consultations.map(c => (
                  <div key={c.id} className="border border-pink-100 rounded-xl p-5 hover:border-vet-rose transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        {c.created_at && <span className="text-xs text-gray-400 font-mono block mb-1">{new Date(c.created_at).toLocaleString()}</span>}
                        <h4 className="font-bold text-gray-900">{c.reason_for_consultation || 'Consulta de rutina'}</h4>
                        {c.weight_kg && <span className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-medium border border-amber-200 inline-block mt-2">Peso: {c.weight_kg} kg</span>}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setFormConsultation(c)
                            setIsConsultationReadOnly(true)
                          }} 
                          className="w-8 h-8 flex justify-center items-center rounded-lg border border-pink-100 bg-white hover:bg-pink-50 text-vet-dark transition shadow-sm text-sm" 
                          title="Ver Ficha (Solo Lectura)"
                        >
                          🔍
                        </button>
                        <button 
                          onClick={() => {
                            setFormConsultation(c)
                            setIsConsultationReadOnly(false)
                          }} 
                          className="w-8 h-8 flex justify-center items-center rounded-lg border border-pink-100 bg-white hover:bg-pink-50 text-vet-dark transition shadow-sm text-sm" 
                          title="Editar Ficha"
                        >
                          ✏️
                        </button>
                        <button onClick={() => { if (window.confirm(`¿Estás seguro de ELIMINAR permanentemente la ficha de consulta del día ${new Date(c.created_at || '').toLocaleDateString()}? Esta acción no se puede deshacer.`)) deleteConsultation(c.id) }} className="w-8 h-8 flex justify-center items-center rounded-lg border border-red-50 bg-red-50 hover:bg-red-100 text-red-500 transition shadow-sm text-sm" title="Eliminar Registro">
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {c.current_anamnesis && (
                        <div className="text-xs">
                          <strong className="text-gray-600 block mb-0.5">Anamnesis</strong>
                          <p className="text-gray-800">{c.current_anamnesis}</p>
                        </div>
                      )}
                      
                      {c.diagnosis && (
                        <div className="text-xs">
                          <strong className="text-gray-600 block mb-0.5">Diagnóstico</strong>
                          <p className="text-gray-800 font-medium">{c.diagnosis}</p>
                        </div>
                      )}
                      
                      {c.treatment && (
                        <div className="text-xs md:col-span-2 bg-vet-bone p-3 rounded-lg border border-pink-50 mt-2">
                          <strong className="text-gray-800 block mb-0.5">Tratamiento Indicado</strong>
                          <p className="text-gray-900">{c.treatment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">Archivos Adjuntos</h2>
              
              <label className="bg-vet-rose cursor-pointer text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-vet-dark transition">
                {uploading ? 'Subiendo...' : '+ Subir Archivo'}
                <input type="file" className="hidden" disabled={uploading} onChange={handleUpload} />
              </label>
            </div>

            {files.length === 0 ? (
               <div className="text-center py-12 text-gray-400 text-sm">
                Carpeta vacía. Puedes adjuntar fotos, exámenes de sangre o PDF asociados al paciente aquí.
               </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {files.map(file => (
                  <div key={file.id} className="relative group bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col hover:border-vet-rose transition-colors">
                    
                    <button 
                      onClick={() => deleteFile(file.name)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full text-xs font-bold items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar archivo"
                    >
                      ✕
                    </button>

                    <div className="w-10 h-10 bg-pink-100 text-vet-rose rounded-lg flex items-center justify-center flex-shrink-0 mb-3 text-lg">
                      {file.name.endsWith('.pdf') ? '📄' : '🖼️'}
                    </div>
                    
                    <span className="text-xs font-medium text-gray-900 truncate" title={file.name}>
                      {file.name.split('_').slice(1).join('_') || file.name}
                    </span>
                    {file.created_at && <span className="text-[10px] text-gray-500 mt-1">{new Date(file.created_at).toLocaleDateString()}</span>}
                    
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-4 text-xs font-bold text-vet-rose text-center bg-white border border-pink-200 py-1.5 rounded hover:bg-vet-light transition"
                    >
                      Abrir Archivo
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {formConsultation && (
        <ConsultationForm
          initialData={formConsultation === 'new' ? undefined : formConsultation}
          onClose={() => {
            setFormConsultation(null)
            setIsConsultationReadOnly(false)
          }}
          onSave={saveConsultation}
          readOnly={isConsultationReadOnly}
        />
      )}

      {showEditPatientForm && (
        <PatientForm
          initialData={patient}
          onClose={() => setShowEditPatientForm(false)}
          onSavePatient={async (data) => {
            // Reusamos la lógica de actualización. 
            // Podríamos necesitar una función updatePatient en el hook de PatientDetail si es necesario, 
            // pero usePatientDetail ya tiene acceso al paciente.
            const { error: err } = await supabase.from('guardians').update({
              name: data.guardian_name,
              rut: data.guardian_rut,
              phone: data.guardian_phone,
              email: data.guardian_email || '',
            }).eq('id', patient.guardian_id)
            
            if (err) return { error: err.message }

            const { error: pErr } = await supabase.from('patients').update({
              name: data.name,
              species: data.species,
              breed: data.breed,
              date_of_birth: data.date_of_birth,
              sex: data.sex,
              is_reactive: data.is_reactive,
            }).eq('id', patient.id)

            if (pErr) return { error: pErr.message }

            // Recargar datos
            window.location.reload() // Forma rápida de recargar todo el estado del hook
            return { error: null }
          }}
          onSaved={(petName) => {
            setShowEditPatientForm(false)
            showToast(`🐾 Información de ${petName} actualizada`)
          }}
        />
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}

function Badge({ label, value }: { label: string, value: string }) {
  return (
    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
      <span className="text-gray-500 mr-1">{label}</span>
      <span className="font-semibold">{value || 'N/A'}</span>
    </span>
  )
}
