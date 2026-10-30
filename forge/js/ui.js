/* Forge — screens. Vanilla JS: each screen is a function of the derived model; inputs bind to state paths. */
import { S, save, set, upsert, remove, logDay, uid, storeImage, getPhoto, delPhoto, exportBackup, importBackup, reset, clearPhotos } from './store.js';
import * as C from './calc.js';
import { CATALOGUE, INTENSITIES, EVENTS, TIERS, TIER_P, DOMAINS, SOURCES, DATA_VERSION, HELPLINES } from './data.js';
import { t, setLang, getLang, nf, df } from './i18n.js';
import { line, radar, pctBar, stack } from './charts.js';
import { parseShortcut, readHealthFile, summarise } from './health.js';
import { analyse, editor, measure } from './photo.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
let tab = 'today', previewMode = null, ob = null;
const ui = { photoUrls: {} };

/* ---------- units ---------- */
const imp = () => S.profile.units === 'imperial';
const kgShow = v => v == null ? null : imp() ? v * 2.20462 : v, kgRead = v => v == null || v === '' ? null : imp() ? +v / 2.20462 : +v, kgU = () => imp() ? 'lb' : 'kg';
const cmShow = v => v == null ? null : imp() ? v / 2.54 : v, cmRead = v => v == null || v === '' ? null : imp() ? +v * 2.54 : +v, cmU = () => imp() ? 'in' : 'cm';
const r1 = v => v == null ? '' : Math.round(v * 10) / 10;
export const fmtTime = s => { if (s == null || !isFinite(s)) return '–'; if (s < 60) return s.toFixed(s < 30 ? 2 : 1); const m = Math.floor(s / 60), r = s - 60 * m; return `${m}:${r.toFixed(1).padStart(4, '0')}`; };
export const parseTime = str => { if (str == null || str === '') return null; const s = String(str).trim().replace(',', '.'); const m = s.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/); return m ? +m[1] * 60 + +m[2] : (isFinite(+s) ? +s : null); };

/* ---------- small builders ---------- */
const field = (label, input, hint) => `<label class="field"><span>${label}</span>${input}${hint ? `<small>${hint}</small>` : ''}</label>`;
const numIn = (bind, val, { conv, step = 'any', ph = '', unit } = {}) => `<div class="inp">${'<input type="number" inputmode="decimal" step="' + step + '" data-bind="' + bind + '"' + (conv ? ` data-conv="${conv}"` : '') + ` value="${val ?? ''}" placeholder="${ph}">`}${unit ? `<em>${unit}</em>` : ''}</div>`;
const selIn = (bind, val, opts, attrs = '') => `<select data-bind="${bind}" ${attrs}>${opts.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const chk = (bind, val, label) => `<label class="chk"><input type="checkbox" data-bind="${bind}"${val ? ' checked' : ''}><span>${label}</span></label>`;
const card = (title, body, cls = '') => `<section class="card ${cls}">${title ? `<h2>${title}</h2>` : ''}${body}</section>`;
const chip = (txt, cls = '') => `<span class="chip ${cls}">${esc(txt)}</span>`;
const how = (title, body) => `<details class="how"><summary>${title}</summary><div>${body}</div></details>`;
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
function bodyFat(kg, age) {
  const p = S.profile, td = C.today(), items = [], stale = [];
  const within = (d, n) => d && C.dayNum(td) - C.dayNum(d) <= n;
  const scans = [...S.scans].filter(s => s.bf).sort((a, b) => a.date < b.date ? 1 : -1);
  scans.slice(0, 4).forEach((s, i) => (i === 0 && within(s.date, 30) ? items : stale).push({ method: s.method, value: s.bf, sd: C.BF_SD[s.method] || 4.5, date: s.date }));
  const bia = Object.entries(S.logs).filter(([d, v]) => v.bf && within(d, 7)).sort().pop();
  if (bia) items.push({ method: 'bia', value: bia[1].bf, sd: C.BF_SD.bia, date: bia[0] });
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
  const series = C.trendSeries(Object.entries(S.logs).filter(([, v]) => v.w > 0).map(([date, v]) => ({ date, w: v.w })));
  const kg = series.length ? series[series.length - 1].trend : null;
  const bfx = bodyFat(kg, age), bf = bfx.usable ? bfx.ens?.value ?? null : null;
  const ffm = bf != null && kg ? kg * (1 - bf / 100) : null, fmKg = bf != null && kg ? kg * bf / 100 : (kg ? kg * (p.sex === 'm' ? 0.2 : 0.3) : null);
  const ok = !!(p.sex && p.cm && kg && p.dob);
  const blockDeficit = !!(S.safety.under18 || S.safety.preg || S.safety.ed || S.safety.med);
  const out = { p, a, age, series, kg, bfx, bf, ffm, fmKg, ok, blockDeficit };
  out.bmiV = kg && p.cm ? C.bmi(kg, p.cm) : null;
  if (ok) {
    const pred = C.predictTdee({ sex: p.sex, kg, cm: p.cm, age, ffm, trainingYears: a.years, stepsAvg: a.stepsAvg, stepsIncludeWorkouts: a.stepsInc, strideCm: a.strideCm, flightsAvg: a.flights, occupation: a.occupation, sleepH: a.sleepH, workouts: a.workouts });
    const obs = C.adaptiveTdee(S.logs, { fmKg, trained: pred.trained });
    const tdee = C.blend(pred.tdee, pred.sd, obs);
    const rec = C.recommendMode({ sex: p.sex, bf, ffmiN: ffm ? C.ffmiNorm(ffm, p.cm) : null, trainingYears: a.years, bmiV: out.bmiV, blockDeficit });
    const mode = modeOverride || S.plan.mode || rec.mode;
    const plan = C.makePlan({ mode, ratePct: S.plan.ratePct, tdee: tdee.value, kg, cm: p.cm, ffm, fmKg, sex: p.sex, trained: pred.trained, exerciseDay: pred.exercise + pred.epoc, rmr: pred.rmr.value, fatPct: S.plan.fatPct, meals: S.plan.meals, trainingYears: a.years, blockDeficit, customKcal: S.plan.customKcal, slow: rec.slow && mode === 'bulk' });
    Object.assign(out, { pred, obs, tdee, rec, mode, plan });
  }
  out.leanP = bf != null && !S.safety.ed && !S.safety.under18 && p.sex ? 1 - C.pctFromAnchors(bf, C.bfAnchors(p.sex, age).A) : null;
  out.who = { sex: p.sex || 'm', kg: kg || (p.sex === 'f' ? 62 : 80), age };
  out.ar = p.sex ? C.arena(S.prs, out.who, out.leanP) : null;
  return out;
}

/* ---------- shared pieces ---------- */
function workoutsEditor() {
  const types = Object.entries(CATALOGUE).map(([id, c]) => [id, c[getLang()]]);
  const ws = S.activity.workouts;
  return `<div class="wlist">${ws.map((w, i) => {
    const c = CATALOGUE[w.type] || CATALOGUE.other, b = `activity.workouts.${i}.`;
    const extra = c.pace ? field(t('fuel.pace'), numIn(b + 'paceKmh', w.paceKmh, { ph: '10' })) : c.watts ? field(t('fuel.watts'), numIn(b + 'watts', w.watts, { ph: '150' })) : '';
    return `<div class="wrow">${field(t('fuel.type'), selIn(b + 'type', w.type, types))}<div class="g3">${field(t('fuel.minutes'), numIn(b + 'minutes', w.minutes, { step: 5 }))}${field(t('fuel.per'), numIn(b + 'perWeek', w.perWeek, { step: 0.5 }))}${extra}</div>${field(t('fuel.intensity'), selIn(b + 'intensity', w.intensity, INTENSITIES.map(k => [k, t('fuel.int.' + k)])))}<button class="lnk danger" data-act="wdel" data-i="${i}">${t('common.del')}</button></div>`;
  }).join('')}</div><button class="btn ghost" data-act="wadd">+ ${t('ob.addWorkout')}</button>`;
}
const kcalBand = tdee => `${nf(rnd(tdee.value - tdee.sd, 50))}–${nf(rnd(tdee.value + tdee.sd, 50))}`;

/* ---------- TODAY ---------- */
function screenToday(M) {
  const p = S.profile, td = C.today(), log = S.logs[td] || {};
  let h = `<header class="hdr"><p class="eyebrow">${esc(df(td, { weekday: 'long', day: 'numeric', month: 'long' }))}</p><h1>${p.name ? t('today.hello', { name: esc(p.name) }) : t('app')}</h1></header>`;
  if (M.plan && S.plan.mode) {
    const pl = M.plan;
    h += card(t('today.target'), `<div class="kpi">${nf(rnd(pl.kcal, 10))}<small> kcal</small></div><p class="muted">${t('fuel.mode.' + M.mode)}${M.tdee.source === 'blended' ? ' · ' + t('fuel.src.blended') : ''}</p>
      <div class="macros">${[['protein', pl.protein, 'p'], ['carbs', pl.carbs, 'c'], ['fat', pl.fat, 'f']].map(([k, g, cls]) => `<div class="mac ${cls}"><b>${nf(rnd(g, 5))} g</b><span>${t('today.' + k)}</span></div>`).join('')}</div>`, 'hero');
  } else h += card(t('today.target'), `<p class="muted">${t('today.noPlan')}</p><button class="btn pri" data-act="tab" data-tab="fuel">${t('today.setPlan')}</button>`, 'hero');
  h += card(t('today.quick'), `<div class="g2">${field(`${t('today.weight')} (${kgU()})`, numIn('logtoday.w', r1(kgShow(log.w)), { conv: 'kg' }))}${field(`${t('today.intake')} (kcal)`, numIn('logtoday.kcal', log.kcal, { step: 10 }))}</div><button class="btn ghost sm" data-act="paste">${t('today.paste')}</button>`);
  if (M.series.length) {
    const last = M.series.slice(-30), pts = last.map(s => ({ x: C.dayNum(s.date), y: kgShow(s.w) })), tr = last.map(s => ({ x: C.dayNum(s.date), y: kgShow(s.trend) }));
    const wkAgo = M.series.filter(s => C.dayNum(s.date) <= C.dayNum(td) - 7).pop();
    const ch = wkAgo ? M.series[M.series.length - 1].trend - wkAgo.trend : null;
    h += card(t('today.trend'), `<div class="kpi">${nf(kgShow(M.kg), 1)}<small> ${kgU()}</small></div>${ch != null ? `<p class="muted">${ch > 0 ? '+' : ''}${nf(kgShow(ch), 2)} ${kgU()} ${t('today.week')} (${ch > 0 ? '+' : ''}${nf(ch / M.kg * 100, 2)} %)</p>` : ''}${line({ series: [{ pts, dots: true, cls: 'raw' }, { pts: tr, cls: 'trend' }], xFmt: x => df(new Date(x * 864e5).toISOString().slice(0, 10), { day: 'numeric', month: 'short' }) })}`);
  } else h += card(t('today.trend'), `<p class="muted">${t('today.noWeight')}</p>`);
  if (M.tdee) h += card(t('today.maintenance'), `<div class="kpi">${nf(rnd(M.tdee.value, 10))}<small> kcal</small></div><p class="muted">${t('fuel.band68')}: ${kcalBand(M.tdee)} · ${t('fuel.src.' + M.tdee.source)}</p>${confChip(C.confidence(M.tdee.sd))}`);
  if (M.ar && S.prs.length && M.ar.peak != null) h += card(t('today.arena'), `<div class="g2"><div><p class="eyebrow">${t('today.peak')}</p><div class="kpi sm">${nf(M.ar.peak)}</div></div><div><p class="eyebrow">${t('today.balance')}</p><div class="kpi sm">${M.ar.balance != null ? nf(M.ar.balance) : '–'}</div></div></div><div class="badges">${Object.values(M.ar.best).sort((a, b) => b.r.p - a.r.p).slice(0, 4).map(b => `<span class="bb">${tierBadge(b.r.tier)} ${esc(t('arena.ev.' + b.pr.event))}</span>`).join('')}</div><button class="lnk" data-act="tab" data-tab="arena">${t('arena.title')} →</button>`);
  const todo = [];
  if (!log.w) todo.push(['today.t_weigh']);
  if (!S.health.last || C.dayNum(td) - C.dayNum(S.health.last) > 7) todo.push(['today.t_health', 'settings']);
  const lastPh = [...S.photos].sort((a, b) => a.date < b.date ? 1 : -1)[0];
  if (!lastPh) todo.push(['today.t_photoFirst', 'physique']); else if (C.dayNum(td) - C.dayNum(lastPh.date) > 21) todo.push([t('today.t_photo', { d: C.dayNum(td) - C.dayNum(lastPh.date) }), 'physique', true]);
  const lastTape = [...S.tapes].sort((a, b) => a.date < b.date ? 1 : -1)[0];
  if (!lastTape || C.dayNum(td) - C.dayNum(lastTape.date) > 7) todo.push(['today.t_tape', 'physique']);
  if (!M.bfx.usable && !S.safety.ed) todo.push(['today.t_bf', 'physique']);
  if (!S.prs.length) todo.push(['today.t_pr', 'arena']);
  if (todo.length) h += card(t('today.todo'), `<ul class="todo">${todo.map(([k, tb, raw]) => `<li${tb ? ` data-act="tab" data-tab="${tb}"` : ''}>${raw ? esc(k) : t(k)}${tb ? ' <span>→</span>' : ''}</li>`).join('')}</ul>`);
  return h;
}

/* ---------- FUEL ---------- */
function screenFuel(M0) {
  if (!M0.ok) return `<header class="hdr"><h1>${t('tab.fuel')}</h1></header>` + card('', `<p class="muted">${t('today.noWeight')}</p>`);
  const mode = previewMode || S.plan.mode || M0.rec.mode, M = mode === M0.mode ? M0 : model(mode), P = M.pred, pl = M.plan, a = S.activity;
  let h = `<header class="hdr"><h1>${t('tab.fuel')}</h1></header>`;
  h += card(t('fuel.maint'), `<div class="kpi">${nf(rnd(M.tdee.value, 10))}<small> kcal</small></div><p class="muted">${t('fuel.band68')}: ${kcalBand(M.tdee)} · ${t('fuel.band95')}: ${nf(rnd(M.tdee.value - 1.96 * M.tdee.sd, 50))}–${nf(rnd(M.tdee.value + 1.96 * M.tdee.sd, 50))}</p><p>${chip(t('fuel.src.' + M.tdee.source))} ${confChip(C.confidence(M.tdee.sd))}</p>`, 'hero');
  const parts = [['rmr', P.rmr.value, 'k1'], ['neat', P.neat, 'k2'], ['steps', P.stepsKcal, 'k3'], ['flights', P.flightsKcal, 'k3'], ['ex', P.exercise, 'k4'], ['epoc', P.epoc, 'k4'], ['tef', P.tef, 'k5']].filter(x => x[1] > 0.5);
  const rmrNames = { mifflin: 'Mifflin-St Jeor', katch: 'Katch-McArdle', cunningham: 'Cunningham', tinsleyFFM: 'Tinsley (FFM)', tinsleyBW: 'Tinsley (weight)', tenHaafFFM: 'ten Haaf (FFM)', tenHaafBW: 'ten Haaf (weight)' };
  h += card(t('fuel.breakdown'), stack(parts.map(([k, v, cls]) => ({ v, cls, label: t('fuel.c_' + k) }))) + `<dl class="brk">${parts.map(([k, v, cls]) => `<dt><i class="${cls}"></i>${t('fuel.c_' + k)}</dt><dd>${nf(rnd(v, 5))}</dd>` + (k === 'rmr' ? `<dd class="sub">${t('fuel.rmrMethod', { m: P.rmr.parts.map(([e, w]) => `${rmrNames[e]} ${Math.round(w * 100)} %`).join(', ') })}</dd>` : k === 'steps' ? `<dd class="sub">${t('fuel.stepsDetail', { steps: nf(P.steps), km: nf(P.km, 1) })}</dd>` : k === 'ex' ? P.items.map(i => `<dd class="sub">${esc(CATALOGUE[i.type]?.[getLang()] || i.type)}: ${nf(i.kcalDay)} kcal${t('common.perDay')} · ${i.method === 'pace' ? 'ACSM' : `${i.met} MET (${i.code})`}</dd>`).join('') : '')).join('')}</dl>` + how(t('common.how'), `<p>${t('fuel.howText')}</p><p><a href="${SOURCES.compendium.url}" target="_blank" rel="noopener">${esc(SOURCES.compendium.name)}</a></p>`));
  h += card(t('fuel.activity'), `<div class="g2">${field(t('fuel.stepsAvg'), numIn('activity.stepsAvg', a.stepsAvg, { step: 100 }))}${field(t('ob.occupation'), selIn('activity.occupation', a.occupation, ['desk', 'mixed', 'standing', 'manual'].map(k => [k, t('ob.occ.' + k)])))}${field(t('ob.sleep'), numIn('activity.sleepH', a.sleepH, { step: 0.5 }))}${field(t('ob.years'), numIn('activity.years', a.years, { step: 0.5 }))}${field(t('fuel.flights'), numIn('activity.flights', a.flights, { step: 1 }))}${field(`${t('fuel.stride')} (cm)`, numIn('activity.strideCm', a.strideCm, { ph: nf(C.strideM(S.profile.sex, S.profile.cm) * 100) }), t('fuel.strideHint'))}</div>${chk('activity.stepsInc', a.stepsInc, t('fuel.stepsInc'))}<h3>${t('fuel.sessions')}</h3>${workoutsEditor()}`);
  // plan
  const modes = ['cut', 'recomp', 'maintain', 'bulk', 'custom'];
  let ph = `<div class="rec"><b>${t('fuel.rec')}: ${t('fuel.mode.' + M.rec.mode)}${M.rec.slow ? ' (slow)' : ''}</b><p>${t('fuel.reason.' + M.rec.reason)}</p></div>`;
  ph += `<div class="seg">${modes.map(m => `<button data-act="mode" data-m="${m}" class="${m === mode ? 'on' : ''}"${M.blockDeficit && (m === 'cut' || m === 'recomp') ? ' disabled' : ''}>${t('fuel.mode.' + m)}</button>`).join('')}</div>`;
  if (mode === 'cut') ph += field(t('fuel.rate'), `<div class="seg sm">${[0.25, 0.5, 0.75, 1.0].map(r => `<button data-act="rate" data-r="${r}" class="${r === S.plan.ratePct ? 'on' : ''}">${nf(r, 2)} %</button>`).join('')}</div>`);
  if (mode === 'custom') ph += field(t('fuel.custom'), numIn('plan.customKcal', S.plan.customKcal, { step: 10, ph: nf(rnd(M.tdee.value, 10)) }));
  ph += `<div class="g2">${field(t('fuel.fatPct'), selIn('plan.fatPct', S.plan.fatPct, [20, 25, 30, 35].map(x => [x, x + ' %'])))}${field(t('fuel.meals'), selIn('plan.meals', S.plan.meals, [3, 4, 5].map(x => [x, x])))}</div>`;
  ph += `<div class="result"><p class="eyebrow">${t('fuel.target')}</p><div class="kpi">${nf(rnd(pl.kcal, 10))}<small> kcal</small></div><div class="macros">${[['protein', pl.protein, 'p'], ['carbs', pl.carbs, 'c'], ['fat', pl.fat, 'f']].map(([k, g, cls]) => `<div class="mac ${cls}"><b>${nf(rnd(g, 5))} g</b><span>${t('today.' + k)}</span></div>`).join('')}</div><p class="muted">${t('fuel.perMeal', { g: nf(pl.perMeal), gkg: nf(pl.perMealPerKg, 2) })}</p>`;
  if (pl.weeklyKg) ph += `<p>${t('fuel.change')}: <b>${pl.weeklyKg > 0 ? '+' : ''}${nf(kgShow(pl.weeklyKg), 2)} ${kgU()}${t('common.perWeek')}</b> (${pl.weeklyPct > 0 ? '+' : ''}${nf(pl.weeklyPct, 2)} %)</p>`;
  if (pl.ea != null) ph += `<div class="ea ${pl.eaLevel}"><span>${t('fuel.ea')}</span><b>${nf(pl.ea, 1)}</b><small>${t('fuel.eaText', { v: nf(pl.ea, 1) })} — ${t(pl.eaLevel === 'ok' ? 'fuel.eaOk' : pl.eaLevel === 'amber' ? 'fuel.eaAmber' : 'fuel.eaRed')}</small></div>`;
  if (pl.flags.length) ph += `<ul class="flags">${pl.flags.map(f => `<li>${t('fuel.flags.' + f, { min: nf(rnd(pl.minKcal, 10)) })}</li>`).join('')}</ul>`;
  if (mode === 'cut') ph += `<p class="tip">${t('fuel.dietBreak')}</p>`;
  if (mode === 'bulk') { const y = a.years || 0; ph += `<p class="tip">${t('fuel.bulkNote', { lo: y >= 3 ? '0.1' : '0.25', hi: y >= 3 ? '0.25' : '0.5' })}</p>`; }
  if (mode !== 'maintain' && pl.ed) {
    const pr = C.project({ kg: M.kg, tdee: M.tdee.value, sd: M.tdee.sd, kcal: pl.kcal, ed: pl.ed, kPerKg: P.kPerKg });
    const xy = arr => arr.map(p => ({ x: p.wk, y: kgShow(p.w) }));
    ph += `<p class="eyebrow">${t('fuel.projection')}</p>${line({ series: [{ pts: xy(pr.mid), cls: 'trend' }], band: { lo: xy(pr.lo), hi: xy(pr.hi) }, xFmt: x => (getLang() === 'fr' ? 'sem. ' : 'wk ') + x })}<p class="muted xs">${t('fuel.projNote')}</p>`;
  }
  ph += `</div>` + (S.plan.mode === mode ? chip(t('fuel.applied'), 'ok') : `<button class="btn pri" data-act="apply" data-m="${mode}"${pl.blocked ? ' disabled' : ''}>${t('fuel.apply')}</button>`);
  h += card(t('fuel.plan'), ph);
  // learning
  const o = M.obs;
  h += card(t('fuel.learn'), `<p class="muted">${t('fuel.learnLead')}</p>` + (o.ok ? `<p>${t('fuel.learnOk', { s: o.span, v: nf(rnd(o.tdee, 10)), sd: nf(rnd(o.sd, 10)), slope: (o.slopeKgWk > 0 ? '+' : '') + nf(o.slopeKgWk, 2) })}</p><p class="muted">${t('fuel.learnWeight', { pct: nf((M.tdee.wObs || 0) * 100) })}</p>` : `<p>${t('fuel.learnNeed', { w: o.nW, k: o.nK, s: o.span })}</p>`));
  // log
  const days = Object.entries(S.logs).sort((x, y) => x[0] < y[0] ? 1 : -1).slice(0, 14);
  const tr = Object.fromEntries(M.series.map(s => [s.date, s.trend]));
  h += card(t('fuel.log'), (days.length ? `<table class="tbl"><thead><tr><th>${t('common.date')}</th><th>${kgU()}</th><th>${t('today.trend')}</th><th>kcal</th><th>${t('fuel.steps')}</th></tr></thead><tbody>${days.map(([d, v]) => `<tr data-act="logedit" data-d="${d}"><td>${df(d, { day: 'numeric', month: 'short' })}</td><td>${v.w ? nf(kgShow(v.w), 1) : '–'}</td><td>${tr[d] ? nf(kgShow(tr[d]), 1) : '–'}</td><td>${v.kcal ? nf(v.kcal) : '–'}</td><td>${v.steps ? nf(v.steps) : '–'}</td></tr>`).join('')}</tbody></table>` : `<p class="muted">${t('fuel.noLog')}</p>`) + `<button class="btn ghost" data-act="logedit" data-d="${C.today()}">${t('fuel.addEntry')}</button>`);
  return h;
}

/* ---------- PHYSIQUE ---------- */
function screenPhysique(M) {
  const p = S.profile; let h = `<header class="hdr"><h1>${t('tab.physique')}</h1></header>`;
  const E = M.bfx.ens;
  if (E && !S.safety.ed) {
    const lo = Math.max(3, E.lo), hi = E.hi;
    h += card(t('phys.bf'), `<div class="kpi">${nf(E.value, 1)}<small> %</small></div><p>${t('phys.bfRange', { lo: nf(lo, 0), hi: nf(hi, 0) })}</p>${confChip(E.sd < 2.5 ? 'high' : E.sd < 4 ? 'medium' : 'low')}
      <h3>${t('phys.methods')}</h3><ul class="meth">${E.items.map(i => `<li><span>${t('phys.m.' + i.method)}${i.cal ? ' ✓' : ''}</span><b>${nf(i.value, 1)} %</b><small>±${nf(i.sd * 1.96, 1)} · ${df(i.date)} · ${t('phys.weight')} ${Math.round(i.weight * 100)} %</small></li>`).join('')}${M.bfx.stale.map(i => `<li class="stale"><span>${t('phys.m.' + i.method)}</span><b>${nf(i.value, 1)} %</b><small>${df(i.date)} · ${t('phys.stale')}</small></li>`).join('')}</ul>`, 'hero');
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
  // photos
  const photos = [...S.photos].sort((a, b) => a.date < b.date ? 1 : -1);
  h += card(t('phys.photos'), `<p class="muted xs">${t('phys.photoOnDevice')}</p>${how(t('phys.photoHow'), `<div class="poses">${poseSvg('front')}${poseSvg('side')}${poseSvg('back')}</div><dl class="proto">${t('phys.protocol').map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`)}<div class="gal">${photos.map(ph => `<button class="ph" data-act="photo" data-id="${ph.id}"><img data-photo="${ph.id}:front" alt=""><span>${df(ph.date)}${ph.ref ? ' · ' + esc(ph.ref) : ''}${ph.result ? ` · ${ph.result.cropped ? '⚠ ' : ''}${nf(ph.result.navy, 1)} %` : ''}</span></button>`).join('')}</div><button class="btn pri" data-act="photonew">${t('phys.photoNew')}</button>`);
  // tape
  const tapes = [...S.tapes].sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 6);
  h += card(t('phys.tape'), `${how(t('phys.tapeHow'), `<ol>${t('phys.tapeSteps').map(s => `<li>${esc(s)}</li>`).join('')}</ol>`)}${tapes.length ? `<table class="tbl"><thead><tr><th>${t('common.date')}</th><th>${t('phys.neck')}</th><th>${t('phys.waist').split(' (')[0]}</th><th>${t('phys.hip').split(' (')[0]}</th></tr></thead><tbody>${tapes.map(x => `<tr data-act="tape" data-id="${x.id}"><td>${df(x.date, { day: 'numeric', month: 'short' })}</td><td>${nf(cmShow(x.neck), 1)}</td><td>${nf(cmShow(x.waist), 1)}</td><td>${x.hip ? nf(cmShow(x.hip), 1) : '–'}</td></tr>`).join('')}</tbody></table>` : ''}<button class="btn ghost" data-act="tape">${t('phys.tapeAdd')}</button>`);
  // scans
  const scans = [...S.scans].sort((a, b) => a.date < b.date ? 1 : -1);
  h += card(t('phys.scans'), `${scans.map(s => `<div class="kv clickable" data-act="scan" data-id="${s.id}"><span>${t('phys.m.' + s.method)} · ${df(s.date)}</span><b>${nf(s.bf, 1)} %</b><small>${s.weight ? nf(kgShow(s.weight), 1) + ' ' + kgU() : ''}${s.lean ? ` · lean ${nf(kgShow(s.lean), 1)}` : ''}${s.vat ? ` · VAT ${nf(s.vat)} g` : ''}</small></div>`).join('')}<button class="btn ghost" data-act="scan">${t('phys.scanAdd')}</button>`);
  if (M.series.length > 1) { const last = M.series.slice(-120); h += card(t('phys.history'), line({ series: [{ pts: last.map(s => ({ x: C.dayNum(s.date), y: kgShow(s.w) })), dots: true, cls: 'raw' }, { pts: last.map(s => ({ x: C.dayNum(s.date), y: kgShow(s.trend) })), cls: 'trend' }], xFmt: x => df(new Date(x * 864e5).toISOString().slice(0, 10), { day: 'numeric', month: 'short' }) })); }
  return h;
}
function poseSvg(kind) {
  const body = kind === 'side'
    ? '<ellipse cx="50" cy="16" rx="8" ry="9"/><path d="M46 25h9l3 20-2 14 2 22-3 34h-6l-1-30-2 30h-6l1-36-2-20 3-14z"/><path d="M47 33l14 8-2 4-13-6z"/>'
    : '<ellipse cx="50" cy="16" rx="8" ry="9"/><path d="M40 27h20l4 24-3 10 2 22-4 33h-6l-2-30-2 30h-6l-4-33 2-22-3-10z"/><path d="M40 29l-12 26 3 2 12-22zM60 29l12 26-3 2-12-22z"/>';
  return `<figure><svg viewBox="0 0 100 124" class="pose">${body}<line x1="18" x2="82" y1="57" y2="57" class="g"/></svg><figcaption>${t('phys.' + kind)}</figcaption></figure>`;
}

/* ---------- ARENA ---------- */
const EVENT_GROUPS = { strength: ['bench', 'squat', 'deadlift', 'ohp'], speed: ['sprint60', 'sprint100', 'sprint200', 'sprint400'], power: ['row100', 'row200', 'row250', 'row500', 'row1min'], aerobic: ['vo2'] };
const fmtVal = (id, v) => { const k = EVENTS[id].kind; return k === 'lift' ? `${nf(kgShow(v), 1)} ${kgU()}` : k === 'rowtime' ? `${nf(v)} m` : k === 'vo2' ? `${nf(v, 1)}` : fmtTime(v); };
function screenArena(M) {
  const A = M.ar, sex = S.profile.sex;
  let h = `<header class="hdr"><h1>${t('arena.title')}</h1><p class="muted">${t('arena.lead')}</p></header>`;
  if (!sex) return h + card('', `<p class="muted">${t('ob.you')}</p>`);
  const domVals = DOMAINS.filter(d => d !== 'lean' || M.leanP != null).map(d => ({ label: t('arena.dom.' + d), v: A.dom[d] ?? null, d }));
  let top = `<div class="g2"><div class="score"><p class="eyebrow">${t('arena.peak')}</p><div class="kpi">${A.peak != null ? nf(A.peak) : '–'}</div><small>${t('arena.peakText')}</small></div><div class="score"><p class="eyebrow">${t('arena.balance')}</p><div class="kpi">${A.balance != null ? nf(A.balance) : '–'}</div><small>${t('arena.balanceText')}</small></div></div>`;
  top += radar(domVals);
  if (A.balance != null) {
    const present = domVals.filter(x => x.v != null); const weak = present.reduce((a, b) => a.v < b.v ? a : b);
    const nextP = TIER_P.find(b => b * 100 > weak.v); const vals = present.map(x => x === weak ? Math.max(x.v, (nextP || 0.999) * 100) : x.v);
    const nb = Math.exp(C.mean(vals.map(v => Math.log(Math.max(1, v)))));
    top += `<p class="tip">${t('arena.limiter', { d: weak.label, a: nf(A.balance), b: nf(nb) })}</p>`;
  } else top += `<p class="muted">${t('arena.needMore')}</p>`;
  top += `<p class="muted xs">${t('arena.gapText')}</p>`;
  h += card('', top, 'hero');
  for (const [dom, ids] of Object.entries(EVENT_GROUPS)) {
    h += card(t('arena.dom.' + dom) + (A.dom[dom] != null ? ` <span class="dscore">${nf(A.dom[dom])}</span>` : ''), ids.map(id => {
      const b = A.best[id];
      if (!b) return `<div class="ev empty" data-act="event" data-id="${id}"><span>${t('arena.ev.' + id)}</span><small>${t('arena.none')}</small></div>`;
      const r = b.r, nextTxt = r.tier < 7 ? t('arena.next', { gap: gapTxt(id, r), tier: tierName(r.tier + 1)[0] }) : t('arena.top');
      return `<div class="ev" data-act="event" data-id="${id}"><div class="evh"><span>${t('arena.ev.' + id)}</span>${tierBadge(r.tier)}</div><div class="evv"><b>${fmtVal(id, r.value)}</b><small>${df(b.pr.date)}</small></div><div class="evp">${EVENTS[id].q[sex] >= 1 ? t('arena.vsAge', { p: topPct(r.p), sex: t('sexPl.' + sex) }) : `${t('arena.vsPart', { p: topPct(r.p) })} · ${t('arena.vsAll', { p: topPct(r.pop.mid), lo: topPct(r.pop.hi), hi: topPct(r.pop.lo), sex: t('sexPl.' + sex) })}`}</div><div class="prog"><i style="width:${progress(r) * 100}%"></i></div><small class="muted">${nextTxt}</small></div>`;
    }).join('') + `<button class="btn ghost sm" data-act="pradd" data-dom="${dom}">+ ${t('arena.add')}</button>`);
  }
  h += card(t('arena.ladder'), `<ol class="ladder">${TIERS.map((_, i) => `<li>${tierBadge(i)}<span>${esc(tierName(i)[1])}</span><small>${t('tier.band')[i]}</small></li>`).reverse().join('')}</ol>${field(t('arena.variant'), selIn('profile.variant', S.profile.variant, [['classic', t('set.variant.classic')], ['f', t('set.variant.f')]]))}`);
  h += card(t('arena.calc'), `<div class="g2">${field(`${t('arena.weightKg')} (${kgU()})`, `<input type="number" inputmode="decimal" id="c1w" value="100">`)}${field(t('arena.reps'), `<input type="number" inputmode="numeric" id="c1r" value="5">`)}</div><p id="c1o" class="kpi sm"></p>`);
  return h;
}
const topPct = p => { const x = (1 - p) * 100; return x < 0.1 ? '0.1' : x < 1 ? nf(x, 1) : nf(x); };
function gapTxt(id, r) {
  const k = EVENTS[id].kind;
  if (k === 'lift') return `+${nf(kgShow(r.next - r.value), 1)} ${kgU()}`;
  if (k === 'rowtime') return `+${nf(r.next - r.value)} m`;
  if (k === 'vo2') return `+${nf(r.next - r.value, 1)}`;
  return `−${(r.value - r.next).toFixed(2)} s`;
}
function progress(r) { if (r.tier >= 7) return 1; const lo = r.tier ? C.invcdf(TIER_P[r.tier - 1]) : C.invcdf(0.005), hi = C.invcdf(TIER_P[r.tier]); return C.clamp((C.invcdf(r.p) - lo) / (hi - lo), 0, 1); }

/* ---------- SETTINGS ---------- */
function screenSettings(M) {
  const p = S.profile; let h = `<header class="hdr"><h1>${t('tab.settings')}</h1></header>`;
  h += card(t('set.profile'), `<div class="g2">${field(t('set.language'), selIn('profile.lang', p.lang, [['en', 'English'], ['fr', 'Français']]))}${field(t('set.units'), selIn('profile.units', p.units, [['metric', t('units.metric')], ['imperial', t('units.imperial')]]))}${field(t('ob.name'), `<input type="text" data-bind="profile.name" value="${esc(p.name)}">`)}${field(t('sex.m') + ' / ' + t('sex.f'), selIn('profile.sex', p.sex || '', [['', '–'], ['m', t('sex.m')], ['f', t('sex.f')]]))}${field(t('ob.dob'), `<input type="date" data-bind="profile.dob" value="${p.dob || ''}">`)}${field(`${t('ob.height')} (${cmU()})`, numIn('profile.cm', r1(cmShow(p.cm)), { conv: 'cm' }))}</div>`);
  h += card(t('set.sync'), `<p class="muted">${t('set.syncLead')}</p><p id="syncStatus" class="chip">${t('set.syncOff')}</p><div class="row wrap"><button class="btn pri" data-act="signin">${t('set.signIn')}</button><button class="btn ghost" data-act="signup">${t('set.signUp')}</button><button class="btn ghost" data-act="signout">${t('set.signOut')}</button></div>`);
  h += card(t('set.health'), `<p class="muted">${t('set.healthLead')}</p>${S.health.last ? `<p class="xs muted">${t('set.hLast', { d: df(S.health.last) })}</p>` : ''}
    <h3>${t('set.hQuick')}</h3><p class="muted">${t('set.hQuickLead')}</p>${how(t('set.guide'), `<ol class="guide">${t('set.guideSteps').map(s => `<li>${esc(s).replace(/\n/g, '<br>')}</li>`).join('')}</ol><p class="muted xs">${t('set.guideNote')}</p>`)}<button class="btn ghost" data-act="paste">${t('set.hPaste')}</button>
    <h3>${t('set.hFull')}</h3><p class="muted">${t('set.hFullLead')}</p><label class="btn pri file">${t('set.hChoose')}<input type="file" id="hkfile" accept=".zip,.xml,application/zip,text/xml" hidden></label><p id="hkprog" class="muted"></p>`);
  h += card(t('set.data'), `<div class="row wrap"><button class="btn ghost" data-act="export">${t('set.export')}</button><label class="btn ghost file">${t('set.import')}<input type="file" id="bkfile" accept=".json,application/json" hidden></label><button class="btn danger" data-act="wipe">${t('set.wipe')}</button></div>`);
  h += card(t('set.safety'), `${chk('safety.under18', S.safety.under18, t('ob.s_under18'))}${chk('safety.preg', S.safety.preg, t('ob.s_preg'))}${chk('safety.ed', S.safety.ed, t('ob.s_ed'))}${chk('safety.med', S.safety.med, t('ob.s_med'))}<h3>${t('set.helpTitle')}</h3><p>${HELPLINES.de.name}: <a href="tel:+49221892031">${HELPLINES.de.phone}</a> (${HELPLINES.de.hours}) · <a href="${HELPLINES.de.url}" target="_blank" rel="noopener">${HELPLINES.de.url.replace('https://', '')}</a></p><p>${HELPLINES.fr.name}: <a href="${HELPLINES.fr.url}" target="_blank" rel="noopener">${HELPLINES.fr.url.replace('https://www.', '')}</a></p>`);
  h += card(t('set.sources'), `<ul class="src">${Object.values(SOURCES).map(s => `<li><b>${s.url ? `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)}</a>` : esc(s.name)}</b>${s.pop ? `<span>${esc(s.pop[getLang()] || s.pop.en)}</span>` : ''}${s.conf ? confChip(s.conf) : ''}</li>`).join('')}</ul><p class="muted xs">${t('set.dataVer', { v: DATA_VERSION })}</p>`);
  h += card(t('set.about'), `<p class="muted">${t('set.disclaimer')}</p><p class="muted xs">Forge · ${DATA_VERSION}</p>`);
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

/* ---------- sheets ---------- */
function sheet(html, mount) {
  const d = $('#sheet'); d.innerHTML = `<form method="dialog" class="sh">${html}</form>`; d.showModal();
  d.querySelectorAll('[data-close]').forEach(b => b.onclick = e => { e.preventDefault(); d.close(); });
  if (mount) mount(d); return d;
}
const fv = (f, k) => { const v = f.elements[k]?.value; return v === '' || v == null ? null : v; };
function logSheet(date) {
  const v = S.logs[date] || {};
  sheet(`<h2>${t('fuel.addEntry')}</h2>${field(t('common.date'), `<input type="date" name="d" value="${date}">`)}<div class="g2">${field(`${t('today.weight')} (${kgU()})`, `<input type="number" step="any" inputmode="decimal" name="w" value="${r1(kgShow(v.w))}">`)}${field('kcal', `<input type="number" inputmode="numeric" name="kcal" value="${v.kcal ?? ''}">`)}${field(t('fuel.protein'), `<input type="number" step="any" name="p" value="${v.p ?? ''}">`)}${field(t('fuel.carbs'), `<input type="number" step="any" name="c" value="${v.c ?? ''}">`)}${field(t('fuel.fat'), `<input type="number" step="any" name="f" value="${v.f ?? ''}">`)}${field(t('fuel.steps'), `<input type="number" name="steps" value="${v.steps ?? ''}">`)}</div><div class="row"><button class="btn ghost" data-close>${t('common.cancel')}</button><button class="btn pri" data-save>${t('common.save')}</button></div>`, d => {
    d.querySelector('[data-save]').onclick = e => { e.preventDefault(); const f = d.querySelector('form'); const date2 = fv(f, 'd') || date; const n = k => fv(f, k) == null ? '' : +fv(f, k); logDay(date2, { w: fv(f, 'w') == null ? '' : kgRead(fv(f, 'w')), kcal: n('kcal'), p: n('p'), c: n('c'), f: n('f'), steps: n('steps') }); save(); d.close(); render(); toast(t('common.saved')); };
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
    return `${field(t('arena.method'), `<select name="method">${['lab', 'cycle', 'watch', 'cooper'].map(x => `<option value="${x}">${t('arena.vm.' + x)}</option>`).join('')}</select>`)}<div class="g2">${field(t('arena.value'), `<input type="number" step="any" name="value">`)}${field(t('arena.cooperM'), `<input type="number" name="meters">`)}</div>`;
  };
  sheet(`<h2>${t('arena.add')}</h2>${field(t('arena.event'), `<select name="event">${ids.map(id => `<option value="${id}">${t('arena.ev.' + id)}</option>`).join('')}</select>`)}<div id="prbody">${body(ev0)}</div>${field(t('common.date'), `<input type="date" name="date" value="${C.today()}">`)}<div class="row"><button class="btn ghost" data-close>${t('common.cancel')}</button><button class="btn pri" data-save>${t('common.save')}</button></div>`, d => {
    const f = d.querySelector('form');
    f.elements.event.onchange = () => { $('#prbody', d).innerHTML = body(f.elements.event.value); };
    d.querySelector('[data-save]').onclick = e => {
      e.preventDefault(); const id = fv(f, 'event'), k = EVENTS[id].kind, pr = { id: uid(), event: id, date: fv(f, 'date') || C.today() };
      if (k === 'lift') Object.assign(pr, { weight: kgRead(fv(f, 'weight')), reps: +fv(f, 'reps') || 1, rir: +fv(f, 'rir') || 0, bw: kgRead(fv(f, 'bw')) });
      else if (k === 'sprint') Object.assign(pr, { time: parseTime(fv(f, 'time')), timing: fv(f, 'timing'), wind: fv(f, 'wind') == null ? null : +fv(f, 'wind') });
      else if (k === 'row') pr.time = parseTime(fv(f, 'time'));
      else if (k === 'rowtime') pr.meters = +fv(f, 'meters');
      else Object.assign(pr, { method: fv(f, 'method'), value: fv(f, 'value') == null ? null : +fv(f, 'value'), meters: fv(f, 'meters') == null ? null : +fv(f, 'meters') });
      const r = C.prValue(pr); if (!(r.value > 0)) { toast('?'); return; }
      upsert('prs', pr); d.close(); render(); toast(t('common.saved'));
    };
  });
}
function eventSheet(id) {
  const M = model(), who = M.who, an = C.anchorsFor(id, { sex: who.sex, bw: who.kg, age: who.age }), ev = EVENTS[id], src = SOURCES[ev.src];
  const rows = TIERS.map((_, i) => { const v = i === 0 ? null : an.dec(C.valueAtP(TIER_P[i - 1], an.A)); return `<tr><td>${tierBadge(i)}</td><td>${v == null ? '–' : (an.lowerBetter ? '≤ ' : '≥ ') + fmtVal(id, v)}</td><td class="muted">${t('tier.band')[i]}</td></tr>`; }).reverse().join('');
  const prs = S.prs.filter(p => p.event === id).sort((a, b) => a.date < b.date ? 1 : -1);
  const tipKey = ev.kind === 'lift' ? 'lift' : ev.kind === 'sprint' ? 'sprint' : ev.kind === 'vo2' ? 'vo2' : 'row';
  sheet(`<h2>${t('arena.ev.' + id)}</h2><h3>${t('arena.standards')}</h3><p class="muted xs">${ev.kind === 'lift' ? `${t('arena.bwThen')}: ${nf(kgShow(who.kg), 1)} ${kgU()} · ` : ''}${t('sex.' + who.sex)}${ev.kind === 'vo2' || ev.kind === 'sprint' ? ` · ${who.age}` : ''}</p><table class="tbl std">${rows}</table>
    <h3>${t('arena.history')}</h3>${prs.length ? `<ul class="hist">${prs.map(p => { const r = C.evaluatePR(p, who); return `<li><span>${df(p.date)}</span><b>${r.value ? fmtVal(id, r.value) : '–'}</b>${r.rankable ? tierBadge(r.tier) : ''}${r.note ? `<small>${t('arena.note.' + r.note)}</small>` : r.est ? `<small>${t('arena.note.est')}</small>` : ''}<button class="lnk danger" data-delpr="${p.id}">×</button></li>`; }).join('')}</ul>` : `<p class="muted">${t('arena.none')}</p>`}
    <h3>${t('arena.improve')}</h3><ul>${t('arena.tips.' + tipKey).map(s => `<li>${esc(s)}</li>`).join('')}</ul>
    <p class="xs muted">${t('common.source')}: ${src.url ? `<a href="${src.url}" target="_blank" rel="noopener">${esc(src.name)}</a>` : esc(src.name)} · ${esc(src.pop?.[getLang()] || '')} ${confChip(src.conf)}${ev.src === 'c2m' ? ' · ' + t('arena.note.modelled') : ''}${an.clampedBw ? ' · ' + t('arena.note.clampedBw') : ''}</p>
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
    ${res ? `<p>${t('phys.measured', { w: nf(cmShow(res.cm.waist), 1), n: nf(cmShow(res.cm.neck), 1), h: S.profile.sex === 'f' ? `, ${t('phys.hip').split(' (')[0].toLowerCase()} ${nf(cmShow(res.cm.hip), 1)} cm` : '' })} → Navy ${nf(res.navy, 1)} %, RFM ${nf(res.rfm, 1)} %</p>` : ''}
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
      const show = m => { const r = measure(m.front, m.side, S.profile.cm, S.profile.sex, cal); if (!r) return; out.innerHTML = `${a.cropped ? `<b class="err">${t('phys.cropped')}</b><br>` : ''}${a.auto ? '' : t('phys.measureFail') + '<br>'}${t('phys.measureManual')}<br><b>${t('phys.measured', { w: nf(cmShow(r.cm.waist), 1), n: nf(cmShow(r.cm.neck), 1), h: S.profile.sex === 'f' ? ', ' + nf(cmShow(r.cm.hip), 1) : '' })}</b> → Navy ${nf(r.navy, 1)} % · RFM ${nf(r.rfm, 1)} %<br><small>${cal.waist ? t('phys.calibrate', { d: df(cal.date) }) : t('phys.uncal')}</small>`; };
      editor(d.querySelector('#edit'), urls, a, show); show(a);
      mb.textContent = t('common.save'); mb.disabled = false;
      mb.onclick = ev => { ev.preventDefault(); const raw = measure(a.front, a.side, S.profile.cm, S.profile.sex, {}); const r = measure(a.front, a.side, S.profile.cm, S.profile.sex, cal); ph.result = { raw: raw.cm, cm: r.cm, navy: r.navy, rfm: r.rfm, calibrated: !!cal.waist, auto: a.auto, cropped: !!(a.cropped && !(a.front.limAdj || a.side.limAdj)) }; ph.model = { front: a.front, side: a.side }; save(); d.close(); render(); toast(t('common.saved')); };
    };
  });
}

/* ---------- Apple Health ---------- */
function applyHealth(res) {
  let n = 0;
  for (const [d, v] of Object.entries(res.days)) { logDay(d, v, 'health'); n++; }
  S.health.last = C.today(); save();
  const sm = summarise(res, C.ageAt(S.profile.dob));
  toast(n || res.workouts.length ? t('set.hDone', { d: n, w: res.workouts.length }) : t('set.hNone'));
  setTimeout(() => {
    if (sm.stepsAvg && Math.abs(sm.stepsAvg - (S.activity.stepsAvg || 0)) > 300 && confirm(t('set.hApplySteps', { v: nf(sm.stepsAvg) }))) S.activity.stepsAvg = sm.stepsAvg;
    if (sm.workouts.length && confirm(t('set.hApplyWorkouts'))) S.activity.workouts = sm.workouts;
    if (sm.vo2 && !S.prs.some(p => p.event === 'vo2' && p.date === sm.vo2.date) && confirm(t('set.hApplyVo2', { v: nf(sm.vo2.value, 1) }))) S.prs.push({ id: uid(), event: 'vo2', method: 'watch', value: sm.vo2.value, date: sm.vo2.date });
    save(); render();
  }, 300);
}
async function pasteShortcut() {
  try { const txt = await navigator.clipboard.readText(); applyHealth(parseShortcut(txt, getLang() === 'fr' || /de|fr/i.test(navigator.language))); }
  catch (e) { toast(t('set.hErr', { e: e.message || e })); }
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
    wadd: () => { S.activity.workouts.push({ type: 'strength', minutes: 60, perWeek: 3, intensity: 'moderate' }); save(); render(); },
    wdel: () => { S.activity.workouts.splice(+el.dataset.i, 1); save(); render(); },
    mode: () => { previewMode = el.dataset.m; render(); },
    rate: () => { S.plan.ratePct = +el.dataset.r; save(); render(); },
    apply: () => { S.plan.mode = el.dataset.m; S.plan.applied = C.today(); previewMode = null; save(); render(); toast(t('common.saved')); },
    logedit: () => logSheet(el.dataset.d), tape: () => tapeSheet(el.dataset.id), scan: () => scanSheet(el.dataset.id),
    photonew: () => photoNewSheet(), photo: () => photoSheet(el.dataset.id),
    pradd: () => prSheet(null, el.dataset.dom), event: () => eventSheet(el.dataset.id),
    paste: () => pasteShortcut(),
    sex: () => { S.profile.sex = el.dataset.s; save(); render(); },
    obnext: () => obMove(1), obback: () => obMove(-1),
    export: async () => { const b = await exportBackup(true); const u = URL.createObjectURL(b); const x = document.createElement('a'); x.href = u; x.download = `forge-backup-${C.today()}.json`; x.click(); setTimeout(() => URL.revokeObjectURL(u), 4000); },
    wipe: async () => { if (!confirm(t('set.wipeConfirm'))) return; await clearPhotos().catch(() => { }); reset(); ob = { step: 0 }; render(); },
    signin: () => window.Cloud?.dialog(() => render()),
    signout: async () => { await window.Cloud?.signOut(); render(); },
    signup: () => signupSheet()
  };
  acts[a]?.();
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
  if (el.id === 'hkfile' && el.files[0]) return importHealthFile(el.files[0]);
  if (el.id === 'bkfile' && el.files[0]) return el.files[0].text().then(importBackup).then(kind => { setLang(S.profile.lang); toast(t('set.imported')); if (ob && kind === 'merge') ob.step = 1; render(); }).catch(err => toast(t('set.hErr', { e: err.message })));
  if (el.id === 'c1w' || el.id === 'c1r') return calc1rm();
  const b = el.dataset?.bind; if (!b) return;
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.type === 'number') v = v === '' ? null : +v;
  if (el.dataset.conv === 'kg') v = kgRead(v); else if (el.dataset.conv === 'cm') v = cmRead(v);
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
  if (ob.step >= 5) { S.profile.onboarded = true; save(true); ob = null; tab = 'today'; }
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
  main.innerHTML = html;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll('#tabs [data-l]').forEach(s => s.textContent = t('tab.' + s.dataset.l));
  main.querySelectorAll('img[data-photo]').forEach(async im => { const u = await photoUrl(im.dataset.photo); if (u) im.src = u; else im.replaceWith(Object.assign(document.createElement('span'), { className: 'miss', textContent: t('phys.photoElsewhere') })); });
  if (tab === 'arena') calc1rm();
  if (tab === 'settings') paintSync();
}
export function paintSync() {
  const el = $('#syncStatus'); if (!el || !window.Cloud) return;
  window.Cloud.session().then(s => { el.textContent = s ? `✓ ${s.user.email}` : t('set.syncOff'); el.className = 'chip ' + (s ? 'ok' : ''); }).catch(() => { });
}
export function init() {
  setLang(S.profile.lang);
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChangeEv);
  $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') e.target.close(); });
  importFromHash();
  render();
}
