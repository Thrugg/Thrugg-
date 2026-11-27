/* Passeport — trips: the days, "park once" for people who drive, warnings for closed places, navigation links,
   and sharing a plan or a list as a link (the data travels in the link itself, after the #, so no server ever sees it). */
import { hav, walkMin, closedOn } from './rules.js';

/* every "YYYY-MM-DD" from start to end, inclusive */
export function tripDays(start, end) {
  if (!start || !end || end < start) return [];
  const out = [], d = new Date(start + 'T12:00:00Z'), last = new Date(end + 'T12:00:00Z');
  for (let k = 0; d <= last && k < 60; k++) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}

const isGoodPark = p => p.k === 'underground' || p.k === 'multi-storey';
const isNamed = p => p.n && !/^(car park|underground car park)$/i.test(p.n);

/* Group a day's stops into walkable clusters (in visiting order) and pick, for each cluster, the car park that keeps the
   walking shortest: one parking for several sights. Returns [{ stops, lat, lon, park, walk: [minutes per stop] }]. */
export function parkOnce(stops, parks, radius = 1100) {
  const groups = [];
  for (const s of stops) {
    const g = groups[groups.length - 1], paris = s.z === 'P';
    if (g && g.paris === paris && hav(g.lat, g.lon, s.lat, s.lon) <= radius) {
      g.stops.push(s);
      g.lat = g.stops.reduce((a, x) => a + x.lat, 0) / g.stops.length;
      g.lon = g.stops.reduce((a, x) => a + x.lon, 0) / g.stops.length;
    } else groups.push({ stops: [s], lat: s.lat, lon: s.lon, paris });
  }
  for (const g of groups) {
    let best = null;
    for (const p of parks) {
      if (g.paris && p.a !== 'paris') continue;
      if (hav(g.lat, g.lon, p.lat, p.lon) > (g.paris ? 1200 : 2000)) continue;
      const cost = g.stops.reduce((a, s) => a + hav(p.lat, p.lon, s.lat, s.lon), 0) + (isGoodPark(p) || !g.paris ? 0 : 300) + (isNamed(p) ? 0 : 150);
      if (!best || cost < best.cost) best = { p, cost };
    }
    g.park = best ? best.p : null;
    g.walk = best ? g.stops.map(s => walkMin(hav(best.p.lat, best.p.lon, s.lat, s.lon))) : [];
  }
  return groups;
}

/* places of the day that are closed (or may be) on that date */
export const dayWarnings = (day, stops) => stops.map(s => ({ s, c: closedOn(s, day) })).filter(x => x.c.s === 'closed' || x.c.s === 'maybe');

/* Navigation apps. For a day by car, the route goes from car park to car park. */
export const nav = (lat, lon) => ({
  waze: `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`,
  google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`,
  apple: `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=d`
});
export function dayRoute(points, origin) {
  const p = points.filter(Boolean).slice(0, 10);
  if (!p.length) return null;
  const dest = p[p.length - 1], way = p.slice(0, -1);
  const q = new URLSearchParams({ api: '1', travelmode: 'driving', destination: `${dest.lat},${dest.lon}` });
  if (origin) q.set('origin', `${origin.lat},${origin.lon}`);
  if (way.length) q.set('waypoints', way.map(x => `${x.lat},${x.lon}`).join('|'));
  return 'https://www.google.com/maps/dir/?' + q.toString();
}

/* ---- Share links: compact JSON, deflated, base64url, after a # ---- */
const b64u = bytes => { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = str => { const s = str.replace(/-/g, '+').replace(/_/g, '/'); const pad = s + '='.repeat((4 - s.length % 4) % 4); const bin = atob(pad); return Uint8Array.from(bin, c => c.charCodeAt(0)); };
export async function pack(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream === 'function') {
    const z = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
    return 'z' + b64u(z);
  }
  return 'j' + b64u(bytes);
}
export async function unpack(str) {
  const kind = str[0], bytes = unb64u(str.slice(1));
  if (kind === 'z') return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text());
  if (kind === 'j') return JSON.parse(new TextDecoder().decode(bytes));
  throw new Error('Unknown link format');
}

/* A trip from a ready-made one in the guide (a copy, so editing it never touches the guide), with the person's own base. */
export function fromTemplate(tpl, base) {
  const days = {};
  for (const [d, v] of Object.entries(tpl.days || {})) days[d] = { t: v.t || '', note: v.note || '', stops: [...(v.stops || [])] };
  return { start: tpl.start, end: tpl.end, base: base || null, days };
}

/* What a shared link may carry, checked before anything is merged: a trip and/or a list of spot ids, or the name of a
   ready-made trip with a base. */
export function cleanShare(x, knownIds) {
  if (!x || typeof x !== 'object') throw new Error('Empty link');
  const ok = id => typeof id === 'string' && knownIds.has(id);
  const out = {};
  if (x.mine && typeof x.mine === 'object') { out.mine = {}; for (const [id, v] of Object.entries(x.mine)) if (ok(id) && (v === 'must' || v === 'want')) out.mine[id] = v; }
  if (x.trip && typeof x.trip === 'object') {
    const t = x.trip, day = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
    if (day(t.start) && day(t.end) && t.end >= t.start) {
      out.trip = { start: t.start, end: t.end, days: {} };
      if (t.base && Number.isFinite(t.base.lat) && Number.isFinite(t.base.lon)) out.trip.base = { n: String(t.base.n || '').slice(0, 60), lat: t.base.lat, lon: t.base.lon };
      for (const [d, v] of Object.entries(t.days || {})) if (day(d) && v && typeof v === 'object')
        out.trip.days[d] = { t: String(v.t || '').slice(0, 80), note: String(v.note || '').slice(0, 600), stops: (Array.isArray(v.stops) ? v.stops : []).filter(ok).slice(0, 20) };
    }
  }
  if (typeof x.tpl === 'string' && /^[a-z0-9-]{1,40}$/.test(x.tpl)) out.tpl = x.tpl;
  if (x.base && Number.isFinite(x.base.lat) && Number.isFinite(x.base.lon)) out.base = { n: String(x.base.n || '').slice(0, 60), lat: x.base.lat, lon: x.base.lon };
  if (x.from) out.from = String(x.from).slice(0, 40);
  return out;
}
