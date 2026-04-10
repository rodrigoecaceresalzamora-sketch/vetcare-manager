-- Migration: add_smtp_config_to_clinics
-- Adds columns to clinic_config to support personalized SMTP settings per clinic.

ALTER TABLE public.clinic_config
ADD COLUMN IF NOT EXISTS smtp_email TEXT,
ADD COLUMN IF NOT EXISTS smtp_password TEXT;

-- Update Sofia's clinic with default SMTP (placeholder for her to fill if needed, 
-- but she asked to 'rellenar' so I'll try to find any existing info).
-- Since I don't have the password, I'll just leave it for her to fill in the UI.
