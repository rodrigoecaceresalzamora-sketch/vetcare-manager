-- ============================================================
-- VetCare Manager — 004_appointments_table.sql
-- CORRE ESTO EN EL EDITOR SQL DE SUPABASE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guardian_name    text NOT NULL,
  guardian_email   text NOT NULL,
  guardian_phone   text,
  guardian_rut     text,
  pet_name         text NOT NULL,
  service          text NOT NULL,
  scheduled_at     timestamptz NOT NULL,
  duration_minutes integer DEFAULT 30,
  status           text DEFAULT 'pendiente',
  source           text DEFAULT 'interno',
  notes            text,
  is_home_visit    boolean DEFAULT false,
  address          text,
  google_event_id  text,
  meet_link        text,
  -- Campos portal público
  pet_species      text,
  pet_breed        text,
  pet_sex          text,
  pet_date_of_birth date,
  pet_adopted_since date,
  pet_is_reactive  boolean DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

-- Agregar columnas faltantes si la tabla ya existe
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS guardian_rut     text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS source           text DEFAULT 'interno';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notes            text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS is_home_visit    boolean DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS address          text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS pet_species      text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS pet_breed        text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS pet_sex          text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS pet_date_of_birth date;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS pet_adopted_since date;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS pet_is_reactive  boolean DEFAULT false;

-- RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public and Auth Access Appointments" ON public.appointments;
CREATE POLICY "Public and Auth Access Appointments"
  ON public.appointments FOR ALL USING (true) WITH CHECK (true);
