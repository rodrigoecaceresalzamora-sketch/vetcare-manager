import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'

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
      setError((err as Error).message || 'Error en la autenticación')
    } finally {
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
      </form>
    </div>
  )
}
