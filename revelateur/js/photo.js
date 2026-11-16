/* Révélateur — what happens to a photo: import (decode, measure, recognise, auto-adjust, preview), the settings
   that follow from the auto, your own changes and your taste, and the full-size export. */
import { analyze, autoAdjust, compose, tasteOffset, neutral, tidy, KEYS, changedKeys } from './engine.js';
import { classify, PROFILES } from './scenes.js';
import { see } from './vision.js';
import { JpegWriter, exifOf, fixExif, exifDate, iccProfile } from './jpeg.js';
import { uid } from './store.js';

export async function decode(blob) {
  const url = URL.createObjectURL(blob), img = new Image();
  img.decoding = 'async'; img.src = url;
  try { await img.decode(); } catch (e) { URL.revokeObjectURL(url); throw new Error('This file could not be opened as a photo'); }
  return { img, w: img.naturalWidth, h: img.naturalHeight, url, done: () => URL.revokeObjectURL(url) };
}
/* A scaled copy in a 2D canvas (kept under the iPhone canvas limit). */
export function scaled(src, w, h, maxSide, space = 'srgb') {
  const s = Math.min(1, maxSide / Math.max(w, h)), cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  let ctx = null;
  try { ctx = c.getContext('2d', { colorSpace: space, willReadFrequently: true }); } catch (e) { ctx = null; }
  ctx = ctx || c.getContext('2d');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, cw, ch);
  return c;
}
function pixelsOf(c, space) {
  const ctx = c.getContext('2d');
  try { return ctx.getImageData(0, 0, c.width, c.height, { colorSpace: space }).data; } catch (e) { return ctx.getImageData(0, 0, c.width, c.height).data; }
}
export async function thumbFrom(renderer, tex, P, air, maxSide = 480) {
  const s = maxSide / Math.max(tex.w, tex.h), w = Math.max(1, Math.round(tex.w * Math.min(1, s))), h = Math.max(1, Math.round(tex.h * Math.min(1, s)));
  const px = renderer.pixels(tex, P, w, h, { air });
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  let ctx; try { ctx = c.getContext('2d', { colorSpace: renderer.space }); } catch (e) { ctx = null; } ctx = ctx || c.getContext('2d');
  let id; try { id = new ImageData(new Uint8ClampedArray(px.buffer), w, h, { colorSpace: renderer.space }); } catch (e) { id = new ImageData(new Uint8ClampedArray(px.buffer), w, h); }
  ctx.putImageData(id, 0, 0);
  return new Promise(res => c.toBlob(b => res(b), 'image/jpeg', 0.86));
}

/* The settings shown for a record: auto × amount + learned taste + your own changes. */
export const editOf = r => {
  const base = compose(r.auto || neutral(), r.amount ?? 1, r.offset || null), m = r.manual || {}, o = { ...base };
  for (const k of KEYS) if (m[k]) o[k] = base[k] + m[k];
  return tidy(o);
};
/* Store a slider value as your own change on top of the auto. */
export function setManual(r, k, value) {
  const base = compose(r.auto || neutral(), r.amount ?? 1, r.offset || null);
  r.manual = { ...(r.manual || {}) };
  const d = +(value - base[k]).toFixed(2);
  if (Math.abs(d) < 1e-6) delete r.manual[k]; else r.manual[k] = d;
}
export const hasManual = r => Object.values(r.manual || {}).some(v => Math.abs(v) > 1e-6);

/* Work out the auto for a scene (on import, or when you pick another scene type). */
export function applyScene(r, scene, prefs, taste) {
  const a = autoAdjust(r.st, PROFILES[scene] || PROFILES.general, scene);
  r.scene = scene; r.auto = a.v; r.autoWhy = a.why; r.look = a.look;
  const t = prefs.learn ? tasteOffset(taste, scene) : null;
  r.offset = t ? t.o : null; r.tasteN = t ? t.n : 0;
  return r;
}
/* What the auto sees: faces and labels (optional), then the measurements and the scene. */
export async function recognise(img, w, h, useModels) {
  if (!useModels) return { faces: [], labels: [], models: false };
  try { const v = await see(scaled(img, w, h, 512)); return { ...v, models: true }; }
  catch (e) { return { faces: [], labels: [], models: false }; }
}

export async function importFile(file, renderer, prefs, taste) {
  const d = await decode(file);
  try {
    const space = renderer.space;
    const small = scaled(d.img, d.w, d.h, 384, space);
    const vis = await recognise(d.img, d.w, d.h, prefs.models);
    const st = analyze(pixelsOf(small, space), small.width, small.height, vis.faces);
    const cls = classify({ faces: vis.faces, labels: vis.labels, st });
    const r = {
      id: uid(), name: file.name || 'Photo', type: file.type, size: file.size, added: Date.now(), w: d.w, h: d.h, file,
      st, faces: vis.faces, labels: vis.labels.slice(0, 5), models: vis.models, sceneWhy: cls.why, sceneAuto: cls.scene, conf: cls.conf, sceneBy: 'auto',
      amount: (prefs.amount ?? 100) / 100, manual: {}, edited: false
    };
    applyScene(r, cls.scene, prefs, taste);
    try { const head = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer()); r.taken = exifDate(exifOf(head)); } catch (e) { r.taken = null; }
    const prev = scaled(d.img, d.w, d.h, 960, space), tex = renderer.load(prev, prev.width, prev.height);
    try { r.thumb = await thumbFrom(renderer, tex, editOf(r), st.air); } finally { renderer.free(tex); }
    return r;
  } finally { d.done(); }
}

/* Run the models again on a photo (after they were off or offline). */
export async function recheck(r, prefs, taste, space = 'srgb') {
  const d = await decode(r.file);
  try {
    const vis = await recognise(d.img, d.w, d.h, true);
    if (!vis.models) return false;
    r.faces = vis.faces; r.labels = vis.labels.slice(0, 5); r.models = true;
    const small = scaled(d.img, d.w, d.h, 384, space);
    r.st = analyze(pixelsOf(small, space), small.width, small.height, vis.faces);
    const cls = classify({ faces: vis.faces, labels: vis.labels, st: r.st });
    r.sceneWhy = cls.why; r.sceneAuto = cls.scene; r.conf = cls.conf;
    if (r.sceneBy !== 'you') applyScene(r, cls.scene, prefs, taste);
    return true;
  } finally { d.done(); }
}

/* Full-size JPEG. preview: the texture already loaded for editing, reused when it is the full size. */
export async function exportPhoto(r, renderer, prefs, preview, onProgress = () => { }) {
  let tex = preview && preview.w === r.w && preview.h === r.h ? preview : null, own = false, d = null;
  if (!tex) { d = await decode(r.file); tex = renderer.load(d.img, d.w, d.h); own = true; }
  try {
    let exif = null;
    if (prefs.keepInfo && /jpe?g/i.test(r.type || '') ) { try { exif = fixExif(exifOf(new Uint8Array(await r.file.arrayBuffer())), { dropGps: !prefs.keepPlace }); } catch (e) { exif = null; } }
    const jw = new JpegWriter(tex.w, tex.h, prefs.quality || 92, { exif, icc: renderer.p3 ? iccProfile('display-p3') : null });
    await renderer.strips(tex, editOf(r), { air: r.st.air }, async (buf, rows, y) => {
      jw.addRows(buf, rows); onProgress(Math.min(1, (y + rows) / tex.h));
      await new Promise(res => setTimeout(res, 0));
    });
    const bytes = jw.finish(), base = (r.name || 'photo').replace(/\.[^.]+$/, '');
    return new File([bytes], `${base}-edit.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally { if (own) renderer.free(tex); if (d) d.done(); }
}
export { changedKeys };
