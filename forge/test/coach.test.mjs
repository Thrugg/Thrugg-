/* Run with: node forge/test/coach.test.mjs */
import assert from 'node:assert/strict';
import * as C from '../js/calc.js';
import * as K from '../js/coach.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, expected ${b} ± ${tol}`);
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('weeks start on Monday', () => {
  assert.equal(K.weekStart('2026-11-10'), '2026-11-09'); assert.equal(K.weekStart('2026-11-09'), '2026-11-09'); assert.equal(K.weekStart('2026-11-15'), '2026-11-09');
  assert.equal(K.stepsGoal(10200), 9000); assert.equal(K.stepsGoal(3000), 4000);
});
const L = {};
for (let i = 0; i < 7; i++) { const d = C.addDays('2026-11-02', i); L[d] = { w: i < 5 ? 90 - 0.1 * i : undefined, kcal: i === 3 ? 700 : 2600, steps: i < 5 ? 9500 : 4000, p: 180 }; }
t('weekly quests count habits, never body numbers', () => {
  const q = K.coreQuests(L, { stepsGoal: 9000 }, '2026-11-02');
  assert.deepEqual(q.map(x => [x.id, x.n, x.done]), [['weigh', 5, true], ['fuel', 6, true], ['move', 5, true]], 'a half-logged day does not count as a calorie day');
  const calm = K.coreQuests(L, { stepsGoal: 9000, noFood: true }, '2026-11-02');
  assert.deepEqual(calm.map(x => x.id), ['weigh', 'move'], 'calm mode drops the calorie quest');
  assert.equal(K.coreQuests(L, { stepsGoal: 9000 }, '2026-11-02', '2026-11-04')[0].n, 3, 'only days up to today');
});
t('seasons of 12 weeks from the first Monday', () => {
  const s = K.season('2026-10-30', '2026-11-10', L, { stepsGoal: 9000 });
  assert.equal(s.n, 1); assert.equal(s.week, 3); assert.equal(s.start, '2026-10-26'); assert.equal(s.end, '2027-01-17');
  assert.equal(s.weeks.length, 12); assert.equal(s.weeks[1].score, 3); assert.equal(s.weeks[2].current, true); assert.equal(s.weeks[5].score, null);
  const s2 = K.season('2026-07-01', '2026-11-10', L, { stepsGoal: 9000 });
  assert.equal(s2.n, 2); assert.ok(s2.prevStart);
  const series = C.trendSeries(Object.entries(L).filter(([, v]) => v.w).map(([date, v]) => ({ date, w: v.w })));
  const R = K.seasonRecap(s.start, s.end, { L, series, prs: [{ pr: { event: 'bench', date: '2026-11-03' }, r: { rankable: true, tier: 3 } }], ctx: { stepsGoal: 9000 }, td: '2026-11-10' });
  assert.equal(R.quests, 3); assert.equal(R.records, 1); assert.equal(R.topTier, 3); assert.ok(R.weightChange < 0);
});
t('weekly review picks one win and one adjustment', () => {
  const series = [{ date: '2026-10-28', trend: 90.5 }, { date: '2026-11-01', trend: 90.2 }, { date: '2026-11-08', trend: 89.7 }];
  let R = K.weeklyReview(L, { td: '2026-11-08', series, plan: { kcal: 2600, weeklyKg: -0.45, protein: 180 }, mode: 'cut', stepsAvg: 8000 });
  near(R.delta, -0.5, 1e-9, 'trend change over 7 days'); assert.equal(R.win, 'onPace'); assert.equal(R.adjust, 'steady'); near(R.intake, 2600, 1e-9, 'partial day left out of the mean');
  R = K.weeklyReview(L, { td: '2026-11-08', series: [{ date: '2026-11-01', trend: 90.2 }, { date: '2026-11-08', trend: 89.0 }], plan: { kcal: 2600, weeklyKg: -0.45, protein: 180 }, mode: 'cut', stepsAvg: 8000 });
  assert.equal(R.adjust, 'tooFast', 'losing much faster than planned is flagged');
  R = K.weeklyReview(L, { td: '2026-11-08', series, plan: { kcal: 2600, weeklyKg: -0.45, protein: 180 }, mode: 'cut', stepsAvg: 12000 });
  assert.equal(R.adjust, 'stepsLow', 'walking far less than the plan assumes');
  R = K.weeklyReview({}, { td: '2026-11-08', series: [], plan: null, stepsAvg: 8000 });
  assert.equal(R.any, false); assert.equal(R.adjust, 'start');
  R = K.weeklyReview(L, { td: '2026-11-08', series, plan: { kcal: 2600, weeklyKg: -0.45, protein: 180 }, mode: 'cut', stepsAvg: 8000, noFood: true });
  assert.notEqual(R.win, 'logging', 'calm mode never praises or nags about calories');
});
t('closest level-ups', () => {
  const who = { sex: 'm', kg: 80, age: 30 }, td = C.today();
  const A = C.arena([{ event: 'bench', weight: 96, reps: 1, bw: 80, date: td }, { event: 'sprint100', time: 12.0, timing: 'electronic', date: td }, { event: 'vjump', cm: 40, method: 'mat', date: td }], who, null);
  const b = K.bosses(A.best, 3);
  assert.equal(b[0].id, 'sprint100'); assert.equal(b[0].level, 'R2'); near(b[0].target, 11.94, 1e-9, 'next FFA level'); near(b[0].rel, 0.005, 0.0001, '0.5 % to go');
  assert.equal(b[1].id, 'bench'); assert.equal(b[1].tier, 3); near(b[1].target, 98, 1e-9, 'next tier');
});
t('duel codes carry scores only and survive a round trip', () => {
  const code = K.duelEncode({ name: 'Zoé', variant: 'f', peak: 87.34, balance: 70.1, dom: { strength: 81.26, speed: 64, bogus: 5 }, gl: 61.23, date: '2026-11-10' });
  assert.ok(code.startsWith('FORGE-DUEL1:'));
  const r = K.duelDecode('hey, paste this: ' + code + ' thanks');
  assert.deepEqual(r, { name: 'Zoé', variant: 'f', peak: 87.3, balance: 70.1, dom: { strength: 81.3, speed: 64 }, gl: 61.2, date: '2026-11-10' });
  assert.equal(K.duelDecode('FORGE-DUEL1:not-base64!'), null); assert.equal(K.duelDecode('hello'), null);
  const evil = 'FORGE-DUEL1:' + btoa(JSON.stringify({ n: '<img src=x onerror=alert(1)>', d: { strength: 9999, speed: 'x' }, pk: -5 })).replace(/=+$/, '');
  const e = K.duelDecode(evil); assert.equal(e.name, 'img srcx onerroralert1'); assert.equal(e.dom.strength, 100); assert.equal(e.dom.speed, undefined); assert.equal(e.peak, 0);
  const s = K.duelScore({ strength: 80, speed: 60, aerobic: 70 }, { strength: 70, speed: 60.5, power: 90 });
  assert.equal(s.rows.length, 2); assert.equal(s.mine, 1); assert.equal(s.theirs, 0, 'within one point is a draw');
});
t('healthspan bands', () => {
  assert.equal(K.vo2Band(0.2), 'low'); assert.equal(K.vo2Band(0.6), 'above'); assert.equal(K.vo2Band(0.98), 'elite');
  assert.equal(K.whtrBand(0.47), 'ok'); assert.equal(K.stanceBand(10), 'ok'); assert.equal(K.stanceBand(6), 'low');
  const g = C.gripT('m', 26); assert.equal(g.band, 'weak'); near(g.t, (26 - 51.9) / 9.9, 1e-9, 'T-score'); assert.equal(C.gripT('f', 25).band, 'ok');
});
console.log(`\n${n} test groups passed`);
