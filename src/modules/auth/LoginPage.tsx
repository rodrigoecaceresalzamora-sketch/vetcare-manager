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
      // Intentar obtener el token de Turnstile (Cloudflare) con seguridad
      let captchaToken = null
      try {
        captchaToken = (window as any).turnstile?.getResponse()
      } catch (e) {
        console.warn("Turnstile not ready yet", e)
      }
      
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

          </form>
        </div>
      </div>
    </div>
  )
}
