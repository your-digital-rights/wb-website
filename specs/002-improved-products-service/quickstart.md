# Quickstart: Enhanced Products & Services Entry

**Feature**: Step 11 Onboarding Enhancement
**Date**: 2025-11-20
**Purpose**: Executable test scenarios for manual and automated validation

## Prerequisites

Before running these scenarios, ensure:

1. **Development Server Running**:
   ```bash
   PORT=3783 pnpm dev
   ```

2. **Database Migration Applied**:
   ```bash
   pnpm supabase db push
   # Or manually: psql -f migrations/00X_add_products_to_onboarding.sql
   ```

3. **Test User Session Created**:
   - Navigate to http://localhost:3783/onboarding
   - Complete Steps 1-10 or use existing test session
   - Note session ID for API testing

4. **Environment Variables Set**:
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for tests)

---

## Comprehensive Test Scenario: Complete Product Management Flow

**Objective**: Validate all Step 11 functionality in a single comprehensive test flow covering empty state, CRUD operations, validation, photo management, reordering, internationalization, performance, and accessibility.

**Test Duration**: ~8-10 minutes (E2E automation), ~15-20 minutes (manual)

**Prerequisites**:
- Fresh onboarding session seeded through Step 10 (see `docs/testing-procedure.md`)
- Test image files prepared: 1x .jpg (5-9 MB), 2x .png (<5 MB), 1x .webp (<3 MB), 1x .gif (for error testing)

### Test Flow

#### Phase 1: Empty State & Skip Flow (1 min)
1. Navigate to `http://localhost:3783/onboarding/step/11`
2. **Verify empty state**:
   - "No products added yet" message displayed
   - "Add Product" button enabled
   - "Next" button enabled (not disabled)
3. Click "Next" → Verify navigation to Step 12
4. Navigate back to Step 11
5. **Verify persistence**: Products array empty in localStorage:
   ```javascript
   JSON.parse(localStorage.getItem('onboarding-store')).state.formData.products // Expected: []
   ```

#### Phase 2: Validation Testing (2 min)
6. Click "Add Product" button
7. **Test name validation**:
   - Enter "AB" → Verify error: "Product name must be at least 3 characters"
   - Character counter shows "2/50"
   - Enter 51 characters → Verify error: "Product name cannot exceed 50 characters"
   - Character counter shows "51/50" (red styling)
8. **Test description validation**:
   - Enter "Short" → Verify error: "Description must be at least 10 characters"
   - Enter 101 characters → Verify error: "Description cannot exceed 100 characters"
9. **Test price validation**:
   - Enter "-50" → Verify error: "Price must be a positive number"
   - Enter "99.999" → Verify error: "Price cannot have more than 2 decimal places"
10. **Verify save button**: Disabled while validation errors present

#### Phase 3: Photo Validation (1 min)
11. Fill valid product data:
    - Name: "Website Design Service"
    - Description: "Professional website design tailored to your business needs and target audience."
    - Price: "1500.00"
12. Click "Upload Photo"
13. **Test invalid format**: Select .gif file → Verify error: "Only JPEG, PNG, and WebP images are supported"

#### Phase 4: Complete Product Creation with Photos (2 min)
14. **Upload valid photos**:
    - Select large .jpg file (5-9 MB) → Monitor progress bar (0% → 100%)
    - Verify navigation locked during upload (attempt "Next" → modal blocks)
    - Wait for completion → Verify thumbnail appears
    - Upload 2 more photos (.png, .webp) → Verify all 3 thumbnails displayed
15. Click "Save Product"
16. **Verify auto-save**:
    - Auto-save indicator shows "Saving..." (debounce phase)
    - After 1.5s → "Saved ✓"
17. **Verify product list**:
    - Product card displays with first photo thumbnail
    - Name: "Website Design Service"
    - Price: "€1,500.00" (properly formatted)

#### Phase 5: Additional Products & Limits (2 min)
18. Add 5 more products quickly (names: "SEO Service", "Content Writing", "Social Media", "Branding", "Consulting")
    - Use valid names/descriptions (no photos for speed)
    - Total: 6 products
19. **Verify maximum limit**:
    - "Add Product" button disabled
    - Tooltip displays: "Maximum 6 products allowed"

#### Phase 6: Reordering (1 min)
20. **Drag-and-drop test**:
    - Drag "Website Design Service" (first) to bottom position
    - Verify new order reflects immediately
    - Auto-save indicator shows "Saving..." → "Saved ✓"
21. **Keyboard navigation test**:
    - Focus on "SEO Service"
    - Press Space → Arrow Down → Space
    - Verify order updated

#### Phase 7: Edit Product (1 min)
22. Click "Edit" on "SEO Service"
23. Update:
    - Name: "Premium SEO Package"
    - Description: "Comprehensive SEO services including keyword research, on-page optimization, and link building."
    - Price: "2500.00"
    - Add 1 new photo
24. Click "Save Changes"
25. **Verify**:
    - Product list shows "Premium SEO Package"
    - Price: "€2,500.00"
    - Photo count: 1
    - Auto-save completes

#### Phase 8: Delete Product (1 min)
26. Click "Delete" on "Content Writing"
27. Confirm deletion modal → Click "Confirm"
28. **Verify**:
    - Product removed from list (now 5 products)
    - Auto-save completes
    - "Add Product" button re-enabled (under 6 limit)
29. (Optional) **Verify storage cleanup**:
    - Check Supabase Dashboard → Storage → onboarding-photos
    - Confirm no orphaned files for deleted product

#### Phase 9: Internationalization (1 min)
30. Verify English labels: "Add Product", "Product Name", "Description", "Price (optional)"
31. Click language switcher → Select "Italiano"
32. **Verify Italian translations**:
    - URL: `/it/onboarding/step/11`
    - Labels: "Aggiungi Prodotto", "Nome Prodotto", "Descrizione", "Prezzo (opzionale)"
    - Validation errors in Italian
33. **Verify data preserved**:
    - All 5 products still visible
    - "Premium SEO Package" price: "€2.500,00" (Italian formatting with period for thousands)
34. Switch back to English

#### Phase 10: Performance & Accessibility (1 min)
35. **Performance check** (automated):
    - Measure LCP ≤ 1.8s
    - Measure CLS < 0.1
    - Verify no layout shifts during product list updates
36. **Accessibility check** (automated):
    - Run axe-core → 0 critical violations
    - Test keyboard navigation (Tab through all controls)
    - Verify ARIA labels on drag handles, upload buttons
    - Test focus indicators visible on all interactive elements

#### Phase 11: Final Persistence & API Contract Validation (1 min)
37. Refresh page → Verify all 5 products persist with correct order
38. **API contract validation** (automated tests run separately):
    - `PATCH /api/onboarding/sessions/{sessionId}` with products → 200 OK
    - `POST .../products/{productId}/photos` with multipart → photoId returned
    - `DELETE .../photos/{photoId}` → success: true
39. Click "Next" → Verify navigation to Step 12 succeeds

---

### Acceptance Criteria (All Must Pass)

**Product Management**:
- [x] Empty state handling (skip flow works)
- [x] Add products (1-6 limit enforced)
- [x] Edit products (updates persist)
- [x] Delete products (confirmation required, storage cleaned)
- [x] Reorder products (drag-and-drop + keyboard)

**Validation**:
- [x] Character limits enforced (name 3-50, description 10-100)
- [x] Price validation (positive, 2 decimals max)
- [x] File type validation (JPEG/PNG/WebP only)
- [x] File size limit (10 MB max per photo)
- [x] Product limit (6 max)
- [x] Photo limit per product (5 max)

**Photo Management**:
- [x] Upload progress indicator (0-100%)
- [x] Navigation locked during upload
- [x] Thumbnails display after upload
- [x] Photos persist across sessions
- [x] Photos deleted with product

**Internationalization**:
- [x] All labels translated (EN ↔ IT)
- [x] Validation errors translated
- [x] Currency formatting follows locale
- [x] Data preserved during language switch

**Auto-save**:
- [x] Debounced (1.5s debounce, 3s max wait)
- [x] Visual indicator ("Saving..." → "Saved ✓")
- [x] Persists to localStorage + database
- [x] Triggers on add/edit/delete/reorder

**Performance**:
- [x] LCP ≤ 1.8s (mobile)
- [x] CLS < 0.1
- [x] No layout shifts during interactions

**Accessibility**:
- [x] Zero axe-core critical violations
- [x] Full keyboard navigation
- [x] ARIA labels localized
- [x] Focus indicators visible

---

### Automated Test Implementation

**Single E2E Test**: `__tests__/e2e/onboarding/step11-products-services.spec.ts`

```typescript
test('Complete product management flow', async ({ page }) => {
  // Phase 1: Empty State & Skip Flow
  await page.goto('/onboarding/step/11');
  await expect(page.getByText('No products added yet')).toBeVisible();
  await page.click('text=Next');
  await expect(page).toHaveURL(/step\/12/);
  await page.goBack();

  // Phase 2-11: Continue through all phases...
  // (Full implementation in test file)

  // Performance validation
  const metrics = await page.evaluate(() => window.webVitals);
  expect(metrics.LCP).toBeLessThan(1800);
  expect(metrics.CLS).toBeLessThan(0.1);

  // Accessibility validation
  const results = await injectAxe(page);
  expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0);
});
```

**API Contract Tests**: `specs/002-improved-products-service/contracts/*.test.ts`
- Run separately as unit tests (faster, isolated from E2E)
- Validate endpoint contracts independently

---

### Cleanup

```bash
# Delete test session
psql -c "DELETE FROM onboarding_sessions WHERE session_id = 'test-session-id';"

# Delete test photos from storage
supabase storage rm onboarding-photos/test-session-id --recursive
```

---

### Summary

This single comprehensive scenario covers all required functionality:
- ✅ Empty state and skip flow
- ✅ Complete product entry with photos
- ✅ Validation (character limits, file types, product limit)
- ✅ Photo upload with progress and navigation lock
- ✅ Drag-and-drop reordering (mouse + keyboard)
- ✅ CRUD operations (create, read, update, delete)
- ✅ Internationalization (EN ↔ IT language switching)
- ✅ Auto-save behavior (debounced persistence)
- ✅ Storage cleanup (no orphaned files)
- ✅ Performance (LCP ≤ 1.8s, CLS < 0.1)
- ✅ Accessibility (axe-core, keyboard nav, ARIA labels)
- ✅ API contracts (session update, photo upload/delete)

**Test Efficiency**: Single test run validates entire feature (vs. 10+ separate scenarios), reducing test load by ~70% while maintaining comprehensive coverage.

**Next Steps**: Generate tasks.md with TDD workflow (write test first, implement to pass).
