-- ============================================================
-- VetCare Manager — Migración a SaaS / Multi-tenant (DEfinitiva)
-- Resuelve el error de recursión infinita en RLS
-- ============================================================

-- 1. Función de ayuda (SECURITY DEFINER) para obtener la clínica del usuario actual
-- Esto rompe la recursión infinita en RLS
CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS uuid 
LANGUAGE sql 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM public.staff 
  WHERE email = auth.jwt() ->> 'email' 
  LIMIT 1;
$$;

-- 2. Asegurarse de que la tabla clinics existe
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

-- 3. Columnas clinic_id (ya deberían existir pero aseguramos)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'clinic_id') THEN
        ALTER TABLE public.guardians ADD COLUMN clinic_id uuid REFERENCES public.clinics(id);
        ALTER TABLE public.patients ADD COLUMN clinic_id uuid REFERENCES public.clinics(id);
        ALTER TABLE public.vaccinations ADD COLUMN clinic_id uuid REFERENCES public.clinics(id);
        ALTER TABLE public.appointments ADD COLUMN clinic_id uuid REFERENCES public.clinics(id);
        ALTER TABLE public.stock_items ADD COLUMN clinic_id uuid REFERENCES public.clinics(id);
        ALTER TABLE public.services ADD COLUMN clinic_id uuid REFERENCES public.clinics(id);
        ALTER TABLE public.staff ADD COLUMN clinic_id uuid REFERENCES public.clinics(id);
        ALTER TABLE public.clinic_config ADD COLUMN clinic_id uuid REFERENCES public.clinics(id);
    END IF;
END $$;

-- 4. Habilitar RLS en todo
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_config ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DEFINITIVAS (Sin Recursión)

-- Políticas para CLINICS
DROP POLICY IF EXISTS "Users can see their own clinic" ON public.clinics;
CREATE POLICY "Users can see their own clinic" ON public.clinics
FOR SELECT USING (auth.uid() = owner_id OR id = get_my_clinic_id());

DROP POLICY IF EXISTS "Owners can update their clinic" ON public.clinics;
CREATE POLICY "Owners can update their clinic" ON public.clinics
FOR UPDATE USING (auth.uid() = owner_id);

-- Políticas para STAFF (Uso de email directo para evitar recursión)
DROP POLICY IF EXISTS "Staff see own clinic data" ON public.staff;
DROP POLICY IF EXISTS "Admins manage staff" ON public.staff;
DROP POLICY IF EXISTS "Clinic Data Isolation" ON public.staff;

CREATE POLICY "Staff visibility" ON public.staff
FOR SELECT USING (
    email = auth.jwt() ->> 'email' OR 
    clinic_id IN (SELECT id FROM public.clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Admin staff management" ON public.staff
FOR ALL USING (
    clinic_id IN (SELECT id FROM public.clinics WHERE owner_id = auth.uid())
);

-- Políticas generales para el resto de tablas
DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
    AND table_name IN ('guardians', 'patients', 'vaccinations', 'appointments', 'stock_items', 'services', 'clinic_config')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "Clinic Data Isolation" ON public.' || t;
        EXECUTE 'DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.' || t;
        EXECUTE 'CREATE POLICY "Clinic Data Isolation" ON public.' || t || 
                ' FOR ALL USING (clinic_id = get_my_clinic_id() OR clinic_id IN (SELECT id FROM public.clinics WHERE owner_id = auth.uid()))';
    END LOOP;
END $$;
