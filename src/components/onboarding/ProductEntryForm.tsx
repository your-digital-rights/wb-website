/**
 * Product Entry Form Component
 * Feature: 002-improved-products-service
 *
 * Form for adding or editing a product
 * - Name, description, price fields with validation
 * - Photo upload integration
 * - Real-time character counters
 * - Form state management with react-hook-form
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Product, UploadedFile } from '@/types/onboarding'
import { ProductPhotoUpload } from './ProductPhotoUpload'
import { cn } from '@/lib/utils'

// Validation schema for product input (before UUID generation)
const ProductInputSchema = z.object({
  name: z.string().trim()
    .min(3, 'Product name must be at least 3 characters')
    .max(50, 'Product name cannot exceed 50 characters'),
  description: z.string().trim()
    .min(10, 'Description must be at least 10 characters')
    .max(100, 'Description cannot exceed 100 characters'),
  price: z.number()
    .positive('Price must be a positive number')
    .multipleOf(0.01, 'Price cannot have more than 2 decimal places')
    .optional()
    .or(z.literal(undefined))
})

type ProductInput = z.infer<typeof ProductInputSchema>

interface ProductEntryFormProps {
  product?: Product
  productId: string
  onSave: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  disabled?: boolean
}

export function ProductEntryForm({
  product,
  productId,
  onSave,
  onCancel,
  disabled = false
}: ProductEntryFormProps) {
  const [photos, setPhotos] = useState<UploadedFile[]>(product?.photos || [])
  const [isUploading, setIsUploading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty, isValid }
  } = useForm<ProductInput>({
    resolver: zodResolver(ProductInputSchema),
    mode: 'onChange',
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      price: product?.price
    }
  })

  // Watch field values for character counters
  const nameValue = watch('name') || ''
  const descriptionValue = watch('description') || ''
  const priceValue = watch('price')

  // Handle price input conversion (string to number)
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '') {
      setValue('price', undefined, { shouldValidate: true, shouldDirty: true })
    } else {
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        setValue('price', numValue, { shouldValidate: true, shouldDirty: true })
      }
    }
  }

  // Handle form submission
  const onSubmit = (data: ProductInput) => {
    if (isUploading) {
      alert('Please wait for photo uploads to complete')
      return
    }

    onSave({
      name: data.name,
      description: data.description,
      price: data.price,
      photos,
      displayOrder: product?.displayOrder || 0
    })
  }

  // Disable save if uploading
  const canSave = !disabled && !isUploading && isValid

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Product Name */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Product Name <span className="text-red-500">*</span>
          </Label>
          <span
            className={cn(
              'text-xs',
              nameValue.length > 50
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500'
            )}
          >
            {nameValue.length}/50
          </span>
        </div>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., WordPress Website, Logo Design"
          disabled={disabled}
          className={cn(errors.name && 'border-red-500')}
          maxLength={50}
        />
        {errors.name && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Description <span className="text-red-500">*</span>
          </Label>
          <span
            className={cn(
              'text-xs',
              descriptionValue.length > 100
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500'
            )}
          >
            {descriptionValue.length}/100
          </span>
        </div>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Brief description of your product or service"
          disabled={disabled}
          className={cn(errors.description && 'border-red-500')}
          rows={3}
          maxLength={100}
        />
        {errors.description && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Price (Optional) */}
      <div>
        <Label htmlFor="price" className="text-sm font-medium mb-2 block">
          Price (Optional)
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            €
          </span>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            disabled={disabled}
            className={cn('pl-8', errors.price && 'border-red-500')}
            value={priceValue ?? ''}
            onChange={handlePriceChange}
          />
        </div>
        {errors.price && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            {errors.price.message}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Leave blank to display "Contact for pricing"
        </p>
      </div>

      {/* Photo Upload */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Photos (Optional)
        </Label>
        <ProductPhotoUpload
          productId={productId}
          photos={photos}
          onPhotosChange={setPhotos}
          onUploadStart={() => setIsUploading(true)}
          onUploadComplete={() => setIsUploading(false)}
          maxPhotos={5}
          disabled={disabled}
        />
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="submit"
          disabled={!canSave}
          className="flex-1"
        >
          {product ? 'Update Product' : 'Add Product'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={disabled || isUploading}
        >
          Cancel
        </Button>
      </div>

      {isUploading && (
        <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
          Uploading photos... Please wait before saving.
        </p>
      )}
    </form>
  )
}
