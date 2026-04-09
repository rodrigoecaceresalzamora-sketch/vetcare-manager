import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  
  const navigate = useNavigate()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        // --- INICIAR SESIÓN ---
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (err) throw err
        
        if (err) throw err
        
        // Redireccionar al dashboard inteligente
        navigate('/dashboard')
      } else {
        // --- REGISTRARSE ---
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        })
        if (err) throw err
        
        // Si el registro es exitoso, Supabase suele iniciar sesión automáticamente
        // o pedir verificación por email. Aquí asumimos flujo directo:
        alert('¡Cuenta creada! Revisa tu email si es necesaria la confirmación.')
        setIsLogin(true)
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error en la autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-vet-bone flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-vet-rose rounded-3xl shadow-xl rotate-3 mb-4 p-4 border-2 border-white">
            <img src="/logo.png" alt="VetCare" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 leading-tight uppercase tracking-tighter">VetCare</h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Gesti&oacute;n Veterinaria</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-vet-rose/10 border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-50">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 py-4 text-sm font-bold transition-all
                          ${isLogin ? 'text-black bg-white border-b-2 border-vet-rose' : 'text-gray-400 hover:text-gray-600 bg-gray-50/50'}`}
            >
              Iniciar Sesi&oacute;n
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 py-4 text-sm font-bold transition-all
                          ${!isLogin ? 'text-black bg-white border-b-2 border-vet-rose' : 'text-gray-400 hover:text-gray-600 bg-gray-50/50'}`}
            >
              Crear Cuenta
            </button>
          </div>

          <form onSubmit={handleAuth} className="p-8 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl animate-shake">
                {error}
              </div>
            )}

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nombre Completo</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-4 focus:ring-vet-rose/10 focus:border-vet-rose transition-all outline-none"
                    placeholder="Juan P&eacute;rez"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Correo Electr&oacute;nico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-4 focus:ring-vet-rose/10 focus:border-vet-rose transition-all outline-none"
                placeholder="ejemplo@gmail.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Contrase&ntilde;a</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-4 focus:ring-vet-rose/10 focus:border-vet-rose transition-all outline-none"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-vet-rose hover:bg-vet-dark text-white font-bold rounded-2xl shadow-lg shadow-vet-rose/25 transform active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                isLogin ? 'Entrar al Panel' : 'Registrarme ahora'
              )}
            </button>

            <div className="relative py-4">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
               <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-400"><span className="bg-white px-2">O continuar con</span></div>
            </div>

            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard' } })
              }}
              className="w-full py-3 bg-white border border-gray-100 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              Google
            </button>

            {!isLogin && (
               <div className="flex justify-center py-2">
                  {/* Contenedor para Turnstile */}
                  <div id="turnstile-container" className="cf-turnstile" data-sitekey="1x00000000000000000000AA"></div>
               </div>
            )}

          </form>
        </div>
      </div>
    </div>
  )
}
