# Adding a New Locale to WhiteBoar

This document provides step-by-step instructions for adding a new language/locale to the WhiteBoar website, based on the experience of adding Polish (pl) localization.

## Overview

The WhiteBoar website uses `next-intl` for internationalization. Adding a new locale involves:

1. Creating the translation file
2. Updating i18n configuration
3. Updating UI components (navigation, language switcher)
4. Testing the implementation
5. Fixing any issues (special characters, test selectors)

## Prerequisites

- Access to the codebase
- Knowledge of the target language (or access to a native speaker for review)
- Development environment set up (`pnpm install`)

## Step-by-Step Instructions

### Step 1: Create the Translation File

1. Copy an existing translation file as a base:
   ```bash
   cp src/messages/en.json src/messages/{locale}.json
   ```

   For example, for Polish:
   ```bash
   cp src/messages/en.json src/messages/pl.json
   ```

2. Translate all strings in the new file. Key sections include:
   - `nav` - Navigation labels
   - `hero` - Homepage hero section
   - `steps` - Onboarding step descriptions
   - `pricing` - Pricing page content
   - `onboarding` - All onboarding form labels, placeholders, and validation messages
   - `common` - Common UI elements (buttons, labels)
   - `footer` - Footer content

3. **Important**: Ensure proper use of special characters/diacritics for the language:
   - Polish: ą, ć, ę, ł, ń, ó, ś, ź, ż
   - Italian: à, è, é, ì, ò, ù
   - German: ä, ö, ü, ß
   - French: é, è, ê, ë, à, â, ç, ô, û, ù, î, ï

4. Validate the JSON syntax:
   ```bash
   node -e "require('./src/messages/{locale}.json'); console.log('JSON valid')"
   ```

### Step 2: Update i18n Configuration

1. Edit `src/i18n/routing.ts`:
   ```typescript
   export const locales = ['en', 'it', 'pl', '{new-locale}'] as const;
   ```

2. Edit `src/i18n/request.ts` to import the new messages:
   ```typescript
   import plMessages from '@/messages/pl.json';
   // Add your new locale import

   const messages: Record<Locale, typeof enMessages> = {
     en: enMessages,
     it: itMessages,
     pl: plMessages,
     // Add your new locale
   };
   ```

### Step 3: Update Navigation Components

1. Edit `src/messages/en.json` (and all other locale files) to add the new language name:
   ```json
   "nav": {
     "language": {
       "english": "English",
       "italian": "Italian",
       "polish": "Polish",
       "{new-locale}": "{Language Name}"
     }
   }
   ```

2. Update the language switcher in `src/components/Navigation.tsx`:
   ```typescript
   const languages = [
     { code: 'en', name: t('nav.language.english') },
     { code: 'it', name: t('nav.language.italian') },
     { code: 'pl', name: t('nav.language.polish') },
     // Add new locale
   ];
   ```

3. If there's a mobile navigation component, update it similarly.

### Step 4: Update Metadata

1. Edit `src/app/[locale]/layout.tsx` to include the new locale in metadata generation if needed.

2. Ensure the locale is properly handled in `generateStaticParams()` if using static generation.

### Step 5: Test the Implementation

#### 5.1 Local Development Testing

1. Start the development server:
   ```bash
   PORT=3783 pnpm dev
   ```

2. Test the new locale URL:
   - Navigate to `http://localhost:3783/{locale}` (e.g., `http://localhost:3783/pl`)
   - Verify all text is translated
   - Test language switching in the navigation

3. Test key flows:
   - Homepage rendering
   - Navigation and language switcher
   - Onboarding flow (all steps)
   - Form validation messages
   - Error messages

#### 5.2 Update E2E Tests

1. Add language switching test in `src/__tests__/e2e/home.spec.ts`:
   ```typescript
   test('language switching to {Language} works', async ({ page }) => {
     await page.goto('/');

     // Open language menu and select new locale
     await page.getByRole('button', { name: /language/i }).click();
     await page.getByRole('menuitem', { name: '{Language Name}' }).click();

     // Verify URL changed
     await expect(page).toHaveURL('/{locale}');

     // Verify translated content appears
     await expect(page.getByRole('heading', { level: 1 })).toContainText('{Translated Hero Title}');
   });
   ```

2. Run E2E tests:
   ```bash
   PORT=3783 pnpm exec playwright test --reporter=line --project=chromium
   ```

#### 5.3 Run Full Test Suite

```bash
# Unit tests
pnpm test

# Lint
pnpm lint

# Build (catches TypeScript errors)
pnpm build

# E2E tests
PORT=3783 pnpm test:e2e --reporter=line
```

### Step 6: Common Issues and Fixes

#### Issue: Missing or Incorrect Diacritics

If translation was done without proper diacritics (common with AI translations), use sed to fix:

```bash
# Example for Polish diacritics
sed -i '' \
  -e 's/Uslug/Usług/g' \
  -e 's/Wojewodztwo/Województwo/g' \
  -e 's/sie /się /g' \
  src/messages/pl.json

# Validate JSON after fixes
node -e "require('./src/messages/pl.json'); console.log('JSON valid')"
```

#### Issue: E2E Tests Failing After UI Changes

If you've changed component structure (e.g., `<button>` to `<div>` with ARIA roles), update test selectors:

```typescript
// Before (if using button)
const radioButtons = page.locator('button[role="radio"]');

// After (if changed to div)
const radioButtons = page.locator('input[type="radio"], button[role="radio"], div[role="radio"]');
```

#### Issue: Hydration Errors

If you see hydration errors related to nested elements:
- Ensure no `<div>` elements are inside `<button>` elements
- Use `<span>` instead of `<div>` for inline content within buttons
- Check the browser console for specific hydration mismatch messages

### Step 7: Commit and Push

1. Stage all changes:
   ```bash
   git add src/messages/{locale}.json
   git add src/i18n/routing.ts
   git add src/i18n/request.ts
   git add src/components/Navigation.tsx
   git add src/__tests__/e2e/home.spec.ts
   ```

2. Commit with descriptive message:
   ```bash
   git commit -m "Add {Language} localization

   - Add {locale}.json translation file
   - Update i18n configuration
   - Add language switcher option
   - Add E2E test for language switching"
   ```

3. Push and monitor CI:
   ```bash
   git push
   gh run list --limit 3  # Monitor CI status
   ```

## File Reference

| File | Purpose |
|------|---------|
| `src/messages/{locale}.json` | Translation strings |
| `src/i18n/routing.ts` | Locale configuration |
| `src/i18n/request.ts` | Message loading |
| `src/components/Navigation.tsx` | Language switcher UI |
| `src/__tests__/e2e/home.spec.ts` | Language switching tests |

## Checklist

- [ ] Translation file created with all strings
- [ ] Special characters/diacritics correct
- [ ] JSON syntax validated
- [ ] i18n routing updated
- [ ] i18n request updated
- [ ] Navigation language list updated
- [ ] All locale files have new language name
- [ ] E2E test added for language switching
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Build succeeds
- [ ] Manual testing completed
- [ ] Native speaker review (recommended)
- [ ] CI passes after push

## Tips

1. **Use a native speaker** for final review - AI translations often miss nuances and diacritics
2. **Test the entire onboarding flow** in the new language - form validation messages are critical
3. **Check tooltips and error messages** - these are often overlooked
4. **Verify date/number formats** if applicable to the locale
5. **Run Playwright with `--reporter=line`** to avoid the HTML reporter pausing at the end
