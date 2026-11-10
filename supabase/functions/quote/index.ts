// Supabase Edge Function "quote": the last price of a stock, ETF or index, for the options lab in Gains & Greeks.
// Only a signed-in user of this project may call it. Source: Yahoo Finance's public chart endpoint, with Stooq as a
// fallback for US symbols. Prices are delayed or last close; they are a starting point for the model, not for trading.
// Deploy: Supabase dashboard → Edge Functions → Deploy a new function → Via editor → name it "quote" → paste this file.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=60' } });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

export async function yahoo(sym: string, fetchFn = fetch) {
  const r = await fetchFn(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (r.status === 404) return { notFound: true };
  if (!r.ok) throw new Error('Yahoo ' + r.status);
  const d = await r.json();
  if (d?.chart?.error) return { notFound: true };
  const m = d?.chart?.result?.[0]?.meta;
  if (!m || !(m.regularMarketPrice > 0)) throw new Error('Yahoo: no price');
  return {
    symbol: m.symbol || sym, regularMarketPrice: m.regularMarketPrice, currency: m.currency, priceHint: m.priceHint,
    regularMarketTime: m.regularMarketTime, exchangeName: m.exchangeName, fullExchangeName: m.fullExchangeName,
    currentTradingPeriod: m.currentTradingPeriod, source: 'Yahoo Finance',
  };
}
export async function stooq(sym: string, fetchFn = fetch) {
  if (!/^[A-Z][A-Z0-9-]{0,6}$/.test(sym)) return null; // US symbols only: no suffix
  const r = await fetchFn(`https://stooq.com/q/l/?s=${sym.toLowerCase()}.us&f=sd2t2c&h&e=csv`, { headers: { 'User-Agent': UA } });
  if (!r.ok) return null;
  const [, row] = (await r.text()).trim().split('\n');
  const [, date, time, close] = (row || '').split(',');
  const px = Number(close);
  if (!(px > 0)) return null;
  const t = Date.parse(`${date}T${time || '22:00:00'}Z`);
  return { symbol: sym, regularMarketPrice: px, currency: 'USD', regularMarketTime: isFinite(t) ? Math.round(t / 1000) : undefined, exchangeName: 'Stooq', source: 'Stooq' };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const auth = req.headers.get('Authorization') || '';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (!user) return json({ error: 'sign_in' }, 401);
  let sym = '';
  try { sym = String((await req.json())?.s || ''); } catch { /* empty body */ }
  sym = sym.trim().toUpperCase();
  if (!/^[\^A-Z0-9.\-=]{1,15}$/.test(sym)) return json({ error: 'bad_symbol' }, 400);
  try {
    const y = await yahoo(sym);
    if ('notFound' in y) return json({ error: 'not_found' }, 404);
    return json(y);
  } catch (e) {
    const s = await stooq(sym).catch(() => null);
    if (s) return json(s);
    return json({ error: 'unavailable', detail: String((e as Error).message || e).slice(0, 120) }, 502);
  }
});
