# TurnoMonitores — Arquitectura técnica · US-2

**Universidad de Caldas · Ingeniería de Software**
Stack: NestJS · Next.js · Supabase (PostgreSQL) · n8n · Fly.io

---

## 1. Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLIENTE                                                            │
│                                                                     │
│  ┌──────────────────────────────────────┐                           │
│  │  Next.js (Fly.io)                    │                           │
│  │                                      │                           │
│  │  /disponibilidad                     │                           │
│  │  ┌─────────────────────────────────┐ │                           │
│  │  │  SalaGrid                       │ │                           │
│  │  │  · Selector de sede             │ │                           │
│  │  │  · Tarjetas por sala (estado)   │ │                           │
│  │  │  · Timestamp última actualiz.   │ │                           │
│  │  │  · Polling cada 30 s            │ │                           │
│  │  └─────────────────────────────────┘ │                           │
│  └──────────────┬───────────────────────┘                           │
└─────────────────┼───────────────────────────────────────────────────┘
                  │  GET /salas/:sede
                  │  HTTP/REST
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  API                                                                │
│                                                                     │
│  ┌──────────────────────────────────────┐                           │
│  │  NestJS (Fly.io)                     │                           │
│  │                                      │                           │
│  │  SalasModule                         │                           │
│  │  ├── SalasController                 │                           │
│  │  │     GET /salas/:sede              │                           │
│  │  └── SalasService                   │                           │
│  │        · Valida sede                 │                           │
│  │        · Valida horario operativo    │                           │
│  │        · Consulta Supabase           │                           │
│  └──────────────┬───────────────────────┘                           │
└─────────────────┼───────────────────────────────────────────────────┘
                  │  SELECT * FROM salas WHERE sede_id = $1
                  │  @supabase/supabase-js (PostgreSQL)
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BASE DE DATOS                                                      │
│                                                                     │
│  ┌──────────────────────────────────────┐                           │
│  │  Supabase — PostgreSQL               │                           │
│  │                                      │                           │
│  │  tabla: sedes                        │                           │
│  │  tabla: salas  ◄────────────────────────────────┐                │
│  └──────────────────────────────────────┘          │                │
└────────────────────────────────────────────────────┼────────────────┘
                                                     │
                                         UPDATE salas SET estado
                                                     │
┌────────────────────────────────────────────────────┼────────────────┐
│  INTEGRACIÓN EXTERNA                               │                │
│                                                    │                │
│  ┌─────────────────────────────────────────────────┴──────────┐    │
│  │  n8n (instancia propia o cloud)                            │    │
│  │                                                            │    │
│  │  Webhook Trigger                                           │    │
│  │  POST /webhook/sala-estado                                 │    │
│  │        │                                                   │    │
│  │        ▼                                                   │    │
│  │  Nodo Postgres                                             │    │
│  │  UPDATE salas SET estado = $nuevoEstado                    │    │
│  │  WHERE id = $salaId                                        │    │
│  │        │                                                   │    │
│  │        ▼                                                   │    │
│  │  Respond to Webhook → 200 OK                               │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  Emisor del webhook: coordinador vía herramienta externa,          │
│  script de prueba, Postman o cualquier cliente HTTP.               │
└─────────────────────────────────────────────────────────────────────┘
```

**Flujo principal (polling de 30 s):**

```
Next.js ──GET /salas/lans──► NestJS ──SELECT──► Supabase
Next.js ◄──200 [{id, nombre, estado}]──────────────────
```

**Flujo de cambio de estado vía n8n:**

```
Cliente HTTP ──POST /webhook/sala-estado──► n8n ──UPDATE──► Supabase
                                           n8n ◄──OK────────────────
Next.js (siguiente ciclo de polling 30 s) ──GET──► NestJS ──SELECT──► Supabase
Next.js ◄──nuevo estado reflejado──────────────────────────────────
```

---

## 2. Schema SQL para Supabase

```sql
-- Tipo enumerado: garantiza que solo existan los 4 estados válidos.
-- Intentar insertar cualquier otro valor lanza un error a nivel de base de datos.
CREATE TYPE estado_sala AS ENUM (
  'libre',
  'en_clase',
  'con_monitor',
  'cerrada'
);

-- Tabla de sedes.
-- Centraliza el identificador canónico de cada sede y su horario operativo.
CREATE TABLE sedes (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT         NOT NULL UNIQUE,    -- 'lans' | 'orlando-sierra'
  nombre         TEXT         NOT NULL,
  hora_apertura  TIME         NOT NULL,           -- 07:00
  hora_cierre    TIME         NOT NULL,           -- 15:00 (Lans) | 18:00 (Orlando Sierra)
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Tabla de salas.
-- Cada sala pertenece a una sede y mantiene su estado actual.
-- El estado es la única columna que n8n y NestJS escriben en caliente.
CREATE TABLE salas (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id         UUID         NOT NULL REFERENCES sedes(id) ON DELETE RESTRICT,
  nombre          TEXT         NOT NULL,
  permite_externos BOOLEAN     NOT NULL DEFAULT true,  -- false para las 2 salas restringidas de Lans
  estado          estado_sala  NOT NULL DEFAULT 'cerrada',
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Índice: la consulta más frecuente es filtrar por sede_id.
CREATE INDEX idx_salas_sede_id ON salas(sede_id);

-- Trigger para mantener updated_at actualizado en cada UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_salas_updated_at
BEFORE UPDATE ON salas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**Seed mínimo para el taller:**

```sql
INSERT INTO sedes (id, slug, nombre, hora_apertura, hora_cierre) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'lans',           'Sede Lans',          '07:00', '15:00'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'orlando-sierra', 'Sede Orlando Sierra', '07:00', '18:00');

-- 8 salas Lans (2 de ellas con permite_externos = false)
INSERT INTO salas (sede_id, nombre, permite_externos, estado) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sala 101', true,  'libre'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sala 102', true,  'en_clase'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sala 103', true,  'con_monitor'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sala 104', true,  'libre'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sala 105', true,  'cerrada'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sala 106', true,  'libre'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Lab A',    false, 'libre'),   -- restringida
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Lab B',    false, 'cerrada'); -- restringida

-- 8 salas Orlando Sierra
INSERT INTO salas (sede_id, nombre, permite_externos, estado) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Sala 201', true, 'libre'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Sala 202', true, 'en_clase'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Sala 203', true, 'libre'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Sala 204', true, 'con_monitor'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Sala 205', true, 'libre'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Sala 206', true, 'cerrada'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Sala 207', true, 'libre'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Sala 208', true, 'en_clase');
```

---

## 3. Endpoints para US-2

| Método | Ruta | Body entrada | Respuesta exitosa | Error |
|--------|------|-------------|-------------------|-------|
| `GET` | `/salas/:sede` | — | `200` · arreglo de salas (ver abajo) | `400` sede inválida · `500` falla DB |

**Valores válidos de `:sede`:** `lans` \| `orlando-sierra`

**Respuesta 200:**

```json
[
  {
    "id": "uuid-v4",
    "nombre": "Sala 101",
    "estado": "libre",
    "permiteExternos": true,
    "updatedAt": "2025-03-14T10:22:00.000Z"
  }
]
```

> Si la consulta se realiza fuera del horario operativo de la sede, NestJS retorna igualmente el arreglo completo pero todos los `estado` se sobreescriben a `"cerrada"` en capa de servicio, sin tocar la base de datos. Esto permite que el estado real persista y se reactive cuando la sede abra.

**Respuesta 400 (sede no reconocida):**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Sede 'xyz' no reconocida. Valores válidos: lans, orlando-sierra."
}
```

**Respuesta 500 (falla de conexión con DB):**

```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "No se pudo consultar la disponibilidad. Intenta de nuevo."
}
```

**Lógica de validación en SalasService (pseudocódigo):**

```
SEDES_VALIDAS = ['lans', 'orlando-sierra']

async getSalasBySede(sede: string):
  si sede no está en SEDES_VALIDAS → lanzar BadRequestException

  horario = await obtenerHorarioSede(sede)
  ahoraLocal = hora actual en zona America/Bogota
  fueraDeHorario = ahoraLocal < horario.apertura || ahoraLocal >= horario.cierre

  salas = await supabase
    .from('salas')
    .select('id, nombre, estado, permite_externos, updated_at')
    .eq('sede_id', horario.sedeId)

  si fueraDeHorario:
    retornar salas.map(s => ({ ...s, estado: 'cerrada' }))

  retornar salas
```

---

## 4. Contrato del webhook para n8n

**Método:** `POST`

**URL de ejemplo (n8n cloud o self-hosted):**

```
https://n8n.tudominio.com/webhook/sala-estado
```

**Headers requeridos:**

```
Content-Type: application/json
```

**Payload exacto:**

```json
{
  "salaId": "uuid-v4-de-la-sala",
  "nuevoEstado": "libre"
}
```

**Valores válidos de `nuevoEstado`:** `libre` \| `en_clase` \| `con_monitor` \| `cerrada`

**Flujo interno del workflow en n8n:**

```
[Webhook Trigger]
  · Método: POST
  · Ruta: /webhook/sala-estado
  · Recibe: { salaId, nuevoEstado }
        │
        ▼
[Nodo: Postgres — Execute Query]
  · Query:
      UPDATE salas
      SET estado = '{{ $json.nuevoEstado }}'
      WHERE id = '{{ $json.salaId }}'
  · Conexión: credencial Supabase Postgres
        │
        ▼
[Nodo: Respond to Webhook]
  · Status: 200
  · Body: { "ok": true, "salaId": "{{ $json.salaId }}", "nuevoEstado": "{{ $json.nuevoEstado }}" }
```

**Respuesta exitosa del webhook:**

```json
{
  "ok": true,
  "salaId": "uuid-v4-de-la-sala",
  "nuevoEstado": "libre"
}
```

**Casos de error que n8n debe manejar:**

| Caso | Comportamiento esperado |
|------|------------------------|
| `salaId` no existe en DB | El UPDATE afecta 0 filas; n8n responde `200` pero el campo `rowsAffected` será 0 — considerar agregar validación |
| `nuevoEstado` valor inválido | PostgreSQL lanza error por el ENUM; n8n captura la excepción y responde `500` |
| DB inaccesible | n8n lanza error de conexión; el webhook responde `500` |

> **Nota sobre el ENUM:** El tipo `estado_sala` definido en el schema rechaza cualquier valor que no sea uno de los 4 válidos directamente en base de datos, actuando como segunda línea de defensa si n8n no valida el payload de entrada.

---

## 5. La decisión de diseño más crítica antes de escribir código

**¿El estado de la sala vive únicamente en la columna `salas.estado` (estado mutable) o en una tabla de eventos/turnos de la que el estado se deriva en tiempo de consulta?**

Esta decisión determina la arquitectura de todo el sistema más allá del taller:

- **Columna mutable `estado` (propuesta actual del taller):** simple de implementar, n8n hace un UPDATE directo y el GET lo lee al instante. Suficiente para US-2. El problema emerge en US-1 y US-3: si el estado es solo una columna, no hay manera de saber *por qué* una sala cambió de estado, *quién* lo cambió ni *cuándo* empezó y terminó un turno. La trazabilidad requerida en US-3 queda huérfana.

- **Tabla de turnos como fuente de verdad:** el estado se calcula cruzando `turnos` activos, `horarios_clases` y el horario operativo de la sede en el momento de la consulta. La columna `salas.estado` se convierte en una vista materializada o en un campo derivado. Más complejo, pero es el modelo que soporta US-1 y US-3 sin rediseño posterior.

**Recomendación concreta:** Para el taller usar la columna mutable (es el entregable mínimo viable). Pero antes de escribir US-1, definir si van a introducir una tabla `turnos` y si `salas.estado` pasará a ser un campo calculado por trigger o por lógica de servicio. Cambiar esa decisión después de tener US-1 en producción implica migración de datos y reescritura del servicio central.
