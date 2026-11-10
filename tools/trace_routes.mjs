/* Trace hike routes on GitHub's machines and publish them as data/routes.json.
   Phones then get a ready line for every hike: instant first load, no calls to the public routing servers
   from the app, and the line is there offline. The steps match the app's own tracer (src/js/map.js):
   snap the top to the named summit or hut, move route points onto the named places in "pq", then BRouter
   (hiking-mountain profile), simplify to 5 m, round to 5 decimals.
   Run: node tools/trace_routes.mjs [--max-minutes 40] [--only id1,id2]
   Runs weekly and after catalogue changes from .github/workflows/trace-routes.yml. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'Cordee-hike-catalogue/1.0 (+https://github.com/Thrugg/Thrugg-)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function hav(a, b) { // [lat,lon] → km
  const R = 6371, toR = Math.PI / 180, dLat = (b[0] - a[0]) * toR, dLon = (b[1] - a[1]) * toR;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const havLL = (a, b) => hav([a[1], a[0]], [b[1], b[0]]);
export function simplify(c, tol = 5) {
  if (c.length < 3) return c;
  const k = Math.cos(c[0][1] * Math.PI / 180) * 111320, P = c.map(p => [p[0] * k, p[1] * 110540, (p[2] ?? 0) * 1.5]);
  const keep = new Uint8Array(c.length); keep[0] = keep[c.length - 1] = 1;
  const st = [[0, c.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const A = P[a], B = P[b], D = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L2 = D[0] * D[0] + D[1] * D[1] + D[2] * D[2];
    for (let i = a + 1; i < b; i++) {
      const Q = P[i]; let t = L2 ? ((Q[0] - A[0]) * D[0] + (Q[1] - A[1]) * D[1] + (Q[2] - A[2]) * D[2]) / L2 : 0; t = clamp(t, 0, 1);
      const d = Math.hypot(Q[0] - A[0] - t * D[0], Q[1] - A[1] - t * D[1], Q[2] - A[2] - t * D[2]);
      if (d > md) { md = d; mi = i; }
    }
    if (md > tol && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return c.filter((_, i) => keep[i]);
}
export function lineStats(c) {
  let km = 0, asc = 0, desc = 0, mx = -1e9, mn = 1e9, ref = null;
  for (let i = 0; i < c.length; i++) {
    if (i) km += havLL(c[i - 1], c[i]);
    const e = c[i][2]; if (e == null) continue;
    mx = Math.max(mx, e); mn = Math.min(mn, e);
    if (ref == null) { ref = e; continue; }
    const d = e - ref;
    if (d >= 4) { asc += d; ref = e; } else if (d <= -4) { desc -= d; ref = e; }
  }
  return { km, asc: Math.round(asc), desc: Math.round(desc), mx: mx > -1e9 ? Math.round(mx) : null, mn: mn < 1e9 ? Math.round(mn) : null };
}
/* compact form: first point absolute, then differences, in 1e-5 degrees; elevations in whole metres */
export function encode(c) {
  const x = [], y = [], z = []; let px = 0, py = 0;
  for (const p of c) { const X = Math.round(p[0] * 1e5), Y = Math.round(p[1] * 1e5); x.push(X - px); y.push(Y - py); px = X; py = Y; z.push(p[2] == null ? null : Math.round(p[2])); }
  return { x, y, z };
}
export function decode(r) {
  const c = []; let X = 0, Y = 0;
  for (let i = 0; i < r.x.length; i++) { X += r.x[i]; Y += r.y[i]; c.push([X / 1e5, Y / 1e5, r.z[i]]); }
  return c;
}
export const routeKey = h => JSON.stringify(h.p) + '|' + (h.ty || 'out');
const topIndex = h => (h.hi != null && h.hi < h.p.length ? h.hi : h.p.length - 1);

export function makeTracer(fetchFn = fetch, wait = sleep) {
  let lastNom = 0;
  const get = async (url, ms = 30000) => {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
    try { return await fetchFn(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'de,en' }, signal: ac.signal }); } finally { clearTimeout(t); }
  };
  const nominatim = async url => { const d = 1100 - (Date.now() - lastNom); if (d > 0) await wait(d); lastNom = Date.now(); const r = await get(url, 15000); return r.ok ? r.json() : null; };
  const rank = (cat, type) => ((cat === 'natural' && (type === 'peak' || type === 'volcano')) || (cat === 'tourism' && (type === 'alpine_hut' || type === 'wilderness_hut'))) ? 0 : (type === 'saddle' || type === 'mountain_pass') ? 1 : (cat === 'tourism' || cat === 'amenity') ? 2 : 3;
  async function snap(name, pt) {
    const j = await nominatim(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=jsonv2&limit=10&bounded=1&viewbox=${pt[1] - 0.07},${pt[0] + 0.05},${pt[1] + 0.07},${pt[0] - 0.05}`);
    if (!j) return null;
    const c = j.map(e => ({ lat: +e.lat, lon: +e.lon, r: rank(e.category, e.type), d: hav(pt, [+e.lat, +e.lon]) })).sort((a, b) => a.r - b.r || a.d - b.d);
    return c.length && c[0].d < 2.5 && c[0].r < 3 ? [c[0].lat, c[0].lon] : null;
  }
  async function place(name, pt) {
    const j = await nominatim(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=jsonv2&limit=8&bounded=1&viewbox=${pt[1] - 0.06},${pt[0] + 0.04},${pt[1] + 0.06},${pt[0] - 0.04}`);
    if (!j) return null;
    const c = j.map(e => [+e.lat, +e.lon]).filter(q => hav(pt, q) < 3).sort((a, b) => hav(pt, a) - hav(pt, b));
    return c[0] || null;
  }
  async function brouter(pts) {
    const ll = pts.map(p => p[1].toFixed(5) + ',' + p[0].toFixed(5)).join('|');
    const r = await get(`https://brouter.de/brouter?lonlats=${ll}&profile=hiking-mountain&alternativeidx=0&format=geojson`, 60000);
    if ([403, 429, 503].includes(r.status)) throw Object.assign(new Error('BRouter is busy (' + r.status + ')'), { rate: true });
    if (!r.ok) throw new Error('BRouter ' + r.status + ': ' + (await r.text().catch(() => '')).slice(0, 120));
    const f = (await r.json()).features?.[0];
    if (!f) throw new Error('BRouter: no route');
    return f.geometry.coordinates.map(c => [c[0], c[1], c[2] != null ? Math.round(c[2]) : null]);
  }
  async function trace(h) {
    const pts = h.p.map(q => [q[0], q[1]]), hi = topIndex(h);
    let snapped = false, topSnapped = false;
    if (h.tn && ['peak', 'hut', 'pass'].includes(h.tk)) { try { const s = await snap(h.tn, pts[hi]); if (s) { pts[hi] = s; snapped = topSnapped = true; } } catch (e) { } }
    if (Array.isArray(h.pq)) for (let i = 0; i < pts.length; i++) {
      if (!h.pq[i] || (topSnapped && i === hi)) continue;
      try { const s = await place(h.pq[i], pts[i]); if (s) { pts[i] = s; snapped = true; } } catch (e) { }
    }
    if (h.ty === 'loop') pts.push(pts[0]);
    const c = simplify(await brouter(pts), 5).map(p => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5, p[2]]);
    const st = lineStats(c);
    return { wk: routeKey(h), src: 'brouter', snapped, km: Math.round(st.km * 100) / 100, asc: st.asc, desc: st.desc, mx: st.mx, mn: st.mn, ts: Date.now(), ...encode(c) };
  }
  return { trace };
}

async function main() {
  const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const maxMs = (Number(opt('--max-minutes')) || 40) * 60e3, only = opt('--only') ? opt('--only').split(',') : null, t0 = Date.now();
  const hikes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/hikes.json'), 'utf8'));
  const file = path.join(ROOT, 'data/routes.json');
  const out = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { v: 1, by: {} };
  const ids = new Set(hikes.map(h => h.id));
  for (const id of Object.keys(out.by)) if (!ids.has(id)) delete out.by[id];
  const todo = hikes.filter(h => !h.free && (!only || only.includes(h.id)) && (!out.by[h.id] || out.by[h.id].wk !== routeKey(h)));
  console.log(`${todo.length} of ${hikes.length} hikes to trace`);
  const { trace } = makeTracer();
  let done = 0, failed = [], busy = 0;
  for (const h of todo) {
    if (Date.now() - t0 > maxMs) { console.log('time budget used, the rest waits for the next run'); break; }
    try { out.by[h.id] = await trace(h); done++; console.log('traced', h.id, out.by[h.id].km, 'km ↑', out.by[h.id].asc); busy = 0; }
    catch (e) {
      console.log('failed', h.id, e.message); failed.push(h.id);
      if (e.rate && ++busy >= 3) { console.log('routing server busy, stopping for this run'); break; }
      if (e.rate) await sleep(120000);
    }
    await sleep(3500);
  }
  out.v = 1; out.updated = new Date().toISOString().slice(0, 10);
  out.by = Object.fromEntries(Object.keys(out.by).sort().map(k => [k, out.by[k]]));
  fs.writeFileSync(file, '{"v":1,"updated":"' + out.updated + '","by":{\n' + Object.entries(out.by).map(([k, v]) => JSON.stringify(k) + ':' + JSON.stringify(v)).join(',\n') + '\n}}\n');
  console.log(`done: ${done} traced, ${failed.length} failed${failed.length ? ' (' + failed.join(', ') + ')' : ''}, ${Object.keys(out.by).length} routes in the file`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch(e => { console.error(e); process.exit(1); });
