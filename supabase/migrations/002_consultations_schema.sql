-- ============================================================
-- VetCare Manager — Consultations & Storage Schema
-- Archivo: 002_consultations_schema.sql
-- ============================================================

-- 1. Tabla de Consultas
CREATE TABLE IF NOT EXISTS public.consultations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  
  reason_for_consultation text,
  current_anamnesis text,
  remote_anamnesis text,
  weight_kg numeric,
  
  -- Examen Físico
  heart_rate text,
  respiratory_rate text,
  temperature text,
  capillary_refill text,
  skin_fold text,
  hydration text,
  lymph_nodes text,
  body_condition text,
  pulse text,
  
  -- Generales
  observations text,
  diagnosis text,
  treatment text,
  complementary_exams text,
  referral text,
  
  created_at timestamp with time zone DEFAULT now()
);

-- Políticas para permitir inserciones públicas (para probar en Vercel sin auth robusto)
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all actions for anon users on consultations" 
  ON public.consultations FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 2. Storage Bucket (patient_files)
-- Esto crea el bucket oficial de Supabase para contener los adjuntos
-- IMPORTANTE: Corre esto en el Editor SQL de tu Supabase
-- ============================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('patient_files', 'patient_files', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de lectura y escritura para el bucket Storage
CREATE POLICY "Public Access patient_files" 
  ON storage.objects FOR SELECT 
  USING ( bucket_id = 'patient_files' );

CREATE POLICY "Public Upload patient_files" 
  ON storage.objects FOR INSERT 
  WITH CHECK ( bucket_id = 'patient_files' );

CREATE POLICY "Public Delete patient_files" 
  ON storage.objects FOR DELETE 
  USING ( bucket_id = 'patient_files' );
