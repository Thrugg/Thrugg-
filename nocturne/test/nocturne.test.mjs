/* node --test nocturne/test/*.mjs   — the engine and the Health import, on invented data only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { File } from 'node:buffer';
import * as S from '../js/sleep.js';
import { hkTime, SleepAccumulator, readHealthFile, mergeNights } from '../js/health.js';
import { readFileSync } from 'node:fs';
/* the zip library is a browser script; load it here without tripping over this folder's "type": "module" */
const fflate = (() => { const m = { exports: {} }; new Function('module', 'exports', 'require', readFileSync(new URL('../vendor/fflate.min.js', import.meta.url), 'utf8'))(m, m.exports, createRequire(import.meta.url)); return m.exports; })();

const i18nKeys = (await import('../js/i18n.js')).keys().en;
const T = 'HKCategoryTypeIdentifierSleepAnalysis', V = 'HKCategoryValueSleepAnalysis';
const rec = (src, value, start, end, tz) => ` <Record type="${T}" sourceName="${src}" sourceVersion="11.1" creationDate="${end} +0100" startDate="${start} +0100" endDate="${end} +0100" value="${V}${value}"${tz ? `>\n  <MetadataEntry key="HKTimeZone" value="${tz}"/>\n </Record>` : '/>'}`;
const wrap = body => `<?xml version="1.0" encoding="UTF-8"?>\n<HealthData locale="fr_DE">\n <ExportDate value="2026-11-13 06:30:00 +0100"/>\n <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="2026-11-10 08:00:00 +0100" endDate="2026-11-10 08:10:00 +0100" value="900"/>\n${body}\n</HealthData>\n`;

/* Night of 10 Nov: watch with stages (23:40 → 06:30, awake 03:00–03:20), phone in bed 23:20 → 06:40, and a second
   app that recorded the same sleep as one block. Asleep = 410 − 20 = 390, in bed = 440. */
const N10 = [
  rec('Montre d&apos;exemple', 'AsleepCore', '2026-11-09 23:40:00', '2026-11-10 01:10:00', 'Europe/Berlin'),
  rec('Montre d&apos;exemple', 'AsleepDeep', '2026-11-10 01:10:00', '2026-11-10 02:00:00', 'Europe/Berlin'),
  rec('Montre d&apos;exemple', 'AsleepREM', '2026-11-10 02:00:00', '2026-11-10 03:00:00', 'Europe/Berlin'),
  rec('Montre d&apos;exemple', 'Awake', '2026-11-10 03:00:00', '2026-11-10 03:20:00', 'Europe/Berlin'),
  rec('Montre d&apos;exemple', 'AsleepCore', '2026-11-10 03:20:00', '2026-11-10 06:30:00', 'Europe/Berlin'),
  rec('iPhone', 'InBed', '2026-11-09 23:20:00', '2026-11-10 06:40:00', 'Europe/Berlin'),
  rec('Other app', 'AsleepUnspecified', '2026-11-09 23:30:00', '2026-11-10 06:35:00')
];
/* Night of 11 Nov: watch only, no "in bed" (00:30 → 06:00), then a 30-minute nap at 14:00, away from home. */
const N11 = [
  rec('Montre d&apos;exemple', 'AsleepCore', '2026-11-11 00:30:00', '2026-11-11 06:00:00', 'Europe/Lisbon'),
  rec('Montre d&apos;exemple', 'AsleepCore', '2026-11-11 14:00:00', '2026-11-11 14:30:00', 'Europe/Lisbon')
];
/* Night of 12 Nov: phone "in bed" only — no sleep was tracked. */
const N12 = [rec('iPhone', 'InBed', '2026-11-11 23:50:00', '2026-11-12 06:45:00')];
const XML = wrap([...N10, ...N11, ...N12].join('\n'));

test('Health dates', () => {
  assert.deepEqual(hkTime('2026-11-10 01:00:00 +0100'), { t: Date.UTC(2026, 10, 10, 0, 0, 0) / 1000, o: 3600 });
  assert.equal(hkTime('2026-07-01 00:30:00 -0430').o, -16200);
  assert.equal(hkTime('nonsense'), null);
});

test('one night from watch, phone and a second app', () => {
  const acc = new SleepAccumulator(); acc.scan(XML); const { nights, stats } = acc.result();
  const n = nights['2026-11-10'];
  assert.equal(n.src, "Montre d'exemple", 'the staged source is used, and its name is unescaped');
  assert.equal(n.on, -20); assert.equal(n.off, 390); assert.equal(n.a, 390); assert.equal(n.w, 20);
  assert.equal(n.b, 440); assert.equal(n.m, 1); assert.equal(n.bs, -40);
  assert.deepEqual(n.d, [280, 50, 60]);
  assert.deepEqual(n.s, [[-20, 180], [200, 390]]);
  assert.equal(n.a + n.w, n.off - n.on, 'asleep + awake = onset → wake');
  assert.equal(n.z, undefined, 'home time zone is not stored');
  const m = nights['2026-11-11'];
  assert.equal(m.a, 330); assert.equal(m.n, 30, 'the nap is kept apart from the night'); assert.equal(m.b, 330); assert.equal(m.m, undefined);
  assert.equal(m.z, 'Europe/Lisbon');
  assert.equal(nights['2026-11-12'], undefined); assert.equal(stats.bedOnly, 1); assert.equal(stats.n, 2);
});

test('export.zip and export.xml give the same nights; a French export name is read; old nights are skipped', async () => {
  const direct = new SleepAccumulator(); direct.scan(XML);
  const zipped = fflate.zipSync({ 'apple_health_export/export_cda.xml': fflate.strToU8(`<cda>${T}</cda>`), 'apple_health_export/exportation.xml': fflate.strToU8(XML), 'apple_health_export/workout-routes/a.gpx': fflate.strToU8('<gpx/>') });
  let last = 0;
  const viaZip = await readHealthFile(new File([zipped], 'export.zip'), { fflate, slice: 97, onProgress: p => { assert.ok(p >= last); last = p; } });
  assert.equal(last, 1);
  assert.deepEqual(viaZip.nights, direct.result().nights);
  const viaXml = await readHealthFile(new File([XML], 'export.xml'), { slice: 211 });
  assert.deepEqual(viaXml.nights, viaZip.nights);
  const recent = await readHealthFile(new File([XML], 'export.xml'), { since: '2026-11-11' });
  assert.deepEqual(Object.keys(recent.nights), ['2026-11-11']);
  await assert.rejects(readHealthFile(new File([fflate.zipSync({ 'notes.txt': fflate.strToU8('x') })], 'a.zip'), { fflate }), e => e.code === 'noExport');
  await assert.rejects(readHealthFile(new File([wrap('')], 'export.xml'), {}), e => e.code === 'noSleep');
});

test('importing again adds only what is new', () => {
  const acc = new SleepAccumulator(); acc.scan(XML); const first = acc.result().nights;
  const a = mergeNights({}, first); assert.deepEqual([a.added, a.updated, a.same], [2, 0, 0]);
  const b = mergeNights(a.nights, first); assert.deepEqual([b.added, b.updated, b.same], [0, 0, 2]); assert.deepEqual(b.nights, a.nights);
  const more = new SleepAccumulator(); more.scan(wrap([...N11, rec('Montre d&apos;exemple', 'AsleepCore', '2026-11-11 06:20:00', '2026-11-11 07:00:00'), rec('Montre d&apos;exemple', 'AsleepCore', '2026-11-13 00:00:00', '2026-11-13 06:00:00')].join('\n')));
  const c = mergeNights(a.nights, more.result().nights);
  assert.deepEqual([c.added, c.updated, c.same], [1, 1, 0]);
  assert.equal(Object.keys(c.nights).length, 3, 'the night missing from the second file is kept');
  assert.equal(c.nights['2026-11-11'].a, 370, 'a night cut off at the first export is completed');
});

test('rounding keeps the total', () => {
  assert.deepEqual(S.roundToSum([10.4, 10.4, 10.4], 31), [11, 10, 10]);
  assert.deepEqual(S.roundToSum([-2.5, 3.2, 100.3], 101), [-2, 3, 100]);
  for (let k = 0; k < 200; k++) { const xs = Array.from({ length: 1 + k % 9 }, (_, i) => Math.sin(k * 7 + i) * 90); const tot = Math.round(xs.reduce((a, b) => a + b, 0)); const r = S.roundToSum(xs, tot); assert.equal(r.reduce((a, b) => a + b, 0), tot); r.forEach((v, i) => assert.ok(Math.abs(v - xs[i]) < 1)); }
});

test('Sleep Regularity Index', () => {
  const night = (on, off) => ({ a: off - on, b: off - on, on, off, w: 0, s: [[on, off]] });
  const same = { '2026-11-01': night(0, 480), '2026-11-02': night(0, 480), '2026-11-03': night(0, 480) };
  assert.equal(S.sri(same, S.range('2026-11-03', 3)).value, 100);
  const shifted = { '2026-11-01': night(0, 480), '2026-11-02': night(60, 540) };   // 120 of 1,440 minutes differ
  assert.ok(Math.abs(S.sri(shifted, S.range('2026-11-02', 2)).value - (-100 + 200 * 1320 / 1440)) < 1e-9);
  const opposite = { '2026-11-01': night(-360, 360), '2026-11-02': night(360, 1080) };
  assert.equal(S.sri(opposite, S.range('2026-11-02', 2)).value, -100);
  const gap = { '2026-11-01': night(0, 480), '2026-11-03': night(0, 480) };
  assert.deepEqual(S.sri(gap, S.range('2026-11-03', 3)), { pairs: 0, value: null }, 'a missing day is not counted as a day awake');
});

test('the bridge adds up, whatever the tags', () => {
  const { nights, tags } = S.demo('2026-11-13');
  for (const span of [7, 14, 28, 63]) for (const end of ['2026-11-13', '2026-11-02', '2026-10-10']) {
    const dates = S.range(end, span), b = S.bridge(nights, tags, dates, 510); if (!b) continue;
    const exact = b.rows.reduce((a, r) => a + r.v, 0), shown = b.rows.reduce((a, r) => a + r.min, 0);
    assert.ok(Math.abs(exact - b.gap) < 1e-9, 'exact bars = gap');
    assert.equal(shown, b.gapMin, 'whole-minute bars = whole-minute gap');
    assert.equal(b.target - b.gapMin, b.actualMin);
    for (const r of b.rows) if (r.k !== 'ordinary') assert.ok(Math.abs(r.nights.reduce((a, n) => a + n.v, 0) / b.n - r.v) < 1e-9, 'a bar is the sum of its nights');
    const bb = S.bedBridge(nights, dates, 510); assert.equal(bb.rows[0].min + bb.rows[1].min, bb.gapMin); assert.equal(bb.gapMin, b.gapMin);
  }
});

test('the ordinary-night level', () => {
  const n = a => ({ a, b: a + 30, on: 0, off: a + 20, w: 20, s: [[0, a + 20]] });
  const nights = { '2026-11-07': n(400), '2026-11-08': n(420), '2026-11-09': n(410), '2026-11-10': n(320), '2026-11-11': n(380), '2026-11-12': n(410), '2026-11-13': n(350) };
  const dates = S.range('2026-11-13', 7);
  // two ordinary nights only: no level yet, causes carry their nights' whole shortfall
  let tags = { '2026-11-07': { t: ['clean'] }, '2026-11-08': { t: ['clean'] }, '2026-11-10': { t: ['social', 'screen'] } };
  let b = S.bridge(nights, tags, dates, 510), row = k => b.rows.find(r => r.k === k);
  assert.equal(b.ordinary.value, null);
  assert.ok(Math.abs(row('social').v - (510 - 320) / 2 / 7) < 1e-9); assert.ok(Math.abs(row('social').v - row('screen').v) < 1e-9);
  assert.ok(Math.abs(row('ordinary').v - (110 + 90) / 7) < 1e-9);
  // three ordinary nights (400, 420, 410 → 410): causes carry only what was lost beyond an ordinary night
  tags['2026-11-09'] = { t: ['clean'] }; tags['2026-11-13'] = { t: ['training'], n: 'late gym' };
  b = S.bridge(nights, tags, dates, 510);
  assert.equal(b.ordinary.value, 410);
  assert.ok(Math.abs(row('social').v - (410 - 320) / 2 / 7) < 1e-9);
  assert.ok(Math.abs(row('training').v - 60 / 7) < 1e-9);
  assert.ok(Math.abs(row('untagged').v - (30 + 0) / 7) < 1e-9);
  assert.ok(Math.abs(row('ordinary').v - (7 * 100 + (10 - 10 + 0)) / 7) < 1e-9);
  assert.equal(b.rows.reduce((a, r) => a + r.min, 0), b.gapMin);
  // a tagged night that beat the ordinary level gives a favourable (negative) bar
  nights['2026-11-13'] = n(450); b = S.bridge(nights, tags, dates, 510); assert.ok(row('training').v < 0);
});

test('the plan: bedtime counted back from the wake time', () => {
  const base = { n: 28, a: 375, b: 400, bed: 20, wake: 420, measured: 1 };
  const p = (gain, conv) => S.planTimes(base, { wake: 420, gain, conv, wind: 45 });
  assert.equal(p(45, 0.6).extraBed, 75); assert.equal(p(60, 2 / 3).extraBed, 90);     // the brief's +45–60 min ↔ 75–90 min
  const t = p(50, 0.65); assert.equal(t.extraBed, 77); assert.equal(t.bed, 420 - 477); assert.equal(t.shift, 77); assert.equal(t.steps, 6); assert.equal(t.wind, t.bed - 45); assert.equal(t.goal, 425);
  const plan = { wake: 420, gain: 50, conv: 0.65, wind: 45, start: '2026-11-13' };
  assert.equal(S.tonight(base, plan, '2026-11-13').bedTonight, 5); assert.equal(S.tonight(base, plan, '2026-11-16').bedTonight, -10);
  const end = S.tonight(base, plan, '2026-12-20'); assert.equal(end.bedTonight, t.bed); assert.equal(end.final, true);
  assert.equal(S.tonight(base, { ...plan, wake: 540 }, '2026-11-13').steps, 0, 'a later wake time needs no earlier bedtime');
  const night = (a, b) => ({ a, b, on: 0, off: b, w: b - a, s: [[0, b]], m: 1, bs: 0 });
  const nights = {}; S.range('2026-11-20', 7).forEach(d => nights[d] = night(410, 455));
  const pr = S.progress(nights, plan, base);
  assert.equal(pr.n, 7); assert.equal(pr.dA, 35); assert.equal(pr.dB, 55); assert.ok(Math.abs(pr.conv - 35 / 55) < 1e-9); assert.equal(pr.done, false);
});

test('baseline and morning date', () => {
  const { nights } = S.demo('2026-11-13'); const b = S.baseline(nights, '2026-11-13');
  assert.ok(b.n > 20 && b.a > 300 && b.a < 480 && b.b > b.a && b.measured === 1);
  assert.equal(S.morningOf(new Date(2026, 10, 13, 7, 30)), '2026-11-13');
  assert.equal(S.morningOf(new Date(2026, 10, 14, 1, 15)), '2026-11-13');
  assert.equal(S.addDays('2026-03-01', -1), '2026-02-28'); assert.equal(S.diffDays('2026-11-13', '2026-10-30'), 14);
});

test('every text used on screen exists in English and in French', async () => {
  const { keys } = await import('../js/i18n.js');
  const { en, fr } = keys();
  assert.deepEqual([...en].sort(), [...fr].sort(), 'same keys in both languages');
  const src = readFileSync(new URL('../js/ui.js', import.meta.url), 'utf8') + readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  const used = [...src.matchAll(/\bt\('([a-zA-Z0-9.]+)'[,)]/g)].map(m => m[1]);
  for (const k of used) assert.ok(en.includes(k), 'missing text: ' + k);
  for (const k of ['tab.bridge', 'tab.numbers', 'tab.nights', 'tab.plan', 'tab.settings', 'row.notInBed', 'row.awakeInBed', 'how.1', 'how.5', 'imp.how1', 'imp.how4', ...S.CAUSES.map(c => 'cause.' + c)]) assert.ok(en.includes(k), 'missing text: ' + k);
});

test('the guide: ranges, timing and ranked findings', () => {
  const night = (on, off, a) => ({ a, b: off - on + 10, on, off, w: off - on - a, s: [[on, off]], m: 1, bs: on - 10 });
  const nights = {}, tags = {};
  // 28 days to Fri 13 Nov 2026: workday nights 00:30 → 06:50, days off (woke Sat/Sun) 01:40 → 08:40
  for (const d of S.range('2026-11-13', 28)) { const w = new Date(d + 'T00:00:00Z').getUTCDay(), free = w === 0 || w === 6; nights[d] = free ? night(100, 520, 400) : night(30, 410, 365); }
  tags['2026-11-10'] = { t: ['screen'] }; nights['2026-11-10'] = night(90, 410, 305);
  const tm = S.timing(nights, S.range('2026-11-13', 28));
  assert.equal(tm.midWork, 220); assert.equal(tm.midFree, 310); assert.equal(tm.jetlag, 90); assert.equal(tm.late, 28);
  const g = S.advice(nights, tags, S.range('2026-11-13', 28), 510, 'regular'), it = k => g.items.find(i => i.k === k);
  assert.deepEqual([g.low, g.high, g.aim], [450, 540, 495]);
  assert.equal(it('volume').level, 2); assert.equal(it('volume').short, 450 - g.a);
  assert.equal(it('onset').level, 2); assert.equal(it('jetlag').level, 2); assert.equal(it('jetlag').v, 90);
  assert.equal(it('cause').cause, 'screen'); assert.equal(it('convHigh').level, 0); assert.equal(it('target'), undefined);
  assert.ok(g.items[0].level >= g.items[g.items.length - 1].level, 'most pressing first');
  assert.equal(S.advice(nights, tags, S.range('2026-11-13', 28), 600, 'light').items.find(i => i.k === 'target').over, true);
  for (const k of ['volume2', 'volume1', 'volume0', 'onset1', 'onset0', 'jetlag1', 'jetlagNeg', 'jetlag0', 'sri1', 'sri0', 'convLow', 'convHigh', 'cause', 'targetOver', 'targetUnder']) for (const p of ['.t', '.b']) assert.ok(i18nKeys.includes('adv.' + k + p), 'adv.' + k + p);
});
