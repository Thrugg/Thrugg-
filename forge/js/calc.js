/* Forge — calculation engine. Pure functions, no DOM, metric units. Tested in test/calc.test.mjs. */
import { STRENGTH, SL_P, C2, FRIEND, FRIEND_P, BF_NHANES, BF_P, SPRINT, TIER_P, EVENTS, CATALOGUE, INTENSITIES, OCCUPATION, REPS, ERG, VJ, VJ_P, DOMAINS, DOMAIN_AGG, FFA, FFA_LEVELS, FFA_TIER_START, WMA, WA_POINTS, GL, GRIP } from './data.js';

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
/* bfSd: 1-SD of the body-fat estimate. When it only rests on a smart scale or a guess (SD > 4 points), the lean-mass
   equations get half their weight, because a ±6-point body fat moves fat-free mass by ±5–6 kg. */
export function rmrEnsemble(p) {
  const e = rmrEquations(p);
  const ffmSet = p.trained ? [['mifflin', 0.25], ['tinsleyFFM', 0.25], ['tenHaafFFM', 0.25], ['cunningham', 0.25]] : [['mifflin', 0.5], ['katch', 0.5]];
  const bwSet = p.trained ? [['mifflin', 0.5], ['tinsleyBW', 0.25], ['tenHaafBW', 0.25]] : [['mifflin', 1]];
  let parts;
  if (p.ffm > 0) {
    const wF = p.bfSd > 4 ? 0.5 : 1, acc = {};
    for (const [k, w] of ffmSet) acc[k] = (acc[k] || 0) + w * wF;
    if (wF < 1) for (const [k, w] of bwSet) acc[k] = (acc[k] || 0) + w * (1 - wF);
    parts = Object.entries(acc);
  } else parts = bwSet;
  const value = sum(parts.map(([k, w]) => w * e[k]));
  return { value, eq: e, parts, sd: 0.10 * value };
}

/* ---------- activity ---------- */
export const strideM = (sex, cm, overrideCm) => overrideCm > 0 ? overrideCm / 100 : (sex === 'm' ? 0.415 : 0.413) * cm / 100;
/* Net cost of walking above rest, kcal per kg per km (Ludlow & Weyand 2016: VO2 − VO2rest = 3.85 + 5.97·V²/height,
   ml/kg/min, V in m/s, height in m; 4.9 kcal per litre of oxygen). About 0.59 at 1.25 m/s for 1.80 m; shorter people
   and both very slow and fast walking cost more. The older ACSM constant (0.5) under-counted by 15–20 %. */
export function walkCost(cm, v = 1.25) {
  const V = clamp(+v || 1.25, 0.7, 1.9), H = clamp((+cm || 172) / 100, 1.4, 2.1);
  return 4.9 / 1000 * (3.85 + 5.97 * V * V / H) * 1000 / (60 * V);
}
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
  return { type: w.type, met, code, method, session, kcalDay: week / 7, epocDay: epoc / 7, hoursDay: min * per / 60 / 7, stepsDay: (w.spm ?? c.cadence ?? 0) * min * per / 7, watch: w.watchKcal || null };
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
  const kcalPerKgKm = walkCost(inp.cm, inp.walkSpeed), stepsKcal = kcalPerKgKm * kg * km;
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
  return { trained, rmr, CF, items, exercise, epoc, steps, wkSteps, km, kcalPerKgKm, stepsKcal, flightsKcal, neat, awakeH, tef: tdee - pre, tdee, sd, kPerKg };
}

/* ---------- energy density of weight change (Forbes partition, Hall's tissue energies) ---------- */
export function energyDensity(fmKg, trained, dir) {
  const p0 = 10.4 / (10.4 + Math.max(2, fmKg || 15));
  const p = dir < 0 ? (trained ? p0 * 0.5 : p0) : clamp(p0 + (trained ? 0.15 : 0), 0.1, 0.7);
  return p * 1816 + (1 - p) * 9440;
}

/* ---------- trend weight and adaptive maintenance ---------- */
/* Day-to-day scatter of the scale (kg, 1 SD), learned from the person's own consecutive weigh-ins. */
export function scaleNoise(points) {
  const s = points.filter(p => p.w > 0).sort((a, b) => a.date < b.date ? -1 : 1), d = [];
  for (let i = 1; i < s.length; i++) if (dayNum(s[i].date) - dayNum(s[i - 1].date) <= 2) d.push(s[i].w - s[i - 1].w);
  if (d.length < 8) return 0.5;
  const med = a => { const x = [...a].sort((p, q) => p - q); return x.length % 2 ? x[x.length >> 1] : (x[x.length / 2 - 1] + x[x.length / 2]) / 2; };
  const m = med(d);
  return clamp(1.4826 * med(d.map(x => Math.abs(x - m))) / Math.SQRT2, 0.2, 1.0);
}
/* Trend weight: a local-linear-trend Kalman filter (state = level and daily slope) with a backward smoothing pass.
   Unlike a moving average it does not run behind during a steady cut or bulk, and gaps simply widen its uncertainty.
   points: [{date, w}] in any order → [{ date, w, trend, slope (kg/day), sd }]; the last point is the live estimate. */
export function trendSeries(points, { sig, qL = 0.08 ** 2, qS = 0.004 ** 2 } = {}) {
  const s = points.filter(p => p.w > 0).sort((a, b) => a.date < b.date ? -1 : 1);
  if (!s.length) return [];
  const r = (sig || scaleNoise(s)) ** 2, f = [];
  let x = [s[0].w, 0], P = [[r, 0], [0, 0.05 ** 2]], last = dayNum(s[0].date);
  s.forEach((p, i) => {
    let xp = x, Pp = P, dt = 0;
    if (i) {
      dt = Math.max(1, dayNum(p.date) - last);
      xp = [x[0] + dt * x[1], x[1]];
      Pp = [[P[0][0] + dt * (P[0][1] + P[1][0]) + dt * dt * P[1][1] + dt * qL, P[0][1] + dt * P[1][1]], [P[1][0] + dt * P[1][1], P[1][1] + dt * qS]];
    }
    const S = Pp[0][0] + r, K0 = Pp[0][0] / S, K1 = Pp[1][0] / S, y = p.w - xp[0];
    x = [xp[0] + K0 * y, xp[1] + K1 * y];
    P = [[(1 - K0) * Pp[0][0], (1 - K0) * Pp[0][1]], [Pp[1][0] - K1 * Pp[0][0], Pp[1][1] - K1 * Pp[0][1]]];
    last = dayNum(p.date); f.push({ x, P, xp, Pp, dt });
  });
  // Rauch–Tung–Striebel smoother
  const out = new Array(s.length); let xs = f[f.length - 1].x, Ps = f[f.length - 1].P;
  for (let i = s.length - 1; i >= 0; i--) {
    if (i < s.length - 1) {
      const n = f[i + 1], { x: xf, P: Pf } = f[i], dt = n.dt;
      const A = [[Pf[0][0] + dt * Pf[0][1], Pf[0][1]], [Pf[1][0] + dt * Pf[1][1], Pf[1][1]]]; // P·Fᵀ
      const det = n.Pp[0][0] * n.Pp[1][1] - n.Pp[0][1] * n.Pp[1][0] || 1e-12;
      const inv = [[n.Pp[1][1] / det, -n.Pp[0][1] / det], [-n.Pp[1][0] / det, n.Pp[0][0] / det]];
      const G = [[A[0][0] * inv[0][0] + A[0][1] * inv[1][0], A[0][0] * inv[0][1] + A[0][1] * inv[1][1]], [A[1][0] * inv[0][0] + A[1][1] * inv[1][0], A[1][0] * inv[0][1] + A[1][1] * inv[1][1]]];
      const dx = [xs[0] - n.xp[0], xs[1] - n.xp[1]], dP = [[Ps[0][0] - n.Pp[0][0], Ps[0][1] - n.Pp[0][1]], [Ps[1][0] - n.Pp[1][0], Ps[1][1] - n.Pp[1][1]]];
      xs = [xf[0] + G[0][0] * dx[0] + G[0][1] * dx[1], xf[1] + G[1][0] * dx[0] + G[1][1] * dx[1]];
      const GD = [[G[0][0] * dP[0][0] + G[0][1] * dP[1][0], G[0][0] * dP[0][1] + G[0][1] * dP[1][1]], [G[1][0] * dP[0][0] + G[1][1] * dP[1][0], G[1][0] * dP[0][1] + G[1][1] * dP[1][1]]];
      Ps = [[Pf[0][0] + GD[0][0] * G[0][0] + GD[0][1] * G[0][1], 0], [0, Pf[1][1] + GD[1][0] * G[1][0] + GD[1][1] * G[1][1]]];
    }
    out[i] = { date: s[i].date, w: s[i].w, trend: xs[0], slope: xs[1], sd: Math.sqrt(Math.max(0, Ps[0][0])) };
  }
  return out;
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
const median = a => { const x = [...a].sort((p, q) => p - q); return x.length ? (x.length % 2 ? x[x.length >> 1] : (x[x.length / 2 - 1] + x[x.length / 2]) / 2) : NaN; };
/* Measured maintenance from the logs: energy balance over the window, in the person's own logging units.
   maintenance = mean logged intake − (trend weight at the end − trend weight at the start) / days × energy density.
   - Trend weights come from the smoothed Kalman trend (weigh-ins up to 14 days before the window steady its start).
   - Days with under half the usual intake are treated as not fully logged and left out of the mean (`nPartial`).
   - phaseStart: date a new plan began. The first 10 days after it are mostly water and glycogen, so the window
     starts after them when at least 14 days remain (`water: 'trimmed'`); otherwise the uncertainty is widened (`'recent'`).
   logs: { 'YYYY-MM-DD': { w, kcal } } */
export function adaptiveTdee(logs, { end = today(), days = 28, fmKg, trained, phaseStart } = {}) {
  let start = addDays(end, -(days - 1)), water = null;
  if (phaseStart && phaseStart > addDays(start, -10) && phaseStart <= end) {
    const s2 = addDays(phaseStart, 10);
    if (dayNum(end) - dayNum(s2) >= 14) { if (s2 > start) { start = s2; water = 'trimmed'; } } else water = 'recent';
  }
  const all = Object.entries(logs || {}).filter(([d]) => d <= end).sort();
  const rows = all.filter(([d]) => d >= start);
  const W = rows.filter(([, v]) => v.w > 0), Kall = rows.filter(([, v]) => v.kcal > 0);
  const med = median(Kall.map(([, v]) => v.kcal));
  const K = Kall.filter(([, v]) => v.kcal >= 0.5 * med), nPartial = Kall.length - K.length;
  const span = rows.length ? dayNum(rows[rows.length - 1][0]) - dayNum(rows[0][0]) + 1 : 0;
  const out = { ok: false, nW: W.length, nK: K.length, nPartial, span, water, need: { weights: 4, intakeDays: Math.max(10, Math.ceil(0.7 * Math.max(span, 14))), span: 14 } };
  if (span < 14 || W.length < 4 || K.length < out.need.intakeDays) return out;
  const lead = addDays(start, -14);
  const tr = trendSeries(all.filter(([d, v]) => d >= lead && v.w > 0).map(([date, v]) => ({ date, w: v.w }))).filter(p => p.date >= start);
  if (tr.length < 2) return out;
  const a = tr[0], b = tr[tr.length - 1], D = dayNum(b.date) - dayNum(a.date);
  if (D < 10) return out;
  const slope = (b.trend - a.trend) / D, seSlope = Math.sqrt(a.sd ** 2 + b.sd ** 2) / D;
  const ed = energyDensity(fmKg, trained, slope < 0 ? -1 : 1);
  const ks = K.map(([, v]) => v.kcal), intake = mean(ks), n = ks.length;
  const sdK = n > 1 ? Math.sqrt(sum(ks.map(k => (k - intake) ** 2)) / (n - 1)) : 0;
  const coverage = Math.min(1, n / span);
  const seIntake = Math.sqrt(sdK ** 2 / n + ((1 - coverage) * 0.15 * intake) ** 2);
  const sd = Math.sqrt((ed * seSlope) ** 2 + seIntake ** 2 + 60 ** 2 + (water === 'recent' ? 150 ** 2 : 0));
  return { ...out, ok: true, tdee: intake - slope * ed, sd, slopeKgWk: slope * 7, intake, ed, coverage, from: a.date, to: b.date };
}
/* Combine the formula with the measured figure. The two are not in the same unit: the formula estimates true
   expenditure, the logs measure it in "calories as this person logs them" (food logs run 0–20 % under true intake
   in lean adults, more in others). Targets are logged the same way, so the logged unit is the useful one: the formula
   only serves as a prior, with ±12 % added for the unknown logging ratio, and fades as the logs accumulate. */
export const LOG_UNIT_SD = 0.12;
export function blend(pred, predSd, obs) {
  if (!obs || !obs.ok) return { value: pred, sd: predSd, source: 'predicted' };
  const priorSd = Math.sqrt(predSd ** 2 + (LOG_UNIT_SD * pred) ** 2);
  const wp = 1 / priorSd ** 2, wo = 1 / obs.sd ** 2;
  return { value: (pred * wp + obs.tdee * wo) / (wp + wo), sd: 1 / Math.sqrt(wp + wo), source: 'blended', wObs: wo / (wp + wo), ratio: obs.tdee / pred };
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
  // range: exercise energy is known to about ±25 %, fat-free mass to ±(body-fat SD) × weight
  const ffmSd = ffm ? kg * (ctx.bfSd || 3) / 100 : 0;
  const eaLo = ffm ? (kcal - 1.25 * (ctx.exerciseDay || 0)) / (ffm + ffmSd) : null, eaHi = ffm ? (kcal - 0.75 * (ctx.exerciseDay || 0)) / Math.max(20, ffm - ffmSd) : null;
  if (mode === 'cut' && (ctx.ratePct || 0) > 1) flags.push('fastCut');
  // the most aggressive kcal target that keeps EA >= 25 and above the floor
  const minKcal = Math.max(floor, ffm ? 25 * ffm + (ctx.exerciseDay || 0) : floor);
  const meals = clamp(ctx.meals || 4, 2, 6);
  return { kcal, delta, weeklyKg, weeklyPct: weeklyKg / kg * 100, ed, protein, fat, carbs, ea, eaLo, eaHi, eaLevel, flags, blocked, minKcal, perMeal: protein / meals, perMealPerKg: protein / meals / kg };
}
/* Weekly simulation of body weight under a fixed intake, maintenance falling with weight. */
export function project({ kg, tdee, sd, kcal, ed, kPerKg, weeks = 16 }) {
  const run = t0 => { const pts = [{ wk: 0, w: kg }]; let w = kg; for (let i = 1; i <= weeks; i++) { const t = t0 + kPerKg * (w - kg); w += (kcal - t) * 7 / (ed || 7000); pts.push({ wk: i, w }); } return pts; };
  return { mid: run(tdee), lo: run(tdee + sd), hi: run(tdee - sd) };
}

/* Weeks until a goal weight under the plan, with the range from the maintenance uncertainty. null when the plan moves away from it. */
export function etaWeeks({ kg, goal, tdee, sd, kcal, ed, kPerKg, maxWeeks = 104 }) {
  if (!(goal > 0) || Math.abs(goal - kg) < 0.05) return null;
  const dir = Math.sign(goal - kg);
  const run = t0 => { let w = kg; for (let i = 1; i <= maxWeeks; i++) { const t = t0 + kPerKg * (w - kg), step = (kcal - t) * 7 / (ed || 7000); if (Math.sign(step) !== dir) return null; if ((goal - (w + step)) * dir <= 0) return i - 1 + (goal - w) / step; w += step; } return null; };
  const mid = run(tdee); if (mid == null) return null;
  const a = run(tdee + sd), b = run(tdee - sd);
  return { mid, lo: dir < 0 ? a : b, hi: dir < 0 ? b : a };
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
export const tierOf = p => TIER_P.filter(b => p >= b - 1e-6).length; // tolerance: a result exactly on a bound belongs to the higher tier
/* Overall level for a 0–100 score (domain, Peak, Balance): same ladder as single records, applied to the score. */
export const scoreTier = s => s == null ? null : tierOf(s / 100);

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
/* Daniels & Gilbert: oxygen cost of running at velocity v (m/min) and the share of VO2max sustainable for t minutes. */
export function vdot(dist, secs) {
  const t = secs / 60, v = dist / t;
  const vo2 = -4.60 + 0.182258 * v + 0.000104 * v * v;
  const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
  return vo2 / pct;
}
export function raceTime(dist, target) { // bisection: time whose VDOT equals target
  let lo = dist / 1000 * 100, hi = dist / 1000 * 1200; // 1:40 to 20:00 per km
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (vdot(dist, mid) > target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/* WMA 2023 age factor: open-equivalent time = time × factor (1 below 30, table to 90). */
export function sprintFactor(age, sex, dist = 100) {
  const t = WMA[sex === 'm' ? 'm' : 'f'][dist] || WMA.m[100], a = clamp(age || 30, 30, 90), i = Math.floor(a) - 30;
  return i >= 60 ? t[60] : t[i] + (a - Math.floor(a)) * (t[i + 1] - t[i]);
}
/* Position of each FFA level on the tier scale: the levels that open a Forge tier sit on that tier's bound, the
   levels in between are spread evenly. Returns the z-score of each of the 23 levels. */
const FFA_Z = (() => {
  const zb = TIER_P.map(invcdf), z = new Array(FFA_LEVELS.length);
  for (let k = 0; k < FFA_TIER_START.length; k++) {
    const i0 = FFA_TIER_START[k], i1 = FFA_TIER_START[k + 1] ?? i0;
    for (let i = i0; i < Math.max(i1, i0 + 1); i++) z[i] = i1 > i0 ? zb[k] + (i - i0) / (i1 - i0) * (zb[k + 1] - zb[k]) : zb[k];
  }
  return z;
})();
/* FFA level of an open-equivalent time: { i, name } of the best level reached (i = −1 below D7) and the next one. */
export function ffaLevel(open, sex, dist) {
  const t = FFA[sex === 'm' ? 'm' : 'f'][dist]; let i = -1;
  while (i + 1 < t.length && open <= t[i + 1] + 1e-9) i++;
  return { i, name: i >= 0 ? FFA_LEVELS[i] : null, next: i + 1 < t.length ? { name: FFA_LEVELS[i + 1], open: t[i + 1] } : null };
}
export function waPoints(open, sex, dist) { const [a, b] = WA_POINTS[sex === 'm' ? 'm' : 'f'][dist]; return open < b ? Math.floor(a * (b - open) ** 1.81) : 0; }
/* IPF GL points for a powerlifting total or a bench press (classic). */
export function glPoints(sex, bw, lifted, kind = 'total') { const [A, B, C] = GL[sex === 'm' ? 'm' : 'f'][kind]; return bw > 0 && lifted > 0 ? lifted * 100 / (A - B * Math.exp(-C * bw)) : null; }
export const ageClass = age => age == null ? 'open' : age < 19 ? 'subjunior' : age < 24 ? 'junior' : age < 40 ? 'open' : age < 50 ? 'm1' : age < 60 ? 'm2' : age < 70 ? 'm3' : 'm4';
/* Grip strength as a T-score against the young-adult peak (Dodds 2014), like bone density. */
export function gripT(sex, kg) { const g = GRIP[sex === 'm' ? 'm' : 'f']; return kg > 0 ? { t: (kg - g.mean) / g.sd, band: kg < g.weak ? 'weak' : kg < g.low ? 'low' : 'ok', ...g } : null; }
export function anchorsFor(id, { sex, bw, age }) {
  const ev = EVENTS[id], s = sex === 'm' ? 'm' : 'f';
  if (ev.kind === 'lift') {
    const t = STRENGTH[id][s], row = interpRows(bw || (s === 'm' ? 80 : 60), t.bw, t.rows);
    const out = bw < t.bw[0] || bw > t.bw[t.bw.length - 1];
    return { A: SL_P.map((p, i) => ({ p, v: row[i] })), enc: x => x, dec: v => v, unit: 'kg', clampedBw: out };
  }
  if (ev.kind === 'sprint') {
    const k = sprintFactor(age || 30, s, ev.dist), T = FFA[s][ev.dist];
    return { A: T.map((t, i) => ({ p: cdf(FFA_Z[i]), v: -t })), enc: t => -t * k, dec: v => -v / k, unit: 's', lowerBetter: true, factor: k, ffa: true };
  }
  if (ev.kind === 'row') {
    const T = c2Times(ev.dist, s);
    return { A: Object.keys(T).map(Number).sort((a, b) => a - b).map(p => ({ p, v: -Math.log(T[p]) })), enc: t => -Math.log(t), dec: v => Math.exp(-v), unit: 's', lowerBetter: true };
  }
  if (ev.kind === 'rowtime') {
    const M = c2Meters(ev.secs, s);
    return { A: Object.keys(M).map(Number).sort((a, b) => a - b).map(p => ({ p, v: M[p] })), enc: x => x, dec: v => v, unit: 'm' };
  }
  if (ev.kind === 'vo2' || ev.kind === 'race') {
    const band = clamp(Math.floor((age || 30) / 10) * 10, 20, 80);
    const A = FRIEND_P.map((p, i) => ({ p, v: FRIEND[s][band][i] }));
    if (ev.kind === 'vo2') return { A, enc: x => x, dec: v => v, unit: 'ml/kg/min', band };
    return { A, enc: t => vdot(ev.dist, t), dec: v => raceTime(ev.dist, v), unit: 's', lowerBetter: true, band };
  }
  if (ev.kind === 'erg') {
    const T = ERG[id][s].t;
    return { A: Object.keys(T).map(Number).sort((a, b) => a - b).map(p => ({ p, v: -Math.log(T[p]) })), enc: t => -Math.log(t), dec: v => Math.exp(-v), unit: 's', lowerBetter: true };
  }
  if (ev.kind === 'jump') {
    const band = (age || 30) < 20 ? 18 : clamp(Math.floor((age || 30) / 5) * 5, 20, 65);
    return { A: VJ_P.map((p, i) => ({ p, v: VJ[s][band][i] })), enc: x => x, dec: v => v, unit: 'cm', band, beyond: (age || 30) > 69 };
  }
  if (ev.kind === 'reps') {
    const t = REPS[id][s], row = interpRows(bw || (s === 'm' ? 80 : 60), t.bw, t.rows);
    const A = []; SL_P.forEach((p, i) => { if (A.length && row[i] <= A[A.length - 1].v) A[A.length - 1] = { p, v: A[A.length - 1].v }; else A.push({ p, v: row[i] }); }); // "< 1" up to Novice: 0 reps still at that percentile
    return { A, enc: x => x, dec: v => v, unit: 'reps', clampedBw: bw < t.bw[0] || bw > t.bw[t.bw.length - 1] };
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
/* Wattbike → BikeErg. The two machines agree on watts, not on distance: the Wattbike's distance comes from its own
   road-bike speed model, the BikeErg's from Concept2's pace formula P = 0.35 / (s per m)³ (same watts as the RowErg
   at half the pace distance: 2:00 per 1,000 m ≈ 202 W). An all-out effort of T seconds at P watts becomes the time
   a BikeErg 1,000 m at that effort would take. Effort length matters (power falls fast between 1 and 3 minutes), so
   power is moved along P ∝ t^−k (k = 0.35, a middle value for 1–3 min efforts) to the equivalent duration. */
export const WB_K = 0.35;
export function bikeErgTime(watts) { return watts > 0 ? 1000 * Math.cbrt(0.35 / watts) : null; }
export function wattbikeEquiv(watts, dur, k = WB_K) {
  if (!(watts > 0) || !(dur > 0)) return null;
  const a = bikeErgTime(watts), e = k / 3, t = Math.pow(a * Math.pow(dur, -e), 1 / (1 - e));
  return { time: t, ratio: dur / t, watts1k: watts * Math.pow(t / dur, -k) };
}
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
  if (ev.kind === 'erg' && pr.machine === 'wattbike') {
    const q = wattbikeEquiv(+pr.watts, +pr.dur);
    if (!q) return { rankable: false };
    const far = q.ratio < 0.75 || q.ratio > 1.33;
    return { value: q.time, rankable: true, note: far ? 'wattbikeFar' : 'wattbike', est: true, watts1k: q.watts1k };
  }
  if (ev.kind === 'row' || ev.kind === 'erg') return { value: +pr.time, rankable: +pr.time > 0 };
  if (ev.kind === 'race') return { value: +pr.time, rankable: +pr.time > 0, note: 'vdot' };
  if (ev.kind === 'jump') return { value: +pr.cm, rankable: +pr.cm > 0, note: pr.method === 'reach' ? 'reach' : null };
  if (ev.kind === 'reps') return { value: +pr.reps, rankable: +pr.reps >= 1 };
  if (ev.kind === 'rowtime') return { value: +pr.meters, rankable: +pr.meters > 0 };
  if (ev.kind === 'vo2') {
    const v = pr.method === 'cooper' ? (+pr.meters - 504.9) / 44.73 : +pr.value;
    return { value: v, rankable: v > 5, note: pr.method === 'watch' ? 'watch' : pr.method === 'cycle' ? 'cycle' : pr.method === 'cooper' ? 'cooper' : null };
  }
  return { rankable: false };
}
/* Sanity limits: a result better than anything ever recorded is a typing error (seconds for minutes, lb for kg…). */
export function plausible(pr, sex = 'm') {
  const ev = EVENTS[pr.event], v = prValue(pr).value, m = sex === 'm';
  if (!ev || !(v > 0)) return false;
  switch (ev.kind) {
    case 'lift': return v <= ({ bench: [360, 210], squat: [500, 320], deadlift: [510, 330], ohp: [230, 140] }[pr.event] || [500, 330])[m ? 0 : 1];
    case 'sprint': return v >= SPRINT.wr[ev.dist][m ? 'm' : 'f'] && v < ev.dist * 0.6;
    case 'row': return v >= ev.dist * (m ? 0.118 : 0.14) && v < ev.dist;
    case 'erg': if (pr.machine === 'wattbike' && !(+pr.watts >= 60 && +pr.watts <= 2600 && +pr.dur >= 30 && +pr.dur <= 600)) return false;
      return v >= (pr.event === 'bike1000' ? 55 : 65) && v < 900;
    case 'rowtime': return v <= (m ? 460 : 400) && v >= 50;
    case 'race': return v >= ev.dist * (m ? 0.151 : 0.168) && v < ev.dist * 0.9;
    case 'jump': return v >= 5 && v <= 125;
    case 'reps': return v <= 200;
    case 'vo2': return v >= 8 && v <= 97;
  }
  return true;
}
export function evaluatePR(pr, who) {
  const ev = EVENTS[pr.event], nv = prValue(pr);
  if (!nv.rankable) return { ...nv, ev };
  const an = anchorsFor(pr.event, { sex: who.sex, bw: +pr.bw || who.kg, age: who.age });
  const x = an.enc(nv.value), p = pctFromAnchors(x, an.A), tier = tierOf(p);
  const next = tier < 7 ? an.dec(valueAtP(TIER_P[tier], an.A)) : null;
  const pop = ev.noPop ? null : popRange(p, ev.q[who.sex === 'm' ? 'm' : 'f']);
  const out = { ...nv, ev, an, p, tier, next, pop };
  if (ev.kind === 'sprint') {
    const open = nv.value * an.factor, lv = ffaLevel(open, who.sex, ev.dist);
    Object.assign(out, { open, factor: an.factor, level: lv.name, levelI: lv.i, nextLevel: lv.next ? { name: lv.next.name, time: lv.next.open / an.factor } : null, points: waPoints(open, who.sex, ev.dist) });
  }
  return out;
}
/* Averaging percentile scores directly treats 95 → 99 like 50 → 54, although the first is a far bigger jump in
   performance. Scores are therefore averaged on the z-scale (probit) and converted back. */
export const zmean = xs => xs.length === 1 ? xs[0] : Math.round(1e4 * 100 * cdf(mean(xs.map(x => invcdf(clamp(x / 100, 0.0005, 0.9995)))))) / 1e4; // rounded: the cdf/inverse pair is exact to about 1e-6
export const geomean = xs => Math.exp(mean(xs.map(v => Math.log(Math.max(1, v)))));
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
  for (const [d, xs] of Object.entries(domains)) { xs.sort((a, b) => b - a); dom[d] = DOMAIN_AGG[d] === 'max' ? xs[0] : zmean(xs.slice(0, 3)); }
  const vals = DOMAINS.map(d => dom[d]).filter(x => x > 0); // performance domains only
  const sorted = [...vals].sort((a, b) => b - a);
  const peak = sorted.length >= 2 ? zmean(sorted.slice(0, 2)) : null;
  const balance = vals.length >= 3 ? geomean(vals) : null;
  // powerlifting total and IPF GL points from the best estimated 1RMs
  let gl = null;
  const L = k => best[k]?.r.value, bwOf = k => +best[k]?.pr.bw || who.kg;
  if (L('squat') && L('bench') && L('deadlift')) { const total = L('squat') + L('bench') + L('deadlift'), bw = mean(['squat', 'bench', 'deadlift'].map(bwOf)); gl = { total, bw, points: glPoints(who.sex, bw, total) }; }
  const benchGl = L('bench') ? glPoints(who.sex, bwOf('bench'), L('bench'), 'bench') : null;
  return { best, dom, peak, balance, lean: leanP != null ? 100 * leanP : null, nDom: vals.length, gl, benchGl };
}
