# ADR-0006: Aerobic volume is prose, so deload checks are load-only

**Status:** accepted, known gap · 2026-07-28

## Context
The `deload-is-volume` invariant verifies that a declared deload week actually reduces
volume. It does this by summing prescribed loaded sets and comparing peak intensity.

That works in Blocks 1 through 3. It does not work in Blocks 4 and 5, where the volume
lives in vertical gain and long-run distance, both currently stored as strings
(`'12,000 ft'`, `'30 mi + back-to-back Sunday'`).

## Decision
Add `volumeDriver: 'load' | 'aerobic'` to block metadata. Run the numeric deload check
only where `volumeDriver === 'load'`. Aerobic-block deloads are verified by reading.

## Consequences
This is a real gap, not a design choice. The fix is to model vertical gain and distance
as numbers rather than display strings, which would also enable weekly load charting
and a proper acute-to-chronic ratio.

## Next step for whoever picks this up
Change `WeekSpec` in `src/program/blocks/block5.ts` from `{ vert: string; long: string }`
to `{ vertFt: number; longMi: number; label?: string }`, derive the display strings, then
extend `deloadIsVolume` to compare those numbers for aerobic blocks.
