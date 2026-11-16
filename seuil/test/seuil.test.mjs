/* Checks for Seuil on invented figures. Run with: node --test seuil/test/*.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { simulate, analyse, annuity, breakEven, lostAgain, bridge, totals, HORIZON } from '../js/engine.js';
import { PACKS, PACK_ORDER, RULE_FIELDS, rulesFor } from '../js/packs.js';
import { t, setLang, keys } from '../js/i18n.js';

const base = (pack, o = {}) => ({ pack, region: PACKS[pack].region || null, cur: PACKS[pack].cur, mode: 'total', sqm: 70, price: 500000, rent: 1500, down: 100000, reno: 0, rate: PACKS[pack].rate, term: PACKS[pack].term, stay: 7, gPrice: 2, gRent: 2, ret: 5, ov: {}, ...o });
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('annuity: 300,000 at 4 % over 25 years is 1,583.51 a month; 0 % is a straight division', () => {
  near(annuity(300000, 4, 300), 1583.51);
  near(annuity(120000, 0, 120), 1000);
});

test('the bridge adds up to the difference, for every pack, every year and awkward inputs', () => {
  const variants = [{}, { reno: 40000 }, { down: 500000 }, { down: 0 }, { gPrice: -2, gRent: 6 }, { ret: 0 }, { rate: 0 }, { rent: 6000 }, { ov: { cgt: 30, cgtFree: null } }, { ov: { relief: 30, ownerTax: 0.4 } }];
  for (const k of PACK_ORDER) for (const v of variants) {
    const r = simulate(base(k, v));
    assert.equal(r.rows.length, HORIZON + 1);
    for (const row of r.rows) {
      const sum = Object.values(row.parts).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - row.adv) < 0.01, `${k} year ${row.y}: ${sum} vs ${row.adv}`);
      assert.ok(isFinite(row.own) && isFinite(row.rent));
    }
  }
});

test('year 0: the owner is behind by exactly the fees, the works and the cost of selling', () => {
  const l = base('DE', { reno: 20000 }), r = simulate(l), R = rulesFor(l);
  const fees = 500000 * (R.transfer + R.notary + R.agentBuy) / 100;
  near(r.fees, fees);
  near(r.rows[0].adv, -(fees + 20000 + 500000 * R.sell / 100));
  near(r.rows[0].rent, 100000 + fees + 20000);
});

test('a full annuity is repaid at the end of its term; a Swiss loan stops at 65 % of the price', () => {
  const de = simulate(base('DE', { term: 20 }));
  near(de.rows[20].loan, 0, 0.5); assert.ok(de.rows[19].loan > 1000);
  const ch = simulate(base('CH', { price: 1000000, down: 200000 }));
  near(ch.rows[15].loan, 650000, 0.5); near(ch.rows[40].loan, 650000, 0.5); near(ch.rows[0].loan, 800000);
});

test('the direction of each lever is the expected one', () => {
  const adv = o => analyse(base('DE', o)).at.adv, ref = adv({});
  assert.ok(adv({ gPrice: 4 }) > ref, 'faster price growth helps buying');
  assert.ok(adv({ rent: 2200 }) > ref, 'a higher rent helps buying');
  assert.ok(adv({ ret: 8 }) < ref, 'a better investment return helps renting');
  assert.ok(adv({ rate: 6 }) < ref, 'a dearer loan hurts buying');
  assert.ok(adv({ ov: { transfer: 6.5 } }) < ref, 'higher purchase tax hurts buying');
});

test('threshold, range and "renting takes the lead back"', () => {
  const a = analyse(base('CH', { price: 1000000, rent: 3000, down: 200000 }));
  assert.ok(a.be !== null && a.lo <= a.be && a.be <= a.hi);
  assert.equal(breakEven([{ adv: -1 }, { adv: -1 }, { adv: 2 }, { adv: 3 }]), 2);
  assert.equal(breakEven([{ adv: -1 }, { adv: -1 }]), null);
  assert.equal(lostAgain([{ adv: -1 }, { adv: 1 }, { adv: -2 }], 1), 2);
  const never = analyse(base('DE', { price: 900000, rent: 1200 }));
  assert.equal(never.be, null); assert.equal(never.hi, HORIZON + 1);
});

test('Poland taxes the gain inside five years only; a main home in Germany never', () => {
  const pl = simulate(base('PL', { gPrice: 5 }));
  assert.ok(pl.rows[5].cgt > 0); assert.equal(pl.rows[6].cgt, 0);
  assert.ok(simulate(base('DE', { gPrice: 5 })).rows.every(r => r.cgt === 0));
});

test('price and rent typed per m² give the same result as the totals', () => {
  const a = analyse(base('FR')), b = analyse(base('FR', { mode: 'sqm', price: 500000 / 70, rent: 1500 / 70 }));
  near(a.at.adv, b.at.adv, 0.5); near(totals(base('FR', { mode: 'sqm', price: 8000, rent: 20 })).price, 560000);
});

test('rules: region and overrides', () => {
  assert.equal(rulesFor(base('DE', { region: 'NW' })).transfer, 6.5);
  assert.equal(rulesFor(base('DE')).transfer, 3.5);
  assert.equal(rulesFor(base('CH', { region: 'VD' })).transfer, 3.3);
  assert.equal(rulesFor(base('DE', { ov: { transfer: 1, cgtFree: null } })).transfer, 1);
  assert.equal(rulesFor(base('DE', { ov: { cgtFree: null } })).cgtFree, null);
  assert.equal(rulesFor(base('DE', { ov: { loan: 'target' } })).loanTo, 65);
  for (const k of PACK_ORDER) for (const f of RULE_FIELDS) assert.ok(f in PACKS[k], `${k}.${f}`);
});

test('empty and extreme inputs never produce NaN', () => {
  for (const o of [{ price: 0, rent: 0 }, { price: '', rent: '' }, { sqm: 0, mode: 'sqm' }, { stay: 0 }, { stay: 999 }, { term: 0 }, { down: -5 }, { price: 1e9, rent: 1 }]) {
    const a = analyse(base('XX', o));
    assert.ok(isFinite(a.at.adv) && isFinite(a.fees) && a.stay >= 1 && a.stay <= HORIZON);
  }
});

test('English and French have the same keys, and every key used on screen exists', () => {
  const k = keys(); assert.deepEqual([...k.en].sort(), [...k.fr].sort());
  const src = ['ui.js', 'main.js'].map(f => fs.readFileSync(new URL('../js/' + f, import.meta.url), 'utf8')).join('\n');
  const used = new Set([...src.matchAll(/\bt\('([a-zA-Z0-9._]+)'[,)]/g)].map(m => m[1]));
  for (const f of ['sqm', 'price', 'rent', 'down', 'reno', 'rate', 'term', 'stay']) used.add('f.' + f);
  for (const g of ['gPrice', 'gRent', 'ret', 'rate']) used.add('g.' + g);
  for (const p of PACK_ORDER) { used.add('pack.' + p); used.add('rules.note.' + p); }
  for (const f of [...RULE_FIELDS, 'loan', 'rate', 'minDown']) { used.add('r.' + f); used.add('rx.' + f); }
  for (const b of ['rentSaved', 'growth', 'interest', 'upkeep', 'taxes', 'fees', 'reno', 'selling', 'cgt', 'returns', 'totalBuy', 'totalRent']) used.add('br.' + b);
  ['hero.stayBuy', 'hero.stayRent', 'cash.loanAnnuity', 'cash.loanTarget', 'cmp.be', 'cmp.range', 'cmp.stay', 'cmp.adv', 'cmp.advPct', 'cmp.ratio', 'cmp.fees', 'cmp.month', 'tab.seuil', 'tab.compare', 'tab.rules', 'tab.settings'].forEach(x => used.add(x));
  for (let i = 1; i <= 6; i++) used.add('method.' + i); for (let i = 1; i <= 4; i++) used.add('limits.' + i);
  for (const key of used) assert.ok(k.en.includes(key), 'missing key: ' + key);
  setLang('fr'); assert.equal(t('form.changed', { n: 1 }), '1 modifié'); assert.equal(t('form.changed', { n: 3 }), '3 modifiés'); setLang('en');
  const bars = bridge(analyse(base('DE')).at); assert.ok(bars.length >= 5 && bars.every(b => k.en.includes('br.' + b.k)));
});

/* ---------- renewal, simulation, house-price history (Nov 2026) ---------- */
import { monteCarlo } from '../js/engine.js';
import { hpiGrowth } from '../js/history.js';
test('a dearer renewal lowers the later advantage of buying, a cheaper one raises it', () => {
  const loc = { pack: 'DE', region: 'BY', price: 400000, rent: 1650, sqm: 80, down: 100000, rate: 3.5, term: 30, gPrice: 2, gRent: 2.5, ret: 5, stay: 10 };
  const adv = (x, y) => simulate({ ...loc, ...x }).rows[y].adv;
  assert.equal(adv({ fixYears: 10, rate2: 6 }, 10), adv({}, 10), 'same until the renewal');
  assert.ok(adv({ fixYears: 10, rate2: 6 }, 20) < adv({}, 20)); assert.ok(adv({ fixYears: 10, rate2: 2 }, 20) > adv({}, 20));
  assert.ok(Math.abs(adv({ fixYears: 10, rate2: '' }, 20) - adv({}, 20)) < 0.01, 'empty renewal rate = same rate');
});
test('simulation is repeatable and its shares are proper', () => {
  const loc = { pack: 'DE', region: 'BY', price: 400000, rent: 1650, sqm: 80, down: 100000, rate: 3.5, term: 30, gPrice: 2, gRent: 2.5, ret: 5, stay: 10 };
  const a = monteCarlo(loc), b = monteCarlo(loc);
  assert.deepEqual(a, b); assert.ok(a.pAhead > 0 && a.pAhead < 1); assert.ok(a.p10 <= a.p50 && a.p50 <= a.p90);
});
test('Eurostat JSON-stat: ten-year growth per country', () => {
  const js = { id: ['freq', 'unit', 'purchase', 'geo', 'time'], size: [1, 1, 1, 2, 11], dimension: { geo: { category: { index: { DE: 0, FR: 1 } } }, time: { category: { index: Object.fromEntries(Array.from({ length: 11 }, (_, i) => [String(2014 + i), i])) } } }, value: {} };
  for (let i = 0; i < 11; i++) { js.value[i] = 100 * Math.pow(1.05, i); js.value[11 + i] = 100 * Math.pow(1.02, i); }
  const g = hpiGrowth(js);
  assert.deepEqual(g.DE, { from: '2014', to: '2024', pct: 5 }); assert.equal(g.FR.pct, 2);
  assert.deepEqual(hpiGrowth(null), {});
});
