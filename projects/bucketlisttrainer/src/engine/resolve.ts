import type {
  Athlete, ItemSpec, LiftKey, Program, ResolvedItem, ResolvedProgram, ResolvedSession, DayContext,
} from '../types.js';
import { resolveLoad, beltLoad } from '../athlete.js';
import { dateOf, iso } from './calendar.js';
import { blockForWeek } from '../program/index.js';

/** Rep counts are numeric only when fixed. "1 clean + 1 front squat + 1 jerk" is not a rep count. */
const numericReps = (reps: number | string): number | undefined =>
  typeof reps === 'number' ? reps : undefined;

function describe(item: ItemSpec, a: Athlete, week: number):
  { prescription: string; kind: ItemSpec['prescription']['kind']; lift?: LiftKey; loadLb?: number; sets?: number; reps?: number; pct?: number } {
  const p = item.prescription;
  if (p.kind === 'belt') {
    /* Belt weight legitimately reaches zero when the percentage of system max is at or
       below current bodyweight. That is bodyweight work, and saying "+0 lb on the belt"
       reads as a bug rather than as a prescription. */
    const lb = beltLoad(a, p.pct, week);
    return {
      prescription: lb > 0
        ? `${p.sets} x ${p.reps}, +${lb} lb on the belt`
        : `${p.sets} x ${p.reps} at bodyweight`,
      kind: 'belt',
      /* A belt percentage is a percentage of the weighted pull-up SYSTEM max. Naming the
         lift here is what lets `stale-max` age it like any other percentage. */
      lift: 'wpuSys',
      loadLb: lb,
      sets: p.sets,
      reps: numericReps(p.reps),
      pct: p.pct,
    };
  }
  if (p.kind === 'linear') {
    return {
      prescription: `${p.sets} x ${p.reps} @ ${p.lb} lb`,
      kind: 'linear',
      loadLb: p.lb,
      sets: p.sets,
      reps: numericReps(p.reps),
    };
  }
  if (p.kind === 'load') {
    return {
      prescription: `${p.sets} x ${p.reps} @ ${Math.round(p.pct * 100)}%`,
      kind: 'load',
      lift: p.lift,
      loadLb: resolveLoad(a, p.lift, p.pct),
      sets: p.sets,
      reps: numericReps(p.reps),
      pct: p.pct,
    };
  }
  if (p.kind === 'duration') {
    const m = Array.isArray(p.minutes) ? `${p.minutes[0]}-${p.minutes[1]} min` : `${p.minutes} min`;
    return { prescription: p.detail ? `${m}, ${p.detail}` : m, kind: 'duration' };
  }
  return { prescription: p.detail, kind: 'text' };
}

export function resolveSession(program: Program, a: Athlete, week: number, day: number): ResolvedSession {
  const block = blockForWeek(week);
  const weekInBlock = week - block.firstWeek + 1;
  const date = dateOf(week, day);
  const event = program.events.find(e => e.week === week && e.day === day);

  const ctx: DayContext = {
    week, weekInBlock, day, date, block,
    phase: block.phaseFor(weekInBlock),
    isDeload: block.deloadWeeks.includes(weekInBlock),
    isTestWeek: block.testWeeks.includes(weekInBlock),
    event,
  };

  const spec = block.buildDay(ctx);

  return {
    week, weekInBlock, day,
    dateISO: iso(date),
    blockId: block.id,
    blockIndex: block.index,
    title: spec.title,
    durationLabel: spec.durationLabel,
    note: spec.note,
    why: spec.why,
    rest: !!spec.rest,
    plyoContacts: spec.plyoContacts ?? 0,
    runMi: spec.runMi ?? 0,
    vertFt: spec.vertFt ?? 0,
    groups: spec.groups.map(g => ({
      heading: g.heading,
      items: g.items.map((it): ResolvedItem => ({
        name: it.name,
        ...describe(it, a, week),
        cue: it.cue,
        tags: it.tags ?? [],
        tests: it.tests,
      })),
    })),
  };
}

export function resolveProgram(program: Program, a: Athlete): ResolvedProgram {
  const sessions: ResolvedSession[] = [];
  for (let w = 1; w <= program.totalWeeks; w++)
    for (let d = 0; d < 7; d++) sessions.push(resolveSession(program, a, w, d));
  return {
    programId: program.id,
    athlete: a.name,
    generatedAt: new Date().toISOString(),
    startDateISO: iso(program.startDate),
    sessions,
  };
}
