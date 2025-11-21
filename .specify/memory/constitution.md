<!--
Sync Impact Report:
Version: 1.0.0 → 1.1.0 (Amendment: Onboarding learnings integrated)
Modified Principles: N/A
Added Principles:
  - VIII. Session & State Management (localStorage versioning, migration, cleanup)
  - IX. Backward Compatibility & Migration (schema changes, rollback procedures)
Added Sections:
  - Development Workflow Rules (single server rule, port conflict prevention)
  - Conversion Metrics (completion rates, time targets, mobile completion)
Modified Sections:
  - Compliance Review: Added 3 new checklist items for state, migration, and conversion metrics
Templates Status:
  - ✅ plan-template.md: Constitution Check updated with Principles VIII & IX, version footer updated
  - ✅ spec-template.md: No changes needed
  - ✅ tasks-template.md: No changes needed
  - ✅ commands/*.md: No changes needed (principles apply at implementation)
Follow-up TODOs: None
-->

# WhiteBoar Website Constitution

## Core Principles

### I. User-First Design
Every feature MUST prioritize small business owners' needs over technical elegance. The platform targets users with limited time, budget, and technical expertise. All UX decisions MUST eliminate jargon, minimize friction, and deliver immediate value. Features that require technical knowledge to operate are prohibited unless absolutely necessary for the business model. The UX must be top world class.

**Rationale**: WhiteBoar's core value proposition is "no jargon, no hassle, just results" for small businesses. Complex interfaces or technical requirements directly undermine this promise and reduce market fit.

### II. AI-Driven Automation
All feature implementations MUST leverage AI automation where human input can be eliminated or reduced. Manual processes are acceptable only when AI cannot reliably deliver quality results or when user input is legally/strategically required (e.g., business information, brand preferences). Features that add manual workflows without clear justification violate this principle.

**Rationale**: The platform's competitive advantage is end-to-end automation from onboarding to deployment. Manual processes increase support costs, reduce scalability, and weaken the "live in days, not months" promise.

### III. International-Ready by Default
All user-facing content MUST use `next-intl` with complete translations in both English and Italian. No hard-coded strings in components. All new features MUST include translation keys in both `messages/en.json` and `messages/it.json`. URL structure MUST maintain `/` for English and `/it` for Italian. Server-side translations MUST use `getTranslations()` for metadata and SEO.

**Rationale**: WhiteBoar targets Italy first, then Europe, then worldwide. Building multilingual support retroactively is expensive and error-prone. International readiness from day one is a core business requirement, not a feature.

### IV. Performance & Web Standards (NON-NEGOTIABLE)
All features MUST meet these thresholds before merging:
- Largest Contentful Paint ≤ 1.8s (mobile Lighthouse)
- Cumulative Layout Shift < 0.1
- No unused JavaScript bundles > 50KB
- All images MUST use Next.js `<Image>` with `alt` attributes (localized)
- Playwright e2e tests MUST validate LCP and CLS using `web-vitals` library

**Rationale**: These are contractual requirements from `context/index.md`. Poor performance directly impacts SEO rankings and user trust. Mobile-first performance is critical for small business customers accessing the site from smartphones.

### V. Accessibility Standards (NON-NEGOTIABLE)
All features MUST pass axe-core validation with zero critical issues. Keyboard navigation MUST work for all interactive elements using `focus-visible:outline-accent`. Semantic HTML and proper heading hierarchy are mandatory. All ARIA labels MUST be localized. Screen reader testing MUST be included in Playwright e2e suites.

**Rationale**: WCAG AA compliance is legally required in many European markets and morally essential. Accessibility improves SEO and expands market reach to users with disabilities.

### VI. Design System Consistency
All styling MUST use CSS custom properties from `context/design-system/tokens.css`. Hard-coded color values, spacing, or typography are prohibited. Tailwind configuration MUST consume `--wb-*` variables only. All shadcn/ui components MUST be customized using design tokens. Theme switching (light/dark) MUST use localStorage with system preference fallback.

**Rationale**: The design system is the single source of truth for WhiteBoar's brand identity. Inconsistent styling creates maintenance debt and dilutes brand recognition. CSS custom properties enable theme switching and brand evolution without code changes.

### VII. Test-Driven Development
Tests MUST be written before implementation:
1. Unit tests (Jest + React Testing Library) for all components covering rendering, interactions, accessibility attributes, and keyboard navigation
2. Integration tests for multi-component flows (e.g., pricing plan selection)
3. E2E tests (Playwright) for critical user journeys including language switching, theme toggling, and performance validation

Red-Green-Refactor cycle is mandatory. Features without passing tests cannot be merged.

**Rationale**: TDD ensures features meet specifications, reduces regression bugs, and provides living documentation. E2E tests validate contractual requirements (performance, accessibility) that cannot be checked manually.

### VIII. Session & State Management
All client-side state persistence MUST include:
- Schema versioning for migration compatibility
- Graceful degradation when stored data is invalid/outdated
- Clear expiration policies (default: 60 days for user sessions)
- State cleanup utilities for testing and user-initiated resets
- Recovery mechanisms for corrupted state

**Rationale**: localStorage persistence without versioning causes production bugs when state schemas evolve. Migration handling prevents data loss and user frustration. Testing reliability requires deterministic state cleanup.

### IX. Backward Compatibility & Migration
Schema changes (database, API, client state) MUST include:
- Migration scripts/utilities tested before deployment
- Backward-compatible transitions (support old + new formats during migration window)
- Rollback procedures for failed migrations
- User-facing migration status/progress indicators for long operations
- Version checks to detect incompatible data formats

**Rationale**: Schema changes without migration cause data loss and production outages. Supporting multiple versions during transition prevents breaking existing users.

## Development Standards

### Technology Stack Requirements
- **Framework**: Next.js 16+ with app directory and TypeScript
- **Internationalization**: next-intl with server-side translations
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS consuming design tokens via `--wb-*` variables
- **Animation**: Framer Motion with `useReducedMotion()` support
- **Testing**: Jest, React Testing Library, Playwright, axe-core

New technology choices MUST be justified against existing stack and approved before implementation.

### File Organization
- Each major section = separate component file
- Components in `/components`, UI primitives in `/components/ui`
- Tests co-located in `__tests__/components/` or `__tests__/e2e/`
- Translations in `messages/{locale}.json`
- Design system in `context/design-system/`

### Code Quality Standards
- TypeScript strict mode required
- ESLint MUST pass before commits
- Stylelint MUST validate CSS against design system rules
- All components MUST have corresponding unit tests
- Critical user flows MUST have E2E coverage

### Development Workflow Rules
- **Single Server Rule**: Only one development server per port. Check for running processes before starting new servers (`lsof -i :3000`).
- **Port Conflict Prevention**: Kill orphaned processes before debugging "port in use" errors.
- **Clean Restart Protocol**: Use `pnpm dev` for fresh starts; avoid layering multiple server instances.

## Quality Assurance Standards

### Testing Requirements
1. **Unit Tests**: All components tested for rendering, interactions, theme switching, language selection
2. **Integration Tests**: Multi-component flows with mocked navigation
3. **E2E Tests**: Homepage loading, language switching, theme toggle, pricing selection, performance metrics (LCP, CLS), accessibility validation
4. **Playwright Best Practices**:
   - Always clear localStorage to avoid test inconsistencies
   - Use `storageState: undefined` in config for fresh contexts
   - Use `ensureFreshOnboardingState(page)` helper for clean state
   - Always use restart button functionality between test runs

### CI/CD Pipeline
GitHub Actions workflow (`.github/workflows/test.yml`) MUST validate:
1. ESLint code quality checks
2. Jest unit tests with coverage thresholds
3. Next.js production build success
4. Playwright e2e tests including performance validation
5. Accessibility testing with axe-core

Failing CI blocks merges. No exceptions.

### Manual Validation
After UI changes, developers MUST use Playwright MCP to validate:
- Light and dark themes render correctly
- Mobile and desktop layouts function properly
- All interactive elements are keyboard accessible
- Performance metrics remain within thresholds

### Conversion Metrics (Multi-Step Flows)
User flows with measurable conversion goals MUST define and monitor:
- **Completion Rate**: Target ≥25% for multi-step onboarding flows
- **Time-to-Complete**: Target ≤15 minutes for onboarding processes
- **Mobile Completion**: Target ≥40% on mobile devices
- **Drop-off Analysis**: Track abandonment at each step

E2E tests SHOULD validate happy-path completion time.

## Governance

### Amendment Process
This constitution supersedes all other development practices and documentation. Amendments require:
1. Documented justification of why change is needed
2. Impact assessment on existing features and workflows
3. Migration plan for affected code and tests
4. Approval from project maintainers before implementation

### Compliance Review
All pull requests MUST include a constitution compliance checklist:
- [ ] User-first design validated (no unnecessary complexity)
- [ ] AI automation opportunities explored
- [ ] Translations complete (en.json + it.json)
- [ ] Performance thresholds met (LCP ≤ 1.8s, CLS < 0.1)
- [ ] Accessibility validated (axe-core passes)
- [ ] Design tokens used (no hard-coded styles)
- [ ] Tests written before implementation (TDD)
- [ ] State persistence includes versioning and migration (if applicable)
- [ ] Schema changes include migration scripts and rollback (if applicable)
- [ ] Conversion metrics defined for multi-step flows (if applicable)

### Versioning Policy
Constitution versions follow semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Backward-incompatible principle removals or redefinitions
- **MINOR**: New principle/section added or materially expanded guidance
- **PATCH**: Clarifications, wording fixes, non-semantic refinements

### Runtime Development Guidance
For day-to-day development guidance and best practices, developers should reference:
- `CLAUDE.md` (for Claude Code AI agent)
- `context/index.md` (non-functional requirements)
- `context/design-system/README.md` (design system usage)
- `context/whiteboar-business-overview.md` (business context)

**Version**: 1.1.0 | **Ratified**: 2025-09-30 | **Last Amended**: 2025-09-30