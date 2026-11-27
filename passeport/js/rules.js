/* Passeport — the rules that read the guide: distances, which places are closed on a given day, which events are on,
   what to do now, and search. No DOM here, so all of it is checked by the tests. */

export const hav = (aLat, aLon, bLat, bLon) => {
  const R = 6371000, r = Math.PI / 180, dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
};
/* Walking minutes for a straight-line distance: streets add about a third, people walk about 80 m a minute in town. */
export const walkMin = m => Math.max(1, Math.round(m * 1.3 / 80));

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/* weekday (0 = Sunday) of a "YYYY-MM-DD" day */
export const dow = day => new Date(day + 'T12:00:00Z').getUTCDay();
const dayIdx = w => { w = w.toLowerCase(); const i = SHORT.indexOf(w.slice(0, 3)); return i; };

/* Is a spot closed on a calendar day? Reads the "closed" field of the guide.
   Returns { s: 'closed' | 'open' | 'maybe' | 'unknown', why } where why is a short code for the interface. */
export function closedOn(spot, day) {
  const st = spot.st || 'Open';
  if (/^closed/i.test(st)) {
    if (/season/i.test(st) && spot.closed) { const m = +day.slice(5, 7); const season = /nov.?–?.?mar/i.test(spot.closed); if (season && (m >= 11 || m <= 3)) return { s: 'closed', why: 'season' }; if (season) return { s: 'open', why: '' }; }
    return { s: 'closed', why: 'works' };
  }
  const txt = (spot.closed || '').toLowerCase();
  const w = dow(day), md = `${+day.slice(8, 10)} ${MONTHS[+day.slice(5, 7) - 1]}`;
  if (!txt) return (md === '25 dec' || md === '1 jan') && ['MU', 'CH', 'SH'].includes(spot.c) ? { s: 'maybe', why: 'holiday' } : { s: 'unknown', why: '' };
  if (/open (every day|daily)/.test(txt)) return { s: 'open', why: '' };
  // public holidays named in the text
  for (const h of ['25 dec', '1 jan', '1 may']) if (txt.includes(h) && md === h && !/early close/.test(txt.split(h)[0].slice(-14))) return { s: 'closed', why: 'holiday' };
  // "Monday–Saturday (Sunday only)", "Open Thu & Sun mornings only": open only on the days named after "open"/"only"
  if (/sunday only/.test(txt)) return w === 0 ? { s: 'open', why: '' } : { s: 'closed', why: 'weekday' };
  const only = txt.match(/open ([a-z&,\s]+?) (?:mornings )?only/);
  if (only) { const ok = only[1].split(/[&,\s]+/).map(dayIdx).filter(i => i >= 0); return ok.includes(w) ? { s: 'open', why: 'morning' } : { s: 'closed', why: 'weekday' }; }
  // "Closed Nov–Mar"
  const season = txt.match(/closed (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*[–-]\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
  if (season) { const a = MONTHS.indexOf(season[1]), b = MONTHS.indexOf(season[2]), m = +day.slice(5, 7) - 1; const inside = a <= b ? m >= a && m <= b : m >= a || m <= b; return inside ? { s: 'closed', why: 'season' } : { s: 'open', why: '' }; }
  if (/winter/.test(txt)) { const m = +day.slice(5, 7); if (m >= 11 || m <= 2) return { s: 'maybe', why: 'winter' }; }
  // weekday ranges such as "Tue–Fri" and "Fri evening–Sat"
  const range = txt.match(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*(?: evening)?\s*[–-]\s*(mon|tue|wed|thu|fri|sat|sun)/);
  if (range) {
    const a = dayIdx(range[1]), b = dayIdx(range[2]);
    const evening = /evening/.test(txt.slice(range.index, range.index + 20));
    const inRange = a <= b ? w >= a && w <= b : w >= a || w <= b;
    if (inRange && !(evening && w === a)) return { s: 'closed', why: 'weekday' };
    if (evening && w === a) return { s: 'maybe', why: 'evening' };
    return { s: 'open', why: '' };
  }
  if (/weekends?/.test(txt) && (w === 0 || w === 6)) return { s: 'closed', why: 'weekday' };
  // plain weekday names: "Mondays", "Mondays and Tuesdays", "Fridays …"
  for (let i = 0; i < 7; i++) if (new RegExp('\\b' + DAYS[i] + 's?\\b').test(txt) && i === w) return { s: 'closed', why: 'weekday' };
  return { s: 'open', why: '' };
}

/* Events running on a day (start ≤ day ≤ end; a missing start means "already running", a missing end "still running"). */
export function eventsOn(events, day) {
  return events.filter(e => (e.s || e.e) && (!e.s || e.s <= day) && (!e.e || e.e >= day));
}
export function eventSpots(events, day) {
  const m = new Map();
  for (const e of eventsOn(events, day)) if (e.spot && !['Closure', 'Practical', 'Exhibition', 'Free day'].includes(e.t)) { const l = m.get(e.spot) || []; l.push(e); m.set(e.spot, l); }
  return m;
}

const NIGHT_TAGS = /night|lights|christmas|view|late|jazz|cocktail|cabaret|sparkle/i;
/* Suggestions for right now. ctx: { day, night, pos: {lat, lon} | null, mine: {id: 'must'|'want'}, visits: {id: …}, live: Map(spotId → events) }
   Returns spots with a score and the main reason, best first. */
export function suggest(spots, ctx, n = 6) {
  const out = [];
  for (const s of spots) {
    if (/^closed/i.test(s.st || '')) continue;
    const c = closedOn(s, ctx.day); if (c.s === 'closed') continue;
    if (ctx.visits && ctx.visits[s.id]) continue;
    let sc = s.i * 2.2, why = s.i >= 5 ? 'icon' : s.i >= 4 ? 'major' : 'good';
    const mine = ctx.mine && ctx.mine[s.id];
    if (mine === 'must') { sc += 4; why = 'must'; } else if (mine === 'want') { sc += 2; why = 'want'; }
    const live = ctx.live && ctx.live.get(s.id);
    if (live) { sc += 1.6; if (why !== 'must') why = 'live'; }
    const nightish = s.c === 'NO' || (s.tags || []).some(t => NIGHT_TAGS.test(t));
    if (ctx.night) { if (nightish) sc += 1.5; if (s.c === 'PK' || s.c === 'MU' || s.c === 'CH') sc -= 3; if (s.io === 'Outdoor' && !nightish) sc -= 1; }
    else if (s.c === 'NO' && !(s.tags || []).some(t => /brunch|cinema/i.test(t))) sc -= 2;
    if (ctx.rain && s.io === 'Outdoor') sc -= 2.5;
    let d = null;
    if (ctx.pos) {
      d = hav(ctx.pos.lat, ctx.pos.lon, s.lat, s.lon);
      if (d > 30000 && s.z !== 'P') continue;           // day trips are not "now" unless you are there
      sc -= Math.min(7, d / 1000 * 0.9);
      if (d < 700 && why !== 'must' && why !== 'live') why = 'near';
    } else if (s.z === 'LT' || s.z === 'DT') continue;
    if (c.s === 'maybe') sc -= 1.5;
    out.push({ s, sc, why, d });
  }
  out.sort((a, b) => b.sc - a.sc);
  return out.slice(0, n);
}

/* Accent- and case-insensitive search over names, areas, categories and tags. Names count most. */
export const fold = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[’']/g, ' ');
export function search(spots, q, catName = c => c, n = 30) {
  const words = fold(q).split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return [];
  const res = [];
  for (const s of spots) {
    const name = fold([s.n, s.en, s.nf].filter(Boolean).join(' ')), rest = fold([s.a, catName(s.c), ...(s.tags || []), s.why].join(' '));
    let sc = 0, ok = true;
    for (const w of words) {
      if (new RegExp('\\b' + w).test(name)) sc += 10;
      else if (name.includes(w)) sc += 6;
      else if (new RegExp('\\b' + w).test(rest)) sc += 2;
      else { ok = false; break; }
    }
    if (ok) res.push({ s, sc: sc + s.i * 0.6 });
  }
  return res.sort((a, b) => b.sc - a.sc).slice(0, n).map(r => r.s);
}

/* Car parks of a spot, nearest first, with walking minutes. pkIndex: Map(id → car park) */
export const parksFor = (spot, pkIndex) => (spot.pk || []).map(([id, m]) => ({ ...pkIndex.get(id), m, walk: walkMin(m) })).filter(p => p.id);
