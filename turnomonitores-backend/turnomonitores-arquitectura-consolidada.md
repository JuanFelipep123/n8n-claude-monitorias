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
│  │        · Intenta Supabase            │                           │
│  │        · Cae a mock si USE_MOCK=true │                           │
│  │          o si Supabase falla         │                           │
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

## 2. Decisiones técnicas del equipo

**Autenticación:** No se maneja autenticación en esta versión. Todos los endpoints son públicos.

**Persistencia:** El servicio intenta conectar a Supabase primero. Si la conexión falla o si la variable de entorno `USE_MOCK=true` está activa, cae automáticamente al mock en memoria. El frontend nunca espera ni cambia su comportamiento — el contrato del response es idéntico en ambos casos.

**Webhook:** El backend no necesita estar desplegado para que n8n funcione. n8n conecta directo a Supabase mediante el nodo Postgres con las credenciales de conexión directa. La única dependencia real es que el seed esté corrido con los UUIDs reales en la base de datos, porque n8n usa esos IDs en el payload de prueba del taller.

---

## 3. Schema SQL completo

> Este schema es para producción. En el taller se usa el seed mínimo de la sección de datos de prueba.

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
-- Cada sala pertenece a una sede y mantiene su estado actual como columna mutable.
-- El estado es la única columna que n8n y NestJS escriben en caliente.
-- No se deriva de ninguna tabla externa ni requiere un flujo para calcularse.
CREATE TABLE salas (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id          UUID         NOT NULL REFERENCES sedes(id) ON DELETE RESTRICT,
  nombre           TEXT         NOT NULL,
  permite_externos BOOLEAN      NOT NULL DEFAULT true,  -- false para las 2 salas restringidas de Lans
  estado           estado_sala  NOT NULL DEFAULT 'cerrada',
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
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

**Datos de prueba para el taller:**

```sql
INSERT INTO sedes (id, slug, nombre, hora_apertura, hora_cierre) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'lans',           'Sede Lans',           '07:00', '15:00'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'orlando-sierra', 'Sede Orlando Sierra', '07:00', '18:00');

-- 8 salas Lans (2 de ellas con permite_externos = false)
INSERT INTO salas (sede_id, nombre, permite_externos, estado) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sala 101', true,  'libre'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sala 102', true,  'en_clase'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sala 103', true,  'con_monitor'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sala 104', true,  'libre'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sala 105', true,  'cerrada'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sala 106', true,  'libre'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Lab A',    false, 'libre'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Lab B',    false, 'cerrada');

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

Para obtener los UUIDs reales después de insertar (necesarios para n8n):

```sql
SELECT id, nombre, estado FROM salas LIMIT 3;
```

---

## 4. Endpoints del taller — imprescindibles para US-2

| Orden | Método | Ruta | Rol | Desbloquea |
|-------|--------|------|-----|------------|
| 1 | `GET` | `/salas/:sede` | Backend | Frontend puede construir y probar la grilla completa. n8n puede verificar que el cambio de estado se refleja tras el UPDATE. |
| 2 | `POST` | `/webhook/sala-estado` | n8n (webhook interno) | El ciclo completo end-to-end: cambio de estado externo → Supabase → frontend actualizado en 30 s. |

---

## 5. Endpoints completos del sistema

| Método | Ruta | Body entrada | Respuesta exitosa | Error |
|--------|------|-------------|-------------------|-------|
| `GET` | `/salas/:sede` | — | `200` · arreglo de salas con `id`, `nombre`, `estado`, `permiteExternos`, `updatedAt` | `400` sede inválida · `500` falla DB |
| `PATCH` | `/salas/:id` | `{ "estado": "libre" \| "en_clase" \| "con_monitor" \| "cerrada" }` | `200` · sala actualizada con `id`, `nombre`, `estado`, `updatedAt` | `400` estado inválido · `404` sala no encontrada · `500` falla DB |

**Respuesta `200` de `GET /salas/:sede`:**

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

**Respuesta `400` (sede no reconocida):**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Sede 'xyz' no reconocida. Valores válidos: lans, orlando-sierra."
}
```

**Respuesta `500` (falla de conexión con DB):**

```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "No se pudo consultar la disponibilidad. Intenta de nuevo."
}
```

**Mock de fallback para `GET /salas/:sede`** (activo cuando `USE_MOCK=true` o Supabase no responde):

```ts
return [
  { id: '11111111-0000-0000-0000-000000000001', nombre: 'Sala 101', estado: 'libre',        permiteExternos: true,  updatedAt: new Date().toISOString() },
  { id: '11111111-0000-0000-0000-000000000002', nombre: 'Sala 102', estado: 'en_clase',     permiteExternos: true,  updatedAt: new Date().toISOString() },
  { id: '11111111-0000-0000-0000-000000000003', nombre: 'Sala 103', estado: 'con_monitor',  permiteExternos: true,  updatedAt: new Date().toISOString() },
  { id: '11111111-0000-0000-0000-000000000004', nombre: 'Sala 104', estado: 'cerrada',      permiteExternos: true,  updatedAt: new Date().toISOString() },
  { id: '11111111-0000-0000-0000-000000000007', nombre: 'Lab A',    estado: 'libre',        permiteExternos: false, updatedAt: new Date().toISOString() },
  { id: '11111111-0000-0000-0000-000000000008', nombre: 'Lab B',    estado: 'cerrada',      permiteExternos: false, updatedAt: new Date().toISOString() },
];
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

## 6. Contrato del webhook para n8n

**Método:** `POST`

**URL de ejemplo:**

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

| Campo | Tipo | Valores permitidos | Requerido |
|-------|------|--------------------|-----------|
| `salaId` | string | UUID válido de la tabla `salas` | Sí |
| `nuevoEstado` | string | `libre` · `en_clase` · `con_monitor` · `cerrada` | Sí |

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

**Respuesta exitosa:**

```json
{
  "ok": true,
  "salaId": "uuid-v4-de-la-sala",
  "nuevoEstado": "libre"
}
```

**Casos de error:**

| Caso | Comportamiento esperado |
|------|------------------------|
| `salaId` no existe en DB | El UPDATE afecta 0 filas; n8n responde `200` con `rowsAffected: 0` |
| `nuevoEstado` valor inválido | PostgreSQL lanza error por el ENUM; n8n captura y responde `500` |
| DB inaccesible | n8n lanza error de conexión; el webhook responde `500` |

---

## 7. Punto de coordinación crítico entre roles

El Automatizador necesita la URL del webhook de n8n antes del minuto 20. El Backend necesita esa URL para configurar el `.env` antes de probar `POST /turnos`.

**Orden de dependencias en el taller:**

```
minuto 0  → Arquitecto corre el seed en Supabase
minuto 5  → Arquitecto pasa los UUIDs reales al Automatizador
minuto 10 → Automatizador crea el webhook en n8n y publica la URL
minuto 20 → Backend recibe la URL, configura .env, conecta Supabase
minuto 40 → Backend entrega GET /salas/:sede funcionando con datos reales
minuto 40 → Frontend toma el endpoint real, reemplaza mock, prueba grilla
minuto 80 → Demo end-to-end: Postman → n8n → Supabase → frontend refleja cambio
```
