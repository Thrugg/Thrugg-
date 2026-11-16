/* Seuil — the engine. Pure functions, no screen, no storage.
   Two people start with the same cash. One buys, one rents the equivalent home and invests the cash the buyer
   spent up front. Every month, whoever pays less for housing invests the difference. For each year the engine
   answers: if both stopped here (the owner sells), who has more? The first year in which the owner is ahead is
   the threshold. */
import { rulesFor } from './packs.js';

export const HORIZON = 40;
const num = (v, d = 0) => { const n = Number(v); return isFinite(n) ? n : d; };

/* price, rent and surface as totals, whichever way they were typed */
export function totals(loc) {
  const sqm = Math.max(0, num(loc.sqm));
  const per = loc.mode === 'sqm';
  return { sqm, price: Math.max(0, num(loc.price) * (per ? sqm : 1)), rent: Math.max(0, num(loc.rent) * (per ? sqm : 1)) };
}

/* Monthly payment of a loan repaid in full over n months. */
export function annuity(loan, ratePct, months) {
  if (!(loan > 0) || !(months > 0)) return 0;
  const r = ratePct / 1200;
  return r === 0 ? loan / months : loan * r / (1 - Math.pow(1 + r, -months));
}

/* One scenario, month by month. Returns one row per year 0…HORIZON. */
export function simulate(loc, shift = {}) {
  const R = rulesFor(loc), T = totals(loc);
  const P = T.price, rent0 = T.rent;
  const down = Math.min(P, Math.max(0, num(loc.down)));
  const reno = Math.max(0, num(loc.reno));
  const rate = Math.max(0, num(loc.rate) + num(shift.rate));
  /* SE-1: the rate is fixed for fixYears, then renewed at rate2 (both optional; empty = one rate for the whole loan) */
  const fixM = num(loc.fixYears) > 0 ? Math.round(num(loc.fixYears) * 12) : 0;
  const rate2 = fixM ? Math.max(0, (loc.rate2 === '' || loc.rate2 == null ? num(loc.rate) : num(loc.rate2)) + num(shift.rate2 ?? shift.rate)) : rate;
  const termM = Math.max(1, Math.round(num(loc.term, 25))) * 12;
  const gP = (num(loc.gPrice, 2) + num(shift.gPrice)) / 100, gR = (num(loc.gRent, 2) + num(shift.gRent)) / 100;
  const ret = (num(loc.ret, 5) + num(shift.ret)) / 100;
  const mP = Math.pow(1 + gP, 1 / 12), mI = Math.pow(1 + ret, 1 / 12);
  const loan0 = P - down;
  const fees = P * (R.transfer + R.notary + R.agentBuy) / 100 + loan0 * R.loanFee / 100;
  const upfront = down + fees + reno;

  /* loan: full annuity, or (Switzerland) straight-line down to a share of the price, interest only after */
  let pay = R.loan === 'annuity' ? annuity(loan0, rate, termM) : 0;
  const floor = R.loan === 'target' ? Math.min(loan0, P * R.loanTo / 100) : 0;
  const stepM = R.loan === 'target' && R.loanYears > 0 ? (loan0 - floor) / (R.loanYears * 12) : 0;

  let V = P, loan = loan0, rent = rent0;
  let pfR = upfront, inR = upfront;       // the renter's investments and what was paid in
  let pfO = 0, inO = 0;                    // the owner's, for months in which owning is the cheaper side
  const c = { rent: 0, interest: 0, relief: 0, tax: 0, upkeep: 0, principal: 0 };
  const after = (pf, paid) => pf - Math.max(0, pf - paid) * R.invTax / 100;
  const row = y => {
    const sellCost = V * R.sell / 100;
    const taxed = R.cgtFree === null || (R.cgtFree > 0 && y <= R.cgtFree);
    const cgt = taxed ? Math.max(0, V - sellCost - P - fees - reno) * R.cgt / 100 : 0;
    const gainR = after(pfR, inR) - inR, gainO = after(pfO, inO) - inO;
    const own = V - sellCost - loan - cgt + after(pfO, inO), rentNW = after(pfR, inR);
    return {
      y, own, rent: rentNW, adv: own - rentNW, value: V, loan, sellCost, cgt, monthlyRent: rent,
      /* the bridge from renting to buying: these add up to adv exactly */
      parts: { growth: V - P, rentSaved: c.rent, interest: -(c.interest - c.relief), taxes: -c.tax, upkeep: -c.upkeep, fees: -fees, reno: -reno, selling: -sellCost, cgt: -cgt, returns: -(gainR - gainO) },
      paid: { ...c }
    };
  };
  const rows = [row(0)];
  let first = null;
  for (let m = 1; m <= HORIZON * 12; m++) {
    if (m > 1 && (m - 1) % 12 === 0) rent *= 1 + gR;
    V *= mP; pfR *= mI; pfO *= mI;
    const rNow = fixM && m > fixM ? rate2 : rate;
    if (fixM && m === fixM + 1 && R.loan === 'annuity' && m <= termM) pay = annuity(loan, rate2, termM - fixM);   // renewal: same end date, new rate
    const interest = loan * rNow / 1200;
    let principal = 0;
    if (R.loan === 'annuity') principal = m <= termM ? Math.min(loan, Math.max(0, pay - interest)) : 0;
    else principal = Math.min(Math.max(0, loan - floor), stepM);
    loan -= principal;
    const relief = interest * R.relief / 100;
    const tax = V * (R.propTax + R.ownerTax) / 1200, upkeep = V * R.upkeep / 1200;
    const ownerOut = interest + principal - relief + tax + upkeep;
    if (m === 1) first = { ownerOut, interest, principal, relief, tax, upkeep, rent };
    const diff = ownerOut - rent;
    if (diff > 0) { pfR += diff; inR += diff; } else { pfO -= diff; inO -= diff; }
    c.rent += rent; c.interest += interest; c.relief += relief; c.tax += tax; c.upkeep += upkeep; c.principal += principal;
    if (m % 12 === 0) rows.push(row(m / 12));
  }
  return { rows, fees, upfront, loan0, down, reno, first, rules: R, price: P, rent0, sqm: T.sqm };
}

/* First year at the end of which the owner is ahead; null when that never happens within the horizon. */
export function breakEven(rows) {
  for (let i = 1; i < rows.length; i++) if (rows[i].adv >= 0) return i;
  return null;
}
/* If renting takes the lead back later (it can, when the loan is never repaid), the year that happens. */
export function lostAgain(rows, be) {
  if (be === null) return null;
  for (let i = be + 1; i < rows.length; i++) if (rows[i].adv < 0) return i;
  return null;
}

/* The assumptions that are guesses, each moved one way and the other. */
export const SHIFTS = [
  { k: 'gPrice', d: 1 }, { k: 'gRent', d: 1 }, { k: 'ret', d: 1.5 }, { k: 'rate', d: 0.5 }
];

export function analyse(loc) {
  const base = simulate(loc), be = breakEven(base.rows);
  const stay = Math.min(HORIZON, Math.max(1, Math.round(num(loc.stay, 7))));
  const sens = SHIFTS.map(s => {
    const lo = simulate(loc, { [s.k]: -s.d }), hi = simulate(loc, { [s.k]: s.d });
    return { k: s.k, d: s.d, lo: breakEven(lo.rows), hi: breakEven(hi.rows), loAdv: lo.rows[stay].adv, hiAdv: hi.rows[stay].adv };
  });
  /* range: the earliest and latest threshold among the base case and the one-at-a-time shifts; "never" counts as
     beyond the horizon */
  const all = [be, ...sens.flatMap(s => [s.lo, s.hi])].map(v => v === null ? HORIZON + 1 : v);
  const at = base.rows[stay];
  return {
    ...base, be, until: lostAgain(base.rows, be), stay, sens, lo: Math.min(...all), hi: Math.max(...all), at,
    ratio: base.rent0 > 0 ? base.price / (base.rent0 * 12) : null,
    ok: base.price > 0 && base.rent0 > 0
  };
}

/* SE-2: ranges by simulation. The four guesses (and the renewal rate) are drawn together many times: price growth
   and rent growth move together (correlation 0.6), the return and the rates on their own. Seeded, so the same inputs
   always give the same answer. Returns the share of draws in which buying is ahead at the planned stay, and the
   10th / 50th / 90th percentile of the threshold year (HORIZON + 1 = never). */
export function monteCarlo(loc, n = 400, seed = 7) {
  let x = seed >>> 0 || 1;
  const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const stay = Math.min(HORIZON, Math.max(1, Math.round(num(loc.stay, 7))));
  const bes = [], ahead = [];
  for (let i = 0; i < n; i++) {
    const z1 = gauss(), z2 = 0.6 * z1 + 0.8 * gauss();
    const sh = { gPrice: 1.2 * z1, gRent: 1 * z2, ret: 2 * gauss(), rate: 0, rate2: num(loc.fixYears) > 0 ? 1.2 * gauss() : 0 };
    const r = simulate(loc, sh).rows, be = breakEven(r);
    bes.push(be === null ? HORIZON + 1 : be); ahead.push(r[stay].adv >= 0 ? 1 : 0);
  }
  bes.sort((a, b) => a - b);
  const q = p => bes[Math.min(n - 1, Math.floor(p * n))];
  return { n, stay, pAhead: ahead.reduce((a, b) => a + b, 0) / n, p10: q(0.1), p50: q(0.5), p90: q(0.9), never: bes.filter(v => v > HORIZON).length / n };
}

/* Bridge rows in display order, zero rows dropped. Their sum is the advantage of buying at that year. */
export const BRIDGE_ORDER = ['rentSaved', 'growth', 'interest', 'upkeep', 'taxes', 'fees', 'reno', 'selling', 'cgt', 'returns'];
export function bridge(row) {
  return BRIDGE_ORDER.map(k => ({ k, v: row.parts[k] })).filter(x => Math.abs(x.v) >= 0.5);
}
