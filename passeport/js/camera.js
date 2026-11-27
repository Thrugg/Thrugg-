/* Passeport — validating a visit with a photo.
   The phone's own position is read when the photo is taken (a camera photo taken in the browser loses its GPS data on
   the iPhone, so the photo alone cannot prove where it was taken). A photo picked from the library is also checked for
   GPS and date in its EXIF data, when the phone kept them. Photos are made smaller on the phone and kept in the browser
   (IndexedDB); they are never uploaded. */
import { hav } from './rules.js';

/* ---- IndexedDB: one record per spot { full: Blob, thumb: Blob, at } ---- */
const DB = 'passeport', STORE = 'photos';
let dbp = null;
const db = () => dbp || (dbp = new Promise((res, rej) => {
  if (!('indexedDB' in self)) return rej(new Error('no IndexedDB'));
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE);
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
}));
function run(mode, fn) {
  return db().then(d => new Promise((res, rej) => {
    const t = d.transaction(STORE, mode), req = fn(t.objectStore(STORE));
    t.oncomplete = () => res(req ? req.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  }));
}
export const putPhoto = (id, rec) => run('readwrite', s => s.put(rec, id));
export const getPhoto = id => run('readonly', s => s.get(id)).catch(() => null);
export const delPhoto = id => run('readwrite', s => s.delete(id)).catch(() => null);
export const photoIds = () => run('readonly', s => s.getAllKeys()).catch(() => []);

/* ---- position ---- */
export function locate(timeout = 15000) {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, at: p.timestamp }),
      e => res({ err: e.code === 1 ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: true, timeout, maximumAge: 30000 });
  });
}

/* ---- the file picker (camera on phones) ---- */
export function pickPhoto(input) {
  return new Promise(res => {
    let done = false;
    const finish = f => { if (done) return; done = true; input.onchange = null; input.oncancel = null; window.removeEventListener('focus', onFocus); res(f); };
    const onFocus = () => setTimeout(() => { if (!input.files || !input.files.length) finish(null); }, 4000);
    input.value = '';
    input.onchange = () => finish(input.files && input.files[0] || null);
    input.oncancel = () => finish(null);
    if (!('oncancel' in input)) window.addEventListener('focus', onFocus);
    input.click();
  });
}

/* ---- EXIF (JPEG): GPS position and the date the photo was taken ---- */
const SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
export function parseExif(buffer) {
  const v = new DataView(buffer);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return null;
  let off = 2;
  while (off + 4 <= v.byteLength) {
    const marker = v.getUint16(off), len = v.getUint16(off + 2);
    if ((marker & 0xFF00) !== 0xFF00) return null;
    if (marker === 0xFFE1 && off + 10 <= v.byteLength && v.getUint32(off + 4) === 0x45786966) return tiff(v, off + 10);
    if (marker === 0xFFDA) return null;
    off += 2 + len;
  }
  return null;
}
function tiff(v, T) {
  const le = v.getUint16(T) === 0x4949;
  const u16 = o => v.getUint16(T + o, le), u32 = o => v.getUint32(T + o, le);
  const ifd = o => { const n = u16(o), tags = {}; for (let i = 0; i < n; i++) { const e = o + 2 + i * 12; tags[u16(e)] = { type: u16(e + 2), count: u32(e + 4), e }; } return tags; };
  const at = tag => (SIZE[tag.type] || 1) * tag.count > 4 ? u32(tag.e + 8) : tag.e + 8;
  const ascii = tag => { const o = at(tag); let s = ''; for (let i = 0; i < tag.count - 1; i++) { const c = v.getUint8(T + o + i); if (!c) break; s += String.fromCharCode(c); } return s; };
  const rat = o => { const d = u32(o + 4); return d ? u32(o) / d : 0; };
  const out = {};
  try {
    const t0 = ifd(u32(4));
    if (t0[0x8769]) { const ex = ifd(u32(t0[0x8769].e + 8)); const dt = ex[0x9003] || ex[0x9004]; if (dt) out.date = ascii(dt); }
    if (t0[0x8825]) {
      const g = ifd(u32(t0[0x8825].e + 8));
      const deg = (tag, ref) => { if (!tag) return null; const o = at(tag); let x = rat(o) + rat(o + 8) / 60 + rat(o + 16) / 3600; if (ref && /[SW]/.test(ascii(ref))) x = -x; return x; };
      const lat = deg(g[2], g[1]), lon = deg(g[4], g[3]);
      if (lat != null && lon != null && (lat || lon)) { out.lat = lat; out.lon = lon; }
    }
  } catch (e) { /* damaged EXIF: ignore */ }
  return out;
}
export async function readExif(file) {
  try { return parseExif(await file.slice(0, 256 * 1024).arrayBuffer()); } catch (e) { return null; }
}
/* "2026:12:18 17:42:05" (local time, no zone) → Date */
export const exifDate = s => { const m = /^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d)(?::(\d\d))?/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) : null; };

/* ---- make it smaller on the phone ---- */
async function decode(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (e) {
    return await new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error('Unreadable image')); img.src = URL.createObjectURL(file); });
  }
}
export async function shrink(file, max = 1600, q = 0.82) {
  const bmp = await decode(file);
  const w0 = bmp.width, h0 = bmp.height, k = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  if (bmp.close) bmp.close();
  return await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Could not compress')), 'image/jpeg', q));
}

/* ---- the decision ----
   On site: the phone was within the spot's radius (plus its own accuracy, capped) when the photo was taken.
   Geotagged photo: the photo's own GPS is within the radius (a library photo taken there, maybe earlier).
   Otherwise the visit is noted as self-declared: it still counts, with fewer points and a grey stamp. */
export function judge(spot, pos, exif, now = new Date()) {
  const R = Math.max(80, spot.r || 150);
  const dPos = pos && pos.lat != null ? hav(pos.lat, pos.lon, spot.lat, spot.lon) : null;
  if (dPos != null && dPos <= R + Math.min(pos.acc || 0, 150)) return { how: 'geo', at: now.toISOString(), d: Math.round(dPos), acc: Math.round(pos.acc || 0) };
  if (exif && exif.lat != null) {
    const dEx = hav(exif.lat, exif.lon, spot.lat, spot.lon);
    if (dEx <= R + 60) { const t = exifDate(exif.date); return { how: 'exif', at: (t && t <= now ? t : now).toISOString(), d: Math.round(dEx) }; }
  }
  return { how: 'self', at: now.toISOString(), d: dPos != null ? Math.round(dPos) : null, why: !pos || pos.err ? (pos && pos.err === 'denied' ? 'denied' : 'nogps') : 'far' };
}
