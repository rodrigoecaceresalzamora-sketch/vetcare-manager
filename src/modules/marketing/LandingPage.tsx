import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function LandingPage() {
  const { user, clinicId } = useAuth()
  const dashboardLink = user ? (clinicId ? '/agenda' : '/onboarding') : '/login'
  const billingLink = user ? '/facturacion' : '/login'
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">
      {/* Header / Nav */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-vet-rose rounded-xl shadow-lg flex items-center justify-center p-2 rotate-3">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-black uppercase tracking-tighter">VetCare <span className="text-vet-rose">Manager</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-wider text-gray-500">
            <a href="#features" className="hover:text-vet-rose transition-colors">Funciones</a>
            <a href="#pricing" className="hover:text-vet-rose transition-colors">Precios</a>
            <Link to="/login" className="px-6 py-2.5 bg-gray-900 text-white rounded-full hover:bg-vet-rose transition-all hover:scale-105 shadow-xl shadow-gray-200">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-block px-4 py-1.5 bg-pink-50 text-vet-rose rounded-full text-xs font-black uppercase tracking-widest border border-pink-100">
              ✨ La nueva era de la gestión veterinaria
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tighter text-gray-900">
              Tu Clínica Veterinaria <br/> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-vet-rose to-pink-400">en la palma de tu mano.</span>
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed max-w-lg">
              Gestiona pacientes, vacunas y citas de forma sencilla. Accede a tu portal de tutor o administrador hoy mismo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link to={dashboardLink} className="px-10 py-5 bg-vet-rose text-white rounded-2xl font-black text-lg shadow-2xl shadow-vet-rose/40 hover:scale-105 transition-all text-center">
                {user ? 'Volver al Panel' : 'Registrarse / Entrar'}
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-pink-100/50 rounded-full blur-3xl -z-10 animate-pulse"></div>
            <div className="bg-gray-900 rounded-[3rem] p-4 shadow-2xl shadow-gray-400 rotate-2 overflow-hidden border-8 border-gray-800">
               <img 
                 src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=2070&auto=format&fit=crop" 
                 alt="App Preview" 
                 className="w-full rounded-[2rem] opacity-90"
               />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-4 mb-20">
          <h2 className="text-4xl font-black tracking-tighter">Planes que crecen contigo</h2>
          <p className="text-gray-500 max-w-xl mx-auto font-medium">Desde atención independiente hasta grandes hospitales veterinarios.</p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 px-6">
          {/* Plan Básico */}
          <div className="bg-white p-12 rounded-[3rem] border border-gray-100 shadow-xl hover:scale-105 transition-all flex flex-col">
            <div className="mb-8">
              <h3 className="text-xl font-black uppercase tracking-widest text-gray-400 mb-2">Atención Básica</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-gray-900">$6.000</span>
                <span className="text-gray-400 font-bold">/ mes</span>
              </div>
            </div>
            <ul className="space-y-4 mb-12 flex-1">
              <li className="flex gap-3 text-gray-600 font-medium">✅ Fichas Clínicas Ilimitadas</li>
              <li className="flex gap-3 text-gray-600 font-medium">✅ Agenda Semanal</li>
              <li className="flex gap-3 text-gray-600 font-medium text-pink-500">❌ Hasta 5 Ayudantes</li>
              <li className="flex gap-3 text-gray-600 font-medium text-pink-500">❌ Hasta 2 Administradores</li>
              <li className="flex gap-3 text-gray-600 font-medium">✅ Recordatorios WhatsApp</li>
            </ul>
            <Link to={billingLink} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-center hover:bg-vet-rose transition-colors">
              Elegir Básico
            </Link>
          </div>

          {/* Plan Pro */}
          <div className="bg-gray-900 p-12 rounded-[3rem] shadow-2xl hover:scale-105 transition-all text-white border-4 border-vet-rose flex flex-col relative overflow-hidden">
            <div className="absolute top-8 right-[-35px] bg-vet-rose text-white text-[10px] font-black uppercase px-12 py-1 rotate-45 shadow-lg">Popular</div>
            <div className="mb-8">
              <h3 className="text-xl font-black uppercase tracking-widest text-pink-300/50 mb-2">Hospital Pro</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-white">$15.000</span>
                <span className="text-pink-300/50 font-bold">/ mes</span>
              </div>
            </div>
            <ul className="space-y-4 mb-12 flex-1">
              <li className="flex gap-3 text-gray-300 font-medium">🚀 Todo lo del nivel Básico</li>
              <li className="flex gap-3 text-vet-rose font-black italic">🌟 AYUDANTES ILIMITADOS</li>
              <li className="flex gap-3 text-vet-rose font-black italic">🌟 ADMINS ILIMITADOS</li>
              <li className="flex gap-3 text-gray-300 font-medium">✅ Control de Stock Avanzado</li>
              <li className="flex gap-3 text-gray-300 font-medium">✅ Métricas y Estadísticas</li>
            </ul>
            <Link to={billingLink} className="w-full py-5 bg-vet-rose text-white rounded-2xl font-black text-center hover:bg-white hover:text-vet-rose transition-all">
              Ir a Pro ahora
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-white border-t border-gray-100 text-center">
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">&copy; 2026 VetCare Manager SaaS. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
