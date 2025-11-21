CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**WhiteBoar** is an AI-driven digital agency homepage built with Next.js 15+, featuring modern web standards and multilingual support. This is a production-ready website implementing the business requirements outlined in `context/whiteboar-business-overview.md`.

## **CRITICAL** rules that must always be followed:
- **Always** Follow User Instructions Precisely.
- **Always** Create full and complete implementation,
- **Never** create partial implementations. Take your time.
- **NEVER deviate** from explicit user requests without asking for permission.
- **ALWAYS ask for confirmation** before changing scope or approach
- **Never** commit code without permission.
- **Never** implement a fix without validating your assumptios first.
- **Always** - Validate every fix. If it's UI effecting use Playwrite MCP.
- Always use port 3783 for the development server
- **Always** - run playright MCP after making changes to the UI to ensure that the changes are as intended. Check both light and dark themes. Check mobile and desktop layouts.
- **NEVER make business logic decisions** - Do not assume or implement business rules (pricing, discounts, subscription behavior, payment flows, access control, etc.) without explicit user confirmation. When encountering ambiguous business scenarios, ALWAYS ask the user for clarification before implementing.
- **NEVER edit .env files** - Environment variables are managed by Vercel. Never modify `.env` or `.env.development.locsl`. If environment variables need to be changed, inform the user to update them manually or through Vercel dashboard.
- **NEVER** skip tests.
- **BREAK DOWN** complex requests and confirm each part before proceeding
- **FOCUS ONLY** on the specific task requested - ignore distracting background processes
- **SEQUENTIAL EXECUTION** - when asked to validate "ALL steps", go through each step 1→2→3→4... systematically, never skip or jump around
- **Don't** use emoticons.
- **IMPORTANT**: Multiple people work on this codebase. All changes in git diff are relevant - never assume changes are unrelated or suggest reverting them without understanding their purpose first. Always check with the user before reverting any changes.
## Rules:
- **Never** INCREASE TEST TIMEOUTS!
- **Never** ASSUME TESTS ARE FAILING DUE TO TIMEING ISSUES!
- **Alwyas** Commit all changes.
- **Alwyas** Never git reset without permission.


## Development Commands
- `PORT=3783 pnpm dev` - Start development server (**ALWAYS use port 3783**)
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:css` - Run Stylelint on CSS files
- `pnpm test` - Run Jest unit tests
- `pnpm test:watch` - Run Jest in watch mode
- `pnpm test:e2e` - Run Playwright e2e tests

## Architecture & Tech Stack

### Core Technologies
- **Next.js 15+** with app directory and TypeScript
- **next-intl** for internationalization (EN/IT)
- **shadcn/ui** components with Radix UI primitives
- **Tailwind CSS** with custom design tokens
- **Framer Motion** for animations with reduced motion support

### Project Structure
```
├── app/[locale]/          # Internationalized pages (EN default, /it for Italian)
├── components/            # React components (Navigation, Hero, etc.)
│   └── ui/               # shadcn/ui base components
├── lib/                  # Utilities and configuration
├── messages/             # i18n translation files
├── context/              # project specification and including the design system for AI agents
├── __tests__/           # Jest and Playwright tests
└── public/              # Static assets
```

## Key Implementation Details

### Design System Integration
- Uses existing `context/design-system/tokens.css` as single source of truth
- All colors, spacing, typography defined as CSS custom properties
- Tailwind config consumes design tokens via `--wb-*` variables
- Theme switching via localStorage with system preference fallback
- Framer motion for animations

### Internationalization
- Default locale: English (`/`)
- Italian: `/it` URL prefix
- All text content in `messages/en.json` and `messages/it.json`
- Server-side translations with `getTranslations()` for metadata

### Component Architecture
- Each major section is its own component file
- shadcn/ui components customized with WhiteBoar design tokens
- Framer Motion animations with `useReducedMotion()` support
- Keyboard navigation and focus management throughout

### Performance Requirements (from context/CONTEXT.md)
- Largest Contentful Paint ≤ 1.8s
- Cumulative Layout Shift < 0.1
- No unused JS > 50KB
- Images optimized with Next.js Image component

### Accessibility Standards
- WCAG AA compliance with axe-core testing
- Keyboard navigation with `focus-visible:outline-accent`
- Proper heading hierarchy and semantic HTML
- Screen reader support with ARIA labels

## Testing Strategy

### Unit Tests (Jest + RTL)
- All components tested for rendering and user interactions
- Theme switching and language selection functionality
- Accessibility attributes and keyboard navigation
- Located in `__tests__/components/`

### E2E Tests (Playwright)
- Homepage loading and navigation
- Language switching (`/` ↔ `/it`)
- Theme toggle (light/dark/system)
- Pricing plan selection flow
- Performance metrics (LCP, CLS)
- Accessibility validation with axe-core
- Located in `__tests__/e2e/`

#### Playwright Best Practices
- **CRITICAL**: Always clear localStorage when using Playwright to avoid test inconsistencies
- Tests use fresh browser contexts with `storageState: undefined` in playwright.config.ts
- Use `ensureFreshOnboardingState(page)` helper to ensure clean test state
- The onboarding flow uses localStorage persistence which can cause auto-navigation to previous steps
- Always use the restart button functionality to reset state between test runs
- **ALWAYS use `--reporter=line`** when running Playwright tests - the default HTML reporter pauses execution at the end, making tests appear stuck

## Important Files

- `app/[locale]/page.tsx:25` - Main homepage component assembly
- `components/Navigation.tsx:15` - Glass-morphic sticky navigation
- `components/Hero.tsx:25` - Full-viewport hero with Framer Motion
- `components/PricingTable.tsx:35` - Two-tier pricing (€40/month, €5,000+)
- `lib/i18n.ts` - Internationalization configuration
- `messages/en.json` - English translations
- `messages/it.json` - Italian translations

## Development Guidelines

- **Never use hard-coded colors** - always reference CSS custom properties
- **Maintain design token consistency** - use `--wb-*` variables only
- **Test accessibility** - run `pnpm test:e2e` before commits
- **Keep translations in sync** - update both `en.json` and `it.json`
- **Follow component patterns** - use existing shadcn/ui + design tokens approach
- **Performance first** - validate LCP and CLS requirements with tests

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/test.yml`) runs:
1. ESLint code quality checks
2. Jest unit tests with coverage
3. Next.js production build
4. Playwright e2e tests including performance validation
5. Accessibility testing with axe-core

## Critical Instructions for AI Agents

### Phase-Based Work Instructions
- When user specifies "Phase 1 only" or specific phases, **STOP** after completing that phase
- **DO NOT** automatically proceed to subsequent phases without explicit user approval
- **DO NOT** run additional tests or processes beyond what was specifically requested

### Manual Testing with Playwright MCP
- When asked to test "end-to-end" or "all steps", use Playwright MCP to go through EVERY step sequentially
- **NEVER jump** from step 3 to step 7 - validate steps 4, 5, 6 in between
- **COMPLETE THE FULL FLOW** from start to finish when requested
- Document each step's validation results clearly
