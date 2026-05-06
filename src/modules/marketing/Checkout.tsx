import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { STRIPE_PLANS } from '../../lib/stripe'

export function Checkout() {
  const { planId } = useParams<{ planId: string }>()
  const { user, clinicId, loading: authLoading, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Limpiar pending plan de localStorage al montar
  useEffect(() => {
    localStorage.removeItem('vexora_pending_plan')
  }, [])

  // Determinar el plan seleccionado
  const isPro = planId === 'pro'
  const plan = isPro ? STRIPE_PLANS.PRO : STRIPE_PLANS.BASIC
  const planType = isPro ? 'pro' : 'basic'

  // Si no hay usuario y ya terminó de cargar, mostrar mensaje
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-white font-sans flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 border border-gray-100 shadow-xl text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Inicia sesión primero</h2>
          <p className="text-gray-500 text-sm mb-8 font-medium">
            Necesitas una cuenta para comprar un plan de Vetxora.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-4 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    )
  }

  async function handlePayment() {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      // ── SIMULACIÓN DE PAGO ──────────────────────────────
      // En producción, aquí iría la integración con Stripe:
      //
      // 1. Llamar a una Edge Function de Supabase:
      //    const { data } = await supabase.functions.invoke('create-checkout-session', {
      //      body: { planType, clinicId, userId: user.id }
      //    })
      //
      // 2. La Edge Function crearía una Stripe Checkout Session:
      //    const session = await stripe.checkout.sessions.create({
      //      line_items: [{ price: plan.id, quantity: 1 }],
      //      mode: 'subscription',
      //      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      //      cancel_url: `${origin}/planes`,
      //      customer_email: user.email,
      //      metadata: { userId: user.id, clinicId, planType }
      //    })
      //
      // 3. Redirigir al checkout de Stripe:
      //    window.location.href = data.url
      //
      // 4. Webhook de Stripe confirmaría el pago y actualizaría la DB
      // ────────────────────────────────────────────────────

      // Simulación: esperamos 2 segundos
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (clinicId) {
        // Si ya tiene clínica, actualizar plan
        const { error: updateErr } = await supabase
          .from('clinics')
          .update({
            plan_type: planType,
            is_paid: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', clinicId)

        if (updateErr) throw updateErr

        setSuccess(true)
        setTimeout(() => window.location.href = '/agenda', 2000)
      } else {
        // ── Si no tiene clínica, CREARLA AHORA MISMO ──
        // Para que entre directo al dashboard sin tener que llenar el onboarding
        const defaultClinicName = 'Mi Clínica'

        const { data: newClinic, error: clinicErr } = await supabase
          .from('clinics')
          .insert({ 
            name: defaultClinicName, 
            owner_id: user.id,
            plan_type: planType,
            is_paid: true 
          })
          .select()
          .single()

        if (clinicErr) throw clinicErr

        const { error: staffErr } = await supabase
          .from('staff')
          .insert({
            email: user.email?.toLowerCase(),
            role: 'admin',
            clinic_id: newClinic.id
          })

        if (staffErr) throw staffErr

        await supabase.from('clinic_config').insert({
          clinic_id: newClinic.id,
          clinic_name: defaultClinicName,
          clinic_logo_url: '/favicon.png',
          primary_color: '#3b82f6',
          secondary_color: '#eff6ff'
        })

        // El auth context ahora detectará que tiene clínica
        setSuccess(true)
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1500)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error procesando el pago'
      setError(message)
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-blue-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="Vexora Logo" className="w-8 h-8 object-contain rounded-lg" />
            <span className="text-lg font-black text-gray-900 uppercase tracking-tighter">Vetxora</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/planes"
              className="px-5 py-2 text-gray-500 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all uppercase tracking-wider"
            >
              ← Volver a Planes
            </Link>
            <button
              onClick={() => signOut()}
              className="px-5 py-2 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all uppercase tracking-wider"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* ── Checkout Card ──────────────────────────────── */}
      <div className="max-w-lg mx-auto px-6 py-16 md:py-24">
        <div className={`rounded-3xl p-8 md:p-10 border-2 transition-all ${
          isPro ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-xl'
        }`}>
          {/* Plan Header */}
          <div className="text-center mb-8">
            <h2 className={`text-2xl font-black mb-1 ${isPro ? 'text-white' : 'text-gray-900'}`}>
              {plan.name}
            </h2>
            <div className="flex items-baseline justify-center gap-1 mb-4">
              <span className={`text-5xl font-black ${isPro ? 'text-white' : 'text-gray-900'}`}>
                ${plan.price.toLocaleString()}
              </span>
              <span className={`text-sm font-medium ${isPro ? 'text-gray-500' : 'text-gray-400'}`}>/ mes</span>
            </div>
            {isPro && (
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Acceso Ilimitado Total</p>
            )}
          </div>

          {/* Divider */}
          <div className={`border-t mb-8 ${isPro ? 'border-gray-800' : 'border-gray-100'}`} />

          {/* User Info */}
          <div className={`rounded-2xl p-4 mb-8 ${isPro ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isPro ? 'text-gray-500' : 'text-gray-400'}`}>
              Cuenta
            </p>
            <p className={`text-sm font-bold ${isPro ? 'text-white' : 'text-gray-900'}`}>
              {user?.email}
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-4 rounded-xl mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-bold p-4 rounded-xl mb-6 flex items-center gap-3">
              <span className="text-lg">🎉</span>
              <span>{clinicId ? '¡Pago exitoso! Redirigiendo a tu panel...' : '¡Pago exitoso! Ahora configura tu clínica...'}</span>
            </div>
          )}

          {/* Pay Button */}
          {!success && (
            <button
              onClick={handlePayment}
              disabled={loading}
              className={`w-full py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                isPro
                  ? 'bg-white text-gray-900 hover:bg-gray-100 shadow-xl'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-600/20'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className={`w-4 h-4 border-2 rounded-full animate-spin ${
                    isPro ? 'border-gray-900 border-t-transparent' : 'border-white border-t-transparent'
                  }`} />
                  Procesando pago...
                </span>
              ) : (
                `Pagar $${plan.price.toLocaleString()} / mes`
              )}
            </button>
          )}

          {/* Security notice */}
          <p className={`text-center mt-6 text-[10px] font-bold uppercase tracking-widest ${
            isPro ? 'text-gray-600' : 'text-gray-400'
          }`}>
            🔒 Pago seguro · Cancela cuando quieras
          </p>
        </div>
      </div>
    </div>
  )
}
