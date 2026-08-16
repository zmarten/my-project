import type { ItemSpec, ItemTag, LiftKey, SessionSpec, Why } from '../types.js';

export const lift = (
  name: string, l: LiftKey, pct: number, sets: number, reps: number | string,
  extra: Partial<ItemSpec> = {}
): ItemSpec => ({
  name,
  prescription: { kind: 'load', lift: l, pct, sets, reps },
  ...extra,
});

export const belt = (
  name: string, pct: number, sets: number, reps: number | string, extra: Partial<ItemSpec> = {}
): ItemSpec => ({
  name, prescription: { kind: 'belt', pct, sets, reps }, tags: ['vertical-pull'], ...extra,
});

export const linear = (
  name: string, lb: number, sets: number, reps: number | string, extra: Partial<ItemSpec> = {}
): ItemSpec => ({
  name, prescription: { kind: 'linear', lb, sets, reps }, ...extra,
});

export const text = (name: string, detail: string, extra: Partial<ItemSpec> = {}): ItemSpec => ({
  name, prescription: { kind: 'text', detail }, ...extra,
});

export const dur = (
  name: string, minutes: [number, number] | number, detail?: string, extra: Partial<ItemSpec> = {}
): ItemSpec => ({
  name, prescription: { kind: 'duration', minutes, detail }, ...extra,
});

export const rest = (why: Why, note?: string): SessionSpec => ({
  title: 'Rest', rest: true, note, why, groups: [],
});

/* ---------- rep-max checks ---------- */

/**
 * Every rep-max check runs at the same percentage, everywhere, forever.
 *
 * The point of the check is comparing week 18 to week 23 to week 35, and two AMRAPs at
 * different relative loads are not comparable. 85% is high enough that the Epley estimate
 * stays honest (roughly 3 to 7 reps) and low enough that the set is not a max attempt.
 */
export const REP_MAX_PCT = 0.85;

/**
 * One AMRAP set that yields an estimated 1RM, for use in a deload week.
 *
 * It REPLACES a working set rather than adding one. A deload that gains a set is not a
 * deload, and `deload-is-volume` is watching. See ADR-0015.
 */
export const repMaxCheck = (
  name: string, l: LiftKey, tags: ItemTag[], extra: Partial<ItemSpec> = {}
): ItemSpec => ({
  name,
  prescription: { kind: 'load', lift: l, pct: REP_MAX_PCT, sets: 1, reps: 'AMRAP' },
  cue: 'Stop while every rep still looks like the first. Estimated max is weight x (1 + reps / 30).',
  tags: ['test', ...tags],
  tests: [l],
  ...extra,
});

/* ---------- skill progressions ---------- */

/**
 * Block 1 skill work: 2 items, 8 minutes.
 *
 * Weeks 1-3 are BLOCKED (identical daily), which suits early acquisition when the job
 * is stabilizing one pattern. Week 4 onward is VARIABLE by day. Contextual interference
 * makes variable practice look worse in-session and retain and transfer better, and the
 * challenge point framework says to raise practice difficulty as skill level rises.
 *
 * The old version ran the same four items for five weeks, which past about week 3 was
 * attendance rather than training. See ADR-0007.
 */
export function skillItems(blockIndex: number, weekInBlock: number, day: number): ItemSpec[] {
  const t = (n: string, d: string, cue?: string): ItemSpec =>
    ({ name: n, prescription: { kind: 'text', detail: d }, cue, tags: ['skill'] });

  if (blockIndex === 1) {
    if (weekInBlock <= 3) return [
      t('Wall walks', '4 x 3, 3 sec lower'),
      t('Hollow body hold', '4 x 30 sec'),
    ];
    const rota: Record<number, ItemSpec[]> = {
      0: [t('Shoulder taps, chest to wall', '5 x 6 each side'),
          t('Wall handstand hold', 'accumulate 90 sec')],
      1: [t('Freestanding kick-up to balance', '10 min, quality attempts'),
          t('False grip ring hang', '4 x 25 sec')],
      3: [t('Wall walk negatives', '5 x 2, 5 sec lower',
            'Eccentric control is what makes the strict HSPU catchable.'),
          t('Hollow rocks', '3 x 20')],
      4: [t('Heel pulls to freestanding', '12 attempts'),
          t('Handstand walk', weekInBlock <= 7 ? '6 x 5-10 ft' : 'accumulate 25 ft')],
    };
    return rota[day] ?? [];
  }
  if (blockIndex === 2) {
    const early = weekInBlock <= 7;
    const rota: Record<number, ItemSpec[]> = {
      0: early
        ? [t('Handstand walk', '6 x 10-15 ft'), t('Wall handstand hold', 'accumulate 90 sec')]
        : [t('Handstand walk 25 ft', 'unbroken attempts, 6 tries'), t('Freestanding hold', '8 attempts')],
      1: early
        ? [t('Kipping HSPU', '5 x 3-5'), t('Strict ring dip', '4 x 5')]
        : [t('Ring muscle-up', 'kipping, 8 singles, fresh',
             'Needs the high anchor. If it is not built, substitute low-ring transitions.')],
      5: early
        ? [t('False grip ring pull-up', '5 x 3'), t('Low ring transition', '6 x 3')]
        : [t('Bar MU', '3 x 3 unbroken'), t('Ring MU', '6 singles')],
    };
    return rota[day] ?? [];
  }
  return [t('Handstand hold', 'accumulate 2 min, maintenance')];
}

export const skillGroup = (blockIndex: number, weekInBlock: number, day = 0) => ({
  heading: 'Skill, 8 min, before you lift',
  items: skillItems(blockIndex, weekInBlock, day),
});

/* ---------- shared why fragments ---------- */

export const WHY_TEST: Why = {
  stimulus: 'Assessment · maximal · fully rested',
  purpose:
    'Every load in this program is a percentage of a tested number. A guessed max produces guessed training, and 54 weeks of it compounds into a plan that fits somebody else.',
  know:
    'Test rested and log honestly. Sandbagging costs a block of correct loading. Overreaching costs a week of recovery and a number you cannot repeat.',
};

/**
 * The why for a deload week that carries a rep-max check. It replaces WHY_DELOAD on those
 * days, because on those days the check is the point of the session.
 */
export const WHY_RETEST: Why = {
  stimulus: 'Assessment · submaximal · estimated 1RM',
  purpose:
    'Detrained is not untrained. Strength returns far faster the second time, so a tested max goes stale fastest in exactly the phase where it is regaining. Every load under this line is a percentage of a number from weeks ago. One hard set in a down week is the cheapest way to find out whether those percentages still mean what they say.',
  know:
    'Stop while every rep still looks like the first one. A grinder inflates the estimate and then every load in the block rides on it. Put the number in src/athlete.ts and run npm run check the same day. A result that stays in your notes changes nothing.',
};

export const WHY_DELOAD: Why = {
  stimulus: 'Planned volume reduction · adaptation window',
  purpose:
    'Fitness is built by stress but expressed only once fatigue clears. A down week drops fatigue while fitness stays, which is why the following week usually feels like a jump.',
  know: 'Do not add anything back. Filling a light week is the most common way a good plan gets broken.',
};

export const WHY_EVENT: Why = {
  stimulus: 'Competition · maximal · the whole point',
  purpose:
    'This is what the training was for. Execution is its own skill: pacing, fuelling, and not making an emotional decision in the first hour.',
  know: 'Start conservatively. Nearly every failed attempt at any of these came from going out hard while it still felt easy.',
};
