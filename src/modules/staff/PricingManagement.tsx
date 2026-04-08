import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Service, StockItem } from '../../types'

export function PricingManagement() {
  const [services, setServices] = useState<Service[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newService, setNewService] = useState<Partial<Service>>({
    name: '', price: 0, duration_minutes: 15, description: '', icon: '🩺', stock_usage: []
  })

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
    
    const { data: stockData } = await supabase.from('stock_items').select('*').order('name')
    if (stockData) setStockItems(stockData as StockItem[])
    
    setLoading(false)
  }

  async function handleCreateService() {
    let finalName = newService.name
    
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)
    
    const { error: err } = await supabase
      .from('services')
      .insert({
        id,
        name: finalName,
        price: newService.price,
        duration_minutes: newService.duration_minutes,
        description: newService.description,
        stock_usage: newService.stock_usage || []
      })

    if (err) {
      setError('Error al crear: ' + err.message)
    } else {
      setIsAdding(false)
      setNewService({ name: '', price: 0, duration_minutes: 15, description: '', icon: '🩺', stock_usage: [] })
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
        description: service.description,
        icon: service.icon,
        stock_usage: service.stock_usage || []
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Servicios y Precios</h1>
          <p className="text-sm text-gray-500">Configura los servicios, precios y duración de las consultas de Veterinaria VetCare.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-vet-rose text-white text-sm font-bold rounded-xl hover:bg-vet-dark transition-colors"
          >
            <span>+</span> Nuevo Servicio
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
                placeholder="Ej: Consulta General"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Precio ($)</label>
              <input 
                type="number"
                min="0"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                value={newService.price ?? ''}
                onChange={e => setNewService({...newService, price: e.target.value === '' ? 0 : parseInt(e.target.value)})}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Duración (Mín)</label>
              <input 
                type="number"
                min="1"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                value={newService.duration_minutes ?? ''}
                onChange={e => setNewService({...newService, duration_minutes: e.target.value === '' ? 15 : parseInt(e.target.value)})}
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
            
            <div className="md:col-span-2 pt-2 border-t border-gray-100 mt-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">📦 Insumos utilizados por consulta</label>
              <div className="space-y-2 mb-3">
                {(newService.stock_usage || []).map((usage, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <select
                      className="flex-1 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded"
                      value={usage.item_id}
                      onChange={(e) => {
                        const newUsage = [...(newService.stock_usage || [])]
                        newUsage[idx].item_id = e.target.value
                        setNewService({ ...newService, stock_usage: newUsage })
                      }}
                    >
                      <option value="">Seleccionar Insumo...</option>
                      {stockItems.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      className="w-20 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded"
                      value={usage.quantity}
                      onChange={(e) => {
                        const newUsage = [...(newService.stock_usage || [])]
                        newUsage[idx].quantity = e.target.value === '' ? 1 : parseInt(e.target.value)
                        setNewService({ ...newService, stock_usage: newUsage })
                      }}
                    />
                    <button
                      onClick={() => {
                        const newUsage = [...(newService.stock_usage || [])]
                        newUsage.splice(idx, 1)
                        setNewService({ ...newService, stock_usage: newUsage })
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setNewService({ ...newService, stock_usage: [...(newService.stock_usage || []), { item_id: '', quantity: 1 }] })}
                className="text-xs font-bold text-vet-rose hover:bg-pink-50 px-3 py-1.5 rounded-lg border border-pink-100"
              >
                + Agregar Insumo
              </button>
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
              <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">📋 Lista de Servicios</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.filter(s => s.name !== 'DATOS_TRANSFERENCIA').map(service => (
                  <ServiceCard 
                    key={service.id} 
                    service={service} 
                    editingId={editingId} 
                    setEditingId={setEditingId}
                    handleUpdateService={handleUpdateService}
                    handleDeleteService={handleDeleteService}
                    services={services}
                    setServices={setServices}
                    stockItems={stockItems}
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
          <p>Los cambios en esta sección afectan **directamente** lo que ven tus pacientes en el portal de reserva pública. Asegúrate de que los precios y tiempos sean correctos antes de guardar.</p>
        </div>
      </div>

      {(services.find(s => s.name === 'DATOS_TRANSFERENCIA') || true) && (() => {
        const transferObj = services.find(s => s.name === 'DATOS_TRANSFERENCIA') || { name: 'DATOS_TRANSFERENCIA', description: 'DATOS PARA TRANSFERENCIA\n\nNOMBRE: JUAN PEREZ\nBANCO: BANCO DE CHILE\nCTA CORRIENTE: 123456789\nCORREO: PAGOS@VETCARE.CL\nRUT: 76.123.456-7\nASUNTO: NOMBRE DE LA MASCOTA' } as Service
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

function ServiceCard({ service, editingId, setEditingId, handleUpdateService, handleDeleteService, services, setServices, stockItems }: any) {
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
                  min="0"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-rose/20"
                  value={service.price}
                  onChange={(e) => {
                    const raw = e.target.value
                    const price = raw === '' ? 0 : parseInt(raw)
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
            
            <div className="pt-3 border-t border-gray-100 mt-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">📦 Insumos a descontar</label>
              <div className="space-y-2 mb-3">
                {(service.stock_usage || []).map((usage: any, idx: number) => (
                  <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <select
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded"
                      value={usage.item_id}
                      onChange={(e) => {
                        const newUsage = [...(service.stock_usage || [])]
                        newUsage[idx].item_id = e.target.value
                        setServices(services.map((s: any) => s.id === service.id ? {...s, stock_usage: newUsage} : s))
                      }}
                    >
                      <option value="">Seleccionar Insumo...</option>
                      {stockItems.map((item: StockItem) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      className="w-16 px-2 py-1.5 text-xs bg-white border border-gray-200 rounded"
                      value={usage.quantity}
                      onChange={(e) => {
                        const newUsage = [...(service.stock_usage || [])]
                        newUsage[idx].quantity = e.target.value === '' ? 1 : parseInt(e.target.value)
                        setServices(services.map((s: any) => s.id === service.id ? {...s, stock_usage: newUsage} : s))
                      }}
                    />
                    <button
                      onClick={() => {
                        const newUsage = [...(service.stock_usage || [])]
                        newUsage.splice(idx, 1)
                        setServices(services.map((s: any) => s.id === service.id ? {...s, stock_usage: newUsage} : s))
                      }}
                      className="w-6 h-6 flex items-center justify-center bg-red-50 text-red-500 rounded text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const newUsage = [...(service.stock_usage || []), { item_id: '', quantity: 1 }]
                  setServices(services.map((s: any) => s.id === service.id ? {...s, stock_usage: newUsage} : s))
                }}
                className="text-[10px] font-bold text-vet-rose uppercase hover:underline"
              >
                + Agregar Insumo
              </button>
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
            
            {service.stock_usage && service.stock_usage.length > 0 && (
              <div className="mt-3 bg-gray-50 rounded-lg p-3 text-xs">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Insumos asociados:</p>
                <div className="space-y-1">
                  {service.stock_usage.map((usage: any, idx: number) => {
                    const stockItem = stockItems.find((i: StockItem) => i.id === usage.item_id)
                    return (
                      <div key={idx} className="flex justify-between text-gray-600">
                        <span>{stockItem?.name || <span className="italic text-red-400">Insumo eliminado</span>}</span>
                        <span className="font-bold">x{usage.quantity}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
