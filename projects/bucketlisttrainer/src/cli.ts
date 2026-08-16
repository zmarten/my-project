import { writeFileSync, mkdirSync } from 'node:fs';
import { program } from './program/index.js';
import { zach, dunkRequirementIn } from './athlete.js';
import { resolveProgram, resolveSession } from './engine/resolve.js';
import { checkProgram } from './engine/invariants.js';
import { positionOf, dateOf, fmt, TOTAL_WEEKS } from './engine/calendar.js';
import { targets } from './program/targets.js';
import type { ResolvedSession } from './types.js';

const C = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  gold: (s: string) => `\x1b[33m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

function printSession(s: ResolvedSession) {
  const d = dateOf(s.week, s.day);
  console.log('');
  console.log(C.dim(`week ${s.week}/${TOTAL_WEEKS}  ·  block ${s.blockIndex} ${s.blockId}  ·  wk ${s.weekInBlock} in block`));
  console.log(C.bold(`${fmt(d)}   ${s.title}`) + (s.durationLabel ? C.dim(`   ${s.durationLabel}`) : ''));
  if (s.note) console.log(C.dim(`\n  ${s.note}`));
  console.log('');
  console.log(C.gold('  STIMULUS  ') + s.why.stimulus);
  console.log(C.gold('  PURPOSE   ') + wrap(s.why.purpose, 12));
  console.log(C.gold('  KNOW      ') + wrap(s.why.know.replace(/<\/?b>/g, ''), 12));
  for (const g of s.groups) {
    console.log('');
    console.log(C.dim(`  ${g.heading.toUpperCase()}`));
    for (const i of g.items) {
      const load = i.loadLb ? C.bold(`  ${i.loadLb} lb`) : '';
      console.log(`  ${i.name}${C.dim('  ·  ' + i.prescription)}${load}`);
      if (i.cue) console.log(C.dim(`     ${i.cue}`));
    }
  }
  console.log('');
}

function wrap(s: string, indent: number, width = 76): string {
  const pad = ' '.repeat(indent);
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > width) { lines.push(cur.trim()); cur = w; }
    else cur += ' ' + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.join('\n' + pad);
}

const [cmd, arg] = process.argv.slice(2);

switch (cmd) {
  case 'today': {
    const pos = positionOf(new Date());
    if (!pos) {
      const days = Math.ceil((program.startDate.getTime() - Date.now()) / 86400000);
      console.log(C.dim(`\nProgram opens ${fmt(program.startDate)}, ${days} days out. Showing week 1 day 1.\n`));
      printSession(resolveSession(program, zach, 1, 0));
    } else printSession(resolveSession(program, zach, pos.week, pos.day));
    break;
  }
  case 'week': {
    const w = Number(arg);
    if (!w || w < 1 || w > TOTAL_WEEKS) { console.error(`week 1-${TOTAL_WEEKS}`); process.exit(1); }
    for (let d = 0; d < 7; d++) printSession(resolveSession(program, zach, w, d));
    break;
  }
  case 'check': {
    const rp = resolveProgram(program, zach);
    const v = checkProgram(rp);
    const errors = v.filter(x => x.severity === 'error');
    const warns = v.filter(x => x.severity === 'warn');
    console.log('');
    for (const x of v) {
      const tag = x.severity === 'error' ? C.red('ERROR') : C.gold(' WARN');
      console.log(`${tag}  ${C.bold(x.invariant)}  ${C.dim(x.where)}\n       ${x.detail}`);
    }
    console.log('');
    console.log(errors.length === 0
      ? C.green(`  ${rp.sessions.length} sessions checked. 0 errors, ${warns.length} warnings.`)
      : C.red(`  ${errors.length} errors, ${warns.length} warnings.`));
    console.log('');
    process.exit(errors.length ? 1 : 0);
  }
  case 'export': {
    const rp = resolveProgram(program, zach);
    /* The app needs more than sessions. Block metadata drives the week header, targets
       drive the goals screen, and the athlete summary is what makes a load explicable
       ("250 lb" means nothing without "90% of a tested 275"). */
    const bundle = {
      ...rp,
      totalWeeks: TOTAL_WEEKS,
      blocks: program.blocks.map(b => ({
        index: b.index, id: b.id, name: b.name,
        firstWeek: b.firstWeek, lastWeek: b.lastWeek,
        goal: b.goal, nutrition: b.nutrition, bodyweightArc: b.bodyweightArc,
        principles: b.principles,
        deloadWeeks: b.deloadWeeks, testWeeks: b.testWeeks,
      })),
      events: program.events,
      targets,
      athlete: {
        name: zach.name,
        bodyweightLb: zach.bodyweightLb,
        maxes: zach.maxes,
        dunkNeedsIn: dunkRequirementIn(zach),
      },
    };
    mkdirSync('dist', { recursive: true });
    writeFileSync('dist/program.json', JSON.stringify(bundle, null, 2));

    /*
     * The served copy drops the athlete block.
     *
     * `dist/` is local. `app/program.json` is a static file on a public domain, and this
     * block is a complete physical profile: bodyweight and every tested max. The app never
     * read it, so it was pure exposure for no feature. Prescribed loads still imply a lot,
     * and gating the route is the actual fix, but shipping the profile itself is not
     * something to leave for later.
     */
    const { athlete: _athlete, ...served } = bundle;
    mkdirSync('app', { recursive: true });
    writeFileSync('app/program.json', JSON.stringify(served));
    console.log(C.green(`\n  Wrote dist/program.json and app/program.json  ·  ${rp.sessions.length} sessions\n`));
    break;
  }
  case 'targets': {
    console.log('');
    for (const t of targets) {
      const bar = '█'.repeat(Math.round(t.confidence / 5)).padEnd(20, '·');
      console.log(`  ${t.goal.padEnd(24)} ${C.dim(t.window.padEnd(14))} ${bar} ${t.confidence}%${t.deferred ? C.dim('  deferred') : ''}`);
    }
    console.log(C.dim('\n  Confidence is coaching judgement, not calculation. See docs/decisions/0001.\n'));
    break;
  }
  case 'athlete': {
    console.log(`\n  ${C.bold(zach.name)}  ·  ${zach.bodyweightLb} lb  ·  reach ${zach.standingReachIn}in`);
    console.log(C.dim(`  Dunk needs a ${dunkRequirementIn(zach)}in running vertical.\n`));
    for (const [k, v] of Object.entries(zach.maxes)) console.log(`  ${k.padEnd(8)} ${v}`);
    console.log('');
    for (const p of zach.profile) console.log(C.dim(`  · ${p}`));
    console.log('');
    break;
  }
  default:
    console.log(`
  bucketlist-training

  npm run today          today's session
  npm run week -- 14     a whole week
  npm run check          run every coaching invariant
  npm run export         write dist/program.json
  npm run targets        goal table with confidence
  npm run athlete        current maxes and profile
`);
}
