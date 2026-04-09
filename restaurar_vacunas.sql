-- ============================================================
-- VetCare Manager — Script de restauración de Vacunas
-- Ejecutar este script en el editor SQL de Supabase
-- ============================================================

-- 1. Crear tabla de vacunaciones (si no existe)
CREATE TABLE IF NOT EXISTS public.vaccinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    vaccine_name TEXT NOT NULL,
    applied_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    lot_number TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS para vaccinations
-- STAFF: Acceso total
DROP POLICY IF EXISTS "Enable all for staff" ON public.vaccinations;
CREATE POLICY "Enable all for staff" ON public.vaccinations
    FOR ALL
    USING (
        auth.jwt() ->> 'email' IN (
            SELECT email FROM public.staff
        ) OR
        auth.jwt() ->> 'email' = 'scaceresalzamora@gmail.com'
    )
    WITH CHECK (
        auth.jwt() ->> 'email' IN (
            SELECT email FROM public.staff
        ) OR
        auth.jwt() ->> 'email' = 'scaceresalzamora@gmail.com'
    );

-- TUTORES: Lectura de vacunas de sus propias mascotas
DROP POLICY IF EXISTS "Enable read for guardians" ON public.vaccinations;
CREATE POLICY "Enable read for guardians" ON public.vaccinations
    FOR SELECT
    USING (
        patient_id IN (
            SELECT id FROM public.patients
            WHERE guardian_id IN (
                SELECT id FROM public.guardians
                WHERE email = auth.jwt() ->> 'email'
            )
        )
    );

-- 4. Re-insertar servicios de vacunación (si fueron borrados)
-- Nota: Usamos INSERT ON CONFLICT DO NOTHING o DO UPDATE para no duplicar si existen
INSERT INTO public.services (id, name, price, duration_minutes, description, icon)
VALUES 
    (gen_random_uuid(), 'Vacuna Séxtuple', 18000, 15, 'Vacuna canina contra Distemper, Parvovirus, Hepatitis, Leptospirosis y Parainfluenza.', '💉'),
    (gen_random_uuid(), 'Vacuna Antirrábica', 12000, 15, 'Vacuna obligatoria por ley contra el virus de la rabia.', '💉'),
    (gen_random_uuid(), 'Vacuna Triple Felina', 15000, 15, 'Protección contra Rinotraqueitis, Calicivirus y Panleucopenia felina.', '🐱'),
    (gen_random_uuid(), 'Vacuna Leucemia Felina', 18000, 15, 'Protección contra el virus de la Leucemia Felina (requiere test previo).', '💉'),
    (gen_random_uuid(), 'Vacuna KC (Tos de las Perreras)', 20000, 15, 'Protección contra Bordetella bronchiseptica y Parainfluenza canina.', '🐶')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon;

-- Asegurarse de que el campo 'name' sea único para que el ON CONFLICT funcione
-- Si no es único, este paso podría fallar, pero en este esquema 'services' suele tener nombres únicos.
-- ALTER TABLE public.services ADD CONSTRAINT services_name_key UNIQUE (name);
