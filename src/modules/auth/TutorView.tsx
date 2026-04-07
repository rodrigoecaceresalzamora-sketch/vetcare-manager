import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'
import { 
  speciesEmoji, 
  formatDate, 
  daysLeftLabel,
  getGravatarUrl 
} from '../../lib/utils'
import type { Patient, Vaccination, Appointment } from '../../types'

export function TutorView() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [pets, setPets] = useState<(Patient & { nextVaccine?: Vaccination; nextAppointment?: Appointment })[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!user?.email) return
    setLoading(true)
    setError(null)

    try {
      // 1. Buscar Guardian
      const { data: guardian, error: gErr } = await supabase
        .from('guardians')
        .select('id')
        .eq('email', user.email)
        .maybeSingle()

      if (gErr) throw gErr
      if (!guardian) {
        setPets([])
        setLoading(false)
        return
      }

      // 2. Buscar Mascotas
      const { data: patients, error: pErr } = await supabase
        .from('patients')
        .select('*')
        .eq('guardian_id', guardian.id)
        .eq('status', 'activo')

      if (pErr) throw pErr

      // 3. Buscar Vacunas Próximas para todas las mascotas
      const patientIds = patients.map(p => p.id)
      const { data: vaccinations, error: vErr } = await supabase
        .from('vaccinations')
        .select('*')
        .in('patient_id', patientIds)
        .gte('next_due_date', new Date().toISOString().split('T')[0])
        .order('next_due_date', { ascending: true })

      if (vErr) throw vErr

      // 4. Buscar Citas Próximas (por pet_name y email)
      const { data: appointments, error: aErr } = await supabase
        .from('appointments')
        .select('*')
        .eq('guardian_email', user.email)
        .gte('scheduled_at', new Date().toISOString())
        .neq('status', 'cancelada')
        .order('scheduled_at', { ascending: true })

      if (aErr) throw aErr

      // 5. Combinar datos
      const enrichedPets = patients.map(pet => {
        const nextVaccineRecord = vaccinations.find(v => v.patient_id === pet.id)
        // Buscamos cita por ID de paciente O por nombre (compatibilidad)
        const nextApp = appointments.find(a => 
          a.patient_id === pet.id || 
          (a.pet_name.toLowerCase() === pet.name.toLowerCase() && !a.patient_id)
        )
        return { ...pet, nextVaccine: nextVaccineRecord, nextAppointment: nextApp }
      })

      setPets(enrichedPets)
    } catch (err: any) {
      console.error('Error fetching tutor data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.email])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="min-h-screen bg-vet-bone font-sans">
      {/* Header */}
      <header className="bg-white border-b border-pink-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-vet-rose rounded-xl flex items-center justify-center shadow-md rotate-3">
              <img src="/logo.png" alt="VetCare" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 leading-none">VETCARE</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Portal del Tutor</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              to="/reserva"
              className="px-5 py-2.5 bg-vet-rose text-white text-sm font-bold rounded-xl hover:bg-vet-dark transition-all shadow-lg shadow-pink-200 flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span>
              Agendar Hora
            </Link>
            <div className="h-8 w-px bg-gray-100 mx-2 hidden sm:block"></div>
            <button 
              onClick={() => signOut()}
              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Cerrar Sesión"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Bienvenida */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <img 
              src={user?.user_metadata?.avatar_url || getGravatarUrl(user?.email)} 
              alt="Profile" 
              className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white shadow-lg"
            />
            <div>
              <h2 className="text-2xl font-black text-gray-900">¡Hola de nuevo! 👋</h2>
              <p className="text-gray-500 text-sm">Gestiona la salud de tus mascotas favoritas.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-vet-rose border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 p-6 rounded-3xl text-center">
            <p className="text-red-600 font-medium">Error al cargar datos: {error}</p>
            <button onClick={() => fetchData()} className="mt-4 text-sm font-bold text-red-500 underline">Reintentar</button>
          </div>
        ) : pets.length === 0 ? (
          <div className="bg-white border border-pink-100 p-12 rounded-[40px] text-center shadow-xl shadow-pink-50/50">
            <div className="w-20 h-20 bg-vet-bone rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">🐕</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Aún no tienes mascotas registradas</h3>
            <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
              Cuando agendes tu primera hora, tus mascotas aparecerán aquí automáticamente para que puedas seguir su historial.
            </p>
            <Link 
              to="/reserva"
              className="inline-block px-8 py-4 bg-vet-rose text-white font-bold rounded-2xl hover:bg-vet-dark transition-all shadow-xl shadow-pink-200"
            >
              Agendar mi primera consulta
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pets.map(pet => (
              <div 
                key={pet.id} 
                className="bg-white border border-pink-50 rounded-[32px] p-6 hover:shadow-2xl hover:shadow-pink-100/50 transition-all group overflow-hidden relative"
              >
                {/* Fondo decorativo */}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-vet-bone rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 -rotate-12" />
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-vet-light flex items-center justify-center text-3xl border border-pink-100 shadow-sm group-hover:scale-110 transition-transform">
                      {speciesEmoji(pet.species)}
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${pet.sex === 'Macho' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-pink-50 text-pink-600 border-pink-100'}`}>
                        {pet.sex}
                      </span>
                      <p className="text-[11px] text-gray-400 mt-1 font-bold">{pet.breed}</p>
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-gray-900 mb-6">{pet.name}</h3>

                  <div className="space-y-4">
                    {/* Vacuna */}
                    <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 group-hover:bg-white group-hover:border-pink-100 transition-colors">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                        Próxima Vacuna
                      </p>
                      {pet.nextVaccine ? (
                        <div>
                          <p className="text-sm font-bold text-gray-800">{pet.nextVaccine.vaccine_name}</p>
                          <p className="text-xs text-green-600 font-medium mt-0.5">{daysLeftLabel(pet.nextVaccine.next_due_date)} ({formatDate(pet.nextVaccine.next_due_date)})</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No hay vacunas programadas</p>
                      )}
                    </div>

                    {/* Cita */}
                    <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 group-hover:bg-white group-hover:border-pink-100 transition-colors">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        Próxima Cita
                      </p>
                      {pet.nextAppointment ? (
                        <div>
                          <p className="text-sm font-bold text-gray-800">{pet.nextAppointment.service}</p>
                          <p className="text-xs text-blue-600 font-medium mt-0.5">
                            {new Date(pet.nextAppointment.scheduled_at).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })} a las {new Date(pet.nextAppointment.scheduled_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Sin horas agendadas</p>
                      )}
                    </div>
                  </div>

                  <Link 
                    to="/reserva"
                    className="mt-8 w-full py-3.5 bg-vet-bone text-vet-dark text-sm font-bold rounded-2xl hover:bg-vet-rose hover:text-white transition-all flex items-center justify-center gap-2 group-hover:shadow-lg"
                  >
                    Agendar para {pet.name}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-pink-100">
           <img src="/logo.png" alt="VetCare" className="w-6 h-6 grayscale opacity-30" />
        </div>
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">
          Clínica Veterinaria VetCare &middot; 2026
        </p>
      </footer>
    </div>
  )
}
