/* Seuil — the two drawings: the crossing curves with the doorway at the threshold, and the comparison lines.
   Plain SVG strings, sized in real pixels so the lettering stays readable on a phone. */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nice = (max) => { const p = Math.pow(10, Math.floor(Math.log10(max || 1))); const n = max / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };

/* rows: engine rows (year 0…); o: { w, span, be, lo, hi, stay, horizon, short(v) → label, L: { buy, rent, stay, year, range } } */
export function crossing(rows, o) {
  const W = Math.max(280, o.w), H = Math.round(Math.min(300, Math.max(220, W * 0.56)));
  const m = { l: 6, r: 52, t: 30, b: 26 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
  const pts = rows.slice(0, o.span + 1);
  const lo = Math.min(0, ...pts.map(r => Math.min(r.own, r.rent))), hi = Math.max(...pts.map(r => Math.max(r.own, r.rent)));
  const top = nice(hi), bot = lo < 0 ? -nice(-lo) : 0;
  const x = y => m.l + iw * y / o.span, y = v => m.t + ih * (1 - (v - bot) / (top - bot));
  const path = k => pts.map((r, i) => (i ? 'L' : 'M') + x(r.y).toFixed(1) + ' ' + y(r[k]).toFixed(1)).join('');
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.L.aria)}">`;
  /* the range of the threshold, as a soft band */
  if (o.lo <= o.span && o.hi > o.lo) { const a = x(Math.max(0, o.lo)), b = x(Math.min(o.span, o.hi)); s += `<rect class="band" x="${a.toFixed(1)}" y="${m.t}" width="${Math.max(2, b - a).toFixed(1)}" height="${ih}"/>`; }
  /* light grid: zero line and the top */
  for (const v of [bot, (top + bot) / 2, top]) s += `<line class="grid${v === 0 ? ' zero' : ''}" x1="${m.l}" x2="${m.l + iw}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="tick" x="${m.l + 2}" y="${(y(v) - 4).toFixed(1)}">${esc(o.short(v))}</text>`;
  /* years */
  const step = o.span <= 14 ? 2 : o.span <= 24 ? 4 : 5;
  for (let i = 0; i <= o.span; i += step) s += `<text class="tick" text-anchor="${i === 0 ? 'start' : 'middle'}" x="${x(i).toFixed(1)}" y="${H - 8}">${i}</text>`;
  s += `<text class="tick" x="${m.l + iw + 6}" y="${H - 8}">${esc(o.L.year)}</text>`;
  /* the stay */
  if (o.stay <= o.span) s += `<line class="stay" x1="${x(o.stay).toFixed(1)}" x2="${x(o.stay).toFixed(1)}" y1="${m.t}" y2="${m.t + ih}"/><text class="tick stayT" text-anchor="middle" x="${Math.min(W - 40, Math.max(34, x(o.stay))).toFixed(1)}" y="${m.t - 16}">${esc(o.L.stay)}</text>`;
  s += `<path class="ln rent" d="${path('rent')}"/><path class="ln buy" d="${path('own')}"/>`;
  /* the doorway where the curves cross */
  if (o.be !== null && o.be <= o.span) {
    const cx = x(o.be), cy = y(pts[o.be].own), dw = 13, dh = 30, base = Math.min(m.t + ih, cy + 12);
    s += `<path class="door" d="M${(cx - dw / 2).toFixed(1)} ${base.toFixed(1)}V${(base - dh + dw / 2).toFixed(1)}a${dw / 2} ${dw / 2} 0 0 1 ${dw} 0V${base.toFixed(1)}"/><line class="sill" x1="${(cx - dw).toFixed(1)}" x2="${(cx + dw).toFixed(1)}" y1="${base.toFixed(1)}" y2="${base.toFixed(1)}"/>`;
  }
  /* names at the end of each line: the upper one above its line, the lower one below */
  const last = pts[pts.length - 1], yb = y(last.own), yr = y(last.rent), buyUp = yb <= yr;
  s += `<text class="lab buy" x="${m.l + iw + 6}" y="${(yb + (buyUp ? -8 : 18)).toFixed(1)}">${esc(o.L.buy)}</text><text class="lab rent" x="${m.l + iw + 6}" y="${(yr + (buyUp ? 18 : -8)).toFixed(1)}">${esc(o.L.rent)}</text>`;
  return s + '</svg>';
}

/* series: [{ name, vals: [% of price by year], cls }] — advantage of buying as a share of the price */
export function compareLines(series, o) {
  const W = Math.max(280, o.w), H = Math.round(Math.min(280, Math.max(210, W * 0.52)));
  const m = { l: 6, r: 86, t: 14, b: 26 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
  const all = series.flatMap(s => s.vals.slice(0, o.span + 1));
  const top = nice(Math.max(5, ...all)), bot = -nice(Math.max(5, -Math.min(...all)));
  const x = y => m.l + iw * y / o.span, y = v => m.t + ih * (1 - (v - bot) / (top - bot));
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.aria)}">`;
  s += `<rect class="under" x="${m.l}" y="${y(0).toFixed(1)}" width="${iw}" height="${(m.t + ih - y(0)).toFixed(1)}"/>`;
  for (const v of [bot, 0, top]) s += `<line class="grid${v === 0 ? ' zero' : ''}" x1="${m.l}" x2="${m.l + iw}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="tick" x="${m.l + 2}" y="${(y(v) - 4).toFixed(1)}">${v > 0 ? '+' : ''}${v} %</text>`;
  const step = o.span <= 14 ? 2 : 5;
  for (let i = step; i <= o.span; i += step) s += `<text class="tick" text-anchor="middle" x="${x(i).toFixed(1)}" y="${H - 8}">${i}</text>`;
  /* end labels, pushed apart so they never sit on each other */
  const ends = series.map((se, i) => ({ i, y: y(se.vals[Math.min(o.span, se.vals.length - 1)]) })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 14) ends[k].y = ends[k - 1].y + 14;
  series.forEach((se, i) => {
    s += `<path class="ln c${i}" d="${se.vals.slice(0, o.span + 1).map((v, k) => (k ? 'L' : 'M') + x(k).toFixed(1) + ' ' + y(v).toFixed(1)).join('')}"/>`;
    const e = ends.find(q => q.i === i);
    s += `<text class="lab c${i}" x="${m.l + iw + 6}" y="${(e.y + 4).toFixed(1)}">${esc(se.name.length > 11 ? se.name.slice(0, 10) + '…' : se.name)}</text>`;
  });
  return s + '</svg>';
}
