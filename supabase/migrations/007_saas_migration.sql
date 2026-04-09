-- ============================================================
-- VetCare Manager — Migración a SaaS / Multi-tenant (Final)
-- Incluye reparación de recursión y migración de datos existentes
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
    owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
    plan_type text NOT NULL DEFAULT 'pro', -- Por defecto Pro para el admin principal
    is_paid boolean DEFAULT true,          -- Por defecto Pagado para el admin principal
    subscription_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Asegurar restricción UNIQUE en owner_id si la tabla ya existía
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinics_owner_id_key') THEN
        ALTER TABLE public.clinics ADD CONSTRAINT clinics_owner_id_key UNIQUE (owner_id);
    END IF;
END $$;

-- 3. Columnas clinic_id (ya deberían existir pero aseguramos)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'clinic_id') THEN
        ALTER TABLE public.guardians ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
        ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
        ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
        ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
        ALTER TABLE public.services ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
        ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
        ALTER TABLE public.clinic_config ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
    END IF;
END $$;

-- 4. MIGRECIÓN DE DATOS EXISTENTES PARA @scaceresalzamora
DO $$ 
DECLARE 
    v_admin_id uuid;
    v_clinic_id uuid;
BEGIN 
    -- 4.1 Obtener el ID del usuario admin por email
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'scaceresalzamora@gmail.com' LIMIT 1;

    IF v_admin_id IS NOT NULL THEN
        -- 4.2 Crear su clínica si no tiene una
        INSERT INTO public.clinics (name, owner_id, plan_type, is_paid)
        VALUES ('VetCare Principal', v_admin_id, 'pro', true)
        ON CONFLICT (owner_id) DO NOTHING;

        SELECT id INTO v_clinic_id FROM public.clinics WHERE owner_id = v_admin_id LIMIT 1;

        -- 4.3 Vincular todos los datos huérfanos a esta clínica
        UPDATE public.guardians SET clinic_id = v_clinic_id WHERE clinic_id IS NULL;
        UPDATE public.patients SET clinic_id = v_clinic_id WHERE clinic_id IS NULL;
        UPDATE public.vaccinations SET clinic_id = v_clinic_id WHERE clinic_id IS NULL;
        UPDATE public.appointments SET clinic_id = v_clinic_id WHERE clinic_id IS NULL;
        UPDATE public.stock_items SET clinic_id = v_clinic_id WHERE clinic_id IS NULL;
        UPDATE public.services SET clinic_id = v_clinic_id WHERE clinic_id IS NULL;
        UPDATE public.staff SET clinic_id = v_clinic_id WHERE clinic_id IS NULL;
        UPDATE public.clinic_config SET clinic_id = v_clinic_id WHERE clinic_id IS NULL;

        -- 4.4 Asegurar que el admin esté en la tabla staff
        INSERT INTO public.staff (email, role, clinic_id)
        VALUES ('scaceresalzamora@gmail.com', 'admin', v_clinic_id)
        ON CONFLICT (email) DO UPDATE SET clinic_id = v_clinic_id, role = 'admin';
    END IF;
END $$;

-- 5. Habilitar RLS en todo
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_config ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS DEFINITIVAS

-- Clínicas
DROP POLICY IF EXISTS "Users can see their own clinic" ON public.clinics;
CREATE POLICY "Users can see their own clinic" ON public.clinics
FOR SELECT USING (auth.uid() = owner_id OR id = get_my_clinic_id());

DROP POLICY IF EXISTS "Owners manage their clinic" ON public.clinics;
CREATE POLICY "Owners manage their clinic" ON public.clinics
FOR ALL USING (auth.uid() = owner_id);

-- Staff (Sin recursión)
DROP POLICY IF EXISTS "Staff see own clinic data" ON public.staff;
CREATE POLICY "Staff see own clinic data" ON public.staff
FOR SELECT USING (email = auth.jwt() ->> 'email' OR clinic_id IN (SELECT id FROM public.clinics WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admin staff management" ON public.staff;
CREATE POLICY "Admin staff management" ON public.staff
FOR ALL USING (clinic_id IN (SELECT id FROM public.clinics WHERE owner_id = auth.uid()));

-- Resto de tablas
DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
    AND table_name IN ('guardians', 'patients', 'vaccinations', 'appointments', 'stock_items', 'services', 'clinic_config')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "Clinic Data Isolation" ON public.' || t;
        EXECUTE 'CREATE POLICY "Clinic Data Isolation" ON public.' || t || 
                ' FOR ALL USING (clinic_id = get_my_clinic_id() OR clinic_id IN (SELECT id FROM public.clinics WHERE owner_id = auth.uid()))';
    END LOOP;
END $$;
