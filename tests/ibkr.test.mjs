/* Gains & Greeks: one IBKR statement updates the Tax desk, the capital fields, Move abroad and the Options lab. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../gains-greeks/index.html', import.meta.url), 'utf8');
const fx = html.slice(html.indexOf('const FX={'), html.indexOf('\n', html.indexOf('const FX={')));
const block = html.slice(html.indexOf('/*IBKR-START*/'), html.indexOf('/*IBKR-END*/')).replace(/^if\(typeof state[^\n]*\n/m, '');
const { ibParse, ibApply, IB_SAMPLE, ibOptSym } = new Function(fx + '\n' + block + '; return { ibParse, ibApply, IB_SAMPLE, ibOptSym };')();

const P = { swing: 1500, opt: 3200, gain: 8000, veh: 'shares', div: 600, wht: 15, trades: 60, turnover: 180000, tHold: 12, cap: 50000, tCap: 15000 }, M = { V: 60000, U: 12000 };

test('Flex Query: trades, dividends, open positions and account value', () => {
  const R = ibParse(IB_SAMPLE);
  assert.equal(R.fmt, 'Flex Query'); assert.equal(R.nTrades, 10);
  assert.ok(R.b.funds.n === 1 && R.b.stocks.n === 4 && R.b.options.n === 4 && R.b.futures.n === 1);
  assert.equal(R.pos.length, 3); assert.equal(R.nav, 88403.04);
  assert.equal(Math.round(R.fundVal), 62244, 'VWCE held counts as capital invested');
  assert.ok(R.turnover > 0); assert.ok(R.period.from <= R.period.to);
  const o = R.pos.find(q => q.cls === 'OPT'); assert.equal(o.und, 'AAPL'); assert.equal(o.strike, 260); assert.equal(o.expiry, '2026-12-18'); assert.equal(o.right, 'C');
});

test('applying the statement fills the Tax desk, the capital fields and Move abroad, and lists every change', () => {
  const R = ibParse(IB_SAMPLE), A = ibApply(R, P, M), net = k => R.b[k].pos + R.b[k].neg;
  assert.equal(A.p.swing, Math.round(net('stocks')));
  assert.equal(A.p.opt, Math.round(net('options') + net('futures') + net('other')));
  assert.equal(A.p.gain, Math.round(net('funds'))); assert.equal(A.p.veh, 'eqETF');
  assert.equal(A.p.div, Math.round(R.cash.div + R.cash.int));
  assert.equal(A.p.cap, 62244); assert.equal(A.p.tCap, Math.round(88403.04 - 62244));
  assert.equal(A.m.V, 88403); assert.equal(A.m.U, Math.round(R.upl));
  assert.ok(A.changes.length >= 10 && A.changes.every(c => c.label));
  /* the inputs themselves are left untouched until the app takes the result */
  assert.equal(P.cap, 50000); assert.equal(M.V, 60000);
  /* a second import of the same statement changes nothing */
  assert.equal(ibApply(R, A.p, A.m).changes.length, 0);
});

test('Activity Statement: trades with proceeds, open positions with option symbols, net asset value', () => {
  const csv = [
    'Statement,Data,Period,"January 1, 2026 - November 20, 2026"',
    'Base Currency Exchange Rate,Header,Currency,Rate', 'Base Currency Exchange Rate,Data,USD,0.862',
    'Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,Proceeds,Comm/Fee,Realized P/L',
    'Trades,Data,Order,Stocks,USD,NVDA,"2026-02-12, 10:31:00",-40,182.4,7296,-1,1384.2',
    'Trades,Data,Order,Stocks,EUR,VWCE,"2026-07-14, 09:05:00",-30,142.6,4278,-3,1250',
    'Dividends,Header,Currency,Date,Description,Amount', 'Dividends,Data,USD,2026-05-15,MSFT Cash Dividend,220', 'Dividends,Data,Total,,,220',
    'Withholding Tax,Header,Currency,Date,Description,Amount', 'Withholding Tax,Data,USD,2026-05-15,MSFT US Tax,-33',
    'Open Positions,Header,DataDiscriminator,Asset Category,Currency,Symbol,Quantity,Mult,Cost Price,Cost Basis,Close Price,Value,Unrealized P/L',
    'Open Positions,Data,Summary,Stocks,EUR,VWCE,420,1,121.5,51030,148.2,62244,11214',
    'Open Positions,Data,Summary,Equity and Index Options,USD,AAPL 18DEC26 260 C,-2,100,8.6,-1720,6.4,-1280,440',
    'Net Asset Value,Header,Asset Class,Prior Total,Current Long,Current Short,Current Total,Change',
    'Net Asset Value,Data,Total,70000,89500,-1100,88400,18400'
  ].join('\n');
  const R = ibParse(csv);
  assert.equal(R.fmt, 'Activity Statement'); assert.equal(R.nav, 88400); assert.equal(R.pos.length, 2);
  assert.equal(R.period.label, 'January 1, 2026 - November 20, 2026');
  assert.ok(Math.abs(R.turnover - (7296 * 0.862 + 4278)) < 0.01);
  const o = R.pos.find(q => q.cls === 'OPT'); assert.equal(o.und, 'AAPL'); assert.equal(o.expiry, '2026-12-18'); assert.equal(o.qty, -2);
  assert.ok(Math.abs(o.value - (-1280 * 0.862)) < 0.01);
  const A = ibApply(R, P, M); assert.equal(A.p.cap, 62244); assert.equal(A.m.V, 88400);
  assert.deepEqual(ibOptSym('SPY 20MAR26 560 P'), { und: 'SPY', expiry: '2026-03-20', strike: 560, right: 'P' });
});

test('a trades-only export leaves the capital fields alone; nonsense is refused with a hint', () => {
  const tradesOnly = IB_SAMPLE.slice(0, IB_SAMPLE.indexOf('\n\n"AssetClass","Symbol","UnderlyingSymbol"'));
  const A = ibApply(ibParse(tradesOnly), P, M);
  assert.equal(A.p.cap, P.cap); assert.equal(A.m.V, M.V); assert.notEqual(A.p.swing, P.swing);
  const bad = ibParse('hello,world\n1,2');
  assert.ok(bad.warn.length); assert.equal(ibApply(bad, P, M).changes.length, 0);
});
