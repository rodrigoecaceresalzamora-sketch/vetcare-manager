// ============================================================
// VetCare Manager — Utilidades compartidas
// ============================================================

import type { BoostInterval, VaccineStatus } from '../types'

// ── FECHAS ────────────────────────────────────────────────────

/**
 * Calcula la edad de una mascota a partir de su fecha de nacimiento.
 * Devuelve una cadena legible: "3 años", "8 meses", etc.
 */
export function calcAge(dateOfBirth: string): string {
  if (!dateOfBirth) return '—'
  const birth = new Date(dateOfBirth + 'T00:00:00')
  const now = new Date()
  const totalMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  if (totalMonths < 1) return 'Recién nacido'
  if (totalMonths < 12) return `${totalMonths} mes${totalMonths > 1 ? 'es' : ''}`
  const years = Math.floor(totalMonths / 12)
  return years === 1 ? '1 año' : `${years} años`
}

/**
 * Calcula cuántos días faltan para una fecha dada.
 * Valores negativos indican que ya pasó.
 */
export function daysUntil(isoDate: string): number {
  const target = new Date(isoDate + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Formatea una fecha ISO a formato legible chileno.
 * Ejemplo: "2025-03-20" → "20 mar 2025"
 */
export function formatDate(isoDate: string): string {
  if (!isoDate) return '—'
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Formatea un datetime ISO a hora legible.
 * Ejemplo: "2025-03-20T09:00:00" → "09:00"
 */
export function formatTime(isoDatetime: string): string {
  if (!isoDatetime) return '—'
  const d = new Date(isoDatetime)
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Calcula la fecha del próximo refuerzo sumando el intervalo seleccionado.
 */
export function calcNextDueDate(appliedDate: string, interval: BoostInterval): string {
  const d = new Date(appliedDate + 'T00:00:00')
  switch (interval) {
    case '2w': d.setDate(d.getDate() + 14);   break
    case '4w': d.setDate(d.getDate() + 28);   break
    case '6m': d.setMonth(d.getMonth() + 6);  break
    case '1y': d.setFullYear(d.getFullYear() + 1); break
  }
  return d.toISOString().split('T')[0]
}

// ── VACUNAS ───────────────────────────────────────────────────

/**
 * Determina el estado de una vacuna según los días restantes.
 * urgente  → ≤ 7 días
 * proxima  → 8–21 días
 * vencida  → ya pasó
 * vigente  → todo ok
 */
export function calcVaccineStatus(nextDueDate: string): VaccineStatus {
  const days = daysUntil(nextDueDate)
  if (days < 0)  return 'vencida'
  if (days <= 7) return 'urgente'
  if (days <= 21) return 'proxima'
  return 'vigente'
}

/** Texto legible para los días restantes de una vacuna */
export function daysLeftLabel(nextDueDate: string): string {
  const days = daysUntil(nextDueDate)
  if (days < 0)   return `Vencida hace ${Math.abs(days)} día${Math.abs(days) > 1 ? 's' : ''}`
  if (days === 0) return 'Vence hoy'
  if (days === 1) return 'Vence mañana'
  return `En ${days} días`
}

// ── VALIDACIONES ──────────────────────────────────────────────

/**
 * Valida formato RUT chileno: 12.345.678-9 o 12345678-9
 */
export function isValidRUT(rut: string): boolean {
  const clean = rut.replace(/\./g, '').replace('-', '')
  if (clean.length < 8) return false
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1).toUpperCase()
  let sum = 0
  let multiplier = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }
  const remainder = 11 - (sum % 11)
  const expected =
    remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder)
  return dv === expected
}

/** Formatea RUT automáticamente mientras el usuario escribe */
export function formatRUT(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 9)
  if (clean.length <= 1) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${dv}`
}

// ── ESPECIES ──────────────────────────────────────────────────

/** Emoji representativo para cada especie */
export function speciesEmoji(species: string): string {
  const map: Record<string, string> = {
    Perro: '🐕',
    Gato: '🐈',
    Conejo: '🐇',
    Ave: '🦜',
    Reptil: '🦎',
    Otro: '🐾',
  }
  return map[species] ?? '🐾'
}

/** Color de fondo suave para el avatar de especie */
export function speciesBg(species: string): string {
  const map: Record<string, string> = {
    Perro:  'bg-pink-50',
    Gato:   'bg-indigo-50',
    Conejo: 'bg-purple-50',
    Ave:    'bg-amber-50',
    Reptil: 'bg-green-50',
    Otro:   'bg-gray-50',
  }
  return map[species] ?? 'bg-gray-50'
}

// ── SERVICIOS ─────────────────────────────────────────────────

/** Datos visuales para cada tipo de servicio */
export const SERVICE_META: Record<
  string,
  { icon: string; color: string; bg: string; border: string }
> = {
  'Consulta General': {
    icon: '🩺',
    color: 'text-pink-900',
    bg: 'bg-pink-50',
    border: 'border-pink-300',
  },
  Vacunación: {
    icon: '💉',
    color: 'text-green-900',
    bg: 'bg-green-50',
    border: 'border-green-300',
  },
  Control: {
    icon: '📋',
    color: 'text-amber-900',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
  },
  Telemedicina: {
    icon: '💻',
    color: 'text-indigo-900',
    bg: 'bg-indigo-50',
    border: 'border-indigo-300',
  },
}

// ── GENERACIÓN DE UUID SIMPLE (browser) ───────────────────────
export function generateId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 10)
}
