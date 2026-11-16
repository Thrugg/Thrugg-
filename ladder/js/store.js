/* The Funds Ladder — state and persistence. One localStorage key, mirrored to the person's own account by the
   hub's cloud.js (app key "ladder"). Nothing is written until the person changes something, so a new device never
   uploads the examples. Real amounts never go into the repository. */
import { addMonths, thisMonth } from './engine.js';

export const KEY = 'ladder.v1';
export const INBOX_KEY = 'hub.inbox';
export const SAFETY_KEY = 'safetyNetScore.v1';
export const uid = () => Math.random().toString(36).slice(2, 9);

/* invented round figures; the dates are counted from today so nothing here describes a real plan */
export const examples = () => {
  const m = thisMonth(), p = (label, amt) => ({ id: uid(), label, amt });
  return [
    { id: uid(), kind: 'safety', name: '', target: 9000, saved: 6500, due: null, pct: 40, link: true, ex: 1 },
    { id: uid(), kind: 'move', name: '', target: 0, saved: 1500, due: addMonths(m, 16), pct: 20, parts: [p('', 4500), p('', 3000), p('', 2500)], ex: 1 },
    { id: uid(), kind: 'dog', name: '', target: 3000, saved: 0, due: addMonths(m, 7), pct: 15, ex: 1 },
    { id: uid(), kind: 'events', name: '', target: 4000, saved: 500, due: addMonths(m, 9), pct: 10, ex: 1 },
    { id: uid(), kind: 'etf', name: '', target: 25000, saved: 2000, due: null, pct: 10, ex: 1 },
    { id: uid(), kind: 'car', name: '', target: 6000, saved: 0, due: null, pct: 5, ex: 1 }
  ];
};
const DEF = () => ({
  v: 1,
  lang: (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en',
  cur: 'EUR',
  monthly: 1000,
  infl: 0,                                    // inflation on targets, % a year (0 = off)
  rule: 'order',                              // 'order' = fill the rungs one after the other, 'pct' = by shares
  rungs: examples(),                          // bottom rung first
  log: [],                                    // [{ id, d: 'YYYY-MM-DD', amt, by: { rungId: amount }, names: { rungId: name } }]
  car: { dep: 18000, ins: 6000, service: 4000, day: 1900, days: 12, ex: 1 },
  inbox: '',
  ui: { tab: 'ladder' }                       // stays on the device
});

export let S = DEF();
export let fresh = true;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const x = JSON.parse(raw); if (x && x.v === 1 && Array.isArray(x.rungs)) { const d = DEF(); S = { ...d, ...x, car: { ...x.car }, ui: { ...d.ui, ...(x.ui || {}) } }; fresh = false; } }
    else { S = DEF(); fresh = true; }
  } catch (e) { S = DEF(); }
  try { const shared = localStorage.getItem(INBOX_KEY); if (S.inbox && !shared) localStorage.setItem(INBOX_KEY, S.inbox); else if (!S.inbox && shared) S.inbox = shared; } catch (e) { }
  return S;
}
let timer = null;
const write = () => { timer = null; try { localStorage.setItem(KEY, JSON.stringify(S)); fresh = false; } catch (e) { window.dispatchEvent(new CustomEvent('app:savefail')); } };
export function save(now) { clearTimeout(timer); if (now) write(); else timer = setTimeout(write, 300); }
export function saveUi() { if (!fresh) save(); }
export function flush() { if (timer) { clearTimeout(timer); write(); } }
export function reset() { try { localStorage.removeItem(KEY); } catch (e) { } S = DEF(); fresh = true; }
export function setInbox(url) { S.inbox = url; try { if (url) localStorage.setItem(INBOX_KEY, url); else localStorage.removeItem(INBOX_KEY); } catch (e) { } save(); }

/* What Safety Net Score saved on this device: the cash savings and, when it has been opened since this app
   exists, the four fund levels. Read only; null when there is nothing usable or the profile is still the example. */
export function readSafety() {
  try {
    const x = JSON.parse(localStorage.getItem(SAFETY_KEY)); if (!x || !x.profiles || !x.active) return null;
    const p = x.profiles[x.active]; if (!p || p.example) return null;
    const lv = x.levels && x.levels.c === x.active && Array.isArray(x.levels.t) ? x.levels : null;
    return { saved: Math.max(0, Number(p.savings) || 0), target: lv ? Number(lv.t[3]) || null : null, cur: lv ? lv.cur : null, country: x.active };
  } catch (e) { return null; }
}

/* The move-buffer rung can take its target from Safety Net Score's move planner (what the move needs on the day you leave). */
export function readMove() {
  try { const x = JSON.parse(localStorage.getItem(SAFETY_KEY)); const m = x && x.moveNeed; if (!m || !(m.through > 0)) return null; return { target: m.through, good: m.good, cur: m.cur, to: m.to, leave: m.leave }; } catch (e) { return null; }
}
/* The ETF rung can take what is invested from Gains & Greeks ("Capital invested" on its tax desk, in euros). */
export function readGG() {
  try { const x = JSON.parse(localStorage.getItem('gg.v1')); const c = x && x.p && Number(x.p.cap); return c > 0 ? { saved: c, cur: 'EUR' } : null; } catch (e) { return null; }
}
export function exportBackup() { return new Blob([JSON.stringify({ ladder: 1, exported: new Date().toISOString(), state: { ...S, ui: undefined } }, null, 1)], { type: 'application/json' }); }
export function importBackup(text) {
  const x = JSON.parse(text);
  if (!x || !x.ladder || !x.state || !Array.isArray(x.state.rungs)) throw new Error('Not a Funds Ladder file');
  S = { ...DEF(), ...x.state, ui: S.ui }; save(true); load();
}
