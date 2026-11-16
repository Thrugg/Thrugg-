/* Checks for the Funds Ladder on invented figures. Run with: node --test ladder/test/*.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { targetOf, needOf, fillOf, isFull, split, project, nextRung, carMaths, addMonths, monthsBetween } from '../js/engine.js';
import { t, setLang, keys } from '../js/i18n.js';

const sum = o => Math.round(Object.values(o).reduce((a, b) => a + b, 0) * 100) / 100;

test('a rung made of parts takes their sum as its target', () => {
  const r = { target: 1, saved: 1500, parts: [{ amt: 4500 }, { amt: 3000 }, { amt: 2500 }] };
  assert.equal(targetOf(r), 10000); assert.equal(needOf(r), 8500); assert.equal(fillOf(r), 0.15); assert.equal(isFull(r), false);
  assert.equal(isFull({ target: 100, saved: 120 }), true); assert.equal(isFull({ target: 0, saved: 0 }), false);
});

test('in order: lowest rung first, overflow to the next, paused rungs skipped', () => {
  const s = split([{ id: 'a', need: 300 }, { id: 'p', need: 900, paused: true }, { id: 'b', need: 5000 }], 1000, 'order');
  assert.deepEqual(s.by, { a: 300, b: 700 }); assert.equal(s.left, 0);
  assert.deepEqual(split([{ id: 'a', need: 300 }], 1000, 'order'), { by: { a: 300 }, left: 700 });
});

test('by shares: nothing is lost, a full rung hands its surplus on, zero shares mean equal parts', () => {
  const s = split([{ id: 'a', need: 300, pct: 50 }, { id: 'b', need: 5000, pct: 30 }, { id: 'c', need: 5000, pct: 20 }], 1000, 'pct');
  assert.deepEqual(s.by, { a: 300, b: 420, c: 280 }); assert.equal(sum(s.by) + s.left, 1000);
  const e = split([{ id: 'a', need: 5000, pct: 0 }, { id: 'b', need: 5000, pct: 0 }], 1000, 'pct');
  assert.deepEqual(e.by, { a: 500, b: 500 });
  const small = split([{ id: 'a', need: 100, pct: 50 }, { id: 'b', need: 100, pct: 50 }], 1000, 'pct');
  assert.equal(sum(small.by), 200); assert.equal(small.left, 800);
  for (let i = 0; i < 40; i++) {
    const rungs = Array.from({ length: 1 + i % 6 }, (_, k) => ({ id: 'r' + k, need: (k * 733 + i * 91) % 4000, pct: (k * 17 + i) % 60, paused: (k + i) % 5 === 0 }));
    const amt = 137 * (i + 1), r = split(rungs, amt, 'pct'), open = rungs.filter(x => !x.paused && x.need > 0 && (x.pct > 0 || rungs.every(q => q.paused || !(q.need > 0) || !(q.pct > 0))));
    assert.ok(Math.abs(sum(r.by) + r.left - amt) < 0.03, 'shares add up');
    for (const x of rungs) assert.ok((r.by[x.id] || 0) <= x.need + 0.01 && (!x.paused || !r.by[x.id]));
    if (r.left > 0.02) for (const x of open) assert.ok(Math.abs((r.by[x.id] || 0) - x.need) < 0.03, 'money is only left over when every open rung is full');
  }
});

test('projection: dates, lateness and the amount needed for a dated rung', () => {
  const rungs = [{ id: 'a', target: 9000, saved: 6500 }, { id: 'b', target: 10000, saved: 1500, due: '2028-03' }, { id: 'c', target: 3000, saved: 0, due: '2027-06' }, { id: 'd', target: 500, saved: 500 }];
  const p = project(rungs, 1000, 'order', '2026-11').by;
  assert.equal(p.a.share, 1000); assert.equal(p.a.when, '2027-02');
  assert.equal(p.b.when, '2027-10'); assert.ok(p.b.late <= 0); assert.equal(p.b.perMonthForDue, 531.25);
  assert.equal(p.c.when, '2028-01'); assert.equal(p.c.late, 7);
  assert.equal(p.d.months, 0);
  const none = project(rungs, 0, 'order', '2026-11').by; assert.equal(none.a.when, null); assert.equal(none.c.late, Infinity);
  const paused = project([{ id: 'a', target: 100, saved: 0, paused: true }], 50, 'order', '2026-11').by; assert.equal(paused.a.when, null);
  assert.equal(nextRung(rungs).id, 'a'); assert.equal(nextRung([{ target: 5, saved: 5 }]), null);
});

test('months', () => {
  assert.equal(addMonths('2026-11', 3), '2027-02'); assert.equal(addMonths('2026-11', 14), '2028-01'); assert.equal(addMonths('2027-01', -1), '2026-12');
  assert.equal(monthsBetween('2026-11', '2028-03'), 16); assert.equal(monthsBetween('2027-06', '2028-01'), 7);
});

test('812 maths: 28,000 a year at 1,900 a day is 14.7 rental days', () => {
  const m = carMaths({ dep: 18000, ins: 6000, service: 4000, day: 1900, days: 12 });
  assert.equal(m.year, 28000); assert.ok(Math.abs(m.rentalDays - 14.737) < 0.001); assert.equal(m.rentYear, 22800); assert.equal(m.saving, 5200);
  assert.equal(carMaths({ dep: 1, ins: 0, service: 0, day: 0, days: 0 }).rentalDays, null);
});

test('English and French have the same keys, and every key used on screen exists', () => {
  const k = keys(); assert.deepEqual([...k.en].sort(), [...k.fr].sort());
  const src = ['ui.js', 'main.js'].map(f => fs.readFileSync(new URL('../js/' + f, import.meta.url), 'utf8')).join('\n');
  const used = new Set([...src.matchAll(/\bt\('([a-zA-Z0-9._]+)'[,)]/g)].map(m => m[1]));
  for (const m of src.matchAll(/'((?:alloc|late|edit|car)\.[a-zA-Z]+)'/g)) used.add(m[1]);
  for (const x of ['safety', 'move', 'dog', 'events', 'etf', 'car', 'custom']) used.add('kind.' + x);
  for (const x of ['ladder', 'car', 'log', 'settings']) used.add('tab.' + x);
  for (const x of ['dep', 'ins', 'service', 'day', 'days']) used.add('car.f.' + x);
  for (const x of [0, 1, 2]) used.add('move.p' + x);
  for (const key of used) assert.ok(k.en.includes(key), 'missing key: ' + key);
  setLang('fr'); assert.match(t('late.order', { n: 1, name: 'Chien', v: '5 €' }), /^Chien serait atteint/); assert.match(t('late.order', { n: 2, name: 'Chien', v: '5 €' }), /^2 barreaux/); setLang('en');
});

test('growth on a rung and inflation on targets move the dates the right way', () => {
  const base = [{ id: 'a', target: 12000, saved: 6000 }];
  const flat = project(base, 100, 'order', '2026-11').by.a.months;
  const grown = project([{ ...base[0], ret: 6 }], 100, 'order', '2026-11').by.a.months;
  const infl = project(base, 100, 'order', '2026-11', { infl: 2 }).by.a.months;
  assert.equal(flat, 60); assert.ok(grown < flat, `growth ${grown} < ${flat}`); assert.ok(infl > flat, `inflation ${infl} > ${flat}`);
  const onlyGrowth = project([{ id: 'b', target: 2000, saved: 1000, ret: 7 }], 0, 'order', '2026-11').by.b;
  assert.ok(onlyGrowth.months > 100 && onlyGrowth.months < 130, 'no new money: about 10 years at 7 %');
});
