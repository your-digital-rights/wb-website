/**
 * Product Validation Schemas
 * Feature: 002-improved-products-service
 *
 * Zod validation schemas for Step 11: Enhanced Products & Services Entry
 */

import { z } from 'zod'

/**
 * Validation schema for UploadedFile (product photos)
 * Reuses existing UploadedFile interface from Step 12
 */
export const UploadedFileSchema = z.object({
  id: z.string().uuid('Invalid photo ID format'),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z
    .number()
    .int('File size must be an integer')
    .positive('File size must be positive')
    .max(10485760, 'File size cannot exceed 10 MB'), // 10 MB in bytes
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    message: 'Only JPEG, PNG, and WebP images are supported'
  }),
  url: z.string().url('Invalid photo URL'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  uploadedAt: z.string().datetime('Invalid upload timestamp')
})

/**
 * Validation schema for Product entity
 * Enforces character limits, price format, and photo constraints
 */
export const ProductSchema = z.object({
  id: z.string().uuid('Invalid product ID format'),
  name: z
    .string()
    .trim()
    .min(3, 'Product name must be at least 3 characters')
    .max(50, 'Product name cannot exceed 50 characters')
    .refine((val) => val.length > 0, {
      message: 'Product name cannot be empty'
    }),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(100, 'Description cannot exceed 100 characters')
    .refine((val) => val.length > 0, {
      message: 'Description cannot be empty'
    }),
  price: z
    .number()
    .positive('Price must be a positive number')
    .multipleOf(0.01, 'Price cannot have more than 2 decimal places')
    .optional(),
  photos: z
    .array(UploadedFileSchema)
    .max(5, 'Maximum 5 photos per product')
    .default([]),
  displayOrder: z.number().int().nonnegative('Display order must be non-negative'),
  createdAt: z.string().datetime('Invalid creation timestamp'),
  updatedAt: z.string().datetime('Invalid update timestamp')
})

/**
 * Validation schema for products array
 * Enforces maximum 6 products constraint
 */
export const ProductsArraySchema = z
  .array(ProductSchema)
  .max(6, 'Maximum 6 products allowed')
  .default([])

/**
 * Validation schema for product form input (before ID/timestamp generation)
 * Used for validating user input before creating a Product entity
 */
export const ProductInputSchema = ProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  displayOrder: true
})

/**
 * Type exports for TypeScript
 */
export type ProductInput = z.infer<typeof ProductInputSchema>
export type ValidatedProduct = z.infer<typeof ProductSchema>
export type ValidatedProductsArray = z.infer<typeof ProductsArraySchema>
export type ValidatedUploadedFile = z.infer<typeof UploadedFileSchema>
