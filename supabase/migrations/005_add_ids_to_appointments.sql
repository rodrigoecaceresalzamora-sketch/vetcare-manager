-- ============================================================
-- VetCare Manager — 005_add_ids_to_appointments.sql
-- Vincula citas con pacientes y tutores registrados
-- ============================================================

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS guardian_id uuid REFERENCES public.guardians(id) ON DELETE SET NULL;

-- Crear índices para búsquedas más rápidas
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_guardian_id ON public.appointments(guardian_id);

COMMENT ON COLUMN public.appointments.patient_id IS 'Vinculación directa con la ficha de la mascota si ya existe';
COMMENT ON COLUMN public.appointments.guardian_id IS 'Vinculación directa con la ficha del tutor si ya existe';
