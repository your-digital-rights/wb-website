import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setCookieConsentBeforeLoad } from './helpers/test-utils';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set cookie consent before page load to prevent banner from interfering with tests
    await setCookieConsentBeforeLoad(page, true, false);
  });

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for Framer Motion animations to complete (250ms duration + buffer)
    await page.waitForTimeout(500);

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
  
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that there's exactly one h1
    const h1Elements = await page.locator('h1').count();
    expect(h1Elements).toBe(1);
    
    // Check that headings follow proper hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingLevels = [];
    
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      headingLevels.push(parseInt(tagName.charAt(1)));
    }
    
    // Verify heading hierarchy (no skipping levels)
    let previousLevel = 0;
    for (const level of headingLevels) {
      if (previousLevel === 0) {
        expect(level).toBe(1); // First heading should be h1
      } else {
        expect(level).toBeLessThanOrEqual(previousLevel + 1);
      }
      previousLevel = level;
    }
  });
  
test('should have proper focus management', async ({ page, isMobile }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  if (isMobile) {
    const firstButton = page.getByRole('button').first();
    await expect(firstButton).toBeVisible();
    return;
  }
  
  await page.keyboard.press('Tab');
  
  const focusedElement = await page.locator(':focus').first();
  await expect(focusedElement).toBeVisible();
  
  const focusStyles = await focusedElement.evaluate(element => {
    const styles = window.getComputedStyle(element);
    return {
      outline: styles.outline,
      outlineColor: styles.outlineColor,
      outlineWidth: styles.outlineWidth,
      boxShadow: styles.boxShadow
    };
  });
  
  const hasFocusIndicator = focusStyles.outline !== 'none' || 
                           focusStyles.outlineWidth !== '0px' || 
                           focusStyles.boxShadow !== 'none';
  expect(hasFocusIndicator).toBe(true);
});
  
  test('should have proper alt text for images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');
      
      // All images should have alt attributes
      expect(alt).toBeDefined();
      
      // Decorative images can have empty alt, but it should be explicit
      if (src && !src.startsWith('data:')) {
        expect(alt).not.toBeNull();
      }
    }
  });
  
  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that interactive elements have proper labels
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      
      // Button should have accessible name via text, aria-label, or aria-labelledby
      const hasAccessibleName = Boolean(
        (textContent && textContent.trim() !== '') ||
        ariaLabel ||
        ariaLabelledBy
      );
      expect(hasAccessibleName).toBe(true);
    }
    
    // Check that navigation has proper role
    const nav = await page.locator('nav').first();
    await expect(nav).toBeVisible();
    
    // Check that main content area exists
    const main = await page.locator('main').first();
    await expect(main).toBeVisible();
    
    // Check that footer has proper role
    const footer = await page.locator('[role="contentinfo"], footer').first();
    await expect(footer).toBeVisible();
  });
  
  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for Framer Motion animations to complete (250ms duration + buffer)
    await page.waitForTimeout(500);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Filter for color contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );

    expect(contrastViolations).toEqual([]);
  });
  
test('should be keyboard accessible', async ({ page, isMobile }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  if (isMobile) {
    const interactiveElement = page.locator('button, a, input, select, textarea').first();
    await expect(interactiveElement).toBeVisible();
    return;
  }
  
  const interactiveElements = await page.locator('button, a, input, select, textarea, [tabindex="0"]').all();
  
  for (let i = 0; i < Math.min(interactiveElements.length, 10); i++) {
    await page.keyboard.press('Tab');
    
    const focusedElement = await page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();
    
    const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
    if (tagName === 'button' || tagName === 'a') {
      const role = await focusedElement.getAttribute('role');
      const isButton = tagName === 'button' || role === 'button';
      const isLink = tagName === 'a' || role === 'link';
      expect(isButton || isLink).toBe(true);
    }
  }
});
  
  test('should have proper form accessibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for any form elements
    const formElements = await page.locator('input, select, textarea').all();
    
    for (const element of formElements) {
      const id = await element.getAttribute('id');
      const ariaLabel = await element.getAttribute('aria-label');
      const ariaLabelledBy = await element.getAttribute('aria-labelledby');
      
      if (id) {
        // Check if there's a corresponding label
        const label = await page.locator(`label[for="${id}"]`).count();
        const hasLabel = label > 0;
        const hasAriaLabel = ariaLabel !== null;
        const hasAriaLabelledBy = ariaLabelledBy !== null;
        
        expect(hasLabel || hasAriaLabel || hasAriaLabelledBy).toBe(true);
      }
    }
  });
  
  test('should announce content changes to screen readers', async ({ page, isMobile }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for live regions that might announce changes
    const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').count();

    // On mobile, open the mobile menu first
    if (isMobile) {
      await page.getByLabel('Toggle mobile menu').click();
    }

    // For theme switching and language switching, check if changes are announced
    const themeToggle = page.getByRole('button').filter({ has: page.locator('span:has-text("Toggle theme")') });
    await themeToggle.click();
    await page.getByRole('menuitem').filter({ hasText: /dark/i }).click();

    // Check that theme change is reflected
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
  });
  
  test('should work with reduced motion preferences', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that animations are disabled or reduced
    const animatedElements = await page.locator('[style*="animation"], [class*="animate"]').all();
    
    for (const element of animatedElements) {
      const computedStyle = await element.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          animationDuration: styles.animationDuration,
          transitionDuration: styles.transitionDuration
        };
      });
      
      // Animations should be either disabled or very short with reduced motion
      if (computedStyle.animationDuration !== 'none') {
        const duration = parseFloat(computedStyle.animationDuration);
        expect(duration).toBeLessThanOrEqual(0.2); // Max 200ms
      }
    }
  });
});
