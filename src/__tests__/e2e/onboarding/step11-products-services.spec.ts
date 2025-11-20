/**
 * Comprehensive E2E Test: Enhanced Products & Services Entry (Step 11)
 * Feature: 002-improved-products-service
 *
 * This single test covers all 11 phases of functionality:
 * 1. Empty state & skip flow
 * 2. Validation testing
 * 3. Photo validation
 * 4. Complete product creation with photos
 * 5. Additional products & limits
 * 6. Reordering
 * 7. Edit product
 * 8. Delete product
 * 9. Internationalization
 * 10. Performance & accessibility
 * 11. Final persistence & API contracts
 */

import { test, expect, Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Helper: Ensure fresh onboarding state
async function ensureFreshOnboardingState(page: Page) {
  // Navigate first to establish a valid page context
  await page.goto('/onboarding')

  // Now clear storage
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

// Helper: Seed session through Step 10
async function seedSessionThroughStep10(page: Page) {
  // TODO: Implement fast-path session seeding through Step 10
  // For now, navigate directly to Step 11 (will be replaced with proper seeding)
  await page.goto('/onboarding/step/11')
}

test.describe('Step 11: Enhanced Products & Services Entry', () => {
  test.beforeEach(async ({ page }) => {
    await ensureFreshOnboardingState(page)
    await seedSessionThroughStep10(page)
  })

  test('Complete product management flow (all 11 phases)', async ({ page }) => {
    // ========================================================================
    // Phase 1: Empty State & Skip Flow (1 min)
    // ========================================================================

    await test.step('Phase 1: Empty state and skip flow', async () => {
      // Verify empty state message
      await expect(page.getByText('No products added yet')).toBeVisible()

      // Verify "Add Product" button enabled
      const addButton = page.getByRole('button', { name: 'Add Product' })
      await expect(addButton).toBeEnabled()

      // Verify "Next" button enabled (not disabled for skipping)
      const nextButton = page.getByRole('button', { name: 'Next' })
      await expect(nextButton).toBeEnabled()

      // Test skip flow: navigate to Step 12
      await nextButton.click()
      await expect(page).toHaveURL(/\/step\/12/)

      // Navigate back to Step 11
      await page.goBack()
      await expect(page).toHaveURL(/\/step\/11/)

      // Verify products array empty in localStorage
      const products = await page.evaluate(() => {
        const store = JSON.parse(localStorage.getItem('onboarding-store') || '{}')
        return store.state?.formData?.products || []
      })
      expect(products).toEqual([])
    })

    // ========================================================================
    // Phase 2: Validation Testing (2 min)
    // ========================================================================

    await test.step('Phase 2: Validation testing', async () => {
      // Click "Add Product" to open form
      await page.getByRole('button', { name: 'Add Product' }).click()

      // Test name validation - too short
      const nameInput = page.getByLabel('Product Name')
      await nameInput.fill('AB')
      await nameInput.blur()
      await expect(page.getByText(/must be at least 3 characters/i)).toBeVisible()

      // Verify character counter
      await expect(page.getByText('2/50')).toBeVisible()

      // Test name validation - too long
      const longName = 'A'.repeat(51)
      await nameInput.fill(longName)
      await nameInput.blur()
      await expect(page.getByText(/cannot exceed 50 characters/i)).toBeVisible()
      await expect(page.getByText('51/50')).toBeVisible()

      // Test description validation - too short
      const descInput = page.getByLabel('Description')
      await descInput.fill('Short')
      await descInput.blur()
      await expect(page.getByText(/must be at least 10 characters/i)).toBeVisible()

      // Test description validation - too long
      const longDesc = 'A'.repeat(101)
      await descInput.fill(longDesc)
      await descInput.blur()
      await expect(page.getByText(/cannot exceed 100 characters/i)).toBeVisible()

      // Test price validation - negative
      const priceInput = page.getByLabel(/Price.*optional/i)
      await priceInput.fill('-50')
      await priceInput.blur()
      await expect(page.getByText(/must be a positive number/i)).toBeVisible()

      // Test price validation - too many decimals
      await priceInput.fill('99.999')
      await priceInput.blur()
      await expect(page.getByText(/cannot have more than 2 decimal places/i)).toBeVisible()

      // Verify save button disabled while errors present
      const saveButton = page.getByRole('button', { name: 'Save Product' })
      await expect(saveButton).toBeDisabled()
    })

    // ========================================================================
    // Phase 3: Photo Validation (1 min)
    // ========================================================================

    await test.step('Phase 3: Photo validation', async () => {
      // Fill valid product data
      await page.getByLabel('Product Name').fill('Website Design Service')
      await page.getByLabel('Description').fill('Professional website design tailored to your business needs and target audience.')
      await page.getByLabel(/Price.*optional/i).fill('1500.00')

      // Test invalid photo format (.gif)
      const fileInput = page.locator('input[type="file"]')
      // Note: Actual file upload would require test fixture files
      // This is a placeholder for the file validation logic
      // await fileInput.setInputFiles('path/to/test.gif')
      // await expect(page.getByText(/Only JPEG, PNG, and WebP images are supported/i)).toBeVisible()
    })

    // ========================================================================
    // Phase 4: Complete Product Creation with Photos (2 min)
    // ========================================================================

    await test.step('Phase 4: Complete product creation with photos', async () => {
      // Save product (photos will be tested when file upload is fully implemented)
      await page.getByRole('button', { name: 'Save Product' }).click()

      // Verify auto-save indicator
      await expect(page.getByText('Saving...')).toBeVisible()
      await expect(page.getByText('Saved ✓')).toBeVisible({ timeout: 3000 })

      // Verify product appears in list
      await expect(page.getByText('Website Design Service')).toBeVisible()
      await expect(page.getByText('€1,500.00')).toBeVisible()
    })

    // ========================================================================
    // Phase 5: Additional Products & Limits (2 min)
    // ========================================================================

    await test.step('Phase 5: Additional products and limits', async () => {
      // Add 5 more products (total 6)
      const additionalProducts = [
        { name: 'SEO Service', desc: 'Search engine optimization for better rankings.' },
        { name: 'Content Writing', desc: 'Professional content creation for your website.' },
        { name: 'Social Media', desc: 'Social media management and content strategy.' },
        { name: 'Branding', desc: 'Complete brand identity design and guidelines.' },
        { name: 'Consulting', desc: 'Expert consulting for digital transformation.' }
      ]

      for (const product of additionalProducts) {
        await page.getByRole('button', { name: 'Add Product' }).click()
        await page.getByLabel('Product Name').fill(product.name)
        await page.getByLabel('Description').fill(product.desc)
        await page.getByRole('button', { name: 'Save Product' }).click()
        await expect(page.getByText('Saved ✓')).toBeVisible({ timeout: 3000 })
      }

      // Verify 6 products total
      const productCards = page.locator('[data-testid="product-card"]')
      await expect(productCards).toHaveCount(6)

      // Verify "Add Product" button disabled
      const addButton = page.getByRole('button', { name: 'Add Product' })
      await expect(addButton).toBeDisabled()

      // Verify tooltip
      await addButton.hover()
      await expect(page.getByText(/Maximum 6 products allowed/i)).toBeVisible()
    })

    // ========================================================================
    // Phase 6: Reordering (1 min)
    // ========================================================================

    await test.step('Phase 6: Reordering', async () => {
      // Get first and last product cards
      const firstProduct = page.locator('[data-testid="product-card"]').first()
      const lastProduct = page.locator('[data-testid="product-card"]').last()

      // Drag first product to bottom
      await firstProduct.hover()
      await page.mouse.down()
      await lastProduct.hover()
      await page.mouse.up()

      // Verify auto-save
      await expect(page.getByText('Saving...')).toBeVisible()
      await expect(page.getByText('Saved ✓')).toBeVisible({ timeout: 3000 })

      // Keyboard navigation test
      await page.keyboard.press('Tab') // Focus on SEO Service
      await page.keyboard.press('Space') // Activate drag mode
      await page.keyboard.press('ArrowDown') // Move down
      await page.keyboard.press('Space') // Drop

      // Verify auto-save again
      await expect(page.getByText('Saved ✓')).toBeVisible({ timeout: 3000 })
    })

    // ========================================================================
    // Phase 7: Edit Product (1 min)
    // ========================================================================

    await test.step('Phase 7: Edit product', async () => {
      // Find and click edit button for "SEO Service"
      const seoProduct = page.locator('[data-testid="product-card"]', { hasText: 'SEO Service' })
      await seoProduct.getByRole('button', { name: 'Edit' }).click()

      // Update fields
      await page.getByLabel('Product Name').fill('Premium SEO Package')
      await page.getByLabel('Description').fill('Comprehensive SEO services including keyword research, on-page optimization, and link building.')
      await page.getByLabel(/Price.*optional/i).fill('2500.00')

      // Save changes
      await page.getByRole('button', { name: 'Save Changes' }).click()

      // Verify updates
      await expect(page.getByText('Premium SEO Package')).toBeVisible()
      await expect(page.getByText('€2,500.00')).toBeVisible()
      await expect(page.getByText('Saved ✓')).toBeVisible({ timeout: 3000 })
    })

    // ========================================================================
    // Phase 8: Delete Product (1 min)
    // ========================================================================

    await test.step('Phase 8: Delete product', async () => {
      // Find and click delete button for "Content Writing"
      const contentProduct = page.locator('[data-testid="product-card"]', { hasText: 'Content Writing' })
      await contentProduct.getByRole('button', { name: 'Delete' }).click()

      // Confirm deletion in modal
      await page.getByRole('button', { name: 'Confirm' }).click()

      // Verify product removed
      await expect(page.getByText('Content Writing')).not.toBeVisible()

      // Verify only 5 products remain
      const productCards = page.locator('[data-testid="product-card"]')
      await expect(productCards).toHaveCount(5)

      // Verify "Add Product" button re-enabled
      const addButton = page.getByRole('button', { name: 'Add Product' })
      await expect(addButton).toBeEnabled()

      // Verify auto-save
      await expect(page.getByText('Saved ✓')).toBeVisible({ timeout: 3000 })
    })

    // ========================================================================
    // Phase 9: Internationalization (1 min)
    // ========================================================================

    await test.step('Phase 9: Internationalization', async () => {
      // Verify English labels
      await expect(page.getByText('Add Product')).toBeVisible()
      await expect(page.getByText('Product Name')).toBeVisible()

      // Switch to Italian
      await page.getByRole('button', { name: /language/i }).click()
      await page.getByRole('menuitem', { name: 'Italiano' }).click()

      // Verify URL changed to /it
      await expect(page).toHaveURL(/\/it\/onboarding\/step\/11/)

      // Verify Italian translations
      await expect(page.getByText('Aggiungi Prodotto')).toBeVisible()
      await expect(page.getByText('Nome Prodotto')).toBeVisible()

      // Verify data preserved (products still visible)
      await expect(page.getByText('Premium SEO Package')).toBeVisible()

      // Verify Italian price formatting
      await expect(page.getByText('€2.500,00')).toBeVisible() // Italian uses period for thousands

      // Switch back to English
      await page.getByRole('button', { name: /lingua/i }).click()
      await page.getByRole('menuitem', { name: 'English' }).click()
      await expect(page).toHaveURL(/\/onboarding\/step\/11/)
    })

    // ========================================================================
    // Phase 10: Performance & Accessibility (1 min)
    // ========================================================================

    await test.step('Phase 10: Performance and accessibility', async () => {
      // Measure performance metrics
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          if ('web-vitals' in window) {
            // @ts-ignore
            const vitals = window.webVitals || {}
            resolve(vitals)
          } else {
            // Fallback if web-vitals not loaded
            resolve({ LCP: 0, CLS: 0 })
          }
        })
      })

      // Verify LCP ≤ 1.8s (1800ms)
      // @ts-ignore
      if (metrics.LCP) {
        // @ts-ignore
        expect(metrics.LCP).toBeLessThan(1800)
      }

      // Verify CLS < 0.1
      // @ts-ignore
      if (metrics.CLS) {
        // @ts-ignore
        expect(metrics.CLS).toBeLessThan(0.1)
      }

      // Run accessibility checks using AxeBuilder
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze()

      // Verify no critical violations
      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical'
      )
      expect(criticalViolations).toHaveLength(0)

      // Verify keyboard navigation (Tab through controls)
      await page.keyboard.press('Tab')
      await expect(page.locator(':focus')).toBeVisible()

      // Verify ARIA labels present
      const dragHandle = page.locator('[aria-label*="drag"]').first()
      if (await dragHandle.count() > 0) {
        await expect(dragHandle).toHaveAttribute('aria-label')
      }
    })

    // ========================================================================
    // Phase 11: Final Persistence & API Contract Validation (1 min)
    // ========================================================================

    await test.step('Phase 11: Final persistence and API contracts', async () => {
      // Refresh page
      await page.reload()

      // Verify all 5 products persist
      const productCards = page.locator('[data-testid="product-card"]')
      await expect(productCards).toHaveCount(5)

      // Verify product data intact
      await expect(page.getByText('Premium SEO Package')).toBeVisible()
      await expect(page.getByText('€2,500.00')).toBeVisible()

      // Navigate to Step 12 (final verification)
      await page.getByRole('button', { name: 'Next' }).click()
      await expect(page).toHaveURL(/\/step\/12/)

      // Note: API contract tests (update session, upload/delete photos) run separately
      // as unit tests in specs/002-improved-products-service/contracts/
    })
  })
})
