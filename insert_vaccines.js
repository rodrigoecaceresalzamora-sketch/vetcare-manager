import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config({ path: resolve('.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const vaccines = [
  { name: 'Vacunación: Sextuple (Perro)', price: 15000, duration_minutes: 15, icon: '💉', description: 'Cubre: Parvovirus, Distemper, Adenovirus 2, Parainfluenza, Leptospirosis.' },
  { name: 'Vacunación: Octuple (Perro)', price: 20000, duration_minutes: 15, icon: '💉', description: 'Cubre: Séxtuple + Coronavirus + Leptospira (otra cepa).' },
  { name: 'Vacunación: KC (Perro)', price: 18000, duration_minutes: 15, icon: '🌬️', description: 'Prevención de Traqueobronquitis (Tos de las perreras).' },
  { name: 'Vacunación: Triple Felina (Gato)', price: 18000, duration_minutes: 15, icon: '🐈', description: 'Cubre: Rinotraqueitis, Calicivirus, Panleucopenia.' },
  { name: 'Vacunación: Leucemia (Gato)', price: 20000, duration_minutes: 15, icon: '🩸', description: 'Prevención de Leucemia Felina.' },
  { name: 'Vacunación: Antirrábica', price: 12000, duration_minutes: 15, icon: '🛡️', description: 'Prevención de Rabia (Obligatoria para perros y gatos).' }
];

async function run() {
  // First, let's delete existing ones if they exist to avoid dupes
  for (const v of vaccines) {
    await supabase.from('services').delete().eq('name', v.name);
  }
  const { error } = await supabase.from('services').insert(vaccines);
  if (error) console.error(error);
  else console.log('Vaccines inserted successfully');
}
run();
