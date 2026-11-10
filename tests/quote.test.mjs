/* The price function (supabase/functions/quote/index.ts): its two parsers, run against recorded answer shapes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../supabase/functions/quote/index.ts', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('const UA ='), src.indexOf('Deno.serve')).replace(/export /g, '').replace(/\((\w+): string, fetchFn = fetch\)/g, '($1, fetchFn = fetch)');
const { yahoo, stooq } = new Function(body + '; return { yahoo, stooq };')();
const res = (status, data, text) => async () => ({ ok: status < 400, status, json: async () => data, text: async () => text });

test('quote: Yahoo answer gives the price and its exchange', async () => {
  const m = await yahoo('SAP.DE', res(200, { chart: { result: [{ meta: { symbol: 'SAP.DE', regularMarketPrice: 231.4, currency: 'EUR', priceHint: 2, regularMarketTime: 1762790400, fullExchangeName: 'XETRA' } }], error: null } }));
  assert.equal(m.regularMarketPrice, 231.4); assert.equal(m.currency, 'EUR'); assert.equal(m.fullExchangeName, 'XETRA');
});
test('quote: unknown symbol is reported as not found', async () => {
  assert.deepEqual(await yahoo('ZZZZ', res(404, {})), { notFound: true });
  assert.deepEqual(await yahoo('ZZZZ', res(200, { chart: { result: null, error: { code: 'Not Found' } } })), { notFound: true });
});
test('quote: Stooq fallback for US symbols only', async () => {
  const m = await stooq('AAPL', res(200, null, 'Symbol,Date,Time,Close\nAAPL.US,2026-11-09,22:00:09,268.47\n'));
  assert.equal(m.regularMarketPrice, 268.47); assert.equal(m.currency, 'USD');
  assert.equal(await stooq('SAP.DE', res(200, null, '')), null);
  assert.equal(await stooq('AAPL', res(200, null, 'Symbol,Date,Time,Close\nAAPL.US,N/D,N/D,N/D\n')), null);
});
