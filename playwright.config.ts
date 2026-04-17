import { defineConfig, devices } from '@playwright/test';

/**
 * Consulte https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Executa testes em arquivos em paralelo */
  fullyParallel: true,
  /* Falha no build se você acidentalmente deixou test.only no código fonte. */
  forbidOnly: !!process.env.CI,
  /* Tenta novamente apenas no CI */
  retries: process.env.CI ? 2 : 0,
  /* Opt out do carregamento paralelo no CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Repórter a ser usado. Veja https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Configurações compartilhadas para todos os projetos abaixo. Veja https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL para usar em ações como `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173',

    /* Coleta traços ao tentar novamente um teste com falha. Veja https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  /* Configura projetos para os principais navegadores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Testes para viewports móveis. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
