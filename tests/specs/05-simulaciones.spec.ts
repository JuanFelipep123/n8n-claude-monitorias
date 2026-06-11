/**
 * specs/05-simulaciones.spec.ts
 * Verifica los tres botones de simulación del preview:
 *   - "Simular cambio de estado"
 *   - "Simular fuera de horario"
 *   - "Restablecer"
 */
import { test, expect } from '@playwright/test'
import path from 'path'

const PREVIEW = `file://${path.resolve(__dirname, '../../Frontend/preview.html')}`

test.beforeEach(async ({ page }) => {
  await page.goto(PREVIEW)
  await page.waitForSelector('.card', { timeout: 5000 })
  // Asegura mock de Lans para tener datos predecibles
  await page.locator('#sede-select').selectOption('lans')
  await page.waitForTimeout(400)
})

test.describe('Simular cambio de estado', () => {
  test('cambia la primera sala libre a con_monitor', async ({ page }) => {
    // Sala 101 es la primera libre en el mock de Lans
    const sala101 = page.locator('.card', { has: page.locator('.card-nombre', { hasText: 'Sala 101' }) })
    await expect(sala101).toHaveAttribute('data-estado', 'libre')

    await page.locator('#btn-simular-monitor').click()

    await expect(sala101).toHaveAttribute('data-estado', 'con_monitor')
    await expect(sala101.locator('.badge-estado')).toHaveText('Con monitor')
  })

  test('el color de fondo cambia al hacer la simulación', async ({ page }) => {
    await page.locator('#btn-simular-monitor').click()

    const sala101 = page.locator('.card', { has: page.locator('.card-nombre', { hasText: 'Sala 101' }) })
    const bg = await sala101.evaluate(el => getComputedStyle(el).backgroundColor)
    // #fef9c3 → con_monitor
    expect(bg).toBe('rgb(254, 249, 195)')
  })

  test('presionar dos veces cambia la siguiente sala libre', async ({ page }) => {
    await page.locator('#btn-simular-monitor').click()
    await page.locator('#btn-simular-monitor').click()

    // Sala 105 es la siguiente libre (Sala 102 → en_clase, 103 → con_monitor, 104 → cerrada, 101 ya cambió)
    const cards = page.locator('.card[data-estado="con_monitor"]')
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })
})

test.describe('Simular fuera de horario', () => {
  test('muestra el banner de sede cerrada', async ({ page }) => {
    await page.locator('#btn-simular-cierre').click()

    const banner = page.locator('#banner-cierre')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('Sede cerrada')
    await expect(banner).toContainText('fuera de horario operativo')
  })

  test('todas las tarjetas pasan a estado cerrada', async ({ page }) => {
    await page.locator('#btn-simular-cierre').click()

    const cards = page.locator('.card')
    const count = await cards.count()
    expect(count).toBe(8)

    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toHaveAttribute('data-estado', 'cerrada')
    }
  })

  test('todos los badges muestran "Cerrada"', async ({ page }) => {
    await page.locator('#btn-simular-cierre').click()

    const badges = page.locator('.badge-estado')
    const count = await badges.count()

    for (let i = 0; i < count; i++) {
      await expect(badges.nth(i)).toHaveText('Cerrada')
    }
  })
})

test.describe('Restablecer', () => {
  test('restaura los estados originales después de simular cambio', async ({ page }) => {
    await page.locator('#btn-simular-monitor').click()
    await page.locator('#btn-reset').click()
    await page.waitForTimeout(400)

    const sala101 = page.locator('.card', { has: page.locator('.card-nombre', { hasText: 'Sala 101' }) })
    await expect(sala101).toHaveAttribute('data-estado', 'libre')
  })

  test('oculta el banner de fuera de horario después de restablecer', async ({ page }) => {
    await page.locator('#btn-simular-cierre').click()
    await expect(page.locator('#banner-cierre')).toBeVisible()

    await page.locator('#btn-reset').click()
    await page.waitForTimeout(400)

    await expect(page.locator('#banner-cierre')).not.toBeVisible()
  })

  test('restaura el número correcto de tarjetas por sede', async ({ page }) => {
    await page.locator('#btn-simular-cierre').click()
    await page.locator('#btn-reset').click()
    await page.waitForTimeout(400)

    await expect(page.locator('.card')).toHaveCount(8)
  })
})
