/* Run with: node forge/test/calc.test.mjs — pins every formula to a hand-checked example. */
import assert from 'node:assert/strict';
import * as C from '../js/calc.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, expected ${b} ± ${tol}`);
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('worked example: 30 y man, 180 cm, 80 kg, 18 % fat, 8,000 steps, 4×60 strength + 2×40 run', () => {
  const r = C.predictTdee({ sex: 'm', kg: 80, cm: 180, age: 30, ffm: 65.6, trainingYears: 3, stepsAvg: 8000, sleepH: 8, occupation: 'desk',
    workouts: [{ type: 'strength', minutes: 60, perWeek: 4, intensity: 'moderate' }, { type: 'run', minutes: 40, perWeek: 2, intensity: 'moderate', paceKmh: 10 }] });
  near(r.rmr.value, 1921, 1, 'RMR ensemble');
  near(r.kcalPerKgKm, 0.590, 0.001, 'walking cost at 1.80 m and 1.25 m/s (Ludlow & Weyand)');
  near(r.stepsKcal, 185, 1, 'steps kcal: 5,257 net steps = 3.93 km × 80 kg × 0.590 (157 with the old 0.5 constant)');
  near(r.items[0].kcalDay, 183, 1, 'strength kcal/day');
  near(r.items[1].kcalDay, 152, 1, 'run kcal/day');
  near(r.tdee, 3073, 15, 'maintenance');
  near(C.walkCost(165), 0.621, 0.001, 'shorter people pay more per km'); near(C.walkCost(180, 1.56), 0.624, 0.001, 'brisk walking costs more per km');
  near(r.sd, 320, 20, 'maintenance SD');
});
t('RMR equations on an example DXA (male 28 y, 178 cm, 78 kg, FFM 65 kg)', () => {
  const e = C.rmrEquations({ sex: 'm', kg: 78, cm: 178, age: 28, ffm: 65 });
  near(e.mifflin, 1757.5, 0.01, 'Mifflin'); near(e.tinsleyFFM, 1967.5, 0.01, 'Tinsley FFM');
  near(e.cunningham, 1930, 0.01, 'Cunningham'); near(e.tenHaafFFM, 1964.38, 0.01, 'ten Haaf FFM');
  near(C.ffmi(65, 178), 20.52, 0.01, 'FFMI'); near(C.ffmiNorm(65, 178), 20.64, 0.01, 'normalised FFMI');
});
t('body-fat equations (waist 84, neck 39, 180 cm, BMI 24.7, 30 y)', () => {
  near(C.bfNavy('m', 180, 39, 84), 14.5, 0.1, 'Navy'); near(C.bfRFM('m', 180, 84), 21.1, 0.1, 'RFM');
  near(C.bfDeurenberg('m', C.bmi(80, 180), 30), 20.3, 0.1, 'Deurenberg');
  near(C.ellipse(30, 20), 79.33, 0.05, 'ellipse perimeter');
});
t('tiers and percentiles', () => {
  const who = { sex: 'm', kg: 80, age: 30 };
  let r = C.evaluatePR({ event: 'bench', weight: 98, reps: 1, bw: 80 }, who);
  near(r.p, 0.5, 0.001, 'bench 98 @80'); assert.equal(r.tier, 3);
  r = C.evaluatePR({ event: 'row500', time: 90 }, who);
  assert.equal(r.tier, 4, '500 m 1:30 man = Spartan'); near(r.p, 0.87, 0.02, '500 m 1:30 percentile');
  r = C.evaluatePR({ event: 'row500', time: 89.3 }, { sex: 'f', kg: 65, age: 30 });
  assert.ok(r.tier >= 6, '500 m 1:29.3 woman is Viltrumite or above');
  r = C.evaluatePR({ event: 'vo2', value: 38.6, method: 'lab' }, { sex: 'm', kg: 80, age: 32 });
  near(r.p, 0.5, 0.001, 'VO2 median 30-39');
  r = C.evaluatePR({ event: 'sprint100', time: 12.0, timing: 'electronic' }, who);
  assert.equal(r.tier, 3, '100 m 12.0 s = Viking'); assert.equal(r.level, 'R3', 'FFA level R3 (12.14)'); assert.equal(r.nextLevel.name, 'R2'); near(r.nextLevel.time, 11.94, 1e-9, 'next level');
  assert.equal(r.pop, null, 'no population percentile for sprints');
  const bounds = { 14.14: 1, 13.14: 2, 12.44: 3, 11.54: 4, 10.94: 5, 10.2: 6, 10.1: 7 };
  for (const [tm, tier] of Object.entries(bounds)) assert.equal(C.evaluatePR({ event: 'sprint100', time: +tm, timing: 'electronic' }, who).tier, tier, `100 m ${tm} s opens tier ${tier}`);
  assert.equal(C.evaluatePR({ event: 'sprint100', time: 14.2, timing: 'electronic' }, who).tier, 0);
  r = C.evaluatePR({ event: 'sprint100', time: 14.0, timing: 'electronic' }, { sex: 'm', kg: 75, age: 70 });
  near(r.open, 11.0, 0.005, '70-year-old: 14.0 s × 0.7858 = 11.00 s open'); assert.equal(r.level, 'IR1'); assert.equal(r.tier, 4);
  near(C.sprintFactor(25, 'm', 200), 1, 0, 'no factor below 30'); near(C.sprintFactor(32, 'm', 200), 0.9981, 1e-9, '200 m ages from 32'); near(C.sprintFactor(34, 'm', 100), 1, 0, '100 m holds to 34');
  r = C.evaluatePR({ event: 'sprint400', time: 62, timing: 'hand' }, { sex: 'f', kg: 60, age: 44 });
  near(r.open, 62.14 * 0.9157, 0.001, 'hand timing +0.14 s, then the age factor');
  assert.equal(C.waPoints(10.395, 'm', 100), 1000, 'decathlon table: 10.395 s = 1,000 points');
  near(C.glPoints('m', 83, 600), 83.1, 0.1, 'IPF GL, 600 kg total at 83 kg'); near(C.glPoints('m', 83, 150, 'bench'), 75.3, 0.1, 'IPF GL bench');
  assert.ok(!C.plausible({ event: 'sprint100', time: 5 }, 'm') && C.plausible({ event: 'bench', weight: 100, reps: 5 }, 'm'), 'sanity limits');
  r = C.evaluatePR({ event: 'sprint100', time: 12.0, timing: 'gps' }, who);
  assert.equal(r.rankable, false, 'GPS times are not ranked');
  near(C.e1rm(100, 5).value, 115.6, 0.1, 'e1RM 100x5');
  const bf = C.bfAnchors('m', 27); assert.ok(C.pctFromAnchors(13, bf.A) < 0.05, '13 % fat at 27 is below the 5th percentile');
  near(C.valueAtP(0.5, C.anchorsFor('row100', { sex: 'm' }).A), -Math.log(17.7), 1e-9, 'row100 median');
  const t200 = Math.exp(-C.valueAtP(0.5, C.anchorsFor('row200', { sex: 'm' }).A)); near(t200, 37.6, 0.2, 'modelled 200 m median');
  assert.ok(C.popPct(0.5, 0.12) > 0.85 && C.popPct(0.5, 0.12) < 0.95, 'population percentile of a median lifter');
});
t('Peak and Balance', () => {
  near(C.zmean([85, 80]), 82.6, 0.1, 'peak: mean on the z-scale');
  near(C.zmean([99.9, 50]), 93.9, 0.1, 'a world-class and an average domain');
  near(C.zmean([70, 70, 70]), 70, 1e-9, 'equal scores stay put'); near(C.zmean([80]), 80, 0, 'a single score is returned as is');
  near(C.geomean([85, 80, 45]), 67.4, 0.1, 'balance');
  near(C.geomean([85, 80, 0]), Math.cbrt(85 * 80), 0.01, 'balance floors a zero at 1');
});
t('adaptive maintenance recovers the true value from noisy synthetic logs', () => {
  const logs = {}; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  for (let i = 0; i < 28; i++) { const d = C.addDays('2026-10-01', i); logs[d] = { w: 85 - 0.5 / 7 * i + rnd() * 0.8, kcal: 2600 + rnd() * 300 }; }
  const a = C.adaptiveTdee(logs, { end: '2026-10-28', fmKg: 17, trained: true });
  assert.ok(a.ok); const ed = C.energyDensity(17, true, -1);
  near(a.tdee, 2600 + 0.5 / 7 * ed, 120, 'adaptive TDEE');
  // half-logged days are left out instead of dragging the mean down
  const part = { ...logs }; for (const d of ['2026-10-05', '2026-10-12', '2026-10-19']) part[d] = { ...part[d], kcal: 900 };
  const b = C.adaptiveTdee(part, { end: '2026-10-28', fmKg: 17, trained: true });
  assert.equal(b.nPartial, 3); near(b.tdee, a.tdee, 40, 'partial days ignored');
  // a plan that began inside the window: the first 10 days (water) are skipped when 14 days remain
  const long = {}; for (let i = 0; i < 42; i++) { const d = C.addDays('2026-09-17', i); long[d] = { w: 86 - (i < 14 ? 0 : i < 20 ? 0.25 * (i - 14) : 1.5 + 0.5 / 7 * (i - 20)) + rnd() * 0.6, kcal: 2600 + rnd() * 300 }; }
  const c = C.adaptiveTdee(long, { end: '2026-10-28', fmKg: 17, trained: true, phaseStart: '2026-10-01' });
  assert.equal(c.water, 'trimmed'); near(c.tdee, 2600 + 0.5 / 7 * ed, 170, 'water drop at the start of the cut does not count as tissue');
  const d2 = C.adaptiveTdee(logs, { end: '2026-10-28', fmKg: 17, trained: true, phaseStart: '2026-10-20' });
  assert.equal(d2.water, 'recent'); assert.ok(d2.sd > a.sd + 50, 'recent plan change widens the range');
});
t('formula as a prior, logs as the measurement', () => {
  const b = C.blend(3500, 320, { ok: true, tdee: 3000, sd: 180 });
  assert.ok(b.value < 3100, 'a 15 % logging gap no longer pulls the target halfway back to the formula'); near(b.ratio, 0.857, 0.001, 'logging ratio');
  assert.ok(b.wObs > 0.85); assert.equal(C.blend(3500, 320, { ok: false }).source, 'predicted');
});
t('plan guardrails', () => {
  const base = { kg: 80, cm: 180, tdee: 3070, ffm: 65.6, fmKg: 14.4, sex: 'm', trained: true, exerciseDay: 352, rmr: 1921, fatPct: 25, meals: 4 };
  const cut = C.makePlan({ ...base, mode: 'cut', ratePct: 0.5 });
  near(cut.kcal, 2622, 10, 'cut kcal'); assert.equal(cut.eaLevel, 'ok'); near(cut.protein, 177, 1, 'cut protein');
  const hard = C.makePlan({ ...base, mode: 'cut', ratePct: 1.0 });
  assert.equal(hard.eaLevel, 'amber', '1 %/week cut drops EA below 30');
  const extreme = C.makePlan({ ...base, mode: 'custom', customKcal: 1800 });
  assert.ok(extreme.blocked, 'very low intake is blocked');
  assert.ok(cut.eaLo < cut.ea && cut.ea < cut.eaHi, 'energy availability comes with a range');
  const eta = C.etaWeeks({ kg: 80, goal: 76, tdee: 3070, sd: 200, kcal: cut.kcal, ed: cut.ed, kPerKg: 22 });
  assert.ok(eta.mid > 9 && eta.mid < 14 && eta.lo < eta.mid && eta.hi > eta.mid, 'weeks to a goal weight, with a range');
  assert.equal(C.etaWeeks({ kg: 80, goal: 85, tdee: 3070, sd: 200, kcal: cut.kcal, ed: cut.ed, kPerKg: 22 }), null, 'a cut never reaches a higher goal');
  const safe = C.makePlan({ ...base, mode: 'cut', ratePct: 0.5, blockDeficit: true });
  near(safe.kcal, 3070, 0.01, 'deficits disabled in safety mode');
  assert.equal(C.recommendMode({ sex: 'm', bf: 22 }).mode, 'cut');
  assert.equal(C.recommendMode({ sex: 'm', bf: 12, ffmiN: 21.9 }).mode, 'bulk');
  assert.equal(C.recommendMode({ sex: 'f', bf: 27, trainingYears: 0 }).mode, 'recomp');
});
t('trend weight: no lag on a steady cut, gaps handled', () => {
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  const pts = []; for (let i = 0; i < 70; i++) if (i % 5 !== 3) pts.push({ date: C.addDays('2026-08-01', i), w: 95 - 0.09 * i + rnd() * 1.2 });
  const s = C.trendSeries(pts), last = s[s.length - 1], truth = 95 - 0.09 * 69;
  near(last.trend, truth, 0.35, 'live trend sits on the true weight (a 10 % moving average would read 0.8 kg high)');
  near(last.slope * 7, -0.63, 0.15, 'weekly rate');
  const two = C.trendSeries([{ date: '2026-10-01', w: 80 }, { date: '2026-10-11', w: 78 }]);
  assert.ok(two[1].trend < 79.2 && two[1].trend > 78, 'after a 10-day gap the trend follows the new reading');
  near(C.scaleNoise(pts), 0.35, 0.2, 'scale noise learned from consecutive days (uniform ±0.6 → SD 0.35)');
});
t('new Arena events', () => {
  near(C.vdot(5000, 1200), 49.8, 0.1, 'VDOT 5 km in 20:00');
  near(C.raceTime(5000, 49.8), 1200, 2, 'inverse VDOT');
  const who = { sex: 'm', kg: 80, age: 32 };
  let r = C.evaluatePR({ event: 'vjump', cm: 45.8, method: 'mat' }, who); near(r.p, 0.5, 0.001, 'CMJ median 30-34');
  r = C.evaluatePR({ event: 'pullups', reps: 13, bw: 81.6 }, who); near(r.p, 0.5, 0.01, 'pull-ups median at 180 lb');
  r = C.evaluatePR({ event: 'bike1000', time: 100.5 }, who); near(r.p, 0.5, 0.001, 'BikeErg median');
  r = C.evaluatePR({ event: 'run5k', time: 1200 }, who); assert.ok(r.p > 0.8 && r.p < 0.86, '20:00 5 km at 32 = VDOT 49.8, between P75 (46.5) and P95 (57.9)');
  r = C.evaluatePR({ event: 'pullups', reps: 3, bw: 60 }, { sex: 'f', kg: 60, age: 30 }); assert.ok(r.p > 0.2 && r.p < 0.5, 'women pull-ups with <1 anchors');
  const A = C.arena([{ event: 'bench', weight: 98, reps: 1, bw: 80, date: C.today() }], who, 0.9);
  assert.equal(A.dom.lean, undefined, 'leanness is not a domain'); assert.equal(A.lean, 90);
  const a2 = C.arena([{ event: 'vo2', value: 38.6, method: 'lab', date: C.today() }, { event: 'run5k', time: 1200, date: C.today() }], who, null);
  assert.ok(a2.dom.aerobic > 60, 'aerobic keeps the best result');
});
t('RMR: smart-scale body fat gets half weight', () => {
  const p = { sex: 'm', kg: 93, cm: 175, age: 32, ffm: 79, trained: true };
  const full = C.rmrEnsemble(p).value, half = C.rmrEnsemble({ ...p, bfSd: 6 }).value, bw = C.rmrEnsemble({ ...p, ffm: null }).value;
  near(half, (full + bw) / 2, 0.01, 'half weight');
});
t('overall levels', () => {
  assert.equal(C.scoreTier(87), 4, 'Peak 87 = Spartan'); assert.equal(C.scoreTier(76), 3, 'Balance 76 = Viking');
  assert.equal(C.scoreTier(95), 5); assert.equal(C.scoreTier(4.9), 0); assert.equal(C.scoreTier(null), null);
});
console.log(`\n${n} test groups passed`);
