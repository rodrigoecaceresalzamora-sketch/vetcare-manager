import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xxx.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'xxx'
// Actually I need to run this against their DB, but wait, if it's on localhost, maybe I can just write a script that imports supabase from src/lib/supabase?
