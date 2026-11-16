/* BridgeLab — state and persistence. One localStorage key, mirrored to the person's own account by the hub's cloud.js
   (app key "bridgelab"). It only holds slider positions and display choices: the portfolio itself is invented and
   lives in portfolio.js. Nothing is written until something is changed. */
import { PRESETS, SKUS } from './portfolio.js';

export const KEY = 'bridgelab.v1';
export const INBOX_KEY = 'hub.inbox';
const copyAdj = a => Object.fromEntries(SKUS.map(s => [s.id, { dv: Number(a[s.id]?.dv) || 0, dp: Number(a[s.id]?.dp) || 0 }]));
const DEF = () => ({
  v: 1,
  lang: (typeof navigator !== 'undefined' && navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en',
  preset: 'year',
  adj: copyAdj(PRESETS.year.adj),
  order: 'vmp',         // vmp, pvm, mvp or pure
  split: true,          // mix shown between and within categories
  inbox: '',
  ui: { tab: 'bridge', sel: 'price', open: { dairy: true, plant: true } }   // stays on the device
});
export let S = DEF();
export let fresh = true;
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const x = JSON.parse(raw); if (x && x.v === 1 && x.adj) { const d = DEF(); S = { ...d, ...x, adj: copyAdj(x.adj), ui: { ...d.ui, ...(x.ui || {}), open: { ...d.ui.open, ...((x.ui || {}).open || {}) } } }; fresh = false; } }
    else { S = DEF(); fresh = true; }
  } catch (e) { S = DEF(); }
  try { const shared = localStorage.getItem(INBOX_KEY); if (S.inbox && !shared) localStorage.setItem(INBOX_KEY, S.inbox); else if (!S.inbox && shared) S.inbox = shared; } catch (e) { }
  return S;
}
let timer = null;
const write = () => { timer = null; try { localStorage.setItem(KEY, JSON.stringify(S)); fresh = false; } catch (e) { window.dispatchEvent(new CustomEvent('app:savefail')); } };
export function save(now) { clearTimeout(timer); if (now) write(); else timer = setTimeout(write, 400); }
export function saveUi() { if (!fresh) save(); }
export function flush() { if (timer) { clearTimeout(timer); write(); } }
export function usePreset(k) { if (!PRESETS[k]) return; S.preset = k; S.adj = copyAdj(PRESETS[k].adj); }
export const edited = () => { const p = PRESETS[S.preset]; return !p || SKUS.some(s => p.adj[s.id].dv !== S.adj[s.id].dv || p.adj[s.id].dp !== S.adj[s.id].dp); };
export function reset() { try { localStorage.removeItem(KEY); } catch (e) { } S = DEF(); fresh = true; }
export function setInbox(url) { S.inbox = url; try { if (url) localStorage.setItem(INBOX_KEY, url); else localStorage.removeItem(INBOX_KEY); } catch (e) { } save(); }
