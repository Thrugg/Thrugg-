/* Run with: node forge/test/arena.test.mjs — the Arena additions: grip, beep test, half marathon and marathon. */
import assert from 'node:assert/strict';
import * as C from '../js/calc.js';
import { EVENTS, GRIP } from '../js/data.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const man = { sex: 'm', kg: 82, age: 35 }, woman = { sex: 'f', kg: 62, age: 35 };

t('grip: the median of the reference ranks at the 50th percentile, by sex and age', () => {
  assert.ok(Math.abs(C.evaluatePR({ event: 'grip', kg: 51 }, man).p - 0.5) < 0.01);
  assert.ok(Math.abs(C.evaluatePR({ event: 'grip', kg: 31 }, woman).p - 0.5) < 0.01);
  assert.ok(Math.abs(C.evaluatePR({ event: 'grip', kg: 45 }, { ...man, age: 60 }).p - 0.5) < 0.01, 'Dodds: 45 kg median at 60');
  /* the same 45 kg ranks higher at 70 than at 35: the standard follows age */
  assert.ok(C.evaluatePR({ event: 'grip', kg: 45 }, { ...man, age: 70 }).p > C.evaluatePR({ event: 'grip', kg: 45 }, man).p);
  /* a strong grip sits high but not off the scale */
  const p = C.evaluatePR({ event: 'grip', kg: GRIP.m.mean + 2 * GRIP.m.sd }, man).p;
  assert.ok(p > 0.95 && p < 0.995, String(p));
  assert.equal(C.plausible({ event: 'grip', kg: 200 }, 'm'), false);
});

t('beep test: Léger 1988 with age held at 18', () => {
  assert.equal(C.beepSpeed(1, 0), 8.5);
  assert.equal(C.beepSpeed(10, 0), 13);
  assert.ok(Math.abs(C.legerVo2(13) - (-27.439 + 6.0028 * 13)) < 0.01, 'adult form −27.44 + 6.003 × speed');
  const r = C.evaluatePR({ event: 'vo2', method: 'beep', level: 12, shuttle: 6 }, man);
  assert.ok(r.value > 55 && r.value < 60, String(r.value)); assert.equal(r.note, 'beep');
  assert.equal(C.prValue({ event: 'vo2', method: 'beep', level: 0 }).rankable, false);
});

t('Cooper still converts with (metres − 504.9) / 44.73', () => {
  assert.ok(Math.abs(C.prValue({ event: 'vo2', method: 'cooper', meters: 2450 }).value - 43.49) < 0.01);
});

t('half marathon and marathon rank through VDOT on FRIEND, faster is better, within world-record limits', () => {
  for (const id of ['run21k', 'run42k']) assert.equal(EVENTS[id].domain, 'aerobic');
  const slow = C.evaluatePR({ event: 'run21k', time: 2.5 * 3600 }, man).p, fast = C.evaluatePR({ event: 'run21k', time: 1.5 * 3600 }, man).p;
  assert.ok(fast > slow);
  assert.ok(C.evaluatePR({ event: 'run42k', time: 3 * 3600 }, man).p > 0.8);
  assert.equal(C.plausible({ event: 'run42k', time: 1.9 * 3600 }, 'm'), false, 'faster than the world record');
  assert.equal(C.plausible({ event: 'run42k', time: 3.5 * 3600 }, 'm'), true);
});

t('new results feed the domains', () => {
  const A = C.arena([{ event: 'grip', kg: 60, date: C.today() }, { event: 'run42k', time: 3.25 * 3600, date: C.today() }], man, null);
  assert.ok(A.dom.strength > 0 && A.dom.aerobic > 0);
});

console.log(`\n${n} test groups passed`);
