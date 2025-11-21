/**
 * Color Palettes Library
 *
 * This module processes color palettes from src/data/color_palettes.json
 *
 * IMPORTANT: Color Order in color_palettes.json
 * ===============================================
 * The hex_colours array in each palette follows this order:
 *
 * Index 0: Background color (lightest color, usually neutral)
 * Index 1: Primary color (main brand color)
 * Index 2: Secondary color (supporting brand color)
 * Index 3: Accent color (highlight/call-to-action color)
 * Index 4+: Additional colors (optional)
 *
 * Example:
 * "hex_colours": [
 *   "FDF0D5",  // Index 0: Background (Cream)
 *   "003049",  // Index 1: Primary (Navy)
 *   "780000",  // Index 2: Secondary (Dark red)
 *   "C1121F",  // Index 3: Accent (Bright red)
 *   "669BBC"   // Index 4: Additional (Sky blue)
 * ]
 *
 * This order is preserved when saving to the database as colorPalette array.
 */
import colorPalettesData from '@/data/color_palettes.json'

interface Color {
  name: string
  hex: string
}

export interface ColorPaletteOption {
  id: string
  name: string
  description?: string
  category?: string
  colors: Color[]
  preview?: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  tags?: string[]
}

interface RawPalette {
  palette_name_en: string
  palette_name_it: string
  hex_colours: string[]
  main_colors_en: string[]
  main_colors_it: string[]
  description_en: string
  description_it: string
}

/**
 * Converts a hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace(/^#/, '')
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

/**
 * Calculate perceived brightness of a color
 * Returns value between 0 (dark) and 255 (light)
 */
function getPerceivedBrightness(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 128

  // Using perceived brightness formula
  return Math.sqrt(
    0.299 * (rgb.r * rgb.r) + 0.587 * (rgb.g * rgb.g) + 0.114 * (rgb.b * rgb.b)
  )
}

/**
 * Generate contrasting text color (black or white) for a background
 */
function getContrastingTextColor(backgroundHex: string): string {
  const brightness = getPerceivedBrightness(backgroundHex)
  // If background is bright, use dark text, otherwise use light text
  return brightness > 128 ? '#111827' : '#ffffff'
}

/**
 * Create a slugified ID from a palette name
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim()
}

/**
 * Ensure hex color has # prefix
 */
function normalizeHex(hex: string): string {
  return hex.startsWith('#') ? hex : `#${hex}`
}

/**
 * Get color palettes based on current locale
 */
export function getColorPalettes(locale: string = 'en'): ColorPaletteOption[] {
  const isItalian = locale === 'it'

  return (colorPalettesData as RawPalette[]).map((palette) => {
    // Normalize hex colors (add # prefix if missing)
    const hexColors = palette.hex_colours.map(normalizeHex)

    // Get localized color names
    const colorNames = isItalian ? palette.main_colors_it : palette.main_colors_en

    // Create colors array by pairing hex colors with names
    // If we have more colors than names, use generic names
    const colors: Color[] = hexColors.map((hex, index) => ({
      name: colorNames[index] || `Color ${index + 1}`,
      hex
    }))

    // Generate preview colors using curated order
    // Palettes are pre-ordered: [background, primary, secondary, accent, ...others]
    const preview = {
      primary: hexColors[1] || hexColors[0], // Primary text (or fallback to first color)
      secondary: hexColors[2] || hexColors[1] || hexColors[0], // Secondary text
      accent: hexColors[3] || hexColors[2] || hexColors[1] || hexColors[0], // Accent
      background: hexColors[0], // Background
      text: getContrastingTextColor(hexColors[0])
    }

    return {
      id: slugify(palette.palette_name_en),
      name: isItalian ? palette.palette_name_it : palette.palette_name_en,
      description: isItalian ? palette.description_it : palette.description_en,
      colors,
      preview,
      tags: colorNames
    }
  })
}
