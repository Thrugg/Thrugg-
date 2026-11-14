/* Grand Tour — the drawings: the compass plate (home in the middle, every hotel at its true bearing and at a
   distance that grows with the drive), the optional real map, and the value chart. */
import { NUMERALS, PAR, bearing, fmtDrive } from './engine.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* items: [{ id, name, lat, lon, min (drive minutes), grade, stayed }]; o: { w, home, L: { n, e, s, w, aria, hours(h) } } */
export function compass(items, o) {
  const W = Math.max(280, Math.min(520, o.w)), c = W / 2, R = c - 30;
  const far = Math.max(240, ...items.map(i => i.min || 0)), top = Math.ceil(far / 120) * 120;
  const rad = min => 22 + (R - 22) * Math.sqrt(Math.min(1, Math.max(0, min) / top));
  let s = `<svg class="compass" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}" role="img" aria-label="${esc(o.L.aria)}">`;
  s += `<circle class="rim" cx="${c}" cy="${c}" r="${R + 14}"/><circle class="rim in" cx="${c}" cy="${c}" r="${R + 9}"/>`;
  /* ring labels go where the fewest hotels are */
  const bs = items.map(i => bearing(o.home, i)), gap = a => Math.min(360, ...bs.map(x => { const d = Math.abs(x - a) % 360; return d > 180 ? 360 - d : d; }));
  const la = [0, 180, 90, 270, 45, 135, 225, 315].reduce((best, a) => gap(a) > gap(best) + 1 ? a : best, 0) * Math.PI / 180;
  const step = top <= 480 ? 120 : top <= 960 ? 240 : 480;
  for (let m = step; m <= top; m += step) { const r = rad(m); s += `<circle class="ring" cx="${c}" cy="${c}" r="${r.toFixed(1)}"/><text class="ringT" text-anchor="middle" x="${(c + (r - 9) * Math.sin(la)).toFixed(1)}" y="${(c - (r - 9) * Math.cos(la) + 3.5).toFixed(1)}">${esc(o.L.hours(m / 60))}</text>`; }
  for (let a = 0; a < 360; a += 15) { const t = a * Math.PI / 180, r0 = R + 9, r1 = R + (a % 90 === 0 ? 0 : a % 45 === 0 ? 3 : 6); s += `<line class="tickm" x1="${(c + r0 * Math.sin(t)).toFixed(1)}" y1="${(c - r0 * Math.cos(t)).toFixed(1)}" x2="${(c + r1 * Math.sin(t)).toFixed(1)}" y2="${(c - r1 * Math.cos(t)).toFixed(1)}"/>`; }
  s += `<text class="card" text-anchor="middle" x="${c}" y="${c - R - 16}">${esc(o.L.n)}</text><text class="card" text-anchor="middle" x="${c}" y="${c + R + 25}">${esc(o.L.s)}</text><text class="card" text-anchor="end" x="${c - R - 16}" y="${c + 4}">${esc(o.L.w)}</text><text class="card" x="${c + R + 16}" y="${c + 4}">${esc(o.L.e)}</text>`;
  s += `<path class="homeM" d="M${c} ${c - 7}l6 12h-12z"/>`;
  /* dots first, nudged apart; then each name goes in the first free spot around its dot, or is left out */
  const dots = [];
  for (const it of [...items].sort((a, b) => (a.min || 0) - (b.min || 0))) {
    let t = bearing(o.home, it) * Math.PI / 180, r = rad(it.min || 0), x, y, tries = 0;
    /* two that would sit on each other: move this one further out, or along the rim once it is at the edge */
    do { x = c + r * Math.sin(t); y = c - r * Math.cos(t); if (r + 9 <= R - 6) r += 9; else t += 0.12; } while (tries++ < 10 && dots.some(p => Math.hypot(p.x - x, p.y - y) < 27));
    dots.push({ x, y, it });
  }
  const boxes = [{ x0: c - 9, x1: c + 9, y0: c - 9, y1: c + 9 }, ...dots.map(d => ({ x0: d.x - 14, x1: d.x + 14, y0: d.y - 14, y1: d.y + 14 }))];
  const hits = b => boxes.some(q => b.x0 < q.x1 && b.x1 > q.x0 && b.y0 < q.y1 && b.y1 > q.y0) || Math.hypot(Math.max(Math.abs(b.x0 - c), Math.abs(b.x1 - c)), Math.max(Math.abs(b.y0 - c), Math.abs(b.y1 - c))) > R + 6;
  let labels = '';
  for (const d of dots) {
    const lab = d.it.name.length > 15 ? d.it.name.slice(0, 14) + '…' : d.it.name, w = lab.length * 6.1 + 4;
    const spots = [{ a: 'middle', x: d.x, y: d.y + 27, b: { x0: d.x - w / 2, x1: d.x + w / 2, y0: d.y + 16, y1: d.y + 31 } }, { a: 'middle', x: d.x, y: d.y - 18, b: { x0: d.x - w / 2, x1: d.x + w / 2, y0: d.y - 30, y1: d.y - 15 } }, { a: 'start', x: d.x + 17, y: d.y + 4, b: { x0: d.x + 15, x1: d.x + 17 + w, y0: d.y - 7, y1: d.y + 8 } }, { a: 'end', x: d.x - 17, y: d.y + 4, b: { x0: d.x - 17 - w, x1: d.x - 15, y0: d.y - 7, y1: d.y + 8 } }];
    const ok = spots.find(q => !hits(q.b)); if (!ok) continue;
    boxes.push(ok.b); labels += `<text class="lab" text-anchor="${ok.a}" x="${ok.x.toFixed(1)}" y="${ok.y.toFixed(1)}">${esc(lab)}</text>`;
  }
  s += labels;
  for (const d of dots) s += `<g class="dot${d.it.stayed ? ' stayed' : ''}" data-act="open" data-id="${d.it.id}" role="button" tabindex="0" aria-label="${esc(d.it.name)}"><circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="20" class="hit"/><circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="12.5"/><text class="num" text-anchor="middle" x="${d.x.toFixed(1)}" y="${(d.y + 4).toFixed(1)}">${d.it.grade ? NUMERALS[d.it.grade - 1] : '·'}</text></g>`;
  return s + '</svg>';
}

/* points: [{ name, g (1…5), e (0…100) }]; o: { w, names, L: { par, aria } } — experience against grade, with the par steps */
export function valueChart(points, o) {
  const W = Math.max(280, o.w), H = 250, m = { l: 30, r: 10, t: 14, b: 44 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
  const lo = Math.min(40, Math.floor((Math.min(100, ...points.map(p => p.e)) - 5) / 10) * 10);
  const col = iw / 5, x = g => m.l + col * (g - 0.5), y = v => m.t + ih * (1 - (v - lo) / (100 - lo));
  let s = `<svg class="vchart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.L.aria)}">`;
  for (let v = lo; v <= 100; v += 20) s += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="tick" text-anchor="end" x="${m.l - 6}" y="${(y(v) + 4).toFixed(1)}">${v}</text>`;
  for (let g = 1; g <= 5; g++) {
    s += `<line class="par" x1="${(m.l + col * (g - 1) + 5).toFixed(1)}" x2="${(m.l + col * g - 5).toFixed(1)}" y1="${y(PAR[g - 1]).toFixed(1)}" y2="${y(PAR[g - 1]).toFixed(1)}"/>`;
    s += `<text class="gnum" text-anchor="middle" x="${x(g).toFixed(1)}" y="${H - 24}">${NUMERALS[g - 1]}</text><text class="tick" text-anchor="middle" x="${x(g).toFixed(1)}" y="${H - 8}">${esc(col < 66 && o.names[g - 1].length > 8 ? o.names[g - 1].slice(0, 7) + '…' : o.names[g - 1])}</text>`;
  }
  s += `<text class="tick parT" x="${m.l + 6}" y="${(y(PAR[0]) + 14).toFixed(1)}">${esc(o.L.par)}</text>`;
  /* several stays of one grade are spread across its column */
  const by = {}; points.forEach(p => { (by[p.g] = by[p.g] || []).push(p); });
  for (const g of Object.keys(by)) by[g].sort((a, b) => a.e - b.e).forEach((p, i, arr) => {
    const px = x(Number(g)) + (arr.length > 1 ? (i - (arr.length - 1) / 2) * Math.min(18, (col - 20) / arr.length) : 0);
    s += `<circle class="pt ${p.e >= PAR[p.g - 1] ? 'up' : 'down'}" cx="${px.toFixed(1)}" cy="${y(p.e).toFixed(1)}" r="6"><title>${esc(p.name)}: ${Math.round(p.e)}</title></circle>`;
  });
  return s + '</svg>';
}

/* The real map, loaded only when asked for. Returns a promise of the map; rejects when there is no signal. */
let libP = null;
const lib = () => libP || (libP = new Promise((res, rej) => {
  if (window.maplibregl) return res();
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css'; document.head.append(css);
  const js = document.createElement('script'); js.src = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js'; js.onload = () => res(); js.onerror = () => { libP = null; js.remove(); css.remove(); rej(new Error('offline')); }; document.head.append(js);
}));
export async function realMap(el, items, home, onOpen) {
  await lib();
  const map = new window.maplibregl.Map({ container: el, style: 'https://tiles.openfreemap.org/styles/positron', center: [home.lon, home.lat], zoom: 5, attributionControl: { compact: true } });
  const pin = (cls, txt, title) => { const d = document.createElement('button'); d.type = 'button'; d.className = 'pin ' + cls; d.textContent = txt; d.title = title; d.setAttribute('aria-label', title); return d; };
  new window.maplibregl.Marker({ element: pin('home', '▲', home.name || '') }).setLngLat([home.lon, home.lat]).addTo(map);
  let w = home.lon, e = home.lon, s = home.lat, n = home.lat;
  for (const it of items) {
    const d = pin(it.stayed ? 'stayed' : 'wish', it.grade ? NUMERALS[it.grade - 1] : '·', it.name);
    d.addEventListener('click', ev => { ev.stopPropagation(); onOpen(it.id); });
    new window.maplibregl.Marker({ element: d }).setLngLat([it.lon, it.lat]).addTo(map);
    w = Math.min(w, it.lon); e = Math.max(e, it.lon); s = Math.min(s, it.lat); n = Math.max(n, it.lat);
  }
  if (items.length) map.fitBounds([[w, s], [e, n]], { padding: 44, maxZoom: 9, animate: false });
  return map;
}
export { fmtDrive };
