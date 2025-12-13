import path from 'path';
import { test, expect } from '@playwright/test';
import { setCookieConsentBeforeLoad } from './helpers/test-utils';

// Load web-vitals bundle from local dependency to avoid CSP failures on previews
const webVitalsPath = path.join(process.cwd(), 'node_modules/web-vitals/dist/web-vitals.iife.js');

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set cookie consent before page load to prevent banner from affecting performance
    await setCookieConsentBeforeLoad(page, true, false);
  });

  test('measures Core Web Vitals', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Inject web-vitals script from local dependency (avoids CSP issues on previews)
    await page.addScriptTag({ path: webVitalsPath });
    
    // Measure Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};
        let metricsCount = 0;
        const expectedMetrics = 3; // LCP, FID, CLS
        
        const handleVital = (metric) => {
          vitals[metric.name] = metric.value;
          metricsCount++;
          
          if (metricsCount >= expectedMetrics) {
            resolve(vitals);
          }
        };
        
        // Measure vitals
        window.webVitals.onLCP(handleVital);
        window.webVitals.onFID(handleVital);
        window.webVitals.onCLS(handleVital);
        
        // Fallback timeout
        setTimeout(() => resolve(vitals), 5000);
      });
    });
    
    console.log('Core Web Vitals:', vitals);
    
    // Assert performance requirements from context/CONTEXT.md
    // LCP should be ≤ 1.8s (1800ms)
    if (vitals.LCP) {
      expect(vitals.LCP).toBeLessThanOrEqual(1800);
    }
    
    // CLS should be < 0.1
    if (vitals.CLS) {
      expect(vitals.CLS).toBeLessThan(0.1);
    }
  });
  
  test('checks for performance issues', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for large unused JavaScript bundles
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('navigation')[0];
    });

    console.log('Performance timing:', performanceEntries);

    // Check that page loads within reasonable time
    // Use 6000ms threshold for development (Turbopack hot reloading + test parallelization overhead), 3000ms for production
    const threshold = process.env.NODE_ENV === 'production' ? 3000 : 6000;
    expect(performanceEntries.loadEventEnd - performanceEntries.fetchStart).toBeLessThan(threshold);
  });
  
  test('validates image optimization', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that images are properly optimized
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');
      
      // Ensure all images have alt text
      expect(alt).toBeTruthy();
      
      // Check that Next.js Image component is being used (has _next/image or _next/static)
      if (src && !src.startsWith('data:')) {
        expect(src).toMatch(/\/_next\/(image|static)|\.webp$|\.avif$/);
      }
    }
  });
  
  test('validates no console errors', async ({ page }) => {
    const consoleErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out external service errors (not our code's fault)
    const relevantErrors = consoleErrors.filter(error => {
      // Google Fonts CORS errors (caused by Vercel protection headers)
      // Instead of substring matching, extract URLs and check host precisely
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = error.match(urlRegex) || [];
      for (const urlString of urls) {
        try {
          const thisUrl = new URL(urlString);
          if (thisUrl.host === 'fonts.gstatic.com') return false;
        } catch (e) {
          // Not a valid URL, ignore
        }
      }
      if (error.includes('CORS policy')) return false;
      if (error.includes('Failed to load resource')) return false;
      // Vercel Live feedback widget CSP errors
      if (error.includes('vercel.live')) return false;
      if (error.includes('Content Security Policy')) return false;
      // React hydration mismatches from Radix UI dynamic IDs (known issue, non-functional)
      if (error.includes('hydrated but some attributes')) return false;
      if (error.includes('aria-controls=') && error.includes('radix-')) return false;
      return true;
    });

    // Check that there are no console errors from our code
    expect(relevantErrors).toHaveLength(0);
  });
});
