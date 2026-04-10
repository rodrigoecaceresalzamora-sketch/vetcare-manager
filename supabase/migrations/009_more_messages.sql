-- ============================================================
-- VetCare Manager — MÁS MENSAJES AUTOMÁTICOS (009)
-- ============================================================

DO $$ 
BEGIN
    -- 1. Añadir columnas para mensajes de cancelación
    ALTER TABLE public.clinic_config ADD COLUMN IF NOT EXISTS wa_template_cancellation text DEFAULT 'Hola {tutor}, lamentamos informarte que tu cita para {mascota} el día {fecha} ha sido cancelada.';
    ALTER TABLE public.clinic_config ADD COLUMN IF NOT EXISTS email_subject_cancellation text DEFAULT 'Cita Cancelada - VetCare';
    ALTER TABLE public.clinic_config ADD COLUMN IF NOT EXISTS email_body_cancellation text DEFAULT 'Hola {tutor}, tu cita para {mascota} programada para el día {fecha} ha sido cancelada. Si tienes dudas, contáctanos.';

    -- 2. Añadir columnas para mensajes de reprogramación (opcional pero útil)
    ALTER TABLE public.clinic_config ADD COLUMN IF NOT EXISTS wa_template_rescheduled text DEFAULT 'Hola {tutor}, tu cita para {mascota} ha sido reprogramada para el día {fecha} a las {hora}.';
    ALTER TABLE public.clinic_config ADD COLUMN IF NOT EXISTS email_subject_rescheduled text DEFAULT 'Cita Reprogramada - VetCare';
    ALTER TABLE public.clinic_config ADD COLUMN IF NOT EXISTS email_body_rescheduled text DEFAULT 'Hola {tutor}, te informamos que tu cita para {mascota} ha sido movida al día {fecha} a las {hora}.';

END $$;
