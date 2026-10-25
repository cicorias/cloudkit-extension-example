# ADR-0005: Store data in the private database, default zone (for now)

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
Each user's TODOs belong to them alone and shouldn't count against the developer's public
quota. The private database fits that. In the private DB, records can live in `_defaultZone`
or in custom zones. Custom zones add atomic multi-record commits and `zones/changes` deltas,
at the cost of zone creation and change-token bookkeeping.

## Decision
MVP uses the **private** database and **`_defaultZone`**. List views use `records/query`
(needs `___recordID QUERYABLE`) and sort on the client.

## Consequences
- Simple to follow. No zone setup step.
- Bulk edits are **not atomic**: per-record failures are reported to the user.
- No efficient incremental sync. Moving to a custom zone `Todos` with `zones/changes` is
  backlog B-010, and would supersede this ADR.
