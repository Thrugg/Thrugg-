/* Sync tests for cloud.js: two simulated devices and a simulated Supabase table.
   Run with: node --test tests/ */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SRC = fs.readFileSync(new URL('../cloud.js', import.meta.url), 'utf8');
/* Postgres jsonb returns object keys sorted by length, then alphabetically */
const jsonb = o => Array.isArray(o) ? o.map(jsonb) : o && typeof o === 'object'
  ? Object.fromEntries(Object.keys(o).sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0)).map(k => [k, jsonb(o[k])])) : o;

function server() { return { row: null, writes: 0, online: true }; }
function device(srv, opts = {}) {
  const store = new Map(), sess = new Map();
  class Storage { getItem(k) { return this._m.has(k) ? this._m.get(k) : null; } setItem(k, v) { this._m.set(k, String(v)); } removeItem(k) { this._m.delete(k); } }
  const localStorage = new Storage(); localStorage._m = store;
  const sessionStorage = new Storage(); sessionStorage._m = sess;
  const dev = { store, reloads: 0, remotes: 0 };
  const table = {
    select() { return { eq() { return { async maybeSingle() { if (!srv.online) return { error: new Error('offline') }; return { data: srv.row ? { data: jsonb(JSON.parse(JSON.stringify(srv.row.data))), client_ts: srv.row.client_ts } : null }; } }; } }; },
    async upsert(r) { if (!srv.online) return { error: new Error('offline') }; srv.row = { data: JSON.parse(JSON.stringify(r.data)), client_ts: r.client_ts }; srv.writes++; return {}; }
  };
  const sb = { auth: { async getSession() { return { data: { session: { user: { email: 'a@b.c' } } } }; }, onAuthStateChange() { } }, from: () => table };
  const doc = { readyState: 'complete', visibilityState: 'visible', addEventListener() { }, getElementById: () => ({}), createElement: () => ({ dataset: {}, setAttribute() { }, querySelector: () => ({}) }), head: { appendChild() { } }, body: { appendChild() { } } };
  const ctx = { Storage, localStorage, sessionStorage, document: doc, location: { reload() { dev.reloads++; } }, console, setTimeout, clearTimeout, Date, JSON, Promise, Set, Object, String, Array, Error };
  ctx.window = ctx; ctx.supabase = { createClient: () => sb };
  vm.createContext(ctx); vm.runInContext(SRC, ctx);
  dev.Cloud = ctx.Cloud; dev.ls = localStorage;
  dev.mirror = ctx.Cloud.mirror('app', 'k', opts);
  dev.get = () => JSON.parse(localStorage.getItem('k'));
  dev.set = v => localStorage.setItem('k', JSON.stringify(v));
  dev.sync = async () => { await dev.mirror.sync(); await new Promise(r => setTimeout(r, 5)); };
  return dev;
}
const tick = ms => new Promise(r => setTimeout(r, ms));
const START = { v: 1, tab: 'score', asm: { shockMonths: 1, lagDays: 15, typicalMonths: 6 }, profiles: { DE: { gross: 55000, savings: 8000 } } };
const O = { ignore: ['tab'] };

test('a fresh device takes the cloud copy and never uploads its example data', async () => {
  const srv = server(), mac = device(srv, O); await tick(5);
  mac.set({ ...START, profiles: { DE: { gross: 70000, savings: 20000 } } }); await mac.sync();
  const phone = device(srv, O); phone.ls._m.set('k', JSON.stringify(START)); await phone.sync();
  assert.equal(phone.get().profiles.DE.gross, 70000);
  assert.equal(srv.row.data.profiles.DE.gross, 70000);
});

test('switching tab is not an edit: nothing is uploaded and nothing is overwritten', async () => {
  const srv = server(), mac = device(srv, O), phone = device(srv, O); await tick(5);
  mac.set(START); await mac.sync(); await phone.sync();
  mac.set({ ...mac.get(), profiles: { DE: { gross: 80000, savings: 8000 } } }); await mac.sync();
  const before = srv.writes;
  phone.set({ ...phone.get(), tab: 'compare' });        // stale phone, tab tapped before its first download
  await phone.sync();
  assert.equal(srv.writes, before, 'the tab tap must not upload');
  assert.equal(srv.row.data.profiles.DE.gross, 80000);
  assert.equal(phone.get().profiles.DE.gross, 80000);
  assert.equal(phone.get().tab, 'compare', 'the phone keeps its own tab');
  assert.equal('tab' in srv.row.data, false, 'screen fields are not uploaded');
});

test('a stale device editing one field does not undo another field changed elsewhere', async () => {
  const srv = server(), mac = device(srv, O), phone = device(srv, O); await tick(5);
  mac.set(START); await mac.sync(); await phone.sync();
  mac.set({ ...mac.get(), profiles: { DE: { gross: 80000, savings: 8000 } } }); await mac.sync();
  const p = phone.get(); p.profiles.DE.savings = 9500; phone.set(p); await phone.sync();   // phone still had gross 55000
  assert.deepEqual(srv.row.data.profiles.DE, { gross: 80000, savings: 9500 });
  await mac.sync();
  assert.deepEqual(mac.get().profiles.DE, { gross: 80000, savings: 9500 });
});

test('the same field changed on both devices: the later edit wins', async () => {
  const srv = server(), mac = device(srv, O), phone = device(srv, O); await tick(5);
  mac.set(START); await mac.sync(); await phone.sync();
  srv.online = false;
  let p = phone.get(); p.profiles.DE.gross = 60000; phone.set(p); await phone.sync();     // offline edit, earlier
  srv.online = true; await tick(15);
  p = mac.get(); p.profiles.DE.gross = 90000; mac.set(p); await mac.sync();              // later edit
  await phone.sync();
  assert.equal(srv.row.data.profiles.DE.gross, 90000);
  assert.equal(phone.get().profiles.DE.gross, 90000);
});

test('receiving an update does not bounce it back (field order from the database is ignored)', async () => {
  const srv = server(), mac = device(srv, O), phone = device(srv, O); await tick(5);
  mac.set(START); await mac.sync(); await phone.sync();
  const r0 = phone.reloads;
  const p = mac.get(); p.asm.lagDays = 20; mac.set(p); await mac.sync();
  await phone.sync();
  assert.equal(phone.reloads, r0 + 1);
  const w = srv.writes;
  phone.set(JSON.parse(JSON.stringify(phone.get())));   // the app re-saves the same content in its own field order on start
  phone.set({ v: 1, tab: 'score', asm: { shockMonths: 1, lagDays: 20, typicalMonths: 6 }, profiles: phone.get().profiles });
  await phone.sync(); await mac.sync(); await phone.sync();
  assert.equal(srv.writes, w, 'no re-upload of unchanged data');
  assert.equal(mac.reloads, 0); assert.equal(phone.reloads, r0 + 1);
});

test('an install from before field-by-field merging keeps the newest copy, once', async () => {
  const srv = server(); srv.row = { data: { ...START, profiles: { DE: { gross: 99000, savings: 1 } } }, client_ts: '2026-11-09T10:00:00.000Z' };
  const old = device(srv, O); old.ls._m.set('k', JSON.stringify(START));
  old.ls._m.set('cloud.meta.app', JSON.stringify({ synced: true, ts: '2026-11-01T10:00:00.000Z', pushed: '2026-11-01T10:00:00.000Z' }));
  await old.sync();
  assert.equal(old.get().profiles.DE.gross, 99000);
  const newer = device(srv, O); newer.ls._m.set('k', JSON.stringify({ ...START, profiles: { DE: { gross: 42000, savings: 2 } } }));
  newer.ls._m.set('cloud.meta.app', JSON.stringify({ synced: true, ts: '2026-11-10T10:00:00.000Z' }));
  await newer.sync();
  assert.equal(srv.row.data.profiles.DE.gross, 42000);
});

test('onRemote is called instead of a reload when the app provides it (Forge)', async () => {
  const srv = server(); let n = 0;
  const mac = device(srv), phone = device(srv, { onRemote: () => n++ }); await tick(5);
  mac.set({ a: 1 }); await mac.sync(); await phone.sync();
  mac.set({ a: 2 }); await mac.sync(); await phone.sync();
  assert.equal(phone.get().a, 2); assert.ok(n >= 1); assert.equal(phone.reloads, 0);
});
