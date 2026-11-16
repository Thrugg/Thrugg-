/* Révélateur — the photo library, kept in this browser (IndexedDB).
   Each photo: the original file, untouched, a small preview of the edited result, what the analysis found, the auto
   values and your edit. Originals are big, so they stay on the device and are not synced; your taste and presets are. */
const DB = 'revelateur', STORE = 'photos', VER = 1;
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => { dbp = null; rej(r.error); };
  });
  return dbp;
}
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, mode), s = t.objectStore(STORE); const out = fn(s); t.oncomplete = () => res(out && 'result' in out ? out.result : out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('Storage full')); }); };

export const put = rec => tx('readwrite', s => s.put(rec));
export const get = id => tx('readonly', s => s.get(id));
export const del = id => tx('readwrite', s => s.delete(id));
/* Everything except the original files, newest first (the list screen never needs the originals). */
export async function list() {
  const d = await db();
  return new Promise((res, rej) => {
    const out = [], t = d.transaction(STORE, 'readonly'), c = t.objectStore(STORE).openCursor();
    c.onsuccess = () => { const cur = c.result; if (!cur) return; const { file, ...rest } = cur.value; out.push(rest); cur.continue(); };
    t.oncomplete = () => res(out.sort((a, b) => (b.added || 0) - (a.added || 0)));
    t.onerror = () => rej(t.error);
  });
}
/* Update some fields of a record, keeping the rest (including the original). */
export async function patch(id, fields) { const r = await get(id); if (!r) return null; Object.assign(r, fields); await put(r); return r; }
export async function usage() { try { const e = await navigator.storage.estimate(); return e; } catch (e) { return null; } }
export async function persist() { try { return navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false; } catch (e) { return false; } }
