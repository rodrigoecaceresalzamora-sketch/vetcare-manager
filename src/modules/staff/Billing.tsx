import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { STRIPE_PLANS } from '../../lib/stripe'

export function Billing() {
  const { clinicId, planType, isPaid } = useAuth()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Simulación de checkout para el demo
  async function handleUpgrade(planName: string, amount: number) {
    setLoading(true)
    
    // En un entorno real, aquí llamaríamos a una Edge Function que cree un Stripe Checkout Session
    // const { data } = await supabase.functions.invoke('create-checkout-session', { body: { planName, clinicId } })
    // window.location.href = data.url
    
    // SIMULACIÓN: Esperamos 2 segundos y actualizamos la DB
    setTimeout(async () => {
      const { error } = await supabase
        .from('clinics')
        .update({ 
          plan_type: planName.toLowerCase().includes('pro') ? 'pro' : 'basic',
          is_paid: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', clinicId)

      setLoading(false)
      if (!error) {
        setSuccess(true)
        // Forzamos un refresh de la página tras 2 segundos para actualizar el AuthContext
        setTimeout(() => window.location.reload(), 2000)
      }
    }, 2000)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Planes y Facturación</h1>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest">
            Gestiona tu suscripción a VetCare SaaS
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-pink-100 shadow-sm">
          <span className="text-xs text-gray-500 font-medium">Estado actual:</span>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
            isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {isPaid ? 'Suscripción Activa' : 'Pendiente de Pago'}
          </span>
          <span className="px-3 py-1 bg-vet-rose text-white rounded-full text-[10px] font-black uppercase tracking-wider">
            Plan {planType?.toUpperCase()}
          </span>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-2xl flex items-center gap-3 animate-bounce shadow-lg">
          <span className="text-xl">🎉</span>
          <p className="text-sm font-bold">¡Pago procesado con éxito! Tu cuenta se está actualizando...</p>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        
        {/* Plan Básico */}
        <div className={`relative bg-white border-2 rounded-3xl p-8 transition-all hover:shadow-xl ${
          planType === 'basic' ? 'border-vet-rose' : 'border-gray-100'
        }`}>
          {planType === 'basic' && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-vet-rose text-white px-4 py-1 rounded-full text-[10px] font-black uppercase">
              Tu Plan Actual
            </div>
          )}
          <h3 className="text-xl font-black text-gray-900 mb-2">{STRIPE_PLANS.BASIC.name}</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-black text-gray-900">${STRIPE_PLANS.BASIC.price.toLocaleString()}</span>
            <span className="text-gray-400 text-sm font-medium">/ mes</span>
          </div>
          
          <ul className="space-y-4 mb-8">
            <PlanFeature label="Hasta 2 Administradores" />
            <PlanFeature label="Hasta 5 Ayudantes" />
            <PlanFeature label="Agenda Completa" />
            <PlanFeature label="Fichas de Pacientes" />
            <PlanFeature label="Soporte por Email" />
          </ul>

          <button 
            disabled={planType === 'basic' || loading}
            onClick={() => handleUpgrade('Basic', STRIPE_PLANS.BASIC.price)}
            className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
              planType === 'basic' 
                ? 'bg-gray-100 text-gray-400 cursor-default' 
                : 'bg-white border-2 border-vet-rose text-vet-rose hover:bg-vet-light'
            }`}
          >
            {planType === 'basic' ? 'Suscrito' : 'Cambiar a Básico'}
          </button>
        </div>

        {/* Plan Pro */}
        <div className={`relative bg-gray-900 border-2 rounded-3xl p-8 transition-all hover:shadow-2xl hover:-translate-y-1 ${
          planType === 'pro' ? 'border-vet-rose shadow-xl' : 'border-gray-800'
        }`}>
           <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
            Recomendado
          </div>
          
          <h3 className="text-xl font-black text-white mb-2">{STRIPE_PLANS.PRO.name}</h3>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-4xl font-black text-white">${STRIPE_PLANS.PRO.price.toLocaleString()}</span>
            <span className="text-gray-500 text-sm font-medium">/ mes</span>
          </div>
          <p className="text-[10px] text-vet-rose font-bold mb-6 uppercase tracking-widest">Acceso Ilimitado Total</p>
          
          <ul className="space-y-4 mb-8">
            <PlanFeature label="Administradores Ilimitados" isDark />
            <PlanFeature label="Ayudantes Ilimitados" isDark />
            <PlanFeature label="Gestión de Stock Avanzada" isDark />
            <PlanFeature label="Estadísticas y Reportes" isDark />
            <PlanFeature label="Recordatorios Automáticos" isDark />
            <PlanFeature label="Soporte Prioritario 24/7" isDark />
          </ul>

          <button 
             disabled={loading}
             onClick={() => handleUpgrade('Pro', STRIPE_PLANS.PRO.price)}
             className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
              planType === 'pro' && isPaid
                ? 'bg-green-500/10 text-green-400 border-2 border-green-500/20 shadow-none' 
                : 'bg-white text-gray-900 hover:bg-gray-100 shadow-xl shadow-white/5 active:scale-95'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                <span>Procesando...</span>
              </div>
            ) : (planType === 'pro' && isPaid ? 'Plan Activo' : 'Mejorar a Pro Ahora')}
          </button>
        </div>
      </div>

      {/* Payout Information (Información para el usuario) */}
      <div className="bg-vet-bone/50 border border-pink-100 rounded-3xl p-8 mt-12 flex flex-col md:flex-row items-center gap-8">
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-pink-100 flex-shrink-0">
          <svg className="w-10 h-10 text-vet-rose" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20m0-20H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-6z" />
          </svg>
        </div>
        <div>
          <h4 className="font-black text-gray-900 uppercase tracking-tight mb-2">¿Cómo llega el dinero a tu cuenta?</h4>
          <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
            Al integrar Stripe, el dinero de las suscripciones de tus clientes se acumula en tu balance de Stripe. 
            Puedes configurar transferencias automáticas a tu cuenta bancaria (CLP) desde el panel de control de Stripe, 
            asegurando que recibas tus ingresos de forma recurrente y segura.
          </p>
        </div>
      </div>
    </div>
  )
}

function PlanFeature({ label, isDark = false }: { label: string; isDark?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
        isDark ? 'bg-vet-rose/20 text-vet-rose' : 'bg-green-100 text-green-600'
      }`}>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
    </li>
  )
}
