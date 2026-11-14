/* The Funds Ladder — the engine. Pure functions.
   A ladder is an ordered list of rungs, each with a target. One monthly amount is shared between the rungs by a
   rule: fill them in order, or by shares. The engine says where this month's money goes and when each rung is
   reached at that pace. */
const r2 = v => Math.round(v * 100) / 100;
const num = (v, d = 0) => { const n = Number(v); return isFinite(n) ? n : d; };

/* a rung's target: the sum of its parts when it has any */
export const targetOf = r => r.parts && r.parts.length ? r2(r.parts.reduce((a, p) => a + Math.max(0, num(p.amt)), 0)) : Math.max(0, num(r.target));
export const needOf = r => Math.max(0, r2(targetOf(r) - Math.max(0, num(r.saved))));
export const fillOf = r => { const t = targetOf(r); return t > 0 ? Math.min(1, Math.max(0, num(r.saved)) / t) : 0; };
export const isFull = r => targetOf(r) > 0 && needOf(r) <= 0;

/* Share one amount between rungs. rungs: [{ id, need, paused, pct }]. Returns { by: { id: amount }, left }. */
export function split(rungs, amount, rule = 'order') {
  const by = {}; let left = Math.max(0, r2(num(amount)));
  const open = rungs.filter(r => !r.paused && r.need > 0).map(r => ({ id: r.id, need: r.need, pct: Math.max(0, num(r.pct)) }));
  if (rule !== 'pct') {
    for (const r of open) { if (left <= 0) break; const a = Math.min(r.need, left); by[r.id] = r2(a); left = r2(left - a); }
    return { by, left };
  }
  /* by shares: a rung that fills up hands its surplus to the others, share for share */
  let act = open;
  while (left > 0.005 && act.length) {
    const tot = act.reduce((a, r) => a + r.pct, 0), w = r => tot > 0 ? r.pct / tot : 1 / act.length;
    const pool = left; let capped = false;
    for (const r of act) {
      const want = pool * w(r), a = Math.min(r.need, want);
      by[r.id] = r2((by[r.id] || 0) + a); r.need = r2(r.need - a); left = r2(left - a);
      if (a < want - 0.004) capped = true;
    }
    act = act.filter(r => r.need > 0.004 && (tot === 0 || r.pct > 0));
    if (!capped) break;
  }
  if (left < 0.01) left = 0;
  return { by, left };
}

export const addMonths = (ym, n) => { const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1 + n; return `${y + Math.floor(m / 12)}-${String(((m % 12) + 12) % 12 + 1).padStart(2, '0')}`; };
export const monthsBetween = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
export const thisMonth = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/* Month by month at the same amount and rule: when is each rung reached?
   Returns { id: { share, months, when, late, perMonthForDue } }: share = this month's part; months = null when the
   rung is paused or never reached within 50 years; late = months after its date (0 or less = on time). */
export function project(rungs, monthly, rule, start = thisMonth()) {
  const st = rungs.map(r => ({ id: r.id, need: needOf(r), paused: !!r.paused, pct: r.pct })), out = {};
  const first = split(st.map(x => ({ ...x })), monthly, rule);
  for (const r of rungs) {
    const need = needOf(r), toDue = r.due ? monthsBetween(start, r.due) : null;
    out[r.id] = { share: first.by[r.id] || 0, months: need <= 0 && targetOf(r) > 0 ? 0 : null, when: need <= 0 && targetOf(r) > 0 ? start : null, late: null, perMonthForDue: r.due && need > 0 ? r2(need / Math.max(1, toDue)) : null };
  }
  let n = 0;
  while (n < 600 && monthly > 0 && st.some(x => !x.paused && x.need > 0)) {
    n++;
    const s = split(st.map(x => ({ ...x })), monthly, rule);
    if (!Object.keys(s.by).length) break;
    for (const x of st) if (s.by[x.id]) { x.need = r2(x.need - s.by[x.id]); if (x.need <= 0 && out[x.id].months === null) { out[x.id].months = n; out[x.id].when = addMonths(start, n); } }
  }
  for (const r of rungs) { const o = out[r.id]; if (r.due && o.when) o.late = monthsBetween(r.due, o.when); else if (r.due && needOf(r) > 0) o.late = Infinity; }
  return { by: out, left: first.left, months: n };
}

/* The next rung to work on: the first one, in order, that is neither full nor paused. */
export const nextRung = rungs => rungs.find(r => !r.paused && needOf(r) > 0) || null;

/* "812 maths": what a year of owning the car costs, and how many premium rental days the same money buys. */
export function carMaths(c) {
  const year = Math.max(0, num(c.dep)) + Math.max(0, num(c.ins)) + Math.max(0, num(c.service));
  const day = Math.max(0, num(c.day)), days = Math.max(0, num(c.days));
  return { year, rentalDays: day > 0 ? year / day : null, ownPerDay: days > 0 ? year / days : null, rentYear: day * days, saving: year - day * days };
}
