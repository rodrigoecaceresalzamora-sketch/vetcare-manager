import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Service } from '../../types'

export function PricingManagement() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newService, setNewService] = useState<Partial<Service>>({
    name: '', price: 0, duration_minutes: 15, description: '', icon: '🩺'
  })
  const [isVaccine, setIsVaccine] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetchServices()
  }, [])

  async function fetchServices() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('services')
      .select('*')
      .order('name', { ascending: true })
    
    if (err) {
      setError(err.message)
    } else {
      setServices(data as Service[])
    }
    setLoading(false)
  }

  async function handleCreateService() {
    let finalName = newService.name
    if (isVaccine && !finalName?.startsWith('Vacunación')) {
      finalName = `Vacunación: ${finalName}`
    }
    
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)
    
    const { error: err } = await supabase
      .from('services')
      .insert({
        id,
        name: finalName,
        price: newService.price,
        duration_minutes: newService.duration_minutes,
        description: newService.description
      })

    if (err) {
      setError('Error al crear: ' + err.message)
    } else {
      setIsAdding(false)
      setNewService({ name: '', price: 0, duration_minutes: 15, description: '', icon: '🩺' })
      setIsVaccine(false)
      showToast('✅ Servicio creado con éxito')
      fetchServices()
    }
  }

  async function handleDeleteService(id: string) {
    if (!confirm('¿Estás seguro de eliminar este servicio? No se podrá recuperar.')) return
    const { error: err } = await supabase.from('services').delete().eq('id', id)
    if (err) {
      setError('Error al eliminar: ' + err.message)
    } else {
      showToast('🗑️ Servicio eliminado')
      fetchServices()
    }
  }

  async function handleUpdateService(service: Service) {
    const isNewTransferInfo = service.name === 'DATOS_TRANSFERENCIA' && !service.id
    
    if (isNewTransferInfo) {
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)
      const { error: err } = await supabase.from('services').insert({
        id, name: 'DATOS_TRANSFERENCIA', description: service.description, price: 0, duration_minutes: 0
      })
      if (err) setError(err.message)
      else { setEditingId(null); showToast('✅ Datos guardados'); fetchServices() }
      return
    }
    const { error: err } = await supabase
      .from('services')
      .update({
        price: service.price,
        duration_minutes: service.duration_minutes,
        description: service.description
      })
      .eq('id', service.id)

    if (err) {
      setError(err.message)
    } else {
      setEditingId(null)
      showToast('✅ Servicio actualizado')
      fetchServices()
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-pink-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Precios, Vacunas y Datos</h1>
          <p className="text-sm text-gray-500 mt-1">Configura lo que tus clientes ven en el portal de reservas</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-vet-rose text-white text-sm font-bold rounded-xl hover:bg-vet-dark transition-colors"
          >
            <span>+</span> Nuevo Servicio / Vacuna
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-vet-light/30 border-2 border-dashed border-vet-rose/50 rounded-2xl p-6 animate-fade-in relative">
          <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕ Cerrar</button>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Crear Nuevo Registro</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nombre</label>
              <input 
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                placeholder={isVaccine ? "Ej: Sextuple (Perro)" : "Ej: Consulta General"}
                value={newService.name}
                onChange={e => setNewService({...newService, name: e.target.value})}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input 
                type="checkbox" 
                id="is_vaccine_chk"
                checked={isVaccine}
                onChange={e => setIsVaccine(e.target.checked)}
                className="text-vet-rose"
              />
              <label htmlFor="is_vaccine_chk" className="text-sm font-medium text-gray-700 cursor-pointer">¿Es una vacuna específica?</label>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Precio ($)</label>
              <input 
                type="number"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                value={newService.price}
                onChange={e => setNewService({...newService, price: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Duración (Mín)</label>
              <input 
                type="number"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                value={newService.duration_minutes}
                onChange={e => setNewService({...newService, duration_minutes: parseInt(e.target.value) || 15})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Descripción</label>
              <textarea 
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                rows={2}
                value={newService.description}
                onChange={e => setNewService({...newService, description: e.target.value})}
              />
            </div>
          </div>
          <button 
            onClick={handleCreateService}
            disabled={!newService.name}
            className="px-6 py-2 bg-vet-rose text-white text-sm font-bold rounded-xl disabled:opacity-50"
          >
            💾 Guardar en base de datos
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="space-y-8">
        {loading ? (
          <div className="py-20 text-center text-gray-400">Cargando servicios e inicializando datos...</div>
        ) : services.length === 0 ? (
          <div className="py-20 text-center text-gray-400">No hay servicios definidos en la base de datos.</div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">🩺 Servicios Regulares</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.filter(s => s.name !== 'DATOS_TRANSFERENCIA' && !s.name.toLowerCase().includes('vacuna')).map(service => (
                  <ServiceCard 
                    key={service.id} 
                    service={service} 
                    editingId={editingId} 
                    setEditingId={setEditingId}
                    handleUpdateService={handleUpdateService}
                    handleDeleteService={handleDeleteService}
                    services={services}
                    setServices={setServices}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">💉 Vacunas Específicas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.filter(s => s.name !== 'DATOS_TRANSFERENCIA' && s.name.toLowerCase().includes('vacuna')).map(service => (
                  <ServiceCard 
                    key={service.id} 
                    service={service} 
                    editingId={editingId} 
                    setEditingId={setEditingId}
                    handleUpdateService={handleUpdateService}
                    handleDeleteService={handleDeleteService}
                    services={services}
                    setServices={setServices}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-vet-bone border border-pink-100 p-5 rounded-2xl flex gap-4">
        <span className="text-2xl">💡</span>
        <div className="text-xs text-gray-600 space-y-1">
          <p className="font-bold text-vet-rose uppercase tracking-wider">Aviso importante</p>
          <p>Los cambios en esta sección afectan **directamente** lo que ven tus pacientes en el portal de reserva pública. Asegúrate de que los precios y tiempos sean correctos antes de guardar. Las vacunas nuevas se agregan automáticamente al sistema.</p>
        </div>
      </div>

      {(services.find(s => s.name === 'DATOS_TRANSFERENCIA') || true) && (() => {
        const transferObj = services.find(s => s.name === 'DATOS_TRANSFERENCIA') || { name: 'DATOS_TRANSFERENCIA', description: 'Banco Santander\nCuenta Corriente: 123456789\nRUT: 76.543.210-K\nCorreo: vetcare@ejemplo.cl' } as Service
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-8">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">🏦 Datos de Transferencia Bancaria</h2>
              {editingId !== 'transfer_data' ? (
                <button onClick={() => setEditingId('transfer_data')} className="text-xs font-bold text-vet-rose hover:underline">Editar</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditingId(null)} className="text-xs font-bold text-gray-400 hover:underline">Cancelar</button>
                  <button onClick={() => handleUpdateService(transferObj)} className="text-xs font-bold text-green-600 hover:underline">Guardar</button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-4 truncate">Aparecerán automáticamente en la pantalla de abonos del 20%.</p>
            {editingId === 'transfer_data' ? (
              <textarea
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-rose/20 font-mono"
                rows={4}
                value={transferObj.description || ''}
                onChange={(e) => {
                  const val = e.target.value
                  if (services.some(s => s.name === 'DATOS_TRANSFERENCIA')) {
                    setServices(services.map(s => s.name === 'DATOS_TRANSFERENCIA' ? {...s, description: val} : s))
                  } else {
                    transferObj.description = val
                  }
                }}
              />
            ) : (
              <div className="bg-gray-50 p-4 rounded-xl text-sm font-mono whitespace-pre-wrap text-gray-700">
                {transferObj.description}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

function ServiceCard({ service, editingId, setEditingId, handleUpdateService, handleDeleteService, services, setServices }: any) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border transition-all ${editingId === service.id ? 'border-vet-rose ring-4 ring-vet-rose/5 scale-[1.02]' : 'border-gray-100'}`}>
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${service.bg || 'bg-gray-100 text-gray-500'} border ${service.border || 'border-gray-200'} flex items-center justify-center`}>
              {editingId === service.id ? (
                <input 
                  className="w-full h-full bg-transparent text-center focus:outline-none placeholder-gray-300"
                  value={service.icon || ''}
                  placeholder="🩺"
                  onChange={(e) => {
                    const val = e.target.value
                    setServices(services.map((s: any) => s.id === service.id ? {...s, icon: val} : s))
                  }}
                />
              ) : (
                <span className="text-lg">{service.icon || '🩺'}</span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{service.name}</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Base: {service.duration_minutes} min</p>
            </div>
          </div>
          {editingId !== service.id ? (
            <div className="flex gap-3 items-center">
              <button 
                onClick={() => setEditingId(service.id)}
                className="text-xs font-bold text-vet-rose hover:underline"
              >
                Editar
              </button>
              <button 
                onClick={() => handleDeleteService(service.id)}
                className="text-xs font-bold text-red-500 hover:underline"
              >
                 🗑️
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setEditingId(null)
                }}
                className="text-xs font-bold text-gray-400 hover:underline"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleUpdateService(service)}
                className="text-xs font-bold text-green-600 hover:underline"
              >
                Guardar
              </button>
            </div>
          )}
        </div>
        
        {editingId === service.id ? (
          <div className="space-y-4 mb-2 animate-fade-in">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Descripción en portal</label>
              <textarea
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-rose/20"
                rows={2}
                value={service.description || ''}
                onChange={(e) => {
                  const val = e.target.value
                  setServices(services.map((s: any) => s.id === service.id ? {...s, description: val} : s))
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Precio ($)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-rose/20"
                  value={service.price}
                  onChange={(e) => {
                    const price = parseInt(e.target.value) || 0
                    setServices(services.map((s: any) => s.id === service.id ? {...s, price} : s))
                  }}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Duración (Mín)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-rose/20"
                  value={service.duration_minutes}
                  onChange={(e) => {
                    const duration_minutes = parseInt(e.target.value) || 15
                    setServices(services.map((s: any) => s.id === service.id ? {...s, duration_minutes} : s))
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Descripción en portal</p>
              <p className="text-sm text-gray-600 leading-snug">{service.description || <span className="text-gray-300 italic">Sin descripción</span>}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Precio ($)</p>
                <p className="font-black text-gray-900">${(service.price || 0).toLocaleString('es-CL')}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Duración (Mín)</p>
                <p className="font-bold text-gray-900">{service.duration_minutes} min</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
