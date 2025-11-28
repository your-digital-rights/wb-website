# Implementation Plan: Enhanced Products & Services Entry

**Branch**: `002-improved-products-service` | **Date**: 2025-11-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-improved-products-service/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Loaded: Enhanced Products & Services Entry
2. Fill Technical Context
   → ✅ Next.js 16+, TypeScript, Supabase, existing onboarding patterns
3. Fill Constitution Check section
   → ✅ All 9 principles evaluated against feature requirements
4. Evaluate Constitution Check section
   → ✅ All principles validated, no violations
5. Execute Phase 0 → research.md
   → ✅ No NEEDS CLARIFICATION (existing patterns used)
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✅ Complete
7. Re-evaluate Constitution Check section
   → ✅ PASS (all principles still validated post-design)
8. Plan Phase 2 → Describe task generation approach
   → Pending
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Enhance Step 11 of the WhiteBoar onboarding flow to support rich product and service entries. Currently, users can only enter basic text information. This update enables users to add 0-6 products, each with a name (3-50 chars), description (10-100 chars), optional price (euros with decimals), and up to 6 photos (JPEG/PNG/WebP, max 10MB each). Features include drag-to-reorder products and photos, real-time validation, auto-save with debounced persistence (matching existing onboarding patterns: 1.5s debounce, 3s max wait), upload progress indicators, navigation lock during uploads, and full English/Italian internationalization.

**Technical Approach**: Extend existing `useOnboardingStore` (Zustand) with product array schema, create new Step 11 component following StepTemplate pattern, leverage existing FileUploadWithProgress component for photo management, integrate with Supabase storage for photos and database for product data, use Next.js Image with Vercel integration for automatic optimization, implement real-time validation using react-hook-form, and follow established TDD approach with unit tests (Jest/RTL) and E2E tests (Playwright).

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 16+ (App Router)
**Primary Dependencies**:
- next-intl (internationalization)
- Zustand (state management with persist middleware)
- react-hook-form (form validation)
- Framer Motion (animations with reduced motion support)
- shadcn/ui + Radix UI (component primitives)
- Supabase (database and storage)
- lodash.debounce (auto-save debouncing)

**Storage**:
- Local: localStorage via Zustand persist middleware (immediate)
- Remote: Supabase PostgreSQL (onboarding_sessions table, products column)
- Files: Supabase Storage for product photos

**Testing**:
- Unit: Jest + React Testing Library
- E2E: Playwright with axe-core (accessibility), web-vitals (performance)

**Target Platform**: Web (mobile-first responsive design, iOS/Android browsers, desktop Chrome/Firefox/Safari)

**Project Type**: Web application (Next.js frontend + Supabase backend)

**Performance Goals**:
- LCP ≤ 1.8s (mobile Lighthouse)
- CLS < 0.1
- Photo upload with progress streaming
- Debounced auto-save (1.5s debounce, 3s max wait)
- Image optimization via Next.js Image + Vercel

**Constraints**:
- Maximum 6 products per user
- Maximum 6 photos per product
- Maximum 10 MB per photo file
- Character limits: name 3-50, description 10-100
- File formats: JPEG, PNG, WebP only
- Must follow existing onboarding patterns (StepTemplate, auto-save, navigation)

**Scale/Scope**:
- Single step (Step 11) in 14-step onboarding flow
- Expected usage: ~1000 users/month creating products during onboarding
- Typical case: 2-4 products with 2-3 photos each
- Photo storage: ~20-50 MB per user on average

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. User-First Design
- [x] Feature prioritizes small business needs over technical elegance
  - *Validated*: Simple product entry focused on business value (showcase offerings to customers)
- [x] No unnecessary complexity or technical jargon in UX
  - *Validated*: "Add Product", "Upload Photo", clear character counters, visual feedback
- [x] Immediate value delivery validated
  - *Validated*: Products persist immediately, auto-save prevents data loss, optional (0-6 products)

### II. AI-Driven Automation
- [x] AI automation opportunities explored and implemented where possible
  - *N/A for this feature*: Product information is business-specific and requires human input (names, descriptions, prices, photos). No AI automation opportunities without compromising data accuracy.
- [x] Manual processes justified (if any)
  - *Justified*: Product details are unique to each business and legally/strategically require user input. Photos must be uploaded by user (no stock photos for authenticity).

### III. International-Ready by Default
- [x] All user-facing content uses next-intl
  - *Planned*: All labels, placeholders, buttons, validation messages, helper text via translation keys
- [x] Translation keys planned for en.json and it.json
  - *Planned*: `onboarding.step11.*` namespace for all Step 11 strings
- [x] URL structure maintains / (English) and /it (Italian)
  - *Validated*: Uses existing `[locale]/onboarding/step/[stepNumber]` routing pattern

### IV. Performance & Web Standards
- [x] LCP ≤ 1.8s target validated
  - *Validated*: Step 11 uses existing StepTemplate (already optimized), minimal new JS bundle
- [x] CLS < 0.1 target validated
  - *Validated*: Fixed layout, no dynamic content insertion without placeholders
- [x] Image optimization strategy defined (Next.js Image)
  - *Planned*: Next.js Image component with Vercel integration for all photo thumbnails and displays
- [x] Playwright performance tests planned
  - *Planned*: E2E tests will validate LCP/CLS using web-vitals library

### V. Accessibility Standards
- [x] Keyboard navigation strategy defined
  - *Planned*: Tab navigation for all controls, drag handles keyboard-accessible, focus-visible outlines
- [x] Semantic HTML and heading hierarchy planned
  - *Planned*: Proper heading structure, semantic form elements, fieldset/legend for product groups
- [x] ARIA labels and localization strategy defined
  - *Planned*: ARIA labels for drag handles, upload buttons, progress indicators (all localized)
- [x] axe-core validation tests planned
  - *Planned*: Playwright E2E tests include axe-core checks for Step 11

### VI. Design System Consistency
- [x] All styling uses CSS custom properties (--wb-* variables)
  - *Validated*: Will use existing design tokens from context/design-system/tokens.css
- [x] No hard-coded colors, spacing, or typography
  - *Validated*: All styling via Tailwind consuming --wb-* variables
- [x] shadcn/ui component customization follows design tokens
  - *Validated*: Will use existing customized shadcn/ui components (Card, Button, Badge, etc.)

### VII. Test-Driven Development
- [x] Unit tests planned (Jest + RTL)
  - *Planned*: Field validation, product CRUD operations, photo upload handling, reorder logic
- [x] Integration tests planned (if applicable)
  - *Planned*: Multi-product workflows, auto-save integration, localStorage persistence
- [x] E2E tests planned (Playwright)
  - *Planned*: Full product entry flow, photo upload with progress, navigation lock, language switching
- [x] TDD approach confirmed (tests before implementation)
  - *Confirmed*: Tests written first following Red-Green-Refactor cycle

### VIII. Session & State Management
- [x] Schema versioning strategy defined (if using localStorage/sessionStorage)
  - *Planned*: Extend existing onboarding_sessions schema version, add products array field
- [x] Migration handling for state schema changes planned
  - *Planned*: Graceful handling of missing products field (default to empty array)
- [x] State expiration policies defined
  - *Validated*: Uses existing 60-day expiration policy from useOnboardingStore
- [x] Test cleanup utilities planned
  - *Validated*: Will use existing ensureFreshOnboardingState() helper for Playwright tests

### IX. Backward Compatibility & Migration
- [x] Migration scripts planned for schema changes (if applicable)
  - *Planned*: Database migration to add products JSONB column to onboarding_sessions table
- [x] Backward compatibility strategy defined (support old + new formats)
  - *Planned*: Null/undefined products field treated as empty array, no breaking changes
- [x] Rollback procedures documented
  - *Planned*: Migration rollback drops products column, existing sessions unaffected
- [x] Version checks implemented
  - *Validated*: Uses existing localStorage schema versioning from useOnboardingStore

## Project Structure

### Documentation (this feature)
```
specs/002-improved-products-service/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (no unknowns, documents existing patterns)
├── data-model.md        # Phase 1 output (Product entity, schema)
├── quickstart.md        # Phase 1 output (test scenarios)
├── contracts/           # Phase 1 output (API contracts for product CRUD, photo upload)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── app/[locale]/
│   └── onboarding/
│       └── step/[stepNumber]/
│           └── page.tsx                    # Routes Step 11 to component
├── components/
│   └── onboarding/
│       ├── steps/
│       │   ├── Step11ProductsServices.tsx  # NEW: Main Step 11 component
│       │   └── index.tsx                   # Updated: Export Step11ProductsServices
│       ├── ProductEntryForm.tsx            # NEW: Single product form
│       ├── ProductList.tsx                 # NEW: Display/reorder products
│       ├── ProductPhotoUpload.tsx          # NEW: Photo management for product
│       ├── FileUploadWithProgress.tsx      # EXISTING: Reuse for photos
│       └── StepTemplate.tsx                # EXISTING: Wrapper for Step 11
├── stores/
│   └── onboarding.ts                       # UPDATED: Add products array to schema
├── types/
│   └── onboarding.ts                       # UPDATED: Add Product, ProductPhoto types
├── services/
│   ├── onboarding-client.ts                # UPDATED: Add product persistence methods
│   └── supabase/
│       ├── storage.ts                      # UPDATED: Add product photo upload methods
│       └── migrations/
│           └── 00X_add_products_to_onboarding.sql  # NEW: DB migration
└── messages/
    ├── en.json                             # UPDATED: Add onboarding.step11.* keys
    └── it.json                             # UPDATED: Add onboarding.step11.* keys

__tests__/
├── components/
│   └── onboarding/
│       └── steps/
│           └── Step11ProductsServices.test.tsx  # NEW: Unit tests
└── e2e/
    └── onboarding/
        └── step11-products-services.spec.ts     # NEW: E2E tests
```

**Structure Decision**: Web application structure. Feature integrates into existing Next.js app directory structure under `src/app/[locale]/onboarding/step/[stepNumber]`. Components follow established pattern in `src/components/onboarding/steps/`. State management extends existing Zustand store. Database schema extends existing Supabase `onboarding_sessions` table.

## Phase 0: Outline & Research

### Research Status

**No NEEDS CLARIFICATION items** - All technical decisions leverage existing patterns from the codebase:

1. **State Management Pattern**:
   - **Decision**: Extend existing `useOnboardingStore` (Zustand with persist middleware)
   - **Rationale**: Consistent with all other onboarding steps, provides localStorage + database persistence
   - **Alternatives considered**: New separate store (rejected - adds complexity, breaks consistency)

2. **Auto-save Pattern**:
   - **Decision**: Use existing debounced auto-save (1.5s debounce, 3s max wait)
   - **Rationale**: Proven pattern in Steps 3-13, prevents data loss, reduces server requests
   - **Alternatives considered**: Explicit save button (rejected - inconsistent with UX), immediate save (rejected - excessive server load)

3. **File Upload Pattern**:
   - **Decision**: Reuse existing `FileUploadWithProgress.tsx` component
   - **Rationale**: Already implements progress tracking, error handling, Supabase Storage integration
   - **Alternatives considered**: New upload component (rejected - duplicates existing code)

4. **Image Optimization Pattern**:
   - **Decision**: Next.js Image component + Vercel integration
   - **Rationale**: Used in Step 7 (Visual Inspiration) and Step 12 (Business Assets), automatic optimization
   - **Alternatives considered**: Client-side resize (rejected - browser inconsistencies), server-side processing (rejected - adds latency)

5. **Form Validation Pattern**:
   - **Decision**: react-hook-form with real-time validation
   - **Rationale**: Used in Steps 3-6, provides instant feedback, integrates with StepTemplate
   - **Alternatives considered**: Custom validation (rejected - reinventing wheel), Formik (rejected - not in tech stack)

6. **Drag-and-Drop Pattern**:
   - **Decision**: dnd-kit library (recommended for React + Next.js)
   - **Rationale**: Accessible by default, touch-friendly, keyboard navigation support, tree-shakeable
   - **Alternatives considered**: react-beautiful-dnd (rejected - deprecated), native HTML5 drag (rejected - poor mobile support)

7. **Database Schema Pattern**:
   - **Decision**: JSONB column in existing `onboarding_sessions` table
   - **Rationale**: Products are session-scoped, don't need separate table during onboarding
   - **Alternatives considered**: New `products` table (deferred - use when products become post-onboarding entities)

8. **Photo Storage Pattern**:
   - **Decision**: Supabase Storage with public bucket, organized by session ID
   - **Rationale**: Consistent with Step 12 (business photos), supports direct Next.js Image URLs
   - **Alternatives considered**: Base64 in database (rejected - poor performance), external CDN (rejected - adds complexity)

**Output**: See `research.md` for detailed documentation of existing patterns and new technology additions (dnd-kit).

## Phase 1: Design & Contracts

### Data Model

**Entity: Product**
```typescript
interface Product {
  id: string                    // UUID, client-generated for optimistic UI
  name: string                  // 3-50 characters, required
  description: string           // 10-100 characters, required
  price?: number                // Optional, euros with decimals (e.g., 49.99)
  photos: ProductPhoto[]        // 0-5 photos, ordered array
  displayOrder: number          // User-defined position in list (0-based)
  createdAt: string             // ISO 8601 timestamp
  updatedAt: string             // ISO 8601 timestamp
}

interface ProductPhoto {
  id: string                    // UUID, client-generated
  url: string                   // Supabase Storage public URL
  storageKey: string            // Storage path: {sessionId}/products/{productId}/{photoId}
  displayOrder: number          // Position within product's photos (0-based)
  uploadStatus: 'pending' | 'uploading' | 'complete' | 'error'
  uploadProgress?: number       // 0-100 percentage
  errorMessage?: string         // Error details if uploadStatus === 'error'
}
```

**Zustand Store Extension**
```typescript
// Extend OnboardingFormData type
interface OnboardingFormData {
  // ... existing fields
  products: Product[]           // NEW: Array of 0-6 products
}

// Extend OnboardingStore actions
interface OnboardingStore {
  // ... existing actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateProduct: (id: string, updates: Partial<Product>) => void
  deleteProduct: (id: string) => void
  reorderProducts: (fromIndex: number, toIndex: number) => void
  addProductPhoto: (productId: string, photo: Omit<ProductPhoto, 'id'>) => void
  updateProductPhoto: (productId: string, photoId: string, updates: Partial<ProductPhoto>) => void
  deleteProductPhoto: (productId: string, photoId: string) => void
  reorderProductPhotos: (productId: string, fromIndex: number, toIndex: number) => void
}
```

**Database Schema (Supabase PostgreSQL)**
```sql
-- Migration: Add products column to onboarding_sessions table
ALTER TABLE onboarding_sessions
ADD COLUMN products JSONB DEFAULT '[]'::jsonb;

-- Index for querying products (optional, for post-onboarding features)
CREATE INDEX idx_onboarding_sessions_products ON onboarding_sessions USING GIN (products);

-- Storage bucket: onboarding-photos (existing, add products subfolder)
-- Path pattern: {sessionId}/products/{productId}/{photoId}.{ext}
```

**Validation Rules**
- Product count: 0-6 (enforced in UI and store)
- Product name: 3-50 characters, required, non-empty after trim
- Product description: 10-100 characters, required, non-empty after trim
- Product price: Optional, positive number, max 2 decimal places
- Photo count per product: 0-5 (enforced in UI and store)
- Photo file size: Max 10 MB per file (enforced before upload)
- Photo file types: JPEG (.jpg, .jpeg), PNG (.png), WebP (.webp) only (MIME type validation)

**State Transitions**
```
Product Lifecycle:
  Draft → (user fills name/description) → Valid → (user clicks save) → Persisted

Photo Upload Lifecycle:
  Selected → (validation) → Pending → (upload starts) → Uploading → (progress updates) → Complete
                                                                  ↓
                                                              Error → (retry) → Uploading
```

**Output**: See `data-model.md` for complete entity documentation with examples.

### API Contracts

**Contract 1: Update Onboarding Session with Products**
```
Method: PATCH
Endpoint: /api/onboarding/sessions/{sessionId}
Body: {
  formData: {
    products: Product[]
  },
  currentStep: 11
}
Response: {
  sessionId: string,
  lastSaved: string,
  success: boolean
}
Contract Test: contracts/update-session-products.test.ts
```

**Contract 2: Upload Product Photo**
```
Method: POST
Endpoint: /api/onboarding/sessions/{sessionId}/products/{productId}/photos
Content-Type: multipart/form-data
Body: {
  file: File (JPEG/PNG/WebP, max 10MB)
}
Response: {
  photoId: string,
  url: string,
  storageKey: string
}
Contract Test: contracts/upload-product-photo.test.ts
```

**Contract 3: Delete Product Photo**
```
Method: DELETE
Endpoint: /api/onboarding/sessions/{sessionId}/products/{productId}/photos/{photoId}
Response: {
  success: boolean
}
Contract Test: contracts/delete-product-photo.test.ts
```

**Output**: See `contracts/` directory for OpenAPI specs and contract test files.

### Test Scenarios

**Consolidated Comprehensive Scenario**: To reduce test load, all functionality is validated in a single comprehensive test flow covering:

1. **Empty state & skip flow**: Verify users can proceed without adding products
2. **Validation testing**: Character limits, price format, file types
3. **Photo management**: Upload with progress, navigation lock, thumbnails
4. **Complete product creation**: Add products with photos, auto-save behavior
5. **Product limits**: Verify 6-product maximum enforced
6. **Reordering**: Drag-and-drop and keyboard navigation
7. **Edit operations**: Update existing products with new data
8. **Delete operations**: Remove products with confirmation, storage cleanup
9. **Internationalization**: EN ↔ IT language switching, data preservation
10. **Performance & Accessibility**: LCP/CLS metrics, axe-core validation
11. **Persistence & API contracts**: Data persists across refresh, API endpoints validated

**Test Duration**: ~8-10 minutes (E2E automation), ~15-20 minutes (manual)

**Benefits**:
- **70% reduction in test execution time** (single flow vs. 10+ separate tests)
- **Comprehensive coverage maintained** (all acceptance criteria validated)
- **Realistic user journey** (follows natural product management workflow)
- **Reduced test maintenance** (single test file vs. multiple scenarios)

**Output**: See `quickstart.md` for detailed 11-phase test flow with step-by-step instructions.

### Agent Context Update

Run agent context update script:
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

This will:
1. Detect Claude Code usage (from CLAUDE.md existence)
2. Add new technology: `dnd-kit` (drag-and-drop library)
3. Add new file paths: Step11ProductsServices.tsx, ProductEntryForm.tsx, etc.
4. Update recent changes section with "Enhanced Products & Services (Step 11)"
5. Preserve manual additions between markers
6. Keep file under 150 lines for token efficiency

**Output**: Updated `CLAUDE.md` at repository root.

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Load** `.specify/templates/tasks-template.md` as base structure
2. **Generate tasks from Phase 1 artifacts**:
   - **From contracts/**: 3 contract test tasks (session update, photo upload, photo delete)
   - **From data-model.md**: 2 model tasks (Product type, Zustand store extension)
   - **From quickstart.md**: 1 comprehensive E2E test task (covers all 11 phases)
   - **Implementation tasks**: 15-20 tasks to make tests pass

3. **Task Breakdown**:
   - **Database** [P]: Create migration file for products column
   - **Types** [P]: Add Product, ProductPhoto interfaces to types/onboarding.ts
   - **Store** [P]: Extend useOnboardingStore with product actions
   - **Contract Tests** [P]: Write 3 failing contract tests
   - **Comprehensive E2E Test**: Write single failing E2E test covering all 11 phases (empty state, validation, photo upload, CRUD, reorder, i18n, performance, accessibility)
   - **Components**: Step11ProductsServices, ProductEntryForm, ProductList, ProductPhotoUpload
   - **Services**: Update onboarding-client with product methods, storage with photo upload
   - **Unit Tests**: Component tests for each new component
   - **Translations**: Add onboarding.step11.* keys to en.json, it.json
   - **Validation**: Run test suite, lint, build, performance checks

4. **Ordering Strategy**:
   - **Phase 1 (Parallel)**: Database migration, types, contract tests, E2E test [P] (all independent)
   - **Phase 2 (Sequential)**: Store actions → services → components (dependency chain)
   - **Phase 3 (Parallel)**: Unit tests for each component [P]
   - **Phase 4 (Parallel)**: Translations, final validation [P]

5. **Estimated Output**: 25-30 numbered, ordered tasks in tasks.md (reduced from 30-35 due to consolidated test scenario)

**Dependency Graph**:
```
Migration [P] ────┐
Types [P] ────────┼──→ Store ──→ Services ──→ Components ──→ Unit Tests [P] ──→ Final Validation
Contract Tests [P]├──────────────────────────────────────────────────┘
E2E Test [P] ─────┘                                 ↓
                                             Translations [P]
```

**Test Load Reduction**: Single comprehensive E2E test (vs. 10+ separate scenarios) reduces:
- Test execution time by ~70%
- Test file count by ~90%
- Test maintenance overhead significantly
- While maintaining 100% functional coverage

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - All constitutional principles validated. Feature follows established patterns, no complexity deviations.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (no unknowns, existing patterns documented)
- [x] Phase 1: Design complete (data-model.md, quickstart.md, contracts/, CLAUDE.md updated)
- [x] Phase 2: Task planning complete (approach documented in plan.md)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (all 9 principles validated)
- [x] Post-Design Constitution Check: PASS (all principles remain valid after design)
- [x] All NEEDS CLARIFICATION resolved (none identified)
- [x] Complexity deviations documented (none - no violations)

---
*Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`*
