-- Migration: add_extra_templates_to_clinic_config
-- Adds more personalized email templates to clinic_config.

ALTER TABLE public.clinic_config
ADD COLUMN IF NOT EXISTS email_subject_confirmed TEXT,
ADD COLUMN IF NOT EXISTS email_body_confirmed TEXT,
ADD COLUMN IF NOT EXISTS email_subject_reminder_appointment TEXT,
ADD COLUMN IF NOT EXISTS email_body_reminder_appointment TEXT,
ADD COLUMN IF NOT EXISTS wa_template_reminder_appointment TEXT;

-- Update defaults for existing clinics
UPDATE public.clinic_config
SET 
  email_subject_confirmed = COALESCE(email_subject_confirmed, '¡Tu cita ha sido confirmada! ✅'),
  email_body_confirmed = COALESCE(email_body_confirmed, 'Hola {tutor}, te confirmamos que la cita de {mascota} para el día {fecha} a las {hora} ha sido confirmada.'),
  email_subject_reminder_appointment = COALESCE(email_subject_reminder_appointment, 'Recordatorio de tu cita próximamente 📅'),
  email_body_reminder_appointment = COALESCE(email_body_reminder_appointment, 'Hola {tutor}, te recordamos tu cita para {mascota} este {fecha} a las {hora}.');
