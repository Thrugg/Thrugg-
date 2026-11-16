/* Révélateur — scene types: what each one wants from the auto-adjust, and how a photo is sorted into one.
   Three sources of evidence, all on the device:
   - faces (MediaPipe face detector): a big face is a portrait or selfie, several faces are people;
   - the 1000 ImageNet labels of a small image classifier (EfficientNet-Lite0), grouped below into scene types;
   - the measurements from engine.analyze() (sky at the top, greenery, a warm low sun, darkness, snow).
   Without the models (offline, or switched off) the measurements alone decide. */

/* key: target brightness of the middle tones (encoded 0..1). spread: target distance between the 5th and 95th
   percentile. sat: the colourfulness the photo should have (mean chroma). wb: how much of a colour cast to remove.
   vib: largest vibrance change. hi/sh: how readily highlights are pulled down and shadows lifted. blacks/whites:
   where the ends of the histogram go. hsl: colour mix moves, applied only when those colours are in the photo. */
const base = { key: 0.46, spread: 0.74, sat: 0.22, satAdj: 0, wb: 0.6, vib: 25, clarity: 5, dehaze: 0, vignette: 0, hi: 0.8, sh: 0.6, blacks: 0.02, whites: 0.97, hsl: {} };
export const PROFILES = {
  general:   { ...base, name: 'Photo' },
  portrait:  { ...base, name: 'Portrait', key: 0.46, spread: 0.68, sat: 0.2, wb: 0.7, vib: 15, clarity: -6, vignette: -10, hi: 0.6, sh: 0.7, hsl: { lum_orange: 6, sat_orange: -6 } },
  people:    { ...base, name: 'People', key: 0.48, spread: 0.72, sat: 0.21, wb: 0.65, vib: 18, clarity: 0, vignette: -5, sh: 0.7, hsl: { lum_orange: 4, sat_orange: -4 } },
  landscape: { ...base, name: 'Landscape', key: 0.45, spread: 0.78, sat: 0.26, wb: 0.5, vib: 35, clarity: 15, dehaze: 12, vignette: -5, hi: 1, sh: 0.6, hsl: { sat_blue: 10, lum_blue: -10, hue_green: -6, sat_green: 6, lum_green: 4 } },
  sea:       { ...base, name: 'Water', key: 0.48, spread: 0.74, sat: 0.26, wb: 0.5, vib: 30, clarity: 10, dehaze: 10, vignette: -4, hi: 1, hsl: { sat_aqua: 10, sat_blue: 8, lum_blue: -6 } },
  nature:    { ...base, name: 'Nature', key: 0.45, spread: 0.74, sat: 0.26, wb: 0.5, vib: 30, clarity: 12, vignette: -6, hsl: { sat_green: 8, lum_green: 4, sat_yellow: 6 } },
  sunset:    { ...base, name: 'Sunset', key: 0.4, spread: 0.8, sat: 0.3, wb: 0.12, vib: 30, clarity: 8, dehaze: 8, vignette: -8, hi: 1, sh: 0.3, hsl: { sat_orange: 10, sat_red: 6, sat_purple: 6 } },
  city:      { ...base, name: 'City', key: 0.45, spread: 0.78, sat: 0.2, wb: 0.6, vib: 18, clarity: 18, dehaze: 6, vignette: -6 },
  night:     { ...base, name: 'Night', key: 0.26, spread: 0.82, sat: 0.22, wb: 0.3, vib: 15, clarity: 8, hi: 1, sh: 0.2, blacks: 0.01, whites: 0.99, hsl: { sat_blue: -8 } },
  indoor:    { ...base, name: 'Indoor', key: 0.48, spread: 0.7, sat: 0.2, wb: 0.8, vib: 15, clarity: 4, sh: 0.7 },
  food:      { ...base, name: 'Food', key: 0.52, spread: 0.74, sat: 0.28, wb: 0.7, vib: 25, clarity: 12, vignette: -10, hsl: { sat_orange: 8, sat_yellow: 6, sat_red: 5 } },
  pet:       { ...base, name: 'Pet', key: 0.48, spread: 0.74, sat: 0.22, wb: 0.65, vib: 18, clarity: 10, vignette: -6 },
  snow:      { ...base, name: 'Snow', key: 0.74, spread: 0.7, sat: 0.16, wb: 0.9, vib: 15, clarity: 8, hi: 0.8, sh: 0.5, whites: 0.98, hsl: { sat_blue: -12, lum_blue: 6 } }
};
export const SCENES = Object.keys(PROFILES);
export const sceneName = s => (PROFILES[s] || PROFILES.general).name;

/* ImageNet label index → [scene, weight]. Indices follow the classifier's label file (0 = tench). */
const R = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const LABELS = {};
const put = (scene, ids, w = 1) => { for (const i of ids) (LABELS[i] = LABELS[i] || []).push([scene, w]); };
put('pet', R(151, 268)); put('pet', R(281, 285));                        // dogs, domestic cats
put('nature', R(7, 146), 0.8); put('nature', R(269, 280), 0.7); put('nature', R(286, 388), 0.7);   // birds, reptiles, wild animals, insects
put('sea', [0, 1, 2, 3, 4, 5, 6, 33, 34, 147, 148, 149, 150, 389, 390, 391, 392, 393, 394, 395, 396, 397], 0.8);   // fish, sea turtles and sea animals
put('food', R(924, 957)); put('food', R(959, 969)); put('food', [923, 415, 926, 809], 0.9);
put('food', [659, 567, 909, 504, 550, 441, 572, 907, 868, 922, 469], 0.5);
put('food', [762, 532], 0.5); put('indoor', [762, 532], 0.5);
put('landscape', [970, 972, 976, 979, 980, 974, 672, 958]); put('landscape', [525, 912, 716, 825], 0.5);
put('snow', [970], 0.4); put('snow', [795, 802, 803, 537, 450]); put('snow', [796, 658], 0.5);
put('sea', [973, 975, 977, 978, 460, 449, 472, 484, 536, 625, 628, 693, 718, 780, 814, 871, 913, 914, 554, 510, 576, 983, 801, 437]);
put('sea', [445, 638, 639, 842], 0.5);
put('nature', [984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 996, 997]); put('nature', [738, 883, 580, 646, 448, 410], 0.5);
put('city', [497, 538, 663, 668, 698, 832, 873, 682, 727, 442, 821, 839, 888, 829, 874, 468, 920, 919]);
put('city', [483, 704, 734, 654, 779, 466, 858, 640, 707, 562], 0.7);
put('city', [498, 705, 547, 627, 817, 511, 900, 637, 703, 424, 454, 467, 509, 582, 788, 860, 865, 743, 884], 0.45);
put('indoor', [831, 598, 548, 894, 453, 526, 564, 750, 905, 619, 846, 624, 851, 664, 782, 620, 527, 760, 651, 534, 897, 827, 495, 648, 794, 435, 876, 861, 765, 559, 423, 857, 516, 520, 892, 579, 881, 721, 896, 736, 799]);
put('indoor', [470, 789, 904, 406, 819], 0.5);
export const labelScenes = i => LABELS[i] || [];

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* Evidence from the measurements alone. */
export function sceneHints(st) {
  const h = {};
  h.night = smooth(0.3, 0.12, st.p50) * (st.p99 > 0.6 ? 1 : 0.6);
  h.sunset = smooth(0.04, 0.2, st.warmTop ?? st.warm) * smooth(0.1, 0.4, st.castRB) * (st.topMean >= st.botMean - 0.05 ? 1 : 0.5) * (1 - h.night * 0.5);
  h.snow = smooth(0.2, 0.45, st.brightNeutral) * smooth(0.45, 0.6, st.p50) * (1 - smooth(0.05, 0.15, st.green)) * (1 - smooth(0.05, 0.2, st.skin));
  h.landscape = smooth(0.15, 0.4, st.sky) * (0.5 + 0.5 * smooth(0.02, 0.15, st.green)) * (st.topMean > st.botMean ? 1 : 0.6);
  h.sea = smooth(0.15, 0.4, st.blue) * smooth(0.05, 0.25, st.sky) * 0.8;
  h.nature = smooth(0.15, 0.4, st.green) * (1 - h.landscape * 0.5);
  h.indoor = (1 - smooth(0.02, 0.1, st.sky)) * smooth(0.1, 0.35, st.castRB) * (1 - smooth(0.4, 0.6, st.p50)) * 0.6;
  return h;
}

/* faces: [{x,y,w,h}] (0..1), labels: [{i, p}] top classifier results, st: measurements.
   Returns { scene, conf, scores, why }. */
export function classify({ faces = [], labels = [], st }) {
  const sc = Object.fromEntries(SCENES.map(s => [s, 0]));
  const why = [];
  sc.general = 0.15;
  /* the face detector also finds dog and cat faces: when the classifier sees a pet, faces count much less */
  const petMass = labels.slice(0, 5).filter(l => labelScenes(l.i).some(([s]) => s === 'pet')).reduce((a, l) => a + l.p, 0);
  const fw = petMass > 0.2 ? 0.25 : 1;
  const big = faces.reduce((m, f) => Math.max(m, f.w * f.h), 0);
  const sizable = faces.filter(f => f.w * f.h > 0.004).length;
  if (big >= 0.03 && sizable <= 2) { sc.portrait += 1.2 * fw; if (fw === 1) why.push(sizable === 2 ? 'Two faces close up' : 'A face fills a good part of the frame'); }
  else if (sizable >= 3 || (sizable === 2 && big > 0.008)) { sc.people += 1.0 * fw; if (fw === 1) why.push(`${sizable} faces`); }
  else if (sizable >= 1) { sc.people += 0.4 * fw; if (fw === 1) why.push('Someone in the picture'); }
  let top = null;
  for (const { i, p } of labels.slice(0, 5)) for (const [s, w] of labelScenes(i)) { sc[s] += p * w * 2; if (!top || p * w > top.v) top = { s, v: p * w }; }
  if (top && top.v > 0.15) why.push(`Looks like ${PROFILES[top.s].name.toLowerCase()} to the image model`);
  if (st) {
    const h = sceneHints(st);
    for (const [s, v] of Object.entries(h)) sc[s] += v * 0.6;
    if (h.night > 0.6 && !sizable) { sc.night += 0.5; why.push('Dark scene with points of light'); }
    if (h.sunset > 0.5) { sc.sunset += 0.4; why.push('Warm, low sun'); }
    if (h.snow > 0.5) { sc.snow += 0.4; why.push('Large bright, white areas'); }
    if (h.landscape > 0.5 && !top) why.push('Sky across the top');
  }
  const ranked = Object.entries(sc).sort((a, b) => b[1] - a[1]);
  const sum = ranked.reduce((a, [, v]) => a + v, 0) || 1;
  return { scene: ranked[0][0], conf: +(ranked[0][1] / sum).toFixed(2), scores: Object.fromEntries(ranked.map(([s, v]) => [s, +v.toFixed(3)])), why };
}
