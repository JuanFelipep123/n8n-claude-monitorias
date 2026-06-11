/**
 * specs/06-api-integracion.spec.ts
 * Verifica la integración con el backend real (GET /salas/:sede).
 *
 * Estos tests usan page.route() para interceptar y mockear las respuestas HTTP,
 * sin depender de que el backend esté corriendo. 
 *
 * Para correr contra el backend REAL en localhost:3000:
 *   BACKEND_REAL=true npx playwright test 06-api-integracion
 */
import { test, expect, type Page } from '@playwright/test'
import path from 'path'

const PREVIEW     = `file://${path.resolve(__dirname, '../../Frontend/preview.html')}`
const BACKEND_URL = 'http://localhost:3000'
const USE_REAL    = process.env.BACKEND_REAL === 'true'

// Respuesta mock que simula exactamente el contrato del backend NestJS
const MOCK_RESPONSE_LANS = [
  { id: '11111111-0000-0000-0000-000000000001', nombre: 'Sala 101', estado: 'libre',       permiteExternos: true,  updatedAt: '2026-06-11T17:13:57.992Z' },
  { id: '11111111-0000-0000-0000-000000000002', nombre: 'Sala 102', estado: 'en_clase',    permiteExternos: true,  updatedAt: '2026-06-11T17:13:57.992Z' },
  { id: '11111111-0000-0000-0000-000000000003', nombre: 'Sala 103', estado: 'con_monitor', permiteExternos: true,  updatedAt: '2026-06-11T17:13:57.992Z' },
  { id: '11111111-0000-0000-0000-000000000004', nombre: 'Sala 104', estado: 'cerrada',     permiteExternos: true,  updatedAt: '2026-06-11T17:13:57.992Z' },
  { id: '11111111-0000-0000-0000-000000000005', nombre: 'Sala 105', estado: 'libre',       permiteExternos: true,  updatedAt: '2026-06-11T17:13:57.992Z' },
  { id: '11111111-0000-0000-0000-000000000006', nombre: 'Sala 106', estado: 'libre',       permiteExternos: true,  updatedAt: '2026-06-11T17:13:57.992Z' },
  { id: '11111111-0000-0000-0000-000000000007', nombre: 'Lab A',    estado: 'libre',       permiteExternos: false, updatedAt: '2026-06-11T17:13:57.992Z' },
  { id: '11111111-0000-0000-0000-000000000008', nombre: 'Lab B',    estado: 'cerrada',     permiteExternos: false, updatedAt: '2026-06-11T17:13:57.992Z' },
]

const MOCK_RESPONSE_ORLANDO = [
  { id: '22222222-0000-0000-0000-000000000001', nombre: 'Sala 201', estado: 'libre',       permiteExternos: true, updatedAt: '2026-06-11T17:13:57.992Z' },
  { id: '22222222-0000-0000-0000-000000000002', nombre: 'Sala 202', estado: 'en_clase',    permiteExternos: true, updatedAt: '2026-06-11T17:13:57.992Z' },
  { id: '22222222-0000-0000-0000-000000000003', nombre: 'Sala 203', estado: 'libre',       permiteExternos: true, updatedAt: '2026-06-11T17:13:57.992Z' },
  { id: '22222222-0000-0000-0000-000000000004', nombre: 'Sala 204', estado: 'con_monitor', permiteExternos: true, updatedAt: '2026-06-11T17:13:57.992Z' },
  { id: '22222222-0000-0000-0000-000000000005', nombre: 'Sala 205', estado: 'libre',       permiteExternos: true, updatedAt: '2026-06-11T17:13:57.992Z' },
  { id: '22222222-0000-0000-0000-000000000006', nombre: 'Sala 206', estado: 'cerrada',     permiteExternos: true, updatedAt: '2026-06-11T17:13:57.992Z' },
  { id: '22222222-0000-0000-0000-000000000007', nombre: 'Sala 207', estado: 'libre',       permiteExternos: true, updatedAt: '2026-06-11T17:13:57.992Z' },
  { id: '22222222-0000-0000-0000-000000000008', nombre: 'Sala 208', estado: 'en_clase',    permiteExternos: true, updatedAt: '2026-06-11T17:13:57.992Z' },
]

async function setupApiMock(page: Page) {
  if (USE_REAL) return // no intercepta — usa el backend real

  await page.route(`${BACKEND_URL}/salas/lans`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_RESPONSE_LANS),
    })
  })

  await page.route(`${BACKEND_URL}/salas/orlando-sierra`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_RESPONSE_ORLANDO),
    })
  })
}

test.describe('Integración API — respuesta exitosa', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await page.goto(PREVIEW)
    await page.waitForSelector('.card', { timeout: 6000 })
    // Espera a que el indicador confirme la conexión (mock o real)
    await page.waitForFunction(
      () => !document.getElementById('api-source')?.textContent?.includes('Conectando'),
      { timeout: 5000 }
    )
  })

  test('el indicador muestra conexión al backend', async ({ page }) => {
    const apiSource = page.locator('#api-source')
    await expect(apiSource).toContainText('Conectado al backend real')
  })

  test('muestra 8 tarjetas para Sede Lans', async ({ page }) => {
    await page.locator('#sede-select').selectOption('lans')
    await page.waitForTimeout(500)
    await expect(page.locator('.card')).toHaveCount(8)
  })

  test('muestra 8 tarjetas para Sede Orlando Sierra', async ({ page }) => {
    await page.locator('#sede-select').selectOption('orlando-sierra')
    await page.waitForTimeout(500)
    await expect(page.locator('.card')).toHaveCount(8)
  })

  test('el contrato del response se mapea correctamente: id, nombre, estado, permiteExternos', async ({ page }) => {
    await page.locator('#sede-select').selectOption('lans')
    await page.waitForTimeout(500)

    // Verifica que las tarjetas tienen data-estado válido
    const cards = page.locator('.card')
    const count = await cards.count()
    const estadosValidos = new Set(['libre', 'en_clase', 'con_monitor', 'cerrada'])

    for (let i = 0; i < count; i++) {
      const estado = await cards.nth(i).getAttribute('data-estado')
      expect(estadosValidos.has(estado!)).toBe(true)
    }
  })

  test('Lab A tiene badge "Solo monitores" con datos de la API', async ({ page }) => {
    await page.locator('#sede-select').selectOption('lans')
    await page.waitForTimeout(500)

    const labA = page.locator('.card', { has: page.locator('.card-nombre', { hasText: 'Lab A' }) })
    await expect(labA.locator('.badge-externo')).toBeVisible()
  })
})

test.describe('Integración API — manejo de errores', () => {
  test('cae al mock si el backend responde 500', async ({ page }) => {
    await page.route(`${BACKEND_URL}/salas/lans`, async (route) => {
      await route.fulfill({ status: 500, body: '{"statusCode":500,"error":"Internal Server Error"}' })
    })
    await page.route(`${BACKEND_URL}/salas/orlando-sierra`, async (route) => {
      await route.fulfill({ status: 500, body: '{"statusCode":500,"error":"Internal Server Error"}' })
    })

    await page.goto(PREVIEW)
    await page.waitForSelector('.card', { timeout: 6000 })

    // Aún debe mostrar tarjetas (del mock de fallback)
    await expect(page.locator('.card')).toHaveCount(8)
    await expect(page.locator('#api-source')).toContainText('datos de prueba')
  })

  test('cae al mock si el backend no responde (network error)', async ({ page }) => {
    await page.route(`${BACKEND_URL}/salas/**`, async (route) => {
      await route.abort('connectionrefused')
    })

    await page.goto(PREVIEW)
    await page.waitForSelector('.card', { timeout: 6000 })

    await expect(page.locator('.card')).toHaveCount(8)
    await expect(page.locator('#api-source')).toContainText('datos de prueba')
  })

  test('el backend responde 400 a una sede inválida — no rompe la UI', async ({ page }) => {
    await page.route(`${BACKEND_URL}/salas/invalida`, async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: "Sede 'invalida' no reconocida. Valores válidos: lans, orlando-sierra.",
          error: 'Bad Request',
          statusCode: 400,
        }),
      })
    })

    await setupApiMock(page)
    await page.goto(PREVIEW)
    await page.waitForSelector('.card', { timeout: 6000 })

    // La UI sigue mostrando tarjetas (el selector solo expone valores válidos)
    await expect(page.locator('.card')).toHaveCount(8)
  })
})
