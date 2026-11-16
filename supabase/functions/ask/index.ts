// Supabase Edge Function "ask": Claude for the apps on this site (Sillage, Seuil, Grand Tour…).
// The apps never send a free prompt: each request names one of the TASKS below and passes its input. The function
// builds the prompt, calls Claude (Opus 5.5), and returns JSON that matches the task's schema.
// Tasks marked web: true first research with web search, then a second, cheaper call turns the notes into the JSON.
//
// Security: only a signed-in user of this project may call it; set ASK_ALLOWED (comma-separated emails) to limit it
// further. A daily cap per user (ASK_DAILY_LIMIT, default 40) is kept in the table ask_usage (supabase/ask.sql).
// Secrets: ANTHROPIC_API_KEY (Supabase dashboard → Edge Functions → Secrets). The key never reaches the browser.
// Deploy: Supabase dashboard → Edge Functions → Deploy a new function → Via editor → name it "ask" → paste this file.
import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@1.4.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/*TASKS-START*/
const MODEL = 'claude-opus-5-5';
const S = (properties, required) => ({ type: 'object', properties, required: required || Object.keys(properties), additionalProperties: false });
const str = { type: 'string' }, num = { type: 'number' }, bool = { type: 'boolean' };
const nstr = { anyOf: [{ type: 'string' }, { type: 'null' }] }, nnum = { anyOf: [{ type: 'number' }, { type: 'null' }] };
const arr = items => ({ type: 'array', items });
const notes = S({ top: arr(str), heart: arr(str), base: arr(str) });
const sources = arr(S({ title: str, url: str }));
const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
const list = (a, n) => (Array.isArray(a) ? a : []).slice(0, n);

/* A fragrance as the apps send it, trimmed so a request stays small. */
const frag = f => ({ house: clip(f && f.house, 60), name: clip(f && f.name, 80), family: clip(f && f.family, 20), conc: clip(f && f.conc, 12),
  notes: f && f.notes ? { top: list(f.notes.top, 8).map(x => clip(x, 30)), heart: list(f.notes.heart, 8).map(x => clip(x, 30)), base: list(f.notes.base, 8).map(x => clip(x, 30)) } : undefined,
  grade: typeof (f && f.grade) === 'number' ? f.grade : undefined, wears: typeof (f && f.wears) === 'number' ? f.wears : undefined,
  seasons: list(f && f.seasons, 4), occasions: list(f && f.occ, 5) });
const FRAG_SYSTEM = 'You are a perfumer and fragrance adviser. You know the notes, accords, families, perfumers and positioning of designer and niche fragrances. Name only fragrances that really exist, with their house exactly as sold. Explain each suggestion with concrete notes and accords, in plain English, one or two sentences. Never invent notes.';

const TASKS = {
  /* Sillage SI-1: fragrances similar to one bottle */
  fragrance_similar: {
    web: false, effort: 'medium',
    system: FRAG_SYSTEM,
    prompt: i => `Suggest five fragrances similar to this one, for someone who owns it:\n${JSON.stringify(frag(i.fragrance))}\n\nTheir wardrobe (do not suggest these): ${JSON.stringify(list(i.wardrobe, 60).map(f => `${clip(f.house, 60)} ${clip(f.name, 80)}`))}\nAlready listed or dropped (do not suggest): ${JSON.stringify(list(i.exclude, 60).map(x => clip(x, 120)))}\n\nMix: mostly close matches, one cheaper alternative if one exists, and one interesting twist. For each, give the shared notes, what is different, and its main notes.`,
    schema: S({ items: arr(S({ house: str, name: str, kind: { type: 'string', enum: ['close', 'cheaper', 'flanker', 'twist'] }, why: str, shared: arr(str), different: str, family: str, price_band: { type: 'string', enum: ['budget', 'mid', 'premium', 'niche'] }, notes })), summary: str }),
  },
  /* Sillage SI-2: a written portrait of the wardrobe; the numbers are computed in the app and sent along */
  fragrance_profile: {
    web: false, effort: 'medium',
    system: FRAG_SYSTEM,
    prompt: i => `Write a short scent profile for this person from their wardrobe. Grades are out of 10; wears are how often each was worn, which shows real preference.\nWardrobe: ${JSON.stringify(list(i.bottles, 60).map(frag))}\nAccord weights computed by the app (0–1): ${JSON.stringify(i.accords || {})}\n\nGive: an archetype in 2–5 words, a portrait of 2–3 sentences addressed as "you", what they reliably love, the gaps in the wardrobe (seasons, occasions, families or notes missing), and notes worth trying.`,
    schema: S({ archetype: str, portrait: str, loves: arr(str), gaps: arr(S({ gap: str, why: str })), try_notes: arr(str) }),
  },
  /* Sillage SI-3: next purchases in three lanes, checked against what is on sale and easy to sample now */
  fragrance_next: {
    web: true, effort: 'medium', maxSearches: 4,
    system: FRAG_SYSTEM,
    prompt: i => `Suggest the next fragrances to buy for this person, in three lanes: two "safe" (very close to what they love), two "gap" (fill a missing season, occasion or family), two "wild" (one step outside, still in their taste).\nWardrobe: ${JSON.stringify(list(i.bottles, 60).map(frag))}\nProfile: ${JSON.stringify(i.profile || {})}\nBudget per bottle: ${clip(i.budget || 'any', 30)} ${clip(i.currency || 'EUR', 4)}\nDo not suggest owned, listed or dropped scents: ${JSON.stringify(list(i.exclude, 80).map(x => clip(x, 120)))}\nCheck with web search that each is currently sold, its usual price, and whether samples or decants are easy to find in ${clip(i.country || 'Germany', 30)}.`,
    schema: S({ picks: arr(S({ lane: { type: 'string', enum: ['safe', 'gap', 'wild'] }, house: str, name: str, why: str, price: nstr, price_band: { type: 'string', enum: ['budget', 'mid', 'premium', 'niche'] }, sample: S({ easy: bool, where: str }), family: str, notes })), sources }),
  },
  /* Seuil SE-3: price and rent levels for a place */
  place_prices: {
    web: true, effort: 'medium', maxSearches: 5,
    system: 'You research residential property markets. Use recent, reputable sources (statistics offices, central banks, large listing portals\' market reports, notary or valuation reports). Report figures for typical existing homes, not new-build premium, unless asked. Say which year and quarter the figures describe. If sources disagree, give the middle and say so.',
    prompt: i => `Find the typical purchase price per square metre and the typical asking rent per square metre per month for a ${clip(i.kind || 'flat', 30)} of about ${Number(i.size) || 70} m² in ${clip(i.place, 80)}, ${clip(i.country, 40)}. Give amounts in ${clip(i.currency || 'EUR', 4)}. Also give a typical yearly price growth over the last 10 years if a source reports it.`,
    schema: S({ place: str, price_m2: nnum, rent_m2: nnum, growth_10y_pct: nnum, period: str, confidence: { type: 'string', enum: ['high', 'medium', 'low'] }, note: str, sources }),
  },
  /* Grand Tour GT-4: hotels that match the person's weights */
  hotel_suggest: {
    web: true, effort: 'medium', maxSearches: 5,
    system: 'You suggest five-star hotels. Only real, currently open hotels. Give the rate for a standard double room in the main season, as published or as typically found on booking sites, with the season it applies to. Be candid about weaknesses.',
    prompt: i => `Suggest five hotels for this person.\nHome: ${clip(i.home && i.home.name, 60)} (${Number(i.home && i.home.lat).toFixed(2)}, ${Number(i.home && i.home.lon).toFixed(2)}). Maximum drive: ${Number(i.maxDrive) || 5} hours (or a short flight if they say so: ${clip(i.wish, 300)}).\nWhat matters (weight 0 = ignore, 3 = most): ${JSON.stringify(i.weights || {})}\nPrice bands they use (per night): ${JSON.stringify(i.bands || [])}\nAlready on their list: ${JSON.stringify(list(i.exclude, 80).map(x => clip(x, 120)))}\nFor each: name, town, country, coordinates, a drive-time estimate from home, the rate and season, which criteria it is strong on, and why it fits.`,
    schema: S({ hotels: arr(S({ name: str, town: str, country: str, lat: nnum, lon: nnum, drive_h: nnum, rate: nnum, currency: str, season: str, strong: arr({ type: 'string', enum: ['pool', 'spa', 'parking', 'gym', 'room', 'service', 'food', 'dog'] }), dogs: { type: 'string', enum: ['welcome', 'some rooms', 'no', 'unknown'] }, why: str, url: nstr })), sources }),
  },
};

/* Two calls for web tasks: research (web search, free text with sources), then format (JSON schema, no tools). */
function requests(task, input) {
  const t = TASKS[task];
  if (!t) return null;
  const base = { model: MODEL, max_tokens: 16000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };
  const ask = t.prompt(input || {});
  const format = notesText => ({ ...base, output_config: { effort: 'low', format: { type: 'json_schema', schema: t.schema } }, system: t.system,
    messages: [{ role: 'user', content: notesText ? `${ask}\n\nYour research notes (use them; keep the source links):\n${notesText}\n\nNow answer in the required format.` : ask }] });
  if (!t.web) return { research: null, format: () => ({ ...format(null), output_config: { effort: t.effort, format: { type: 'json_schema', schema: t.schema } } }) };
  return {
    research: { ...base, output_config: { effort: t.effort }, system: t.system + ' Research with web search, then write compact notes: each figure or claim with its source title and URL.',
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: t.maxSearches || 4 }], messages: [{ role: 'user', content: ask }] },
    format,
  };
}
/* Text and source links from a research answer (web search results and cited text blocks). */
function notesOf(content) {
  const out = [], urls = new Map();
  for (const b of content || []) {
    if (b.type === 'text' && b.text) out.push(b.text);
    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) for (const r of b.content) if (r && r.url) urls.set(r.url, r.title || r.url);
    if (b.type === 'text' && Array.isArray(b.citations)) for (const c of b.citations) if (c && c.url) urls.set(c.url, c.title || c.url);
  }
  const links = [...urls].slice(0, 20).map(([u, t]) => `- ${t}: ${u}`).join('\n');
  return (out.join('\n').trim() + (links ? '\n\nSources found:\n' + links : '')).slice(0, 30000);
}
function parseAnswer(msg) {
  if (!msg) throw new Error('empty');
  if (msg.stop_reason === 'refusal') return { error: 'refused' };
  if (msg.stop_reason === 'max_tokens') return { error: 'too_long' };
  const text = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  try { return { data: JSON.parse(text) }; } catch { return { error: 'bad_answer' }; }
}
/*TASKS-END*/

async function overLimit(userId: string): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return false;
  const admin = createClient(url, key), day = new Date().toISOString().slice(0, 10), cap = Number(Deno.env.get('ASK_DAILY_LIMIT') || 40);
  const { data, error } = await admin.from('ask_usage').select('n').eq('user_id', userId).eq('day', day).maybeSingle();
  if (error) return false;                                   // table not created: no cap
  const n = (data?.n || 0) + 1;
  if (n > cap) return true;
  await admin.from('ask_usage').upsert({ user_id: userId, day, n });
  return false;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const auth = req.headers.get('Authorization') || '';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (!user) return json({ error: 'sign_in' }, 401);
  const allowed = (Deno.env.get('ASK_ALLOWED') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (allowed.length && !allowed.includes(String(user.email || '').toLowerCase())) return json({ error: 'not_allowed' }, 403);
  if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ error: 'no_key' }, 503);
  let body: { task?: string; input?: unknown } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const plan = requests(String(body.task || ''), body.input);
  if (!plan) return json({ error: 'unknown_task' }, 400);
  if (await overLimit(user.id)) return json({ error: 'limit' }, 429);
  const client = new Anthropic();
  try {
    let notes: string | null = null;
    if (plan.research) {
      const messages = [...plan.research.messages];
      for (let i = 0; i < 3; i++) {                           // a long search turn can pause; send it back to continue
        // deno-lint-ignore no-explicit-any
        const r: any = await client.beta.messages.create({ ...plan.research, messages } as any);
        if (r.stop_reason === 'refusal') return json({ error: 'refused' }, 422);
        if (r.stop_reason === 'pause_turn') { messages.push({ role: 'assistant', content: r.content }); continue; }
        notes = notesOf(r.content); break;
      }
    }
    // deno-lint-ignore no-explicit-any
    const msg: any = await client.beta.messages.create(plan.format(notes) as any);
    const out = parseAnswer(msg);
    if (out.error) return json({ error: out.error }, 422);
    return json({ task: body.task, data: out.data, model: msg.model });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: 'no_key' }, 503);
    if (e instanceof Anthropic.APIError) return json({ error: 'api', detail: String(e.message).slice(0, 160) }, 502);
    return json({ error: 'unavailable', detail: String((e as Error).message || e).slice(0, 160) }, 502);
  }
});
