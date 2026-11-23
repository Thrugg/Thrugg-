/* Prisme: the builder, the checks, the display maths, offers, timing, warranty, the catalogue and the texts.
   node --test prisme/test/*.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../js/engine.js';
import { DICT } from '../js/i18n.js';
import { parseFeed, merge } from '../../tools/prisme_news.mjs';

const rd = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const CAT = JSON.parse(rd('data/catalog.json')), MKT = JSON.parse(rd('data/market.json')), PRE = JSON.parse(rd('data/prebuilts.json'));
E.setData(CAT, MKT, PRE);
const D = s => new Date(s + 'T12:00:00Z');

test('catalogue: unique ids, one item per line, prices, specs, known sources and categories', () => {
  const ids = new Set(), cats = new Set(['gpu', 'cpu', 'board', 'ram', 'ssd', 'psu', 'cooler', 'case', 'monitor', 'tv', 'soundbar', 'phone', 'headphones', 'laptop', 'tablet']);
  for (const it of CAT.items) {
    assert.ok(!ids.has(it.id), 'duplicate ' + it.id); ids.add(it.id);
    assert.ok(cats.has(it.cat), it.id + ' category');
    assert.ok(it.name && it.brand && it.s, it.id);
    const sz = E.sizesOf(it, 'DE')[0]; assert.ok(E.price(it, 'DE', sz) > 0 && E.price(it, 'FR', sz) > 0, it.id + ' price');
    assert.match(it.pd, /^\d{4}-\d{2}$/, it.id); assert.ok(['H', 'M', 'L'].includes(it.conf), it.id);
    for (const k of it.src) assert.ok(MKT.sources[k], `${it.id}: unknown source ${k}`);
    if (E.CRIT[it.cat]) for (const k of E.CRIT[it.cat]) assert.ok(it.r[k] >= 1 && it.r[k] <= 10, `${it.id}.r.${k}`);
  }
  const lines = rd('data/catalog.json').split('\n').filter(l => l.startsWith('{"id"'));
  assert.equal(lines.length, CAT.items.length, 'one item per line');
  for (const p of Object.values(MKT.pressure)) if (p.src) assert.ok(MKT.sources[p.src], p.src);
  assert.ok(Array.isArray(PRE.items));
});

test('France: own price when given, else the German one adjusted for VAT and marked as derived', () => {
  const g = E.byId('gpu-rtx5080'), p = E.priceOf(g, 'FR');
  assert.ok(p.derived); assert.ok(p.v > 1800 && p.v < 1900);
  const tv = E.byId('tv-lg-c6'); assert.deepEqual(E.sizesOf(tv, 'DE'), [48, 55, 65, 77]); assert.equal(E.price(tv, 'DE', 65), 2299);
});

test('builder: the owner\'s case, an RTX 5080 4K PC for €3,500, is balanced and passes every check', () => {
  const b = E.build({ use: 'aaa4k', budget: 3500, gpu: 'gpu-rtx5080', market: 'DE' });
  assert.equal(b.parts.gpu.id, 'gpu-rtx5080'); assert.ok(b.parts.cpu.s.x3d, 'an X3D processor for a top card');
  assert.equal(b.parts.cpu.s.socket, b.parts.board.s.socket);
  assert.ok(!b.over && b.total <= 3500);
  assert.deepEqual(b.checks.filter(c => c.st !== 'pass').map(c => c.k), []);
  assert.ok(b.parts.psu.s.w >= 850 && b.parts.psu.s.native, '850 W with a native 12V-2x6 cable');
  assert.equal(b.balance.state, 'good');
});

test('builder: budget, size, platform and creator wishes change the parts sensibly', () => {
  const low = E.build({ use: 'aaa4k', budget: 2500, market: 'DE' });
  assert.ok(low.total <= 2500); assert.ok(low.parts.gpu.s.perf4k < 100);
  assert.notEqual(low.balance.state, 'cpuOverkill', 'no €430 processor behind a mid-range card at 4K');
  const sff = E.build({ use: 'aaa4k', budget: 3500, size: 'sff', market: 'DE' });
  assert.equal(sff.parts.case.s.size, 'sff'); assert.equal(sff.parts.psu.s.form, 'sfx'); assert.ok(sff.parts.cooler.s.h <= 77);
  assert.deepEqual(sff.checks.filter(c => c.st === 'fail'), []);
  const intel = E.build({ use: 'allround', budget: 2500, platform: 'intel', market: 'DE' });
  assert.equal(intel.parts.cpu.s.socket, 'LGA1851'); assert.equal(intel.parts.board.s.socket, 'LGA1851');
  const cr = E.build({ use: 'creator', budget: 4500, market: 'DE' });
  assert.ok(cr.parts.ram.s.gb >= 64); assert.ok(cr.parts.cpu.s.multi >= 80);
  const mid = E.build({ use: 'aaa4k', budget: 3500, market: 'DE' });
  assert.ok(['mid', 'full'].includes(mid.parts.case.s.size), 'no micro-ATX case unless asked');
  const tiny = E.build({ use: 'esports', budget: 600, market: 'DE' }); assert.ok(tiny.over, 'an impossible budget is flagged, not hidden');
});

test('checks: a swapped part that does not fit is caught', () => {
  const b = E.build({ use: 'aaa4k', budget: 3500, gpu: 'gpu-rtx5080', market: 'DE' });
  const bad = { ...b.parts, board: E.byId('board-z890'), psu: E.byId('psu-650-b'), case: E.byId('case-terra') };
  const c = Object.fromEntries(E.compat(bad, { use: 'aaa4k' }).map(x => [x.k, x.st]));
  assert.equal(c.socket, 'fail'); assert.equal(c.psuW, 'warn', '650 W covers the 595 W draw without headroom'); assert.equal(c.psuConn, 'warn'); assert.equal(c.coolerFit, 'fail'); assert.equal(c.psuForm, 'fail');
  const alts = E.alternatives('case', b.parts, { market: 'DE' });
  assert.ok(alts.find(a => a.it.id === 'case-terra').fails > 0);
  assert.equal(E.psuNeed(E.byId('gpu-rtx5090'), E.byId('cpu-9800x3d')).rec, 1000);
});

test('frame rates: upscaling and frame generation, the processor limit, 4× only on RTX 50', () => {
  const g = E.byId('gpu-rtx5080'), c = E.byId('cpu-9800x3d'), amd = E.byId('gpu-rx9070xt');
  const nat = E.fps(g, c, '4k', 'aaa'), q = E.fps(g, c, '4k', 'aaa', 'quality'), mfg = E.fps(g, c, '4k', 'aaa', 'quality', 'x4');
  assert.equal(nat.native, 72); assert.ok(q.base > nat.base); assert.ok(mfg.shown > 3 * q.base - 5);
  assert.equal(E.fps(amd, c, '4k', 'aaa', 'quality', 'x4').fgUsed, false, 'no multi-frame generation on Radeon');
  const slow = E.byId('cpu-7600x'), es = E.fps(E.byId('gpu-rtx5090'), slow, '1440', 'esports');
  assert.ok(es.cpuBound); assert.equal(E.balance(E.byId('gpu-rtx5090'), slow, '1440', 'esports').state, 'cpuLimits');
  assert.ok(E.fps(g, c, '4k', 'pt', 'performance', 'x2').fgLowBase, 'path tracing base rate below 60 is flagged');
});

test('displays: bandwidth, DSC, PPI and pixels per degree', () => {
  const need = E.needGbps(3840, 2160, 240); assert.ok(need > 60 && need < 72);
  const g = E.byId('gpu-rtx5080'), r40 = { s: { dp: 'dp14' } };
  assert.equal(E.signal(E.byId('mon-pg32ucdmr'), g).mode, 'native', 'DP 2.1 UHBR20 card + monitor: no compression');
  assert.equal(E.signal(E.byId('mon-pg32ucdmr'), r40).mode, 'dsc', 'an older DP 1.4 card needs DSC');
  assert.equal(E.signal(E.byId('mon-321urx'), g).via, 'DP');
  assert.equal(Math.round(E.ppi(27, 3840, 2160)), 163); assert.equal(Math.round(E.ppi(32, 3840, 2160)), 138);
  assert.ok(E.ppd(E.ppi(32, 3840, 2160), 75) > 60); assert.ok(E.ppd(E.ppi(27, 2560, 1440), 60) < 50);
  assert.equal(E.burnRisk('qdoled', 6, 3).level, 'high'); assert.equal(E.burnRisk('miniled', 10).level, 'none');
  assert.equal(E.tvSizeFor(300), 78);
});

test('monitor ranking follows the person: bright room and long static hours favour Mini-LED, gaming favours OLED', () => {
  const rank = ctx => E.items('monitor').map(m => ({ id: m.id, s: E.monitorScore(m, { market: 'DE', ...ctx }).score })).sort((a, b) => b.s - a.s);
  const office = rank({ uses: { work: 3 }, staticH: 9, room: 'bright', dist: 70, budget: 1500 });
  assert.ok(['miniled', 'ips'].includes(E.byId(office[0].id).s.panel), 'office in a bright room: no OLED first (' + office[0].id + ')');
  const gamer = rank({ uses: { aaa: 3, comp: 2 }, staticH: 1, room: 'dark', dist: 75, gpu: E.byId('gpu-rtx5080'), budget: 1500 });
  assert.match(E.byId(gamer[0].id).s.panel, /oled/);
  const over = E.monitorScore(E.byId('mon-pg32ucdm3'), { uses: { aaa: 3 }, budget: 500, market: 'DE' });
  assert.ok(over.why.some(w => w.k === 'over'));
});

test('TVs: the size follows the seat distance and the budget', () => {
  const r = E.tvScore(E.byId('tv-lg-c6'), { dist: 300, budget: 4000, market: 'DE', uses: { movies: 3 } });
  assert.equal(r.size, 77);
  const r2 = E.tvScore(E.byId('tv-lg-c6'), { dist: 300, budget: 2400, market: 'DE', uses: { movies: 3 } });
  assert.equal(r2.size, 65); assert.ok(r2.why.some(w => w.k === 'small'));
});

test('offers: a pasted spec list is read and scored; cut corners are flagged', () => {
  const good = E.parseOffer('Gaming PC Ultra\nAMD Ryzen 7 9800X3D\nNVIDIA GeForce RTX 5080 16GB\n32GB DDR5-6000 (2x16GB)\n2TB M.2 NVMe SSD\nMSI B650 Gaming Plus WiFi\n850W be quiet! Pure Power 12 M\nWindows 11 Home\n3.199,00 €');
  assert.equal(good.cpu, 'cpu-9800x3d'); assert.equal(good.gpu, 'gpu-rtx5080'); assert.equal(good.ram, 32); assert.equal(good.ramMts, 6000);
  assert.equal(good.ssd, 2); assert.equal(good.psuW, 850); assert.match(good.psuBrand, /be quiet/i); assert.equal(good.chipset, 'B650'); assert.ok(good.os); assert.equal(good.price, 3199);
  const c = E.checkOffer(good, 'DE'); assert.ok(c.ok); assert.equal(c.verdict, 'good'); assert.equal(c.flags.length, 0);
  const ti = E.parseOffer('Intel Core Ultra 7 265K, GeForce RTX 5070 Ti, 16 GB DDR5 4800 (1x16GB), 512GB SSD, 650W, H810, 2.899 €');
  assert.equal(ti.gpu, 'gpu-rtx5070ti', 'a 5070 Ti is not read as a 5070'); assert.equal(ti.cpu, 'cpu-265k'); assert.equal(ti.ssd, 0.512);
  const f = E.checkOffer(ti, 'DE').flags.map(x => x.k).sort();
  for (const k of ['psuUnknown', 'ramSingle', 'ramSlow', 'ramSmall', 'ssdSmall']) assert.ok(f.includes(k), k);
  assert.equal(E.checkOffer({ price: 2000 }, 'DE').ok, false);
  assert.equal(E.matchPart('ASUS TUF Gaming Radeon RX 9070 XT OC', 'gpu').id, 'gpu-rx9070xt');
  const fair = E.fairPrice(3000, true); assert.equal(fair.lo, 3300); assert.equal(fair.hi, 3570);
});

test('ready-made offers from the weekly list: market, freshness, filters', () => {
  const offer = (o) => ({ id: 'x', m: 'DE', seller: 'Shop', name: 'PC', url: 'https://example.org', price: 3300, date: '2026-11-20', cpu: 'cpu-9800x3d', gpu: 'gpu-rtx5080', ram: 32, ssd: 2, psu: 'be quiet! 850W', board: 'B650', os: true, ...o });
  E.setData(CAT, MKT, { items: [offer({}), offer({ id: 'y', m: 'FR' }), offer({ id: 'z', date: '2026-09-01' }), offer({ id: 'w', gpu: 'gpu-rtx5060', price: 1500 })] });
  const r = E.matchPrebuilts({ market: 'DE', budget: 3500, gpuMin: 'gpu-rtx5070ti' }, D('2026-11-23'));
  assert.deepEqual(r.map(x => x.p.id), ['x']);
  E.setData(CAT, MKT, PRE);
});

test('timing: Black Friday ahead, a phone before its successor, a reached target', () => {
  const s = E.nextSale(D('2026-11-23'), 'DE'); assert.equal(s.id, 'bf'); assert.equal(s.days, 4);
  assert.equal(E.saleDates(2027, 'FR').find(x => x.id === 'soldesHiver').start.toISOString().slice(0, 10), '2027-01-13');
  assert.equal(E.saleDates(2027, 'FR').find(x => x.id === 'soldesEte').start.toISOString().slice(0, 10), '2027-06-30');
  assert.ok(!E.saleDates(2027, 'DE').some(x => x.id.startsWith('soldes')));
  const gpu = E.timing(E.byId('gpu-rtx5080'), D('2026-11-23'), 'DE'); assert.equal(gpu.verdict, 'wait'); assert.ok(gpu.reasons.some(r => r.k === 'shortage'));
  assert.equal(E.timing(E.byId('ph-iphone17'), D('2027-07-20'), 'DE').verdict, 'wait');
  assert.equal(E.timing(E.byId('cpu-9800x3d'), D('2027-03-10'), 'DE').verdict, 'buy');
  assert.equal(E.timing(E.byId('gpu-rtx5080'), D('2027-03-10'), 'DE', { target: 1900 }).verdict, 'buy');
});

test('gear: warranty stages in Germany and France, value, upgrade checks', () => {
  const de = E.warranty({ bought: '2025-06-01', market: 'DE' }, D('2026-11-23')), fr = E.warranty({ bought: '2025-06-01', market: 'FR' }, D('2026-11-23'));
  assert.equal(de.stage, 'legal', 'Germany: past the 12 months where the seller must prove'); assert.equal(fr.stage, 'presume', 'France: 24 months for new goods');
  assert.equal(E.warranty({ bought: '2025-06-01', market: 'FR', used: true }, D('2026-11-23')).stage, 'legal');
  assert.equal(E.warranty({ bought: '2023-01-01', market: 'DE', makerM: 60 }, D('2026-11-23')).stage, 'maker');
  assert.equal(E.valueNow({ bought: '2024-11-23', price: 1000, cat: 'gpu' }, D('2026-11-23')), 680);
  const up = E.upgradeCheck({ catId: 'gpu-rtx5070', price: 950 }, 'DE');
  assert.ok(up.best && up.best.id !== 'gpu-rtx5090', 'no €8,000 card as the upgrade for a €950 one'); assert.ok(up.gain > 0);
  assert.deepEqual(E.ecosystems([{ name: 'iPhone 15 Pro' }, { catId: 'sb-arc-ultra' }]).sort(), ['apple', 'sonos']);
});

test('afford: months of free cash and the safety net level', () => {
  const fin = { net: 4200, other: 0, essential: 2300, savings: 25000, plan: 900, levels: [6900, 13800, 20700, 27600] };
  const a = E.afford(3400, fin); assert.equal(a.verdict, 'stretch'); assert.equal(a.months, 1.8); assert.equal(a.before, 'vgood');
  assert.equal(E.afford(600, fin).verdict, 'easy'); assert.equal(E.afford(30000, fin).verdict, 'no');
  assert.equal(E.afford(6000, fin).afterLv, 'good'); assert.equal(E.afford(100, null), null);
});

test('product scoring: what matters, budget and ecosystem', () => {
  const cam = E.items('phone').map(it => ({ id: it.id, s: E.scoreProduct(it, { camera: 3, battery: 1, perf: 0, display: 0, longevity: 0, value: 0 }, { budget: 2000, market: 'DE' }).score })).sort((a, b) => b.s - a.s);
  assert.equal(cam[0].id, 'ph-s26ultra');
  const withApple = E.scoreProduct(E.byId('hp-airpodspro3'), {}, { eco: ['apple'], market: 'DE' }).score, without = E.scoreProduct(E.byId('hp-airpodspro3'), {}, { market: 'DE' }).score;
  assert.equal(withApple - without, 5);
  assert.ok(E.scoreProduct(E.byId('hp-xm6'), {}, { type: 'in', market: 'DE' }).score < 50, 'over-ear filtered down when in-ear is asked');
});

test('news: RSS and Atom are read, duplicates and old items dropped, headlines about your gear first', () => {
  const rss = `<rss><channel><item><title><![CDATA[GeForce RTX 5080: Preise sinken]]></title><link>https://example.org/a?utm=1</link><pubDate>Mon, 23 Nov 2026 08:00:00 GMT</pubDate><description>&lt;p&gt;Die Grafikkarte&lt;/p&gt;</description></item><item><title>Old</title><link>https://example.org/old</link><pubDate>Mon, 02 Feb 2026 08:00:00 GMT</pubDate></item></channel></rss>`;
  const atom = `<feed><entry><title>LG C6 review &amp; test</title><link href="https://example.org/b"/><updated>2026-11-22T10:00:00Z</updated><summary>OLED TV</summary></entry><entry><title>dup</title><link href="https://example.org/a"/><updated>2026-11-22T10:00:00Z</updated></entry></feed>`;
  const a = parseFeed(rss, 'PCGH', 'de'), b = parseFeed(atom, 'Verge', 'en');
  assert.equal(a[0].title, 'GeForce RTX 5080: Preise sinken'); assert.equal(a[0].t, 'pc'); assert.equal(b[0].title, 'LG C6 review & test'); assert.equal(b[0].t, 'display');
  const m = merge([a, b], new Date('2026-11-23T12:00:00Z')); assert.equal(m.length, 2);
  const n = E.newsFor(m, E.watchWords(['GeForce RTX 5080'])); assert.ok(n[0].mine); assert.deepEqual(n[0].hit, ['rtx 5080']);
  assert.deepEqual(E.watchWords(['GeForce RTX 5070 Ti', 'Ryzen 7 9800X3D', 'Galaxy S26 Ultra', 'iPhone 18 Pro']), ['RTX 5070 Ti', '9800X3D', 'S26 Ultra', 'iPhone 18 Pro']);
});

test('texts: every key the screens use exists in English and French, with the same placeholders', () => {
  const ui = rd('js/ui.js'), en = DICT.en, fr = DICT.fr;
  const keys = new Set([...ui.matchAll(/\bt\('([A-Za-z0-9_]+)'/g)].map(m => m[1]).filter(k => !k.endsWith('_')));
  ['tBuild', 'tScreens', 'tChoose', 'tGear', 'tPulse'].forEach(k => keys.add(k));
  /* codes the engine returns, shown through a prefix */
  const codes = {
    use_: Object.keys(E.USES), p_: E.PARTS, res_: ['4k', '1440', '1080'], k_: ['aaa', 'rt', 'pt', 'esports'], bal_: ['good', 'cpuSlight', 'cpuLimits', 'cpuOverkill'],
    v_: ['buy', 'wait', 'watch', 'a_easy', 'a_ok', 'a_stretch', 'a_heavy', 'a_no'], aff_: ['easy', 'ok', 'stretch', 'heavy', 'no'], lv_: ['basic', 'good', 'vgood', 'excellent', 'below'],
    f_: ['psuLow', 'psuUnknown', 'ramSmall', 'ramSingle', 'ramSlow', 'ssdSmall', 'qlc', 'boardLow', 'cpuLimits'], ov_: ['good', 'fair', 'high'], m_: ['gpu', 'cpu', 'price'],
    r_: ['burnHigh', 'burnMed', 'sigNo', 'sigDsc', 'sigNative', 'gpuShort', 'gpuFps', 'soft', 'retina', 'sharp', 'wide', 'over', 'small', 'hdmiFew', 'eco', 'target', 'saleNow', 'saleSoon', 'launchSoon', 'shortage', 'pricey', 'calm'],
    sale_: MKT.sales.map(s => s.id), cat_: [...new Set([...CAT.items.map(i => i.cat), ...Object.keys(MKT.pressure), 'pc', 'other'])], pl_: ['calm', 'firm', 'high', 'shortage'],
    panel_: [...new Set(E.items('monitor').concat(E.items('tv')).map(i => i.s.panel))], sig_: ['native', 'dsc', 'no'], burn_: ['none', 'low', 'medium', 'high'],
    cr_: [...new Set(Object.values(E.CRIT).flat())], eco_: ['apple', 'samsung', 'google', 'sonos', 'sony', 'lg', 'bose'], mu_: ['aaa', 'comp', 'work', 'movies', 'creative'], tu_: ['movies', 'sport', 'gaming', 'tv'],
    mk_: ['DE', 'FR'], rights_: ['DE', 'FR'], t_: ['display', 'audio', 'laptop', 'deal'], ocr_: ['prep', 'read'], w_: ['presume', 'legal', 'maker', 'none'], up_: ['quality', 'balanced', 'performance']
  };
  for (const [pre, list] of Object.entries(codes)) for (const c of list) keys.add(pre + c);
  /* every compatibility check with the states it can take */
  const checks = { socket: ['pass', 'fail'], gpuLen: ['pass', 'warn', 'fail'], coolerFit: ['pass', 'fail'], radFit: ['pass', 'fail'], coolerCap: ['pass', 'warn', 'fail'], psuW: ['pass', 'warn', 'fail'], psuConn: ['pass', 'warn'], psuTier: ['pass', 'warn'], psuForm: ['pass', 'fail'], airflow: ['pass', 'warn'], vram: ['pass', 'warn'], vrm: ['pass', 'warn'], matx: ['warn'], itx: ['warn'] };
  for (const [k, sts] of Object.entries(checks)) for (const st of sts) keys.add(`c_${k}_${st}`);
  const ph = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
  for (const k of keys) {
    assert.ok(en[k] != null, 'English missing: ' + k);
    assert.ok(fr[k] != null, 'French missing: ' + k);
    assert.equal(ph(fr[k]), ph(en[k]), 'placeholders differ: ' + k);
  }
  for (const k of Object.keys(fr)) assert.ok(en[k] != null, 'French-only key: ' + k);
});
