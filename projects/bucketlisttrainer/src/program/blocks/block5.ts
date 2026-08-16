import type { Block, DayContext, SessionSpec, Why } from '../../types.js';
import { lift, text, dur, rest, WHY_DELOAD, WHY_EVENT } from '../helpers.js';

interface WeekSpec { vert: string; long: string; down?: boolean; peak?: boolean; taper?: boolean }
const WEEKS: WeekSpec[] = [
  { vert: '5,000 ft',  long: '12 mi' },
  { vert: '6,500 ft',  long: '15 mi' },
  { vert: '8,000 ft',  long: '18 mi' },
  { vert: '4,500 ft',  long: '10 mi', down: true },
  { vert: '9,000 ft',  long: '22 mi' },
  { vert: '10,500 ft', long: '26 mi' },
  { vert: '5,500 ft',  long: '12 mi', down: true },
  { vert: '12,000 ft', long: '30 mi + back-to-back Sunday', peak: true },
  { vert: '8,000 ft',  long: '20 mi' },
  { vert: 'Taper',     long: '8 mi shakeout, then the Crest', taper: true },
];

const WHY: Record<number, Why> = {
  0: { stimulus: 'Threshold under grade · climbing economy',
    purpose: 'Sustained uphill intervals at threshold train the quality the Crest demands: a hard but sustainable effort on a climb, repeated for hours.',
    know: 'Steep and sustained, not smooth graded switchbacks. Climbing economy is largely grade-specific.' },
  1: { stimulus: 'Strength maintenance · injury resilience',
    purpose: 'Two lifts, heavy, brief. Holding intensity while cutting volume preserves strength through a high-volume endurance block.',
    know: 'Heavy strength work improves endurance performance through economy and fatigue resistance. This is a contributor, not a concession. Last thing to cut.' },
  2: { stimulus: 'Aerobic recovery',
    purpose: 'Easy movement between two hard vertical days. Blood flow without stress.',
    know: 'If it feels like a workout it is too hard. Nose-breathing pace.' },
  3: { stimulus: 'Vertical volume plus eccentric loading on descent',
    purpose: 'Steady climbing rather than intervals, then running the whole descent. The downhill is a distinct stimulus and it decides how you feel at mile 30.',
    know: 'The repeated bout effect is real: prior eccentric exposure markedly protects against the same damage later. That protection is built now, not on the day.' },
  4: { stimulus: 'Recovery · mobility',
    purpose: 'Deliberately easy before Saturday. The long run is the priority and it needs fresh-ish legs.',
    know: 'Hip, ankle and calf work is the highest-yield mobility for sustained vertical. Fifteen minutes, honestly done.' },
  5: { stimulus: 'Durability · specific endurance · fuelling',
    purpose: 'The most important session of the block. Time on feet under vertical load with fuelling and hydration rehearsed exactly as it will run on the day.',
    know: 'Heavy sweater on a low-carb baseline punishes improvisation. Weigh in and out for a real sweat rate. Gut absorption capacity is trainable and needs practice.' },
  6: { stimulus: 'Back-to-back long effort on peak weeks, otherwise rest',
    purpose: 'Running on tired legs is the closest available simulation of the back half of a 40 mile day.',
    know: 'Only on the weeks the plan calls for it. Adding back-to-backs opportunistically is how people arrive at the start line already broken.' },
};

const WHY_TAPER: Why = {
  stimulus: 'Fatigue shed · fitness held',
  purpose: 'The tapering evidence is unusually consistent: cut volume substantially while holding intensity and frequency, over roughly two weeks, and performance rises.',
  know: 'Volume drops, intensity does not. Short sharp efforts stay in, long efforts leave. Feeling twitchy and underworked is correct.',
};

export const block5: Block = {
  index: 5, id: 'mountain', name: 'Mountain',
  firstWeek: 46, lastWeek: 55,
  nutrition: 'Mild deficit.',
  bodyweightArc: '240 → 233',
  goal: 'Gallatin Crest Trail, Aug 27-29.',
  minAerobicSessions: 4, minVerticalPullSessions: 0, minVerticalPressSessions: 0, minLowerStrengthSessions: 1, allowsMetcon: false, volumeDriver: 'aerobic',
  maintenanceFloorPct: 0.78,
  deloadWeeks: [4, 7], testWeeks: [],
  principles: [
    'The Crest is a durability problem, not a fitness problem.',
    'Every Thursday runs the full descent. Eccentric exposure via the repeated bout effect is what protects the quads on the day.',
    'Strength stays at 2 sessions of 2 lifts at 80%. Heavy strength work improves endurance performance.',
    'Taper cuts volume 40-60% while holding intensity and frequency.',
    'Fuelling rehearsed every long session. Gut absorption is trainable.',
  ],
  phaseFor: (w) => (WEEKS[w - 1]?.taper ? 'taper' : WEEKS[w - 1]?.peak ? 'peak' : WEEKS[w - 1]?.down ? 'down' : 'build'),

  buildDay(ctx: DayContext): SessionSpec {
    const { weekInBlock: wb, day, event } = ctx;
    const s = WEEKS[wb - 1];

    if (event?.id === 'crest') return {
      title: 'Gallatin Crest', durationLabel: 'All day', why: WHY_EVENT,
      note: 'Off the high ground by mid afternoon. Thunderstorms on an exposed ridge are the hazard, not the distance.',
      groups: [{ heading: 'The capstone', items: [text('Gallatin Crest Trail', 'point to point', {
        cue: 'Twelve months of work. Go get it.', tags: ['event', 'aerobic'] })] }],
    };

    if (s?.taper) {
      switch (day) {
        case 0: return { title: 'Shakeout', durationLabel: '40 min', why: WHY_TAPER,
          groups: [{ heading: 'Easy', items: [
            dur('Easy run', 40, 'flat', { tags: ['aerobic'] }),
            text('Kit check', 'shoes, poles, filter, layers, lights, food')] }] };
        case 1: return { title: 'Openers', durationLabel: '40 min', why: WHY_TAPER,
          groups: [{ heading: 'Sharpen', items: [text('Easy run with 6 x 30 sec pickups', '40 min', { tags: ['aerobic'] })] }] };
        case 2: return rest(WHY_TAPER, 'Logistics day. Confirm shuttle, water plan, weather window, check-in contact.');
        case 3: return rest(WHY_TAPER, 'Eat well, sleep early. Set the hard turnaround rule tonight, in writing, before adrenaline gets a vote.');
        default: return rest(WHY_TAPER, 'Backup attempt window if weather moved you. Otherwise you are done.');
      }
    }

    const why = s?.down && day !== 6 ? WHY_DELOAD : WHY[day];

    switch (day) {
      case 0: return { title: 'Vert intervals', durationLabel: '70 min', why,
        note: `Target ${s.vert} total gain this week.`,
        groups: [
          { heading: 'Main', items: [text('Hill repeats',
            s.down ? '4 x 6 min uphill, jog down' : '6 x 8 min uphill at threshold, jog down',
            { cue: 'Steep and sustained. Not smooth graded switchbacks.', tags: ['aerobic'] })] },
          { heading: 'After', items: [text('Calf and ankle work', '3 x 15 each', { tags: ['lower-strength'] })] },
        ] };
      case 1: return { title: 'Strength, brief', durationLabel: '30 min', why,
        groups: [{ heading: 'Maintenance', items: [
          lift('Back squat', 'bsq', 0.80, 3, 3, { tags: ['lower-strength'] }),
          lift('Bench press', 'bench', 0.80, 3, 3, { tags: ['upper-strength'] }),
          text('Step-up, loaded', '3 x 10 each leg', { tags: ['lower-strength'] })] }] };
      case 2: return { title: 'Easy aerobic', durationLabel: '50-60 min', why,
        groups: [{ heading: 'Aerobic', items: [dur('Easy run or ride', [50, 60], 'zone 2', { tags: ['aerobic'] })] }] };
      case 3: return { title: 'Vert volume', durationLabel: '80-100 min', why,
        note: 'Steady climbing, not intervals. Time on feet under grade.',
        groups: [{ heading: 'Main', items: [
          dur('Sustained climb', [80, 100], '2,000-3,000 ft', { tags: ['aerobic'] }),
          text('Downhill practice', 'descend the whole thing running', {
            cue: 'The Crest will destroy your quads on descent if you never train it.', tags: ['aerobic'] })] }] };
      case 4: return { title: 'Recovery + mobility', durationLabel: '40 min', why,
        groups: [{ heading: 'Recovery', items: [
          dur('Easy spin', 30, undefined, { tags: ['aerobic'] }),
          dur('Hip, ankle, calf mobility', 15, undefined, { tags: ['mobility'] })] }] };
      case 5: return { title: 'Long run', durationLabel: s.peak ? '6-8 hr' : '2-6 hr', why,
        note: s.peak ? 'Peak week. Do this as a Crest section, at Crest pace, in Crest kit, with Crest food.' : 'Ridgelines. Hyalite and the Bridgers.',
        groups: [{ heading: 'Main', items: [
          text('Long mountain run', s.long, { tags: ['aerobic'] }),
          text('Fuel and hydration practice', 'weigh in and out, you are a heavy sweater', {
            cue: 'Dial sodium and carb per hour now, not on race week.' })] }] };
      default: return s.peak
        ? { title: 'Back-to-back long', durationLabel: '2-3 hr', why,
            note: 'Second day on tired legs. The single most specific session in the block.',
            groups: [{ heading: 'Main', items: [text('Run on fatigue', '12-15 mi, moderate vert', { tags: ['aerobic'] })] }] }
        : rest(WHY[6]);
    }
  },
};
