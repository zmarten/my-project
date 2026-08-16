# ADR-0009: Strict press was missing from week 1 testing

**Status:** accepted · 2026-08-13

## What happened
The athlete caught that week 1 tested front squat, bench, deadlift, pull-ups and vertical
jump, but **not the strict press** - despite the press being a primary lift on Tuesdays
(ADR-0007) and the single gate on the strict HSPU goal.

An 85% confidence on the HSPU was resting on an *estimated* 170 press.

## Decision
1. Strict press 3RM joins week 1 Saturday, **before** the deadlift.
2. The 30-minute rower time trial moves off Saturday to Wednesday of week 2.
3. The press linear progression now **derives its opener from the tested max** rather
   than using hardcoded weights.

## Why press before deadlift
A max deadlift costs a subsequent press 5 to 10% through trunk and general fatigue. A
press test costs a subsequent deadlift roughly 1%. Order by what the fatigue asymmetry
says, not by which lift feels more important.

## Why the rower moved
A 30-minute time trial after a max deadlift produces a number that cannot be compared to
anything. The week 13 retest is the point of collecting it, so it has to be collected on
fresh legs or not at all.

## Why the progression had to be derived
The hardcoded opener of 125 lb assumed a 170 max. At a tested 150 it would be 83% for a
set of five, which is not a set of five. At 185 it would be far too light for eleven
weeks. Any linear progression seeded from an estimate has this bug latent in it.

| Tested max | Wk 2 opener | Wk 12 top set |
|---|---|---|
| 150 | 5x5 @ 110 | 5x3 @ 145 |
| 170 | 5x5 @ 125 | 5x3 @ 160 |
| 185 | 5x5 @ 135 | 5x3 @ 170 |

## Interpreting Saturday
The strict-HSPU gate is roughly 0.75 to 0.80x bodyweight, so 178 to 190 at a 237 target.

- **175 or above**: HSPU holds at 85%. The cut plus linear progression closes the rest.
- **155 to 175**: on track but tight. Hold confidence, recheck at the week 6 deload.
- **Under 150**: downgrade the HSPU, extend the loaded-negative phase, and move the
  attempt window from December into Block 2.

## Process lesson
Week 1 is a test week specifically so that estimates get replaced before they compound
into 54 weeks of wrong loading. An estimate that never gets scheduled for testing is
just a guess with better formatting. **Every value in `src/athlete.ts` marked estimated
needs a test date attached to it.**
