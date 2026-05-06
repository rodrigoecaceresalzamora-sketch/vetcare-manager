import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { STRIPE_PLANS } from '../../lib/stripe'

export function PublicPricing() {
  const { user, clinicId, signOut } = useAuth()
  const navigate = useNavigate()

  function handleBuyPlan(planKey: string) {
    if (!user) {
      // Guardar plan seleccionado para después del login
      localStorage.setItem('vexora_pending_plan', planKey)
      navigate('/login')
      return
    }
    navigate(`/checkout/${planKey}`)
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
            {user ? (
              <>
                <Link
                  to={clinicId ? '/agenda' : '/'}
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all uppercase tracking-wider"
                >
                  {clinicId ? 'Mi Panel' : 'Inicio'}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="px-5 py-2 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all uppercase tracking-wider"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all uppercase tracking-wider"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Contenido ──────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        {/* Título */}
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">
            Elige tu plan
          </h1>
          <p className="text-gray-500 text-base md:text-lg font-medium max-w-xl mx-auto">
            Selecciona el plan que mejor se adapte al tamaño de tu clínica. Puedes cambiar en cualquier momento.
          </p>
        </div>

        {/* Cards de Planes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">

          {/* Plan Básico */}
          <div className="relative bg-white border-2 border-gray-100 rounded-3xl p-8 hover:shadow-xl hover:border-blue-200 transition-all">
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
              <PlanFeature label="Recordatorios Automáticos" />
              <PlanFeature label="Soporte por Email" />
            </ul>

            <button
              onClick={() => handleBuyPlan('basic')}
              className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 active:scale-95"
            >
              Comprar Básico
            </button>
          </div>

          {/* Plan Pro */}
          <div className="relative bg-gray-900 border-2 border-gray-800 rounded-3xl p-8 hover:shadow-2xl hover:-translate-y-1 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
              Recomendado
            </div>

            <h3 className="text-xl font-black text-white mb-2">{STRIPE_PLANS.PRO.name}</h3>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-black text-white">${STRIPE_PLANS.PRO.price.toLocaleString()}</span>
              <span className="text-gray-500 text-sm font-medium">/ mes</span>
            </div>
            <p className="text-[10px] text-blue-400 font-bold mb-6 uppercase tracking-widest">Acceso Ilimitado Total</p>

            <ul className="space-y-4 mb-8">
              <PlanFeature label="Administradores Ilimitados" isDark />
              <PlanFeature label="Ayudantes Ilimitados" isDark />
              <PlanFeature label="Agenda Completa" isDark />
              <PlanFeature label="Fichas de Pacientes" isDark />
              <PlanFeature label="Recordatorios Automáticos" isDark />
              <PlanFeature label="Stock Completo" isDark />
              <PlanFeature label="Soporte Prioritario" isDark />
            </ul>

            <button
              onClick={() => handleBuyPlan('pro')}
              className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all bg-white text-gray-900 hover:bg-gray-100 shadow-xl shadow-white/5 active:scale-95"
            >
              Comprar Pro
            </button>
          </div>
        </div>

        {/* Info adicional removida */}
      </div>
    </div>
  )
}

function PlanFeature({ label, isDark = false }: { label: string; isDark?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
        isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
      }`}>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
    </li>
  )
}
