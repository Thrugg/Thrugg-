/* Nocturne — state and persistence. Everything lives in one localStorage key; when the person has agreed to it on
   this device, the hub's cloud.js mirrors that key to their own Supabase account (app key "nocturne").
   Nothing here is ever written to the repository. */
export const KEY = 'nocturne.v1';
export const SYNC_FLAG = 'nocturne.sync';     // '1' = this device keeps Nocturne in the account, '0' = device only

const DEF = () => ({
  v: 1,
  lang: (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en',
  theme: 'night',
  target: 510,                                // 8 h 30
  nights: {},                                 // by wake date, see sleep.js
  tags: {},                                   // by wake date: { t: ['screen', …] or ['clean'], n: 'note' }
  plan: { wake: null, gain: 50, conv: 0.65, wind: 45, start: null, base: null },
  imp: null,                                  // last import: { at, file, n, first, last, added, updated, bedOnly, sources }
  demo: false,
  ui: { tab: 'bridge', span: 7 }              // stays on the device (see main.js)
});

export let S = DEF();
function merge(base, x) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return x ?? base;
  const out = { ...base };
  for (const [k, v] of Object.entries(x)) out[k] = (base && typeof base[k] === 'object' && !Array.isArray(base[k]) && base[k] !== null && k !== 'nights' && k !== 'tags') ? merge(base[k], v) : v;
  return out;
}
export function load() {
  try { const raw = localStorage.getItem(KEY); S = raw ? merge(DEF(), JSON.parse(raw)) : DEF(); } catch (e) { S = DEF(); }
  return S;
}
let timer = null;
const write = () => { timer = null; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.warn('save failed', e); window.dispatchEvent(new CustomEvent('nocturne:savefail')); } };
export function save(now) { clearTimeout(timer); if (now) write(); else timer = setTimeout(write, 250); }
/* write a pending change at once (the page is being closed or put in the background) */
export function flush() { if (timer) { clearTimeout(timer); write(); } }
export function reset() { S = DEF(); save(true); }
export function replaceAll(x) { S = merge(DEF(), x); save(true); }

export const syncChoice = () => { try { return localStorage.getItem(SYNC_FLAG); } catch (e) { return null; } };
export const setSyncChoice = v => { try { localStorage.setItem(SYNC_FLAG, v); } catch (e) { } };

export function exportBackup() { return new Blob([JSON.stringify({ nocturne: 1, exported: new Date().toISOString(), state: { ...S, ui: undefined } })], { type: 'application/json' }); }
export function importBackup(text) {
  const x = JSON.parse(text);
  if (!x || !x.nocturne || !x.state) throw new Error('Not a Nocturne file');
  replaceAll({ ...x.state, ui: S.ui });
}
