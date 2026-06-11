/**
 * specs/04-permite-externos.spec.ts
 * Verifica el badge "Solo monitores" para Lab A y Lab B (solo aplica Sede Lans).
 */
import { test, expect } from '@playwright/test'
import path from 'path'

const PREVIEW = `file://${path.resolve(__dirname, '../../Frontend/preview.html')}`

test.beforeEach(async ({ page }) => {
  await page.goto(PREVIEW)
  await page.waitForSelector('.card', { timeout: 5000 })
})

test.describe('Indicador "Solo monitores" — Sede Lans', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('#sede-select').selectOption('lans')
    await page.waitForTimeout(300)
  })

  test('Lab A muestra el badge "Solo monitores"', async ({ page }) => {
    const labA = page.locator('.card', { has: page.locator('.card-nombre', { hasText: 'Lab A' }) })
    await expect(labA.locator('.badge-externo')).toBeVisible()
    await expect(labA.locator('.badge-externo')).toContainText('Solo monitores')
  })

  test('Lab B muestra el badge "Solo monitores"', async ({ page }) => {
    const labB = page.locator('.card', { has: page.locator('.card-nombre', { hasText: 'Lab B' }) })
    await expect(labB.locator('.badge-externo')).toBeVisible()
    await expect(labB.locator('.badge-externo')).toContainText('Solo monitores')
  })

  test('Sala 101 NO muestra badge de restricción', async ({ page }) => {
    const sala101 = page.locator('.card', { has: page.locator('.card-nombre', { hasText: 'Sala 101' }) })
    await expect(sala101.locator('.badge-externo')).not.toBeVisible()
  })

  test('solo Lab A y Lab B tienen el badge (exactamente 2 tarjetas con badge)', async ({ page }) => {
    const badges = page.locator('.badge-externo')
    await expect(badges).toHaveCount(2)
  })
})

test.describe('Indicador "Solo monitores" — Sede Orlando Sierra', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('#sede-select').selectOption('orlando-sierra')
    await page.waitForTimeout(300)
  })

  test('ninguna sala de Orlando Sierra muestra badge de restricción', async ({ page }) => {
    await expect(page.locator('.badge-externo')).toHaveCount(0)
  })
})
