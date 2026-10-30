/* Run with: node forge/test/calc.test.mjs — pins every formula to a hand-checked example. */
import assert from 'node:assert/strict';
import * as C from '../js/calc.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, expected ${b} ± ${tol}`);
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('worked example: 30 y man, 180 cm, 80 kg, 18 % fat, 8,000 steps, 4×60 strength + 2×40 run', () => {
  const r = C.predictTdee({ sex: 'm', kg: 80, cm: 180, age: 30, ffm: 65.6, trainingYears: 3, stepsAvg: 8000, sleepH: 8, occupation: 'desk',
    workouts: [{ type: 'strength', minutes: 60, perWeek: 4, intensity: 'moderate' }, { type: 'run', minutes: 40, perWeek: 2, intensity: 'moderate', paceKmh: 10 }] });
  near(r.rmr.value, 1921, 1, 'RMR ensemble');
  near(r.stepsKcal, 183, 1, 'steps kcal');
  near(r.items[0].kcalDay, 183, 1, 'strength kcal/day');
  near(r.items[1].kcalDay, 152, 1, 'run kcal/day');
  near(r.tdee, 3070, 15, 'maintenance');
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
  assert.equal(r.tier, 3, '100 m 12.0 s = Viking');
  r = C.evaluatePR({ event: 'sprint100', time: 12.0, timing: 'gps' }, who);
  assert.equal(r.rankable, false, 'GPS times are not ranked');
  near(C.e1rm(100, 5).value, 115.6, 0.1, 'e1RM 100x5');
  const bf = C.bfAnchors('m', 27); assert.ok(C.pctFromAnchors(13, bf.A) < 0.05, '13 % fat at 27 is below the 5th percentile');
  near(C.valueAtP(0.5, C.anchorsFor('row100', { sex: 'm' }).A), -Math.log(17.7), 1e-9, 'row100 median');
  const t200 = Math.exp(-C.valueAtP(0.5, C.anchorsFor('row200', { sex: 'm' }).A)); near(t200, 37.6, 0.2, 'modelled 200 m median');
  assert.ok(C.popPct(0.5, 0.12) > 0.85 && C.popPct(0.5, 0.12) < 0.95, 'population percentile of a median lifter');
});
t('Peak and Balance', () => {
  const vals = [85, 80, 45];
  near((85 + 80) / 2, 82.5, 1e-9, 'peak');
  near(Math.exp(vals.map(Math.log).reduce((a, b) => a + b) / 3), 67.4, 0.1, 'balance');
});
t('adaptive maintenance recovers the true value from noisy synthetic logs', () => {
  const logs = {}; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  for (let i = 0; i < 28; i++) { const d = C.addDays('2026-10-01', i); logs[d] = { w: 85 - 0.5 / 7 * i + rnd() * 0.8, kcal: 2600 + rnd() * 300 }; }
  const a = C.adaptiveTdee(logs, { end: '2026-10-28', fmKg: 17, trained: true });
  assert.ok(a.ok); const ed = C.energyDensity(17, true, -1);
  near(a.tdee, 2600 + 0.5 / 7 * ed, 120, 'adaptive TDEE');
});
t('plan guardrails', () => {
  const base = { kg: 80, cm: 180, tdee: 3070, ffm: 65.6, fmKg: 14.4, sex: 'm', trained: true, exerciseDay: 352, rmr: 1921, fatPct: 25, meals: 4 };
  const cut = C.makePlan({ ...base, mode: 'cut', ratePct: 0.5 });
  near(cut.kcal, 2622, 10, 'cut kcal'); assert.equal(cut.eaLevel, 'ok'); near(cut.protein, 177, 1, 'cut protein');
  const hard = C.makePlan({ ...base, mode: 'cut', ratePct: 1.0 });
  assert.equal(hard.eaLevel, 'amber', '1 %/week cut drops EA below 30');
  const extreme = C.makePlan({ ...base, mode: 'custom', customKcal: 1800 });
  assert.ok(extreme.blocked, 'very low intake is blocked');
  const safe = C.makePlan({ ...base, mode: 'cut', ratePct: 0.5, blockDeficit: true });
  near(safe.kcal, 3070, 0.01, 'deficits disabled in safety mode');
  assert.equal(C.recommendMode({ sex: 'm', bf: 22 }).mode, 'cut');
  assert.equal(C.recommendMode({ sex: 'm', bf: 12, ffmiN: 21.9 }).mode, 'bulk');
  assert.equal(C.recommendMode({ sex: 'f', bf: 27, trainingYears: 0 }).mode, 'recomp');
});
t('trend weight handles gaps', () => {
  const s = C.trendSeries([{ date: '2026-10-01', w: 80 }, { date: '2026-10-11', w: 78 }]);
  near(s[1].trend, 80 - (1 - 0.9 ** 10) * 2, 1e-9, 'gap-aware EMA');
});
console.log(`\n${n} test groups passed`);
