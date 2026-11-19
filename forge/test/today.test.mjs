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

console.log(`\n${n} test groups passed`);
