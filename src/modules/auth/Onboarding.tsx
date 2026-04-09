import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export function Onboarding() {
  const { user, refreshAuth } = useAuth()
  const [clinicName, setClinicName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleCreateClinic(e: React.FormEvent) {
    e.preventDefault()
    if (!clinicName.trim() || !user) return
    
    setLoading(true)
    setError(null)
    
    try {
      // 1. Crear la clínica
      const { data: clinic, error: clinicErr } = await supabase
        .from('clinics')
        .insert({ 
          name: clinicName, 
          owner_id: user.id,
          plan_type: 'basic',
          is_paid: false 
        })
        .select()
        .single()

      if (clinicErr) throw clinicErr

      // 2. Crear el registro en staff vinculando al usuario con la clínica como admin
      const { error: staffErr } = await supabase
        .from('staff')
        .insert({
          email: user.email?.toLowerCase(),
          role: 'admin',
          clinic_id: clinic.id
        })

      if (staffErr) throw staffErr

      // 3. Crear una configuración inicial para la clínica
      await supabase.from('clinic_config').insert({
        clinic_id: clinic.id,
        clinic_name: clinicName
      })

      // Refrescar auth y redirigir
      await refreshAuth()
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-vet-bone flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-2xl border border-pink-100">
        <div className="text-center mb-8">
           <div className="inline-block w-16 h-16 bg-vet-rose rounded-2xl p-4 mb-4 shadow-xl shadow-vet-rose/20 rotate-3">
              <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" />
           </div>
           <h1 className="text-2xl font-black text-gray-900 leading-tight">¡Bienvenido a VetCare!</h1>
           <p className="text-gray-500 text-sm mt-1">Configura tu centro veterinario para comenzar.</p>
        </div>

        <form onSubmit={handleCreateClinic} className="space-y-6">
           {error && <div className="p-3 bg-red-50 border border-red-100 text-red-500 text-xs rounded-xl">{error}</div>}
           
           <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 block mb-2">Nombre de tu Veterinaria</label>
              <input 
                autoFocus
                type="text" 
                required
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-vet-rose/10 outline-none transition-all"
                placeholder="Ej: Clínica San Francisco"
                value={clinicName}
                onChange={e => setClinicName(e.target.value)}
              />
           </div>

           <div className="bg-pink-50 p-4 rounded-2xl border border-pink-100 mb-2">
              <p className="text-[11px] text-pink-700 font-bold leading-relaxed">
                ℹ️ Como creador de la clínica, serás el Administrador principal y podrás invitar a tu personal más adelante.
              </p>
           </div>

           <button 
             disabled={loading}
             className="w-full py-5 bg-vet-rose text-white font-black rounded-3xl shadow-xl shadow-vet-rose/30 hover:scale-[1.02] transition-all transform active:scale-95 flex items-center justify-center gap-3"
           >
             {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Crear mi Veterinaria 🚀'}
           </button>
        </form>

        <p className="text-center mt-8 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
           ¿Ya tienes una clínica invitada? <br/> Contacta a tu administrador para el acceso.
        </p>
      </div>
    </div>
  )
}
