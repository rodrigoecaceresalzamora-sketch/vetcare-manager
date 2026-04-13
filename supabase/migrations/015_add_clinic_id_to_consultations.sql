-- ============================================================
-- VetCare Manager — Agregar clinic_id a consultations
-- Archivo: 015_add_clinic_id_to_consultations.sql
--
-- INSTRUCCIONES: Ejecutar en el Editor SQL de Supabase
-- ============================================================

-- 1. Agregar columna clinic_id (si no existe)
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;

-- 2. Agregar columna service_id (si no existe, para vincular consulta con servicio de stock)
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;

-- 3. Agregar columnas de vacuna aplicada en consulta (si no existen)
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS applied_vaccine_name text,
  ADD COLUMN IF NOT EXISTS applied_vaccine_date text,
  ADD COLUMN IF NOT EXISTS applied_vaccine_lot  text;

-- 4. Poblar clinic_id desde el paciente relacionado (migración de datos existentes)
UPDATE public.consultations c
SET    clinic_id = p.clinic_id
FROM   public.patients p
WHERE  c.patient_id = p.id
  AND  c.clinic_id IS NULL;

-- 5. Eliminar política antigua (modo permisivo que usaba true/true)
DROP POLICY IF EXISTS "Enable all actions for anon users on consultations" ON public.consultations;

-- 6. Crear política RLS de aislamiento por clínica
DROP POLICY IF EXISTS "Clinic Data Isolation" ON public.consultations;
CREATE POLICY "Clinic Data Isolation" ON public.consultations
  FOR ALL
  USING (
    clinic_id = get_my_clinic_id()
    OR clinic_id IN (SELECT id FROM public.clinics WHERE owner_id = auth.uid())
  );
