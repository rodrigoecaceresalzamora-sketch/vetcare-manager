import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'
import { 
  speciesEmoji, 
  getGravatarUrl,
  calcVaccineStatus
} from '../../lib/utils'
import type { Patient, Appointment, Vaccination } from '../../types'
import { useClinicConfig } from '../../contexts/ClinicConfigContext'

export function TutorView() {
  const { user, signOut } = useAuth()
  const { config } = useClinicConfig()
  const [loading, setLoading] = useState(true)
  const [pets, setPets] = useState<(Patient & { nextAppointment?: Appointment; nextVaccination?: Vaccination })[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!user?.email) return
    setLoading(true)
    setError(null)

    try {
      // 1. Buscar Citas de este tutor (por email)
      // Esto nos sirve para identificar mascotas incluso si no tienen ficha clínica aún
      const { data: appointments, error: aErr } = await supabase
        .from('appointments')
        .select('*')
        .eq('guardian_email', user.email)
        .gte('scheduled_at', new Date().toISOString())
        .neq('status', 'cancelada')
        .order('scheduled_at', { ascending: true })

      if (aErr) throw aErr

      // 2. Buscar Guardian oficial
      const { data: guardian } = await supabase
        .from('guardians')
        .select('id')
        .eq('email', user.email)
        .maybeSingle()

      let officialPatients: Patient[] = []

      if (guardian) {
        // 3. Buscar Mascotas oficiales
        const { data: pData } = await supabase
          .from('patients')
          .select('*')
          .eq('guardian_id', guardian.id)
          .eq('status', 'activo')
        
        officialPatients = pData || []

        // 4. Buscar Vacunas de estas mascotas
        const pIds = officialPatients.map(p => p.id)
        if (pIds.length > 0) {
          const { data: vData } = await supabase
            .from('vaccinations')
            .select('*')
            .in('patient_id', pIds)
            .order('next_due_date', { ascending: true })
          
          const vaccinesByPet = new Map<string, Vaccination>()
          vData?.forEach(v => {
            if (!vaccinesByPet.has(v.patient_id)) {
              vaccinesByPet.set(v.patient_id, v)
            }
          })

          officialPatients = officialPatients.map(p => ({
            ...p,
            nextVaccination: vaccinesByPet.get(p.id)
          }))
        }
      }

      // 5. Consolidar lista de mascotas (oficiales + de citas)
      const petMap = new Map<string, any>()

      // Agregar pacientes oficiales
      officialPatients.forEach(p => {
        petMap.set(p.name.toLowerCase(), {
          ...p,
          nextAppointment: appointments.find(a => a.patient_id === p.id || a.pet_name.toLowerCase() === p.name.toLowerCase())
        })
      })

      // Agregar mascotas de citas que NO estén en pacientes oficiales
      appointments.forEach(a => {
        const key = a.pet_name.toLowerCase()
        if (!petMap.has(key)) {
          petMap.set(key, {
            id: `temp-${a.id}`,
            name: a.pet_name,
            species: a.pet_species || 'Otro',
            breed: a.pet_breed || 'Desconocida',
            sex: a.pet_sex || 'No determinado',
            is_temp: true,
            nextAppointment: a
          })
        }
      })

      setPets(Array.from(petMap.values()))
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
              <img src={config?.clinic_logo_url || "/logo.png"} alt="VetCare" className="w-8 h-8 object-contain rounded-md" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 leading-none">{config?.clinic_name || 'VETCARE'}</h1>
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
            <Link 
              to="/facturacion"
              className="px-4 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-vet-rose transition-all flex items-center gap-2"
            >
               Comprar VetCare Manager
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
        {/* Información de Atención y Ubicación */}
        <div className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-pink-100 rounded-[32px] p-6 shadow-sm">
            <h3 className="text-sm font-black text-vet-dark uppercase tracking-widest mb-4 flex items-center gap-2">
              📍 Nuestra Ubicación
            </h3>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <p className="text-lg font-bold text-gray-900 mb-1">{config?.clinic_name || 'Veterinaria'}</p>
                <p className="text-sm text-gray-600 mb-4">{config?.address}</p>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs">⏰</span>
                    <div>
                      <p className="text-xs font-bold text-gray-800">Horarios en Tienda:</p>
                      {Object.keys(config?.schedule || {}).map(day => {
                        const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][Number(day)]
                        return (
                          <p key={day} className="text-[11px] text-gray-600">{dayName}: {config?.schedule[day].slice(0, 1) + ' - ' + config?.schedule[day].slice(-1)}</p>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs">🏠</span>
                    <div>
                      <p className="text-xs font-bold text-gray-800">Consultas a Domicilio:</p>
                      <p className="text-[11px] text-gray-600">Contactar vía WhatsApp al <strong>{config?.contact_phone}</strong></p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full sm:w-48 h-32 sm:h-auto rounded-2xl overflow-hidden shadow-inner border border-pink-50">
                <iframe 
                  src={config?.google_maps_embed_url} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={true} 
                  loading="lazy" 
                />
              </div>
            </div>
          </div>

          <div className="bg-vet-rose text-white rounded-[32px] p-8 shadow-lg shadow-pink-100 relative overflow-hidden flex flex-col justify-center">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <h3 className="text-2xl font-black mb-2 leading-none italic">¿NECESITAS ATENCIÓN A DOMICILIO?</h3>
            <p className="text-sm font-medium opacity-90 mb-6 max-w-xs">
              Para visitas fuera de la tienda en Quilpué, agenda directamente por WhatsApp para coordinar factibilidad técnica y horarios especiales.
            </p>
            <a 
              href={`https://wa.me/${config?.contact_phone?.replace(/[^\d]/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-vet-rose px-6 py-3 rounded-2xl font-black text-sm hover:bg-vet-dark hover:text-white transition-all w-fit shadow-xl"
            >
              <span>💬</span> Agendar por WhatsApp
            </a>
          </div>
        </div>

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


                    {/* Cita */}
                    <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 group-hover:bg-white group-hover:border-pink-100 transition-colors">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        Próxima Cita
                      </p>
                      {pet.nextAppointment ? (
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-sm font-bold text-gray-800">{pet.nextAppointment.service}</p>
                            {pet.nextAppointment.status === 'pendiente' && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-lg border border-amber-100">
                                Pendiente
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-blue-600 font-medium mt-0.5">
                            {new Date(pet.nextAppointment.scheduled_at).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })} a las {new Date(pet.nextAppointment.scheduled_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Sin horas agendadas</p>
                      )}
                    </div>

                    {/* Vacuna */}
                    <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 group-hover:bg-white group-hover:border-pink-100 transition-colors">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        Próxima Vacuna
                      </p>
                      {pet.nextVaccination ? (
                        <div>
                          <p className="text-sm font-bold text-gray-800">{pet.nextVaccination.vaccine_name}</p>
                          <p className={`text-xs font-medium mt-0.5 ${
                            ['urgente', 'vencida'].includes(calcVaccineStatus(pet.nextVaccination.next_due_date)) 
                              ? 'text-red-500 font-bold' 
                              : 'text-amber-600'
                          }`}>
                            {new Date(pet.nextVaccination.next_due_date + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Sin vacunas registradas</p>
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

        {/* CTA: Comprar Servicio (SaaS Promo) */}
        {!loading && (
          <div className="mt-16 bg-gradient-to-br from-gray-900 to-vet-dark rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl border-4 border-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-vet-rose/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="space-y-4 text-center lg:text-left">
                <div className="inline-block px-4 py-1.5 bg-vet-rose text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                  VetCare Manager para Veterinarios
                </div>
                <h2 className="text-3xl lg:text-4xl font-black tracking-tighter leading-none">
                  ¿ERES VETERINARIO? <br/>
                  <span className="text-vet-rose">ESCALA TU CLÍNICA SIN LÍMITES</span>
                </h2>
                <p className="text-gray-400 text-sm max-w-xl">
                  Agenda, fichas clínicas, control de stock y recordatorios automáticos en una sola plataforma SaaS diseñada para veterinarios modernos.
                </p>
              </div>
              <Link 
                to="/facturacion"
                className="px-10 py-5 bg-white text-gray-900 rounded-2xl font-black text-lg hover:bg-vet-rose hover:text-white transition-all shadow-xl whitespace-nowrap uppercase tracking-widest"
              >
                Comprar VetCare Manager
              </Link>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-pink-100">
           <img src="/logo.png" alt="VetCare" className="w-6 h-6 grayscale opacity-30" />
        </div>
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">
          VetCare &middot; 2026
        </p>
      </footer>
    </div>
  )
}
