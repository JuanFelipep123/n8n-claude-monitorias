-- ============================================================
-- TurnoMonitores · US-2 · Script completo para Supabase
-- Ejecutar completo en: Supabase → SQL Editor → New query
-- ============================================================

-- 1. Tipo enumerado
CREATE TYPE estado_sala AS ENUM (
  'libre',
  'en_clase',
  'con_monitor',
  'cerrada'
);

-- 2. Tabla de sedes
CREATE TABLE sedes (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT         NOT NULL UNIQUE,
  nombre         TEXT         NOT NULL,
  hora_apertura  TIME         NOT NULL,
  hora_cierre    TIME         NOT NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3. Tabla de salas
CREATE TABLE salas (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id          UUID         NOT NULL REFERENCES sedes(id) ON DELETE RESTRICT,
  nombre           TEXT         NOT NULL,
  permite_externos BOOLEAN      NOT NULL DEFAULT true,
  estado           estado_sala  NOT NULL DEFAULT 'cerrada',
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 4. Índice para la consulta más frecuente
CREATE INDEX idx_salas_sede_id ON salas(sede_id);

-- 5. Función para mantener updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 6. Trigger
CREATE TRIGGER trg_salas_updated_at
BEFORE UPDATE ON salas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEED — datos de prueba con UUIDs fijos (iguales al mock)
-- ============================================================

INSERT INTO sedes (id, slug, nombre, hora_apertura, hora_cierre) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'lans',           'Sede Lans',          '07:00', '15:00'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'orlando-sierra', 'Sede Orlando Sierra', '07:00', '18:00');

-- 8 salas Sede Lans
INSERT INTO salas (id, sede_id, nombre, permite_externos, estado) VALUES
  ('11111111-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Sala 101', true,  'libre'),
  ('11111111-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Sala 102', true,  'en_clase'),
  ('11111111-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Sala 103', true,  'con_monitor'),
  ('11111111-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'Sala 104', true,  'libre'),
  ('11111111-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001', 'Sala 105', true,  'cerrada'),
  ('11111111-0000-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001', 'Sala 106', true,  'libre'),
  ('11111111-0000-0000-0000-000000000007', 'a1b2c3d4-0000-0000-0000-000000000001', 'Lab A',    false, 'libre'),
  ('11111111-0000-0000-0000-000000000008', 'a1b2c3d4-0000-0000-0000-000000000001', 'Lab B',    false, 'cerrada');

-- 8 salas Sede Orlando Sierra
INSERT INTO salas (id, sede_id, nombre, permite_externos, estado) VALUES
  ('22222222-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000002', 'Sala 201', true, 'libre'),
  ('22222222-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000002', 'Sala 202', true, 'en_clase'),
  ('22222222-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000002', 'Sala 203', true, 'libre'),
  ('22222222-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000002', 'Sala 204', true, 'con_monitor'),
  ('22222222-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000002', 'Sala 205', true, 'libre'),
  ('22222222-0000-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000002', 'Sala 206', true, 'cerrada'),
  ('22222222-0000-0000-0000-000000000007', 'a1b2c3d4-0000-0000-0000-000000000002', 'Sala 207', true, 'libre'),
  ('22222222-0000-0000-0000-000000000008', 'a1b2c3d4-0000-0000-0000-000000000002', 'Sala 208', true, 'en_clase');

-- Verificación — debe retornar 16 filas
SELECT s.nombre AS sala, se.slug AS sede, s.estado, s.permite_externos
FROM salas s
JOIN sedes se ON se.id = s.sede_id
ORDER BY se.slug, s.nombre;
