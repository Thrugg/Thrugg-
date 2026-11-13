/* Nocturne — Apple Health import (export.zip, or the export.xml inside it). Read on the device; nothing is uploaded.
   Same approach as Forge's Health import (forge/js/health.js): the file is read in slices and unzipped as a stream,
   so an export of several gigabytes never sits in memory. Only the sleep records are looked at. */
import { buildNight, addDays, iso } from './sleep.js';

const NEEDLE = 'HKCategoryTypeIdentifierSleepAnalysis', STEP = 2 * 1024 * 1024;
const attr = (l, k) => { const i = l.indexOf(' ' + k + '="'); if (i < 0) return null; const s = i + k.length + 3; return l.slice(s, l.indexOf('"', s)); };
const unesc = s => s == null ? s : s.replace(/&apos;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
/* "2026-10-29 23:41:07 +0100" → { t: epoch seconds, o: offset seconds } */
export function hkTime(s) {
  if (!s || s.length < 25) return null;
  const o = (s[20] === '-' ? -1 : 1) * (+s.slice(21, 23) * 3600 + +s.slice(23, 25) * 60);
  const t = Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16), +s.slice(17, 19)) / 1000 - o;
  return Number.isFinite(t) ? { t, o } : null;
}
/* value="HKCategoryValueSleepAnalysisAsleepCore" (or the bare number in some exports) → what the sample says */
const NUM = { 0: 'InBed', 1: 'Asleep', 2: 'Awake', 3: 'AsleepCore', 4: 'AsleepDeep', 5: 'AsleepREM' };
function kind(v) {
  if (v == null) return null; if (NUM[v]) v = NUM[v];
  if (v.endsWith('InBed')) return ['ib', 0];
  if (v.endsWith('Awake')) return ['aw', 0];
  if (v.endsWith('AsleepCore')) return ['as', 1];
  if (v.endsWith('AsleepDeep')) return ['as', 2];
  if (v.endsWith('AsleepREM')) return ['as', 3];
  if (v.includes('Asleep')) return ['as', 0];
  return null;
}

export class SleepAccumulator {
  /* since: ignore nights before this date (keeps memory and storage small on a ten-year export) */
  constructor({ since = null } = {}) { this.since = since; this.raw = new Map(); this.records = 0; this.zones = {}; }
  /* text is made of whole lines */
  scan(text) {
    let i = 0;
    while ((i = text.indexOf(NEEDLE, i)) >= 0) {
      const a = text.lastIndexOf('<Record', i), b = text.indexOf('>', i);
      if (a < 0 || b < 0 || text.indexOf('>', a) !== b) { i += NEEDLE.length; continue; }
      let tz = null;
      if (text[b - 1] !== '/') { const c = text.indexOf('</Record>', b); if (c > 0 && c - b < 800) { const m = text.slice(b, c), k = m.indexOf('key="HKTimeZone"'); if (k >= 0) tz = attr(m.slice(k - 1), 'value'); } }
      this.add(text.slice(a, b + 1), tz); i = b;
    }
  }
  add(tag, tz) {
    if (attr(tag, 'type') !== NEEDLE) return;
    const k = kind(attr(tag, 'value')), s = hkTime(attr(tag, 'startDate')), e = hkTime(attr(tag, 'endDate'));
    if (!k || !s || !e || e.t <= s.t || e.t - s.t > 20 * 3600) return;
    const date = iso((s.t + s.o + 6 * 3600) * 1000);            // 18:00 or later belongs to the next morning's night
    if (this.since && date < this.since) return;
    this.records++;
    let n = this.raw.get(date); if (!n) this.raw.set(date, n = { o: s.o, src: {}, tzs: {} });
    const name = unesc(attr(tag, 'sourceName')) || '?';
    const src = n.src[name] ||= { as: [], aw: [], ib: [] };
    src[k[0]].push(k[0] === 'as' ? [s.t, e.t, k[1]] : [s.t, e.t]);
    if (tz) { n.tzs[tz] = (n.tzs[tz] || 0) + 1; this.zones[tz] = (this.zones[tz] || 0) + 1; }
  }
  result() {
    const nights = {}, sources = {}; let bedOnly = 0;
    const home = Object.entries(this.zones).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    for (const [date, raw] of this.raw) {
      const tz = Object.entries(raw.tzs).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const n = buildNight(date, { o: raw.o, src: raw.src, tz: tz && home && tz !== home ? tz : null });
      if (n.bedOnly) { bedOnly++; continue; }
      nights[date] = n; sources[n.src] = (sources[n.src] || 0) + 1;
    }
    const dates = Object.keys(nights).sort();
    return { nights, stats: { records: this.records, n: dates.length, first: dates[0] || null, last: dates[dates.length - 1] || null, bedOnly, sources, home } };
  }
}

const loadFflate = () => window.fflate ? Promise.resolve(window.fflate) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/fflate.min.js'; s.onload = () => res(window.fflate); s.onerror = () => rej(new Error('zip library')); document.head.appendChild(s); });

/* Reads a File (export.zip or export.xml) in 256 KB slices. onProgress(fraction, recordsSoFar). */
export async function readHealthFile(file, { since = null, onProgress, fflate, slice = 256 * 1024 } = {}) {
  const acc = new SleepAccumulator({ since });
  const size = file.size, isZip = /\.zip$/i.test(file.name || '') || (await file.slice(0, 2).text()) === 'PK';
  let found = !isZip, unz = null, failed = null;
  const reader = () => { // one text stream per XML file in the archive
    const dec = new TextDecoder(); let rest = '';
    const part = (bytes, final) => { const text = rest + dec.decode(bytes, { stream: !final }); const cut = final ? text.length : text.lastIndexOf('\n') + 1; rest = text.slice(cut); if (cut) acc.scan(text.slice(0, cut)); };
    /* a slice of a well-compressed export can unzip to tens of megabytes: turn it into text 2 MB at a time */
    return (bytes, final) => { if (!bytes.length) return part(bytes, final); for (let i = 0; i < bytes.length; i += STEP) part(bytes.subarray(i, i + STEP), final && i + STEP >= bytes.length); };
  };
  if (isZip) {
    const F = fflate || await loadFflate();
    unz = new F.Unzip(); unz.register(F.UnzipInflate);
    /* The Health app names the file export.xml (exportation.xml on a French iPhone, and so on). Any XML at the top of
       the archive is read, except the clinical-document copy (export_cda.xml), which holds no sleep records. */
    unz.onfile = f => {
      if (!/^[^/]*\/?[^/]+\.xml$/i.test(f.name) || /cda/i.test(f.name)) return;
      found = true; const feed = reader();
      f.ondata = (err, chunk, final) => { if (err) { failed = err; return; } feed(chunk, final); };
      f.start();
    };
  }
  const feedXml = isZip ? null : reader();
  for (let off = 0; off < size; off += slice) {
    const buf = new Uint8Array(await file.slice(off, Math.min(size, off + slice)).arrayBuffer());
    const last = off + slice >= size;
    if (isZip) unz.push(buf, last); else feedXml(buf, last);
    if (failed) throw failed;
    onProgress && onProgress(Math.min(1, (off + slice) / size), acc.records);
    await new Promise(r => setTimeout(r, 0));
  }
  if (!found) throw Object.assign(new Error('noExport'), { code: 'noExport' });
  const res = acc.result();
  if (!res.stats.records) throw Object.assign(new Error('noSleep'), { code: 'noSleep' });
  return res;
}

/* Put an import into what is already stored. Nights are keyed by date, so importing the same export twice changes
   nothing and a weekly import only adds the new nights (and completes a night that was cut off last time).
   Nights that are not in the new file are kept. Tags are never touched. */
export function mergeNights(have, got) {
  const out = { ...have }; let added = 0, updated = 0, same = 0;
  for (const [d, n] of Object.entries(got)) {
    if (!have[d] || have[d].demo) added++; else if (JSON.stringify(have[d]) === JSON.stringify(n)) same++; else updated++;
    out[d] = n;
  }
  return { nights: out, added, updated, same };
}
export const sinceDate = (today, months = 24) => addDays(today, -Math.round(months * 30.44));
