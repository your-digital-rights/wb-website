/**
 * Color Palettes Library
 *
 * This module processes color palettes from src/data/color_palettes.json
 *
 * IMPORTANT: Color Structure in color_palettes.json
 * ==================================================
 * Each palette has a "colors" object with explicit properties:
 *
 * {
 *   "background": "FDF0D5",  // Background color (lightest, usually neutral)
 *   "primary": "003049",     // Primary color (main brand color)
 *   "secondary": "780000",   // Secondary color (supporting brand color)
 *   "accent": "C1121F",      // Accent color (highlight/call-to-action color)
 *   "additional": ["669BBC"] // Additional colors (optional array)
 * }
 *
 * This explicit structure is self-documenting and preserved when saving
 * to the database as colorPalette array: [background, primary, secondary, accent, ...additional]
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
  palette_name_pl: string
  colors: {
    background: string
    primary: string
    secondary: string
    accent: string
    additional?: string[]
  }
  main_colors_en: string[]
  main_colors_it: string[]
  main_colors_pl: string[]
  description_en: string
  description_it: string
  description_pl: string
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
 * Get localized palette name based on locale
 */
function getLocalizedName(palette: RawPalette, locale: string): string {
  switch (locale) {
    case 'it':
      return palette.palette_name_it
    case 'pl':
      return palette.palette_name_pl
    default:
      return palette.palette_name_en
  }
}

/**
 * Get localized description based on locale
 */
function getLocalizedDescription(palette: RawPalette, locale: string): string {
  switch (locale) {
    case 'it':
      return palette.description_it
    case 'pl':
      return palette.description_pl
    default:
      return palette.description_en
  }
}

/**
 * Get localized color names based on locale
 */
function getLocalizedColorNames(palette: RawPalette, locale: string): string[] {
  switch (locale) {
    case 'it':
      return palette.main_colors_it
    case 'pl':
      return palette.main_colors_pl
    default:
      return palette.main_colors_en
  }
}

/**
 * Get color palettes based on current locale
 */
export function getColorPalettes(locale: string = 'en'): ColorPaletteOption[] {
  return (colorPalettesData as RawPalette[]).map((palette) => {
    // Extract colors from the new object structure
    const { background, primary, secondary, accent, additional = [] } = palette.colors

    // Build array of hex colors in order: [background, primary, secondary, accent, ...additional]
    const hexColors = [
      normalizeHex(background),
      normalizeHex(primary),
      normalizeHex(secondary),
      normalizeHex(accent),
      ...additional.map(normalizeHex)
    ]

    // Get localized color names
    const colorNames = getLocalizedColorNames(palette, locale)

    // Create colors array by pairing hex colors with names
    // If we have more colors than names, use generic names
    const colors: Color[] = hexColors.map((hex, index) => ({
      name: colorNames[index] || `Color ${index + 1}`,
      hex
    }))

    // Generate preview colors using explicit structure
    const preview = {
      background: normalizeHex(background),
      primary: normalizeHex(primary),
      secondary: normalizeHex(secondary),
      accent: normalizeHex(accent),
      text: getContrastingTextColor(background)
    }

    return {
      id: slugify(palette.palette_name_en),
      name: getLocalizedName(palette, locale),
      description: getLocalizedDescription(palette, locale),
      colors,
      preview,
      tags: colorNames
    }
  })
}
