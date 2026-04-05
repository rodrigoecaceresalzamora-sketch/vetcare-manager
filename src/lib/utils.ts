// ============================================================
// VetCare Manager — Utilidades compartidas
// ============================================================

import type { BoostInterval, VaccineStatus } from '../types'

// ── FECHAS ────────────────────────────────────────────────────

/**
 * Calcula la edad de una mascota a partir de su fecha de nacimiento.
 * Devuelve una cadena legible: "3 años", "8 meses", etc.
 */
export function calcAge(dateOfBirth: string | null | undefined): string {
  if (!dateOfBirth) return 'Desconocida'
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
  const clean = value.replace(/[^0-9kK]/g, '').slice(0, 9)
  if (clean.length <= 1) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1).toUpperCase()
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${dv}`
}

/** 
 * Valida si un número telefónico tiene al menos 9 dígitos 
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return true
  const clean = phone.replace(/\D/g, '')
  return clean.length >= 9
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

// ── GRAVATAR & HASHING ────────────────────────────────────────

/**
 * Función ultra-ligera para MD5 (necesaria para Gravatar)
 */
function md5(string: string) {
  function md5cycle(x: any, k: any) {
    var a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176416597);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894946606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787280);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q: any, a: any, b: any, x: any, s: any, t: any) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  function ff(a: any, b: any, c: any, d: any, x: any, s: any, t: any) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }
  function gg(a: any, b: any, c: any, d: any, x: any, s: any, t: any) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }
  function hh(a: any, b: any, c: any, d: any, x: any, s: any, t: any) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: any, b: any, c: any, d: any, x: any, s: any, t: any) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }
  function add32(a: any, b: any) {
    return (a + b) & 0xFFFFFFFF;
  }

  function md51(s: any) {
    var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i: any;
    for (i = 64; i <= s.length; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++)
      tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function md5blk(s: any) {
    var md5blks = [], i;
    for (i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  var hex_chr = '0123456789abcdef'.split('');

  function rhex(n: any) {
    var s = '', j = 0;
    for (; j < 4; j++)
      s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
    return s;
  }

  function hex(x: any) {
    for (var i = 0; i < x.length; i++)
      x[i] = rhex(x[i]);
    return x.join('');
  }

  return hex(md51(string));
}

/**
 * Genera el URL de Gravatar a partir de un email.
 */
export function getGravatarUrl(email: string | undefined): string {
  if (!email) return '/logo.png'
  const hash = md5(email.trim().toLowerCase())
  return `https://www.gravatar.com/avatar/${hash}?d=mp&s=200`
}
