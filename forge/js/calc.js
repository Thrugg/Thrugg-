/* Forge — calculation engine. Pure functions, no DOM, metric units. Tested in test/calc.test.mjs. */
import { STRENGTH, SL_P, C2, FRIEND, FRIEND_P, BF_NHANES, BF_P, SPRINT, TIER_P, EVENTS, CATALOGUE, INTENSITIES, OCCUPATION } from './data.js';

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const sum = a => a.reduce((s, x) => s + (x || 0), 0);
export const mean = a => a.length ? sum(a) / a.length : NaN;
const log10 = Math.log10;

/* ---------- dates ---------- */
export const iso = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
export const today = () => iso(new Date());
export const dayNum = s => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5);
export const addDays = (s, n) => { const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) + n * 864e5); return d.toISOString().slice(0, 10); };
export function ageAt(dob, at = today()) {
  if (!dob) return null;
  let a = +at.slice(0, 4) - +dob.slice(0, 4);
  if (at.slice(5) < dob.slice(5)) a--;
  return a;
}

/* ---------- normal distribution ---------- */
function erfc(x) {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
export const cdf = z => 0.5 * erfc(-z / Math.SQRT2);
export function invcdf(p) { // Acklam
  p = clamp(p, 1e-9, 1 - 1e-9);
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/* ---------- body size ---------- */
export const bmi = (kg, cm) => kg / (cm / 100) ** 2;
export const ffmi = (ffm, cm) => ffm / (cm / 100) ** 2;
export const ffmiNorm = (ffm, cm) => ffmi(ffm, cm) + 6.1 * (1.8 - cm / 100);
export const whtr = (waist, cm) => waist / cm;

/* ---------- resting metabolic rate ---------- */
export function rmrEquations({ sex, kg, cm, age, ffm }) {
  const m = sex === 'm', H = cm / 100;
  const r = {
    mifflin: 10 * kg + 6.25 * cm - 5 * age + (m ? 5 : -161),
    harris: m ? 88.362 + 13.397 * kg + 4.799 * cm - 5.677 * age : 447.593 + 9.247 * kg + 3.098 * cm - 4.330 * age,
    tinsleyBW: 24.8 * kg + 10,
    tenHaafBW: 11.936 * kg + 587.728 * H - 8.129 * age + 191.027 * (m ? 1 : 0) + 29.279
  };
  if (ffm > 0) Object.assign(r, { katch: 370 + 21.6 * ffm, cunningham: 500 + 22 * ffm, tinsleyFFM: 25.9 * ffm + 284, tenHaafFFM: 22.771 * ffm + 484.264 });
  return r;
}
export function rmrEnsemble(p) {
  const e = rmrEquations(p);
  let parts;
  if (p.ffm > 0 && p.trained) parts = [['mifflin', 0.25], ['tinsleyFFM', 0.25], ['tenHaafFFM', 0.25], ['cunningham', 0.25]];
  else if (p.ffm > 0) parts = [['mifflin', 0.5], ['katch', 0.5]];
  else if (p.trained) parts = [['mifflin', 0.5], ['tinsleyBW', 0.25], ['tenHaafBW', 0.25]];
  else parts = [['mifflin', 1]];
  const value = sum(parts.map(([k, w]) => w * e[k]));
  return { value, eq: e, parts, sd: 0.10 * value };
}

/* ---------- activity ---------- */
export const strideM = (sex, cm, overrideCm) => overrideCm > 0 ? overrideCm / 100 : (sex === 'm' ? 0.415 : 0.413) * cm / 100;
export function isTrained(inp) {
  const sessions = sum((inp.workouts || []).filter(w => CATALOGUE[w.type]?.strength).map(w => +w.perWeek || 0));
  return sessions >= 3 || (sessions >= 2 && (inp.trainingYears || 0) >= 1);
}
export function metFor(w) {
  const c = CATALOGUE[w.type] || CATALOGUE.other;
  if (c.watts && w.watts > 0) { const band = c.watts.find(b => w.watts <= b[0]); return { met: band[1], code: band[2] }; }
  const i = Math.max(0, INTENSITIES.indexOf(w.intensity || 'moderate'));
  return { met: c.met[i], code: c.codes[i] };
}
export function workoutEnergy(w, kg, CF) {
  const c = CATALOGUE[w.type] || CATALOGUE.other;
  const min = +w.minutes || 0, per = +w.perWeek || 0;
  const { met, code } = metFor(w);
  let session, method;
  if (c.pace && w.paceKmh > 0) { session = c.pace * kg * (w.paceKmh * min / 60); method = 'pace'; }
  else { session = (met - 1) * CF * kg * (min / 60); method = 'met'; }
  const week = session * per;
  const epoc = (w.intensity === 'light' ? 0 : 0.05) * week;
  return { type: w.type, met, code, method, session, kcalDay: week / 7, epocDay: epoc / 7, hoursDay: min * per / 60 / 7, stepsDay: (c.cadence || 0) * min * per / 7 };
}

/* Predicted maintenance (component model). Returns every component and a 1-SD band. */
export function predictTdee(inp) {
  const trained = isTrained(inp);
  const rmr = rmrEnsemble({ ...inp, trained });
  const kg = inp.kg, CF = rmr.value / (kg * 24);
  const items = (inp.workouts || []).filter(w => (+w.minutes > 0) && (+w.perWeek > 0)).map(w => workoutEnergy(w, kg, CF));
  const exercise = sum(items.map(i => i.kcalDay)), epoc = sum(items.map(i => i.epocDay)), exHours = sum(items.map(i => i.hoursDay));
  const wkSteps = inp.stepsIncludeWorkouts === false ? 0 : sum(items.map(i => i.stepsDay));
  const steps = Math.max(0, (+inp.stepsAvg || 0) - wkSteps);
  const km = steps * strideM(inp.sex, inp.cm, inp.strideCm) / 1000;
  const stepsKcal = 0.5 * kg * km;
  const flightsKcal = (+inp.flightsAvg || 0) * 3 * 1.8 / 1000 * 5 * kg;
  const walkH = steps / 100 / 60;
  const sleepH = clamp(+inp.sleepH || 7.5, 4, 11);
  const awakeH = Math.max(0, 24 - sleepH - exHours - walkH);
  const occ = OCCUPATION[inp.occupation] || OCCUPATION.desk;
  const neat = awakeH * (occ - 1) * CF * kg + sleepH * (0.95 - 1) * CF * kg;
  const pre = rmr.value + neat + stepsKcal + flightsKcal + exercise + epoc;
  const tdee = pre / 0.9;
  const activity = neat + stepsKcal + flightsKcal + exercise + epoc;
  const sd = Math.sqrt(rmr.sd ** 2 + (0.25 * activity) ** 2) / 0.9;
  const kPerKg = (10 + (stepsKcal + flightsKcal + exercise + epoc + neat) / kg) / 0.9;
  return { trained, rmr, CF, items, exercise, epoc, steps, wkSteps, km, stepsKcal, flightsKcal, neat, awakeH, tef: tdee - pre, tdee, sd, kPerKg };
}

/* ---------- energy density of weight change (Forbes partition, Hall's tissue energies) ---------- */
export function energyDensity(fmKg, trained, dir) {
  const p0 = 10.4 / (10.4 + Math.max(2, fmKg || 15));
  const p = dir < 0 ? (trained ? p0 * 0.5 : p0) : clamp(p0 + (trained ? 0.15 : 0), 0.1, 0.7);
  return p * 1816 + (1 - p) * 9440;
}

/* ---------- trend weight and adaptive maintenance ---------- */
export function trendSeries(points, alpha = 0.1) { // points: [{date, w}] any order
  const s = points.filter(p => p.w > 0).sort((a, b) => a.date < b.date ? -1 : 1);
  let t = null, last = null;
  return s.map(p => {
    if (t == null) t = p.w;
    else { const gap = Math.max(1, dayNum(p.date) - dayNum(last)); const a = 1 - (1 - alpha) ** gap; t = t + a * (p.w - t); }
    last = p.date; return { date: p.date, w: p.w, trend: t };
  });
}
export function regress(xy) {
  const n = xy.length; if (n < 3) return null;
  const mx = mean(xy.map(p => p[0])), my = mean(xy.map(p => p[1]));
  let sxx = 0, sxy = 0; for (const [x, y] of xy) { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); }
  if (sxx === 0) return null;
  const slope = sxy / sxx, icpt = my - slope * mx;
  let sse = 0; for (const [x, y] of xy) sse += (y - icpt - slope * x) ** 2;
  return { slope, icpt, se: Math.sqrt(sse / (n - 2) / sxx), n };
}
/* logs: { 'YYYY-MM-DD': { w, kcal } } */
export function adaptiveTdee(logs, { end = today(), days = 28, fmKg, trained } = {}) {
  const start = addDays(end, -(days - 1));
  const rows = Object.entries(logs || {}).filter(([d]) => d >= start && d <= end).sort();
  const W = rows.filter(([, v]) => v.w > 0).map(([d, v]) => [dayNum(d), v.w]);
  const K = rows.filter(([, v]) => v.kcal > 0).map(([, v]) => v.kcal);
  const first = rows.length ? dayNum(rows[0][0]) : 0, span = rows.length ? dayNum(rows[rows.length - 1][0]) - first + 1 : 0;
  const out = { ok: false, nW: W.length, nK: K.length, span, need: { weights: 4, intakeDays: Math.max(10, Math.ceil(0.7 * Math.max(span, 14))), span: 14 } };
  if (span < 14 || W.length < 4 || K.length < out.need.intakeDays) return out;
  const r = regress(W); if (!r) return out;
  const ed = energyDensity(fmKg, trained, r.slope < 0 ? -1 : 1);
  const intake = mean(K);
  return { ...out, ok: true, tdee: intake - r.slope * ed, sd: Math.sqrt((ed * r.se) ** 2 + 100 ** 2), slopeKgWk: r.slope * 7, intake, ed, coverage: K.length / span };
}
export function blend(pred, predSd, obs) {
  if (!obs || !obs.ok) return { value: pred, sd: predSd, source: 'predicted' };
  const wp = 1 / predSd ** 2, wo = 1 / obs.sd ** 2;
  return { value: (pred * wp + obs.tdee * wo) / (wp + wo), sd: 1 / Math.sqrt(wp + wo), source: 'blended', wObs: wo / (wp + wo) };
}
export const confidence = sd => sd < 130 ? 'high' : sd < 230 ? 'medium' : 'low';

/* ---------- plans ---------- */
export function recommendMode({ sex, bf, ffmiN, trainingYears = 0, bmiV, blockDeficit }) {
  if (blockDeficit) return { mode: 'maintain', reason: 'safety' };
  if (bmiV != null && bmiV < 18.5) return { mode: 'maintain', reason: 'underweight' };
  if (bf == null) return { mode: 'maintain', reason: 'needBf' };
  const m = sex === 'm';
  if (bf >= (m ? 20 : 30)) return { mode: 'cut', reason: 'highBf' };
  if (bf >= (m ? 15 : 25)) return trainingYears < 1 ? { mode: 'recomp', reason: 'novice' } : { mode: 'cut', reason: 'cutFirst', alt: 'bulk' };
  if (bf >= (m ? 10 : 18)) {
    const near = ffmiN != null && ffmiN >= (m ? 23 : 19.5);
    return near ? { mode: 'bulk', slow: true, reason: 'nearCeiling' } : { mode: 'bulk', reason: 'leanBulk' };
  }
  return { mode: 'maintain', reason: 'veryLean', alt: 'bulk' };
}
export const bulkSurplus = years => years < 1 ? 0.15 : years < 3 ? 0.10 : 0.05;
/* ctx: { mode, ratePct, tdee, kg, cm, ffm, fmKg, sex, trained, exerciseDay, rmr, fatPct, meals, trainingYears, blockDeficit, customKcal } */
export function makePlan(ctx) {
  const { mode, kg, tdee, sex } = ctx;
  const flags = [];
  let delta = 0, weeklyKg = 0, ed = null;
  if (mode === 'cut') { ed = energyDensity(ctx.fmKg, ctx.trained, -1); weeklyKg = -(ctx.ratePct || 0.5) / 100 * kg; delta = weeklyKg * ed / 7; }
  else if (mode === 'recomp') { delta = -0.05 * tdee; ed = energyDensity(ctx.fmKg, ctx.trained, -1); weeklyKg = delta * 7 / ed; }
  else if (mode === 'bulk') { const s = ctx.slow ? Math.min(0.07, bulkSurplus(ctx.trainingYears || 0)) : bulkSurplus(ctx.trainingYears || 0); delta = s * tdee; ed = energyDensity(ctx.fmKg, ctx.trained, 1); weeklyKg = delta * 7 / ed; }
  else if (mode === 'custom' && ctx.customKcal > 0) { delta = ctx.customKcal - tdee; ed = energyDensity(ctx.fmKg, ctx.trained, delta < 0 ? -1 : 1); weeklyKg = delta * 7 / ed; }
  let kcal = tdee + delta;
  if (ctx.blockDeficit && kcal < tdee) { kcal = tdee; delta = 0; weeklyKg = 0; flags.push('safetyBlock'); }
  const floor = Math.max(ctx.rmr || 0, sex === 'm' ? 1500 : 1200);
  let blocked = false;
  if (kcal < floor) { flags.push('belowFloor'); blocked = true; }
  // protein
  const leanRef = ctx.ffm > 0 ? ctx.ffm : null;
  const refKg = bmi(kg, ctx.cm) > 30 ? 25 * (ctx.cm / 100) ** 2 : kg;
  let protein;
  if (mode === 'cut' || (mode === 'custom' && delta < 0)) protein = leanRef ? 2.7 * leanRef : 2.2 * refKg;
  else if (mode === 'recomp') protein = leanRef ? 2.6 * leanRef : 2.2 * refKg;
  else if (mode === 'bulk') protein = 1.9 * refKg;
  else protein = 2.0 * refKg;
  const fatPct = clamp(ctx.fatPct || 25, 15, 40);
  let fat = Math.max(kcal * fatPct / 100 / 9, 0.5 * kg);
  let carbs = (kcal - protein * 4 - fat * 9) / 4;
  if (carbs < 0) { fat = Math.max(0.5 * kg, (kcal - protein * 4) / 9); carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4); }
  if (carbs < 100) flags.push('lowCarb');
  // energy availability
  const ffm = ctx.ffm > 0 ? ctx.ffm : null;
  const ea = ffm ? (kcal - (ctx.exerciseDay || 0)) / ffm : null;
  let eaLevel = null;
  if (ea != null) { eaLevel = ea < 25 ? 'red' : ea < 30 ? 'amber' : 'ok'; if (eaLevel === 'red') { flags.push('eaRed'); blocked = true; } else if (eaLevel === 'amber') flags.push('eaAmber'); }
  if (mode === 'cut' && (ctx.ratePct || 0) > 1) flags.push('fastCut');
  // the most aggressive kcal target that keeps EA >= 25 and above the floor
  const minKcal = Math.max(floor, ffm ? 25 * ffm + (ctx.exerciseDay || 0) : floor);
  const meals = clamp(ctx.meals || 4, 2, 6);
  return { kcal, delta, weeklyKg, weeklyPct: weeklyKg / kg * 100, ed, protein, fat, carbs, ea, eaLevel, flags, blocked, minKcal, perMeal: protein / meals, perMealPerKg: protein / meals / kg };
}
/* Weekly simulation of body weight under a fixed intake, maintenance falling with weight. */
export function project({ kg, tdee, sd, kcal, ed, kPerKg, weeks = 16 }) {
  const run = t0 => { const pts = [{ wk: 0, w: kg }]; let w = kg; for (let i = 1; i <= weeks; i++) { const t = t0 + kPerKg * (w - kg); w += (kcal - t) * 7 / (ed || 7000); pts.push({ wk: i, w }); } return pts; };
  return { mid: run(tdee), lo: run(tdee + sd), hi: run(tdee - sd) };
}

/* ---------- body fat ---------- */
export function bfNavy(sex, cm, neck, waist, hip) {
  if (!(cm > 0 && neck > 0 && waist > 0)) return null;
  if (sex === 'm') { const d = waist - neck; return d > 0 ? 495 / (1.0324 - 0.19077 * log10(d) + 0.15456 * log10(cm)) - 450 : null; }
  if (!(hip > 0)) return null;
  const d = waist + hip - neck; return d > 0 ? 495 / (1.29579 - 0.35004 * log10(d) + 0.22100 * log10(cm)) - 450 : null;
}
export const bfRFM = (sex, cm, waist) => (cm > 0 && waist > 0) ? (sex === 'm' ? 64 : 76) - 20 * cm / waist : null;
export const bfDeurenberg = (sex, bmiV, age) => 1.2 * bmiV + 0.23 * age - 10.8 * (sex === 'm' ? 1 : 0) - 5.4;
/* 1-SD error (body-fat points) of each method against DXA; Forge design values from the cited validation literature. */
export const BF_SD = { dxa: 1.5, bodpod: 2.5, bia_pro: 4.5, bia: 6.0, navy: 3.8, rfm: 3.8, navy_photo: 4.8, rfm_photo: 4.8, deurenberg: 4.1, deurenberg_trained: 6.5, visual: 5.0 };
/* items: [{ method, value, sd }] — inverse-variance mean plus a heterogeneity term. */
export function bfEnsemble(items) {
  const xs = items.filter(i => i.value > 2 && i.value < 70);
  if (!xs.length) return null;
  const w = xs.map(i => 1 / i.sd ** 2), W = sum(w);
  const value = sum(xs.map((i, k) => i.value * w[k])) / W;
  const tau2 = xs.length > 1 ? sum(xs.map((i, k) => w[k] * (i.value - value) ** 2)) / W : 0;
  const sd = Math.max(1.2, Math.sqrt(1 / W + tau2));
  return { value, sd, lo: value - 1.96 * sd, hi: value + 1.96 * sd, items: xs.map((i, k) => ({ ...i, weight: w[k] / W })) };
}
/* Ellipse perimeter (Ramanujan II) from full width and depth. */
export function ellipse(width, depth) {
  const a = width / 2, b = depth / 2, h = ((a - b) / (a + b)) ** 2;
  return Math.PI * (a + b) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h)));
}

/* ---------- percentiles from anchor points ---------- */
/* A: [{ p, v }] with p ascending and v ascending (higher v = better). Linear in z between anchors,
   linear extension of the end segments beyond them. */
export function pctFromAnchors(v, A) {
  const z = A.map(a => invcdf(a.p)), n = A.length - 1;
  let zz;
  if (v <= A[0].v) zz = z[0] - (A[0].v - v) * (z[1] - z[0]) / (A[1].v - A[0].v);
  else if (v >= A[n].v) zz = z[n] + (v - A[n].v) * (z[n] - z[n - 1]) / (A[n].v - A[n - 1].v);
  else { let i = 0; while (v > A[i + 1].v) i++; zz = z[i] + (v - A[i].v) / (A[i + 1].v - A[i].v) * (z[i + 1] - z[i]); }
  return clamp(cdf(zz), 0.0005, 0.9995);
}
export function valueAtP(p, A) {
  const z = A.map(a => invcdf(a.p)), n = A.length - 1, zp = invcdf(p);
  if (zp <= z[0]) return A[0].v - (z[0] - zp) * (A[1].v - A[0].v) / (z[1] - z[0]);
  if (zp >= z[n]) return A[n].v + (zp - z[n]) * (A[n].v - A[n - 1].v) / (z[n] - z[n - 1]);
  let i = 0; while (zp > z[i + 1]) i++;
  return A[i].v + (zp - z[i]) / (z[i + 1] - z[i]) * (A[i + 1].v - A[i].v);
}
export const tierOf = p => TIER_P.filter(b => p >= b).length;

/* Anchors for each event. Each returns { A, enc, dec } where enc converts a raw result to the anchor scale
   (higher = better) and dec converts back for display. */
function interpRows(bw, bws, rows) {
  if (bw <= bws[0]) return rows[0];
  if (bw >= bws[bws.length - 1]) return rows[rows.length - 1];
  let i = 0; while (bw > bws[i + 1]) i++;
  const t = (bw - bws[i]) / (bws[i + 1] - bws[i]);
  return rows[i].map((v, k) => v + t * (rows[i + 1][k] - v));
}
const c2Times = (dist, sex) => {
  const s = sex === 'm' ? 'm' : 'f', a = C2[100][s].t, b = C2[500][s].t, out = {};
  for (const p of Object.keys(a)) {
    if (dist === 100) out[p] = a[p]; else if (dist === 500) out[p] = b[p];
    else { const k = Math.log(b[p] / a[p]) / Math.log(5); out[p] = a[p] * (dist / 100) ** k; }
  }
  return out;
};
const c2Meters = (secs, sex) => {
  const s = sex === 'm' ? 'm' : 'f', a = C2[100][s].t, b = C2[500][s].t, out = {};
  for (const p of Object.keys(a)) { const k = Math.log(b[p] / a[p]) / Math.log(5); out[p] = 100 * (secs / a[p]) ** (1 / k); }
  return out;
};
export function sprintFactor(age, sex) { return age > 35 ? Math.max(0.5, 1 - SPRINT.slope[sex === 'm' ? 'm' : 'f'] * (age - 35)) : 1; }
export function anchorsFor(id, { sex, bw, age }) {
  const ev = EVENTS[id], s = sex === 'm' ? 'm' : 'f';
  if (ev.kind === 'lift') {
    const t = STRENGTH[id][s], row = interpRows(bw || (s === 'm' ? 80 : 60), t.bw, t.rows);
    const out = bw < t.bw[0] || bw > t.bw[t.bw.length - 1];
    return { A: SL_P.map((p, i) => ({ p, v: row[i] })), enc: x => x, dec: v => v, unit: 'kg', clampedBw: out };
  }
  if (ev.kind === 'sprint') {
    const wr = SPRINT.wr[ev.dist][s] / sprintFactor(age || 30, s);
    return { A: [0.05, 0.2, 0.5, 0.8, 0.95, 0.99, 0.999].map((p, i) => ({ p, v: SPRINT.ag[i] })), enc: t => 100 * wr / t, dec: ag => 100 * wr / ag, unit: 's', lowerBetter: true };
  }
  if (ev.kind === 'row') {
    const T = c2Times(ev.dist, s);
    return { A: Object.keys(T).map(Number).sort((a, b) => a - b).map(p => ({ p, v: -Math.log(T[p]) })), enc: t => -Math.log(t), dec: v => Math.exp(-v), unit: 's', lowerBetter: true };
  }
  if (ev.kind === 'rowtime') {
    const M = c2Meters(ev.secs, s);
    return { A: Object.keys(M).map(Number).sort((a, b) => a - b).map(p => ({ p, v: M[p] })), enc: x => x, dec: v => v, unit: 'm' };
  }
  if (ev.kind === 'vo2') {
    const band = clamp(Math.floor((age || 30) / 10) * 10, 20, 80);
    return { A: FRIEND_P.map((p, i) => ({ p, v: FRIEND[s][band][i] })), enc: x => x, dec: v => v, unit: 'ml/kg/min', band };
  }
  throw new Error('unknown event ' + id);
}
export function bfAnchors(sex, age) {
  const band = clamp(Math.floor((age || 30) / 5) * 5, 20, 85);
  return { A: BF_P.map((p, i) => ({ p, v: BF_NHANES[sex === 'm' ? 'm' : 'f'][band][i] })), band };
}
/* Share of all adults of the same sex below a result: participants (share q) plus non-participants,
   modelled as the participant distribution shifted down by `delta` standard deviations (central 1.5:
   an untrained adult sits near the participants' 5th–10th percentile; range 1.0–2.25). */
export function popPct(pPart, q, delta = 1.5) { if (q >= 1) return pPart; const z = invcdf(pPart); return (1 - q) * cdf(z + delta) + q * pPart; }
export function popRange(pPart, q) {
  if (q >= 1) return { lo: pPart, mid: pPart, hi: pPart };
  return { lo: popPct(pPart, Math.min(1, q * 1.5), 1.0), mid: popPct(pPart, q, 1.5), hi: popPct(pPart, q * 0.5, 2.25) };
}

/* ---------- PR evaluation ---------- */
export const epley = (w, r) => w * (1 + r / 30);
export const brzycki = (w, r) => w * 36 / (37 - r);
export const lombardi = (w, r) => w * r ** 0.10;
export function e1rm(w, r) {
  if (!(w > 0) || !(r >= 1)) return null;
  if (r === 1) return { value: w, spread: 0 };
  const xs = [epley(w, r), brzycki(w, r), lombardi(w, r)];
  return { value: mean(xs), spread: Math.max(...xs) - Math.min(...xs), xs };
}
/* Normalise a stored PR into the value that is ranked. Returns { value, rankable, note }. */
export function prValue(pr) {
  const ev = EVENTS[pr.event]; if (!ev) return { rankable: false };
  if (ev.kind === 'lift') {
    const reps = +pr.reps || 1, rir = +pr.rir || 0;
    if (reps > 10) return { rankable: false, note: 'reps' };
    const est = e1rm(+pr.weight, reps + rir); return est ? { value: est.value, rankable: true, est: reps + rir > 1 } : { rankable: false };
  }
  if (ev.kind === 'sprint') {
    if (pr.timing === 'gps') return { value: +pr.time, rankable: false, note: 'gps' };
    const t = +pr.time + (pr.timing === 'hand' ? SPRINT.hand[ev.dist] : 0);
    return { value: t, rankable: t > 0, note: pr.timing === 'hand' ? 'hand' : (pr.wind > 2 ? 'wind' : null) };
  }
  if (ev.kind === 'row') return { value: +pr.time, rankable: +pr.time > 0 };
  if (ev.kind === 'rowtime') return { value: +pr.meters, rankable: +pr.meters > 0 };
  if (ev.kind === 'vo2') {
    const v = pr.method === 'cooper' ? (+pr.meters - 504.9) / 44.73 : +pr.value;
    return { value: v, rankable: v > 5, note: pr.method === 'watch' ? 'watch' : pr.method === 'cycle' ? 'cycle' : pr.method === 'cooper' ? 'cooper' : null };
  }
  return { rankable: false };
}
export function evaluatePR(pr, who) {
  const ev = EVENTS[pr.event], nv = prValue(pr);
  if (!nv.rankable) return { ...nv, ev };
  const an = anchorsFor(pr.event, { sex: who.sex, bw: +pr.bw || who.kg, age: who.age });
  const x = an.enc(nv.value), p = pctFromAnchors(x, an.A), tier = tierOf(p);
  const next = tier < 7 ? an.dec(valueAtP(TIER_P[tier], an.A)) : null;
  const pop = popRange(p, ev.q[who.sex === 'm' ? 'm' : 'f']);
  return { ...nv, ev, an, p, tier, next, pop };
}
/* Best PR per event (by percentile), then domain scores, Peak and Balance. */
export function arena(prs, who, leanP) {
  const best = {};
  for (const pr of prs || []) {
    const r = evaluatePR(pr, who); if (!r.rankable) continue;
    const ageM = (dayNum(today()) - dayNum(pr.date || today())) / 30.44;
    const decay = ageM > 24 ? Math.max(0.25, 1 - 0.25 * (ageM - 24) / 12) : 1;
    const score = 100 * r.p * decay;
    if (!best[pr.event] || score > best[pr.event].score) best[pr.event] = { pr, r, score, decay };
  }
  const domains = {};
  for (const [id, b] of Object.entries(best)) (domains[EVENTS[id].domain] ||= []).push(b.score);
  const dom = {};
  for (const [d, xs] of Object.entries(domains)) { xs.sort((a, b) => b - a); dom[d] = mean(xs.slice(0, 3)); }
  if (leanP != null) dom.lean = 100 * leanP;
  const vals = Object.values(dom).filter(x => x > 0);
  const sorted = [...vals].sort((a, b) => b - a);
  const peak = sorted.length >= 2 ? mean(sorted.slice(0, 2)) : null;
  const balance = vals.length >= 3 ? Math.exp(mean(vals.map(v => Math.log(Math.max(1, v))))) : null;
  return { best, dom, peak, balance };
}
