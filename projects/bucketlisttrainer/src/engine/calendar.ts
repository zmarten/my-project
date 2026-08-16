/** Week 1 Day 0 is Monday 2026-08-10. All dates are local midnight. */

export const START = new Date(2026, 7, 10);
export const TOTAL_WEEKS = 55;
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function dateOf(week: number, day: number): Date {
  const d = new Date(START);
  d.setDate(d.getDate() + (week - 1) * 7 + day);
  return d;
}

export function iso(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

export function positionOf(date: Date): { week: number; day: number } | null {
  const a = new Date(START);
  const b = new Date(date);
  b.setHours(0, 0, 0, 0);
  const off = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (off < 0) return null;
  const week = Math.floor(off / 7) + 1;
  if (week > TOTAL_WEEKS) return null;
  return { week, day: off % 7 };
}

export const fmt = (d: Date): string =>
  `${DAY_NAMES[(d.getDay() + 6) % 7]} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
