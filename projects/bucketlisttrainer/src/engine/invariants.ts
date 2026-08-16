import type { ResolvedProgram, ResolvedSession, Violation, ItemTag, LiftKey } from '../types.js';
import { blockForWeek } from '../program/index.js';
import { DAY_NAMES } from './calendar.js';
import { zach as ATHLETE } from '../athlete.js';

/**
 * Coaching principles, made executable.
 *
 * These exist so that a well-intentioned edit cannot quietly break a periodization
 * rule. Each traces to a decision in docs/decisions/. If you deliberately break one,
 * write the ADR first, then change the invariant. Never weaken one silently.
 */

type Check = (weeks: Week[]) => Violation[];
interface Week { week: number; sessions: ResolvedSession[] }

/** Event weeks are peak or taper weeks by definition. Volume floors do not apply. */
const isEventWeek = (w: Week) =>
  w.sessions.some(s => s.groups.some(g => g.items.some(i => i.tags.includes('event'))));

const hasTag = (s: ResolvedSession, t: ItemTag) =>
  s.groups.some(g => g.items.some(i => i.tags.includes(t)));

const countWithTag = (w: Week, t: ItemTag) => w.sessions.filter(s => hasTag(s, t)).length;

const err = (invariant: string, where: string, detail: string): Violation =>
  ({ invariant, severity: 'error', where, detail });
const warn = (invariant: string, where: string, detail: string): Violation =>
  ({ invariant, severity: 'warn', where, detail });

/* ---------------------------------------------------------------- */

/** 1. Aerobic floor. Losing the base costs the Gallatin Crest. ADR-0003. */
const aerobicFloor: Check = weeks =>
  weeks.flatMap(w => {
    if (isEventWeek(w)) return [];
    const b = blockForWeek(w.week);
    const n = countWithTag(w, 'aerobic');
    return n < b.minAerobicSessions
      ? [err('aerobic-floor', `week ${w.week} (${b.name})`,
          `${n} aerobic sessions, block minimum is ${b.minAerobicSessions}`)]
      : [];
  });

/** 2. Two lower-body strength sessions per week in Block 1, hunting or not. ADR-0004. */
const lowerBodyFloor: Check = weeks =>
  weeks.flatMap(w => {
    if (isEventWeek(w)) return [];
    const b = blockForWeek(w.week);
    const isTestWeek = b.testWeeks.includes(w.week - b.firstWeek + 1);
    if (isTestWeek) return [];
    const n = countWithTag(w, 'lower-strength');
    return n < b.minLowerStrengthSessions
      ? [err('lower-body-floor', `week ${w.week} (${b.name})`,
          `${n} lower-body strength sessions, block minimum is ${b.minLowerStrengthSessions}`)]
      : [];
  });

/**
 * 2b. Vertical pull and press frequency.
 *
 * Added after the first review caught HSPU, bar MU and ring MU being programmed as skill
 * problems when they are strength problems. A strict HSPU needs a press near 0.75-0.80x
 * bodyweight; a muscle-up needs heavy vertical pulling. Repetition of wall walks does not
 * substitute for either. See ADR-0007.
 */
const verticalFloors: Check = weeks =>
  weeks.flatMap(w => {
    if (isEventWeek(w)) return [];
    const b = blockForWeek(w.week);
    if (b.testWeeks.includes(w.week - b.firstWeek + 1)) return [];
    const out: Violation[] = [];
    const pull = countWithTag(w, 'vertical-pull');
    const press = countWithTag(w, 'vertical-press');
    if (pull < b.minVerticalPullSessions)
      out.push(err('vertical-pull-floor', `week ${w.week} (${b.name})`,
        `${pull} vertical pull sessions, minimum is ${b.minVerticalPullSessions}. ` +
        `Muscle-ups are a strength problem.`));
    if (press < b.minVerticalPressSessions)
      out.push(err('vertical-press-floor', `week ${w.week} (${b.name})`,
        `${press} vertical press sessions, minimum is ${b.minVerticalPressSessions}. ` +
        `The strict HSPU is gated on pressing strength, not on handstand practice.`));
    return out;
  });

/**
 * 2b-ii. Vertical press sessions must be spread, not stacked.
 *
 * `vertical-press-floor` counts sessions per week and knows nothing about which days they
 * land on, so Monday plus Tuesday scored exactly the same as Tuesday plus Friday. Block 1
 * satisfied the floor for eleven weeks with sixteen pressing sets on two consecutive days
 * and five empty days after, which is one long pressing session with a sleep in the middle.
 * A frequency floor exists because distributing a stimulus beats clustering it, so a
 * frequency check blind to distribution can be satisfied in the one way that defeats it.
 *
 * Applies only where the block asks for 2 or more, because a block prescribing one session
 * has nothing to space. See ADR-0014.
 */
const MIN_PRESS_GAP_DAYS = 2;

const verticalPressSpacing: Check = weeks =>
  weeks.flatMap(w => {
    if (isEventWeek(w)) return [];
    const b = blockForWeek(w.week);
    if (b.minVerticalPressSessions < 2) return [];
    if (b.testWeeks.includes(w.week - b.firstWeek + 1)) return [];

    const pressDays = w.sessions.filter(s => hasTag(s, 'vertical-press')).sort((a, c) => a.day - c.day);
    /* Below the floor is `vertical-press-floor`'s failure to report, not this one's. */
    if (pressDays.length < 2) return [];

    const days = pressDays.map(s => s.day);
    const gaps = days.slice(1).map((d, i) => d - days[i]!);
    /* The week is a repeating template, so the last press day and the first press day of
       the next week are neighbours in the athlete's life even though they sit in different
       rows of this check. Saturday plus Sunday is stacking; without the wrap it reads clean. */
    gaps.push(7 - days[days.length - 1]! + days[0]!);
    const worst = Math.min(...gaps);
    if (worst >= MIN_PRESS_GAP_DAYS) return [];

    return [err('vertical-press-spacing', `week ${w.week} (${b.name})`,
      `vertical press on ${pressDays.map(s => `${DAY_NAMES[s.day]} "${s.title}"`).join(' and ')}, ` +
      `closest gap ${worst} day. The floor of ${b.minVerticalPressSessions} exists to distribute the ` +
      `stimulus, and consecutive days deliver one session split in two while leaving the rest of the ` +
      `week empty. Separate vertical pressing days by at least ${MIN_PRESS_GAP_DAYS} days.`)];
  });

/**
 * 2c. Skill work must not stagnate.
 *
 * Blocked practice is correct for acquisition and wrong past roughly three weeks. If the
 * same skill menu repeats for more than 3 consecutive weeks, that is attendance.
 */
const skillVariety: Check = weeks => {
  /* There are two ways skill work stagnates and the previous version could only see one.
     Counting distinct menus WITHIN a week catches blocked practice, but a block that
     rotates four menus by day and then repeats that identical rotation for seven weeks
     scores a perfect 4 every week and never trips. Comparing the week's whole menu
     signature against the previous week catches both, because a blocked week and a
     static rotation are the same failure at different resolution. */
  const signature = (w: Week) => [...new Set(
    w.sessions
      .map(s => s.groups.flatMap(g => g.items.filter(i => i.tags.includes('skill')).map(i => i.name)).join('|'))
      .filter(Boolean)
  )].sort().join(' // ');

  const out: Violation[] = [];
  let run = 0;
  let prev = '';
  for (const w of weeks) {
    const sig = signature(w);
    if (!sig) { run = 0; prev = ''; continue; }
    run = sig === prev ? run + 1 : 1;
    prev = sig;
    if (run === 4)
      out.push(warn('skill-variety', `week ${w.week} and the 3 before it`,
        `identical skill menu for 4 straight weeks. Blocked practice suits acquisition and ` +
        `stops paying past roughly 3 weeks. Advance the progression or rotate by day.`));
  }
  return out;
};

/** 3. No metabolic conditioning circuits where the block forbids them. */
const noMetcon: Check = weeks =>
  weeks.flatMap(w => {
    const b = blockForWeek(w.week);
    if (b.allowsMetcon) return [];
    return w.sessions
      .filter(s => hasTag(s, 'metcon'))
      .map(s => err('no-metcon', `week ${w.week} day ${s.day}`,
        `"${s.title}" prescribes metcon work. ${b.name} forbids it: in a deficit, ` +
        `high-rep circuits add fatigue without the lean-mass retention signal.`));
  });

/**
 * 4. Skill work precedes lifting and is never to failure. ADR-0005.
 *
 * Two holes closed here. The tag list omitted `olympic`, so Block 2, where a snatch is the
 * fatiguing lift and nothing is tagged as strength, was exempt from the rule it needs most.
 * And only the FIRST skill group was inspected, so a session could open with skill work and
 * then bury a second skill item behind the barbell without the check noticing.
 */
const FATIGUING_TAGS: ItemTag[] = ['lower-strength', 'upper-strength', 'olympic'];

const skillPlacement: Check = weeks =>
  weeks.flatMap(w =>
    w.sessions.flatMap(s => {
      const skillIdxs = s.groups
        .map((g, idx) => (g.items.some(i => i.tags.includes('skill')) ? idx : -1))
        .filter(idx => idx >= 0);
      if (!skillIdxs.length) return [];
      const out: Violation[] = [];

      const offending = skillIdxs.find(gi =>
        s.groups.slice(0, gi).some(g =>
          g.items.some(i => FATIGUING_TAGS.some(t => i.tags.includes(t)))));
      if (offending !== undefined)
        out.push(err('skill-placement', `week ${w.week} day ${s.day}`,
          `"${s.title}" puts skill work in "${s.groups[offending]!.heading}" after fatiguing work. ` +
          `Motor learning degrades under fatigue.`));

      /* Only SKILL items, not every item that happens to share the group. A max strict
         pull-up test sitting beside a kip swing is strength testing taken to failure on
         purpose, and scoring it here flagged an intentional prescription as a defect. */
      if (skillIdxs.some(gi => s.groups[gi]!.items
        .filter(i => i.tags.includes('skill'))
        .some(i => /failure|amrap|max reps/i.test(i.prescription))))
        out.push(err('skill-placement', `week ${w.week} day ${s.day}`,
          `"${s.title}" prescribes skill work to failure.`));

      return out;
    }));

/**
 * 5. A deload reduces volume, not intensity.
 *
 * Only verifiable numerically in `load` blocks. In aerobic blocks the volume lives in
 * vertical gain and long-run distance, which are prose today. Encoding those as numbers
 * is a known gap, tracked in docs/decisions/0006.
 */
const totalSets = (wk: Week) => wk.sessions.reduce((t, s) =>
  t + s.groups.reduce((u, g) => u + g.items.reduce((v, i) => v + (i.sets ?? 0), 0), 0), 0);
const peakPct = (wk: Week) => wk.sessions.reduce((m, s) =>
  Math.max(m, ...s.groups.flatMap(g => g.items.map(i => i.pct ?? 0))), 0);

/**
 * 5b. A block must actually contain deloads.
 *
 * `deload-is-volume` only inspects weeks already declared as deloads, so a block that
 * declares none is perfectly compliant with it while breaking invariant 5 outright. That
 * is how Block 2 ran fifteen weeks without a down week and still reported clean.
 * Test weeks are their own reset and do not count toward the span.
 */
const MAX_WEEKS_BETWEEN_DELOADS = 4;

const deloadExists: Check = weeks => {
  const out: Violation[] = [];
  const seen = new Set<string>();
  for (const w of weeks) {
    const b = blockForWeek(w.week);
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    const span = b.lastWeek - b.firstWeek + 1;
    const trainingWeeks = span - b.testWeeks.length;
    /* A short block leading into an event is a peak, not a mesocycle. It does not need
       an internal down week because the taper is the down week. */
    if (trainingWeeks < 8) continue;

    /* Measures the GAP, not the count. Counting deloads was a poor proxy: it demanded three
       down weeks across fourteen training weeks even when two, placed correctly, already
       keep every unbroken run to four. What invariant 5 actually says is that you never
       train more than four consecutive weeks without backing off. Measure that. */
    let run = 0;
    let worst = 0;
    let worstEnd = 0;
    for (let wib = 1; wib <= span; wib++) {
      if (b.testWeeks.includes(wib)) { run = 0; continue; }
      if (b.deloadWeeks.includes(wib)) { run = 0; continue; }
      run++;
      if (run > worst) { worst = run; worstEnd = wib; }
    }
    if (worst > MAX_WEEKS_BETWEEN_DELOADS)
      out.push(err('deload-exists', `${b.name} (weeks ${b.firstWeek}-${b.lastWeek})`,
        `${worst} consecutive training weeks without a deload, ending at week ${wibToWeek(b.firstWeek, worstEnd)}. ` +
        `Invariant 5 caps that at ${MAX_WEEKS_BETWEEN_DELOADS}. Declared deloads: ` +
        `${b.deloadWeeks.length ? b.deloadWeeks.join(', ') : 'none'}.`));
  }
  return out;
};

const wibToWeek = (firstWeek: number, wib: number) => firstWeek + wib - 1;

/**
 * 5c. Prilepin's ceiling above 90%.
 *
 * methodology.md cites Prilepin by name as the basis for the Olympic work, so the program
 * is held to it: above 90%, roughly 4 to 10 total reps, optimum 7. This is the check that
 * catches a percentage wave being reused across lifts it was never written for.
 */
/**
 * Pulls, jerk recovery and support work are prescribed as a percentage of the competition
 * lift and are SUPPOSED to run at or above 100%. That is the whole point of them. Prilepin's
 * chart governs the classic lifts and the squats, so scoring a clean pull against it produces
 * a violation that is really just the check misunderstanding weightlifting.
 */
const SUPRAMAXIMAL = /\b(pull|recovery|support|halting|shrug)\b/i;

const prilepinCap: Check = weeks =>
  weeks.flatMap(w =>
    w.sessions.flatMap(s =>
      s.groups.flatMap(g => g.items.flatMap(i => {
        if (i.kind !== 'load') return [];
        if (SUPRAMAXIMAL.test(i.name)) return [];
        if (i.pct === undefined || i.pct < 0.90) return [];
        if (i.sets === undefined || i.reps === undefined) return [];
        const total = i.sets * i.reps;
        return total > 10
          ? [err('prilepin-cap', `week ${w.week} day ${s.day}`,
              `"${i.name}" prescribes ${i.sets} x ${i.reps} at ${Math.round(i.pct * 100)}%, ` +
              `${total} reps above 90%. Prilepin caps that near 10, optimum 7.`)]
          : [];
      }))));

const deloadIsVolume: Check = weeks =>
  weeks.flatMap(w => {
    const b = blockForWeek(w.week);
    const wib = w.week - b.firstWeek + 1;
    if (!b.deloadWeeks.includes(wib)) return [];
    if (b.volumeDriver !== 'load') return [];
    const prev = weeks.find(x => x.week === w.week - 1);
    if (!prev) return [];
    const out: Violation[] = [];
    if (totalSets(w) >= totalSets(prev))
      out.push(warn('deload-is-volume', `week ${w.week} (${b.name} wk ${wib})`,
        `deload prescribes ${totalSets(w)} loaded sets versus ${totalSets(prev)} the week before. ` +
        `A deload cuts volume.`));
    if (peakPct(w) > peakPct(prev) + 0.02)
      out.push(warn('deload-is-volume', `week ${w.week} (${b.name} wk ${wib})`,
        `deload raises peak intensity to ${Math.round(peakPct(w) * 100)}%. Cut sets, not weight.`));
    return out;
  });

/**
 * 6. Plyometric contact caps. Fresh, never fatigued.
 *
 * `plyoContacts` is a hand-typed integer that nothing forces to agree with the prescriptions
 * underneath it, so the cap could be satisfied by typing a smaller number. The declaration
 * cannot be derived from free-text prescriptions, but it can at least be forced to coexist
 * with actual plyo work, which catches the two ways it silently drifts.
 */
const plyoContactCap: Check = weeks =>
  weeks.flatMap(w => {
    const out: Violation[] = [];
    const total = w.sessions.reduce((t, s) => t + s.plyoContacts, 0);
    const b = blockForWeek(w.week);
    const wib = w.week - b.firstWeek + 1;

    for (const s of w.sessions) {
      const tagged = hasTag(s, 'plyo');
      if (tagged && s.plyoContacts === 0)
        out.push(warn('plyo-contact-cap', `week ${w.week} day ${s.day}`,
          `"${s.title}" prescribes plyo work but declares 0 contacts, so it is invisible to the cap.`));
      if (!tagged && s.plyoContacts > 0)
        out.push(warn('plyo-contact-cap', `week ${w.week} day ${s.day}`,
          `"${s.title}" declares ${s.plyoContacts} contacts with no plyo-tagged item.`));
    }

    if (total > 0) {
      const cap = b.id === 'power-and-olympic' && wib > 6 ? 80 : 120;
      if (total > cap)
        out.push(err('plyo-contact-cap', `week ${w.week}`,
          `${total} contacts prescribed, cap is ${cap} for this phase`));
    }
    return out;
  });

/** 7. Maintenance blocks keep intensity high even as set count falls. */
const maintenanceIntensity: Check = weeks =>
  weeks.flatMap(w => {
    const b = blockForWeek(w.week);
    if (!b.maintenanceFloorPct) return [];
    return w.sessions.flatMap(s =>
      s.groups.flatMap(g => g.items
        .filter(i => i.pct !== undefined)
        .flatMap(i => {
          const pct = i.pct!;
          /* Speed and technique work is deliberately sub-maximal. Word-anchored so the
             exemption cannot be claimed by an unrelated name that merely contains the
             substring, which would let any lift opt out of the floor by renaming. */
          if (/\b(speed|paused|technique)\b/i.test(i.name)) return [];
          return pct < b.maintenanceFloorPct!
            ? [warn('maintenance-intensity', `week ${w.week} day ${s.day}`,
                `"${i.name}" at ${Math.round(pct * 100)}%, below the ${Math.round(b.maintenanceFloorPct! * 100)}% maintenance floor. ` +
                `Cut sets in an endurance block, not weight.`)]
            : [];
        })));
  });

/** 8. Every session carries a why, and the know field says something specific. */
const whyCompleteness: Check = weeks =>
  weeks.flatMap(w =>
    w.sessions.flatMap(s => {
      const out: Violation[] = [];
      if (!s.why?.stimulus || !s.why?.purpose || !s.why?.know)
        out.push(err('why-completeness', `week ${w.week} day ${s.day}`, `"${s.title}" is missing a why field`));
      else if (s.why.know.length < 40)
        out.push(warn('why-completeness', `week ${w.week} day ${s.day}`,
          `"${s.title}" has a thin know field. It should name the thing people get wrong.`));
      return out;
    }));

/** 9. Equipment the athlete does not own must not appear in a prescription. */
const equipmentReality: Check = weeks =>
  weeks.flatMap(w =>
    w.sessions.flatMap(s =>
      s.groups.flatMap(g => g.items
        .filter(i => /\bsled\b|sled push|prowler|\bwatts\b|\bFTP\b/i.test(`${i.name} ${i.prescription}`))
        .map(i => err('equipment-reality', `week ${w.week} day ${s.day}`,
          `"${i.name}" needs equipment he does not have. No sled, and the spin bike has no power meter, so prescribe HR.`)))));

/** 10. No em dashes in athlete-facing copy. */
const houseStyle: Check = weeks =>
  weeks.flatMap(w =>
    w.sessions.flatMap(s => {
      const blob = [s.title, s.note, s.why?.stimulus, s.why?.purpose, s.why?.know,
        ...s.groups.flatMap(g => g.items.flatMap(i => [i.name, i.prescription, i.cue]))]
        .filter(Boolean).join(' ');
      return /\u2014/.test(blob)
        ? [warn('house-style', `week ${w.week} day ${s.day}`, `"${s.title}" contains an em dash`)]
        : [];
    }));

/**
 * 11. Belt weight must stay inside the range that was actually tested.
 *
 * `wpuSys` is a TOTAL system max: bodyweight plus belt. The added load available is
 * therefore `wpuSys - wpuSysTestedAtBwLb`, which is +40. `beltLoad()` subtracts CURRENT
 * bodyweight, so every pound lost moves a pound onto the belt for the same percentage.
 * That is the intended mechanism and it is why the cut pays the relative-strength goals
 * twice, but it has no ceiling in it.
 *
 * Today `bwAt()` is a fixed planning curve and the worst case is +35, so this cannot fire.
 * It exists because the curve is about to be fed by a scale, and a 9 lb overshoot on a
 * GLP-1 turns a compliant prescription into +45 for five sets of three without any edit.
 * The same shape as ADR-0010: safe while inert, dangerous once wired.
 */
const beltCeiling: Check = weeks =>
  weeks.flatMap(w =>
    w.sessions.flatMap(s =>
      s.groups.flatMap(g => g.items.flatMap(i => {
        if (i.kind !== 'belt' || i.loadLb === undefined) return [];
        const maxAdded = ATHLETE.maxes.wpuSys - ATHLETE.wpuSysTestedAtBwLb;
        return i.loadLb > maxAdded
          ? [err('belt-ceiling', `week ${w.week} day ${s.day}`,
              `"${i.name}" resolves to +${i.loadLb} lb, above the ${maxAdded} lb of added ` +
              `load ever tested. Retest wpuSys or lower the percentage before prescribing this.`)]
          : [];
      }))));

/**
 * 12. A percentage is only as good as the number underneath it.
 *
 * Every load in this program is a percentage of a tested max, and that mechanism is least
 * reliable exactly when the athlete regains fastest. He is retraining after twenty years of
 * lifting, not training from scratch, so strength comes back in weeks while a tested number
 * sits still for months. Block 2 ran fifteen weeks off a week-13 front squat: at a tested
 * 275 the week-26 prescription of 95% is 260 lb, and if the true max is back to 315 that
 * "95%" is 83%. The peaking phase turns into moderate work and nothing in the file changes.
 *
 * WHY DECLARED AND NOT INFERRED. Item names are prose: "Front squat 3RM", "C&J retest",
 * "Max strict pull-ups", "Block 1 retest". A regex over them works until somebody renames
 * one, and then the check goes quiet, which is the exact failure ADR-0011 documented. An
 * item declares `tests: ['fsq']` or it does not reset the clock. Forgetting the annotation
 * produces a warning, not silence, so the failure mode points the safe way.
 *
 * WHY 12 WEEKS. Not physiology, arithmetic on the program's own commitments. The shortest
 * gap it already schedules is 12 weeks (1 to 13, and 28 to 40). Twelve says the cadence the
 * program chose for itself is the ceiling, and the two 15-week gaps have to justify
 * themselves. A tighter number flags week 12 of a block whose week 13 is a test week, which
 * is the check being pedantic about a gap the program is already closing.
 *
 * WHY WARN AND NOT ERROR. Some of these gaps are deliberate. Block 2 contains no bench at
 * all, so the bench number is stale by design when Block 3 opens on it, and an error would
 * force either bolting bench onto a power block or weakening this check. Both are worse than
 * knowing. The remedy is usually a test result, which is athlete action, not a code change.
 */
const MAX_WEEKS_SINCE_TEST = 12;

interface Use { week: number; pct: number; example: string }

const staleMax: Check = weeks => {
  /*
   * Two passes, because the number that matters is the EXTENT of a stale run and a run's
   * extent is not known until it ends. One week over the cap and fourteen weeks over it are
   * different problems, and reporting only the week the run opens hides every improvement
   * made further inside it.
   */
  const testWeeks = new Map<LiftKey, number[]>();
  /** Worst case per lift per week: the highest percentage is where a stale max bites hardest. */
  const usage = new Map<LiftKey, Use[]>();

  for (const w of weeks)
    for (const s of w.sessions)
      for (const g of s.groups)
        for (const i of g.items) {
          for (const l of i.tests ?? []) {
            const ts = testWeeks.get(l) ?? [];
            if (ts[ts.length - 1] !== w.week) ts.push(w.week);
            testWeeks.set(l, ts);
          }
          if ((i.kind !== 'load' && i.kind !== 'belt') || !i.lift) continue;
          const us = usage.get(i.lift) ?? [];
          const pct = i.pct ?? 0;
          const last = us[us.length - 1];
          if (last?.week === w.week) {
            if (pct > last.pct) { last.pct = pct; last.example = `"${i.name}" ${i.prescription}`; }
          } else us.push({ week: w.week, pct, example: `"${i.name}" ${i.prescription}` });
          usage.set(i.lift, us);
        }

  const out: Array<Violation & { sort: number }> = [];
  for (const [l, uses] of usage) {
    /*
     * A derived max inherits its source's test schedule. The back squat is computed from
     * the front squat, so every front squat retest rebases it and it cannot go stale on
     * its own. Without this the check would demand a test for a lift that is not measured
     * by design, which is the wrong fix. See ADR-0016.
     */
    const src = ATHLETE.derivedMaxes?.[l];
    const ts = src
      ? [...new Set([...(testWeeks.get(l) ?? []), ...(testWeeks.get(src) ?? [])])].sort((a, b) => a - b)
      : (testWeeks.get(l) ?? []);
    /* Runs key on the test the percentages are drawn from. Week 0 is the baseline in
       src/athlete.ts, which is what a lift that is never tested runs off. */
    const runs = new Map<number, Use[]>();
    for (const u of uses) {
      const tested = ts.filter(t => t <= u.week).pop() ?? 0;
      if (u.week - tested <= MAX_WEEKS_SINCE_TEST) continue;
      runs.set(tested, [...(runs.get(tested) ?? []), u]);
    }
    for (const [tested, stale] of runs) {
      const first = stale[0]!.week;
      const last = stale[stale.length - 1]!.week;
      const worst = stale.reduce((a, b) => (b.pct > a.pct ? b : a));
      const span = first === last ? `week ${first}` : `weeks ${first} to ${last}`;
      out.push({
        invariant: 'stale-max', severity: 'warn', sort: first,
        where: `${span} (${blockForWeek(first).name}) · ${l}`,
        detail: tested === 0
          ? ATHLETE.derivedMaxes?.[l]
          ? `${span} prescribe percentages of a ${l} max derived from ${ATHLETE.derivedMaxes[l]}, ` +
            `which is itself never tested before week ${first}. Worst case ${worst.example}.`
          : `${span} prescribe percentages of a ${l} max that is never tested anywhere in the ` +
            `program. The value in src/athlete.ts is an estimate and every load drawn from it ` +
            `inherits that, worst case ${worst.example}. Schedule a test or stop deriving loads from it.`
          : `${span} prescribe percentages of a ${l} max last tested in week ${tested}, reaching ` +
            `${last - tested} weeks stale. Worst case ${worst.example}. He is retraining, so the true ` +
            `max moves faster than this schedule reads it, and a stale number silently turns a peaking ` +
            `percentage into moderate work. Cap is ${MAX_WEEKS_SINCE_TEST} weeks. Add a rep-max check ` +
            `at a deload week or accept the gap on purpose.`,
      });
    }
  }
  return out
    .sort((a, b) => a.sort - b.sort || a.where.localeCompare(b.where))
    .map(({ sort: _sort, ...v }) => v);
};

export const CHECKS: Array<{ name: string; run: Check }> = [
  { name: 'aerobic-floor',          run: aerobicFloor },
  { name: 'lower-body-floor',       run: lowerBodyFloor },
  { name: 'vertical-floors',        run: verticalFloors },
  { name: 'vertical-press-spacing', run: verticalPressSpacing },
  { name: 'skill-variety',          run: skillVariety },
  { name: 'no-metcon',              run: noMetcon },
  { name: 'skill-placement',        run: skillPlacement },
  { name: 'deload-exists',          run: deloadExists },
  { name: 'deload-is-volume',       run: deloadIsVolume },
  { name: 'prilepin-cap',           run: prilepinCap },
  { name: 'belt-ceiling',           run: beltCeiling },
  { name: 'stale-max',              run: staleMax },
  { name: 'plyo-contact-cap',       run: plyoContactCap },
  { name: 'maintenance-intensity',  run: maintenanceIntensity },
  { name: 'why-completeness',       run: whyCompleteness },
  { name: 'equipment-reality',      run: equipmentReality },
  { name: 'house-style',            run: houseStyle },
];

export function checkProgram(rp: ResolvedProgram): Violation[] {
  const byWeek = new Map<number, ResolvedSession[]>();
  for (const s of rp.sessions) {
    if (!byWeek.has(s.week)) byWeek.set(s.week, []);
    byWeek.get(s.week)!.push(s);
  }
  const weeks: Week[] = [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, sessions]) => ({ week, sessions }));
  return CHECKS.flatMap(c => c.run(weeks));
}
