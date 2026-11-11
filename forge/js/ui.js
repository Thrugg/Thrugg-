/* Forge — screens. Vanilla JS: each screen is a function of the derived model; inputs bind to state paths. */
import { S, save, set, upsert, remove, logDay, uid, storeImage, getPhoto, delPhoto, exportBackup, importBackup, reset, clearPhotos } from './store.js';
import * as C from './calc.js';
import { CATALOGUE, INTENSITIES, EVENTS, TIERS, TIER_P, DOMAINS, SOURCES, DATA_VERSION, HELPLINES } from './data.js';
const LEAN_KEY = 'lean';
import { t, setLang, getLang, nf, df } from './i18n.js';
import { line, radar, pctBar, stack } from './charts.js';
import { parseShortcut, readHealthFile, summarise } from './health.js';
import { analyse, editor, measure } from './photo.js';
import { parseRenphoCsv, mergeRenpho, mergeLogs, bodySource, renphoStats, dxaCalibration } from './renpho.js';
import { weekStart, coreQuests, stepsGoal, season, seasonRecap, weeklyReview, bosses, duelEncode, duelDecode, duelScore, vo2Band, whtrBand, stanceBand, SEASON_WEEKS } from './coach.js';
export const VERSION = '2026.11.1';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
let tab = 'today', previewMode = null, ob = null;
const ui = { photoUrls: {}, open: {}, rival: null };

/* ---------- units ---------- */
const imp = () => S.profile.units === 'imperial';
const kgShow = v => v == null ? null : imp() ? v * 2.20462 : v, kgRead = v => v == null || v === '' ? null : imp() ? +v / 2.20462 : +v, kgU = () => imp() ? 'lb' : 'kg';
const cmShow = v => v == null ? null : imp() ? v / 2.54 : v, cmRead = v => v == null || v === '' ? null : imp() ? +v * 2.54 : +v, cmU = () => imp() ? 'in' : 'cm';
const r1 = v => v == null ? '' : Math.round(v * 10) / 10;
export const fmtTime = s => { if (s == null || !isFinite(s)) return '–'; if (s < 60) return s.toFixed(s < 30 ? 2 : 1); if (s >= 3600) { const h = Math.floor(s / 3600), m = Math.floor((s - 3600 * h) / 60), r = Math.round(s - 3600 * h - 60 * m); return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`; } const m = Math.floor(s / 60), r = s - 60 * m; return s >= 600 ? `${m}:${String(Math.round(r)).padStart(2, '0')}` : `${m}:${r.toFixed(1).padStart(4, '0')}`; };
export const parseTime = str => { if (str == null || str === '') return null; const s = String(str).trim().replace(',', '.'); let m = s.match(/^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/); if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3]; m = s.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/); return m ? +m[1] * 60 + +m[2] : (isFinite(+s) ? +s : null); };

/* ---------- small builders ---------- */
const field = (label, input, hint) => `<label class="field"><span>${label}</span>${input}${hint ? `<small>${hint}</small>` : ''}</label>`;
const numIn = (bind, val, { conv, step = 'any', ph = '', unit } = {}) => `<div class="inp">${'<input type="number" inputmode="decimal" step="' + step + '" data-bind="' + bind + '"' + (conv ? ` data-conv="${conv}"` : '') + ` value="${val ?? ''}" placeholder="${ph}">`}${unit ? `<em>${unit}</em>` : ''}</div>`;
const selIn = (bind, val, opts, attrs = '') => `<select data-bind="${bind}" ${attrs}>${opts.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const chk = (bind, val, label) => `<label class="chk"><input type="checkbox" data-bind="${bind}"${val ? ' checked' : ''}><span>${label}</span></label>`;
const card = (title, body, cls = '') => `<section class="card ${cls}">${title ? `<h2>${title}</h2>` : ''}${body}</section>`;
const chip = (txt, cls = '') => `<span class="chip ${cls}">${esc(txt)}</span>`;
const how = (title, body, key = title) => `<details class="how" data-k="${esc(key)}"${ui.open[key] ? ' open' : ''}><summary>${title}</summary><div>${body}</div></details>`;
/* Progress as a bar of steel being heated: the colour at the tip runs from dull red to white-hot as it fills. */
const heat = frac => { const p = C.clamp(frac || 0, 0, 1) * 100; return `<div class="prog${p >= 90 ? ' hot' : ''}" role="img" aria-label="${Math.round(p)} %"><i style="width:${p}%;background-size:${p > 1 ? 10000 / p : 10000}% 100%"></i></div>`; };
const notches = (n, goal) => `<span class="notch" aria-hidden="true">${Array.from({ length: goal }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
const median = a => { const x = [...a].sort((p, q) => p - q); return x.length % 2 ? x[x.length >> 1] : (x[x.length / 2 - 1] + x[x.length / 2]) / 2; };
const signed = (v, d = 2) => (v > 0 ? '+' : v < 0 ? '−' : '') + nf(Math.abs(v), d);
const confChip = c => chip(`${t('common.confidence')}: ${t('common.conf.' + c)}`, 'c-' + c);
const tierName = i => { const ti = TIERS[i]; const k = S.profile.variant === 'f' && ti.f ? ti.f : ti.id; return t('tier.' + k); };
const tierBadge = i => `<span class="tier t${i}">${esc(tierName(i)[0])}</span>`;
const toast = msg => { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); };
const rnd = (v, s) => Math.round(v / s) * s;

/* ---------- derived model ---------- */
function navyOffset() {
  const pairs = [];
  for (const s of S.scans.filter(x => x.method === 'dxa' && x.bf)) for (const tp of S.tapes) if (Math.abs(C.dayNum(s.date) - C.dayNum(tp.date)) <= 14) { const nv = C.bfNavy(S.profile.sex, S.profile.cm, tp.neck, tp.waist, tp.hip); if (nv != null) pairs.push(s.bf - nv); }
  return pairs.length ? { v: 0.7 * C.mean(pairs), n: pairs.length } : null;
}
export function photoCal() {
  for (const ph of [...S.photos].filter(x => x.result?.raw).sort((a, b) => a.date < b.date ? 1 : -1)) {
    const tp = S.tapes.find(x => Math.abs(C.dayNum(x.date) - C.dayNum(ph.date)) <= 7);
    if (tp?.waist) return { waist: tp.waist / ph.result.raw.waist, neck: tp.neck ? tp.neck / ph.result.raw.neck : 1, hip: tp.hip ? tp.hip / ph.result.raw.hip : 1, date: tp.date };
  }
  return null;
}
function bodyFat(kg, age, L) {
  const p = S.profile, td = C.today(), items = [], stale = [];
  const within = (d, n) => d && C.dayNum(td) - C.dayNum(d) <= n;
  const scans = [...S.scans].filter(s => s.bf).sort((a, b) => a.date < b.date ? 1 : -1);
  scans.slice(0, 4).forEach((s, i) => (i === 0 && within(s.date, 30) ? items : stale).push({ method: s.method, value: s.bf, sd: C.BF_SD[s.method] || 4.5, date: s.date }));
  const biaAll = Object.entries(L).filter(([d, v]) => v.bf > 0 && within(d, 30)).sort();
  if (biaAll.length) { const lastD = biaAll[biaAll.length - 1][0], wk = biaAll.filter(([d]) => C.dayNum(lastD) - C.dayNum(d) < 7); const isR = L[lastD]._s?.bf === 'renpho', cal = isR ? dxaCalibration(S.renpho.rows, S.scans, 7, td) : null;
    items.push({ method: 'bia', value: median(wk.map(([, v]) => v.bf)) + (cal ? cal.offset : 0), sd: cal ? cal.sd : C.BF_SD.bia, date: lastD, n: wk.length, renpho: isR, cal }); }
  const tape = [...S.tapes].sort((a, b) => a.date < b.date ? 1 : -1)[0];
  if (tape && p.cm) {
    const off = navyOffset(), arr = within(tape.date, 30) ? items : stale;
    const nv = C.bfNavy(p.sex, p.cm, tape.neck, tape.waist, tape.hip), rf = C.bfRFM(p.sex, p.cm, tape.waist);
    if (nv != null) arr.push({ method: 'navy', value: nv + (off?.v || 0), sd: off ? 3.0 : C.BF_SD.navy, date: tape.date, cal: !!off });
    if (rf != null) arr.push({ method: 'rfm', value: rf, sd: C.BF_SD.rfm, date: tape.date });
  }
  const ph = [...S.photos].filter(x => x.result && !x.result.cropped).sort((a, b) => a.date < b.date ? 1 : -1)[0];
  if (ph) { const arr = within(ph.date, 30) ? items : stale; const sd = ph.result.calibrated ? 4.2 : C.BF_SD.navy_photo; if (ph.result.navy) arr.push({ method: 'navy_photo', value: ph.result.navy, sd, date: ph.date }); if (ph.result.rfm) arr.push({ method: 'rfm_photo', value: ph.result.rfm, sd, date: ph.date }); }
  if (p.bfSelf && within(p.bfSelfDate, 60)) items.push({ method: 'visual', value: +p.bfSelf, sd: C.BF_SD.visual, date: p.bfSelfDate });
  let usable = items.length > 0;
  if (!items.length && kg && p.cm && p.sex) { const tr = (S.activity.years || 0) >= 1; items.push({ method: 'deurenberg', value: C.bfDeurenberg(p.sex, C.bmi(kg, p.cm), age), sd: tr ? C.BF_SD.deurenberg_trained : C.BF_SD.deurenberg, date: td, fallback: true }); }
  return { ens: C.bfEnsemble(items), usable, stale };
}
export function model(modeOverride) {
  const p = S.profile, a = S.activity, age = C.ageAt(p.dob) ?? 30;
  const src = bodySource(S), L = mergeLogs(S.logs, S.renpho, src);
  const series = C.trendSeries(Object.entries(L).filter(([, v]) => v.w > 0).map(([date, v]) => ({ date, w: v.w })));
  const kg = series.length ? series[series.length - 1].trend : null;
  const bfx = bodyFat(kg, age, L), bf = bfx.usable ? bfx.ens?.value ?? null : null;
  const ffm = bf != null && kg ? kg * (1 - bf / 100) : null, fmKg = bf != null && kg ? kg * bf / 100 : (kg ? kg * (p.sex === 'm' ? 0.2 : 0.3) : null);
  const ok = !!(p.sex && p.cm && kg && p.dob);
  const blockDeficit = !!(S.safety.under18 || S.safety.preg || S.safety.ed || S.safety.med);
  const out = { p, a, age, series, kg, bfx, bf, ffm, fmKg, ok, blockDeficit, L, src };
  out.bmiV = kg && p.cm ? C.bmi(kg, p.cm) : null;
  if (ok) {
    const pred = C.predictTdee({ sex: p.sex, kg, cm: p.cm, age, ffm, bfSd: bfx.usable ? bfx.ens?.sd : null, trainingYears: a.years, stepsAvg: a.stepsAvg, stepsIncludeWorkouts: a.stepsInc, strideCm: a.strideCm, walkSpeed: a.walkSpeed, flightsAvg: a.flights, occupation: a.occupation, sleepH: a.sleepH, workouts: a.workouts });
    const obs = C.adaptiveTdee(L, { fmKg, trained: pred.trained, phaseStart: S.plan.applied });
    const tdee = C.blend(pred.tdee, pred.sd, obs);
    const rec = C.recommendMode({ sex: p.sex, bf, ffmiN: ffm ? C.ffmiNorm(ffm, p.cm) : null, trainingYears: a.years, bmiV: out.bmiV, blockDeficit });
    const mode = modeOverride || S.plan.mode || rec.mode;
    const plan = C.makePlan({ mode, ratePct: S.plan.ratePct, tdee: tdee.value, kg, cm: p.cm, ffm, fmKg, sex: p.sex, trained: pred.trained, exerciseDay: pred.exercise + pred.epoc, rmr: pred.rmr.value, fatPct: S.plan.fatPct, meals: S.plan.meals, trainingYears: a.years, blockDeficit, customKcal: S.plan.customKcal, slow: rec.slow && mode === 'bulk', bfSd: bfx.usable ? bfx.ens?.sd : null });
    Object.assign(out, { pred, obs, tdee, rec, mode, plan });
  }
  out.leanP = bf != null && !S.safety.ed && !S.safety.under18 && p.sex ? 1 - C.pctFromAnchors(bf, C.bfAnchors(p.sex, age).A) : null;
  out.who = { sex: p.sex || 'm', kg: kg || (p.sex === 'f' ? 62 : 80), age };
  out.ar = p.sex ? C.arena(S.prs, out.who, out.leanP) : null;
  out.noFood = !!(S.safety.ed || p.calm); // calm mode: no calorie numbers on Today, no calorie quest
  out.cctx = { stepsGoal: stepsGoal(a.stepsAvg), noFood: out.noFood };
  return out;
}

/* ---------- shared pieces ---------- */
function workoutsEditor() {
  const types = Object.entries(CATALOGUE).map(([id, c]) => [id, c[getLang()]]);
  const ws = S.activity.workouts;
  return `<div class="wlist">${ws.map((w, i) => {
    const c = CATALOGUE[w.type] || CATALOGUE.other, b = `activity.workouts.${i}.`;
    const extra = c.pace ? field(t('fuel.pace'), numIn(b + 'paceKmh', w.paceKmh, { ph: '10' })) : c.watts ? field(t('fuel.watts'), numIn(b + 'watts', w.watts, { ph: '150' })) : '';
    const lbl = c.lift ? 'fuel.intS.' : 'fuel.int.';
    const hint = w.src === 'health' ? `<p class="xs muted">${t('fuel.fromHealthNote')}${w.watchKcal ? ' · ' + t('fuel.watchSession', { k: nf(w.watchKcal) }) : ''}${w.spm != null ? ' · ' + t('fuel.spm', { s: nf(w.spm) }) : ''}</p>` : '';
    return `<div class="wrow">${field(t('fuel.type'), selIn(b + 'type', w.type, types))}<div class="g3">${field(t('fuel.minutes'), numIn(b + 'minutes', w.minutes, { step: 5 }))}${field(t('fuel.per'), numIn(b + 'perWeek', w.perWeek, { step: 0.5 }))}${extra}</div>${field(t('fuel.intensity'), selIn(b + 'intensity', w.intensity, INTENSITIES.map(k => [k, t(lbl + k)])))}${hint}<button class="lnk danger" data-act="wdel" data-i="${i}">${t('common.del')}</button></div>`;
  }).join('')}</div><button class="btn ghost" data-act="wadd">+ ${t('ob.addWorkout')}</button>`;
}
const kcalBand = tdee => `${nf(rnd(tdee.value - tdee.sd, 50))}–${nf(rnd(tdee.value + tdee.sd, 50))}`;

/* ---------- TODAY ---------- */
const lastOf = list => [...list].sort((a, b) => a.date < b.date ? 1 : -1)[0];
const daysSince = d => d ? C.dayNum(C.today()) - C.dayNum(d) : Infinity;
const tipOff = k => { try { return localStorage.getItem('forge.tip.' + k) === '1'; } catch (e) { return false; } };
function installTip() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
  if (!ios || standalone || tipOff('install')) return '';
  return `<section class="card note"><h2>${t('today.installT')}</h2><p>${t('today.install')}</p><button class="btn ghost sm" data-act="tipoff" data-k="install">${t('common.gotIt')}</button></section>`;
}
function seasonStrip(se) {
  return `<button class="season" data-act="season"><span>${t('season.label', { n: se.n, w: se.week, m: SEASON_WEEKS })}</span><span class="pips" aria-hidden="true">${se.weeks.map(w => `<i class="${w.score == null ? 'fut' : 's' + Math.round(3 * w.score / (w.of || 3))}${w.current ? ' cur' : ''}"></i>`).join('')}</span></button>`;
}
function sideQuest(M, td) {
  const best = M.ar?.best || {}, bs = bosses(best, 1);
  if (bs.length && bs[0].rel <= 0.06) { const b = bs[0]; return { act: 'event', attrs: `data-id="${b.id}"`, text: t('quest.boss', { ev: t('arena.ev.' + b.id), v: fmtVal(b.id, b.target), to: b.level ? 'FFA ' + b.level : tierName(b.tier)[0] }) }; }
  const old = Object.values(best).filter(b => daysSince(b.pr.date) > 365).sort((x, y) => x.pr.date < y.pr.date ? -1 : 1)[0];
  if (old) return { act: 'event', attrs: `data-id="${old.pr.event}"`, text: t('quest.retest', { ev: t('arena.ev.' + old.pr.event), d: df(old.pr.date, { month: 'short', year: 'numeric' }) }) };
  if (daysSince(lastOf(S.tapes)?.date) > 7) return { act: 'tape', attrs: '', text: t('quest.tape') };
  if (daysSince(lastOf(S.vitals)?.date) > 90) return { act: 'vitals', attrs: '', text: t('quest.vitals') };
  if (daysSince(lastOf(S.photos)?.date) > 28) return { act: 'tab', attrs: 'data-tab="physique"', text: t('quest.photo') };
  return null;
}
function questCard(M, td) {
  const ws = weekStart(td), q = coreQuests(M.L, M.cctx, ws, td), left = 7 - (C.dayNum(td) - C.dayNum(ws));
  let h = `<ul class="quests">${q.map(x => `<li class="${x.done ? 'done' : ''}"><div><b>${t('quest.' + x.id, { n: nf(x.steps) })}</b><small>${x.done ? t('quest.done') : t('quest.prog', { n: Math.min(x.n, x.goal), g: x.goal })}</small></div>${notches(x.n, x.goal)}</li>`).join('')}</ul>`;
  const side = sideQuest(M, td);
  if (side) h += `<div class="side" data-act="${side.act}" ${side.attrs}><small>${t('quest.side')}</small><b>${side.text}</b></div>`;
  return card(t('quest.title'), `<p class="muted xs">${t(left === 1 ? 'quest.lead1' : 'quest.lead', { d: left })}</p>` + h, 'questc');
}
function reviewCard(M, td) {
  const R = weeklyReview(M.L, { td, series: M.series, plan: S.plan.mode && M.plan ? M.plan : null, mode: S.plan.mode ? M.mode : null, stepsAvg: S.activity.stepsAvg, noFood: M.noFood });
  if (!R.any) return '';
  const kgS = v => `${signed(kgShow(v))} ${kgU()}`, tiles = [], dm = { day: 'numeric', month: 'short' };
  if (R.delta != null) tiles.push([t('review.trend'), `${signed(kgShow(R.delta))}<i> ${kgU()}</i>`, R.expected != null && Math.abs(R.expected) > 0.01 ? t('review.plan', { v: kgS(R.expected) }) : t('review.noPlan')]);
  if (!M.noFood && R.intake != null) tiles.push([t('review.intake'), nf(rnd(R.intake, 10)), R.target ? t('review.target', { v: nf(rnd(R.target, 10)), n: R.kN }) : t('review.days', { n: R.kN })]);
  if (R.steps != null) tiles.push([t('review.steps'), nf(rnd(R.steps, 100)), t('review.assumed', { v: nf(R.stepsAssumed) })]);
  const P = M.pred, dk = P && R.steps != null && R.stepsAssumed ? Math.abs(R.steps - R.stepsAssumed) * C.strideM(S.profile.sex, S.profile.cm, S.activity.strideCm) / 1000 * M.kg * P.kcalPerKgKm / 0.9 : 0;
  const vars = { s: nf(rnd(R.steps || 0, 100)), a: nf(R.stepsAssumed || 0), k: nf(rnd(dk, 10)), d: R.delta != null ? kgS(R.delta) : '', e: R.expected != null ? kgS(R.expected) : '', i: nf(rnd(R.intake || 0, 10)), tg: nf(rnd(R.target || 0, 10)) };
  const fix = (R.adjust === 'stepsLow' || R.adjust === 'stepsHigh') ? `<button class="btn ghost sm" data-act="usesteps" data-v="${Math.round(R.steps / 100) * 100}">${t('review.useSteps', { s: vars.s })}</button>` : '';
  return card(t('review.title'), `<p class="muted xs">${df(R.from, dm)} – ${df(R.to, dm)}</p>${tiles.length ? `<div class="tiles">${tiles.map(([l, v, sub]) => `<div><span>${l}</span><b>${v}</b><small>${sub}</small></div>`).join('')}</div>` : ''}${R.win ? `<p class="rv win"><b>${t('review.winL')}</b> ${t('review.win.' + R.win, vars)}</p>` : ''}<p class="rv adj"><b>${t('review.adjL')}</b> ${t('review.adj.' + R.adjust, vars)}</p>${fix}`);
}
function screenToday(M) {
  const p = S.profile, td = C.today(), log = M.L[td] || {}, rpToday = log._s?.w === 'renpho';
  const se = season(S.meta.created, td, M.L, M.cctx);
  let h = `<header class="hdr"><p class="eyebrow">${esc(df(td, { weekday: 'long', day: 'numeric', month: 'long' }))}</p><h1>${p.name ? t('today.hello', { name: esc(p.name) }) : t('app')}</h1>${seasonStrip(se)}</header>`;
  h += installTip();
  const macros = pl => `<div class="macros">${[['protein', pl.protein, 'p'], ['carbs', pl.carbs, 'c'], ['fat', pl.fat, 'f']].map(([k, g, cls]) => `<div class="mac ${cls}"><b>${nf(rnd(g, 5))} g</b><span>${t('today.' + k)}</span></div>`).join('')}</div>`;
  if (M.plan && S.plan.mode) {
    const pl = M.plan;
    h += M.noFood
      ? card(t('today.target'), `<p class="kpi sm">${nf(rnd(pl.protein, 5))} g <small>${t('today.protein').toLowerCase()}</small></p><p class="muted">${t('today.calm')}</p>`, 'hero')
      : card(t('today.target'), `<div class="kpi">${nf(rnd(pl.kcal, 10))}<small> kcal</small></div><p class="muted">${t('fuel.mode.' + M.mode)}${M.tdee.source === 'blended' ? ', ' + t('fuel.src.blendedShort') : ''}</p>${macros(pl)}`, 'hero');
  } else h += card(t('today.target'), `<p class="muted">${t('today.noPlan')}</p><button class="btn pri" data-act="tab" data-tab="fuel">${t('today.setPlan')}</button>`, 'hero');
  const wIn = rpToday ? `<div class="field"><span>${t('today.weight')} (${kgU()})</span><div class="kpi sm">${nf(kgShow(log.w), 2)}</div><small class="muted">${t('today.fromRenpho', { t: esc((S.renpho.rows[td]?.t || '').slice(0, 5)) })}</small></div>` : field(`${t('today.weight')} (${kgU()})`, numIn('logtoday.w', r1(kgShow(log.w)), { conv: 'kg' }));
  const y = M.L[C.addDays(td, -1)], mfp = !M.noFood && y?.kcal && y._s?.kcal !== 'manual' ? `<p class="xs muted">${t('today.fromMfp', { k: nf(y.kcal) })}</p>` : '';
  h += card(t('today.quick'), `<div class="g2">${wIn}${M.noFood ? '' : field(`${t('today.intake')} (kcal)`, numIn('logtoday.kcal', log.kcal, { step: 10 }))}</div>${mfp}<button class="btn ghost sm" data-act="paste">${t('today.paste')}</button>`);
  h += questCard(M, td);
  if (M.series.length) {
    const last = M.series.slice(-30), pts = last.map(s => ({ x: C.dayNum(s.date), y: kgShow(s.w) })), tr = last.map(s => ({ x: C.dayNum(s.date), y: kgShow(s.trend) }));
    const wkAgo = M.series.filter(s => C.dayNum(s.date) <= C.dayNum(td) - 7).pop();
    const ch = wkAgo ? M.series[M.series.length - 1].trend - wkAgo.trend : null;
    h += card(t('today.trend'), `<div class="kpi">${nf(kgShow(M.kg), 1)}<small> ${kgU()}</small></div>${ch != null ? `<p class="muted">${signed(kgShow(ch))} ${kgU()} ${t('today.week')} (${signed(ch / M.kg * 100)} %)</p>` : ''}${line({ series: [{ pts, dots: true, cls: 'raw' }, { pts: tr, cls: 'trend' }], label: t('today.trendAlt', { a: nf(kgShow(last[0].trend), 1), b: nf(kgShow(M.kg), 1), u: kgU(), n: last.length }), xFmt: x => df(new Date(x * 864e5).toISOString().slice(0, 10), { day: 'numeric', month: 'short' }) })}<p class="muted xs">${t('today.trendNote')}</p>`);
  } else h += card(t('today.trend'), `<p class="muted">${t('today.noWeight')}</p>`);
  h += reviewCard(M, td);
  if (M.tdee && !M.noFood) h += card(t('today.maintenance'), `<div class="kpi">${nf(rnd(M.tdee.value, 10))}<small> kcal</small></div><p class="muted">${t('fuel.band68')}: ${kcalBand(M.tdee)}. ${t('fuel.src.' + M.tdee.source)}.</p>${confChip(C.confidence(M.tdee.sd))}`);
  if (M.ar && S.prs.length && M.ar.peak != null) h += card(t('today.arena'), `<div class="g2"><div><p class="eyebrow">${t('today.peak')}</p><div class="kpi sm">${sc(M.ar.peak)}</div>${tierBadge(C.scoreTier(M.ar.peak))}</div><div><p class="eyebrow">${t('today.balance')}</p><div class="kpi sm">${M.ar.balance != null ? sc(M.ar.balance) : '–'}</div>${M.ar.balance != null ? tierBadge(C.scoreTier(M.ar.balance)) : ''}</div></div><div class="badges">${Object.values(M.ar.best).sort((a, b) => b.r.p - a.r.p).slice(0, 4).map(b => `<span class="bb">${tierBadge(b.r.tier)} ${esc(t('arena.ev.' + b.pr.event))}</span>`).join('')}</div><button class="lnk go" data-act="tab" data-tab="arena">${t('today.openArena')}</button>`);
  // set-up steps: things done once, or imports that have gone stale
  const todo = [];
  if (M.src === 'renpho') { if (daysSince(S.renpho.imported) > 7) todo.push(['today.t_renpho', 'settings']); }
  else if (!log.w) todo.push(['today.t_weigh']);
  if (daysSince(S.health.last) > 7) todo.push(['today.t_health', 'settings']);
  if (!M.noFood && !Object.entries(M.L).some(([d, v]) => d > C.addDays(td, -7) && v.kcal)) todo.push(['today.t_mfp', 'settings']);
  if (daysSince(lastOf(S.photos)?.date) > 120) todo.push(['today.t_photoFirst', 'physique']);
  if (!M.bfx.usable && !S.safety.ed) todo.push(['today.t_bf', 'physique']);
  if (!S.prs.length) todo.push(['today.t_pr', 'arena']);
  if (todo.length) h += card(t('today.todo'), `<ul class="todo">${todo.map(([k, tb]) => `<li${tb ? ` class="go" data-act="tab" data-tab="${tb}"` : ''}>${t(k)}</li>`).join('')}</ul>`);
  return h;
}

/* ---------- FUEL ---------- */
function screenFuel(M0) {
  if (!M0.ok) return `<header class="hdr"><h1>${t('tab.fuel')}</h1></header>` + card('', `<p class="muted">${t('today.noWeight')}</p>`);
  const mode = previewMode || S.plan.mode || M0.rec.mode, M = mode === M0.mode ? M0 : model(mode), P = M.pred, pl = M.plan, a = S.activity;
  let h = `<header class="hdr"><h1>${t('tab.fuel')}</h1></header>`;
  h += card(t('fuel.maint'), `<div class="kpi">${nf(rnd(M.tdee.value, 10))}<small> kcal</small></div><p class="muted">${t('fuel.band68')}: ${kcalBand(M.tdee)}<br>${t('fuel.band95')}: ${nf(rnd(M.tdee.value - 1.96 * M.tdee.sd, 50))}–${nf(rnd(M.tdee.value + 1.96 * M.tdee.sd, 50))}</p><p>${chip(t('fuel.src.' + M.tdee.source))} ${confChip(C.confidence(M.tdee.sd))}</p>`, 'hero');
  const parts = [['rmr', P.rmr.value, 'k1'], ['neat', P.neat, 'k2'], ['steps', P.stepsKcal, 'k3'], ['flights', P.flightsKcal, 'k3'], ['ex', P.exercise, 'k4'], ['epoc', P.epoc, 'k4'], ['tef', P.tef, 'k5']].filter(x => x[1] > 0.5);
  const rmrNames = { mifflin: 'Mifflin-St Jeor', katch: 'Katch-McArdle', cunningham: 'Cunningham', tinsleyFFM: 'Tinsley (FFM)', tinsleyBW: 'Tinsley (weight)', tenHaafFFM: 'ten Haaf (FFM)', tenHaafBW: 'ten Haaf (weight)' };
  h += card(t('fuel.breakdown'), stack(parts.map(([k, v, cls]) => ({ v, cls, label: t('fuel.c_' + k) }))) + `<dl class="brk">${parts.map(([k, v, cls]) => `<dt><i class="${cls}"></i>${t('fuel.c_' + k)}</dt><dd>${nf(rnd(v, 5))}</dd>` + (k === 'rmr' ? (M.src === 'renpho' ? rpBmr() : '') + `<dd class="sub">${t('fuel.rmrMethod', { m: P.rmr.parts.map(([e, w]) => `${rmrNames[e]} ${Math.round(w * 100)} %`).join(', ') })}</dd>` : k === 'steps' ? `<dd class="sub">${t('fuel.stepsDetail', { steps: nf(P.steps), km: nf(P.km, 1), c: nf(P.kcalPerKgKm, 2), v: nf((a.walkSpeed || 1.25) * 3.6, 1) })}</dd>` : k === 'ex' ? P.items.map(i => `<dd class="sub">${esc(CATALOGUE[i.type]?.[getLang()] || i.type)}: ${nf(i.kcalDay)} kcal${t('common.perDay')} · ${nf(i.session)} ${t('fuel.perSession')} · ${i.method === 'pace' ? 'ACSM' : `${i.met} MET (${i.code})`}${i.watch ? ` · <b class="${i.session > 1.25 * i.watch ? 'warnTxt' : ''}">${t('fuel.watchCmp', { k: nf(i.watch) })}</b>` : ''}</dd>`).join('') + (P.items.some(i => i.watch && i.session > 1.25 * i.watch) ? `<dd class="sub warnTxt">${t('fuel.watchHigh')}</dd>` : '') : '')).join('')}</dl>` + how(t('common.how'), `<p>${t('fuel.howText')}</p><p><a href="${SOURCES.compendium.url}" target="_blank" rel="noopener">${esc(SOURCES.compendium.name)}</a><br><a href="${SOURCES.walk.url}" target="_blank" rel="noopener">${esc(SOURCES.walk.name)}</a></p>`));
  h += card(t('fuel.activity'), `<div class="g2">${field(t('fuel.stepsAvg'), numIn('activity.stepsAvg', a.stepsAvg, { step: 100 }))}${field(t('ob.occupation'), selIn('activity.occupation', a.occupation, ['desk', 'mixed', 'standing', 'manual'].map(k => [k, t('ob.occ.' + k)])))}${field(t('ob.sleep'), numIn('activity.sleepH', a.sleepH, { step: 0.5 }))}${field(t('ob.years'), numIn('activity.years', a.years, { step: 0.5 }))}</div>${chk('activity.stepsInc', a.stepsInc, t('fuel.stepsInc'))}${how(t('fuel.fine'), `${field(t('fuel.flights'), numIn('activity.flights', a.flights, { step: 1 }))}${field(`${t('fuel.stride')} (cm)`, numIn('activity.strideCm', a.strideCm, { ph: nf(C.strideM(S.profile.sex, S.profile.cm) * 100) }), t('fuel.strideHint'))}${field(`${t('fuel.walkSpeed')} (km/h)`, numIn('activity.walkSpeed', a.walkSpeed ? r1(a.walkSpeed * 3.6) : '', { conv: 'kmh', ph: '4.5', step: 0.1 }), t('fuel.walkSpeedHint'))}`, 'fine')}<h3>${t('fuel.sessions')}</h3>${workoutsEditor()}`);
  // plan
  const modes = ['cut', 'recomp', 'maintain', 'bulk', 'custom'];
  let ph = `<div class="rec"><b>${t('fuel.rec')}: ${t('fuel.mode.' + M.rec.mode)}${M.rec.slow ? ` (${t('fuel.slow')})` : ''}</b><p>${t('fuel.reason.' + M.rec.reason)}</p></div>`;
  ph += `<div class="seg">${modes.map(m => `<button data-act="mode" data-m="${m}" class="${m === mode ? 'on' : ''}"${M.blockDeficit && (m === 'cut' || m === 'recomp') ? ' disabled' : ''}>${t('fuel.mode.' + m)}</button>`).join('')}</div>`;
  if (mode === 'cut') ph += field(t('fuel.rate'), `<div class="seg sm">${[0.25, 0.5, 0.75, 1.0].map(r => `<button data-act="rate" data-r="${r}" class="${r === S.plan.ratePct ? 'on' : ''}">${nf(r, 2)} %</button>`).join('')}</div>`);
  if (mode === 'custom') ph += field(t('fuel.custom'), numIn('plan.customKcal', S.plan.customKcal, { step: 10, ph: nf(rnd(M.tdee.value, 10)) }));
  ph += `<div class="g2">${field(t('fuel.fatPct'), selIn('plan.fatPct', S.plan.fatPct, [20, 25, 30, 35].map(x => [x, x + ' %'])))}${field(t('fuel.meals'), selIn('plan.meals', S.plan.meals, [3, 4, 5].map(x => [x, x])))}</div>`;
  ph += `<div class="result"><p class="eyebrow">${t('fuel.target')}</p><div class="kpi">${nf(rnd(pl.kcal, 10))}<small> kcal</small></div><div class="macros">${[['protein', pl.protein, 'p'], ['carbs', pl.carbs, 'c'], ['fat', pl.fat, 'f']].map(([k, g, cls]) => `<div class="mac ${cls}"><b>${nf(rnd(g, 5))} g</b><span>${t('today.' + k)}</span></div>`).join('')}</div><p class="muted">${t('fuel.perMeal', { g: nf(pl.perMeal), gkg: nf(pl.perMealPerKg, 2) })}</p>`;
  if (pl.weeklyKg) ph += `<p>${t('fuel.change')}: <b>${signed(kgShow(pl.weeklyKg))} ${kgU()}${t('common.perWeek')}</b> (${signed(pl.weeklyPct)} %)</p>`;
  if (pl.ea != null) {
    const ck = S.meta.checkin, flagged = ck && ck.n > 0 && daysSince(ck.date) <= 14;
    ph += `<div class="ea ${pl.eaLevel}"><span>${t('fuel.ea')}</span><b>${nf(pl.ea, 0)}</b><small>${t('fuel.eaRange', { lo: nf(pl.eaLo, 0), hi: nf(pl.eaHi, 0) })} ${t('fuel.eaL.' + pl.eaLevel + (pl.eaLevel === 'amber' ? '_' + S.profile.sex : ''))}</small>${flagged ? `<small class="warnTxt">${t('fuel.checkinFlag', { d: df(ck.date, { day: 'numeric', month: 'short' }), n: ck.n })}</small>` : ''}${pl.eaLevel !== 'ok' || pl.delta < 0 ? `<button class="lnk" data-act="checkin">${t('fuel.checkin')}</button>` : ''}</div>`;
  }
  if (pl.flags.length) ph += `<ul class="flags">${pl.flags.map(f => `<li>${t('fuel.flags.' + f, { min: nf(rnd(pl.minKcal, 10)) })}</li>`).join('')}</ul>`;
  if (mode === 'cut') ph += `<p class="tip">${t('fuel.dietBreak')}</p>`;
  if (mode === 'bulk') { const y = a.years || 0; ph += `<p class="tip">${t('fuel.bulkNote', { lo: y >= 3 ? '0.1' : '0.25', hi: y >= 3 ? '0.25' : '0.5' })}</p>`; }
  if (mode !== 'maintain' && pl.ed) {
    const pr = C.project({ kg: M.kg, tdee: M.tdee.value, sd: M.tdee.sd, kcal: pl.kcal, ed: pl.ed, kPerKg: P.kPerKg });
    const xy = arr => arr.map(p => ({ x: p.wk, y: kgShow(p.w) }));
    ph += `<p class="eyebrow">${t('fuel.projection')}</p>${line({ series: [{ pts: xy(pr.mid), cls: 'trend' }], band: { lo: xy(pr.lo), hi: xy(pr.hi) }, label: t('fuel.projAlt', { a: nf(kgShow(M.kg), 1), b: nf(kgShow(pr.mid[16].w), 1), lo: nf(kgShow(Math.min(pr.lo[16].w, pr.hi[16].w)), 1), hi: nf(kgShow(Math.max(pr.lo[16].w, pr.hi[16].w)), 1), u: kgU() }), xFmt: x => (getLang() === 'fr' ? 'sem. ' : 'wk ') + x })}<p class="muted xs">${t('fuel.projNote')}</p>`;
  }
  { // what if: a goal weight with its date range, and the effect of walking more or less
    const goal = S.plan.goalKg; let eta = '';
    if (goal > 0 && pl.ed) {
      const e = C.etaWeeks({ kg: M.kg, goal, tdee: M.tdee.value, sd: M.tdee.sd, kcal: pl.kcal, ed: pl.ed, kPerKg: P.kPerKg });
      const dt = w => df(C.addDays(C.today(), Math.round(w * 7)), { day: 'numeric', month: 'short', year: 'numeric' });
      eta = `<p class="tip">${e ? t('fuel.eta', { g: `${nf(kgShow(goal), 1)} ${kgU()}`, d: dt(e.mid), lo: e.lo != null ? dt(e.lo) : '…', hi: e.hi != null ? dt(e.hi) : t('fuel.etaOpen') }) : t('fuel.etaNo')}</p>`;
    } else if (goal > 0) eta = `<p class="tip">${t('fuel.etaNo')}</p>`;
    ph += how(t('fuel.whatif'), `${field(`${t('fuel.goal')} (${kgU()})`, numIn('plan.goalKg', r1(kgShow(goal)), { conv: 'kg', ph: nf(kgShow(M.kg), 0) }))}${eta}<label class="field"><span>${t('fuel.wiSteps')}</span><input type="range" id="wiSteps" min="-4000" max="6000" step="500" value="0" data-k="${(C.strideM(S.profile.sex, S.profile.cm, a.strideCm) / 1000 * M.kg * P.kcalPerKgKm / 0.9).toFixed(5)}" data-ed="${Math.round(pl.ed || C.energyDensity(M.fmKg, P.trained, -1))}"></label><p id="wiOut" class="muted">${t('fuel.wiHint')}</p>`, 'whatif');
  }
  ph += `</div>` + (S.plan.mode === mode ? chip(t('fuel.applied'), 'ok') : `<button class="btn pri" data-act="apply" data-m="${mode}"${pl.blocked ? ' disabled' : ''}>${t('fuel.apply')}</button>`);
  h += card(t('fuel.plan'), ph);
  // learning
  const o = M.obs;
  let lh = `<p class="muted">${t('fuel.learnLead')}</p>`;
  if (o.ok) {
    const r = M.tdee.ratio, dm = { day: 'numeric', month: 'short' };
    lh += `<div class="tiles"><div><span>${t('fuel.lMeasured')}</span><b>${nf(rnd(o.tdee, 10))}</b><small>± ${nf(rnd(o.sd, 10))} kcal</small></div><div><span>${t('fuel.lFormula')}</span><b>${nf(rnd(P.tdee, 10))}</b><small>± ${nf(rnd(P.sd, 10))} kcal</small></div><div><span>${t('fuel.lRatio')}</span><b>${nf(r * 100)} %</b><small>${t('fuel.lRatioS')}</small></div></div>`;
    lh += `<p>${t('fuel.learnOk', { a: df(o.from, dm), b: df(o.to, dm), i: nf(rnd(o.intake, 10)), k: o.nK, slope: signed(kgShow(o.slopeKgWk)) + ' ' + kgU() })}</p><p class="tip">${t(r < 0.9 ? 'fuel.ratioLow' : r > 1.1 ? 'fuel.ratioHigh' : 'fuel.ratioOk', { p: nf(Math.abs(1 - r) * 100) })}</p>`;
    if (o.nPartial) lh += `<p class="muted xs">${t('fuel.partial', { n: o.nPartial })}</p>`;
    if (o.water) lh += `<p class="muted xs">${t('fuel.water.' + o.water, { d: df(S.plan.applied, dm) })}</p>`;
    lh += `<p class="muted xs">${t('fuel.learnWeight', { pct: nf((M.tdee.wObs || 0) * 100) })}</p>`;
  } else {
    const need = [[t('fuel.nSpan'), o.span, 14], [t('fuel.nWeigh'), o.nW, 4], [t('fuel.nKcal'), o.nK, o.need.intakeDays]];
    lh += `<ul class="needs">${need.map(([l, n, g]) => `<li><span>${l}</span><b>${Math.min(n, g)} / ${g}</b>${heat(n / g)}</li>`).join('')}</ul>`;
  }
  lh += how(t('fuel.learnHow'), `<p>${t('fuel.learnHowText')}</p>`);
  h += card(t('fuel.learn'), lh);
  // log
  const days = Object.entries(M.L).sort((x, y) => x[0] < y[0] ? 1 : -1).slice(0, 14);
  const tag = (v, k) => v._s?.[k] ? `<i class="src s-${v._s[k]}">${{ renpho: 'R', health: 'H', manual: '✎' }[v._s[k]]}</i>` : '';
  const tr = Object.fromEntries(M.series.map(s => [s.date, s.trend]));
  const k28 = Object.entries(M.L).filter(([d, v]) => d > C.addDays(C.today(), -28) && v.kcal); const kImp = k28.filter(([, v]) => v._s?.kcal !== 'manual').length;
  h += card(t('fuel.log'), `<p class="xs muted">${t('fuel.kcalSrc', { n: kImp, m: k28.length - kImp })}</p>` + (days.length ? `<table class="tbl"><thead><tr><th>${t('common.date')}</th><th>${kgU()}</th><th>${t('today.trend')}</th><th>kcal</th><th>${t('fuel.steps')}</th></tr></thead><tbody>${days.map(([d, v]) => `<tr data-act="logedit" data-d="${d}"><td class="nw">${df(d, { day: 'numeric', month: 'short' })}</td><td>${v.w ? nf(kgShow(v.w), 1) + tag(v, 'w') : '–'}</td><td>${tr[d] ? nf(kgShow(tr[d]), 1) : '–'}</td><td>${v.kcal ? nf(v.kcal) + tag(v, 'kcal') : '–'}</td><td>${v.steps ? nf(v.steps) + tag(v, 'steps') : '–'}</td></tr>`).join('')}</tbody></table><p class="xs muted">${t('fuel.srcLegend')}</p>` : `<p class="muted">${t('fuel.noLog')}</p>`) + `<button class="btn ghost" data-act="logedit" data-d="${C.today()}">${t('fuel.addEntry')}</button>`);
  return h;
}

/* ---------- PHYSIQUE ---------- */
function screenPhysique(M) {
  const p = S.profile; let h = `<header class="hdr"><h1>${t('tab.physique')}</h1></header>`;
  const E = M.bfx.ens;
  if (E && !S.safety.ed) {
    const lo = Math.max(3, E.lo), hi = E.hi;
    const sq = M.src === 'renpho' ? renphoStats(S.renpho.rows)?.latest?.subq : null;
    h += card(t('phys.bf'), `<div class="kpi">${nf(E.value, 1)}<small> %</small></div><p>${t('phys.bfRange', { lo: nf(lo, 0), hi: nf(hi, 0) })}</p>${sq != null ? `<p class="muted">${t('phys.subqLine', { v: nf(sq, 1) })}</p>` : ''}${confChip(E.sd < 2.5 ? 'high' : E.sd < 4 ? 'medium' : 'low')}
      <h3>${t('phys.methods')}</h3><ul class="meth">${E.items.map(i => `<li><span>${i.renpho ? t(i.cal ? 'phys.m.biaRenphoCal' : 'phys.m.biaRenpho', { n: i.n, o: (i.cal?.offset > 0 ? '+' : '−') + nf(Math.abs(i.cal?.offset || 0), 1) }) : t('phys.m.' + i.method)}${i.cal ? ' ✓' : ''}</span><b>${nf(i.value, 1)} %</b><small>±${nf(i.sd * 1.96, 1)} · ${df(i.date)} · ${t('phys.weight')} ${Math.round(i.weight * 100)} %</small></li>`).join('')}${M.bfx.stale.map(i => `<li class="stale"><span>${t('phys.m.' + i.method)}</span><b>${nf(i.value, 1)} %</b><small>${df(i.date)} · ${t('phys.stale')}</small></li>`).join('')}</ul>`, 'hero');
  } else if (!S.safety.ed) h += card(t('phys.bf'), `<p class="muted">${t('phys.bfNone')}</p>`, 'hero');
  // comparisons
  if (p.sex && !S.safety.ed && !S.safety.under18) {
    let cmp = '';
    if (M.bf != null) {
      const an = C.bfAnchors(p.sex, M.age), pc = C.pctFromAnchors(M.bf, an.A), leaner = (1 - pc) * 100;
      cmp += `<p><b>${t('phys.vsAdults', { p: leaner > 99 ? '99+' : nf(leaner), sex: t('sexPl.' + p.sex), a: an.band, b: an.band + 4 })}</b></p>${pctBar(1 - pc, { zones: [{ to: 0.25, cls: 'zb' }, { to: 0.5, cls: 'zm' }, { to: 0.75, cls: 'zg' }, { to: 1, cls: 'zp' }], label: nf(M.bf, 1) + ' %' })}<p class="muted xs">${t('phys.vsSrc')}</p>`;
    }
    if (M.ffm) { const v = C.ffmiNorm(M.ffm, p.cm); cmp += `<div class="kv"><span>${t('phys.ffmi')}</span><b>${t('phys.ffmiText', { v: nf(v, 1) })}</b><small>${p.sex === 'm' ? t('phys.ffmiRef') : t('phys.ffmiRefF')}</small></div>`; }
    const tape = [...S.tapes].sort((a, b) => a.date < b.date ? 1 : -1)[0];
    if (tape?.waist && p.cm) { const r = C.whtr(tape.waist, p.cm); cmp += `<div class="kv"><span>${t('phys.whtr')}</span><b>${t('phys.whtrText', { v: nf(r, 2), band: t('phys.whtrBand.' + (r < 0.5 ? 'ok' : r < 0.6 ? 'mid' : 'high')) })}</b></div>`; }
    const dxa = [...S.scans].filter(s => s.method === 'dxa' && s.alm).sort((a, b) => a.date < b.date ? 1 : -1)[0];
    if (dxa) cmp += `<div class="kv"><span>${t('phys.almi')}</span><b>${t('phys.almiText', { v: nf(dxa.alm / (p.cm / 100) ** 2, 1), d: df(dxa.date) })}</b></div>`;
    if (M.bmiV) { const lean = S.scans.find(s => s.method === 'dxa' && s.weight && s.bf && C.bmi(s.weight, p.cm) >= 25 && s.bf < (p.sex === 'm' ? 20 : 28)); cmp += `<div class="kv"><span>${t('phys.bmi')}</span><small>${t('phys.bmiText', { v: nf(M.bmiV, 1) })}${lean ? ' ' + t('phys.bmiDxa', { d: df(lean.date), b: nf(C.bmi(lean.weight, p.cm), 1), f: nf(lean.bf, 1) }) : ''}</small></div>`; }
    if (cmp) h += card(t('phys.compare'), cmp);
  }
  h += healthspanCard(M);
  if (M.src === 'renpho') h += smartScaleCard();
  // photos
  const photos = [...S.photos].sort((a, b) => a.date < b.date ? 1 : -1);
  h += card(t('phys.photos'), `<p class="muted xs">${t('phys.photoOnDevice')}</p>${how(t('phys.photoHow'), `<div class="poses">${poseSvg('front')}${poseSvg('side')}${poseSvg('back')}</div><dl class="proto">${t('phys.protocol').map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`)}<div class="gal">${photos.map(ph => `<button class="ph" data-act="photo" data-id="${ph.id}"><img data-photo="${ph.id}:front" alt=""><span>${df(ph.date)}${ph.ref ? ' · ' + esc(ph.ref) : ''}${ph.result ? ` · ${ph.result.cropped ? '⚠ ' : ''}${nf(ph.result.navy, 1)} %` : ''}</span></button>`).join('')}</div><button class="btn pri" data-act="photonew">${t('phys.photoNew')}</button>`);
  // tape
  const tapes = [...S.tapes].sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 6);
  h += card(t('phys.tape'), `${how(t('phys.tapeHow'), `<ol>${t('phys.tapeSteps').map(s => `<li>${esc(s)}</li>`).join('')}</ol>`)}${tapes.length ? `<table class="tbl"><thead><tr><th>${t('common.date')}</th><th>${t('phys.neck')}</th><th>${t('phys.waist').split(' (')[0]}</th><th>${t('phys.hip').split(' (')[0]}</th></tr></thead><tbody>${tapes.map(x => `<tr data-act="tape" data-id="${x.id}"><td>${df(x.date, { day: 'numeric', month: 'short' })}</td><td>${nf(cmShow(x.neck), 1)}</td><td>${nf(cmShow(x.waist), 1)}</td><td>${x.hip ? nf(cmShow(x.hip), 1) : '–'}</td></tr>`).join('')}</tbody></table>` : ''}<button class="btn ghost" data-act="tape">${t('phys.tapeAdd')}</button>`);
  // scans
  const scans = [...S.scans].sort((a, b) => a.date < b.date ? 1 : -1);
  h += card(t('phys.scans'), `${scans.map(s => `<div class="kv clickable" data-act="scan" data-id="${s.id}"><span>${t('phys.m.' + s.method)} · ${df(s.date)}</span><b>${nf(s.bf, 1)} %</b><small>${s.weight ? nf(kgShow(s.weight), 1) + ' ' + kgU() : ''}${s.lean ? ` · ${t('phys.leanShort')} ${nf(kgShow(s.lean), 1)}` : ''}${s.vat ? ` · VAT ${nf(s.vat)} g` : ''}</small></div>`).join('')}<button class="btn ghost" data-act="scan">${t('phys.scanAdd')}</button>`);
  if (M.series.length > 1) { const last = M.series.slice(-120); h += card(t('phys.history'), line({ series: [{ pts: last.map(s => ({ x: C.dayNum(s.date), y: kgShow(s.w) })), dots: true, cls: 'raw' }, { pts: last.map(s => ({ x: C.dayNum(s.date), y: kgShow(s.trend) })), cls: 'trend' }], xFmt: x => df(new Date(x * 864e5).toISOString().slice(0, 10), { day: 'numeric', month: 'short' }) })); }
  return h;
}
function healthspanCard(M) {
  const p = S.profile, v = lastOf(S.vitals || []), td = C.today(), tiles = [];
  const tile = (label, value, band, cls, act) => tiles.push(`<div class="hs ${cls || ''}"${act ? ` data-act="${act}"` : ''}><span>${label}</span><b>${value}</b><small>${band}</small></div>`);
  const cl = { low: 'bad', below: 'mid', above: 'ok', high: 'ok', elite: 'ok', ok: 'ok', mid: 'mid', weak: 'bad' };
  const aer = ['vo2', 'run5k', 'run10k'].map(k => M.ar?.best[k]).filter(Boolean).sort((a, b) => b.r.p - a.r.p)[0];
  if (aer) { const b = vo2Band(aer.r.p); tile(t('hs.vo2'), aer.pr.event === 'vo2' ? nf(aer.r.value, 1) : fmtVal(aer.pr.event, aer.r.value), t('hs.vo2B.' + b), cl[b]); }
  else tile(t('hs.vo2'), '–', t('hs.addArena'), 'empty', 'pradd');
  if (v?.grip && p.sex) { const g = C.gripT(p.sex, v.grip); tile(t('hs.grip'), `${nf(kgShow(v.grip), 1)} ${kgU()}`, t('hs.gripB.' + g.band, { t: signed(g.t, 1) }), cl[g.band === 'low' ? 'mid' : g.band], 'vitals'); }
  else tile(t('hs.grip'), '–', t('hs.add'), 'empty', 'vitals');
  if (v?.stance != null) { const b = stanceBand(v.stance); tile(t('hs.stance'), v.stance >= 10 ? '10 s' : `${nf(v.stance)} s`, t('hs.stanceB.' + b), cl[b === 'low' ? 'weak' : b], 'vitals'); }
  else tile(t('hs.stance'), '–', t('hs.add'), 'empty', 'vitals');
  const tape = lastOf(S.tapes);
  if (tape?.waist && p.cm) { const r = C.whtr(tape.waist, p.cm), b = whtrBand(r); tile(t('hs.whtr'), nf(r, 2), t('hs.whtrB.' + b), cl[b === 'high' ? 'weak' : b], 'tape'); }
  else tile(t('hs.whtr'), '–', t('hs.addTape'), 'empty', 'tape');
  const rh = Object.entries(M.L).filter(([d, x]) => d > C.addDays(td, -14) && x.rhr > 0).map(([, x]) => x.rhr);
  tile(t('hs.rhr'), rh.length ? `${nf(C.mean(rh))}` : '–', rh.length ? t('hs.rhrB', { n: rh.length }) : t('hs.rhrNone'), rh.length ? '' : 'empty');
  return card(t('hs.title'), `<p class="muted">${t('hs.lead')}</p><div class="hsgrid">${tiles.join('')}</div>${v ? `<p class="muted xs">${t('hs.last', { d: df(v.date) })}</p>` : ''}<button class="btn ghost sm" data-act="vitals">${t('hs.check')}</button>${how(t('hs.why'), `<ul>${t('hs.evidence').map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="muted xs">${[SOURCES.mandsager, SOURCES.dodds, SOURCES.araujo].map(x => `<a href="${x.url}" target="_blank" rel="noopener">${esc(x.name)}</a>`).join('<br>')}</p>`, 'hswhy')}`);
}
function vitalsSheet() {
  sheet(`<h2>${t('hs.check')}</h2>${field(t('common.date'), `<input type="date" name="date" value="${C.today()}">`)}${field(`${t('hs.grip')} (${kgU()})`, `<input type="number" step="any" inputmode="decimal" name="grip">`, t('hs.gripHow'))}${field(t('hs.stanceIn'), `<input type="number" step="1" min="0" max="10" inputmode="numeric" name="stance">`, t('hs.stanceHow'))}<div class="row"><button class="btn ghost" data-close>${t('common.cancel')}</button><button class="btn pri" data-save>${t('common.save')}</button></div>`, d => {
    const f = d.querySelector('form');
    d.querySelector('[data-save]').onclick = e => {
      e.preventDefault(); const g = fv(f, 'grip'), st = fv(f, 'stance'); if (g == null && st == null) { d.close(); return; }
      const prev = lastOf(S.vitals || []) || {}, o = { id: uid(), date: fv(f, 'date') || C.today(), grip: g != null ? kgRead(g) : prev.grip ?? null, stance: st != null ? C.clamp(+st, 0, 10) : prev.stance ?? null };
      if (o.grip != null && !(o.grip > 3 && o.grip < 120)) { toast(t('arena.badEntry')); return; }
      upsert('vitals', o); d.close(); render(); toast(t('common.saved'));
    };
  });
}
function poseSvg(kind) {
  const body = kind === 'side'
    ? '<ellipse cx="50" cy="16" rx="8" ry="9"/><path d="M46 25h9l3 20-2 14 2 22-3 34h-6l-1-30-2 30h-6l1-36-2-20 3-14z"/><path d="M47 33l14 8-2 4-13-6z"/>'
    : '<ellipse cx="50" cy="16" rx="8" ry="9"/><path d="M40 27h20l4 24-3 10 2 22-4 33h-6l-2-30-2 30h-6l-4-33 2-22-3-10z"/><path d="M40 29l-12 26 3 2 12-22zM60 29l12 26-3 2-12-22z"/>';
  return `<figure><svg viewBox="0 0 100 124" class="pose">${body}<line x1="18" x2="82" y1="57" y2="57" class="g"/></svg><figcaption>${t('phys.' + kind)}</figcaption></figure>`;
}

/* ---------- ARENA ---------- */
const EVENT_GROUPS = { strength: ['bench', 'squat', 'deadlift', 'ohp'], explosive: ['vjump', 'sljump', 'wb6', 'mbthrow'], speed: ['sprint60', 'sprint100', 'sprint200', 'sprint400'], power: ['row100', 'row200', 'row250', 'row500', 'row1min', 'bike1000', 'ski500'], aerobic: ['vo2', 'run5k', 'run10k'], upper: ['pullups', 'pushups'] };
/* Wattbike: ranked as a 1,000 m-equivalent time internally, always shown as the watts held for that time. */
const bikeW = sec => Math.round(0.35 / (sec / 1000) ** 3);
const fmtVal = (id, v) => { const k = EVENTS[id].kind; return id === 'wb6' ? `${nf(v)} W` : id === 'mbthrow' ? `${nf(v, 2)} m` : k === 'ljump' ? `${nf(cmShow(v), cmU() === 'cm' ? 0 : 1)} ${cmU()}` : id === 'bike1000' ? `${nf(bikeW(v))} W` : k === 'lift' ? `${nf(kgShow(v), 1)} ${kgU()}` : k === 'rowtime' ? `${nf(v)} m` : k === 'vo2' ? `${nf(v, 1)}` : k === 'jump' ? `${nf(cmShow(v), 1)} ${cmU()}` : k === 'reps' ? `${nf(v)} ${t('arena.repsU')}` : fmtTime(v); };
/* Tracked events (no adult reference data): best result, progress against the previous best, never a tier. */
function trackRow(id, M) {
  const b = C.trackBest(S.prs, id), name = t('arena.ev.' + id);
  if (!b) return `<div class="ev empty" data-act="event" data-id="${id}"><span>${name}</span><small>${t('arena.trackNone')}</small></div>`;
  const extra = id === 'wb6' ? `${nf(b.value / (+b.pr.bw || M.who.kg), 1)} W/kg` : t('arena.ballN', { kg: nf(+b.pr.ball || 0) });
  const up = b.prev != null && b.value > b.prev ? ` · ${t('arena.trackUp', { d: id === 'wb6' ? `+${nf(b.value - b.prev)} W` : `+${nf(b.value - b.prev, 2)} m` })}` : '';
  return `<div class="ev" data-act="event" data-id="${id}"><div class="evh"><span>${name}</span><span class="chip">${t('arena.tracked')}</span></div><div class="evv"><b>${fmtVal(id, b.value)}</b><small>${df(b.pr.date)}</small></div><div class="evp">${extra}${up}</div><small class="muted">${t('arena.trackWhy')}</small></div>`;
}
function screenArena(M) {
  const A = M.ar, sex = S.profile.sex;
  let h = `<header class="hdr"><h1>${t('arena.title')}</h1><p class="muted">${t('arena.lead')}</p></header>`;
  if (!sex) return h + card('', `<p class="muted">${t('ob.you')}</p>`);
  const domVals = DOMAINS.map(d => ({ label: t('arena.domS.' + d), name: t('arena.dom.' + d), v: A.dom[d] ?? null, d }));
  const overall = (label, v, text) => {
    if (v == null) return `<div class="score"><p class="eyebrow">${label}</p><div class="kpi">–</div><small>${text}</small></div>`;
    const ti = C.scoreTier(v), nxt = ti < 7 ? TIER_P[ti] * 100 : null, lo = ti ? TIER_P[ti - 1] * 100 : 0;
    return `<div class="score"><p class="eyebrow">${label}</p><div class="kpi">${sc(v)}</div>${tierBadge(ti)}<p class="flav">${esc(tierName(ti)[1])}</p>${heat(nxt ? (v - lo) / (nxt - lo) : 1)}<small class="nxt">${nxt ? t('arena.toNext', { gap: nf(Math.max(1, nxt - Math.floor(v + 1e-9))), tier: tierName(ti + 1)[0] }) : t('arena.top')}</small><small>${text}</small></div>`;
  };
  let top = `<div class="g2">${overall(t('arena.peak'), A.peak, t('arena.peakShort'))}${overall(t('arena.balance'), A.balance, t('arena.balanceShort'))}</div>`;
  const rivals = S.rivals || [], rv = rivals.find(x => x.id === ui.rival) || null;
  top += radar(domVals.map(x => ({ ...x, v2: rv ? rv.dom[x.d] ?? null : undefined })), 300, t('arena.radarAlt', { s: domVals.map(x => `${x.name} ${x.v == null ? '–' : sc(x.v)}`).join(', ') }));
  if (rv) top += `<p class="legend"><i class="me"></i>${esc(S.profile.name || t('duel.you'))}<i class="them"></i>${esc(rv.name)}</p>`;
  if (A.lean != null) top += `<div class="kv"><span>${t('arena.leanTitle')}</span><b>${nf(A.lean)}</b><small>${t('arena.leanText')}</small></div>`;
  if (A.balance != null) {
    const present = domVals.filter(x => x.v != null); const weak = present.reduce((a, b) => a.v < b.v ? a : b);
    const nextP = TIER_P.find(b => b * 100 > weak.v); const vals = present.map(x => x === weak ? Math.max(x.v, (nextP || 0.999) * 100) : x.v);
    const nb = C.geomean(vals);
    const up = C.scoreTier(nb) > C.scoreTier(A.balance);
    top += `<p class="tip">${t(up ? 'arena.limiterUp' : 'arena.limiter', { d: weak.name, a: sc(A.balance), b: sc(nb), tier: tierName(C.scoreTier(nb))[0] })}</p>`;
  } else top += `<p class="muted">${t('arena.needMore')}</p>`;
  top += how(t('arena.howScores'), `<p>${t('arena.peakText')} ${t('arena.balanceText')} ${t('arena.gapText')}</p><p>${t('arena.overallNote')}</p>`, 'scores');
  h += card('', top, 'hero');
  { // closest level-ups
    const bs = bosses(A.best, 3);
    if (bs.length) h += card(t('arena.bosses'), `<p class="muted xs">${t('arena.bossesLead')}</p>` + bs.map(b => `<div class="ev boss" data-act="event" data-id="${b.id}"><div class="evh"><span>${t('arena.ev.' + b.id)}</span>${b.level ? `<span class="lvl">FFA ${b.level}</span>` : tierBadge(b.tier)}</div><div class="evv"><b>${fmtVal(b.id, b.target)}</b><small>${t('arena.bossGap', { now: fmtVal(b.id, b.value), p: nf(Math.max(0.1, b.rel * 100), 1) })}</small></div></div>`).join(''));
  }
  h += duelCard(M);
  for (const [dom, ids] of Object.entries(EVENT_GROUPS)) {
    h += card(t('arena.dom.' + dom) + (A.dom[dom] != null ? ` <span class="dscore">${sc(A.dom[dom])}</span> ${tierBadge(C.scoreTier(A.dom[dom]))}` : ''), ids.map(id => {
      if (EVENTS[id].kind === 'track') return trackRow(id, M);
      const b = A.best[id];
      if (!b) return `<div class="ev empty" data-act="event" data-id="${id}"><span>${t('arena.ev.' + id)}</span><small>${t('arena.none')}</small></div>`;
      const r = b.r, lvlTxt = r.nextLevel && (r.tier >= 7 || Math.abs(r.nextLevel.time - r.next) > 0.005) ? t('arena.next', { gap: `−${(r.value - r.nextLevel.time).toFixed(2)} s`, tier: 'FFA ' + r.nextLevel.name }) + '. ' : '', stale = daysSince(b.pr.date) > 365 ? ` <span class="chip">${t('arena.retest')}</span>` : '';
      const nextTxt = lvlTxt + (r.tier < 7 ? t('arena.next', { gap: gapTxt(id, r), tier: tierName(r.tier + 1)[0] }) : t('arena.top'));
      return `<div class="ev" data-act="event" data-id="${id}"><div class="evh"><span>${t('arena.ev.' + id)}</span>${tierBadge(r.tier)}</div><div class="evv"><b>${fmtVal(id, r.value)}</b><small>${df(b.pr.date)}${stale}</small></div><div class="evp">${r.open != null ? t(r.factor < 0.9995 ? 'arena.ffaAge' : 'arena.ffa', { l: r.level ? 'FFA ' + r.level : t('arena.ffaBelow'), o: fmtTime(r.open), k: nf(r.factor, 4), pts: nf(r.points) }) : EVENTS[id].low ? t('arena.vsLow', { p: topPct(r.p), sex: t('sexPl.' + sex) }) : EVENTS[id].q[sex] >= 1 ? t('arena.vsAge', { p: topPct(r.p), sex: t('sexPl.' + sex) }) : `${t('arena.vsPart', { p: topPct(r.p) })}. ${t('arena.vsAll', { p: topPct(r.pop.mid), lo: topPct(r.pop.hi), hi: topPct(r.pop.lo), sex: t('sexPl.' + sex) })}`}</div>${id === 'vjump' && C.sayers(r.value, M.who.kg) > 0 ? `<div class="evp">${t('arena.sayers', { w: nf(rnd(C.sayers(r.value, M.who.kg), 10)), wkg: nf(C.sayers(r.value, M.who.kg) / M.who.kg, 1), se: nf(C.SAYERS_SEE) })}</div>` : ''}${heat(progress(r))}<small class="muted">${nextTxt}</small></div>`;
    }).join('') + (dom === 'strength' && (A.gl || A.benchGl) ? `<div class="kv"><span>${t('arena.glTitle')}</span><b>${A.gl ? t('arena.glTotal', { tot: `${nf(kgShow(A.gl.total), 1)} ${kgU()}`, bw: `${nf(kgShow(A.gl.bw), 1)} ${kgU()}`, pts: nf(A.gl.points, 1) }) : t('arena.glBench', { pts: nf(A.benchGl, 1) })}</b><small>${t('arena.glText', { c: t('arena.ageClass.' + C.ageClass(M.age)) })}${A.gl && A.benchGl ? ' ' + t('arena.glBench', { pts: nf(A.benchGl, 1) }) + '.' : ''}</small></div>` : '') + `<button class="btn ghost sm" data-act="pradd" data-dom="${dom}">${t('arena.add')}</button>`);
  }
  h += card(t('arena.ladder'), `<ol class="ladder">${TIERS.map((_, i) => `<li>${tierBadge(i)}<span>${esc(tierName(i)[1])}</span><small>${t('tier.band')[i]}</small></li>`).reverse().join('')}</ol><p class="muted xs">${t('arena.ladderNote')}</p>${field(t('arena.variant'), selIn('profile.variant', S.profile.variant, [['classic', t('set.variant.classic')], ['f', t('set.variant.f')]]))}`);
  h += card(t('arena.calc'), `<div class="g2">${field(`${t('arena.weightKg')} (${kgU()})`, `<input type="number" inputmode="decimal" id="c1w" value="100">`)}${field(t('arena.reps'), `<input type="number" inputmode="numeric" id="c1r" value="5">`)}</div><p id="c1o" class="kpi sm"></p>`);
  return h;
}
const sc = v => nf(Math.floor(v + 1e-9)); // scores shown rounded down so the number, its tier and the gap agree
const topPct = p => { const x = (1 - p) * 100; return x < 0.1 ? '0.1' : x < 1 ? nf(x, 1) : nf(x); };
function gapTxt(id, r) {
  const k = EVENTS[id].kind;
  if (k === 'lift') return `+${nf(kgShow(r.next - r.value), 1)} ${kgU()}`;
  if (k === 'rowtime') return `+${nf(r.next - r.value)} m`;
  if (k === 'vo2') return `+${nf(r.next - r.value, 1)}`;
  if (k === 'jump' || k === 'ljump') return `+${nf(cmShow(r.next - r.value), 1)} ${cmU()}`;
  if (k === 'reps') return `+${Math.max(1, Math.ceil(r.next - r.value))} ${t('arena.repsU')}`;
  if (id === 'bike1000') return `+${nf(Math.max(1, bikeW(r.next) - bikeW(r.value)))} W`;
  const d = r.value - r.next; return d >= 60 ? `−${fmtTime(d)}` : `−${d.toFixed(2)} s`;
}
function progress(r) { if (r.tier >= 7) return 1; const lo = r.tier ? C.invcdf(TIER_P[r.tier - 1]) : C.invcdf(0.005), hi = C.invcdf(TIER_P[r.tier]); return C.clamp((C.invcdf(r.p) - lo) / (hi - lo), 0, 1); }

/* ---------- SETTINGS ---------- */
function screenSettings(M) {
  const p = S.profile; let h = `<header class="hdr"><h1>${t('tab.settings')}</h1></header>`;
  h += card(t('set.profile'), `<div class="g2">${field(t('set.language'), selIn('profile.lang', p.lang, [['en', 'English'], ['fr', 'Français']]))}${field(t('set.units'), selIn('profile.units', p.units, [['metric', t('units.metric')], ['imperial', t('units.imperial')]]))}${field(t('ob.name'), `<input type="text" data-bind="profile.name" value="${esc(p.name)}">`)}${field(t('sex.m') + ' / ' + t('sex.f'), selIn('profile.sex', p.sex || '', [['', '–'], ['m', t('sex.m')], ['f', t('sex.f')]]))}${field(t('ob.dob'), `<input type="date" data-bind="profile.dob" value="${p.dob || ''}">`)}${field(`${t('ob.height')} (${cmU()})`, numIn('profile.cm', r1(cmShow(p.cm)), { conv: 'cm' }))}</div>${chk('profile.calm', p.calm, t('set.calm'))}<p class="muted xs">${t('set.calmHint')}</p>`);
  h += card(t('set.sync'), `<p class="muted">${t('set.syncLead')}</p><table class="tbl srcmap"><tbody><tr><th>${t('set.syncYes')}</th><td>${t('set.syncYesList')}</td></tr><tr><th>${t('set.syncNo')}</th><td>${t('set.syncNoList')}</td></tr></tbody></table>${chk('meta.syncConsent', S.meta.syncConsent, t('set.syncConsent'))}<p id="syncStatus" class="chip">${t('set.syncOff')}</p><div class="row wrap"><button class="btn pri" data-act="signin"${S.meta.syncConsent ? '' : ' disabled'}>${t('set.signIn')}</button><button class="btn ghost" data-act="signup"${S.meta.syncConsent ? '' : ' disabled'}>${t('set.signUp')}</button><button class="btn ghost" data-act="signout">${t('set.signOut')}</button></div><p class="muted xs">${t('set.syncDelete')}</p>`);
  { const k28 = Object.entries(M.L).filter(([d, v]) => d > C.addDays(C.today(), -28) && v.kcal && v._s?.kcal !== 'manual').map(([d]) => d).sort();
    h += card(t('set.mfp'), `<p class="muted">${t('set.mfpLead')}</p><ol class="guide">${t('set.mfpSteps').map(s => `<li>${esc(s)}</li>`).join('')}</ol><p class="chip ${k28.length >= 20 ? 'ok' : ''}">${k28.length ? t('set.mfpStatus', { n: k28.length, d: df(k28[k28.length - 1]) }) : t('set.mfpNone')}</p>`, 'mfp'); }
  h += card(t('set.health'), `<p class="muted">${t('set.healthLead')}</p>${S.health.last ? `<p class="xs muted">${t('set.hLast', { d: df(S.health.last) })}</p>` : ''}
    <h3>${t('set.hQuick')}</h3><p class="muted">${t('set.hQuickLead')}</p>${how(t('set.guide'), `<ol class="guide">${t('set.guideSteps').map(s => `<li>${esc(s).replace(/\n/g, '<br>')}</li>`).join('')}</ol><p class="muted xs">${t('set.guideNote')}</p>${M.src === 'renpho' ? `<p class="muted xs">${t('set.guideRenpho')}</p>` : ''}`)}<div class="row wrap"><button class="btn ghost" data-act="paste">${t('set.hPaste')}</button><button class="btn ghost" data-act="pastebox">${t('set.hPasteBox')}</button></div>
    <h3>${t('set.hFull')}</h3><p class="muted">${t('set.hFullLead')}</p><label class="btn pri file">${t('set.hChoose')}<input type="file" id="hkfile" accept=".zip,.xml,.txt,application/zip,text/xml,text/plain" hidden></label><p id="hkprog" class="muted"></p>`);
  h += renphoCard(M);
  h += card(t('set.data'), `<div class="row wrap"><button class="btn ghost" data-act="export">${t('set.export')}</button><label class="btn ghost file">${t('set.import')}<input type="file" id="bkfile" accept=".json,application/json" hidden></label><button class="btn danger" data-act="wipe">${t('set.wipe')}</button></div>`);
  h += card(t('set.safety'), `${chk('safety.under18', S.safety.under18, t('ob.s_under18'))}${chk('safety.preg', S.safety.preg, t('ob.s_preg'))}${chk('safety.ed', S.safety.ed, t('ob.s_ed'))}${chk('safety.med', S.safety.med, t('ob.s_med'))}<h3>${t('set.helpTitle')}</h3><p>${HELPLINES.de.name}: <a href="tel:+49221892031">${HELPLINES.de.phone}</a> (${HELPLINES.de.hours}) · <a href="${HELPLINES.de.url}" target="_blank" rel="noopener">${HELPLINES.de.url.replace('https://', '')}</a></p><p>${HELPLINES.fr.name}: <a href="${HELPLINES.fr.url}" target="_blank" rel="noopener">${HELPLINES.fr.url.replace('https://www.', '')}</a></p>`);
  h += card(t('set.sources'), `<ul class="src">${Object.values(SOURCES).map(s => `<li><b>${s.url ? `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)}</a>` : esc(s.name)}</b>${s.pop ? `<span>${esc(s.pop[getLang()] || s.pop.en)}</span>` : ''}${s.conf ? confChip(s.conf) : ''}</li>`).join('')}</ul><p class="muted xs">${t('set.dataVer', { v: DATA_VERSION })}</p>`);
  h += card(t('set.about'), `<p class="muted">${t('set.disclaimer')}</p><p class="muted xs">Forge ${VERSION}</p><button class="lnk" data-act="whatsnew">${t('new.title')}</button>`);
  return h;
}

/* ---------- onboarding ---------- */
function screenOnboarding() {
  const p = S.profile, n = ob.step, total = 5, a = S.activity;
  const steps = [
    () => `<div class="brand"><div class="logo">F</div><h1>${t('app')}</h1><p>${t('tag')}</p></div>${field(t('set.language'), selIn('profile.lang', p.lang, [['en', 'English'], ['fr', 'Français']]))}${field(t('set.units'), selIn('profile.units', p.units, [['metric', t('units.metric')], ['imperial', t('units.imperial')]]))}<button class="btn pri big" data-act="obnext">${t('ob.start')}</button><label class="lnk file">${t('ob.restore')}<input type="file" id="bkfile" accept=".json,application/json" hidden></label>`,
    () => `<h2>${t('ob.you')}</h2>${field(t('ob.name') + ` <i>(${t('common.optional')})</i>`, `<input type="text" data-bind="profile.name" value="${esc(p.name)}">`)}${field(t('sex.m') + ' / ' + t('sex.f'), `<div class="seg">${['m', 'f'].map(s => `<button data-act="sex" data-s="${s}" class="${p.sex === s ? 'on' : ''}">${t('sex.' + s)}</button>`).join('')}</div>`, t('sex.why'))}${field(t('ob.dob'), `<input type="date" data-bind="profile.dob" value="${p.dob || ''}">`)}<div class="g2">${field(`${t('ob.height')} (${cmU()})`, numIn('profile.cm', r1(cmShow(p.cm)), { conv: 'cm' }))}${field(`${t('ob.weight')} (${kgU()})`, numIn('logtoday.w', r1(kgShow(S.logs[C.today()]?.w)), { conv: 'kg' }))}</div>`,
    () => `<h2>${t('ob.safety')}</h2><p class="muted">${t('ob.safetyLead')}</p>${chk('safety.under18', S.safety.under18, t('ob.s_under18'))}${chk('safety.preg', S.safety.preg, t('ob.s_preg'))}${chk('safety.ed', S.safety.ed, t('ob.s_ed'))}${chk('safety.med', S.safety.med, t('ob.s_med'))}`,
    () => `<h2>${t('ob.week')}</h2><p class="muted">${t('ob.weekLead')}</p>${field(t('ob.steps'), numIn('activity.stepsAvg', a.stepsAvg, { step: 100 }), t('ob.stepsHint'))}<div class="g2">${field(t('ob.occupation'), selIn('activity.occupation', a.occupation, ['desk', 'mixed', 'standing', 'manual'].map(k => [k, t('ob.occ.' + k)])))}${field(t('ob.sleep'), numIn('activity.sleepH', a.sleepH, { step: 0.5 }))}</div>${field(t('ob.years'), numIn('activity.years', a.years, { step: 0.5 }))}<h3>${t('ob.workouts')}</h3>${workoutsEditor()}`,
    () => `<h2>${t('ob.bfTitle')}</h2><p class="muted">${t('ob.bfLead')}</p>${S.safety.ed ? '' : field(t('ob.bfNow') + ' (%)', numIn('profile.bfSelf', p.bfSelf, { step: 0.5 }))}`
  ];
  const err = ob.err ? `<p class="err">${esc(ob.err)}</p>` : '';
  return `<div class="obw">${n ? `<p class="eyebrow">${t('ob.step', { n, m: total - 1 })}</p>` : ''}${steps[n]()}${err}${n ? `<div class="row"><button class="btn ghost" data-act="obback">${t('common.back')}</button><button class="btn pri" data-act="obnext">${n === total - 1 ? t('ob.finish') : t('common.next')}</button></div>` : ''}</div>`;
}

/* ---------- Renpho ---------- */
function rpBmr() {
  const st = renphoStats(S.renpho.rows); const b = st?.latest?.bmr;
  return b ? `<dd class="sub">${t('fuel.rpBmr', { v: nf(b), d: df(st.last, { day: 'numeric', month: 'short' }) })}</dd>` : '';
}
function heightNote() {
  const h = S.renpho.height, cm = S.profile.cm;
  return h && cm && Math.abs(h - cm) >= 1.5 ? `<p class="flagline">${t('set.rpHeight', { r: nf(h), f: nf(cm) })}</p>` : '';
}
function renphoCard(M) {
  const R = S.renpho, keys = Object.keys(R.rows || {}).sort();
  const status = keys.length ? `<p class="chip ${R.imported && C.dayNum(C.today()) - C.dayNum(R.imported) <= 7 ? 'ok' : ''}">${t('set.rpStatus', { n: keys.length, a: df(keys[0], { day: 'numeric', month: 'short' }), b: df(keys[keys.length - 1]), d: df(R.imported) })}</p>` : `<p class="chip">${t('set.rpNone')}</p>`;
  const rule = `<table class="tbl srcmap"><tbody><tr><th>${t('set.rpFromR')}</th><td>${t('set.rpFromRList')}</td></tr><tr><th>${t('set.rpFromH')}</th><td>${t('set.rpFromHList')}</td></tr><tr><th>${t('set.rpFromM')}</th><td>${t('set.rpFromMList')}</td></tr></tbody></table>`;
  return card(t('set.rp'), `<p class="muted">${t('set.rpLead')}</p>${how(t('set.rpHow'), `<ol class="guide">${t('set.rpSteps').map(x => `<li>${esc(x)}</li>`).join('')}</ol>`)}
    <label class="btn pri file">${t('set.rpChoose')}<input type="file" id="rpfile" accept=".csv,text/csv,text/comma-separated-values" hidden></label>${status}${heightNote()}
    ${field(t('set.rpSource'), selIn('body.source', S.body.source || 'auto', [['auto', t('set.rpSrc.auto')], ['renpho', t('set.rpSrc.renpho')], ['health', t('set.rpSrc.health')]]), t('set.rpNow', { s: t('set.rpSrc.' + M.src) }))}
    ${M.src === 'renpho' ? rule : ''}${keys.length ? `<button class="lnk danger" data-act="rpclear">${t('set.rpClear')}</button>` : ''}`);
}
async function importRenpho(file) {
  try {
    const parsed = parseRenphoCsv(await file.text());
    S.renpho.rows = mergeRenpho(S.renpho, parsed);
    Object.assign(S.renpho, { imported: C.today(), file: file.name, height: parsed.heightCm ? Math.round(parsed.heightCm * 10) / 10 : S.renpho.height });
    save(); render();
    toast(t('set.rpDone', { n: parsed.days, r: parsed.readings }) + (parsed.dupes ? ' ' + t('set.rpDupes', { d: parsed.dupes }) : ''));
  } catch (e) { toast(t('set.rpErr.' + (e.code || 'other'))); }
}
function smartScaleCard() {
  const st = renphoStats(S.renpho.rows); if (!st) return '';
  const L = st.latest, P = st.prev, kg = v => `${nf(kgShow(v), 1)} ${kgU()}`, kg2 = v => `${nf(kgShow(v), 2)} ${kgU()}`, pct = v => `${nf(v, 1)} %`;
  const rows = [['w', 'today.weight', kg2], ['bf', 'phys.rp.bfTotal', pct], ['fm', 'phys.rp.fm', kg], ['ffm', 'phys.rp.ffm', kg], ['sm', 'phys.rp.sm', kg], ['mus', 'phys.rp.mus', kg], ['waterPct', 'phys.rp.water', pct], ['bone', 'phys.rp.bone', kg], ['protPct', 'phys.rp.prot', pct], ['bmr', 'phys.rp.bmr', v => nf(v) + ' kcal'], ['mage', 'phys.rp.mage', v => nf(v)]]
    .filter(([k]) => L[k] != null);
  const dec = { w: 2, vis: 0, bmr: 0, mage: 0 };
  const delta = (k, f) => { if (!P || P[k] == null) return '–'; const step = 10 ** -(dec[k] ?? 1), d = Math.round((L[k] - P[k]) / step) * step; if (Math.abs(d) < step / 2) return '0'; return (d > 0 ? '+' : '−') + f(Math.abs(d)); };
  // headline: subcutaneous fat (the visible part) with its change and its fixed share of total body fat
  let head = '';
  if (L.subq != null) {
    const ks = Object.keys(S.renpho.rows).filter(d => C.dayNum(d) >= C.dayNum(st.last) - 90 && S.renpho.rows[d].subq != null && S.renpho.rows[d].bf > 0);
    const rs = ks.map(d => S.renpho.rows[d].subq / S.renpho.rows[d].bf), share = rs.length >= 8 && Math.max(...rs) - Math.min(...rs) < 0.03 ? C.mean(rs) : null;
    head = `<p class="eyebrow">${t('phys.rp.subqHead')}</p><div class="kpi">${nf(L.subq, 1)}<small> %</small></div>${P?.subq != null ? `<p class="muted">${delta('subq', pct) === '0' ? t('phys.rp.same') : delta('subq', pct)} ${t('phys.rp.change', { d: df(st.ref, { day: 'numeric', month: 'short' }) })}</p>` : ''}<p class="muted xs">${t('phys.rp.subqLead')}${share ? ' ' + t('phys.rp.subqShare', { k: nf(share * 100) }) : ''}</p>`;
  }
  const cal = dxaCalibration(S.renpho.rows, S.scans);
  const calLine = cal ? `<p class="tip">${t('phys.rp.calOn', { d: df(cal.dxaDate), r: nf(cal.renphoBf, 1), x: nf(cal.dxaBf, 1), o: (cal.offset > 0 ? '+' : '−') + nf(Math.abs(cal.offset), 1) })}</p>` : `<p class="muted xs">${t('phys.rp.calOff')}</p>`;
  let note = '';
  if (st.rWeightFat != null && st.rWeightFat > 0.9) note = `<p class="tip">${t('phys.rp.lockstep', { r: nf(st.rWeightFat, 2), f: nf(st.fatPerKg, 2), l: nf(st.lostSplit, 2) })}</p>`;
  return card(t('phys.rp.title'), `<p class="muted xs">${t('phys.rp.lead', { d: df(st.last), t: esc((L.t || '').slice(0, 5)) })}</p>${head}<table class="tbl"><thead><tr><th></th><th>${t('phys.rp.latest')}</th><th>${P ? t('phys.rp.change', { d: df(st.ref, { day: 'numeric', month: 'short' }) }) : ''}</th></tr></thead><tbody>${rows.map(([k, lbl, f]) => `<tr><td>${t(lbl)}</td><td>${f(L[k])}</td><td>${delta(k, f)}</td></tr>`).join('')}</tbody></table>${calLine}${note}${heightNote()}<p class="muted xs">${t('phys.rp.caveat')}</p>`);
}

/* ---------- sheets ---------- */
function sheet(html, mount) {
  const d = $('#sheet'); d.innerHTML = `<form method="dialog" class="sh">${html}</form>`; d.showModal();
  d.querySelectorAll('[data-close]').forEach(b => b.onclick = e => { e.preventDefault(); d.close(); });
  if (mount) mount(d); a11y(d); return d;
}
const fv = (f, k) => { const v = f.elements[k]?.value; return v === '' || v == null ? null : v; };
function logSheet(date) {
  const v = S.logs[date] || {}, M0 = model(), rp = M0.L[date]?._s?.w === 'renpho';
  sheet(`<h2>${t('fuel.addEntry')}</h2>${field(t('common.date'), `<input type="date" name="d" value="${date}">`)}<div class="g2">${rp ? field(`${t('today.weight')} (${kgU()})`, `<input type="number" name="w" value="${r1(kgShow(M0.L[date].w))}" disabled>`, t('fuel.rpLocked')) : field(`${t('today.weight')} (${kgU()})`, `<input type="number" step="any" inputmode="decimal" name="w" value="${r1(kgShow(v.w))}">`)}${field('kcal', `<input type="number" inputmode="numeric" name="kcal" value="${v.kcal ?? ''}">`)}${field(t('fuel.protein'), `<input type="number" step="any" name="p" value="${v.p ?? ''}">`)}${field(t('fuel.carbs'), `<input type="number" step="any" name="c" value="${v.c ?? ''}">`)}${field(t('fuel.fat'), `<input type="number" step="any" name="f" value="${v.f ?? ''}">`)}${field(t('fuel.steps'), `<input type="number" name="steps" value="${v.steps ?? ''}">`)}</div><div class="row"><button class="btn ghost" data-close>${t('common.cancel')}</button><button class="btn pri" data-save>${t('common.save')}</button></div>`, d => {
    d.querySelector('[data-save]').onclick = e => { e.preventDefault(); const f = d.querySelector('form'); const date2 = fv(f, 'd') || date; const n = k => fv(f, k) == null ? '' : +fv(f, k); logDay(date2, { ...(rp ? {} : { w: fv(f, 'w') == null ? '' : kgRead(fv(f, 'w')) }), kcal: n('kcal'), p: n('p'), c: n('c'), f: n('f'), steps: n('steps') }); save(); d.close(); render(); toast(t('common.saved')); };
  });
}
function tapeSheet(id) {
  const x = S.tapes.find(y => y.id === id) || { date: C.today() };
  const inp = k => field(`${t('phys.' + k)} (${cmU()})`, `<input type="number" step="any" inputmode="decimal" name="${k}" value="${r1(cmShow(x[k]))}">`);
  sheet(`<h2>${t('phys.tapeAdd')}</h2>${field(t('common.date'), `<input type="date" name="date" value="${x.date}">`)}<div class="g2">${['neck', 'waist', 'hip', 'chest', 'arm', 'thigh', 'calf'].map(inp).join('')}</div><div class="row">${id ? `<button class="btn danger" data-del>${t('common.del')}</button>` : ''}<button class="btn ghost" data-close>${t('common.cancel')}</button><button class="btn pri" data-save>${t('common.save')}</button></div>`, d => {
    const f = d.querySelector('form');
    d.querySelector('[data-save]').onclick = e => { e.preventDefault(); const o = { id: x.id || uid(), date: fv(f, 'date') || C.today() }; for (const k of ['neck', 'waist', 'hip', 'chest', 'arm', 'thigh', 'calf']) { const v = fv(f, k); if (v != null) o[k] = cmRead(v); } upsert('tapes', o); d.close(); render(); toast(t('common.saved')); };
    d.querySelector('[data-del]')?.addEventListener('click', e => { e.preventDefault(); if (confirm(t('common.confirmDel'))) { remove('tapes', id); d.close(); render(); } });
  });
}
function scanSheet(id) {
  const x = S.scans.find(y => y.id === id) || { date: C.today(), method: 'dxa' };
  const kgF = (k, lbl) => field(`${lbl} (${kgU()})`, `<input type="number" step="any" name="${k}" value="${r1(kgShow(x[k]))}">`);
  sheet(`<h2>${t('phys.scanAdd')}</h2><div class="g2">${field(t('common.date'), `<input type="date" name="date" value="${x.date}">`)}${field(t('phys.scanMethod'), `<select name="method">${['dxa', 'bodpod', 'bia_pro', 'bia'].map(m => `<option value="${m}"${m === x.method ? ' selected' : ''}>${t('phys.m.' + m)}</option>`).join('')}</select>`)}${field(t('phys.fatPct'), `<input type="number" step="any" name="bf" value="${x.bf ?? ''}">`)}${kgF('weight', t('today.weight'))}${kgF('lean', t('phys.lean').replace(' (kg)', ''))}${kgF('bmc', t('phys.bmc').replace(' (kg)', ''))}${kgF('alm', t('phys.alm').replace(' (kg)', ''))}${field(t('phys.vat'), `<input type="number" step="any" name="vat" value="${x.vat ?? ''}">`)}</div><div class="row">${id ? `<button class="btn danger" data-del>${t('common.del')}</button>` : ''}<button class="btn ghost" data-close>${t('common.cancel')}</button><button class="btn pri" data-save>${t('common.save')}</button></div>`, d => {
    const f = d.querySelector('form');
    d.querySelector('[data-save]').onclick = e => { e.preventDefault(); const o = { ...x, id: x.id || uid(), date: fv(f, 'date'), method: fv(f, 'method'), bf: fv(f, 'bf') == null ? null : +fv(f, 'bf'), vat: fv(f, 'vat') == null ? null : +fv(f, 'vat') }; for (const k of ['weight', 'lean', 'bmc', 'alm']) o[k] = fv(f, k) == null ? null : kgRead(fv(f, k)); upsert('scans', o); d.close(); render(); toast(t('common.saved')); };
    d.querySelector('[data-del]')?.addEventListener('click', e => { e.preventDefault(); if (confirm(t('common.confirmDel'))) { remove('scans', id); d.close(); render(); } });
  });
}
function prSheet(eventId, dom) {
  const ids = eventId ? [eventId] : (EVENT_GROUPS[dom] || Object.keys(EVENTS));
  const ev0 = ids[0];
  const body = id => {
    const k = EVENTS[id].kind;
    if (k === 'lift') return `<div class="g3">${field(`${t('arena.weightKg')} (${kgU()})`, `<input type="number" step="any" name="weight" required>`)}${field(t('arena.reps'), `<input type="number" name="reps" value="1" min="1" max="20">`)}${field(t('arena.rir'), `<input type="number" name="rir" value="0" min="0" max="5">`)}</div>${field(`${t('arena.bwThen')} (${kgU()})`, `<input type="number" step="any" name="bw" value="${r1(kgShow(model().kg))}">`)}`;
    if (k === 'sprint') return `${field(t('arena.time'), `<input type="text" inputmode="decimal" name="time" placeholder="12.34" required>`)}<div class="g2">${field(t('arena.timing'), `<select name="timing">${['electronic', 'hand', 'gps'].map(x => `<option value="${x}">${t('arena.t.' + x)}</option>`).join('')}</select>`)}${field(t('arena.wind'), `<input type="number" step="any" name="wind">`)}</div>`;
    if (k === 'row') return field(t('arena.time'), `<input type="text" inputmode="decimal" name="time" placeholder="${id === 'row500' ? '1:32.0' : '17.5'}" required>`);
    if (k === 'rowtime') return field(t('arena.meters'), `<input type="number" name="meters" required>`);
    if (k === 'erg' && id === 'bike1000') return `<div class="g2">${field(t('arena.avgW'), `<input type="number" inputmode="numeric" name="watts" min="60" max="2600" placeholder="420" required>`)}${field(t('arena.dur'), `<input type="text" inputmode="decimal" name="dur" placeholder="1:40" required>`)}</div><p class="xs muted" id="wbOut">${t('arena.wbHow')}</p>`;
    if (k === 'erg') return field(t('arena.time'), `<input type="text" inputmode="decimal" name="time" placeholder="1:45.0" required>`);
    if (k === 'race') return field(t('arena.timeLong'), `<input type="text" inputmode="decimal" name="time" placeholder="${id === 'run5k' ? '22:30' : '47:00'}" required>`);
    if (k === 'jump') return `${field(`${t('arena.cm')} (${cmU()})`, `<input type="number" step="any" inputmode="decimal" name="cm" required>`)}${field(t('arena.jumpMethod'), `<select name="method">${['mat', 'reach'].map(x => `<option value="${x}">${t('arena.jm.' + x)}</option>`).join('')}</select>`)}<p class="xs muted">${t('arena.jumpHow')}</p>`;
    if (k === 'ljump') return `${field(`${t('arena.dist')} (${cmU()})`, `<input type="number" step="any" inputmode="decimal" name="cm" required>`)}<p class="xs muted">${t('arena.how.sljump')}</p>`;
    if (id === 'wb6') return `<div class="g2">${field(t('arena.peakW'), `<input type="number" inputmode="numeric" name="watts" min="100" max="2700" required>`)}${field(`${t('arena.bwThen')} (${kgU()})`, `<input type="number" step="any" name="bw" value="${r1(kgShow(model().kg))}">`)}</div><p class="xs muted">${t('arena.how.wb6')}</p>`;
    if (id === 'mbthrow') return `<div class="g2">${field(t('arena.distM'), `<input type="number" step="any" inputmode="decimal" name="meters" placeholder="4.80" required>`)}${field(t('arena.ball'), `<select name="ball">${[2, 3, 4, 5].map(x => `<option value="${x}"${x === (model().who.sex === 'm' ? 4 : 3) ? ' selected' : ''}>${x} kg</option>`).join('')}</select>`)}</div><p class="xs muted">${t('arena.how.mbthrow')}</p>`;
    if (k === 'reps') return `<div class="g2">${field(t('arena.repsMax'), `<input type="number" inputmode="numeric" name="reps" min="1" required>`)}${field(`${t('arena.bwThen')} (${kgU()})`, `<input type="number" step="any" name="bw" value="${r1(kgShow(model().kg))}">`)}</div><p class="xs muted">${t('arena.repsHow.' + id)}</p>`;
    return `${field(t('arena.method'), `<select name="method">${['lab', 'cycle', 'watch', 'cooper'].map(x => `<option value="${x}">${t('arena.vm.' + x)}</option>`).join('')}</select>`)}<div class="g2">${field(t('arena.value'), `<input type="number" step="any" name="value">`)}${field(t('arena.cooperM'), `<input type="number" name="meters">`)}</div>`;
  };
  sheet(`<h2>${t('arena.add')}</h2>${field(t('arena.event'), `<select name="event">${ids.map(id => `<option value="${id}">${t('arena.ev.' + id)}</option>`).join('')}</select>`)}<div id="prbody">${body(ev0)}</div>${field(t('common.date'), `<input type="date" name="date" value="${C.today()}">`)}<div class="row"><button class="btn ghost" data-close>${t('common.cancel')}</button><button class="btn pri" data-save>${t('common.save')}</button></div>`, d => {
    const f = d.querySelector('form');
    const wire = () => {
      const pb = $('#prbody', d), out = $('#wbOut', d);
      if (out) { const upd = () => { const w = +fv(f, 'watts'), du = parseTime(fv(f, 'dur')), q = C.wattbikeEquiv(w, du); out.textContent = q ? t(q.ratio < 0.75 || q.ratio > 1.33 ? 'arena.wbFar' : 'arena.wbEq', { t: fmtTime(q.time), w: nf(Math.round(q.watts1k)), wkg: nf(q.watts1k / model().kg, 1) }) : t('arena.wbHow'); }; f.elements.watts.oninput = upd; f.elements.dur.oninput = upd; }
    };
    wire();
    f.elements.event.onchange = () => { $('#prbody', d).innerHTML = body(f.elements.event.value); wire(); };
    d.querySelector('[data-save]').onclick = e => {
      e.preventDefault(); const id = fv(f, 'event'), k = EVENTS[id].kind, pr = { id: uid(), event: id, date: fv(f, 'date') || C.today() };
      if (k === 'lift') Object.assign(pr, { weight: kgRead(fv(f, 'weight')), reps: +fv(f, 'reps') || 1, rir: +fv(f, 'rir') || 0, bw: kgRead(fv(f, 'bw')) });
      else if (k === 'sprint') Object.assign(pr, { time: parseTime(fv(f, 'time')), timing: fv(f, 'timing'), wind: fv(f, 'wind') == null ? null : +fv(f, 'wind') });
      else if (id === 'bike1000') Object.assign(pr, { machine: 'wattbike', watts: +fv(f, 'watts'), dur: parseTime(fv(f, 'dur')) });
      else if (k === 'row' || k === 'erg' || k === 'race') pr.time = parseTime(fv(f, 'time'));
      else if (k === 'jump') Object.assign(pr, { cm: cmRead(fv(f, 'cm')), method: fv(f, 'method') });
      else if (k === 'ljump') pr.cm = cmRead(fv(f, 'cm'));
      else if (id === 'wb6') Object.assign(pr, { watts: +fv(f, 'watts'), bw: kgRead(fv(f, 'bw')) });
      else if (id === 'mbthrow') Object.assign(pr, { meters: +String(fv(f, 'meters') ?? '').replace(',', '.'), ball: +fv(f, 'ball') });
      else if (k === 'reps') Object.assign(pr, { reps: +fv(f, 'reps'), bw: kgRead(fv(f, 'bw')) });
      else if (k === 'rowtime') pr.meters = +fv(f, 'meters');
      else Object.assign(pr, { method: fv(f, 'method'), value: fv(f, 'value') == null ? null : +fv(f, 'value'), meters: fv(f, 'meters') == null ? null : +fv(f, 'meters') });
      const r = C.prValue(pr); if (!(r.value > 0)) { toast(t('arena.badEntry')); return; }
      if (!C.plausible(pr, model().who.sex)) { toast(t('arena.implausible')); return; }
      const who = model().who, before = model().ar?.best[id]?.r.tier ?? -1, now = C.evaluatePR(pr, who);
      upsert('prs', pr); d.close(); render();
      if (now.rankable && now.tier > before) levelUp(id, now, before); else toast(t('common.saved'));
    };
  });
}
function trackSheet(id) {
  const M = model(), who = M.who, src = SOURCES[EVENTS[id].src], b = C.trackBest(S.prs, id);
  const prs = S.prs.filter(p => p.event === id).sort((a, b) => a.date < b.date ? 1 : -1);
  sheet(`<h2>${t('arena.ev.' + id)}</h2><p><span class="chip">${t('arena.tracked')}</span></p><p class="muted">${t('arena.trackWhy')}</p>
    <h3>${t('arena.protocol')}</h3><p>${t('arena.how.' + id)}</p>
    <h3>${t('arena.history')}</h3>${prs.length ? `<ul class="hist">${prs.map(p => { const v = C.prValue(p).value; return `<li><span>${df(p.date)}</span><b>${fmtVal(id, v)}</b>${b && p.id === b.pr.id ? `<span class="chip ok">${t('arena.best')}</span>` : ''}<small>${id === 'wb6' ? `${nf(v / (+p.bw || who.kg), 1)} W/kg` : t('arena.ballN', { kg: nf(+p.ball || 0) })}</small><button class="lnk danger x" data-delpr="${p.id}" aria-label="${t('common.del')}">×</button></li>`; }).join('')}</ul>` : `<p class="muted">${t('arena.none')}</p>`}
    <h3>${t('arena.improveTrack')}</h3><ul>${t('arena.tips.' + id).map(s => `<li>${esc(s)}</li>`).join('')}</ul>
    <p class="xs muted">${t('common.source')}: ${src.url ? `<a href="${src.url}" target="_blank" rel="noopener">${esc(src.name)}</a>` : esc(src.name)}. ${esc(src.pop?.[getLang()] || '')}</p>
    <div class="row"><button class="btn ghost" data-close>${t('common.close')}</button><button class="btn pri" data-addpr>${t('arena.add')}</button></div>`, d => {
    d.querySelectorAll('[data-delpr]').forEach(x => x.onclick = e => { e.preventDefault(); if (confirm(t('common.confirmDel'))) { remove('prs', x.dataset.delpr); d.close(); render(); } });
    d.querySelector('[data-addpr]').onclick = e => { e.preventDefault(); d.close(); prSheet(id); };
  });
}
function eventSheet(id) {
  if (EVENTS[id].kind === 'track') return trackSheet(id);
  const M = model(), who = M.who, an = C.anchorsFor(id, { sex: who.sex, bw: who.kg, age: who.age }), ev = EVENTS[id], src = SOURCES[ev.src];
  const rows = TIERS.map((_, i) => { const v = i === 0 ? null : an.dec(C.valueAtP(TIER_P[i - 1], an.A)); return `<tr><td>${tierBadge(i)}</td><td>${v == null ? '–' : (id === 'bike1000' ? `≥ ${fmtVal(id, v)}<br><small class="muted">${t('arena.wbFor', { t: fmtTime(v) })}</small>` : (an.lowerBetter ? '≤ ' : '≥ ') + fmtVal(id, v))}</td><td class="muted">${t(ev.kind === 'sprint' ? 'tier.ffa' : 'tier.band')[i]}</td></tr>`; }).reverse().join('');
  const prs = S.prs.filter(p => p.event === id).sort((a, b) => a.date < b.date ? 1 : -1);
  const tipKey = { lift: 'lift', sprint: 'sprint', vo2: 'vo2', race: 'vo2', jump: 'jump', ljump: 'ljump', reps: 'reps', erg: 'erg' }[ev.kind] || 'row', tipK = id === 'bike1000' ? 'wattbike' : tipKey;
  sheet(`<h2>${t('arena.ev.' + id)}</h2><h3>${t('arena.standards')}</h3><p class="muted xs">${ev.kind === 'lift' || ev.kind === 'reps' ? `${t('arena.bwThen')}: ${nf(kgShow(who.kg), 1)} ${kgU()}, ` : ''}${t('sex.' + who.sex)}${['vo2', 'sprint', 'jump', 'ljump', 'race'].includes(ev.kind) ? `, ${t('arena.ageN', { a: who.age })}` : ''}${ev.kind === 'sprint' && an.factor < 0.9995 ? `. ${t('arena.ffaStd', { k: nf(an.factor, 4) })}` : ''}</p>${id === 'bike1000' ? `<p class="xs muted">${t('arena.wbStd')}</p>` : ''}${ev.low ? `<p class="xs muted">${t('arena.lowStd')}</p>` : ''}${ev.kind === 'ljump' ? `<p class="xs muted">${t('arena.how.sljump')}</p>` : ''}<table class="tbl std">${rows}</table>
    <h3>${t('arena.history')}</h3>${prs.length ? `<ul class="hist">${prs.map(p => { const r = C.evaluatePR(p, who); return `<li><span>${df(p.date)}</span><b>${r.value ? fmtVal(id, r.value) : '–'}</b>${r.rankable ? tierBadge(r.tier) : ''}${r.level ? `<span class="lvl">FFA ${r.level}</span>` : ''}${r.note ? `<small>${p.machine === 'wattbike' ? `${t('arena.wbDid', { w: nf(p.watts), t: fmtTime(p.dur) })} · ` : ''}${t('arena.note.' + r.note, { t: fmtTime(r.value), w: fmtVal(id, r.value) })}</small>` : r.est ? `<small>${t('arena.note.est')}</small>` : ''}<button class="lnk danger x" data-delpr="${p.id}" aria-label="${t('common.del')}">×</button></li>`; }).join('')}</ul>` : `<p class="muted">${t('arena.none')}</p>`}
    <h3>${t('arena.improve')}</h3><ul>${t('arena.tips.' + tipK).map(s => `<li>${esc(s)}</li>`).join('')}</ul>
    <p class="xs muted">${t('common.source')}: ${src.url ? `<a href="${src.url}" target="_blank" rel="noopener">${esc(src.name)}</a>` : esc(src.name)}${ev.kind === 'sprint' ? `, <a href="${SOURCES.wma.url}" target="_blank" rel="noopener">${esc(SOURCES.wma.name)}</a>` : ''}. ${esc(src.pop?.[getLang()] || '')} ${confChip(src.conf)}${ev.src === 'c2m' ? ' · ' + t('arena.note.modelled') : ''}${an.clampedBw ? ' · ' + t('arena.note.clampedBw') : ''}</p>
    <div class="row"><button class="btn ghost" data-close>${t('common.close')}</button><button class="btn pri" data-addpr>${t('arena.add')}</button></div>`, d => {
    d.querySelectorAll('[data-delpr]').forEach(b => b.onclick = e => { e.preventDefault(); if (confirm(t('common.confirmDel'))) { remove('prs', b.dataset.delpr); d.close(); render(); } });
    d.querySelector('[data-addpr]').onclick = e => { e.preventDefault(); d.close(); prSheet(id); };
  });
}
async function photoUrl(key) { if (ui.photoUrls[key]) return ui.photoUrls[key]; const b = await getPhoto(key).catch(() => null); if (!b) return null; return ui.photoUrls[key] = URL.createObjectURL(b); }
function photoNewSheet() {
  const id = uid();
  sheet(`<h2>${t('phys.photoNew')}</h2><p class="muted xs">${t('phys.photoOnDevice')}</p>${field(t('common.date'), `<input type="date" name="date" value="${C.today()}">`)}<div class="pick">${['front', 'side', 'back'].map(k => `<label class="pk"><input type="file" accept="image/*" capture="environment" name="${k}" hidden><span class="pv" data-pv="${k}">${poseSvg(k)}</span><b>${t('phys.' + k)}</b></label>`).join('')}</div><div class="row"><button class="btn ghost" data-close>${t('common.cancel')}</button><button class="btn pri" data-save>${t('common.save')}</button></div>`, d => {
    const f = d.querySelector('form');
    f.querySelectorAll('input[type=file]').forEach(inp => inp.onchange = () => { const file = inp.files[0]; if (file) d.querySelector(`[data-pv="${inp.name}"]`).innerHTML = `<img src="${URL.createObjectURL(file)}" alt="">`; });
    d.querySelector('[data-save]').onclick = async e => {
      e.preventDefault(); const poses = [];
      for (const k of ['front', 'side', 'back']) { const file = f.elements[k].files[0]; if (file) { await storeImage(`${id}:${k}`, file); poses.push(k); } }
      if (!poses.length) { d.close(); return; }
      upsert('photos', { id, date: fv(f, 'date') || C.today(), poses }); d.close(); render(); photoSheet(id);
    };
  });
}
async function photoSheet(id) {
  const ph = S.photos.find(x => x.id === id); if (!ph) return;
  const urls = {}; for (const k of ph.poses || []) urls[k] = await photoUrl(`${id}:${k}`);
  const others = S.photos.filter(x => x.id !== id).sort((a, b) => a.date < b.date ? 1 : -1);
  const res = ph.result;
  sheet(`<h2>${df(ph.date)}${ph.ref ? ` · ${esc(ph.ref)}` : ''}</h2><div class="phs">${(ph.poses || []).map(k => urls[k] ? `<figure><img src="${urls[k]}" alt=""><figcaption>${t('phys.' + k)}</figcaption></figure>` : `<figure class="miss"><span>${t('phys.photoElsewhere')}</span></figure>`).join('')}</div>
    ${res ? `<p>${t('phys.measured', { u: cmU(), w: nf(cmShow(res.cm.waist), 1), n: nf(cmShow(res.cm.neck), 1), h: S.profile.sex === 'f' ? `, ${t('phys.hip').split(' (')[0].toLowerCase()} ${nf(cmShow(res.cm.hip), 1)} ${cmU()}` : '' })} → Navy ${nf(res.navy, 1)} %, RFM ${nf(res.rfm, 1)} %</p>` : ''}
    <div id="edit"></div><p id="mres" class="muted"></p>
    ${others.length ? field(t('phys.compareWith'), `<select id="cmp"><option value="">–</option>${others.map(o => `<option value="${o.id}">${df(o.date)}${o.ref ? ' · ' + esc(o.ref) : ''}</option>`).join('')}</select>`) + '<div id="cmpv" class="phs"></div>' : ''}
    <div class="row wrap"><button class="btn danger" data-del>${t('common.del')}</button><button class="btn ghost" data-close>${t('common.close')}</button>${urls.front && urls.side ? `<button class="btn pri" data-measure>${t('phys.measure')}</button>` : ''}</div>`, d => {
    d.querySelector('[data-del]').onclick = async e => { e.preventDefault(); if (!confirm(t('common.confirmDel'))) return; for (const k of ph.poses || []) await delPhoto(`${id}:${k}`).catch(() => { }); remove('photos', id); d.close(); render(); };
    const cmp = d.querySelector('#cmp'); if (cmp) cmp.onchange = async () => { const o = S.photos.find(x => x.id === cmp.value); const box = d.querySelector('#cmpv'); if (!o) { box.innerHTML = ''; return; } let html = ''; for (const k of o.poses || []) { const u = await photoUrl(`${o.id}:${k}`); html += u ? `<figure><img src="${u}" alt=""><figcaption>${df(o.date)} · ${t('phys.' + k)}</figcaption></figure>` : ''; } box.innerHTML = html; };
    const mb = d.querySelector('[data-measure]');
    if (mb) mb.onclick = async e => {
      e.preventDefault(); mb.disabled = true; const out = d.querySelector('#mres'); out.textContent = t('phys.measuring');
      const load = u => new Promise((r, j) => { const im = new Image(); im.onload = () => r(im); im.onerror = j; im.src = u; });
      const imgs = { front: await load(urls.front), side: await load(urls.side) };
      const a = await analyse(imgs, S.profile.sex);
      const cal = photoCal() || {};
      const show = m => { const r = measure(m.front, m.side, S.profile.cm, S.profile.sex, cal); if (!r) return; out.innerHTML = `${a.cropped ? `<b class="err">${t('phys.cropped')}</b><br>` : ''}${a.auto ? '' : t('phys.measureFail') + '<br>'}${t('phys.measureManual')}<br><b>${t('phys.measured', { u: cmU(), w: nf(cmShow(r.cm.waist), 1), n: nf(cmShow(r.cm.neck), 1), h: S.profile.sex === 'f' ? `, ${t('phys.hip').split(' (')[0].toLowerCase()} ${nf(cmShow(r.cm.hip), 1)} ${cmU()}` : '' })}</b> → Navy ${nf(r.navy, 1)} % · RFM ${nf(r.rfm, 1)} %<br><small>${cal.waist ? t('phys.calibrate', { d: df(cal.date) }) : t('phys.uncal')}</small>`; };
      editor(d.querySelector('#edit'), urls, a, show); show(a);
      mb.textContent = t('common.save'); mb.disabled = false;
      mb.onclick = ev => { ev.preventDefault(); const raw = measure(a.front, a.side, S.profile.cm, S.profile.sex, {}); const r = measure(a.front, a.side, S.profile.cm, S.profile.sex, cal); ph.result = { raw: raw.cm, cm: r.cm, navy: r.navy, rfm: r.rfm, calibrated: !!cal.waist, auto: a.auto, cropped: !!(a.cropped && !(a.front.limAdj || a.side.limAdj)) }; ph.model = { front: a.front, side: a.side }; save(); d.close(); render(); toast(t('common.saved')); };
    };
  });
}

/* ---------- duels, seasons, check-in, level-up, what's new ---------- */
function duelCard(M) {
  const A = M.ar, rivals = S.rivals || [];
  let h = `<p class="muted">${t('duel.lead')}</p>`;
  for (const r of rivals) {
    const sc2 = duelScore(A.dom, r.dom), on = ui.rival === r.id;
    h += `<div class="duel${on ? ' on' : ''}"><div class="evh" data-act="rival" data-id="${r.id}"><span>${esc(r.name)}${r.peak != null ? ` ${tierBadge(C.scoreTier(r.peak))}` : ''}</span><b>${sc2.rows.length ? t('duel.score', { a: sc2.mine, b: sc2.theirs }) : t('duel.noCommon')}</b></div>${on ? `<table class="tbl cmp"><thead><tr><th></th><th>${esc(S.profile.name || t('duel.you'))}</th><th>${esc(r.name)}</th></tr></thead><tbody>${DOMAINS.map(k => { const a = A.dom[k], b = r.dom[k]; return a == null && b == null ? '' : `<tr><td>${t('arena.dom.' + k)}</td><td class="${a != null && b != null && a - b >= 1 ? 'lead' : ''}">${a == null ? '–' : sc(a)}</td><td class="${a != null && b != null && b - a >= 1 ? 'lead' : ''}">${b == null ? '–' : sc(b)}</td></tr>`; }).join('')}${A.gl && r.gl ? `<tr><td>${t('duel.gl')}</td><td class="${A.gl.points > r.gl ? 'lead' : ''}">${nf(A.gl.points, 1)}</td><td class="${r.gl > A.gl.points ? 'lead' : ''}">${nf(r.gl, 1)}</td></tr>` : ''}</tbody></table><p class="muted xs">${r.date ? t('duel.asOf', { d: df(r.date) }) + ' ' : ''}${t('duel.fair')}</p><button class="lnk danger" data-act="rivaldel" data-id="${r.id}">${t('duel.remove')}</button>` : ''}</div>`;
  }
  h += `<div class="row wrap"><button class="btn ghost sm" data-act="duelshare"${A.nDom ? '' : ' disabled'}>${t('duel.share')}</button><button class="btn ghost sm" data-act="dueladd">${t('duel.add')}</button></div>`;
  return card(t('duel.title'), h);
}
function duelShareSheet() {
  const M = model(), A = M.ar, code = duelEncode({ name: S.profile.name, variant: S.profile.variant, peak: A.peak, balance: A.balance, dom: A.dom, gl: A.gl?.points, date: C.today() });
  sheet(`<h2>${t('duel.share')}</h2><p class="muted">${t('duel.shareLead')}</p><textarea readonly rows="4" id="duelcode" aria-label="${t('duel.code')}">${esc(code)}</textarea><div class="row wrap"><button class="btn ghost" data-close>${t('common.close')}</button><button class="btn ghost" data-copy>${t('duel.copy')}</button>${navigator.share ? `<button class="btn pri" data-share>${t('duel.send')}</button>` : ''}</div>`, d => {
    d.querySelector('[data-copy]').onclick = async e => { e.preventDefault(); try { await navigator.clipboard.writeText(code); toast(t('duel.copied')); } catch (err) { d.querySelector('#duelcode').select(); } };
    d.querySelector('[data-share]')?.addEventListener('click', e => { e.preventDefault(); navigator.share({ text: t('duel.msg', { n: S.profile.name || 'Forge' }) + '\n' + code }).catch(() => { }); });
  });
}
function duelAddSheet() {
  sheet(`<h2>${t('duel.add')}</h2><p class="muted">${t('duel.addLead')}</p><textarea rows="4" name="code" placeholder="FORGE-DUEL1:…" aria-label="${t('duel.code')}"></textarea><p class="err" id="duelerr"></p><div class="row"><button class="btn ghost" data-close>${t('common.cancel')}</button><button class="btn pri" data-save>${t('common.add')}</button></div>`, d => {
    d.querySelector('[data-save]').onclick = e => {
      e.preventDefault(); const r = duelDecode(d.querySelector('textarea').value);
      if (!r) { d.querySelector('#duelerr').textContent = t('duel.bad'); return; }
      S.rivals = (S.rivals || []).filter(x => x.name.toLowerCase() !== r.name.toLowerCase()); const id = uid(); S.rivals.push({ id, ...r }); ui.rival = id; save(); d.close(); render(); toast(t('duel.added', { n: r.name }));
    };
  });
}
function seasonSheet() {
  const M = model(), td = C.today(), se = season(S.meta.created, td, M.L, M.cctx);
  const prs = S.prs.map(pr => ({ pr, r: C.evaluatePR(pr, M.who) }));
  const block = (title, a, b, live) => {
    const R = seasonRecap(a, b, { L: M.L, series: M.series, prs, ctx: M.cctx, td });
    const rows = [[t('season.quests'), `${R.quests} / ${R.questsOf}`], [t('season.days'), nf(R.daysLogged)], [t('season.weigh'), nf(R.weighIns)]];
    if (R.weightChange != null) rows.push([t('season.weight'), `${signed(kgShow(R.weightChange), 1)} ${kgU()}`]);
    rows.push([t('season.records'), R.records ? t('season.recordsV', { n: R.records, e: R.events }) : '–']);
    return `<h3>${title}</h3><p class="muted xs">${df(a, { day: 'numeric', month: 'short' })} – ${df(b)}${live ? ` (${t('season.live', { w: se.week, m: SEASON_WEEKS })})` : ''}</p><dl class="brk">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>${R.topTier >= 0 ? `<p>${t('season.best')} ${tierBadge(R.topTier)}</p>` : ''}`;
  };
  sheet(`<h2>${t('season.title', { n: se.n })}</h2><p class="muted">${t('season.lead')}</p><div class="pips big" aria-hidden="true">${se.weeks.map(w => `<i class="${w.score == null ? 'fut' : 's' + Math.round(3 * w.score / (w.of || 3))}${w.current ? ' cur' : ''}"></i>`).join('')}</div><p class="muted xs">${t('season.pips')}</p>${block(t('season.this'), se.start, se.end, true)}${se.prevStart ? block(t('season.prev', { n: se.n - 1 }), se.prevStart, C.addDays(se.start, -1), false) : ''}<div class="row"><button class="btn pri" data-close>${t('common.close')}</button></div>`);
}
function checkinSheet() {
  const qs = ['tired', 'ill', 'libido', 'mood', 'perf'].concat(S.profile.sex === 'f' ? ['cycle'] : []);
  sheet(`<h2>${t('ck.title')}</h2><p class="muted">${t('ck.lead')}</p>${qs.map(k => `<label class="chk"><input type="checkbox" name="${k}"><span>${t('ck.q.' + k + (k === 'libido' ? '_' + (S.profile.sex || 'm') : ''))}</span></label>`).join('')}<div id="ckout"></div><div class="row"><button class="btn ghost" data-close>${t('common.close')}</button><button class="btn pri" data-save>${t('ck.save')}</button></div><p class="muted xs">${t('ck.src')} <a href="${SOURCES.reds.url}" target="_blank" rel="noopener">${esc(SOURCES.reds.name)}</a></p>`, d => {
    d.querySelector('[data-save]').onclick = e => {
      e.preventDefault(); const n = qs.filter(k => d.querySelector(`[name=${k}]`).checked).length;
      S.meta.checkin = { date: C.today(), n }; save();
      d.querySelector('#ckout').innerHTML = `<p class="tip ${n ? 'warn' : ''}">${t(n >= 2 ? 'ck.two' : n === 1 ? 'ck.one' : 'ck.none')}</p>`;
      const b = d.querySelector('[data-save]'); b.textContent = t('common.done'); b.onclick = ev => { ev.preventDefault(); d.close(); render(); };
    };
  });
}
/* The one moment of theatre: a new tier is struck like a hot plate and cools to its colour. */
function levelUp(id, r, before) {
  const lvl = r.level ? ` · FFA ${r.level}` : '';
  sheet(`<div class="strike"><p class="muted">${t('lvl.kicker', { ev: t('arena.ev.' + id) })}</p><h2 class="plate t${r.tier}"><span>${esc(tierName(r.tier)[0])}</span></h2><p class="flav">${esc(tierName(r.tier)[1])}</p><p><b>${fmtVal(id, r.value)}</b>${lvl}</p><p class="muted">${before >= 0 ? t('lvl.from', { a: tierName(before)[0] }) : t('lvl.first')}${r.tier < 7 ? ' ' + t('arena.next', { gap: gapTxt(id, r), tier: tierName(r.tier + 1)[0] }) + '.' : ''}</p><button class="btn pri big" data-close>${t('lvl.ok')}</button></div>`);
}
function whatsNewSheet() {
  sheet(`<h2>${t('new.title')}</h2><p class="muted">${t('new.lead')}</p><ul class="news">${t('new.items').map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('')}</ul><div class="row"><button class="btn pri" data-close>${t('common.gotIt')}</button></div>`);
}

/* ---------- Apple Health ---------- */
function applyHealth(res) {
  let n = 0;
  for (const [d, v] of Object.entries(res.days)) { logDay(d, v, 'health'); n++; }
  S.health.last = C.today(); save();
  const sm = summarise(res, C.ageAt(S.profile.dob)), a = S.activity, offers = [];
  if (sm.stepsAvg && Math.abs(sm.stepsAvg - (a.stepsAvg || 0)) > 300) offers.push(['steps', t('set.hApplySteps', { v: nf(sm.stepsAvg), o: nf(a.stepsAvg || 0) }), () => { a.stepsAvg = sm.stepsAvg; }]);
  if (sm.workouts.length) offers.push(['workouts', t('set.hApplyWorkouts', { n: sm.workouts.length }), () => { a.workouts = sm.workouts; }]);
  if (sm.walkSpeed && Math.abs(sm.walkSpeed - (a.walkSpeed || 0)) > 0.03) offers.push(['speed', t('set.hApplySpeed', { v: nf(sm.walkSpeed * 3.6, 1) }), () => { a.walkSpeed = sm.walkSpeed; }]);
  if (sm.stepLen && Math.abs(sm.stepLen - (a.strideCm || 0)) > 1) offers.push(['stride', t('set.hApplyStride', { v: nf(sm.stepLen), o: nf(C.strideM(S.profile.sex, S.profile.cm) * 100) }), () => { a.strideCm = Math.round(sm.stepLen); }]);
  if (sm.vo2 && !S.prs.some(p => p.event === 'vo2' && p.date === sm.vo2.date)) offers.push(['vo2', t('set.hApplyVo2', { v: nf(sm.vo2.value, 1) }), () => { S.prs.push({ id: uid(), event: 'vo2', method: 'watch', value: sm.vo2.value, date: sm.vo2.date }); }]);
  const done = n || res.workouts.length ? t('set.hDone', { d: n, w: res.workouts.length }) : t('set.hNone');
  render();
  if (!offers.length) { toast(done); return; }
  setTimeout(() => sheet(`<h2>${t('set.hOffer')}</h2><p class="muted">${done}</p>${offers.map(([k, label]) => `<label class="chk"><input type="checkbox" name="${k}" checked><span>${label}</span></label>`).join('')}<div class="row"><button class="btn ghost" data-close>${t('common.skip')}</button><button class="btn pri" data-save>${t('set.hUse')}</button></div>`, d => {
    d.querySelector('[data-save]').onclick = e => { e.preventDefault(); for (const [k, , fn] of offers) if (d.querySelector(`[name=${k}]`).checked) fn(); save(); d.close(); render(); toast(t('common.saved')); };
  }), 200);
}
const dayFirst = () => getLang() === 'fr' || /de|fr/i.test(navigator.language);
async function pasteShortcut() {
  let txt = null;
  try { txt = await navigator.clipboard.readText(); } catch (e) { return pasteBox(t('set.hClipBlocked')); }
  try { applyHealth(parseShortcut(txt, dayFirst())); } catch (e) { pasteBox(t('set.hNotForge')); }
}
function pasteBox(msg) {
  sheet(`<h2>${t('set.hPasteBox')}</h2>${msg ? `<p class="tip warn">${esc(msg)}</p>` : ''}<p class="muted">${t('set.hPasteBoxLead')}</p><textarea rows="7" name="txt" placeholder="FORGE1&#10;@steps&#10;…" aria-label="${t('set.hPasteBox')}"></textarea><p class="err" id="pberr"></p><div class="row"><button class="btn ghost" data-close>${t('common.cancel')}</button><button class="btn pri" data-save>${t('set.hImport')}</button></div>`, d => {
    d.querySelector('[data-save]').onclick = e => { e.preventDefault(); try { const res = parseShortcut(d.querySelector('textarea').value, dayFirst()); d.close(); applyHealth(res); } catch (err) { d.querySelector('#pberr').textContent = t('set.hNotForge'); } };
  });
}
export function importFromHash() {
  const m = location.hash.match(/[#&]hk=([^&]+)/); if (!m) return;
  try { applyHealth(parseShortcut(decodeURIComponent(m[1]))); } catch (e) { toast(t('set.hErr', { e: e.message })); }
  history.replaceState(null, '', location.pathname);
}

/* ---------- events ---------- */
function onClick(e) {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (el.tagName === 'BUTTON') e.preventDefault();
  const acts = {
    tab: () => go(el.dataset.tab),
    wadd: () => { S.activity.workouts.push({ type: 'strength', minutes: 60, perWeek: 3, intensity: 'light' }); save(); render(); },
    wdel: () => { S.activity.workouts.splice(+el.dataset.i, 1); save(); render(); },
    mode: () => { previewMode = el.dataset.m; render(); },
    rate: () => { S.plan.ratePct = +el.dataset.r; save(); render(); },
    apply: () => { S.plan.mode = el.dataset.m; S.plan.applied = C.today(); previewMode = null; save(); render(); toast(t('fuel.appliedToast')); },
    logedit: () => logSheet(el.dataset.d), tape: () => tapeSheet(el.dataset.id), scan: () => scanSheet(el.dataset.id),
    photonew: () => photoNewSheet(), photo: () => photoSheet(el.dataset.id),
    pradd: () => prSheet(null, el.dataset.dom), event: () => eventSheet(el.dataset.id),
    paste: () => pasteShortcut(),
    sex: () => { S.profile.sex = el.dataset.s; save(); render(); },
    obnext: () => obMove(1), obback: () => obMove(-1),
    export: async () => { const b = await exportBackup(true); const u = URL.createObjectURL(b); const x = document.createElement('a'); x.href = u; x.download = `forge-backup-${C.today()}.json`; x.click(); setTimeout(() => URL.revokeObjectURL(u), 4000); },
    wipe: () => wipeFlow(),
    signin: () => window.Cloud?.dialog(() => render()),
    signout: async () => { await window.Cloud?.signOut(); render(); },
    signup: () => signupSheet(),
    rpclear: () => { if (!confirm(t('set.rpClearConfirm'))) return; S.renpho = { rows: {}, imported: null, file: null, height: null }; save(); render(); },
    pastebox: () => pasteBox(), vitals: () => vitalsSheet(), season: () => seasonSheet(), checkin: () => checkinSheet(), whatsnew: () => whatsNewSheet(),
    duelshare: () => duelShareSheet(), dueladd: () => duelAddSheet(),
    rival: () => { ui.rival = ui.rival === el.dataset.id ? null : el.dataset.id; render(); },
    rivaldel: () => { if (!confirm(t('common.confirmDel'))) return; S.rivals = (S.rivals || []).filter(x => x.id !== el.dataset.id); ui.rival = null; save(); render(); },
    usesteps: () => { S.activity.stepsAvg = +el.dataset.v; save(); render(); toast(t('common.saved')); },
    tipoff: () => { try { localStorage.setItem('forge.tip.' + el.dataset.k, '1'); } catch (e) { } render(); },
    reload: () => location.reload()
  };
  acts[a]?.();
}
/* Deleting while signed in would also blank the account (the newest edit wins the sync) and then every other device,
   so the choice is made explicit. "This device only" signs out first and forgets the sync marker, so a later
   sign-in pulls the account's copy back instead of overwriting it with the empty state. */
async function wipeFlow() {
  const s = await window.Cloud?.session().catch(() => null);
  const clear = async () => { await clearPhotos().catch(() => { }); reset(); ob = { step: 0 }; };
  const forget = () => { try { localStorage.removeItem('cloud.meta.forge'); } catch (e) { } };
  if (!s) { if (!confirm(t('set.wipeConfirm'))) return; await clear(); forget(); render(); return; }
  sheet(`<h2>${t('set.wipeT')}</h2><p class="muted">${t('set.wipeLead')}</p><button class="btn ghost big" data-dev>${t('set.wipeDevice')}</button><p class="muted xs">${t('set.wipeDeviceH')}</p><button class="btn danger big" data-all>${t('set.wipeAll')}</button><p class="muted xs">${t('set.wipeAllH')}</p><div class="row"><button class="btn ghost" data-close>${t('common.cancel')}</button></div>`, d => {
    d.querySelector('[data-dev]').onclick = async e => { e.preventDefault(); await window.Cloud.signOut(); await clear(); forget(); d.close(); render(); };
    d.querySelector('[data-all]').onclick = async e => { e.preventDefault(); if (!confirm(t('set.wipeAllH'))) return; await clear(); d.close(); render(); };
  });
}
function signupSheet() {
  sheet(`<h2>${t('set.signUp')}</h2>${field(t('set.email'), '<input type="email" name="e" autocomplete="username" required>')}${field(t('set.password'), '<input type="password" name="p" minlength="8" autocomplete="new-password" required>')}<p class="err" id="suerr"></p><div class="row"><button class="btn ghost" data-close>${t('common.cancel')}</button><button class="btn pri" data-save>${t('set.signUp')}</button></div>`, d => {
    d.querySelector('[data-save]').onclick = async e => {
      e.preventDefault(); const f = d.querySelector('form'), out = d.querySelector('#suerr');
      try { const c = await window.Cloud.client(); const { data, error } = await c.auth.signUp({ email: f.e.value.trim(), password: f.p.value }); if (error) throw error; out.textContent = data.session ? t('common.saved') : t('set.checkInbox'); if (data.session) { d.close(); render(); } }
      catch (err) { out.textContent = /not allowed|disabled/i.test(err.message) ? t('set.signupsOff') : err.message; }
    };
  });
}
function onChangeEv(e) {
  const el = e.target;
  if (el.id === 'wiSteps') return;
  if (el.id === 'hkfile' && el.files[0]) return /\.txt$/i.test(el.files[0].name) ? el.files[0].text().then(x => applyHealth(parseShortcut(x, dayFirst()))).catch(() => toast(t('set.hNotForge'))) : importHealthFile(el.files[0]);
  if (el.id === 'rpfile' && el.files[0]) return importRenpho(el.files[0]);
  if (el.id === 'bkfile' && el.files[0]) return el.files[0].text().then(importBackup).then(kind => { setLang(S.profile.lang); toast(t('set.imported')); if (ob && kind === 'merge') ob.step = 1; render(); }).catch(err => toast(t('set.hErr', { e: err.message })));
  if (el.id === 'c1w' || el.id === 'c1r') return calc1rm();
  const b = el.dataset?.bind; if (!b) return;
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.type === 'number') v = v === '' ? null : +v;
  if (el.dataset.conv === 'kg') v = kgRead(v); else if (el.dataset.conv === 'cm') v = cmRead(v); else if (el.dataset.conv === 'kmh') v = v == null ? null : C.clamp(v / 3.6, 0.7, 1.9);
  if (b.startsWith('logtoday.')) { logDay(C.today(), { [b.split('.')[1]]: v ?? '' }); save(); }
  else {
    if (/\.(perWeek|minutes|paceKmh|watts)$/.test(b) || b === 'plan.fatPct' || b === 'plan.meals') v = v == null ? null : +v;
    set(b, v);
    if (b === 'profile.bfSelf') set('profile.bfSelfDate', C.today());
    if (b === 'profile.lang') setLang(v);
    if (b.endsWith('.type')) { const w = S.activity.workouts[+b.split('.')[2]]; delete w.paceKmh; delete w.watts; save(); }
  }
  render();
}
function calc1rm() { const w = +$('#c1w')?.value, r = +$('#c1r')?.value, o = $('#c1o'); if (!o) return; const e1 = C.e1rm(w, r); o.textContent = e1 && r <= 10 ? t('arena.calcText', { w: nf(w, 1), r, v: nf(e1.value, 1) }) : '–'; }
async function importHealthFile(file) {
  const out = $('#hkprog');
  try { const res = await readHealthFile(file, { days: 180, onProgress: p => { if (out) out.textContent = t('set.hReading', { p: Math.round(p * 100) }); } }); if (out) out.textContent = ''; applyHealth(res); }
  catch (e) { if (out) out.textContent = e.code === 'noExport' ? t('set.hNoExport') : t('set.hErr', { e: e.message || e }); }
}
function obMove(d) {
  const p = S.profile;
  if (d > 0 && ob.step === 1) { if (!p.sex || !p.dob || !p.cm || !S.logs[C.today()]?.w) { ob.err = `${t('sex.m')}/${t('sex.f')}, ${t('ob.dob')}, ${t('ob.height')}, ${t('ob.weight')}`; render(); return; } }
  ob.err = null; ob.step += d;
  if (ob.step >= 5) { S.profile.onboarded = true; S.meta.seen = VERSION; save(true); ob = null; tab = 'today'; navigator.storage?.persist?.().catch(() => { }); }
  render();
}

/* ---------- shell ---------- */
const SCREENS = { today: screenToday, fuel: screenFuel, physique: screenPhysique, arena: screenArena, settings: screenSettings };
const scrolls = {};
export function go(name) { scrolls[tab] = window.scrollY; tab = name; previewMode = null; render(); window.scrollTo(0, scrolls[name] || 0); }
export function render() {
  const main = $('#main');
  if (!S.profile.onboarded) { ob ||= { step: 0 }; document.body.classList.add('onb'); main.innerHTML = screenOnboarding(); return; }
  document.body.classList.remove('onb');
  let html; try { html = SCREENS[tab](model()); } catch (err) { console.error(err); html = card('Error', `<pre>${esc(err.stack || err)}</pre>`); }
  main.innerHTML = html; a11y(main);
  document.querySelectorAll('#tabs button').forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  document.querySelectorAll('#tabs [data-l]').forEach(s => s.textContent = t('tab.' + s.dataset.l));
  main.querySelectorAll('img[data-photo]').forEach(async im => { const u = await photoUrl(im.dataset.photo); if (u) im.src = u; else im.replaceWith(Object.assign(document.createElement('span'), { className: 'miss', textContent: t('phys.photoElsewhere') })); });
  if (tab === 'arena') calc1rm();
  if (tab === 'settings') paintSync();
}
/* Anything clickable that is not a real button becomes reachable and operable from the keyboard. */
function a11y(root) { root.querySelectorAll('[data-act]:not(button):not(a):not(input)').forEach(el => { el.setAttribute('role', 'button'); el.tabIndex = 0; }); }
function whatIf(el) {
  const n = +el.value, k = +el.dataset.k, ed = +el.dataset.ed, out = $('#wiOut'); if (!out) return;
  if (!n) { out.textContent = t('fuel.wiHint'); return; }
  const kc = Math.abs(n * k);
  out.textContent = t(n > 0 ? 'fuel.wiMore' : 'fuel.wiLess', { s: nf(Math.abs(n)), k: nf(rnd(kc, 5)), w: nf(kgShow(kc * 7 / ed), 2), u: kgU() });
}
export function paintSync() {
  const el = $('#syncStatus'); if (!el || !window.Cloud) return;
  window.Cloud.session().then(s => { el.textContent = s ? t('set.syncOn', { e: s.user.email }) : t('set.syncOff'); el.className = 'chip ' + (s ? 'ok' : '');
    if (s && !S.meta.syncConsent) { S.meta.syncConsent = true; save(); render(); } // signed in before the consent box existed
  }).catch(() => { });
}
export function init() {
  setLang(S.profile.lang);
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChangeEv);
  document.addEventListener('input', e => { if (e.target.id === 'wiSteps') whatIf(e.target); });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[role=button][data-act]')) { e.preventDefault(); e.target.click(); } });
  document.addEventListener('toggle', e => { if (e.target.matches?.('details.how')) ui.open[e.target.dataset.k] = e.target.open; }, true);
  $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') e.target.close(); });
  importFromHash();
  render();
  if (S.profile.onboarded) {
    navigator.storage?.persist?.().catch(() => { });
    if (S.meta.seen !== VERSION) { S.meta.seen = VERSION; save(); whatsNewSheet(); }
  }
}
