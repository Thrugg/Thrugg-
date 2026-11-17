/* The "ask" function's task table: prompts, schemas and answer parsing, run without network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('/*TASKS-START*/'), src.indexOf('/*TASKS-END*/'));
const { TASKS, requests, notesOf, parseAnswer, MODEL } = new Function(body + '; return { TASKS, requests, notesOf, parseAnswer, MODEL };')();

/* every object in a schema must close its properties and list every one as required (structured outputs rule) */
function strict(schema, path = 'root') {
  if (schema.type === 'object') {
    assert.equal(schema.additionalProperties, false, path);
    assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort(), path);
    for (const [k, v] of Object.entries(schema.properties)) strict(v, path + '.' + k);
  }
  if (schema.type === 'array') strict(schema.items, path + '[]');
  for (const a of schema.anyOf || []) strict(a, path + '|');
}

test('ask: every task has a closed schema, a system prompt and a prompt that survives empty input', () => {
  assert.ok(Object.keys(TASKS).length >= 5);
  for (const [k, t] of Object.entries(TASKS)) {
    strict(t.schema, k);
    assert.ok(t.system.length > 40, k);
    assert.equal(typeof t.prompt({}), 'string', k);
  }
});

test('ask: web tasks research first with web search, others answer in one call', () => {
  const sim = requests('fragrance_similar', { fragrance: { house: 'Hermès', name: "Terre d'Hermès", notes: { top: ['orange'], heart: ['flint'], base: ['vetiver'] } } });
  assert.equal(sim.research, null);
  const f = sim.format(null);
  assert.equal(f.model, MODEL); assert.equal(f.output_config.format.type, 'json_schema'); assert.ok(!f.tools);
  assert.match(f.messages[0].content, /Terre d'Hermès/);
  assert.deepEqual(f.betas, ['server-side-fallback-2026-07-01']); assert.equal(f.fallbacks, 'default');
  const pl = requests('place_prices', { place: 'Schwabing, Munich', country: 'Germany', currency: 'EUR', size: 70 });
  assert.equal(pl.research.tools[0].type, 'web_search_20260209'); assert.ok(!pl.research.output_config.format);
  const f2 = pl.format('Notes: 9,800 €/m² (source)');
  assert.match(f2.messages[0].content, /9,800/); assert.ok(!f2.tools); assert.equal(f2.output_config.effort, 'low');
  assert.equal(requests('rm -rf', {}), null);
});

test('ask: inputs are trimmed so a request stays small', () => {
  const long = 'x'.repeat(5000);
  const r = requests('fragrance_similar', { fragrance: { house: long, name: long }, wardrobe: Array.from({ length: 500 }, () => ({ house: 'A', name: 'B' })) });
  assert.ok(r.format(null).messages[0].content.length < 4000);
});

test('ask: research notes keep the source links; answers parse or report why not', () => {
  const n = notesOf([{ type: 'web_search_tool_result', content: [{ url: 'https://example.org/a', title: 'Report A' }] }, { type: 'text', text: 'Price 9,800 €/m²', citations: [{ url: 'https://example.org/b', title: 'B' }] }]);
  assert.match(n, /9,800/); assert.match(n, /Report A: https:\/\/example.org\/a/); assert.match(n, /B: https:\/\/example.org\/b/);
  assert.deepEqual(parseAnswer({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"items":[]}' }] }), { data: { items: [] } });
  assert.deepEqual(parseAnswer({ stop_reason: 'refusal', content: [] }), { error: 'refused' });
  assert.deepEqual(parseAnswer({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }] }), { error: 'bad_answer' });
});

test('ask: Écurie tasks research a car, check live ads, and read an ad screenshot only from a valid image', () => {
  const lk = requests('car_lookup', { car: { name: 'BMW M550i xDrive', year: 2021, ps: 530, km: 60000, options: ['air', 'exhaust'] } });
  assert.equal(lk.research.tools[0].type, 'web_search_20260209');
  assert.match(lk.research.messages[0].content, /M550i/); assert.match(lk.research.messages[0].content, /60000/);
  const mk = requests('car_market', { car: { name: 'Golf GTI', year: 2021, km: 50000 } });
  assert.ok(mk.research); assert.match(mk.format('notes').messages[0].content, /Golf GTI/);
  const png = 'iVBORw0KGgo' + 'A'.repeat(200);
  const ad = requests('car_ad_read', { image: png, media: 'image/png' });
  assert.equal(ad.research, null);
  const c = ad.format(null).messages[0].content;
  assert.ok(Array.isArray(c)); assert.equal(c[0].type, 'image'); assert.equal(c[0].source.media_type, 'image/png'); assert.equal(c[1].type, 'text');
  /* a wrong type or a non-base64 payload is dropped, so the task answers "not readable" instead of failing */
  assert.equal(typeof requests('car_ad_read', { image: png, media: 'application/pdf' }).format(null).messages[0].content, 'string');
  assert.equal(typeof requests('car_ad_read', { image: 'not base64 <script>', media: 'image/jpeg' }).format(null).messages[0].content, 'string');
  assert.equal(typeof requests('car_ad_read', {}).format(null).messages[0].content, 'string');
});
