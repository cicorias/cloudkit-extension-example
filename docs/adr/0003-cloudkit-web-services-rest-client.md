# ADR-0003: Use CloudKit Web Services (REST) directly, not CloudKit JS

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
Apple's CloudKit JS is meant to load from Apple's CDN. Manifest V3 forbids remotely hosted code,
and vendoring the library has unclear redistribution terms, adds a large file, and its built-in
popup/postMessage sign-in doesn't fit extension pages or service workers.

## Decision
Implement a thin client (`src/lib/cloudkit/client.ts`) over CloudKit Web Services:
`users/caller`, `records/query` (with continuation), `records/lookup`, `records/modify`
(chunked at 200 operations). Authentication uses the `ckAPIToken` and `ckWebAuthToken` query
parameters. The client takes an injected `fetch` and `TokenStore` so it can be tested in Node.

## Consequences
- No remote code. Full control over auth and errors. Easy to mock.
- We own the wire types. Unsupported features (assets, subscriptions, sharing, zones/changes)
  need new code when they're wanted (see the backlog).
- We rely on Apple's archived Web Services reference, so behavior gaps get verified manually
  (backlog B-002, B-003).
