import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/__tests__/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'line',
  /* Global setup/teardown for Stripe webhook listener */
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // Use BASE_URL from environment (for CI deployments) or fallback to localhost
    baseURL: process.env.BASE_URL || 'http://localhost:3783',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Ensure fresh browser context for each test to avoid state persistence */
    contextOptions: {
      // Clear all storage (localStorage, sessionStorage, etc.)
      storageState: undefined,
    },

    /* Clear local storage and other browser state */
    storageState: undefined,

    /* Add Vercel protection bypass header if secret is provided (for CI testing against protected deployments) */
    ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET && {
      extraHTTPHeaders: {
        'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
      },
    }),
  },

  /* Configure projects for major browsers */
  projects: process.env.CI ? [
    // In CI, only run chromium to save time and resources
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Explicitly include bypass header at project level for CI
        ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET && {
          extraHTTPHeaders: {
            'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          },
        }),
      },
    },
  ] : [
    // Locally, test all browsers
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
      timeout: 60000, // Webkit is slower - increase test timeout to 60s
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  // Only start local server if BASE_URL is not provided (i.e., not testing against Vercel deployment)
  webServer: process.env.BASE_URL ? undefined : {
    command: 'PORT=3783 pnpm dev',
    url: 'http://localhost:3783',
    reuseExistingServer: !process.env.CI,
  },
});
