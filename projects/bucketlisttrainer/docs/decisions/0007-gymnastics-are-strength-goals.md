# ADR-0007: HSPU and muscle-ups are strength goals, not skill goals

**Status:** accepted, supersedes part of the original Block 1 · 2026-08-09

## Context
The first version of Block 1 gave the gymnastics goals a 12-minute skill slot, four days
a week, with the same four items repeated for four to five weeks. Roughly 18 identical
sessions before the menu changed.

Two problems, and the second is the larger one.

**Repetition.** Blocked practice is correct for early acquisition, when the job is
stabilizing one pattern. The contextual interference literature (Shea and Morgan, later
Magill) shows variable practice performs worse in-session and retains and transfers
better, and the challenge point framework (Guadagnoli and Lee) says optimal practice
difficulty scales with skill level. Blocked repetition past roughly three weeks stops
building anything and becomes attendance.

**Misclassification.** Three of the four goals are not skill problems at all.

| Goal | Real limiter | Baseline |
|---|---|---|
| Strict HSPU | Pressing ~90% bodyweight through a deep range. Rough gate: strict press 0.75-0.80x bodyweight, so 180-190 at 237 | Press 165 |
| Bar muscle-up (kipping) | Heavy explosive vertical pull to sternum height | Weighted pull-up 1x/wk as an accessory |
| Ring muscle-up (kipping) | The above plus false grip and ring dip strength | Minimal |
| Handstand walk 25 ft | Genuinely balance and skill | Correctly programmed |

Wall walks do not close a 25 lb pressing gap.

## Decision

1. **Weighted pull-up becomes a primary lift**, twice weekly (Monday heavy 5x3, Friday
   explosive 4x6), prescribed as **total system load** rather than added load.
2. **Strict press becomes a primary lift** on Tuesday, on **linear progression** rather
   than percentages. 165 to roughly 180 by week 13.
3. **HSPU progression is loaded**: box HSPU, then deficit box HSPU, then wall-facing
   negatives, then attempts. Not bodyweight repetition for five weeks.
4. **Skill work drops to 8 minutes and 2 items**, blocked for weeks 1-3 then variable
   by day.
5. **Bench drops from two exposures to one** to pay for the vertical pressing volume.

## Why total system load for pull-ups
Belt weight is the wrong unit when bodyweight is falling 28 lbs. At a fixed system max of
320, belt load climbs from +30 in week 2 to +70 in week 12 with **zero strength gain**,
purely from the cut. Prescribing belt weight directly would have hidden that and
under-loaded him all block. The cut pays the relative-strength goals twice.

## Why linear for the press
Percentage waves off a static baseline cannot drive a max that is supposed to climb 15%
inside the block. The first draft prescribed 125 lb working sets against a 165 max for
most of Block 1. Small lifts with 5 lb increments progress linearly; that is what they do.

## The ratio, honestly
165 to 190 in a caloric deficit is unlikely. 165 to 180 is realistic. But the gate is a
*ratio*, and bodyweight is the other term: 180 at 237 lbs is 0.76x, which clears the
lower edge. Both sides of the fraction move, which is the whole argument for putting
these goals in the cutting block.

## Enforcement
Three new invariants: `vertical-pull-floor`, `vertical-press-floor`, and `skill-variety`.
On first run they caught 53 errors, including untagged vertical work in Blocks 2 and 3
and the identical 7-week skill menu in Block 2, which had the same flaw this ADR fixes.

## Trade accepted
Bench at one heavy exposure per week through a 13-week deficit may cost some bench.
Reverse this first if the week 13 retest shows it sliding.
