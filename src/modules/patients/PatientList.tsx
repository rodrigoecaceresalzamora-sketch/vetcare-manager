import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatients } from './usePatients'
import { PatientForm } from './PatientForm'
import { speciesEmoji } from '../../lib/utils'

export function PatientList() {
  const navigate = useNavigate()
  const { patients, loading, error, savePatient, updatePatient, deletePatient } = usePatients()
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const filteredPatients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return patients
    return patients.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.guardian?.name.toLowerCase().includes(q)
    )
  }, [patients, searchQuery])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-vet-rose border-t-transparent flex-shrink-0 rounded-full" />
      </div>
    )
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>
  }

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Directorio de Pacientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredPatients.length} {filteredPatients.length === 1 ? 'paciente encontrado' : 'pacientes encontrados'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* BUSCADOR */}
          <div className="relative flex-1 md:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </span>
            <input
              type="text"
              placeholder="Buscar mascota o tutor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-pink-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vet-rose/20 focus:border-vet-rose transition-all"
            />
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-vet-rose text-white text-sm font-medium rounded-lg hover:bg-vet-dark transition-colors whitespace-nowrap"
          >
            <span className="text-base leading-none">+</span>
            Agendar Paciente
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-pink-100 rounded-xl overflow-hidden">
        {filteredPatients.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {searchQuery ? 'No se encontraron pacientes con esa búsqueda' : 'Aún no hay pacientes, agrega el primero presionando "Agendar Paciente"'}
          </div>
        ) : (
          <div className="divide-y divide-pink-50">
            {filteredPatients.map(p => (
              <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-5 py-4 hover:bg-pink-50/40 transition-colors">
                
                {/* Avatar Especie */}
                <div className="w-12 h-12 rounded-full bg-vet-light flex flex-shrink-0 items-center justify-center text-2xl border border-pink-100">
                  {speciesEmoji(p.species)}
                </div>

                {/* Mascota Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900">
                    {p.name}
                    {p.is_reactive && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white animate-pulse shadow-sm">
                        🚩 REACTIVO
                      </span>
                    )}
                    <span className={`ml-2 text-xs font-normal px-2 py-0.5 rounded-full border ${p.sex === 'Macho' ? 'bg-blue-50 text-blue-700 border-blue-200' : p.sex === 'Hembra' ? 'bg-pink-50 text-pink-700 border-pink-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {p.sex === 'No determinado' ? 'N/D' : p.sex}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.species} • {p.breed} • Nacimiento: {p.date_of_birth}
                  </p>
                </div>

                {/* Separador vertical en desktop */}
                <div className="hidden sm:block w-px h-10 bg-pink-100"></div>

                {/* Tutor Info */}
                <div className="flex-1 min-w-0 mt-2 sm:mt-0">
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-vet-rose" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    <p className="text-sm font-semibold text-gray-800">{p.guardian?.name}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 ml-4.5">
                    RUT: {p.guardian?.rut}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 ml-4.5">
                    Tel: {p.guardian?.phone}
                  </p>
                </div>

                {/* Acciones */}
                <div className="flex-shrink-0 self-end sm:self-center mt-2 sm:mt-0 flex gap-2">
                  <button 
                    onClick={() => navigate(`/pacientes/${p.id}`)}
                    className="text-xs font-medium text-vet-rose hover:text-vet-dark bg-vet-bone px-3 py-1.5 rounded-lg border border-pink-100 transition-colors"
                  >
                    Ver Ficha
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`¿Estás segura de ELIMINAR permanentemente a ${p.name} y todos sus datos? Esta acción no se puede deshacer.`)) {
                        const res = await deletePatient(p.id, p.guardian_id)
                        if (res.error) showToast('❌ Error: ' + res.error)
                        else showToast(`🗑️ ${p.name} eliminado/a correctamente`)
                      }
                    }}
                    className="w-7 h-7 flex items-center justify-center border border-red-100 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                    title="Eliminar paciente"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <PatientForm
          onClose={() => setShowForm(false)}
          onSavePatient={async (data, pId, gId) => {
            if (pId && gId) {
              return await updatePatient(pId, gId, data)
            } else {
              return await savePatient(data)
            }
          }}
          onSaved={(petName) => {
            setShowForm(false)
            showToast(`🐾 ¡El paciente ${petName} y su tutor han sido registrados con éxito!`)
          }}
        />
      )}
    </div>
  )
}
