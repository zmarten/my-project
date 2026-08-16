# bucketlist-training

A 54-week periodized training program, expressed as code.

The program is **authored in TypeScript** and **compiles to JSON**. Program definition
(declarative, versioned, reviewable) is deliberately separate from resolution
(applying an athlete's tested maxes to produce actual prescribed loads). This is the
same separation as the "Plaid for fitness programs" concept: the program is a spec,
the athlete is a parameter, the resolved plan is the output.

```
program (TS)  ×  athlete (maxes)  →  resolve()  →  ResolvedProgram (JSON)  →  invariants + UI + Supabase
```

## Commands

```bash
npm run build     # tsc
npm run check     # run all coaching invariants against the resolved program
npm run today     # today's session
npm run week -- 14   # a specific week
npm run export    # write dist/program.json
```

**Run `npm run check` after any change to the program.** It is the guardrail that
catches a well-intentioned edit breaking a periodization rule.

## Domain model

- `Program` → 5 `Block`s → 55 weeks → 7 `DaySession`s each (385 days).
- A `Block` owns a `buildDay(ctx)` function. Days are generated, never enumerated.
- `PrescriptionSpec` is `load` (percentage of a 1RM), `belt` (percentage of weighted
  pull-up TOTAL SYSTEM LOAD, resolves to belt weight and falls as bodyweight falls),
  `linear` (absolute lb, for lifts on linear progression), `text`, or `duration`.
- Percentages resolve against `athlete.maxes`. Change a max, the whole year recomputes.

## Athlete

Zach, Bozeman MT. See `src/athlete.ts` for the numbers. Context that shapes programming:

- **Front squat 275 (tested) is the binding constraint on every Olympic target.** C&J 315 needs ~360, so it is a year-three goal. See ADR-0008.
- **Back squat is DERIVED from the front squat**, not tested. It is never tested anywhere in the program, so it is computed at fsq / 0.85 and rebases on every front squat retest. See ADR-0016.
- **5 strict pull-ups at 265.** Max added load is +40. Bodyweight volume before belt weight.
- **Fast-twitch dominant.** High rate of force development, comparatively poor at
  max-effort grinding. Tested DL single (525) underperforms his rep max (500x3 → ~550).
  Favours: dunk, Olympic lifts, jumps, gymnastics. Fights: 600 deadlift, ultra distance.
- **On a GLP-1 (retatrutide)** through roughly January. Appetite suppression makes the
  protein target hard and makes lean mass retention dependent on the lifting stimulus.
- **Hunting season Sept–Nov** wrecks weekday consistency. Block 1 is built to absorb it.
- **Infant at home, new job.** Sleep is the real constraint. Volume is cut before intensity.
- **Home gym**: bumpers, platform, spin bike (no power meter), Rogue Echo rower,
  treadmill, pull-up bar, Rogue rings with **no high anchor yet**. No sled.
  Prescribe HR-based zone 2, never watts. Do not prescribe sled work.

## Coaching invariants

Seventeen checks in `src/engine/invariants.ts`, enforced by `npm run check`. They are not
style preferences. Each traces to a decision in `docs/decisions/`.

| Check | Catches |
|---|---|
| `aerobic-floor` | Cutting cardio in a strength block and losing the base (ADR-0003) |
| `lower-body-floor` | Hunting season eating the sessions that protect lean mass (ADR-0004) |
| `vertical-floors` | Muscle-ups and HSPU programmed as skill rather than strength (ADR-0007) |
| `vertical-press-spacing` | Satisfying the press frequency floor by stacking it on back-to-back days (ADR-0014) |
| `skill-variety` | A skill menu that repeats for 4 weeks, within a week or across them (ADR-0007, ADR-0011) |
| `no-metcon` | High-rep circuits sneaking into a caloric deficit |
| `skill-placement` | Skill work behind fatiguing work, including Olympic lifts (ADR-0005, ADR-0011) |
| `deload-exists` | A block that runs more than 4 straight weeks with no down week (ADR-0011, ADR-0012) |
| `deload-is-volume` | A deload that cuts weight instead of sets |
| `prilepin-cap` | More than ~10 reps above 90%, usually a wave reused across lifts (ADR-0011) |
| `belt-ceiling` | Belt weight above the added load ever tested (ADR-0013) |
| `stale-max` | Percentages drawn from a max that is old, or never tested at all (ADR-0015, ADR-0016) |
| `plyo-contact-cap` | Plyo volume past the phase cap, or a contact count that agrees with nothing |
| `maintenance-intensity` | Dropping percentages instead of sets in an endurance block |
| `why-completeness` | A session with no stated stimulus, purpose, or failure mode |
| `equipment-reality` | Prescribing a sled he does not own, or watts on a bike with no meter |
| `house-style` | Em dashes |

The numbered principles these encode:

1. **Aerobic floor.** Never fewer than 2 aerobic sessions in any week. (ADR-0003)
2. **Two lower-body strength sessions per week in Block 1**, hunting weeks included. (ADR-0004)
3. **No metabolic conditioning circuits in Block 1.** Intensity preserves, volume fatigues.
4. **Skill work precedes lifting and is never to failure.** (ADR-0005)
4b. **Vertical pull and press floors**, and those exposures must be spread across the week
   rather than stacked. (ADR-0007, ADR-0014)
4c. **Skill menus rotate.** Blocked practice stops paying past roughly 3 weeks. (ADR-0007)
5. **Deload every 4th week**, defined as a reduction in volume, not intensity.
6. **Taper reduces volume, never intensity.**
7. **Plyometric contacts capped**: <=120/wk extensive, <=80/wk intensive, always fresh.
8. **Maintenance blocks keep intensity >=78%** even as set count drops.
9. **Loads trace to a tested number.** He is retraining after 20 years of lifting, so maxes
   move faster than a 15-week test gap can read them. A max older than 12 weeks warns, and
   a max that is never tested warns louder. (ADR-0015)
10. **Belt weight stays inside the tested range.** System max minus tested bodyweight is
   +40, and `beltLoad()` subtracts current bodyweight, so a cut overshoot can prescribe
   above anything he has lifted. (ADR-0013)

**A passing suite is evidence about the checks, not about the program.** Four of them were
once structurally incapable of failing and reported clean for months. Any new invariant
needs a deliberately broken fixture proving it fails when it should. (ADR-0011)

## Conventions

- No em dashes in any user-facing copy. Active voice. No hedging.
- Loads round to the nearest 5 lb, floor of 45 (empty bar).
- Every session carries a `why`: `{ stimulus, purpose, know }`. A session without one
  is incomplete. The `know` field is for the thing people get wrong, not a restatement.
- Dates are `Date` at local midnight. Week 1 Day 0 is Mon 2026-08-10.

## When changing the program

1. Change the block file, not the resolved output.
2. Run `npm run check`.
3. If you deliberately broke an invariant, write an ADR in `docs/decisions/` explaining
   why, then update the invariant. Never weaken an invariant silently.
4. Confidence percentages in `src/program/targets.ts` are **coaching judgement, not
   calculation**. Do not present them as derived.

## What this repo is not

Not a general training app. It is one athlete's one year. Resist generalizing the
schema until there is a second athlete or a second program to generalize toward.
