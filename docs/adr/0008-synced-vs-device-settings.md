# ADR-0008: Two tiers of settings, synced (CloudKit) and device (chrome.storage)

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
The example should show settings that follow the user across browsers as well as per-browser
preferences.

## Decision
- **Synced:** a single `Settings` record named `user-settings` in the private DB, holding
  default priority, sort order and show-completed. Saves are last-write-wins
  (`forceUpdate` / `create`).
- **Device:** `chrome.storage.local` key `prefs`, holding theme, whether the toolbar button opens
  the side panel, and whether to confirm bulk deletes. Saved on change and applied live through
  `storage.onChanged`.
- The options page groups them visibly, so the distinction is obvious to users.

## Consequences
Shows both persistence paths in one screen. Concurrent edits to synced settings from two
browsers resolve as last-write-wins, which is acceptable for preferences.
