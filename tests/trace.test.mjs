/* The route tracer used on GitHub, run against simulated Nominatim and BRouter answers. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTracer, decode, encode, routeKey } from '../tools/trace_routes.mjs';

const line = [[11.0, 47.4, 1000], [11.001, 47.4005, 1010], [11.002, 47.401, 1025], [11.004, 47.402, 1060], [11.006, 47.4035, 1100], [11.008, 47.405, 1180]];
function fakeFetch(log) {
  return async url => {
    log.push(url);
    if (url.includes('nominatim')) return { ok: true, json: async () => [{ lat: '47.4051', lon: '11.0081', category: 'natural', type: 'peak' }] };
    if (url.includes('brouter')) return { ok: true, status: 200, json: async () => ({ features: [{ geometry: { coordinates: line }, properties: {} }] }) };
    throw new Error('unexpected ' + url);
  };
}
test('tracer: snaps the top, routes with BRouter, keeps the app\'s key and stats', async () => {
  const log = [], { trace } = makeTracer(fakeFetch(log), async () => { });
  const h = { id: 'x', p: [[47.4, 11.0], [47.405, 11.008]], ty: 'out', tn: 'Testkopf', tk: 'peak' };
  const r = await trace(h);
  assert.equal(r.wk, routeKey(h)); assert.equal(r.src, 'brouter'); assert.equal(r.snapped, true);
  assert.ok(log[0].includes('nominatim') && log[1].includes('brouter') && log[1].includes('47.40510'));
  assert.ok(r.km > 0.8 && r.km < 1.2, String(r.km)); assert.equal(r.asc, 180); assert.equal(r.mx, 1180);
  const c = decode(r); assert.deepEqual(c[0], [11, 47.4, 1000]); assert.deepEqual(c[c.length - 1], [11.008, 47.405, 1180]);
});
test('tracer: a loop returns to the start', async () => {
  const log = [], { trace } = makeTracer(fakeFetch(log), async () => { });
  await trace({ id: 'l', p: [[47.4, 11.0], [47.405, 11.008]], ty: 'loop' });
  const ll = decodeURIComponent(log.find(u => u.includes('brouter')).split('lonlats=')[1].split('&')[0]).split('|');
  assert.equal(ll.length, 3); assert.equal(ll[0], ll[2]);
});
test('route encoding round-trips', () => {
  const c = [[11.12345, 47.54321, 1200], [11.12399, 47.54001, null], [10.99999, 47.6, 980]];
  assert.deepEqual(decode(encode(c)), c);
});

test('build warns when the catalogue disagrees with the traced line', async () => {
  const { execFileSync } = await import('node:child_process');
  const out = execFileSync('python3', ['-I', '-c', `
import sys, json; sys.path.insert(0, 'tools'); import build
h = [{"id": "t", "p": [[47.4, 11.0], [47.405, 11.008]], "ty": "out", "km": 10, "up": 900}]
import pathlib, tempfile
d = pathlib.Path(tempfile.mkdtemp()); (d / 'routes.json').write_text(json.dumps({"by": {"t": {"wk": json.dumps(h[0]["p"], separators=(",", ":")) + "|out", "km": 2.0, "asc": 300, "desc": 20}}}))
build.DATA = d
print(json.dumps(build.route_warnings(h)))`], { encoding: 'utf8' });
  const w = JSON.parse(out); assert.equal(w.length, 2); assert.match(w[0], /4\.0 km/); assert.match(w[1], /320 m/);
});
