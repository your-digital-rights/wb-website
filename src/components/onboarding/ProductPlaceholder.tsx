/**
 * Product Placeholder Component
 * Feature: 002-improved-products-service
 *
 * Displays a placeholder thumbnail for products without photos
 */

'use client'

import React from 'react'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductPlaceholderProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-32 h-32',
  lg: 'w-48 h-48'
}

const iconSizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-12 h-12',
  lg: 'w-16 h-16'
}

export function ProductPlaceholder({ className, size = 'md' }: ProductPlaceholderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg',
        'bg-gray-100 dark:bg-gray-800',
        'border-2 border-dashed border-gray-300 dark:border-gray-600',
        sizeClasses[size],
        className
      )}
      data-testid="product-placeholder"
    >
      <Package
        className={cn(
          'text-gray-400 dark:text-gray-500',
          iconSizeClasses[size]
        )}
        aria-hidden="true"
      />
    </div>
  )
}
