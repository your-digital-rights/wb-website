import colorPalettesData from '../src/data/color_palettes_original.json'
import fs from 'fs'

// Old format (used in color_palettes_original.json)
interface OldPalette {
  palette_name_en: string
  palette_name_it: string
  hex_colours: string[]
  main_colors_en: string[]
  main_colors_it: string[]
  description_en: string
  description_it: string
}

// New format (what we output)
interface Palette {
  palette_name_en: string
  palette_name_it: string
  colors: {
    background: string
    primary: string
    secondary: string
    accent: string
    additional?: string[]
  }
  main_colors_en: string[]
  main_colors_it: string[]
  description_en: string
  description_it: string
  _curation_notes?: string
}

// Helper functions
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace(/^#/, '')
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(clean)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

function getBrightness(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 128
  return Math.sqrt(0.299 * (rgb.r ** 2) + 0.587 * (rgb.g ** 2) + 0.114 * (rgb.b ** 2))
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getBrightness(hex1) / 255
  const l2 = getBrightness(hex2) / 255
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function normalizeHex(hex: string): string {
  return hex.replace(/^#/, '').toUpperCase()
}

function adjustBrightness(hex: string, targetBrightness: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const currentBrightness = getBrightness(hex)

  // Preserve hue by maintaining color ratios
  const max = Math.max(rgb.r, rgb.g, rgb.b)

  // Calculate adjustment factor more aggressively
  let factor: number

  if (targetBrightness < currentBrightness) {
    // Darkening - use squared factor for more aggressive darkening
    factor = Math.pow(targetBrightness / currentBrightness, 1.5)
  } else {
    // Lightening - use different approach
    factor = targetBrightness / currentBrightness
  }

  let newR = Math.round(rgb.r * factor)
  let newG = Math.round(rgb.g * factor)
  let newB = Math.round(rgb.b * factor)

  // Clamp values
  newR = Math.min(255, Math.max(0, newR))
  newG = Math.min(255, Math.max(0, newG))
  newB = Math.min(255, Math.max(0, newB))

  // Verify we hit the target, if not, iteratively adjust
  let result = (
    newR.toString(16).padStart(2, '0') +
    newG.toString(16).padStart(2, '0') +
    newB.toString(16).padStart(2, '0')
  ).toUpperCase()

  const resultBrightness = getBrightness(result)

  // If we're still far from target, adjust again
  if (Math.abs(resultBrightness - targetBrightness) > 10) {
    const secondFactor = targetBrightness / resultBrightness
    newR = Math.min(255, Math.max(0, Math.round(newR * secondFactor)))
    newG = Math.min(255, Math.max(0, Math.round(newG * secondFactor)))
    newB = Math.min(255, Math.max(0, Math.round(newB * secondFactor)))

    result = (
      newR.toString(16).padStart(2, '0') +
      newG.toString(16).padStart(2, '0') +
      newB.toString(16).padStart(2, '0')
    ).toUpperCase()
  }

  return result
}

function deriveContrastingColor(
  paletteColors: string[],
  background: string,
  exclude: string[],
  minContrast: number
): { color: string; isDerived: boolean; note: string; sourceColor?: string } {
  // First try palette colors
  const available = paletteColors.filter(
    (c) => !exclude.includes(c) && c !== background
  )

  // Sort by contrast
  const sorted = available
    .map((color) => ({
      color,
      contrast: getContrastRatio(color, background)
    }))
    .sort((a, b) => b.contrast - a.contrast)

  if (sorted.length > 0 && sorted[0].contrast >= minContrast) {
    return {
      color: sorted[0].color,
      isDerived: false,
      note: `From palette (${sorted[0].contrast.toFixed(2)}:1 contrast)`
    }
  }

  // Need to derive a color
  const bestPaletteColor = sorted[0]?.color || paletteColors[0]
  const bgBrightness = getBrightness(background)

  // Target brightness for good contrast
  const targetBrightness = bgBrightness > 128 ? 35 : 225

  // Adjust the best palette color towards target
  let derived = adjustBrightness(bestPaletteColor, targetBrightness)
  let contrast = getContrastRatio(derived, background)

  // If still insufficient, use pure white or black
  if (contrast < minContrast) {
    const whiteContrast = getContrastRatio('FFFFFF', background)
    const blackContrast = getContrastRatio('000000', background)

    if (whiteContrast > blackContrast && whiteContrast >= minContrast) {
      return {
        color: 'FFFFFF',
        isDerived: true,
        sourceColor: bestPaletteColor,
        note: `Pure white (${whiteContrast.toFixed(2)}:1 contrast, palette insufficient)`
      }
    } else if (blackContrast >= minContrast) {
      return {
        color: '000000',
        isDerived: true,
        sourceColor: bestPaletteColor,
        note: `Pure black (${blackContrast.toFixed(2)}:1 contrast, palette insufficient)`
      }
    }
  }

  return {
    color: derived,
    isDerived: true,
    sourceColor: bestPaletteColor,
    note: `Derived from #${bestPaletteColor} (${contrast.toFixed(2)}:1 contrast)`
  }
}

// Transform old format to new format
function transformToNewFormat(oldPalette: OldPalette): Palette {
  const hexColors = oldPalette.hex_colours
  return {
    ...oldPalette,
    colors: {
      background: hexColors[0] || '',
      primary: hexColors[1] || '',
      secondary: hexColors[2] || '',
      accent: hexColors[3] || '',
      ...(hexColors.length > 4 ? { additional: hexColors.slice(4) } : {})
    }
  }
}

function curatePalette(palette: Palette): Palette {
  // Extract colors from the new object structure
  const { background: bgColor, primary: primColor, secondary: secColor, accent: accColor, additional = [] } = palette.colors
  const colors = [bgColor, primColor, secColor, accColor, ...additional].map(normalizeHex)
  const notes: string[] = []

  // 1. Analyze palette
  const brightnesses = colors.map((c) => getBrightness(c))
  const minBrightness = Math.min(...brightnesses)
  const maxBrightness = Math.max(...brightnesses)
  const range = maxBrightness - minBrightness

  notes.push(`Brightness range: ${minBrightness.toFixed(0)}-${maxBrightness.toFixed(0)}`)

  // 2. Select background
  let background: string
  let backgroundNote: string

  if (maxBrightness > 200 && minBrightness < 100) {
    // Good range - use lightest
    const lightestIdx = brightnesses.indexOf(maxBrightness)
    background = colors[lightestIdx]
    backgroundNote = 'Lightest color (good range available)'
  } else if (maxBrightness > 200) {
    // All light colors - use lightest
    const lightestIdx = brightnesses.indexOf(maxBrightness)
    background = colors[lightestIdx]
    backgroundNote = 'Lightest color (light palette)'
  } else if (minBrightness < 80) {
    // All dark colors - use darkest
    const darkestIdx = brightnesses.indexOf(minBrightness)
    background = colors[darkestIdx]
    backgroundNote = 'Darkest color (dark palette)'
  } else {
    // Mid-range palette
    const lightestIdx = brightnesses.indexOf(maxBrightness)
    background = colors[lightestIdx]
    backgroundNote = 'Lightest available (mid-range palette)'
  }

  notes.push(`Background: #${background} - ${backgroundNote}`)

  // 3. Select primary text - try all palette colors for 4.5:1 contrast
  const primaryResult = deriveContrastingColor(colors, background, [], 4.5)
  notes.push(`Primary: #${primaryResult.color} - ${primaryResult.note}`)

  // 4. Select secondary text - try all remaining palette colors for 4.5:1 contrast
  // Exclude primary color AND its source color (if primary was derived)
  const secondaryExclude = [primaryResult.color]
  if (primaryResult.isDerived && primaryResult.sourceColor) {
    secondaryExclude.push(primaryResult.sourceColor)
  }

  const secondaryResult = deriveContrastingColor(
    colors,
    background,
    secondaryExclude,
    4.5
  )
  notes.push(`Secondary: #${secondaryResult.color} - ${secondaryResult.note}`)

  // 5. Select accent - try all remaining palette colors for 3.0:1 contrast
  // Accent should ALWAYS use a palette color (never derive)
  const accentAvailable = colors.filter(
    (c) =>
      c !== background &&
      c !== primaryResult.color &&
      c !== secondaryResult.color &&
      !primaryResult.isDerived &&
      !secondaryResult.isDerived
  )

  const accentSorted = accentAvailable
    .map((color) => ({
      color,
      contrast: getContrastRatio(color, background)
    }))
    .sort((a, b) => b.contrast - a.contrast)

  let accentResult
  if (accentSorted.length > 0) {
    accentResult = {
      color: accentSorted[0].color,
      isDerived: false,
      note: `From palette (${accentSorted[0].contrast.toFixed(2)}:1 contrast)`
    }
  } else {
    // Fallback to any unused palette color
    const unused = colors.find(
      (c) => c !== background && c !== primaryResult.color && c !== secondaryResult.color
    )
    accentResult = {
      color: unused || colors[0],
      isDerived: false,
      note: `From palette (best available)`
    }
  }
  notes.push(`Accent: #${accentResult.color} - ${accentResult.note}`)

  // 6. Build reordered array - maintain original palette size, no duplicates
  const reordered: string[] = []
  const usedColors = new Set<string>()
  const usedOriginalColors = new Set<string>()

  // Helper to add a color without duplicates
  const addColor = (color: string, isDerived: boolean) => {
    if (!usedColors.has(color)) {
      reordered.push(color)
      usedColors.add(color)
      if (!isDerived) {
        usedOriginalColors.add(color)
      }
    }
  }

  // Add in order: background, primary, secondary, accent
  addColor(background, false)
  addColor(primaryResult.color, primaryResult.isDerived)
  addColor(secondaryResult.color, secondaryResult.isDerived)
  addColor(accentResult.color, accentResult.isDerived)

  // Add remaining original palette colors (not already used)
  for (const color of colors) {
    if (!usedColors.has(color) && reordered.length < colors.length) {
      addColor(color, false)
    }
  }

  // Ensure we maintain exact original palette length
  if (reordered.length !== colors.length) {
    notes.push(`WARNING: Length mismatch - original: ${colors.length}, reordered: ${reordered.length}`)
  }

  // Build new colors object from reordered array
  const newColors = {
    background: reordered[0],
    primary: reordered[1],
    secondary: reordered[2],
    accent: reordered[3],
    ...(reordered.length > 4 ? { additional: reordered.slice(4) } : {})
  }

  return {
    ...palette,
    colors: newColors,
    _curation_notes: notes.join('; ')
  }
}

// Process all palettes
const oldPalettes = colorPalettesData as OldPalette[]
const transformedPalettes = oldPalettes.map(transformToNewFormat)
const curated = transformedPalettes.map(curatePalette)

// Validation - check contrast ratios
console.log('\n🎨 PALETTE CURATION VALIDATION\n')
console.log('Minimum contrast: Primary 4.5:1, Secondary 4.5:1, Accent 3.0:1 (WCAG AA)')
console.log('='.repeat(80))

let passCount = 0
let failCount = 0

curated.forEach((palette) => {
  const { background: bg, primary, secondary, accent } = palette.colors

  const primaryContrast = getContrastRatio(primary, bg)
  const secondaryContrast = getContrastRatio(secondary, bg)
  const accentContrast = getContrastRatio(accent, bg)

  const primaryPass = primaryContrast >= 4.5
  const secondaryPass = secondaryContrast >= 4.5
  const accentPass = accentContrast >= 3.0

  const allPass = primaryPass && secondaryPass && accentPass

  if (allPass) passCount++
  else failCount++

  console.log(`\n${allPass ? '✅' : '❌'} ${palette.palette_name_en}`)
  console.log(`   Primary: ${primaryContrast.toFixed(2)}:1 ${primaryPass ? '✅' : '❌'}`)
  console.log(`   Secondary: ${secondaryContrast.toFixed(2)}:1 ${secondaryPass ? '✅' : '❌'}`)
  console.log(`   Accent: ${accentContrast.toFixed(2)}:1 ${accentPass ? '✅' : '❌'}`)
  console.log(`   ${palette._curation_notes}`)
})

console.log('\n' + '='.repeat(80))
console.log(`\n✅ PASS: ${passCount}/${curated.length}`)
console.log(`❌ FAIL: ${failCount}/${curated.length}`)

// Write output
const outputPath = './src/data/color_palettes_curated.json'
fs.writeFileSync(outputPath, JSON.stringify(curated, null, 2))
console.log(`\n📝 Curated palettes written to: ${outputPath}`)
