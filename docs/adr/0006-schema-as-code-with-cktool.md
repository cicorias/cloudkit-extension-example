# ADR-0006: Schema as code with cktool

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
CloudKit development environments create fields automatically on first write, but don't create
indexes, and production requires a deployed schema. Clicking through the Console isn't
reproducible.

## Decision
`cloudkit/schema.ckdb` (Apple's text schema format) is the source of truth. `scripts/ck-schema.sh`
wraps `xcrun cktool` for `validate | import | export | reset` against **development**, exposed as
`mise run ck:*`. The management token lives in the macOS keychain (`cktool save-token`), never
in files. Promoting to production stays a deliberate manual step in CloudKit Console.

## Consequences
- Requires macOS and Xcode for schema work. Building and running the extension doesn't.
- `ck:export` plus `diff` catches drift made in the Console.
- Production schema changes are additive only, so field design needs care.
