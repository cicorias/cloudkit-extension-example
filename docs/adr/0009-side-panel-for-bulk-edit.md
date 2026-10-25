# ADR-0009: Side panel for bulk editing

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
The popup is small and closes when focus leaves it, which makes it a poor fit for multi-select
editing.

## Decision
Use `chrome.sidePanel` (Chrome and Edge 114+) for the bulk editor: filter, select all, mark
done or open, set priority or due date, add or remove a tag, delete, bulk add from text, and
JSON import/export. Open it from the popup (inside the user gesture). As a device pref, the
toolbar button can open it directly. If `sidePanel` is missing, fall back to opening the same
page in a tab.

## Consequences
One page serves both the panel and the tab. `minimum_chrome_version` is 116.
