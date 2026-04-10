-- ============================================================
-- VetCare Manager — Reparación de Tabla Clinic Config (008)
-- Permite múltiples clínicas y define clinic_id como PK
-- ============================================================

-- 1. Eliminar la restricción restrictiva de una sola fila
ALTER TABLE public.clinic_config DROP CONSTRAINT IF EXISTS only_one_row;

-- 2. Eliminar llave primaria existente (necesario para cambiarla)
ALTER TABLE public.clinic_config DROP CONSTRAINT IF EXISTS clinic_config_pkey;

-- 3. Eliminar la columna id autoincremental que ya no usaremos
ALTER TABLE public.clinic_config DROP COLUMN IF EXISTS id;

-- 4. Asegurar que clinic_id sea NOT NULL para ser PK
-- Intentamos rescatar la fila huérfana (id=1) asociándola a la clínica principal si es necesario
DO $$ 
DECLARE 
    v_clinic_id uuid;
BEGIN
    -- Intentar obtener el clinic_id de la Dra. Sofía
    SELECT id INTO v_clinic_id FROM public.clinics WHERE owner_id IN (SELECT id FROM auth.users WHERE email = 'scaceresalzamora@gmail.com') LIMIT 1;
    
    -- Si no se encuentra, intentar obtener cualquier clínica (esto es para asegurar que la columna no quede nula)
    IF v_clinic_id IS NULL THEN
        SELECT id INTO v_clinic_id FROM public.clinics LIMIT 1;
    END IF;

    -- Actualizar filas huérfanas
    UPDATE public.clinic_config SET clinic_id = v_clinic_id WHERE clinic_id IS NULL;
END $$;

ALTER TABLE public.clinic_config ALTER COLUMN clinic_id SET NOT NULL;

-- 5. Definir clinic_id como la nueva PRIMARY KEY
-- Primero intentamos borrar cualquier índice único previo en clinic_id para evitar conflictos
DROP INDEX IF EXISTS public.clinic_config_clinic_id_key;
ALTER TABLE public.clinic_config ADD PRIMARY KEY (clinic_id);

-- 6. Actualizar políticas de RLS para mayor claridad y permisos totales al admin
DROP POLICY IF EXISTS "Admin Manage Config" ON public.clinic_config;
DROP POLICY IF EXISTS "Public Read Config" ON public.clinic_config;
DROP POLICY IF EXISTS "Clinic Admin Manage Config" ON public.clinic_config;
DROP POLICY IF EXISTS "Public and Staff Read Config" ON public.clinic_config;
DROP POLICY IF EXISTS "Admin Update Config" ON public.clinic_config;
DROP POLICY IF EXISTS "Clinic Data Isolation" ON public.clinic_config;

-- Política de lectura: Pública
CREATE POLICY "Public Read Config"
  ON public.clinic_config FOR SELECT USING (true);

-- Política de gestión: Dueño o Staff con rol admin
CREATE POLICY "Admin Manage Config"
  ON public.clinic_config FOR ALL 
  TO authenticated
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
