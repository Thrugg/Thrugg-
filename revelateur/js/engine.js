/* Révélateur — the engine. Pure functions, no DOM, so the checks run in Node.
   - SLIDERS: every setting, its range and its group.
   - K: the constants of the image pipeline. The WebGL shader (gl.js) is generated from the same numbers, and
     process() below is the same pipeline in JavaScript, used by the checks and by the auto-adjust to predict
     where the tones land.
   - analyze(): measures a small copy of a photo (tones, colour cast, saturation, haze, an existing look).
   - autoAdjust(): turns the measurements and the scene type into slider values, with the reasons.
   - taste: what you change after the auto, remembered per scene type and added to the next photos. */

export const BANDS = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'];
/* Band centres on the HSV hue circle, in degrees. Each pixel belongs to its two nearest bands, linearly. */
export const BAND_HUE = [0, 30, 60, 120, 180, 230, 275, 320];

const S = (k, label, group, min = -100, max = 100, step = 1, unit = '') => ({ k, label, group, min, max, step, unit });
export const SLIDERS = [
  S('exposure', 'Exposure', 'light', -4, 4, 0.05, 'EV'),
  S('contrast', 'Contrast', 'light'),
  S('highlights', 'Highlights', 'light'),
  S('shadows', 'Shadows', 'light'),
  S('whites', 'Whites', 'light'),
  S('blacks', 'Blacks', 'light'),
  S('temp', 'Temperature', 'color'),
  S('tint', 'Tint', 'color'),
  S('vibrance', 'Vibrance', 'color'),
  S('saturation', 'Saturation', 'color'),
  S('clarity', 'Clarity', 'effects'),
  S('dehaze', 'Dehaze', 'effects'),
  S('fade', 'Fade', 'effects', 0, 100),
  S('vignette', 'Vignette', 'effects'),
  ...['hue', 'sat', 'lum'].flatMap(p => BANDS.map(b => S(p + '_' + b, b[0].toUpperCase() + b.slice(1), 'mix')))
];
export const KEYS = SLIDERS.map(s => s.k);
export const SL = Object.fromEntries(SLIDERS.map(s => [s.k, s]));
export const neutral = () => Object.fromEntries(KEYS.map(k => [k, 0]));
export const clampVal = (k, v) => { const s = SL[k]; if (!s || !Number.isFinite(v)) return 0; const r = Math.round(v / s.step) * s.step; return Math.min(s.max, Math.max(s.min, +r.toFixed(2))); };
export const tidy = v => { const o = neutral(); for (const k of KEYS) o[k] = clampVal(k, v && v[k] != null ? +v[k] : 0); return o; };
export const isNeutral = v => KEYS.every(k => !v[k]);
export const changedKeys = (a, b) => KEYS.filter(k => Math.abs((a[k] || 0) - (b[k] || 0)) > SL[k].step / 2);

/* Pipeline constants (shared with the shader). */
export const K = {
  W: [0.2126, 0.7152, 0.0722],   // luminance weights
  wb: 0.006,                     // temperature: ±100 moves red and blue by ±0.6 stop, in opposite directions
  tint: 0.005,                   // tint: ±100 moves green by ∓0.5 stop (positive = magenta)
  dehaze: 0.85, tMin: 0.25,      // haze removal strength and the floor of the transmission
  hi: 1.1, sh: 1.6,              // highlights and shadows, in stops at ±100
  bp: 0.08, wp: 0.15,            // blacks and whites move the black and white points by this much at ±100
  con: 0.85, pivot: 0.46,        // contrast: slope at the pivot is 2^(±0.85) at ±100
  fade: 0.15,                    // fade lifts black to this at 100
  clarity: 0.7,                  // local contrast gain at ±100
  vig: 0.75,                     // vignette: edge brightness change at ±100
  vib: 0.9, satHsl: 1.0, hueDeg: 30, lum: 0.35
};

/* ---------- colour helpers ---------- */
export const dec = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
export const enc = c => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lumOf = (r, g, b) => K.W[0] * r + K.W[1] * g + K.W[2] * b;

export function rgb2hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 1e-6) {
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, mx > 1e-6 ? d / mx : 0, mx];
}
export function hsv2rgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
}
/* Weights of the eight colour bands for a hue: two neighbours share the pixel, linearly. */
export function bandWeights(h) {
  const w = new Array(8).fill(0);
  for (let i = 0; i < 8; i++) {
    const a = BAND_HUE[i], b = i === 7 ? 360 : BAND_HUE[i + 1];
    if (h >= a && h < b) { const t = (h - a) / (b - a); w[i] = 1 - t; w[(i + 1) % 8] += t; break; }
  }
  return w;
}

/* ---------- the pipeline, one pixel ----------
   e: encoded rgb 0..1 of the original. loc: { l, d } the blurred encoded luminance and dark channel around the pixel
   (from the low-resolution blur), u/v: position 0..1, img: { air } the airlight luminance (linear).
   Returns encoded rgb. The shader does exactly this, plus a little dither. */
export function tonePrep(P) {
  return {
    wr: Math.pow(2, P.temp * K.wb), wg: Math.pow(2, -P.tint * K.tint), wbb: Math.pow(2, -P.temp * K.wb),
    ex: Math.pow(2, P.exposure), bp: -P.blacks / 100 * K.bp, wp: 1 - P.whites / 100 * K.wp,
    g: Math.pow(2, P.contrast / 100 * K.con), fb: P.fade / 100 * K.fade
  };
}
/* The luminance part alone: linear Y in, linear Y out. yb = linear local luminance (already exposed). */
export function toneY(Y, yb, P, T) {
  const xm = enc(Math.min(1, 0.4 * Y + 0.6 * yb));
  const mh = smooth(0.5, 0.95, xm) * (1 - 0.45 * smooth(0.95, 1.0, xm)), ms = 1 - smooth(0.0, 0.5, xm);
  const gain = Math.pow(2, P.highlights / 100 * K.hi * mh + P.shadows / 100 * K.sh * ms);
  const Y2 = Y * gain;
  let x = enc(Math.max(Y2, 0));
  if (P.clarity) {
    const xb = enc(Math.max(yb * gain, 0)), mid = 1 - Math.pow(clamp(2 * x - 1, -1, 1), 2);
    x += P.clarity / 100 * K.clarity * (x - xb) * mid;
  }
  x = (x - T.bp) / (T.wp - T.bp);
  if (x > 0 && x < 1) { const m = K.pivot; x = x < m ? m * Math.pow(x / m, T.g) : 1 - (1 - m) * Math.pow((1 - x) / (1 - m), T.g); }
  if (x > 0) x = T.fb + x * (1 - T.fb); else x = T.fb * (1 + x);
  return dec(Math.max(x, 0));
}
export function process(e, P, loc = null, u = 0.5, v = 0.5, img = { air: 1 }, aspect = 1.5, T = tonePrep(P)) {
  let r = dec(e[0]), g = dec(e[1]), b = dec(e[2]);
  const n = lumOf(T.wr, T.wg, T.wbb);
  r *= T.wr / n; g *= T.wg / n; b *= T.wbb / n;
  const A = img.air || 1;
  let lb = loc ? dec(loc.l) : lumOf(r, g, b);
  if (P.dehaze > 0) {
    const dark = loc ? dec(loc.d) : Math.min(r, g, b);
    const t = Math.max(1 - P.dehaze / 100 * K.dehaze * dark / A, K.tMin);
    r = Math.max(0, (r - A) / t + A); g = Math.max(0, (g - A) / t + A); b = Math.max(0, (b - A) / t + A);
    lb = Math.max(0, (lb - A) / t + A);
  } else if (P.dehaze < 0) {
    const h = -P.dehaze / 100 * 0.5;
    r = r * (1 - h) + A * h; g = g * (1 - h) + A * h; b = b * (1 - h) + A * h; lb = lb * (1 - h) + A * h;
  }
  r *= T.ex; g *= T.ex; b *= T.ex; lb *= T.ex;
  const Y = lumOf(r, g, b);
  const Yt = toneY(Y, lb, P, T);
  const q = Yt / (Y + 1e-4);
  r = (r + 1e-4) * q; g = (g + 1e-4) * q; b = (b + 1e-4) * q;
  if (P.vignette) {
    const dx = (u - 0.5) * 2, dy = (v - 0.5) * 2, d = Math.sqrt(dx * dx + dy * dy) / Math.SQRT2;
    const f = Math.max(0, 1 + P.vignette / 100 * K.vig * smooth(0.3, 1.0, d));
    r *= f; g *= f; b *= f;
  }
  [r, g, b] = gamut(r, g, b);
  let er = enc(r), eg = enc(g), eb = enc(b);
  return color(er, eg, eb, P);
}
function gamut(r, g, b) {
  r = Math.max(r, 0); g = Math.max(g, 0); b = Math.max(b, 0);
  const m = Math.max(r, g, b);
  if (m <= 1) return [r, g, b];
  const Y = lumOf(r, g, b);
  /* half towards grey at the same luminance (keeps the hue), half plain clipping (keeps the saturation) */
  const k = Y >= 1 ? 0 : (1 - Y) / (m - Y), q = Math.min(Y, 1), c = x => Math.min(x, 1);
  return [0.5 * (q + (r - Y) * k) + 0.5 * c(r), 0.5 * (q + (g - Y) * k) + 0.5 * c(g), 0.5 * (q + (b - Y) * k) + 0.5 * c(b)];
}
function color(r, g, b, P) {
  let [h, s] = rgb2hsv(r, g, b);
  const w = bandWeights(h);
  let dh = 0, ds = 0, dl = 0;
  for (let i = 0; i < 8; i++) { if (!w[i]) continue; dh += w[i] * P['hue_' + BANDS[i]]; ds += w[i] * P['sat_' + BANDS[i]]; dl += w[i] * P['lum_' + BANDS[i]]; }
  if (dh && s > 1e-4) { const v = Math.max(r, g, b); [r, g, b] = hsv2rgb(h + dh / 100 * K.hueDeg, s, v); }
  const vb = P.vibrance / 100;
  let vib = 0;
  if (vb > 0) { const skin = (1 - smooth(10, 28, Math.abs(h - 25))) * smooth(0.1, 0.25, s) * (1 - smooth(0.55, 0.75, s)); vib = vb * K.vib * (1 - s) * (1 - 0.65 * skin); }
  else if (vb < 0) vib = vb * K.vib * (0.4 + 0.6 * s);
  let k = (1 + P.saturation / 100) * (1 + vib) * (1 + ds / 100 * K.satHsl);
  const y = lumOf(r, g, b), mn = Math.min(r, g, b), mx = Math.max(r, g, b);
  if (k > 1) {
    if (mn < y - 1e-6) k = Math.min(k, y / (y - mn));
    if (mx > y + 1e-6) k = Math.min(k, (1 - y) / (mx - y));
    k = Math.max(k, 1);
  }
  k = Math.max(k, 0);
  r = y + (r - y) * k; g = y + (g - y) * k; b = y + (b - y) * k;
  if (dl) { const f = 1 + dl / 100 * K.lum * smooth(0.05, 0.35, s); r *= f; g *= f; b *= f; }
  return [clamp01(r), clamp01(g), clamp01(b)];
}

/* ---------- the low-resolution blur (local luminance and dark channel) ----------
   Same idea as the shader: a copy about 256 px on the long side, blurred with a Gaussian of sigma 4 px there.
   Here it serves the checks and the measurements. */
export function blurMaps(data, w, h, size = 256) {
  const s = Math.min(1, size / Math.max(w, h)), bw = Math.max(1, Math.round(w * s)), bh = Math.max(1, Math.round(h * s));
  const R = new Float32Array(bw * bh), G = new Float32Array(bw * bh), B = new Float32Array(bw * bh), C = new Float32Array(bw * bh);
  for (let y = 0; y < h; y++) {
    const by = Math.min(bh - 1, Math.floor(y * bh / h));
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, bx = Math.min(bw - 1, Math.floor(x * bw / w)), j = by * bw + bx;
      R[j] += data[i] / 255; G[j] += data[i + 1] / 255; B[j] += data[i + 2] / 255; C[j]++;
    }
  }
  /* like the shader: luminance and darkest channel of the averaged colour */
  const L = new Float32Array(bw * bh), D = new Float32Array(bw * bh);
  for (let j = 0; j < L.length; j++) { if (C[j]) { const r = R[j] / C[j], g = G[j] / C[j], b = B[j] / C[j]; L[j] = K.W[0] * r + K.W[1] * g + K.W[2] * b; D[j] = Math.min(r, g, b); } }
  return { w: bw, h: bh, L: gauss(L, bw, bh), D: gauss(D, bw, bh) };
}
export const GAUSS = (() => { const sig = 4, r = 9, k = []; let s = 0; for (let i = -r; i <= r; i++) { const v = Math.exp(-i * i / (2 * sig * sig)); k.push(v); s += v; } return k.map(v => v / s); })();
function gauss(a, w, h) {
  const r = (GAUSS.length - 1) / 2, t = new Float32Array(a.length), o = new Float32Array(a.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let i = -r; i <= r; i++) s += GAUSS[i + r] * a[y * w + clamp(x + i, 0, w - 1)]; t[y * w + x] = s; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let i = -r; i <= r; i++) s += GAUSS[i + r] * t[clamp(y + i, 0, h - 1) * w + x]; o[y * w + x] = s; }
  return o;
}
export function sampleMap(m, u, v) {
  const x = clamp(u * m.w - 0.5, 0, m.w - 1), y = clamp(v * m.h - 0.5, 0, m.h - 1);
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(x0 + 1, m.w - 1), y1 = Math.min(y0 + 1, m.h - 1), fx = x - x0, fy = y - y0;
  const at = (A) => (A[y0 * m.w + x0] * (1 - fx) + A[y0 * m.w + x1] * fx) * (1 - fy) + (A[y1 * m.w + x0] * (1 - fx) + A[y1 * m.w + x1] * fx) * fy;
  return { l: at(m.L), d: at(m.D) };
}
/* Whole small image through the pipeline (checks, thumbnails without WebGL). */
export function renderImage(data, w, h, P, img = { air: 1 }) {
  const P2 = tidy(P), T = tonePrep(P2), m = blurMaps(data, w, h), out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, u = (x + 0.5) / w, v = (y + 0.5) / h;
    const o = process([data[i] / 255, data[i + 1] / 255, data[i + 2] / 255], P2, sampleMap(m, u, v), u, v, img, w / h, T);
    out[i] = Math.round(o[0] * 255); out[i + 1] = Math.round(o[1] * 255); out[i + 2] = Math.round(o[2] * 255); out[i + 3] = 255;
  }
  return out;
}

/* ---------- measuring a photo ----------
   data: RGBA of a small copy (about 384 px long side). faces: [{x,y,w,h}] in 0..1, optional. */
export function analyze(data, w, h, faces = []) {
  const N = w * h, hist = new Float64Array(256), xs = new Float32Array(N);
  let sumX = 0, sumC = 0, clipHi = 0, clipLo = 0;
  const neu = [0, 0, 0, 0], all = [0, 0, 0];
  let sky = 0, skyBright = 0, green = 0, skin = 0, warm = 0, warmTop = 0, blue = 0, brightNeutral = 0, topN = 0, topX = 0, botX = 0, botN = 0;
  const sh = [0, 0, 0], hl = [0, 0, 0];
  const chromas = new Float32Array(N), dark = new Float32Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, i = p * 4, r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const X = K.W[0] * r + K.W[1] * g + K.W[2] * b, mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn;
    xs[p] = X; hist[Math.min(255, Math.round(X * 255))]++; sumX += X; sumC += c; chromas[p] = c; dark[p] = mn;
    if (mx >= 0.985) clipHi++; if (mx <= 0.02) clipLo++;
    const lr = dec(r), lg = dec(g), lbb = dec(b);
    all[0] += lr; all[1] += lg; all[2] += lbb;
    const [hu, s] = rgb2hsv(r, g, b);
    const top = y < h * 0.4;
    /* near-neutral pixels for the colour cast; light blue sky is not a neutral */
    if (s < 0.13 && X > 0.15 && X < 0.93 && !(top && hu > 185 && hu < 255 && s > 0.06)) { neu[0] += lr; neu[1] += lg; neu[2] += lbb; neu[3]++; }
    if (top) { topN++; topX += X; if ((hu > 185 && hu < 255 && s > 0.12 && X > 0.35) || (s < 0.12 && X > 0.7)) { sky++; if (X > 0.75) skyBright++; } }
    if (y > h * 0.6) { botN++; botX += X; }
    if (hu > 65 && hu < 165 && s > 0.2 && X > 0.08) green++;
    if (hu > 8 && hu < 42 && s > 0.18 && s < 0.65 && X > 0.25 && X < 0.9) skin++;
    if ((hu < 50 || hu > 330) && s > 0.35 && X > 0.2) { warm++; if (top && X > 0.35) warmTop++; }
    if (hu > 175 && hu < 250 && s > 0.2) blue++;
    if (s < 0.1 && X > 0.72) brightNeutral++;
    const oa = r - g, ob = (r + g) / 2 - b;
    if (X < 0.3 && X > 0.03) { sh[0] += oa; sh[1] += ob; sh[2]++; }
    if (X > 0.7 && X < 0.97) { hl[0] += oa; hl[1] += ob; hl[2]++; }
  }
  const pct = q => { let acc = 0; const t = q * N; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= t) return i / 255; } return 1; };
  const P = { p005: pct(0.005), p01: pct(0.01), p05: pct(0.05), p25: pct(0.25), p50: pct(0.5), p75: pct(0.75), p95: pct(0.95), p99: pct(0.99), p995: pct(0.995) };
  /* colour cast: from near-neutral pixels, gray world as a fallback, in stops */
  const nf = neu[3] / N;
  /* too few neutral pixels (a strong cast, or a colourful subject): the brightest unclipped pixels instead */
  const wpatch = [0, 0, 0, 0];
  if (neu[3] <= N * 0.02) {
    for (let p = 0; p < N; p++) {
      if (xs[p] < P.p95 || xs[p] > P.p995) continue;
      const i = p * 4; if (Math.max(data[i], data[i + 1], data[i + 2]) >= 251) continue;
      wpatch[0] += dec(data[i] / 255); wpatch[1] += dec(data[i + 1] / 255); wpatch[2] += dec(data[i + 2] / 255); wpatch[3]++;
    }
  }
  const castSrc = neu[3] > N * 0.02 ? 'neutral' : wpatch[3] > N * 0.002 ? 'bright' : 'all';
  const src = castSrc === 'neutral' ? neu : castSrc === 'bright' ? wpatch : all;
  const castRB = Math.log2((src[0] + 1e-6) / (src[2] + 1e-6)), castG = Math.log2((src[1] + 1e-6) / Math.sqrt((src[0] + 1e-6) * (src[2] + 1e-6)));
  /* haze: a 7 × 7 minimum of the dark channel, its median in the top half, and the airlight */
  const dm = minFilter(dark, w, h, 3);
  const topDark = Array.from(dm.slice(0, Math.floor(h / 2) * w)).sort((a, b) => a - b);
  const haze = topDark.length ? topDark[Math.floor(topDark.length / 2)] : 0;
  const order = Array.from(dm.keys()).sort((a, b) => dm[b] - dm[a]).slice(0, Math.max(1, Math.round(N * 0.002)));
  let air = 0; for (const p of order) air += dec(xs[p]); air = Math.max(0.3, Math.min(1, air / order.length));
  const cs = Array.from(chromas).sort((a, b) => a - b);
  /* faces */
  let faceX = null, faceArea = 0;
  if (faces && faces.length) {
    let s = 0, n = 0;
    for (const f of faces) {
      faceArea = Math.max(faceArea, f.w * f.h);
      const x0 = Math.max(0, Math.floor((f.x + f.w * 0.2) * w)), x1 = Math.min(w, Math.ceil((f.x + f.w * 0.8) * w));
      const y0 = Math.max(0, Math.floor((f.y + f.h * 0.25) * h)), y1 = Math.min(h, Math.ceil((f.y + f.h * 0.85) * h));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += xs[y * w + x]; n++; }
    }
    if (n) faceX = s / n;
  }
  const vec = (a) => a[2] ? [a[0] / a[2], a[1] / a[2]] : [0, 0];
  return {
    w, h, ...P, mean: sumX / N, clipHi: clipHi / N, clipLo: clipLo / N,
    chroma: sumC / N, chroma90: cs[Math.floor(cs.length * 0.9)] || 0,
    castRB, castG, neutralFrac: nf, castSrc,
    sky: topN ? sky / topN : 0, skyBright: topN ? skyBright / topN : 0, green: green / N, skin: skin / N, warm: warm / N, warmTop: topN ? warmTop / topN : 0, blue: blue / N, brightNeutral: brightNeutral / N,
    topMean: topN ? topX / topN : 0, botMean: botN ? botX / botN : 0,
    haze, air, faceX, faceArea, faces: (faces || []).length,
    shadowTone: vec(sh), highTone: vec(hl), hist: Array.from(hist, v => +(v / N).toFixed(5))
  };
}
function minFilter(a, w, h, r) {
  const t = new Float32Array(a.length), o = new Float32Array(a.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let m = 1; for (let i = Math.max(0, x - r); i <= Math.min(w - 1, x + r); i++) m = Math.min(m, a[y * w + i]); t[y * w + x] = m; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let m = 1; for (let i = Math.max(0, y - r); i <= Math.min(h - 1, y + r); i++) m = Math.min(m, t[i * w + x]); o[y * w + x] = m; }
  return o;
}

/* ---------- an existing look ----------
   Signs that the photo already carries a grade (a filter, a preset, a film look): then the auto corrects less. */
export function detectLook(st) {
  const looks = [];
  const bw = st.chroma < 0.025 && st.chroma90 < 0.06;
  if (bw) looks.push({ k: 'bw', s: 1 });
  const matte = st.p005 > 0.07 && st.p50 < 0.7 && st.clipLo < 0.001 ? clamp01((st.p005 - 0.06) / 0.1) : 0;
  if (matte > 0.15) looks.push({ k: 'matte', s: matte });
  const [sa, sb] = st.shadowTone, [ha, hb] = st.highTone, ms = Math.hypot(sa, sb), mh = Math.hypot(ha, hb);
  if (!bw && ms > 0.03 && mh > 0.03) {
    const cos = (sa * ha + sb * hb) / (ms * mh);
    if (cos < -0.2) looks.push({ k: 'split', s: clamp01((Math.min(ms, mh) - 0.03) / 0.06) * clamp01((-cos - 0.2) / 0.5) });
  }
  const punchy = st.p05 < 0.03 && st.p95 > 0.93 && st.chroma > 0.22;
  if (punchy) looks.push({ k: 'punchy', s: 0.6 });
  const faded = !bw && st.chroma < 0.08 && st.p005 > 0.05;
  if (faded) looks.push({ k: 'faded', s: 0.7 });
  const g = looks.reduce((m, l) => Math.max(m, l.s), 0);
  return { looks, g, bw, matte };
}

/* ---------- auto-adjust ---------- */
export const LOOK_TEXT = {
  bw: 'Black and white: colours left alone',
  matte: 'Faded blacks look: kept',
  split: 'Split-toned look (different colours in shadows and highlights): kept, lighter touch',
  punchy: 'Already contrasty and colourful: lighter touch',
  faded: 'Soft, faded look: kept, lighter touch'
};
const EV_TXT = ev => (ev > 0 ? '+' : '') + ev.toFixed(2) + ' EV';

/* st: analyze() result. prof: the scene profile (scenes.js). Returns { v: values, why: [lines], look }. */
export function autoAdjust(st, prof, scene = 'general') {
  const v = neutral(), why = [], look = detectLook(st), gl = look.g;
  const soft = 1 - 0.6 * gl;                       // corrective strength when a look is detected
  /* exposure */
  const key = 0.6 * st.p50 + 0.4 * st.mean;
  let ev = Math.log2(dec(prof.key) / Math.max(dec(key), 1e-4)) * 0.7;
  /* Faces never get a fixed target brightness (skin tones differ). They only matter when a face is much darker
     than the rest of the picture (backlight): then it is brought part of the way up. With a face in a normal light,
     a dark suit or a dark room does not push the exposure far. */
  const face = st.faceX != null && st.faceArea > 0.005, backlit = face && st.faceX + 0.12 < key;
  if (face && !backlit) ev = Math.min(ev, 0.4);
  if (backlit) ev = Math.max(ev, Math.min(1.2, Math.log2(dec(key) / Math.max(dec(st.faceX), 1e-4)) * 0.5));
  if (st.p50 > 0.68 && st.clipHi < 0.03 && scene !== 'snow') ev = Math.max(ev, -0.3);   // a bright, airy photo on purpose
  if (scene === 'night') ev = Math.min(ev, 0.7);
  if (ev < 0) { ev *= st.clipHi > 0.02 ? 0.8 : 0.5; if (st.clipHi < 0.01) ev = Math.max(ev, -0.35); }   // darken only what is really too bright
  ev = clamp(ev, -1.5, 2) * (1 - 0.3 * gl);
  /* keep the highlights: no more than a little extra clipping from a brighter exposure */
  if (ev > 0) { const room = Math.log2(1 / Math.max(dec(st.p99), 1e-3)); if (ev > room + 0.4) ev = Math.max(room + 0.4, ev * 0.6); }
  if (Math.abs(ev) < 0.08) ev = 0;
  v.exposure = ev;
  if (ev) why.push(ev > 0 ? `Darker than a ${prof.name.toLowerCase()} usually wants: Exposure ${EV_TXT(ev)}` : `Brighter than needed: Exposure ${EV_TXT(ev)}`);
  if (backlit && ev > 0) why.push('Face darker than the background (backlight): exposure set for the face');

  /* highlights and shadows, judged after the exposure change */
  const exl = Math.pow(2, ev), after = x => enc(Math.min(1, dec(x) * exl));
  const hi99 = after(st.p99);
  let hl = -clamp((hi99 - 0.82) / 0.16, 0, 1) * 70 * prof.hi;
  if (st.skyBright > 0.25) hl -= 15 * prof.hi;
  hl = clamp(hl, -90, 0);
  const darkFrac = st.hist.slice(0, 50).reduce((a, b) => a + b, 0);
  let sh = clamp((0.2 - after(st.p25)) / 0.18, 0, 1) * 60 * prof.sh + clamp(darkFrac * 1.5, 0, 0.6) * 25 * prof.sh;
  if (st.faceX != null && st.faceX < 0.35) sh += 10;
  sh = clamp(sh, 0, 70);
  v.highlights = hl; v.shadows = sh;
  if (hl <= -20) why.push(`Bright areas${st.skyBright > 0.25 ? ' (sky)' : ''} close to white: Highlights ${Math.round(hl)}`);
  if (sh >= 20) why.push(`Dark areas hide detail: Shadows +${Math.round(sh)}`);

  /* whites and blacks: put the ends of the histogram where the profile wants them, after the other moves */
  const P0 = { ...neutral(), exposure: ev, highlights: hl, shadows: sh }, T0 = tonePrep(P0);
  const map = x => enc(toneY(dec(x) * exl, dec(x) * exl, P0, T0));
  const lo = map(st.p005), hi = map(st.p995);
  let tLo = prof.blacks, tHi = prof.whites;
  if (look.matte) tLo = Math.max(tLo, lo * 0.85);                     // keep a faded black
  if (st.p995 < 0.8 && st.haze > 0.3) tHi = Math.min(tHi, hi + 0.12);  // fog: don't force a white
  if (hl < 0) tHi = Math.min(tHi, Math.max(after(st.p995), 0.85));      // highlights were pulled: whites only restore the top
  const highKey = st.p50 > 0.6;
  const span = Math.max(0.05, (hi - lo) / Math.max(0.05, tHi - tLo)), bp = lo - tLo * span, wp = bp + span;
  v.blacks = clamp(-bp / K.bp * 100 * 0.7 * soft * (highKey ? 0.5 : 1), -35, 40);
  v.whites = clamp((1 - wp) / K.wp * 100 * 0.7 * soft, -40, 50);
  if (Math.abs(v.blacks) >= 15) why.push(v.blacks < 0 ? `Blacks a little grey: Blacks ${Math.round(v.blacks)}` : `Blacks crushed: Blacks +${Math.round(v.blacks)}`);
  if (Math.abs(v.whites) >= 15) why.push(v.whites < 0 ? `Whites clipped: Whites ${Math.round(v.whites)}` : hl < 0 ? `Whites +${Math.round(v.whites)} keeps the brightest parts bright` : `No real white in the photo: Whites +${Math.round(v.whites)}`);

  /* contrast from the spread of the mid tones */
  const spread = map(st.p95) - map(st.p05);
  let con = clamp((prof.spread - spread) / 0.3, -1, 1) * 28 * soft * (highKey ? 0.5 : 1);
  if (look.looks.some(l => l.k === 'punchy')) con = Math.min(con, 0);
  if (Math.abs(con) < 4) con = 0;
  v.contrast = con;
  if (con >= 10) why.push(`Flat tones: Contrast +${Math.round(con)}`);
  else if (con <= -10) why.push(`Harsh tones: Contrast ${Math.round(con)}`);

  /* white balance */
  const conf = st.castSrc === 'bright' ? 0.4 : st.castSrc === 'all' ? 0.1 : clamp(st.neutralFrac / 0.1, 0.25, 1);
  let wbS = prof.wb * conf * (look.looks.some(l => l.k === 'split') ? 0.2 : 1) * (look.bw ? 0 : 1);
  const golden = st.castRB > 0.25 && st.warm > 0.08 && (scene === 'sunset' || scene === 'landscape' || scene === 'sea');
  if (golden) wbS = Math.min(wbS, 0.15);
  let temp = -st.castRB / (2 * K.wb) * wbS, tint = st.castG / K.tint * wbS;
  temp = clamp(temp, -45, 45); tint = clamp(tint, -25, 25);
  if (Math.abs(temp) < 3) temp = 0; if (Math.abs(tint) < 3) tint = 0;
  v.temp = temp; v.tint = tint;
  if (golden) why.push('Warm light (golden hour) kept warm');
  else if (temp <= -8) why.push(`Yellow-orange cast: Temperature ${Math.round(temp)}`);
  else if (temp >= 8) why.push(`Blue cast: Temperature +${Math.round(temp)}`);
  if (Math.abs(tint) >= 8) why.push(tint > 0 ? `Green cast: Tint +${Math.round(tint)}` : `Magenta cast: Tint ${Math.round(tint)}`);

  /* colour */
  if (!look.bw) {
    let vib = clamp((prof.sat - st.chroma) / prof.sat, -0.4, 1) * prof.vib;
    if (look.looks.some(l => l.k === 'punchy')) vib = Math.min(vib, 5);
    vib *= soft;
    v.vibrance = Math.abs(vib) < 3 ? 0 : vib;
    v.saturation = clamp(prof.satAdj * soft, -30, 30);
    if (v.vibrance >= 10) why.push(`Colours a little dull for a ${prof.name.toLowerCase()}: Vibrance +${Math.round(v.vibrance)}`);
    else if (v.vibrance <= -8) why.push(`Colours already strong: Vibrance ${Math.round(v.vibrance)}`);
    /* colour mix, only where those colours are present */
    for (const [k, val] of Object.entries(prof.hsl || {})) {
      const band = k.split('_')[1];
      const present = band === 'blue' ? st.blue > 0.04 || st.sky > 0.15 : band === 'green' || band === 'yellow' ? st.green > 0.06 : band === 'orange' || band === 'red' ? st.skin > 0.02 || st.warm > 0.04 : band === 'aqua' ? st.blue > 0.03 : true;
      if (present) v[k] = val * soft;
    }
  }
  /* presence */
  const hazy = clamp((st.haze - 0.22) / 0.25, 0, 1) * clamp((0.75 - spread) / 0.3, 0, 1);
  v.dehaze = clamp(prof.dehaze * (0.4 + 1.6 * hazy) * soft, 0, 45);
  if (v.dehaze < 4) v.dehaze = 0;
  if (hazy > 0.3 && v.dehaze >= 8) why.push(`Haze over the distance: Dehaze +${Math.round(v.dehaze)}`);
  v.clarity = prof.clarity * soft;
  v.vignette = prof.vignette * soft;
  for (const l of look.looks) why.push(LOOK_TEXT[l.k]);
  return { v: tidy(v), why, look: look.looks.map(l => l.k), graded: +gl.toFixed(2) };
}

/* Scale the auto values (Amount slider), then add what was learned. */
export function compose(auto, amount = 1, offset = null) {
  const o = neutral();
  for (const k of KEYS) o[k] = (auto[k] || 0) * amount + (offset ? offset[k] || 0 : 0);
  return tidy(o);
}

/* ---------- taste: learning from your corrections ----------
   A sample is what you changed after the auto on one photo: { s: scene, t: time, d: { key: change } }.
   Samples are kept by photo id, so two devices merge cleanly. The offset for a scene is the recency-weighted mean of
   its samples, shrunk towards zero while there are few of them, plus a smaller share of the mean over all scenes. */
export const TASTE_KEEP = 40;
export function sampleFrom(auto, final, amount = 1) {
  const base = compose(auto, amount), d = {};
  for (const k of changedKeys(base, final)) d[k] = +(final[k] - base[k]).toFixed(2);
  return d;
}
export function addSample(samples, id, scene, d, t = Date.now()) {
  const out = { ...samples };
  if (!d || !Object.keys(d).length) { delete out[id]; return out; }
  out[id] = { s: scene, t, d };
  const mine = Object.entries(out).filter(([, x]) => x.s === scene).sort((a, b) => b[1].t - a[1].t);
  for (const [k] of mine.slice(TASTE_KEEP)) delete out[k];
  return out;
}
function meanOf(list) {
  const o = neutral();
  if (!list.length) return { o, n: 0 };
  let wsum = 0;
  list.sort((a, b) => b.t - a.t).forEach((x, i) => { const w = Math.pow(0.9, i); wsum += w; for (const k in x.d) if (k in o) o[k] += w * x.d[k]; });
  for (const k of KEYS) o[k] /= wsum;
  return { o, n: list.length };
}
export function tasteOffset(samples, scene) {
  const all = Object.values(samples || {});
  const mine = meanOf(all.filter(x => x.s === scene)), glob = meanOf(all);
  const ws = mine.n / (mine.n + 2), wg = glob.n / (glob.n + 6) * (1 - ws) * 0.5;
  const o = neutral();
  for (const k of KEYS) o[k] = mine.o[k] * ws + glob.o[k] * wg;
  return { o: tidy(o), n: mine.n, total: glob.n };
}
/* The biggest learned changes, for the Settings screen. */
export function tasteSummary(samples, scenes) {
  return scenes.map(s => {
    const t = tasteOffset(samples, s);
    const top = KEYS.map(k => [k, t.o[k]]).filter(([k, x]) => Math.abs(x) >= (k === 'exposure' ? 0.05 : 2)).sort((a, b) => Math.abs(b[1]) / SL[b[0]].max - Math.abs(a[1]) / SL[a[0]].max).slice(0, 4);
    return { scene: s, n: t.n, top };
  }).filter(x => x.n > 0);
}
export const fmtVal = (k, x) => k === 'exposure' ? (x > 0 ? '+' : '') + x.toFixed(2) : (x > 0 ? '+' : '') + Math.round(x);
export const labelOf = k => { const s = SL[k]; if (!s) return k; if (s.group !== 'mix') return s.label; const [p] = k.split('_'); return s.label + ' ' + { hue: 'hue', sat: 'saturation', lum: 'luminance' }[p]; };

/* ---------- histogram of rendered pixels (RGBA) ---------- */
export function histogram(data, bins = 64) {
  const r = new Float32Array(bins), g = new Float32Array(bins), b = new Float32Array(bins), y = new Float32Array(bins);
  const n = data.length / 4, f = bins / 256;
  for (let i = 0; i < data.length; i += 4) {
    r[(data[i] * f) | 0]++; g[(data[i + 1] * f) | 0]++; b[(data[i + 2] * f) | 0]++;
    y[((K.W[0] * data[i] + K.W[1] * data[i + 1] + K.W[2] * data[i + 2]) * f) | 0]++;
  }
  let mx = 1e-9; for (const a of [r, g, b, y]) for (let i = 1; i < bins - 1; i++) mx = Math.max(mx, a[i]);
  const norm = a => Array.from(a, v => Math.min(1, v / mx));
  return { r: norm(r), g: norm(g), b: norm(b), y: norm(y), clipLo: y[0] / n, clipHi: y[bins - 1] / n };
}
