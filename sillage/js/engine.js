/* Sillage — the engine. Pure functions, no screen, no storage.
   A wardrobe is a list of bottles with the person's own grade; a wear log says which one was worn each day.
   From those two the engine works out cost per wear, what is left in each bottle, what the person's taste looks
   like, and which bottle suits today. */
const num = (v, d = 0) => { const n = Number(v); return isFinite(n) ? n : d; };

export const FAMILIES = ['citrus', 'aromatic', 'green', 'aquatic', 'floral', 'fruity', 'fougere', 'woody', 'spicy', 'amber', 'leather', 'gourmand', 'chypre', 'musk'];
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const OCCASIONS = ['office', 'casual', 'evening', 'date', 'sport'];
export const CONCS = ['Cologne', 'EDT', 'EDP', 'Parfum', 'Extrait'];
export const SHAPES = ['tall', 'square', 'flask', 'round'];
export const BANDS = ['hot', 'mild', 'cool', 'cold'];
export const ML_PER_SPRAY = 0.1;
/* how well each family carries in each kind of weather, 0…1: fresh and light when it is hot, dense and warm when
   it is cold. A convention of perfumery, not a law. */
export const FIT = {
  citrus: [1, .7, .35, .15], aquatic: [1, .7, .25, .05], green: [.8, .9, .45, .2], aromatic: [.7, .9, .6, .4], fougere: [.6, .9, .7, .5],
  floral: [.6, .9, .6, .4], fruity: [.7, .8, .5, .3], musk: [.6, .8, .7, .6], chypre: [.4, .8, .8, .6], woody: [.4, .8, .9, .8],
  spicy: [.2, .6, .9, 1], leather: [.2, .5, .9, .9], amber: [.1, .4, .9, 1], gourmand: [.1, .4, .8, 1]
};
export const JUICE = { citrus: '#e9d36a', aromatic: '#b9c779', green: '#8fbf7a', aquatic: '#7fc4d6', floral: '#e6a9c0', fruity: '#e58f6a', fougere: '#9fba8a', woody: '#b98443', spicy: '#c7632f', amber: '#d99a2b', leather: '#8a5a36', gourmand: '#a8642c', chypre: '#a79a4a', musk: '#d9cdb8' };

export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const daysBetween = (a, b) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 864e5);
export const addDays = (d, n) => { const x = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10) + n)); return x.toISOString().slice(0, 10); };

/* weather */
export const bandOf = tmax => { const t = num(tmax, NaN); return !isFinite(t) ? null : t >= 24 ? 'hot' : t >= 15 ? 'mild' : t >= 7 ? 'cool' : 'cold'; };
export function seasonOf(date, lat = 48) { const m = +date.slice(5, 7), i = m >= 3 && m <= 5 ? 0 : m >= 6 && m <= 8 ? 1 : m >= 9 && m <= 11 ? 2 : 3; return SEASONS[lat < 0 ? (i + 2) % 4 : i]; }

/* notes typed as "bergamot, pepper; lavender" → clean list */
export const parseNotes = s => Array.isArray(s) ? s.map(x => String(x).trim()).filter(Boolean) : String(s || '').split(/[,;·\n]/).map(x => x.trim()).filter(Boolean).slice(0, 12);
export const allNotes = b => ['top', 'heart', 'base'].flatMap(k => parseNotes(b.notes && b.notes[k]));

/* the wear log, per bottle */
export function wearIndex(wears) {
  const ix = {};
  for (const w of wears || []) { const e = ix[w.b] || (ix[w.b] = { n: 0, last: null, first: null }); e.n++; if (!e.last || w.d > e.last) e.last = w.d; if (!e.first || w.d < e.first) e.first = w.d; }
  return ix;
}
export function bottleStats(b, ix, sprays = 6) {
  const e = ix[b.id] || { n: 0, last: null }, size = Math.max(0, num(b.size)), used = e.n * Math.max(1, num(sprays, 6)) * ML_PER_SPRAY;
  const left = Math.max(0, size - used), per = Math.max(1, num(sprays, 6)) * ML_PER_SPRAY;
  return { wears: e.n, last: e.last, costPerWear: e.n > 0 && num(b.price) > 0 ? num(b.price) / e.n : null, mlLeft: size > 0 ? left : null, level: size > 0 ? left / size : 1, wearsLeft: size > 0 ? Math.floor(left / per) : null };
}
export function wardrobeStats(bottles, wears, today, sprays = 6) {
  const ix = wearIndex(wears), value = bottles.reduce((a, b) => a + Math.max(0, num(b.price)), 0), total = (wears || []).filter(w => bottles.some(b => b.id === w.b)).length;
  const recent = (wears || []).filter(w => daysBetween(w.d, today) <= 30 && daysBetween(w.d, today) >= 0).length;
  const worn = bottles.map(b => ({ b, n: (ix[b.id] || { n: 0 }).n })).sort((x, y) => y.n - x.n);
  return { bottles: bottles.length, value, wears: total, recent, perWear: total > 0 && value > 0 ? value / total : null, most: worn.length && worn[0].n > 0 ? worn[0] : null, least: worn.length > 1 ? worn[worn.length - 1] : null };
}

/* What to wear today. c: { band, season, occ, today }. Returns the bottles ranked, each with its score out of 100
   and the reasons that carried it. A bottle already worn today goes to the bottom. */
export function suggest(bottles, wears, c, sprays = 6) {
  const ix = wearIndex(wears), bi = Math.max(0, BANDS.indexOf(c.band));
  return bottles.map(b => {
    const st = bottleStats(b, ix, sprays), g = num(b.grade), reasons = [];
    let s = (g > 0 ? g : 5) * 4;                                           // the person's own grade: up to 40
    if (g >= 8) reasons.push('grade');
    const fit = c.band ? (FIT[b.family] || [.6, .6, .6, .6])[bi] : .6; s += fit * 25;   // weather: up to 25
    if (c.band && fit >= .8) reasons.push('weather');
    const hasS = b.seasons && b.seasons.length; s += hasS ? (b.seasons.includes(c.season) ? 15 : 0) : 7;
    if (hasS && b.seasons.includes(c.season)) reasons.push('season');
    if (c.occ) { const hasO = b.occ && b.occ.length; s += hasO ? (b.occ.includes(c.occ) ? 15 : 0) : 5; if (hasO && b.occ.includes(c.occ)) reasons.push('occ'); }
    const days = st.last ? daysBetween(st.last, c.today) : 30; s += Math.min(Math.max(days, 0), 14) / 14 * 10;   // rotation: up to 10
    if (!st.last) reasons.push('never'); else if (days >= 14) reasons.push('rest');
    const wornToday = days === 0;
    if (wornToday) { s = 0; reasons.length = 0; reasons.push('today'); } else if (days === 1) { s -= 8; reasons.push('yesterday'); }
    if (!wornToday && st.mlLeft !== null && st.mlLeft <= 0) { s -= 40; reasons.push('empty'); }
    return { b, score: Math.max(0, Math.min(100, s)), reasons, days, st, wornToday };
  }).sort((x, y) => (x.wornToday - y.wornToday) || y.score - x.score || String(x.b.name).localeCompare(String(y.b.name)));
}

/* The person's taste, read from their grades: the notes and families of the bottles they rate highest. */
export function taste(bottles) {
  const graded = bottles.filter(b => num(b.grade) > 0), notes = {}, fams = {};
  for (const b of graded) {
    for (const n of new Set(allNotes(b).map(x => x.toLowerCase()))) (notes[n] = notes[n] || []).push(num(b.grade));
    if (b.family) (fams[b.family] = fams[b.family] || []).push(num(b.grade));
  }
  const rank = o => Object.entries(o).map(([k, v]) => ({ k, mean: v.reduce((a, x) => a + x, 0) / v.length, n: v.length })).sort((a, b) => b.mean - a.mean || b.n - a.n || a.k.localeCompare(b.k));
  const mean = graded.length ? graded.reduce((a, b) => a + num(b.grade), 0) / graded.length : null;
  const N = rank(notes), F = rank(fams);
  return { mean, graded: graded.length, notes: N, families: F, liked: N.filter(x => mean !== null && x.mean >= mean).slice(0, 8), avoided: mean !== null ? N.filter(x => x.mean < mean - 1).slice(-4).reverse() : [] };
}

/* What goes to Claude: the graded wardrobe, the taste read from it, and everything already tried or listed. */
export function exportData(S, today) {
  const ix = wearIndex(S.wears), tt = taste(S.bottles);
  return {
    wardrobe: S.bottles.map(b => ({ house: b.house, name: b.name, concentration: b.conc || undefined, family: b.family || undefined, notes: { top: parseNotes(b.notes && b.notes.top), heart: parseNotes(b.notes && b.notes.heart), base: parseNotes(b.notes && b.notes.base) }, my_grade_out_of_10: num(b.grade) || undefined, wears: (ix[b.id] || { n: 0 }).n, seasons: b.seasons && b.seasons.length ? b.seasons : undefined, occasions: b.occ && b.occ.length ? b.occ : undefined })),
    taste: { liked_notes: tt.liked.map(x => x.k), liked_families: tt.families.slice(0, 3).map(x => x.k), less_liked_notes: tt.avoided.map(x => x.k) },
    already_on_my_list: (S.queue || []).filter(q => q.verdict !== 'drop').map(q => `${q.house} ${q.name}`.trim()),
    tried_and_dropped: (S.queue || []).filter(q => q.verdict === 'drop').map(q => `${q.house} ${q.name}`.trim()),
    as_of: today
  };
}
/* Claude's answer pasted back: the first JSON list found in the text, turned into queue items. */
export function parseSuggestions(text) {
  const s = String(text || ''), a = s.indexOf('['), b = s.lastIndexOf(']');
  if (a < 0 || b <= a) throw new Error('no list');
  const arr = JSON.parse(s.slice(a, b + 1)); if (!Array.isArray(arr)) throw new Error('no list');
  return arr.filter(x => x && typeof x === 'object' && String(x.name || '').trim()).slice(0, 12).map(x => ({
    house: String(x.house || x.brand || '').trim().slice(0, 60), name: String(x.name).trim().slice(0, 80), why: String(x.why || x.reason || '').trim().slice(0, 400),
    family: FAMILIES.includes(String(x.family || '').toLowerCase()) ? String(x.family).toLowerCase() : '',
    notes: x.notes && typeof x.notes === 'object' ? { top: parseNotes(x.notes.top), heart: parseNotes(x.notes.heart), base: parseNotes(x.notes.base) } : null
  }));
}
export const sameScent = (a, b) => `${a.house} ${a.name}`.toLowerCase().replace(/\s+/g, ' ').trim() === `${b.house} ${b.name}`.toLowerCase().replace(/\s+/g, ' ').trim();
