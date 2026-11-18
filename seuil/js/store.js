/* Seuil — state and persistence. One localStorage key, mirrored to the person's own account by the hub's cloud.js
   (app key "seuil") once they are signed in. Nothing is written until the person changes something, so a new
   device never uploads the examples. No figures of the person ever go into the repository. */
import { PACKS } from './packs.js';

export const KEY = 'seuil.v1';
export const INBOX_KEY = 'hub.inbox';      // link to the "Apps ideas inbox" file, shared by every app on this site

export const uid = () => Math.random().toString(36).slice(2, 9);

/* a new location with the pack's starting values */
export function newLoc(pack = 'XX', name = '') {
  const p = PACKS[pack] || PACKS.XX;
  return { id: uid(), name, pack, region: p.region || null, cur: p.cur, mode: 'total', sqm: 70, price: 0, rent: 0, down: null, reno: 0, rate: p.rate, term: p.term, stay: 7, gPrice: 2, gRent: 2, ret: 5, ov: {} };
}
/* invented round figures, only there to show how the screen reads */
export const examples = () => [
  { ...newLoc('DE', 'Munich'), sqm: 70, price: 620000, rent: 1650, down: 120000, gRent: 2.5, ex: 1 },
  { ...newLoc('CH', 'Zürich'), sqm: 80, price: 1250000, rent: 3200, down: 250000, gRent: 1.5, ex: 1 },
  { ...newLoc('PL', 'Kraków'), sqm: 60, price: 900000, rent: 4200, down: 180000, gPrice: 3, gRent: 3, ret: 6, ex: 1 }
];
const DEF = () => {
  const locs = examples();
  return {
    v: 1,
    lang: (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en',
    locs,
    cmp: locs.map(l => l.id),                 // locations shown side by side, four at most
    inbox: '',
    ui: { tab: 'seuil', loc: locs[0].id, open: {} }   // stays on the device
  };
};

export let S = DEF();
export let fresh = true;                      // true until something has been saved on this device

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const x = JSON.parse(raw); if (x && x.v === 1 && Array.isArray(x.locs)) { const d = DEF(); S = { ...d, ...x, ui: { ...d.ui, ...(x.ui || {}) } }; fresh = false;
      /* once: a deposit of 0 was the old blank; it now means "the usual share here" */
      if (!S.downAuto) { S.locs.forEach(l => { if (l.down === 0) l.down = null; }); S.downAuto = 1; } } }
    else { S = DEF(); fresh = true; }
  } catch (e) { S = DEF(); }
  if (!S.locs.find(l => l.id === S.ui.loc)) S.ui.loc = S.locs[0] ? S.locs[0].id : null;
  S.cmp = (S.cmp || []).filter(id => S.locs.find(l => l.id === id)).slice(0, 4);
  /* the inbox link is typed once and found by every app on this device */
  try { const shared = localStorage.getItem(INBOX_KEY); if (S.inbox && !shared) localStorage.setItem(INBOX_KEY, S.inbox); else if (!S.inbox && shared) S.inbox = shared; } catch (e) { }
  return S;
}
let timer = null;
const write = () => { timer = null; try { localStorage.setItem(KEY, JSON.stringify(S)); fresh = false; } catch (e) { window.dispatchEvent(new CustomEvent('app:savefail')); } };
export function save(now) { clearTimeout(timer); if (now) write(); else timer = setTimeout(write, 300); }
/* which tab or location is open: kept only once the person has data of their own on this device */
export function saveUi() { if (!fresh) save(); }
export function flush() { if (timer) { clearTimeout(timer); write(); } }
export function reset() { try { localStorage.removeItem(KEY); } catch (e) { } S = DEF(); fresh = true; }
export function setInbox(url) { S.inbox = url; try { if (url) localStorage.setItem(INBOX_KEY, url); else localStorage.removeItem(INBOX_KEY); } catch (e) { } save(); }

export function exportBackup() { return new Blob([JSON.stringify({ seuil: 1, exported: new Date().toISOString(), state: { ...S, ui: undefined } }, null, 1)], { type: 'application/json' }); }
export function importBackup(text) {
  const x = JSON.parse(text);
  if (!x || !x.seuil || !x.state || !Array.isArray(x.state.locs)) throw new Error('Not a Seuil file');
  S = { ...DEF(), ...x.state, ui: S.ui }; save(true); load();
}
