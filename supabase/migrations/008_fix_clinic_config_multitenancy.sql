-- ============================================================
-- VetCare Manager — REPARACIÓN TOTAL DE CLINIC_CONFIG (008)
-- Este script es ultra-robusto para evitar errores de duplicados o llaves
-- ============================================================

DO $$ 
BEGIN
    -- 1. Eliminar restricciones y llaves previas que causan conflictos
    ALTER TABLE IF EXISTS public.clinic_config DROP CONSTRAINT IF EXISTS only_one_row;
    ALTER TABLE IF EXISTS public.clinic_config DROP CONSTRAINT IF EXISTS clinic_config_pkey;
    ALTER TABLE IF EXISTS public.clinic_config DROP CONSTRAINT IF EXISTS clinic_config_clinic_id_key;

    -- 2. Asegurar que existe la columna clinic_id (por si falló la migración 007)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinic_config' AND column_name = 'clinic_id') THEN
        ALTER TABLE public.clinic_config ADD COLUMN clinic_id uuid REFERENCES public.clinics(id);
    END IF;

    -- 3. Rescatar datos huérfanos asociándolos a la clínica de la Dra. Sofía o a la primera disponible
    UPDATE public.clinic_config SET clinic_id = (
        SELECT id FROM public.clinics 
        WHERE owner_id IN (SELECT id FROM auth.users WHERE email = 'scaceresalzamora@gmail.com') 
        LIMIT 1
    ) WHERE clinic_id IS NULL;
    
    UPDATE public.clinic_config SET clinic_id = (SELECT id FROM public.clinics LIMIT 1)
    WHERE clinic_id IS NULL;

    -- 4. Limpieza de columna ID y establecimiento de nueva Primary Key
    -- IMPORTANTE: Borramos la columna ID vieja que era serial y causaba conflicto en el insert
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinic_config' AND column_name = 'id') THEN
        ALTER TABLE public.clinic_config DROP COLUMN id;
    END IF;
    
    -- Hacer clinic_id obligatorio
    ALTER TABLE public.clinic_config ALTER COLUMN clinic_id SET NOT NULL;
    
    -- Añadir la PK sobre clinic_id
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinic_config_pkey') THEN
        ALTER TABLE public.clinic_config ADD PRIMARY KEY (clinic_id);
    END IF;

END $$;

-- 5. Reinicio total de políticas de seguridad (RLS)
DROP POLICY IF EXISTS "Admin Manage Config" ON public.clinic_config;
DROP POLICY IF EXISTS "Public Read Config" ON public.clinic_config;
DROP POLICY IF EXISTS "Clinic Admin Manage Config" ON public.clinic_config;
DROP POLICY IF EXISTS "Public and Staff Read Config" ON public.clinic_config;
DROP POLICY IF EXISTS "Admin Update Config" ON public.clinic_config;
DROP POLICY IF EXISTS "Clinic Data Isolation" ON public.clinic_config;

ALTER TABLE public.clinic_config ENABLE ROW LEVEL SECURITY;

-- Lectura abierta (necesaria para el portal público de reservas)
CREATE POLICY "Public Read Config" ON public.clinic_config FOR SELECT USING (true);

-- Gestión total para Dueños y Administradores
CREATE POLICY "Admin Manage Config" ON public.clinic_config FOR ALL TO authenticated
USING (
    clinic_id IN (SELECT id FROM public.clinics WHERE owner_id = auth.uid()) OR
    clinic_id = (SELECT clinic_id FROM public.staff WHERE email = auth.jwt() ->> 'email' AND role = 'admin') OR
    auth.jwt() ->> 'email' = 'scaceresalzamora@gmail.com'
)
WITH CHECK (
    clinic_id IN (SELECT id FROM public.clinics WHERE owner_id = auth.uid()) OR
    clinic_id = (SELECT clinic_id FROM public.staff WHERE email = auth.jwt() ->> 'email' AND role = 'admin') OR
    auth.jwt() ->> 'email' = 'scaceresalzamora@gmail.com'
);
