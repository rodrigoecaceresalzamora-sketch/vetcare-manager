-- ============================================================
-- VetCare Manager — Migration: 019_add_tutor_photo_config.sql
-- Agrega configuración para permitir carga de fotos por tutores.
-- ============================================================

ALTER TABLE public.clinic_config ADD COLUMN IF NOT EXISTS allow_tutor_photo_upload boolean DEFAULT true;
