# TurnoMonitores — Playwright Tests (US-2)

## Estructura

```
tests/
├── playwright.config.ts
├── package.json
└── specs/
    ├── 01-render.spec.ts          ← Renderizado inicial
    ├── 02-sede-selector.spec.ts   ← Cambio de sede
    ├── 03-estados-colores.spec.ts ← Paleta de colores por estado
    ├── 04-permite-externos.spec.ts← Badge "Solo monitores"
    ├── 05-simulaciones.spec.ts    ← Botones de simulación
    └── 06-api-integracion.spec.ts ← Integración con backend real/mock
```

## Comandos

```bash
# Desde la carpeta tests/
cd tests

# Correr todos los tests (headless)
npx playwright test

# Correr con UI interactiva
npx playwright test --ui

# Correr un spec específico
npx playwright test 01-render
npx playwright test 05-simulaciones

# Ver el reporte HTML
npx playwright show-report

# Correr contra el backend REAL en localhost:3000
$env:BACKEND_REAL="true"; npx playwright test 06-api-integracion
```

## Cobertura

| Spec | Tests | Qué verifica |
|------|-------|--------------|
| 01-render | 5 | Título, selector, 8 tarjetas, timestamp |
| 02-sede-selector | 5 | Cambio entre sedes, salas correctas |
| 03-estados-colores | 8 | Colores CSS exactos + texto de badges |
| 04-permite-externos | 5 | Badge "Solo monitores" solo en Lans (Lab A y Lab B) |
| 05-simulaciones | 9 | Simular monitor, fuera de horario, restablecer |
| 06-api-integracion | 7 | Conexión API, fallback, errores 400/500/network |

**Total: 39 tests**

## Variables de entorno

| Variable | Valor | Efecto |
|---|---|---|
| `BACKEND_REAL` | `true` | Spec 06 usa `localhost:3000` real en vez del mock de Playwright |
| `BACKEND_URL` | URL | Override de la URL base del backend |
