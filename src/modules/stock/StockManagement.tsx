// ============================================================
// VetCare Manager — StockManagement.tsx
// ============================================================

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { StockItem } from '../../types'

export function StockManagement() {
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemLot, setNewItemLot] = useState('')
  const [newItemQty, setNewItemQty] = useState<number | string>('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function fetchStock() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('stock_items')
      .select('*')
      .order('name', { ascending: true })

    if (err) setError(err.message)
    else setItems(data as StockItem[])
    setLoading(false)
  }

  useEffect(() => {
    fetchStock()
  }, [])

  async function handleAdd() {
    if (!newItemName.trim()) return
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)
    const { error: err } = await supabase
      .from('stock_items')
      .insert({ 
        id, 
        name: newItemName.trim(), 
        lot_number: newItemLot.trim() || null,
        quantity: newItemQty === '' ? 0 : Number(newItemQty) 
      })

    if (err) {
      setError('Error al crear: ' + err.message)
    } else {
      showToast('Ítem creado correctamente')
      setNewItemName('')
      setNewItemLot('')
      setNewItemQty('')
      setIsAdding(false)
      fetchStock()
    }
  }

  async function updateQty(id: string, newQty: number) {
    if (newQty < 0) return
    const { error: err } = await supabase
      .from('stock_items')
      .update({ quantity: newQty })
      .eq('id', id)

    if (err) setError(err.message)
    else {
      setItems(items.map(i => i.id === id ? { ...i, quantity: newQty } : i))
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando inventario...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-pink-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">📦 Control de Stock</h1>
          <p className="text-sm text-gray-500 mt-1">Administra los insumos de la clínica</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-vet-rose text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-vet-dark transition-colors"
        >
          {isAdding ? 'Cancelar' : '+ Agregar Insumo'}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl border border-red-200">{error}</div>}

      {isAdding && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-pink-200 flex flex-wrap gap-4 items-end animate-fade-in">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nombre Insumo</label>
            <input
              autoFocus
              placeholder="Ej: Vacuna Sextuple"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-vet-rose/20 outline-none"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Número de Lote (Opcional)</label>
            <input
              placeholder="Ej: LOTE-12345"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-vet-rose/20 outline-none"
              value={newItemLot}
              onChange={e => setNewItemLot(e.target.value)}
            />
          </div>
          <div className="w-32">
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stock Inicial</label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
              value={newItemQty}
              onChange={e => setNewItemQty(e.target.value === '' ? '' : parseInt(e.target.value))}
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-5 py-2 bg-vet-dark text-white rounded-lg font-bold hover:bg-black transition-colors"
          >
            Guardar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-white border flex flex-col justify-between border-pink-100 rounded-xl p-4 shadow-sm hover:border-pink-300 transition-all">
            <div>
              <h3 className="font-bold text-gray-900 leading-tight">{item.name}</h3>
              {item.lot_number && (
                <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">Lote: <span className="text-gray-600">{item.lot_number}</span></p>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-gray-500 font-medium">Unidades disponibles:</span>
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-100">
                <button
                  onClick={() => updateQty(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 0}
                  className="w-8 h-8 flex items-center justify-center rounded bg-white border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-bold transition-all disabled:opacity-30"
                >
                  -
                </button>
                <input
                  type="number"
                  className={`w-16 text-center border-none p-0 focus:ring-0 bg-transparent font-black ${item.quantity <= 2 ? 'text-red-500' : 'text-gray-900'}`}
                  value={item.quantity}
                  onChange={(e) => {
                    const qty = e.target.value === '' ? 0 : parseInt(e.target.value)
                    setItems(items.map(i => i.id === item.id ? { ...i, quantity: qty } : i))
                  }}
                  onBlur={(e) => {
                    const qty = e.target.value === '' ? 0 : parseInt(e.target.value)
                    updateQty(item.id, qty)
                  }}
                />
                <button
                  onClick={() => updateQty(item.id, item.quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-white border border-gray-200 text-gray-700 hover:bg-green-50 hover:text-green-600 hover:border-green-200 font-bold transition-all"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div className="col-span-full py-10 text-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-500">
            No hay insumos registrados en el inventario.
          </div>
        )}
      </div>
    </div>
  )
}
