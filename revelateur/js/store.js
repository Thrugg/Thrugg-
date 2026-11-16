/* Révélateur — settings, presets and your taste. One localStorage key, mirrored to your own account by the hub's
   cloud.js (app key "revelateur"), so the iPhone and the Mac learn together. Photos are not in here (library.js). */
export const KEY = 'revelateur.v1';
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const DEF = () => ({
  v: 1,
  prefs: { quality: 92, keepInfo: true, keepPlace: true, models: true, amount: 100, learn: true },
  taste: {},          // photo id → { s: scene, t: time, d: { setting: change after the auto } }
  presets: [],        // { id, name, values }
  ui: { panel: 'auto', hist: true }   // stays on the device
});

export let S = DEF();
export let fresh = true;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const x = JSON.parse(raw), d = DEF();
      if (x && x.v === 1) { S = { ...d, ...x, prefs: { ...d.prefs, ...(x.prefs || {}) }, taste: x.taste || {}, presets: Array.isArray(x.presets) ? x.presets : [], ui: { ...d.ui, ...(x.ui || {}) } }; fresh = false; }
    } else { S = DEF(); fresh = true; }
  } catch (e) { S = DEF(); }
  return S;
}
let timer = null;
const write = () => { timer = null; try { localStorage.setItem(KEY, JSON.stringify(S)); fresh = false; } catch (e) { window.dispatchEvent(new CustomEvent('app:savefail')); } };
export function save(now) { clearTimeout(timer); if (now) write(); else timer = setTimeout(write, 300); }
export function saveUi() { if (!fresh) save(); }
export function flush() { if (timer) { clearTimeout(timer); write(); } }
export function resetTaste() { S.taste = {}; save(true); }
