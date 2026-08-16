# ADR-0015: A max goes stale fastest while it is regaining

**Status:** accepted · 2026-08-14

## The problem

Every load in this program is a percentage of a tested max. That mechanism has one failure
mode and the program was built to walk straight into it.

Zach is **retraining**, not training. Twenty years of serious lifting sit behind him and he
is currently detrained relative to that history. Strength comes back fast under those
conditions: the motor patterns are intact and neural drive returns in weeks rather than
months. What has not detrained is his RPE calibration, which is a perceptual skill built
over two decades and does not decay on the same clock.

So the tested number is least reliable in exactly the phase where he regains fastest, and
the athlete's own sense of effort is the one instrument that still works.

Test cadence before this change, verified against the block files:

| Test week | Gap to next |
|---|---|
| 1 | 12 |
| 13 | **15** |
| 28 | 12 |
| 40 | **15** |

The two 15-week gaps are the problem, and they land in the worst places. Block 1 runs a 28
lb deficit, so little regain happens there. The fast regain lands in Block 2 (maintenance)
and Block 3 (surplus), which is precisely where the gaps are longest.

Block 2 is the sharp case. It runs fifteen weeks off a week-13 number and it owns the
dedicated `SQUAT_WAVE` driving the front squat toward 340.

| If the true week-26 max is | "95%" is actually | Prescribed |
|---|---|---|
| 275 (tested) | 95% | 260 lb |
| 315 | 83% | 260 lb |
| 330 | 79% | 260 lb |

The peaking phase quietly becomes moderate work and nothing in the repo changes. Nobody
gets an error. The plan just stops being the plan.

## Change 1: rep-max checks at deload weeks

Deload weeks are already low-volume, which makes them the cheap place to measure.

**Submaximal AMRAP, not a max attempt.** One set at 85%, taken to a hard but clean stop,
converted with Epley: `estimated 1RM = weight x (1 + reps / 30)`. A true max in a deload
week defeats the deload, and an AMRAP is the readout his intact RPE calibration is actually
good at. 85% everywhere, forever, so week 18 and week 23 and week 35 are comparable to each
other. Two AMRAPs at different relative loads are not.

**Every check replaces a set. None adds one.** `deload-is-volume` compares total loaded
sets against the prior week, and a deload that gains a set is not a deload. The main lift
runs one fewer set at the wave percentage and the AMRAP takes that slot.

| Week | Block wk | Lift | Session | What changed |
|---|---|---|---|---|
| 18 | 2/5 | front squat | Tue | 2 x 3 @ 84% becomes 1 x 3 @ 84% + 1 x AMRAP @ 85% |
| 23 | 2/10 | front squat | Tue | 2 x 2 @ 90% becomes 1 x 2 @ 90% + 1 x AMRAP @ 85% |
| 23 | 2/10 | wpuSys | Tue | weighted pull-up 4 x 5 becomes 3 x 5, plus one max-rep bodyweight set |
| 32 | 3/4 | bench | Mon | 3 x 3 @ 80% becomes 2 x 3 @ 80% + 1 x AMRAP @ 85% |
| 32 | 3/4 | deadlift | Tue | the 1 x 1 @ 85% heavy single becomes 1 x AMRAP @ 85% |
| 35 | 3/7 | bench | Mon | 2 x 2 @ 92% becomes 1 x 2 @ 92% + 1 x AMRAP @ 85% |
| 35 | 3/7 | front squat | Fri | 4 x 4 @ 80% becomes 3 x 4 @ 80% + 1 x AMRAP @ 85% |

Resulting deload volume, measured rather than assumed:

```
wk17 -> wk18 deload   sets 53 -> 41   peak 100% -> 100%
wk22 -> wk23 deload   sets 48 -> 37   peak 100% -> 100%
wk31 -> wk32 deload   sets 31 -> 30   peak  95% ->  85%
wk34 -> wk35 deload   sets 34 -> 31   peak  97% ->  95%
```

Every deload still cuts volume and none raises peak intensity. Weeks 18, 32 and 35 are set-
count neutral against their pre-change selves. Week 23 drops one set, because the max-rep
pull-up set replaces a belted set and carries no `sets` of its own.

### Why these lifts

**Front squat, both Block 2 deloads.** It drives `SQUAT_WAVE` and it gates every Olympic
target. It is the single most load-bearing number in the year.

**wpuSys, week 23.** Belt weight is a percentage of a system max last measured in week 13,
and it is the one max that also moves with bodyweight, so `belt-ceiling` is riding on it
too. The check is one bodyweight set and it costs one belted set.

**Bench, both Block 3 deloads.** It is the block's primary goal, it recovers fast, it
rewards frequency, and it already has three exposures a week, so one changed set is nothing.

**Deadlift, week 32 only.** A deadlift AMRAP is the most expensive readout in the program
and CLAUDE.md already says its recovery cost is disproportionate. Week 32 is free: the heavy
single there is already prescribed at 85%, so the AMRAP costs the same bar and one set. Week
35 runs the bar at 90 to 95% and an AMRAP on top of that is not a deload.

**Front squat, week 35.** Not required by the invariant. Week 40 retests the clean and jerk,
and the front squat is the gate on the clean, so the squat number should be current before
he tries to interpret the C&J result.

### What was decided against

**No Olympic lift retests in the deload weeks.** An AMRAP is invalid for a snatch or a jerk.
ADR-0005 is explicit that a broken rep rehearses a broken pattern, and reps to a hard stop
on a technical lift produce exactly that. The only valid alternative is a true heavy single,
which defeats the deload. So the snatch, clean and jerk keep their week-28 and week-40 test
windows and the resulting `stale-max` warnings stand as accurate.

**No bench added to Block 2.** Block 2 contains no bench at all, which is why the bench max
is 16 weeks old when Block 3 opens on it at 85%. The honest fix is a check in week 29, not
bolting a bench session onto a power block. Added volume is a real cost with an infant and a
new job. The warning stays open instead.

**Front squat AMRAPs are read as a floor, not a number.** A front squat rep max runs out of
upper back and breathing before it runs out of legs, so it under-reads. That is in the
athlete-facing note, because it changes how he interprets the result.

## Change 2: the `stale-max` invariant

Flags percentage prescriptions running too long after the last test of that lift.

### What was threaded through

`ResolvedItem` gained `lift?: LiftKey`, mirroring how `kind`, `sets`, `reps` and `pct` were
threaded through `describe()`. `belt` prescriptions report `lift: 'wpuSys'`, because a belt
percentage is a percentage of the weighted pull-up system max and ages exactly like any
other percentage.

`ItemSpec` and `ResolvedItem` gained `tests?: LiftKey[]`.

### Declared, not inferred

Item names are prose: `Front squat 3RM`, `C&J retest`, `Max strict pull-ups`, `Block 1
retest`. A regex over them works until somebody renames one, and then the check goes quiet.
That is the exact failure ADR-0011 documented, and the failure mode of a coaching invariant
is silence.

So an item declares `tests: ['fsq']` or it does not reset the clock. The asymmetry is
deliberate: forgetting the annotation produces a **warning**, not silence.

Annotating the existing tests turned up two things worth recording.

- **Week 1 `Max strict pull-ups` was not tagged as a test at all.** It is where the 305
  `wpuSys` in `src/athlete.ts` comes from: 265 x (1 + 5/30) = 309. The one max that drives
  every belt load looked untested.
- **Week 28's `Front squat 1RM` deliberately carries no declaration.** It is conditional on
  the C&J feeling easy, so it may not happen. A clock that assumes an optional test ran is
  worse than one that assumes it did not.

### Threshold: 12 weeks

Arithmetic on the program's own commitments, not physiology. The shortest gap the program
already schedules is 12 weeks (1 to 13, and 28 to 40). Twelve says the cadence the program
chose for itself is the ceiling and the two 15-week gaps have to justify themselves.

A tighter number was tried and rejected. At 10 weeks the check flags week 12 of a block
whose week 13 is a test week, which is the check being pedantic about a gap the program is
already closing.

### Severity: warn

Three reasons.

1. A strict error makes the program unshippable until retests exist everywhere, which is a
   much bigger change than this one.
2. Some gaps are deliberate. Block 2 contains no bench, so the bench number is stale by
   design when Block 3 opens on it. An error there forces either a bad edit or weakening the
   invariant, and both are worse than knowing.
3. The remedy is usually a test result, which is athlete action rather than a code change.

### Reporting the run, not the onset

The first version reported once per lift per stale run, at the week the run opened. That
hid every improvement made further inside the run: adding the week 32 bench check changed
nothing in the output, because the warning had already fired at week 29.

It now reports the full extent. `weeks 29 to 31 ... reaching 18 weeks stale` versus `weeks
29 to 39 ... reaching 26 weeks stale` is the difference the check exists to show. One
week over the cap and fourteen weeks over it are different problems.

## Mutation tests

Per ADR-0011, an invariant that has never been seen to fail is not evidence of anything.

### Mutation A: delete the Block 2 front squat checks

`const deload = false as boolean;` in `block2.ts` case 1.

```
 WARN  stale-max  weeks 26 to 34 (Power & Olympic) · fsq
       weeks 26 to 34 prescribe percentages of a fsq max last tested in week 13, reaching
       21 weeks stale. Worst case "Front squat" 3 x 2 @ 95%. He is retraining, so the true
       max moves faster than this schedule reads it, and a stale number silently turns a
       peaking percentage into moderate work. Cap is 12 weeks. Add a rep-max check at a
       deload week or accept the gap on purpose.

  385 sessions checked. 0 errors, 13 warnings.
```

That is the exact scenario at the top of this ADR, named by the check, with the 95%
prescription quoted back.

### Mutation B: keep the `test` tag, drop the `tests` declaration

`// MUTATION B: tests: [l],` in the `repMaxCheck` helper. This is the realistic mistake:
somebody adds a test, tags it, and forgets to say what it measures.

```
 WARN  stale-max  weeks 26 to 39 (Power & Olympic) · fsq
       ... reaching 26 weeks stale. Worst case "Front squat" 3 x 2 @ 95%.
 WARN  stale-max  weeks 29 to 39 (Max Strength) · bench
       ... reaching 26 weeks stale. Worst case "Bench press" 3 x 1 @ 95%.
 WARN  stale-max  weeks 29 to 39 (Max Strength) · dl
       ... reaching 26 weeks stale. Worst case "Heavy single" 1 x 1 @ 97%.

  385 sessions checked. 0 errors, 13 warnings.
```

All five new checks go invisible to the clock and every run they closed grows back. The tag
alone is not the mechanism, and forgetting the declaration warns rather than going quiet.

### Positive control: it is not always-on

Per lift, with the change in place:

```
lift    tests                             worst age  weeks used
fsq     1,13,18,23,35                            11  2-39
jerk    13,28,40                                 14  2-27
dl      1,13,32,40                               18  2-45
bench   1,13,32,35,40                            18  2-54
bsq     NEVER                                    54  2-54
wpuSys  1,3,6,9,12,13,23                          9  8-27
snatch  28                                       27  14-27
clean   28,40                                    27  14-27
```

The front squat is prescribed on 38 weeks of the year and never warns, because its worst
age is 11 against a cap of 12. `wpuSys` is prescribed across 20 weeks and never warns, worst
age 9. Those are the two lifts this change was built to protect and both are silent.

## The 7 warnings this adds

`npm run check` goes from `0 errors, 5 warnings` to `0 errors, 12 warnings`. Every one is
true. None is fixable by an edit this brief authorizes.

| Warning | Why it stands |
|---|---|
| weeks 14 to 27 · **clean** never tested | `Clean pull` runs at 100% of a `clean` that ADR-0008 revised by inference from the front squat. First real test is week 28. |
| weeks 14 to 27 · **snatch** never tested | Same. Block 2 opens the snatch wave off an estimate and first tests it at week 28. An AMRAP snatch is not a valid instrument. |
| weeks 14 to 54 · **bsq** never tested | The back squat is tested nowhere in 55 weeks. 320 is an inference off the front squat and four blocks draw loads from it. The real fix is either a test or deriving `bsq` from `fsq`, and both are bigger than this change. |
| weeks 26 to 27 · **jerk**, 14 weeks stale | C&J percentages run off the jerk. Closing this needs a heavy single in a deload week, which defeats the deload, so it stays open on purpose. |
| weeks 29 to 31 · **bench**, 18 weeks stale | Block 2 contains no bench at all. Week 32 is the first deload available and it closes the run at three weeks. |
| weeks 29 to 31 · **dl**, 18 weeks stale | Same shape. Block 2 contains no deadlift. Week 32 closes it. |
| weeks 53 to 54 · **bench**, 14 weeks stale | Block 5 has no test weeks and bench is on maintenance at 80% into the Crest. Low stakes and correctly visible. |

## Known blind spot

`linear` prescriptions carry no lift key, so the strict press progression in Block 1 is
invisible to this check. The press is tested once, in week 1, and ADR-0009 exists because
that test was nearly omitted. It does not warn today only because it is not expressed as a
percentage. Worth closing when `linear` learns which max it was seeded from.

## Process lesson

ADR-0009 said every estimated value in `src/athlete.ts` needs a test date attached to it.
This is the executable version of that sentence, and running it found that three maxes have
no test date anywhere in the year.

The corollary is the one in the `why` copy on every retest session: **a result that stays in
your notes changes nothing.** Put the number in `src/athlete.ts` and rerun. The whole year
rebases off one edit, and that is the only supported way to respond to a test.
