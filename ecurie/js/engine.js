/* Écurie — the analysis. Pure functions, no DOM, so the checks in test/ run them directly.
   One car is a catalogue record (data/cars.json, or one Claude researched) plus what you typed: year, power, mileage,
   asking price, options. From that: what it is worth at its mileage, what it costs a month at your mileage, what falls
   due while you own it, whether the asking price is fair, four scores out of 100 and whether your finances carry it.
   Germany only: euros with VAT, Kfz-Steuer, TÜV, no-claims classes. */

/* ---------- depreciation curves: share of the as-sold price left after n years, typical mileage ---------- */
export const CURVES = {
  hot: [[0, 1], [1, .84], [2, .76], [3, .69], [4, .62], [5, .56], [6, .51], [7, .47], [8, .43], [10, .36], [12, .31], [15, .25], [20, .2]],
  sport4: [[0, 1], [1, .80], [2, .71], [3, .63], [4, .56], [5, .50], [6, .45], [7, .41], [8, .37], [10, .31], [12, .27], [15, .22], [20, .18]],
  super: [[0, 1], [1, .77], [2, .66], [3, .58], [4, .51], [5, .45], [6, .40], [7, .36], [8, .32], [10, .26], [12, .22], [15, .18], [20, .15]],
  sports: [[0, 1], [1, .85], [2, .77], [3, .71], [4, .65], [5, .60], [6, .56], [7, .52], [8, .49], [10, .44], [12, .40], [15, .36], [20, .33]],
  gt: [[0, 1], [1, .86], [2, .79], [3, .73], [4, .68], [5, .64], [6, .60], [7, .57], [8, .54], [10, .50], [12, .47], [15, .45], [20, .43]],
  exotic: [[0, 1], [1, .84], [2, .75], [3, .68], [4, .62], [5, .57], [6, .53], [7, .50], [8, .47], [10, .43], [12, .41], [15, .40], [20, .39]],
  suv: [[0, 1], [1, .78], [2, .68], [3, .59], [4, .52], [5, .46], [6, .41], [7, .37], [8, .33], [10, .27], [12, .23], [15, .19], [20, .16]],
  ref: [[0, 1], [1, .80], [2, .70], [3, .62], [4, .55], [5, .49], [6, .44], [7, .40], [8, .36], [10, .29], [12, .24], [15, .19], [20, .15]]
};
export const CLASSES = Object.keys(CURVES);
export const CLASS_LABEL = { hot: 'Compact performance', sport4: 'Performance saloon or coupé', super: 'Large performance car', sports: 'Sports car', gt: 'High-end GT', exotic: 'Supercar', suv: 'Performance SUV', ref: 'Everyday car' };
export const FIT_KEYS = ['autobahn', 'mountain', 'city', 'track', 'family', 'winter', 'long'];
export const FIT_LABEL = { autobahn: 'Autobahn', mountain: 'Mountain roads', city: 'City & daily', track: 'Track days', family: 'Family', winter: 'Winter', long: 'Road trips' };
export const USAGE_KEYS = ['autobahn', 'mountain', 'city', 'track'];
/* no-claims class (Schadenfreiheitsklasse): factor on the reference insurance (SF 15, Vollkasko) */
export const SF = { sf20: { f: 0.85, label: 'SF 20 or more' }, sf10: { f: 1.0, label: 'SF 10 to 19' }, sf4: { f: 1.5, label: 'SF 4 to 9' }, sf0: { f: 2.4, label: 'SF 0 to 3, or new driver' } };
export const DEFAULT_META = { fuel: { e10: 2.11, sp98: 2.24, diesel: 2.255 }, elec: { home: 0.37, ac: 0.52, dc: 0.62 }, loan: { good: 5.9, avg: 8.5 } };
/* price level of parts and labour by class, for the generic items that fall due */
const TIER = { ref: 1, hot: 1.25, sport4: 1.5, super: 1.8, suv: 1.7, sports: 1.8, gt: 2.6, exotic: 4 };
/* how strongly the price reacts to mileage (per 10,000 km away from the typical mileage for the age) */
const KM_K = { ref: 0.034, hot: 0.038, sport4: 0.036, super: 0.036, suv: 0.036, sports: 0.042, gt: 0.05, exotic: 0.055 };
export const KM_PER_YEAR_TYPICAL = 14000;
/* the price steps buyers make at round mileages */
const KM_STEPS = [[100000, 0.04], [150000, 0.03], [200000, 0.03]];

/* ---------- options and condition: what they do to the price, the costs and the scores ----------
   value: share of the fair price (+0.03 = 3 % more); fixed: euros; awe/fun/rel/comfort: points on the scores. */
export const OPTIONS = [
  { id: 'exhaust', label: 'Sport exhaust', value: 0.015, awe: 5, fun: 5 },
  { id: 'ceramic', label: 'Carbon-ceramic brakes', value: 0.02, awe: 3, fun: 2 },
  { id: 'carbon', label: 'Carbon package', value: 0.02, awe: 4 },
  { id: 'colour', label: 'Special colour', value: 0.02, awe: 5 },
  { id: 'seats', label: 'Sport or bucket seats', value: 0.01, fun: 3 },
  { id: 'diff', label: 'Limited-slip differential', value: 0.01, fun: 4 },
  { id: 'rearsteer', label: 'Rear-axle steering', value: 0.01, fun: 3, rel: -1 },
  { id: 'air', label: 'Air suspension', value: 0.01, rel: -6, comfort: 2 },
  { id: 'manual', label: 'Manual gearbox', value: 0.0, fun: 7 },
  { id: 'acc', label: 'Adaptive cruise and assistants', value: 0.015, comfort: 2 },
  { id: 'hud', label: 'Head-up display', value: 0.01 },
  { id: 'lights', label: 'Matrix or laser lights', value: 0.01 },
  { id: 'pano', label: 'Panoramic roof', value: 0.01, rel: -1 },
  { id: 'sound', label: 'Premium sound', value: 0.01, awe: 1 },
  { id: 'wheels', label: 'Larger wheels', value: 0.005, awe: 2, comfort: -1 },
  { id: 'towbar', label: 'Tow bar', value: 0.01 },
  { id: 'winter', label: 'Winter wheels included', fixed: 800 },
  { id: 'warranty', label: 'Warranty or approved used', value: 0.03, rel: 8, cond: true },
  { id: 'history', label: 'Full service history', value: 0.03, rel: 4, cond: true },
  { id: 'owner', label: 'One owner', value: 0.015, cond: true },
  { id: 'accident', label: 'Repaired accident damage', value: -0.12, rel: -5, awe: -3, cond: true }
];
export const OPT = Object.fromEntries(OPTIONS.map(o => [o.id, o]));

/* ---------- small helpers ---------- */
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round100 = v => Math.round(v / 100) * 100;
const num = (v, d = 0) => { const x = Number(v); return isFinite(x) ? x : d; };
export function nowYear(d = new Date()) {
  const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return d.getFullYear() + (d.getMonth() + (d.getDate() - 1) / dim) / 12;
}
export function dateToYear(s) {
  if (!s) return nowYear();
  const [y, m = 6, dd = 15] = String(s).split('-').map(Number);
  return y + (m - 1 + (dd - 1) / 30) / 12;
}
export function interp(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  const n = pts.length, [x0, y0] = pts[n - 2], [x1, y1] = pts[n - 1];
  return Math.max(0.05, y1 + (y1 - y0) * (x - x1) / (x1 - x0));
}
const opts = q => new Set((q && q.options) || []);
const ageOf = (my, t) => Math.max(0, t - (my + 0.5));

/* ---------- value ---------- */
export const retention = (cls, age) => interp(CURVES[cls] || CURVES.ref, Math.max(0, age));
function listAt(car, y) { const p = car.price.list; return p.length === 1 ? p[0][1] : interp(p, y); }
export const asSold = (car, my) => listAt(car, my) * (car.price.opt || 1.15);
export const typKm = age => Math.round(Math.max(0, age) * KM_PER_YEAR_TYPICAL);
/* factor on the typical-mileage value for a car with km on the clock at a given age */
export function kmFactor(car, km, age) {
  const typ = typKm(age), k = KM_K[car.cls] || KM_K.ref;
  let f = Math.exp(-k * (num(km) - typ) / 10000);
  for (const [T, s] of KM_STEPS) { if (km >= T && typ < T) f *= 1 - s; else if (km < T && typ >= T) f *= 1 + s; }
  return clamp(f, 0.4, 1.25);
}
/* the mileage an anchor price refers to: researched ones say it, the checked list was normalised to 35–50k km */
const ancKm = a => a && a.atKm > 0 ? a.atKm : 42500;
const weakAnchor = a => !a || !(a.n >= 8);
const retCar = (car, age, g) => Math.min(1.35, Math.pow(retention(car.cls, age), g));
/* how strongly this model holds its value against its class (1 = like the class), from its market anchors */
export function gammaEff(car) {
  const prior = car.price.gamma ?? 1, anc = car.price.anchors || {};
  let sum = 0.5 * prior, n = 0.5;
  for (const k of Object.keys(anc)) {
    const my = Number(k), a = anc[k], age = dateToYear(a.date) - (my + 0.5);
    if (age < 0.6) continue;
    const vTyp = a.v / kmFactor(car, ancKm(a), age);
    const g = Math.log(vTyp / asSold(car, my)) / Math.log(retention(car.cls, age));
    if (isFinite(g)) { const w = weakAnchor(a) ? 0.4 : 1; sum += w * clamp(g, -1, 2.5); n += w; }
  }
  return sum / n;
}
/* value at the typical mileage for its age */
export function valueTyp(car, my, t, g = gammaEff(car)) {
  const age = ageOf(my, t), base = asSold(car, my);
  let v = base * retCar(car, age, g);
  const a = (car.price.anchors || {})[String(my)];
  if (a) {
    const aAge = Math.max(0.3, dateToYear(a.date) - (my + 0.5));
    const k = (a.v / kmFactor(car, ancKm(a), aAge)) / (base * retCar(car, aAge, g));
    v *= 1 + (k - 1) * Math.min(1, age / aAge);
  }
  return v;
}
/* what options and condition add, as a factor and a fixed amount */
export function optionEffect(car, q) {
  const o = opts(q); let f = 0, fixed = 0;
  for (const id of o) { const x = OPT[id]; if (!x) continue; if (id === 'manual' && !['sports', 'gt', 'hot', 'exotic'].includes(car.cls)) continue; f += x.value || 0; fixed += x.fixed || 0; }
  if (o.has('manual') && ['sports', 'gt', 'hot', 'exotic'].includes(car.cls)) f += 0.04;
  return { factor: 1 + clamp(f, -0.2, 0.12), fixed };
}
/* this car's value at time t with km on the clock */
export function valueAt(car, q, t, km = q.km) {
  const e = optionEffect(car, q);
  return valueTyp(car, q.year, t) * kmFactor(car, km, ageOf(q.year, t)) * e.factor + e.fixed;
}

/* ---------- is the asking price fair? ---------- */
export function priceCheck(car, q, now = nowYear(), live = null) {
  let fair = valueAt(car, q, now);
  const a = (car.price.anchors || {})[String(q.year)];
  let spread = a && !weakAnchor(a) ? 0.08 : car.price.anchors && Object.keys(car.price.anchors).length ? 0.11 : 0.14;
  let source = a ? (a.src && /claude/i.test(a.src) ? 'researched' : 'market') : 'model';
  if (live && live.median > 0) {
    /* live ads, adjusted from their mileage band to this car's mileage, weigh in by how many ads they rest on */
    const mid = live.km_from > 0 && live.km_to > 0 ? (live.km_from + live.km_to) / 2 : null, age = ageOf(q.year, now);
    const adj = mid ? live.median * kmFactor(car, q.km, age) / kmFactor(car, mid, age) : live.median;
    const w = clamp((live.n || 3) / 15, 0.3, 0.8);
    fair = fair * (1 - w) + adj * w; spread = Math.min(spread, 0.08); source = 'live';
  }
  const v = round100(fair), lo = round100(fair * (1 - spread)), hi = round100(fair * (1 + spread));
  const out = { fair: v, lo, hi, spread, source, asking: q.price > 0 ? Math.round(q.price) : null };
  if (out.asking) {
    const r = out.asking / fair;
    out.ratio = r;
    out.verdict = r < 1 - spread ? 'low' : r <= 1 - spread / 3 ? 'good' : r <= 1 + spread / 2 ? 'fair' : r <= 1 + spread ? 'high' : 'over';
    out.open = round100(Math.min(out.asking * 0.93, fair * 0.95));
    out.aim = round100(Math.min(out.asking, fair * (out.verdict === 'low' ? 1 : 0.98)));
    out.walk = round100(Math.min(hi, Math.max(fair * 1.04, out.aim)));
  }
  return out;
}

/* ---------- the value curve and when to buy or sell ---------- */
export function curve(car, q, prof, now = nowYear()) {
  const A = num(prof.km, 15000), hold = num(prof.hold, 4), age0 = ageOf(q.year, now), g = gammaEff(car);
  const kmAt = age => age <= age0 ? (age0 > 0 ? q.km * age / age0 : q.km) : q.km + A * (age - age0);
  const e = optionEffect(car, q), val = age => valueTyp(car, q.year, q.year + 0.5 + age, g) * kmFactor(car, kmAt(age), age) * e.factor + e.fixed;
  const end = Math.max(age0 + hold + 2, 6), pts = [];
  for (let a = 0; a <= end + 1e-9; a += 0.25) pts.push({ a, km: kmAt(a), v: val(a) });
  const vNow = val(age0), vEnd = val(age0 + hold);
  /* the buying sweet spot: once a typical car's yearly loss has fallen below 45 % of its first year's loss */
  const loss = a => valueTyp(car, q.year, q.year + 0.5 + a, g) - valueTyp(car, q.year, q.year + 1.5 + a, g);
  let sweet = null;
  if (g >= 0.25) { const L0 = loss(0); let s = 1; while (s < 6 && loss(s) > 0.45 * L0) s++; sweet = { from: s, to: Math.min(s + 3, 9) }; }
  /* mileage steps ahead within the ownership: selling just before one keeps that share */
  const steps = KM_STEPS.filter(([T]) => q.km < T && q.km + A * hold >= T).map(([T, s]) => {
    const yrs = (T - q.km) / A, v = val(age0 + yrs - 0.01);
    return { km: T, years: yrs, share: s, amount: Math.round(v * s / 10) * 10 };
  });
  return { pts, age0, vNow, vEnd, hold, loss: vNow - vEnd, lossPct: vNow > 0 ? 1 - vEnd / vNow : 0, perYear: (vNow - vEnd) / hold, sweet, inSweet: sweet ? age0 >= sweet.from && age0 <= sweet.to : false, collector: g < 0.25, steps, kmEnd: q.km + A * hold };
}

/* ---------- energy, tax and running costs ---------- */
export function prices(meta, prof) {
  const m = meta || DEFAULT_META, f = m.fuel || DEFAULT_META.fuel, e = m.elec || DEFAULT_META.elec;
  const share = clamp(num(prof && prof.homeShare, 70) / 100, 0, 1);
  return { e10: f.e10, sp98: f.sp98 ?? f.e10 + 0.13, diesel: f.diesel, home: e.home, dc: e.dc, kwh: e.home * share + e.dc * (1 - share), share, date: f.date || m.asOf || null };
}
const fuelPrice = (car, pr) => car.energy === 'diesel' ? pr.diesel : car.energy === 'e10' ? pr.e10 : pr.sp98;
function usageW(prof) {
  const u = (prof && prof.usage) || { autobahn: 40, mountain: 20, city: 35, track: 5 }, tot = USAGE_KEYS.reduce((s, k) => s + num(u[k]), 0) || 1;
  return Object.fromEntries(USAGE_KEYS.map(k => [k, num(u[k]) / tot]));
}
/* euros per 100 km: normal, spirited, fast Autobahn, and the mix of your driving */
export function energy(car, prof, meta) {
  const pr = prices(meta, prof), out = { pr, fuel: car.fuel };
  const mk = (amt, unit, eur) => ({ amt, unit, eur });
  if (car.fuel === 'ev') {
    const k = car.kwh100 || { normal: 20, dynamic: 30, fast: 34 };
    out.normal = mk(k.normal, 'kWh', k.normal * pr.kwh); out.dynamic = mk(k.dynamic, 'kWh', k.dynamic * pr.kwh); out.fast = mk(k.fast, 'kWh', k.fast * pr.kwh);
    out.range = car.batt ? { normal: Math.round(car.batt / k.normal * 100), fast: Math.round(car.batt / k.fast * 100) } : null;
  } else if (car.fuel === 'phev') {
    const fp = fuelPrice(car, pr), s = Math.min(Math.min(0.9, num(car.phev && car.phev.er) / 45), clamp(num(prof && prof.phevShare, 40) / 100, 0, 1)), l = car.l100, k = car.kwh100 || { normal: 24 };
    out.share = s;
    out.normal = mk(l.normal * (1 - s), 'L', l.normal * (1 - s) * fp + k.normal * s * pr.kwh); out.dynamic = mk(l.dynamic, 'L', l.dynamic * fp); out.fast = mk(l.fast, 'L', l.fast * fp);
  } else {
    const fp = fuelPrice(car, pr), l = car.l100 || { normal: (car.wltp || 9) * 1.12, dynamic: (car.wltp || 9) * 1.7, fast: (car.wltp || 9) * 1.75 };
    out.normal = mk(l.normal, 'L', l.normal * fp); out.dynamic = mk(l.dynamic, 'L', l.dynamic * fp); out.fast = mk(l.fast, 'L', l.fast * fp); out.fuelPrice = fp;
  }
  const w = usageW(prof);
  out.mix = w.city * out.normal.eur + w.autobahn * (0.5 * out.normal.eur + 0.5 * out.fast.eur) + w.mountain * (0.4 * out.normal.eur + 0.6 * out.dynamic.eur) + w.track * out.dynamic.eur * 1.6;
  out.trip = 0.4 * out.normal.eur + 0.6 * out.fast.eur;
  return out;
}
const CO2_BANDS = [[95, 115, 2.0], [115, 135, 2.2], [135, 155, 2.5], [155, 175, 2.9], [175, 195, 3.4], [195, 9999, 4.0]];
/* Kfz-Steuer: displacement part plus the CO₂ part of the rules for the year of first registration; EVs pay none (to 2030) */
export function kfzSteuer(car, my) {
  if (car.fuel === 'ev') return 0;
  const base = Math.ceil(num(car.cc) / 100) * (car.fuel === 'diesel' ? 9.5 : 2), co2 = num(car.co2);
  let part = 0;
  if (my >= 2021) { for (const [a, b, r] of CO2_BANDS) if (co2 > a) part += (Math.min(co2, b) - a) * r; }
  else if (my >= 2019) part = Math.max(0, co2 - 95) * 2;
  else part = Math.max(0, co2 * 0.85 - 95) * 2;
  return Math.round(base + part);
}
/* yearly running costs at your mileage */
export function running(car, q, prof, meta, now = nowYear()) {
  const A = num(prof.km, 15000), age = ageOf(q.year, now), o = opts(q);
  const ins = num(car.ins, 1800) * (SF[prof.sf] || SF.sf10).f;
  const wear = 1 + Math.min(0.5, 0.05 * Math.max(0, age - 3)) + Math.min(0.35, Math.max(0, q.km - 100000) / 100000 * 0.25);
  let upkeep = num(car.upkeep, 1500) * (0.6 + 0.4 * A / 15000) * wear;
  if (o.has('warranty')) upkeep *= 0.85;
  const tyres = num(car.tyres, 900) * A / 15000 * (o.has('winter') ? 0.9 : 1), tax = kfzSteuer(car, q.year), hu = 75;
  const en = energy(car, prof, meta), energyYear = en.mix * A / 100;
  const fixed = ins + upkeep + tyres + tax + hu;
  return { ins, upkeep, tyres, tax, hu, energyYear, fixed, total: fixed + energyYear, en, km: A, age };
}

/* ---------- what falls due while you own it ---------- */
/* the gearbox as listed; "7-speed DSG / 6-speed manual" means the first one is standard, the second an option */
const gearOf = car => { const g = String(car.gearbox || '').toLowerCase().split('/')[0]; return /manual|schalt/.test(g) ? 'manual' : /pdk|dct|dsg|dual|doppel|s tronic|7g-dct/.test(g) ? 'dct' : car.fuel === 'ev' ? 'ev' : 'auto'; };
const GENERIC = [
  { id: 'brakes', item: 'Brake discs and pads', km: 60000, perf: 45000, cost: 900, skip: o => o.has('ceramic') },
  { id: 'ceramic', item: 'Carbon-ceramic discs and pads', km: 140000, cost: 9000, only: o => o.has('ceramic'), extra: true },
  { id: 'plugs', item: 'Spark plugs', km: 60000, years: 4, cost: 260, fuel: ['petrol', 'phev'] },
  { id: 'dct', item: 'Dual-clutch gearbox oil and filter', km: 60000, cost: 480, gear: 'dct' },
  { id: 'auto', item: 'Automatic gearbox oil change', km: 90000, cost: 620, gear: 'auto' },
  { id: 'clutch', item: 'Clutch', km: 140000, cost: 1600, gear: 'manual' },
  { id: 'cooling', item: 'Water pump and thermostat', km: 120000, cost: 950, fuel: ['petrol', 'diesel', 'phev'] },
  { id: 'battery12', item: '12-volt battery', years: 6, cost: 320 },
  { id: 'shocks', item: 'Shock absorbers and suspension bushes', km: 130000, cost: 1700, skip: o => o.has('air') },
  { id: 'air', item: 'Air springs and compressor', km: 120000, years: 9, cost: 2600, only: o => o.has('air'), extra: true },
  { id: 'hv', item: 'High-voltage battery check and coolant', years: 4, cost: 280, fuel: ['ev', 'phev'] }
];
export function dueList(car, q, prof, now = nowYear()) {
  const A = Math.max(1000, num(prof.km, 15000)), hold = num(prof.hold, 4), o = opts(q), age = ageOf(q.year, now), km0 = num(q.km), km1 = km0 + A * hold;
  const tier = TIER[car.cls] || 1, perf = ['hot', 'sport4', 'super', 'sports', 'gt', 'exotic', 'suv'].includes(car.cls), gear = o.has('manual') ? 'manual' : gearOf(car);
  const out = [];
  const add = (it, at, cost, extra, specific) => { if (at < -0.05 || at > hold + 0.01) return; out.push({ item: it, in: Math.max(0, at), km: Math.round(km0 + A * Math.max(0, at)), cost: Math.round(cost / 10) * 10, extra: !!extra, specific: !!specific }); };
  for (const d of GENERIC) {
    if (d.only && !d.only(o)) continue; if (d.skip && d.skip(o)) continue;
    if (d.fuel && !d.fuel.includes(car.fuel)) continue; if (d.gear && d.gear !== gear) continue;
    const cost = d.id === 'ceramic' ? d.cost * clamp(tier / 1.8, 0.8, 2) : d.cost * tier;
    /* due at the next mileage or the next birthday, whichever comes first, then again one interval later */
    const every = d.km ? (perf && d.perf ? d.perf : d.km) : null, Inf = Infinity;
    const step = Math.min(every ? every / A : Inf, d.years || Inf);
    let at = Math.min(every ? ((Math.floor(km0 / every) + 1) * every - km0) / A : Inf, d.years ? (Math.floor(age / d.years) + 1) * d.years - age : Inf);
    for (; at <= hold + 0.01; at += step) add(d.item, at, cost, d.extra);
  }
  /* what research found for this model: timing chains, known jobs at a mileage */
  for (const m of car.milestones || []) {
    if (!m || !m.item) continue;
    const byKm = m.km > 0 ? (m.km > km0 && m.km <= km1 ? (m.km - km0) / A : null) : null, byYr = m.years > 0 ? (m.years > age && m.years <= age + hold ? m.years - age : null) : null;
    const at = byKm ?? byYr; if (at != null) add(m.item, at, num(m.cost), false, true);
  }
  out.sort((a, b) => a.in - b.in);
  const total = out.reduce((s, x) => s + x.cost, 0), extra = out.filter(x => x.extra).reduce((s, x) => s + x.cost, 0);
  return { items: out, total, extra, km0, km1, hold };
}

/* ---------- financing and the monthly cost ---------- */
export function annuity(P, aprPct, n, balloon = 0) {
  const i = aprPct / 100 / 12; if (n <= 0) return 0;
  if (i === 0) return (P - balloon) / n;
  return (P - balloon / Math.pow(1 + i, n)) * i / (1 - Math.pow(1 + i, -n));
}
export function monthly(car, q, prof, meta, now = nowYear()) {
  const price = q.price > 0 ? q.price : priceCheck(car, q, now).fair;
  const run = running(car, q, prof, meta, now), due = dueList(car, q, prof, now), cv = curve(car, { ...q }, prof, now);
  const hold = num(prof.hold, 4), mode = prof.mode === 'cash' ? 'cash' : 'loan', apr = prof.apr > 0 ? prof.apr : num(meta && meta.loan && meta.loan.good, 5.9);
  const r = { price, run, due, curve: cv, mode, apr, hold };
  if (mode === 'cash') { r.down = price; r.instalment = 0; r.interestM = 0; r.term = 0; }
  else {
    const down = price * clamp(num(prof.downPct, 20), 0, 100) / 100, P = price - down, n = Math.max(6, num(prof.term, 48));
    r.down = down; r.principal = P; r.term = n; r.instalment = P > 0 ? annuity(P, apr, n) : 0;
    r.interestTotal = r.instalment * n - P; r.interestM = r.interestTotal / Math.max(hold * 12, n);
  }
  r.opportunityM = r.down * 0.025 / 12;
  /* what you pay what for: the car's loss in value against what you paid, at your mileage */
  r.deprM = Math.max(0, price - cv.vEnd) / (hold * 12);
  r.runM = run.total / 12; r.extraM = due.extra / (hold * 12);
  r.cashM = r.instalment + r.runM + r.extraM;                         // leaves the account each month
  r.econM = r.deprM + r.interestM + r.opportunityM + r.runM + r.extraM; // what owning it really costs
  r.parts = [['Loss in value', r.deprM], ['Fuel or charging', run.energyYear / 12], ['Insurance', run.ins / 12], ['Upkeep and repairs', run.upkeep / 12 + r.extraM], ['Tyres', run.tyres / 12], ['Tax and TÜV', (run.tax + run.hu) / 12], ['Interest', r.interestM + r.opportunityM]];
  return r;
}

/* ---------- the four scores, each out of 100 (100 is best) ---------- */
const pw = (pts, x) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [a, y0] = pts[i - 1], [b, y1] = pts[i]; return y0 + (y1 - y0) * (x - a) / (b - a); } return pts[pts.length - 1][1]; };
const SHARE = [[0, 100], [0.15, 90], [0.3, 75], [0.45, 55], [0.6, 35], [0.8, 12], [1, 0]];
const LEVEL_NAMES = ['Basic', 'Good', 'Very good', 'Excellent'];
const levelOf = (v, t) => { let i = -1; (t || []).forEach((x, k) => { if (x > 0 && v >= x) i = k; }); return i; };
/* Financial burden: the monthly cash the car takes against what is left after essentials, the savings plan, and the
   safety net after the down payment. fin comes from Safety Net Score (or the Profile): net, other, essential, savings, plan, levels. */
export function burden(m, fin) {
  if (!fin || !(fin.net > 0)) return null;
  const room = num(fin.net) + num(fin.other) - num(fin.essential), plan = Math.max(0, num(fin.plan));
  const cashM = m.cashM, after = room - cashM, share = room > 0 ? cashM / room : 9;
  const savings = Math.max(0, num(fin.savings)), cashOut = m.down, savingsAfter = savings - cashOut;
  const lv = Array.isArray(fin.levels) ? fin.levels : null, before = lv ? levelOf(savings, lv) : null, afterLv = lv ? levelOf(savingsAfter, lv) : null;
  let score = pw(SHARE, clamp(share, 0, 1)), why = [];
  const cut = Math.max(0, plan - after);
  if (plan > 0 && cut > 0) { score -= 25 * Math.min(1, cut / plan); why.push('cut'); }
  if (lv && afterLv < before) { score -= 6 * (before - afterLv) + (afterLv < 1 && before >= 1 ? 10 : 0); why.push('level'); }
  if (lv && savingsAfter < lv[0]) { score = Math.min(score, 25); why.push('belowBasic'); }
  if (after < 0) { score = Math.min(score, 10); why.push('short'); }
  if (savingsAfter < 0) { score = Math.min(score, 5); why.push('cannotPay'); }
  score = Math.round(clamp(score, 0, 100));
  /* fully covered: a healthy score, the savings plan untouched, and the safety net still at least Good afterwards */
  const netOk = lv ? afterLv >= Math.min(1, before) : savingsAfter >= 3 * num(fin.essential);
  const verdict = savingsAfter < 0 || after < 0 ? 'not' : score >= 65 && cut === 0 && netOk ? 'covered' : score >= 40 ? 'stretch' : 'not';
  return { score, verdict, room, cashM, after, share, plan, cut, savings, cashOut, savingsAfter, levels: lv, before, afterLv, beforeName: before >= 0 ? LEVEL_NAMES[before] : before === -1 ? 'below Basic' : null, afterName: afterLv >= 0 ? LEVEL_NAMES[afterLv] : afterLv === -1 ? 'below Basic' : null, why };
}
/* Awe effect: how much attention it draws, from the record's 1–10, then colour and options, its age and condition */
export function awe(car, q, now = nowYear()) {
  const o = opts(q), age = ageOf(q.year, now), g = gammaEff(car);
  let s = num(car.wow, 5) * 10 + (car.polar ? 3 : 0), why = [];
  for (const id of o) if (OPT[id] && OPT[id].awe) { s += OPT[id].awe; }
  if (g >= 0.4) {
    const special = ['sports', 'gt', 'exotic'].includes(car.cls);
    const fade = special ? Math.min(5, 0.5 * Math.max(0, age - 8)) : Math.min(15, 1.5 * Math.max(0, age - 6));
    if (fade > 0) { s -= fade; why.push('age'); }
  }
  return { score: Math.round(clamp(s, 5, 100)), base: num(car.wow, 5), note: car.wowNote || '', why };
}
/* Power-to-pleasure: not raw power. Power with diminishing returns, lightness, how it drives (gearbox, driven wheels,
   engine character, chassis), sound, and power you can use on German roads. */
export function pleasure(car, q) {
  const o = opts(q), kg = num(car.kg, 1600), ps = Math.max(60, num(car.ps, 200)), ratio = kg / ps;
  const eng = String(car.engine || '').toLowerCase(), gear = o.has('manual') ? 'manual' : gearOf(car);
  const power = 35 * (1 - Math.exp(-Math.max(0, 9 - ratio) / 2.2));
  const light = 20 * clamp((2300 - kg) / 1100, 0, 1);
  const turbo = /turbo|kompressor|supercharg/.test(eng), na = car.fuel === 'petrol' && !turbo;
  const six = /v8|v10|v12|w12|flat-six|flat six|boxer six|inline-six|inline six|straight-six|i6|six-cylinder|\bv6\b|3\.0 i6/.test(eng);
  let drive = { RWD: 6, AWD: 4, FWD: 2 }[car.drive] ?? 3;
  let box = { manual: 7, dct: 6, auto: 4, ev: 2 }[gear];
  let character = car.fuel === 'ev' ? 2 : car.fuel === 'diesel' ? 1 : na ? 6 : 4;
  if (six && car.fuel !== 'ev') character += 2;
  const chassis = 6 * num(car.fit && car.fit.mountain, 5) / 10 + 3 * num(car.fit && car.fit.track, 4) / 10;
  const engaging = clamp(drive + box + character + chassis + (['sports', 'gt', 'exotic'].includes(car.cls) ? 2 : 0), 0, 30);
  let sound = car.fuel === 'ev' ? 2 : car.fuel === 'diesel' ? 1 : (na ? 5 : 3) + (/v8|v10|v12|flat-six|flat six/.test(eng) ? 3 : six ? 1 : 0);
  if (o.has('exhaust')) sound += 3;
  sound = clamp(sound, 0, 10);
  const usable = 5 * num(car.fit && car.fit.autobahn, 6) / 10;
  let extra = 0; for (const id of o) if (OPT[id] && OPT[id].fun && id !== 'manual' && id !== 'exhaust') extra += OPT[id].fun / 2;
  const total = power + light + engaging + sound + usable + extra;
  return { score: Math.round(clamp(total, 0, 100)), ratio: Math.round(ratio * 100) / 100, parts: { power: Math.round(power), light: Math.round(light), engaging: Math.round(engaging), sound: Math.round(sound), usable: Math.round(usable) } };
}
/* Reliability: the model's record (TÜV, ADAC), then this car's mileage and age, parts supply, options and condition */
export function reliability(car, q, now = nowYear()) {
  const o = opts(q), age = ageOf(q.year, now), harsh = { exotic: 1.6, gt: 1.3, super: 1.2, sports: 1.1 }[car.cls] || 1;
  let s = 20 * clamp(num(car.rel, 3), 1, 5);
  const kmPen = Math.min(25, Math.max(0, num(q.km) - 100000) / 10000 * 1.5 * harsh);
  const agePen = Math.min(15, Math.max(0, age - 8) * 1.5);
  s += -kmPen - agePen + (num(car.parts, 3) - 3) * 3;
  for (const id of o) if (OPT[id] && OPT[id].rel) s += OPT[id].rel;
  return { score: Math.round(clamp(s, 5, 100)), base: num(car.rel, 3), kmPen: Math.round(kmPen), agePen: Math.round(agePen), note: car.relNote || '', issues: car.issues || [] };
}
export const SCORE_KEYS = ['burden', 'awe', 'fun', 'rel'];
export const SCORE_LABEL = { burden: 'Financial burden', awe: 'Awe effect', fun: 'Power-to-pleasure', rel: 'Reliability' };
export function scores(car, q, prof, meta, fin, now = nowYear()) {
  const m = monthly(car, q, prof, meta, now);
  const b = burden(m, fin), a = awe(car, q, now), f = pleasure(car, q), r = reliability(car, q, now);
  const s = { burden: b ? b.score : null, awe: a.score, fun: f.score, rel: r.score };
  const w = { burden: 25, awe: 25, fun: 25, rel: 25, ...(prof.w || {}) };
  let tot = 0, sw = 0; for (const k of SCORE_KEYS) if (s[k] != null && w[k] > 0) { tot += s[k] * w[k]; sw += w[k]; }
  return { ...s, overall: sw ? Math.round(tot / sw) : null, detail: { burden: b, awe: a, fun: f, rel: r }, m };
}

/* ---------- fit for your life ---------- */
export function dogFit(car) {
  const t = num(car.trunk), b = car.body, a = car.art;
  if (['wagon', 'suv'].includes(b) || ['boxy', 'crossover', 'wagon', 'suv'].includes(a)) return t >= 450 ? 9 : 7;
  if (b === 'hatch' || b === 'liftback') return t >= 380 ? 6 : 4;
  if (b === 'sedan') return 3;
  return 1;
}
export function fit(car, q, prof) {
  const f = { ...(car.fit || {}) }, o = opts(q);
  if (o.has('air')) f.long = Math.min(10, num(f.long, 5) + 0.5);
  if (o.has('towbar')) f.family = Math.min(10, num(f.family, 5) + 0.5);
  if (o.has('winter')) f.winter = Math.min(10, num(f.winter, 5) + 1);
  f.dog = dogFit(car);
  const w = usageW(prof), drive = Math.round((w.autobahn * num(f.autobahn, 5) + w.mountain * num(f.mountain, 5) + w.city * num(f.city, 5) + w.track * num(f.track, 5)) * 10) / 10;
  return { f, drive, needs: { family: !!prof.family, dog: !!prof.dog } };
}
/* road trips to the hotels on the Grand Tour wish list: distance by road, fuel there and back, charging stops */
export function km2(a, b) {
  const R = 6371, rad = x => x * Math.PI / 180, dLa = rad(b.lat - a.lat), dLo = rad(b.lon - a.lon);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export function roadTrips(car, prof, meta, home, hotels, n = 4) {
  if (!home || !(home.lat != null) || !Array.isArray(hotels)) return [];
  const en = energy(car, prof, meta), range = en.range ? en.range.fast * 0.8 : null;
  return hotels.filter(h => h && h.lat != null && h.lon != null && h.status === 'wish' && !h.ex).map(h => {
    const d = km2(home, h) * 1.25, stops = range ? Math.max(0, Math.ceil(d / range) - 1) : 0;
    return { name: h.name, place: h.place, km: Math.round(d), cost: Math.round(2 * d / 100 * en.trip), stops };
  }).sort((a, b) => a.km - b.km).slice(0, n);
}

/* ---------- the test-drive checklist ---------- */
export function checklist(car, q) {
  const o = opts(q), gear = o.has('manual') ? 'manual' : gearOf(car), eng = String(car.engine || '').toLowerCase(), out = [];
  const add = (id, text, from) => out.push({ id, text, from: from || 'general' });
  (car.issues || []).forEach((t, i) => add('issue' + i, `Known for this model: ${t}. Check for it, and ask whether it was fixed.`, 'model'));
  (car.checks || []).forEach((t, i) => add('check' + i, t, 'model'));
  add('vin', 'The VIN on the car (windscreen, door pillar) matches the registration documents.');
  add('km', 'The mileage fits the service entries and the last TÜV reports. Ask to see the TÜV reports.');
  add('history', q.km > 90000 ? 'Service book or dealer printout: the big services around 60,000 and 120,000 km were done, with invoices.' : 'Service book or dealer printout, with every service on time.');
  add('accident', o.has('accident') ? 'Ask for the repair invoice and photos; check the paint thickness on every panel.' : 'Get “unfallfrei” (accident-free) written into the contract, and check panel gaps and paint thickness.');
  add('cold', /turbo|v8|v6|chain/.test(eng) || car.fuel === 'petrol' ? 'Cold start, bonnet open: no rattle in the first seconds (timing chain), no blue smoke.' : 'Cold start: it starts cleanly, no warning lights stay on.');
  if (gear === 'dct') add('dct', 'Creep and park slowly: the dual-clutch gearbox should not judder or clunk.');
  if (gear === 'auto') add('auto', 'Kick-down from 80 km/h: quick, smooth shifts with no slipping between gears.');
  if (gear === 'manual') add('clutch', 'Clutch: bite point not too high; full throttle in 4th at 2,000 rpm must not slip.');
  if (car.drive === 'AWD') add('awd', 'Full-lock turns in a car park: no binding or clunks from the four-wheel drive.');
  if (car.fuel === 'ev') add('soh', 'Ask for a battery health (SoH) certificate. Above 90 % at this age is good; check the charging port and a fast-charge session.');
  if (car.fuel === 'phev') add('phev', 'Charge it on AC and drive on battery, then make sure the engine starts and runs smoothly cold.');
  if (o.has('air')) add('air', 'Leave it parked for 30 minutes: it must still sit level. Try every ride height.');
  if (o.has('ceramic')) add('ceramic', 'Carbon-ceramic discs: no cracks or chipped edges. Ask for the disc wear reading; a set costs five figures.');
  add('tyres', 'Tyres: matching brands, even wear across the tread (uneven wear means alignment trouble), date codes under 6 years.');
  add('brakes', 'Brakes: no pulsing in the pedal under a firm stop from 100 km/h.');
  add('electrics', 'Every electric item: windows, seats, cameras, sensors, infotainment, phone pairing.');
  add('keys', 'Both keys, the wheel-lock key, the tyre kit, and the papers (Zulassungsbescheinigung Teil I and II).');
  return out;
}

/* ---------- matching what was typed to the catalogue ---------- */
export const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const ALIAS = { mercedes: 'amg', merc: 'amg', benz: 'amg', vw: 'volkswagen', volkswagen: 'vw', chevy: 'chevrolet' };
export function match(cars, q) {
  const words = norm(q.name).split(' ').filter(Boolean);
  if (!words.length) return [];
  const yr = num(q.year), ps = num(q.ps);
  return cars.map(c => {
    const hay = norm(`${c.make} ${c.model} ${c.variant || ''} ${c.gen || ''} ${c.id.replace(/-/g, ' ')}`).split(' ');
    let hit = 0;
    for (const w of words) { const ws = [w, ALIAS[w]].filter(Boolean); if (hay.some(h => ws.some(x => h === x || (x.length >= 2 && h.startsWith(x)) || (h.length >= 3 && x.startsWith(h))))) hit++; }
    let s = hit / words.length;
    if (s === 0) return null;
    if (yr) { const [a, b] = c.years; s += yr >= a && yr <= Math.max(b, c.onSale ? 2100 : b) ? 0.3 : -0.25 * Math.min(4, Math.min(Math.abs(yr - a), Math.abs(yr - b))); }
    if (ps) { const d = Math.abs(ps - c.ps) / c.ps; s += d <= 0.04 ? 0.3 : d <= 0.12 ? 0.1 : -0.3 - Math.min(0.5, d); }
    return { car: c, score: Math.round(s * 100) / 100, yearOk: !yr || (yr >= c.years[0] && yr <= (c.onSale ? 2100 : c.years[1])), psOk: !ps || Math.abs(ps - c.ps) / c.ps <= 0.08, words: hit / words.length };
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 6);
}
/* a match is good enough to analyse without research when the name, the year and the power all fit */
export const sure = m => !!m && m.words >= 0.99 && m.yearOk && m.psOk;

/* ---------- a car record from Claude's research (task car_lookup) ---------- */
const pick = (v, list, d) => list.includes(v) ? v : d;
const ARTS = ['hatch', 'sedan', 'wagon', 'coupe', 'fastback', 'rear', 'mid', 'roadster', 'suv', 'coupesuv', 'boxy', 'crossover'];
const BODIES = ['hatch', 'sedan', 'wagon', 'coupe', 'roadster', 'suv', 'liftback'];
export const slug = s => norm(s).replace(/ /g, '-').slice(0, 70);
export function fromLookup(j, q, today = new Date().toISOString().slice(0, 10)) {
  const n = (v, d) => { const x = Number(v); return isFinite(x) && x > 0 ? x : d; };
  const year = Math.round(n(q.year, n(j.years && j.years[0], new Date().getFullYear())));
  const fuel = pick(j.fuel, ['petrol', 'diesel', 'phev', 'ev'], 'petrol');
  const y0 = Math.round(n(j.years && j.years[0], year)), y1 = Math.round(n(j.years && j.years[1], year));
  const years = [Math.min(y0, year), Math.max(y1, year)];
  const ps = Math.round(n(j.ps, n(q.ps, 200))), kg = Math.round(n(j.kg, 1600));
  const c = {
    id: 'ai-' + slug(`${j.make} ${j.model} ${j.variant || ''} ${ps} ${years[0]}`), make: String(j.make || '').slice(0, 40), model: String(j.model || '').slice(0, 60), variant: String(j.variant || '').slice(0, 60), gen: String(j.gen || '').slice(0, 30) || '—',
    years, onSale: !!j.onSale, cls: pick(j.cls, CLASSES, 'ref'), body: pick(j.body, BODIES, 'sedan'), art: pick(j.art, ARTS, 'sedan'), color: /^#[0-9a-f]{6}$/i.test(j.color || '') ? j.color : '#6b7480',
    fuel, energy: pick(j.energy, ['e10', 'sp98', 'diesel', 'ev'], fuel === 'ev' ? 'ev' : fuel === 'diesel' ? 'diesel' : 'e10'), drive: pick(j.drive, ['AWD', 'RWD', 'FWD'], 'FWD'),
    gearbox: String(j.gearbox || '').slice(0, 60), engine: String(j.engine || '').slice(0, 90), cc: Math.round(Number(j.cc) || 0), ps, kw: Math.round(ps * 0.7355), nm: Math.round(n(j.nm, ps * 1.4)), kg, seats: Math.round(n(j.seats, 5)), trunk: Math.round(n(j.trunk, 400)),
    acc: { claim: n(j.acc, 8), meas: null }, vmax: { v: Math.round(n(j.vmax, 220)), limited: !!j.vmaxLimited },
    wltp: fuel === 'ev' ? null : n(j.wltp, 7), batt: fuel === 'ev' || fuel === 'phev' ? n(j.batt, null) : null,
    rel: clamp(n(j.rel, 3), 1, 5), relNote: String(j.relNote || ''), issues: (j.issues || []).slice(0, 4).map(x => String(x).slice(0, 160)),
    upkeep: Math.round(n(j.upkeep, 1200)), ins: Math.round(n(j.ins, 1500)), tyres: Math.round(n(j.tyres, 700)), bigTicket: j.bigTicket ? String(j.bigTicket).slice(0, 200) : null,
    parts: clamp(Math.round(n(j.parts, 3)), 1, 5), partsNote: String(j.partsNote || ''), wow: clamp(Math.round(n(j.wow, 4)), 1, 10), wowNote: String(j.wowNote || ''), polar: !!j.polar,
    pos: (j.pos || []).slice(0, 4).map(x => [String(x.tag || ''), String(x.text || '').slice(0, 140)]), neg: (j.neg || []).slice(0, 4).map(x => [String(x.tag || ''), String(x.text || '').slice(0, 140)]),
    fit: Object.fromEntries(FIT_KEYS.map(k => [k, clamp(Math.round(n(j.fit && j.fit[k], 5)), 1, 10)])),
    milestones: (j.milestones || []).slice(0, 10).map(m => ({ km: n(m.km, 0), years: n(m.years, 0), item: String(m.item || '').slice(0, 90), cost: Math.round(n(m.cost, 0)) })).filter(m => m.item),
    checks: (j.checks || []).slice(0, 6).map(x => String(x).slice(0, 200)),
    conf: ['H', 'M', 'L'].includes(j.conf) ? j.conf : 'M', note: j.note ? String(j.note).slice(0, 240) : null,
    src: (j.sources || []).slice(0, 8).map(s => ({ title: String(s.title || s.url || '').slice(0, 100), url: String(s.url || '') })).filter(s => /^https?:\/\//.test(s.url)),
    status: 'researched', checked: today
  };
  const f = fuel === 'diesel' ? 26.4 : 23.2;
  c.co2 = fuel === 'ev' ? 0 : Math.round(n(j.co2, (c.wltp || 0) * f));
  if (fuel === 'ev') { const w = n(j.wltp, 18); c.kwh100 = { wltp: w, normal: n(j.normal, w * 1.15), dynamic: n(j.dynamic, w * 1.6), fast: n(j.fast, w * 1.75) }; c.l100 = null; }
  else {
    c.l100 = { normal: n(j.normal, (c.wltp || 7) * 1.12), dynamic: n(j.dynamic, (c.wltp || 7) * 1.7), fast: n(j.fast, (c.wltp || 7) * 1.75) };
    c.kwh100 = fuel === 'phev' ? { normal: n(j.evKwh, 22), dynamic: n(j.evKwh, 22) * 1.4, fast: n(j.evKwh, 22) * 1.6 } : null;
  }
  c.phev = fuel === 'phev' ? { batt: n(j.batt, 15), er: n(j.eRange, 50) } : null;
  c.price = { list: [[Math.round(n(j.priceNewYear, years[1])), n(j.priceNew, 45000)]], opt: clamp(n(j.opt, 1.15), 1, 1.35), gamma: clamp(Number(j.gamma) || 1, -0.3, 1.6), anchors: {} };
  const u = j.used || {};
  if (n(u.v, 0)) c.price.anchors[String(year)] = { v: Math.round(n(u.v, 0)), atKm: Math.round(n(u.km, typKm(nowYear() - year - 0.5) || 30000)), n: Math.round(n(u.n, 0)), date: today.slice(0, 7), src: 'Claude research' };
  const a2 = n(j.a200, null);
  c.a200 = a2 ? { v: a2, kind: 'estimated' } : (() => { const e = estimate100200(c); return e ? { v: e, kind: 'estimated' } : { v: null, kind: 'na' }; })();
  return c;
}
export const validCar = c => !!(c && c.id && c.make && c.model && Array.isArray(c.years) && c.price && Array.isArray(c.price.list) && c.price.list.length && c.fit);

/* 100–200 km/h from power, weight and drag when no test has measured it (±10 %) */
export function estimate100200(c) {
  const vmax = c.vmax && c.vmax.v;
  if (!vmax || vmax < 215 || !c.ps || !c.kg) return null;
  const CDA = { hatch: .70, sedan: .62, wagon: .66, coupe: .62, fastback: .58, rear: .62, mid: .62, roadster: .70, suv: .92, coupesuv: .86, boxy: 1.45, crossover: .80 };
  const m = c.kg + 90, P = c.ps * 735.5;
  const eta = c.fuel === 'ev' ? 0.8 : c.fuel === 'phev' ? 0.795 : clamp(0.845 - 0.00019 * (c.ps - 380), 0.74, 0.9);
  const cda0 = CDA[c.art] || .66; let cda = cda0;
  if (!c.vmax.limited) { const v = vmax / 3.6; cda = (cda0 + clamp((0.86 * P - 0.012 * m * 9.81 * v) / (0.6 * v * v * v), 0.8 * cda0, 1.5 * cda0)) / 2; }
  let t = 0;
  for (let v = 100 / 3.6; v < 200 / 3.6; v += 0.02) { const vm = v + 0.01, net = eta * P - (0.6 * cda * vm * vm + 0.012 * m * 9.81) * vm; if (net <= 1000) return null; t += m * vm * 0.02 / net; }
  return Math.round((t + (c.fuel === 'ev' ? 0 : 0.1)) * 10) / 10;
}

/* ---------- plans in the other apps ---------- */
/* what the Funds Ladder's car rung should hold: the down payment, or the whole price when paying cash */
export const ladderTarget = m => Math.round(m.mode === 'cash' ? m.price : m.down);
/* how many months later a home deposit is reached when this car takes its cash and part of the monthly saving */
export function homeDelay(m, fin, deposit) {
  if (!fin || !(fin.plan > 0)) return null;
  const room = num(fin.net) + num(fin.other) - num(fin.essential), plan = num(fin.plan);
  const newPlan = Math.max(0, Math.min(plan, room - m.cashM));
  if (newPlan <= 0) return { never: true, newPlan: 0, plan };
  const good = Array.isArray(fin.levels) && fin.levels[1] > 0 ? fin.levels[1] : 0;
  const gap = Math.max(0, num(deposit) - Math.max(0, num(fin.savings) - good));
  const before = gap / plan, after = (gap + m.down) / newPlan;
  return { months: Math.max(0, Math.round(after - before)), before: Math.round(before), after: Math.round(after), plan, newPlan, gap };
}
