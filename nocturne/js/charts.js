/* Nocturne — charts. Plain HTML and SVG strings; colours come from app.css. */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = x => (Math.round(x * 1e4) / 100) + '%';

/* The bridge as a waterfall on its side. Hours of sleep grow to the right: the target is the mark on the right, each
   bar steps from where the previous one ended, and the average is the mark where the last bar ends.
   rows: [{ k, label, sub, min }] (min > 0 = sleep lost). Marks are positions, not bars, so nothing is cut off at zero. */
export function waterfall({ target, actual, rows, labels, fmt, open, id }) {
  let cum = target; const pts = [target];
  const steps = rows.map(r => { const from = cum; cum -= r.min; pts.push(cum); return { ...r, from, to: cum }; });
  const lo = Math.min(...pts), hi = Math.max(...pts), pad = Math.max(6, (hi - lo) * 0.04), d0 = lo - pad, span = hi - lo + 2 * pad || 1;
  const x = v => (v - d0) / span;
  const tick = (label, v, cls, conn) => `<div class="wf-row wf-total ${cls}"><span class="wf-label">${esc(label)}</span><span class="wf-track"><i class="wf-tick" style="left:${pct(x(v))}"></i>${conn ? `<i class="wf-conn" style="left:${pct(x(v))}"></i>` : ''}</span><span class="wf-val">${fmt.dur(v)}</span></div>`;
  let h = `<div class="wf" role="table" aria-label="${esc(labels.aria)}"><div class="wf-guides" aria-hidden="true"><i style="--a:${pct(x(target))};--b:${pct(x(actual))}"></i></div>`;
  h += tick(labels.target, target, 'is-target', steps.length > 0);
  steps.forEach((s, i) => {
    const a = Math.min(s.from, s.to), b = Math.max(s.from, s.to), gain = s.min < 0;
    const bar = s.min === 0 ? `<i class="wf-tick" style="left:${pct(x(s.to))};opacity:.35"></i>` : `<i class="wf-bar${gain ? ' gain' : ''}" style="left:${pct(x(a))};width:${pct(x(b) - x(a))}"></i>`;
    const inner = `<span class="wf-label">${esc(s.label)}${s.sub ? `<small>${esc(s.sub)}</small>` : ''}</span><span class="wf-track">${bar}<i class="wf-conn" style="left:${pct(x(s.to))}"></i></span><span class="wf-val">${fmt.delta(-s.min)}</span>`;
    h += s.nights ? `<button class="wf-row" data-act="wf-open" data-k="${s.k}" data-wf="${id}" aria-expanded="${open === s.k}">${inner}</button>` : `<div class="wf-row">${inner}</div>`;
    if (s.nights && open === s.k) h += `<div class="wf-nights">${s.nights}</div>`;
  });
  h += tick(labels.actual, actual, 'is-actual', false) + '</div>';
  return h;
}

/* One row per night, 20:00 → 12:00. Faint = in bed, bright = asleep. The ragged left edge is the onset spread. */
export function actogram({ nights, dates, width, label, plan, lang }) {
  const X0 = -240, X1 = 720, left = 58, right = 6, rowH = dates.length > 14 ? 11 : 18, top = 18, W = Math.max(280, width), H = top + rowH * dates.length + 4;
  const x = m => left + (Math.max(X0, Math.min(X1, m)) - X0) / (X1 - X0) * (W - left - right);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">`;
  for (let m = X0; m <= X1; m += 120) { const hr = ((m / 60) % 24 + 24) % 24; s += `<line class="axis" x1="${x(m)}" x2="${x(m)}" y1="${top - 4}" y2="${H}"/><text x="${x(m)}" y="10" text-anchor="middle">${String(hr).padStart(2, '0')}</text>`; }
  dates.forEach((d, i) => {
    const y = top + i * rowH, n = nights[d], bh = Math.max(4, rowH - 6);
    if (rowH > 12 || i % 7 === 0 || i === dates.length - 1) s += `<text x="0" y="${y + rowH / 2 + 4}">${esc(label ? new Intl.DateTimeFormat(lang, rowH > 12 ? { weekday: 'short', day: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z')) : d)}</text>`;
    if (!n) return;
    const b0 = n.m ? n.bs : n.on, b1 = b0 + Math.max(n.b, n.off - b0);
    s += `<rect class="bed" x="${x(b0)}" y="${y + (rowH - bh) / 2}" width="${Math.max(1, x(b1) - x(b0))}" height="${bh}" rx="2"/>`;
    for (const [a, b] of n.s) if (b > X0 && a < X1) s += `<rect class="asleep" x="${x(a)}" y="${y + (rowH - bh) / 2}" width="${Math.max(1, x(b) - x(a) - 0.5)}" height="${bh}" rx="2"/>`;
    s += `<rect class="hit" data-act="night" data-d="${d}" x="${left}" y="${y}" width="${W - left - right}" height="${rowH}"><title>${d}</title></rect>`;
  });
  if (plan) for (const m of [plan.bed, plan.wake]) if (m > X0 && m < X1) s += `<line class="plan" x1="${x(m)}" x2="${x(m)}" y1="${top - 4}" y2="${H}"/>`;
  return s + '</svg>';
}

/* Minutes asleep per night against the target line. */
export function columns({ nights, dates, target, width, label, fmt, lang }) {
  const left = 34, right = 6, top = 14, bottom = 20, W = Math.max(280, width), H = 150;
  const max = Math.max(target, ...dates.map(d => nights[d]?.a || 0)) + 30, y = v => top + (1 - v / max) * (H - top - bottom);
  const slot = (W - left - right) / dates.length, bw = Math.max(2, Math.min(24, slot - 2));
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">`;
  for (let hr = 0; hr * 60 <= max; hr += 2) s += `<line class="axis" x1="${left}" x2="${W - right}" y1="${y(hr * 60)}" y2="${y(hr * 60)}"/><text x="${left - 6}" y="${y(hr * 60) + 4}" text-anchor="end">${hr} h</text>`;
  const every = Math.ceil(dates.length / 7);
  dates.forEach((d, i) => {
    const cx = left + slot * (i + 0.5), n = nights[d];
    if (i % every === 0 || i === dates.length - 1) s += `<text x="${cx}" y="${H - 5}" text-anchor="middle">${esc(new Intl.DateTimeFormat(lang, dates.length > 14 ? { day: 'numeric', month: 'numeric', timeZone: 'UTC' } : { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z')))}</text>`;
    if (!n) return;
    const y0 = y(n.a), h = y(0) - y0, r = Math.min(4, bw / 2, h);
    s += `<rect class="hit" data-act="night" data-d="${d}" x="${cx - slot / 2}" y="${top}" width="${slot}" height="${H - top - bottom}"><title>${d}: ${fmt.dur(n.a)}</title></rect>`;
    s += `<path class="col" data-act="night" data-d="${d}" d="M${cx - bw / 2} ${y(0)}V${y0 + r}q0 ${-r} ${r} ${-r}h${bw - 2 * r}q${r} 0 ${r} ${r}V${y(0)}z"/>`;
  });
  s += `<line class="target" x1="${left}" x2="${W - right}" y1="${y(target)}" y2="${y(target)}"/><text class="t" x="${W - right}" y="${y(target) - 5}" text-anchor="end">${esc(fmt.targetLabel)}</text>`;
  return s + '</svg>';
}
