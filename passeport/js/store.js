/* Passeport — state and persistence. One localStorage key, mirrored to the person's own account by the hub's cloud.js
   (app key "passeport"), so two phones share one passport. Nothing is written until the person does something, so a new
   device never uploads an empty passport over a full one. Photos stay on the device (IndexedDB, see camera.js). */
export const KEY = 'passeport.v1';
const lang0 = () => ((navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr');
const DEF = () => ({
  v: 1,
  lang: lang0(),
  theme: 'auto',            // 'auto' (night after sunset) | 'day' | 'night'
  name: '',                 // printed in the passport
  mine: {},                 // spot id → 'must' | 'want'
  visits: {},               // spot id → { at, how: 'geo'|'exif'|'self', d (m), acc (m), duo, photo }
  notes: {},                // spot id → text
  trip: null,               // { start, end, base: { n, lat, lon }, days: { 'YYYY-MM-DD': { t, note, stops: [ids] } } }
  ui: { tab: 'map', cats: [], xmas: true, mineOnly: false, todo: false, threeD: true }   // stays on the device
});

export let S = DEF();
export let fresh = true;
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const x = JSON.parse(raw);
      if (x && x.v === 1) { const d = DEF(); S = { ...d, ...x, mine: x.mine || {}, visits: x.visits || {}, notes: x.notes || {}, ui: { ...d.ui, ...(x.ui || {}) } }; fresh = false; }
    } else { S = DEF(); fresh = true; }
  } catch (e) { S = DEF(); }
  return S;
}
let timer = null;
const write = () => { timer = null; try { localStorage.setItem(KEY, JSON.stringify(S)); fresh = false; } catch (e) { window.dispatchEvent(new CustomEvent('app:savefail')); } };
export function save(now) { clearTimeout(timer); if (now) write(); else timer = setTimeout(write, 250); }
export function saveUi() { if (!fresh) save(); }
export function flush() { if (timer) { clearTimeout(timer); write(); } }
export function reset() { try { localStorage.removeItem(KEY); } catch (e) { } S = DEF(); fresh = true; }

export function exportBackup() {
  return new Blob([JSON.stringify({ passeport: 1, exported: new Date().toISOString(), state: { ...S, ui: undefined } }, null, 1)], { type: 'application/json' });
}
export function importBackup(text) {
  const x = JSON.parse(text);
  if (!x || !x.passeport || !x.state) throw new Error('Not a Passeport file');
  S = { ...DEF(), ...x.state, ui: S.ui }; save(true); load();
}
