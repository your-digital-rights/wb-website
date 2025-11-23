# Research: Enhanced Products & Services Entry

**Feature**: Step 11 Onboarding Enhancement
**Date**: 2025-11-20
**Status**: Complete (No unknowns - leveraging existing patterns)

## Research Summary

This feature requires **zero net-new technology or dependencies**. All implementation patterns exist in the codebase and have been validated in production.

## Technology Decisions

### 1. State Management: Zustand with Persist Middleware

**Decision**: Extend existing `useOnboardingStore` from `src/stores/onboarding.ts`

**Rationale**:
- Already implements localStorage persistence via Zustand persist middleware
- Debounced auto-save (1.5s debounce, 3s max wait) proven in Steps 3-13
- Schema versioning and migration handling already in place
- Centralized onboarding state reduces prop drilling
- DevTools middleware for debugging

**Existing Implementation Reference**:
- File: `src/stores/onboarding.ts`
- Pattern: `formData: Partial<OnboardingFormData>` with typed actions
- Auto-save: `createDebouncedSave()` with lodash.debounce
- Persistence: Zustand `persist()` middleware with localStorage

**Alternatives Considered**:
- **New separate store**: Rejected - adds complexity, breaks consistency, requires separate persistence logic
- **Redux**: Rejected - not in tech stack, overkill for this feature
- **React Context**: Rejected - no persistence, no middleware, poor dev experience

**Implementation Notes**:
- Add `products: Product[]` to `OnboardingFormData` interface
- Add 8 new actions: addProduct, updateProduct, deleteProduct, reorderProducts, addProductPhoto, updateProductPhoto, deleteProductPhoto, reorderProductPhotos
- No changes needed to persistence or auto-save logic (works automatically)

---

### 2. File Upload: Reuse FileUploadWithProgress Component

**Decision**: Leverage existing `FileUploadWithProgress.tsx` component

**Rationale**:
- Already implements Supabase Storage upload with progress tracking
- Error handling and retry logic built-in
- Used successfully in Step 12 (Business Assets)
- Supports navigation lock during uploads
- Compatible with Next.js Image for display

**Existing Implementation Reference**:
- File: `src/components/onboarding/FileUploadWithProgress.tsx`
- Features: Progress streaming, error states, retry mechanism, file validation
- Storage: Supabase Storage with public bucket URLs

**Alternatives Considered**:
- **New custom upload component**: Rejected - duplicates 200+ lines of existing, tested code
- **Native input file upload**: Rejected - no progress tracking, poor UX for multi-file uploads
- **Third-party upload widget (Uploadcare, Cloudinary)**: Rejected - adds external dependency, costs money

**Implementation Notes**:
- Product photos path: `{sessionId}/products/{productId}/{photoId}.{ext}`
- Reuse existing validation: file size (10MB), MIME type checking
- Extend to support JPEG, PNG, WebP validation (current supports images generally)

---

### 3. Image Optimization: Next.js Image + Vercel Integration

**Decision**: Use Next.js Image component with Vercel automatic optimization

**Rationale**:
- Used in Step 7 (Visual Inspiration) and Step 12 (Business Assets)
- Automatic format conversion (WebP when supported)
- Responsive images with srcset generation
- Lazy loading by default
- Vercel CDN caching and optimization

**Existing Implementation Reference**:
- Usage: `<Image src={url} alt={localizedAlt} width={w} height={h} />`
- Supabase Storage URLs work directly with Next.js Image
- No additional configuration needed

**Alternatives Considered**:
- **Client-side image resize/compression**: Rejected - inconsistent browser support, adds client-side processing time
- **Server-side image processing (Sharp, ImageMagick)**: Rejected - Vercel already handles this, adds latency
- **External image CDN (Imgix, Cloudinary)**: Rejected - Vercel Image optimization is included, no additional cost

**Implementation Notes**:
- Thumbnails: 200x200px with `object-fit: cover`
- List view: 100x100px thumbnails
- Full view: Responsive with max-width constraints

---

### 4. Form Validation: react-hook-form

**Decision**: Use react-hook-form for validation and form state

**Rationale**:
- Used in Steps 3-6 for business info, brand definition, customer profiles
- Real-time validation with instant feedback
- Minimal re-renders (uncontrolled inputs with refs)
- Integrates seamlessly with StepTemplate's `canGoNext` prop
- TypeScript support with Zod schemas

**Existing Implementation Reference**:
- File: `src/components/onboarding/steps/Step3BusinessBasics.tsx`
- Pattern: `useForm()` with Controller components for custom inputs
- Validation: Zod schemas in form setup, real-time error messages

**Alternatives Considered**:
- **Formik**: Rejected - not in tech stack, more boilerplate than react-hook-form
- **Custom validation**: Rejected - reinventing the wheel, no form state management
- **Native HTML5 validation**: Rejected - limited customization, poor UX for dynamic fields

**Implementation Notes**:
- Schema: Zod validation for product name (3-50 chars), description (10-100 chars), price (optional positive number)
- Dynamic fields: Use `useFieldArray()` for products array management
- Error display: Real-time validation with error message localization

---

### 5. Drag-and-Drop: Native HTML5 API

**Decision**: Use existing native HTML5 Drag-and-Drop pattern from `DynamicList.tsx`

**Rationale**:
- **Already in codebase**: `DynamicList.tsx` implements proven drag-and-drop pattern
- **Zero dependencies**: No external libraries needed
- **Consistent UX**: Matches existing onboarding step behaviors
- **Well-tested**: Used in Step 11 (Website Structure) for reordering sections
- **Simple implementation**: Standard `draggable` attribute + event handlers

**Existing Implementation Reference**:
- File: `src/components/onboarding/DynamicList.tsx:200-248`
- Pattern: Native `draggable` attribute with `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd`
- Handlers: Track `draggedItem` state, splice array on drop, update `order` property
- Visual feedback: Opacity change during drag, cursor states

**Alternatives Considered**:
- **dnd-kit library**: Rejected - adds unnecessary dependency when native API works well
- **react-beautiful-dnd**: Rejected - deprecated since 2023
- **Custom implementation**: Rejected - DynamicList pattern already exists and works

**Implementation Notes**:
- Products list: Reuse `DynamicList` drag pattern for vertical reordering
- Photos grid: Adapt pattern for grid layout (same event handlers)
- Visual feedback: `draggedItem === item.id && "opacity-50"` for drag source
- Cursor states: `cursor-move`, `cursor-grab`, `cursor-grabbing`
- Framer Motion: Use `layout` animation for smooth reordering

**Example Pattern** (from existing DynamicList.tsx):
```tsx
// Drag handlers
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

  const draggedIndex = items.findIndex(item => item.id === draggedItem)
  const targetIndex = items.findIndex(item => item.id === targetId)

  const reorderedItems = [...items]
  const [draggedElement] = reorderedItems.splice(draggedIndex, 1)
  reorderedItems.splice(targetIndex, 0, draggedElement)

  // Update order property
  const updatedItems = reorderedItems.map((item, index) => ({
    ...item,
    order: index
  }))

  setItems(updatedItems)
  setDraggedItem(null)
}

// JSX
<motion.div
  draggable
  onDragStart={(e) => handleDragStart(e, item.id)}
  onDragOver={handleDragOver}
  onDrop={(e) => handleDrop(e, item.id)}
  onDragEnd={() => setDraggedItem(null)}
>
```

---

### 6. Database Schema: JSONB Column in onboarding_sessions

**Decision**: Add `products JSONB` column to existing `onboarding_sessions` table

**Rationale**:
- Products are session-scoped during onboarding (only needed until onboarding completes)
- JSONB supports flexible array structure without additional table joins
- PostgreSQL JSONB indexing (GIN) enables fast queries if needed later
- Consistent with how other complex data is stored during onboarding
- Simple migration: single ALTER TABLE statement

**Existing Schema Reference**:
- Table: `onboarding_sessions` in Supabase PostgreSQL
- Columns: `id`, `user_id`, `form_data`, `current_step`, `created_at`, `updated_at`, `expires_at`
- Pattern: Complex form data stored as JSONB in `form_data` column

**Alternatives Considered**:
- **New `products` table with foreign key**: Deferred - use when products become post-onboarding entities with full CRUD operations
- **Separate `onboarding_products` table**: Rejected - over-engineering for session-scoped data
- **Store in `form_data` JSONB**: Rejected - products are complex enough to deserve dedicated column for query/index optimization

**Migration Strategy**:
```sql
-- Up migration
ALTER TABLE onboarding_sessions
ADD COLUMN products JSONB DEFAULT '[]'::jsonb;

CREATE INDEX idx_onboarding_sessions_products ON onboarding_sessions USING GIN (products);

-- Down migration (rollback)
DROP INDEX IF EXISTS idx_onboarding_sessions_products;
ALTER TABLE onboarding_sessions DROP COLUMN IF EXISTS products;
```

**Backward Compatibility**:
- Existing sessions: NULL/missing products column treated as empty array `[]`
- No data migration needed: users haven't reached Step 11 yet in production
- Rollback safe: dropping column doesn't affect existing functionality

---

### 7. Photo Storage: Supabase Storage with Organized Paths

**Decision**: Use existing Supabase Storage, add products subfolder to path structure

**Rationale**:
- Consistent with Step 12 business photo storage pattern
- Public bucket enables direct Next.js Image URLs (no signed URL generation)
- Organized by session/product/photo for easy cleanup
- Automatic CDN distribution via Supabase

**Existing Storage Pattern**:
- Bucket: `onboarding-photos` (existing public bucket)
- Current pattern: `{sessionId}/business/{photoId}.{ext}`
- New pattern: `{sessionId}/products/{productId}/{photoId}.{ext}`

**Path Structure Benefits**:
- Easy to delete all photos for a product (delete folder)
- Easy to cleanup expired sessions (delete session folder)
- Clear organization for debugging

**Alternatives Considered**:
- **Base64 encode in database**: Rejected - massive database bloat, poor performance, no CDN caching
- **External CDN (Cloudinary, Imgix)**: Rejected - adds cost, complexity, vendor lock-in
- **Vercel Blob Storage**: Rejected - Supabase already in stack, would require new integration

**Implementation Notes**:
- Upload service: Extend `src/services/supabase/storage.ts` with `uploadProductPhoto()`
- Deletion: Add `deleteProductPhoto()` to cleanup storage when product/photo deleted
- URLs: Store full public URL in `ProductPhoto.url` for easy Image component usage

---

### 8. Photo Entity: UploadedFile Interface

**Decision**: Use existing `UploadedFile` interface for product photos (matches Step 12 pattern)

**Rationale**:
- Consistent with existing photo storage in Step 12 (Business Assets)
- Well-defined interface in `src/types/onboarding.ts:137`
- Includes all necessary metadata (fileName, fileSize, mimeType, dimensions, uploadedAt)
- Compatible with FileUploadWithProgress component

**Existing Interface**:
```typescript
export interface UploadedFile {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  width?: number
  height?: number
  uploadedAt: string
}
```

**Alternatives Considered**:
- **New ProductPhoto interface**: Rejected - duplicates existing UploadedFile, breaks consistency
- **Minimal photo object (just URL)**: Rejected - loses valuable metadata for debugging and optimization

**Implementation Notes**:
- Product interface: `photos: UploadedFile[]` (0-5 photos)
- Add `displayOrder` at usage level (not in UploadedFile itself, which is generic)
- Reorder logic: Track order in Product.photos array index

---

### 9. Internationalization: next-intl with Existing Pattern

**Decision**: Add `onboarding.step11.*` translation keys to existing messages files

**Rationale**:
- Consistent with all other onboarding steps
- Server-side translations for SEO (page metadata)
- Client-side translations for dynamic content (validation messages)
- Hot-reload in development for translation updates

**Existing Pattern Reference**:
- Files: `messages/en.json`, `messages/it.json`
- Namespace: `onboarding.*` for all onboarding content
- Usage: `const t = useTranslations('onboarding.step11')`

**Translation Keys Needed** (sample):
```json
{
  "onboarding": {
    "step11": {
      "title": "Products & Services",
      "description": "Showcase what you offer",
      "addProduct": "Add Product",
      "maxProductsReached": "You can add up to 6 products",
      "productName": {
        "label": "Product Name",
        "placeholder": "e.g., Premium Website Package",
        "error": {
          "tooShort": "Name must be at least 3 characters",
          "tooLong": "Name cannot exceed 50 characters"
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
        "placeholder": "e.g., 49.99"
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

**Alternatives Considered**: None - next-intl is mandatory per Constitution Principle III

---

## New Dependencies Summary

**Zero new dependencies** - All patterns use existing libraries from the tech stack.

---

## Existing Patterns Confirmed

The following patterns require **zero new research** - direct reuse of existing code:

1. **StepTemplate wrapper** (`src/components/onboarding/StepTemplate.tsx`): Handles navigation, auto-save indicator, progress bar
2. **Form field components** (`src/components/onboarding/form-fields/*.tsx`): TextInput, TextareaInput for name/description
3. **Validation pattern** (Zod + react-hook-form): Real-time errors with localized messages
4. **Auto-save debouncing** (lodash.debounce): 1.5s debounce, 3s max wait
5. **localStorage persistence** (Zustand persist middleware): Automatic, no code changes needed
6. **Supabase client** (`src/services/supabase/`): Database and storage already configured
7. **Test patterns** (Jest/RTL, Playwright): Existing test utilities and helpers
8. **Design tokens** (`context/design-system/tokens.css`): All styling via --wb-* variables
9. **UploadedFile interface** (`src/types/onboarding.ts:137`): Standard photo entity structure
10. **Native drag-and-drop** (`src/components/onboarding/DynamicList.tsx`): Proven reordering pattern

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Photo upload performance | Reusing proven FileUploadWithProgress component, Vercel CDN |
| Form complexity (nested arrays) | react-hook-form `useFieldArray()` handles this pattern |
| Mobile drag-and-drop UX | Native HTML5 API works well, test on actual devices |
| Translation coverage | All strings identified in spec, will be validated in E2E tests |

---

## Conclusion

This feature leverages **10 existing patterns** from the codebase and adds **zero new dependencies**. Zero high-risk decisions. All unknowns resolved through existing implementation references.

**Ready for Phase 1**: Design & Contracts generation.
