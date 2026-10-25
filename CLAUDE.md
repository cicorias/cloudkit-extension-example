# CLAUDE.md

Guidance for Claude Code (and other coding agents) working in this repo.

## What this is

A reference **Chrome/Edge Manifest V3 extension**: a TODO list stored in the signed-in user's
**CloudKit private database**, with Apple ID sign-in, a side-panel bulk editor, and two tiers of
settings. It's a public example repo, so clarity matters more than cleverness.

Start with: `README.md` → `docs/architecture.md` → `docs/adr/README.md` → `docs/backlog.md`.

## Commands (always through mise)

| Task | Command |
|---|---|
| First-time setup | `mise run setup` |
| Check config (never prints secrets) | `mise run doctor` |
| Watch build → `dist/` | `mise run dev` |
| Production build | `mise run build` |
| Unit tests | `mise run test` |
| Everything CI runs | `mise run check` |
| Secret scan | `mise run secrets:scan` |
| Schema validate / import / export | `mise run ck:validate` · `ck:import` · `ck:export` |
| Extension ID + callback URL | `mise run ext:info` |

Each mise task calls a script in `scripts/`. Add new automation the same way: write
`scripts/<name>.sh` (source `scripts/lib/common.sh`), then add a `[tasks.<name>]` entry in
`mise.toml`. Use **uv** for any Python (`uv run …`, `pyproject.toml`) and add `uv` to `[tools]`.

## Layout

```
src/manifest.ts              manifest.json source (permissions live here)
src/background/              service worker: sign-in, context menu, toolbar behavior
src/lib/cloudkit/            REST client, auth, wire types (no chrome.* in client.ts)
src/lib/todos.ts             Todo model ⇄ record mapping + TodoRepository
src/lib/settings.ts          synced (CloudKit) + device (chrome.storage) settings
src/lib/quickadd.ts          "#tag !high due:YYYY-MM-DD" parser
src/{popup,sidepanel,options}/  UI pages (plain DOM via lib/dom.ts h())
cloudkit/schema.ckdb         CloudKit schema, the source of truth
scripts/                     all automation; mise.toml only wires tasks
docs/adr/                    architecture decisions
docs/backlog.md              prioritized work items
tests/                       vitest unit tests (Node; fetch/token store are injected)
```

## Rules

### Secrets (public repo)
- **Never** read, print, or commit `.env.local`, `.envrc`, `mise.local.toml`, `.keys/`, `*.pem`.
  `.claude/settings.json` denies reads of them. Don't work around that.
- Never hard-code container IDs, tokens, team IDs or extension keys in source, tests or docs.
  Use obviously fake placeholders (`iCloud.com.example.todo`, `api-token-fake`).
- New config value? Add it to `.env.example` with a comment, to `scripts/doctor.sh`, and, only if
  the extension needs it at runtime, to `EMBEDDED_KEYS` in `vite.config.ts` and `src/lib/config.ts`.
- `.envrc` is **not committed**. Edit `.envrc.example` instead.
- Run `mise run secrets:scan` before proposing a commit.

### Code
- TypeScript strict. No UI framework (ADR-0002). Set text with `textContent` / `h()`, never `innerHTML` with data.
- MV3: no remote code, no `eval`. Keep CSP and permissions minimal. Justify any new permission in the PR.
- Keep `src/lib/cloudkit/client.ts` free of `chrome.*` so it stays testable in Node.
- Schema changes: edit `cloudkit/schema.ckdb`, `cloudkit/README.md`, the mapping in
  `src/lib/todos.ts` / `settings.ts`, and tests. Production schema is **additive only**.
- All writes go through the repositories and are bulk-shaped (arrays). Handle per-record
  errors (`isRecordError`). The default zone is not atomic.
- Add or adjust vitest tests for any logic change. `mise run check` must pass.

### Process
- **Decisions:** any architectural or tooling choice gets an ADR (`docs/adr/0000-template.md`,
  next number, and an update to `docs/adr/README.md`). Superseding requires a new ADR.
- **Backlog:** work from `docs/backlog.md`. Move items between sections and date them when done.
  Add discovered follow-ups as new IDs instead of expanding scope mid-task.
- Commits: small, imperative subject, one backlog item per commit/PR where practical.
- Don't push, create releases, or change GitHub settings unless asked.

## CloudKit gotchas

- `ckWebAuthToken` may contain `+` and `/`. Always `encodeURIComponent` it, and never parse it with `URLSearchParams`.
- A `421` means "sign in required". The client clears the token, and the UI should offer sign-in.
- An unfiltered `records/query` needs `___recordID QUERYABLE`. Server-side sorting needs SORTABLE indexes. We sort on the client.
- `records/modify` allows at most 200 operations. `CloudKitClient.modify` chunks.
- `cktool` writes only to **development**. Promote in CloudKit Console.
- The extension ID must be stable (manifest `key`), because the API token's Sign In Callback is `https://<id>.chromiumapp.org/`.
