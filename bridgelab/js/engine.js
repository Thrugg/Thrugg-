/* BridgeLab — the price / volume / mix bridge. Pure functions, tested without a browser.
   Notation: q = tonnes, p = net price per kilo, 0 = prior year, 1 = actual. Net sales = Σ q × p × 1,000.
   Q = total tonnes, s = a product's share of Q. Three averages carry the whole story:
     P0  = Σq0·p0 / Q0   prior-year prices at prior-year mix
     A1  = Σq1·p0 / Q1   prior-year prices at actual mix
     P0* = Σq0·p1 / Q0   actual prices at prior-year mix
   The four conventions differ only in which quantities each effect is measured at. Each one adds up exactly to the
   change in net sales; what moves between them is the joint effect of two things changing at once. */

export const ORDERS = ['vmp', 'pvm', 'mvp', 'pure'];
const K = 1000;   // kilos per tonne
const sum = (L, f) => L.reduce((a, x) => a + f(x), 0);

export function lines(skus, adj = {}) {
  return skus.map(s => { const a = adj[s.id] || { dv: 0, dp: 0 }; return { ...s, q1: s.q0 * (1 + (Number(a.dv) || 0) / 100), p1: s.p0 * (1 + (Number(a.dp) || 0) / 100) }; });
}
export function totals(L) {
  const Q0 = sum(L, x => x.q0), Q1 = sum(L, x => x.q1);
  const S00 = sum(L, x => x.q0 * x.p0) * K, S11 = sum(L, x => x.q1 * x.p1) * K, S10 = sum(L, x => x.q1 * x.p0) * K, S01 = sum(L, x => x.q0 * x.p1) * K;
  return { Q0, Q1, S00, S11, S10, S01, P0: Q0 ? S00 / Q0 : 0, A1: Q1 ? S10 / Q1 : 0, P0s: Q0 ? S01 / Q0 : 0 };
}
/* Mix at a volume level V and a set of prices ('p0' or 'p1'), split in two:
   between categories = V × Σc (S1c − S0c) × Π0c   (the category shares move, each valued at its prior-year inner mix)
   within categories  = V × Σc S1c × (Π1c − Π0c)   (the products move inside each category, at actual category shares)
   where Sc is a category's share of all tonnes and Πc its average price at that year's inner mix. */
export function mixParts(L, V, pk = 'p0') {
  const Q0 = sum(L, x => x.q0), Q1 = sum(L, x => x.q1);
  if (!Q0 || !Q1) return { between: 0, within: 0 };
  let between = 0, within = 0;
  for (const c of [...new Set(L.map(x => x.cat))]) {
    const M = L.filter(x => x.cat === c), Q0c = sum(M, x => x.q0), Q1c = sum(M, x => x.q1);
    let P0c = Q0c ? sum(M, x => x.q0 * x[pk]) / Q0c : 0, P1c = Q1c ? sum(M, x => x.q1 * x[pk]) / Q1c : 0;
    if (!Q0c) P0c = P1c; if (!Q1c) P1c = P0c;
    const S0c = Q0c / Q0, S1c = Q1c / Q1;
    between += (S1c - S0c) * P0c; within += S1c * (P1c - P0c);
  }
  return { between: V * between * K, within: V * within * K };
}
export function bridge(L, order = 'vmp') {
  const T = totals(L), dQ = T.Q1 - T.Q0;
  let vol, price, mixV, mixP, vm = 0, pv = 0;
  if (order === 'pvm') { price = T.S01 - T.S00; vol = dQ * T.P0s; mixV = T.Q1; mixP = 'p1'; }
  else if (order === 'mvp') { mixV = T.Q0; mixP = 'p0'; vol = dQ * T.A1; price = T.S11 - T.S10; }
  else if (order === 'pure') { vol = dQ * T.P0; mixV = T.Q0; mixP = 'p0'; price = T.S01 - T.S00; vm = dQ * (T.A1 - T.P0); pv = T.S11 - T.S10 - T.S01 + T.S00; }
  else { order = 'vmp'; vol = dQ * T.P0; mixV = T.Q1; mixP = 'p0'; price = T.S11 - T.S10; }
  const m = mixParts(L, mixV, mixP), mix = m.between + m.within;
  const change = T.S11 - T.S00;
  return { order, base: T.S00, actual: T.S11, change, pct: T.S00 ? change / T.S00 : 0, vol, mix, mixBetween: m.between, mixWithin: m.within, price, vm, pv, gap: T.S00 + vol + mix + price + vm + pv - T.S11, T, mixV, mixP };
}
export const allOrders = L => Object.fromEntries(ORDERS.map(o => [o, bridge(L, o)]));
/* The two joint effects that the order of calculation hands to one effect or the other. */
export function crossTerms(L) {
  const T = totals(L);
  return { pv: sum(L, x => (x.q1 - x.q0) * (x.p1 - x.p0)) * K, vm: (T.Q1 - T.Q0) * (T.A1 - T.P0) };
}
/* The bars of the waterfall, with where each one starts and ends. */
export function steps(b, split = true) {
  const out = [{ key: 'base', kind: 'total', value: b.base, start: 0, end: b.base }];
  let run = b.base;
  const add = (key, v, kind = 'delta') => { out.push({ key, kind, value: v, start: run, end: run + v }); run += v; };
  add('vol', b.vol);
  if (split) { add('mixB', b.mixBetween); add('mixW', b.mixWithin); } else add('mix', b.mix);
  add('price', b.price);
  if (b.order === 'pure') { add('vm', b.vm, 'joint'); add('pv', b.pv, 'joint'); }
  out.push({ key: 'actual', kind: 'total', value: b.actual, start: 0, end: b.actual });
  return out;
}
/* The value axis of the waterfall: the deltas are a few per cent of the totals, so the axis starts above zero and
   says so. Returns [lo, hi] with some air around the running values. */
export function domain(st) {
  const vals = st.flatMap(s => s.kind === 'total' ? [s.end] : [s.start, s.end]);
  const min = Math.min(...vals), max = Math.max(...vals), span = Math.max(max - min, Math.abs(max) * 0.02, 1);
  return [min - span * 0.9, max + span * 0.12];
}
/* Each product's share of the volume-and-mix effect and of the price effect under a convention (the joint effect
   gets its own column under "pure"). Rows add up to the portfolio effects. */
export function skuRows(L, order = 'vmp') {
  return L.map(x => {
    const dq = x.q1 - x.q0, dp = x.p1 - x.p0;
    let vm, pr, jt = 0;
    if (order === 'pvm') { pr = x.q0 * dp; vm = dq * x.p1; }
    else if (order === 'pure') { pr = x.q0 * dp; vm = dq * x.p0; jt = dq * dp; }
    else { vm = dq * x.p0; pr = x.q1 * dp; }
    return { id: x.id, cat: x.cat, name: x.name, q0: x.q0, q1: x.q1, p0: x.p0, p1: x.p1, s0: x.q0 * x.p0 * K, s1: x.q1 * x.p1 * K, vm: vm * K, price: pr * K, joint: jt * K };
  });
}
/* When does the choice of convention deserve a line in the pack? When the price × volume joint effect is at least a
   tenth of the change being explained, or half a per cent of net sales. */
export function materiality(L, b) {
  const pv = crossTerms(L).pv, ch = Math.abs(b.change);
  const share = ch ? Math.abs(pv) / ch : (Math.abs(pv) > 0 ? Infinity : 0);
  return { pv, share, material: Math.abs(pv) > 0.5 && (Math.abs(pv) >= 0.1 * ch || Math.abs(pv) >= 0.005 * Math.abs(b.base)) };
}
/* The range an effect takes across the four conventions. */
export function spread(all, key) { const v = ORDERS.map(o => all[o][key]); return { min: Math.min(...v), max: Math.max(...v) }; }
/* The effects behind the headline, largest first (mix as one number). */
export function drivers(b) {
  const d = [['price', b.price], ['vol', b.vol], ['mix', b.mix]];
  if (b.order === 'pure') d.push(['joint', b.vm + b.pv]);
  return d.sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
}
