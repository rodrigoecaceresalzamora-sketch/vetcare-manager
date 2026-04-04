-- ============================================================
-- VetCare Manager — Initial Schema (001_initial_schema.sql)
-- Para que el usuario lo aplique a su proyecto Supabase DB
-- ============================================================

-- Tabla de Tutores (Guardians)
CREATE TABLE IF NOT EXISTS public.guardians (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  rut text NOT NULL,
  phone text NOT NULL,
  email text,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabla de Pacientes (Patients)
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guardian_id uuid NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  name text NOT NULL,
  species text NOT NULL,
  breed text NOT NULL,
  date_of_birth date NOT NULL,
  sex text NOT NULL,
  weight_kg numeric,
  microchip text,
  status text DEFAULT 'activo'::text,
  photo_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla de Vacunas (Vaccinations)
CREATE TABLE IF NOT EXISTS public.vaccinations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vaccine_name text NOT NULL,
  applied_date date NOT NULL,
  lot_number text,
  next_due_date date NOT NULL,
  reminder_sent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS (Opcional, se deshabilita para este prototipo si se usa service_role key, 
-- pero buenas prácticas implican configurarlo). 
-- Para acceso publico (anon key) a fines de prototipo sin auth:
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;

-- Políticas correctas para SELECT, INSERT, UPDATE, DELETE público (Prototipo/Local)
CREATE POLICY "Enable all actions for anon users on guardians" 
  ON public.guardians FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all actions for anon users on patients" 
  ON public.patients FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all actions for anon users on vaccinations" 
  ON public.vaccinations FOR ALL USING (true) WITH CHECK (true);
