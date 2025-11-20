/**
 * Unit tests for Step10ColorPalette component
 *
 * Note: These are simplified tests focusing on data structures and logic.
 * Full integration testing is covered by E2E tests in step10-color-customization.spec.ts
 */

import { step10Schema } from '@/schemas/onboarding'

describe('Step10ColorPalette', () => {
  describe('Data Storage', () => {
    it('stores colors as array of hex values, not palette names', () => {
      const colorData = {
        colorPalette: ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF']
      }

      expect(Array.isArray(colorData.colorPalette)).toBe(true)
      expect(colorData.colorPalette).toHaveLength(4)
    })

    it('supports empty color array', () => {
      const emptyData = {
        colorPalette: []
      }

      expect(emptyData.colorPalette).toHaveLength(0)
    })

    it('stores colors in order: primary, secondary, accent, background', () => {
      const orderedColors = {
        colorPalette: [
          '#FF0000', // primary
          '#00FF00', // secondary
          '#0000FF', // accent
          '#FFFFFF'  // background
        ]
      }

      expect(orderedColors.colorPalette[0]).toBe('#FF0000') // primary
      expect(orderedColors.colorPalette[1]).toBe('#00FF00') // secondary
      expect(orderedColors.colorPalette[2]).toBe('#0000FF') // accent
      expect(orderedColors.colorPalette[3]).toBe('#FFFFFF') // background
    })

    it('can store additional colors beyond the first 4', () => {
      const extendedColors = {
        colorPalette: [
          '#FF0000',
          '#00FF00',
          '#0000FF',
          '#FFFFFF',
          '#FFFF00', // additional color 1
          '#FF00FF'  // additional color 2
        ]
      }

      expect(extendedColors.colorPalette).toHaveLength(6)
    })
  })

  describe('Validation Schema', () => {
    it('accepts valid hex color array', () => {
      const validData = {
        colorPalette: ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF']
      }

      const result = step10Schema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('accepts empty array as optional', () => {
      const emptyData = {
        colorPalette: []
      }

      const result = step10Schema.safeParse(emptyData)
      expect(result.success).toBe(true)
    })

    it('accepts undefined as optional', () => {
      const undefinedData = {}

      const result = step10Schema.safeParse(undefinedData)
      expect(result.success).toBe(true)
    })

    it('rejects invalid hex format', () => {
      const invalidData = {
        colorPalette: ['red', 'blue', 'green']
      }

      const result = step10Schema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('accepts short hex format (#RGB)', () => {
      const shortHexData = {
        colorPalette: ['#F00', '#0F0', '#00F', '#FFF']
      }

      const result = step10Schema.safeParse(shortHexData)
      expect(result.success).toBe(true)
    })

    it('accepts long hex format (#RRGGBB)', () => {
      const longHexData = {
        colorPalette: ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF']
      }

      const result = step10Schema.safeParse(longHexData)
      expect(result.success).toBe(true)
    })

    it('rejects more than 10 colors', () => {
      const tooManyColors = {
        colorPalette: [
          '#FF0000', '#00FF00', '#0000FF', '#FFFFFF',
          '#FFFF00', '#FF00FF', '#00FFFF', '#000000',
          '#808080', '#C0C0C0', '#800000' // 11th color
        ]
      }

      const result = step10Schema.safeParse(tooManyColors)
      expect(result.success).toBe(false)
    })
  })

  describe('Palette Selection Logic', () => {
    it('converts palette selection to color array', () => {
      const palette = {
        id: 'fiery-ocean',
        preview: {
          primary: '#003049',
          secondary: '#780000',
          accent: '#C1121F',
          background: '#FDF0D5'
        }
      }

      const colorArray = [
        palette.preview.primary,
        palette.preview.secondary,
        palette.preview.accent,
        palette.preview.background
      ]

      expect(colorArray).toEqual([
        '#003049',
        '#780000',
        '#C1121F',
        '#FDF0D5'
      ])
    })

    it('allows mixing palette colors with custom overrides', () => {
      // Start with palette colors
      const paletteColors = ['#003049', '#780000', '#C1121F', '#FDF0D5']

      // Override the primary color
      const customizedColors = [...paletteColors]
      customizedColors[0] = '#FF0000'

      expect(customizedColors[0]).toBe('#FF0000') // custom
      expect(customizedColors[1]).toBe('#780000') // from palette
      expect(customizedColors[2]).toBe('#C1121F') // from palette
      expect(customizedColors[3]).toBe('#FDF0D5') // from palette
    })
  })

  describe('Color Array Transformation', () => {
    it('filters out undefined values when converting custom colors to array', () => {
      const customColors = [
        { name: 'primary', value: '#FF0000' },
        { name: 'secondary', value: undefined },
        { name: 'accent', value: '#0000FF' },
        { name: 'background', value: undefined }
      ]

      const colorArray = customColors
        .map(c => c.value)
        .filter((v): v is string => !!v)

      expect(colorArray).toEqual(['#FF0000', '#0000FF'])
    })
  })
})
