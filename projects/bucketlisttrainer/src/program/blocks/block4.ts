import type { Block, DayContext, SessionSpec, Why } from '../../types.js';
import { lift, text, dur, WHY_EVENT } from '../helpers.js';

const RIDES = ['20 mi, 1,200 ft', '26 mi, 2,000 ft', '32 mi, 2,800 ft', '22 mi easy spin', 'Bangtail Divide'];

const WHY: Record<number, Why> = {
  0: { stimulus: 'Goal-pace specificity · VO2 · repeatability',
    purpose: 'Four hundreds at exactly 90 seconds teach what six-minute mile pace feels like and how to hold it once it stops being comfortable. Pace recognition is trainable and it is most of what separates 6:05 from 5:58.',
    know: 'Run them at 90, not 85. Faster is not better. Going out fast turns this into a workout that trains something you do not need.' },
  1: { stimulus: 'Strength maintenance · minimum effective dose',
    purpose: 'Two lifts, heavy, thirty minutes. Strength holds on roughly a third of the volume that built it, provided intensity stays high. Cut volume in an endurance block, never intensity.',
    know: 'In and out. Doing more here steals from the track sessions, which are the actual priority.' },
  2: { stimulus: 'Aerobic recovery plus bike specificity',
    purpose: 'Double duty. Easy enough to aid recovery from Monday, and where saddle time for Bangtail quietly accumulates.',
    know: 'Comfort on a bike is a trainable skill separate from fitness. Position and contact points are what will hurt on a 24 mile ride.' },
  3: { stimulus: 'Speed reserve or threshold, alternating',
    purpose: 'Two hundreds faster than goal build speed reserve, making goal pace feel submaximal. Eight hundreds at threshold raise the ceiling the mile is run under.',
    know: 'A mile is roughly 85% aerobic, which surprises people. A year of protected zone 2 is what makes six minutes possible; speed work alone would not.' },
  4: { stimulus: 'Strength maintenance · minimum effective dose',
    purpose: 'Second of two weekly strength touches. Hinge-biased to complement Tuesday.',
    know: 'Single-leg and calf work is here for durability, not strength. Ten weeks of mountain terrain is coming and the ankle and calf break down first.' },
  5: { stimulus: 'Specific endurance · terrain · fuelling rehearsal',
    purpose: 'The only session that rehearses the actual event. Volume, terrain, handling and fuelling get trained together because on the day they happen together.',
    know: 'At least two of these on real singletrack. Practice fuel here with the exact product: 40-60g carbohydrate per hour, sorted in training.' },
  6: { stimulus: 'Easy aerobic or full rest',
    purpose: 'Optional shakeout. The week already carries two track sessions, two lifts and a long ride.',
    know: 'Take it off without guilt if the long ride was hard.' },
};

export const block4: Block = {
  index: 4, id: 'speed-and-bike', name: 'Speed & Bike',
  firstWeek: 41, lastWeek: 45,
  nutrition: 'Mild deficit.',
  bodyweightArc: '247 → 240',
  goal: '6-minute mile Jun 8. Bangtail Divide Jun 19.',
  minAerobicSessions: 4, minVerticalPullSessions: 0, minVerticalPressSessions: 0, minLowerStrengthSessions: 1, allowsMetcon: false, volumeDriver: 'aerobic',
  maintenanceFloorPct: 0.78,
  deloadWeeks: [], testWeeks: [],
  principles: [
    'A short speed block right after a max strength block converts force into velocity.',
    'The two goals do not compete for a session. Track Mon/Thu, bike fills easy days and Saturday.',
    'Five weeks of riding suffices only because eight months of easy aerobic volume went on the bike.',
    'Maintenance strength holds intensity at 78-82% while set count drops.',
  ],
  phaseFor: (w) => (w <= 3 ? 'speed build' : 'event'),

  buildDay(ctx: DayContext): SessionSpec {
    const { weekInBlock: wb, day, event } = ctx;
    const why = event ? WHY_EVENT : WHY[day];

    if (event?.id === 'mile') return {
      title: '6-minute mile', durationLabel: '60 min', why,
      note: 'Track, cool morning, fresh legs. MSU or Bozeman High. Not the treadmill, which runs 15-25 sec fast.',
      groups: [
        { heading: 'Warm-up', items: [text('Easy jog, drills, 4 x 100m strides', '25 min, finish 10 min before the gun', { tags: ['aerobic'] })] },
        { heading: 'The attempt', items: [text('1 mile', '4 x 400 m at 90 sec', {
          cue: 'Even splits. The first lap will feel too easy and that is correct. Do not bank time.', tags: ['event'] })] },
        { heading: 'After', items: [
          dur('Easy jog', 15, undefined, { tags: ['aerobic'] }),
          text('Second attempt Friday if close', 'within 5 sec means go again')] },
      ],
    };

    if (event?.id === 'bangtail') return {
      title: 'Bangtail Divide', durationLabel: '3-4 hr', why,
      note: 'About 24 miles and 3,300 ft. Backup weekend is Jun 26 if the upper north-facing sections still hold snow.',
      groups: [
        { heading: 'The ride', items: [text('Bangtail Divide Trail', '~24 mi, ~3,300 ft', {
          cue: 'You deferred this a year to do it properly. Ride it, do not survive it.', tags: ['event', 'aerobic'] })] },
        { heading: 'Plan', items: [
          text('Fuel', '40-60 g carb per hour from the start'),
          text('Shuttle or loop decision', 'sort it the night before')] },
      ],
    };

    switch (day) {
      case 0: return {
        title: 'Track: 400s', durationLabel: '55 min', why,
        note: wb === 2 ? 'Sharpening week. Mile attempt tomorrow, so short and crisp.' : undefined,
        groups: [
          { heading: 'Warm-up', items: [dur('Easy jog + drills', 15, undefined, { tags: ['aerobic'] })] },
          { heading: 'Main', items: [text('400 m repeats',
            wb === 2 ? '4 x 400 @ 88 sec, 2 min rest' : `${6 + wb} x 400 @ 90 sec, 90 sec rest`, { tags: ['aerobic'] })] },
          { heading: 'Cool-down', items: [dur('Easy jog', 10, undefined, { tags: ['aerobic'] })] },
        ],
      };
      case 1: return { title: 'Strength, brief', durationLabel: '30 min', why,
        note: 'Two lifts, heavy, in and out.',
        groups: [{ heading: 'Maintenance', items: [
          lift('Back squat', 'bsq', 0.82, 3, 3, { tags: ['lower-strength'] }),
          lift('Bench press', 'bench', 0.82, 3, 3, { tags: ['upper-strength'] }),
          text('Pull-up', '3 x 8', { tags: ['upper-strength'] })] }] };
      case 2: return { title: 'Easy ride', durationLabel: '60-75 min', why,
        groups: [{ heading: 'Aerobic', items: [dur('Bike, zone 2', [60, 75], undefined, { tags: ['aerobic'] })] }] };
      case 3: return {
        title: 'Track: speed + threshold', durationLabel: '50 min', why,
        groups: [
          { heading: 'Warm-up', items: [dur('Easy jog + drills + 3 strides', 20, undefined, { tags: ['aerobic'] })] },
          { heading: 'Main', items: [ wb % 2 === 1
            ? text('200 m repeats', '8 x 200 @ 42 sec, 2 min rest', { tags: ['aerobic', 'sprint'] })
            : text('800 m repeats', '4 x 800 @ 3:12, 3 min rest', { tags: ['aerobic'] }) ]},
          { heading: 'Cool-down', items: [dur('Easy jog', 10, undefined, { tags: ['aerobic'] })] },
        ],
      };
      case 4: return { title: 'Strength, brief', durationLabel: '30 min', why,
        groups: [{ heading: 'Maintenance', items: [
          lift('Deadlift', 'dl', 0.78, 3, 3, { tags: ['lower-strength'] }),
          text('Strict press', '3 x 5', { tags: ['upper-strength'] }),
          text('Calf raise and single-leg work', '3 x 12', { tags: ['lower-strength'] })] }] };
      case 5: return {
        title: 'Long ride', durationLabel: '2-4 hr', why,
        note: wb >= 2 ? 'Singletrack if you can. Handling fatigue is as real as leg fatigue.' : 'Build saddle time.',
        groups: [{ heading: 'Aerobic', items: [
          text('Long ride', RIDES[wb - 1] ?? RIDES[0], { tags: ['aerobic'] }),
          text('Fuel practice', '40-60 g carb per hour, same product you will use on Bangtail')] }],
      };
      default: return { title: 'Easy run or off', durationLabel: '0-40 min', why,
        groups: [{ heading: 'Optional', items: [dur('Easy run', 40, 'or take the day', { tags: ['aerobic'] })] }] };
    }
  },
};
