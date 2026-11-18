/* Écurie — state and persistence. One localStorage key, mirrored to the person's own account by the hub's cloud.js
   (app key "ecurie"). Cars Claude researched are kept here too, so each car is researched once and every device has it.
   Nothing is written until the person changes something. Real figures never go into the repository. */
export const KEY = 'ecurie.v1';
export const INBOX_KEY = 'hub.inbox';
export const uid = () => Math.random().toString(36).slice(2, 9);

export const blankQ = () => ({ name: '', year: null, ps: null, km: null, price: null, fuel: '', body: '', options: [], extras: '', carId: null });
const DEF = () => ({
  v: 1,
  prof: {
    km: 15000, hold: 4, sf: 'sf10', mode: 'loan', downPct: 20, term: 48, apr: 0, balloonPct: 30,
    usage: { autobahn: 40, mountain: 20, city: 35, track: 5 }, family: false, dog: false, homeShare: 70, phevShare: 40,
    w: { burden: 25, awe: 25, fun: 25, rel: 25 },
    finSrc: 'auto',                                    // auto: Safety Net Score when it holds figures; manual: the ones below
    fin: { net: 0, other: 0, essential: 0, savings: 0, plan: 0 }
  },
  q: blankQ(),                                         // the car on the Analyse tab
  garage: [],                                          // { id, q, added, checks: {}, live }
  mine: null,                                          // { gid, bought, boughtOn, log: [{ d, km }] }
  lookups: {},                                         // car id → record Claude researched
  live: {},                                            // car|year|km band → live ads summary
  ladder: null,                                        // { name, target, cur, at }: what the Funds Ladder's car rung can take
  inbox: '',
  ui: { tab: 'analyse', cmp: [] }                      // stays on the device
});

export let S = DEF();
export let fresh = true;
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const x = JSON.parse(raw);
      if (x && x.v === 1) { const d = DEF(); S = { ...d, ...x, prof: { ...d.prof, ...(x.prof || {}), usage: { ...d.prof.usage, ...((x.prof || {}).usage || {}) }, w: { ...d.prof.w, ...((x.prof || {}).w || {}) }, fin: { ...d.prof.fin, ...((x.prof || {}).fin || {}) } }, q: { ...blankQ(), ...(x.q || {}) }, ui: { ...d.ui, ...(x.ui || {}) } }; fresh = false; }
    } else { S = DEF(); fresh = true; }
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
export function exportBackup() { return new Blob([JSON.stringify({ ecurie: 1, exported: new Date().toISOString(), state: { ...S, ui: undefined } }, null, 1)], { type: 'application/json' }); }
export function importBackup(text) {
  const x = JSON.parse(text);
  if (!x || !x.ecurie || !x.state || !Array.isArray(x.state.garage)) throw new Error('Not an Écurie file');
  S = { ...DEF(), ...x.state, ui: S.ui }; save(true); load();
}

/* ---------- read-only links to the other apps on this device ---------- */
const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
/* Safety Net Score: the German profile (or the active one when it is in euros), its four fund levels when it shared them */
export function readSafetyNet() {
  const x = read('safetyNetScore.v1'); if (!x || !x.profiles) return null;
  const lvOk = c => x.levels && x.levels.c === c && x.levels.cur === 'EUR' && Array.isArray(x.levels.t);
  let code = x.profiles.DE && !x.profiles.DE.example ? 'DE' : null;
  if (!code && x.active && x.profiles[x.active] && !x.profiles[x.active].example && lvOk(x.active)) code = x.active;
  if (!code) return null;
  const p = x.profiles[code], n = v => Math.max(0, Number(v) || 0);
  if (!(n(p.netMonthly) > 0)) return null;
  return { net: n(p.netMonthly), other: n(p.otherIncome), essential: n(p.essential), savings: n(p.savings), plan: n(p.monthlySaving), levels: lvOk(code) ? x.levels.t.map(Number) : null, src: 'sn', country: code };
}
export function finances() {
  const sn = readSafetyNet();
  if (S.prof.finSrc !== 'manual' && sn) return sn;
  const f = S.prof.fin;
  return f && f.net > 0 ? { ...f, levels: null, src: 'manual' } : (S.prof.finSrc === 'manual' ? null : sn);
}
/* Grand Tour: home and the hotels on the wish list, for road-trip costs */
export function readGrandTour() {
  const x = read('grandtour.v1'); if (!x || !Array.isArray(x.hotels)) return null;
  const hotels = x.hotels.filter(h => !h.ex);
  return hotels.length ? { home: x.home, hotels } : null;
}
/* Seuil: the first real place in euros with a deposit, for how much later the home deposit arrives */
export function readSeuil() {
  const x = read('seuil.v1'); if (!x || !Array.isArray(x.locs)) return null;
  const l = x.locs.find(p => !p.ex && p.cur === 'EUR' && Number(p.down) > 0);
  return l ? { name: l.name, down: Number(l.down) } : null;
}
/* The Funds Ladder: whether it has a car rung linked to Écurie */
export function readLadder() {
  const x = read('ladder.v1'); if (!x || !Array.isArray(x.rungs)) return null;
  const r = x.rungs.find(r => r.kind === 'car' && !r.ex);
  return { hasCar: !!r, linked: !!(r && r.link) };
}
