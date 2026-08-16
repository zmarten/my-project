# ADR-0001: Confidence percentages are judgement, not calculation

**Status:** accepted · 2026-07-28

## Context
Every goal in `src/program/targets.ts` carries a confidence percentage. These render in
the UI as progress bars, which makes them look computed.

## Decision
They are coaching judgement. They are stored as data because tracking their drift across
the year is useful, not because they are derived from anything.

## Consequences
- Never label them "projected", "calculated", or "modelled" in any UI or output.
- When one moves, record the rationale in `goal_confidence_history`.
- The coach agent must state this whenever it reports one.

## Why this matters
Presenting a judgement as a calculation is the most common way a training plan becomes
falsely authoritative. The numbers are useful for prioritisation and useless as prediction.
