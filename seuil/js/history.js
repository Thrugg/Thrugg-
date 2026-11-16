/* Seuil — house prices of the last ten years as a guide for the price-growth guess (SE-4).
   Eurostat's annual House Price Index (prc_hpi_a, all dwellings, 2015 = 100) is read in the browser once a month
   and kept on the device. Switzerland is not in it: for Swiss places the "Ask Claude" answer gives the growth. */
export const HPI_URL = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hpi_a?format=JSON&unit=I15_A_AVG&purchase=TOTAL&geo=DE&geo=DK&geo=PL&geo=FR&geo=NO&lang=EN';
export const HPI_GEO = ['DE', 'DK', 'PL', 'FR', 'NO'];
const KEY = 'seuil.hpi';

/* JSON-stat → { DE: { from, to, pct } }: average yearly growth between the latest year and ten years earlier */
export function hpiGrowth(js) {
  if (!js || !js.value || !js.dimension || !Array.isArray(js.id) || !Array.isArray(js.size)) return {};
  const ids = js.id, size = js.size, stride = ids.map((_, i) => size.slice(i + 1).reduce((a, b) => a * b, 1));
  const cat = d => (js.dimension[d] && js.dimension[d].category && js.dimension[d].category.index) || {};
  const geo = cat('geo'), time = cat('time'), years = Object.keys(time).sort();
  const at = (g, y) => { let k = 0; for (let i = 0; i < ids.length; i++) { const d = ids[i], idx = d === 'geo' ? geo[g] : d === 'time' ? time[y] : 0; if (idx === undefined) return null; k += idx * stride[i]; } const v = js.value[k] ?? js.value[String(k)]; return typeof v === 'number' ? v : null; };
  const out = {};
  for (const g of Object.keys(geo)) {
    const have = years.filter(y => at(g, y) != null); if (have.length < 2) continue;
    const to = have[have.length - 1], fromY = String(Number(to) - 10), from = have.includes(fromY) ? fromY : have[0];
    const n = Number(to) - Number(from); if (n < 5) continue;
    out[g] = { from, to, pct: Math.round((Math.pow(at(g, to) / at(g, from), 1 / n) - 1) * 1000) / 10 };
  }
  return out;
}
let pending = null;
/* cached figures now; fetches in the background at most once a month, then calls back */
export function hpiFor(pack, onFresh) {
  let c = null; try { c = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  const stale = !c || !c.at || Date.now() - c.at > 30 * 864e5;
  if (stale && !pending && typeof fetch === 'function') {
    pending = fetch(HPI_URL).then(r => r.ok ? r.json() : null).then(js => { const by = hpiGrowth(js); if (Object.keys(by).length) { try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), by })); } catch (e) { } onFresh && onFresh(); } }).catch(() => { });
  }
  return c && c.by ? c.by[pack] || null : null;
}
