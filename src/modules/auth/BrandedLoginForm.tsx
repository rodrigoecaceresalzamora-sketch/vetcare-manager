import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { translateAuthError } from '../../lib/authErrors'

interface BrandedLoginFormProps {
  clinicName: string
  logoUrl: string | null
  primaryColor: string
  onSuccess: () => void
}

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

export function BrandedLoginForm({ clinicName, logoUrl, primaryColor, onSuccess }: BrandedLoginFormProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

    if (!isLogin && password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Verifica e intenta de nuevo.')
      return
    }

    setLoading(true)

    try {
      if (isLogin) {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        onSuccess()
      } else {
          password,
          options: { 
            data: { full_name: fullName },
            redirectTo: window.location.href
          }
        })
        if (err) throw err
        setShowConfirmationNotice(true)
        setIsLogin(true)
      }
      }
    } catch (err: any) {
      setError(translateAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.href, // Volver a la misma página del portal
        }
      })
      if (err) throw err
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (showConfirmationNotice) {
    return (
      <div
        className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-10 text-center max-w-md w-full mx-auto animate-fade-in"
        style={{ borderColor: `${primaryColor}20` }}
      >
        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">¡REVISA TU EMAIL! 📩</h2>
        <p className="text-gray-600 text-sm leading-relaxed mb-8">
          Te hemos enviado un enlace de confirmación a <strong className="text-gray-900">{email}</strong>.<br /><br />
          Debes hacer clic en el enlace para activar tu cuenta antes de poder entrar al portal de <strong>{clinicName}</strong>.
        </p>
        <button
          onClick={() => setShowConfirmationNotice(false)}
          className="w-full py-4 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all"
          style={{ backgroundColor: primaryColor }}
        >
          Entendido
        </button>
      </div>
    )
  }

  const passwordsMatch = !confirmPassword || password === confirmPassword

  return (
    <div
      className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden max-w-md w-full mx-auto animate-fade-in"
      style={{ borderColor: `${primaryColor}20` }}
    >
      {/* Header con logo */}
      <div className="p-8 pb-4 text-center">
        <div
          className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${!logoUrl ? 'shadow-lg' : ''}`}
          style={!logoUrl ? { backgroundColor: primaryColor } : {}}
        >
          {logoUrl ? (
            <img src={logoUrl} alt={clinicName} className="w-14 h-14 object-contain rounded-xl" />
          ) : (
            <div className="w-10 h-10 border-4 border-white rounded-lg opacity-50" />
          )}
        </div>
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{clinicName}</h2>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Acceso para Clientes</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-50">
        <button
          onClick={() => switchTab(true)}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${isLogin ? 'text-gray-900 border-b-2' : 'text-gray-400 bg-gray-50/50'}`}
          style={{ borderBottomColor: isLogin ? primaryColor : 'transparent' }}
        >
          Entrar
        </button>
        <button
          onClick={() => switchTab(false)}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${!isLogin ? 'text-gray-900 border-b-2' : 'text-gray-400 bg-gray-50/50'}`}
          style={{ borderBottomColor: !isLogin ? primaryColor : 'transparent' }}
        >
          Registrarme
        </button>
      </div>

      <form onSubmit={handleAuth} className="p-8 space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-[10px] font-bold p-3 rounded-xl border border-red-100 uppercase">
            {error}
          </div>
        )}

        {!isLogin && (
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 transition-all"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
          <input
            type="email"
            required
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 transition-all"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {/* Contraseña con botón ver/ocultar */}
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              className="w-full pl-4 pr-11 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        {/* Confirmar contraseña — solo en registro */}
        {!isLogin && (
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirmar Contraseña</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                className={`w-full pl-4 pr-11 py-3 border rounded-xl text-sm outline-none focus:ring-2 transition-all
                  ${passwordsMatch
                    ? 'bg-gray-50 border-gray-100'
                    : 'bg-red-50 border-red-300'}`}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <EyeIcon open={showConfirmPassword} />
              </button>
            </div>
            {!passwordsMatch && (
              <p className="text-red-500 text-[9px] font-bold ml-1 normal-case tracking-normal">
                ⚠ Las contraseñas no coinciden
              </p>
            )}
            {confirmPassword && passwordsMatch && (
              <p className="text-green-500 text-[9px] font-bold ml-1 normal-case tracking-normal">
                ✓ Las contraseñas coinciden
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (!isLogin && !!confirmPassword && !passwordsMatch)}
          className="w-full py-4 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          style={{ backgroundColor: primaryColor }}
        >
          {loading ? 'Cargando...' : isLogin ? 'Entrar Ahora ✨' : 'Crear Cuenta 🐾'}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-50"></div></div>
          <div className="relative flex justify-center text-[9px] uppercase font-bold"><span className="bg-white px-4 text-gray-400 tracking-widest">O continúa con</span></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-4 bg-white border border-gray-100 text-gray-700 text-[10px] font-black rounded-2xl shadow-sm hover:bg-gray-50 transition-all uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>
      </form>
    </div>
  )
}
