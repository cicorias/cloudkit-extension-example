# ADR-0002: TypeScript + Vite, no UI framework

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
The extension has three small pages (popup, side panel, options) and a service worker. MV3
needs bundled, local code. The example should be easy to read for people who mostly care about
CloudKit.

## Decision
- TypeScript (strict) with Vite as the bundler. `vite.config.ts` uses multi-page inputs plus a
  service-worker entry, and generates `manifest.json` from `src/manifest.ts`.
- No UI framework. Plain DOM with a tiny `h()` helper (`src/lib/dom.ts`) that always sets text
  through `textContent`.
- No extension-specific Vite plugin (such as CRXJS), to avoid churn in a dependency we don't need.
- vitest for unit tests of the pure logic.
- pnpm as the package manager, pinned through mise.

## Consequences
Small, auditable bundle with no framework upgrade treadmill. No HMR: `mise run dev` rebuilds
and you reload the extension. If the UI grows a lot, revisit this (for example Preact or Lit) in
a new ADR.
