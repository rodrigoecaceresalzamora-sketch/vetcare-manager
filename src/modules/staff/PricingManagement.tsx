import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Service } from '../../types'

export function PricingManagement() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    fetchServices()
  }, [])

  async function fetchServices() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('services')
      .select('*')
      .order('name', { ascending: true })
    
    if (err) setError(err.message)
    else setServices(data as Service[])
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleUpdateService(service: Service) {
    const { error: err } = await supabase
      .from('services')
      .update({
        price: service.price,
        duration_minutes: service.duration_minutes,
        description: service.description,
        icon: service.icon
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

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Precios y Servicios</h1>
          <p className="text-sm text-gray-500">Configura lo que tus clientes ven en el portal de reservas</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-20 text-center text-gray-400">Cargando servicios...</div>
        ) : services.length === 0 ? (
          <div className="col-span-2 py-20 text-center text-gray-400">No hay servicios definidos en la base de datos.</div>
        ) : (
          services.map(service => (
            <div 
              key={service.id}
              className={`bg-white rounded-2xl shadow-sm border transition-all ${
                editingId === service.id ? 'border-vet-rose ring-4 ring-vet-rose/5 scale-[1.02]' : 'border-gray-100'
              }`}
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${service.bg} border ${service.border} flex items-center justify-center`}>
                      {editingId === service.id ? (
                        <input 
                          className="w-full h-full bg-transparent text-center focus:outline-none placeholder-gray-300"
                          value={service.icon || ''}
                          placeholder="🩺"
                          onChange={(e) => {
                            const val = e.target.value
                            setServices(services.map(s => s.id === service.id ? {...s, icon: val} : s))
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
                    <button 
                      onClick={() => setEditingId(service.id)}
                      className="text-xs font-bold text-vet-rose hover:underline"
                    >
                      Editar
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingId(null)}
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

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block text-left">Descripción en portal</label>
                    {editingId === service.id ? (
                      <textarea 
                        className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-rose/20"
                        value={service.description || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setServices(services.map(s => s.id === service.id ? {...s, description: val} : s))
                        }}
                        rows={2}
                      />
                    ) : (
                      <p className="text-sm text-gray-600 min-h-[40px] text-left">{service.description || 'Sin descripción'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block text-left">Precio ($)</label>
                      {editingId === service.id ? (
                        <input 
                          type="number"
                          className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-rose/20"
                          value={service.price}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            setServices(services.map(s => s.id === service.id ? {...s, price: val} : s))
                          }}
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900 text-left">${service.price.toLocaleString('es-CL')}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block text-left">Duración (min)</label>
                      {editingId === service.id ? (
                        <input 
                          type="number"
                          className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-rose/20"
                          value={service.duration_minutes}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            setServices(services.map(s => s.id === service.id ? {...s, duration_minutes: val} : s))
                          }}
                        />
                      ) : (
                        <p className="text-lg font-bold text-gray-900 text-left">{service.duration_minutes} min</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-vet-bone border border-pink-100 p-5 rounded-2xl flex gap-4">
        <span className="text-2xl">💡</span>
        <div className="text-xs text-gray-600 space-y-1">
          <p className="font-bold text-vet-rose uppercase tracking-wider">Aviso importante</p>
          <p>Los cambios en esta sección afectan **directamente** lo que ven tus pacientes en el portal de reserva pública. Asegúrate de que los precios y tiempos sean correctos antes de guardar.</p>
        </div>
      </div>
    </div>
  )
}
