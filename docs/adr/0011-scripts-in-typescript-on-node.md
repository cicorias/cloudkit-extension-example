# ADR-0011: Scripts in TypeScript, run directly by Node

- **Status:** Accepted
- **Date:** 2026-10-26
- **Supersedes:** [ADR-0010](0010-mise-tasks-and-scripts.md) (the "scripts are bash" part; mise stays)

## Context
The bash scripts in `scripts/` depended on `bash`, `openssl`, `xxd` and `zip`, and the schema
tasks on `xcrun cktool` (macOS only). We want every task, including schema validation, to run
on Linux (and ideally Windows) with nothing beyond what mise installs. The schema tasks now need
Node anyway (see ADR-0012), and the rest of the repo is strict TypeScript.

## Decision
- Every script in `scripts/` is a TypeScript ES module that **Node 24 runs directly** through its
  built-in type stripping (`node scripts/<name>.ts`). There is no build step and no `tsx`.
- Only erasable syntax is allowed (no `enum`, `namespace`, or parameter properties), enforced by
  `erasableSyntaxOnly` in `scripts/tsconfig.json`. `mise run check` typechecks `scripts/` with
  `tsc -p scripts`.
- Shared helpers live in `scripts/lib/`. `common.ts` loads `.env.local` (without overriding the
  environment) and changes to the repo root on import, as `common.sh` did. Pure helpers
  (`env-file.ts`, `extension-id.ts`, `zip.ts`) have vitest tests in `tests/`.
- `node:crypto` replaces `openssl`/`xxd` (extension key and ID), and a small zip writer
  replaces `zip`. `gitleaks` is the only external binary, and mise installs it.
- `mise.toml` pins the tools and wires each task to `node scripts/<name>.ts`. mise tasks remain the
  documented interface; `package.json` scripts stay thin conveniences.
- Python, if ever added, still uses **uv** (`uv run`, `pyproject.toml`, `uv.lock`, `uv` in `[tools]`).
- The git pre-commit hook stays a short `sh`-compatible script that calls `secrets-scan.ts`.

## Consequences
- Tasks behave the same on Linux, macOS and Windows; CI (Ubuntu) runs the same code.
- One language across `src/`, `tests/` and `scripts/`, with type checking for all of them.
- Scripts need Node ≥ 22.18 / 24 (type stripping). mise pins Node 24.
- shellcheck (backlog B-007) is no longer relevant.
