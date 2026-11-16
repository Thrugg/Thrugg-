/* Sillage — matching on accords. Pure functions, no screen.
   Each note feeds one or more accords (citrus, aromatic, woody…); a fragrance's accord map is the sum of its notes,
   base notes counting most (they last), plus a push from its family. Similarity combines the accord maps with the
   notes two fragrances share, so every match comes with its reasons. The scent profile is the accord map of the
   wardrobe, each bottle weighted by its grade and by how often it is worn. */
import { FAMILIES, FIT, SEASONS, OCCASIONS, parseNotes, allNotes, wearIndex } from './engine.js';
import { LIBRARY } from './library.js';

export const ACCORDS = ['citrus', 'aromatic', 'green', 'aquatic', 'floral', 'fruity', 'spicy', 'woody', 'amber', 'leather', 'gourmand', 'musky', 'powdery', 'smoky'];
/* note keyword → accords (first match wins for each rule; a note may hit several rules) */
const RULES = [
  [/bergamot|lemon|lime|grapefruit|orange|mandarin|tangerine|yuzu|citron|clementine|petitgrain|verbena|neroli/, ['citrus']],
  [/neroli|orange blossom|jasmine|rose|iris|orris|violet(?! leaf)|lily|magnolia|tuberose|ylang|peony|freesia|geranium|pelargonium|narcissus|heliotrope|lilac|honeysuckle|carnation|orchid|cyclamen|marigold|lotus|water lily|olive blossom|osmanthus|mimosa|sweet pea/, ['floral']],
  [/lavender|rosemary|sage|basil|thyme|mint|artemisia|juniper|myrtle|bay leaf|oregano|clary|coriander|elemi|lemon verbena|santolina|caraway|angelica/, ['aromatic']],
  [/violet leaf|galbanum|fig leaf|green|tea|bulrush|cucumber|grass|hay|pineapple leaf|cypress|pine|fir/, ['green']],
  [/sea|marine|water|aqua|salt|seaweed|posidonia|mineral|aldehyde/, ['aquatic']],
  [/apple|pear|plum|blackcurrant|cassis|pineapple|peach|litchi|lychee|raspberry|cherry|mango|melon|rhubarb|papaya|dates|dried fruit|fruity|fig(?! leaf)|coconut|sapodilla|green mango/, ['fruity']],
  [/pepper|cardamom|cinnamon|nutmeg|clove|saffron|ginger|cumin|star anise|anise|paprika|spice|caraway|licorice/, ['spicy']],
  [/cedar|sandalwood|vetiver|patchouli|guaiac|oud|agarwood|rosewood|cashmere wood|cashmeran|woods|wood|birch|cypress|papyrus|oak|sycamore|flint|amberwood|moss|oakmoss/, ['woody']],
  [/amber|labdanum|benzoin|opoponax|myrrh|balsam|styrax|resin|ambergris|ambroxan|olibanum|incense|frankincense/, ['amber']],
  [/leather|suede|birch|tobacco|tar/, ['leather']],
  [/vanilla|tonka|coumarin|caramel|praline|honey|cacao|chocolate|coffee|almond|chestnut|kulfi|sugar|rum|cognac|pistachio|licorice|cherry liqueur/, ['gourmand']],
  [/musk|ambrette|white musk|cashmeran|ambroxan/, ['musky']],
  [/iris|orris|violet(?! leaf)|heliotrope|powder|aldehyde|rice|mimosa/, ['powdery']],
  [/incense|olibanum|frankincense|smok|tobacco|birch|tar|oud|cade|guaiac|myrrh/, ['smoky']],
];
const FAMILY_ACCORD = { citrus: 'citrus', aromatic: 'aromatic', green: 'green', aquatic: 'aquatic', floral: 'floral', fruity: 'fruity', fougere: 'aromatic', woody: 'woody', spicy: 'spicy', amber: 'amber', leather: 'leather', gourmand: 'gourmand', chypre: 'woody', musk: 'musky' };
const TIER_W = { top: 0.6, heart: 1, base: 1.3 };
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
export const accordsOfNote = n => { const s = norm(n), out = new Set(); for (const [re, a] of RULES) if (re.test(s)) a.forEach(x => out.add(x)); return [...out]; };

const tiersOf = f => ({ top: parseNotes(f.notes && f.notes.top), heart: parseNotes(f.notes && f.notes.heart), base: parseNotes(f.notes && f.notes.base) });
/* The accord map of one fragrance, scaled so the strongest accord is 1. */
export function accordMap(f) {
  const m = Object.fromEntries(ACCORDS.map(a => [a, 0])), t = tiersOf(f);
  for (const k of ['top', 'heart', 'base']) for (const n of t[k]) { const acc = accordsOfNote(n); for (const a of acc) m[a] += TIER_W[k] / acc.length; }
  if (FAMILY_ACCORD[f.family]) m[FAMILY_ACCORD[f.family]] += 1.6;
  const mx = Math.max(...Object.values(m));
  if (mx > 0) for (const a of ACCORDS) m[a] = +(m[a] / mx).toFixed(3);
  return m;
}
const cosine = (a, b) => { let d = 0, x = 0, y = 0; for (const k of ACCORDS) { d += a[k] * b[k]; x += a[k] * a[k]; y += b[k] * b[k]; } return x && y ? d / Math.sqrt(x * y) : 0; };
/* Notes with their weight by tier, for the shared-notes reasons. */
/* rare notes say more than common ones: each note is weighted by how few library fragrances use it */
const DF = new Map(); for (const x of LIBRARY) for (const n of new Set(['top', 'heart', 'base'].flatMap(k => x.notes[k]).map(v => norm(v)))) DF.set(n, (DF.get(n) || 0) + 1);
const idf = n => Math.max(0.25, Math.log((LIBRARY.length + 1) / ((DF.get(n) || 0) + 1)) / Math.log(LIBRARY.length + 1));
function noteWeights(f) { const t = tiersOf(f), w = new Map(); for (const k of ['top', 'heart', 'base']) for (const n of t[k]) { const s = norm(n); w.set(s, Math.max(w.get(s) || 0, TIER_W[k] * idf(s))); } return w; }
export const sameName = (a, b) => norm(a.house + ' ' + a.name) === norm(b.house + ' ' + b.name);

/* A bottle typed with few notes borrows the library's pyramid when the name matches. */
export function enrich(b) {
  if (allNotes(b).length >= 3) return b;
  const hit = LIBRARY.find(x => sameName(x, b)) || LIBRARY.find(x => norm(x.name) === norm(b.name) && norm(b.name).length > 3);
  return hit ? { ...b, notes: hit.notes, family: b.family || hit.family, price: b.price, libPrice: hit.price } : b;
}

const LIGHT = ['citrus', 'aromatic', 'green', 'aquatic'], WARM = ['amber', 'gourmand', 'spicy', 'leather'];
const sum = (m, ks) => ks.reduce((s, k) => s + m[k], 0);
/* similarity 0..1 and the reasons */
export function compare(a, b) {
  const ma = accordMap(a), mb = accordMap(b), wa = noteWeights(a), wb = noteWeights(b);
  let inter = 0, uni = 0; const shared = [];
  for (const [n, w] of wa) { const v = wb.get(n); if (v) { inter += Math.min(w, v); shared.push([n, Math.min(w, v)]); } uni += w; }
  for (const [n, w] of wb) if (!wa.has(n)) uni += w;
  const notes = uni ? inter / uni : 0, acc = cosine(ma, mb), fam = a.family && a.family === b.family ? 0.06 : 0;
  const score = Math.min(1, 0.68 * acc + 0.32 * Math.min(1, notes * 2.2) + fam);
  const dLight = sum(mb, LIGHT) - sum(ma, LIGHT), dWarm = sum(mb, WARM) - sum(ma, WARM);
  const shade = dLight > 0.5 && dLight > dWarm ? 'fresher' : dWarm > 0.5 && dWarm > dLight ? 'warmer' : mb.gourmand - ma.gourmand > 0.4 ? 'sweeter' : null;
  const extra = [...noteWeights(b)].filter(([n]) => !wa.has(n)).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([n]) => n);
  return { score: +score.toFixed(3), shared: shared.sort((x, y) => y[1] - x[1]).slice(0, 3).map(([n]) => n), shade, extra, sameFamily: !!fam };
}
const key = f => norm(f.house + ' ' + f.name);
/* SI-1: the closest library fragrances to one bottle, leaving out owned and listed ones */
export function similarTo(bottle, { owned = [], exclude = [], n = 5 } = {}) {
  const src = enrich(bottle), skip = new Set([...owned, ...exclude].map(key));
  if (!allNotes(src).length && !src.family) return [];
  return LIBRARY.filter(x => !sameName(x, src) && !skip.has(key(x))).map(x => ({ f: x, ...compare(src, x) }))
    .sort((p, q) => q.score - p.score).slice(0, n);
}

/* SI-2: the scent profile. Weight of a bottle = grade (ungraded counts 5) × (1 + its share of all wears × 3). */
export function profile(bottles, wears) {
  const ix = wearIndex(wears), total = (wears || []).length || 0;
  const items = bottles.map(b => {
    const e = enrich(b), g = Number(b.grade) > 0 ? Number(b.grade) : 5, n = (ix[b.id] || { n: 0 }).n, share = total ? n / total : 0;
    return { b, e, g, n, share, w: (g / 10) * (1 + share * 3), m: accordMap(e) };
  }).filter(x => allNotes(x.e).length || x.e.family);
  const acc = Object.fromEntries(ACCORDS.map(a => [a, 0]));
  let W = 0;
  for (const x of items) { for (const a of ACCORDS) acc[a] += x.m[a] * x.w; W += x.w; }
  if (W) { const mx = Math.max(...Object.values(acc)); for (const a of ACCORDS) acc[a] = +(acc[a] / mx).toFixed(3); }
  const top = ACCORDS.filter(a => acc[a] > 0).sort((p, q) => acc[q] - acc[p]);
  /* seasons covered: a bottle covers a season when tagged with it, or when its family carries well in that weather */
  const seasonBand = { summer: 0, spring: 1, autumn: 2, winter: 3 };
  const covers = s => items.filter(x => (x.b.seasons && x.b.seasons.includes(s)) || (!(x.b.seasons && x.b.seasons.length) && (FIT[x.e.family] || [])[seasonBand[s]] >= 0.8));
  const seasons = Object.fromEntries(SEASONS.map(s => [s, covers(s).length]));
  const occasions = Object.fromEntries(OCCASIONS.map(o => [o, items.filter(x => x.b.occ && x.b.occ.includes(o)).length]));
  const tagged = items.some(x => x.b.occ && x.b.occ.length);
  const families = new Set(items.map(x => x.e.family).filter(Boolean));
  const tried = new Set(items.flatMap(x => allNotes(x.e).map(norm)));
  const NOTABLE = ['iris', 'vetiver', 'oud', 'leather', 'tobacco', 'incense', 'vanilla', 'fig', 'neroli', 'sandalwood', 'saffron', 'tea', 'rose', 'lavender', 'tonka'];
  const untried = NOTABLE.filter(n => ![...tried].some(t => t.includes(n)));
  const gaps = [];
  for (const s of SEASONS) if (items.length >= 2 && !seasons[s]) gaps.push({ k: 'season', v: s });
  if (tagged && items.length >= 2) for (const o of ['office', 'evening', 'casual']) if (!occasions[o]) gaps.push({ k: 'occ', v: o });
  for (const f of ['citrus', 'woody', 'amber', 'aromatic', 'leather', 'floral']) if (items.length >= 3 && !families.has(f) && acc[FAMILY_ACCORD[f]] < 0.25) gaps.push({ k: 'family', v: f });
  /* favourites by behaviour: worn clearly more than the grade suggests */
  const meanG = items.length ? items.reduce((s, x) => s + x.g, 0) / items.length : 0;
  const favs = total >= 8 ? items.filter(x => x.share >= 0.2 && x.g <= meanG).map(x => x.b) : [];
  const sweet = acc.gourmand + acc.amber * 0.5 + acc.fruity * 0.5, fresh = sum(acc, LIGHT) / 2;
  const concs = items.map(x => x.b.conc).filter(Boolean), strong = concs.filter(c => /EDP|Parfum|Extrait/.test(c)).length;
  return {
    n: items.length, accords: acc, top: top.slice(0, 4), seasons, occasions, tagged, gaps: gaps.slice(0, 6), untried: untried.slice(0, 5), favourites: favs,
    sweetness: sweet > 1 ? 'sweet' : sweet > 0.55 ? 'balanced' : 'dry', freshness: fresh > 0.6 ? 'fresh' : fresh > 0.3 ? 'mixed' : 'warm',
    strength: concs.length ? (strong / concs.length > 0.6 ? 'strong' : strong / concs.length > 0.3 ? 'mixed' : 'light') : null,
    mostOcc: tagged ? OCCASIONS.slice().sort((p, q) => occasions[q] - occasions[p])[0] : null
  };
}

/* SI-3: next picks in three lanes from the library. */
export function nextPicks(bottles, wears, { exclude = [] } = {}) {
  const pr = profile(bottles, wears);
  if (!pr.n) return { pr, safe: [], gap: [], wild: [] };
  const target = { family: '', notes: { top: [], heart: [], base: [] } };
  const skip = new Set([...bottles, ...exclude].map(key));
  const pool = LIBRARY.filter(x => !skip.has(key(x))).map(x => {
    const m = accordMap(x), sim = cosine(m, pr.accords);
    const best = bottles.map(b => ({ b, c: compare(enrich(b), x) })).sort((p, q) => q.c.score - p.c.score)[0];
    return { f: x, m, sim: +sim.toFixed(3), near: best ? best.b : null, c: best ? best.c : null };
  });
  const used = new Set();
  const take = (arr, n) => { const out = []; for (const x of arr) { if (out.length >= n) break; if (used.has(key(x.f))) continue; used.add(key(x.f)); out.push(x); } return out; };
  const safe = take([...pool].sort((p, q) => (q.sim + (q.c ? q.c.score : 0)) - (p.sim + (p.c ? p.c.score : 0))), 2).map(x => ({ ...x, lane: 'safe' }));
  /* a gap pick covers a missing season or family, and still resembles the profile */
  const seasonBand = { summer: 0, spring: 1, autumn: 2, winter: 3 };
  const fills = x => pr.gaps.some(g => (g.k === 'season' && (FIT[x.f.family] || [])[seasonBand[g.v]] >= 0.8) || (g.k === 'family' && x.f.family === g.v));
  const gap = take(pool.filter(fills).sort((p, q) => q.sim - p.sim), 2).map(x => ({ ...x, lane: 'gap', fills: pr.gaps.find(g => (g.k === 'season' && (FIT[x.f.family] || [])[seasonBand[g.v]] >= 0.8) || (g.k === 'family' && x.f.family === g.v)) }));
  /* a wildcard is related but not close, and brings a note never tried */
  const untried = x => allNotes(x.f).map(norm).find(n => pr.untried.some(u => n.includes(u)));
  const wild = take(pool.filter(x => x.sim > 0.45 && x.sim < 0.82 && untried(x)).sort((p, q) => q.sim - p.sim), 2).map(x => ({ ...x, lane: 'wild', newNote: untried(x) }));
  return { pr, safe, gap, wild };
}

/* SI-4: wears by month, with the most-worn bottle of each month */
export function wearYear(bottles, wears, year) {
  const months = Array.from({ length: 12 }, (_, i) => ({ m: i, n: 0, top: null, by: {} }));
  for (const w of wears || []) {
    if (!w.d || +w.d.slice(0, 4) !== year) continue;
    const mo = months[+w.d.slice(5, 7) - 1]; mo.n++; mo.by[w.b] = (mo.by[w.b] || 0) + 1;
  }
  for (const mo of months) { const best = Object.entries(mo.by).sort((p, q) => q[1] - p[1])[0]; mo.top = best ? { b: bottles.find(x => x.id === best[0]) || null, n: best[1] } : null; delete mo.by; }
  const seasons = { spring: 0, summer: 0, autumn: 0, winter: 0 };
  months.forEach(mo => { const s = mo.m >= 2 && mo.m <= 4 ? 'spring' : mo.m >= 5 && mo.m <= 7 ? 'summer' : mo.m >= 8 && mo.m <= 10 ? 'autumn' : 'winter'; seasons[s] += mo.n; });
  return { months, seasons, total: months.reduce((s, x) => s + x.n, 0) };
}
export { FAMILIES };
