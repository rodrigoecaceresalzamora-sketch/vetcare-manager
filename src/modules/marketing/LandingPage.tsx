import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function LandingPage() {
  const { user, clinicId, loading, clinicLoading, signOut } = useAuth()
  const [selectedImage, setSelectedImage] = useState<string[] | null>(null)

  // Si el usuario ya tiene sesión y clínica → entrar al dashboard
  // Si tiene sesión pero no clínica → ir a comprar
  // Si no tiene sesión → ir a login
  const enterLink = !user ? '/login' : (clinicId ? '/agenda' : '/planes')
  const buyLink = '/planes'

  const isLoading = loading || clinicLoading

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-blue-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo + Nombre */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/favicon.png" alt="Vexora Logo" className="w-8 h-8 object-contain rounded-lg" />
            <span className="text-lg font-black text-gray-900 uppercase tracking-tighter">Vetxora</span>
          </Link>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : user ? (
              <>
                <Link
                  to={enterLink}
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all uppercase tracking-wider"
                >
                  Mi Panel
                </Link>
                <button
                  onClick={() => signOut()}
                  className="px-5 py-2 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all uppercase tracking-wider"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-5 py-2 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all uppercase tracking-wider"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/login?tab=register"
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all uppercase tracking-wider"
                >
                  Crear Cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ───────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-24 md:pt-16 md:pb-36">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full mb-6">
              Gestión Veterinaria Profesional
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight tracking-tight mb-6">
              Tu clínica veterinaria,{' '}
              <span className="text-blue-600">organizada</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 font-medium leading-relaxed mb-12 max-w-xl mx-auto">
              Agenda, fichas clínicas, vacunas y portal de reservas en una sola plataforma diseñada para veterinarios.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={enterLink}
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-600/30 transition-all active:scale-95 uppercase tracking-wider"
              >
                {user && clinicId ? 'Entrar a Vetxora' : (user ? 'Entrar a Vetxora' : 'Entrar a Vetxora')}
              </Link>
              <Link
                to={buyLink}
                className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 font-black text-sm rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all active:scale-95 uppercase tracking-wider"
              >
                Comprar Vetxora
              </Link>
            </div>
          </div>
          
          {/* Dashboard Preview Image */}
          <div className="mt-16 max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-blue-100 bg-white transform hover:-translate-y-2 transition-transform duration-500">
            <img 
              src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=2000" 
              alt="Mascotas felices" 
              className="w-full h-[500px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Sección: ¿Qué es Vetxora? ──────────────────── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-4">
              Todo lo que necesitas para tu clínica
            </h2>
            <p className="text-gray-500 text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
              Vetxora centraliza la gestión de tu clínica veterinaria en una plataforma moderna, rápida y fácil de usar.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon="📅"
              title="Agenda Inteligente"
              description="Gestiona citas por día y hora con vista semanal. Tu equipo ve la agenda en tiempo real y los tutores reservan desde un portal público."
            />
            <FeatureCard
              icon="🐾"
              title="Fichas de Pacientes"
              description="Historial clínico completo de cada mascota: consultas, vacunas, archivos adjuntos, peso y más. Todo en un solo lugar."
            />
            <FeatureCard
              icon="💉"
              title="Control de Vacunas"
              description="Registro de vacunaciones con alertas automáticas por vencimiento. Envía recordatorios por WhatsApp o email a los tutores."
            />
            <FeatureCard
              icon="🌐"
              title="Portal de Reservas"
              description="Tus clientes reservan citas desde un link personalizado con el nombre y logo de tu clínica. Sin llamadas, sin WhatsApp."
            />
            <FeatureCard
              icon="👥"
              title="Equipo y Roles"
              description="Agrega administradores y ayudantes a tu clínica. Cada rol tiene permisos diferentes para proteger la información sensible."
            />
            <FeatureCard
              icon="📦"
              title="Gestión de Stock"
              description="Controla el inventario de medicamentos e insumos. Asocia productos a servicios para descontar automáticamente al atender."
            />
          </div>
        </div>
      </section>

      {/* ── Sección: Vistazo a la App (Screenshots) ───────────────── */}
      <section className="py-20 md:py-28 bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-4">
              Una plataforma diseñada para ti
            </h2>
            <p className="text-gray-500 text-base md:text-lg max-w-2xl mx-auto font-medium">
              Echa un vistazo a la interfaz limpia, moderna y profesional que utilizarás día a día en tu clínica.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Columna Izquierda */}
            <div className="flex flex-col gap-8">
              <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all" onClick={() => setSelectedImage(['/imagenes/img1.png'])}>
                <img src="/imagenes/img1.png" alt="Vista de la App 1" className="w-full h-auto object-cover" />
              </div>
              
              <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all h-full" onClick={() => setSelectedImage(['/imagenes/img3.png'])}>
                <img src="/imagenes/img3.png" alt="Vista de la App 3" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="flex flex-col gap-8">
              <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all" onClick={() => setSelectedImage(['/imagenes/img2.png'])}>
                <img src="/imagenes/img2.png" alt="Vista de la App 2" className="w-full h-auto object-cover" />
              </div>
              
              <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all" onClick={() => setSelectedImage(['/imagenes/img4.png'])}>
                <img src="/imagenes/img4.png" alt="Vista de la App 4" className="w-full h-auto object-cover" />
              </div>
              
              <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-[#141a28] cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all mt-auto" onClick={() => setSelectedImage(['/imagenes/img5.png'])}>
                <img src="/imagenes/img5.png" alt="Portal de Agendamiento" className="w-full h-auto object-contain mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sección: Cómo Funciona ─────────────────────── */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-4">
              Empieza en 3 pasos
            </h2>
            <p className="text-gray-500 text-base md:text-lg max-w-xl mx-auto font-medium">
              Desde que creas tu cuenta hasta que atiendes tu primera cita.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              number="01"
              title="Crea tu cuenta"
              description="Regístrate con email o Google y elige el plan que mejor se adapte al tamaño de tu clínica."
            />
            <StepCard
              number="02"
              title="Configura tu clínica"
              description="Personaliza tu nombre, logo, horarios de atención, servicios y tarifas. Todo desde el panel de configuración."
            />
            <StepCard
              number="03"
              title="Comienza a atender"
              description="Recibe reservas en tu portal público, gestiona citas desde la agenda y lleva el historial de cada paciente."
            />
          </div>
        </div>
      </section>

      {/* ── Sección CTA Final ──────────────────────────── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-4">
            Lleva tu clínica al siguiente nivel
          </h2>
          <p className="text-gray-500 text-lg font-medium mb-10 max-w-xl mx-auto leading-relaxed">
            Más de una plataforma: una herramienta pensada por y para veterinarios que quieren crecer.
          </p>
          <Link
            to={buyLink}
            className="inline-block px-10 py-5 bg-blue-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-wider"
          >
            Ver Planes y Precios
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="Vexora" className="w-5 h-5 object-contain rounded" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vetxora</span>
          </div>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
            &copy; {new Date().getFullYear()} Vetxora. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Modal de Imagen */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 bg-gray-900/90 backdrop-blur-sm animate-fade-in overflow-y-auto"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="fixed top-6 right-6 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center font-bold transition-colors z-50"
            onClick={() => setSelectedImage(null)}
          >
            ✕
          </button>
          <div 
            className="flex flex-col max-w-5xl mx-auto my-auto shadow-2xl rounded-xl overflow-hidden bg-white" 
            onClick={e => e.stopPropagation()}
          >
            {selectedImage.map((src, i) => (
              <img 
                key={i}
                src={src} 
                alt="Vista ampliada" 
                className="w-full h-auto object-cover"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Sub-componentes internos ──────────────────────────────── */

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl border border-blue-100 hover:border-blue-300 hover:shadow-xl transition-all p-8 relative min-h-[240px]">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-base font-black text-gray-900 mb-2 uppercase tracking-tight">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed font-medium">{description}</p>
    </div>
  )
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-blue-100 shadow-sm text-center">
      <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mx-auto mb-5 text-sm font-black">
        {number}
      </div>
      <h3 className="text-base font-black text-gray-900 mb-2 uppercase tracking-tight">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed font-medium">{description}</p>
    </div>
  )
}
