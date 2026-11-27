/* Passeport — what every screen shares: the loaded guide and its indexes, formatting, and small interface helpers. */
import { S } from './store.js';
import { t } from './i18n.js';
import { ICONS } from './stamp.js';
import { parisDay } from './sky.js';

export const A = {
  data: null,            // the guide (data/paris.json)
  spot: new Map(),       // id → spot
  pk: new Map(),         // id → car park
  cat: new Map(),        // code → category
  evBySpot: new Map(),   // spot id → events (all dates)
  lists: [], listSet: {},// curated lists, and id → Set(spot ids)
  pos: null,             // last known position { lat, lon, acc }
  weather: null,         // { temp, code, rain }
  selected: null,        // open spot id
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches
};

export function index(data) {
  A.data = data;
  for (const s of data.spots) s.en = s.n;
  A.spot = new Map(data.spots.map(s => [s.id, s]));
  for (const [old, now] of Object.entries(data.aliases || {})) if (A.spot.has(now)) A.spot.set(old, A.spot.get(now));
  A.pk = new Map(data.parking.map(p => [p.id, p]));
  A.cat = new Map(data.cats.map(c => [c.c, c]));
  A.evBySpot = new Map();
  for (const e of data.events) if (e.spot) { const l = A.evBySpot.get(e.spot) || []; l.push(e); A.evBySpot.set(e.spot, l); }
  A.lists = data.lists;
  A.listSet = Object.fromEntries(data.lists.map(l => [l.id, new Set(l.ids)]));
}

/* every screen shows s.n: the French name when the app is in French and the guide has one, else the English name */
export function localize() { if (A.data) for (const s of A.data.spots) s.n = (S.lang === 'fr' && s.nf) || s.en; }
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const today = () => parisDay(new Date());
export const loc = () => (S.lang === 'en' ? 'en-GB' : 'fr-FR');
const fmtCache = new Map();
const F = opts => { const k = loc() + JSON.stringify(opts); if (!fmtCache.has(k)) fmtCache.set(k, new Intl.DateTimeFormat(loc(), { timeZone: 'Europe/Paris', ...opts })); return fmtCache.get(k); };
export const fmtTime = d => d ? F({ hour: '2-digit', minute: '2-digit' }).format(d) : '–';
export const fmtDay = day => F({ weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(day + 'T12:00:00Z'));
export const fmtDayLong = day => F({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(day + 'T12:00:00Z'));
export const fmtDate = d => F({ day: 'numeric', month: 'short', year: 'numeric' }).format(d);
export const fmtDist = m => m == null ? '' : m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 9500 ? 1 : 0).replace('.', S.lang === 'en' ? '.' : ',')} km`;

export const catName = c => t('cat.' + c);
export const catColor = c => (A.cat.get(c) || {}).color || '#888';
export const icon = (c, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[c] || ICONS.EX}"/></svg>`;
export const stars = i => `<span class="stars" aria-label="${esc(t('imp.aria', { n: i }))}">${'★'.repeat(i)}<i>${'★'.repeat(5 - i)}</i></span>`;

/* the photo of a spot: Wikimedia thumbnail at a standard width, or a designed placeholder in the category colour */
export function photo(s, size = 'm', cls = 'ph') {
  if (s.ph) {
    const src = size === 's' ? s.ph.s : size === 'l' ? s.ph.l : s.ph.m;
    const set = size === 'l' ? ` srcset="${esc(s.ph.m)} 500w, ${esc(s.ph.l)} 960w" sizes="(min-width: 900px) 420px, 100vw"` : '';
    return `<img class="${cls}" src="${esc(src)}"${set} alt="" loading="lazy" decoding="async" crossorigin="anonymous" referrerpolicy="no-referrer" data-c="${s.c}">`;
  }
  return `<span class="${cls} noph" style="--c:${catColor(s.c)}">${icon(s.c, 'big')}</span>`;
}
/* a photo that does not load (no signal, or Commons is busy) becomes the drawn placeholder, never a broken image */
export function photoFallbacks() {
  document.addEventListener('error', e => {
    const el = e.target;
    if (!el || el.tagName !== 'IMG') return;
    if (el.closest('.pm')) { el.remove(); return; }
    if (!el.dataset.c) return;
    const span = document.createElement('span');
    span.className = el.className + ' noph'; span.style.setProperty('--c', catColor(el.dataset.c)); span.innerHTML = icon(el.dataset.c, 'big');
    el.replaceWith(span);
  }, true);
}
export const credit = s => s.ph ? `<a class="credit" href="${esc(s.ph.url)}" target="_blank" rel="noopener">${esc(t('photo.credit', { by: s.ph.by, lic: s.ph.lic }))}</a>` : '';

/* small toast at the bottom */
let toastT = null;
export function toast(msg, ms = 2600) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms);
}
/* a modal dialog; html is built by the caller; returns the dialog element */
export function dialog(html, cls = '') {
  const d = $('#dlg'); d.className = cls; d.innerHTML = html;
  if (!d.open) d.showModal();
  return d;
}
export const closeDialog = () => { const d = $('#dlg'); if (d.open) d.close(); };
export const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
/* the few words written in index.html, in the chosen language */
export function shellText() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { const s = t(el.dataset.i18nAria); el.setAttribute('aria-label', s); el.title = s; });
}
