/**
 * Step 11: Enhanced Products & Services Entry
 * Feature: 002-improved-products-service
 *
 * Main orchestrator component for product management
 * - Add/Edit/Delete products (max 6)
 * - Photo upload with drag-and-drop reordering
 * - Form validation and error handling
 * - Navigation lock during photo uploads
 */

'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { useOnboardingStore } from '@/stores/onboarding'
import { Product } from '@/types/onboarding'
import { Button } from '@/components/ui/button'
import { ProductList } from '../ProductList'
import { ProductEntryForm } from '../ProductEntryForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StepComponentProps } from './index'

type ViewMode = 'list' | 'add' | 'edit'

interface EditState {
  mode: ViewMode
  productId?: string
}

export function Step11ProductsServices(_props: StepComponentProps) {
  const { formData, addProduct, updateProduct, deleteProduct, reorderProducts } =
    useOnboardingStore()

  const products = formData.products || []
  const maxProducts = 6

  const [editState, setEditState] = useState<EditState>({ mode: 'list' })
  const [isUploading, setIsUploading] = useState(false)

  // Navigation lock during uploads
  const navigationLocked = isUploading

  // Get product being edited
  const editingProduct = editState.productId
    ? products.find(p => p.id === editState.productId)
    : undefined

  // Handle add product
  const handleAddProduct = (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    addProduct(data)
    setEditState({ mode: 'list' })
  }

  // Handle update product
  const handleUpdateProduct = (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editState.productId) {
      updateProduct(editState.productId, data)
      setEditState({ mode: 'list' })
    }
  }

  // Handle delete product
  const handleDeleteProduct = (productId: string) => {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      deleteProduct(productId)
    }
  }

  // Handle cancel form
  const handleCancelForm = () => {
    if (isUploading) {
      if (!confirm('Photo uploads are in progress. Are you sure you want to cancel?')) {
        return
      }
    }
    setEditState({ mode: 'list' })
  }

  // Render content based on mode
  const renderContent = () => {
    // Add mode
    if (editState.mode === 'add') {
      return (
        <div className="max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">Add New Product</h3>
          <ProductEntryForm
            productId={crypto.randomUUID()}
            onSave={handleAddProduct}
            onCancel={handleCancelForm}
            disabled={false}
          />
        </div>
      )
    }

    // Edit mode
    if (editState.mode === 'edit' && editingProduct) {
      return (
        <div className="max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">Edit Product</h3>
          <ProductEntryForm
            product={editingProduct}
            productId={editingProduct.id}
            onSave={handleUpdateProduct}
            onCancel={handleCancelForm}
            disabled={false}
          />
        </div>
      )
    }

    // List mode (default)
    return (
      <div className="space-y-6">
        {/* Header with Add button */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Your Products & Services</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Add up to {maxProducts} products or services you offer ({products.length}/{maxProducts})
            </p>
          </div>
          {products.length < maxProducts && (
            <Button
              onClick={() => setEditState({ mode: 'add' })}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          )}
        </div>

        {/* Max products warning */}
        {products.length >= maxProducts && (
          <Alert>
            <AlertDescription>
              You've reached the maximum of {maxProducts} products. Delete a product to add a new one.
            </AlertDescription>
          </Alert>
        )}

        {/* Product list */}
        <ProductList
          products={products}
          onEdit={(productId) => setEditState({ mode: 'edit', productId })}
          onDelete={handleDeleteProduct}
          onReorder={reorderProducts}
          disabled={false}
        />

        {/* Empty state message for continuation */}
        {products.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
              You can skip this step and add products later if needed.
            </p>
          </div>
        )}
      </div>
    )
  }

  return renderContent()
}
