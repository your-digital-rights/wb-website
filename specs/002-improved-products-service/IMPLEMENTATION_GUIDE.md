# Implementation Guide: Step 11 UI Components

**Feature**: 002-improved-products-service
**Status**: Backend Complete (50% done) - UI Components Remaining
**Last Updated**: 2025-11-20

## Current Progress: 29/58 Tasks Complete

### ✅ Phase 1: Setup & Database (Complete)
- ✅ T001: Database migration created
- ⚠️ T002: BLOCKED - Migration push (network issue)
- ✅ T003: Types extended

### ✅ Phase 2: Tests First (Complete - TDD Red)
- ✅ T004-T006: Contract tests verified
- ✅ T007: E2E test created
- ✅ T008-T009: Tests confirmed failing

### ✅ Phase 3: Core Implementation (73% Complete)
- ✅ T010-T019: State management (Zustand store actions)
- ✅ T020-T022: Validation schemas (Zod)
- ✅ T023-T025: Storage service (Supabase)
- ✅ T026-T028: API routes (PATCH/POST/DELETE)
- ✅ T034a: ProductPlaceholder component
- 🔄 T029-T034: **UI Components Remaining** (see below)

---

## Remaining UI Components (T029-T034)

### T029: ProductPhotoUpload Component

**File**: `src/components/onboarding/ProductPhotoUpload.tsx`

**Purpose**: Upload and manage photos for a single product (0-5 photos per product)

**Key Requirements**:
- Reuse FileUploadWithProgress component pattern
- Max 5 photos per product
- Support drag-and-drop reordering
- Show upload progress (500ms updates per FR-016)
- Lock navigation during upload (FR-023)
- File validation: JPEG/PNG/WebP, 10MB max
- Display thumbnails (200x200px per FR-024)
- Delete individual photos

**Implementation Pattern**:
```tsx
'use client'

import React, { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, GripVertical } from 'lucide-react'
import { UploadedFile } from '@/types/onboarding'
import { ProductPlaceholder } from './ProductPlaceholder'

interface ProductPhotoUploadProps {
  productId: string
  photos: UploadedFile[]
  onPhotosChange: (photos: UploadedFile[]) => void
  onUploadStart?: () => void
  onUploadComplete?: () => void
  maxPhotos?: number
  disabled?: boolean
}

export function ProductPhotoUpload({
  productId,
  photos,
  onPhotosChange,
  onUploadStart,
  onUploadComplete,
  maxPhotos = 5,
  disabled = false
}: ProductPhotoUploadProps) {
  // 1. Track upload progress state locally
  // 2. Use native drag-and-drop for reordering (like DynamicList.tsx)
  // 3. Upload to /api/onboarding/sessions/{sessionId}/products/{productId}/photos
  // 4. Show progress bar during upload
  // 5. Display thumbnails in grid (200x200px)
  // 6. Support delete with trash icon
}
```

**Reference Components**:
- `src/components/onboarding/FileUploadWithProgress.tsx` (upload pattern)
- `src/components/onboarding/DynamicList.tsx` (drag-and-drop pattern)

**Validation**:
- Use `validateProductPhotoFile()` from `src/services/supabase/storage.ts`
- Show clear error messages (FR-027, FR-028)

---

### T030: ProductList Component

**File**: `src/components/onboarding/ProductList.tsx`

**Purpose**: Display list of products with drag-to-reorder functionality

**Key Requirements**:
- Show product cards with thumbnail, name, price
- Native HTML5 drag-and-drop for reordering
- Edit and delete buttons per product
- Display placeholder when empty
- Support keyboard navigation

**Implementation Pattern**:
```tsx
'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { GripVertical, Edit2, Trash2 } from 'lucide-react'
import { Product } from '@/types/onboarding'
import { ProductPlaceholder } from './ProductPlaceholder'
import Image from 'next/image'

interface ProductListProps {
  products: Product[]
  onReorder: (fromIndex: number, toIndex: number) => void
  onEdit: (productId: string) => void
  onDelete: (productId: string) => void
}

export function ProductList({
  products,
  onReorder,
  onEdit,
  onDelete
}: ProductListProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  // Follow DynamicList.tsx pattern for drag handlers:
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (draggedItem === targetId) return

    const draggedIndex = products.findIndex(p => p.id === draggedItem)
    const targetIndex = products.findIndex(p => p.id === targetId)

    onReorder(draggedIndex, targetIndex)
    setDraggedItem(null)
  }

  // Render product cards with:
  // - First photo as thumbnail (or ProductPlaceholder)
  // - Product name (truncate if > 40 chars)
  // - Price formatted as €X,XXX.XX
  // - Edit and Delete buttons
  // - Drag handle with GripVertical icon
}
```

**Reference**:
- `src/components/onboarding/DynamicList.tsx:200-248` (drag-and-drop)

**Styling**:
- Use Card component from shadcn/ui
- Grid layout: 2 columns on desktop, 1 on mobile
- Thumbnail: 200x200px square with object-cover

---

### T031: ProductEntryForm Component

**File**: `src/components/onboarding/ProductEntryForm.tsx`

**Purpose**: Form to add/edit a product with validation

**Key Requirements**:
- react-hook-form integration
- Real-time validation (FR-027)
- Character counters (name: 50, description: 100)
- Price input with 2 decimal validation
- Product photo management via ProductPhotoUpload
- Clear error messages (FR-028 format)

**Implementation Pattern**:
```tsx
'use client'

import React, { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ProductInputSchema } from '@/lib/validation/product-schema'
import { Product, UploadedFile } from '@/types/onboarding'
import { ProductPhotoUpload } from './ProductPhotoUpload'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface ProductEntryFormProps {
  product?: Product // If editing
  onSave: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  isUploading?: boolean
}

export function ProductEntryForm({
  product,
  onSave,
  onCancel,
  isUploading = false
}: ProductEntryFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isValid }
  } = useForm({
    resolver: zodResolver(ProductInputSchema),
    defaultValues: product ? {
      name: product.name,
      description: product.description,
      price: product.price,
      photos: product.photos
    } : {
      name: '',
      description: '',
      price: undefined,
      photos: []
    },
    mode: 'onChange' // Real-time validation
  })

  // Watch values for character counters
  const nameValue = watch('name')
  const descriptionValue = watch('description')

  const onSubmit = (data: any) => {
    onSave(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Product Name */}
      <div>
        <Label htmlFor="name">Product Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Premium Website Package"
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        <div className="flex justify-between mt-1">
          <span className="text-sm text-red-600" id="name-error">
            {errors.name?.message}
          </span>
          <span className={`text-sm ${nameValue?.length > 50 ? 'text-red-600' : 'text-gray-500'}`}>
            {nameValue?.length || 0}/50
          </span>
        </div>
      </div>

      {/* Product Description */}
      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Brief description of what you offer"
          rows={3}
          aria-invalid={errors.description ? 'true' : 'false'}
        />
        <div className="flex justify-between mt-1">
          <span className="text-sm text-red-600">
            {errors.description?.message}
          </span>
          <span className={`text-sm ${descriptionValue?.length > 100 ? 'text-red-600' : 'text-gray-500'}`}>
            {descriptionValue?.length || 0}/100
          </span>
        </div>
      </div>

      {/* Price (Optional) */}
      <div>
        <Label htmlFor="price">Price (optional)</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          {...register('price', { valueAsNumber: true })}
          placeholder="e.g., 49.99"
        />
        {errors.price && (
          <span className="text-sm text-red-600">{errors.price.message}</span>
        )}
      </div>

      {/* Product Photos */}
      <div>
        <Label>Photos (optional, up to 5)</Label>
        <Controller
          name="photos"
          control={control}
          render={({ field }) => (
            <ProductPhotoUpload
              productId={product?.id || 'new'}
              photos={field.value || []}
              onPhotosChange={field.onChange}
              disabled={isUploading}
            />
          )}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!isValid || isUploading}
        >
          {product ? 'Save Changes' : 'Add Product'}
        </Button>
      </div>
    </form>
  )
}
```

**Reference**:
- `src/components/onboarding/steps/Step3BusinessBasics.tsx` (react-hook-form pattern)

---

### T032: Step11ProductsServices Component

**File**: `src/components/onboarding/steps/Step11ProductsServices.tsx`

**Purpose**: Main orchestrator for Step 11

**Key Requirements**:
- Manage product CRUD operations
- Track upload state (navigation lock)
- Handle empty state
- Enforce 6 product limit
- Integrate with useOnboardingStore
- Use StepTemplate wrapper

**Implementation Pattern**:
```tsx
'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useOnboardingStore } from '@/stores/onboarding'
import { Product } from '@/types/onboarding'
import { StepTemplate } from '../StepTemplate'
import { ProductEntryForm } from '../ProductEntryForm'
import { ProductList } from '../ProductList'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function Step11ProductsServices() {
  const t = useTranslations('onboarding.step11')
  const { formData, addProduct, updateProduct, deleteProduct, reorderProducts } = useOnboardingStore()

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const products = formData.products || []
  const canAddMore = products.length < 6

  const handleAddProduct = (productData: any) => {
    addProduct(productData)
    setIsAdding(false)
  }

  const handleUpdateProduct = (productData: any) => {
    if (editingId) {
      updateProduct(editingId, productData)
      setEditingId(null)
    }
  }

  const handleDeleteProduct = (id: string) => {
    // Show confirmation dialog
    if (confirm(t('deleteConfirm'))) {
      deleteProduct(id)
    }
  }

  return (
    <StepTemplate
      stepNumber={11}
      title={t('title')}
      subtitle={t('subtitle')}
      canGoNext={!isUploading} // Lock navigation during upload
      canGoBack={!isUploading}
    >
      {/* Empty State */}
      {products.length === 0 && !isAdding && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('emptyState')}
          </p>
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('addProduct')}
          </Button>
        </div>
      )}

      {/* Product List */}
      {products.length > 0 && !isAdding && !editingId && (
        <div className="space-y-6">
          <ProductList
            products={products}
            onReorder={reorderProducts}
            onEdit={setEditingId}
            onDelete={handleDeleteProduct}
          />

          {canAddMore && (
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('addProduct')}
            </Button>
          )}

          {!canAddMore && (
            <p className="text-sm text-gray-600">
              {t('maxProductsReached')}
            </p>
          )}
        </div>
      )}

      {/* Add Product Form */}
      {isAdding && (
        <ProductEntryForm
          onSave={handleAddProduct}
          onCancel={() => setIsAdding(false)}
          isUploading={isUploading}
        />
      )}

      {/* Edit Product Form */}
      {editingId && (
        <ProductEntryForm
          product={products.find(p => p.id === editingId)}
          onSave={handleUpdateProduct}
          onCancel={() => setEditingId(null)}
          isUploading={isUploading}
        />
      )}
    </StepTemplate>
  )
}
```

**Reference**:
- `src/components/onboarding/steps/Step12BusinessAssets.tsx` (file upload pattern)

---

### T033: Export Step11ProductsServices

**File**: `src/components/onboarding/steps/index.tsx`

**Action**: Add export line
```tsx
export { Step11ProductsServices } from './Step11ProductsServices'
```

---

### T034: Update Step Routing

**File**: `src/app/[locale]/onboarding/step/[stepNumber]/page.tsx`

**Action**: Add Step 11 to routing logic

Look for the step mapping (around line 50-80) and add:
```tsx
case 11:
  return <Step11ProductsServices />
```

Also update any step count constants if needed.

---

## Phase 4: Integration & Validation (T035-T042)

### T035-T036: Translations

**Files**:
- `messages/en.json`
- `messages/it.json`

**Add Keys**:
```json
{
  "onboarding": {
    "step11": {
      "title": "Products & Services",
      "subtitle": "Showcase what you offer",
      "emptyState": "No products added yet",
      "addProduct": "Add Product",
      "maxProductsReached": "You can add up to 6 products",
      "deleteConfirm": "Are you sure you want to delete this product?",
      "productName": {
        "label": "Product Name",
        "placeholder": "e.g., Premium Website Package",
        "error": {
          "tooShort": "Product name must be at least 3 characters",
          "tooLong": "Product name cannot exceed 50 characters"
        }
      },
      "productDescription": {
        "label": "Description",
        "placeholder": "Brief description of what you offer",
        "error": {
          "tooShort": "Description must be at least 10 characters",
          "tooLong": "Description cannot exceed 100 characters"
        }
      },
      "price": {
        "label": "Price (optional)",
        "placeholder": "e.g., 49.99",
        "error": {
          "positive": "Price must be a positive number",
          "decimals": "Price cannot have more than 2 decimal places"
        }
      },
      "photos": {
        "label": "Photos (optional, up to 5)",
        "uploadButton": "Upload Photo",
        "maxPhotosReached": "Maximum 5 photos per product",
        "unsupportedFormat": "Only JPEG, PNG, and WebP images are supported",
        "fileTooLarge": "File size cannot exceed 10 MB"
      }
    }
  }
}
```

Italian translations in `messages/it.json` should mirror the structure.

---

### T037-T039: Test Validation

Run tests to verify TDD Green phase:

```bash
# Contract tests should now PASS
pnpm test specs/002-improved-products-service/contracts/

# E2E test should now PASS
PORT=3783 pnpm exec playwright test src/__tests__/e2e/onboarding/step11-products-services.spec.ts --reporter=line --project=chromium

# Fix any failures iteratively
```

---

### T040-T042: Code Quality

```bash
# Lint
pnpm lint

# Type check
npx tsc --noEmit

# Build
pnpm build
```

---

## Phase 5: Polish & Final Validation (T043-T057)

### T043-T046: Unit Tests

Create unit tests for each component:
- `__tests__/components/onboarding/ProductEntryForm.test.tsx`
- `__tests__/components/onboarding/ProductList.test.tsx`
- `__tests__/components/onboarding/ProductPhotoUpload.test.tsx`
- `__tests__/stores/onboarding-products.test.ts`

**Pattern**: Follow existing test structure from `__tests__/components/onboarding/`

---

### T048-T050: Performance & Accessibility

Use Playwright to validate:
```typescript
// Performance (in E2E test)
const metrics = await page.evaluate(() => window.webVitals)
expect(metrics.LCP).toBeLessThan(1800) // 1.8s
expect(metrics.CLS).toBeLessThan(0.1)

// Accessibility
const results = await new AxeBuilder({ page }).analyze()
expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0)

// Keyboard navigation
await page.keyboard.press('Tab')
await expect(page.locator(':focus')).toBeVisible()
```

---

### T051-T054: Manual Testing

Follow `specs/002-improved-products-service/quickstart.md` for comprehensive manual test:
1. Empty state & skip flow
2. Validation testing
3. Photo validation
4. Complete product creation
5. Additional products & limits
6. Reordering
7. Edit product
8. Delete product
9. Internationalization
10. Performance & accessibility
11. Final persistence

---

### T055-T057: Final Checks

```bash
# Full test suite
pnpm test && PORT=3783 pnpm exec playwright test --reporter=line

# Dev server
PORT=3783 pnpm dev

# Verify Step 11 at http://localhost:3783/onboarding/step/11
```

---

## Key Technical Decisions

### 1. Native HTML5 Drag-and-Drop
- **Why**: Already proven in `DynamicList.tsx`, zero dependencies
- **Pattern**: Use `draggable` attribute + event handlers
- **Visual feedback**: Opacity change during drag

### 2. FileUploadWithProgress Reuse
- **Why**: Existing component handles progress, retry, errors
- **Adaptation**: Pass product-specific upload endpoint
- **State**: Track upload status locally, persist UploadedFile to store

### 3. react-hook-form + Zod
- **Why**: Real-time validation, consistent with other steps
- **Pattern**: `useForm({ resolver: zodResolver(schema), mode: 'onChange' })`
- **Errors**: Display immediately with character counters

### 4. Navigation Lock During Upload
- **Implementation**: Disable Next/Previous buttons in StepTemplate via `isUploading` state
- **Not**: Modal dialog (simpler UX, matches Step 12 pattern)

### 5. Auto-save Integration
- **Trigger**: Store actions automatically call `debouncedSaveProgress()`
- **Indicator**: Show "Saving..." → "Saved ✓" in StepTemplate
- **No changes needed**: Already implemented in store

---

## Testing Strategy

### TDD Cycle
1. **Red**: Tests written and confirmed failing ✅
2. **Green**: Implement components to pass tests 🔄
3. **Refactor**: Polish and optimize ⏳

### Test Coverage Goals
- Contract tests: 100% (API endpoints)
- E2E tests: 100% (comprehensive 11-phase flow)
- Unit tests: ≥80% (components)
- Integration: ≥90% (store actions)

---

## Common Pitfalls to Avoid

1. **Don't modify .env files** - Managed by Vercel
2. **Always use port 3783** for dev server
3. **Follow error message format**: "[Field] [violation]. [Action]"
4. **Character counters**: Update on every keystroke
5. **Price validation**: Enforce 2 decimal max in Zod schema
6. **Photo limit**: Check before upload, not after
7. **Drag-and-drop**: Test on both desktop and touch devices
8. **Translation keys**: Keep EN/IT in sync
9. **TypeScript**: Run `tsc --noEmit` before committing
10. **Test with real data**: Use actual images (JPEG/PNG/WebP)

---

## Next Session Checklist

When resuming implementation:

- [ ] Start dev server: `PORT=3783 pnpm dev`
- [ ] Review this guide completely
- [ ] Read reference components (FileUploadWithProgress, DynamicList)
- [ ] Implement T031 (ProductPhotoUpload) first - most complex
- [ ] Then T030 (ProductList) - medium complexity
- [ ] Then T029 (ProductEntryForm) - high complexity
- [ ] Then T032 (Step11ProductsServices) - orchestrator
- [ ] Update routing (T033-T034)
- [ ] Add translations (T035-T036)
- [ ] Run tests (T037-T039)
- [ ] Code quality checks (T040-T042)
- [ ] Commit after each major component
- [ ] Test in browser frequently

---

## Success Criteria

**Phase 3 Complete When**:
- All UI components render without errors
- TypeScript compiles successfully
- Products can be added/edited/deleted
- Photos can be uploaded/reordered/deleted
- Drag-and-drop reordering works
- Validation shows real-time feedback
- Empty state displays correctly
- 6-product limit enforced

**Feature Complete When**:
- All 58 tasks marked complete
- Contract tests pass
- E2E test passes (all 11 phases)
- Unit tests pass (≥80% coverage)
- Build succeeds
- No linting/type errors
- Manual testing checklist complete
- Performance: LCP ≤ 1.8s, CLS < 0.1
- Accessibility: 0 critical violations

---

## Resources

- **Design System**: `context/design-system/tokens.css`
- **Existing Components**: `src/components/onboarding/`
- **Reference Steps**: Step 3 (forms), Step 11 (structure), Step 12 (uploads)
- **Store Pattern**: `src/stores/onboarding.ts`
- **Validation**: `src/lib/validation/product-schema.ts`
- **API Routes**: `src/app/api/onboarding/sessions/`
- **Tests**: `src/__tests__/e2e/onboarding/step11-products-services.spec.ts`

---

**Last Commit**: b824a78 (ProductPlaceholder component)
**Branch**: 002-improved-products-service
**Progress**: 29/58 tasks (50%)
