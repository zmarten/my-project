/** Domain model. Program definition is deliberately separate from athlete resolution. */

export type LiftKey =
  | 'fsq' | 'bsq' | 'bench' | 'dl'
  | 'clean' | 'jerk' | 'snatch' | 'press' | 'wpuSys';

export interface Athlete {
  name: string;
  maxes: Record<LiftKey, number>;
  /**
   * Maxes computed from another lift rather than tested. A test of the source lift is a
   * test of everything derived from it, so `stale-max` reads the source's schedule.
   * Deriving does not make a number true. It makes it consistent and self-updating.
   */
  derivedMaxes?: Partial<Record<LiftKey, LiftKey>>;
  bodyweightLb: number;
  /** Bodyweight at which `wpuSys` was tested. Bounds the belt range. See ADR-0013. */
  wpuSysTestedAtBwLb: number;
  standingReachIn: number;
  /** Free-form facts that shape programming decisions. Read by the coach agent. */
  profile: string[];
  equipment: { has: string[]; lacks: string[] };
}

/** What a session asks for, before an athlete is applied. */
export type PrescriptionSpec =
  | { kind: 'load'; lift: LiftKey; pct: number; sets: number; reps: number | string; note?: string }
  /** Weighted pull-up. Percentage of total system load; resolves to belt weight. */
  | { kind: 'belt'; pct: number; sets: number; reps: number | string }
  /** Absolute weight, for lifts on linear progression rather than percentages. */
  | { kind: 'linear'; lb: number; sets: number; reps: number | string }
  | { kind: 'text'; detail: string }
  | { kind: 'duration'; minutes: [number, number] | number; detail?: string };

export type ItemTag =
  | 'aerobic' | 'lower-strength' | 'upper-strength' | 'skill'
  | 'vertical-pull' | 'vertical-press'
  | 'plyo' | 'sprint' | 'olympic' | 'metcon' | 'mobility' | 'test' | 'event';

export interface ItemSpec {
  name: string;
  prescription: PrescriptionSpec;
  cue?: string;
  /** Tags drive invariant checks. Keep them honest. */
  tags?: ItemTag[];
  /**
   * Which maxes in `athlete.maxes` this item re-establishes.
   *
   * Declared, not inferred. Item names are prose ("Front squat 3RM", "C&J retest",
   * "Max strict pull-ups") and a regex over them would silently miss a rename, which is
   * the failure mode ADR-0011 was written about. `stale-max` reads this and nothing else,
   * so forgetting the annotation produces a warning rather than silence.
   */
  tests?: LiftKey[];
}

export interface Why {
  stimulus: string;
  purpose: string;
  know: string;
}

export interface SessionSpec {
  title: string;
  durationLabel?: string;
  note?: string;
  why: Why;
  groups: Array<{ heading: string; items: ItemSpec[] }>;
  rest?: boolean;
  /** Plyometric ground contacts prescribed, for the contact-cap invariant. */
  plyoContacts?: number;
  /**
   * Aerobic volume as NUMBERS rather than display strings. ADR-0006 flagged the string
   * form as a real gap: it made aerobic deloads unverifiable and made the running ramp
   * into Block 5 invisible. Running miles specifically, not time on feet, because the
   * tissue question is eccentric loading and a hike with a pack does not answer it.
   */
  runMi?: number;
  vertFt?: number;
}

export interface BlockMeta {
  index: number;
  id: string;
  name: string;
  firstWeek: number;
  lastWeek: number;
  nutrition: string;
  bodyweightArc: string;
  goal: string;
  /* invariant thresholds, per block */
  minAerobicSessions: number;
  minLowerStrengthSessions: number;
  /** Muscle-ups and HSPU are strength problems, not skill problems. See ADR-0007. */
  minVerticalPullSessions: number;
  minVerticalPressSessions: number;
  allowsMetcon: boolean;
  maintenanceFloorPct?: number;
  /**
   * What "volume" means in this block. Deload verification compares loaded sets in
   * `load` blocks and is manual in `aerobic` blocks, where the volume lives in vert
   * and long-run distance rather than in the barbell.
   */
  volumeDriver: 'load' | 'aerobic';
}

export interface ProgramEvent {
  id: string;
  label: string;
  short: string;
  week: number;
  day: number;
}

export interface DayContext {
  /** 1-indexed across the whole program. */
  week: number;
  /** 1-indexed within the block. */
  weekInBlock: number;
  /** 0 = Monday. */
  day: number;
  date: Date;
  block: BlockMeta;
  phase: string;
  isDeload: boolean;
  isTestWeek: boolean;
  event?: ProgramEvent;
}

export interface Block extends BlockMeta {
  principles: string[];
  /** Weeks within this block that are deloads, 1-indexed. */
  deloadWeeks: number[];
  /** Weeks within this block that are test weeks, 1-indexed. */
  testWeeks: number[];
  phaseFor(weekInBlock: number): string;
  buildDay(ctx: DayContext): SessionSpec;
}

export interface Program {
  id: string;
  startDate: Date;
  totalWeeks: number;
  blocks: Block[];
  events: ProgramEvent[];
}

/* ---------- resolved output ---------- */

export interface ResolvedItem {
  name: string;
  prescription: string;
  /** Which prescription shape produced this. Invariants and the UI both branch on it. */
  kind: PrescriptionSpec['kind'];
  /**
   * Which max this percentage is drawn from. Only `load` prescriptions carry one, and
   * `belt` implies `wpuSys`. Threaded through so `stale-max` can ask how old the number
   * under a prescription is without parsing the display string.
   */
  lift?: LiftKey;
  loadLb?: number;
  /** Present for `load` prescriptions. Invariants reason on these, not on the string. */
  sets?: number;
  /** Numeric only when the prescription is a fixed rep count. Complexes stay strings. */
  reps?: number;
  pct?: number;
  cue?: string;
  tags: ItemTag[];
  /** Maxes this item re-establishes. Resets the `stale-max` clock for each one. */
  tests?: LiftKey[];
}

export interface ResolvedSession {
  week: number;
  weekInBlock: number;
  day: number;
  dateISO: string;
  blockId: string;
  blockIndex: number;
  title: string;
  durationLabel?: string;
  note?: string;
  why: Why;
  rest: boolean;
  plyoContacts: number;
  runMi: number;
  vertFt: number;
  groups: Array<{ heading: string; items: ResolvedItem[] }>;
}

export interface ResolvedProgram {
  programId: string;
  athlete: string;
  generatedAt: string;
  startDateISO: string;
  sessions: ResolvedSession[];
}

export interface Violation {
  invariant: string;
  severity: 'error' | 'warn';
  where: string;
  detail: string;
}
