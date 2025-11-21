/**
 * Product List Component
 * Feature: 002-improved-products-service
 *
 * Displays a grid of product cards with drag-and-drop reordering
 * - Shows thumbnail (first photo or placeholder)
 * - Displays name, description, price
 * - Edit and Delete actions
 * - Empty state message
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Edit2, Trash2, GripVertical, Euro } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Product } from '@/types/onboarding'
import { ProductPlaceholder } from './ProductPlaceholder'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ProductListProps {
  products: Product[]
  onEdit: (productId: string) => void
  onDelete: (productId: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  disabled?: boolean
}

export function ProductList({
  products,
  onEdit,
  onDelete,
  onReorder,
  disabled = false
}: ProductListProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  // Handle drag-and-drop reordering
  const handleDragStart = (e: React.DragEvent, productId: string) => {
    setDraggedItem(productId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetId) return

    const draggedIndex = products.findIndex(p => p.id === draggedItem)
    const targetIndex = products.findIndex(p => p.id === targetId)

    if (draggedIndex !== -1 && targetIndex !== -1) {
      onReorder(draggedIndex, targetIndex)
    }

    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          No products added yet
        </p>
        <p className="text-sm text-gray-500">
          Click "Add Product" to get started
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {products.map((product) => {
        const firstPhoto = product.photos?.[0]
        const isDragging = draggedItem === product.id

        return (
          <motion.div
            key={product.id}
            layout
            className={cn('relative', isDragging && 'opacity-50')}
            draggable={!disabled}
            onDragStart={(e) => handleDragStart(e as any, product.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e as any, product.id)}
            onDragEnd={handleDragEnd}
          >
            <Card className="overflow-hidden group">
              <div className="flex gap-4 p-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0 relative">
                  {firstPhoto ? (
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <Image
                        src={firstPhoto.url}
                        alt={product.name}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <ProductPlaceholder size="sm" />
                  )}

                  {/* Drag handle */}
                  {!disabled && (
                    <div
                      className="absolute -left-2 -top-2 p-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Product details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {product.name}
                    </h3>
                    {product.price !== undefined && (
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        <Euro className="w-3.5 h-3.5" />
                        {product.price.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                    {product.description}
                  </p>

                  {/* Photo count badge */}
                  {product.photos.length > 0 && (
                    <div className="text-xs text-gray-500 mb-2">
                      {product.photos.length} {product.photos.length === 1 ? 'photo' : 'photos'}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(product.id)}
                      disabled={disabled}
                      className="flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(product.id)}
                      disabled={disabled}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
