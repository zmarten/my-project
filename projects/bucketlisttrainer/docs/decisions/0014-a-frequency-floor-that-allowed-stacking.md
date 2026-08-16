# ADR-0014: A frequency floor that allowed stacking

**Status:** accepted · 2026-08-14

## What was wrong

ADR-0007 established that the strict HSPU is a strength problem gated on pressing strength,
and set `minVerticalPressSessions: 2` on Block 1 to enforce it. The floor was satisfied every
training week. It was satisfied by stacking.

| Day | Session | Vertical press sets |
|---|---|---|
| Mon | Squat + vertical pull | 4 (box HSPU) |
| Tue | Vertical press + jerk | 12 (strict press 5x5, seated DB press 3x8, strict ring dip 4x5) |
| Wed to Sun | none | 0 |

Sixteen sets on two consecutive days, then five days with none. That is one long pressing
session with a sleep in the middle, counted as two.

The specific damage is the order. Monday's 4 sets of overhead pressing landed the day before
Tuesday's strict press, and the strict press is the single lift the entire HSPU goal is gated
on. ADR-0007 put it on linear progression to climb 165 to roughly 180 inside the block, which
is a 15% gain in a caloric deficit and needs every rep to count. It was being performed on
triceps and anterior delts that had done box HSPU seventeen hours earlier. The block's
headline pressing goal was paying a tax nobody had priced.

`verticalFloors` could not see it. It uses `countWithTag`, which counts sessions per week and
has no concept of which days they fall on, so Mon plus Tue scored identically to Tue plus Fri.
A frequency floor exists because distributing a stimulus beats clustering it. A frequency
check blind to distribution can therefore be satisfied in the one arrangement that defeats
its own purpose. Same shape as the four failures in ADR-0011: the check reported the number
it was asked for, and the number was true and meaningless.

## Decision 1: the HSPU progression moves to Friday

`hspuItem(wb)` moves from day 0 to day 4. Friday already carries vertical pull and no vertical
press at all, and it sits three days after Tuesday rather than one. Pressing now runs Tue and
Fri, gaps of 3 and 4 days.

**Position within Friday: third of five groups.** After the skill work and the "Bar muscle-up
inputs" group, ahead of "Primary".

- Not first or second. The kip swing and the banded transition are motor patterns, and ADR-0005
  says they get a fresh nervous system. Overhead pressing before them buys nothing and costs
  the rehearsal quality. `skill-placement` would not have caught this, because `hspuItem` is
  tagged `vertical-press` and not `upper-strength`, so the tag list does not see it as
  fatiguing. That is a gap worth naming even though it did not bite here.
- Not fourth or fifth. From week 11 this group is `Strict HSPU attempt, 6 x 1-3, wall-facing`,
  whose own cue reads "Attempt fresh. Six quality tries beats twenty tired ones." An attempt
  made after back squat 4 x 3 at 89% is a rep you cannot learn from. Putting it behind the
  squat would have recreated the stacking problem inside the day instead of across the week.
- The back squat pays the cost, and it is the right lift to charge. WHY[4] already says
  outright that back squat is not a bucket list lift, it is what the bucket list lifts sit on.
  A squat performed ten minutes after overhead pressing loses very little. An HSPU attempt
  performed after a heavy squat loses the thing it was for.

Session labels follow the work. Monday drops from 65 to 55 minutes, Friday rises from 60 to 70,
and Friday's title becomes "Squat + explosive pull + HSPU" so the day names what is in it.

**The trade, stated plainly.** Friday was the designated first session to cut, and during
hunting season weeks 4 to 12 it is the one that actually goes. Before this change, cutting
Friday left both press exposures intact. Now it drops pressing to one day a week. That is a
real cost and it is worth paying, because the alternative was a permanently degraded primary
press every single week rather than an occasional one. WHY[4]'s `know` now says what to do:
the HSPU sets travel with the cut and move to Thursday, they do not get dropped. The invariant
checks the plan, not the execution, so it will never enforce this. The athlete has to.

## Decision 2: `vertical-press-spacing`

**Rule.** In any block declaring `minVerticalPressSessions >= 2`, consecutive vertical press
sessions must sit at least **2 days apart**. Gaps are measured cyclically: the last press day
of the week and the first press day of the next are neighbours, because `buildDay` emits a
repeating weekly template, so Sunday plus Monday is stacking even though the two sit in
different rows of the check.

**Severity: error.** The floor it protects is an error. A floor met in the one way that
defeats it is not a lesser class of problem than a floor missed, and ADR-0011 showed what
happens to a check nobody has to act on. It sits at 0 errors with the program as shipped, so
it costs nothing until someone reintroduces the failure.

**Why 2 days and not 3.** A 3 day minimum is arithmetically impossible for three sessions a
week, since 7 days cannot hold three gaps of 3. That would make the check forbid raising press
frequency, which is the opposite of what ADR-0007 wants. At 2 days, Mon/Wed/Fri passes and
Tue/Fri passes, while any pair of consecutive days fails. Verified below.

**Scoped by the block's own declaration**, not hardcoded to Block 1. Blocks 2 and 3 declare
`minVerticalPressSessions: 1` and are exempt, because a block prescribing one session has
nothing to space. If either ever raises its floor to 2, the check turns on with it.

Test weeks and event weeks are exempt, matching `vertical-press-floor`. Weeks below the floor
return early: that is `vertical-press-floor`'s failure to report, and two invariants shouting
about one defect makes both easier to ignore.

## What was rejected

**Counting sets rather than sessions.** A dose floor is a better idea than a frequency floor,
and 4 sets against 12 is a real imbalance. Rejected because the sets live in free-text
prescriptions like `4 x 5, full range`, so the check would score a parsed string, which is the
`plyoContacts` failure from ADR-0011 in a new costume. Also, the floor it guards is expressed
in sessions, and a spacing check that counts a different unit than the floor it protects can
disagree with it. Revisit when text prescriptions carry numeric sets.

**Warn instead of error.** Considered because a 1 day gap is less severe than no pressing at
all. Rejected: the program is compliant today, so error costs nothing now and means something
later. Five warnings are open on purpose already (ADR-0012), and adding a sixth to a list
nobody is required to clear is how a check becomes decoration.

**Moving the HSPU work to Thursday.** Thursday is a never-cut day, which solves the hunting
season problem above. Rejected because Thursday already runs bench press 4 x 5 at 78 to 89%
plus barbell row, so it would stack overhead pressing on top of horizontal pressing inside one
session and land the HSPU work behind fatiguing work. That is the same defect at a smaller
scale, and Thursday already carries the deadlift.

**Applying the rule to vertical pull.** Pull is already Mon and Fri, a 3 day gap, so the rule
would pass. It was left out because the pull sessions are not stacked, so adding the check now
would ship an invariant that has never been observed to fail, which ADR-0011 forbids
explicitly. Add it the day pull frequency changes.

**Generalizing to all tags.** A `spacing` rule parameterised over every tag reads elegant and
is wrong: aerobic work should be frequent and can be consecutive, and skill work benefits from
daily exposure. Spacing is a claim about recovery of a specific quality, not a scheduling
preference. It gets written per quality or not at all.

## Mutation test

Required by ADR-0011: an invariant that has never been seen to fail is not evidence of
anything. The `Vertical press` group was moved back to Monday, exactly reproducing the
arrangement above, and `npm run check` was run.

```
ERROR  vertical-press-spacing  week 2 (Strip & Skill)
       vertical press on Mon "Squat + vertical pull" and Tue "Vertical press + jerk", closest gap 1 day. The floor of 2 exists to distribute the stimulus, and consecutive days deliver one session split in two while leaving the rest of the week empty. Separate vertical pressing days by at least 2 days.
ERROR  vertical-press-spacing  week 3 (Strip & Skill)
       vertical press on Mon "Squat + vertical pull" and Tue "Vertical press + jerk", closest gap 1 day. The floor of 2 exists to distribute the stimulus, and consecutive days deliver one session split in two while leaving the rest of the week empty. Separate vertical pressing days by at least 2 days.
...
ERROR  vertical-press-spacing  week 12 (Strip & Skill)
       vertical press on Mon "Squat + vertical pull" and Tue "Vertical press + jerk", closest gap 1 day. The floor of 2 exists to distribute the stimulus, and consecutive days deliver one session split in two while leaving the rest of the week empty. Separate vertical pressing days by at least 2 days.

  11 errors, 5 warnings.
```

Eleven errors, one per training week in Block 1. Weeks 1 and 13 are test weeks and correctly
exempt. `vertical-press-floor` stayed silent throughout, which is the whole point: the old
check saw nothing wrong with any of these eleven weeks.

The wrap-around and the frequency ceiling were checked separately against synthetic weeks, so
that the cyclic gap and the 3 sessions a week case are not merely asserted:

```
Sun + Mon (wrap)      : vertical press on Mon "Day 0" and Sun "Day 6", closest gap 1 day. ...
Mon + Sat             : PASSES
Mon + Wed + Fri       : PASSES
Tue + Fri (shipped)   : PASSES
```

The program was then restored and the suite returns to `385 sessions checked. 0 errors,
5 warnings.` The warning count is unchanged.

## Files

- `src/program/blocks/block1.ts`: `hspuItem(wb)` moved day 0 to day 4, position 3 of 5.
  Duration labels and Friday's title updated. WHY[4] `know` names the cut behaviour.
- `src/engine/invariants.ts`: `verticalPressSpacing`, registered as `vertical-press-spacing`.

## Process note

This is the second time a check has reported a true number that meant nothing, and both times
the tell was the same: the check measured the thing that was easy to count rather than the
thing the principle was about. `plyo-contact-cap` counted a declared integer instead of the
work under it. `vertical-press-floor` counted sessions instead of the distribution of a
stimulus. Worth asking of every remaining invariant: what is the cheapest arrangement that
satisfies this, and would a coach sign it.
