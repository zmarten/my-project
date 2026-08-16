/*
 * Bucket List, read-only viewer.
 *
 * Phase 1 deliberately writes nothing. It renders the resolved program from a single
 * cached JSON bundle so the app opens instantly with no signal. Logging lands in Phase 2
 * against IndexedDB with an outbox, which is why nothing here talks to the network after
 * the first load.
 */
'use strict';

var DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

var P = null;          // the program bundle
var state = { tab: 'today', week: 1, day: 0, weekView: 1 };

/* ------------------------------------------------------------------ utils */

function el(id) { return document.getElementById(id); }

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** dateISO strings are local-midnight calendar dates. Parse as local, never as UTC. */
function parseISO(iso) {
  var p = iso.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function fmtLong(iso) {
  var d = parseISO(iso);
  return DAY_NAMES[(d.getDay() + 6) % 7] + ' ' + MONTHS[d.getMonth()] + ' ' + d.getDate();
}

function sessionAt(week, day) {
  for (var i = 0; i < P.sessions.length; i++) {
    var s = P.sessions[i];
    if (s.week === week && s.day === day) return s;
  }
  return null;
}

function blockFor(week) {
  for (var i = 0; i < P.blocks.length; i++) {
    var b = P.blocks[i];
    if (week >= b.firstWeek && week <= b.lastWeek) return b;
  }
  return P.blocks[0];
}

function eventAt(week, day) {
  for (var i = 0; i < P.events.length; i++) {
    if (P.events[i].week === week && P.events[i].day === day) return P.events[i];
  }
  return null;
}

/** Where the athlete is today, clamped into the program if it has not started or has ended. */
function locateToday() {
  var iso = todayISO();
  for (var i = 0; i < P.sessions.length; i++) {
    if (P.sessions[i].dateISO === iso) {
      return { week: P.sessions[i].week, day: P.sessions[i].day, inProgram: true };
    }
  }
  var first = P.sessions[0];
  var last = P.sessions[P.sessions.length - 1];
  if (iso < first.dateISO) return { week: 1, day: 0, inProgram: false, before: true };
  return { week: last.week, day: last.day, inProgram: false, before: false };
}

var toastTimer = null;
function toast(msg) {
  var t = el('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
}

/* ------------------------------------------------------------------ bodyweight */

/*
 * Weight lives in localStorage and nowhere else.
 *
 * It is deliberately NOT in program.json and it never reaches a server, because the served
 * bundle sits on a public domain until the route is gated. It also does not feed any
 * prescription. Belt weight is a percentage of total system load, so a measured bodyweight
 * wired straight into `beltLoad()` would move Thursday's belt because he weighed in after
 * coffee, and at a 9 lb cut overshoot it would prescribe +45 against a +40 tested ceiling.
 * See ADR-0013. Capture the number now, wire it to loads once the guards exist.
 */
var WT_KEY = 'bl.weight.v1';

function wtAll() {
  try { return JSON.parse(localStorage.getItem(WT_KEY) || '{}'); }
  catch (e) { return {}; }
}

function wtSave(iso, lb) {
  var all = wtAll();
  if (lb === null) delete all[iso]; else all[iso] = lb;
  try { localStorage.setItem(WT_KEY, JSON.stringify(all)); return true; }
  catch (e) { toast('Could not save. Storage is full or blocked.'); return false; }
}

function wtSorted() {
  var all = wtAll();
  return Object.keys(all).sort().map(function (k) { return { iso: k, lb: all[k] }; });
}

/*
 * Exponentially weighted average, alpha 0.13, decayed by ELAPSED DAYS rather than by
 * reading count. Daily weight swings 2 to 4 lb on water alone, so the raw number is close
 * to useless day to day. Decaying by time means a gap of five days does not let a stale
 * reading carry the same weight as yesterday's.
 */
function wtTrend() {
  var rows = wtSorted();
  if (!rows.length) return null;
  var ewma = rows[0].lb;
  var prev = parseISO(rows[0].iso);
  for (var i = 1; i < rows.length; i++) {
    var d = parseISO(rows[i].iso);
    var days = Math.max(1, Math.round((d - prev) / 86400000));
    var a = 1 - Math.pow(1 - 0.13, days);
    ewma = ewma + a * (rows[i].lb - ewma);
    prev = d;
  }
  return ewma;
}

/**
 * Change per week over the trailing window, by least squares.
 *
 * First reading against last is the obvious version and it is wrong: both endpoints carry
 * the full daily swing, so a heavy first morning or a light last one drags the slope. On a
 * 21 day window with a true drift of 2.2 lb/wk it read 1.5. Regression uses every point,
 * which is the whole reason to weigh daily rather than weekly.
 */
function wtRate() {
  var rows = wtSorted();
  if (rows.length < 4) return null;
  var recent = rows.slice(-21);
  var t0 = parseISO(recent[0].iso);
  var span = (parseISO(recent[recent.length - 1].iso) - t0) / 86400000;
  if (span < 6) return null;

  var n = recent.length, sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (var i = 0; i < n; i++) {
    var x = (parseISO(recent[i].iso) - t0) / 86400000;
    var y = recent[i].lb;
    sx += x; sy += y; sxy += x * y; sxx += x * x;
  }
  var denom = n * sxx - sx * sx;
  if (!denom) return null;
  return ((n * sxy - sx * sy) / denom) * 7;
}

function wtSpark(rows) {
  if (rows.length < 2) return '';
  var pts = rows.slice(-21);
  var vals = pts.map(function (r) { return r.lb; });
  var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
  var span = hi - lo || 1;
  var W = 54, H = 18;
  var d = pts.map(function (r, i) {
    var x = (i / (pts.length - 1)) * W;
    var y = H - ((r.lb - lo) / span) * H;
    return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  }).join(' ');
  var lastX = W, lastY = H - ((pts[pts.length - 1].lb - lo) / span) * H;
  return '<svg class="wt-spark" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
    '<path d="' + d + '" fill="none" stroke="#4A5F51" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<circle cx="' + lastX + '" cy="' + lastY.toFixed(1) + '" r="2.2" fill="#D6A648"/></svg>';
}

function renderWeightStrip() {
  var iso = sessionAt(state.week, state.day).dateISO;
  var all = wtAll();
  var today = all[iso];
  var rows = wtSorted();
  var trend = wtTrend();
  var rate = wtRate();

  var right = '';
  if (rows.length) {
    var bits = [];
    if (trend !== null) bits.push('trend ' + trend.toFixed(1));
    if (rate !== null) bits.push((rate >= 0 ? '+' : '') + rate.toFixed(1) + ' lb/wk');
    right = wtSpark(rows) + '<span class="wt-trend">' + bits.join('<br>') + '</span>';
  }

  return '<button type="button" class="wt' + (today === undefined ? ' is-empty' : '') + '" id="wtBtn">' +
    '<span class="eyebrow wt-k">Weight</span>' +
    (today === undefined
      ? '<span class="wt-empty">Tap to log</span>'
      : '<span class="wt-v">' + today.toFixed(1) + '<span class="u">lb</span></span>') +
    right +
    '</button>';
}

function openWeightSheet() {
  var iso = sessionAt(state.week, state.day).dateISO;
  var all = wtAll();
  var rows = wtSorted();
  var start = all[iso] !== undefined ? all[iso]
    : (rows.length ? rows[rows.length - 1].lb : 240);

  var hist = rows.slice(-14).reverse().map(function (r) {
    return '<div class="wt-hist-row">' +
      '<span class="wt-hist-d">' + fmtLong(r.iso) + '</span>' +
      '<span class="wt-hist-v">' + r.lb.toFixed(1) + ' lb' +
      '<button type="button" class="wt-hist-x" data-del="' + r.iso + '" aria-label="Delete entry">&times;</button>' +
      '</span></div>';
  }).join('');

  var scrim = document.createElement('div');
  scrim.className = 'sheet-scrim';
  scrim.innerHTML =
    '<div class="sheet" role="dialog" aria-label="Log weight">' +
      '<h2>Weight</h2>' +
      '<p class="sub">' + fmtLong(iso).toUpperCase() + '</p>' +
      '<div class="wt-row">' +
        '<button type="button" class="wt-step" id="wtDown" aria-label="Down 0.2 lb">&minus;</button>' +
        '<input class="wt-input" id="wtInput" type="number" inputmode="decimal" step="0.1" ' +
          'min="80" max="500" value="' + start.toFixed(1) + '">' +
        '<button type="button" class="wt-step" id="wtUp" aria-label="Up 0.2 lb">+</button>' +
      '</div>' +
      '<div class="sheet-actions">' +
        '<button type="button" class="btn btn-quiet" id="wtCancel">Cancel</button>' +
        '<button type="button" class="btn btn-primary" id="wtOk">Save</button>' +
      '</div>' +
      (rows.length ? '<div class="wt-hist">' + hist + '</div>' : '') +
    '</div>';
  document.body.appendChild(scrim);

  var input = scrim.querySelector('#wtInput');
  var nudge = function (delta) {
    var v = parseFloat(input.value);
    if (isNaN(v)) v = start;
    input.value = Math.round((v + delta) * 10) / 10;
  };
  scrim.querySelector('#wtDown').onclick = function () { nudge(-0.2); };
  scrim.querySelector('#wtUp').onclick = function () { nudge(0.2); };

  var close = function () { scrim.remove(); };
  scrim.querySelector('#wtCancel').onclick = close;
  scrim.onclick = function (e) { if (e.target === scrim) close(); };

  scrim.querySelector('#wtOk').onclick = function () {
    var v = parseFloat(input.value);
    /* A fat-fingered 2645 silently poisons the trend for weeks, so reject rather than store. */
    if (isNaN(v) || v < 80 || v > 500) { toast('Enter a weight between 80 and 500 lb'); return; }
    if (wtSave(iso, Math.round(v * 10) / 10)) { close(); render(); toast('Logged'); }
  };

  var dels = scrim.querySelectorAll('[data-del]');
  for (var i = 0; i < dels.length; i++) {
    dels[i].onclick = function (e) {
      e.stopPropagation();
      wtSave(this.dataset.del, null);
      close(); render();
    };
  }

  input.focus();
  input.select();
}

/* ------------------------------------------------------------------ render: today */

function isDeload(week) {
  var b = blockFor(week);
  return b.deloadWeeks.indexOf(week - b.firstWeek + 1) >= 0;
}
function isTestWeek(week) {
  var b = blockFor(week);
  return b.testWeeks.indexOf(week - b.firstWeek + 1) >= 0;
}

function hasTag(s, tag) {
  for (var g = 0; g < s.groups.length; g++) {
    for (var i = 0; i < s.groups[g].items.length; i++) {
      var tags = s.groups[g].items[i].tags || [];
      if (tags.indexOf(tag) >= 0) return true;
    }
  }
  return false;
}

function renderItem(it) {
  var load = '';
  if (it.loadLb) {
    load = '<span class="item-load">' + it.loadLb + '<span class="u">lb</span></span>';
  }
  var cue = it.cue ? '<p class="item-cue">' + esc(it.cue) + '</p>' : '';
  return '' +
    '<div class="item">' +
      '<div class="item-top">' +
        '<span class="item-name">' + esc(it.name) + '</span>' + load +
      '</div>' +
      '<div class="item-rx">' + esc(it.prescription) + '</div>' +
      cue +
    '</div>';
}

function renderToday() {
  var s = sessionAt(state.week, state.day);
  if (!s) return '<p class="rest">No session found.</p>';

  /*
   * Chips describe THIS session, not the week around it. Tagging an easy spin with
   * "test week" because week 1 happens to contain tests reads as though the spin is the
   * test. Week-level context belongs in the week view, where it is about the week.
   */
  var chips = '';
  if (hasTag(s, 'test')) chips += '<span class="chip chip-test">Test</span>';
  else if (isDeload(s.week)) chips += '<span class="chip chip-deload">Deload week</span>';
  var ev = eventAt(s.week, s.day);
  if (ev) chips += '<span class="chip chip-event">' + esc(ev.short) + '</span>';

  var head = '' +
    '<div class="shead">' +
      '<span class="eyebrow date">' + esc(fmtLong(s.dateISO)) + '</span>' +
      '<h1>' + esc(s.title) + chips + '</h1>' +
      (s.durationLabel ? '<span class="dur">' + esc(s.durationLabel) + '</span>' : '') +
      (s.note ? '<p class="note">' + esc(s.note) + '</p>' : '') +
    '</div>';

  var stim = '<p class="stim">' + esc(s.why.stimulus) + '</p>';

  /* Weight sits under the header, above the session. It is a daily habit rather than part
     of the workout, so it gets one line and does not compete with the first lift. */
  var weight = renderWeightStrip();

  /*
   * Purpose and know sit behind one tap. The know field is the thing people get wrong and
   * it changes execution, so it is not buried, but it does not belong competing with the
   * first lift at 5:40am either.
   */
  var why = '' +
    '<details class="why">' +
      '<summary class="why-btn">' +
        '<span class="eyebrow">Why this session</span>' +
        '<span class="why-caret" aria-hidden="true">&#9660;</span>' +
      '</summary>' +
      '<div class="why-body">' +
        '<div><span class="eyebrow why-k">Purpose</span>' +
          '<p class="why-v">' + esc(s.why.purpose) + '</p></div>' +
        '<div class="why-know"><span class="eyebrow why-k">Know</span>' +
          '<p class="why-v">' + esc(s.why.know.replace(/<\/?b>/g, '')) + '</p></div>' +
      '</div>' +
    '</details>';

  if (s.rest) {
    return head + weight + stim + why +
      '<div class="rest"><strong>Rest</strong>Nothing today. That is the prescription.</div>';
  }

  var groups = '';
  for (var g = 0; g < s.groups.length; g++) {
    var grp = s.groups[g];
    if (!grp.items.length) continue;
    var items = '';
    for (var i = 0; i < grp.items.length; i++) items += renderItem(grp.items[i]);
    groups += '<section class="group"><span class="eyebrow">' + esc(grp.heading) + '</span>' + items + '</section>';
  }

  return head + weight + stim + why + groups;
}

/* ------------------------------------------------------------------ render: week */

function renderWeek() {
  var w = state.weekView;
  var b = blockFor(w);
  var wib = w - b.firstWeek + 1;
  var tIso = todayISO();

  /* Week-level status lives here, where the subject actually is the week. */
  var status = isTestWeek(w) ? 'Test week' : (isDeload(w) ? 'Deload week' : null);
  var meta = [
    'Week ' + wib + ' of ' + (b.lastWeek - b.firstWeek + 1),
    b.nutrition,
    b.bodyweightArc,
  ];
  if (status) meta.unshift(status);
  var metaHtml = '';
  for (var m = 0; m < meta.length; m++) metaHtml += '<span>' + esc(meta[m]) + '</span>';

  var head = '' +
    '<div class="wk-head">' +
      '<h2>Week ' + w + '</h2>' +
      '<div class="wk-nav">' +
        '<button type="button" id="wkPrev" aria-label="Previous week"' + (w <= 1 ? ' disabled' : '') + '>&#8249;</button>' +
        '<button type="button" id="wkNext" aria-label="Next week"' + (w >= P.totalWeeks ? ' disabled' : '') + '>&#8250;</button>' +
      '</div>' +
    '</div>' +
    '<div class="blockcard">' +
      '<span class="eyebrow">Block ' + b.index + ' &middot; ' + esc(b.name) + '</span>' +
      '<p class="bc-goal">' + esc(b.goal) + '</p>' +
      '<div class="bc-meta">' + metaHtml + '</div>' +
    '</div>';

  var days = '';
  for (var d = 0; d < 7; d++) {
    var s = sessionAt(w, d);
    if (!s) continue;
    var cls = 'day';
    if (s.dateISO === tIso) cls += ' is-today';
    if (s.rest) cls += ' is-rest';
    var sub = s.rest ? 'Rest' : (s.durationLabel || s.why.stimulus.split(' · ')[0]);
    days += '' +
      '<button type="button" class="' + cls + '" data-week="' + w + '" data-day="' + d + '">' +
        '<span class="day-d">' + DAY_NAMES[d] + '<br>' + parseISO(s.dateISO).getDate() + '</span>' +
        '<span class="day-mid">' +
          '<span class="day-t">' + esc(s.title) + '</span>' +
          '<span class="day-s">' + esc(sub) + '</span>' +
        '</span>' +
        '<span class="day-go" aria-hidden="true">&#8250;</span>' +
      '</button>';
  }

  return head + '<div class="daylist">' + days + '</div>';
}

/* ------------------------------------------------------------------ render: goals */

function renderGoals() {
  var lede = '' +
    '<div class="goals-lede">' +
      '<p><strong>Confidence here is coaching judgement, not calculation.</strong> ' +
      'It is drawn in steps over a dashed line so it never reads like a measurement. ' +
      'Nothing computed it and nothing validates it.</p>' +
      '<p>Tested maxes are the measured numbers. These are opinions about them.</p>' +
    '</div>';

  var out = '';
  for (var i = 0; i < P.targets.length; i++) {
    var t = P.targets[i];
    var filled = Math.round(t.confidence / 5);
    var steps = '';
    for (var s = 0; s < 20; s++) {
      steps += '<span class="conf-step' + (s < filled ? '' : ' is-off') + '"></span>';
    }
    out += '' +
      '<div class="goal' + (t.deferred ? ' is-deferred' : '') + '">' +
        '<div class="goal-top">' +
          '<span class="goal-name">' + esc(t.goal) + '</span>' +
          '<span class="goal-win">' + esc(t.window) + '</span>' +
        '</div>' +
        '<p class="goal-sub">' + esc(t.baseline) + ' &rarr; ' + esc(t.target) + '</p>' +
        '<div class="conf">' +
          '<span class="conf-track"><span class="conf-steps">' + steps + '</span></span>' +
          '<span class="conf-val">' + t.confidence + '%</span>' +
        '</div>' +
        '<span class="conf-tag">' + (t.deferred ? 'Deferred &middot; your call' : 'Your call') + '</span>' +
      '</div>';
  }
  return lede + out;
}

/* ------------------------------------------------------------------ shell */

function syncTopbar() {
  var showNav = state.tab === 'today';
  el('prevBtn').style.visibility = showNav ? '' : 'hidden';
  el('nextBtn').style.visibility = showNav ? '' : 'hidden';

  var w = state.tab === 'week' ? state.weekView : state.week;
  var b = blockFor(w);
  el('tbWeek').textContent = 'Week ' + w + ' / ' + P.totalWeeks;
  el('tbBlock').textContent = 'Block ' + b.index + '  ' + b.name;

  var idx = (state.week - 1) * 7 + state.day;
  el('prevBtn').disabled = idx <= 0;
  el('nextBtn').disabled = idx >= P.totalWeeks * 7 - 1;
}

function render() {
  var v = el('view');
  if (state.tab === 'today') v.innerHTML = renderToday();
  else if (state.tab === 'week') v.innerHTML = renderWeek();
  else v.innerHTML = renderGoals();

  syncTopbar();
  window.scrollTo(0, 0);

  var wtBtn = el('wtBtn');
  if (wtBtn) wtBtn.onclick = openWeightSheet;

  if (state.tab === 'week') {
    var p = el('wkPrev'), n = el('wkNext');
    if (p) p.onclick = function () { state.weekView--; render(); };
    if (n) n.onclick = function () { state.weekView++; render(); };
    var days = v.querySelectorAll('.day');
    for (var i = 0; i < days.length; i++) {
      days[i].onclick = function () {
        state.week = +this.dataset.week;
        state.day = +this.dataset.day;
        setTab('today');
      };
    }
  }
}

function setTab(tab) {
  state.tab = tab;
  if (tab === 'week') state.weekView = state.week;
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('is-active', tabs[i].dataset.tab === tab);
  }
  render();
}

function step(delta) {
  var idx = (state.week - 1) * 7 + state.day + delta;
  if (idx < 0 || idx >= P.totalWeeks * 7) return;
  state.week = Math.floor(idx / 7) + 1;
  state.day = idx % 7;
  render();
}

function wireShell() {
  el('prevBtn').onclick = function () { step(-1); };
  el('nextBtn').onclick = function () { step(1); };

  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].onclick = function () { setTab(this.dataset.tab); };
  }

  document.addEventListener('keydown', function (e) {
    if (state.tab !== 'today') return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  /* Horizontal swipe moves a day. Vertical gestures stay with the scroller. */
  var x0 = null, y0 = null;
  document.addEventListener('touchstart', function (e) {
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (x0 === null || state.tab !== 'today') return;
    var dx = e.changedTouches[0].clientX - x0;
    var dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.8) step(dx < 0 ? 1 : -1);
    x0 = y0 = null;
  }, { passive: true });
}

/* ------------------------------------------------------------------ boot */

function fail(msg) {
  var b = el('boot');
  b.classList.add('is-error');
  b.querySelector('.boot-msg').textContent = msg;
}

function start(bundle) {
  P = bundle;

  var pos = locateToday();
  state.week = pos.week;
  state.day = pos.day;
  state.weekView = pos.week;

  el('boot').remove();
  el('topbar').hidden = false;
  el('view').hidden = false;
  el('tabbar').hidden = false;

  wireShell();
  render();

  if (!pos.inProgram) {
    toast(pos.before ? 'Program opens Aug 10 2026' : 'Program complete');
  }
}

/*
 * A 401 is not an error, it is a state. The Worker answers gated data with JSON rather
 * than an Access redirect precisely so this branch can exist: offer the way in instead of
 * showing a dead end.
 */
function showSignIn() {
  var back = encodeURIComponent(location.pathname);
  var b = el('boot');
  b.classList.remove('is-error');
  b.innerHTML =
    '<p class="boot-msg">This is your training plan.</p>' +
    '<a class="btn btn-primary" style="max-width:240px;text-decoration:none" ' +
    'href="/projects/bucketlisttrainer/signin?redirect=' + back + '">Sign in</a>';
}

fetch('program.json', { cache: 'no-cache' })
  .then(function (r) {
    if (r.status === 401) { var e = new Error('signin'); e.signin = true; throw e; }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(start)
  .catch(function (e) {
    if (e.signin) return showSignIn();
    fail('Could not load the program. ' + e.message +
         '. If this is the first run, you need a connection once.');
  });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline is still fine */ });
  });
}
