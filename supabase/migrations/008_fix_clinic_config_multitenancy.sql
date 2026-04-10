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
-- Si hay filas sin clinic_id, intentamos rescatarlas para la clínica actual del ejecutor
UPDATE public.clinic_config SET clinic_id = get_my_clinic_id() WHERE clinic_id IS NULL;
ALTER TABLE public.clinic_config ALTER COLUMN clinic_id SET NOT NULL;

-- 5. Definir clinic_id como la nueva PRIMARY KEY
ALTER TABLE public.clinic_config ADD PRIMARY KEY (clinic_id);

-- 5. Actualizar políticas de RLS para mayor claridad
DROP POLICY IF EXISTS "Public and Staff Read Config" ON public.clinic_config;
DROP POLICY IF EXISTS "Admin Update Config" ON public.clinic_config;
DROP POLICY IF EXISTS "Clinic Data Isolation" ON public.clinic_config;

-- Política de lectura: Cualquier usuario puede leer si conoce el ID (necesario para portal público)
CREATE POLICY "Public Read Config"
  ON public.clinic_config FOR SELECT USING (true);

-- Política de gestión: Solo admins de la clínica o el dueño pueden modificar
CREATE POLICY "Clinic Admin Manage Config"
  ON public.clinic_config FOR ALL USING (
    clinic_id = get_my_clinic_id() OR 
    clinic_id IN (SELECT id FROM public.clinics WHERE owner_id = auth.uid())
  );
