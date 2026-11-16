/* Checks for Révélateur on synthetic images. Run with: node --test revelateur/test/*.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { SLIDERS, KEYS, SL, BANDS, K, neutral, tidy, process as px, tonePrep, toneY, bandWeights, dec, enc, rgb2hsv, hsv2rgb, analyze, detectLook, autoAdjust, compose, sampleFrom, addSample, tasteOffset, tasteSummary, TASTE_KEEP, renderImage, histogram, changedKeys } from '../js/engine.js';
import { PROFILES, SCENES, classify, labelScenes, sceneHints } from '../js/scenes.js';
import { JpegWriter, exifOf, fixExif, exifDate, iccProfile, colorants, AC_L_V, AC_C_V, AC_L_N, AC_C_N } from '../js/jpeg.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} ${a} vs ${b}`);
const lum = ([r, g, b]) => K.W[0] * dec(r) + K.W[1] * dec(g) + K.W[2] * dec(b);
/* a synthetic photo: fn(u, v) → [r, g, b] in 0..1 */
function img(w, h, fn) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn((x + 0.5) / w, (y + 0.5) / h, x, y), i = (y * w + x) * 4; d[i] = c[0] * 255; d[i + 1] = c[1] * 255; d[i + 2] = c[2] * 255; d[i + 3] = 255; }
  return d;
}
const noise = (x, y) => ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1 + 1) % 1;

test('settings: unique keys, sane ranges, tidy clamps and rounds', () => {
  assert.equal(new Set(KEYS).size, KEYS.length);
  assert.equal(KEYS.length, 14 + 24);
  for (const s of SLIDERS) assert.ok(s.min < s.max && s.step > 0, s.k);
  const t = tidy({ exposure: 9, contrast: -300, vibrance: 12.6, hue_blue: 40.2, nonsense: 5 });
  assert.equal(t.exposure, 4); assert.equal(t.contrast, -100); assert.equal(t.vibrance, 13); assert.equal(t.hue_blue, 40);
  assert.ok(!('nonsense' in t));
  assert.deepEqual(changedKeys(neutral(), { ...neutral(), shadows: 10 }), ['shadows']);
});

test('neutral settings leave every colour unchanged', () => {
  const P = neutral(), T = tonePrep(P);
  for (let i = 0; i < 300; i++) {
    const e = [noise(i, 1), noise(i, 2), noise(i, 3)], o = px(e, P, null, 0.5, 0.5, { air: 1 }, 1.5, T);
    for (let j = 0; j < 3; j++) near(o[j], e[j], 1.5 / 255, `pixel ${i}`);
  }
});

test('exposure +1 doubles the light of a mid tone; contrast keeps the pivot', () => {
  const mid = [0.4, 0.4, 0.4];
  near(lum(px(mid, tidy({ exposure: 1 }))), 2 * lum(mid), 0.004);
  const piv = [K.pivot, K.pivot, K.pivot];
  near(px(piv, tidy({ contrast: 80 }))[0], K.pivot, 0.003);
  assert.ok(px([0.25, 0.25, 0.25], tidy({ contrast: 80 }))[0] < 0.25 && px([0.75, 0.75, 0.75], tidy({ contrast: 80 }))[0] > 0.75);
});

test('tone curve stays monotonic at the extremes of every light slider', () => {
  for (const P0 of [{ contrast: 100 }, { contrast: -100 }, { highlights: -100 }, { highlights: 100 }, { shadows: 100 }, { shadows: -100 }, { whites: 100, blacks: -100 }, { fade: 100 }, { exposure: 2, highlights: -100, shadows: 100, contrast: 60 }]) {
    const P = tidy(P0), T = tonePrep(P);
    let prev = -1;
    for (let x = 0; x <= 1.0001; x += 0.01) { const Y = dec(x), y = Math.min(1, toneY(Y, Y, P, T)); assert.ok(y >= prev - 1e-4, `${JSON.stringify(P0)} at ${x.toFixed(2)}`); prev = Math.max(prev, y); }
  }
});

test('white balance: warmer raises red over blue, grey keeps its brightness', () => {
  const g = [0.5, 0.5, 0.5], w = px(g, tidy({ temp: 50 })), c = px(g, tidy({ temp: -50 }));
  assert.ok(w[0] > w[2] && c[2] > c[0]);
  near(lum(w), lum(g), 0.01); near(lum(c), lum(g), 0.01);
  const m = px(g, tidy({ tint: 50 })); assert.ok(m[1] < m[0] && m[1] < m[2], 'positive tint is magenta');
});

test('colour: saturation −100 is grey, vibrance spares skin, the eight bands share each hue', () => {
  const o = px([0.8, 0.3, 0.2], tidy({ saturation: -100 }));
  near(o[0], o[1], 0.01); near(o[1], o[2], 0.01);
  const sat = e => rgb2hsv(...e)[1];
  const skin = [0.85, 0.62, 0.5], blue = [0.45, 0.55, 0.75], P = tidy({ vibrance: 80 });
  const ds = sat(px(skin, P)) - sat(skin), db = sat(px(blue, P)) - sat(blue);
  assert.ok(db > 0 && ds >= 0 && ds < db * 0.6, `skin +${ds.toFixed(3)} vs blue +${db.toFixed(3)}`);
  for (let h = 0; h < 360; h += 7) { const w = bandWeights(h); near(w.reduce((a, b) => a + b, 0), 1, 1e-9, `hue ${h}`); }
  const [r, g, b] = hsv2rgb(200, 0.6, 0.8), [h2, s2, v2] = rgb2hsv(r, g, b); near(h2, 200, 1e-6); near(s2, 0.6, 1e-9); near(v2, 0.8, 1e-9);
  const before = rgb2hsv(...[0.3, 0.45, 0.85])[0], after = rgb2hsv(...px([0.3, 0.45, 0.85], tidy({ hue_blue: 100 })))[0];
  assert.ok(after > before + 10, 'blue hue slider turns blue towards purple');
});

test('the whole-image renderer applies clarity and vignette without breaking flat areas', () => {
  const w = 64, h = 48, d = img(w, h, () => [0.5, 0.5, 0.5]);
  const flat = renderImage(d, w, h, { clarity: 100 });
  for (let i = 0; i < flat.length; i += 4) near(flat[i], d[i], 2, 'clarity on a flat image');
  const v = renderImage(d, w, h, { vignette: -100 });
  assert.ok(v[0] < d[0] - 20 && Math.abs(v[((h / 2) * w + w / 2) * 4] - d[0]) <= 2, 'corners darker, centre unchanged');
  const hs = histogram(d, 64); near(hs.y.reduce((a, b) => a + b, 0) > 0 ? 1 : 0, 1, 0);
});

/* ---------- analysis and auto ---------- */
const W = 96, H = 64;
test('a dark photo is brightened, a bright one with a white sky gets its highlights pulled down', () => {
  const dark = img(W, H, (u, v, x, y) => { const t = 0.08 + 0.25 * u + 0.05 * noise(x, y); return [t, t * 0.95, t * 0.9]; });
  const st = analyze(dark, W, H), a = autoAdjust(st, PROFILES.general);
  assert.ok(a.v.exposure > 0.5, `exposure ${a.v.exposure}`);
  assert.ok(a.why.some(w => /Exposure \+/.test(w)));
  const sky = img(W, H, (u, v, x, y) => v < 0.4 ? [0.97, 0.98, 1] : [0.25 + 0.2 * noise(x, y), 0.35, 0.2]);
  const s2 = analyze(sky, W, H), a2 = autoAdjust(s2, PROFILES.landscape, 'landscape');
  assert.ok(a2.v.highlights <= -20, `highlights ${a2.v.highlights}`);
});

test('faces: no fixed skin brightness; only a backlit face lifts the exposure', () => {
  const scene = img(W, H, (u, v, x, y) => { const t = 0.3 + 0.2 * noise(x, y); return [t, t, t]; });
  const box = { x: 0.35, y: 0.2, w: 0.3, h: 0.45 };
  const darkSkin = analyze(img(W, H, (u, v, x, y) => (u > 0.4 && u < 0.6 && v > 0.3 && v < 0.6) ? [0.36, 0.25, 0.2] : [0.3 + 0.2 * noise(x, y), 0.3 + 0.2 * noise(x, y), 0.3 + 0.2 * noise(x, y)]), W, H, [box]);
  assert.ok(autoAdjust(darkSkin, PROFILES.portrait, 'portrait').v.exposure <= 0.4, 'a darker face in normal light is not brightened much');
  const back = analyze(img(W, H, (u, v, x, y) => (u > 0.4 && u < 0.6 && v > 0.3 && v < 0.6) ? [0.12, 0.1, 0.09] : [0.85, 0.85, 0.88]), W, H, [box]);
  const a = autoAdjust(back, PROFILES.portrait, 'portrait');
  assert.ok(a.v.exposure > 0.3 && a.why.some(w => /backlight/.test(w)), `backlit ${a.v.exposure}`);
  assert.ok(analyze(scene, W, H).faceX === null);
});

test('a colour cast on neutral greys is corrected; golden-hour warmth is kept', () => {
  const warm = img(W, H, (u, v, x, y) => { const t = 0.3 + 0.4 * noise(x, y); return [Math.min(1, t * 1.25), t, t * 0.72]; });
  const st = analyze(warm, W, H);
  assert.ok(st.castRB > 0.3, `cast ${st.castRB}`);
  const a = autoAdjust(st, PROFILES.indoor, 'indoor');
  assert.ok(a.v.temp < -10, `temp ${a.v.temp}`);
  const sunset = img(W, H, (u, v, x, y) => v < 0.5 ? [1, 0.55 + 0.1 * noise(x, y), 0.2] : [0.25, 0.15, 0.1]);
  const s2 = analyze(sunset, W, H), a2 = autoAdjust(s2, PROFILES.sunset, 'sunset');
  assert.ok(Math.abs(a2.v.temp) <= 12, `sunset temp ${a2.v.temp}`);
  assert.ok(a2.why.some(w => /golden hour/.test(w)));
});

test('an existing look is noticed: black and white stays colourless, faded blacks are not crushed', () => {
  const bw = img(W, H, (u, v, x, y) => { const t = 0.1 + 0.8 * u; return [t, t, t]; });
  const st = analyze(bw, W, H), a = autoAdjust(st, PROFILES.landscape, 'landscape');
  assert.ok(detectLook(st).bw);
  assert.equal(a.v.vibrance, 0); assert.equal(a.v.temp, 0); assert.equal(a.v.sat_blue, 0);
  const matte = img(W, H, (u, v, x, y) => { const t = 0.16 + 0.6 * u * (0.6 + 0.4 * noise(x, y)); return [t * 1.05, t, t * 0.9]; });
  const sm = analyze(matte, W, H), am = autoAdjust(sm, PROFILES.general);
  assert.ok(am.look.includes('matte'), am.look.join());
  assert.ok(am.v.blacks > -25, `blacks ${am.v.blacks}`);
});

test('scene types: faces, labels and the measurements', () => {
  const st = analyze(img(W, H, () => [0.5, 0.45, 0.4]), W, H);
  assert.equal(classify({ faces: [{ x: 0.3, y: 0.2, w: 0.3, h: 0.35 }], st }).scene, 'portrait');
  assert.equal(classify({ faces: [{ x: .1, y: .2, w: .08, h: .1 }, { x: .4, y: .2, w: .08, h: .1 }, { x: .7, y: .2, w: .08, h: .1 }], st }).scene, 'people');
  assert.equal(classify({ faces: [{ x: 0.3, y: 0.2, w: 0.3, h: 0.35 }], labels: [{ i: 208, p: 0.4 }], st }).scene, 'pet', 'a dog face is not a portrait');
  assert.equal(classify({ labels: [{ i: 933, p: 0.9 }], st }).scene, 'food');
  assert.equal(classify({ labels: [{ i: 970, p: 0.6 }], st }).scene, 'landscape');
  const night = analyze(img(W, H, (u, v, x, y) => noise(x, y) > 0.985 ? [1, 0.9, 0.7] : [0.04, 0.04, 0.06]), W, H);
  assert.equal(classify({ st: night }).scene, 'night');
  assert.ok(sceneHints(night).night > 0.6);
  for (let i = 0; i < 1000; i++) for (const [s, w] of labelScenes(i)) assert.ok(SCENES.includes(s) && w > 0 && w <= 1, `label ${i}`);
  for (const s of SCENES) { const p = PROFILES[s]; for (const k of ['key', 'spread', 'sat', 'wb', 'vib', 'hi', 'sh', 'blacks', 'whites']) assert.equal(typeof p[k], 'number', s + '.' + k); for (const k of Object.keys(p.hsl)) assert.ok(KEYS.includes(k), s + ' ' + k); }
});

test('every scene profile gives a valid, gentle result on an ordinary photo', () => {
  const st = analyze(img(W, H, (u, v, x, y) => [0.2 + 0.6 * u * noise(x, y), 0.3 + 0.4 * v, 0.25 + 0.3 * noise(y, x)]), W, H);
  for (const s of SCENES) {
    const a = autoAdjust(st, PROFILES[s], s);
    for (const k of KEYS) assert.ok(a.v[k] >= SL[k].min && a.v[k] <= SL[k].max, `${s} ${k}`);
    assert.ok(Math.abs(a.v.exposure) <= 2 && Math.abs(a.v.temp) <= 45 && a.v.dehaze <= 45, s);
  }
});

/* ---------- taste ---------- */
test('taste: corrections are learned per scene, shrunk while few, shared a little across scenes', () => {
  const auto = { ...neutral(), vibrance: 20, exposure: 0.2 };
  const d = sampleFrom(auto, { ...auto, vibrance: 32 }, 1);
  assert.deepEqual(d, { vibrance: 12 });
  let t = {};
  t = addSample(t, 'a', 'landscape', d, 1); t = addSample(t, 'b', 'landscape', d, 2); t = addSample(t, 'c', 'landscape', d, 3);
  const o = tasteOffset(t, 'landscape');
  near(o.o.vibrance, 12 * 3 / 5 + 12 * 3 / 9 * 2 / 5 * 0.5, 0.3); assert.equal(o.n, 3);
  const other = tasteOffset(t, 'portrait');
  assert.ok(other.o.vibrance > 0 && other.o.vibrance < o.o.vibrance / 2, `portrait gets a small share ${other.o.vibrance}`);
  assert.equal(addSample(t, 'a', 'landscape', {}, 4).a, undefined, 'an empty change removes the sample');
  let many = {}; for (let i = 0; i < TASTE_KEEP + 10; i++) many = addSample(many, 'p' + i, 'city', { contrast: 5 }, i);
  assert.equal(Object.keys(many).length, TASTE_KEEP); assert.ok(!many.p0 && many['p' + (TASTE_KEEP + 9)], 'oldest dropped');
  const sum = tasteSummary(t, SCENES); assert.equal(sum[0].scene, 'landscape'); assert.equal(sum[0].top[0][0], 'vibrance');
  const c = compose(auto, 0.5, { ...neutral(), vibrance: 7 }); assert.equal(c.vibrance, 17); assert.equal(c.exposure, 0.1);
});

/* ---------- JPEG, Exif, ICC ---------- */
const markers = b => { const out = []; let p = 2; while (p < b.length) { const m = b[p + 1]; out.push(m.toString(16)); if (m === 0xda) break; p += 2 + ((b[p + 2] << 8) | b[p + 3]); } return out; };
test('JPEG writer: standard tables, marker order, any size, rows in any chunks', () => {
  assert.equal(AC_L_V.length, AC_L_N.slice(1).reduce((a, b) => a + b, 0)); assert.equal(AC_C_V.length, AC_C_N.slice(1).reduce((a, b) => a + b, 0)); assert.equal(AC_L_V.length, 162);
  for (const [w, h] of [[1, 1], [17, 9], [64, 48], [333, 211]]) {
    const d = img(w, h, (u, v, x, y) => [u, v, noise(x, y)]), jw = new JpegWriter(w, h, 90, { icc: iccProfile('display-p3') });
    for (let y = 0; y < h; y += 7) { const r = Math.min(7, h - y); jw.addRows(new Uint8Array(d.buffer, y * w * 4, r * w * 4), r); }
    const b = jw.finish();
    assert.equal(b[0], 0xff); assert.equal(b[1], 0xd8); assert.equal(b[b.length - 2], 0xff); assert.equal(b[b.length - 1], 0xd9);
    assert.deepEqual(markers(b), ['e0', 'e2', 'db', 'c0', 'c4', 'da']);
    let sof = 2; while (b[sof + 1] !== 0xc0) sof += 2 + ((b[sof + 2] << 8) | b[sof + 3]);
    assert.equal((b[sof + 5] << 8) | b[sof + 6], h); assert.equal((b[sof + 7] << 8) | b[sof + 8], w);
  }
  const flat = new JpegWriter(32, 32, 92); flat.addRows(new Uint8Array(32 * 32 * 4).fill(128), 32);
  assert.ok(flat.finish().length < 1200, 'a flat grey square compresses to almost nothing');
});

function tiff({ orient = 6, gps = true } = {}) {
  /* little-endian TIFF: IFD0 { Orientation, ExifIFD, GPSIFD }, Exif { DateTimeOriginal }, GPS { LatRef, Lat }, IFD1 pointer */
  const b = new Uint8Array(400), dv = new DataView(b.buffer); b.set([0x49, 0x49, 42, 0]); dv.setUint32(4, 8, true);
  let p = 8; dv.setUint16(p, 3, true);
  const ent = (o, tag, type, cnt, val) => { dv.setUint16(o, tag, true); dv.setUint16(o + 2, type, true); dv.setUint32(o + 4, cnt, true); if (type === 3 && cnt === 1) dv.setUint16(o + 8, val, true); else dv.setUint32(o + 8, val, true); };
  ent(10, 0x0112, 3, 1, orient); ent(22, 0x8769, 4, 1, 100); ent(34, 0x8825, 4, 1, 200); dv.setUint32(46, 300, true);
  dv.setUint16(100, 1, true); ent(102, 0x9003, 2, 20, 150); dv.setUint32(114, 0, true); b.set(Array.from('2026:08:14 18:42:07\0', c => c.charCodeAt(0)), 150);
  dv.setUint16(200, gps ? 2 : 0, true); ent(202, 1, 2, 2, 0x4e); ent(214, 2, 5, 3, 250); dv.setUint32(226, 0, true); for (let i = 0; i < 24; i++) b[250 + i] = 7;
  return b;
}
test('Exif: rotation reset, old thumbnail dropped, place removed on request, date read', () => {
  const t = tiff(), dv = x => new DataView(x.buffer, x.byteOffset);
  const f = fixExif(t, { dropGps: false });
  assert.equal(dv(f).getUint16(18, true), 1, 'orientation 1'); assert.equal(dv(f).getUint32(46, true), 0, 'no IFD1');
  assert.equal(dv(f).getUint16(200, true), 2, 'place kept');
  const g = fixExif(t, { dropGps: true });
  assert.equal(dv(g).getUint16(200, true), 0, 'place removed'); assert.ok(g.slice(250, 274).every(x => x === 0), 'coordinates wiped');
  assert.equal(exifDate(t), '2026-08-14T18:42:07');
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, t.length + 8, 0x45, 0x78, 0x69, 0x66, 0, 0, ...t, 0xff, 0xda]);
  assert.deepEqual(Array.from(exifOf(jpeg).slice(0, 4)), [0x49, 0x49, 42, 0]);
  assert.equal(exifOf(new Uint8Array([0x89, 0x50])), null);
  const jw = new JpegWriter(8, 8, 90, { exif: f }); jw.addRows(new Uint8Array(256).fill(200), 8);
  assert.deepEqual(markers(jw.finish()), ['e1', 'db', 'c0', 'c4', 'da']);
});

test('ICC: sRGB colorants match the published D50 values; the P3 profile is well formed', () => {
  const c = colorants('srgb');
  const want = [[0.4361, 0.3851, 0.1431], [0.2225, 0.7169, 0.0606], [0.0139, 0.0971, 0.7141]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) near(c[i][j], want[i][j], 3e-4, `[${i}][${j}]`);
  const p = colorants('display-p3'); near(p[1][0] + p[1][1] + p[1][2], 1, 1e-6, 'Y of white is 1');
  const b = iccProfile('display-p3'), dv = new DataView(b.buffer);
  assert.equal(dv.getUint32(0), b.length); assert.equal(String.fromCharCode(...b.slice(36, 40)), 'acsp'); assert.equal(dv.getUint32(128), 9);
  assert.equal(String.fromCharCode(...b.slice(12, 24)), 'mntrRGB XYZ ');
});
