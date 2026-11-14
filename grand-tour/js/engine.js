/* Grand Tour — the engine. Pure functions, no screen, no storage.
   Five stars hide very different hotels, so every hotel gets one of five grades from the rate it asks for a
   standard double in its main season. Separately, a stay gets an experience score on the person's own criteria.
   The insight is the gap between the two: what the stay delivered against what its grade should deliver. */
const num = (v, d = 0) => { const n = Number(v); return isFinite(n) ? n : d; };

export const NUMERALS = ['I', 'II', 'III', 'IV', 'V'];
export const DEFAULT_NAMES = ['Maison', 'Grand Hôtel', 'Palace', 'Sanctuaire', 'Légende'];
export const DEFAULT_BANDS = [250, 450, 800, 1500];          // upper limit of grades I to IV, per night
export const CRITERIA = ['pool', 'spa', 'parking', 'gym', 'room', 'service', 'food', 'dog'];
export const FACILITIES = ['pool', 'sauna', 'parking', 'gym', 'dog'];
export const PAR = [60, 68, 76, 84, 92];                       // the experience each grade should deliver, out of 100
export const MEMORABLE = 80;                                   // a stay scoring this or more counts as memorable

/* grade 1…5 from a nightly rate; null without a rate */
export function gradeFromRate(rate, bands = DEFAULT_BANDS) {
  const r = num(rate); if (!(r > 0)) return null;
  let g = 1; for (const b of bands) if (r >= b) g++;
  return Math.min(5, g);
}
/* a hotel's grade: the person's own override, else from the season rate, else from what was paid */
export function gradeOf(h, bands = DEFAULT_BANDS) {
  const ov = Math.round(num(h.gradeOv));
  if (ov >= 1 && ov <= 5) return ov;
  return gradeFromRate(h.ref, bands) ?? gradeFromRate(h.paid, bands);
}
export const gradeSource = h => { const ov = Math.round(num(h.gradeOv)); return ov >= 1 && ov <= 5 ? 'own' : num(h.ref) > 0 ? 'ref' : num(h.paid) > 0 ? 'paid' : null; };

/* experience out of 100: the weighted mean of the criteria that were scored (1…5), null when none were */
export function experience(h, weights = {}) {
  let s = 0, w = 0;
  for (const k of CRITERIA) { const v = num(h.x && h.x[k]); if (v >= 1 && v <= 5) { const wk = weights[k] === undefined ? 1 : Math.max(0, num(weights[k])); s += v * wk; w += wk; } }
  return w > 0 ? s / w * 20 : null;
}
export const scoredCount = h => CRITERIA.filter(k => { const v = num(h.x && h.x[k]); return v >= 1 && v <= 5; }).length;
/* value for the grade: experience minus the par of the grade; positive = above what the grade should deliver */
export function valueOf(h, bands, weights) {
  const g = gradeOf(h, bands), e = experience(h, weights);
  return g && e !== null ? e - PAR[g - 1] : null;
}

/* distance on the globe in km, and the compass bearing from a to b in degrees (0 = north, 90 = east) */
export function km(a, b) {
  const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
export function bearing(a, b) {
  const r = Math.PI / 180, y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
/* a rough drive time in minutes from the straight-line distance, used until a routed time is known:
   roads are about 30 % longer than the straight line and a long drive averages about 85 km/h */
export const driveGuess = d => Math.round(d * 1.3 / 85 * 60);
export const hasPin = h => h && isFinite(Number(h.lat)) && isFinite(Number(h.lon)) && h.lat !== null && h.lon !== null && h.lat !== '' && h.lon !== '';
/* drive minutes for a hotel: the routed figure when there is one, else the guess; null without a pin */
export function driveOf(h, home) {
  if (num(h.drive) > 0) return { min: num(h.drive), est: false };
  if (!hasPin(h) || !hasPin(home)) return null;
  return { min: driveGuess(km(home, { lat: Number(h.lat), lon: Number(h.lon) })), est: true };
}

/* filters: { status, grades: [..], pool, sauna, parking, dog, drive (max hours) } */
export function applyFilters(hotels, f, ctx) {
  return hotels.filter(h => {
    if (f.status && f.status !== 'all' && h.status !== f.status) return false;
    if (f.grades && f.grades.length) { const g = gradeOf(h, ctx.bands); if (!f.grades.includes(g)) return false; }
    for (const k of ['pool', 'sauna', 'parking', 'dog']) if (f[k] && !(h.has && h.has[k])) return false;
    if (num(f.drive) > 0) { const d = driveOf(h, ctx.home); if (!d || d.min > f.drive * 60) return false; }
    return true;
  });
}

/* the log in figures */
export function stats(hotels, bands, weights) {
  const st = hotels.filter(h => h.status === 'stayed');
  let nights = 0, spent = 0, memNights = 0, memStays = 0, rated = 0;
  for (const h of st) {
    const n = Math.max(0, num(h.nights)), p = Math.max(0, num(h.paid)), e = experience(h, weights);
    nights += n; spent += n * p;
    if (e !== null) { rated++; if (e >= MEMORABLE) { memNights += n; memStays++; } }
  }
  return { stays: st.length, wishes: hotels.length - st.length, nights, spent, perNight: nights > 0 ? spent / nights : null, memNights, memStays, rated, perMemorable: memNights > 0 ? spent / memNights : null };
}
/* stays ranked by value for the grade, best first */
export function ranking(hotels, bands, weights) {
  return hotels.filter(h => h.status === 'stayed').map(h => ({ h, g: gradeOf(h, bands), e: experience(h, weights), v: valueOf(h, bands, weights) })).filter(x => x.v !== null).sort((a, b) => b.v - a.v);
}
/* bands must rise; returns a cleaned copy or null */
export function cleanBands(b) {
  const v = (b || []).map(x => Math.round(num(x))); if (v.length !== 4) return null;
  for (let i = 0; i < 4; i++) if (!(v[i] > 0) || (i && v[i] <= v[i - 1])) return null;
  return v;
}
export const fmtDrive = min => { const h = Math.floor(min / 60), m = Math.round(min % 60 / 5) * 5; return m === 60 ? `${h + 1} h` : h ? `${h} h${m ? ' ' + String(m).padStart(2, '0') : ''}` : `${m} min`; };
