# ADR-0007: Local configuration and secrets handling

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
The repository is **public**. Developers use direnv and/or mise. We need per-developer values
(container ID, API token, extension key, Team ID) without any risk of committing them.

## Decision
- **`.env.local`** (gitignored, mode 600) is the single source of local values. `.env.example`
  (committed) documents every key.
- **`.envrc` is not committed.** `.envrc.example` is, and `mise run setup` copies it. Its only
  job is `dotenv_if_exists .env.local` plus `mise env`.
- **mise:** developers may put the same keys under `[env]` in a gitignored `mise.local.toml`.
- Every script imports `scripts/lib/common.ts` (originally `common.sh`; see ADR-0011), which loads `.env.local` **without overriding**
  values already exported by direnv or mise. Nothing depends on direnv being installed.
- Vite embeds **only** an allowlist of keys (`EMBEDDED_KEYS` in `vite.config.ts`).
- ~~**Never stored in files:** the CloudKit management token (keychain via cktool).~~
  Amended by [ADR-0012](0012-cktool-js-for-schema-automation.md): the management token is
  `CLOUDKIT_MANAGEMENT_TOKEN` in `.env.local` or a gitignored `.envrc`, like every other local value.
- **Guards:** a broad `.gitignore`, a pre-commit hook (`.githooks/pre-commit`) that blocks env,
  key and pem files and runs gitleaks on staged changes, `mise run secrets:scan`, gitleaks in
  CI, and `.claude/settings.json` deny rules so agents don't read local secrets.
- `mise run doctor` reports whether each value is set **without printing it**.

## Consequences
Clone, then `mise run setup`, then fill in `.env.local`. One file to back up. The API token
is still visible inside built artifacts, which is inherent to client-side CloudKit (see the
setup guide).
