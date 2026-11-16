/* Checks for BridgeLab on the invented portfolio. Run with: node --test bridgelab/test/*.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SKUS, CATS, PRESETS, PRESET_KEYS, blankAdj } from '../js/portfolio.js';
import { ORDERS, lines, totals, mixParts, bridge, allOrders, crossTerms, steps, domain, skuRows, materiality, spread, drivers } from '../js/engine.js';
import { waterfall, geometry, niceTicks } from '../js/chart.js';
import { t, setLang, keys } from '../js/i18n.js';

const near = (a, b, tol = 1e-6, m = '') => assert.ok(Math.abs(a - b) <= tol, `${m} ${a} vs ${b}`);
const L = adj => lines(SKUS, adj);

test('the invented portfolio: two categories, eight products, about €40m of net sales', () => {
  assert.equal(SKUS.length, 8); assert.deepEqual(CATS.map(c => c.id), ['dairy', 'plant']);
  const T = totals(L(blankAdj()));
  assert.equal(T.Q0, 21100); near(T.S00, 40095000, 1e-3);
  for (const k of PRESET_KEYS) for (const s of SKUS) assert.ok(PRESETS[k].adj[s.id], `${k} ${s.id}`);
});

test('a hand-worked two-product case gives the textbook figures in every convention', () => {
  /* A: 100 t at €2/kg → 120 t at €2.20/kg. B: 100 t at €1/kg → 80 t at €1/kg. */
  const two = [{ id: 'a', cat: 'x', q0: 100, p0: 2 }, { id: 'b', cat: 'x', q0: 100, p0: 1 }];
  const M = lines(two, { a: { dv: 20, dp: 10 }, b: { dv: -20, dp: 0 } });
  const v = bridge(M, 'vmp');
  near(v.base, 300000); near(v.actual, 344000); near(v.vol, 0, 1e-6, 'tonnes unchanged');
  near(v.mix, 20000, 1e-6, '20 t moved from €1 to €2'); near(v.price, 24000, 1e-6, '120 t × €0.20');
  const p = bridge(M, 'pvm'); near(p.price, 20000, 1e-6, '100 t × €0.20'); near(p.mix, 24000, 1e-6, 'mix at this year’s prices');
  const u = bridge(M, 'pure'); near(u.price, 20000); near(u.mix, 20000); near(u.pv, 4000, 1e-6, '20 t × €0.20'); near(u.vm, 0);
  near(crossTerms(M).pv, 4000);
});

test('every convention and every scenario adds up exactly to the change in net sales', () => {
  for (const k of PRESET_KEYS) {
    const M = L(PRESETS[k].adj), all = allOrders(M);
    for (const o of ORDERS) {
      const b = all[o];
      near(b.gap, 0, 1e-4, `${k} ${o}`);
      near(b.mixBetween + b.mixWithin, b.mix, 1e-6);
      const st = steps(b, true), last = st[st.length - 1], before = st[st.length - 2];
      near(before.end, last.end, 1e-4, 'the bars land on this year');
      near(steps(b, false).slice(-2, -1)[0].end, b.actual, 1e-4);
    }
  }
});

test('the trap: what moves between conventions is exactly the joint effects', () => {
  const M = L(PRESETS.price.adj), all = allOrders(M), ct = crossTerms(M);
  near(all.vmp.price - all.pvm.price, ct.pv, 1e-4, 'price, last minus first');
  near(all.vmp.price, all.mvp.price, 1e-6); near(all.pvm.price, all.pure.price, 1e-6);
  near(all.vmp.mix - all.mvp.mix, ct.vm, 1e-4, 'mix at this year’s tonnes minus at last year’s');
  near(all.pure.pv, ct.pv, 1e-6); near(all.pure.vm, ct.vm, 1e-6);
  const s = spread(all, 'price'); near(s.max - s.min, Math.abs(ct.pv), 1e-4);
  const m = materiality(M, all.vmp); assert.equal(m.material, true); assert.ok(m.share > 0.1);
  const y = L(PRESETS.year.adj); assert.equal(materiality(y, bridge(y)).material, false, 'a typical year: a footnote is enough');
  assert.equal(materiality(L(blankAdj()), bridge(L(blankAdj()))).material, false, 'nothing moved: nothing to disclose');
});

test('mix: a shift between categories is all "between", a shift inside them all "within"', () => {
  const sh = bridge(L(PRESETS.shift.adj));
  near(sh.mixWithin, 0, 1e-6); assert.ok(sh.mixBetween > 0, 'plant-based is dearer per kilo on average'); near(sh.price, 0);
  const pr = bridge(L(PRESETS.premium.adj));
  assert.ok(pr.mixWithin > 1e6 && Math.abs(pr.mixBetween) < pr.mixWithin / 10);
  const flat = bridge(L(blankAdj())); for (const k of ['vol', 'mix', 'price', 'change']) near(flat[k], 0);
  /* same share changes, valued at last year's prices, do not depend on the volume they are applied to beyond scale */
  const M = L(PRESETS.year.adj), T = totals(M), a = mixParts(M, T.Q0), b = mixParts(M, T.Q1);
  near(a.between / T.Q0, b.between / T.Q1, 1e-6); near(a.within / T.Q0, b.within / T.Q1, 1e-6);
});

test('product rows add up to the portfolio effects in each convention', () => {
  const M = L(PRESETS.year.adj);
  for (const o of ORDERS) {
    const b = bridge(M, o), r = skuRows(M, o), s = k => r.reduce((a, x) => a + x[k], 0);
    near(s('price'), b.price, 1e-4, o + ' price');
    near(s('vm'), b.vol + b.mix + (o === 'pure' ? b.vm : 0), 1e-4, o + ' volume and mix'); near(s('joint'), b.pv, 1e-4, o + ' joint');
    near(s('vm') + s('price') + s('joint'), b.change, 1e-4, o + ' total');
  }
});

test('the waterfall: the axis starts above zero and every bar sits inside the track', () => {
  const b = bridge(L(PRESETS.year.adj)), st = steps(b), [lo, hi] = domain(st);
  assert.ok(lo > 0 && lo < Math.min(b.base, b.actual) && hi > Math.max(b.base, b.actual));
  for (const g of geometry(st, lo, hi)) { assert.ok(g.left >= -1e-9 && g.left + g.width <= 100.0001, g.key); }
  const ticks = niceTicks(lo, hi); assert.ok(ticks.length >= 2 && ticks.every(v => v >= lo && v <= hi));
  setLang('en');
  const html = waterfall(st, { lo, hi, label: k => k, money: v => String(Math.round(v)), axis: v => String(v), sel: 'price', caption: 'c' });
  assert.equal((html.match(/class="wrow /g) || []).length, st.length);
  assert.match(html, /data-k="price" aria-pressed="true"/);
  assert.equal(steps(bridge(L(PRESETS.year.adj), 'pure')).filter(s => s.kind === 'joint').length, 2);
});

test('the headline names the largest effects first', () => {
  const d = drivers(bridge(L(PRESETS.price.adj))); assert.deepEqual(d.map(x => x[0]), ['price', 'vol', 'mix']);
});

test('English and French carry the same keys, and every key the screens use exists', () => {
  const k = keys(); assert.deepEqual([...k.fr].sort(), [...k.en].sort());
  const src = fs.readFileSync(new URL('../js/ui.js', import.meta.url), 'utf8');
  for (const m of src.matchAll(/\bt\('([a-zA-Z0-9.]+)'/g)) if (!m[1].endsWith('.')) assert.ok(k.en.includes(m[1]), 'missing ' + m[1]);
  for (const o of ORDERS) for (const p of ['ord.short.', 'ord.desc.', 'foot.']) assert.ok(k.en.includes(p + o), p + o);
  for (const b of ['base', 'vol', 'mixB', 'mixW', 'mix', 'price', 'vm', 'pv', 'actual']) assert.ok(k.en.includes('bar.' + b));
  for (const d of ['price', 'vol', 'mix', 'joint']) assert.ok(k.en.includes('drvn.' + d));
});

test('nothing in the folder names a real employer or real figures', () => {
  const dir = new URL('../', import.meta.url);
  const files = ['js/portfolio.js', 'js/i18n.js', 'js/ui.js', 'index.html', 'MAINTAINING.md'].filter(f => fs.existsSync(new URL(f, dir)));
  for (const f of files) assert.ok(!/danone|alpro|activia|actimel/i.test(fs.readFileSync(new URL(f, dir), 'utf8')), f);
});
