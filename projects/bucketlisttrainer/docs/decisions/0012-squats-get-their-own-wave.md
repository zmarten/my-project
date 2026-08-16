# ADR-0012: Squats get their own wave, and three deloads were not real deloads

**Status:** accepted · 2026-08-14

## Context

`prilepin-cap` and `deload-exists`, both added in ADR-0011, reported fourteen errors that
could not be resolved by fixing a defect. Every one of them changed prescribed training, so
they went to the athlete. These are his decisions and the reasoning behind implementing them.

## Decision 1: the squats get their own percentage wave

Block 2 derived the front squat load as `Math.min(0.93, pct + 0.05)` where `pct` came from
the **snatch** wave, and the back squat used `pct` directly. A snatch wave and a squat wave
are different objects. Sharing the variable produced 5 x 3 at 93% for eight weeks, fifteen
reps above 90% in a session, where Prilepin caps that near ten and `methodology.md` cites
Prilepin by name.

`SQUAT_WAVE` is now independent. Reps drop to doubles once the wave crosses 90%, so peak
intensity is preserved and only the grinding volume comes off.

| Weeks in block | Prescription | Reps above 90% |
|---|---|---|
| 1 to 4 | 5 x 3, 75 to 84% | 0 |
| 5 | 2 x 3 at 84% (deload) | 0 |
| 6 to 7 | 4 x 3, 86 to 88% | 0 |
| 8 to 9 | 4 x 2, 90 to 92% | 8 |
| 10 | 2 x 2 at 90% (deload) | 4 |
| 11 to 14 | 3 to 4 x 2, 92 to 95% | 6 to 8 |

Resolved against the current tested front squat of 275, that runs 205 lb to 260 lb. It
rebases the moment the week 13 retest lands, which is the point.

The back squat trails the same wave six points lower at 3 reps, so it never needs to live
above 90%. It is general strength underneath the lift that matters, not a lift on the list.

**Rejected:** capping the top end at 88 to 90% and keeping 5 x 3. More total work, less peak
intensity, and a weaker signal for a maximal front squat. The front squat is the gate on
every Olympic target and it needs the intensity more than it needs the tonnage.

## Decision 2: two deloads per block, not three

Block 2 ran fourteen training weeks with none. Block 3 declared one where it needed two.

Deloads are now at weeks 5 and 10 of Block 2, and weeks 4 and 7 of Block 3.

This also changed the invariant. `deload-exists` originally required
`floor(trainingWeeks / 4)` deloads, which demanded three across fourteen weeks. That is a
poor proxy: two deloads placed at weeks 5 and 10 already keep every unbroken run to exactly
four. What invariant 5 actually says is that you never train more than four consecutive
weeks without backing off, so the check now measures the **gap** rather than counting the
declarations. Blocks under eight training weeks stay exempt, because a short block leading
into an event is a peak and the taper is the down week.

## Decision 3: three declared deloads were inverted

Encoding the deloads surfaced something neither the audit nor the athlete had asked about.
Weeks that back off in the waves were backing off the wrong variable.

- **Block 2 week 10.** The Olympic wave rose from 85% to 90% in the week now declared a
  deload, taking jerk recovery to 104%. Held at 85% instead, sets cut from 5 to 2.
- **Block 3 week 7.** The deadlift went from 3 sets at 92% to **4 sets at 85%**. That is a
  harder week wearing a deload's name. Now 2 sets at 90%.
- **Block 3 week 7 bench.** Cut from 3 sets to 2 at an unchanged 92%.

Invariant 5 and CLAUDE.md both say a deload is a reduction in volume, not intensity. Three
weeks in the program did the reverse. `deload-is-volume` existed to catch exactly this and
could not, because it only inspects weeks already declared as deloads and none of these were
declared.

That is the same shape of failure as ADR-0011: the check was correct and unreachable.

## Verification

`385 sessions checked. 0 errors, 5 warnings.`

The zero is only meaningful because both new checks were mutation tested. Removing the week
10 deload from Block 2 produces `9 consecutive training weeks without a deload, ending at
week 27`. Reverting the front squat to the snatch wave produces 8 Prilepin violations.
Restoring both returns to zero.

## Open, by design

Five warnings remain and all five are real:

- Three stretches of identical skill menu lasting four or more weeks, at program weeks 10,
  17 and 24. ADR-0007 predicted this and the repaired `skill-variety` now sees it.
- Two sessions prescribing plyo-tagged work while declaring zero contacts, so they are
  invisible to the contact cap. Both are test days with genuinely low volume.

None of these are urgent and all of them change prescribed training, so they stay open until
the athlete decides.
