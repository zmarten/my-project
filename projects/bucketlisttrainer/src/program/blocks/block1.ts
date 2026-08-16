import type { Block, DayContext, SessionSpec, Why } from '../../types.js';
import type { ItemSpec, LiftKey } from '../../types.js';
import { zach } from '../../athlete.js';
import { lift, linear, belt, text, dur, rest, skillGroup, WHY_TEST, WHY_DELOAD } from '../helpers.js';

/** [pct, sets, reps] per week. null = test week. */
const WAVE: (readonly [number, number, number] | null)[] = [
  null,
  [0.76, 4, 5], [0.78, 4, 5], [0.80, 4, 5], [0.82, 4, 5],
  [0.72, 3, 5],
  [0.83, 4, 4], [0.85, 4, 4], [0.87, 4, 4],
  [0.75, 3, 4],
  [0.87, 5, 3], [0.89, 5, 3],
  null,
];

/**
 * Strict press runs LINEAR, not on percentages, because percentage waves off a static
 * baseline cannot drive a max that is supposed to climb inside the block, and small
 * lifts with 5 lb jumps progress linearly anyway.
 *
 * The opener is DERIVED from the tested max rather than hardcoded. A fixed 125 lb start
 * only made sense at a 170 max; at 150 it is 83% for a set of five and at 185 it is far
 * too light. Test the press before trusting any of this. See ADR-0009.
 */
const PRESS_OFFSETS: Record<number, readonly [number, number, number]> = {
  2: [5, 5, 0], 3: [5, 5, 5], 4: [5, 5, 10], 5: [5, 5, 15],
  6: [3, 5, -5],
  7: [4, 4, 20], 8: [4, 4, 25], 9: [4, 4, 30],
  10: [3, 4, 10],
  11: [5, 3, 30], 12: [5, 3, 35],
};
const PRESS_MAX = zach.maxes.press;
const pressPlan = (wb: number, pressMax: number): readonly [number, number, number] | null => {
  const m = PRESS_OFFSETS[wb];
  if (!m) return null;
  const base = Math.round((pressMax * 0.74) / 5) * 5;
  return [m[0], m[1], base + m[2]];
};

/**
 * Vertical pull is an EXPLICIT progression, not percentages.
 *
 * He tested 5 strict pull-ups at 265, so the system max is ~305 and the entire available
 * added-load range is 0 to +40. Percentage work is meaningless across a 40 lb span, and
 * the first draft prescribed 5x3 at +30 in week 2, which was 97% of his actual max.
 *
 * Bodyweight volume first. The cut does the work: the same absolute strength at 237 is
 * roughly 9 bodyweight reps, which clears the bar muscle-up gate on its own. See ADR-0008.
 */
const pullMonday = (wb: number): ItemSpec =>
  wb <= 3 ? text('Strict pull-up', '6 x 3, 2 min rest',
      { cue: 'Sets across at bodyweight. Your max is 5, so triples are the right dose. Do not grind.', tags: ['vertical-pull'] })
  : wb <= 5 ? text('Strict pull-up', '5 x 4, controlled',
      { cue: 'Reps should rise as bodyweight falls. That is the mechanism.', tags: ['vertical-pull'] })
  : wb <= 7 ? text('Strict pull-up', '5 x 5',
      { cue: 'When 5 x 5 is clean, belt weight starts next week.', tags: ['vertical-pull'] })
  /* Belt weight is a percentage of TOTAL SYSTEM LOAD, not an absolute number. These used to
     be hardcoded as +15/+25/+35, which meant the mechanism the README describes was never
     actually running: belt weight could not respond to a retested wpuSys or to the cut
     landing differently than planned. Holding the percentage flat while bodyweight falls is
     what makes the belt climb on its own. See ADR-0010. */
  : wb <= 9 ? belt('Weighted pull-up', 0.87, 5, 3,
      { cue: 'Same percentage as last week. The belt gets heavier because you got lighter.' })
  : wb <= 11 ? belt('Weighted pull-up', 0.89, 5, 3)
  : belt('Weighted pull-up', 0.90, 5, 3,
      { cue: 'About 90% of system max, earned mostly by the cut.' });

const pullFriday = (wb: number): ItemSpec =>
  wb <= 3 ? text('Strict pull-up, tempo', '4 x 3, 3 sec lower',
      { cue: 'Eccentric volume builds the tissue that makes the reps come.', tags: ['vertical-pull'] })
  : wb <= 5 ? text('Chest-to-bar pull-up', '5 x 3, strict', { tags: ['vertical-pull'] })
  : wb <= 7 ? text('Chest-to-bar pull-up', '5 x 4, strict', { tags: ['vertical-pull'] })
  : wb <= 9 ? text('Chest-to-bar pull-up', '5 x 5, fast', { tags: ['vertical-pull'] })
  : text('Chest-to-bar pull-up', '4 x 6, explosive to sternum',
      { cue: 'Sternum, not chin. A bar muscle-up needs the bar arriving low on your torso.', tags: ['vertical-pull'] });

/** HSPU progression is LOADED, not merely repeated. Range, then deficit, then eccentric. */
function hspuItem(wb: number) {
  if (wb <= 4) return text('Box HSPU, feet elevated', '4 x 5, full range',
    { cue: 'Head to a pad. Range before load.', tags: ['vertical-press'] });
  if (wb <= 7) return text('Deficit box HSPU', '4 x 4, hands on 25 lb plates',
    { cue: 'Deeper range is the progression, not more reps.', tags: ['vertical-press'] });
  if (wb <= 10) return text('Wall-facing HSPU negatives', '5 x 3, 5 sec lower',
    { cue: 'Nose to the floor. If you cannot control the lower, you cannot press it up.', tags: ['vertical-press'] });
  return text('Strict HSPU attempt', '6 x 1-3, wall-facing',
    { cue: 'Attempt fresh. Six quality tries beats twenty tired ones.', tags: ['vertical-press'] });
}

const WHY: Record<number, Why> = {
  0: {
    stimulus: 'Maximal strength · neural · low volume',
    purpose:
      'Front squat is the gate on a 315 clean and jerk and it needs 28 weeks of runway, not 15. Bench frequency starts here because upper-body pressing costs almost nothing against fat loss or running.',
    know:
      'You are in a deficit, so you are not building much. The job is to hold what you have. Heavy loads tell the body to keep the muscle. High-rep sweat circuits tell it the opposite, which is why there are none in this block.',
  },
  1: {
    stimulus: 'Technical · overhead · sub-maximal',
    purpose:
      'Your jerk sits below your clean, which is backwards for almost everyone. That is a technique and overhead-confidence problem, and the fix is repeated exposure to good positions, not heavier loads.',
    know:
      'Quality reps beat heavy reps. If a rep looked ugly it did not count. Stop at the prescribed sets even if you feel good, because the adaptation you want is a motor pattern and fatigue corrupts it.',
  },
  2: {
    stimulus: 'Aerobic base · zone 2 · mitochondrial',
    purpose:
      'Builds the engine that Blocks 4 and 5 spend. Low-intensity volume drives mitochondrial density and capillary growth, the slowest adaptation in the program and therefore the one that starts first.',
    know:
      'Bike, not run. Cycling interferes with strength adaptation measurably less than running does. Cap by heart rate, not feel, because the spin bike has no power meter.',
  },
  3: {
    stimulus: 'Maximal strength · hinge · plus pressing volume',
    purpose:
      'One heavy hinge exposure per week is enough. Deadlift recovery cost is disproportionate to its training effect, and there is a whole block in the spring dedicated to it.',
    know:
      'Bench today is volume at 70%, not a second heavy day. Protect this session and Monday above all others when hunting eats the week.',
  },
  4: {
    stimulus: 'Maximal strength · general · accessory',
    purpose:
      'Back squat is the base underneath the front squat and the strict press is the base underneath the jerk. Neither is a bucket list lift. Both are what the bucket list lifts sit on.',
    know:
      'First session to cut if the week goes sideways. Tuesday is second. Monday and Thursday never go. ' +
      'The HSPU sets travel with the cut: move them to Thursday, do not drop them. One pressing day a week is ' +
      'maintenance, and you are trying to add 15 lb to a press.',
  },
  5: {
    stimulus: 'Aerobic durability · time on feet · fat oxidation',
    purpose:
      'Long, slow and boring is the point. Trains substrate use and connective tissue tolerance, both of which take months and neither of which responds to intensity.',
    know: 'Hunting counts. A day behind pointing dogs with a pack on is this stimulus. Log it and take the session off. Do not do both.',
  },
  6: {
    stimulus: 'Recovery · full rest',
    purpose: 'Adaptation happens in the absence of training. A programmed off day is a training input.',
    know:
      'With an infant and a new job, sleep is the variable most likely to limit the year. Under six hours consistently means cut session volume by a third rather than pushing through.',
  },
};

const huntNote = (w: number) =>
  w >= 4 && w <= 12
    ? 'Hunting season. If a day goes to the field, drop Tuesday or Friday, never Monday or Thursday.'
    : undefined;

function testWeekIn(ctx: DayContext): SessionSpec {
  const { day } = ctx;
  if (day === 0) return {
    title: 'Test day 1', durationLabel: '75 min', why: WHY_TEST,
    note: 'Cirque was 11 days ago and you are recovered. Test first, train after.',
    groups: [
      { heading: 'Test', items: [
        text('Front squat 3RM', 'the number that decides the C&J plan', {
          cue: 'The 275 guess is probably 30-40 lbs low. You cannot clean 275 and front squat 275.',
          tags: ['test', 'lower-strength'], tests: ['fsq'] }),
        text('Bench 3RM', 'nail down the real number between 255 and 275', {
          tags: ['test', 'upper-strength'], tests: ['bench'] }),
      ]},
      { heading: 'Then', items: [
        /* This set is where `wpuSys` comes from: bodyweight x (1 + reps / 30). It was never
           tagged as a test, so the one max that drives every belt load looked untested. */
        text('Max strict pull-ups', 'one set', { tags: ['test', 'upper-strength'], tests: ['wpuSys'] }),
        text('Log everything in src/athlete.ts', 'do it before you leave the garage'),
      ]},
    ],
  };
  if (day === 1) return {
    title: 'Test day 2', durationLabel: '50 min', why: WHY_TEST,
    note: 'Explosive tests only. Full recovery between attempts, stop when the numbers stop climbing.',
    groups: [{ heading: 'Test', items: [
      text('Running vertical jump', 'chalk the fingers, mark the wall, 6 attempts', {
        cue: 'You need 29.5in to dunk. Rim grab at a heavier bodyweight means expect 23-26 today.', tags: ['test', 'plyo'] }),
      text('Snatch and clean', 'work to a comfortable single, no maxes', { tags: ['olympic'] }),
    ]}],
  };
  if (day === 2) return {
    title: 'Zone 2', durationLabel: '40 min', why: WHY[2],
    note: 'Easy. The last test day is Saturday.',
    groups: [{ heading: 'Aerobic', items: [dur('Spin bike, zone 2', 40, undefined, { tags: ['aerobic'] })] }],
  };
  /* Thursday used to repeat Saturday's deadlift test verbatim, a leftover from ADR-0009
     moving the test days. Skill work starts here instead, which is where it belonged. */
  if (day === 3) return {
    title: 'Skill start', durationLabel: '50 min', why: WHY[2],
    note: 'First skill session of the year. Easy aerobic after, nothing that costs you Saturday.',
    groups: [
      skillGroup(1, 1, day),
      { heading: 'Aerobic', items: [dur('Spin bike, zone 2', 40, 'HR-capped', { tags: ['aerobic'] })] },
    ],
  };
  if (day === 4) return {
    title: 'Easy before test day', durationLabel: '30 min', why: WHY[2],
    note: 'Saturday tests a max press and a max deadlift. Today exists to protect that.',
    groups: [{ heading: 'Aerobic', items: [
      dur('Spin bike, easy', 30, 'conversational, well under zone 2 cap', { tags: ['aerobic'] }),
    ]}],
  };
  if (day === 5) return {
    title: 'Test day 3', durationLabel: '75 min', why: WHY_TEST,
    note: 'Press first, deadlift second, and that order is not negotiable. A max deadlift ' +
          'would cost the press 5 to 10% through trunk and general fatigue. Pressing first ' +
          'costs the deadlift about 1%.',
    groups: [
      { heading: 'Test 1, strict press', items: [
        text('Strict press 3RM', 'standing, no leg drive, from the rack', {
          cue: 'The gate on the strict HSPU. At 237 bodyweight you need roughly 178-190 to be in range.',
          tags: ['test', 'vertical-press'], tests: ['press'] }),
      ]},
      { heading: 'Test 2, deadlift', items: [
        text('Deadlift 3RM', 'you did 500x3 cold, so open conservatively', {
          tags: ['test', 'lower-strength'], tests: ['dl'] }),
        text('Deadlift heavy single', 'one attempt above the triple', {
          cue: 'Your tested 525 underperforms your rep max. Practice expressing a max.',
          tags: ['test', 'lower-strength'], tests: ['dl'] }),
      ]},
      /* Deliberately untagged. This item is a note about work that is NOT performed today,
         and tagging it `aerobic` let it satisfy the weekly aerobic floor for free. */
      { heading: 'Not today', items: [
        text('30-minute rower time trial', 'moved to Wednesday of week 2', {
          cue: 'A rower TT after a max deadlift produces a number you cannot use.' }),
      ]},
    ],
  };
  return rest(WHY[6]);
}

function testWeekOut(ctx: DayContext): SessionSpec {
  const { day } = ctx;
  /* Each entry names the maxes it re-establishes. `stale-max` reads that list, so a retest
     that forgets to declare what it measured shows up as a stale lift rather than as
     nothing at all. The rower and the vertical jump feed no percentage, so they declare none. */
  const map: Record<number, Array<[string, LiftKey[]]>> = {
    0: [['Front squat 3RM', ['fsq']], ['Bench 3RM or 1RM', ['bench']]],
    1: [['Jerk heavy single', ['jerk']], ['Max strict pull-ups', ['wpuSys']]],
    3: [['Deadlift 3RM and heavy single', ['dl']]],
    4: [['30-min rower retest', []], ['Running vertical jump retest', []]],
  };
  if (day === 2) return {
    title: 'Zone 2', durationLabel: '40 min', why: WHY[2],
    groups: [{ heading: 'Aerobic', items: [dur('Spin bike, zone 2', 40, undefined, { tags: ['aerobic'] })] }],
  };
  if (day === 5) return {
    title: 'Long aerobic', durationLabel: '90 min', why: WHY[5],
    note: 'Block 1 is done. Update maxes tonight so Block 2 loads are right.',
    groups: [{ heading: 'Aerobic', items: [dur('Easy trail effort', 90, undefined, { tags: ['aerobic'] })] }],
  };
  if (day === 6) return rest(WHY[6]);
  return {
    title: 'Block 1 retest', durationLabel: '60 min', why: WHY_TEST,
    note: 'Twelve weeks in a deficit. Holding your numbers is a win. Beating them means the block worked.',
    groups: [
      { heading: 'Test', items: (map[day] ?? []).map(([n, lifts]) =>
        text(n, 'work to a top set', { tags: ['test'], ...(lifts.length ? { tests: lifts } : {}) })) },
      { heading: 'Also log', items: [
        text('Bodyweight', 'target 237'),
        text('HSPU, bar MU, handstand walk status', 'yes or no on each', { tags: ['skill'] }),
      ]},
    ],
  };
}

export const block1: Block = {
  index: 1,
  id: 'strip-and-skill',
  name: 'Strip & Skill',
  firstWeek: 1,
  lastWeek: 13,
  nutrition: 'Deficit. 2300 cal, 210g protein.',
  bodyweightArc: '265 → 237',
  goal: 'Cut 28 lbs, bank gymnastics skill, build front squat and jerk early.',
  minAerobicSessions: 2,
  minVerticalPullSessions: 2, minVerticalPressSessions: 2, minLowerStrengthSessions: 2,
  allowsMetcon: false, volumeDriver: 'load',
  deloadWeeks: [6, 10],
  testWeeks: [1, 13],
  principles: [
    'A caloric deficit is a poor environment for building. This block preserves and learns skills instead.',
    'Intensity preserves lean mass, volume fatigues. 3-5 sets of 3-5 at 80-88%, no circuits.',
    'Relative strength goals get cheaper as bodyweight drops. 265 to 237 is an 11% reduction in what you press and pull.',
    'Three gymnastics goals are strength problems wearing skill costumes. A strict HSPU needs a press near 0.75-0.80x bodyweight; muscle-ups need heavy vertical pulling. Weighted pull-ups run twice weekly as a PRIMARY lift, and the strict press is primary on Tuesday. Bench dropped to one exposure to pay for it.',
    'Weighted pull-ups are prescribed as total system load, so belt weight climbs as bodyweight falls. The cut pays the relative-strength goals twice.',
    'Skill work is 8 min and 2 items: blocked weeks 1-3, variable by day from week 4. Blocked suits acquisition, variable retains and transfers.',
    'Front squat and jerk need 28 weeks, not 15, so they start here.',
  ],
  phaseFor: (w) => (w <= 3 ? 'blocked practice' : w <= 7 ? 'strength conversion' : w <= 10 ? 'eccentric' : 'attempts'),

  buildDay(ctx: DayContext): SessionSpec {
    const { weekInBlock: wb, day, week } = ctx;
    if (wb === 1) return testWeekIn(ctx);
    if (wb === 13) return testWeekOut(ctx);
    const [pct, sets, reps] = WAVE[wb - 1]!;
    const press = pressPlan(wb, PRESS_MAX)!;
    const why = ctx.isDeload && day !== 6 ? WHY_DELOAD : WHY[day];
    const note = huntNote(week);

    switch (day) {
      /* The HSPU progression used to sit here, the day before Tuesday's heavy strict press.
         Two pressing days back to back is one long pressing session with a sleep in it, and
         it put the lift the whole HSPU goal is gated on on pre-fatigued triceps and delts.
         It now runs Friday, three days out. See ADR-0014. */
      case 0: return {
        title: 'Squat + vertical pull', durationLabel: '55 min', why, note,
        groups: [
          skillGroup(1, wb, day),
          { heading: 'Primary', items: [
            lift('Front squat', 'fsq', pct, sets, reps, {
              cue: 'Elbows up. The gate on a 315 clean and jerk.', tags: ['lower-strength'] }),
            pullMonday(wb),
          ]},
          { heading: 'Accessory', items: [
            text('One-arm DB row', '3 x 10 each side', { tags: ['upper-strength'] }),
          ]},
        ],
      };
      case 1: return {
        title: 'Vertical press + jerk', durationLabel: '60 min', why, note,
        groups: [
          skillGroup(1, wb, day),
          { heading: 'Primary', items: [
            linear('Strict press', press[2], press[0], press[1], {
              cue: 'Linear, not percentage-based. Add 5 lb when the prescription says to and the reps are clean.',
              tags: ['vertical-press', 'upper-strength'] }),
            text('Seated DB press', '3 x 8, strict', {
              cue: 'No leg drive. Deep range.', tags: ['vertical-press'] }),
          ]},
          { heading: 'Jerk, technical', items: [
            lift('Jerk from rack', 'jerk', pct * 0.80, 5, 2, {
              cue: 'Footwork over load. Your jerk sits below your clean and that is technical.', tags: ['olympic'] }),
          ]},
          { heading: 'Ring muscle-up inputs', items: [
            text('False grip ring pull-up', '5 x 3', { tags: ['vertical-pull'] }),
            text('Strict ring dip', '4 x 5', { tags: ['vertical-press'] }),
          ]},
        ],
      };
      case 2: return wb === 2
        ? {
            title: 'Aerobic baseline', durationLabel: '50 min', why: WHY_TEST,
            note: 'Deferred from Saturday so you test it on fresh legs. This is the number you retest in week 13.',
            groups: [
              { heading: 'Test', items: [
                text('30-minute rower time trial', 'record total meters and average HR', {
                  cue: 'Even pacing. Going out hard makes the retest flattering rather than useful.',
                  tags: ['test', 'aerobic'] }),
              ]},
              { heading: 'After', items: [dur('Easy spin', 15, undefined, { tags: ['aerobic'] })] },
            ],
          }
        : {
            title: 'Zone 2', durationLabel: '45-70 min', why,
            note: 'Bike today. Heart rate zone 2 off the Garmin, not perceived effort.',
            groups: [{ heading: 'Aerobic', items: [
              dur('Spin bike, zone 2', [45, 70], 'conversational', { tags: ['aerobic'] }),
              dur('Ankle and hip mobility', 10, undefined, { tags: ['mobility'] }),
            ]}],
          };
      case 3: return {
        title: 'Hinge + bench', durationLabel: '60 min', why, note,
        groups: [
          skillGroup(1, wb, day),
          { heading: 'Primary', items: [
            lift('Deadlift', 'dl', pct, Math.max(3, sets - 1), reps, { tags: ['lower-strength'] }),
            lift('Bench press', 'bench', pct, sets, reps, {
              cue: 'The only heavy bench day this block. Bench is a Block 3 goal, here it just holds.',
              tags: ['upper-strength'] }),
          ]},
          { heading: 'Accessory', items: [
            text('Barbell row', '4 x 8', { tags: ['upper-strength'] }),
            text('Hanging leg raise', '3 x 12'),
          ]},
        ],
      };
      case 4: return {
        title: 'Squat + explosive pull + HSPU', durationLabel: '70 min', why, note,
        groups: [
          skillGroup(1, wb, day),
          /* Moved ahead of the squat. The kip swing and the banded transition are motor
             patterns, and rehearsing them on a trunk fatigued by heavy back squats teaches
             the compensation rather than the movement. ADR-0005. */
          { heading: 'Bar muscle-up inputs', items: [
            /* On the weeks it actually runs, this IS the wpuSys retest, and the block's belt
               percentages are drawn off wpuSys. Declaring that keeps the clock honest instead
               of leaving the one max that moves with bodyweight looking untouched since week 1. */
            text('Max strict pull-ups', wb % 3 === 0 ? '1 set to technical failure, log it' : 'skip this week',
              { cue: 'Tested every third week. This number, not the scale, predicts the bar muscle-up.',
                ...(wb % 3 === 0
                  ? { tags: ['test', 'vertical-pull'] as const, tests: ['wpuSys'] as LiftKey[] }
                  : { tags: ['vertical-pull'] as const }) }),
            text(wb <= 6 ? 'Kip swing' : 'Banded bar MU transition',
              wb <= 6 ? '5 x 8, tight arch to hollow' : '6 x 3', { tags: ['skill'] }),
          ]},
          /* Third, not last. It follows the skill work and the kip, which both need a fresh
             nervous system, and it leads the back squat, which does not care what your
             shoulders did ten minutes ago. By week 11 this group is maximal HSPU attempts,
             and an attempt made after 4 x 3 at 89% is a rep you cannot learn from. ADR-0014. */
          { heading: 'Vertical press', items: [hspuItem(wb)] },
          { heading: 'Primary', items: [
            lift('Back squat', 'bsq', pct, sets, reps, { tags: ['lower-strength'] }),
            pullFriday(wb),
          ]},
          { heading: 'Accessory', items: [
            text('Walking lunge', '3 x 10 each leg, loaded', { tags: ['lower-strength'] }),
          ]},
        ],
      };
      case 5: return {
        title: 'Long aerobic', durationLabel: '90-180 min', why,
        note: 'Hunt, hike or trail run. If you are in the field with a pack on, this is done.',
        groups: [{ heading: 'Aerobic', items: [
          dur('Long aerobic effort', [90, 180], 'zone 2', { tags: ['aerobic'] }),
          text('Vertical gain if available', '1,500-3,000 ft', { tags: ['aerobic'] }),
        ]}],
      };
      default: return rest(WHY[6]);
    }
  },
};
