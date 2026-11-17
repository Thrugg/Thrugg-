/* Écurie — small SVG charts. Colours come from CSS classes, so light and dark both work. */
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const tone = s => s == null ? 'none' : s >= 75 ? 'good' : s >= 55 ? 'ok' : s >= 35 ? 'warn' : 'bad';
const k = v => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1).replace('.0', '') + ' M' : Math.round(v / 1000) + 'k';

/* a score ring, 0–100 */
export function ring(score, size = 76, label = '') {
  const r = 30, c = 2 * Math.PI * r, v = score == null ? 0 : Math.max(0, Math.min(100, score));
  return `<div class="ring t-${tone(score)}" style="width:${size}px;height:${size}px" role="img" aria-label="${esc(label)} ${score == null ? 'not scored' : score + ' out of 100'}">
<svg viewBox="0 0 76 76" width="${size}" height="${size}"><circle cx="38" cy="38" r="${r}" class="rg-bg"/><circle cx="38" cy="38" r="${r}" class="rg-fg" stroke-dasharray="${(c * v / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 38 38)"/></svg>
<b>${score == null ? '–' : score}</b></div>`;
}

/* the value curve: past at the car's own pace, future at your mileage; today, the end of your ownership, the buying
   sweet spot and the mileage steps */
export function valueChart(cv, year, opt = {}) {
  const W = 400, H = 220, L = 40, R = 8, T = 14, B = 28, pts = cv.pts;
  const maxA = pts[pts.length - 1].a, maxV = Math.max(...pts.map(p => p.v)) * 1.06;
  const x = a => L + (W - L - R) * a / maxA, y = v => T + (H - T - B) * (1 - v / maxV);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.a).toFixed(1)} ${y(p.v).toFixed(1)}`).join('');
  const area = `${line}L${x(maxA).toFixed(1)} ${y(0)}L${x(0)} ${y(0)}Z`;
  const step = maxV > 400000 ? 100000 : maxV > 150000 ? 50000 : maxV > 60000 ? 20000 : 10000;
  let g = ''; for (let v = step; v < maxV; v += step) g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">€${k(v)}</text>`;
  let xa = ''; const every = maxA > 14 ? 3 : maxA > 8 ? 2 : 1;
  for (let a = 0; a <= maxA + 1e-9; a += every) xa += `<text x="${x(a).toFixed(1)}" y="${H - 9}" text-anchor="middle">${year + Math.round(a)}</text>`;
  const sweet = cv.sweet ? `<rect class="sweet" x="${x(cv.sweet.from).toFixed(1)}" y="${T}" width="${(x(Math.min(cv.sweet.to, maxA)) - x(cv.sweet.from)).toFixed(1)}" height="${H - T - B}"/><text class="sweet-l" x="${(x(cv.sweet.from) + 4).toFixed(1)}" y="${T + 12}">Buying sweet spot</text>` : '';
  const now = cv.age0, end = cv.age0 + cv.hold, yNow = y(cv.vNow), yEnd = y(cv.vEnd);
  const own = `<rect class="own" x="${x(now).toFixed(1)}" y="${T}" width="${(x(Math.min(end, maxA)) - x(now)).toFixed(1)}" height="${H - T - B}"/>`;
  const steps = (cv.steps || []).map(s => { const a = now + s.years; return `<line class="kmstep" x1="${x(a).toFixed(1)}" x2="${x(a).toFixed(1)}" y1="${T}" y2="${H - B}"/><text class="kmstep-l" x="${(x(a) - 4).toFixed(1)}" y="${H - B - 6}" text-anchor="end">${s.km / 1000}k km</text>`; }).join('');
  const marks = `<line class="today" x1="${x(now).toFixed(1)}" x2="${x(now).toFixed(1)}" y1="${T}" y2="${H - B}"/><circle class="dot" cx="${x(now).toFixed(1)}" cy="${yNow.toFixed(1)}" r="5.5"/>
<text class="lbl" x="${(x(now) + 8).toFixed(1)}" y="${(yNow - 8).toFixed(1)}">Today €${k(cv.vNow)}</text>
<circle class="dot end" cx="${x(end).toFixed(1)}" cy="${yEnd.toFixed(1)}" r="4.5"/><text class="lbl" x="${Math.min(x(end) + 8, W - 70).toFixed(1)}" y="${(yEnd - 8).toFixed(1)}">In ${cv.hold} yrs €${k(cv.vEnd)}</text>`;
  const logs = (opt.log || []).map(p => `<circle class="log" cx="${x(p.a).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3.5"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label || 'Value over time')}">${g}${sweet}${own}<path class="area" d="${area}"/><path class="line" d="${line}"/>${steps}${marks}${logs}<line class="ax" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>${xa}</svg>`;
}

/* one horizontal stacked bar with a legend */
export function stack(parts) {
  const tot = parts.reduce((s, p) => s + Math.max(0, p[1]), 0) || 1;
  const bar = parts.map((p, i) => `<span class="c${i}" style="width:${(Math.max(0, p[1]) / tot * 100).toFixed(2)}%"></span>`).join('');
  return `<div class="stack" aria-hidden="true">${bar}</div>`;
}
/* a 1–10 bar */
export const tenBar = (label, v, need) => `<div class="tbar${need ? ' need' : ''}"><span class="n">${esc(label)}${need ? ' <i>you need this</i>' : ''}</span><span class="t"><span style="width:${Math.max(0, Math.min(10, v)) * 10}%"></span></span><b>${v == null ? '–' : Math.round(v * 10) / 10}</b></div>`;
