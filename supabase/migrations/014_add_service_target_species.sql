-- Agregar columna target_species a la tabla de servicios
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS target_species text DEFAULT 'Ambos';

-- Asegurar restricción simple
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS check_target_species;
ALTER TABLE public.services ADD CONSTRAINT check_target_species CHECK (target_species IN ('Ambos', 'Perro', 'Gato'));
