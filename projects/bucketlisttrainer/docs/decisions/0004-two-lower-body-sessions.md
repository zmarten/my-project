# ADR-0004: Two lower-body sessions per week in Block 1, hunting or not

**Status:** accepted · 2026-07-28

## Context
Block 1 spans September through November: archery elk, upland with pointing dogs, and
rifle season. Weekday consistency will suffer. The athlete is simultaneously in a
caloric deficit on a GLP-1, which suppresses appetite and makes the protein target hard
to hit.

Weight lost without a resistance stimulus comes off as a meaningful fraction of lean
mass. The lifting is the intervention, not an accessory to it.

## Decision
Two lower-body strength sessions per week, minimum, every week of Block 1. Monday
(front squat) and Thursday (deadlift) are protected. Tuesday and Friday are the
designated sessions to sacrifice when the field calls.

Enforced by the `lower-body-floor` invariant.

## Consequences
- The block is deliberately low-frequency so that missing a session is survivable.
- Hunting days are logged as aerobic training rather than treated as lost time.
- If a week genuinely cannot fit two lower-body sessions, that is a signal to talk about
  the schedule, not to quietly drop one.
