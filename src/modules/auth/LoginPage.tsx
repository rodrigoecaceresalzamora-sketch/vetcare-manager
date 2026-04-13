import { useState } from 'react'
import { supabase } from '../../lib/supabase'

// ── Icono Ojo (estilo flat/simple) ───────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    // Ojo abierto: contorno almendrado + pupila
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 5C7 5 2.5 12 2.5 12S7 19 12 19s9.5-7 9.5-7S17 5 12 5z" />
      <circle cx="12" cy="12" r="3" fill="white" />
    </svg>
  ) : (
    // Ojo cerrado: mismo contorno + línea diagonal encima
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 5C7 5 2.5 12 2.5 12S7 19 12 19s9.5-7 9.5-7S17 5 12 5z" />
      <circle cx="12" cy="12" r="3" fill="white" />
      <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [showConfirmationNotice, setShowConfirmationNotice] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const switchTab = (toLogin: boolean) => {
    setIsLogin(toLogin)
    setError(null)
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validación de confirmación de contraseña
    if (!isLogin && password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor, verifica e intenta de nuevo.')
      return
    }

    setLoading(true)

    try {
      if (isLogin) {
        // --- INICIAR SESIÓN ---
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        window.location.href = '/dashboard'
      } else {
        // --- REGISTRARSE ---
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        })
        if (err) throw err
        setShowConfirmationNotice(true)
        setIsLogin(true)
      }
    } catch (err: unknown) {
      if ((window as Window & { turnstile?: { reset: () => void } }).turnstile) {
        (window as Window & { turnstile?: { reset: () => void } }).turnstile?.reset()
      }
      setError((err as Error).message || 'Ocurrió un error en la autenticación')
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-indigo-900 mb-4 uppercase tracking-tight">¡Activa tu Cuenta!</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-8">
            Hemos enviado un enlace de confirmación a <strong className="text-gray-900 lowercase">{email}</strong>.<br /><br />
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

  const passwordsMatch = !confirmPassword || password === confirmPassword

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-900 uppercase tracking-tight">
      <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-indigo-900">VetCare Manager</h1>
          <p className="text-gray-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Gestión Veterinaria</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-vet-rose/10 border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-50">
            <button
              onClick={() => switchTab(true)}
              className={`flex-1 py-4 text-sm font-bold transition-all
                          ${isLogin ? 'text-indigo-900 bg-white border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600 bg-gray-50/50'}`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => switchTab(false)}
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
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all outline-none"
                  placeholder="Juan Pérez"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all outline-none"
                placeholder="ejemplo@gmail.com"
              />
            </div>

            {/* Contraseña con botón ver/ocultar */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {/* Confirmar contraseña — solo en registro */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Confirmar Contraseña</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-4 pr-11 py-3 bg-gray-50 border rounded-xl text-sm focus:ring-4 transition-all outline-none
                      ${passwordsMatch
                        ? 'border-gray-100 focus:ring-indigo-100 focus:border-indigo-400'
                        : 'border-red-300 focus:ring-red-100 focus:border-red-400 bg-red-50'}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <EyeIcon open={showConfirmPassword} />
                  </button>
                </div>
                {!passwordsMatch && (
                  <p className="text-red-500 text-[10px] font-bold ml-1 mt-1 normal-case tracking-normal">
                    ⚠ Las contraseñas no coinciden
                  </p>
                )}
                {confirmPassword && passwordsMatch && (
                  <p className="text-green-500 text-[10px] font-bold ml-1 mt-1 normal-case tracking-normal">
                    ✓ Las contraseñas coinciden
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!isLogin && !!confirmPassword && !passwordsMatch)}
              className="w-full py-4 bg-indigo-600 text-white text-xs font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : (isLogin ? 'Acceder al Dashboard' : 'Comenzar Ahora')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
