/* Forge — Apple Health import: the Shortcut text payload and the Health app's export.zip / export.xml.
   Parsing happens on the device; nothing is uploaded. */
import { HK_MAP } from './data.js';

/* ---------- loose number/date parsing for Shortcut text ---------- */
export function num(s, integer) {
  if (s == null) return NaN;
  let x = String(s).replace(/[^\d,.\-]/g, '');
  if (!x) return NaN;
  if (integer) return parseInt(x.replace(/[.,]/g, ''), 10);
  if (x.includes(',') && x.includes('.')) x = x.lastIndexOf(',') > x.lastIndexOf('.') ? x.replace(/\./g, '').replace(',', '.') : x.replace(/,/g, '');
  else if (x.includes(',')) x = x.replace(',', '.');
  return parseFloat(x);
}
const MONTHS = { jan: 1, janv: 1, feb: 2, fev: 2, 'fév': 2, fevr: 2, 'févr': 2, mar: 3, mars: 3, apr: 4, avr: 4, may: 5, mai: 5, jun: 6, juin: 6, jul: 7, juil: 7, aug: 8, aou: 8, 'aoû': 8, aout: 8, 'août': 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12, 'déc': 12 };
export function looseDate(s, dayFirst = true) {
  if (!s) return null; s = String(s).trim();
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: m[4] ? +m[4] * 60 + +m[5] : 0 };
  const time = (s.match(/(\d{1,2})[:h](\d{2})/) || []).slice(1).map(Number); const tm = time.length ? time[0] * 60 + time[1] : 0;
  m = s.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (m) { let [, a, b, y] = m; y = y.length === 2 ? '20' + y : y; const [d, mo] = dayFirst ? [a, b] : [b, a]; return { date: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`, time: tm }; }
  m = s.toLowerCase().match(/(\d{1,2})\.?\s+([a-zéû]+)\.?\s+(\d{4})/) || s.toLowerCase().match(/([a-zéû]+)\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) { const isDayFirst = /^\d/.test(m[1]); const d = isDayFirst ? m[1] : m[2], mo = MONTHS[(isDayFirst ? m[2] : m[1]).slice(0, 4)] || MONTHS[(isDayFirst ? m[2] : m[1]).slice(0, 3)]; if (mo) return { date: `${m[3]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`, time: tm }; }
  return null;
}

/* Shortcut payload: FORGE1, then sections "@name" followed by a block of dates and a block of values
   (the two blocks have equal length), or lines "date;value". Returns { days: {date: {...}} }. */
const FIELD = { steps: 'steps', kcal: 'kcal', protein: 'p', carbs: 'c', fat: 'f', weight: 'w', bf: 'bf', rhr: 'rhr', hrv: 'hrv', vo2: 'vo2' };
export function parseShortcut(text, dayFirst = true) {
  if (!/FORGE1/i.test(text || '')) throw new Error('not a Forge Shortcut payload');
  const days = {}; const sections = text.split(/^\s*@/m).slice(1);
  for (const sec of sections) {
    const lines = sec.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const name = lines.shift().toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^(steps|kcal|protein|carbs|fat|weight|bf|rhr|hrv|vo2).*/, '$1');
    const field = FIELD[name]; if (!field) continue;
    let pairs = [];
    if (lines.every(l => /[;\t]/.test(l))) pairs = lines.map(l => l.split(/[;\t]/));
    else { const dates = lines.filter(l => looseDate(l, dayFirst)), vals = lines.filter(l => !looseDate(l, dayFirst)); if (dates.length === vals.length) pairs = dates.map((d, i) => [d, vals[i]]); }
    for (const [ds, vs] of pairs) {
      const d = looseDate(ds, dayFirst);
      const grouped = /^\s*\d{1,3}([.,\u202f ]\d{3})+(?![\d.,])/.test(vs); // "3.050" or "3 050" kcal = thousands
      let v = num(vs, field === 'steps' || (field === 'kcal' && grouped));
      if (!d || !isFinite(v)) continue;
      if (field === 'bf' && v <= 1) v *= 100;
      const day = days[d.date] ||= {};
      if (field === 'w' || field === 'bf') { if (day['_' + field] == null || d.time < day['_' + field]) { day[field] = v; day['_' + field] = d.time; } }
      else day[field] = v;
    }
  }
  for (const d of Object.values(days)) { delete d._w; delete d._bf; }
  return { days, workouts: [] };
}

/* ---------- export.xml streaming accumulator ---------- */
const TYPES = {
  HKQuantityTypeIdentifierStepCount: 'steps', HKQuantityTypeIdentifierDietaryEnergyConsumed: 'kcal', HKQuantityTypeIdentifierDietaryProtein: 'p',
  HKQuantityTypeIdentifierDietaryCarbohydrates: 'c', HKQuantityTypeIdentifierDietaryFatTotal: 'f', HKQuantityTypeIdentifierBodyMass: 'w',
  HKQuantityTypeIdentifierBodyFatPercentage: 'bf', HKQuantityTypeIdentifierRestingHeartRate: 'rhr', HKQuantityTypeIdentifierHeartRateVariabilitySDNN: 'hrv', HKQuantityTypeIdentifierVO2Max: 'vo2'
};
const attr = (l, k) => { const i = l.indexOf(' ' + k + '="'); if (i < 0) return null; const s = i + k.length + 3; return l.slice(s, l.indexOf('"', s)); };
export class HealthAccumulator {
  constructor(days = 180, now = new Date()) { const c = new Date(now.getTime() - days * 864e5); this.cut = c.toISOString().slice(0, 10); this.sum = {}; this.first = {}; this.avg = {}; this.last = {}; this.workouts = []; this.wo = null; }
  line(l) {
    if (this.wo) {
      if (l.includes('<WorkoutStatistics')) {
        const ty = attr(l, 'type');
        if (ty?.endsWith('HeartRate')) this.wo.hr = +attr(l, 'average') || this.wo.hr;
        else if (ty?.endsWith('ActiveEnergyBurned')) this.wo.kcal = this.energy(+attr(l, 'sum'), attr(l, 'unit')) || this.wo.kcal;
        else if (ty?.includes('Distance')) { const u = attr(l, 'unit'); const v = +attr(l, 'sum'); if (v) this.wo.km = u === 'mi' ? v * 1.609344 : u === 'm' ? v / 1000 : v; }
      } else if (l.includes('</Workout>')) { this.workouts.push(this.wo); this.wo = null; }
      return;
    }
    if (l.includes('<Record type="HKQuantityTypeIdentifier')) {
      const f = TYPES[attr(l, 'type')]; if (!f) return;
      const sd = attr(l, 'startDate'); if (!sd || sd.slice(0, 10) < this.cut) return;
      const date = sd.slice(0, 10), time = sd.slice(11, 19), unit = attr(l, 'unit'); let v = parseFloat(attr(l, 'value')); if (!isFinite(v)) return;
      if (f === 'kcal') v = this.energy(v, unit);
      if (f === 'w' && unit === 'lb') v *= 0.45359237;
      if (f === 'bf' && v <= 1) v *= 100;
      if (f === 'steps' || f === 'kcal' || f === 'p' || f === 'c' || f === 'f') { const src = attr(l, 'sourceName') || '?'; const k = date + '|' + f; (this.sum[k] ||= {}); this.sum[k][src] = (this.sum[k][src] || 0) + v; }
      else if (f === 'w' || f === 'bf') { const k = date + '|' + f; if (!this.first[k] || time < this.first[k].t) this.first[k] = { t: time, v }; }
      else if (f === 'vo2') { const k = date + '|' + f; this.last[k] = v; }
      else { const k = date + '|' + f; const a = this.avg[k] ||= { s: 0, n: 0 }; a.s += v; a.n++; }
      return;
    }
    if (l.includes('<Workout ')) {
      const sd = attr(l, 'startDate'); if (!sd || sd.slice(0, 10) < this.cut) return;
      const type = (attr(l, 'workoutActivityType') || '').replace('HKWorkoutActivityType', '');
      let min = +attr(l, 'duration'); const du = attr(l, 'durationUnit'); if (du === 's') min /= 60; if (du === 'h') min *= 60;
      const td = +attr(l, 'totalDistance'), tu = attr(l, 'totalDistanceUnit');
      this.wo = { date: sd.slice(0, 10), hk: type, type: HK_MAP[type] || 'other', minutes: min || 0, kcal: this.energy(+attr(l, 'totalEnergyBurned'), attr(l, 'totalEnergyBurnedUnit')) || null, km: td ? (tu === 'mi' ? td * 1.609344 : tu === 'm' ? td / 1000 : td) : null, hr: null };
      if (l.trim().endsWith('/>')) { this.workouts.push(this.wo); this.wo = null; }
    }
  }
  energy(v, u) { if (!isFinite(v)) return null; return u === 'kJ' ? v / 4.184 : v; }
  result() {
    const days = {}; const put = (k, v) => { const [d, f] = k.split('|'); (days[d] ||= {})[f] = Math.round(v * 10) / 10; };
    for (const [k, src] of Object.entries(this.sum)) put(k, Math.max(...Object.values(src))); // overlapping sources (watch + phone): keep the largest
    for (const [k, x] of Object.entries(this.first)) put(k, x.v);
    for (const [k, a] of Object.entries(this.avg)) put(k, a.s / a.n);
    for (const [k, v] of Object.entries(this.last)) put(k, v);
    return { days, workouts: this.workouts };
  }
}

const loadFflate = () => window.fflate ? Promise.resolve(window.fflate) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/fflate.min.js'; s.onload = () => res(window.fflate); s.onerror = () => rej(new Error('zip library')); document.head.appendChild(s); });

/* Reads a File (export.zip or export.xml) in 4 MB slices so a multi-GB export never sits in memory. */
export async function readHealthFile(file, { days = 180, onProgress, fflate } = {}) {
  const acc = new HealthAccumulator(days); const dec = new TextDecoder(); let rest = '';
  const feed = (bytes, final) => { const text = rest + dec.decode(bytes, { stream: !final }); const lines = text.split('\n'); rest = final ? '' : lines.pop(); for (const l of lines) acc.line(l); if (final && rest) acc.line(rest); };
  const CH = 4 * 1024 * 1024, size = file.size, isZip = /\.zip$/i.test(file.name || '') || (await file.slice(0, 2).text()) === 'PK';
  let found = !isZip, unz = null;
  if (isZip) {
    const F = fflate || await loadFflate();
    unz = new F.Unzip(); unz.register(F.UnzipInflate);
    unz.onfile = f => { if (/(^|\/)export\.xml$/i.test(f.name)) { found = true; f.ondata = (err, chunk, final) => { if (err) throw err; feed(chunk, final); }; f.start(); } };
  }
  for (let off = 0; off < size; off += CH) {
    const buf = new Uint8Array(await file.slice(off, Math.min(size, off + CH)).arrayBuffer());
    const last = off + CH >= size;
    if (isZip) unz.push(buf, last); else feed(buf, last);
    onProgress && onProgress(Math.min(1, (off + CH) / size));
    await new Promise(r => setTimeout(r, 0));
  }
  if (!found) { const e = new Error('noExport'); e.code = 'noExport'; throw e; }
  return acc.result();
}

/* Summaries used to offer profile updates after an import. */
export function summarise(res, age) {
  const dates = Object.keys(res.days).sort(); const end = dates[dates.length - 1];
  const since = end ? new Date(new Date(end + 'T12:00:00').getTime() - 27 * 864e5).toISOString().slice(0, 10) : null;
  const steps = dates.filter(d => d >= since && res.days[d].steps > 0).map(d => res.days[d].steps);
  const stepsAvg = steps.length >= 14 ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : null;
  const recent = res.workouts.filter(w => since && w.date >= since && w.minutes > 0);
  const hrMax = 208 - 0.7 * (age || 30);
  const groups = {};
  for (const w of recent) {
    const g = groups[w.type] ||= { type: w.type, n: 0, min: 0, hr: [], pace: [] }; g.n++; g.min += w.minutes;
    if (w.hr) g.hr.push(w.hr / hrMax);
    if (w.type === 'run' && w.km > 0) g.pace.push(w.km / (w.minutes / 60));
  }
  const workouts = Object.values(groups).map(g => {
    const hr = g.hr.length ? g.hr.reduce((a, b) => a + b, 0) / g.hr.length : null;
    const intensity = hr == null ? 'moderate' : hr < 0.64 ? 'light' : hr < 0.77 ? 'moderate' : hr < 0.9 ? 'vigorous' : 'very';
    const w = { type: g.type, minutes: Math.round(g.min / g.n), perWeek: Math.round(g.n / 4 * 10) / 10, intensity };
    if (g.pace.length) w.paceKmh = Math.round(g.pace.reduce((a, b) => a + b, 0) / g.pace.length * 10) / 10;
    return w;
  }).filter(w => w.perWeek >= 0.25);
  const vo2d = dates.filter(d => res.days[d].vo2).pop();
  return { stepsAvg, workouts, vo2: vo2d ? { date: vo2d, value: res.days[vo2d].vo2 } : null, nDays: dates.length, nWorkouts: res.workouts.length };
}
