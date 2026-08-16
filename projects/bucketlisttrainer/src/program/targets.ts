/**
 * Confidence values are COACHING JUDGEMENT, not calculation.
 * Do not render them as derived. See docs/decisions/0001.
 */
export interface Target {
  goal: string;
  baseline: string;
  target: string;
  window: string;
  /** Subjective. 0-100. */
  confidence: number;
  deferred?: boolean;
}

export const targets: Target[] = [
  { goal: 'HSPU',               baseline: 'press ~170',    target: 'strict',        window: 'Dec 2026',    confidence: 85 },
  { goal: 'Bangtail Divide',    baseline: 'no bike base',  target: '24mi / 3300ft', window: 'Jun 19 2027', confidence: 90 },
  { goal: 'Bar muscle-up',      baseline: '5 strict PU',   target: 'muscle-up',     window: 'Dec 2026',    confidence: 72 },
  { goal: 'Dunk',               baseline: 'rim grab',      target: 'one-hand dunk', window: 'Feb 2027',    confidence: 85 },
  { goal: 'Deadlift 600',       baseline: '525',           target: '600',           window: 'May 2027',    confidence: 78 },
  { goal: 'Snatch 225',         baseline: '185, fsq 275',  target: '225',           window: 'Feb 2027',    confidence: 55 },
  { goal: 'Bench 315',          baseline: '275 tested',    target: '315',           window: 'May 2027',    confidence: 78 },
  { goal: 'Handstand walk 25ft',baseline: 'wall holds',    target: '25ft',          window: 'Dec 2026',    confidence: 75 },
  { goal: 'Gallatin Crest',     baseline: '24mi best',     target: 'the Crest',     window: 'Aug 27 2027', confidence: 75 },
  { goal: 'Ring muscle-up',     baseline: '5 strict PU',   target: 'kipping MU',    window: 'Feb 2027',    confidence: 45 },
  { goal: '6-minute mile',      baseline: 'untested',      target: '6:00',          window: 'Jun 8 2027',  confidence: 65 },
  { goal: 'C&J 315',            baseline: 'fsq 275',       target: '280 this year', window: 'Year three',  confidence: 10, deferred: true },
];
