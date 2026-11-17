/* ask.js: the questions handed to the Claude app, and reading the pasted answers back. Runs without a browser. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
createRequire(import.meta.url)('../ask.js');
const { TASKS, question, parse } = globalThis.Ask;

/* every object in a schema closes its properties and lists every one as required, so the shape Claude is asked for is exact */
function strict(schema, path = 'root') {
  if (schema.type === 'object') {
    assert.equal(schema.additionalProperties, false, path);
    assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort(), path);
    for (const [k, v] of Object.entries(schema.properties)) strict(v, path + '.' + k);
  }
  if (schema.type === 'array') strict(schema.items, path + '[]');
  for (const a of schema.anyOf || []) strict(a, path + '|');
}

test('ask: every task has a closed schema, a system text and a question that survives empty input', () => {
  assert.ok(Object.keys(TASKS).length >= 8);
  for (const [k, t] of Object.entries(TASKS)) {
    strict(t.schema, k); assert.ok(t.system.length > 40, k);
    const q = question(k, {}); assert.equal(typeof q, 'string', k);
    assert.match(q, /```json/); assert.ok(q.includes(JSON.stringify(t.schema)), k);
  }
  assert.equal(question('rm -rf', {}), null);
});

test('ask: questions carry the input, ask for web search when needed, and stay a sensible size', () => {
  const q = question('car_lookup', { car: { name: 'BMW M550i xDrive', year: 2021, ps: 530, km: 60000, options: ['Air suspension'] } });
  assert.match(q, /M550i/); assert.match(q, /60000/); assert.match(q, /Search the web/);
  assert.match(question('car_ad_read', {}), /screenshot is attached/);
  assert.doesNotMatch(question('fragrance_similar', { fragrance: { house: 'Hermès', name: "Terre d'Hermès" } }), /Search the web/);
  const long = 'x'.repeat(5000);
  assert.ok(question('fragrance_similar', { fragrance: { house: long, name: long }, wardrobe: Array.from({ length: 500 }, () => ({ house: 'A', name: 'B' })) }).length < 8000);
});

test('ask: pasted answers are read from a code block or plain text, and wrong pastes are refused', () => {
  const ans = 'Here you go:\n\n```json\n{"place":"Munich","price_m2":9800,"rent_m2":22.5,"growth_10y_pct":4.1,"period":"Q3 2026","confidence":"medium","note":"","sources":[]}\n```\nHope this helps.';
  assert.equal(parse('place_prices', ans).price_m2, 9800);
  assert.equal(parse('place_prices', '{"place":"x","price_m2":1,"rent_m2":2,"growth_10y_pct":null,"period":"","confidence":"low","note":"","sources":[]}').rent_m2, 2);
  const partial = parse('place_prices', '{"place":"x","price_m2":1,"rent_m2":2,"period":"","confidence":"low","note":"","sources":[]}');
  assert.equal(partial.growth_10y_pct, null, 'a missing key reads as unknown');
  assert.throws(() => parse('place_prices', 'Sorry, I cannot help with that.'), e => e.code === 'no_json');
  assert.throws(() => parse('place_prices', '```json\n{"place": "x", oops}\n```'), e => e.code === 'no_json');
  assert.throws(() => parse('car_lookup', '{"place":"Munich","price_m2":9800}'), e => e.code === 'wrong');
});
