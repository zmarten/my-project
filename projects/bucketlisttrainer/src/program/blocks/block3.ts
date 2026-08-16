import type { Block, DayContext, SessionSpec, Why } from '../../types.js';
import { lift, text, dur, rest, repMaxCheck, WHY_TEST, WHY_RETEST } from '../helpers.js';

/*
 * Weeks 4 and 7 are deloads. Week 7 used to cut INTENSITY and add volume: the deadlift
 * went from 3 sets at 92% to 4 sets at 85%, which is a harder week wearing a deload's
 * name. Invariant 5 says the opposite, so week 7 now holds the percentage and cuts sets
 * on both lifts. See ADR-0012.
 */
const BENCH: (readonly [number, number, number] | null)[] = [
  [0.85,4,3],[0.87,4,3],[0.89,4,2],[0.80,3,3],[0.88,5,2],[0.90,4,2],
  [0.92,2,2],[0.84,3,3],[0.90,4,1],[0.93,3,1],[0.95,3,1], null];
const DL: (readonly [number, number, number] | null)[] = [
  [0.85,3,3],[0.88,3,2],[0.90,3,2],[0.80,3,3],[0.90,3,2],[0.92,3,1],
  [0.90,2,2],[0.93,2,1],[0.95,2,1],[0.88,3,2],[0.97,2,1], null];

const WHY: Record<number, Why> = {
  0: { stimulus: 'Maximal effort · heavy singles and triples',
    purpose: 'Bench is primary because it needs 15-24% while the deadlift needs 14% on a lift you have never trained. Back volume shares the day because the bench is only as stable as the platform under it.',
    know: 'Long arms mean a longer bar path. Arch, tuck the elbows to about 60 degrees, widen the grip to what the shoulder tolerates. Leverage is often worth 10-15 lbs before any strength arrives.' },
  1: { stimulus: 'Maximal effort · hinge · single-rep skill',
    purpose: 'The weekly heavy single is deliberate and not standard programming. Most plans hold singles for the peak. Your tested 525 underperforms your 500x3, which says expressing a maximum is an undertrained skill.',
    know: 'One rep. Trivial cost, and the transfer is the point. Rotating block pull, deficit, and competition pull every three weeks keeps the adaptation coming without grinding one groove.' },
  2: { stimulus: 'Aerobic maintenance',
    purpose: 'Three sessions weekly through a max strength block. This costs a small amount of strength gain and it is the correct trade.',
    know: 'Losing the base in March costs the Crest in August. That trade is being made on purpose rather than by accident.' },
  3: { stimulus: 'Repeated effort · hypertrophy range · triceps bias',
    purpose: 'Second of three weekly bench exposures. Close grip biases the triceps, the usual lockout limiter, and the higher rep range adds tissue that supports the heavy day.',
    know: 'Three exposures works for bench specifically because it recovers fast and rewards practice. Work day, not test day. Leave two reps in reserve.' },
  4: { stimulus: 'Dynamic effort · bar speed · sub-maximal',
    purpose: 'Speed pulls at 70% on the minute train rate of force development off the floor. Given your profile this is applying a quality you have, not building one from scratch.',
    know: 'Every rep as fast as you can move it. If it is not fast it is not doing anything. The weight is light on purpose; intent is the stimulus.' },
  5: { stimulus: 'Motor learning · bar speed intent · light',
    purpose: 'Third bench exposure and the least fatiguing. Paused reps at 65% with maximum acceleration intent teach the groove and reinforce the leverage changes.',
    know: 'A skill day. If you finish feeling like you trained hard, you did it wrong.' },
  6: { stimulus: 'Recovery · full rest',
    purpose: 'The heaviest absolute loads of the year run through this block. The off day is doing real work.',
    know: 'You are in a deliberate surplus. Weight going up 10 lbs across this block is the plan working, not failing. It comes back off in Block 4.' },
};

function testWeek(day: number): SessionSpec {
  if (day === 0) return { title: 'Bench test', durationLabel: '60 min', why: WHY_TEST,
    note: 'Target 315. Open at 275.',
    groups: [{ heading: 'Test', items: [text('Bench 1RM', 'work to a max single', { tags: ['test','upper-strength'], tests: ['bench'] })] }] };
  if (day === 1 || day === 2) return { title: 'Easy', durationLabel: '30 min', why: WHY[2],
    groups: [{ heading: 'Aerobic', items: [dur('Easy spin', 30, undefined, { tags: ['aerobic'] })] }] };
  if (day === 3) return { title: 'Deadlift test', durationLabel: '60 min', why: WHY_TEST,
    note: 'Target 600. Open 525, then 565, 585, 600.',
    groups: [{ heading: 'Test', items: [text('Deadlift 1RM', 'four attempts, no more', { tags: ['test','lower-strength'], tests: ['dl'] })] }] };
  if (day === 4) return { title: 'C&J retest', durationLabel: '50 min', why: WHY_TEST,
    note: 'Optional second window at the C&J. You are stronger than in February.',
    groups: [{ heading: 'Test', items: [
      text('Clean & jerk 1RM', 'work to a single', { tags: ['test','olympic'], tests: ['clean', 'jerk'] }),
      text('Log bodyweight', 'expect 247')] }] };
  if (day === 5) return { title: 'Long aerobic', durationLabel: '90 min', why: WHY[2],
    note: 'Block 4 opens Monday and turns you into a runner and a cyclist.',
    groups: [{ heading: 'Aerobic', items: [dur('Easy trail run', 90, undefined, { tags: ['aerobic'] })] }] };
  return rest(WHY[6]);
}

export const block3: Block = {
  index: 3, id: 'max-strength', name: 'Max Strength',
  firstWeek: 29, lastWeek: 40,
  nutrition: 'Surplus of roughly 250 cal/day.',
  bodyweightArc: '237 → 247',
  goal: 'Bench 315 primary. Deadlift 600 secondary.',
  minAerobicSessions: 3, minVerticalPullSessions: 1, minVerticalPressSessions: 1, minLowerStrengthSessions: 2, allowsMetcon: false, volumeDriver: 'load',
  deloadWeeks: [4, 7], testWeeks: [12],
  principles: [
    'Only block running a surplus. The 10 lb gain is programmed, not a slip.',
    "Zatsiorsky's three methods all used: maximal effort (Mon/Tue), repeated effort (Thu), dynamic effort (Fri).",
    'Weekly 90%+ deadlift single from week 1, because expressing a maximum is a trainable skill and his tested single underperforms his rep max.',
    'Bench gets three exposures because it recovers fast and rewards frequency for a skill-dependent lift.',
    'Aerobic floor rises to 3 sessions here, not falls. Protecting the Crest.',
    'Bench keeps its own lighter week at 8 so the two competing priorities never fully back off together. Weeks 4 and 7 are the declared block deloads, and both cut sets while holding percentage.',
  ],
  phaseFor: (w) => (w <= 4 ? 'accumulation' : w <= 8 ? 'intensification' : 'peak'),

  buildDay(ctx: DayContext): SessionSpec {
    const { weekInBlock: wb, day } = ctx;
    if (wb === 12) return testWeek(day);
    const bp = BENCH[wb - 1]!, dp = DL[wb - 1]!;
    const why = WHY[day];
    /*
     * Both deloads carry a rep-max check. Bench is the block goal and it takes one in each
     * of them; the deadlift takes one in week 4 only, because a deadlift AMRAP is the most
     * expensive readout in the program and week 7 already runs the bar at 90 to 95%. Every
     * check replaces a set rather than adding one. See ADR-0015.
     */
    const deload = ctx.isDeload;

    switch (day) {
      case 0: return {
        title: deload ? 'Bench heavy + rep-max check' : 'Bench heavy', durationLabel: '60 min',
        why: deload ? WHY_RETEST : why,
        note: deload
          ? 'Bench is the block goal and the whole wave runs off one tested number. Measure it.'
          : undefined,
        groups: [
          { heading: 'Primary', items: [
            lift('Bench press', 'bench', bp[0], deload ? bp[1] - 1 : bp[1], bp[2], { tags: ['upper-strength'] }),
            ...(deload ? [repMaxCheck('Bench rep-max check', 'bench', ['upper-strength'])] : []),
            ...(wb >= 5 && wb <= 8 ? [lift('Pin press from mid-chest', 'bench', 0.80, 3, 3, { tags: ['upper-strength'] })] : []),
          ]},
          { heading: 'Back volume', items: [
            text('Barbell row', '4 x 8', { cue: 'Not accessory. This is the platform you press from.', tags: ['upper-strength'] }),
            text('Chest-supported row', '3 x 12', { tags: ['upper-strength'] }),
            text('Face pull', '3 x 20'),
          ]},
        ],
      };
      case 1: return {
        title: wb === 4 ? 'Deadlift + rep-max check' : 'Deadlift heavy', durationLabel: '55 min',
        why: wb === 4 ? WHY_RETEST : why,
        note: wb === 4
          ? 'The AMRAP takes the heavy single slot, which already sat at 85% this week. Same bar, one set, and a number you can use.'
          : 'Take a 90%-plus single every week, including this one.',
        groups: [
          { heading: 'Primary', items: [
            lift(wb % 3 === 1 ? 'Block pull, above knee' : wb % 3 === 2 ? 'Deficit deadlift, 1.5in' : 'Deadlift, competition stance',
              'dl', dp[0], dp[1], dp[2], { tags: ['lower-strength'] }),
            /* The heavy single is already 85% in this week, so the AMRAP costs the same bar
               weight and one more set of reps. Week 7 keeps its single: the bar is at 95%
               there and a deadlift AMRAP on top of that is not a deload. */
            ...(wb === 4
              ? [repMaxCheck('Deadlift rep-max check', 'dl', ['lower-strength'])]
              : [lift('Heavy single', 'dl', Math.min(0.97, dp[0] + 0.05), 1, 1, {
                  cue: 'One rep. Practice expressing a maximum.', tags: ['lower-strength'] })]),
          ]},
          { heading: 'Posterior', items: [
            text('Romanian deadlift', '3 x 8', { tags: ['lower-strength'] }),
            text('Hip thrust', '3 x 10', { tags: ['lower-strength'] }),
            text('Hanging leg raise', '3 x 12'),
          ]},
        ],
      };
      case 2: return { title: 'Zone 2', durationLabel: '45 min', why,
        groups: [{ heading: 'Aerobic', items: [dur('Spin bike, zone 2', 45, undefined, { tags: ['aerobic'] })] }] };
      case 3: return {
        title: 'Bench volume + overhead', durationLabel: '55 min', why,
        groups: [
          { heading: 'Volume', items: [
            lift('Close grip bench', 'bench', 0.73, 5, 5, { tags: ['upper-strength'] }),
            text('Strict press', '4 x 6', { tags: ['upper-strength', 'vertical-press'] }),
          ]},
          { heading: 'Accessory', items: [
            text('Dip', '3 x 8-10, weighted if easy', { tags: ['upper-strength'] }),
            text('Triceps extension', '3 x 15'),
          ]},
          { heading: 'Aerobic', items: [dur('Spin bike, zone 2', 30, 'easy', { tags: ['aerobic'] })] },
        ],
      };
      case 4: return {
        title: wb === 7 ? 'Front squat rep-max check + speed pulls' : 'Front squat + speed pulls',
        durationLabel: '55 min',
        why: wb === 7 ? WHY_RETEST : why,
        note: wb === 7
          ? 'Front squat is on maintenance here and it still gates the C&J. Week 40 retests the clean and jerk, so find out what the squat is first.'
          : undefined,
        groups: [
          { heading: 'Squat', items: [
            lift('Front squat', 'fsq', 0.80, wb === 7 ? 3 : 4, 4, {
              cue: 'Maintenance. Do not let the C&J work evaporate.', tags: ['lower-strength'] }),
            ...(wb === 7 ? [repMaxCheck('Front squat rep-max check', 'fsq', ['lower-strength'])] : []),
          ]},
          { heading: 'Speed', items: [
            lift('Speed deadlift', 'dl', 0.70, 6, 3, {
              cue: 'Every rep as fast as you can move it. Bar speed is the whole point.', tags: ['lower-strength'] }),
            text('Walking lunge', '3 x 10 each leg', { tags: ['lower-strength'] }),
          ]},
        ],
      };
      case 5: return {
        title: 'Bench technique + zone 2', durationLabel: '60 min', why,
        groups: [
          { heading: 'Technique', items: [lift('Paused bench', 'bench', 0.65, 8, 3, {
            cue: 'Bar speed intent on every rep. A skill day, not a work day.', tags: ['upper-strength'] })] },
          { heading: 'Arms and back', items: [
            text('Pull-up', '4 x 8', { tags: ['upper-strength', 'vertical-pull'] }),
            text('Curl and triceps superset', '3 x 12 each'),
          ]},
          { heading: 'Aerobic', items: [dur('Zone 2, bike or rower', 30, 'easy', { tags: ['aerobic'] })] },
        ],
      };
      default: return rest(WHY[6]);
    }
  },
};
