-- ============================================================
-- VetCare Manager — Seguridad de Stock (RLS)
-- Ejecutar este script en el editor SQL de Supabase
-- ============================================================

-- 1. Asegurar que RLS esté habilitado
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas anteriores de stock si existen
DROP POLICY IF EXISTS "Enable read for staff" ON public.stock_items;
DROP POLICY IF EXISTS "Enable insert for staff" ON public.stock_items;
DROP POLICY IF EXISTS "Enable update for staff" ON public.stock_items;
DROP POLICY IF EXISTS "Enable delete for admin only" ON public.stock_items;

-- 3. Lectura: Todo el personal (admin y ayudante)
CREATE POLICY "Enable read for staff" ON public.stock_items
    FOR SELECT
    USING (
        auth.jwt() ->> 'email' IN (SELECT email FROM public.staff) OR
        auth.jwt() ->> 'email' = 'scaceresalzamora@gmail.com'
    );

-- 4. Inserción: Todo el personal
CREATE POLICY "Enable insert for staff" ON public.stock_items
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'email' IN (SELECT email FROM public.staff) OR
        auth.jwt() ->> 'email' = 'scaceresalzamora@gmail.com'
    );

-- 5. Actualización: Todo el personal (para sumar/restar stock)
CREATE POLICY "Enable update for staff" ON public.stock_items
    FOR UPDATE
    USING (
        auth.jwt() ->> 'email' IN (SELECT email FROM public.staff) OR
        auth.jwt() ->> 'email' = 'scaceresalzamora@gmail.com'
    );

-- 6. Eliminación: SÓLO Administradores
CREATE POLICY "Enable delete for admin only" ON public.stock_items
    FOR DELETE
    USING (
        (auth.jwt() ->> 'email' IN (SELECT email FROM public.staff WHERE role = 'admin')) OR
        auth.jwt() ->> 'email' = 'scaceresalzamora@gmail.com'
    );
