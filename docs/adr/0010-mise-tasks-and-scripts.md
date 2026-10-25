# ADR-0010: mise as toolchain and task runner; logic in ./scripts; uv for any Python

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
Contributors need the same tool versions and discoverable commands, without hiding logic in a
task runner's DSL.

## Decision
- `mise.toml` pins node, pnpm and gitleaks, and defines tasks.
- Each task delegates to a script in `scripts/` (bash, `set -euo pipefail`, shared helpers in
  `scripts/lib/common.sh`). Scripts run without mise as long as the tools are on PATH.
- `package.json` scripts are thin conveniences only. mise tasks are the documented interface.
- If Python tooling is added, it uses **uv** (`uv run`, `pyproject.toml`, `uv.lock`) and
  `uv` is added to `[tools]`. The project has no Python today.

## Consequences
`mise tasks` lists everything. Scripts are reviewable and shellcheck-able.
