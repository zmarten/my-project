# ADR-0010: The total-system-load mechanism was never wired up

**Status:** accepted · 2026-08-14

## What happened

The README, `CLAUDE.md` and ADR-0007 all describe weighted pull-ups as a percentage of
**total system load**: bodyweight plus belt. The stated consequence is that belt weight
climbs on its own through Block 1 as bodyweight falls, so the cut pays the relative-strength
goals twice without any strength gain.

The mechanism was real code. `belt()` in `helpers.ts`, `beltLoad()` and `bwAt()` in
`athlete.ts`, and a `belt` branch in `resolve.ts` were all correct and all tested-looking.

Nothing called them. Zero `belt` prescriptions existed across 385 sessions. `block1.ts`
hardcoded `+15 / +25 / +35 lb` as literal text and `block2.ts` prescribed weighted pull-ups
with **no load at all**.

Two README claims were therefore false:

- "There are no hand-written loads anywhere in the repo."
- "Change one number in `src/athlete.ts` and the entire year rebases."

Both held for every lift except `wpuSys`, which is the one max the gymnastics goals depend on.

## Why it mattered more than a normal dead-code finding

A retested `wpuSys` moved nothing. If week 6 had come back at 325 rather than the estimated
305, every barbell lift would have rebased and the weighted pull-up would have silently
stayed at `+15`. The lift most tied to the bar muscle-up and the ring muscle-up was the one
lift immune to its own test result.

The hardcoded numbers also stepped flat: `+15, +15, +25, +25, +35`. The described mechanism
produces a smooth climb, because bodyweight falls every week while the percentage holds.

## Decision

Replace the hardcoded text with `belt()` prescriptions:

| Weeks in block | Percentage of system max | Resolves to |
|---|---|---|
| 8 to 9 | 0.87 | +15, +20 |
| 10 to 11 | 0.89 | +25, +30 |
| 12 | 0.90 | +35 |

Block 2 gets `belt('Weighted pull-up', 0.85, 4, 5)`, which resolves to +20 at a held 237.

The endpoints match the previous hardcoded intent, so this is not a change in prescribed
training. It is the same training, now derived.

## Verification

Changing `wpuSys` alone now moves the whole progression:

| `wpuSys` | wk 8 | wk 10 | wk 12 |
|---|---|---|---|
| 285 | bodyweight | +10 | +20 |
| 305 | +15 | +25 | +35 |
| 325 | +35 | +45 | +55 |

## Consequence for the display layer

`beltLoad()` clamps at zero and legitimately reaches it when the target percentage sits at
or below current bodyweight. Rendering that as `+0 lb on the belt` reads as a bug. The
resolver now emits `at bodyweight` instead.

## Process lesson

This is the second finding of the same shape as ADR-0009. An estimate that is never
scheduled for testing is a guess with better formatting; a mechanism that is never called
is a design document with better syntax highlighting. Both looked correct on the page.

`npm run check` could not have caught this, because no invariant asserted that a described
mechanism is actually reached. That gap is ADR-0011.
