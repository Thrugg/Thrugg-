/* Grand Tour — state and persistence. One localStorage key, mirrored to the person's own account by the hub's
   cloud.js (app key "grandtour"). Nothing is written until the person changes something, so a new device never
   uploads the examples. Real stays, dates and prices never go into the repository. */
import { DEFAULT_BANDS, DEFAULT_NAMES } from './engine.js';

export const KEY = 'grandtour.v1';
export const INBOX_KEY = 'hub.inbox';
export const uid = () => Math.random().toString(36).slice(2, 9);

export const blank = () => ({ id: uid(), name: '', place: '', lat: null, lon: null, status: 'wish', ref: 0, gradeOv: null, has: {}, from: '', nights: 0, who: '', paid: 0, x: {}, note: '', drive: 0 });
/* Five real hotels, one per grade, with the season rates found when the ladder was calibrated (Nov 2026).
   The two "stayed" ones carry invented dates and scores, only to show how a stay reads. */
export const examples = () => [
  { ...blank(), name: 'NH Collection Prague Carlo IV', place: 'Prague, Czechia', lat: 50.0862, lon: 14.4327, ref: 220, has: { pool: true, sauna: true, parking: true, gym: true, dog: true }, status: 'stayed', from: '2026-03-13', nights: 2, who: '', paid: 195, x: { pool: 3, spa: 3, parking: 4, gym: 3, room: 4, service: 4, food: 3 }, ex: 1 },
  { ...blank(), name: 'Sofitel Munich Bayerpost', place: 'Munich, Germany', lat: 48.1392, lon: 11.5560, ref: 300, has: { pool: true, sauna: true, parking: true, gym: true, dog: true }, ex: 1 },
  { ...blank(), name: 'Hotel Sacher Salzburg', place: 'Salzburg, Austria', lat: 47.8026, lon: 13.0419, ref: 520, has: { sauna: true, parking: true, gym: true }, status: 'stayed', from: '2026-06-05', nights: 1, who: '', paid: 480, x: { spa: 3, parking: 3, gym: 3, room: 5, service: 5, food: 5 }, ex: 1 },
  { ...blank(), name: 'Bürgenstock Hotel & Alpine Spa', place: 'Obbürgen, Switzerland', lat: 46.9965, lon: 8.3790, ref: 1300, has: { pool: true, sauna: true, parking: true, gym: true, dog: true }, ex: 1 },
  { ...blank(), name: 'Six Senses Crans-Montana', place: 'Crans-Montana, Switzerland', lat: 46.3105, lon: 7.4720, ref: 1700, has: { pool: true, sauna: true, gym: true, dog: true }, ex: 1 }
];
const DEF = () => ({
  v: 1,
  lang: (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en',
  cur: 'EUR',
  home: { name: 'Munich', lat: 48.1372, lon: 11.5755 },
  bands: [...DEFAULT_BANDS],
  names: [...DEFAULT_NAMES],
  weights: {},                               // criterion → weight; a missing one counts 1
  hotels: examples(),
  inbox: '',
  ui: { tab: 'atlas', view: 'compass', f: { status: 'all', grades: [], drive: 0 }, sort: 'drive' }   // stays on the device
});

export let S = DEF();
export let fresh = true;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const x = JSON.parse(raw); if (x && x.v === 1 && Array.isArray(x.hotels)) { const d = DEF(); S = { ...d, ...x, home: { ...d.home, ...(x.home || {}) }, ui: { ...d.ui, ...(x.ui || {}), f: { ...d.ui.f, ...((x.ui || {}).f || {}) } } }; fresh = false; } }
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

export function exportBackup() { return new Blob([JSON.stringify({ grandtour: 1, exported: new Date().toISOString(), state: { ...S, ui: undefined } }, null, 1)], { type: 'application/json' }); }
export function importBackup(text) {
  const x = JSON.parse(text);
  if (!x || !x.grandtour || !x.state || !Array.isArray(x.state.hotels)) throw new Error('Not a Grand Tour file');
  S = { ...DEF(), ...x.state, ui: S.ui }; save(true); load();
}
