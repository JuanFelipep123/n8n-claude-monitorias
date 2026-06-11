/**
 * specs/02-sede-selector.spec.ts
 * Verifica el cambio de sede y que la grilla se actualiza correctamente.
 */
import { test, expect } from '@playwright/test'
import path from 'path'

const PREVIEW = `file://${path.resolve(__dirname, '../../Frontend/preview.html')}`

const SALAS_LANS = ['Sala 101', 'Sala 102', 'Sala 103', 'Sala 104', 'Sala 105', 'Sala 106', 'Lab A', 'Lab B']
const SALAS_ORLANDO = ['Sala 201', 'Sala 202', 'Sala 203', 'Sala 204', 'Sala 205', 'Sala 206', 'Sala 207', 'Sala 208']

test.beforeEach(async ({ page }) => {
  await page.goto(PREVIEW)
  await page.waitForSelector('.card', { timeout: 5000 })
})

test.describe('Selector de sede', () => {
  test('Sede Lans muestra las salas correctas', async ({ page }) => {
    await page.locator('#sede-select').selectOption('lans')
    await page.waitForTimeout(300)

    for (const nombre of SALAS_LANS) {
      await expect(page.locator('.card-nombre', { hasText: nombre })).toBeVisible()
    }
  })

  test('Sede Orlando Sierra muestra 8 salas', async ({ page }) => {
    await page.locator('#sede-select').selectOption('orlando-sierra')
    await page.waitForTimeout(300)

    await expect(page.locator('.card')).toHaveCount(8)
  })

  test('Sede Orlando Sierra muestra las salas correctas', async ({ page }) => {
    await page.locator('#sede-select').selectOption('orlando-sierra')
    await page.waitForTimeout(300)

    for (const nombre of SALAS_ORLANDO) {
      await expect(page.locator('.card-nombre', { hasText: nombre })).toBeVisible()
    }
  })

  test('al cambiar de sede no quedan salas de la anterior', async ({ page }) => {
    await page.locator('#sede-select').selectOption('orlando-sierra')
    await page.waitForTimeout(300)

    await expect(page.locator('.card-nombre', { hasText: 'Lab A' })).not.toBeVisible()
    await expect(page.locator('.card-nombre', { hasText: 'Sala 101' })).not.toBeVisible()
  })

  test('volver a Lans desde Orlando Sierra restaura las 8 salas de Lans', async ({ page }) => {
    await page.locator('#sede-select').selectOption('orlando-sierra')
    await page.waitForTimeout(300)
    await page.locator('#sede-select').selectOption('lans')
    await page.waitForTimeout(300)

    await expect(page.locator('.card')).toHaveCount(8)
    await expect(page.locator('.card-nombre', { hasText: 'Lab A' })).toBeVisible()
  })
})
