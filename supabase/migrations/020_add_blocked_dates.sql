-- Añadir columna de días bloqueados a clinic_config
ALTER TABLE "public"."clinic_config" ADD COLUMN IF NOT EXISTS "blocked_dates" JSONB DEFAULT '[]'::jsonb;
