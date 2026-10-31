/* Forge — small SVG charts (no library). */
const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

/* series: [{ pts: [{x, y}], cls, dash }], band: { lo: [{x,y}], hi: [{x,y}] } */
export function line({ series, band, W = 340, H = 150, yFmt = v => v.toFixed(1), xFmt = () => '', pad = 0.6 }) {
  const all = series.flatMap(s => s.pts).concat(band ? [...band.lo, ...band.hi] : []);
  if (all.length < 2) return '';
  const xs = all.map(p => p.x), ys = all.map(p => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (x1 === x0) x1 = x0 + 1; if (y1 - y0 < pad) { const m = (y0 + y1) / 2; y0 = m - pad / 2; y1 = m + pad / 2; }
  const L = 36, R = 8, T = 10, B = 22;
  const sx = x => L + (x - x0) / (x1 - x0) * (W - L - R), sy = y => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const path = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const ticks = [y0, (y0 + y1) / 2, y1];
  let g = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">`;
  g += ticks.map(v => `<line class="grid" x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}"/><text class="ax" x="${L - 5}" y="${sy(v) + 3}" text-anchor="end">${esc(yFmt(v))}</text>`).join('');
  g += `<text class="ax" x="${L}" y="${H - 6}">${esc(xFmt(x0))}</text><text class="ax" x="${W - R}" y="${H - 6}" text-anchor="end">${esc(xFmt(x1))}</text>`;
  if (band) g += `<path class="band" d="${path(band.hi)}L${[...band.lo].reverse().map(p => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('L')}Z"/>`;
  for (const s of series) {
    if (s.dots) g += s.pts.map(p => `<circle class="${s.cls || ''}" cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="2.2"/>`).join('');
    else g += `<path class="ln ${s.cls || ''}" d="${path(s.pts)}"${s.dash ? ' stroke-dasharray="4 4"' : ''}/>`;
  }
  return g + '</svg>';
}

/* vals: [{ label, v (0-100) }] */
export function radar(vals, W = 300) {
  const n = vals.length; if (n < 3) return '';
  const c = W / 2, r = W / 2 - 46, ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
  const pt = (i, f) => [c + Math.cos(ang(i)) * r * f, c + Math.sin(ang(i)) * r * f];
  let g = `<svg class="radar" viewBox="-34 -4 ${W + 68} ${W + 8}" role="img">`;
  for (const f of [0.25, 0.5, 0.75, 1]) g += `<polygon class="${f === 0.5 ? 'ring mid' : 'ring'}" points="${vals.map((_, i) => pt(i, f).join(',')).join(' ')}"/>`;
  vals.forEach((_, i) => { const [x, y] = pt(i, 1); g += `<line class="spoke" x1="${c}" y1="${c}" x2="${x}" y2="${y}"/>`; });
  g += `<polygon class="shape" points="${vals.map((v, i) => pt(i, Math.max(0.02, (v.v || 0) / 100)).join(',')).join(' ')}"/>`;
  vals.forEach((v, i) => { const [x, y] = pt(i, Math.max(0.02, (v.v || 0) / 100)); g += `<circle class="dot" cx="${x}" cy="${y}" r="3.5"/>`; const [lx, ly] = pt(i, 1.22); g += `<text class="rl" x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle">${esc(v.label)}</text><text class="rv" x="${lx}" y="${ly + 13}" text-anchor="middle">${v.v == null ? '–' : Math.round(v.v)}</text>`; });
  return g + '</svg>';
}

/* Horizontal percentile scale with a marker; zones: [{ to (0-1), cls }] */
export function pctBar(p, { zones = [], label = '' } = {}) {
  let from = 0, z = '';
  for (const s of zones) { z += `<span class="z ${s.cls}" style="left:${from * 100}%;width:${(s.to - from) * 100}%"></span>`; from = s.to; }
  return `<div class="pbar">${z}<span class="mk" style="left:${Math.max(0, Math.min(1, p)) * 100}%"><b>${esc(label)}</b></span></div>`;
}

/* Stacked horizontal bar: parts [{ v, cls, label }] */
export function stack(parts) {
  const tot = parts.reduce((s, p) => s + Math.max(0, p.v), 0) || 1;
  return `<div class="stack">${parts.map(p => `<span class="${p.cls}" style="width:${Math.max(0, p.v) / tot * 100}%" title="${esc(p.label)}"></span>`).join('')}</div>`;
}
