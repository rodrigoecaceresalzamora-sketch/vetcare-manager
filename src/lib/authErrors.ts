/**
 * Utilidad para traducir errores de Supabase Auth a mensajes amigables en español.
 */

export function translateAuthError(error: any): string {
  if (!error) return 'Ocurrió un error inesperado'
  
  const message = error.message || ''
  const status = error.status

  // Mensaje de credenciales inválidas (el más común)
  if (message.toLowerCase().includes('invalid login credentials') || status === 400) {
    return 'El correo y/o la contraseña son incorrectos.'
  }

  // Usuario no confirmado
  if (message.toLowerCase().includes('email not confirmed')) {
    return 'Debes confirmar tu correo electrónico antes de iniciar sesión.'
  }

  // Usuario ya existe
  if (message.toLowerCase().includes('user already registered')) {
    return 'Este correo electrónico ya está registrado.'
  }

  // Contraseña muy corta
  if (message.toLowerCase().includes('password is too short')) {
    return 'La contraseña es demasiado corta (mínimo 6 caracteres).'
  }

  // Rate limit
  if (status === 429) {
    return 'Demasiados intentos. Por favor, intenta de nuevo más tarde.'
  }

  // Fallback si no hay coincidencia específica
  console.warn('Unhandled Auth Error:', error)
  return 'No se pudo realizar la operación. Verifica tus datos e intenta de nuevo.'
}
