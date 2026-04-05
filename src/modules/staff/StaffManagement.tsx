import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { StaffMember } from '../../types'

export function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'ayudante'>('ayudante')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStaff()
  }, [])

  async function fetchStaff() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (err) setError(err.message)
    else setStaff(data as StaffMember[])
    setLoading(false)
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const email = newEmail.trim().toLowerCase()
    if (!email) return

    const { error: err } = await supabase
      .from('staff')
      .insert([{ email, role: newRole }])

    if (err) {
      setError(err.message)
    } else {
      setNewEmail('')
      fetchStaff()
    }
  }

  async function handleDeleteStaff(id: string) {
    if (!window.confirm('¿Estás seguro de eliminar a esta persona del personal? Perderá el acceso administrativo.')) return
    const { error: err } = await supabase.from('staff').delete().eq('id', id)
    if (err) setError(err.message)
    else fetchStaff()
  }

  async function handleUpdateRole(id: string, role: 'admin' | 'ayudante') {
    const { error: err } = await supabase.from('staff').update({ role }).eq('id', id)
    if (err) setError(err.message)
    else fetchStaff()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Personal</h1>
        <div className="text-xs bg-pink-50 text-vet-rose px-3 py-1 rounded-full font-bold border border-pink-100">
          Admin Control
        </div>
      </div>

      {/* Formulario para añadir */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Añadir Persona al Equipo</h2>
        <form onSubmit={handleAddStaff} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <input
              type="email"
              required
              placeholder="correo@ejemplo.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-vet-rose/10 outline-none"
            />
          </div>
          <div className="w-full md:w-40">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'admin' | 'ayudante')}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
            >
              <option value="ayudante">Ayudante</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-vet-rose text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-vet-dark transition-all shadow-md active:scale-95"
          >
            Invitar
          </button>
        </form>
        {error && <p className="text-red-500 text-xs mt-2 ml-1">⚠️ {error}</p>}
      </div>

      {/* Lista de personal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px] tracking-widest border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Correo Electrónico</th>
              <th className="px-6 py-4">Rol</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-gray-400 italic">Cargando personal...</td>
              </tr>
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-gray-400 italic">No hay personal registrado aún.</td>
              </tr>
            ) : (
              staff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{member.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      member.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {member.role === 'admin' ? 'Administrador' : 'Ayudante'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       {/* Dropdown simple para cambiar rol o bajar a tutor (eliminar) */}
                       <select 
                         value={member.role}
                         onChange={(e) => handleUpdateRole(member.id, e.target.value as 'admin' | 'ayudante')}
                         className="text-[10px] font-bold border rounded p-1"
                       >
                         <option value="admin">Admin</option>
                         <option value="ayudante">Ayudante</option>
                       </select>

                       <button 
                         onClick={() => handleDeleteStaff(member.id)}
                         className="text-red-400 hover:text-red-600 transition-colors p-1"
                         title="Eliminar del personal / Bajar a tutor"
                       >
                         🗑️
                       </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 items-start">
        <span className="text-lg">💡</span>
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-bold uppercase tracking-tight">Nota sobre Acceso:</p>
          <p>Al eliminar a alguien de esta lista o "bajarlo a tutor", la persona no podrá acceder a los módulos de Pacientes, Vacunas ni Agenda. Seguirá pudiendo entrar a su propio portal de clientes si tiene mascotas registradas.</p>
        </div>
      </div>
    </div>
  )
}
