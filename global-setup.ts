import { spawn, ChildProcess, execSync } from 'child_process';
import { FullConfig } from '@playwright/test';

let stripeListenerProcess: ChildProcess | null = null;
let nextServerProcess: ChildProcess | null = null;

// Use BASE_URL from CI/CD or fall back to PLAYWRIGHT_TEST_BASE_URL or localhost
const NEXT_SERVER_URL = process.env.BASE_URL || process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3783';

function stripeSupportsRequestTimeout(): boolean {
  try {
    const helpOutput = execSync('stripe listen --help', { encoding: 'utf-8' });
    return helpOutput.includes('--request-timeout');
  } catch {
    return false;
  }
}

async function isServerResponsive(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(NEXT_SERVER_URL, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch (error) {
    return false;
  }
}

async function startNextServer() {
  if (await isServerResponsive()) {
    console.log('✓ Next.js server already running');
    return;
  }

  if (!process.env.PLAYWRIGHT_SKIP_BUILD) {
    console.log('🔧 Building Next.js app for tests...');
    execSync('pnpm build', { stdio: 'inherit' });
  } else {
    console.log('⚠️  Skipping Next.js build (PLAYWRIGHT_SKIP_BUILD set)');
  }

  console.log('🚀 Starting Next.js server on port 3783...');
  const resolvedBaseUrl = (() => {
    try {
      return new URL(NEXT_SERVER_URL).origin;
    } catch {
      return 'http://localhost:3783';
    }
  })();
  nextServerProcess = spawn('pnpm', ['start', '--', '--hostname', 'localhost', '--port', '3783'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: '3783',
      BASE_URL: process.env.BASE_URL ?? resolvedBaseUrl,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? resolvedBaseUrl,
      NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV ?? 'development'
    }
  });

  nextServerProcess.stdout?.on('data', (data) => {
    console.log(`[Next] ${data.toString().trim()}`);
  });

  nextServerProcess.stderr?.on('data', (data) => {
    console.error(`[Next Error] ${data.toString().trim()}`);
  });

  const started = await waitForServerReady(60000);
  if (!started) {
    throw new Error('Next.js server did not become ready in time');
  }

  (global as any).__NEXT_SERVER_PROCESS__ = nextServerProcess;
  console.log('✓ Next.js server ready');
}

async function waitForServerReady(timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerResponsive()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

// Helper function to check if stripe listen is already running
function isStripeListenerRunning(): boolean {
  try {
    const result = execSync('pgrep -f "stripe listen"', { encoding: 'utf-8' });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

async function globalSetup(config: FullConfig) {
  // Skip server startup and Stripe listener when using external deployment (e.g., Vercel in CI)
  if (process.env.BASE_URL) {
    console.log('ℹ️  Using external deployment URL:', process.env.BASE_URL);
    console.log('ℹ️  Skipping local server startup and Stripe webhook listener');
    return;
  }

  // Skip Stripe listener in CI as it's not available
  if (process.env.CI) {
    console.log('ℹ️  Skipping Stripe webhook listener in CI (not available)');
    return;
  }

  await startNextServer();

  if (isStripeListenerRunning()) {
    console.log('✓ Stripe webhook listener already running');
    return;
  }

  console.log('🚀 Starting global Stripe webhook listener...');

  const forwardTarget = new URL('/api/stripe/webhook', NEXT_SERVER_URL);
  const forwardTo = `${forwardTarget.host}${forwardTarget.pathname}`;

  const stripeArgs = [
    'listen',
    '--forward-to',
    forwardTo
  ];

  if (stripeSupportsRequestTimeout()) {
    stripeArgs.push('--request-timeout', '120');
  } else {
    console.log('ℹ️  Stripe CLI version does not support --request-timeout; using default timeout');
  }

  stripeListenerProcess = spawn('stripe', stripeArgs, {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Set up continuous logging for stdout and stderr
  stripeListenerProcess.stdout?.on('data', (data) => {
    const output = data.toString();
    console.log(`[Stripe] ${output.trim()}`);
  });

  stripeListenerProcess.stderr?.on('data', (data) => {
    console.error(`[Stripe Error] ${data.toString().trim()}`);
  });

  stripeListenerProcess.on('error', (error) => {
    console.error('[Stripe Process Error]', error);
  });

  // Wait for listener to be ready
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Stripe listener startup timeout'));
      }, 10000);

      const checkReady = (data: Buffer) => {
        const output = data.toString();
        // Stripe CLI outputs "Ready!" to stderr, also check for webhook signing secret
        if (output.includes('Ready!') || output.includes('webhook signing secret')) {
          clearTimeout(timeout);
          console.log('✓ Global Stripe webhook listener ready');
          stripeListenerProcess!.stdout?.off('data', checkReady);
          stripeListenerProcess!.stderr?.off('data', checkReady);
          resolve();
        }
      };

      // Listen to both stdout and stderr since Stripe CLI uses stderr for status messages
      stripeListenerProcess!.stdout?.on('data', checkReady);
      stripeListenerProcess!.stderr?.on('data', checkReady);
    });
  } catch (error) {
    console.warn('⚠️  Failed to start global Stripe listener:', error);
    console.warn('Webhook events may not be processed during tests');
  }

  // Store the process globally so globalTeardown can access it
  (global as any).__STRIPE_LISTENER_PROCESS__ = stripeListenerProcess;
}

export default globalSetup;
