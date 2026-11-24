/* Prisme — state and persistence. One localStorage key, mirrored to the person's own account by the hub's cloud.js
   (app key "prisme"). Nothing is written until the person changes something. Real gear, prices paid and finances
   never go into the repository. */
export const KEY = 'prisme.v1';
export const INBOX_KEY = 'hub.inbox';
export const uid = () => Math.random().toString(36).slice(2, 9);

const DEF = () => ({
  v: 1,
  prof: { market: 'DE', lang: 'en', finSrc: 'auto', fin: { net: 0, other: 0, essential: 0, savings: 0, plan: 0 } },
  pc: { use: 'aaa4k', budget: 3500, gpu: '', platform: 'any', brand: 'any', size: 'any', look: 'any', noise: 'balanced', storage: 2, ram: 0, wifi: true, lock: {}, aim: 'value' },
  view: { up: 'quality', fg: 'off', kind: 'aaa' },
  pre: { budget: 3500, gpuMin: 'gpu-rtx5070ti', x3d: false, ramMin: 32, ssdMin: 2, os: true, use: 'aaa4k' },
  offer: { text: '', fields: null, name: '', url: '' },
  offers: [],                                  // offers the person checked and kept: { id, name, url, price, at, fields }
  found: null,                                 // the last offers Claude found: { at, filters, items }
  mon: { uses: { aaa: 3, comp: 1, work: 1, movies: 1, creative: 0 }, staticH: 3, room: 'mixed', dist: 75, budget: 0, gpuFrom: 'build', sizes: [], res: [], hzMin: 0, panels: [], brands: [], shape: 'any', withTv: false, gpuOk: false, sort: 'score' },
  tv: { uses: { movies: 3, sport: 1, gaming: 2, tv: 1 }, staticH: 1, room: 'mixed', dist: 300, budget: 0, sizes: [], panels: [], brands: [], hzMin: 0, hdmiMin: 0, dv: false, sort: 'score' },
  choose: { cat: 'phone', prefs: {}, budget: {}, f: {} },                      // f: per category { size [], type [], os [], brands [], sort }
  gear: [],                                    // { id, cat, catId, name, bought, price, market, makerM, used, note }
  watch: [],                                   // { id, catId, name, cat, target, log: [{ d, p, shop }], added }
  builds: [],                                  // { id, name, at, parts: { slot: id }, total, market }
  custom: [],                                  // products Claude researched, in the catalogue's format
  inbox: '',
  calc: { size: 32, res: '3840x2160', hz: 240, dist: 75 },
  ui: { tab: 'build', build: 'custom', screen: 'monitor', gear: 'mine', pulse: 'news', topic: 'all' }   // stays on the device
});

export let S = DEF();
export let fresh = true;
const merge = (d, x) => { const o = { ...d }; for (const k of Object.keys(x || {})) o[k] = d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && x[k] && typeof x[k] === 'object' && !Array.isArray(x[k]) ? merge(d[k], x[k]) : x[k]; return o; };
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const x = JSON.parse(raw); if (x && x.v === 1) { S = merge(DEF(), x); fresh = false; } }
    /* budgets used to start at 1,200 € (monitors), 2,500 € (TVs) and a figure per category, which pushed big screens
       down the list; an untouched old default now means "no limit" */
    if (!S.wide) {
      if (S.mon.budget === 1200) S.mon.budget = 0;
      S.mon.sizes = []; delete S.mon.size; S.tv.sizes = [];          // every size again: the earlier version offered only a few
      if (S.tv.budget === 2500) S.tv.budget = 0;
      const old = { phone: 1200, headphones: 450, soundbar: 1000, laptop: 2500, tablet: 1000 };
      for (const [k, v] of Object.entries(old)) if (S.choose.budget && S.choose.budget[k] === v) delete S.choose.budget[k];
      S.wide = 1;
    }
    else { S = DEF(); fresh = true; }
  } catch (e) { S = DEF(); }
  try { const shared = localStorage.getItem(INBOX_KEY); if (S.inbox && !shared) localStorage.setItem(INBOX_KEY, S.inbox); else if (!S.inbox && shared) S.inbox = shared; } catch (e) { }
  if (fresh) { try { const l = (navigator.language || '').toLowerCase(); if (l.startsWith('fr')) { S.prof.lang = 'fr'; S.prof.market = 'FR'; } } catch (e) { } }
  return S;
}
let timer = null;
const write = () => { timer = null; try { localStorage.setItem(KEY, JSON.stringify(S)); fresh = false; } catch (e) { window.dispatchEvent(new CustomEvent('app:savefail')); } };
export function save(now) { clearTimeout(timer); if (now) write(); else timer = setTimeout(write, 300); }
export function saveUi() { if (!fresh) save(); }
export function flush() { if (timer) { clearTimeout(timer); write(); } }
export function reset() { try { localStorage.removeItem(KEY); } catch (e) { } S = DEF(); fresh = true; }
export function setInbox(url) { S.inbox = url; try { if (url) localStorage.setItem(INBOX_KEY, url); else localStorage.removeItem(INBOX_KEY); } catch (e) { } save(); }
export function exportBackup() { return new Blob([JSON.stringify({ prisme: 1, exported: new Date().toISOString(), state: { ...S, ui: undefined } }, null, 1)], { type: 'application/json' }); }
export function importBackup(text) {
  const x = JSON.parse(text);
  if (!x || !x.prisme || !x.state || !Array.isArray(x.state.gear)) throw new Error('not-prisme');
  S = merge(DEF(), { ...x.state, ui: S.ui }); save(true);
}

/* ---------- read-only links to the other apps on this device ---------- */
const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
/* Safety Net Score: the profile of the chosen market (DE or FR), or the active one when it is in euros */
export function readSafetyNet(country) {
  const x = read('safetyNetScore.v1'); if (!x || !x.profiles) return null;
  const lvOk = c => x.levels && x.levels.c === c && x.levels.cur === 'EUR' && Array.isArray(x.levels.t);
  let code = x.profiles[country] && !x.profiles[country].example ? country : null;
  if (!code && x.active && x.profiles[x.active] && !x.profiles[x.active].example && lvOk(x.active)) code = x.active;
  if (!code) return null;
  const p = x.profiles[code], n = v => Math.max(0, Number(v) || 0);
  if (!(n(p.netMonthly) > 0)) return null;
  return { net: n(p.netMonthly), other: n(p.otherIncome), essential: n(p.essential), savings: n(p.savings), plan: n(p.monthlySaving), levels: lvOk(code) ? x.levels.t.map(Number) : null, src: 'sn', country: code };
}
export function finances() {
  const sn = readSafetyNet(S.prof.market);
  if (S.prof.finSrc !== 'manual' && sn) return sn;
  const f = S.prof.fin;
  return f && f.net > 0 ? { ...f, levels: null, src: 'manual' } : (S.prof.finSrc === 'manual' ? null : sn);
}
