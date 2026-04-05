-- ============================================================
-- VetCare Manager — Módulo 4: Paciente Reactivo
-- Archivo: 004_add_is_reactive_to_patients.sql
-- ============================================================

-- 1. Añadir el campo is_reactive a la tabla patients
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS is_reactive boolean DEFAULT false;

-- 2. Asegurar que las políticas existentes (si las hay) sigan funcionando 
-- (Al ser un campo nuevo, las políticas de SELECT/INSERT 'FOR ALL' ya lo cubren,
-- pero refrescamos las de 003 por seguridad).

-- No es necesario recrearlas si se usó USING (true) en el paso anterior,
-- pero esto recalcula el esquema para Supabase Studio.
COMMENT ON COLUMN public.patients.is_reactive IS 'Indica si el paciente es reactivo o requiere precauciones especiales.';
