# ADR-0008: Front squat tested at 275. My prediction was wrong, and it reshapes the Olympic goals

**Status:** accepted · 2026-08-13 · supersedes ADR-0002

## What happened
ADR-0002 said the stated front squat of 275 "cannot be right, since almost nobody front
squats only what they clean," and predicted 310 to 330 on test. The revisit trigger was
set at 315 or above to reopen C&J 315.

Tested: **255 x 3, so roughly a 275 max.** The original guess was accurate. The inference
was wrong, and it was wrong in the direction that mattered.

Also tested: bench 255x3 (~275 max), and 5 strict pull-ups at 265 bodyweight.

## What the front squat implies

| | |
|---|---|
| Front squat 1RM | 275 |
| Full clean ceiling (85-90% of front squat) | ~235 to 240 |
| Stated clean | 275 |

Those cannot both be true. The 275 is almost certainly a **power clean**. His full clean
is likely 240 to 250, which means the **clean is now the C&J limiter, not the jerk** at
255. That inverts the analysis in ADR-0002.

| Target | Front squat needed | Gap |
|---|---|---|
| C&J 315 | ~360 | +85 (31%) |
| C&J 295 | ~335 | +60 (22%) |
| Snatch 225 | OHS ~245, implying fsq ~315 | +40 |

## Decision
1. `clean` drops to 245. `bench` rises to 275. `bsq` drops to 320. All from test.
2. **C&J 315 moves from year two to year three.** This year targets 280.
3. **Snatch 225 confidence drops from 75 to 55.** It is now gated on front squat, not
   just on technique. A 225 snatch on a 275 front squat would be an 82% ratio, which is
   at the extreme upper end of what lifters achieve.
4. Front squat becomes the highest-leverage lift in the program. Every Olympic target
   runs through it.

## The pull-up correction
Five strict at 265 gives a system max near 305, so maximum added load is **+40, not the
+55 assumed in ADR-0007**. The prescription was 5x3 at +30 in week 2, which is 97% of his
real max. That was a genuine over-prescription.

Vertical pull is now an explicit progression rather than percentages, because percentage
work across a 40 lb span is meaningless:

| Weeks | Monday | Rationale |
|---|---|---|
| 2-3 | Strict 6 x 3 | Max is 5. Triples are the right dose. |
| 4-5 | Strict 5 x 4 | Reps rise as bodyweight falls. |
| 6-7 | Strict 5 x 5 | Belt starts when this is clean. |
| 8-9 | Weighted 5 x 3, +15 | |
| 10-11 | Weighted 5 x 3, +25 | |
| 12-13 | Weighted 5 x 3, +35 | ~89% of system at 237 |

A max-rep test every third Friday replaces the scale as the leading indicator for the
bar muscle-up.

**The cut is the mechanism.** At an unchanged system max of 305, bodyweight-only reps go
from 5 at 265 to roughly 9 at 237. That alone clears the bar muscle-up gate without a
single pound of added strength.

## Lesson for the coach agent
The heuristic "nobody cleans what they front squat" is sound in general and produced a
confidently wrong prediction here. When a stated number looks impossible, the resolution
is often that a *different* stated number is mislabelled, not that the odd one is wrong.
In this case the clean was a power clean.

**State predictions as predictions and test early.** This one cost nothing because it was
caught in week 1, which is exactly why week 1 is a test week.
