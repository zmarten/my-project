import type { Block, DayContext, SessionSpec, Why } from '../../types.js';
import { lift, belt, text, dur, rest, skillGroup, repMaxCheck, WHY_TEST, WHY_DELOAD, WHY_RETEST } from '../helpers.js';

/** Olympic lifts. Percentages are of the snatch or the jerk. Weeks 5 and 10 are deloads. */
const WAVE: (readonly [number, number, number] | null)[] = [
  [0.65, 5, 2], [0.68, 5, 2], [0.70, 6, 2], [0.72, 6, 2], [0.75, 3, 2],
  [0.82, 5, 1], [0.85, 5, 1], [0.88, 4, 1], [0.85, 5, 1], [0.85, 2, 1],
  [0.88, 4, 1], [0.92, 3, 1], [0.94, 3, 1], [0.90, 3, 1],
  null,
];

/**
 * Squats get their OWN wave.
 *
 * The front squat load used to be derived as `Math.min(0.93, snatchPct + 0.05)`, which
 * borrowed the snatch wave for a lift it was never written for. It produced 5 x 3 at 93%
 * for eight weeks, fifteen reps above 90% in a single session, where Prilepin caps that
 * near ten. The back squat had the same problem through `pct` directly.
 *
 * Reps drop to doubles once the wave crosses 90%, so peak intensity is preserved and only
 * the grinding volume comes off. Weeks 5 and 10 hold the percentage and cut sets, which is
 * what invariant 5 means by a deload. See ADR-0012.
 */
const SQUAT_WAVE: (readonly [number, number, number] | null)[] = [
  [0.75, 5, 3], [0.78, 5, 3], [0.81, 5, 3], [0.84, 5, 3], [0.84, 2, 3],
  [0.86, 4, 3], [0.88, 4, 3], [0.90, 4, 2], [0.92, 4, 2], [0.90, 2, 2],
  [0.92, 4, 2], [0.94, 3, 2], [0.95, 3, 2], [0.93, 3, 2],
  null,
];

const WHY: Record<number, Why> = {
  0: { stimulus: 'Rate of force development · motor pattern',
    purpose: 'Your snatch is 67% of your clean when normal is 78-82%. That is the cheapest gain on the whole list and it is technical, not strength. Jumps share the day because both are maximal-velocity qualities and belong together while you are fresh.',
    know: 'Speed work first, always, and never to fatigue. The moment bar speed or jump height drops you are training a different quality than the one you came for.' },
  1: { stimulus: 'Maximal strength · squat pattern',
    purpose: 'Front squat drives toward 340. The clean you can catch is capped by the squat you can stand up out of.',
    know: 'This lift decides whether C&J 315 is a this-year goal. If it climbs faster than projected, revisit the target mid-block.' },
  2: { stimulus: 'Aerobic maintenance · minimum effective dose',
    purpose: 'Two sessions weekly is roughly the floor for holding aerobic adaptation. Preservation is far cheaper than rebuilding.',
    know: 'Tempting to cut in a power block. Do not. Losing the base over winter is what puts the Crest out of reach in August.' },
  3: { stimulus: 'Rate of force development · overhead · maximal velocity',
    purpose: 'The C&J is limited by your jerk, so percentages run off the jerk max. Jerk recoveries load above that max in the rack to build the overhead confidence the lift lacks.',
    know: 'Technical-phase percentages are capped on purpose. Weightlifting is a skill sport and long sets degrade the pattern you are encoding.' },
  4: { stimulus: 'Maximal strength plus max-velocity sprinting',
    purpose: 'Sprints sit at the far velocity end of the force-velocity curve, past what a barbell can train. They feed the dunk and cost little recovery when kept short.',
    know: 'Sprints go before the squat, full recovery between reps, 20-30 m not 60. The treadmill cannot do this.' },
  5: { stimulus: 'Motor learning under moderate load',
    purpose: 'Complexes force you to hold positions across movements in a row, exposing technical leaks that single reps hide. Moderate load is deliberate: teaching, not testing.',
    know: 'Stop when technique degrades, not when the clock says to. Every ugly rep is practice at doing it wrong.' },
  6: { stimulus: 'Active recovery or full rest',
    purpose: 'Optional easy spin to move blood without adding stress.',
    know: 'Winter in Bozeman, a new job, an infant. The honest answer most weeks is take the day off.' },
};

const WHY_DUNK: Why = {
  stimulus: 'Maximal velocity · single attempt quality',
  purpose: 'Peak explosiveness and the lowest bodyweight of the year so far land in the same window on purpose. Reach 96.5in, rim 120in, so you need roughly 29.5in of running vertical.',
  know: 'Stop while you still have pop. Twenty honest attempts with full recovery. Attempts 25 through 40 are all worse than attempt 3 and only make you sore.',
};

function testWeek(day: number): SessionSpec {
  if (day === 0) return { title: 'Snatch test', durationLabel: '60 min', why: WHY_TEST,
    note: 'Target 225. Open at 185 and move in 10s.',
    groups: [{ heading: 'Test', items: [
      text('Snatch 1RM', 'work to a max single', { tags: ['test', 'olympic'], tests: ['snatch'] }),
      text('Running vertical jump', '6 attempts', { tags: ['test', 'plyo'] })] }] };
  if (day === 1) return rest(WHY_TEST, 'Nothing. You test again Wednesday.');
  if (day === 2) return { title: 'Clean & jerk test', durationLabel: '60 min', why: WHY_TEST,
    note: 'Target 295. If the front squat came up as much as it should have, take a shot at 315.',
    groups: [{ heading: 'Test', items: [
      text('Clean & jerk 1RM', 'work to a max single', { tags: ['test', 'olympic'], tests: ['clean', 'jerk'] }),
      /* Deliberately carries no `tests` declaration. It is conditional on the C&J feeling
         easy, so it may not happen, and a clock that assumes an optional test ran is worse
         than one that assumes it did not. The week 35 check is the front squat's guarantee. */
      text('Front squat 1RM', 'if the C&J felt easy', { tags: ['test', 'lower-strength'] })] }] };
  if (day === 4 || day === 5) return { title: 'Dunk attempt', durationLabel: '60 min', why: WHY_DUNK,
    note: 'This is the window. Light plyo warm-up, then a hoop and 20 honest attempts.',
    groups: [
      { heading: 'Prime', items: [text('Pogo hops and 3 approach jumps', '10 min, no fatigue', { tags: ['plyo'] })] },
      { heading: 'Attempt', items: [text('Dunk attempts', '20 tries, full recovery between', {
        cue: 'One hand, one-foot approach, at speed.', tags: ['plyo', 'event'] })] }],
    plyoContacts: 40 };
  return { title: 'Easy', durationLabel: '40 min', why: WHY[2],
    note: 'Recovery between test days. Update maxes as results land.',
    groups: [{ heading: 'Aerobic', items: [dur('Spin bike, zone 2', 40, undefined, { tags: ['aerobic'] })] }] };
}

export const block2: Block = {
  index: 2, id: 'power-and-olympic', name: 'Power & Olympic',
  firstWeek: 14, lastWeek: 28,
  nutrition: 'Maintenance. Calories to TDEE.',
  bodyweightArc: '237 hold',
  goal: 'Snatch 225, C&J 295, peak vertical for the dunk, ring muscle-up.',
  minAerobicSessions: 2, minVerticalPullSessions: 1, minVerticalPressSessions: 1, minLowerStrengthSessions: 2, allowsMetcon: false, volumeDriver: 'load',
  deloadWeeks: [5, 10], testWeeks: [15],
  principles: [
    'Power is the quality most punished by an energy deficit, so this block runs at maintenance.',
    'Force-velocity curve covered deliberately: heavy front squats at the force end, Olympic lifts in the middle, sprints and jumps at the velocity end.',
    'Weightlifting is a skill sport. Short sets at any intensity, per classical Prilepin-style guidance.',
    'Plyometrics progress extensive (<=120 contacts/wk) to intensive (<=80 contacts/wk), always fresh.',
  ],
  phaseFor: (w) => (w <= 5 ? 'technical' : w <= 10 ? 'build' : 'peak'),

  buildDay(ctx: DayContext): SessionSpec {
    const { weekInBlock: wb, day } = ctx;
    if (wb === 15) return testWeek(day);
    const [pct, sets, reps] = WAVE[wb - 1]!;
    const [sqPct, sqSets, sqReps] = SQUAT_WAVE[wb - 1]!;
    const phase = this.phaseFor(wb);
    const extensive = wb <= 6;
    const why = WHY[day];
    const dunkNote = wb >= 13 ? 'Dunk attempt window is open. Chalk up and find a hoop this week.' : undefined;

    switch (day) {
      case 0: return {
        title: 'Snatch + jumps', durationLabel: '70 min', why,
        note: dunkNote ?? (phase === 'technical' ? 'Cap at 75%. This is the phase you will want to skip.' : undefined),
        plyoContacts: extensive ? 110 : 75,
        groups: [
          /* Skill leads the session. It used to sit last, behind snatch triples and depth
             jumps, which is the single worst place to rehearse a handstand. ADR-0005. */
          skillGroup(2, wb, day),
          { heading: `Snatch, ${phase}`, items: [
            lift('Snatch', 'snatch', pct, sets, reps, { tags: ['olympic'] }),
            phase === 'technical'
              ? lift('Snatch balance', 'snatch', 0.55, 5, 3, { tags: ['olympic'] })
              : lift('Snatch pull', 'snatch', 1.00, 4, 3, { tags: ['olympic'] }),
            lift('Overhead squat', 'snatch', 0.45, 4, 5, { tags: ['olympic'] }),
          ]},
          { heading: 'Jumps', items: [ extensive
            ? text('Extensive plyos', 'pogo hops 4x15, box jump 5x3, broad jump 4x3', {
                cue: '80-120 contacts this week. Stiffness and elasticity, not max effort.', tags: ['plyo'] })
            : text('Intensive plyos', 'depth jump 5x3 from 18-24in, single-leg bound 4x6', {
                cue: '60-80 contacts. Fully fresh. Stop the moment quality drops.', tags: ['plyo'] }) ]},
        ],
      };
      /*
       * Tuesday is the front squat day, so Tuesday of a deload week is where the front
       * squat gets measured. The check REPLACES the top set instead of following it: the
       * squat runs one fewer set at the wave percentage and the AMRAP takes that slot, so
       * the deload keeps exactly the set count it had. See ADR-0015.
       */
      case 1: {
        const deload = ctx.isDeload;
        return {
          title: deload ? 'Front squat + rep-max check' : 'Front squat', durationLabel: '55 min',
          why: deload ? WHY_RETEST : why,
          note: deload
            ? 'The working set primes the AMRAP. Same 85% every time this appears, so week 18 and week 23 are directly comparable. A front squat AMRAP runs out of upper back before it runs out of legs, so read the estimate as a floor.'
            : undefined,
          groups: [
            skillGroup(2, wb, day),
            { heading: 'Strength', items: [
              lift('Front squat', 'fsq', sqPct, deload ? sqSets - 1 : sqSets, sqReps, {
                cue: 'Driving toward 340. This is the gate on the clean and jerk.', tags: ['lower-strength'] }),
              ...(deload ? [repMaxCheck('Front squat rep-max check', 'fsq', ['lower-strength'])] : []),
              /* Was prescribed with no load at all, which quietly turned the block's only
                 vertical-pull exposure into whatever he felt like that day. */
              belt('Weighted pull-up', 0.85, wb === 10 ? 3 : 4, 5, { tags: ['upper-strength', 'vertical-pull'] }),
              /* wpuSys was last measured in week 13 and belt weight is a percentage of it,
                 so by week 27 this block is loading a belt off a fourteen-week-old number.
                 One bodyweight set at week 23 closes that gap and costs one belted set. */
              ...(wb === 10 ? [text('Max strict pull-ups', 'one set at bodyweight, log the reps', {
                cue: 'System max is bodyweight x (1 + reps / 30). Five reps at 265 is where the 305 in src/athlete.ts came from.',
                tags: ['test', 'upper-strength', 'vertical-pull'], tests: ['wpuSys'] })] : []),
              text('Strict press', '4 x 6', { tags: ['upper-strength', 'vertical-press'] }),
            ]},
          ],
        };
      }
      case 2: return { title: 'Zone 2', durationLabel: '40-60 min', why,
        note: 'Bike. Non-negotiable.',
        groups: [{ heading: 'Aerobic', items: [dur('Spin bike, zone 2', [40, 60], 'HR-capped', { tags: ['aerobic'] })] }] };
      case 3: return {
        title: 'Clean & jerk', durationLabel: '70 min', why, note: dunkNote,
        groups: [
          { heading: `Clean & jerk, ${phase}`, items: [
            lift('Clean & jerk', 'jerk', pct, sets, reps, {
              cue: 'Percentage is off your jerk, not your clean. The jerk is the limiter.', tags: ['olympic'] }),
            lift('Jerk recovery', 'jerk', Math.min(1.06, pct + 0.14), 4, 3, { tags: ['olympic'] }),
            lift('Clean pull', 'clean', 1.00, 4, 3, { tags: ['olympic'] }),
          ]},
          { heading: 'Accessory', items: [text('Barbell row', '3 x 8', { tags: ['upper-strength'] })] },
        ],
      };
      case 4: return {
        title: 'Back squat + sprints', durationLabel: '55 min', why,
        groups: [
          { heading: 'Speed', items: [text('Sprint accelerations', '8 x 20-30 m, full recovery', {
            cue: 'Treadmill will not do this. Pavement or a field.', tags: ['sprint'] })] },
          { heading: 'Strength', items: [
            /* Trails the front squat wave. General strength underneath the lift that
               matters, so it never needs to live above 90%. */
            lift('Back squat', 'bsq', sqPct - 0.06, sqSets, 3, { tags: ['lower-strength'] }),
            text('Nordic or hamstring curl', '3 x 8', { tags: ['lower-strength'] }),
            text('Calf raise', '4 x 12'),
          ]},
        ],
      };
      case 5: return {
        title: 'Complexes', durationLabel: '60 min', why,
        note: 'Moderate load, high quality. Stop when technique degrades.',
        groups: [
          skillGroup(2, wb, day),
          { heading: 'Complex work', items: [
            lift('Snatch complex', 'snatch', Math.max(0.55, pct - 0.10), 5, '1 power snatch + 1 hang snatch + 1 OHS', { tags: ['olympic'] }),
            lift('Clean complex', 'jerk', Math.max(0.55, pct - 0.10), 5, '1 clean + 1 front squat + 1 jerk', { tags: ['olympic'] }),
          ]},
        ],
      };
      default: return { title: 'Easy or off', durationLabel: '0-40 min', why,
        groups: [{ heading: 'Optional', items: [dur('Easy spin', [30, 40], 'or nothing', { tags: ['aerobic'] })] }] };
    }
  },
};
