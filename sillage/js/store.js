/* Sillage — state and persistence. One localStorage key, mirrored to the person's own account by the hub's
   cloud.js (app key "sillage"). Nothing is written until the person changes something, so a new device never
   uploads the examples. The person's wardrobe, grades and wear log never go into the repository. */
import { iso, addDays } from './engine.js';

export const KEY = 'sillage.v1';
export const INBOX_KEY = 'hub.inbox';
export const WX_KEY = 'sillage.wx';            // today's forecast, kept for the day on this device
export const uid = () => Math.random().toString(36).slice(2, 9);

export const blankBottle = () => ({ id: uid(), house: '', name: '', conc: 'EDT', size: 100, price: 0, family: '', notes: { top: '', heart: '', base: '' }, grade: 0, seasons: [], occ: [], shape: 'tall', note: '' });
/* Five well-known fragrances with invented grades, prices and wears, to show how the screens read. */
export function examples(today = iso(new Date())) {
  const b = (o) => ({ ...blankBottle(), ...o, ex: 1 });
  const bottles = [
    b({ house: 'Dior', name: 'Sauvage', conc: 'EDT', size: 100, price: 105, family: 'aromatic', notes: { top: 'bergamot, pepper', heart: 'lavender, Sichuan pepper, geranium', base: 'ambroxan, cedar, labdanum' }, grade: 7, seasons: ['spring', 'summer', 'autumn'], occ: ['office', 'casual'], shape: 'tall' }),
    b({ house: 'Hermès', name: 'Terre d’Hermès', conc: 'EDT', size: 100, price: 110, family: 'woody', notes: { top: 'orange, grapefruit', heart: 'pepper, pelargonium, flint', base: 'vetiver, cedar, patchouli, benzoin' }, grade: 9, seasons: ['spring', 'autumn', 'winter'], occ: ['office', 'evening'], shape: 'square' }),
    b({ house: 'Giorgio Armani', name: 'Acqua di Giò', conc: 'EDT', size: 100, price: 95, family: 'aquatic', notes: { top: 'bergamot, neroli, green tangerine', heart: 'marine notes, jasmine, rosemary', base: 'cedar, patchouli, white musk' }, grade: 6, seasons: ['summer'], occ: ['casual', 'sport'], shape: 'flask' }),
    b({ house: 'Tom Ford', name: 'Tobacco Vanille', conc: 'EDP', size: 50, price: 260, family: 'amber', notes: { top: 'tobacco leaf, spices', heart: 'vanilla, tonka bean, cacao', base: 'dried fruits, woods' }, grade: 8.5, seasons: ['autumn', 'winter'], occ: ['evening', 'date'], shape: 'square' }),
    b({ house: 'Chanel', name: 'Bleu de Chanel', conc: 'EDP', size: 100, price: 135, family: 'woody', notes: { top: 'grapefruit, lemon, mint, pink pepper', heart: 'ginger, nutmeg, jasmine', base: 'incense, cedar, sandalwood, amber' }, grade: 8, seasons: [], occ: ['office', 'date'], shape: 'tall' })
  ];
  /* days ago each one was worn: a plausible spread, the same every time */
  const ago = [[2, 9, 16, 24, 31, 40, 55, 70], [4, 6, 12, 19, 27, 33, 41, 48, 62, 77, 90], [95, 110, 120], [8, 21, 36], [3, 11, 14, 23, 29, 45, 58, 66, 81]];
  const wears = []; bottles.forEach((x, i) => ago[i].forEach(n => wears.push({ id: uid(), d: addDays(today, -n), b: x.id, ex: 1 })));
  const queue = [
    { id: uid(), house: 'Guerlain', name: 'Vétiver', why: '', family: 'woody', src: 'me', state: 'wish', verdict: null, note: '', ex: 1 },
    { id: uid(), house: 'Prada', name: 'L’Homme', why: '', family: 'floral', src: 'me', state: 'sampled', verdict: null, note: '', ex: 1 }
  ];
  return { bottles, wears, queue };
}
const DEF = () => {
  const ex = examples();
  return {
    v: 1,
    lang: (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en',
    cur: 'EUR',
    place: { name: 'Munich', lat: 48.14, lon: 11.58 },   // for the forecast only
    sprays: 6,
    bottles: ex.bottles, wears: ex.wears, queue: ex.queue,
    ritual: {},                                            // 'YYYY-MM' → { set, done }
    inbox: '',
    ui: { tab: 'today', occ: null, band: null, sort: 'grade' }   // stays on the device
  };
};

export let S = DEF();
export let fresh = true;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const x = JSON.parse(raw); if (x && x.v === 1 && Array.isArray(x.bottles)) { const d = DEF(); S = { ...d, ...x, place: { ...d.place, ...(x.place || {}) }, wears: x.wears || [], queue: x.queue || [], ritual: x.ritual || {}, ui: { ...d.ui, ...(x.ui || {}) } }; fresh = false; } }
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
export const hasExamples = () => S.bottles.some(b => b.ex) || S.queue.some(q => q.ex);
export function dropExamples() { const gone = new Set(S.bottles.filter(b => b.ex).map(b => b.id)); S.bottles = S.bottles.filter(b => !b.ex); S.wears = S.wears.filter(w => !w.ex && !gone.has(w.b)); S.queue = S.queue.filter(q => !q.ex); }

export function exportBackup() { return new Blob([JSON.stringify({ sillage: 1, exported: new Date().toISOString(), state: { ...S, ui: undefined } }, null, 1)], { type: 'application/json' }); }
export function importBackup(text) {
  const x = JSON.parse(text);
  if (!x || !x.sillage || !x.state || !Array.isArray(x.state.bottles)) throw new Error('Not a Sillage file');
  S = { ...DEF(), ...x.state, ui: S.ui }; save(true); load();
}
