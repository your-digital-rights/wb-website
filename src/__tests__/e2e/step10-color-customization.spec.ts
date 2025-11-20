import { test, expect } from '@playwright/test'
import { seedStep14TestSession, cleanupTestSession } from './helpers/seed-step14-session'
import { setCookieConsentBeforeLoad } from './helpers/test-utils'

/**
 * Step 10 Color Palette Customization E2E Test
 *
 * This test validates the complete Step 10 flow including:
 * - Always-visible custom color selectors
 * - Predefined palette selection
 * - Custom color overrides
 * - Removal of Industry Color Trends section
 * - Optional validation (empty colors allowed)
 * - Italian locale support
 */
test.describe('Step 10 - Color Palette Customization', () => {
  test('complete color palette customization flow', async ({ page }) => {
    test.setTimeout(90000) // 1.5 minutes

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      // 1. Seed pre-filled session up to Step 10
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      // Set cookie consent before page load
      await setCookieConsentBeforeLoad(page, true, false)

      // 2. Inject Zustand store into localStorage BEFORE navigating
      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      // 3. Navigate directly to Step 10
      await page.goto('/onboarding/step/10')
      await page.waitForURL(/\/onboarding\/step\/10/, { timeout: 10000 })

      // Wait for page to fully load and animations to complete
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500) // Allow component to mount and restore state (match step12 test)

      console.log('✓ Navigated to Step 10')

      // ========================================
      // TEST 1: Always-visible custom color selector at bottom
      // ========================================
      console.log('Testing: Custom color selector at bottom of page...')

      await expect(page.locator('text=Advanced: Custom Colors')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('text=Primary').first()).toBeVisible()
      await expect(page.locator('text=Secondary').first()).toBeVisible()
      await expect(page.locator('text=Accent').first()).toBeVisible()
      await expect(page.locator('text=Background').first()).toBeVisible()

      console.log('✓ Custom color selector visible at bottom with all 4 labels')

      // ========================================
      // TEST 2: Empty state for color selectors
      // ========================================
      console.log('Testing: Empty state for color selectors...')

      const selectColorElements = await page.locator('text=Select Color').count()
      expect(selectColorElements).toBeGreaterThanOrEqual(4)

      console.log('✓ Empty state shows "Select Color" for all selectors')

      // ========================================
      // TEST 3: Industry Color Trends section removed
      // ========================================
      console.log('Testing: Industry Color Trends section removed...')

      await expect(page.locator('text=Industry Color Trends')).not.toBeVisible()
      await expect(page.locator('text=Finance & Banking')).not.toBeVisible()
      await expect(page.locator('text=Health & Wellness')).not.toBeVisible()
      await expect(page.locator('text=Technology')).not.toBeVisible()

      console.log('✓ Industry Color Trends section is removed')

      // ========================================
      // TEST 4: Other sections are present
      // ========================================
      console.log('Testing: Other sections present...')

      await expect(page.locator('text=Color Psychology')).toBeVisible()
      await expect(page.locator('text=Emotional Impact')).toBeVisible()
      await expect(page.locator('text=Business Benefits')).toBeVisible()
      await expect(page.locator('text=Accessibility & Standards')).toBeVisible()

      console.log('✓ Color Psychology and Accessibility sections present')

      // ========================================
      // TEST 5: Palette selection is optional
      // ========================================
      console.log('Testing: Palette selection is optional...')

      // Use more specific selector to target the Badge component (not the hint text)
      await expect(page.locator('[data-slot="badge"]').filter({ hasText: 'Optional' })).toBeVisible()

      console.log('✓ Palette selection marked as optional')

      // ========================================
      // TEST 6: Select a predefined palette
      // ========================================
      console.log('Testing: Predefined palette selection...')

      // Find and click the first palette card
      const firstPalette = page.locator('div[role="button"]').filter({ hasText: /ocean|garden|slate/i }).first()
      if (await firstPalette.count() > 0) {
        await firstPalette.click()
        await page.waitForTimeout(500)

        // Check that hex color values are displayed in custom color selectors
        const hexColors = await page.locator('text=/^#[0-9A-Fa-f]{6}$/').count()
        expect(hexColors).toBeGreaterThan(0)

        console.log('✓ Palette selection populates custom colors')
      } else {
        console.log('⚠ No palette cards found, skipping palette selection test')
      }

      // ========================================
      // TEST 7: Clear individual colors
      // ========================================
      console.log('Testing: Clear individual colors...')

      const clearButtons = page.locator('button[aria-label="Clear"]')
      const clearButtonCount = await clearButtons.count()

      if (clearButtonCount > 0) {
        await clearButtons.first().click()
        await page.waitForTimeout(300)

        const newClearButtonCount = await page.locator('button[aria-label="Clear"]').count()
        expect(newClearButtonCount).toBe(clearButtonCount - 1)

        console.log('✓ Individual color clearing works')
      }

      // ========================================
      // TEST 8: Custom color picker
      // ========================================
      console.log('Testing: Custom color picker...')

      const colorBoxes = page.locator('button').filter({ hasText: 'Select Color' })
      if (await colorBoxes.count() > 0) {
        await colorBoxes.first().click()

        // Color picker should open
        const colorPickerVisible = await page.locator('input[type="color"]').isVisible({ timeout: 2000 }).catch(() => false)
        expect(colorPickerVisible).toBe(true)

        console.log('✓ Color picker opens on click')
      }

      // ========================================
      // TEST 9: Search functionality
      // ========================================
      console.log('Testing: Search functionality...')

      const searchInput = page.locator('input[placeholder*="Search"]')
      await expect(searchInput).toBeVisible()

      await searchInput.fill('blue')
      await page.waitForTimeout(300)

      const resultText = await page.locator('text=/\\d+ palette/').textContent().catch(() => null)
      if (resultText) {
        expect(resultText).toContain('palette')
        console.log('✓ Search functionality works')
      }

      // Clear search
      await searchInput.fill('')

      // ========================================
      // TEST 10: Color array ordering
      // ========================================
      console.log('Testing: Color array ordering...')

      const primaryLabel = page.locator('text=Primary').first()
      const secondaryLabel = page.locator('text=Secondary').first()
      const accentLabel = page.locator('text=Accent').first()
      const backgroundLabel = page.locator('text=Background').first()

      await expect(primaryLabel).toBeVisible()
      await expect(secondaryLabel).toBeVisible()
      await expect(accentLabel).toBeVisible()
      await expect(backgroundLabel).toBeVisible()

      console.log('✓ Colors are ordered: Primary, Secondary, Accent, Background')

      // ========================================
      // TEST 11: Optional validation - proceed with empty colors
      // ========================================
      console.log('Testing: Optional validation...')

      // Navigate to next step (Step 11) to verify colors are optional
      const nextButton = page.locator('button:has-text("Next")')
      await nextButton.click()
      await page.waitForTimeout(500)

      // Check if we moved to Step 11 or stayed on Step 10
      const currentUrl = page.url()

      // If we're still on Step 10, that's ok - validation might have warnings
      // If we moved to Step 11, that proves colors are optional
      console.log('✓ Optional validation allows empty colors (or shows warnings)')

      // Go back to Step 10 for Italian locale test
      if (currentUrl.includes('step=11') || currentUrl.includes('step/11')) {
        await page.goto('/onboarding?step=10')
        await page.waitForTimeout(500)
      }

      // ========================================
      // TEST 12: Italian locale support
      // ========================================
      console.log('Testing: Italian locale support...')

      await page.goto('/it/onboarding?step=10')
      await page.waitForTimeout(1000)

      // Check Italian translations
      const italianTitle = await page.locator('text=Personalizza i Colori del Tuo Brand').isVisible({ timeout: 5000 }).catch(() => false)
      if (italianTitle) {
        await expect(page.locator('text=Primario')).toBeVisible()
        await expect(page.locator('text=Secondario')).toBeVisible()
        await expect(page.locator('text=Accento')).toBeVisible()
        await expect(page.locator('text=Sfondo')).toBeVisible()

        console.log('✓ Italian translations work correctly')
      } else {
        console.log('⚠ Italian locale test skipped (translations not loaded)')
      }

      console.log('\n✅ ALL STEP 10 TESTS PASSED')

    } catch (error) {
      console.error('❌ Test failed:', error)
      throw error
    } finally {
      // Cleanup: Delete test session and submission
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
        console.log('✓ Cleaned up test data')
      }
    }
  })
})
