/* Run with: node forge/test/today.test.mjs
   Today is never a complete day: its steps are still growing and its meals are not all logged. Averages that feed
   the maintenance estimate, the weekly review and the import offers must use complete days only. */
import assert from 'node:assert/strict';
import * as C from '../js/calc.js';
import * as K from '../js/coach.js';
import { summarise } from '../js/health.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const td = C.today();

t('the import offer averages complete days, not this morning', () => {
  const days = {};
  for (let i = 1; i <= 20; i++) days[C.addDays(td, -i)] = { steps: 9000 };
  days[td] = { steps: 2000 };
  assert.equal(summarise({ days, workouts: [] }, 35, td).stepsAvg, 9000);
});

t('the weekly review looks at the last 7 complete days', () => {
  const L = {};
  for (let i = 1; i <= 7; i++) L[C.addDays(td, -i)] = { steps: 9000, kcal: 2500, w: 80 };
  L[td] = { steps: 2000, kcal: 1400, w: 80 };
  const R = K.weeklyReview(L, { td, series: [{ date: C.addDays(td, -7), trend: 80 }, { date: td, trend: 80 }], plan: { kcal: 2500, weeklyKg: 0, protein: 160 }, mode: 'maintain', stepsAvg: 9000 });
  assert.equal(R.steps, 9000, 'this morning’s 2,000 steps are not in the average');
  assert.equal(R.intake, 2500, 'nor is breakfast');
  assert.notEqual(R.adjust, 'stepsLow');
  assert.equal(R.to, C.addDays(td, -1));
});

t('measured maintenance leaves out today’s unfinished food log', () => {
  const logs = {};
  for (let i = 0; i < 28; i++) { const d = C.addDays(td, -i); logs[d] = { w: 80, kcal: i === 0 ? 1400 : 2500 }; }
  const a = C.adaptiveTdee(logs, { fmKg: 16, trained: true });
  assert.ok(a.ok); assert.equal(a.intake, 2500);
  assert.ok(Math.abs(a.tdee - 2500) < 1, `steady weight on 2,500 kcal is 2,500 maintenance, got ${a.tdee}`);
});

t('carbs: a switch to fewer carbs is water leaving, not extra fat burnt', () => {
  const ed = C.energyDensity(16, true, -1), fatPerDay = 300 / ed, logs = {};
  const carbs = i => (i >= 14 ? 350 : 150);                       // i = days before today: 350 g early, 150 g in the last two weeks
  for (let i = 42; i >= 0; i--) {
    const d = C.addDays(td, -i), prev = [1, 2, 3].map(k => carbs(i + k)), water = C.GLY_KG_PER_G * (prev.reduce((a, b) => a + b, 0) / 3 - 250);
    logs[d] = { w: 85 - fatPerDay * (42 - i) + water, kcal: 2500, c: carbs(i) };
  }
  const withCarbs = C.adaptiveTdee(logs, { fmKg: 16, trained: true });
  const noCarbs = C.adaptiveTdee(Object.fromEntries(Object.entries(logs).map(([d, v]) => [d, { w: v.w, kcal: v.kcal }])), { fmKg: 16, trained: true });
  assert.ok(withCarbs.ok && withCarbs.carb, 'the carb correction runs when carbs are logged');
  assert.ok(noCarbs.tdee > 2950, `without carbs the water reads as fat: ${Math.round(noCarbs.tdee)}`);
  assert.ok(Math.abs(withCarbs.tdee - 2800) < 80, `with carbs it finds the true maintenance: ${Math.round(withCarbs.tdee)}`);
  assert.ok(withCarbs.carb.effect < -150 && withCarbs.carb.start > withCarbs.carb.end);
  /* steady carbs: nothing to correct */
  const flat = {}; for (let i = 42; i >= 0; i--) flat[C.addDays(td, -i)] = { w: 85 - fatPerDay * (42 - i), kcal: 2500, c: 250 };
  assert.ok(Math.abs(C.adaptiveTdee(flat, { fmKg: 16, trained: true }).carb.effect) < 5);
});

console.log(`\n${n} test groups passed`);
