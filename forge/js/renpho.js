/* Forge — Renpho smart-scale CSV import and the rule that decides which source feeds each daily value.

   Source rule (when the body source is Renpho):
   - Weight and body fat: the Renpho reading of that day. A value typed in Forge fills a day without a reading.
     Apple Health weight/body fat are ignored from the first Renpho day on (before it, they are kept as history).
   - Everything else (steps, calories, macros, resting HR, HRV, VO2max, workouts): typed in Forge, else Apple Health.
   - Renpho-only values (muscle, water, bone, protein, visceral and subcutaneous fat, BMR, metabolic age…) are
     read from the Renpho rows directly.
   Nothing is deleted: the merge happens when the app reads the data, so switching source is lossless. */

export const BODY_FIELDS = ['w', 'bf'];
const LB = 0.45359237;

/* Column matchers on the lower-cased header (English export; a few French/German terms as fallback). */
const COLS = [
  ['date', /^(date|datum|fecha)\b/],
  ['time', /^(time|heure|zeit|uhrzeit|hora)\b/],
  ['w', /^(weight|poids|gewicht|peso)\s*\(/],
  ['bmi', /^(bmi|imc)\b/],
  ['bf', /^(body fat percentage|body fat\s*\(%\)|masse grasse\s*\(%\)|taux de graisse|körperfett(anteil)?\s*\(%\))/],
  ['fm', /^(body fat mass|masse grasse\s*\((kg|lb)\)|fettmasse)/],
  ['smPct', /^skeletal muscle percentage/],
  ['sm', /^skeletal muscle mass/],
  ['musPct', /^muscle percentage/],
  ['mus', /^(muscle mass|masse musculaire|muskelmasse)/],
  ['bonePct', /^bone percentage/],
  ['bone', /^(bone mass|masse osseuse|knochenmasse)/],
  ['protPct', /^protein percentage/],
  ['prot', /^protein mass/],
  ['waterPct', /^(body water percentage|eau corporelle|körperwasser)/],
  ['water', /^body water mass/],
  ['ffm', /^(fat-free mass|fat free mass|lean body mass|masse maigre|fettfreie masse)/],
  ['subq', /^(subcutaneous fat|graisse sous-cutanée|unterhautfett)/],
  ['vis', /^(visceral fat|graisse viscérale|viszeralfett)/],
  ['bmr', /^(bmr|métabolisme de base|grundumsatz)/],
  ['mage', /^(metabolic age|âge métabolique|stoffwechselalter)/],
  ['whr', /^whr/]
];
export const MASS_FIELDS = ['w', 'fm', 'sm', 'mus', 'bone', 'prot', 'water', 'ffm'];

function splitCsv(text, delim) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}
const num = s => {
  if (s == null) return null; let x = String(s).trim();
  if (!x || /^-+$/.test(x) || /^n\/?a$/i.test(x)) return null;
  if (x.includes(',')) x = x.replace(/\./g, '').replace(',', '.'); // decimal comma (semicolon-separated exports)
  const v = parseFloat(x.replace(/[^\d.\-]/g, '')); return isFinite(v) ? v : null;
};
function parseDates(cells) {
  const iso = cells.map(c => String(c).trim().match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/));
  if (iso.every(Boolean)) return iso.map(m => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`);
  const dmy = cells.map(c => String(c).trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/));
  if (!dmy.every(Boolean)) return null;
  const monthFirst = dmy.some(m => +m[2] > 12) && !dmy.some(m => +m[1] > 12);
  return dmy.map(m => { const y = m[3].length === 2 ? '20' + m[3] : m[3]; const [d, mo] = monthFirst ? [m[2], m[1]] : [m[1], m[2]]; return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`; });
}
const minutes = s => {
  const m = String(s || '').match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]m)?/i); if (!m) return 0;
  let h = +m[1]; const ap = (m[4] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
  return h * 60 + +m[2] + (+m[3] || 0) / 60;
};

/* Returns { rows: { 'YYYY-MM-DD': {...} }, first, last, readings, dupes, heightCm, unit, columns } or throws. */
export function parseRenphoCsv(text) {
  text = String(text || '').replace(/^﻿/, '');
  const head = text.split(/\r?\n/, 1)[0] || '';
  const delim = [',', ';', '\t'].map(d => [d, head.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const table = splitCsv(text, delim);
  if (table.length < 2) throw Object.assign(new Error('empty'), { code: 'empty' });
  const hdr = table[0].map(h => h.trim().toLowerCase().replace(/\s+/g, ' '));
  const idx = {}, unitOf = {};
  hdr.forEach((h, i) => { const hit = COLS.find(([k, re]) => idx[k] == null && re.test(h)); if (hit) { idx[hit[0]] = i; unitOf[hit[0]] = (h.match(/\((kg|lb|lbs|st[^)]*|%|kcal)\)/) || [])[1] || ''; } });
  if (idx.date == null || idx.w == null) throw Object.assign(new Error('columns'), { code: 'columns' });
  if (/^st/.test(unitOf.w)) throw Object.assign(new Error('stone'), { code: 'stone' });
  const body = table.slice(1).filter(r => (r[idx.date] || '').trim());
  const dates = parseDates(body.map(r => r[idx.date]));
  if (!dates) throw Object.assign(new Error('dates'), { code: 'dates' });
  const rows = {}; let readings = 0, dupes = 0; const heights = [];
  body.forEach((r, i) => {
    const o = {};
    for (const [k] of COLS) if (k !== 'date' && k !== 'time' && idx[k] != null) {
      let v = num(r[idx[k]]); if (v == null) continue;
      if (MASS_FIELDS.includes(k) && /^lb/.test(unitOf[k])) v = Math.round(v * LB * 100) / 100;
      o[k] = v;
    }
    if (!(o.w > 20 && o.w < 400)) return;
    readings++;
    if (o.bmi > 10) heights.push(Math.sqrt(o.w / o.bmi) * 100);
    const t = idx.time != null ? String(r[idx.time]).trim() : '', d = dates[i];
    o.t = t;
    const prev = rows[d];
    if (prev) { dupes++; o.n = (prev.n || 1) + 1; if (minutes(t) >= minutes(prev.t)) { prev.n = o.n; return; } } // earliest reading of the day wins
    rows[d] = o;
  });
  const keys = Object.keys(rows).sort();
  if (!keys.length) throw Object.assign(new Error('norows'), { code: 'norows' });
  heights.sort((a, b) => a - b);
  return { rows, first: keys[0], last: keys[keys.length - 1], readings, days: keys.length, dupes, heightCm: heights.length ? heights[heights.length >> 1] : null, unit: /^lb/.test(unitOf.w) ? 'lb' : 'kg', columns: Object.keys(idx) };
}

/* New file replaces the stored readings inside the period it covers (so readings deleted in Renpho disappear),
   readings outside that period are kept. */
export function mergeRenpho(stored, parsed) {
  const rows = {};
  for (const [d, v] of Object.entries(stored?.rows || {})) if (d < parsed.first || d > parsed.last) rows[d] = v;
  Object.assign(rows, parsed.rows);
  return rows;
}

export function bodySource(S) {
  const m = S.body?.source || 'auto';
  if (m === 'renpho' || m === 'health') return m;
  return Object.keys(S.renpho?.rows || {}).length ? 'renpho' : 'health';
}

/* Daily view used by every calculation. Each day gets `_s`: the source of each field (renpho | manual | health). */
export function mergeLogs(logs, renpho, mode) {
  const rows = mode === 'renpho' ? (renpho?.rows || {}) : {};
  const first = Object.keys(rows).sort()[0] || null;
  const out = {};
  for (const d of new Set([...Object.keys(logs || {}), ...Object.keys(rows)])) {
    const raw = logs?.[d] || {}, man = raw.m || [], v = {}, s = {};
    for (const [k, x] of Object.entries(raw)) if (k !== 'm' && x != null && x !== '') { v[k] = x; s[k] = man.includes(k) ? 'manual' : 'health'; }
    if (first) {
      const r = rows[d];
      for (const k of BODY_FIELDS) {
        if (r && r[k] != null) { v[k] = r[k]; s[k] = 'renpho'; }
        else if (s[k] === 'health' && d >= first) { delete v[k]; delete s[k]; }
      }
    }
    if (Object.keys(v).length) out[d] = { ...v, _s: s };
  }
  return out;
}

const pearson = (a, b) => {
  const n = a.length; if (n < 3) return null;
  const ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : null;
};
const slope = (x, y) => { const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; } return sxx ? sxy / sxx : null; };
const dn = s => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5);

/* Latest reading, change against the reading closest to 4 weeks earlier, and how closely the scale's fat estimate
   follows weight over the last 90 days. */
export function renphoStats(rows) {
  const keys = Object.keys(rows || {}).sort(); if (!keys.length) return null;
  const last = keys[keys.length - 1], L = rows[last];
  let ref = null, best = 1e9;
  for (const d of keys) { const gap = Math.abs(dn(last) - dn(d) - 28); if (dn(d) < dn(last) - 14 && gap < best && gap <= 10) { best = gap; ref = d; } }
  const recent = keys.filter(d => dn(d) >= dn(last) - 90 && rows[d].w && rows[d].fm != null && rows[d].bf != null);
  const W = recent.map(d => rows[d].w);
  return {
    last, latest: L, ref, prev: ref ? rows[ref] : null, n: recent.length,
    rWeightFat: recent.length >= 8 ? pearson(W, recent.map(d => rows[d].bf)) : null,
    fatPerKg: recent.length >= 8 ? slope(W, recent.map(d => rows[d].fm)) : null,
    lostSplit: recent.length >= 8 && recent.every(d => rows[d].ffm != null) ? slope(W, recent.map(d => rows[d].ffm)) : null
  };
}
