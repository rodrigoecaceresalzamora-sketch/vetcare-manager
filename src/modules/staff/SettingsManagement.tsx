import { useState, useEffect } from 'react'
import { useClinicConfig } from '../../contexts/ClinicConfigContext'
import { useAuth } from '../../contexts/AuthContext'
import type { ClinicConfig } from '../../types'

export function SettingsManagement() {
  const { config, loading, updateConfig } = useClinicConfig()
  const { clinicId } = useAuth()
  const [localConfig, setLocalConfig] = useState<Partial<ClinicConfig>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'general' | 'horarios' | 'finanzas' | 'mensajes' | 'email' | 'portal'>('general')
  const [scheduleInputs, setScheduleInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    if (config) {
      setLocalConfig({
        ...config,
        wa_template_reminder: config.wa_template_reminder || 'Hola {tutor}, te recordamos la vacuna de {mascota} ({vacuna}) para el día {fecha} en {direccion}.',
        wa_template_confirmation: config.wa_template_confirmation || '¡Hola {tutor}! Tu cita para {mascota} el día {fecha} a las {hora} ha sido registrada. ¡Te esperamos!',
        wa_template_cancellation: config.wa_template_cancellation || 'Hola {tutor}, lamentamos informarte que tu cita para {mascota} el día {fecha} ha sido cancelada.',
        wa_template_rescheduled: config.wa_template_rescheduled || 'Hola {tutor}, tu cita para {mascota} ha sido reprogramada para el día {fecha} a las {hora}.',
        email_subject_booking: config.email_subject_booking || 'Confirmación de Cita - VetCare',
        email_body_booking: config.email_body_booking || 'Hola {tutor}, tu cita para {mascota} ha sido recibida correctamente para el día {fecha} a las {hora}.',
        email_subject_reminder: config.email_subject_reminder || 'Recordatorio de Vacunación - VetCare',
        email_body_reminder: config.email_body_reminder || 'Hola {tutor}, te recordamos que se acerca el refuerzo de la vacuna {vacuna} para {mascota}. Fecha sugerida: {fecha}.',
        email_subject_cancellation: config.email_subject_cancellation || 'Cita Cancelada - VetCare',
        email_body_cancellation: config.email_body_cancellation || 'Hola {tutor}, tu cita para {mascota} programada para el día {fecha} ha sido cancelada. Si tienes dudas, contáctanos.',
        email_subject_rescheduled: config.email_subject_rescheduled || 'Cita Reprogramada - VetCare',
        email_body_rescheduled: config.email_body_rescheduled || 'Hola {tutor}, te informamos que tu cita para {mascota} ha sido movida al día {fecha} a las {hora}.'
      })
      
      const initialInputs: Record<string, string> = {}
      if (config.schedule) {
        Object.keys(config.schedule).forEach(day => {
          initialInputs[day] = (config.schedule as any)[day].join(', ')
        })
      }
      setScheduleInputs(initialInputs)
    }
  }, [config])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = async () => {
    setSaving(true)
    const success = await updateConfig(localConfig)
    setSaving(false)
    if (success) {
      showToast('✅ Configuración actualizada con éxito')
    } else {
      showToast('❌ Error al guardar los cambios')
    }
  }

  const set = (key: keyof ClinicConfig, val: any) => {
    setLocalConfig(prev => ({ ...prev, [key]: val }))
  }

  if (loading) return <div className="p-10 text-center animate-pulse text-gray-400 font-medium whitespace-pre">Cargando...</div>
  
  if (!config && !clinicId) return (
    <div className="p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100 italic text-2xl">⚙️</div>
      <h2 className="text-xl font-black text-gray-900 mb-2">Configuración Inicial</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-8">Parece que tu clínica aún no tiene un perfil configurado. Dale al botón de abajo para empezar.</p>
      <button 
        onClick={() => handleSave()}
        className="px-8 py-4 bg-vet-rose text-white font-black rounded-2xl shadow-xl shadow-vet-rose/20 hover:scale-[1.02] transition-all"
      >
        Crear Perfil de Clínica ✨
      </button>
    </div>
  )

  const bookingUrl = `${window.location.origin}/c/${clinicId || config?.clinic_id}`

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in font-sans">
      {/* Header y Link de Agendamiento */}
      <div className="bg-gray-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-gray-900/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-vet-rose/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-md">
            <h2 className="text-3xl font-black mb-3 leading-tight tracking-tight">Comparte tu portal<br/>para agendar</h2>
            <p className="text-gray-400 text-sm font-medium leading-relaxed">Envía este link corto a tus clientes para que agenden sus consultas directamente sin complicaciones.</p>
          </div>
          
          <div className="flex-1 max-w-xl">
            <div className="bg-white/10 backdrop-blur-md rounded-[2.5rem] p-6 border border-white/10">
              <div className="bg-gray-800/50 rounded-2xl px-5 py-4 border border-white/5 mb-4 font-mono text-xs text-pink-300 break-all select-all">
                {bookingUrl}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(bookingUrl)
                  showToast('📋 Link copiado al portapapeles')
                }}
                className="w-full py-4 bg-white text-gray-900 font-black rounded-2xl hover:bg-vet-pink transition-all flex items-center justify-center gap-2 group shadow-xl shadow-white/5 active:scale-95"
              >
                Copiar Link de Agendamiento ✨
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-[9999] bg-gray-900 text-white text-sm px-6 py-3 rounded-2xl shadow-2xl animate-fade-in border border-white/10 flex items-center gap-2 font-bold">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="p-2 bg-vet-pink/10 rounded-xl">⚙️</span>
            Configuración Global
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Personaliza la identidad, horarios y mensajes de tu clínica.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-vet-rose text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-vet-rose/20 hover:bg-vet-dark transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? 'Guardando...' : '💾 Guardar cambios'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/50 p-1.5 rounded-2xl border border-gray-100 backdrop-blur-sm sticky top-4 z-30">
        <TabBtn active={activeTab === 'general'}  onClick={() => setActiveTab('general')}  label="General" icon="🏥" />
        <TabBtn active={activeTab === 'portal'}   onClick={() => setActiveTab('portal')}   label="Portal Tutor" icon="🎨" />
        <TabBtn active={activeTab === 'horarios'} onClick={() => setActiveTab('horarios')} label="Horarios" icon="⏰" />
        <TabBtn active={activeTab === 'finanzas'} onClick={() => setActiveTab('finanzas')} label="Pagos & Abono" icon="💰" />
        <TabBtn active={activeTab === 'mensajes'} onClick={() => setActiveTab('mensajes')} label="Mensajes WA" icon="📱" />
        <TabBtn active={activeTab === 'email'}    onClick={() => setActiveTab('email')}    label="Mensajes Email" icon="✉️" />
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
        {activeTab === 'general' && (
          <div className="p-8 space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="space-y-4">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest border-b pb-2">Información de la Clínica</h3>
                <Input label="Nombre de la Veterinaria" value={localConfig.clinic_name} onChange={v => set('clinic_name', v)} />
                <Input label="Teléfono de Contacto" value={localConfig.contact_phone} onChange={v => set('contact_phone', v)} />
                <Input label="Correo Electrónico" value={localConfig.contact_email} onChange={v => set('contact_email', v)} />
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest border-b pb-2">Ubicación</h3>
                <Input label="Dirección Física" value={localConfig.address} onChange={v => set('address', v)} />
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Google Maps Embed URL</label>
                <textarea 
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-vet-rose/20"
                  rows={3}
                  value={localConfig.google_maps_embed_url}
                  onChange={e => set('google_maps_embed_url', e.target.value)}
                  placeholder="<iframe ...></iframe>"
                />
              </section>
            </div>
          </div>
        )}

        {activeTab === 'portal' && (
          <div className="p-8 space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="space-y-4">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest border-b pb-2">Identidad del Portal (Personalización)</h3>
                <p className="text-xs text-gray-500 mb-4">Estos ajustes afectan al portal que ven los tutores al reservar y ver sus mascotas.</p>
                
                <Input label="Logo de la Clínica (URL)" value={localConfig.clinic_logo_url || ''} onChange={v => set('clinic_logo_url', v)} placeholder="https://..." />
                
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-xs font-bold text-gray-500 mb-1.5 block">Color de Marca</label>
                     <p className="text-[9px] text-gray-400 mb-2 uppercase font-bold tracking-tight">Botones y destacados</p>
                     <div className="flex gap-2 items-center">
                        <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border-0 shadow-sm" value={localConfig.primary_color} onChange={e => set('primary_color', e.target.value)} />
                        <span className="text-xs font-mono text-gray-400">{localConfig.primary_color}</span>
                     </div>
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 mb-1.5 block">Color de Fondo Portal</label>
                     <p className="text-[9px] text-gray-400 mb-2 uppercase font-bold tracking-tight">Fondo del sitio</p>
                     <div className="flex gap-2 items-center">
                        <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border-0 shadow-sm" value={localConfig.secondary_color} onChange={e => set('secondary_color', e.target.value)} />
                        <span className="text-xs font-mono text-gray-400">{localConfig.secondary_color}</span>
                     </div>
                   </div>
                </div>

                <div className="p-6 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 flex flex-col items-center justify-center gap-4 mt-6">
                   <div className="text-center">
                      <div className="w-20 h-20 rounded-2xl bg-white shadow-xl flex items-center justify-center p-2 mb-3 border border-gray-100 ring-4 ring-white">
                        <img src={localConfig.clinic_logo_url || '/logo.png'} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                      </div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Logo Portal</p>
                   </div>
                   <div className="w-full space-y-3">
                      <div className="h-2 rounded-full w-full" style={{ backgroundColor: localConfig.primary_color }}></div>
                      <div className="h-10 rounded-2xl w-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: localConfig.primary_color, color: 'white' }}>BOTÓN DE EJEMPLO</div>
                   </div>
                </div>
              </section>

              <section className="p-8 bg-gray-900 rounded-[2.5rem] text-white flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-vet-rose/20 rounded-full blur-2xl -mr-16 -mt-16"></div>
                
                <h4 className="text-sm font-black uppercase tracking-widest text-pink-400 mb-6">Tu QR de Agendamiento</h4>
                
                <div className="bg-white p-4 rounded-3xl shadow-2xl mb-6 ring-4 ring-white/10">
                   {/* QR Placeholder using a simple service */}
                   <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(bookingUrl)}`} 
                    alt="QR Code" 
                    className="w-32 h-32"
                   />
                </div>

                <p className="text-xs text-gray-400 leading-relaxed font-medium mb-6">
                  Descarga o imprime este código QR y colócalo en tu clínica para que tus clientes agenden escaneándolo con su celular.
                </p>
                
                <button 
                  onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(bookingUrl)}`, '_blank')}
                  className="px-6 py-3 bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                >
                  Descargar QR Grande 📥
                </button>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'horarios' && (
          <div className="p-8 space-y-6 animate-fade-in">
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 text-amber-800 text-xs mb-4">
               <span className="text-lg">💡</span>
               <p>Marca qué días atiendes y selecciona los bloques de tiempo. Los pacientes solo verán estos horarios al reservar.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {[1,2,3,4,5,6,0].map(day => {
                  const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][day]
                  const slots = localConfig.schedule?.[String(day)] || []
                  const isOpen = slots.length > 0

                  return (
                    <div key={day} className={`p-4 rounded-2xl border ${isOpen ? 'border-primary-100 bg-primary-50/10' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                       <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-gray-900">{dayName}</span>
                          <button 
                            onClick={() => {
                              const newSchedule = { ...(localConfig.schedule || {}) }
                              if (isOpen) delete newSchedule[String(day)]
                              else newSchedule[String(day)] = ['10:00', '11:00', '12:00']
                              set('schedule', newSchedule)
                            }}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${isOpen ? 'bg-vet-rose text-white' : 'bg-gray-200 text-gray-500'}`}
                          >
                            {isOpen ? 'Abierto' : 'Cerrado'}
                          </button>
                       </div>
                       
                       {isOpen && (
                         <div className="space-y-2">
                           <textarea 
                             className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl font-mono"
                             placeholder="Ej: 10:00, 11:00, 15:00"
                             value={scheduleInputs[String(day)] || ''}
                             onChange={(e) => {
                               const val = e.target.value
                               setScheduleInputs(prev => ({ ...prev, [String(day)]: val }))
                               const newSlots = val.split(',').map(s => s.trim()).filter(s => s.length > 0)
                               const newSchedule = { ...(localConfig.schedule || {}), [String(day)]: newSlots }
                               set('schedule', newSchedule)
                             }}
                           />
                         </div>
                       )}
                    </div>
                  )
               })}
            </div>
          </div>
        )}

        {activeTab === 'finanzas' && (
          <div className="p-8 space-y-8 animate-fade-in">
             <section className="space-y-6">
                <div className="flex items-center justify-between gap-10 bg-vet-rose/5 p-6 rounded-3xl border border-vet-rose/10">
                   <div>
                      <h3 className="text-base font-black text-gray-900">Porcentaje de Abono</h3>
                      <p className="text-xs text-gray-500 mt-1">Define cuánto debe transferir el paciente para confirmar la cita.</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        className="w-24 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-center font-black text-xl text-vet-rose"
                        value={localConfig.advance_payment_percentage} 
                        min="0"
                        max="100"
                        onChange={e => set('advance_payment_percentage', parseInt(e.target.value) || 0)} 
                      />
                      <span className="text-xl font-black text-gray-400">%</span>
                   </div>
                </div>

                <div>
                   <label className="text-sm font-black text-gray-900 mb-2 block">🏦 Datos de Transferencia</label>
                   <p className="text-xs text-gray-500 mb-3">Esta información se mostrará al finalizar la reserva si el abono es mayor a 0%.</p>
                   <textarea 
                     className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-3xl text-sm font-mono focus:ring-2 focus:ring-vet-rose/20 outline-none"
                     rows={6}
                     value={localConfig.transfer_details}
                     onChange={e => set('transfer_details', e.target.value)}
                     placeholder="NOMBRE: ...\nRUT: ..."
                   />
                </div>
             </section>
          </div>
        )}

        {activeTab === 'mensajes' && (
          <div className="p-8 space-y-8 animate-fade-in">
             <section className="space-y-6">
                <div>
                   <label className="text-sm font-black text-gray-900 mb-1 block">📱 Recordatorio de Vacuna (WhatsApp)</label>
                   <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-3">Placeholders: {"{mascota}"}, {"{tutor}"}, {"{vacuna}"}, {"{fecha}"}, {"{direccion}"}</p>
                   <textarea 
                     className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-3xl text-sm focus:ring-2 focus:ring-vet-rose/20 outline-none"
                     rows={4}
                     value={localConfig.wa_template_reminder}
                     onChange={e => set('wa_template_reminder', e.target.value)}
                   />
                </div>

                 <div>
                    <label className="text-sm font-black text-gray-900 mb-1 block">✅ Confirmación de Cita (WhatsApp)</label>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-3">Placeholders: {"{mascota}"}, {"{tutor}"}, {"{fecha}"}, {"{hora}"}</p>
                    <textarea 
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-3xl text-sm focus:ring-2 focus:ring-vet-rose/20 outline-none"
                      rows={4}
                      value={localConfig.wa_template_confirmation}
                      onChange={e => set('wa_template_confirmation', e.target.value)}
                    />
                 </div>

                 <div className="pt-6 border-t border-gray-100">
                    <label className="text-sm font-black text-gray-900 mb-1 block">❌ Cancelación de Cita (WhatsApp)</label>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-3">Placeholders: {"{mascota}"}, {"{tutor}"}, {"{fecha}"}</p>
                    <textarea 
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-3xl text-sm focus:ring-2 focus:ring-vet-rose/20 outline-none"
                      rows={4}
                      value={localConfig.wa_template_cancellation}
                      onChange={e => set('wa_template_cancellation', e.target.value)}
                    />
                 </div>

                 <div className="pt-6 border-t border-gray-100">
                    <label className="text-sm font-black text-gray-900 mb-1 block">🕒 Reprogramación de Cita (WhatsApp)</label>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-3">Placeholders: {"{mascota}"}, {"{tutor}"}, {"{fecha}"}, {"{hora}"}</p>
                    <textarea 
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-3xl text-sm focus:ring-2 focus:ring-vet-rose/20 outline-none"
                      rows={4}
                      value={localConfig.wa_template_rescheduled}
                      onChange={e => set('wa_template_rescheduled', e.target.value)}
                    />
                 </div>
             </section>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="p-8 space-y-8 animate-fade-in">
             <section className="space-y-8">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 text-blue-800 text-xs">
                   <span className="text-lg">✉️</span>
                   <div>
                     <p className="font-bold">Personalización de Correos (Gmail)</p>
                     <p className="mt-1">Aquí puedes configurar los asuntos y el contenido de los correos automáticos que el sistema envía.</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <h3 className="text-sm font-black text-gray-900 border-l-4 border-blue-400 pl-3">Confirmación de Reserva</h3>
                   <Input label="Asunto del Email" value={localConfig.email_subject_booking} onChange={v => set('email_subject_booking', v)} />
                   <label className="text-xs font-bold text-gray-500 mb-1 block">Cuerpo del Email</label>
                   <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-2">Placeholders: {"{mascota}"}, {"{tutor}"}, {"{fecha}"}, {"{hora}"}</p>
                   <textarea 
                     className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-3xl text-sm focus:ring-2 focus:ring-vet-rose/20 outline-none"
                     rows={5}
                     value={localConfig.email_body_booking}
                     onChange={e => set('email_body_booking', e.target.value)}
                   />
                </div>

                 <div className="space-y-4 pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-black text-gray-900 border-l-4 border-amber-400 pl-3">Recordatorio de Vacuna</h3>
                    <Input label="Asunto del Email" value={localConfig.email_subject_reminder} onChange={v => set('email_subject_reminder', v)} />
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Cuerpo del Email</label>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-2">Placeholders: {"{mascota}"}, {"{tutor}"}, {"{vacuna}"}, {"{fecha}"}</p>
                    <textarea 
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-3xl text-sm focus:ring-2 focus:ring-vet-rose/20 outline-none"
                      rows={5}
                      value={localConfig.email_body_reminder}
                      onChange={e => set('email_body_reminder', e.target.value)}
                    />
                 </div>

                 <div className="space-y-4 pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-black text-gray-900 border-l-4 border-red-400 pl-3">Cancelación de Cita</h3>
                    <Input label="Asunto del Email" value={localConfig.email_subject_cancellation} onChange={v => set('email_subject_cancellation', v)} />
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Cuerpo del Email</label>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-2">Placeholders: {"{mascota}"}, {"{tutor}"}, {"{fecha}"}</p>
                    <textarea 
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-3xl text-sm focus:ring-2 focus:ring-vet-rose/20 outline-none"
                      rows={5}
                      value={localConfig.email_body_cancellation}
                      onChange={e => set('email_body_cancellation', e.target.value)}
                    />
                 </div>

                 <div className="space-y-4 pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-black text-gray-900 border-l-4 border-purple-400 pl-3">Reprogramación de Cita</h3>
                    <Input label="Asunto del Email" value={localConfig.email_subject_rescheduled} onChange={v => set('email_subject_rescheduled', v)} />
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Cuerpo del Email</label>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-2">Placeholders: {"{mascota}"}, {"{tutor}"}, {"{fecha}"}, {"{hora}"}</p>
                    <textarea 
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-3xl text-sm focus:ring-2 focus:ring-vet-rose/20 outline-none"
                      rows={5}
                      value={localConfig.email_body_rescheduled}
                      onChange={e => set('email_body_rescheduled', e.target.value)}
                    />
                 </div>
             </section>
          </div>
        )}
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-4 py-2 sm:py-3 rounded-xl transition-all font-bold text-[10px] sm:text-sm
                 ${active ? 'bg-white text-vet-rose shadow-md ring-1 ring-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
    >
      <span className="text-base">{icon}</span>
      <span className="leading-tight text-center">{label}</span>
    </button>
  )
}

function Input({ label, value, onChange, placeholder = '' }: { label: string; value: any; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 mb-1.5 block">{label}</label>
      <input
        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-vet-rose/20 placeholder-gray-300"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}
