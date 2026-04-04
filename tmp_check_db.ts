import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('appointments').select('*').limit(1)
  if (error) console.log('ERROR:', error)
  else if (data && data.length > 0) {
    console.log('COLUMNS:', Object.keys(data[0]))
  } else {
    console.log('NO DATA TO INFER COLUMNS')
    // Fallback: try to insert and see what fails? No.
  }
}
check()
