# ADR-0013: The belt mechanism has no ceiling in it

**Status:** accepted · 2026-08-14

## Context

Research into pulling bodyweight from a Garmin Index scale surfaced a hazard in a
mechanism this repo had just finished celebrating.

`wpuSys = 305` is a TOTAL system max: bodyweight plus belt. It was tested at 265 lb, so the
added load ever actually lifted is **+40**. `beltLoad()` subtracts CURRENT bodyweight, so
every pound lost moves a pound onto the belt at the same percentage. That is the intended
mechanism, it is why ADR-0010 was worth wiring, and it has no upper bound in it.

## The number

Week 12 of Block 1 prescribes 5 x 3 at 90% of system max.

| Bodyweight at week 12 | Belt resolves to |
|---|---|
| 245 | +30 |
| 239 *(planned)* | +35 |
| 236 | +40 *(at the tested ceiling)* |
| 230 | **+45** |
| 227 | **+50** |

A 3 lb overshoot reaches the ceiling. A 9 lb overshoot passes it by 5 lb, for five sets of
three, on a lift whose tested maximum was a single set of five.

A 9 lb overshoot against a 28 lb planned cut, on retatrutide, is ordinary.

## Why it is not a bug today

`bwAt()` is a hardcoded planning curve. It returns 239 at week 12 and it cannot return
anything else, so the worst case that ships today is +35 and the invariant cannot fire.

This is precisely the ADR-0010 shape: correct code, safe while inert, dangerous the moment
something wires it to a real input. The Garmin work is that wiring. The guard goes in
before the input does, not after.

## Decision

1. `Athlete` gains `wpuSysTestedAtBwLb`, currently 265. The available added load is
   `wpuSys - wpuSysTestedAtBwLb`, which makes the ceiling derived rather than remembered.
2. New `belt-ceiling` invariant: any resolved belt prescription above that range is an
   error naming the two real fixes, retest `wpuSys` or lower the percentage.

## Verification

Passes today at 0 errors. Mutation tested per the ADR-0011 rule: moving the Block 1
bodyweight curve to end at 228 produces

```
ERROR  belt-ceiling  week 12 day 0
       "Weighted pull-up" resolves to +45 lb, above the 40 lb of added load ever tested.
       Retest wpuSys or lower the percentage before prescribing this.
```

## Related, fixed at the same time

`app/program.json` is a static file destined for a public domain, and the export was
including an `athlete` block with bodyweight and every tested max. The app never read it.
It was added on the assumption a load needs its max to be explicable, and nothing ever used
it, so it was pure exposure for no feature. The served bundle now drops it; `dist/` keeps
it for local work.

That is a mitigation, not the fix. Prescribed loads still imply a great deal, and gating
`/projects/bucketlisttrainer` in `worker.js` is what actually closes it. That gate must
cover the JSON and must NOT cover the app shell, or the service worker caches a login page
and the installed app never opens offline again.

## Process lesson

Both findings came from designing a feature that has not been built. Asking what happens
when a real measurement replaces an assumption exposed a ceiling nobody had written down
and a profile nobody had noticed shipping. Design review of the next phase is a cheaper
place to find these than the phase after it.
