import type { Program } from '../types.js';
import { START, TOTAL_WEEKS } from '../engine/calendar.js';
import { events } from './events.js';
import { block1 } from './blocks/block1.js';
import { block2 } from './blocks/block2.js';
import { block3 } from './blocks/block3.js';
import { block4 } from './blocks/block4.js';
import { block5 } from './blocks/block5.js';

export const program: Program = {
  id: 'bucketlist-2026-27',
  startDate: START,
  totalWeeks: TOTAL_WEEKS,
  blocks: [block1, block2, block3, block4, block5],
  events,
};

export const blockForWeek = (w: number) =>
  program.blocks.find(b => w >= b.firstWeek && w <= b.lastWeek) ?? program.blocks[0];
