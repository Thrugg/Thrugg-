/* Écurie — checks on the analysis, with invented finances. Run: node --test ecurie/test/*.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../js/engine.js';

const cars = JSON.parse(fs.readFileSync(new URL('../data/cars.json', import.meta.url), 'utf8'));
const meta = JSON.parse(fs.readFileSync(new URL('../data/market.json', import.meta.url), 'utf8'));
const car = id => cars.find(c => c.id === id);
const now = E.nowYear(new Date('2026-11-17'));
const prof = { km: 15000, hold: 4, sf: 'sf10', mode: 'loan', downPct: 20, term: 48, usage: { autobahn: 40, mountain: 20, city: 35, track: 5 } };
const fin = { net: 5200, other: 0, essential: 2400, savings: 30000, plan: 800, levels: [7200, 14400, 21600, 28800] };

test('catalogue: every car carried over from Prüfstand is usable', () => {
  assert.ok(cars.length >= 130);
  for (const c of cars) { assert.ok(E.validCar(c), c.id); assert.ok(E.CLASSES.includes(c.cls), c.id); }
  assert.equal(new Set(cars.map(c => c.id)).size, cars.length);
  assert.ok(meta.fuel.e10 > 1 && meta.fuel.e10 < 4);
});

test('value: more kilometres, less money; the 100,000 km step; options and condition move the price', () => {
  const c = car('vw-golf-gti-mk8'), q = { year: 2021, km: 60000, options: [] };
  const v60 = E.valueAt(c, q, now), v140 = E.valueAt(c, { ...q, km: 140000 }, now), v20 = E.valueAt(c, { ...q, km: 20000 }, now);
  assert.ok(v20 > v60 && v60 > v140);
  assert.ok(v140 / v60 > 0.6 && v140 / v60 < 0.85, 'a high-mileage car loses a plausible share');
  const just = E.valueAt(c, { ...q, km: 99000 }, now), past = E.valueAt(c, { ...q, km: 101000 }, now);
  assert.ok(past < just * 0.97, 'crossing 100,000 km costs a few per cent');
  assert.ok(E.valueAt(c, { ...q, options: ['accident'] }, now) < v60 * 0.9);
  assert.ok(E.valueAt(c, { ...q, options: ['history', 'warranty'] }, now) > v60);
});

test('price check: verdicts and an offer ladder that makes sense', () => {
  const c = car('bmw-m550i-g30-lci'), base = { year: 2021, km: 60000, options: [] };
  const fair = E.priceCheck(c, base, now).fair;
  assert.equal(E.priceCheck(c, { ...base, price: fair }, now).verdict, 'fair');
  assert.equal(E.priceCheck(c, { ...base, price: Math.round(fair * 1.3) }, now).verdict, 'over');
  assert.equal(E.priceCheck(c, { ...base, price: Math.round(fair * 0.7) }, now).verdict, 'low');
  const p = E.priceCheck(c, { ...base, price: Math.round(fair * 1.05) }, now);
  assert.ok(p.open < p.aim && p.aim <= p.walk && p.walk <= p.hi);
  /* live ads pull the fair price towards them */
  const live = E.priceCheck(c, base, now, { median: fair * 1.2, n: 20, km_from: 50000, km_to: 70000 });
  assert.ok(live.fair > fair * 1.08 && live.source === 'live');
});

test('your mileage: driving more costs more and is worth less at the end', () => {
  const c = car('skoda-octavia-rs-mk4'), q = { year: 2022, km: 50000, options: [] };
  const a = E.monthly(c, q, prof, meta, now), b = E.monthly(c, q, { ...prof, km: 35000 }, meta, now);
  assert.ok(b.run.energyYear > 2 * a.run.energyYear);
  assert.ok(b.curve.vEnd < a.curve.vEnd);
  assert.ok(b.econM > a.econM);
  assert.ok(Math.abs(a.cashM - (a.instalment + a.runM + a.extraM)) < 0.01);
});

test('what falls due: within the ownership, no doubles, options add their own items', () => {
  const c = car('bmw-m550i-g30-lci'), q = { year: 2021, km: 60000, options: ['air'] };
  const d = E.dueList(c, q, prof, now);
  for (const i of d.items) { assert.ok(i.in >= 0 && i.in <= 4.01, i.item); assert.ok(i.km >= 60000 && i.km <= 120000 + 1, i.item); }
  const plugs = d.items.filter(i => i.item === 'Spark plugs');
  assert.ok(plugs.length <= 2);
  for (let k = 1; k < plugs.length; k++) assert.ok(plugs[k].in - plugs[k - 1].in >= 3.9, 'spark plugs at most once per interval');
  assert.ok(d.items.some(i => /Air springs/.test(i.item) && i.extra));
  assert.ok(!E.dueList(c, { ...q, options: [] }, prof, now).items.some(i => /Air springs/.test(i.item)));
});

test('scores: in range, and they order cars the way an enthusiast would', () => {
  const s = (id, extra = {}) => E.scores(car(id), { year: 2022, km: 40000, options: [], ...extra }, prof, meta, fin, now);
  for (const id of ['mazda-mx5-nd', 'porsche-911-gt3-9922', 'bmw-320d-touring-g21', 'tesla-model3-lr-highland']) {
    const r = s(id); for (const k of ['burden', 'awe', 'fun', 'rel', 'overall']) assert.ok(r[k] >= 0 && r[k] <= 100, `${id} ${k}`);
  }
  assert.ok(s('porsche-911-gt3-9922').fun > s('vw-golf-gti-mk8').fun);
  assert.ok(s('mazda-mx5-nd').fun > s('bmw-320d-touring-g21').fun, 'pleasure is not raw power');
  assert.ok(s('ferrari-296-gtb').awe > s('bmw-320d-touring-g21').awe);
  assert.ok(s('porsche-911-gt3-9922').burden < s('vw-golf-gti-mk8').burden, 'a €200k car weighs more on the same income');
  assert.ok(s('vw-golf-gti-mk8', { km: 180000 }).rel < s('vw-golf-gti-mk8').rel);
  assert.ok(s('vw-golf-gti-mk8', { options: ['exhaust', 'colour'] }).awe > s('vw-golf-gti-mk8').awe);
});

test('covered or not: the savings plan, the safety net and cash you do not have', () => {
  const c = car('vw-golf-gti-mk8'), q = { year: 2021, km: 45000, options: [] };
  const m = E.monthly(c, q, prof, meta, now);
  const rich = E.burden(m, { net: 9000, essential: 2500, savings: 80000, plan: 1000, levels: [7500, 15000, 22500, 30000] });
  assert.equal(rich.verdict, 'covered');
  const tight = E.burden(m, { net: 2600, essential: 2000, savings: 6000, plan: 300, levels: [6000, 12000, 18000, 24000] });
  assert.equal(tight.verdict, 'not');
  assert.ok(tight.cut > 0 || tight.after < 0);
  const cash = E.monthly(c, q, { ...prof, mode: 'cash' }, meta, now);
  assert.equal(E.burden(cash, { net: 6000, essential: 2500, savings: 5000, plan: 500 }).verdict, 'not', 'cannot pay cash from €5,000');
  assert.equal(E.burden(m, null), null);
  assert.equal(E.scores(c, q, prof, meta, null, now).burden, null);
});

test('matching: names, years and power find the right generation', () => {
  const top = (name, year, ps) => E.match(cars, { name, year, ps })[0];
  assert.equal(top('BMW M550i', 2021, 530).car.id, 'bmw-m550i-g30-lci');
  assert.equal(top('BMW M550i', 2018).car.id, 'bmw-m550i-g30');
  assert.ok(E.sure(top('Golf GTI', 2021, 245)));
  assert.equal(top('Mercedes C63', 2019, 510).car.id, 'amg-c63s-w205');
  assert.ok(!E.sure(top('Golf GTI', 2021, 320)), 'another power is not the same car');
  assert.equal(E.match(cars, { name: '' }).length, 0);
});

test('a researched record becomes a full car the engine can analyse', () => {
  const j = { found: true, make: 'Mazda', model: '3', variant: 'e-Skyactiv X 186', gen: 'BP', years: [2019, 2025], onSale: false, cls: 'ref', body: 'hatch', art: 'hatch', color: '#8a1c1c', fuel: 'petrol', energy: 'e10', drive: 'FWD', gearbox: '6-speed manual', engine: '2.0 Skyactiv-X four-cylinder', cc: 1998, ps: 186, nm: 240, kg: 1430, seats: 5, trunk: 358, acc: 8.2, a200: null, vmax: 216, vmaxLimited: false, wltp: 5.9, normal: 6.6, dynamic: 9.5, fast: 10.5, batt: null, eRange: null, evKwh: null, co2: 134, rel: 4, relNote: 'Solid.', issues: ['Infotainment freezes'], checks: ['Check the mild-hybrid battery'], upkeep: 700, ins: 900, tyres: 450, bigTicket: 'Nothing unusual.', milestones: [{ km: 120000, years: null, item: 'Clutch and flywheel', cost: 1300 }], parts: 4, partsNote: 'Easy.', wow: 3, wowNote: 'Handsome, rarely noticed.', polar: false, priceNew: 33000, priceNewYear: 2024, opt: 1.12, gamma: 0.95, used: { v: 19500, km: 60000, n: 40 }, pos: [{ tag: 'daily', text: 'Smooth and frugal' }], neg: [{ tag: 'practical', text: 'Small boot' }], fit: { autobahn: 6, mountain: 6, city: 8, track: 3, family: 6, winter: 6, long: 7 }, conf: 'M', note: null, sources: [{ title: 'Test', url: 'https://example.org/t' }, { title: 'bad', url: 'javascript:alert(1)' }] };
  const q = { year: 2021, km: 60000, ps: 186, options: [] };
  const c = E.fromLookup(j, q, '2026-11-17');
  assert.ok(E.validCar(c)); assert.equal(c.status, 'researched'); assert.equal(c.src.length, 1, 'only http(s) links survive');
  assert.ok(Math.abs(E.priceCheck(c, q, now).fair - 19500) / 19500 < 0.12, 'the researched price anchors the fair price');
  const d = E.dueList(c, q, { ...prof, km: 20000 }, now);
  assert.ok(d.items.some(i => i.item === 'Clutch and flywheel' && i.specific));
  assert.ok(E.checklist(c, q).some(i => /mild-hybrid/.test(i.text)));
  const s = E.scores(c, q, prof, meta, fin, now); assert.ok(s.overall > 0);
});

test('links: road trips to wish-list hotels, the Funds Ladder target, and the home deposit delay', () => {
  const c = car('porsche-taycan-4s-j1'), home = { name: 'Munich', lat: 48.1372, lon: 11.5755 };
  const trips = E.roadTrips(c, prof, meta, home, [{ name: 'Far', lat: 46.31, lon: 7.47, status: 'wish' }, { name: 'Stayed', lat: 47, lon: 11, status: 'stayed' }, { name: 'Example', lat: 47, lon: 11, status: 'wish', ex: 1 }]);
  assert.equal(trips.length, 1); assert.ok(trips[0].km > 350 && trips[0].km < 600); assert.ok(trips[0].stops >= 1, 'an EV needs a stop on a long leg');
  const m = E.monthly(car('vw-golf-gti-mk8'), { year: 2021, km: 45000, price: 27000, options: [] }, prof, meta, now);
  assert.equal(E.ladderTarget(m), Math.round(27000 * 0.2));
  assert.equal(E.ladderTarget({ ...m, mode: 'cash' }), 27000);
  const hd = E.homeDelay(m, fin, 120000);
  assert.ok(hd.months > 0 && hd.after > hd.before);
  assert.equal(E.homeDelay(m, { ...fin, plan: 0 }, 120000), null);
});

test('catalogue file: one car per line, sorted, so a refresh shows as a readable diff', () => {
  const raw = fs.readFileSync(new URL('../data/cars.json', import.meta.url), 'utf8'), lines = raw.trim().split('\n');
  assert.equal(lines[0], '['); assert.equal(lines[lines.length - 1], ']'); assert.equal(lines.length, cars.length + 2);
  const keys = cars.map(c => `${c.make} ${c.model} ${c.years[0]}`);
  assert.deepEqual(keys, [...keys].sort((a, b) => a.localeCompare(b)));
});

test('any car: an estimate from make, power, year, fuel and body lands near real German prices', () => {
  const est = (name, year, ps, extra = {}) => E.estimateCar({ name, year, ps, ...extra }, '2026-11-18');
  const f20 = est('BMW 118i', 2019, 136);
  assert.ok(E.validCar(f20)); assert.equal(f20.status, 'estimated'); assert.equal(f20.make, 'BMW'); assert.equal(f20.fuel, 'petrol'); assert.equal(f20.drive, 'RWD');
  const fair = E.priceCheck(f20, { year: 2019, km: 68400, options: [] }, now).fair;
  assert.ok(fair > 14000 && fair < 21000, `F20 118i 2019 at 68,400 km: ${fair}`);
  /* fuel and body come from the name when not given */
  assert.equal(est('BMW 320d Touring', 2020, 190).fuel, 'diesel'); assert.equal(est('BMW 320d Touring', 2020, 190).body, 'wagon');
  assert.equal(est('VW ID.3 Pro', 2022, 204).fuel, 'ev'); assert.equal(est('Volvo XC60 T8', 2021, 390).fuel, 'phev'); assert.equal(est('Volvo XC60 T8', 2021, 390).art, 'suv');
  assert.equal(est('Toyota Yaris Hybrid', 2021, 116).fuel, 'petrol', 'a full hybrid runs on petrol'); assert.equal(est('VW Golf 1.5 TSI', 2021, 150, { body: 'wagon' }).body, 'wagon');
  assert.equal(est('Mercedes C 220 d T-Modell', 2019, 194).make, 'Mercedes-Benz');
  /* sensible ordering */
  const s = c => E.scores(c, { year: c.years[0], km: 50000, options: [] }, prof, meta, fin, now);
  assert.ok(s(est('Dacia Sandero', 2022, 90)).fun < s(f20).fun);
  assert.ok(s(f20).fun < s(car('vw-golf-gti-mk8')).fun);
  assert.ok(s(est('Toyota Yaris Hybrid', 2021, 116)).rel > s(est('Fiat 500', 2021, 70)).rel);
  for (const k of ['burden', 'awe', 'fun', 'rel', 'overall']) assert.ok(s(f20)[k] >= 0 && s(f20)[k] <= 100);
});

test('costs: what leaves the account adds up, and the loss in value is not part of it', () => {
  const m = E.monthly(car('vw-golf-gti-mk8'), { year: 2021, km: 45000, options: [] }, prof, meta, now);
  const sum = m.cashParts.reduce((a, p) => a + p[1], 0);
  assert.ok(Math.abs(sum - m.cashM) < 0.01);
  assert.ok(!m.cashParts.some(p => /value/i.test(p[0])));
  const cash = E.monthly(car('vw-golf-gti-mk8'), { year: 2021, km: 45000, options: [] }, { ...prof, mode: 'cash' }, meta, now);
  assert.ok(!cash.cashParts.some(p => /instalment/i.test(p[0])));
});

test('ad screenshots: facts from mobile.de and AutoScout24 text, monthly rates and consumption ignored', async () => {
  const { parseAd } = await import('../js/adread.js');
  const de = parseAd(`BMW 118i Advantage\n5-Türer, Navi, Sitzheizung\n17.490 €\nFinanzierung ab 219 € mtl.\nKilometerstand Erstzulassung\n68.400 km 03/2019\nLeistung Kraftstoffart\n100 kW (136 PS) Benzin\nGetriebe\nSchaltgetriebe\nVerbrauch: 5,6 1/100 km (kombiniert) - CO2: 128 g/km\nHead-Up Display\nAnhängerkupplung\nScheckheftgepflegt\nUnfallfrei`);
  assert.deepEqual([de.name, de.year, de.ps, de.km, de.price, de.fuel, de.gearbox], ['BMW 118i Advantage', 2019, 136, 68400, 17490, 'petrol', 'manual']);
  for (const o of ['hud', 'towbar', 'history', 'manual']) assert.ok(de.options.includes(o), o);
  assert.ok(!de.options.includes('accident'), '“Unfallfrei” means accident-free');
  const en = parseAd(`Mercedes-Benz C 220 d T-Modell AMG Line\n€ 24,990.-\nfrom € 299 per month\nMileage 112,000 km\nFirst registration 06/2019\nPower 143 kW (194 hp)\nFuel type Diesel\nTransmission Automatic\nAir suspension, Burmester sound, Panorama roof\nRepaired accident damage`);
  assert.equal(en.name.startsWith('Mercedes-Benz C 220 d'), true); assert.equal(en.km, 112000); assert.equal(en.year, 2019); assert.equal(en.ps, 194); assert.equal(en.price, 24990); assert.equal(en.fuel, 'diesel');
  for (const o of ['air', 'sound', 'pano', 'accident']) assert.ok(en.options.includes(o), o);
  const ev = parseAd(`Tesla Model 3 Long Range\n31.900 €\n45.000 km · 04/2022 · 366 kW (498 PS) · Elektro\nReichweite 560 km`);
  assert.equal(ev.km, 45000, 'the range in km is not the mileage'); assert.equal(ev.fuel, 'ev'); assert.equal(ev.ps, 498);
  assert.deepEqual(parseAd('a photo of a cat').found, []);
});
