import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function LandingPage() {
  const { user, clinicId } = useAuth()
  const dashboardLink = user ? (clinicId ? '/agenda' : '/onboarding') : '/login'
  
  return (
    <div className="min-h-screen bg-vet-bone flex flex-col items-center justify-center p-6 font-sans text-gray-900">
      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-pink-100">
        
        {/* Lado Izquierdo: Acceso */}
        <div className="p-12 flex flex-col justify-center border-b md:border-b-0 md:border-r border-pink-50">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-vet-rose rounded-xl flex items-center justify-center p-2">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-black uppercase tracking-tighter text-gray-900">VetCare Manager</span>
          </div>
          
          <h1 className="text-3xl font-black text-gray-900 mb-4 leading-tight">Acceso al Portal</h1>
          <p className="text-gray-500 text-sm mb-10 font-medium">Inicia sesión como administrador o tutor para gestionar tus mascotas.</p>
          
          <Link 
            to={dashboardLink} 
            className="w-full py-5 bg-vet-rose text-white rounded-2xl font-black text-center shadow-xl shadow-vet-rose/20 hover:bg-vet-dark transition-all active:scale-95"
          >
            {user ? 'Volver al Panel' : 'Entrar / Iniciar Sesión'}
          </Link>
        </div>

        {/* Lado Derecho: Venta SaaS */}
        <div className="p-12 bg-gray-900 text-white flex flex-col justify-center">
           <div className="inline-block px-3 py-1 bg-vet-rose text-[10px] font-black uppercase tracking-widest rounded-full w-fit mb-4">
              Para Veterinarios
           </div>
           <h2 className="text-3xl font-black mb-4 leading-tight">Obtén VetCare Manager</h2>
           <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium">
             Agenda, fichas clínicas e historial en una sola plataforma SaaS profesional.
           </p>
           
           <Link 
            to="/facturacion"
            className="w-full py-5 bg-white text-gray-900 rounded-2xl font-black text-center hover:bg-vet-rose hover:text-white transition-all active:scale-95 shadow-xl"
          >
            Comprar VetCare Manager
          </Link>
        </div>
      </div>

      <footer className="mt-10 text-center">
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">&copy; 2026 VetCare Manager SaaS. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
