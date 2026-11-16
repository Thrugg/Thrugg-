/* BridgeLab — the waterfall, drawn as HTML rows so the text stays sharp at any width. Each row is a button: tapping
   a bar opens its formula below the chart. Increases are blue, decreases red (a pair checked for colour-blind
   readers), totals neutral; joint effects are hatched; every bar also prints its signed value, so colour is never
   the only cue. The value axis starts above zero, and the chart says so. */

export function niceTicks(lo, hi, n = 4) {
  const span = hi - lo; if (!(span > 0)) return [];
  const raw = span / n, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
  const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v / step) * step);
  return out;
}
/* Position of every bar in per cent of the track: left edge and width. Totals run from the left edge of the axis. */
export function geometry(st, lo, hi) {
  const pct = v => (v - lo) / (hi - lo) * 100;
  return st.map(s => {
    const a = s.kind === 'total' ? 0 : pct(Math.min(s.start, s.end)), b = pct(s.kind === 'total' ? s.end : Math.max(s.start, s.end));
    return { key: s.key, left: a, width: Math.max(b - a, 0.5), end: pct(s.end) };
  });
}
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function waterfall(st, { lo, hi, label, money, axis, sel, caption }) {
  const g = geometry(st, lo, hi), ticks = niceTicks(lo, hi, 3), pct = v => (v - lo) / (hi - lo) * 100;
  const grid = ticks.map(v => `<b class="wg" style="left:${pct(v).toFixed(2)}%"></b>`).join('');
  const rows = st.map((s, i) => {
    const cls = s.kind === 'total' ? 'tot' : (s.value >= 0 ? 'up' : 'down') + (s.kind === 'joint' ? ' joint' : '');
    const conn = i < st.length - 1 ? `<b class="wc" style="left:${g[i].end.toFixed(2)}%"></b>` : '';
    return `<button class="wrow ${s.kind}" data-act="bar" data-k="${s.key}" aria-pressed="${sel === s.key}"><span class="wl">${esc(label(s.key))}</span><span class="wt">${grid}<i class="wb ${cls}" style="left:${g[i].left.toFixed(2)}%;width:${g[i].width.toFixed(2)}%"></i>${conn}</span><span class="wv">${esc(money(s.value, s.kind !== 'total'))}</span></button>`;
  }).join('');
  const axisRow = `<div class="waxis"><span></span><span class="wt">${ticks.map(v => `<small style="left:${pct(v).toFixed(2)}%">${esc(axis(v))}</small>`).join('')}</span><span></span></div>`;
  return `<figure class="wf" aria-label="${esc(caption)}">${rows}${axisRow}</figure>`;
}
