import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function NoLicense() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center font-sans">
      <h1 className="text-4xl font-black text-gray-900 mb-4 uppercase tracking-tighter">No tienes Vetxora</h1>
      <p className="text-gray-500 text-sm mb-10 font-medium max-w-md">
        Tu cuenta aún no está vinculada a una clínica. Compra un plan para comenzar a usar Vetxora.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/planes"
          className="px-8 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-full hover:bg-blue-700 transition-all"
        >
          Ver Planes
        </Link>
        <button 
          onClick={async () => {
            await signOut()
            window.location.href = '/'
          }}
          className="px-8 py-3 bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest rounded-full hover:bg-gray-200 transition-all"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  )
}
