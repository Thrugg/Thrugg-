/* Reference checks for the two finance engines, read straight out of the published pages.
   Run with: node --test tests/*.mjs   (run this before and after every rule update) */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const scripts = html => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);

/* ---------- Safety Net Score ---------- */
const sn = (() => { const s = scripts(read('safety-net/index.html')).filter(x => /NETSCORE/.test(x)); const ctx = {}; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(s[0], ctx); vm.runInContext(s[1], ctx); return ctx.NETSCORE; })();
const EX = { grossAnnual: 55000, netMonthly: 3000, essential: 2000, otherIncome: 0, savings: 8000, monthlySaving: 500, age: 35, years: 10, children: 0, deTaxClass: '1', dkMemberYears: 1, seMemberMonths: 12, beCategory: 'isole', taxOverride: null, netBenefitOverride: null };
const top = code => { const cur = sn.DATA.C[code].cur; return sn.compute(code, sn.convertProfile({ ...EX, grossAnnual: 300000, netMonthly: 14000 }, 'EUR', cur), {}); };

test('Safety Net: published maximum benefits per month (2026 rule set)', () => {
  const want = { DE: 2811, AT: 2396, CH: 8645, FR: 9131, NL: 5055, IT: 1585 };  // gross, local currency
  for (const [c, v] of Object.entries(want)) assert.ok(Math.abs(top(c).firstGross - v) <= 1, `${c}: ${top(c).firstGross} vs ${v}`);
});
test('Safety Net: German example (55,000 € gross, class I, no child) gives 59.05 € a day', () => {
  assert.equal(sn.deAlg(55000, '1', false).algD, 59.05);
});
test('Safety Net: all 16 countries give finite, ordered levels on normal, empty, zero and extreme profiles', () => {
  const cases = [EX, {}, { ...EX, essential: 0 }, { ...EX, grossAnnual: 0 }, { ...EX, grossAnnual: 1e7 }, { ...EX, years: 0 }, { ...EX, age: 17 }, { ...EX, age: 70 }, { ...EX, otherIncome: 5000 }, { ...EX, severance: 1e6 }];
  assert.equal(sn.DATA.ORDER.length, 16);
  for (const c of sn.DATA.ORDER) for (const pr of cases) {
    const r = sn.compute(c, pr, {});
    assert.ok(isFinite(r.score) && r.score >= 0 && r.score <= 100, c);
    for (let i = 0; i < 5; i++) assert.ok(isFinite(r.T[i]) && r.T[i] >= 0 && (i === 0 || r.T[i] >= r.T[i - 1]), `${c} level ${i}`);
  }
});
test('Safety Net: severance lowers the job-loss levels and never the resignation level', () => {
  const a = sn.compute('DE', EX, {}), b = sn.compute('DE', { ...EX, severance: 3000 }, {});
  assert.ok(b.raw.good < a.raw.good && b.raw.vgood < a.raw.vgood);
  assert.equal(b.raw.excellent, a.raw.excellent);
  assert.ok(b.raw.good >= a.A.shockMonths * a.E, 'the surprise bill is always kept');
});

/* ---------- Gains & Greeks ---------- */
const gg = (() => {
  const html = read('gains-greeks/index.html');
  const eng = html.slice(html.indexOf('/*ENGINE-START*/'), html.indexOf('/*ENGINE-END*/'));
  const opt = html.slice(html.indexOf('function ncdf('), html.indexOf('function stepOf('));
  const ctx = { Intl, Math, Number, JSON, Object, Array, String, isFinite, Infinity }; vm.createContext(ctx);
  vm.runInContext(eng + '\n' + opt + '\n;this.G={COUNTRIES,evaluate,bsm,crr,solveIV,FX};', ctx); return ctx.G;
})();
const I = { res: 'DE', broker: 'ibkr', filing: 'single', income: 60000, church: 0, allowUsed: 0, lossCF: 0, lossCFSh: 0, wealthOther: 20000, cap: 50000, gain: 8000, hold: 730, veh: 'eqETF', div: 600, wht: .15, tCap: 15000, opt: 3200, swing: 1500, trades: 60, tHold: 12, turnover: 180000, margin: false, hedgeOnly: false, idx: false };

test('Gains & Greeks: option pricing matches textbook values', () => {
  assert.ok(Math.abs(gg.bsm('call', 100, 100, 1, .05, 0, .2) - 10.4506) < 1e-3);
  assert.ok(Math.abs(gg.bsm('put', 100, 100, 1, .05, 0, .2) - 5.5735) < 1e-3);
  assert.ok(Math.abs(gg.crr('put', 100, 100, 1, .05, 0, .2, 200) - 6.09) < 0.01, 'American put');
  assert.ok(Math.abs(gg.solveIV('call', 10.4506, 100, 100, 1, .05, 0, false) - .2) < 1e-4);
});
test('Gains & Greeks: German default example by hand = 2,606 €', () => {
  // 1,500 + 8,000×70 % + 3,200 + 600 − 1,000 = 9,900; ×25 % − 90 credit = 2,385; + 5.5 % soli 131.18; + 90 withheld abroad
  assert.equal(Math.round(gg.evaluate('DE', I).total), 2606);
});
test('Gains & Greeks: Switzerland gives no tax relief for a loss year', () => {
  const r = gg.evaluate('CH', { ...I, res: 'CH', gain: -20000, opt: -5000, swing: -3000 });
  assert.ok(r.lines.filter(l => !l.wealth).every(l => l.tax == null || l.tax >= 0));
});
test('Gains & Greeks: every country runs on edge profiles without errors', () => {
  const edges = [{}, { gain: 0, opt: 0, swing: 0, div: 0 }, { gain: -20000, opt: -5000, swing: -3000 }, { gain: 5e6, opt: 1e6, cap: 2e7 }, { income: 0 }, { veh: 'shares' }, { veh: 'bondFund' }, { filing: 'joint' }, { hold: 10, tHold: 400 }, { margin: true, hedgeOnly: true }];
  assert.equal(Object.keys(gg.COUNTRIES).length, 38);
  for (const c of Object.keys(gg.COUNTRIES)) for (const e of edges) { const r = gg.evaluate(c, { ...I, res: c, ...e }); assert.ok(isFinite(r.total), c); }
});
test('The two finance apps use the same exchange rates', () => {
  for (const k of ['CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'GBP']) assert.equal(gg.FX[k], sn.DATA.FX[k], k);
});

test('Safety Net: the move planner pieces behave (gap cost with and without the old benefit, new country with and without earlier years)', () => {
  const need = 2000, gap = 180;
  const sim = sn.simulate(sn.plan('DE', EX), 'B', need, 15, gap); let worst = 0; for (let d = 1; d <= gap; d++) worst = Math.max(worst, sim.dd[d]);
  assert.ok(worst > 0 && worst < need * gap / sn.DPM, 'a long gap is cheaper with the benefit than without');
  const short = sn.simulate(sn.plan('DE', EX), 'B', need, 15, 31); assert.ok(Math.abs(short.dd[31] - need * 31 / sn.DPM) < 1, 'inside the 12-week penalty nothing is paid');
  const pb = sn.convertProfile(EX, 'EUR', 'CHF');
  assert.ok(sn.compute('CH', { ...pb, years: 0 }, {}).T[1] > sn.compute('CH', pb, {}).T[1], 'without counted years the fund must be larger');
});

test('Safety Net: household cases are ordered sensibly', () => {
  const pr = { ...EX, essential: 3500, otherIncome: 0, savings: 15000, partner: { on: true, grossAnnual: 45000, netMonthly: 2500, age: 32, years: 5, deTaxClass: '1', severance: 0 } };
  const h = sn.household('DE', pr, {});
  const [you, partner, both] = h.cases;
  assert.equal(you.need, 1000); assert.equal(partner.need, 500); assert.equal(both.need, 3500);
  assert.ok(both.good > you.good && both.good > partner.good, 'both losing work needs the most');
  assert.ok(you.good > partner.good, 'losing the larger salary needs more here');
  for (const c of h.cases) assert.ok(c.vgood >= c.good && isFinite(c.good));
  assert.equal(sn.household('DE', { ...EX }, {}), null);
  const conv = sn.convertProfile(pr, 'EUR', 'CHF'); assert.ok(conv.partner.netMonthly > 2500 * 0.9 && conv.partner.netMonthly < 2500 && pr.partner.netMonthly === 2500);
});
