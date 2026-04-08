// ============================================================
// VetCare Manager — Módulo 2: VaccineDashboard
//
// Muestra el panel de control de vacunas:
//   • Estadísticas rápidas
//   • Banner de alertas urgentes
//   • Tabla ordenada por urgencia con acción de email
//   • Formulario de registro de nueva vacuna
// ============================================================

import { useState, useMemo } from 'react'
import { useVaccineAlerts } from './useVaccineAlerts'
import { VaccineForm } from './VaccineForm'
import {
  formatDate,
  daysLeftLabel,
  speciesEmoji,
} from '../../lib/utils'
import type { VaccineStatus } from '../../types'

// ── Badge de estado ───────────────────────────────────────────
const STATUS_STYLES: Record<VaccineStatus, { badge: string; dot: string; text: string }> = {
  urgente: {
    badge: 'bg-red-100 text-red-800',
    dot:   'bg-red-500',
    text:  'Urgente',
  },
  vencida: {
    badge: 'bg-red-100 text-red-800',
    dot:   'bg-red-500',
    text:  'Vencida',
  },
  proxima: {
    badge: 'bg-amber-100 text-amber-800',
    dot:   'bg-amber-400',
    text:  'Por vencer',
  },
  vigente: {
    badge: 'bg-green-100 text-green-800',
    dot:   'bg-green-500',
    text:  'Vigente',
  },
}

export function VaccineDashboard() {
  const {
    alerts,
    urgentAlerts,
    upcomingAlerts,
    loading,
    error,
    sendReminder,
    deleteVaccination,
    refresh,
  } = useVaccineAlerts()

  const [showForm, setShowForm] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAlerts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return alerts
    return alerts.filter(a => 
      a.patient.name.toLowerCase().includes(q) || 
      a.guardian.name.toLowerCase().includes(q)
    )
  }, [alerts, searchQuery])

  // Muestra un toast durante 2.5s
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Envía recordatorio individual
  async function handleSendReminder(vaccinationId: string, guardianName: string) {
    setSendingId(vaccinationId)
    const { error: err } = await sendReminder(vaccinationId)
    setSendingId(null)
    if (err) showToast('❌ Error al enviar: ' + err)
    else showToast(`✉️ Recordatorio enviado a ${guardianName}`)
  }

  // Envía recordatorios masivos a alertas urgentes
  async function handleBulkReminders() {
    for (const alert of urgentAlerts) {
      await sendReminder(alert.vaccination.id)
    }
    showToast(`✉️ ${urgentAlerts.length} recordatorios enviados`)
  }

  // Construye el link de WhatsApp Web con mensaje pre-llenado
  function buildWhatsAppUrl(alert: typeof alerts[0]) {
    const petName      = alert.patient.name
    const guardianName = alert.guardian.name
    const vaccineName  = alert.vaccination.vaccine_name
    const phone        = alert.guardian.phone?.replace(/[^0-9]/g, '') // solo dígitos
    const rawDate      = alert.vaccination.next_due_date
    const formattedDate = new Date(rawDate + 'T12:00:00').toLocaleDateString('es-CL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    const msg = `Hola ${guardianName},

Te contactamos desde *VetCare - Sofía Cáceres, Médica Veterinaria* para recordarte que se acerca la fecha de refuerzo de vacuna de *${petName}*.

Cumplir con los plazos de vacunación es fundamental para mantener a tu compañero/a completamente protegido/a.

----------------------------
*DETALLES DE LA VACUNACION*
----------------------------
Mascota: *${petName}*
Vacuna: *${vaccineName}*
Fecha sugerida: *${formattedDate}*
----------------------------

*Horario de atencion:*
Martes y Miercoles de 10:00 a 16:00 hrs
Sabado y Domingo de 10:00 a 14:00 hrs

Para agendar o reprogramar tu cita puedes responder este mensaje o llamarnos al *+56951045611*

Atentamente,
*Sofía Cáceres Alzamora*
Médica Veterinaria`

    const encoded = encodeURIComponent(msg)
    if (!phone) return null
    return `https://wa.me/${phone}?text=${encoded}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-vet-rose border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-red-600 text-sm">
        Error cargando vacunas: {error}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">

      {/* Toast de notificación */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm
                        px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* ── Encabezado ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Vacunas y notificaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Panel de control · {alerts.length} registros totales
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
              placeholder="Buscar paciente o tutor..."
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
            Registrar vacuna
          </button>
        </div>
      </div>

      {/* ── Estadísticas ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Urgentes"
          value={urgentAlerts.length}
          sub="Vencen esta semana"
          valueColor={urgentAlerts.length > 0 ? 'text-red-700' : 'text-gray-900'}
          borderColor="border-red-200"
        />
        <StatCard
          label="Por vencer"
          value={upcomingAlerts.length}
          sub="Próximas 2 semanas"
          valueColor={upcomingAlerts.length > 0 ? 'text-amber-700' : 'text-gray-900'}
          borderColor="border-amber-200"
        />
        <StatCard
          label="Vigentes"
          value={alerts.filter(a => a.status === 'vigente').length}
          sub="Al día"
        />
        <StatCard
          label="Total registros"
          value={alerts.length}
          sub="Historial completo"
        />
      </div>

      {/* ── Banner de alertas urgentes ────────────────────────── */}
      {urgentAlerts.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200
                        rounded-xl">
          <div className="w-9 h-9 bg-amber-400 rounded-lg flex items-center
                          justify-center flex-shrink-0 text-white text-base">
            ⚠️
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              {urgentAlerts.length} vacuna{urgentAlerts.length > 1 ? 's' : ''} requieren
              atención inmediata
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {urgentAlerts
                .map(a => `${a.patient.name} — ${a.vaccination.vaccine_name}`)
                .join(' · ')}
            </p>
          </div>
          <button
            onClick={handleBulkReminders}
            className="flex-shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs
                       font-medium rounded-lg hover:bg-amber-600 transition-colors"
          >
            Enviar recordatorios
          </button>
        </div>
      )}

      {/* ── Tabla de vacunas ──────────────────────────────────── */}
      <div className="bg-white border border-pink-100 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3
                        border-b border-pink-100">
          <h2 className="text-sm font-medium text-gray-900">
            Panel de vacunas — ordenado por urgencia
          </h2>
          <span className="text-xs text-gray-400">{filteredAlerts.length} {filteredAlerts.length === 1 ? 'registro' : 'registros'}</span>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {searchQuery ? 'No se encontraron vacunas con esa búsqueda' : 'Sin vacunas registradas. Agrega la primera arriba.'}
          </div>
        ) : (
          <div className="divide-y divide-pink-50">
            {filteredAlerts.map((alert) => {
              const s = STATUS_STYLES[alert.status]
              return (
                <div
                  key={alert.vaccination.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-pink-50/40
                             transition-colors"
                >
                  {/* Avatar especie */}
                  <div className="w-9 h-9 rounded-lg bg-vet-light flex items-center
                                  justify-center text-lg flex-shrink-0">
                    {speciesEmoji(alert.patient.species)}
                  </div>

                  {/* Info paciente */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {alert.patient.name}
                      <span className="font-normal text-gray-400">
                        {' '}· {alert.patient.breed}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {alert.vaccination.vaccine_name} · Lote {alert.vaccination.lot_number}
                    </p>
                    <p className="text-xs text-vet-rose mt-0.5">
                      {alert.guardian.name} · {alert.guardian.email}
                    </p>
                  </div>

                  {/* Fechas */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className={`text-xs font-medium ${
                      alert.status === 'urgente' || alert.status === 'vencida'
                        ? 'text-red-700'
                        : alert.status === 'proxima'
                        ? 'text-amber-700'
                        : 'text-gray-600'
                    }`}>
                      {daysLeftLabel(alert.vaccination.next_due_date)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(alert.vaccination.next_due_date)}
                    </p>
                  </div>

                  {/* Badge estado */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5
                                   rounded-full text-xs font-medium ${s.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.text}
                  </span>

                  {/* Botón email */}
                  <button
                    onClick={() =>
                      handleSendReminder(alert.vaccination.id, alert.guardian.name)
                    }
                    disabled={sendingId === alert.vaccination.id || alert.vaccination.reminder_sent}
                    title={
                      alert.vaccination.reminder_sent
                        ? 'Recordatorio ya enviado'
                        : 'Enviar recordatorio por email'
                    }
                    className="w-7 h-7 flex items-center justify-center border
                               border-pink-200 rounded-lg bg-white text-vet-rose
                               hover:bg-vet-light disabled:opacity-40 disabled:cursor-not-allowed
                               transition-colors flex-shrink-0"
                  >
                    {sendingId === alert.vaccination.id ? (
                      <div className="w-3 h-3 border border-vet-rose border-t-transparent
                                      rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
                           stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    )}
                  </button>
                  {/* Botón WhatsApp */}
                  {(() => {
                    const waUrl = buildWhatsAppUrl(alert)
                    return waUrl ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Enviar recordatorio por WhatsApp"
                        className="w-7 h-7 flex items-center justify-center border
                                   border-green-200 rounded-lg bg-green-50 text-green-600
                                   hover:bg-green-100 transition-colors flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
                    ) : null
                  })()}

                  {/* Botón Borrar */}
                  <button
                    onClick={() => {
                        if (window.confirm('¿Está seguro de ELIMINAR permanentemente esta vacuna? Su tutor dejará de recibir alertas.')) {
                            deleteVaccination(alert.vaccination.id).then((res) => {
                                if (!res.error) showToast('🗑️ Vacuna eliminada con éxito')
                            })
                        }
                    }}
                    title="Eliminar vacuna"
                    className="w-7 h-7 flex items-center justify-center border
                               border-red-100 rounded-lg bg-red-50 text-red-500
                               hover:bg-red-100 transition-colors flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal: registrar vacuna ───────────────────────────── */}
      {showForm && (
        <VaccineForm
          onClose={() => setShowForm(false)}
          onSaved={(patName) => {
            setShowForm(false)
            showToast(`✓ Vacuna registrada para ${patName}`)
            refresh()
          }}
        />
      )}
    </div>
  )
}

// ── Sub-componente: tarjeta de estadística ────────────────────
function StatCard({
  label,
  value,
  sub,
  valueColor = 'text-gray-900',
  borderColor = 'border-pink-100',
}: {
  label: string
  value: number
  sub: string
  valueColor?: string
  borderColor?: string
}) {
  return (
    <div className={`bg-white border ${borderColor} rounded-xl p-3`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-medium leading-none ${valueColor}`}>{value}</p>
      <p className="text-xs text-vet-rose mt-1.5">{sub}</p>
    </div>
  )
}
