/* Checks for Sillage on invented figures. Run with: node --test sillage/test/*.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FAMILIES, FIT, JUICE, BANDS, SEASONS, OCCASIONS, SHAPES, bandOf, seasonOf, parseNotes, allNotes, wearIndex, bottleStats, wardrobeStats, suggest, taste, exportData, parseSuggestions, sameScent, daysBetween, addDays, iso } from '../js/engine.js';
import { bottle, pyramid } from '../js/draw.js';
import { t, setLang, keys } from '../js/i18n.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const B = [
  { id: 'a', house: 'Dior', name: 'Sauvage', family: 'aromatic', size: 100, price: 105, grade: 7, notes: { top: 'bergamot, pepper', heart: 'lavender, geranium', base: 'ambroxan, cedar' }, seasons: ['spring', 'summer', 'autumn'], occ: ['office', 'casual'] },
  { id: 'b', house: 'Tom Ford', name: 'Tobacco Vanille', family: 'amber', size: 50, price: 260, grade: 9, notes: { top: 'tobacco leaf, spices', heart: 'vanilla, tonka', base: 'dried fruits, cedar' }, seasons: ['autumn', 'winter'], occ: ['evening', 'date'] },
  { id: 'c', house: 'Armani', name: 'Acqua di Giò', family: 'aquatic', size: 100, price: 95, grade: 5, notes: { top: 'bergamot, neroli', heart: 'marine notes', base: 'cedar, musk' }, seasons: ['summer'], occ: ['casual', 'sport'] }
];
const W = [{ id: '1', d: '2026-11-13', b: 'a' }, { id: '2', d: '2026-11-01', b: 'b' }, { id: '3', d: '2026-10-20', b: 'b' }, { id: '4', d: '2026-08-01', b: 'c' }];

test('every family has a weather fit and a colour; the fits stay between 0 and 1', () => {
  for (const f of FAMILIES) { assert.equal(FIT[f].length, 4, f); assert.ok(FIT[f].every(x => x >= 0 && x <= 1)); assert.match(JUICE[f], /^#[0-9a-f]{6}$/); }
  assert.ok(FIT.citrus[0] > FIT.citrus[3] && FIT.amber[3] > FIT.amber[0], 'fresh for heat, dense for cold');
});

test('weather bands and seasons', () => {
  assert.deepEqual([30, 24, 23.9, 15, 14.9, 7, 6.9, -5].map(bandOf), ['hot', 'hot', 'mild', 'mild', 'cool', 'cool', 'cold', 'cold']);
  assert.equal(bandOf(undefined), null); assert.equal(bandOf('x'), null);
  assert.deepEqual(['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15', '2026-12-01'].map(d => seasonOf(d, 48)), ['winter', 'spring', 'summer', 'autumn', 'winter']);
  assert.equal(seasonOf('2026-01-15', -33), 'summer');
});

test('dates', () => {
  assert.equal(daysBetween('2026-11-01', '2026-11-14'), 13); assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2, 'across the clock change');
  assert.equal(addDays('2026-11-14', -14), '2026-10-31'); assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(iso(new Date(2026, 0, 5)), '2026-01-05');
});

test('notes typed loosely come out as a clean list', () => {
  assert.deepEqual(parseNotes(' bergamot,pepper ;  lavender\ngeranium,, '), ['bergamot', 'pepper', 'lavender', 'geranium']);
  assert.deepEqual(parseNotes(['a ', '', 'b']), ['a', 'b']); assert.deepEqual(parseNotes(undefined), []);
  assert.equal(allNotes(B[0]).length, 6);
});

test('cost per wear and what is left in the bottle', () => {
  const ix = wearIndex(W), b = bottleStats(B[1], ix, 6);
  assert.equal(b.wears, 2); assert.equal(b.last, '2026-11-01'); assert.equal(b.costPerWear, 130);
  near(b.mlLeft, 50 - 2 * 6 * 0.1); assert.equal(b.wearsLeft, 81); near(b.level, 48.8 / 50);
  const none = bottleStats({ id: 'z', size: 100, price: 80 }, ix, 6); assert.equal(none.costPerWear, null); assert.equal(none.level, 1);
  assert.equal(bottleStats({ id: 'z', size: 0 }, ix).mlLeft, null);
  assert.equal(bottleStats({ id: 'b', size: 1, price: 10 }, ix, 6).mlLeft, 0, 'never below empty');
  const ws = wardrobeStats(B, W, '2026-11-14', 6);
  assert.deepEqual([ws.bottles, ws.value, ws.wears, ws.recent], [3, 460, 4, 3]); assert.equal(ws.perWear, 115); assert.equal(ws.most.b.id, 'b');
  assert.equal(wardrobeStats(B, [...W, { id: '9', d: '2026-11-10', b: 'gone' }], '2026-11-14').wears, 4, 'wears of a deleted bottle are not counted');
});

test('what to wear: cold evening picks the amber, a hot day picks the aquatic', () => {
  const cold = suggest(B, W, { band: 'cold', season: 'autumn', occ: 'evening', today: '2026-11-14' });
  assert.equal(cold[0].b.id, 'b'); assert.deepEqual(cold[0].reasons, ['grade', 'weather', 'season', 'occ']);
  const hot = suggest(B, W, { band: 'hot', season: 'summer', occ: null, today: '2026-11-14' });
  assert.equal(hot[0].b.id, 'c'); assert.ok(hot[0].reasons.includes('weather') && hot[0].reasons.includes('rest'));
  assert.ok(cold.find(x => x.b.id === 'a').reasons.includes('yesterday'));
  for (const x of [...cold, ...hot]) assert.ok(x.score >= 0 && x.score <= 100);
});

test('a bottle already worn today goes to the bottom; an unrated one still gets a fair score', () => {
  const r = suggest(B, [...W, { id: 'x', d: '2026-11-14', b: 'b' }], { band: 'cold', season: 'autumn', occ: 'evening', today: '2026-11-14' });
  assert.equal(r[r.length - 1].b.id, 'b'); assert.deepEqual(r[r.length - 1].reasons, ['today']);
  const fresh = suggest([{ id: 'n', name: 'New', family: '', size: 50 }], [], { band: null, season: 'autumn', occ: null, today: '2026-11-14' });
  assert.ok(fresh[0].score > 30 && fresh[0].reasons.includes('never'));
  assert.deepEqual(suggest([], [], { band: 'cold', season: 'winter', today: '2026-11-14' }), []);
});

test('taste is read from the grades', () => {
  const tt = taste(B);
  assert.equal(tt.graded, 3); near(tt.mean, 7);
  assert.ok(tt.liked.every(x => x.mean >= 7)); assert.equal(tt.liked[0].mean, 9);
  assert.equal(tt.notes.find(x => x.k === 'cedar').n, 3); near(tt.notes.find(x => x.k === 'cedar').mean, 7);
  assert.equal(tt.notes.find(x => x.k === 'bergamot').mean, 6);
  assert.equal(tt.families[0].k, 'amber'); assert.ok(tt.avoided.some(x => x.k === 'marine notes'));
  assert.equal(taste([{ grade: 0, notes: { top: 'x' } }]).graded, 0); assert.equal(taste([]).mean, null);
});

test('what goes to Claude, and what comes back', () => {
  const S = { bottles: B, wears: W, queue: [{ house: 'Guerlain', name: 'Vétiver', verdict: null }, { house: 'X', name: 'Dropped', verdict: 'drop' }] };
  const out = exportData(S, '2026-11-14');
  assert.equal(out.wardrobe.length, 3); assert.equal(out.wardrobe[1].my_grade_out_of_10, 9); assert.equal(out.wardrobe[1].wears, 2);
  assert.deepEqual(out.already_on_my_list, ['Guerlain Vétiver']); assert.deepEqual(out.tried_and_dropped, ['X Dropped']);
  assert.ok(!JSON.stringify(out).includes('"price"'), 'prices are not sent');
  const back = parseSuggestions('Here are six.\n```json\n[{"house":"Guerlain","name":"Habit Rouge","family":"Amber","notes":{"top":["citrus"],"heart":["rose"],"base":["vanilla","leather"]},"why":"Close to your amber."},{"name":""},{"brand":"Prada","name":"Amber Pour Homme","reason":"x","family":"unknown"}]\n```\nEnjoy.');
  assert.equal(back.length, 2); assert.equal(back[0].family, 'amber'); assert.deepEqual(back[0].notes.base, ['vanilla', 'leather']);
  assert.equal(back[1].house, 'Prada'); assert.equal(back[1].why, 'x'); assert.equal(back[1].family, ''); assert.equal(back[1].notes, null);
  assert.throws(() => parseSuggestions('no list here')); assert.throws(() => parseSuggestions('[not json]'));
  assert.ok(sameScent({ house: 'Dior', name: 'Sauvage' }, { house: 'dior ', name: ' SAUVAGE' })); assert.ok(!sameScent({ house: 'Dior', name: 'Sauvage' }, { house: 'Dior', name: 'Homme' }));
});

test('the drawings are well-formed for every shape and level', () => {
  for (const s of [...SHAPES, 'unknown']) for (const lv of [0, 0.5, 1, 2, -1, undefined]) { const svg = bottle(s, lv, 'amber', 40); assert.ok(svg.startsWith('<svg') && svg.trim().endsWith('</svg>') && !svg.includes('NaN')); }
  assert.ok(!bottle('tall', 0, 'amber').includes('opacity=".92"'), 'an empty bottle shows no juice');
  assert.equal(pyramid([{ label: 'Top', notes: [] }, { label: 'Heart', notes: [] }, { label: 'Base', notes: [] }]), '');
  assert.ok(pyramid([{ label: 'Top', notes: ['a', 'b'] }, { label: 'Heart', notes: [] }, { label: 'Base', notes: ['<c>'] }]).includes('&lt;c&gt;'));
});

test('English and French have the same keys, and every key used on screen exists', () => {
  const k = keys(); assert.deepEqual([...k.en].sort(), [...k.fr].sort());
  const src = ['ui.js', 'main.js'].map(f => fs.readFileSync(new URL('../js/' + f, import.meta.url), 'utf8')).join('\n');
  const used = new Set([...src.matchAll(/\bt\('([a-zA-Z0-9._]+)'[,)]/g)].map(m => m[1]));
  for (const m of src.matchAll(/'((?:today|edit)\.[a-zA-Z]+)'/g)) used.add(m[1]);
  for (const x of ['today', 'wardrobe', 'queue', 'settings']) used.add('tab.' + x);
  for (const x of BANDS) { used.add('band.' + x); used.add('band.' + x + '.day'); }
  for (const x of SEASONS) used.add('season.' + x); for (const x of OCCASIONS) used.add('occ.' + x); for (const x of FAMILIES) used.add('fam.' + x); for (const x of SHAPES) used.add('shape.' + x);
  for (const x of ['top', 'heart', 'base']) used.add('n.' + x);
  for (const x of ['grade', 'weather', 'season', 'occ', 'never', 'rest', 'yesterday', 'empty']) used.add('why.' + x);
  for (const x of ['grade', 'worn', 'cost', 'name']) used.add('sort.' + x);
  for (const x of ['house', 'name', 'size', 'price']) used.add('f.' + x);
  used.add('q.wish'); used.add('q.triedH');
  for (const key of used) assert.ok(k.en.includes(key), 'missing key: ' + key);
  assert.equal(t('today.logged', { n: 1 }), 'First wear logged.'); assert.equal(t('today.logged', { n: 4 }), '4 wears logged.');
  assert.equal(t('ask.added', { n: 1 }), '1 suggestion added'); assert.equal(t('ask.added', { n: 3 }), '3 suggestions added');
  for (const l of ['en', 'fr']) { setLang(l); const p = t('ask.prompt', { fam: FAMILIES.join(', ') }); assert.ok(p.includes('[{"house":"…"') && p.includes('"base":["…"]}') && p.includes('citrus, aromatic') && !p.includes('{fam}'), 'the question to Claude keeps its JSON shape in ' + l); }
  setLang('fr'); assert.equal(t('card.wears', { n: 1 }), '1 port'); assert.equal(t('ward.h1n', { n: 5 }), '5 flacons'); setLang('en');
});
