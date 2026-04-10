import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface BrandedLoginFormProps {
  clinicName: string
  logoUrl: string | null
  primaryColor: string
  onSuccess: () => void
}

export function BrandedLoginForm({ clinicName, logoUrl, primaryColor, onSuccess }: BrandedLoginFormProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmationNotice, setShowConfirmationNotice] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const captchaToken = (window as any).turnstile?.getResponse()
      if (!captchaToken) {
        throw new Error('Por favor, completa la verificación de seguridad.')
      }

      if (isLogin) {
        const { error: err } = await supabase.auth.signInWithPassword({ 
          email, 
          password,
          options: { captchaToken }
        })
        if (err) throw err
        onSuccess()
      } else {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { full_name: fullName },
            captchaToken
          }
        })
        if (err) throw err
        setShowConfirmationNotice(true)
        setIsLogin(true)
      }
    } catch (err: any) {
      setError(err.message || 'Error en la autenticación')
    } finally {
      setLoading(false)
    }
  }

  if (showConfirmationNotice) {
    return (
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-10 text-center max-w-md w-full mx-auto animate-fade-in" style={{ borderColor: `${primaryColor}20` }}>
        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">¡REVISA TU EMAIL! 📩</h2>
        <p className="text-gray-600 text-sm leading-relaxed mb-8">
          Te hemos enviado un enlace de confirmación a <strong className="text-gray-900">{email}</strong>.<br/><br/>
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

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden max-w-md w-full mx-auto animate-fade-in" style={{ borderColor: `${primaryColor}20` }}>
      <div className="p-8 pb-4 text-center">
        <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${!logoUrl ? 'shadow-lg' : ''}`} style={!logoUrl ? { backgroundColor: primaryColor } : {}}>
          {logoUrl ? (
            <img src={logoUrl} alt={clinicName} className="w-14 h-14 object-contain rounded-xl" />
          ) : (
            <div className="w-10 h-10 border-4 border-white rounded-lg opacity-50" />
          )}
        </div>
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{clinicName}</h2>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Acceso para Clientes</p>
      </div>

      <div className="flex border-b border-gray-50">
        <button
          onClick={() => setIsLogin(true)}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${isLogin ? 'text-gray-900 border-b-2' : 'text-gray-400 bg-gray-50/50'}`}
          style={{ borderBottomColor: isLogin ? primaryColor : 'transparent' }}
        >
          Entrar
        </button>
        <button
          onClick={() => setIsLogin(false)}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${!isLogin ? 'text-gray-900 border-b-2' : 'text-gray-400 bg-gray-50/50'}`}
          style={{ borderBottomColor: !isLogin ? primaryColor : 'transparent' }}
        >
          Registrarme
        </button>
      </div>

      <form onSubmit={handleAuth} className="p-8 space-y-4">
        {error && <div className="bg-red-50 text-red-600 text-[10px] font-bold p-3 rounded-xl border border-red-100 uppercase">{error}</div>}
        
        {!isLogin && (
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 transition-all"
              style={{ paddingLeft: '1rem', paddingRight: '1rem' }}
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

        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
          <input
            type="password"
            required
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 transition-all"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
          style={{ backgroundColor: primaryColor }}
        >
          {loading ? 'Cargando...' : isLogin ? 'Entrar Ahora ✨' : 'Crear Cuenta 🐾'}
        </button>
      </form>
    </div>
  )
}
