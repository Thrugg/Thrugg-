/* Forge — photo measurement. Runs entirely on the device: MediaPipe Pose Landmarker finds the outline,
   Forge reads body widths at the neck, waist and hips, scales them with your height and turns front width +
   side depth into circumferences (ellipse). Every marker can be dragged by hand. */
import { ellipse, bfNavy, bfRFM } from './calc.js';

const MP_VER = '1.2.0';
const cfg = () => window.FORGE_MP || {
  base: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`,
  model: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task'
};
let lmP = null;
/* The segmentation mask needs the GPU delegate (WebGL2): the CPU build aborts when it converts the mask.
   Without WebGL, Forge falls back to landmarks only and places the width markers from body proportions. */
async function landmarker() {
  if (!lmP) lmP = (async () => {
    const c = cfg(); const v = await import(/* @vite-ignore */ `${c.base}/vision_bundle.mjs`);
    const fs = await v.FilesetResolver.forVisionTasks(`${c.base}/wasm`);
    const opts = (delegate, masks) => ({ baseOptions: { modelAssetPath: c.model, delegate }, runningMode: 'IMAGE', numPoses: 1, outputSegmentationMasks: masks });
    try { return { L: await v.PoseLandmarker.createFromOptions(fs, opts('GPU', true)), masks: true }; }
    catch (e) { return { L: await v.PoseLandmarker.createFromOptions(fs, opts('CPU', false)), masks: false }; }
  })().catch(e => { lmP = null; throw e; });
  return lmP;
}

/* ---------- geometry on a probability mask ---------- */
export function extent(mask, w, h, thr = 0.5) {
  const minRun = Math.max(3, Math.round(w * 0.004)); let top = -1, bottom = -1;
  for (let y = 0; y < h; y++) { let c = 0; for (let x = 0; x < w; x++) if (mask[y * w + x] >= thr) c++; if (c >= minRun) { if (top < 0) top = y; bottom = y; } }
  return { top, bottom };
}
export function segment(mask, w, y, cx, thr = 0.5) {
  y = Math.round(y); cx = Math.round(cx); const row = y * w;
  if (mask[row + cx] < thr) { let d = 1, found = -1; while (d < w * 0.08 && found < 0) { if (mask[row + cx - d] >= thr) found = cx - d; else if (mask[row + cx + d] >= thr) found = cx + d; d++; } if (found < 0) return null; cx = found; }
  let x1 = cx, x2 = cx; while (x1 > 0 && mask[row + x1 - 1] >= thr) x1--; while (x2 < w - 1 && mask[row + x2 + 1] >= thr) x2++;
  return [x1, x2];
}
const widthAt = (mask, w, y, cx) => { const s = segment(mask, w, y, cx); return s ? s[1] - s[0] : Infinity; };
/* Build the marker model for one photo from its mask and landmarks. frac: waist/hip positions relative to the
   torso, taken from the front photo so the side photo is measured at the same body levels. */
export function autoModel(mask, w, h, lm, sex, frac) {
  const P = i => ({ x: lm[i].x * w, y: lm[i].y * h });
  const sh = (P(11).y + P(12).y) / 2, hp = (P(23).y + P(24).y) / 2, T = hp - sh;
  const cx = (P(23).x + P(24).x) / 2, mouth = (P(9).y + P(10).y) / 2;
  const cxNeck = ((P(7).x + P(8).x) / 2 + (P(11).x + P(12).x) / 2) / 2;
  const { top, bottom } = extent(mask, w, h);
  const scanMin = (ya, yb, c, wantMax) => { let best = null, bw = wantMax ? -1 : Infinity; for (let y = Math.max(0, Math.round(ya)); y <= Math.min(h - 1, Math.round(yb)); y++) { const ww = widthAt(mask, w, y, c); if (!isFinite(ww)) continue; if (wantMax ? ww > bw : ww < bw) { bw = ww; best = y; } } return best; };
  const neckY = scanMin(mouth + 0.25 * (sh - mouth), sh - 0.1 * (sh - mouth), cxNeck, false) ?? (mouth + sh) / 2;
  let waistF = frac?.waist; if (waistF == null) { if (sex === 'm') waistF = 0.24; else { const y = scanMin(hp - 0.55 * T, hp - 0.15 * T, cx, false); waistF = y == null ? 0.3 : (hp - y) / T; } }
  let hipF = frac?.hip; if (hipF == null) { const y = scanMin(hp - 0.1 * T, hp + 0.3 * T, cx, true); hipF = y == null ? -0.1 : (hp - y) / T; }
  const seg = (y, c) => { const s = segment(mask, w, y, c) || [c - w * 0.1, c + w * 0.1]; return { y, x1: s[0], x2: s[1] }; };
  const waistY = hp - waistF * T, hipY = hp - hipF * T;
  return { w, h, top, bottom, neck: seg(neckY, cxNeck), waist: seg(waistY, cx), hip: seg(hipY, cx), frac: { waist: waistF, hip: hipF }, cropped: top <= 1 || bottom >= h - 2 };
}
export function defaultModel(w, h, side) {
  const c = w / 2, k = side ? 0.75 : 1;
  return { w, h, top: h * 0.04, bottom: h * 0.96, neck: { y: h * 0.17, x1: c - w * 0.06 * k, x2: c + w * 0.06 * k }, waist: { y: h * 0.43, x1: c - w * 0.15 * k, x2: c + w * 0.15 * k }, hip: { y: h * 0.52, x1: c - w * 0.18 * k, x2: c + w * 0.18 * k }, manual: true };
}
/* Turn a pair of marker models into circumferences (cm) and body-fat estimates. cal: per-site factors from tape. */
export function measure(front, side, heightCm, sex, cal = {}) {
  if (!front || !side) return null;
  const sf = heightCm / Math.max(1, front.bottom - front.top), ss = heightCm / Math.max(1, side.bottom - side.top);
  const circ = k => ellipse((front[k].x2 - front[k].x1) * sf, (side[k].x2 - side[k].x1) * ss) * (cal[k] || 1);
  const cm = { neck: circ('neck'), waist: circ('waist'), hip: circ('hip') };
  return { cm, navy: bfNavy(sex, heightCm, cm.neck, cm.waist, cm.hip), rfm: bfRFM(sex, heightCm, cm.waist), calibrated: !!(cal.waist) };
}

async function detect(img) {
  const { L, masks } = await landmarker();
  const r = L.detect(img);
  if (!r.landmarks?.length) { r.segmentationMasks?.forEach(m => m.close()); return null; }
  if (!masks || !r.segmentationMasks?.length) return { lm: r.landmarks[0], mask: null, w: img.naturalWidth, h: img.naturalHeight };
  const m = r.segmentationMasks[0]; const out = { lm: r.landmarks[0], mask: m.getAsFloat32Array().slice(), w: m.width, h: m.height }; m.close();
  return out;
}
/* Without a mask: markers from landmark proportions (the person then drags them to the body edges). */
function landmarkModel(w, h, lm, side, frac) {
  const P = i => ({ x: lm[i].x * w, y: lm[i].y * h });
  const sh = (P(11).y + P(12).y) / 2, hp = (P(23).y + P(24).y) / 2, T = hp - sh, cx = (P(23).x + P(24).x) / 2;
  const sw = Math.max(Math.abs(P(11).x - P(12).x), 0.18 * T * 2), k = side ? 0.62 : 1;
  const heel = Math.max(P(29).y, P(30).y, P(31).y, P(32).y), nose = P(0).y;
  const wf = frac?.waist ?? 0.24, hf = frac?.hip ?? -0.1;
  const seg = (y, half) => ({ y, x1: cx - half, x2: cx + half });
  return { w, h, top: Math.max(0, nose - 0.13 * (heel - nose)), bottom: Math.min(h, heel + 0.01 * h), neck: seg((P(9).y + P(10).y) / 2 + 0.55 * (sh - (P(9).y + P(10).y) / 2), sw * 0.2 * (side ? 0.95 : 1)), waist: seg(hp - wf * T, sw * 0.38 * k), hip: seg(hp - hf * T, sw * 0.45 * k), frac: { waist: wf, hip: hf }, approx: true };
}
/* imgs: { front: HTMLImageElement, side: HTMLImageElement } → { front, side, auto, error } in image pixel space */
export async function analyse(imgs, sex) {
  const res = { auto: false };
  try {
    const f = await detect(imgs.front), s = await detect(imgs.side);
    if (f && s) {
      const scale = (m, img) => { const kx = img.naturalWidth / m.w, ky = img.naturalHeight / m.h; return { ...m, w: img.naturalWidth, h: img.naturalHeight, top: m.top * ky, bottom: m.bottom * ky, neck: { y: m.neck.y * ky, x1: m.neck.x1 * kx, x2: m.neck.x2 * kx }, waist: { y: m.waist.y * ky, x1: m.waist.x1 * kx, x2: m.waist.x2 * kx }, hip: { y: m.hip.y * ky, x1: m.hip.x1 * kx, x2: m.hip.x2 * kx } }; };
      const fm = f.mask ? autoModel(f.mask, f.w, f.h, f.lm, sex) : landmarkModel(f.w, f.h, f.lm, false);
      const sm = s.mask ? autoModel(s.mask, s.w, s.h, s.lm, sex, fm.frac) : landmarkModel(s.w, s.h, s.lm, true, fm.frac);
      res.front = scale(fm, imgs.front); res.side = scale(sm, imgs.side); res.auto = !fm.approx; res.approx = !!fm.approx; res.cropped = !!(fm.cropped || sm.cropped);
    }
  } catch (e) { res.error = String(e.message || e); }
  if (!res.front) res.front = defaultModel(imgs.front.naturalWidth, imgs.front.naturalHeight, false);
  if (!res.side) res.side = defaultModel(imgs.side.naturalWidth, imgs.side.naturalHeight, true);
  return res;
}

/* ---------- marker editor ---------- */
export function editor(el, urls, model, onChange) {
  const poses = ['front', 'side'];
  const r = Math.max(model.front.w, model.front.h) / 70;
  const draw = p => {
    const m = model[p], c = (m.neck.x1 + m.neck.x2) / 2;
    const segH = (k, cls) => `<line class="mk-l ${cls}" x1="${m[k].x1}" x2="${m[k].x2}" y1="${m[k].y}" y2="${m[k].y}"/><circle class="mk-h" data-h="${k}.x1" cx="${m[k].x1}" cy="${m[k].y}" r="${r}"/><circle class="mk-h" data-h="${k}.x2" cx="${m[k].x2}" cy="${m[k].y}" r="${r}"/><circle class="mk-h mid" data-h="${k}.y" cx="${(m[k].x1 + m[k].x2) / 2}" cy="${m[k].y}" r="${r * 0.8}"/>`;
    return `<line class="mk-l lim" x1="0" x2="${m.w}" y1="${m.top}" y2="${m.top}"/><circle class="mk-h" data-h="top" cx="${c}" cy="${m.top}" r="${r}"/>` +
      `<line class="mk-l lim" x1="0" x2="${m.w}" y1="${m.bottom}" y2="${m.bottom}"/><circle class="mk-h" data-h="bottom" cx="${c}" cy="${m.bottom}" r="${r}"/>` +
      segH('neck', 'n') + segH('waist', 'w') + segH('hip', 'hp');
  };
  el.innerHTML = poses.map(p => `<figure class="ped"><div class="pedw"><img src="${urls[p]}" alt=""><svg viewBox="0 0 ${model[p].w} ${model[p].h}" data-p="${p}">${draw(p)}</svg></div></figure>`).join('');
  el.querySelectorAll('svg').forEach(svg => {
    const p = svg.dataset.p; let drag = null;
    const pt = e => { const q = svg.createSVGPoint(); q.x = e.clientX; q.y = e.clientY; return q.matrixTransform(svg.getScreenCTM().inverse()); };
    svg.addEventListener('pointerdown', e => { const h = e.target.dataset?.h; if (!h) return; drag = h; svg.setPointerCapture(e.pointerId); e.preventDefault(); });
    svg.addEventListener('pointermove', e => {
      if (!drag) return; const q = pt(e), m = model[p];
      if (drag === 'top' || drag === 'bottom') { m[drag] = Math.max(0, Math.min(m.h, q.y)); m.limAdj = true; }
      else { const [k, f] = drag.split('.'); if (f === 'y') m[k].y = Math.max(0, Math.min(m.h, q.y)); else m[k][f] = Math.max(0, Math.min(m.w, q.x)); }
      svg.innerHTML = draw(p); onChange && onChange(model);
    });
    const end = () => { drag = null; }; svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  });
}
