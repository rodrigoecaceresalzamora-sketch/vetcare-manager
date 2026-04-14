import { useState, useEffect } from 'react'
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
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [isRecovery, setIsRecovery] = useState(false)

  const switchTab = (toLogin: boolean) => {
    setIsLogin(toLogin)
    setIsForgotPassword(false)
    setResetSent(false)
    setError(null)
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isForgotPassword) {
      setLoading(true)
      try {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        })
        if (err) throw err
        setResetSent(true)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
      return
    }

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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) return setError('Las contraseñas no coinciden')
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      })
      if (err) throw err
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }


  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
      }
    })
  }, [])

  if (isRecovery) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-900 uppercase tracking-tight">
        <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-indigo-900">Nueva Contraseña</h1>
            <p className="text-gray-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Establece tu nueva clave de acceso</p>
          </div>
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            {error && <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl">{error}</div>}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Contraseña Nueva</label>
              <input type="password" required className="w-full pl-4 pr-11 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Confirmar Contraseña</label>
              <input type="password" required className="w-full pl-4 pr-11 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white text-xs font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest disabled:opacity-50">
              {loading ? 'Guardando...' : 'Cambiar Contraseña'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (resetSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-900 uppercase tracking-tight">
        <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border border-gray-100 text-center">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">📧</div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Correo Enviado</h2>
          <p className="text-gray-500 text-sm normal-case tracking-normal mb-8 leading-relaxed">Instrucciones enviadas a <strong>{email}</strong>. Revisa tu bandeja de entrada (y la carpeta de spam).</p>
          <button onClick={() => switchTab(true)} className="w-full py-4 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl">Volver al Login</button>
        </div>
      </div>
    )
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
            Por seguridad, debes hacer clic en el enlace del correo para poder entrar a <strong>Vetxora</strong>.
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
          <h1 className="text-2xl font-black text-indigo-900">Vetxora</h1>
          <p className="text-gray-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Gestión Veterinaria</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-vet-rose/10 border border-gray-100 overflow-hidden">
          {/* Tabs */}
          {!isForgotPassword && (
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
          )}

          {isForgotPassword && (
            <div className="bg-indigo-50/50 px-8 py-4 border-b border-indigo-100 flex items-center justify-between">
               <span className="text-[10px] font-black text-indigo-600 uppercase">Recuperar Acceso</span>
               <button onClick={() => switchTab(true)} className="text-[10px] font-black text-gray-400 hover:text-gray-600 transition-colors">Volver</button>
            </div>
          )}

          <form onSubmit={handleAuth} className="p-8 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl animate-shake">
                {error}
              </div>
            )}

            {!isLogin && !isForgotPassword && (
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
            {!isForgotPassword && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-end mb-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Contraseña</label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={() => setIsForgotPassword(true)}
                      className="text-[10px] font-black text-indigo-400 hover:text-indigo-600 transition-colors normal-case tracking-normal underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
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
            )}

            {/* Confirmar contraseña — solo en registro */}
            {!isLogin && !isForgotPassword && (
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
              disabled={loading || (!isLogin && !isForgotPassword && !!confirmPassword && !passwordsMatch)}
              className="w-full py-4 bg-indigo-600 text-white text-xs font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : (isForgotPassword ? 'Enviar Instrucciones' : (isLogin ? 'Acceder al Dashboard' : 'Comenzar Ahora'))}
            </button>

            {!isForgotPassword && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold"><span className="bg-white px-4 text-gray-400 tracking-widest">O continúa con</span></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-4 bg-white border border-gray-200 text-gray-700 text-xs font-black rounded-2xl shadow-sm hover:bg-gray-50 transition-all uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
