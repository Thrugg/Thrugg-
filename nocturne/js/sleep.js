/* Nocturne — the engine. Pure functions, no DOM, no storage. Every duration is in whole minutes.

   A night is named after the date you wake up on. Its window runs from 18:00 the evening before to 18:00 that day,
   and clock positions are minutes from midnight of the wake date (23:30 the evening before = −30).

   Stored night: { a, b, on, off, w, s, n?, m?, bs?, d?, src?, z? }
     a   minutes asleep in the main sleep            b   minutes in bed
     on  sleep onset            off final wake       w   minutes awake between the two
     s   every asleep interval in the window [[start, end], …] (naps included; used for regularity)
     n   minutes asleep outside the main sleep       m   1 when "in bed" was recorded, absent when b is only onset → wake
     bs  start of time in bed (when m)               d   [core, deep, REM] minutes when the source records stages
     src source name                                 z   time zone of the night when it differs from the usual one */

export const CAUSES = ['winddown', 'screen', 'training', 'social', 'travel', 'other'];
export const CLEAN = 'clean';
export const WIN0 = -360, WIN1 = 1080;          // 18:00 → 18:00
export const SESSION_GAP = 120;                 // asleep stretches less than 2 h apart belong to one sleep
export const LATENCY = 15;                      // minutes assumed to fall asleep when "in bed" was not recorded
export const BASE_DAYS = 28;                    // look-back for the plan's starting point
export const ORDINARY_DAYS = 56, ORDINARY_MIN = 3; // look-back and minimum count for the "ordinary night" level
export const STEP_MIN = 15, STEP_NIGHTS = 3;    // bedtime moves 15 min earlier every 3 nights

/* ---------- dates ---------- */
const DAY_MS = 864e5;
export const toMs = d => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const iso = ms => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d, n) => iso(toMs(d) + n * DAY_MS);
export const diffDays = (a, b) => Math.round((toMs(a) - toMs(b)) / DAY_MS);
export const localDate = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
/* The night you tag "this morning" is the one that ended today; until 03:00 the day before still counts as today. */
export const morningOf = (now = new Date()) => localDate(new Date(now.getTime() - 3 * 36e5));
export const range = (end, n) => Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));
export const lastNight = nights => Object.keys(nights).sort().pop() || null;

/* ---------- small maths ---------- */
const sum = xs => xs.reduce((a, b) => a + b, 0);
export const mean = xs => xs.length ? sum(xs) / xs.length : null;
export const median = xs => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
export const sd = xs => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(sum(xs.map(x => (x - m) ** 2)) / (xs.length - 1)); };

/* Round a list to whole numbers that add up exactly to `total` (largest remainders get the spare units).
   The bridge is shown in whole minutes, and a bridge whose bars do not add up to its gap is not a bridge. */
export function roundToSum(values, total) {
  const fl = values.map(Math.floor); let spare = total - sum(fl);
  const order = values.map((v, i) => [v - fl[i], i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
  const out = [...fl];
  for (let k = 0; spare > 0 && order.length; k = (k + 1) % order.length, spare--) out[order[k][1]]++;
  for (let k = order.length - 1; spare < 0 && order.length; k = (k - 1 + order.length) % order.length, spare++) out[order[k][1]]--;
  return out;
}

/* ---------- intervals ---------- */
export function union(list) {
  const s = list.filter(x => x[1] > x[0]).map(x => [x[0], x[1]]).sort((p, q) => p[0] - q[0]); const out = [];
  for (const x of s) { const l = out[out.length - 1]; if (l && x[0] <= l[1]) l[1] = Math.max(l[1], x[1]); else out.push(x); }
  return out;
}
const len = list => sum(list.map(x => x[1] - x[0]));
const clip = (list, a, b) => list.map(x => [Math.max(x[0], a), Math.min(x[1], b)]).filter(x => x[1] > x[0]);

/* ---------- from raw Health samples to one night ----------
   raw = { o: offset seconds of the export's clock, tz, src: { name: { as: [[t0, t1, stage]], aw: [[t0, t1]], ib: [[t0, t1]] } } }
   with times in epoch seconds. Returns a stored night, or { bedOnly: true } when nothing recorded sleep itself. */
export function buildNight(date, raw) {
  const mid = toMs(date) / 60000;
  const rel = t => Math.round((t + raw.o) / 60) - mid;
  const toRel = list => union(list.map(x => [rel(x[0]), rel(x[1])]));
  // one source per night, so a watch and an app recording the same sleep are never added together
  let best = null;
  for (const [name, s] of Object.entries(raw.src)) {
    if (!s.as.length) continue;
    const u = toRel(s.as), total = len(u), staged = s.as.some(x => x[2] > 0);
    if (!total) continue;
    const c = { name, s, u, total, staged };
    if (!best) best = c;
    else if (c.staged !== best.staged) { const st = c.staged ? c : best, un = c.staged ? best : c; best = st.total >= 0.5 * un.total ? st : un; }
    else if (c.total > best.total) best = c;
  }
  if (!best) return { bedOnly: true };
  // the main sleep: the cluster of asleep stretches with the most sleep in it
  const sessions = [];
  for (const x of best.u) { const l = sessions[sessions.length - 1]; if (l && x[0] - l[l.length - 1][1] <= SESSION_GAP) l.push(x); else sessions.push([x]); }
  const main = sessions.reduce((p, c) => len(c) > len(p) ? c : p);
  const on = main[0][0], off = main[main.length - 1][1], a = len(main);
  const night = { a, b: off - on, on, off, w: off - on - a, s: best.u, src: best.name };
  const naps = len(best.u) - a; if (naps > 0) night.n = naps;
  // time in bed: every source's "in bed" samples near the main sleep, merged with the sleep itself
  const ib = clip(toRel(Object.values(raw.src).flatMap(s => s.ib)), on - 180, off + 90).filter(x => x[1] > on - 180 && x[0] < off + 90);
  const near = ib.filter(x => x[1] >= on - 30 && x[0] <= off + 30);
  if (near.length) { const u = union([...ib, [on, off]]); night.b = len(u); night.m = 1; night.bs = u[0][0]; }
  if (best.staged) {
    const d = [0, 0, 0];
    const t0 = (on + mid) * 60 - raw.o, t1 = (off + mid) * 60 - raw.o;
    for (const x of best.s.as) if (x[2] > 0) d[x[2] - 1] += Math.max(0, Math.min(x[1], t1) - Math.max(x[0], t0)) / 60;
    night.d = d.map(Math.round);
  }
  if (raw.tz) night.z = raw.tz;
  return night;
}

/* ---------- the numbers ---------- */
/* Sleep Regularity Index (Phillips et al. 2017): the chance of being in the same state, asleep or awake, at two moments
   24 h apart, rescaled so 100 is the same sleep every day and 0 is random. Only pairs of consecutive days that both
   have data count. */
const bitmap = n => { const m = new Uint8Array(WIN1 - WIN0); for (const [a, b] of n.s) for (let i = Math.max(a, WIN0); i < Math.min(b, WIN1); i++) m[i - WIN0] = 1; return m; };
export function sri(nights, dates) {
  let same = 0, pairs = 0, prev = null, prevDate = null;
  for (const d of dates) {
    const n = nights[d]; if (!n) { prev = null; continue; }
    const m = bitmap(n);
    if (prev && diffDays(d, prevDate) === 1) { pairs++; for (let i = 0; i < m.length; i++) if (m[i] === prev[i]) same++; }
    prev = m; prevDate = d;
  }
  return { pairs, value: pairs ? -100 + 200 * same / (pairs * (WIN1 - WIN0)) : null };
}

export function summary(nights, dates, target) {
  const ds = dates.filter(d => nights[d]), ns = ds.map(d => nights[d]);
  if (!ns.length) return { n: 0, of: dates.length };
  const a = mean(ns.map(n => n.a)), b = mean(ns.map(n => n.b));
  return {
    n: ns.length, of: dates.length, a, b, conv: sum(ns.map(n => n.a)) / sum(ns.map(n => n.b)),
    measured: ns.filter(n => n.m).length, hit: ns.filter(n => n.a >= target).length,
    onSd: sd(ns.map(n => n.on)), onMin: Math.min(...ns.map(n => n.on)), onMax: Math.max(...ns.map(n => n.on)), onMed: median(ns.map(n => n.on)),
    offSd: sd(ns.map(n => n.off)), offMed: median(ns.map(n => n.off)),
    sri: sri(nights, dates)
  };
}

/* ---------- the bridge: target → actual, split by cause ----------
   Every night first carries the ordinary-night shortfall (target − ordinary night). What a tagged night lost beyond
   an ordinary night is split equally between its causes; an untagged night's difference goes to "untagged"; a night
   tagged "nothing special" keeps its own difference in the ordinary-night bar. Until three nights are tagged
   "nothing special" there is no ordinary-night level, so causes carry the whole shortfall of their nights.
   Whatever the tags, the bars add up to target − average: each night's shortfall is handed out exactly once. */
export const isClean = t => !!t && Array.isArray(t.t) && t.t.includes(CLEAN);
export const causesOf = t => (t && Array.isArray(t.t) ? t.t.filter(c => CAUSES.includes(c)) : []);
export function ordinaryLevel(nights, tags, end) {
  const xs = range(end, ORDINARY_DAYS).filter(d => nights[d] && isClean(tags[d])).map(d => nights[d].a);
  return { n: xs.length, value: xs.length >= ORDINARY_MIN ? mean(xs) : null };
}
export function bridge(nights, tags, dates, target) {
  const ds = dates.filter(d => nights[d]); const N = ds.length;
  if (!N) return null;
  const ord = ordinaryLevel(nights, tags, dates[dates.length - 1]);
  const R = ord.value ?? target;
  const rows = { ordinary: { v: 0, nights: [] }, untagged: { v: 0, nights: [] } };
  for (const c of CAUSES) rows[c] = { v: 0, nights: [] };
  const put = (k, d, v) => { rows[k].v += v / N; rows[k].nights.push({ d, v }); };
  for (const d of ds) {
    const a = nights[d].a, t = tags[d], cs = causesOf(t);
    if (isClean(t) && !cs.length) { put('ordinary', d, target - a); continue; }
    rows.ordinary.v += (target - R) / N;
    if (cs.length) for (const c of cs) put(c, d, (R - a) / cs.length);
    else put('untagged', d, R - a);
  }
  const avg = mean(ds.map(d => nights[d].a)), gap = target - avg;
  const keys = ['ordinary', ...CAUSES, 'untagged'].filter(k => rows[k].nights.length || Math.abs(rows[k].v) > 1e-9);
  const gapMin = Math.round(gap), shown = roundToSum(keys.map(k => rows[k].v), gapMin);
  return {
    n: N, of: dates.length, target, avg, gap, gapMin, actualMin: target - gapMin, ordinary: ord,
    rows: keys.map((k, i) => ({ k, v: rows[k].v, min: shown[i], nights: rows[k].nights })),
    tagged: ds.filter(d => isClean(tags[d]) || causesOf(tags[d]).length).length
  };
}
/* The same gap split another way: time you were not in bed at all, and time in bed that was not sleep. */
export function bedBridge(nights, dates, target) {
  const ns = dates.filter(d => nights[d]).map(d => nights[d]); if (!ns.length) return null;
  const a = mean(ns.map(n => n.a)), b = mean(ns.map(n => n.b));
  const gapMin = Math.round(target - a), [notInBed, awake] = roundToSum([target - b, b - a], gapMin);
  return { target, gapMin, actualMin: target - gapMin, rows: [{ k: 'notInBed', v: target - b, min: notInBed }, { k: 'awakeInBed', v: b - a, min: awake }] };
}

/* ---------- the plan: a wake time as the anchor, bedtime worked out backwards ----------
   plan = { wake, gain, conv, wind, start, base }. `base` is frozen when the plan starts, so progress is measured
   against the same starting point all the way through. */
export function baselineOf(ns, end) {
  if (!ns.length) return null;
  const meas = ns.filter(n => n.m);
  const useMeasured = meas.length >= ns.length / 2;   // most nights have "in bed" recorded: trust it
  const b = useMeasured ? mean(meas.map(n => n.b)) : mean(ns.map(n => n.off - n.on)) + LATENCY;
  const bed = useMeasured ? median(meas.map(n => n.bs)) : median(ns.map(n => n.on)) - LATENCY;
  return { n: ns.length, a: Math.round(mean(ns.map(n => n.a))), b: Math.round(b), bed: Math.round(bed), wake: Math.round(median(ns.map(n => n.off))), wakeAvg: Math.round(mean(ns.map(n => n.off))), measured: useMeasured ? 1 : 0, end };
}
export const baseline = (nights, end, days = BASE_DAYS) => baselineOf(range(end, days).filter(d => nights[d]).map(d => nights[d]), end);

/* Three kinds of night, named after the day you wake up on: a workday, a weekend day, or time off (date ranges the
   person enters: holidays, leave, public holidays). Each has its own wake time, its own starting point and its own
   bedtime; nothing in the plan assumes the week is uniform. */
export const TYPES = ['work', 'weekend', 'off'];
const weekendDay = d => { const w = new Date(toMs(d)).getUTCDay(); return w === 0 || w === 6; };
export const dayType = (d, off = []) => (off || []).some(r => d >= r.a && d <= r.b) ? 'off' : weekendDay(d) ? 'weekend' : 'work';
export const tonightWake = (now = new Date()) => localDate(new Date(now.getTime() + 9 * 36e5));   // from 15:00 on, "tonight" ends tomorrow
export const OFF_DAYS = 180, TYPE_MIN = 3;
/* A starting point per kind of night. With fewer than 3 nights of a kind, it is borrowed (time off ← weekend ← workday ← all) and says so. */
export function baselineBy(nights, end, off = []) {
  const of = (ty, days) => { const ns = range(end, days).filter(d => nights[d] && dayType(d, off) === ty).map(d => nights[d]); return ns.length >= TYPE_MIN ? baselineOf(ns, end) : null; };
  const all = baseline(nights, end) || baselineOf(Object.keys(nights).sort().slice(-BASE_DAYS).map(d => nights[d]), end);
  const out = { work: of('work', BASE_DAYS), weekend: of('weekend', BASE_DAYS), off: of('off', OFF_DAYS) };
  if (!out.work) out.work = { ...all, from: 'all' };
  if (!out.weekend) out.weekend = { ...out.work, from: out.work.from || 'work' };
  if (!out.off) out.off = { ...out.weekend, from: out.weekend.from || 'weekend' };
  return out;
}
export function planTimes(base, plan) {
  const extraBed = Math.round(plan.gain / plan.conv);          // extra time in bed needed for the planned extra sleep
  const bed = plan.wake - (base.b + extraBed);                 // lights out, counted back from the wake time
  const shift = base.bed - bed;                                // how much earlier than today's habit
  const steps = shift > 0 ? Math.ceil(shift / STEP_MIN) : 0;
  return { extraBed, bed, wind: bed - plan.wind, shift, steps, goal: base.a + plan.gain, days: steps * STEP_NIGHTS };
}
export function tonight(base, plan, today) {
  const t = planTimes(base, plan);
  if (!plan.start || t.steps === 0) return { ...t, bedTonight: t.bed, windTonight: t.wind, step: t.steps, final: true };
  const step = Math.min(t.steps, 1 + Math.floor(Math.max(0, diffDays(today, plan.start)) / STEP_NIGHTS));
  const bedTonight = Math.max(t.bed, base.bed - STEP_MIN * step);
  return { ...t, bedTonight, windTonight: bedTonight - plan.wind, step, final: bedTonight === t.bed };
}
/* Nights since the plan started against the frozen starting point, and how much of the extra time in bed became sleep. */
export function progress(nights, plan, base) {
  if (!plan.start) return null;
  const ns = Object.keys(nights).filter(d => d > plan.start).sort().map(d => nights[d]); if (!ns.length) return { n: 0 };
  const a = mean(ns.map(n => n.a)), measNow = ns.filter(n => n.m);
  const b = base.measured ? (measNow.length ? mean(measNow.map(n => n.b)) : null) : mean(ns.map(n => n.off - n.on)) + LATENCY;
  const dA = a - base.a, dB = b == null ? null : b - base.b;
  const last7 = ns.slice(-7), a7 = mean(last7.map(n => n.a));
  return { n: ns.length, a, dA, dB, conv: ns.length >= 5 && dB != null && dB >= 15 ? dA / dB : null, a7, done: last7.length >= 7 && a7 >= base.a + plan.gain };
}

/* The plan for each kind of night. plan.wake = { work, weekend, off } (minutes); the extra sleep asked of a kind of
   night stops at the target, so a weekend already close to it is not pushed further. */
export function planBy(bases, plan, target, today) {
  const out = {};
  for (const ty of TYPES) {
    const base = bases[ty], gain = Math.max(0, Math.min(plan.gain, target - base.a)), wake = plan.wake[ty] ?? Math.round(base.wake / 5) * 5;
    out[ty] = { ...tonight(base, { ...plan, wake, gain }, today), wake, gain, base };
  }
  const mid = x => (x.bed + x.wake) / 2;
  out.week = { goal: Math.round((5 * out.work.goal + 2 * out.weekend.goal) / 7), base: Math.round((5 * bases.work.a + 2 * bases.weekend.a) / 7), gap: Math.round(mid(out.weekend) - mid(out.work)) };
  return out;
}
export function progressBy(nights, plan, bases, off, target) {
  if (!plan.start) return null;
  const ds = Object.keys(nights).filter(d => d > plan.start).sort(); if (!ds.length) return { n: 0 };
  const goalOf = ty => bases[ty].a + Math.max(0, Math.min(plan.gain, target - bases[ty].a));
  const rows = ds.map(d => { const ty = dayType(d, off), n = nights[d]; return { ty, a: n.a, dA: n.a - bases[ty].a, dB: (bases[ty].measured ? (n.m ? n.b : null) : n.off - n.on + LATENCY), baseB: bases[ty].b, toGoal: n.a - goalOf(ty) }; });
  const by = {}; for (const ty of TYPES) { const r = rows.filter(x => x.ty === ty); if (r.length) by[ty] = { n: r.length, a: mean(r.map(x => x.a)), dA: mean(r.map(x => x.dA)) }; }
  const withB = rows.filter(x => x.dB != null), dB = withB.length ? mean(withB.map(x => x.dB - x.baseB)) : null, dA = mean(rows.map(x => x.dA)), last7 = rows.slice(-7);
  return { n: rows.length, by, dA, dB, conv: rows.length >= 5 && dB != null && dB >= 15 ? dA / dB : null, done: last7.length >= 7 && mean(last7.map(x => x.toGoal)) >= 0 };
}

/* ---------- example nights (neutral, invented; the repository is public) ---------- */
export function demo(today, count = 63) {
  let x = 20261113; const rnd = () => { x |= 0; x = x + 0x6D2B79F5 | 0; let t = Math.imul(x ^ x >>> 15, 1 | x); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.2;
  const nights = {}, tags = {};
  range(today, count).forEach((d, i) => {
    if (rnd() < 0.05 && i < count - 8) return;                 // the odd night without a watch
    const dow = new Date(toMs(d)).getUTCDay(), weekend = dow === 0 || dow === 6, recent = i >= count - 21;
    const cs = [];
    if (recent) { if (rnd() < 0.24) cs.push('screen'); if (rnd() < 0.2) cs.push('winddown'); if (weekend && rnd() < 0.6) cs.push('social'); if (!weekend && rnd() < 0.14) cs.push('training'); if (rnd() < 0.05) cs.push('travel'); }
    else { if (rnd() < 0.2) cs.push('screen'); if (weekend && rnd() < 0.5) cs.push('social'); }
    const late = (cs.includes('screen') ? 38 : 0) + (cs.includes('winddown') ? 30 : 0) + (cs.includes('social') ? 85 : 0) + (cs.includes('training') ? 40 : 0) + (cs.includes('travel') ? 55 : 0) + (weekend && !cs.length ? 25 : 0);
    const bs = Math.round(-25 + late + gauss() * 14), lat = Math.round(9 + rnd() * 14), on = bs + lat;
    const off = Math.round((weekend ? 440 : 405) + (cs.includes('social') ? 12 : 0) + gauss() * (weekend ? 22 : 9));
    const cuts = 2 + Math.floor(rnd() * 3), s = []; let t = on, w = 0;
    for (let k = 0; k < cuts; k++) { const stop = Math.round(on + (off - on) * (k + 1) / (cuts + 1) + gauss() * 15), g = Math.round(4 + rnd() * 9); if (stop - t < 20) continue; s.push([t, stop]); t = stop + g; w += g; }
    s.push([t, off]);
    const a = off - on - w, deep = Math.round(a * (0.13 + rnd() * 0.05)), rem = Math.round(a * (0.2 + rnd() * 0.05));
    nights[d] = { a, b: off + Math.round(3 + rnd() * 9) - bs, on, off, w, s, m: 1, bs, d: [a - deep - rem, deep, rem], src: 'Example watch' };
    if (recent) tags[d] = { t: cs.length ? cs : [CLEAN] };
  });
  return { nights, tags };
}

/* ---------- the guide: what the numbers suggest ----------
   Working ranges of sleep by training load, in minutes: [bottom, top, aim]. They are a starting point, not a measured
   need: adults are advised 7–9 h; elite athletes report needing 8.3 h (SD 0.9) to feel rested (Sargent 2021) and the
   2021 consensus on athlete sleep asks for an individual figure rather than one rule (Walsh 2021). */
export const ACTIVITY = { light: [420, 540, 465], regular: [450, 540, 495], heavy: [480, 570, 525] };
export const SRI_REF = [74, 81, 86];            // UK Biobank quartiles (Windred 2024)
export function timing(nights, dates, off = []) {
  const isFree = d => dayType(d, off) !== 'work';   // woke up on a weekend day or during time off
  const ds = dates.filter(d => nights[d]); if (!ds.length) return null;
  const mid = d => (nights[d].on + nights[d].off) / 2;
  const work = ds.filter(d => !isFree(d)), free = ds.filter(isFree);
  const mw = median(work.map(mid)), mf = median(free.map(mid));
  return { n: ds.length, onMed: median(ds.map(d => nights[d].on)), offMed: median(ds.map(d => nights[d].off)), mid: median(ds.map(mid)),
    midWork: mw, midFree: mf, jetlag: work.length >= 3 && free.length >= 2 ? mf - mw : null,
    late: ds.filter(d => nights[d].on >= 0).length };
}
/* Findings ranked by how much they call for action: level 2 = change this first, 1 = keep an eye on it, 0 = fine. */
export function advice(nights, tags, dates, target, activity = 'regular', off = []) {
  const s = summary(nights, dates, target); if (!s.n) return null;
  const tm = timing(nights, dates, off), [low, high, aim] = ACTIVITY[activity] || ACTIVITY.regular, items = [];
  const a = Math.round(s.a);
  items.push({ k: 'volume', level: a < low ? 2 : a < aim ? 1 : 0, short: low - a, toAim: aim - a });
  if (target > high || target < low) items.push({ k: 'target', level: 1, over: target > high });
  items.push({ k: 'onset', level: tm.onMed >= 0 ? (a < low ? 2 : 1) : 0, late: tm.late });
  if (tm.jetlag != null) items.push({ k: 'jetlag', level: Math.abs(tm.jetlag) >= 60 ? 2 : Math.abs(tm.jetlag) >= 30 ? 1 : 0, v: Math.round(tm.jetlag) });
  if (s.sri.pairs >= 4) items.push({ k: 'sri', level: s.sri.value < SRI_REF[0] ? 2 : s.sri.value < SRI_REF[1] ? 1 : 0, v: Math.round(s.sri.value) });
  items.push({ k: s.conv < 0.85 ? 'convLow' : 'convHigh', level: s.conv < 0.85 ? 1 : 0, v: Math.round(s.conv * 100) });
  const b = bridge(nights, tags, dates, target), top = b.rows.filter(r => CAUSES.includes(r.k) && r.min > 0).sort((x, y) => y.min - x.min)[0];
  if (top) items.push({ k: 'cause', level: top.min >= 5 ? 1 : 0, cause: top.k, perNight: top.min, perWeek: top.min * 7, nights: top.nights.length });
  items.sort((x, y) => y.level - x.level);
  return { s, tm, low, high, aim, a, items };
}
