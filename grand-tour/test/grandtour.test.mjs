/* Checks for Grand Tour on invented figures. Run with: node --test grand-tour/test/*.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEFAULT_BANDS, PAR, MEMORABLE, CRITERIA, gradeFromRate, gradeOf, gradeSource, experience, scoredCount, valueOf, km, bearing, driveGuess, driveOf, hasPin, applyFilters, stats, ranking, cleanBands, fmtDrive } from '../js/engine.js';
import { compass, valueChart } from '../js/atlas.js';
import { t, setLang, keys } from '../js/i18n.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const munich = { name: 'Munich', lat: 48.1372, lon: 11.5755 };

test('the ladder: band edges, and the three hotels it was calibrated on land in different grades', () => {
  assert.deepEqual([1, 249, 250, 449, 450, 799, 800, 1499, 1500, 9000].map(r => gradeFromRate(r)), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  assert.equal(gradeFromRate(0), null); assert.equal(gradeFromRate(''), null);
  const prague = gradeFromRate(220), burgenstock = gradeFromRate(1300), sixSenses = gradeFromRate(1700);
  assert.deepEqual([prague, burgenstock, sixSenses], [1, 4, 5]);
  assert.equal(gradeFromRate(300), 2); assert.equal(gradeFromRate(520), 3);
  assert.equal(gradeFromRate(300, [200, 280, 600, 1000]), 3, 'moving the bands regrades');
});

test('a hotel takes its own grade first, then the season rate, then the price paid', () => {
  assert.equal(gradeOf({ gradeOv: 5, ref: 200 }), 5); assert.equal(gradeSource({ gradeOv: 5, ref: 200 }), 'own');
  assert.equal(gradeOf({ ref: 900, paid: 200 }), 4); assert.equal(gradeSource({ ref: 900, paid: 200 }), 'ref');
  assert.equal(gradeOf({ paid: 480 }), 3); assert.equal(gradeSource({ paid: 480 }), 'paid');
  assert.equal(gradeOf({}), null); assert.equal(gradeSource({}), null);
});

test('experience is the weighted mean of the criteria that were scored', () => {
  assert.equal(experience({ x: { room: 5, service: 5, food: 5, spa: 3, parking: 3, gym: 3 } }), 80);
  assert.equal(experience({ x: {} }), null); assert.equal(experience({}), null);
  assert.equal(experience({ x: { room: 4, pool: 0 } }), 80, 'a zero means not scored');
  assert.equal(experience({ x: { room: 5, pool: 1 } }, { pool: 0 }), 100, 'an ignored criterion drops out');
  near(experience({ x: { room: 5, pool: 2 } }, { pool: 3 }), (5 + 6) / 4 * 20, 1e-9);
  assert.equal(scoredCount({ x: { room: 5, pool: 0, food: 2 } }), 2);
  assert.equal(CRITERIA.length, 8);
});

test('value for the grade is experience minus the par of the grade', () => {
  assert.equal(valueOf({ ref: 520, x: { room: 5, service: 5, food: 5, spa: 3, parking: 3, gym: 3 } }), 80 - PAR[2]);
  assert.equal(valueOf({ ref: 1700, x: { room: 4 } }), 80 - 92);
  assert.equal(valueOf({ ref: 520 }), null); assert.equal(valueOf({ x: { room: 4 } }), null);
  assert.deepEqual(PAR, [60, 68, 76, 84, 92]);
});

test('distance, bearing and the drive estimate', () => {
  const salzburg = { lat: 47.8026, lon: 13.0419 }, prague = { lat: 50.0862, lon: 14.4327 };
  near(km(munich, salzburg), 115, 3); near(km(munich, prague), 300, 5); assert.equal(km(munich, munich), 0);
  near(bearing(munich, salzburg), 108, 3); near(bearing(munich, prague), 43, 3); near(bearing(munich, { lat: 49, lon: 11.5755 }), 0, 0.01);
  assert.equal(driveGuess(100), 92);
  assert.deepEqual(driveOf({ lat: 47.8026, lon: 13.0419, drive: 95 }, munich), { min: 95, est: false });
  assert.equal(driveOf({ lat: 47.8026, lon: 13.0419 }, munich).est, true);
  assert.equal(driveOf({ lat: null, lon: null }, munich), null); assert.equal(hasPin({ lat: '', lon: 3 }), false); assert.equal(hasPin({ lat: 0, lon: 0 }), true);
  assert.equal(fmtDrive(105), '1 h 45'); assert.equal(fmtDrive(120), '2 h'); assert.equal(fmtDrive(40), '40 min'); assert.equal(fmtDrive(119), '2 h');
});

const sample = [
  { id: 'a', name: 'A', status: 'stayed', ref: 220, nights: 2, paid: 200, has: { pool: true, sauna: true, parking: true, dog: true }, x: { room: 3, service: 3 }, lat: 48.2, lon: 11.6 },
  { id: 'b', name: 'B', status: 'stayed', ref: 520, nights: 1, paid: 500, has: { sauna: true }, x: { room: 5, service: 5, food: 4 }, lat: 47.8, lon: 13.04 },
  { id: 'c', name: 'C', status: 'wish', ref: 1700, has: { pool: true, sauna: true }, lat: 46.31, lon: 7.47 },
  { id: 'd', name: 'D', status: 'stayed', nights: 3, paid: 300, x: {} }
];
test('filters', () => {
  const ctx = { bands: DEFAULT_BANDS, home: munich }, ids = f => applyFilters(sample, f, ctx).map(h => h.id).join('');
  assert.equal(ids({ status: 'all', grades: [] }), 'abcd'); assert.equal(ids({ status: 'wish', grades: [] }), 'c');
  assert.equal(ids({ status: 'all', grades: [1, 5] }), 'ac'); assert.equal(ids({ status: 'all', grades: [], pool: true, dog: true }), 'a');
  assert.equal(ids({ status: 'all', grades: [], drive: 2 }), 'ab', 'a hotel without a pin is left out of a drive filter');
});

test('the log: nights, spend and the cost per memorable night', () => {
  const s = stats(sample, DEFAULT_BANDS, {});
  assert.deepEqual([s.stays, s.wishes, s.nights, s.spent], [3, 1, 6, 1800]);
  assert.equal(s.perNight, 300); assert.equal(s.rated, 2); assert.equal(s.memStays, 1); assert.equal(s.memNights, 1);
  assert.equal(s.perMemorable, 1800, 'everything spent, over the nights of the stays that scored ' + MEMORABLE + ' or more');
  assert.equal(stats([], DEFAULT_BANDS, {}).perMemorable, null);
  const r = ranking(sample, DEFAULT_BANDS, {}); assert.deepEqual(r.map(x => x.h.id), ['b', 'a']); near(r[0].v, 93.33 - 76, 0.01); assert.equal(r[1].v, 0);
});

test('bands must rise', () => {
  assert.deepEqual(cleanBands(['250', '450', '800', '1500']), [250, 450, 800, 1500]);
  assert.equal(cleanBands([250, 250, 800, 1500]), null); assert.equal(cleanBands([0, 450, 800, 1500]), null); assert.equal(cleanBands([1, 2, 3]), null);
});

test('the drawings are well-formed and carry every hotel', () => {
  const items = sample.filter(hasPin).map(h => ({ id: h.id, name: h.name, lat: h.lat, lon: h.lon, min: driveOf(h, munich).min, grade: gradeOf(h), stayed: h.status === 'stayed' }));
  const svg = compass(items, { w: 350, home: munich, L: { n: 'N', e: 'E', s: 'S', w: 'W', aria: 'x', hours: n => n + ' h' } });
  assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>')); assert.equal((svg.match(/data-act="open"/g) || []).length, 3); assert.ok(!svg.includes('NaN'));
  assert.ok(!compass([], { w: 350, home: munich, L: { n: 'N', e: 'E', s: 'S', w: 'W', aria: 'x', hours: n => n + ' h' } }).includes('NaN'));
  const twins = compass([{ id: '1', name: 'One', lat: 47, lon: 8.4, min: 250, grade: 4 }, { id: '2', name: 'Two', lat: 47.0001, lon: 8.4001, min: 250, grade: 5 }], { w: 350, home: munich, L: { n: 'N', e: 'E', s: 'S', w: 'W', aria: 'x', hours: n => n + ' h' } });
  const xy = [...twins.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="12.5"/g)].map(m => [Number(m[1]), Number(m[2])]);
  assert.ok(Math.hypot(xy[0][0] - xy[1][0], xy[0][1] - xy[1][1]) >= 26, 'two hotels in the same spot are drawn apart');
  const vc = valueChart([{ name: 'A', g: 1, e: 60 }, { name: 'B', g: 3, e: 93 }], { w: 350, names: ['a', 'b', 'c', 'd', 'e'], L: { par: 'par', aria: 'x' } });
  assert.ok(!vc.includes('NaN') && (vc.match(/class="pt/g) || []).length === 2);
});

test('English and French have the same keys, and every key used on screen exists', () => {
  const k = keys(); assert.deepEqual([...k.en].sort(), [...k.fr].sort());
  const src = ['ui.js', 'main.js'].map(f => fs.readFileSync(new URL('../js/' + f, import.meta.url), 'utf8')).join('\n');
  const used = new Set([...src.matchAll(/\bt\('([a-zA-Z0-9._]+)'[,)]/g)].map(m => m[1]));
  for (const m of src.matchAll(/'((?:drive|edit|pin|value)\.[a-zA-Z]+)'/g)) used.add(m[1]);
  for (const x of ['atlas', 'carnet', 'ladder', 'settings']) used.add('tab.' + x);
  for (const x of ['all', 'stayed', 'wish', 'name', 'place', 'lat', 'lon', 'drive', 'ref', 'from', 'nights', 'who', 'paid']) used.add('f.' + x);
  for (const x of ['pool', 'sauna', 'parking', 'gym', 'dog']) used.add('has.' + x);
  for (const x of CRITERIA) used.add('x.' + x);
  for (const x of ['drive', 'grade', 'value', 'name']) used.add('sort.' + x);
  for (const x of [0, 1, 2, 3]) used.add('w.' + x);
  for (const key of used) assert.ok(k.en.includes(key), 'missing key: ' + key);
  setLang('fr'); assert.equal(t('atlas.h1', { a: 1, b: 3 }), '1 séjour, 3 envies'); assert.equal(t('stay.nights', { n: 2 }), '2 nuits'); setLang('en');
  assert.equal(t('atlas.k', { n: 1 }), '1 five-star hotel');
});

/* ---------- several stays, own par, hikes nearby (Nov 2026) ---------- */
import { staysOf, newStay, fitPar, hikesNear, usePar, PAR as PARX, PAR_DEFAULT } from '../js/engine.js';
test('several stays: the latest moves to the past, stats count every stay', () => {
  const h = { id: 'h', name: 'X', status: 'stayed', ref: 300, from: '2026-03-01', nights: 2, paid: 300, x: { room: 5, service: 4 } };
  const h2 = { ...newStay(h), from: '2026-10-01', nights: 3, paid: 320, x: { room: 3 } };
  assert.equal(h2.past.length, 1); assert.equal(staysOf(h2).length, 2); assert.equal(staysOf(h2)[0].from, '2026-03-01');
  const st = stats([h2], DEFAULT_BANDS, {});
  assert.equal(st.nights, 5); assert.equal(st.visits, 2); assert.equal(st.stays, 1);
  assert.deepEqual(staysOf({ status: 'wish' }), []);
});
test('own par: fitted from ten stays over three grades, rising, or not at all', () => {
  const mk = (ref, e) => ({ status: 'stayed', ref, x: { room: e / 20 } });
  const hs = [];
  for (let i = 0; i < 4; i++) { hs.push(mk(200, 60)); hs.push(mk(600, 80)); }
  hs.push(mk(1700, 100), mk(1700, 100));
  const f = fitPar(hs, DEFAULT_BANDS, {});
  assert.ok(f && f.par[0] < f.par[2] && f.par[2] < f.par[4], JSON.stringify(f));
  assert.equal(fitPar(hs.slice(0, 5), DEFAULT_BANDS, {}), null);
  usePar([50, 60, 70, 80, 90]); assert.equal(PARX[2], 70); usePar(null); assert.deepEqual([...PARX], PAR_DEFAULT);
});
test('hikes near a hotel, closest first, with the dog rule', () => {
  const hotel = { lat: 47.5, lon: 11.0 };
  const hikes = [{ n: 'Near', p: [[47.52, 11.02]], d: { r: 'free', t: 'ok' } }, { n: 'Far', p: [[48.5, 12]] }, { n: 'Banned', p: [[47.51, 10.99]], d: { r: 'banned' } }];
  const n = hikesNear(hotel, hikes, 30);
  assert.deepEqual(n.map(x => x.h.n), ['Banned', 'Near']); assert.equal(n[1].dog, true); assert.equal(n[0].dog, false);
  assert.deepEqual(hikesNear({ lat: null, lon: null }, hikes), []);
});
