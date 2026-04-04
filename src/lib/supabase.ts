// ============================================================
// VetCare Manager — Cliente Supabase (singleton)
// Importa este cliente en todos los módulos que necesiten
// acceder a la base de datos o al Storage.
// ============================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '❌ Faltan variables de entorno de Supabase.\n' +
    'Crea un archivo .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
