-- ============================================================
-- VetCare Manager — Tabla de Configuración Global (006)
-- CORRE ESTO EN EL EDITOR SQL DE SUPABASE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clinic_config (
    id integer PRIMARY KEY DEFAULT 1,
    clinic_name text NOT NULL DEFAULT 'VetCare Manager',
    clinic_logo_url text,
    primary_color text NOT NULL DEFAULT '#E11D48',
    secondary_color text NOT NULL DEFAULT '#FDF2F8',
    contact_phone text DEFAULT '+56951045611',
    contact_email text DEFAULT 'scaceresalzamora@gmail.com',
    address text DEFAULT 'San Enrique 1380, Retiro, Quilpué',
    google_maps_embed_url text DEFAULT 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3345.9221147714574!2d-71.44295462343997!3d-33.00587297576572!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9689d98410214c79%3A0xc3f95e5058760086!2sSan%20Enrique%201380%2C%202421370%20Quilpu%C3%A9%2C%20Valpara%C3%ADso!5e0!3m2!1ses-419!2scl!4v1712613145464!5m2!1ses-419!2scl',
    transfer_details text DEFAULT 'NOMBRE: SOFIA CACERES\nBANCO: BANCO ESTADO\nCTA RUT: 12345678\nCORREO: scaceresalzamora@gmail.com\nRUT: 12.345.678-9',
    advance_payment_percentage integer DEFAULT 20,
    wa_template_reminder text DEFAULT 'Hola {tutor}, recordamos la vacuna de {mascota} ({vacuna}) para el día {fecha}. Lugar: {direccion}.',
    wa_template_confirmation text DEFAULT '¡Hola {tutor}! Tu cita para {mascota} ha sido confirmada para el {fecha} a las {hora}.',
    -- Estructura de horarios: { "2": ["10:00", "10:30"], "3": [...] }
    schedule jsonb DEFAULT '{"2": ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "15:00", "15:30"], "3": ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "15:00", "15:30"], "4": ["10:00", "10:30", "11:00", "11:30", "12:00"], "6": ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30"]}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT only_one_row CHECK (id = 1)
);

-- Insertar fila inicial si no existe
INSERT INTO public.clinic_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.clinic_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public and Staff Read Config" ON public.clinic_config;
CREATE POLICY "Public and Staff Read Config"
  ON public.clinic_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Update Config" ON public.clinic_config;
CREATE POLICY "Admin Update Config"
  ON public.clinic_config FOR UPDATE USING (
    auth.jwt() ->> 'email' IN (SELECT email FROM public.staff WHERE role = 'admin') OR
    auth.jwt() ->> 'email' = 'scaceresalzamora@gmail.com'
  );
