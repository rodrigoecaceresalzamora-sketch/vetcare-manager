/* eslint-disable @typescript-eslint/no-unused-vars */
// ============================================================
// VetCare Manager — Módulo 3: WeekView
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { AppointmentModal } from './AppointmentModal'
import { useAuth } from '../../contexts/AuthContext'
import { SERVICE_META, formatTime } from '../../lib/utils'
import type { Appointment, AppointmentService } from '../../types'

// ── Configuración de la grilla ────────────────────────────────
const HOURS    = Array.from({ length: 10 }, (_, i) => i + 9)  // 09–18
const DAYS     = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function weekLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
  return `${fmt(monday)} – ${fmt(sunday)} ${sunday.getFullYear()}`
}

export function WeekView() {
  const { clinicId } = useAuth()
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()))
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [pendingTotal, setPendingTotal] = useState<Appointment[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{
    date: string; hour: number; appointment?: Appointment
  } | null>(null)
  const [toast, setToast]         = useState<string | null>(null)
  const [showPendingPanel, setShowPendingPanel] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    const from = weekStart.toISOString()
    const to = new Date(weekStart.getTime() + 7 * 86400000).toISOString()

    const { data: weekApts } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('scheduled_at', from)
      .lt('scheduled_at', to)
      .neq('status', 'cancelada')
      .order('scheduled_at')

    const { data: pendingApts } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'pendiente')
      .order('scheduled_at')

    setAppointments((weekApts as Appointment[]) ?? [])
    setPendingTotal((pendingApts as Appointment[]) ?? [])
    setLoading(false)
  }, [weekStart])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  function prevWeek() {
    setWeekStart((d) => {
      const n = new Date(d); n.setDate(n.getDate() - 7); return n
    })
  }
  function nextWeek() {
    setWeekStart((d) => {
      const n = new Date(d); n.setDate(n.getDate() + 7); return n
    })
  }
  function goToday() { setWeekStart(getMondayOf(new Date())) }

  function getApts(dayIndex: number, hour: number): Appointment[] {
    const cellDate = new Date(weekStart)
    cellDate.setDate(cellDate.getDate() + dayIndex)
    return appointments.filter((a) => {
      const d = new Date(a.scheduled_at)
      return (
        d.getFullYear() === cellDate.getFullYear() &&
        d.getMonth()    === cellDate.getMonth() &&
        d.getDate()     === cellDate.getDate() &&
        d.getHours()    === hour
      )
    })
  }

  function handleCellClick(dayIndex: number, hour: number, apt?: Appointment) {
    const cellDate = new Date(weekStart)
    cellDate.setDate(cellDate.getDate() + dayIndex)
    cellDate.setHours(hour, 0, 0, 0)
    const pad = (n: number) => String(n).padStart(2, '0');
    const localISO = `${cellDate.getFullYear()}-${pad(cellDate.getMonth() + 1)}-${pad(cellDate.getDate())}T${pad(cellDate.getHours())}:${pad(0)}`;
    
    setSelectedSlot({
      date: localISO,
      hour,
      appointment: apt
    })
    setShowModal(true)
  }

  function isToday(dayIndex: number): boolean {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + dayIndex)
    const now = new Date()
    return (
      d.getDate()     === now.getDate() &&
      d.getMonth()    === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    )
  }

  const todayCount = appointments.filter((a) => {
    const d = new Date(a.scheduled_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length

  return (
    <div className="flex bg-vet-bone h-full gap-5 overflow-hidden">
      
      {/* ── PANEL IZQUIERDO: CITAS PENDIENTES ───────────────────────── */}
      <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-pink-100 shadow-2xl transform transition-transform duration-300 md:relative md:translate-x-0 md:flex md:flex-col ${showPendingPanel ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-pink-50 bg-pink-50/30 flex justify-between items-center">
           <div>
             <h2 className="text-sm font-bold text-gray-800">Citas por Confirmar</h2>
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{pendingTotal.length} solicitudes</p>
           </div>
           <button onClick={() => setShowPendingPanel(false)} className="md:hidden text-gray-400">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {pendingTotal.length === 0 ? (
            <div className="text-center py-10">
              <span className="text-3xl block mb-2 opacity-20">📅</span>
              <p className="text-xs text-gray-400 italic">Sin pendientes</p>
            </div>
          ) : (
            pendingTotal.map(apt => (
              <div 
                key={apt.id} 
                onClick={() => {
                   setWeekStart(getMondayOf(new Date(apt.scheduled_at)))
                   handleCellClick(0, 0, apt)
                }}
                className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:border-vet-rose hover:ring-2 hover:ring-vet-rose/5 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-vet-rose bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100 uppercase">
                    {new Date(apt.scheduled_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">
                    {new Date(apt.scheduled_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-gray-900 group-hover:text-vet-rose transition-colors">{apt.pet_name}</h4>
                <p className="text-[10px] text-gray-500 font-medium truncate">{apt.service}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── CONTENIDO PRINCIPAL ────────────────────────────── */}
      <div className="flex-1 p-6 space-y-5 overflow-y-auto custom-scrollbar">
        {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">{toast}</div>}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-medium text-gray-900 flex items-center gap-2">
              Agenda semanal
              <button 
                onClick={() => setShowPendingPanel(!showPendingPanel)}
                className="md:hidden text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold"
              >
                ⚠️ {pendingTotal.length} Pendientes
              </button>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{weekLabel(weekStart)}</p>
          </div>

          <div className="flex items-center gap-2">
            <NavBtn onClick={prevWeek} label="‹" />
            <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium border border-pink-100 rounded-lg hover:bg-pink-50 text-pink-600">Hoy</button>
            <NavBtn onClick={nextWeek} label="›" />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={fetchAppointments} className="px-3 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs font-medium">🔄 Actualizar</button>
            <button onClick={() => { setSelectedSlot(null); setShowModal(true) }} className="bg-vet-rose text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-vet-dark transition-colors flex items-center gap-2 shadow-sm">
              <span className="text-lg">+</span> Nueva cita
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Citas hoy"       value={todayCount} />
          <StatCard label="Esta semana"     value={appointments.length} />
          <StatCard label="Telemedicina"    value={appointments.filter(a => a.service === 'Telemedicina').length} />
          <StatCard label="Desde portal"    value={appointments.filter(a => a.source === 'portal').length} />
        </div>

        <div className="bg-white border border-pink-100 rounded-xl overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48"><div className="animate-spin w-5 h-5 border-2 border-vet-rose border-t-transparent rounded-full" /></div>
          ) : (
            <table className="w-full text-xs border-collapse min-w-[640px]">
              <thead>
                <tr>
                  <th className="w-14 border-b border-r border-pink-100 bg-vet-light/30" />
                  {DAYS.map((day, i) => {
                    const d = new Date(weekStart); d.setDate(d.getDate() + i)
                    const today = isToday(i)
                    return (
                      <th key={day} className="border-b border-r border-pink-100 last:border-r-0 py-2 px-1 font-normal">
                        <div className="text-gray-400">{day}</div>
                        <div className={`text-base font-medium mt-0.5 mx-auto w-7 h-7 flex items-center justify-center rounded-full ${today ? 'bg-vet-rose text-white' : 'text-gray-900'}`}>
                          {d.getDate()}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour}>
                    <td className="border-r border-b border-pink-100 text-right pr-2 py-1 text-gray-400 align-top">{String(hour).padStart(2, '0')}:00</td>
                    {DAYS.map((_, dayIndex) => {
                      const cellApts = getApts(dayIndex, hour)
                      return (
                        <td key={dayIndex} onClick={() => handleCellClick(dayIndex, hour)} className="border-r border-b border-pink-100 last:border-r-0 min-h-[38px] p-1 align-top cursor-pointer hover:bg-vet-light/40 transition-colors">
                          {cellApts.map((apt) => (
                            <AptChip key={apt.id} apt={apt} onClick={(e) => { e.stopPropagation(); handleCellClick(dayIndex, hour, apt) }} />
                          ))}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex flex-wrap gap-3 px-4 py-2 border-t border-pink-100">
            {(Object.keys(SERVICE_META) as AppointmentService[]).map((svc) => (
              <span key={svc} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2.5 h-2.5 rounded-sm ${SERVICE_META[svc].bg} border-l-2 ${SERVICE_META[svc].border}`} />
                {svc}
              </span>
            ))}
          </div>
        </div>

        {showModal && (
          <AppointmentModal
            initialDateTime={selectedSlot?.date}
            editingAppointment={selectedSlot?.appointment}
            onClose={() => setShowModal(false)}
            onSaved={(petName) => {
              setShowModal(false)
              showToast(`✓ Cita de ${petName} guardada`)
              fetchAppointments()
            }}
          />
        )}
      </div>
    </div>
  )
}

function AptChip({ apt, onClick }: { apt: Appointment, onClick?: (e: React.MouseEvent) => void }) {
  const meta = SERVICE_META[apt.service] ?? SERVICE_META['Consulta General']
  const isPending = apt.status === 'pendiente'
  return (
    <div onClick={onClick} className={`${meta.bg} ${meta.color} border-l-2 ${meta.border} rounded px-2 py-1 mb-1 text-[11px] font-semibold truncate cursor-pointer hover:brightness-95 transition-all ${isPending ? 'border-dashed opacity-75 ring-1 ring-vet-rose ring-offset-1' : ''}`} title={`${apt.pet_name} · ${apt.service} · ${formatTime(apt.scheduled_at)} ${isPending ? '(PENDIENTE)' : ''}`}>
      <div className="flex items-center gap-1">
        {isPending && <span className="text-[10px] animate-pulse">⏳</span>}
        <span className="truncate">{apt.pet_name}</span>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-pink-100 rounded-xl p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-medium text-gray-900 leading-none">{value}</p>
    </div>
  )
}

function NavBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="w-8 h-8 flex items-center justify-center border border-pink-200 rounded-lg text-vet-rose hover:bg-vet-light transition-colors text-base">{label}</button>
  )
}
