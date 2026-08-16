---
description: Update athlete maxes from test results and report what changed downstream
---

Test results just came in. Do this in order:

1. Ask for, or read from the argument, the new tested values and the test date.
2. Update `src/athlete.ts`. Update the inline comments too, especially removing
   "UNTESTED" markers.
3. Run `npm run check`.
4. Report:
   - Every max that changed, old to new, with percent delta.
   - The three heaviest prescribed loads that moved by more than 15 lb.
   - Whether any target in `src/program/targets.ts` should shift confidence, with a
     one-line rationale each. State clearly that these are judgement calls.
   - **Specifically for front squat**: if the tested value is at or above 315, say so
     loudly and recommend re-opening the C&J 315 target per docs/decisions/0002.
5. Append a row to the confidence history reasoning in `docs/decisions/` if any target
   moved by more than 10 points.

Do not adjust percentages in block files to compensate. Rebasing is the whole point.
