-- ============================================================
-- VetCare Manager — Reparación de Políticas (003_fix_auth_policies.sql)
-- Corrección para que el Administrador (Authenticated) vea los datos.
-- ============================================================

-- 1. Asegurar que las tablas tengan RLS habilitado
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
-- Intentar con appointments (si existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'appointments') THEN
        ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 2. Eliminar políticas antiguas para evitar conflictos
DROP POLICY IF EXISTS "Enable all actions for anon users on guardians" ON public.guardians;
DROP POLICY IF EXISTS "Enable all actions for anon users on patients" ON public.patients;
DROP POLICY IF EXISTS "Enable all actions for anon users on vaccinations" ON public.vaccinations;
DROP POLICY IF EXISTS "Enable all actions for anon users on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Enable all actions for anon users on appointments" ON public.appointments;

-- 3. Crear políticas UNIFICADAS (permiten 'anon' y 'authenticated' a la espera de roles más granulares)
-- Esto restaura la visibilidad para el administrador logueado inmediatamente.

-- Guardians
CREATE POLICY "Public and Auth Access Guardians" ON public.guardians 
  FOR ALL USING (true) WITH CHECK (true);

-- Patients
CREATE POLICY "Public and Auth Access Patients" ON public.patients 
  FOR ALL USING (true) WITH CHECK (true);

-- Vaccinations
CREATE POLICY "Public and Auth Access Vaccinations" ON public.vaccinations 
  FOR ALL USING (true) WITH CHECK (true);

-- Consultations
CREATE POLICY "Public and Auth Access Consultations" ON public.consultations 
  FOR ALL USING (true) WITH CHECK (true);

-- Appointments (solo si existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'appointments') THEN
        EXECUTE 'CREATE POLICY "Public and Auth Access Appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true)';
    END IF;
END $$;
