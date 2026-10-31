/* Forge — state, persistence (localStorage, mirrored to the hub's Supabase by cloud.js) and on-device photos (IndexedDB). */
import { today } from './calc.js';

export const KEY = 'forge.v1';
const DEF = () => ({
  v: 2,
  profile: { lang: (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en', units: 'metric', name: '', sex: null, dob: null, cm: null, variant: 'classic', onboarded: false },
  safety: { under18: false, preg: false, ed: false, med: false },
  activity: { stepsAvg: 8000, stepsInc: true, flights: 0, strideCm: null, occupation: 'desk', sleepH: 7.5, years: 0, workouts: [] },
  plan: { mode: null, ratePct: 0.5, fatPct: 25, meals: 4, customKcal: null, applied: null },
  logs: {}, tapes: [], scans: [], photos: [], prs: [], health: { last: null }, meta: { created: today() }
});

export let S = DEF();
const subs = new Set();
export const onChange = fn => (subs.add(fn), () => subs.delete(fn));

function merge(base, x) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return x ?? base;
  const out = { ...base };
  for (const [k, v] of Object.entries(x)) out[k] = (base && typeof base[k] === 'object' && !Array.isArray(base[k]) && base[k] !== null) ? merge(base[k], v) : v;
  return out;
}
export function load() {
  try { const raw = localStorage.getItem(KEY); S = raw ? merge(DEF(), JSON.parse(raw)) : DEF(); } catch (e) { S = DEF(); }
  // v2: weight-training intensity now reads "typical session" (3.5 MET) for what was "moderate — can talk" (5.0 MET)
  if ((S.v || 1) < 2) { for (const w of S.activity.workouts || []) if (w.type === 'strength' && w.intensity === 'moderate') w.intensity = 'light'; S.v = 2; }
  return S;
}
let timer = null;
export function save(now) {
  clearTimeout(timer);
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.warn('save failed', e); } };
  if (now) write(); else timer = setTimeout(write, 300);
  subs.forEach(fn => { try { fn(S); } catch (e) { console.error(e); } });
}
export function set(path, value) {
  const ks = path.split('.'); let o = S;
  for (const k of ks.slice(0, -1)) o = o[k] ??= {};
  o[ks[ks.length - 1]] = value; save();
}
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export function upsert(listName, item) {
  const list = S[listName]; const i = list.findIndex(x => x.id === item.id);
  if (i >= 0) list[i] = item; else list.push({ ...item, id: item.id || uid() });
  list.sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1); save();
}
export function remove(listName, id) { S[listName] = S[listName].filter(x => x.id !== id); save(); }
export function logDay(date, fields, src = 'manual') {
  const d = S.logs[date] ||= {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === '' || v == null || Number.isNaN(v)) { if (src === 'manual') delete d[k]; continue; }
    if (src !== 'manual' && d.m?.includes(k)) continue; // manual edits win over imports
    d[k] = v;
    if (src === 'manual') d.m = [...new Set([...(d.m || []), k])];
  }
  if (!Object.keys(d).filter(k => k !== 'm').length) delete S.logs[date];
}
export function reset() { S = DEF(); save(true); }
export function replaceAll(x) { S = merge(DEF(), x); save(true); }

/* ---------- photos (never synced) ---------- */
let dbp = null;
const db = () => dbp ||= new Promise((res, rej) => { const r = indexedDB.open('forge-photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('p'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('p', mode); const r = fn(t.objectStore('p')); t.oncomplete = () => res(r?.result); t.onerror = () => rej(t.error); }); };
export const putPhoto = (k, blob) => tx('readwrite', s => s.put(blob, k));
export const getPhoto = k => tx('readonly', s => s.get(k));
export const delPhoto = k => tx('readwrite', s => s.delete(k));
export const clearPhotos = () => tx('readwrite', s => s.clear());
export async function allPhotoKeys() { const d = await db(); return new Promise((res, rej) => { const r = d.transaction('p').objectStore('p').getAllKeys(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }

/* Downscale a picked image to max 1600 px and store it as JPEG. */
export async function storeImage(key, file) {
  const img = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  let blob = file;
  if (img) {
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
  }
  await putPhoto(key, blob); return key;
}

/* ---------- backup ---------- */
const b64 = blob => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
export async function exportBackup(withPhotos = true) {
  const out = { forge: 1, exported: new Date().toISOString(), state: S, images: {} };
  if (withPhotos) for (const k of await allPhotoKeys()) { const b = await getPhoto(k); if (b) out.images[k] = await b64(b); }
  return new Blob([JSON.stringify(out)], { type: 'application/json' });
}
export async function importBackup(text) {
  const x = JSON.parse(text);
  if (!x || (!x.forge && !x.forgeMerge)) throw new Error('Not a Forge file');
  if (x.forgeMerge) { // partial file: fill missing profile fields, add scans/photos/prs/tapes by id
    for (const [k, v] of Object.entries(x.profile || {})) if (S.profile[k] == null || S.profile[k] === '') S.profile[k] = v;
    for (const list of ['scans', 'photos', 'prs', 'tapes']) for (const it of x[list] || []) if (!S[list].some(y => y.id === it.id)) S[list].push(it);
  } else replaceAll(x.state);
  for (const [k, data] of Object.entries(x.images || {})) { const blob = await (await fetch(data)).blob(); await putPhoto(k, blob); }
  save(true); return x.forgeMerge ? 'merge' : 'replace';
}
