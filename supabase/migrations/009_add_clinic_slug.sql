
-- Añadir columna de slug para URLs cortas y personalizadas
ALTER TABLE clinic_config ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Crear un índice para búsquedas rápidas por slug
CREATE INDEX IF NOT EXISTS idx_clinic_config_slug ON clinic_config(slug);

-- Actualizar slugs existentes con los primeros 8 caracteres del clinic_id como fallback
UPDATE clinic_config SET slug = substring(clinic_id::text, 1, 8) WHERE slug IS NULL;
