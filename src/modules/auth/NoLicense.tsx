import { useAuth } from '../../contexts/AuthContext'

export function NoLicense() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center font-sans">
      <h1 className="text-4xl font-black text-gray-900 mb-4 uppercase tracking-tighter">NO TIENES VETCARE MANAGER</h1>
      <p className="text-xl font-bold text-gray-400 mb-10 uppercase tracking-widest">CÓMPRALO</p>
      
      <button 
        onClick={() => signOut()}
        className="px-8 py-3 bg-black text-white text-xs font-black uppercase tracking-widest rounded-full hover:bg-gray-800 transition-all"
      >
        Volver al Inicio
      </button>
    </div>
  )
}
