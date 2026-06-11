/**
 * specs/03-estados-colores.spec.ts
 * Verifica la paleta de colores por estado y que los badges muestran el texto correcto.
 */
import { test, expect } from '@playwright/test'
import path from 'path'

const PREVIEW = `file://${path.resolve(__dirname, '../../Frontend/preview.html')}`

// Colores CSS exactos de la paleta del spec
const COLORES_FONDO: Record<string, string> = {
  libre:       'rgb(209, 250, 229)',  // #d1fae5
  en_clase:    'rgb(254, 226, 226)',  // #fee2e2
  con_monitor: 'rgb(254, 249, 195)', // #fef9c3
  cerrada:     'rgb(243, 244, 246)', // #f3f4f6
}

const TEXTO_ESTADO: Record<string, string> = {
  libre:       'Libre',
  en_clase:    'En clase',
  con_monitor: 'Con monitor',
  cerrada:     'Cerrada',
}

test.beforeEach(async ({ page }) => {
  await page.goto(PREVIEW)
  await page.waitForSelector('.card', { timeout: 5000 })
  // Asegura datos del mock (Lans)
  await page.locator('#sede-select').selectOption('lans')
  await page.waitForTimeout(300)
})

test.describe('Paleta de colores por estado', () => {
  for (const [estado, colorEsperado] of Object.entries(COLORES_FONDO)) {
    test(`tarjeta "${estado}" tiene el fondo correcto`, async ({ page }) => {
      const card = page.locator(`.card[data-estado="${estado}"]`).first()
      await expect(card).toBeVisible()

      const bg = await card.evaluate(el => getComputedStyle(el).backgroundColor)
      expect(bg).toBe(colorEsperado)
    })
  }

  for (const [estado, textoEsperado] of Object.entries(TEXTO_ESTADO)) {
    test(`badge de estado "${estado}" muestra el texto correcto`, async ({ page }) => {
      const badge = page.locator(`.badge-estado[data-estado="${estado}"]`).first()
      await expect(badge).toBeVisible()
      await expect(badge).toHaveText(textoEsperado)
    })
  }
})

test.describe('Consistencia data-estado vs color de fondo', () => {
  test('cada tarjeta tiene data-estado y su color de fondo coincide', async ({ page }) => {
    const cards = page.locator('.card')
    const count = await cards.count()

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      const estado = await card.getAttribute('data-estado')
      if (!estado || !(estado in COLORES_FONDO)) continue

      const bg = await card.evaluate(el => getComputedStyle(el).backgroundColor)
      expect(bg).toBe(COLORES_FONDO[estado])
    }
  })
})
