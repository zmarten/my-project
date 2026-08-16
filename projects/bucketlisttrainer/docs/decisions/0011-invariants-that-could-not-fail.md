# ADR-0011: Four invariants could not fail

**Status:** accepted · 2026-08-14

## What happened

`npm run check` reported `385 sessions checked. 0 errors, 0 warnings.` and had done so
since the vertical-floor work in ADR-0007. The number was true and meaningless. Four of the
twelve checks were structurally incapable of reporting a violation.

Repairing them without changing a single line of the program moved the count to
**53 errors and 5 warnings**.

## The four

### `skill-placement` was blind to the Olympic lifts

It tested for `lower-strength` and `upper-strength` only. Block 2 tags its barbell work
`olympic`, so the block where a snatch triple is the fatiguing element was exempt from the
rule it needs most. It also inspected only the **first** skill group in a session, so a
session could open correctly with skill work and then bury a second skill item behind the
barbell unseen.

Repaired, it found 39 real violations across weeks 2 to 27.

### `skill-variety` could not see across weeks

It counted distinct skill menus **within** a week. A block that rotates four menus by day
and then repeats that identical rotation for seven straight weeks scores a perfect four
every week and never trips. That is precisely the pattern ADR-0007 was written to stop.

Comparing each week's whole menu signature against the previous week catches both failure
modes, because a blocked week and a frozen rotation are the same failure at different
resolution. It now reports three stagnant stretches.

### `deload-is-volume` never checked that a deload exists

It only inspects weeks already declared as deloads. A block declaring `deloadWeeks: []` is
perfectly compliant with it while breaking invariant 5 outright. Block 2 ran **fifteen
weeks with no down week** and reported clean. Block 3 declares one where it needs two.

Split into a separate `deload-exists` check. Blocks under eight training weeks are exempt,
because a short block leading into an event is a peak and the taper is the down week.

### `plyo-contact-cap` scored a number nobody had to justify

`plyoContacts` is hand-typed on the session and nothing forced it to agree with the
prescriptions underneath it. The cap could always be satisfied by typing a smaller number.

It cannot be derived from free-text prescriptions, but it can be forced to coexist with
actual plyo work. The check now warns when a session prescribes plyo-tagged work while
declaring zero contacts, and when it declares contacts with no plyo work present.

## One invariant added

`prilepin-cap`. `methodology.md` cites Prilepin by name as the basis for the Olympic work,
so the program is now held to it: above 90%, roughly 4 to 10 total reps, optimum 7.

This is the check that catches a percentage wave being reused across a lift it was never
written for. `block2.ts` derives the front squat load as `Math.min(0.93, pct + 0.05)` where
`pct` comes from the **snatch** wave. A snatch wave and a squat wave are different objects
and should not share a variable regardless of what the numbers land on.

Scope matters here. The first version flagged 45 items, and 32 were pulls and jerk
recoveries. Those are prescribed as a percentage of the competition lift and are supposed
to run at or above 100%. Prilepin's chart governs the classic lifts and the squats, so
scoring a clean pull against it is the check misunderstanding weightlifting rather than the
program being wrong. Now scoped to `load` prescriptions, excluding supramaximal variants.

## Two false positives found while repairing, and fixed

- The skill-to-failure sub-check tested every item sharing a group with skill work, so a
  deliberate `Max strict pull-ups, 1 set to technical failure` was scored as a defect. It
  now considers skill-tagged items only.
- `maintenance-intensity` exempted names matching `/speed|paused|technique/` unanchored,
  meaning any lift could opt out of the intensity floor by containing the substring. Now
  word-anchored.

## What was fixed in the program as a result

The 39 skill-placement violations were a reordering, not a load change, and ADR-0005
already mandated it. Skill now leads Block 2 days 0 and 5, and the bar muscle-up inputs in
Block 1 Friday moved ahead of the back squat.

**Fourteen errors remain open on purpose.** Twelve are Prilepin violations on the front and
back squat waves, and two are the missing deloads in Blocks 2 and 3. Both change prescribed
training rather than correcting a defect, so they are the athlete's call and are not being
resolved by edit.

## Process lesson

A passing check suite is evidence about the checks, not about the program. Every invariant
added from here needs a deliberately broken fixture proving it fails when it should, because
the failure mode of a coaching invariant is silence, and silence is indistinguishable from
success.
