# Data Files Documentation

## color_palettes.json

This file contains curated color palettes for the onboarding flow (Step 10).

### Structure

Each palette object has the following structure:

```json
{
  "palette_name_en": "English name",
  "palette_name_it": "Italian name",
  "hex_colours": ["COLOR1", "COLOR2", "COLOR3", "COLOR4", "COLOR5"],
  "main_colors_en": ["Color 1 name", "Color 2 name", ...],
  "main_colors_it": ["Nome colore 1", "Nome colore 2", ...],
  "description_en": "English description",
  "description_it": "Italian description"
}
```

### IMPORTANT: hex_colours Array Order

The `hex_colours` array follows a specific semantic order:

- **Index 0**: Background color (lightest color, usually neutral)
- **Index 1**: Primary color (main brand color)
- **Index 2**: Secondary color (supporting brand color)
- **Index 3**: Accent color (highlight/call-to-action color)
- **Index 4+**: Additional colors (optional)

### Example

```json
{
  "palette_name_en": "Fiery Ocean",
  "hex_colours": [
    "FDF0D5",  // Index 0: Background (Cream)
    "003049",  // Index 1: Primary (Navy)
    "780000",  // Index 2: Secondary (Dark red)
    "C1121F",  // Index 3: Accent (Bright red)
    "669BBC"   // Index 4: Additional (Sky blue)
  ]
}
```

### Database Storage

When a palette is selected during onboarding, the colors are saved to the database in the **same order** as they appear in the JSON file:

```javascript
colorPalette: ["#FDF0D5", "#003049", "#780000", "#C1121F", "#669BBC"]
//              ↑           ↑         ↑          ↑          ↑
//              BG          Primary   Secondary  Accent     Additional
```

This order is preserved throughout the application to ensure consistency between the source data and stored values.

### Adding New Palettes

When adding new palettes, ensure:

1. The `hex_colours` array follows the order: [background, primary, secondary, accent, ...additional]
2. The background (index 0) is typically the lightest/neutral color
3. The primary (index 1) is the main brand color
4. All hex values are uppercase without the `#` prefix
5. Both English and Italian names/descriptions are provided
