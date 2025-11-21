#!/usr/bin/env node

/**
 * Transform color_palettes.json from array-based to object-based color structure
 *
 * OLD FORMAT:
 * "hex_colours": ["FDF0D5", "003049", "780000", "C1121F", "669BBC"]
 *
 * NEW FORMAT:
 * "colors": {
 *   "background": "FDF0D5",
 *   "primary": "003049",
 *   "secondary": "780000",
 *   "accent": "C1121F",
 *   "additional": ["669BBC"]
 * }
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../src/data/color_palettes.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/color_palettes.json');
const BACKUP_FILE = path.join(__dirname, '../src/data/color_palettes.json.backup');

// Read the current JSON file
console.log('Reading color_palettes.json...');
const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

// Create backup
console.log('Creating backup...');
fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2));

// Transform each palette
console.log(`Transforming ${data.length} palettes...`);
const transformedData = data.map((palette, index) => {
  if (!palette.hex_colours || !Array.isArray(palette.hex_colours)) {
    console.warn(`Warning: Palette ${index} missing hex_colours array`);
    return palette;
  }

  const hexColors = palette.hex_colours;

  // Build new colors object
  const colors = {
    background: hexColors[0] || '',
    primary: hexColors[1] || '',
    secondary: hexColors[2] || '',
    accent: hexColors[3] || ''
  };

  // Add additional colors if present (index 4 and beyond)
  if (hexColors.length > 4) {
    colors.additional = hexColors.slice(4);
  }

  // Remove old hex_colours property and add new colors property
  const { hex_colours, ...rest } = palette;

  return {
    ...rest,
    colors
  };
});

// Write the transformed data
console.log('Writing transformed data...');
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(transformedData, null, 2));

console.log('✓ Transformation complete!');
console.log(`  - Transformed: ${transformedData.length} palettes`);
console.log(`  - Backup saved: ${BACKUP_FILE}`);
console.log(`  - New file: ${OUTPUT_FILE}`);
