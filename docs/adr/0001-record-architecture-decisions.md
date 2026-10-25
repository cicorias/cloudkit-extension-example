# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
This repo is a reference example. Readers and future contributors (human or AI) need to know
*why* it's shaped the way it is, not just what it does.

## Decision
We keep lightweight ADRs in `docs/adr/`, numbered sequentially, using `0000-template.md`.
Any change that alters a recorded decision adds a new ADR and marks the old one *Superseded*.
Index: [README.md](README.md).

## Consequences
Decisions are reviewable in PRs. CLAUDE.md tells agents to add or update ADRs when they make
architectural choices.
