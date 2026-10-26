# ADR-0012: CKTool JS for schema automation; management token in gitignored env

- **Status:** Accepted
- **Date:** 2026-10-26
- **Supersedes:** [ADR-0006](0006-schema-as-code-with-cktool.md); amends the management-token
  bullet of [ADR-0007](0007-local-config-and-secrets.md)

## Context
ADR-0006 wrapped `xcrun cktool`, which ships only with Xcode, so validating or importing the
schema needed a Mac. Apple also publishes **CKTool JS** on npm (`@apple/cktool.database` plus
`@apple/cktool.target.nodejs`, from Apple's `@apple` scope). It calls the same CloudKit
management API (`validateSchema`, `importSchema`, `exportSchema`, `resetToProduction`,
`getTeams`) from any Node runtime.

cktool kept the management token in the macOS keychain. That has no direct equivalent on
Linux, WSL or CI. Developers already use direnv and gitignored env files for every other
local value.

## Decision
- `cloudkit/schema.ckdb` stays the source of truth. `scripts/ck.ts` implements
  `validate | import | export | reset | teams | token` with CKTool JS, exposed as `mise run ck:*`.
  Schema changes still target **development** only. Promotion to production stays a manual
  step in CloudKit Console.
- `ck:import` validates first, then imports, as `cktool import-schema --validate` did.
- The packages are dev dependencies pinned to `1.3.x` (`~1.3.2`). They are CommonJS bundles, so we
  import them by default import. Apple's license limits use to Apple services, which covers this.
- The **management token** is `CLOUDKIT_MANAGEMENT_TOKEN`, stored like other local values: in
  `.env.local` (gitignored, mode 600), or exported by a gitignored `.envrc` (direnv) or
  `mise.local.toml`. `mise run ck:token` reads it from a hidden prompt and writes it to
  `.env.local`. If it is unset, `ck:*` tasks prompt for it. It is not in `EMBEDDED_KEYS`, so it
  never reaches the bundle, and `doctor` only reports it masked.

## Consequences
- Schema validation and import work on Linux, macOS, Windows and WSL. Xcode is no longer needed.
- The management token now sits in a local file instead of the keychain. The existing guards
  cover it: `.gitignore`, the pre-commit hook that blocks env files, gitleaks, and the
  `.claude/settings.json` deny rules. Revoke it in CloudKit Console if a machine is lost.
- Tokens that `cktool save-token` put in the macOS keychain aren't read. Run `mise run ck:token` once.
- CKTool JS 1.3.2 dates from 2022. If Apple stops publishing it, `xcrun cktool` still works on
  macOS as a manual fallback.
