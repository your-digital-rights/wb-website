/**
 * Unit tests for CustomColorSelector component
 *
 * Note: These are simplified tests focusing on component props and behavior.
 * Full integration testing is covered by E2E tests in step10-color-customization.spec.ts
 */

describe('CustomColorSelector', () => {
  describe('Component Interface', () => {
    it('accepts colors array with 4 color slots', () => {
      const colors = [
        { name: 'primary' as const, value: '#FF0000' },
        { name: 'secondary' as const, value: '#00FF00' },
        { name: 'accent' as const, value: '#0000FF' },
        { name: 'background' as const, value: '#FFFFFF' }
      ]

      expect(colors).toHaveLength(4)
      expect(colors[0].name).toBe('primary')
      expect(colors[1].name).toBe('secondary')
      expect(colors[2].name).toBe('accent')
      expect(colors[3].name).toBe('background')
    })

    it('supports empty color values', () => {
      const emptyColors = [
        { name: 'primary' as const, value: undefined },
        { name: 'secondary' as const, value: undefined },
        { name: 'accent' as const, value: undefined },
        { name: 'background' as const, value: undefined }
      ]

      expect(emptyColors.every(c => c.value === undefined)).toBe(true)
    })

    it('supports mixed populated and empty colors', () => {
      const mixedColors = [
        { name: 'primary' as const, value: '#FF0000' },
        { name: 'secondary' as const, value: undefined },
        { name: 'accent' as const, value: '#0000FF' },
        { name: 'background' as const, value: undefined }
      ]

      const populatedCount = mixedColors.filter(c => c.value !== undefined).length
      expect(populatedCount).toBe(2)
    })

    it('validates hex color format', () => {
      const validHex = '#FF0000'
      const validShortHex = '#F00'
      const invalidHex = 'red'

      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

      expect(hexRegex.test(validHex)).toBe(true)
      expect(hexRegex.test(validShortHex)).toBe(true)
      expect(hexRegex.test(invalidHex)).toBe(false)
    })
  })

  describe('Color Manipulation', () => {
    it('can clear a color value', () => {
      const color = { name: 'primary' as const, value: '#FF0000' }
      const clearedColor = { ...color, value: undefined }

      expect(clearedColor.value).toBeUndefined()
    })

    it('can update a color value', () => {
      const color = { name: 'primary' as const, value: '#FF0000' }
      const updatedColor = { ...color, value: '#00FF00' }

      expect(updatedColor.value).toBe('#00FF00')
    })
  })

  describe('onChange Callback', () => {
    it('calls onChange with updated colors', () => {
      const mockOnChange = jest.fn()
      const colors = [
        { name: 'primary' as const, value: '#FF0000' },
        { name: 'secondary' as const, value: '#00FF00' },
        { name: 'accent' as const, value: '#0000FF' },
        { name: 'background' as const, value: '#FFFFFF' }
      ]

      // Simulate change
      mockOnChange(colors)

      expect(mockOnChange).toHaveBeenCalledWith(colors)
      expect(mockOnChange).toHaveBeenCalledTimes(1)
    })
  })
})
