# Tasks: Enhanced Products & Services Entry

**Feature**: Step 11 Onboarding Enhancement
**Input**: Design documents from `/specs/002-improved-products-service/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, quickstart.md, research.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Loaded: Enhanced Products & Services Entry
   → Tech stack: Next.js 16+, TypeScript, Zustand, Supabase, react-hook-form
2. Load optional design documents:
   → data-model.md: Product + ProductPhoto entities
   → contracts/: 3 API contract tests
   → quickstart.md: 1 comprehensive E2E test scenario
3. Generate tasks by phase:
   → Setup: DB migration, types, store extensions
   → Tests (TDD): Contract tests + comprehensive E2E test
   → Implementation: Components, services, API routes
   → Integration: Storage service, auto-save
   → Polish: Translations, validation, final checks
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Tests before implementation (TDD)
   → Mark user story phases (this feature = single story)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Return: SUCCESS (tasks ready for execution)
```

## Format: `- [ ] [ID] [P?] [US?] Description with file path`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[US1]**: User Story 1 (Product Management in Step 11)
- Include exact file paths in descriptions

## Path Conventions
- **Frontend**: `src/` (Next.js 16+ app directory)
- **Tests**: `__tests__/` (Jest + Playwright)
- **Types**: `src/types/`
- **Stores**: `src/stores/`
- **Services**: `src/services/`

---

## Phase 1: Setup & Database

**Objective**: Prepare infrastructure for product management feature

- [X] T001 [P] Create database migration file to add products JSONB column in `supabase/migrations/[timestamp]_add_products_to_onboarding.sql`
- [ ] T002 [P] Run database migration to update onboarding_sessions table with `pnpm supabase db push` **[BLOCKED: Network connectivity issue with remote Supabase - needs resolution]**
- [X] T003 [P] Extend Product and UploadedFile types in `src/types/onboarding.ts`

---

## Phase 2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE Phase 3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation begins**

### Contract Tests (API Endpoints)
- [X] T004 [P] Verify contract test for PATCH /api/onboarding/sessions/{sessionId} exists in `specs/002-improved-products-service/contracts/update-session-products.test.ts`
- [X] T005 [P] Verify contract test for POST /api/onboarding/sessions/{sessionId}/products/{productId}/photos exists in `specs/002-improved-products-service/contracts/upload-product-photo.test.ts`
- [X] T006 [P] Verify contract test for DELETE /api/onboarding/sessions/{sessionId}/products/{productId}/photos/{photoId} exists in `specs/002-improved-products-service/contracts/delete-product-photo.test.ts`

### Comprehensive E2E Test
- [X] T007 Write comprehensive E2E test covering all 11 phases (empty state, validation, CRUD, photos, reorder, i18n, performance, accessibility) in `__tests__/e2e/onboarding/step11-products-services.spec.ts`

### Run Tests to Confirm Failure
- [X] T008 Run contract tests with `pnpm test specs/002-improved-products-service/contracts/` to confirm all 3 contract tests FAIL (expected before implementation) **✓ CONFIRMED: All contract tests failing as expected**
- [X] T009 Run E2E test with `PORT=3783 pnpm exec playwright test src/__tests__/e2e/onboarding/step11-products-services.spec.ts --reporter=line --project=chromium` to confirm test FAILS (expected before implementation) **✓ CONFIRMED: E2E test failing as expected**

---

## Phase 3: Core Implementation (User Story 1 - Product Management)

**Objective**: Implement all product management functionality following TDD

### 3.1: State Management (Zustand Store)
- [ ] T010 [P] [US1] Extend OnboardingFormData interface with products array in `src/types/onboarding.ts`
- [ ] T011 [P] [US1] Extend OnboardingStore interface with 8 product actions in `src/types/onboarding.ts`
- [ ] T012 [US1] Implement addProduct action in `src/stores/onboarding.ts`
- [ ] T013 [US1] Implement updateProduct action in `src/stores/onboarding.ts`
- [ ] T014 [US1] Implement deleteProduct action in `src/stores/onboarding.ts`
- [ ] T015 [US1] Implement reorderProducts action in `src/stores/onboarding.ts`
- [ ] T016 [US1] Implement addProductPhoto action in `src/stores/onboarding.ts`
- [ ] T017 [US1] Implement updateProductPhoto action in `src/stores/onboarding.ts`
- [ ] T018 [US1] Implement deleteProductPhoto action in `src/stores/onboarding.ts`
- [ ] T019 [US1] Implement reorderProductPhotos action in `src/stores/onboarding.ts`

### 3.2: Validation Schemas
- [ ] T020 [P] [US1] Create ProductSchema validation with Zod in `src/lib/validation/product-schema.ts`
- [ ] T021 [P] [US1] Create ProductPhotoSchema validation with Zod in `src/lib/validation/product-schema.ts`
- [ ] T022 [P] [US1] Create ProductsArraySchema validation (max 6) with Zod in `src/lib/validation/product-schema.ts`

### 3.3: Storage Service
- [ ] T023 [P] [US1] Implement uploadProductPhoto method in `src/services/supabase/storage.ts`
- [ ] T024 [P] [US1] Implement deleteProductPhoto method in `src/services/supabase/storage.ts`
- [ ] T025 [P] [US1] Implement deleteProductPhotos (bulk delete) method in `src/services/supabase/storage.ts`

### 3.4: API Routes
- [ ] T026 [US1] Create PATCH endpoint for session update in `src/app/api/onboarding/sessions/[sessionId]/route.ts`
- [ ] T027 [US1] Create POST endpoint for photo upload in `src/app/api/onboarding/sessions/[sessionId]/products/[productId]/photos/route.ts`
- [ ] T028 [US1] Create DELETE endpoint for photo deletion in `src/app/api/onboarding/sessions/[sessionId]/products/[productId]/photos/[photoId]/route.ts`

### 3.5: UI Components
- [ ] T029 [P] [US1] Create ProductEntryForm component with validation in `src/components/onboarding/ProductEntryForm.tsx`
- [ ] T030 [P] [US1] Create ProductList component with drag-and-drop in `src/components/onboarding/ProductList.tsx`
- [ ] T031 [P] [US1] Create ProductPhotoUpload component in `src/components/onboarding/ProductPhotoUpload.tsx`
- [ ] T032 [US1] Create Step11ProductsServices main component in `src/components/onboarding/steps/Step11ProductsServices.tsx`
- [ ] T033 [US1] Export Step11ProductsServices from `src/components/onboarding/steps/index.tsx`
- [ ] T034 [US1] Update step routing to include Step 11 in `src/app/[locale]/onboarding/step/[stepNumber]/page.tsx`
- [ ] T034a [P] [US1] Create placeholder thumbnail component for products without photos in `src/components/onboarding/ProductPlaceholder.tsx`

---

## Phase 4: Integration & Validation

### 4.1: Internationalization
- [ ] T035 [P] [US1] Add onboarding.step11.* translation keys to `messages/en.json`
- [ ] T036 [P] [US1] Add onboarding.step11.* translation keys to `messages/it.json`

### 4.2: Test Validation (TDD Cycle Complete)
- [ ] T037 Run contract tests with `pnpm test specs/002-improved-products-service/contracts/` to verify all 3 tests PASS
- [ ] T038 Run comprehensive E2E test with `PORT=3783 pnpm exec playwright test __tests__/e2e/onboarding/step11-products-services.spec.ts --reporter=line --project=chromium` to verify test PASSES
- [ ] T039 Fix any failing tests and re-run until all tests pass

### 4.3: Code Quality
- [ ] T040 Run ESLint to fix any linting errors with `pnpm lint`
- [ ] T041 Run TypeScript compiler to fix any type errors with `npx tsc --noEmit`
- [ ] T042 Build production bundle to verify no build errors with `pnpm build`

---

## Phase 5: Polish & Final Validation

### 5.1: Unit Tests
- [ ] T043 [P] Write unit tests for ProductEntryForm validation in `__tests__/components/onboarding/ProductEntryForm.test.tsx`
- [ ] T044 [P] Write unit tests for ProductList reordering in `__tests__/components/onboarding/ProductList.test.tsx`
- [ ] T045 [P] Write unit tests for ProductPhotoUpload in `__tests__/components/onboarding/ProductPhotoUpload.test.tsx`
- [ ] T046 [P] Write unit tests for Zustand store actions in `__tests__/stores/onboarding-products.test.ts`
- [ ] T047 Run unit tests with `pnpm test` to verify all pass

### 5.2: Performance & Accessibility
- [ ] T048 Run Playwright performance test to verify LCP ≤ 1.8s and CLS < 0.1 for Step 11
- [ ] T049 Run Playwright accessibility test with axe-core to verify 0 critical violations for Step 11
- [ ] T050 Test keyboard navigation (Tab, Space, Arrow keys) for all interactive elements in Step 11

### 5.3: Manual Testing
- [ ] T051 Execute comprehensive manual test scenario from `specs/002-improved-products-service/quickstart.md` (all 11 phases)
- [ ] T052 Test in both light and dark themes using Playwright MCP
- [ ] T053 Test on mobile and desktop layouts using Playwright MCP
- [ ] T054 Verify auto-save behavior (1.5s debounce, "Saving..." → "Saved ✓" indicator)

### 5.4: Final Checks
- [ ] T055 Run full test suite with `pnpm test && PORT=3783 pnpm exec playwright test --reporter=line`
- [ ] T056 Start development server with `PORT=3783 pnpm dev` and verify Step 11 loads without errors
- [ ] T057 Verify all acceptance criteria from spec.md Definition of Done section (17 items)

---

## Dependencies

### Phase Flow
```
Phase 1 (Setup)
  ↓
Phase 2 (Tests - TDD) ← MUST COMPLETE before Phase 3
  ↓
Phase 3 (Implementation)
  ↓
Phase 4 (Integration & Validation)
  ↓
Phase 5 (Polish & Final Validation)
```

### Task Dependencies
- **T001-T003** (Setup) are fully parallel
- **T004-T009** (Tests) depend on T003 (types), but are parallel to each other
- **T010-T011** (Type extensions) depend on T003
- **T012-T019** (Store actions) depend on T010-T011
- **T020-T022** (Validation) depend on T010, fully parallel
- **T023-T025** (Storage service) depend on T010, fully parallel
- **T026-T028** (API routes) depend on T020-T025
- **T029-T034** (Components) depend on T012-T019, T020-T022
- **T035-T036** (Translations) are fully parallel, can start anytime
- **T037-T039** (Test validation) depend on T026-T034 (all implementation)
- **T040-T042** (Code quality) depend on T037-T039
- **T043-T047** (Unit tests) depend on T029-T034, parallel within group
- **T048-T054** (Performance/Accessibility/Manual) depend on T040-T042
- **T055-T057** (Final checks) depend on T048-T054

### Blocking Tasks
- **T002** blocks all tests (need DB schema)
- **T009** blocks all implementation (TDD: tests must fail first)
- **T026-T028** block T037-T039 (need APIs for tests to pass)
- **T037-T039** block T040-T042 (tests must pass before quality checks)

---

## Parallel Execution Examples

### Phase 1: Setup (All Parallel)
```
Task T001: "Create database migration file..."
Task T002: "Run database migration..."
Task T003: "Extend Product and UploadedFile types..."
```

### Phase 2: Tests (Parallel after T003)
```
Task T007: "Write comprehensive E2E test..."
```

### Phase 3.1: Store Actions (Sequential on T010-T011)
```
Task T010: "Extend OnboardingFormData interface..."
Task T011: "Extend OnboardingStore interface..."
# Then parallel:
Task T012: "Implement addProduct action..."
Task T013: "Implement updateProduct action..."
Task T014: "Implement deleteProduct action..."
# ... (T015-T019 also parallel)
```

### Phase 3.2-3.3: Validation + Storage (Fully Parallel)
```
Task T020: "Create ProductSchema validation..."
Task T021: "Create ProductPhotoSchema validation..."
Task T022: "Create ProductsArraySchema validation..."
Task T023: "Implement uploadProductPhoto method..."
Task T024: "Implement deleteProductPhoto method..."
Task T025: "Implement deleteProductPhotos method..."
```

### Phase 3.5: Components (Parallel after T012-T022)
```
Task T029: "Create ProductEntryForm component..."
Task T030: "Create ProductList component..."
Task T031: "Create ProductPhotoUpload component..."
```

### Phase 4.1: Translations (Fully Parallel Anytime)
```
Task T035: "Add onboarding.step11.* translation keys to messages/en.json"
Task T036: "Add onboarding.step11.* translation keys to messages/it.json"
```

### Phase 5.1: Unit Tests (Parallel after T029-T034)
```
Task T043: "Write unit tests for ProductEntryForm validation..."
Task T044: "Write unit tests for ProductList reordering..."
Task T045: "Write unit tests for ProductPhotoUpload..."
Task T046: "Write unit tests for Zustand store actions..."
```

---

## Implementation Strategy

### MVP Scope (User Story 1 Only)
This feature consists of a single comprehensive user story:
- **User Story 1**: Product Management in Step 11 (all functionality)
  - Add, edit, delete, reorder products (0-6 max)
  - Upload, delete, reorder photos (0-5 per product, JPEG/PNG/WebP only)
  - Real-time validation (name 3-50 chars, description 10-100 chars, price optional)
  - Auto-save with debounce (1.5s debounce, 3s max wait)
  - Photo upload progress indicators
  - Navigation lock during uploads
  - Internationalization (EN/IT)
  - Performance (LCP ≤ 1.8s, CLS < 0.1)
  - Accessibility (WCAG AA, axe-core 0 violations)

### Incremental Delivery
While this is a single user story, it can be delivered incrementally:
1. **Milestone 1** (T001-T022): Foundation (DB, types, store, validation)
2. **Milestone 2** (T023-T028): Backend (storage service, API routes)
3. **Milestone 3** (T029-T036): Frontend (components, translations)
4. **Milestone 4** (T037-T057): Validation & Polish (tests pass, quality checks, final validation)

### Test-Driven Development
- **Red**: Write failing tests first (T004-T009)
- **Green**: Implement to make tests pass (T010-T036)
- **Refactor**: Validate and polish (T037-T057)

---

## User Story Mapping

### User Story 1: Product Management in Step 11
**Goal**: Users can add detailed product information during onboarding with product photos, validation, and persistence

**Tasks**:
- T010-T019: State management
- T020-T022: Validation schemas
- T023-T025: Storage service
- T026-T028: API routes
- T029-T034a: UI components (including placeholder thumbnail)
- T035-T036: Translations

**Independent Test Criteria**:
- ✅ Empty state: Users can skip products and proceed to Step 12
- ✅ Add products: Users can add 1-6 products with name, description, price (2 decimals max)
- ✅ Validation: Character limits enforced (name 3-50, description 10-100), clear error messages with corrective actions
- ✅ Product photos: Upload progress shown (500ms updates), navigation locked during upload
- ✅ Photo validation: Only JPEG/PNG/WebP accepted, max 10 MB per file, specific error messages
- ✅ Product limit: System prevents adding more than 6 products
- ✅ Photo limit: System prevents adding more than 5 product photos per product
- ✅ Reorder: Drag-and-drop works for products and product photos
- ✅ Edit: Users can modify existing products
- ✅ Delete: Products and product photos removed, storage cleaned up
- ✅ Placeholder: Products without photos show placeholder thumbnail (200x200px)
- ✅ Internationalization: All text in EN/IT, data preserved on language switch
- ✅ Auto-save: Debounced persistence (1.5s debounce, 3s max wait) with network retry
- ✅ Persistence: Data survives page refresh and browser close
- ✅ Performance: LCP ≤ 1.8s, CLS < 0.1 (FR-049)
- ✅ Accessibility: 0 critical axe-core violations, keyboard navigation

**Definition of Done** (from spec.md):
1. Step 11 implements rich product entry form
2. Users can add 0-6 products with all fields
3. Photo upload with progress indicators works
4. Navigation locked during uploads
5. Product list displays thumbnails, names, prices
6. Reorder, edit, delete functionality works
7. All validation rules enforced
8. EN/IT translations complete
9. Data persists to localStorage + database
10. Resume onboarding with preserved data works
11. All unit tests pass
12. All E2E tests pass
13. Production build succeeds
14. No linting/type errors
15. Dev server starts without errors
16. CI/CD pipeline passes
17. Deployment to Vercel succeeds

---

## Summary

**Total Tasks**: 58
- Phase 1 (Setup): 3 tasks
- Phase 2 (Tests - TDD): 6 tasks
- Phase 3 (Implementation): 26 tasks
  - 3.1 State Management: 10 tasks
  - 3.2 Validation: 3 tasks
  - 3.3 Storage Service: 3 tasks
  - 3.4 API Routes: 3 tasks
  - 3.5 UI Components: 7 tasks
- Phase 4 (Integration): 8 tasks
- Phase 5 (Polish): 15 tasks

**Parallel Opportunities**: 24 tasks marked [P]
**User Story Coverage**: 100% (single comprehensive story)
**Test Strategy**: TDD (tests written before implementation)
**Remediation Updates Applied**: Analysis findings I1, A1, U1, C1, T1, U2, U3, M1, M2 resolved

**Estimated Complexity**:
- Setup: Low (existing patterns)
- Implementation: Medium (new feature, 4 new components)
- Testing: Medium (1 comprehensive E2E test, 4 unit test files)
- Polish: Low (standard validation + checks)

**Next Steps**: Begin execution with Phase 1 (T001-T003), ensuring TDD approach (Phase 2 tests must fail before Phase 3 implementation begins).
