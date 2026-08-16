# bucketlist-training

A 55-week periodized training program for twelve bucket list goals, expressed as code.

Aug 10 2026 → Aug 29 2027. Five blocks, 385 sessions, one athlete. The last week is the
Gallatin Crest, which is why the program is 55 weeks and not the 54 this README used to
claim in seven places.

```bash
npm install
npm run check      # 385 sessions checked. 0 errors, 12 warnings.
npm run today
npm run week -- 30
npm run export     # dist/program.json + app/program.json
npm run app        # check, then export. The invariants gate the build.
```

Then serve the repo and open `/app/`. `python -m http.server 8123`

## The idea

The program is **authored in TypeScript** and **compiles to JSON**. Program definition
is separate from athlete resolution, so a tested max is a parameter rather than a
hard-coded number:

```
program (TS)  ×  athlete (maxes)  →  resolve()  →  385 ResolvedSessions
```

Change one number in `src/athlete.ts` and the entire year rebases. There are no
hand-written loads anywhere in the repo.

This was false until ADR-0010. The weighted pull-up progression was hardcoded text and
`wpuSys` was the one max that could not rebase anything. It is true now.

## The interesting part

`src/engine/invariants.ts` turns the coaching principles into executable checks. Not
lint rules. Actual periodization logic:

| Invariant | Catches |
|---|---|
| `aerobic-floor` | Cutting cardio in a strength block and losing the base |
| `lower-body-floor` | Hunting season quietly eating the sessions that protect lean mass |
| `no-metcon` | High-rep circuits sneaking into a caloric deficit |
| `skill-placement` | Skill work displaced behind fatiguing strength work |
| `deload-is-volume` | A "deload" that cuts weight instead of sets |
| `plyo-contact-cap` | Plyometric volume creeping past the phase cap |
| `maintenance-intensity` | Dropping percentages instead of sets in an endurance block |
| `equipment-reality` | Prescribing a sled he does not own, or watts on a bike with no meter |
| `why-completeness` | A session with no stated stimulus, purpose, or failure mode |
| `vertical-pull-floor` | Muscle-up goals programmed as skill practice instead of heavy pulling |
| `vertical-press-floor` | Strict HSPU goals with no pressing progression underneath them |
| `skill-variety` | The same skill menu repeated past the point blocked practice pays |
| `house-style` | Em dashes |
| `deload-exists` | A block that declares no deload at all |
| `prilepin-cap` | A percentage wave reused across a lift it was not written for |
| `stale-max` | Percentages running for months off a tested number that has moved |

On its first run this caught 27 genuine errors, including skill work scheduled after
squats in Block 2, a missing third aerobic session in Block 3, and two lifts declared
as deloading in the same week when the waves actually offset them.

**The suite then reported 0 errors for months, and that was the bug.** Four checks were
structurally incapable of failing: `skill-placement` was blind to the `olympic` tag,
`skill-variety` could not compare across weeks, `deload-is-volume` never verified a deload
existed, and `plyo-contact-cap` scored a hand-typed integer nothing had to justify.
Repairing them without touching the program produced 53 errors. See ADR-0011.

**Run `npm run check` after every change.** If it fails, you broke a principle. Fix the
program, not the invariant. If the invariant is genuinely wrong, write an ADR first.

A green suite is evidence about the checks, not about the program. Any invariant added
from here needs a deliberately broken fixture proving it fails when it should.

## The app

`app/` is an offline-first PWA that renders the resolved program. Read-only by design:
Phase 1 writes nothing, so there is no sync to get wrong and no state to corrupt.

- **Today** is the default screen. Stimulus stays visible, purpose and know sit behind one
  tap, and every load shows the resolved pounds next to the percentage.
- **Week** shows the seven days plus block context, nutrition and the bodyweight arc.
- **Goals** renders the twelve targets. Confidence draws as stepped 5% blocks over a dashed
  baseline and is labelled "your call", because ADR-0001 says it is judgement and a smooth
  bar would read as measurement.

It works with no signal. The service worker caches the shell and `app/program.json`
(25 KB gzipped) on install. The shell is stale-while-revalidate rather than cache-first:
cache-first opens instantly and then never updates, because a new deploy only lands if
somebody remembers to bump the cache name by hand. This serves the cached copy immediately,
refetches in the background, and the next launch is current.

`npm run app` runs the invariants before exporting, so a program that violates a coaching
principle cannot reach the phone.

**Not yet done.** No logging, no deviation capture, no plan edits, no auth. Those are
phases 2 through 5. There is no deep linking either, so the app always opens on today.

## Layout

```
CLAUDE.md                    context and coaching invariants for Claude Code
src/
  types.ts                   domain model, spec vs resolved
  athlete.ts                 maxes, profile, equipment. THE parameter.
  program/
    blocks/block1..5.ts      each block owns buildDay(ctx)
    targets.ts               goals + confidence (judgement, not calculation)
  engine/
    calendar.ts              week/day ↔ date
    resolve.ts               spec × athlete → resolved
    invariants.ts            the coaching principles, executable
  cli.ts
supabase/migrations/         training log schema + adherence views
docs/decisions/              ADRs for every non-obvious coaching call
.claude/
  agents/coach.md            subagent that can modify the program safely
  commands/                  /rebase-loads  /adapt-week  /why
```

## First thing to do

Week 1 is a test week. Run it, then update `src/athlete.ts` and `npm run check`.

Front squat is the number that matters most: it is currently a guess, it cannot be
correct, and if it comes back at 315 or above then ADR-0002 reopens and the C&J 315
goal comes off the deferred list.

## Known gaps

- **12 warnings are open on purpose.** Three stretches of identical skill menu at weeks 10,
  17 and 24, and two test sessions prescribing plyo work while declaring zero contacts. See
  ADR-0012. Plus seven `stale-max` warnings, which include the fact that the **back squat is
  tested nowhere in 55 weeks** and that the snatch and clean run on estimates until week 28.
  All twelve change prescribed training rather than fixing a defect. See ADR-0015.
- **Retesting is now scheduled inside blocks, not only between them.** He is retraining, so
  a tested max goes stale fastest exactly when it is regaining. Deload weeks 18, 23, 32 and
  35 carry an 85% AMRAP that replaces a working set rather than adding one. ADR-0015.
- Weeks 14 to 40 contain essentially no running, and week 46 opens at roughly 25 to 30
  miles with 5,000 ft of running descent. Nothing checks running progression yet.
- Aerobic volume is stored as display strings, so deload verification is load-only in
  Blocks 4 and 5. See ADR-0006, which includes the fix.
- No acute-to-chronic workload ratio. Needs the numeric vert from ADR-0006 first.
- Supabase schema has RLS enabled with no policies, which is deny-all. Superseded by the
  D1 plan; kept as a reference for the port.
