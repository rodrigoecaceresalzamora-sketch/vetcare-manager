-- ============================================================
-- VetCare Manager — Migración a SaaS / Multi-tenant (007)
-- ============================================================

-- 1. Crear tabla de Clínicas (Tenants)
CREATE TABLE IF NOT EXISTS public.clinics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL DEFAULT 'Nueva Clínica',
    owner_id uuid NOT NULL REFERENCES auth.users(id),
    plan_type text NOT NULL DEFAULT 'basic' CHECK (plan_type IN ('basic', 'pro')),
    is_paid boolean DEFAULT false,
    subscription_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Añadir clinic_id a todas las tablas de datos
-- (Lo pondremos como opcional primero para migrar datos existentes)

ALTER TABLE public.guardians ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);

-- 3. Vincular configuraciones a la clínica
-- Eliminamos la restricción de 'id=1' de la tabla anterior para que cada clínica tenga la suya
ALTER TABLE public.clinic_config ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
ALTER TABLE public.clinic_config DROP CONSTRAINT IF EXISTS only_one_row;

-- 4. Habilitar RLS en Clínicas
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own clinic" 
    ON public.clinics FOR SELECT 
    USING (
        auth.uid() = owner_id OR 
        id IN (SELECT clinic_id FROM public.staff WHERE email = auth.jwt() ->> 'email')
    );

CREATE POLICY "Owners can update their clinic" 
    ON public.clinics FOR UPDATE 
    USING (auth.uid() = owner_id);

-- 5. Actualizar Políticas de Tablas de Datos
-- (Reseteamos políticas anteriores para forzar el filtro por clinic_id)

DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
    AND table_name IN ('guardians', 'patients', 'vaccinations', 'appointments', 'stock_items', 'services', 'staff', 'clinic_config')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.' || t;
        EXECUTE 'CREATE POLICY "Clinic Data Isolation" ON public.' || t || 
                ' FOR ALL USING (clinic_id = (SELECT clinic_id FROM public.staff WHERE email = auth.jwt() ->> ''email''))';
    END LOOP;
END $$;
