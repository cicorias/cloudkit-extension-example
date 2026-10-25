# Backlog

Work proceeds in small, shippable increments. Pick the top **Next** item, move it to
**In progress**, and when it's done move it to **Done** with the date. Large or architectural
items get an ADR. IDs are stable; never reuse one.

Legend: 🧪 verification · ✨ feature · 🔧 tooling · 📄 docs · 🔒 security

## In progress

_(none)_

## Next

| ID | Item | Notes |
|---|---|---|
| B-001 | 🧪 End-to-end check against a real container (Chrome **and** Edge) | Follow docs/apple-developer-setup.md. Record any portal label drift in the doc. |
| B-002 | 🧪 Verify `ckWebAuthToken` lifetime/rotation | Does CloudKit return a refreshed token on responses? If so, persist it in `CloudKitClient.request`. |
| B-003 | 🧪 Verify that sending `{value: null}` clears `dueDate` in an `update` | Otherwise switch "clear due" to a `replace` or a separate field strategy. |
| B-004 | 🧪 Run `ck:validate` against a real container and fix any `.ckdb` grammar issues | The schema was hand-written to match exported-schema format. |
| B-005 | ✨ Edit notes and due date per item in the side panel | Inline expand row. |
| B-006 | 🔧 Lint/format (Biome) + `mise run lint`, in CI | |
| B-007 | 🔧 shellcheck for `scripts/` in CI | |

## Later

| ID | Item | Notes |
|---|---|---|
| B-010 | ✨ Move to custom zone `Todos` + `zones/changes` incremental sync | Enables atomic bulk edits. Supersedes ADR-0005. |
| B-011 | ✨ Local cache + optimistic UI (render from `chrome.storage`, reconcile) | Faster popup open, offline read. |
| B-012 | 🔒 Device pref: "keep me signed in" vs session-only (`chrome.storage.session`) | |
| B-013 | ✨ Undo for bulk delete (soft delete with `deletedAt`, purge later) | Schema change: additive field. |
| B-014 | ✨ Due-date reminders (`chrome.alarms` + `notifications`) | New permissions → mention in README. |
| B-015 | ✨ Keyboard shortcut to open quick add (`commands`) | |
| B-016 | ✨ Multiple lists (a `List` record type + reference) | |
| B-017 | ✨ Share a list with another Apple ID (CloudKit sharing / shared DB) | Large; ADR needed. |
| B-018 | 🧪 Playwright e2e that loads `dist/` unpacked with a mocked CloudKit | |
| B-019 | ✨ Server-side search with `CONTAINS_ALL_TOKENS` on `title` | `title` is already SEARCHABLE. |
| B-020 | ✨ i18n via `_locales` | |
| B-021 | 📄 Screenshots / GIF in README | |
| B-022 | ♿ Accessibility pass (keyboard nav in side panel list, ARIA live status) | |
| B-030 | 📄 Store publishing guide (CWS/Edge IDs vs dev key, privacy policy, prod token) | |

## Done

| ID | Item | Date |
|---|---|---|
| B-000 | MVP: MV3 extension (popup, side panel bulk edit, options), CloudKit REST client, Apple sign-in, private DB Todo + Settings, schema-as-code via cktool, mise tasks, env/secret handling, ADRs 0001–0010, CI | 2026-10-25 |
