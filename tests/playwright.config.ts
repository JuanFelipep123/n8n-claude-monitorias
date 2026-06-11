import { defineConfig, devices } from '@playwright/test'
import path from 'path'

const PREVIEW_PATH = path.resolve(__dirname, '../Frontend/preview.html')
const BACKEND_URL  = process.env.BACKEND_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    /* La mayoría de tests apuntan al preview.html local */
    baseURL: `file://${PREVIEW_PATH}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
})

export { PREVIEW_PATH, BACKEND_URL }
