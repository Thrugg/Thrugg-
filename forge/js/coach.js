/* Forge — coach. Pure functions (no DOM): weekly review, weekly quests, 12-week seasons, closest level-ups,
   duel codes and the healthspan bands. Everything is derived from the logs, so nothing extra is stored:
   a past week's quests can always be recomputed. Tested in test/coach.test.mjs. */
import { dayNum, addDays, mean, clamp } from './calc.js';
import { DOMAINS } from './data.js';

/* ---------- weeks and seasons ---------- */
export const weekStart = d => addDays(d, -((dayNum(d) + 3) % 7)); // Monday (1 Jan 1970 was a Thursday)
export const SEASON_WEEKS = 12;

/* The three standing quests of a week. They reward showing up, never a body number:
   weigh — 4 morning weigh-ins; fuel — calories logged on 6 days; move — step goal on 5 days.
   ctx: { stepsGoal, noFood } (noFood drops the calorie quest: calm mode or an eating-disorder flag). */
export function coreQuests(L, ctx, ws, upTo) {
  const days = []; for (let i = 0; i < 7; i++) { const d = addDays(ws, i); if (!upTo || d <= upTo) days.push(d); }
  const count = fn => days.filter(d => L[d] && fn(L[d])).length;
  const kc = Object.entries(L).filter(([d, v]) => d >= addDays(ws, -28) && d <= addDays(ws, 6) && v.kcal > 0).map(([, v]) => v.kcal).sort((a, b) => a - b);
  const med = kc.length ? kc[kc.length >> 1] : 0;
  const q = [{ id: 'weigh', n: count(v => v.w > 0), goal: 4 }];
  if (!ctx.noFood) q.push({ id: 'fuel', n: count(v => v.kcal > 0 && v.kcal >= 0.5 * med), goal: 6 });
  q.push({ id: 'move', n: count(v => v.steps >= ctx.stepsGoal), goal: 5, steps: ctx.stepsGoal });
  for (const x of q) x.done = x.n >= x.goal;
  return q;
}
export const stepsGoal = avg => Math.max(4000, Math.round(0.9 * (avg || 8000) / 500) * 500);

/* Season = 12 weeks from the Monday of the week Forge was first opened. weeks[i].score = quests completed (null = future). */
export function season(created, td, L, ctx) {
  const origin = weekStart(created || td), wk = Math.max(0, Math.floor((dayNum(td) - dayNum(origin)) / 7));
  const n = Math.floor(wk / SEASON_WEEKS) + 1, week = wk % SEASON_WEEKS + 1, start = addDays(origin, (n - 1) * SEASON_WEEKS * 7);
  const weeks = [];
  for (let i = 0; i < SEASON_WEEKS; i++) {
    const ws = addDays(start, 7 * i);
    if (ws > td) { weeks.push({ ws, score: null, of: 0 }); continue; }
    const q = coreQuests(L, ctx, ws, td); weeks.push({ ws, score: q.filter(x => x.done).length, of: q.length, current: i === week - 1 });
  }
  return { n, week, start, end: addDays(start, SEASON_WEEKS * 7 - 1), weeks, prevStart: n > 1 ? addDays(start, -SEASON_WEEKS * 7) : null };
}
/* What a season added up to. series: trend weights; prs: all records with their evaluation { pr, r }. */
export function seasonRecap(start, end, { L, series, prs, ctx, td }) {
  const inS = d => d >= start && d <= end;
  const tr = series.filter(s => inS(s.date));
  const weeks = []; for (let i = 0; i < SEASON_WEEKS; i++) { const ws = addDays(start, 7 * i); if (ws <= td) weeks.push(coreQuests(L, ctx, ws, td < end ? td : end)); }
  const logged = Object.keys(L).filter(inS);
  const mine = prs.filter(x => inS(x.pr.date || ''));
  return {
    weightChange: tr.length > 1 ? tr[tr.length - 1].trend - tr[0].trend : null,
    daysLogged: logged.length, weighIns: logged.filter(d => L[d].w > 0).length,
    quests: weeks.reduce((s, q) => s + q.filter(x => x.done).length, 0), questsOf: weeks.reduce((s, q) => s + q.length, 0),
    records: mine.length, events: new Set(mine.map(x => x.pr.event)).size,
    topTier: mine.reduce((m, x) => x.r.rankable ? Math.max(m, x.r.tier) : m, -1)
  };
}

/* ---------- weekly review ---------- */
/* The last 7 days against the plan. Returns numbers plus one win and one adjustment (keys for the interface text).
   ctx: { td, series, plan: { kcal, weeklyKg, protein } | null, mode, stepsAvg, kg, noFood } */
export function weeklyReview(L, ctx) {
  const td = ctx.td, from = addDays(td, -6), days = []; for (let i = 0; i < 7; i++) days.push(addDays(from, i));
  const rows = days.map(d => L[d] || {});
  const ks = rows.map(r => r.kcal).filter(k => k > 0), med = [...ks].sort((a, b) => a - b)[ks.length >> 1] || 0, full = ks.filter(k => k >= 0.5 * med);
  const st = rows.map(r => r.steps).filter(x => x > 0), ps = rows.filter(r => r.kcal >= 0.5 * med && r.p > 0).map(r => r.p);
  const tNow = ctx.series[ctx.series.length - 1], tThen = [...ctx.series].reverse().find(s => s.date <= addDays(td, -7));
  const fresh = tNow && dayNum(td) - dayNum(tNow.date) <= 3;
  const out = {
    from, to: td, wN: rows.filter(r => r.w > 0).length, kN: full.length, sN: st.length,
    delta: fresh && tThen ? tNow.trend - tThen.trend : null, expected: ctx.plan ? ctx.plan.weeklyKg : null,
    intake: full.length ? mean(full) : null, target: ctx.plan ? ctx.plan.kcal : null,
    steps: st.length ? mean(st) : null, stepsAssumed: ctx.stepsAvg || null,
    protein: ps.length ? mean(ps) : null, proteinTarget: ctx.plan ? ctx.plan.protein : null
  };
  out.any = out.wN + out.kN + out.sN > 0;
  const e = out.expected, d = out.delta, tol = Math.max(0.15, 0.4 * Math.abs(e || 0));
  const onPace = d != null && e != null && Math.abs(d - e) <= tol;
  // one win, most meaningful first
  out.win = onPace ? 'onPace' : (!ctx.noFood && out.kN >= 6) ? 'logging' : (out.steps && out.stepsAssumed && out.steps >= out.stepsAssumed) ? 'steps'
    : out.wN >= 5 ? 'weighins' : (out.protein && out.proteinTarget && out.protein >= 0.9 * out.proteinTarget) ? 'protein' : out.any ? 'showedUp' : null;
  // one adjustment, most consequential first
  let adj = 'steady';
  if (!out.any) adj = 'start';
  else if (out.wN < 3) adj = 'weighMore';
  else if (!ctx.noFood && ctx.plan && out.kN < 5) adj = 'logMore';
  else if (ctx.mode === 'cut' && d != null && e != null && d < 1.6 * e - 0.15) adj = 'tooFast';
  else if (!ctx.noFood && out.intake != null && out.target != null && out.kN >= 5 && out.intake > out.target + 150) adj = 'overTarget';
  else if (!ctx.noFood && out.intake != null && out.target != null && out.kN >= 5 && ctx.mode === 'cut' && out.intake < out.target - 250) adj = 'underTarget';
  else if (out.steps != null && out.stepsAssumed && out.sN >= 4 && out.steps < 0.8 * out.stepsAssumed) adj = 'stepsLow';
  else if (out.steps != null && out.stepsAssumed && out.sN >= 4 && out.steps > 1.25 * out.stepsAssumed) adj = 'stepsHigh';
  else if ((ctx.mode === 'cut' || ctx.mode === 'bulk') && d != null && e != null && !onPace && Math.abs(d) < 0.5 * Math.abs(e)) adj = 'patience';
  out.adjust = adj;
  return out;
}

/* ---------- closest level-ups ("bosses") ---------- */
/* For every ranked record: the next target (the next FFA level for sprints, the next tier otherwise) and the
   improvement it takes, as a share of the current result. Closest first. */
export function bosses(best, n = 3) {
  const out = [];
  for (const [id, b] of Object.entries(best || {})) {
    const r = b.r; let target, label;
    if (r.nextLevel) { target = r.nextLevel.time; label = { level: r.nextLevel.name }; }
    else if (r.tier < 7 && r.next != null) { target = r.next; label = { tier: r.tier + 1 }; }
    else continue;
    const rel = Math.abs(target - r.value) / Math.max(1e-9, Math.abs(r.value));
    out.push({ id, value: r.value, target, rel, ...label, tierNow: r.tier });
  }
  return out.sort((a, b) => a.rel - b.rel).slice(0, n);
}

/* ---------- duel codes ---------- */
/* A duel code carries scores only (0–100, each already relative to the person's own sex and age group), a first name
   and nothing else: no weight, no body fat, no raw results. The owner shares it by hand; nothing is sent by Forge. */
const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
export const DUEL_PREFIX = 'FORGE-DUEL1:';
export function duelEncode({ name, variant, peak, balance, dom, gl, date }) {
  const r = v => v == null ? null : Math.round(v * 10) / 10, d = {};
  for (const k of DOMAINS) if (dom?.[k] != null) d[k] = r(dom[k]);
  return DUEL_PREFIX + b64e(JSON.stringify({ n: String(name || '').slice(0, 24), v: variant === 'f' ? 'f' : 'c', pk: r(peak), bl: r(balance), d, gl: r(gl), t: date }));
}
export function duelDecode(code) {
  const m = String(code || '').trim().match(/FORGE-DUEL1:([A-Za-z0-9_-]+)/); if (!m) return null;
  let x; try { x = JSON.parse(b64d(m[1])); } catch (e) { return null; }
  if (!x || typeof x !== 'object') return null;
  const sc = v => typeof v === 'number' && isFinite(v) ? clamp(v, 0, 100) : null, dom = {};
  for (const k of DOMAINS) { const v = sc(x.d?.[k]); if (v != null) dom[k] = v; }
  if (!Object.keys(dom).length) return null;
  return { name: String(x.n || '').replace(/[^\p{L}\p{N} .'’-]/gu, '').slice(0, 24) || '?', variant: x.v === 'f' ? 'f' : 'classic', peak: sc(x.pk), balance: sc(x.bl), dom,
    gl: typeof x.gl === 'number' && isFinite(x.gl) ? clamp(x.gl, 0, 200) : null, date: /^\d{4}-\d{2}-\d{2}$/.test(x.t || '') ? x.t : null };
}
/* Domain by domain: who leads, counted only where both have a score. */
export function duelScore(me, them) {
  const rows = DOMAINS.filter(k => me[k] != null && them[k] != null).map(k => ({ k, me: me[k], them: them[k], lead: Math.abs(me[k] - them[k]) < 1 ? 0 : Math.sign(me[k] - them[k]) }));
  return { rows, mine: rows.filter(r => r.lead > 0).length, theirs: rows.filter(r => r.lead < 0).length };
}

/* ---------- healthspan bands ---------- */
/* Fitness groups as in Mandsager 2018 (percentile of VO2max for age and sex): low < 25th, below average 25–49th,
   above average 50–74th, high 75–97.6th, elite ≥ 97.7th. */
export const vo2Band = p => p == null ? null : p < 0.25 ? 'low' : p < 0.5 ? 'below' : p < 0.75 ? 'above' : p < 0.977 ? 'high' : 'elite';
export const whtrBand = r => r == null ? null : r < 0.5 ? 'ok' : r < 0.6 ? 'mid' : 'high';
export const stanceBand = s => s == null ? null : s >= 10 ? 'ok' : 'low';
