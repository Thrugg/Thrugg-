/* Passeport — checks on the guide data and the rules that read it. Run: node --test passeport/test/*.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { hav, walkMin, closedOn, eventsOn, eventSpots, suggest, search, fold, parksFor, dow } from '../js/rules.js';
import { sunTimes, isNight, nextSparkle, sparklingNow, paris, parisDay } from '../js/sky.js';
import { stampSVG, points, rank, badges, ICONS, ink, tilt } from '../js/stamp.js';
import { tripDays, parkOnce, dayWarnings, nav, dayRoute, pack, unpack, cleanShare, fromTemplate } from '../js/plan.js';
import { parseExif, exifDate, judge } from '../js/camera.js';
import { DICTS, setLang, t } from '../js/i18n.js';

const root = new URL('../', import.meta.url);
const D = JSON.parse(readFileSync(new URL('data/paris.json', root), 'utf8'));
const byId = new Map(D.spots.map(s => [s.id, s]));
const sp = id => { const s = byId.get(id); assert.ok(s, 'missing spot ' + id); return s; };
const pkIndex = new Map(D.parking.map(p => [p.id, p]));
const at = (iso) => new Date(iso);                  // all times below are written in UTC ("Z")

/* ---------------- the guide ---------------- */
test('every place is complete, on the map and in a known category', () => {
  const cats = new Set(D.cats.map(c => c.c));
  assert.ok(D.spots.length >= 240, 'at least 240 places');
  assert.equal(byId.size, D.spots.length, 'ids are unique');
  for (const s of D.spots) {
    assert.match(s.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, s.id);
    assert.ok(s.n && s.why, s.id + ' has a name and a why');
    assert.ok(cats.has(s.c), s.id + ' category ' + s.c);
    assert.ok(Number.isInteger(s.i) && s.i >= 1 && s.i <= 5, s.id + ' grade');
    assert.ok(['P', 'GP', 'DT', 'LT'].includes(s.z), s.id + ' zone');
    assert.ok(s.lat > 41 && s.lat < 51.5 && s.lon > -5.5 && s.lon < 9.7, s.id + ' in France');
    if (s.z === 'P') assert.ok(s.lat > 48.80 && s.lat < 48.91 && s.lon > 2.22 && s.lon < 2.48, s.id + ' in Paris');
  }
  assert.equal(D.spots.filter(s => s.i === 5).length >= 8, true, 'a handful of world icons');
});

test('every photo is a credited Commons image at a standard width', () => {
  const withPh = D.spots.filter(s => s.ph);
  assert.ok(withPh.length >= 200, 'most places have a photo');
  for (const s of withPh) {
    for (const [k, w] of [['s', 250], ['m', 500], ['l', 960]]) {
      const u = s.ph[k];
      assert.ok(u.startsWith('https://upload.wikimedia.org/wikipedia/commons/'), s.id + ' ' + k);
      assert.ok(!u.includes('?'), s.id + ' no query string');
      const m = u.match(/\/(\d+)px-[^/]+$/);
      if (m) { assert.equal(+m[1], w, s.id + ' ' + k + ' width'); assert.ok(s.ph.w > w, s.id + ' never asks Commons to scale up'); }
      else assert.ok(s.ph.w <= w, s.id + ' ' + k + ' original only when it is narrow');
    }
    assert.ok(s.ph.by && s.ph.lic && s.ph.url.startsWith('https://commons.wikimedia.org/wiki/File:'), s.id + ' credit');
  }
});

test('events, car parks, lists and categories hold together', () => {
  for (const e of D.events) {
    assert.ok(e.id && e.n && e.t, 'event fields');
    if (e.s && e.e) assert.ok(e.s <= e.e, e.id + ' starts before it ends');
    if (e.spot) assert.ok(byId.has(e.spot), e.id + ' links a known place');
    assert.ok(Number.isFinite(e.lat) && Number.isFinite(e.lon), e.id + ' placed');
    if (e.conf) assert.ok(['Confirmed', 'One source', 'Not confirmed'].includes(e.conf), e.id + ' confidence');
  }
  assert.equal(pkIndex.size, D.parking.length, 'car park ids are unique');
  for (const p of D.parking) assert.ok(['surface', 'underground', 'multi-storey', 'rooftop'].includes(p.k), p.id + ' kind');
  for (const s of D.spots) for (const [id, m] of s.pk || []) { assert.ok(pkIndex.has(id), s.id + ' car park ' + id); assert.ok(m <= 1600, s.id + ' car park within walking'); }
  assert.ok(D.spots.filter(s => s.pk && s.pk.length).length >= 230, 'nearly every place has a car park');
  for (const l of D.lists) { assert.ok(l.en && l.fr && l.ids.length, l.id); for (const id of l.ids) assert.ok(byId.has(id), l.id + ' → ' + id); }
  for (const [o, n] of Object.entries(D.aliases)) assert.ok(byId.has(n), 'alias ' + o);
  for (const c of D.cats) { assert.match(c.color, /^#[0-9a-f]{6}$/i, c.c); assert.ok(ICONS[c.c], 'icon for ' + c.c); }
});

/* ---------------- sun and sparkle ---------------- */
test('sun times match the reference table within two minutes', () => {
  const ref = JSON.parse(readFileSync(new URL('tools/sun.json', root), 'utf8'));
  const hm = (d) => { const p = paris(d); return p.h * 60 + p.min; };
  const min = s => +s.slice(0, 2) * 60 + +s.slice(3);
  for (const [day, dawn, rise, set, dusk] of ref) {
    const s = sunTimes(day, 48.8566, 2.3522);
    for (const [got, want, what] of [[s.dawn, dawn, 'dawn'], [s.sunrise, rise, 'sunrise'], [s.sunset, set, 'sunset'], [s.dusk, dusk, 'dusk']])
      assert.ok(Math.abs(hm(got) - min(want)) <= 2, `${day} ${what}: ${hm(got)} vs ${want}`);
  }
  assert.equal(isNight(at('2026-12-20T12:00:00Z'), 48.8566, 2.3522), false);
  assert.equal(isNight(at('2026-12-20T17:30:00Z'), 48.8566, 2.3522), true);
});

test('Paris time is right whatever the phone zone, across the clock change', () => {
  assert.deepEqual(paris(at('2026-12-25T23:30:00Z')), { y: 2026, m: 12, d: 26, h: 0, min: 30, dow: 6 });
  assert.equal(paris(at('2026-03-29T01:30:00Z')).h, 3, 'summer time starts');
  assert.equal(parisDay(at('2026-12-31T23:10:00Z')), '2027-01-01');
  assert.equal(dow('2026-12-25'), 5, '25 Dec 2026 is a Friday');
});

test('the Eiffel Tower sparkles on the hour after dark, last at 23:00', () => {
  const p = d => { const x = paris(d); return `${x.d} ${x.h}:${String(x.min).padStart(2, '0')}`; };
  assert.equal(p(nextSparkle(at('2026-12-20T15:00:00Z'))), '20 18:00', 'afternoon → first one after dusk (17:3x)');
  assert.equal(p(nextSparkle(at('2026-12-20T21:20:00Z'))), '20 23:00');
  assert.equal(p(nextSparkle(at('2026-12-20T22:10:00Z'))), '21 18:00', 'after 23:00 → tomorrow');
  assert.equal(p(nextSparkle(at('2026-06-20T19:00:00Z'))), '20 23:00', 'in June it is dark only for the last one');
  assert.equal(sparklingNow(at('2026-12-20T17:02:00Z')), true);
  assert.equal(sparklingNow(at('2026-12-20T17:06:00Z')), false);
  assert.equal(sparklingNow(at('2026-12-20T15:01:00Z')), false, 'still daylight');
});

/* ---------------- closing days ---------------- */
test('closing days of the guide are read right in December 2026', () => {
  const cases = [
    ['palace-of-versailles', '2026-12-28', 'closed'], ['palace-of-versailles', '2026-12-25', 'closed'], ['palace-of-versailles', '2026-12-26', 'open'],
    ['louvre-museum', '2026-12-29', 'closed'], ['louvre-museum', '2026-12-28', 'open'], ['louvre-museum', '2026-12-25', 'closed'],
    ['musee-d-orsay', '2026-12-28', 'closed'], ['musee-d-orsay', '2026-12-29', 'open'],
    ['eiffel-tower', '2026-12-25', 'open'], ['centre-pompidou', '2026-12-20', 'closed'],
    ['giverny-monet-s-house-gardens', '2026-12-20', 'closed'],
    ['l-as-du-fallafel', '2026-12-25', 'maybe'], ['l-as-du-fallafel', '2026-12-26', 'closed'], ['l-as-du-fallafel', '2026-12-27', 'open'],
    ['du-pain-et-des-idees', '2026-12-26', 'closed'], ['du-pain-et-des-idees', '2026-12-28', 'open'],
    ['berthillon', '2026-12-28', 'closed'], ['berthillon', '2026-12-29', 'closed'], ['berthillon', '2026-12-30', 'open'],
    ['marche-aux-puces-de-saint-ouen', '2026-12-29', 'closed'], ['marche-aux-puces-de-saint-ouen', '2026-12-26', 'open'],
    ['marche-bastille', '2026-12-24', 'open'], ['marche-bastille', '2026-12-26', 'closed'],
    ['ritz-paris-sunday-grand-brunch', '2026-12-27', 'open'], ['ritz-paris-sunday-grand-brunch', '2026-12-26', 'closed'],
    ['galeries-lafayette-haussmann', '2026-12-25', 'closed'], ['galeries-lafayette-haussmann', '2026-12-24', 'open'],
    ['la-vallee-village', '2026-12-25', 'closed'], ['grande-mosquee-de-paris', '2026-12-25', 'closed'], ['grande-mosquee-de-paris', '2026-12-26', 'open'],
    ['auvers-sur-oise', '2026-12-20', 'maybe'], ['catacombs-of-paris', '2026-12-28', 'closed'], ['sainte-chapelle', '2027-01-01', 'closed'],
    ['notre-dame-de-paris', '2026-12-25', 'open']
  ];
  for (const [id, day, want] of cases) assert.equal(closedOn(sp(id), day).s, want, `${id} on ${day}`);
  assert.equal(closedOn({ c: 'MU', closed: '' }, '2026-12-25').s, 'maybe', 'a museum with no closing info may close on Christmas Day');
  assert.equal(closedOn({ c: 'PK', closed: '' }, '2026-12-25').s, 'unknown');
  assert.equal(closedOn(sp('palace-of-versailles'), '2026-12-28').why, 'weekday');
  assert.equal(closedOn(sp('louvre-museum'), '2026-12-25').why, 'holiday');
});

test('every closing text in the guide is understood (no place is closed every day by mistake)', () => {
  const week = ['2026-12-14', '2026-12-15', '2026-12-16', '2026-12-17', '2026-12-18', '2026-12-19', '2026-12-20'];
  for (const s of D.spots) {
    if (/^closed/i.test(s.st || '')) continue;
    const shut = week.filter(d => closedOn(s, d).s === 'closed').length;
    const limit = /only/i.test(s.closed || '') ? 6 : 4;       // a Sunday brunch or a two-morning market is meant to be shut most days
    assert.ok(shut <= limit, `${s.id} closed ${shut} days of a normal week ("${s.closed}")`);
  }
});

test('events run between their dates; closures and practical notes are not lights', () => {
  const xmas = eventsOn(D.events, '2026-12-20');
  assert.ok(xmas.length >= 15, 'plenty on a December Sunday');
  assert.ok(xmas.every(e => (!e.s || e.s <= '2026-12-20') && (!e.e || e.e >= '2026-12-20')));
  const live = eventSpots(D.events, '2026-12-20');
  for (const evs of live.values()) for (const e of evs) assert.ok(!['Closure', 'Practical', 'Exhibition', 'Free day'].includes(e.t));
  assert.ok(eventsOn(D.events, '2026-08-15').length < xmas.length, 'fewer in August');
});

/* ---------------- what now, search, car parks ---------------- */
test('suggestions follow your list, the hour, the rain, closures and distance', () => {
  const pos = { lat: 48.8606, lon: 2.3376 };   // the Louvre
  const base = { day: '2026-12-28', night: false, pos, mine: {}, visits: {}, live: eventSpots(D.events, '2026-12-28'), rain: false };
  const day = suggest(D.spots, base, 12);
  assert.equal(day.length, 12);
  assert.ok(!day.some(x => x.s.id === 'musee-d-orsay'), 'Orsay is closed on Mondays');
  assert.ok(day.every((x, k) => k === 0 || day[k - 1].sc >= x.sc), 'best first');
  const mineId = 'berthillon';
  const withMine = suggest(D.spots, { ...base, day: '2026-12-30', mine: { [mineId]: 'must' } }, 20);
  assert.ok(withMine.some(x => x.s.id === mineId && x.why === 'must'), 'a must comes up');
  const visited = suggest(D.spots, { ...base, visits: { 'louvre-museum': { at: '2026-12-27T10:00:00Z', how: 'geo' } } }, 30);
  assert.ok(!visited.some(x => x.s.id === 'louvre-museum'), 'visited places are not suggested again');
  const night = suggest(D.spots, { ...base, night: true }, 8);
  assert.ok(!night.some(x => ['PK', 'MU', 'CH'].includes(x.s.c)), 'no parks, museums or châteaux after dark');
  const rain = suggest(D.spots, { ...base, rain: true }, 8);
  assert.ok(rain.filter(x => x.s.io === 'Outdoor').length <= day.filter(x => x.s.io === 'Outdoor').length, 'rain pushes outdoor places down');
  const noPos = suggest(D.spots, { ...base, pos: null }, 40);
  assert.ok(!noPos.some(x => ['DT', 'LT'].includes(x.s.z)), 'day trips are not "now" without a position');
});

test('search ignores accents, case and ligatures', () => {
  assert.equal(search(D.spots, 'louvre')[0].id, 'louvre-museum');
  assert.equal(search(D.spots, 'ÉIFFEL')[0].id, 'eiffel-tower');
  assert.equal(search(D.spots, 'tour eiffel')[0].id, 'eiffel-tower', 'the French name is searched too');
  assert.ok(D.spots.filter(s => s.nf).length >= 70, 'French names for the places named in English');
  assert.ok(search(D.spots, 'sacre coeur').some(s => s.id === 'sacre-cur-basilica'), 'œ is searched as oe');
  assert.equal(fold('Œuvre d’Été'), 'oeuvre d ete');
  assert.deepEqual(search(D.spots, ''), []);
  assert.deepEqual(search(D.spots, 'zzzqqq'), []);
});

test('car parks come with walking minutes', () => {
  const ps = parksFor(sp('eiffel-tower'), pkIndex);
  assert.ok(ps.length >= 1 && ps.length <= 3);
  for (const p of ps) { assert.ok(p.n && p.walk >= 1); assert.equal(p.walk, walkMin(p.m)); }
  assert.equal(walkMin(0), 1);
  assert.equal(walkMin(800), 13);
  assert.ok(Math.abs(hav(48.8584, 2.2945, 48.8606, 2.3376) - 3160) < 60, 'Eiffel → Louvre about 3.2 km');
});

/* ---------------- stamps, points, badges ---------------- */
test('a stamp is valid SVG with the escaped name, the date and how it was validated', () => {
  const s = { id: 'x-test', n: 'Tom & Jerry <b> (test)', c: 'RS' };
  const v = { at: '2026-12-20T18:30:00', how: 'geo' };
  const svg = stampSVG(s, v, { color: '#c0392b', lang: 'fr' });
  assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'));
  assert.ok(svg.includes('TOM &amp; JERRY &lt;B&gt;') && !svg.includes('<b>'), 'escaped');
  assert.ok(svg.includes('VISITÉ') && svg.includes('20 DÉC 2026'));
  for (const tag of ['svg', 'g', 'text', 'textPath']) assert.equal((svg.match(new RegExp('<' + tag + '[ >]', 'g')) || []).length, (svg.match(new RegExp('</' + tag + '>', 'g')) || []).length, tag + ' balanced');
  const self = stampSVG(s, { ...v, how: 'self' }, { color: '#c0392b', lang: 'en' });
  assert.ok(self.includes('NOTED') && self.includes('#6f7480'), 'self-declared stamps are grey');
  const empty = stampSVG(s, null, {});
  assert.ok(empty.includes('empty') && empty.includes('stroke-dasharray'));
  assert.ok(stampSVG(s, v, { defs: true }).includes('<filter id="pp-ink"'), 'standalone stamps carry their ink filter');
  for (const c of D.cats) assert.ok(stampSVG({ id: 'a', n: 'A', c: c.c }, v, {}).length > 500, 'stamp for ' + c.c);
  assert.equal(tilt('louvre-museum'), tilt('louvre-museum'));
  assert.ok(Math.abs(tilt('louvre-museum')) <= 12);
  assert.match(ink('#f2c14e'), /^#[0-9a-f]{6}$/);
});

test('points, ranks and badges', () => {
  const s5 = sp('eiffel-tower');
  assert.equal(points(s5, { how: 'geo' }), 50);
  assert.equal(points(s5, { how: 'self' }), 30);
  assert.equal(points(s5, { how: 'exif', duo: true }), 60);
  assert.deepEqual(rank(0), { key: 'tourist', at: 0, next: { key: 'stroller', at: 60 } });
  assert.equal(rank(700).key, 'adopted');
  assert.equal(rank(5000).next, null);
  const visits = {};
  const icons = D.spots.filter(s => s.i === 5);
  for (const s of icons) visits[s.id] = { at: '2026-12-20T10:00:00', how: 'geo' };
  for (const id of ['pont-alexandre-iii', 'pont-neuf-square-du-vert-galant', 'pont-des-arts', 'pont-de-bir-hakeim']) visits[id] = { at: '2026-12-21T22:00:00', how: 'self', duo: true };
  const b = Object.fromEntries(badges(D.spots, visits, { christmas: new Set(), chic: new Set() }).map(x => [x.id, x]));
  assert.equal(b.icons.n, b.icons.of, 'all icons');
  assert.equal(b.bridges.n, 4);
  assert.equal(b.night.n, 3, 'capped at its goal');
  assert.equal(b.duo.n, 4);
  assert.ok(b.arrondissements.n >= 3 && b.arrondissements.of === 10);
  const reachable = new Set(D.spots.filter(s => s.z === 'P').map(s => (String(s.a).match(/(\d{1,2})(?:er|e)\b/) || [])[1]).filter(Boolean));
  assert.ok(reachable.size >= 10, 'the arrondissements badge can be earned');
  assert.ok(D.spots.filter(s => s.z === 'P' && /\b(5|6|7|13|14|15)e\b/.test(s.a)).length >= 8, 'the Left Bank badge can be earned');
});

/* ---------------- trips and shared links ---------------- */
test('trip days, park once, warnings and routes', () => {
  assert.deepEqual(tripDays('2026-12-30', '2027-01-02'), ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  assert.deepEqual(tripDays('2026-12-30', '2026-12-29'), []);
  const stops = ['louvre-museum', 'palais-royal', 'sainte-chapelle', 'eiffel-tower'].filter(id => byId.has(id)).map(sp);
  const g = parkOnce(stops, D.parking);
  assert.ok(g.length >= 2 && g.length < stops.length, 'nearby places share one car park');
  assert.equal(g.flatMap(x => x.stops).map(s => s.id).join(), stops.map(s => s.id).join(), 'the order is kept');
  for (const x of g) if (x.park) { assert.equal(x.park.a, 'paris'); assert.equal(x.walk.length, x.stops.length); }
  const w = dayWarnings('2026-12-29', [sp('louvre-museum'), sp('eiffel-tower')]);
  assert.deepEqual(w.map(x => x.s.id), ['louvre-museum']);
  const n = nav(48.85, 2.35);
  assert.ok(n.waze.includes('48.85,2.35') && n.google.includes('travelmode=driving') && n.apple.includes('dirflg=d'));
  const many = Array.from({ length: 14 }, (_, k) => ({ lat: 48.8 + k / 100, lon: 2.3 }));
  const url = new URL(dayRoute(many, { lat: 49.0, lon: 2.2 }));
  assert.equal(url.searchParams.get('waypoints').split('|').length, 9, 'Google takes up to 9 waypoints and a destination');
  assert.equal(url.searchParams.get('origin'), '49,2.2');
  assert.equal(dayRoute([], null), null);
});

test('a shared link carries a list and a trip, and nothing else', async () => {
  const known = new Set(D.spots.map(s => s.id));
  const payload = { mine: { 'eiffel-tower': 'must', 'louvre-museum': 'want', 'not-a-place': 'must', 'musee-d-orsay': 'hack' },
    trip: { start: '2026-12-16', end: '2026-12-30', base: { n: 'Home', lat: 48.9, lon: 2.2 }, days: { '2026-12-17': { t: 'Day 1', note: 'x'.repeat(900), stops: ['eiffel-tower', 'nope'] }, 'bad': { stops: [] } } },
    from: 'A'.repeat(80), evil: '<script>' };
  const code = await pack(payload);
  assert.equal(code[0], 'z', 'compressed');
  assert.ok(code.length < JSON.stringify(payload).length, 'shorter than the JSON');
  assert.match(code, /^[A-Za-z0-9_-]+$/, 'safe in a URL');
  const back = await unpack(code);
  assert.deepEqual(back, payload);
  const c = cleanShare(back, known);
  assert.deepEqual(c.mine, { 'eiffel-tower': 'must', 'louvre-museum': 'want' });
  assert.deepEqual(Object.keys(c.trip.days), ['2026-12-17']);
  assert.deepEqual(c.trip.days['2026-12-17'].stops, ['eiffel-tower']);
  assert.equal(c.trip.days['2026-12-17'].note.length, 600);
  assert.equal(c.from.length, 40);
  assert.equal(c.evil, undefined);
  assert.throws(() => cleanShare(null, known));
  assert.equal(cleanShare({ trip: { start: '2026-12-30', end: '2026-12-01' } }, known).trip, undefined, 'dates the wrong way round are dropped');
  const j = 'j' + Buffer.from(JSON.stringify({ mine: { 'eiffel-tower': 'want' } })).toString('base64url');
  assert.deepEqual(await unpack(j), { mine: { 'eiffel-tower': 'want' } }, 'uncompressed links still open');
  await assert.rejects(unpack('x123'));
});

/* ---------------- photo validation ---------------- */
function jpegWithGps(lat, lon, date, le) {
  const v = new DataView(new ArrayBuffer(200));
  const w16 = (o, x) => v.setUint16(o, x, le), w32 = (o, x) => v.setUint32(o, x, le);
  const entry = (o, tag, type, count, value) => { w16(o, tag); w16(o + 2, type); w32(o + 4, count); w32(o + 8, value); };
  const ref = (o, tag, ch) => { w16(o, tag); w16(o + 2, 2); w32(o + 4, 2); v.setUint8(o + 8, ch.charCodeAt(0)); v.setUint8(o + 9, 0); };
  v.setUint16(0, le ? 0x4949 : 0x4D4D); w16(2, 42); w32(4, 8);
  const EX = 38, GPS = 56, DT = 110, LAT = 130, LON = 154;
  w16(8, 2); entry(10, 0x8769, 4, 1, EX); entry(22, 0x8825, 4, 1, GPS); w32(34, 0);
  w16(EX, 1); entry(EX + 2, 0x9003, 2, 20, DT); w32(EX + 14, 0);
  w16(GPS, 4); ref(GPS + 2, 1, lat >= 0 ? 'N' : 'S'); entry(GPS + 14, 2, 5, 3, LAT); ref(GPS + 26, 3, lon >= 0 ? 'E' : 'W'); entry(GPS + 38, 4, 5, 3, LON); w32(GPS + 50, 0);
  for (let i = 0; i < 19; i++) v.setUint8(DT + i, date.charCodeAt(i));
  const dms = (x, o) => { x = Math.abs(x); const d = Math.floor(x), mf = (x - d) * 60, m = Math.floor(mf); w32(o, d); w32(o + 4, 1); w32(o + 8, m); w32(o + 12, 1); w32(o + 16, Math.round((mf - m) * 60000)); w32(o + 20, 1000); };
  dms(lat, LAT); dms(lon, LON);
  const tiffBytes = new Uint8Array(v.buffer, 0, LON + 24);
  const head = [0xFF, 0xD8, 0xFF, 0xE1, 0, 0, 0x45, 0x78, 0x69, 0x66, 0, 0];
  const len = 2 + 6 + tiffBytes.length; head[4] = len >> 8; head[5] = len & 255;
  return new Uint8Array([...head, ...tiffBytes, 0xFF, 0xD9]).buffer;
}

test('EXIF GPS and date are read from both byte orders', () => {
  for (const le of [false, true]) {
    const x = parseExif(jpegWithGps(48.85837, 2.294481, '2026:12:18 17:42:05', le));
    assert.ok(Math.abs(x.lat - 48.85837) < 1e-5 && Math.abs(x.lon - 2.294481) < 1e-5, 'position, ' + (le ? 'Intel' : 'Motorola'));
    assert.equal(x.date, '2026:12:18 17:42:05');
  }
  const sw = parseExif(jpegWithGps(-33.8568, -151.2153, '2026:01:02 03:04:05', true));
  assert.ok(sw.lat < 0 && sw.lon < 0, 'south and west are negative');
  assert.equal(parseExif(new Uint8Array([0x89, 0x50, 0x4E, 0x47]).buffer), null, 'not a JPEG');
  assert.equal(exifDate('2026:12:18 17:42:05').getHours(), 17);
  assert.equal(exifDate('rubbish'), null);
});

test('a visit is validated on site, by the photo GPS, or self-declared', () => {
  const s = sp('eiffel-tower'), now = new Date('2026-12-20T17:10:00Z');
  const near = judge(s, { lat: s.lat + 0.0005, lon: s.lon, acc: 20 }, null, now);
  assert.equal(near.how, 'geo'); assert.ok(near.d < 80);
  const fuzzy = judge(s, { lat: s.lat + 0.0025, lon: s.lon, acc: 140 }, null, now);
  assert.equal(fuzzy.how, 'geo', 'a weak GPS fix near the place still counts');
  const far = judge(s, { lat: 48.8606, lon: 2.3376, acc: 10 }, null, now);
  assert.deepEqual([far.how, far.why], ['self', 'far']);
  const exif = judge(s, { lat: 48.8606, lon: 2.3376, acc: 10 }, { lat: s.lat, lon: s.lon, date: '2026:12:19 18:00:00' }, now);
  assert.equal(exif.how, 'exif'); assert.equal(new Date(exif.at).getDate(), 19, 'the photo date is kept');
  const future = judge(s, null, { lat: s.lat, lon: s.lon, date: '2030:01:01 00:00:00' }, now);
  assert.equal(future.at, now.toISOString(), 'a date in the future is not believed');
  assert.equal(judge(s, { err: 'denied' }, null, now).why, 'denied');
  assert.equal(judge(s, null, null, now).why, 'nogps');
  const park = sp('jardin-du-luxembourg');
  assert.equal(judge(park, { lat: park.lat + 0.003, lon: park.lon, acc: 15 }, null, now).how, park.r >= 300 ? 'geo' : 'self', 'big places have a bigger radius');
});

/* ---------------- words ---------------- */
test('French and English have the same words, and every word the code asks for exists', () => {
  const en = Object.keys(DICTS.en), fr = Object.keys(DICTS.fr);
  assert.deepEqual(en.slice().sort(), fr.slice().sort());
  const dir = new URL('js/', root);
  const used = new Set();
  for (const f of readdirSync(dir)) for (const m of readFileSync(new URL(f, dir), 'utf8').matchAll(/\bt\('([a-zA-Z0-9.\-]+)'(?!\s*\+)/g)) used.add(m[1]);
  for (const k of used) assert.ok(k in DICTS.en, 'missing word ' + k);
  const need = [...D.cats.map(c => 'cat.' + c.c), ...[1, 2, 3, 4, 5].map(i => 'imp.' + i), ...['icon', 'major', 'good', 'must', 'want', 'live', 'near'].map(w => 'why.' + w),
    ...['weekday', 'holiday', 'season', 'works', 'morning', 'evening'].map(w => 'st.why.' + w), ...['holiday', 'winter', 'evening', 'morning', 'x'].map(w => 'st.maybe.' + w),
    ...['tourist', 'stroller', 'walker', 'connoisseur', 'adopted', 'ambassador'].map(r => 'rank.' + r), ...['far', 'nogps', 'denied'].map(w => 'v.self.' + w),
    ...['map', 'lists', 'passport', 'plan', 'settings'].map(k => 'tab.' + k), 'pk.underground', 'pk.multi-storey', 'pk.surface', 'conf.one', 'conf.no',
    ...new Set(D.spots.filter(s => s.io).map(s => 'io.' + s.io.split(' ')[0].toLowerCase())),
    ...badges(D.spots, {}, {}).flatMap(b => ['b.' + b.id, 'b.' + b.id + '.i', 'b.' + b.id + '.d'])];
  for (const k of need) assert.ok(k in DICTS.en, 'missing word ' + k);
  setLang('en');
  assert.equal(t('share.mine', { n: 1 }), '1 place for your list');
  assert.equal(t('share.mine', { n: 3 }), '3 places for your list');
  setLang('fr');
  assert.equal(t('share.mine', { n: 2 }), '2 lieux pour votre liste');
  assert.equal(t('no.such.key'), 'no.such.key');
});

test('the page has every element the code looks for', () => {
  const html = readFileSync(new URL('index.html', root), 'utf8');
  const ids = new Set();
  const dir = new URL('js/', root);
  for (const f of readdirSync(dir)) for (const m of readFileSync(new URL(f, dir), 'utf8').matchAll(/\$\('#([a-zA-Z]+)'\)/g)) ids.add(m[1]);
  const dynamic = new Set(['q', 'qres', 'tStart', 'tEnd', 'tBase', 'baseMsg', 'retry']);   // made inside dialogs and panels
  for (const id of ids) if (!dynamic.has(id)) assert.ok(html.includes(`id="${id}"`), 'index.html lacks #' + id);
  const sw = readFileSync(new URL('sw.js', root), 'utf8');
  for (const f of readdirSync(dir)) assert.ok(sw.includes(`'js/${f}'`), 'the offline copy includes js/' + f);
});

test('the suggested trip uses real places, respects closing days, and loads as an editable copy', async () => {
  assert.ok(D.trips && D.trips.length >= 1);
  const x = D.trips.find(z => z.id === 'xmas-car');
  const days = tripDays(x.start, x.end);
  assert.deepEqual(Object.keys(x.days).sort(), days, 'one entry per day');
  for (const [d, v] of Object.entries(x.days)) {
    assert.ok(v.t && v.note.length <= 600, d);
    for (const id of v.stops) assert.ok(byId.has(id), d + ' ' + id);
    for (const w of dayWarnings(d, v.stops.map(sp))) assert.notEqual(w.c.s, 'closed', `${w.s.id} is closed on ${d}`);
  }
  assert.deepEqual(x.days['2026-12-25'].stops, ['etretat-cliffs', 'honfleur', 'deauville']);
  const tr = fromTemplate(x, { n: 'Home', lat: 48.9, lon: 2.3 });
  tr.days['2026-12-16'].stops.push('louvre-museum');
  assert.ok(!x.days['2026-12-16'].stops.includes('louvre-museum'), 'editing the loaded trip leaves the guide alone');
  assert.equal(tr.base.n, 'Home');
  const c = cleanShare(await unpack(await pack({ tpl: 'xmas-car', base: { n: 'Home', lat: 48.9, lon: 2.3 }, mine: { honfleur: 'want' } })), new Set(D.spots.map(s => s.id)));
  assert.deepEqual([c.tpl, c.base.n, c.mine.honfleur], ['xmas-car', 'Home', 'want']);
  assert.equal(cleanShare({ tpl: '<script>' }, new Set()).tpl, undefined);
});
