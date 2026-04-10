import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [showConfirmationNotice, setShowConfirmationNotice] = useState(false)
  

  // El login usa window.location.href para asegurar redirección total

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Intentar obtener el token de Turnstile (Cloudflare)
      const captchaToken = (window as any).turnstile?.getResponse()
      
      if (!captchaToken) {
        throw new Error('Por favor, completa la verificación de seguridad (CAPTCHA).')
      }
      
      if (isLogin) {
        // --- INICIAR SESIÓN ---
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: {
            captchaToken
          }
        })
        if (err) throw err
        
        // Forzamos navegación al dashboard
        window.location.href = '/dashboard'
      } else {
        // --- REGISTRARSE ---
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            },
            captchaToken
          }
        })
        if (err) throw err
        setShowConfirmationNotice(true)
        setIsLogin(true)
      }
    } catch (err: any) {
      // Si falla el captcha, resetearlo para que el usuario pueda intentar de nuevo
      if ((window as any).turnstile) (window as any).turnstile.reset()
      setError(err.message || 'Ocurrió un error en la autenticación')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Usamos el origin del sitio para evitar errores de path
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (showConfirmationNotice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border border-gray-100 text-center">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-indigo-900 mb-4 uppercase tracking-tight">¡Activa tu Cuenta!</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-8">
            Hemos enviado un enlace de confirmaci&oacute;n a <strong className="text-gray-900 lowercase">{email}</strong>.<br/><br/>
            Por seguridad, debes hacer clic en el enlace del correo para poder entrar a <strong>VetCare Manager</strong>.
          </p>
          <button 
            onClick={() => setShowConfirmationNotice(false)}
            className="w-full py-4 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-indigo-700 transition-all font-sans"
          >
            Entendido
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-900 uppercase tracking-tight">
      <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
        {/* Simple Brand */}
        <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-indigo-900">VetCare Manager</h1>
            <p className="text-gray-400 text-[10px] font-bold mt-1 uppercase tracking-widest">SaaS de Gesti&oacute;n Veterinaria</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-vet-rose/10 border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-50">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 py-4 text-sm font-bold transition-all
                          ${isLogin ? 'text-indigo-900 bg-white border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600 bg-gray-50/50'}`}
            >
              Iniciar Sesi&oacute;n
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 py-4 text-sm font-bold transition-all
                          ${!isLogin ? 'text-indigo-900 bg-white border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600 bg-gray-50/50'}`}
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
              className="w-full py-4 bg-indigo-600 text-white text-xs font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? 'Procesando...' : (isLogin ? 'Acceder al Dashboard' : 'Comenzar Ahora')}
            </button>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <span className="relative bg-white px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">O continúa con</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-4 bg-white border border-gray-100 text-gray-700 text-xs font-bold rounded-2xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Iniciar sesión con Google
            </button>

            <div className="flex justify-center py-2">
               {/* Contenedor para Turnstile */}
               <div id="turnstile-container" className="cf-turnstile" data-sitekey="0x4AAAAAAC6xjHeCLjZfcovV"></div>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
