import { useAuth } from '../../contexts/AuthContext'

export function TutorView() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-vet-bone flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-pink-100">
        <div className="w-24 h-24 rounded-full mx-auto mb-6 shadow-lg border border-pink-100 overflow-hidden">
          <img src="/hero.png" alt="VetCare" className="w-full h-full object-cover" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Hola, Tutor!
        </h1>
        
        <p className="text-gray-500 text-sm mb-8">
          Has ingresado como tutor con el correo:<br/>
          <strong className="text-black">{user?.email}</strong>
        </p>

        <div className="bg-vet-light border border-vet-rose/20 rounded-2xl p-6 mb-8">
          <p className="text-sm text-vet-dark font-medium leading-relaxed italic">
            "Esta es la vista de tutor. Actualmente s&oacute;lo el administrador puede gestionar la cl&iacute;nica."
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Botón para volver a reserva (público) */}
          <a
            href="/reserva"
            className="w-full py-3 bg-vet-rose text-white text-sm font-bold rounded-xl hover:bg-vet-dark transition-all"
          >
            Ir a Agendar Hora
          </a>

          {/* Botón para cerrar sesión */}
          <button
            onClick={() => signOut()}
            className="w-full py-3 bg-gray-50 text-gray-400 text-sm font-bold rounded-xl hover:bg-gray-100 transition-all border border-gray-100"
          >
            Cerrar Sesi&oacute;n
          </button>
        </div>
        
        <p className="mt-8 text-[10px] text-gray-300 uppercase tracking-widest font-bold">
          VetCare &middot; Portal del Cliente
        </p>
      </div>
    </div>
  )
}
