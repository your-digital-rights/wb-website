# Repository Guidelines

## Project Overview

**WhiteBoar** is an AI-driven digital agency homepage built with Next.js 15+, featuring modern web standards and multilingual support. This is a production-ready website implementing the business requirements outlined in `context/whiteboar-business-overview.md`.

## Project Structure & Module Organization
- Next.js 15 + strict TypeScript live under `src/`; App Router pages stay in `src/app`, legacy API handlers in `src/pages/api`.
- Shared UI (`src/components`), helpers (`src/lib`), schemas (`src/schemas`), and stores (`src/stores`) keep concerns grouped.
- Domain copy/config lives in `src/data` and `context/`; assets in `public/`, docs/specs in `docs/` and `specs/`.
- Tests mirror the code: Jest suites live under `src/__tests__`, fixtures in `src/__tests__/fixtures`, Playwright specs in `src/__tests__/e2e`, and Supabase SQL belongs in `supabase/`.

## Build, Test, and Development Commands
- `pnpm install` once, `pnpm dev` for Turbopack on `http://localhost:3000`.
- `pnpm build` + `pnpm start` verify production output; run `pnpm lint` and `pnpm lint:css` (Stylelint config in `context/design-system/stylelint.config.cjs`).
- `pnpm test` hits Jest suites, `pnpm test:integration` spins up port 3783, and Playwright flows use `pnpm test:e2e` or the onboarding-specific scripts.
- `pnpm test:ci:local` dry-runs the CI pipeline, while `pnpm db:push:dry` then `pnpm db:push` apply Supabase migrations.

## Coding Style & Naming Conventions
- Strict TypeScript: annotate async boundaries, avoid implicit `any`, and keep modules lean.
- Prefer the `@/` alias over deep relatives; co-locate hooks/components within their feature folder.
- Use `PascalCase` filenames for React primitives and begin hooks with `use`.
- Tailwind + tokens from `context/design-system` drive styling; run Prettier/ESLint autofix and remove stray debug code.

## Testing Guidelines
- Name all Jest specs `*.test.ts(x)` inside the suite folders so `pnpm test` finds them.
- Use Testing Library for components and MSW for contract or integration mocks.
- Seed onboarding data before Playwright runs via `node test-seed-session.mjs` plus helpers in `global-setup.ts`.
- Before opening a PR, run `pnpm test`, the relevant `pnpm test:e2e:*`, and attach UX screenshots or video.

## Commit & Pull Request Guidelines
- Commits stay short, imperative, and under 72 characters (e.g., `fix onboarding banner layout`).
- Add optional prefixes like `feat:` or `fix:` only when they clarify scope; avoid multi-topic commits.
- PRs must link the issue, summarize problem/solution, list commands executed, and include UI evidence when visuals move.
- Flag Supabase migrations (`supabase/migrations/...`) or `.env.local` additions directly in the PR description.

## Security & Configuration Tips
- Copy `.env.example` → `.env.local`, fill Supabase/Resend/Maps keys per `ENVIRONMENT_SETUP.md`, and never commit secrets.
- Respect `onboarding-uploads` limits (≤10 MB, whitelisted MIME types) and validate input on both client and server.
- Database work must travel through versioned migrations plus `supabase/` helpers; note any infra or credential changes for reviewers.
