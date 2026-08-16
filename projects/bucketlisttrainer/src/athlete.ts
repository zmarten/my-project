import type { Athlete } from './types.js';

/**
 * Baseline as of Aug 2026, after week 1 testing.
 *
 * The front squat was the highest-leverage unknown and it has now been tested: 255x3,
 * against a prediction of 310 to 330. The prediction was wrong and C&J 315 stays deferred.
 * See ADR-0002 and ADR-0008.
 *
 * Anything still marked estimated below needs a test date attached to it. An estimate that
 * is never scheduled for testing is a guess with better formatting, which is the process
 * lesson from ADR-0009 and the reason `stale-max` exists.
 */
/** Round to the nearest 5, floor at an empty bar. Declared before `zach` because the
    derived back squat calls it while the athlete object is being built. */
export const roundLoad = (n: number): number => Math.max(45, Math.round(n / 5) * 5);

/**
 * Front squat as a fraction of back squat.
 *
 * The back squat is never tested anywhere in this program, yet 38 sessions across 38 weeks
 * prescribe percentages of it, worst case 3 x 3 at 89%. The old value of 320 was an
 * inference off a front squat prediction of 310 to 330 that came back at 255x3, so it was
 * an estimate built on a number already known to be wrong, with no path to correction.
 *
 * 0.85 is mid-range. The honest range is 0.80 to 0.90, and it drifts upward for a lifter
 * who front squats heavily, which this program does deliberately. So this is still an
 * estimate. What changed is that it is now the SAME estimate as the front squat: every
 * front squat retest in weeks 13, 18, 23, 28, 32 and 35 rebases it, and it can no longer
 * go stale on its own. See ADR-0016.
 */
const FSQ_AS_FRACTION_OF_BSQ = 0.85;
const FSQ_TESTED = 275;   // TESTED Aug 2026: 255x3. The 310-330 prediction was wrong. ADR-0008.

export const zach: Athlete = {
  name: 'Zach',
  derivedMaxes: { bsq: 'fsq' },
  maxes: {
    fsq: FSQ_TESTED,
    bsq: roundLoad(FSQ_TESTED / FSQ_AS_FRACTION_OF_BSQ),
    bench: 275,   // TESTED Aug 2026: 255x3
    dl: 525,      // tested Dec 2025. 500x3 since, which predicts ~550.
    clean: 245,   // revised. A 275 fsq caps a full clean near 240; his 275 is a POWER clean.
    jerk: 255,    // now ABOVE his full clean, so the clean is the C&J limiter, not the jerk.
    snatch: 185,
    press: 170,   // estimated from a 275 bench. Strict-HSPU gate is ~0.75-0.80x bodyweight.
    wpuSys: 305,  // TESTED Aug 2026: 5 strict at 265 bw. Max added is +40, not +55.
  },
  bodyweightLb: 265,
  /**
   * The bodyweight `wpuSys` was tested at. This is not decoration.
   *
   * System max is bodyweight plus belt, so the ADDED load available is `wpuSys` minus the
   * bodyweight at test: 305 - 265 = +40. `beltLoad()` subtracts CURRENT bodyweight, so the
   * lighter he gets the more the belt takes to hit the same percentage. At the planned 239
   * in week 12 that is +35, comfortably inside the range. At 230, a 9 lb overshoot that is
   * ordinary on a GLP-1, the same prescription resolves to +45, above anything he has ever
   * lifted, for five sets of three.
   *
   * Harmless while `bwAt()` is a fixed planning curve. Live the moment a scale feeds it.
   * `belt-ceiling` enforces the range. See ADR-0013.
   */
  wpuSysTestedAtBwLb: 265,
  standingReachIn: 96.5,

  profile: [
    'Fast-twitch dominant. High RFD, comparatively poor max-effort grinding.',
    'Front squat 275 is the binding constraint on every Olympic lift target. C&J 315 needs ~360.',
    'Only 5 strict pull-ups at 265. Weighted pull-up work must wait for bodyweight volume + the cut.',
    'Tested DL single (525) underperforms rep max (500x3). Expressing a max is an undertrained skill.',
    'Has grabbed rim at a bodyweight above 265, so >=23.5in running vertical is demonstrated.',
    'Can palm a basketball. One-hand, one-foot approach dunk is the target.',
    'Long arms at 6ft. Bench is a leverage problem as much as a strength problem.',
    'On retatrutide through roughly January. Appetite suppression makes protein targets hard.',
    'Macro protocol: 2300 cal, 210g protein. ~1.95 g/kg at a 237lb target.',
    'Heavy sweater on a low-carb baseline. Carbohydrate tolerance at intensity needs training.',
    'Hunting Sept-Nov (archery elk, upland with pointing dogs, rifle). Weekday consistency suffers.',
    'Infant at home and a new job. Sleep is the binding constraint on the whole year.',
    'Completed a 24mi / 4900ft mountain run (Cirque of the Towers) Aug 2026.',
  ],

  equipment: {
    has: [
      'barbell + bumpers + platform',
      'squat rack',
      'pull-up bar (bar muscle-ups possible)',
      'Rogue rings (LOW anchor only)',
      'spin bike (no power meter, HR only)',
      'Rogue Echo rower (has monitor)',
      'treadmill',
    ],
    lacks: [
      'sled',
      'high ring anchor >=9ft (blocks ring muscle-up practice, needs solving by Oct)',
      'bike power meter',
      'basketball hoop at home',
    ],
  },
};

export const resolveLoad = (a: Athlete, lift: keyof Athlete['maxes'], pct: number): number =>
  roundLoad(a.maxes[lift] * pct);

/**
 * Running vertical needed for a controlled one-hand dunk.
 * Rim 120in, hand needs ~126in at apex.
 */
export const dunkRequirementIn = (a: Athlete): number => 126 - a.standingReachIn;

/**
 * Planned bodyweight by week. A planning assumption, not a measurement.
 *
 * This exists because weighted pull-ups are prescribed as TOTAL SYSTEM LOAD
 * (bodyweight + belt) rather than added load. Every pound cut is a pound that can go
 * on the belt for the same total, so belt weight climbs through Block 1 with zero
 * strength gain. Relative-strength goals get paid twice by the cut.
 */
const BW_SEGMENTS: Array<[number, number, number, number]> = [
  [1, 13, 265, 237], [14, 28, 237, 237], [29, 40, 237, 247],
  [41, 45, 247, 240], [46, 55, 240, 233],
];
export const bwAt = (week: number): number => {
  for (const [w0, w1, s0, s1] of BW_SEGMENTS) {
    if (week >= w0 && week <= w1) {
      const t = w1 === w0 ? 0 : (week - w0) / (w1 - w0);
      return Math.round(s0 + (s1 - s0) * t);
    }
  }
  return 265;
};

/** Belt load only. Can legitimately be zero, so no empty-bar floor. */
export const beltLoad = (a: Athlete, pct: number, week: number): number =>
  Math.max(0, Math.round((a.maxes.wpuSys * pct - bwAt(week)) / 5) * 5);
