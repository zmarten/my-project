# ADR-0016: The back squat is derived, not guessed

**Status:** accepted · 2026-08-14

## What `stale-max` found

The check added in ADR-0015 was written to catch percentages drifting away from a max that
had not been retested. It immediately found something worse: a lift with **no test at all**.

- The back squat is not tested anywhere in 55 weeks. No test week contains it.
- **38 sessions across 38 weeks** prescribe percentages of it.
- Worst case was `3 x 3 at 89%`.

And the number itself had no standing. `athlete.ts` carried `bsq: 320` annotated "revised
down from fsq", so it was an inference off a front squat prediction of 310 to 330. ADR-0008
records that the front squat came back at 255x3. The back squat estimate was therefore built
on a number already known to be wrong, and nothing in the program could ever correct it.

If the true back squat is 290, that `89%` is 98%. If it is 350, it is 81%.

## Decision

`bsq` is now computed from `fsq`, not stored:

```ts
const FSQ_AS_FRACTION_OF_BSQ = 0.85;
bsq: roundLoad(FSQ_TESTED / FSQ_AS_FRACTION_OF_BSQ)
```

At a tested front squat of 275 that gives **325**, against the old hardcoded 320. Back squat
loads move by 5 lb, so this is not a change in prescribed training. It is a change in where
the number comes from.

`Athlete` gained `derivedMaxes: { bsq: 'fsq' }`, and `stale-max` reads the source lift's
test schedule for any derived max. A front squat retest is now a back squat retest.

## What this does and does not fix

**Does not:** make the number true. 0.85 is mid-range. The honest range is 0.80 to 0.90 and
it drifts upward for a lifter who front squats heavily, which this program does on purpose.
The back squat remains an estimate.

**Does:** make it the *same* estimate as the front squat, and self-correcting. Front squat
tests land in weeks 1, 13, 18, 23, 28, 32 and 35, and every one of them now rebases the back
squat. The relationship between the two lifts is far more stable than either absolute value,
which is what makes deriving defensible where guessing was not.

The effect on the warning is the measure of it:

| | Before | After |
|---|---|---|
| Span | weeks 14 to 54 | weeks 48 to 54 |
| Cause | never tested anywhere | last tested week 35 |
| Worst case | `3 x 3 @ 89%` | `3 x 3 @ 80%` |

A 41-week blind spot on near-maximal work became a 7-week tail on maintenance work in an
endurance block. The residual is Block 5, where no front squat test follows week 35 and the
back squat runs at 80% twice a week. That is low stakes and it stays visible.

## Rejected: add a back squat test week

The obvious fix costs a session in a block that is already recovery-constrained, and it
tests a lift that is explicitly not a bucket list goal. `WHY[4]` in Block 1 says outright
that the back squat is "not a bucket list lift, both are what the bucket list lifts sit on."
Spending a max attempt on it to correct a number that can be inferred from a lift already
tested seven times is the wrong trade.

If the ratio turns out to be badly off, the correction is one constant.

## Also in this change

`stale-max` reports derived lifts differently when the source is untested, rather than
claiming the derived lift is unmeasurable.

`roundLoad` moved above `zach` in `athlete.ts`. The derived back squat calls it while the
athlete object is being constructed, and `const` is not hoisted, so leaving it below would
have thrown at module load. Caught by running it, not by reading it.

The file header docstring still said the front squat "is a GUESS" and instructed testing it
in week 1. That was written before the test and stated the opposite of what happened. It now
records the result and points at the ADRs.

## Process note

This is the third finding of one shape. ADR-0010: a mechanism described everywhere and
called nowhere. ADR-0013: a ceiling that existed in the athlete's history but not in the
code. Now: a lift loaded 38 times off a number with no measurement behind it.

None of the three were found by reading. All three were found by writing a check that could
fail and then looking at what it said.
