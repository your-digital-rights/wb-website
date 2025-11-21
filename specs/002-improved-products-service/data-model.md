# Data Model: Enhanced Products & Services Entry

**Feature**: Step 11 Onboarding Enhancement
**Date**: 2025-11-20
**Status**: Design Complete

## Overview

This document defines the data structures for product and photo management in Step 11 of the onboarding flow. Products are stored as JSONB arrays in the `onboarding_sessions` table during onboarding, with photos stored in Supabase Storage.

## Core Entities

### Product Entity

Represents a product or service offered by the business.

```typescript
interface Product {
  /** Unique identifier (UUID v4, client-generated) */
  id: string

  /** Product name (3-50 characters, required) */
  name: string

  /** Product description (10-100 characters, required) */
  description: string

  /** Price in euros (optional, positive number with max 2 decimals) */
  price?: number

  /** Ordered array of product photos (0-5 photos, using existing UploadedFile interface) */
  photos: UploadedFile[]

  /** Display order in product list (0-based integer) */
  displayOrder: number

  /** ISO 8601 timestamp when product was created */
  createdAt: string

  /** ISO 8601 timestamp when product was last modified */
  updatedAt: string
}
```

**Validation Rules**:
- `id`: Must be valid UUID v4 format
- `name`: Required, 3-50 characters after trim, non-empty
- `description`: Required, 10-100 characters after trim, non-empty
- `price`: Optional, must be positive number if provided, max 2 decimal places (e.g., 49.99)
- `photos`: Array length 0-5
- `displayOrder`: Non-negative integer, unique within user's product list
- `createdAt`: Valid ISO 8601 format (e.g., "2025-11-20T10:30:00.000Z")
- `updatedAt`: Valid ISO 8601 format, >= createdAt

**Constraints**:
- Maximum 6 products per user
- Unique `displayOrder` within user's products (enforced in UI state management)

**Example**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Premium Website Package",
  "description": "Professional website with custom design and SEO optimization for your business.",
  "price": 2499.99,
  "photos": [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "fileName": "product-photo.webp",
      "fileSize": 245678,
      "mimeType": "image/webp",
      "url": "https://[PROJECT].supabase.co/storage/v1/object/public/onboarding-photos/abc123/products/550e8400/7c9e6679.webp",
      "width": 1200,
      "height": 800,
      "uploadedAt": "2025-11-20T10:30:00.000Z"
    }
  ],
  "displayOrder": 0,
  "createdAt": "2025-11-20T10:30:00.000Z",
  "updatedAt": "2025-11-20T10:35:00.000Z"
}
```

---

### Product Photo Entity (Uses Existing UploadedFile Interface)

Product photos use the existing `UploadedFile` interface from `src/types/onboarding.ts` (consistent with Step 12 Business Assets). This interface is already proven in production and provides all necessary fields for photo management.

```typescript
// From src/types/onboarding.ts (existing)
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

**Why UploadedFile instead of custom ProductPhoto**:
- ✅ Consistent with existing onboarding patterns (Step 12 uses same interface)
- ✅ Already validated in production with retry logic and error handling
- ✅ FileUploadWithProgress component already works with this interface
- ✅ No additional type definitions needed
- ✅ Follows research.md decision (user feedback: "same as existing photo entities")

**Additional Product-Specific Fields** (managed in UI state):
- `displayOrder`: Tracked via array index in Product.photos array
- Upload progress: Handled by FileUploadWithProgress component (not persisted)
- Upload errors: Handled by FileUploadWithProgress component (not persisted)

**Validation Rules**:
- `id`: Must be valid UUID v4 format (auto-generated)
- `fileName`: Original file name
- `fileSize`: File size in bytes (max 10 MB = 10,485,760 bytes)
- `mimeType`: Must be `image/jpeg`, `image/png`, or `image/webp`
- `url`: Must be valid HTTPS URL to Supabase Storage
- `width`/`height`: Optional dimensions (populated by image processing)
- `uploadedAt`: ISO 8601 timestamp

**Constraints**:
- Maximum 5 photos per product
- Display order = array index (0, 1, 2, 3, 4)
- File formats: JPEG (.jpg, .jpeg), PNG (.png), WebP (.webp) only
- File size: Maximum 10 MB per file

**Example (Complete Upload)**:
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "fileName": "product-photo.webp",
  "fileSize": 245678,
  "mimeType": "image/webp",
  "url": "https://[PROJECT].supabase.co/storage/v1/object/public/onboarding-photos/abc123/products/550e8400/7c9e6679.webp",
  "width": 1200,
  "height": 800,
  "uploadedAt": "2025-11-20T10:30:00.000Z"
}
```

**Note**: Upload progress and error states are transient UI concerns handled by FileUploadWithProgress component and do not need to be persisted to the database or localStorage.

---

## Type System Extensions

### Zustand Store Extension

Extend the existing `OnboardingFormData` and `OnboardingStore` types:

```typescript
// In src/types/onboarding.ts

/** Extend OnboardingFormData interface */
export interface OnboardingFormData {
  // ... existing fields (firstName, lastName, email, businessName, etc.)

  /** Array of products (0-6 products) */
  products: Product[]
}

/** Extend OnboardingStore interface */
export interface OnboardingStore {
  // ... existing state and actions

  // Product CRUD Actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateProduct: (id: string, updates: Partial<Product>) => void
  deleteProduct: (id: string) => void
  reorderProducts: (fromIndex: number, toIndex: number) => void

  // Product Photo Actions (using UploadedFile interface)
  addProductPhoto: (productId: string, photo: UploadedFile) => void
  updateProductPhoto: (productId: string, photoId: string, updates: Partial<UploadedFile>) => void
  deleteProductPhoto: (productId: string, photoId: string) => void
  reorderProductPhotos: (productId: string, fromIndex: number, toIndex: number) => void
}
```

**Action Specifications**:

#### `addProduct(product)`
- Generates UUID for product.id
- Sets createdAt and updatedAt to current timestamp
- Assigns displayOrder = max(existing displayOrders) + 1
- Initializes photos as empty array
- Triggers auto-save

#### `updateProduct(id, updates)`
- Updates product fields by id
- Sets updatedAt to current timestamp
- Preserves fields not in updates
- Triggers auto-save

#### `deleteProduct(id)`
- Removes product from array
- Recalculates displayOrder for remaining products (sequential 0, 1, 2...)
- Deletes all associated photos from Supabase Storage (async)
- Triggers auto-save

#### `reorderProducts(fromIndex, toIndex)`
- Moves product from position fromIndex to toIndex
- Recalculates displayOrder for all products
- Triggers auto-save

#### `addProductPhoto(productId, photo)`
- Receives complete UploadedFile object (id already generated by upload service)
- Finds product by productId
- Adds photo to product.photos array
- Display order determined by array index
- Triggers auto-save

#### `updateProductPhoto(productId, photoId, updates)`
- Finds product and photo by IDs
- Updates photo fields (UploadedFile properties)
- Primarily used for metadata updates (dimensions, url corrections)
- Triggers auto-save if persisted fields change

#### `deleteProductPhoto(productId, photoId)`
- Finds product and removes photo from photos array
- Recalculates displayOrder for remaining photos
- Deletes photo from Supabase Storage (async)
- Triggers auto-save

#### `reorderProductPhotos(productId, fromIndex, toIndex)`
- Finds product by productId
- Moves photo from position fromIndex to toIndex within product.photos array
- Display order automatically updated by array index (no explicit displayOrder field)
- Triggers auto-save

---

## Database Schema

### Supabase PostgreSQL: onboarding_sessions Table

**Migration: Add products column**

```sql
-- Migration Up
ALTER TABLE onboarding_sessions
ADD COLUMN products JSONB DEFAULT '[]'::jsonb;

-- Optional: Add GIN index for JSONB querying (useful for post-onboarding analytics)
CREATE INDEX idx_onboarding_sessions_products
ON onboarding_sessions
USING GIN (products);

-- Migration Down (Rollback)
DROP INDEX IF EXISTS idx_onboarding_sessions_products;
ALTER TABLE onboarding_sessions
DROP COLUMN IF EXISTS products;
```

**Table Structure** (after migration):
```
onboarding_sessions
├── id (uuid, primary key)
├── user_id (uuid, nullable - linked after Step 2 email verification)
├── session_id (text, unique, for URL-based session recovery)
├── form_data (jsonb, existing form fields)
├── products (jsonb, NEW - array of Product objects)
├── current_step (integer)
├── created_at (timestamp with timezone)
├── updated_at (timestamp with timezone)
└── expires_at (timestamp with timezone)
```

**Products Column Schema**:
- Type: JSONB (PostgreSQL native JSON with indexing)
- Default: `'[]'::jsonb` (empty array)
- Structure: Array of Product objects following TypeScript interface

**Example products column value**:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Website Design",
    "description": "Custom website tailored to your brand and business needs.",
    "price": 1500.00,
    "photos": [
      {
        "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "url": "https://[PROJECT].supabase.co/storage/v1/object/public/onboarding-photos/abc123/products/550e8400/7c9e6679.webp",
        "storageKey": "abc123/products/550e8400/7c9e6679.webp",
        "displayOrder": 0,
        "uploadStatus": "complete",
        "uploadProgress": 100
      }
    ],
    "displayOrder": 0,
    "createdAt": "2025-11-20T10:30:00.000Z",
    "updatedAt": "2025-11-20T10:30:00.000Z"
  }
]
```

**Backward Compatibility**:
- Existing sessions: NULL products column treated as empty array `[]` in application code
- No data migration needed: Step 11 is new, no existing product data to migrate
- Rollback safe: Dropping products column doesn't affect existing onboarding functionality

---

### Supabase Storage: onboarding-photos Bucket

**Bucket Configuration**:
- Name: `onboarding-photos` (existing public bucket)
- Public: Yes (allows direct Next.js Image URLs without signed URLs)
- File size limit: 10 MB (enforced in client-side validation before upload)

**Path Structure**:
```
onboarding-photos/
└── {sessionId}/
    ├── business/                    # Existing: Step 12 business photos
    │   └── {photoId}.{ext}
    └── products/                    # NEW: Step 11 product photos
        └── {productId}/
            └── {photoId}.{ext}
```

**Example Paths**:
```
onboarding-photos/abc123/products/550e8400-e29b-41d4-a716-446655440000/7c9e6679-7425-40de-944b-e07fc1f90ae7.webp
onboarding-photos/abc123/products/550e8400-e29b-41d4-a716-446655440000/8d7f5568-8536-51ef-b827-f18fd2g01bf8.jpg
```

**File Formats Allowed**:
- JPEG: `.jpg`, `.jpeg` (MIME: `image/jpeg`)
- PNG: `.png` (MIME: `image/png`)
- WebP: `.webp` (MIME: `image/webp`)

**Storage Lifecycle**:
1. **Upload**: Client uploads file to Supabase Storage via service method
2. **URL Generation**: Supabase returns public URL for storage key
3. **Deletion**: When product/photo deleted, storage file is also deleted
4. **Cleanup**: When session expires (60 days), entire session folder deleted via cron job

---

## Validation Schema (Zod)

```typescript
import { z } from 'zod'

/** Validation schema for Product entity */
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string()
    .min(3, 'Product name must be at least 3 characters')
    .max(50, 'Product name cannot exceed 50 characters')
    .trim()
    .refine(val => val.length > 0, 'Product name cannot be empty'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(100, 'Description cannot exceed 100 characters')
    .trim()
    .refine(val => val.length > 0, 'Description cannot be empty'),
  price: z.number()
    .positive('Price must be a positive number')
    .multipleOf(0.01, 'Price cannot have more than 2 decimal places')
    .optional(),
  photos: z.array(UploadedFileSchema).max(5, 'Maximum 5 photos per product'),
  displayOrder: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

/** Validation schema for Product Photo (uses UploadedFile) */
export const UploadedFileSchema = z.object({
  id: z.string().uuid(),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive().max(10485760), // 10 MB max
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  url: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  uploadedAt: z.string().datetime()
})

/** Validation schema for product array (max 6 products) */
export const ProductsArraySchema = z.array(ProductSchema)
  .max(6, 'Maximum 6 products allowed')
```

---

## State Management Patterns

### Optimistic Updates

For better UX, updates are applied to local state immediately before server confirmation:

```typescript
// Example: Add product
const addProduct = (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
  const newProduct: Product = {
    ...product,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    displayOrder: Math.max(...products.map(p => p.displayOrder), -1) + 1
  }

  // Optimistic update: Add to state immediately
  set(state => ({
    formData: {
      ...state.formData,
      products: [...state.formData.products, newProduct]
    },
    isDirty: true
  }))

  // Auto-save will persist to server (debounced)
}
```

### Photo Upload Flow

Photos use a state machine pattern to track upload progress:

```typescript
// 1. User selects file -> FileUploadWithProgress handles upload
// 2. Upload progress tracked by FileUploadWithProgress component (transient UI state)
// 3. On upload complete -> addProductPhoto with complete UploadedFile
addProductPhoto(productId, {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', // from upload response
  fileName: 'product-photo.jpg',
  fileSize: 245678,
  mimeType: 'image/jpeg',
  url: 'https://[PROJECT].supabase.co/storage/.../7c9e6679.jpg',
  width: 1200,
  height: 800,
  uploadedAt: new Date().toISOString()
})

// Note: Upload errors handled by FileUploadWithProgress (retry mechanism)
// Only successful uploads result in addProductPhoto calls
```

### Reordering with Drag-and-Drop

Reordering uses array splice operations (displayOrder = array index):

```typescript
const reorderProducts = (fromIndex: number, toIndex: number) => {
  set(state => {
    const products = [...state.formData.products]
    const [moved] = products.splice(fromIndex, 1)
    products.splice(toIndex, 0, moved)

    // Update displayOrder to match new array indices
    products.forEach((product, index) => {
      product.displayOrder = index
      product.updatedAt = new Date().toISOString()
    })

    return {
      formData: { ...state.formData, products },
      isDirty: true
    }
  })

  // Auto-save will persist new order
}

// Photo reordering works similarly (using array indices)
const reorderProductPhotos = (productId: string, fromIndex: number, toIndex: number) => {
  set(state => {
    const products = [...state.formData.products]
    const productIndex = products.findIndex(p => p.id === productId)
    if (productIndex === -1) return state

    const product = { ...products[productIndex] }
    const photos = [...product.photos]
    const [moved] = photos.splice(fromIndex, 1)
    photos.splice(toIndex, 0, moved)

    product.photos = photos
    product.updatedAt = new Date().toISOString()
    products[productIndex] = product

    return {
      formData: { ...state.formData, products },
      isDirty: true
    }
  })
}
```

---

## Relationships

```
OnboardingSession (1) ─── has many ──> (0-6) Product
                                           │
                                           └─── has many ──> (0-5) ProductPhoto
```

**Cascade Rules**:
- Delete OnboardingSession → Delete all Products (JSONB column deleted)
- Delete Product → Delete all ProductPhotos (array item removed, storage files deleted)
- Delete ProductPhoto → Delete storage file

**Orphan Prevention**:
- Products cannot exist without OnboardingSession (embedded in JSONB)
- Photos cannot exist without Product (embedded in products array)
- Storage files deleted when photo reference removed

---

## Future Considerations

### Post-Onboarding Product Management

When products need to persist beyond onboarding (e.g., for user dashboards, public profiles):

1. **Create dedicated `products` table**:
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 50),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 100),
  price DECIMAL(10,2) CHECK (price > 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

2. **Migration strategy**: Copy products from `onboarding_sessions.products` to new tables after onboarding completes

3. **Storage migration**: Move photos from `onboarding-photos` bucket to permanent `products-photos` bucket

---

## Summary

This data model provides:
- ✅ Flexible JSONB storage for session-scoped products during onboarding
- ✅ Type-safe TypeScript interfaces with comprehensive validation
- ✅ Clear state machine for photo upload tracking
- ✅ Zustand store integration with auto-save support
- ✅ Organized Supabase Storage structure for photo files
- ✅ Backward compatible database migration
- ✅ Future-proof design for post-onboarding product management

**Next Steps**: Proceed to contract generation (API endpoint specifications and tests).
