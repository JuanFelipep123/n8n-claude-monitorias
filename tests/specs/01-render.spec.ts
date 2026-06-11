/**
 * specs/01-render.spec.ts
 * Verifica el renderizado inicial: título, selector de sede, grilla de tarjetas.
 */
import { test, expect } from '@playwright/test'
import path from 'path'

const PREVIEW = `file://${path.resolve(__dirname, '../../Frontend/preview.html')}`

test.beforeEach(async ({ page }) => {
  await page.goto(PREVIEW)
  // Espera a que la grilla tenga al menos una tarjeta (mock o API)
  await page.waitForSelector('.card', { timeout: 5000 })
})

test.describe('Renderizado inicial', () => {
  test('muestra el título principal', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /disponibilidad de salas/i })).toBeVisible()
  })

  test('muestra el selector de sede', async ({ page }) => {
    const select = page.locator('#sede-select')
    await expect(select).toBeVisible()
    const options = await select.locator('option').allTextContents()
    expect(options).toContain('Sede Lans')
    expect(options).toContain('Sede Orlando Sierra')
  })

  test('Sede Lans carga por defecto con 8 tarjetas', async ({ page }) => {
    const cards = page.locator('.card')
    await expect(cards).toHaveCount(8)
  })

  test('muestra el timestamp de última actualización', async ({ page }) => {
    await expect(page.locator('#timestamp')).toContainText('Actualizado a las')
  })

  test('muestra el indicador de fuente de datos (mock o API)', async ({ page }) => {
    await expect(page.locator('#api-source')).toBeVisible()
  })
})
