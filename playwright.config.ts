import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:3783';

const vercelBypassStorageState = (() => {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const url = process.env.BASE_URL;

  if (!secret || !url) {
    return undefined;
  }

  try {
    const target = new URL(url);
    return {
      cookies: [
        {
          name: '__vercel_protection_bypass',
          value: secret,
          domain: target.hostname,
          path: '/',
          httpOnly: false,
          secure: true,
          sameSite: 'Lax'
        }
      ],
      origins: []
    };
  } catch {
    return undefined;
  }
})();
const vercelBypassHeaders = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  ? {
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    }
  : undefined;

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
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Clear local storage and other browser state */
    storageState: vercelBypassStorageState ?? undefined,

    /* Ensure protected previews are bypassed */
    extraHTTPHeaders: vercelBypassHeaders,
  },

  /* Configure projects for major browsers */
  projects: process.env.CI ? [
    // In CI, only run chromium to save time and resources
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: vercelBypassHeaders,
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
