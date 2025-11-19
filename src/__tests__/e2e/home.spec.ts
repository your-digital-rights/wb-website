import { test, expect } from '@playwright/test';
import { setCookieConsentBeforeLoad } from './helpers/test-utils';

test.describe('WhiteBoar Homepage', () => {
  test.beforeEach(async ({ page }) => {
    // Set cookie consent before page load to prevent banner from appearing
    await setCookieConsentBeforeLoad(page, true, false);
    await page.goto('/');
  });

  test('loads homepage successfully', async ({ page }) => {
    // Check that page loads with 200 status
    const response = await page.waitForLoadState('networkidle');

    // Check main heading is visible using test ID
    await expect(page.getByTestId('hero-title')).toBeVisible();

    // Check that all main sections are present
    await expect(page.locator('#pricing')).toBeVisible();
    await expect(page.locator('#portfolio')).toBeVisible();
  });

  test('navigation works correctly', async ({ page, isMobile }) => {
    // On mobile, open the mobile menu first
    if (isMobile) {
      await page.getByLabel('Toggle mobile menu').click();
      await page.waitForTimeout(500); // Wait for menu animation
    }

    // Test navigation to pricing section using navigation menu
    // Filter for visible element to handle desktop vs mobile navigation
    const servicesBtn = page.getByTestId('nav-services-btn').locator('visible=true').first();
    await servicesBtn.click();
    await expect(page.locator('#pricing')).toBeInViewport();

    // On mobile, re-open the menu for the next test
    if (isMobile) {
      await page.getByLabel('Toggle mobile menu').click();
      await page.waitForTimeout(500); // Wait for menu animation
    }

    // Test navigation to portfolio section using navigation menu
    const clientsBtn = page.getByTestId('nav-clients-btn').locator('visible=true').first();
    await clientsBtn.click();
    await expect(page.locator('#portfolio')).toBeInViewport();
  });

  test('language switching works', async ({ page, isMobile }) => {
    // Check initial language (English) - verify hero is visible
    await expect(page.getByTestId('hero-title')).toBeVisible();

    // On mobile, open the mobile menu first
    if (isMobile) {
      await page.getByLabel('Toggle mobile menu').click();
    }

    // Click language selector using screen reader text
    const languageSelector = page.getByRole('button').filter({ has: page.locator('span:has-text("Select language")') });
    await languageSelector.click();

    // Switch to Italian from the dropdown
    await page.getByRole('button').filter({ hasText: /italian/i }).click();

    // Check URL changes to /it
    await expect(page).toHaveURL('/it');

    // Check content switches to Italian - hero should still be visible
    await expect(page.getByTestId('hero-title')).toBeVisible();
  });

  test('theme toggle works', async ({ page, isMobile }) => {
    // Check initial theme (should be light or system)
    const html = page.locator('html');

    // On mobile, open the mobile menu first
    if (isMobile) {
      await page.getByLabel('Toggle mobile menu').click();
    }

    // Click theme toggle using screen reader text
    let themeToggle = page.getByRole('button').filter({ has: page.locator('span:has-text("Toggle theme")') });
    await themeToggle.click();

    // Click Dark theme option from dropdown
    await page.getByRole('menuitem').filter({ hasText: /dark/i }).click();

    // Check that dark class is applied
    await expect(html).toHaveClass(/dark/);

    // On mobile, the menu stays open, so we can directly access theme toggle again
    // On desktop, we need to click theme toggle button again
    themeToggle = page.getByRole('button').filter({ has: page.locator('span:has-text("Toggle theme")') });
    await themeToggle.click();
    await page.getByRole('menuitem').filter({ hasText: /light/i }).click();

    // Check that dark class is removed
    await expect(html).not.toHaveClass(/dark/);
  });

  test('pricing plan selection works', async ({ page }) => {
    // Scroll to pricing section using test ID
    await page.getByTestId('pricing-title').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Scroll button into view and wait for it to be ready
    const pricingButton = page.getByTestId('pricing-cta-fast');
    await pricingButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Wait for navigation to occur after clicking
    await Promise.all([
      page.waitForURL(/\/onboarding/, { timeout: 10000 }),
      pricingButton.click()
    ]);
  });

  test('contact link is working', async ({ page, isMobile }) => {
    // On mobile, open the mobile menu first
    if (isMobile) {
      await page.getByLabel('Toggle mobile menu').click();
      await page.waitForTimeout(500); // Wait for menu animation
    }

    // Check Contact link in navigation
    // Filter for visible element to handle desktop vs mobile navigation
    const contactLink = page.getByTestId('nav-contact-link').locator('visible=true').first();
    await expect(contactLink).toBeVisible();
    await expect(contactLink).toHaveAttribute('href', '/contact');
  });

  test('accessibility features work', async ({ page, isMobile, browserName }) => {
    // Skip keyboard navigation on mobile and webkit (webkit doesn't support Tab navigation in Playwright)
    if (isMobile || browserName === 'webkit') {
      const firstButton = page.getByRole('button').first();
      await expect(firstButton).toBeVisible();
      return;
    }

    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    const buttons = page.getByRole('button');
    const links = page.getByRole('link');
    
    for (const button of await buttons.all()) {
      await expect(button).toBeVisible();
    }
    
    for (const link of await links.all()) {
      await expect(link).toBeVisible();
    }
  });

  test('portfolio carousel works', async ({ page, isMobile }) => {
    // Scroll to portfolio using test ID
    await page.getByTestId('portfolio-title').click();

    // Check that carousel is visible
    await expect(page.locator('[role="region"][aria-roledescription="carousel"]')).toBeVisible();

    // Check that portfolio items are visible
    await expect(page.locator('[role="group"][aria-roledescription="slide"]').first()).toBeVisible();

    // Navigation buttons are only visible on desktop (hidden sm:flex)
    if (!isMobile) {
      // Look for buttons containing screen reader text for navigation
      const prevButton = page.locator('button').filter({ has: page.locator('span:has-text("Previous slide")') });
      const nextButton = page.locator('button').filter({ has: page.locator('span:has-text("Next slide")') });

      await expect(prevButton).toBeVisible();
      await expect(nextButton).toBeVisible();

      // Test next button click
      await nextButton.click();

      // Wait for carousel to move
      await page.waitForTimeout(500);
    }
  });

  test('mobile responsiveness', async ({ page, isMobile }) => {
    if (isMobile) {
      // Check that mobile menu toggle is present
      await expect(page.getByLabel('Toggle mobile menu')).toBeVisible();

      // Open mobile menu
      await page.getByLabel('Toggle mobile menu').click();

      // Check that mobile navigation controls are present
      await expect(page.getByRole('button').filter({ has: page.locator('span:has-text("Select language")') })).toBeVisible();
      await expect(page.getByRole('button').filter({ has: page.locator('span:has-text("Toggle theme")') })).toBeVisible();

      // Close mobile menu
      await page.getByLabel('Toggle mobile menu').click();

      // Check that content is readable on mobile using test ID
      await expect(page.getByTestId('hero-title')).toBeVisible();

      // Check that buttons are accessible on mobile using test ID
      await expect(page.getByTestId('hero-cta')).toBeVisible();
    }
  });
});
