-- Añadir campos para notificación administrativa de nuevas reservas
ALTER TABLE clinic_config
ADD COLUMN IF NOT EXISTS email_subject_new_booking_admin TEXT DEFAULT 'Nueva Reserva Recibida 🐾',
ADD COLUMN IF NOT EXISTS email_body_new_booking_admin TEXT DEFAULT 'Hola, tienes una nueva reserva de {tutor} para {mascota} el día {fecha} a las {hora}.';

COMMENT ON COLUMN clinic_config.email_subject_new_booking_admin IS 'Asunto del correo que recibe la clínica cuando alguien agenda.';
COMMENT ON COLUMN clinic_config.email_body_new_booking_admin IS 'Cuerpo del correo que recibe la clínica cuando alguien agenda.';
