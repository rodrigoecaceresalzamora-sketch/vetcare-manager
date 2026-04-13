-- ============================================================
-- VetCare Manager — Agregar campos de personalización avanzados
-- Archivo: 016_add_advanced_config_fields.sql
-- ============================================================

ALTER TABLE public.clinic_config
  ADD COLUMN IF NOT EXISTS booking_limit_notice text DEFAULT 'No se atiende fuera de Quilpué y alrededores.',
  ADD COLUMN IF NOT EXISTS show_booking_limit_notice boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS primary_text_color text DEFAULT '#111827',
  ADD COLUMN IF NOT EXISTS secondary_text_color text DEFAULT '#6b7280';
