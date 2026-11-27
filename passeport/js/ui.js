/* Passeport — the shell: map, filters, the bottom sheet (Now, or a spot), search, tabs. Other screens live in views.js,
   the photo validation and sharing in flows.js. Every button carries data-act; one listener dispatches them. */
import { S, save, saveUi } from './store.js';
import { t, setLang } from './i18n.js';
import { A, $, esc, today, fmtTime, fmtDay, fmtDist, catName, catColor, icon, stars, photo, credit, toast, dialog, closeDialog, shellText, localize } from './app.js';
import { closedOn, eventsOn, eventSpots, suggest, search, parksFor, hav } from './rules.js';
import { sunTimes, isNight, nextSparkle, sparklingNow, paris } from './sky.js';
import { stampSVG, INK_FILTER } from './stamp.js';
import * as M from './map.js';
import { nav } from './plan.js';
import { renderPanel, panelAct } from './views.js';
import { flowAct, visitPhotoUrl } from './flows.js';

const PARIS_C = [2.3400, 48.8586];
let sheetState = 'peek', mapReady = false, mapCenter = null, nowTimer = null;

/* ---------- theme ---------- */
export function themeNow() {
  if (S.theme === 'day' || S.theme === 'night') return S.theme;
  return isNight(new Date(), 48.8566, 2.3522) ? 'night' : 'day';
}
export function applyTheme() {
  const th = themeNow();
  document.documentElement.dataset.theme = th;
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = th === 'night' ? '#0c1220' : '#f1ebe0';
  if (mapReady) M.setTheme(th);
}

/* ---------- which spots are shown ---------- */
const shortName = n => {
  let s = n.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+–\s+.*$/, '').trim();
  const m = s.match(/^(.+?)\s+(?:&|et)\s+/);                      // "Les Invalides et tombeau de Napoléon" → "Les Invalides"
  return m && m[1].split(/\s+/).length >= 2 ? m[1] : s;
};
function visibleSpots() {
  const cats = S.ui.cats || [], list = S.ui.list && A.listSet[S.ui.list];
  return A.data.spots.filter(s => (!cats.length || cats.includes(s.c)) && (!S.ui.mineOnly || S.mine[s.id]) && (!S.ui.todo || !S.visits[s.id]) && (!list || list.has(s.id)));
}
export function refreshMap() {
  if (!mapReady) return;
  const day = today(), live = S.ui.xmas ? eventSpots(A.data.events, day) : new Map();
  const vis = visibleSpots();
  M.setSpots(vis.map(s => ({ id: s.id, n: shortName(s.n), c: s.c, col: catColor(s.c), i: s.i, pm: s.i >= 4 && s.ph ? 1 : 0, lat: s.lat, lon: s.lon, v: S.visits[s.id] ? 1 : 0, x: live.has(s.id) ? 1 : 0, cl: closedOn(s, day).s === 'closed' ? 1 : 0 })));
  M.setPhotoMarkers(vis.filter(s => s.i >= 4 && s.ph).map(s => ({ id: s.id, n: s.n, lat: s.lat, lon: s.lon, img: s.ph.s, col: catColor(s.c), v: !!S.visits[s.id], x: live.has(s.id) })));
}

/* ---------- chips (filters) ---------- */
function renderChips() {
  const cats = S.ui.cats || [];
  const special = [
    ['mine', '★', t('chip.mine'), S.ui.mineOnly], ['todo', '○', t('chip.todo'), S.ui.todo], ['xmas', '❄', t('chip.xmas'), S.ui.xmas]
  ].map(([k, g, l, on]) => `<button class="chip sp${on ? ' on' : ''}" data-act="chip-${k}" aria-pressed="${on}"><b>${g}</b>${esc(l)}</button>`).join('');
  const list = S.ui.list ? `<button class="chip on list" data-act="chip-list">${esc(listName(S.ui.list))} ✕</button>` : '';
  const all = `<button class="chip${cats.length ? '' : ' on'}" data-act="chip-all" aria-pressed="${!cats.length}">${esc(t('chip.all'))}</button>`;
  const cs = A.data.cats.map(c => `<button class="chip cat${cats.includes(c.c) ? ' on' : ''}" data-act="chip-cat" data-c="${c.c}" style="--c:${c.color}" aria-pressed="${cats.includes(c.c)}"><i></i>${esc(catName(c.c))}</button>`).join('');
  $('#chips').innerHTML = list + special + all + cs;
}
export const listName = id => { const l = A.lists.find(x => x.id === id); return l ? (S.lang === 'en' ? l.en : l.fr) : ''; };

/* ---------- the sheet ---------- */
export function setSheet(st) {
  sheetState = st; const el = $('#sheet'); el.dataset.s = st;
  if (mapReady) setTimeout(() => M.resize(), 320);
}
function sheetPad() {
  const wide = matchMedia('(min-width: 900px)').matches;
  if (wide) return { left: 440, top: 40, right: 40, bottom: 40 };
  const h = window.innerHeight, el = $('#sheet'), r = el.getBoundingClientRect();
  return { top: 90, bottom: Math.max(0, h - r.top) + 20, left: 20, right: 20 };
}

/* ---------- Now ---------- */
function greeting(night, p) {
  const h = p.h;
  if (h < 5) return t('now.lateNight');
  if (night) return S.ui.xmas && (p.m === 12 || (p.m === 11 && p.d >= 20) || (p.m === 1 && p.d <= 6)) ? t('now.eveningLights') : t('now.evening');
  return h < 12 ? t('now.morning') : t('now.afternoon');
}
function tripLine(day) {
  const tr = S.trip; if (!tr) return '';
  const diff = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5);
  if (day < tr.start) return `<button class="trip" data-act="tab" data-tab="plan">${esc(t('now.countdown', { n: diff(day, tr.start) }))}<span>${esc(fmtDay(tr.start))} → ${esc(fmtDay(tr.end))}</span></button>`;
  if (day <= tr.end) { const d = (tr.days || {})[day]; return `<button class="trip on" data-act="tab" data-tab="plan">${esc(t('now.dayOf', { k: diff(tr.start, day) + 1, n: diff(tr.start, tr.end) + 1 }))}<span>${esc(d && d.t ? d.t : t('now.openPlan'))}</span></button>`; }
  return '';
}
const WX = c => c == null ? '' : c === 0 ? '☀︎' : c <= 2 ? '⛅︎' : c === 3 ? '☁︎' : c <= 48 ? '🌫︎' : c <= 67 || (c >= 80 && c <= 82) ? '☂︎' : c <= 77 || c === 85 || c === 86 ? '❄︎' : '⚡︎';
export function renderNow() {
  if (A.selected) return;
  const now = new Date(), day = today(), p = paris(now), sun = sunTimes(day, 48.8566, 2.3522), night = isNight(now, 48.8566, 2.3522);
  const sp = nextSparkle(now), sparkNow = sparklingNow(now);
  const mins = sp ? Math.round((sp - now) / 6e4) : null;
  const live = eventsOn(A.data.events, day).filter(e => !['Closure', 'Practical', 'Exhibition', 'Free day'].includes(e.t));
  const ctx = { day, night, pos: A.pos || (mapCenter ? { lat: mapCenter.lat, lon: mapCenter.lng } : null), mine: S.mine, visits: S.visits, live: eventSpots(A.data.events, day), rain: A.weather && A.weather.rain };
  const sug = suggest(A.data.spots, ctx, 8);
  const w = A.weather;
  $('#sheetBody').innerHTML = `<div class="now">
    <div class="now-head"><div><div class="k">${esc(t('now.where'))} · ${esc(fmtDay(day))}</div><h2>${esc(greeting(night, p))}</h2></div>
      ${w ? `<div class="wx" title="${esc(t('now.wx'))}"><b>${WX(w.code)}</b>${Math.round(w.temp)}°${w.rainP != null ? `<small>☂︎ ${w.rainP}%</small>` : ''}</div>` : ''}</div>
    ${tripLine(day)}
    <div class="tiles">
      <div class="tile"><span class="lab">${esc(t('now.sun'))}</span><b>☀︎ ${fmtTime(sun.sunset)}</b><small>${esc(t('now.sunLine', { r: fmtTime(sun.sunrise), d: fmtTime(sun.dusk) }))}</small></div>
      <div class="tile spark${sparkNow ? ' live' : ''}"><span class="lab">${esc(t('now.sparkle'))}</span><b>${sparkNow ? esc(t('now.sparkleNow')) : sp ? fmtTime(sp) : '–'}</b><small>${sparkNow ? esc(t('now.sparkleGo')) : mins != null ? esc(mins < 60 ? t('now.inMin', { n: mins }) : t('now.inH', { h: Math.floor(mins / 60), m: String(mins % 60).padStart(2, '0') })) : ''}</small></div>
      <button class="tile xmas" data-act="xmas-today"><span class="lab">${esc(t('now.events'))}</span><b>${live.length}</b><small>${esc(t('now.eventsToday'))}</small></button>
    </div>
    <h3>${esc(t('now.what'))}</h3>
    <div class="cards">${sug.map(x => card(x.s, t('why.' + x.why), x.d)).join('') || `<p class="muted">${esc(t('now.nothing'))}</p>`}</div>
    ${live.length ? `<h3>${esc(t('now.tonight'))}</h3><ul class="evs">${live.sort((a, b) => b.i - a.i).slice(0, 5).map(evRow).join('')}</ul>` : ''}
    <p class="foot">${esc(t('now.foot', { n: A.data.spots.length }))}</p>
  </div>`;
}
export function card(s, why, d) {
  const v = S.visits[s.id];
  return `<button class="card${v ? ' v' : ''}" data-act="open" data-id="${s.id}" style="--c:${catColor(s.c)}">${photo(s, 'm')}<span class="cap"><span class="why">${esc(why || catName(s.c))}</span><b>${esc(shortName(s.n))}</b><small>${stars(s.i)}${d != null ? ' · ' + fmtDist(d) : ''}</small></span>${v ? '<i class="tick">✓</i>' : ''}</button>`;
}
export function evRow(e) {
  const s = e.spot && A.spot.get(e.spot);
  return `<li><button data-act="${s ? 'open' : 'event'}" data-id="${s ? s.id : e.id}"><span class="evt">${esc(e.n)}</span><small>${esc([e.h, e.p].filter(Boolean).join(' · '))}</small></button></li>`;
}

/* ---------- a spot ---------- */
export function openSpot(id, o = {}) {
  const s = A.spot.get(id); if (!s) return;
  A.selected = s.id;
  if (S.ui.tab !== 'map') { S.ui.tab = 'map'; renderTabs(); renderPanel(); }
  renderSpot();
  if (sheetState === 'peek' || sheetState === 'min') setSheet('half');
  history.replaceState(null, '', '#s=' + s.id);
  if (mapReady) {
    M.setSelected({ ...s, col: catColor(s.c) });
    M.setParks(parksFor(s, A.pk));
    if (o.fly !== false) setTimeout(() => M.flyTo(s, sheetPad(), A.reduced), 30);
  }
}
export function closeSpot() {
  A.selected = null; history.replaceState(null, '', location.pathname + location.search);
  if (mapReady) { M.setSelected(null); M.setParks([]); }
  setSheet('peek'); renderNow();
}
const fact = (k, v) => v ? `<div><dt>${esc(t(k))}</dt><dd>${esc(v)}</dd></div>` : '';
export async function renderSpot() {
  const s = A.spot.get(A.selected); if (!s) return;
  const day = today(), c = closedOn(s, day), v = S.visits[s.id], mine = S.mine[s.id];
  const evs = (A.evBySpot.get(s.id) || []).filter(e => !e.e || e.e >= day).sort((a, b) => (a.s || '').localeCompare(b.s || ''));
  const parks = parksFor(s, A.pk);
  const d = A.pos ? hav(A.pos.lat, A.pos.lon, s.lat, s.lon) : null;
  const status = c.s === 'closed' ? `<span class="pill bad">${esc(t('st.closedToday'))}${c.why ? ' · ' + esc(t('st.why.' + c.why)) : ''}</span>` : c.s === 'maybe' ? `<span class="pill warn">${esc(t('st.maybe.' + (c.why || 'x')))}</span>` : c.s === 'open' && s.closed ? `<span class="pill ok">${esc(t('st.openToday'))}</span>` : '';
  const liveNow = evs.filter(e => (!e.s || e.s <= day) && (!e.e || e.e >= day) && !['Closure', 'Practical'].includes(e.t));
  const myPhoto = v && v.photo ? await visitPhotoUrl(s.id, 'full') : null;
  const hero = myPhoto ? `<img class="ph" src="${myPhoto}" alt="">` : photo(s, 'l');
  $('#sheetBody').innerHTML = `<article class="spot" style="--c:${catColor(s.c)}">
    <div class="hero">${hero}
      <button class="round x" data-act="close" aria-label="${esc(t('a.close'))}">✕</button>
      <div class="hero-t"><span class="chip cat on" style="--c:${catColor(s.c)}"><i></i>${esc(catName(s.c))}</span>
        <h1>${esc(s.n)}</h1><div class="meta">${stars(s.i)} <span>${esc(t('imp.' + s.i))}</span>${s.a ? ' · ' + esc(s.a) : ''}${d != null ? ' · ' + fmtDist(d) : ''}</div></div>
      ${myPhoto ? `<span class="credit">${esc(t('photo.yours'))}</span>` : credit(s)}
    </div>
    <div class="status">${status}${liveNow.map(e => `<span class="pill gold">❄ ${esc(t('st.live'))}</span>`).slice(0, 1).join('')}${v ? `<span class="pill ok">✓ ${esc(t('st.visited', { d: fmtDay(v.at.slice(0, 10)) }))}</span>` : ''}${/^closed/i.test(s.st || '') ? `<span class="pill bad">${esc(s.st)}</span>` : ''}</div>
    <div class="actions">
      ${v ? `<button class="btn gold" data-act="stamp" data-id="${s.id}">${stampSVG(s, v, { color: catColor(s.c), lang: S.lang, size: 26 })}${esc(t('a.myStamp'))}</button>`
        : `<button class="btn gold" data-act="validate" data-id="${s.id}"><svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M9 3 7.2 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>${esc(t('a.validate'))}</button>`}
      <button class="btn${mine ? ' on' : ''}" data-act="mine" data-id="${s.id}" aria-pressed="${!!mine}">${mine === 'must' ? '★ ' + esc(t('mine.must')) : mine === 'want' ? '♡ ' + esc(t('mine.want')) : '☆ ' + esc(t('a.mine'))}</button>
      <button class="btn" data-act="go" data-id="${s.id}">➤ ${esc(t('a.go'))}</button>
      <button class="btn" data-act="addday" data-id="${s.id}">＋ ${esc(t('a.plan'))}</button>
      <button class="btn icon" data-act="share-spot" data-id="${s.id}" aria-label="${esc(t('a.share'))}">⤴</button>
    </div>
    <section><h3>${esc(t('s.why'))}</h3><p>${esc(s.why)}</p></section>
    ${s.shot ? `<section class="shot"><h3>${esc(t('s.shot'))}</h3><p>${esc(s.shot)}</p></section>` : ''}
    ${s.tips ? `<section><h3>${esc(t('s.tips'))}</h3><p>${esc(s.tips)}</p></section>` : ''}
    ${s.dec ? `<section class="dec"><h3>❄ ${esc(t('s.dec'))}</h3><p>${esc(s.dec)}</p></section>` : ''}
    ${evs.length ? `<section><h3>${esc(t('s.events'))}</h3><ul class="evlist">${evs.map(e => `<li><b>${esc(e.n)}</b><small>${e.s || e.e ? esc((e.s ? fmtDay(e.s) : '…') + ' → ' + (e.e ? fmtDay(e.e) : '…')) : esc(t('ev.tbc'))}${e.h ? ' · ' + esc(e.h) : ''}${e.p ? ' · ' + esc(e.p) : ''}</small>${e.conf && e.conf !== 'Confirmed' ? `<em>${esc(t('conf.' + (e.conf === 'One source' ? 'one' : 'no')))}</em>` : ''}</li>`).join('')}</ul></section>` : ''}
    <section class="facts"><h3>${esc(t('s.practical'))}</h3><dl>${fact('f.price', s.price)}${fact('f.book', s.book)}${fact('f.closed', s.closed)}${fact('f.free', s.free)}${fact('f.dur', s.dur ? t('f.min', { n: s.dur >= 600 ? Math.round(s.dur / 60) + ' h' : s.dur + ' min' }) : '')}${fact('f.io', s.io ? t('io.' + s.io.split(' ')[0].toLowerCase()) : '')}${fact('f.go', s.go)}</dl></section>
    ${parks.length ? `<section class="parks"><h3>${esc(t('s.park'))}</h3><ul>${parks.map(p => { const n = nav(p.lat, p.lon); return `<li><span class="P">P</span><span class="pn"><b>${esc(p.n)}</b><small>${esc(t('pk.' + (p.k === 'underground' || p.k === 'multi-storey' ? p.k : 'surface')))}${p.cap ? ' · ' + esc(t('pk.cap', { n: p.cap })) : ''} · ${esc(t('pk.walk', { n: p.walk }))}</small></span><a class="mini" href="${n.waze}" target="_blank" rel="noopener">Waze</a><a class="mini" href="${n.google}" target="_blank" rel="noopener">Maps</a></li>`; }).join('')}</ul><p class="muted small">${esc(t('pk.note'))}</p></section>` : ''}
    <section class="note"><h3>${esc(t('s.note'))}</h3><textarea data-note="${s.id}" rows="2" placeholder="${esc(t('s.notePh'))}">${esc(S.notes[s.id] || '')}</textarea></section>
    <p class="src">${esc(s.ver === 'W' ? t('src.web', { d: fmtDay(A.data.checked) }) : t('src.know'))}${s.src ? ` · <a href="${esc(s.src)}" target="_blank" rel="noopener">${esc(t('src.link'))}</a>` : ''}</p>
  </article>`;
}

/* ---------- search ---------- */
function openSearch() {
  const d = dialog(`<div class="search"><div class="sbar"><input id="q" type="search" placeholder="${esc(t('search.ph'))}" autocomplete="off" enterkeyhint="search"><button class="round" data-act="dlg-close" aria-label="${esc(t('a.close'))}">✕</button></div><ul id="qres" class="res"></ul></div>`, 'top');
  const q = d.querySelector('#q'), res = d.querySelector('#qres');
  const draw = () => {
    const r = q.value.trim() ? search(A.data.spots, q.value, catName, 30) : A.data.spots.filter(s => s.i >= 5);
    res.innerHTML = r.map(s => `<li><button data-act="open" data-id="${s.id}">${photo(s, 's', 'th')}<span><b>${esc(s.n)}</b><small>${esc(catName(s.c))}${s.a ? ' · ' + esc(s.a) : ''}</small></span>${stars(s.i)}</button></li>`).join('') || `<li class="muted pad">${esc(t('search.none'))}</li>`;
  };
  q.addEventListener('input', draw); draw(); setTimeout(() => q.focus(), 50);
}

/* ---------- tabs ---------- */
const TABS = [['map', 'M12 2 3 6v16l9-4 9 4V6zM12 4.2v13.6L5 21V7.2zm2 13.6V4.2L19 7.2V21z'], ['lists', 'M4 5h16v2H4zm0 6h16v2H4zm0 6h10v2H4z'], ['passport', 'M6 2h11a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6zm6 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM8 18v1.5h8V18z'], ['plan', 'M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zM5 9h14v11H5z'], ['settings', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.6 2.2-1.9-.4a7 7 0 0 0-.8-1.9l1.1-1.6-1.9-1.9-1.6 1.1a7 7 0 0 0-1.9-.8L13.2 2h-2.4l-.4 1.9a7 7 0 0 0-1.9.8L6.9 3.6 5 5.5l1.1 1.6a7 7 0 0 0-.8 1.9l-1.9.4v2.4l1.9.4c.2.7.4 1.3.8 1.9L5 15.7l1.9 1.9 1.6-1.1c.6.4 1.2.6 1.9.8l.4 1.9h2.4l.4-1.9a7 7 0 0 0 1.9-.8l1.6 1.1 1.9-1.9-1.1-1.6c.4-.6.6-1.2.8-1.9l1.9-.4z']];
export function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([k, d]) => `<button data-act="tab" data-tab="${k}" class="${S.ui.tab === k ? 'on' : ''}" aria-current="${S.ui.tab === k ? 'page' : 'false'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg><span>${esc(t('tab.' + k))}</span>${k === 'passport' && Object.keys(S.visits).length ? `<i>${Object.keys(S.visits).length}</i>` : ''}</button>`).join('');
  document.body.dataset.tab = S.ui.tab;
}
export function goTab(k) {
  S.ui.tab = k; saveUi(); renderTabs(); renderPanel();
  if (k === 'map') { setTimeout(() => M.resize(), 50); if (!A.selected) renderNow(); }
}

/* ---------- the one click handler ---------- */
async function onClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, id = b.dataset.id;
  if (act === 'open') { closeDialog(); openSpot(id); return; }
  if (act === 'close') return closeSpot();
  if (act === 'search') return openSearch();
  if (act === 'dlg-close') return closeDialog();
  if (act === 'tab') { closeDialog(); return goTab(b.dataset.tab); }
  if (act === 'three-d') { S.ui.threeD = !S.ui.threeD; saveUi(); M.set3D(S.ui.threeD, A.reduced); b.classList.toggle('on', S.ui.threeD); return; }
  if (act === 'locate') { M.locateMe(); return; }
  if (act === 'theme') { S.theme = themeNow() === 'night' ? 'day' : 'night'; save(); applyTheme(); toast(t(S.theme === 'night' ? 'theme.night' : 'theme.day')); return; }
  if (act.startsWith('chip-')) {
    const k = act.slice(5);
    if (k === 'all') S.ui.cats = [];
    else if (k === 'cat') { const c = b.dataset.c, cs = new Set(S.ui.cats || []); cs.has(c) ? cs.delete(c) : cs.add(c); S.ui.cats = [...cs]; }
    else if (k === 'mine') S.ui.mineOnly = !S.ui.mineOnly;
    else if (k === 'todo') S.ui.todo = !S.ui.todo;
    else if (k === 'xmas') S.ui.xmas = !S.ui.xmas;
    else if (k === 'list') S.ui.list = null;
    saveUi(); renderChips(); refreshMap(); if (!A.selected) renderNow(); return;
  }
  if (act === 'mine') { const cur = S.mine[id]; if (!cur) S.mine[id] = 'want'; else if (cur === 'want') S.mine[id] = 'must'; else delete S.mine[id]; save(); renderSpot(); toast(t(S.mine[id] ? 'mine.set.' + S.mine[id] : 'mine.removed')); return; }
  if (act === 'go') {
    const s = A.spot.get(id), p = parksFor(s, A.pk)[0], dest = p || s, n = nav(dest.lat, dest.lon);
    dialog(`<div class="pad"><h2>${esc(t('go.h'))}</h2><p class="muted">${esc(p ? t('go.park', { p: p.n, n: p.walk }) : t('go.spot'))}</p><div class="stack"><a class="btn wide" href="${n.waze}" target="_blank" rel="noopener">Waze</a><a class="btn wide" href="${n.google}" target="_blank" rel="noopener">Google Maps</a><a class="btn wide" href="${n.apple}" target="_blank" rel="noopener">${esc(t('go.apple'))}</a></div><button class="btn ghost wide" data-act="dlg-close">${esc(t('a.cancel'))}</button></div>`);
    return;
  }
  if (act === 'xmas-today') { S.ui.list = 'christmas'; S.ui.xmas = true; saveUi(); renderChips(); refreshMap(); M.fitTo(A.data.spots.filter(s => A.listSet.christmas.has(s.id) && s.z === 'P'), sheetPad(), A.reduced); return; }
  if (act === 'event') { const ev = A.data.events.find(x => x.id === id); if (ev) dialog(`<div class="pad"><h2>${esc(ev.n)}</h2><p>${esc([ev.s && fmtDay(ev.s), ev.e && fmtDay(ev.e)].filter(Boolean).join(' → '))}</p><p>${esc(ev.h || '')}</p><p class="muted">${esc(ev.notes || '')}</p><button class="btn wide" data-act="dlg-close">${esc(t('a.close'))}</button></div>`); return; }
  if (await flowAct(act, b, e)) return;
  await panelAct(act, b, e);
}

/* ---------- the sheet drag ---------- */
function dragSheet() {
  const el = $('#sheet'), grab = el.querySelector('.grab');
  let y0 = 0, t0 = 0, top0 = 0, dragging = false;
  const order = ['full', 'half', 'peek', 'min'];
  grab.addEventListener('pointerdown', ev => { dragging = true; y0 = ev.clientY; t0 = performance.now(); top0 = el.getBoundingClientRect().top; el.classList.add('drag'); grab.setPointerCapture(ev.pointerId); });
  grab.addEventListener('pointermove', ev => { if (!dragging) return; const top = Math.max(40, top0 + ev.clientY - y0); el.style.transform = `translateY(${top}px)`; });
  const end = ev => {
    if (!dragging) return; dragging = false; el.classList.remove('drag'); el.style.transform = '';
    const dy = ev.clientY - y0, v = dy / Math.max(1, performance.now() - t0), h = window.innerHeight;
    let i = order.indexOf(sheetState);
    if (Math.abs(dy) < 6) i = sheetState === 'full' ? 2 : 0;          // a tap toggles
    else if (v > 0.5 || dy > h * 0.12) i = Math.min(3, i + (dy > h * 0.4 ? 2 : 1));
    else if (v < -0.5 || dy < -h * 0.12) i = Math.max(0, i - (dy < -h * 0.4 ? 2 : 1));
    setSheet(order[i]);
  };
  grab.addEventListener('pointerup', end); grab.addEventListener('pointercancel', end);
}

/* ---------- start ---------- */
export async function start() {
  applyTheme();
  renderTabs(); renderChips(); renderPanel();
  document.addEventListener('click', onClick);
  document.addEventListener('input', e => { const n = e.target.dataset && e.target.dataset.note; if (n) { const v = e.target.value.trim(); if (v) S.notes[n] = v; else delete S.notes[n]; save(); } });
  dragSheet();
  $('#svgdefs').innerHTML = INK_FILTER;
  renderNow();
  clearInterval(nowTimer); nowTimer = setInterval(() => { applyTheme(); if (S.ui.tab === 'map' && !A.selected) renderNow(); }, 60000);
  weather();
  try {
    await M.createMap({ el: $('#map'), center: A.data.center || PARIS_C, zoom: A.data.zoom || 12.4, theme: themeNow(), threeD: S.ui.threeD, onSelect: id => openSpot(id),
      onMove: c => { mapCenter = c; }, onLocate: p => { A.pos = p; if (!A.selected) renderNow(); } });
    mapReady = true; $('#app').classList.add('map-on');
    refreshMap();
    if (A.selected) openSpot(A.selected);
  } catch (e) {
    $('#map').innerHTML = `<div class="offline">${esc(t('map.offline'))}</div>`;
  }
  const m = location.hash.match(/^#s=([a-z0-9-]+)/);
  if (m && A.spot.has(m[1])) openSpot(m[1]);
}
export function rerenderAll() { setLang(S.lang); localize(); shellText(); renderTabs(); renderChips(); renderPanel(); if (A.selected) renderSpot(); else renderNow(); refreshMap(); }

/* weather from Open-Meteo for central Paris, kept 20 minutes */
async function weather() {
  try {
    const c = JSON.parse(sessionStorage.getItem('pp.wx') || 'null');
    if (c && Date.now() - c.at < 20 * 6e4) { A.weather = c.w; return; }
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current=temperature_2m,weather_code,precipitation&hourly=precipitation_probability&forecast_hours=3&timezone=Europe%2FParis');
    const j = await r.json();
    const rainP = j.hourly && j.hourly.precipitation_probability ? Math.max(...j.hourly.precipitation_probability.slice(0, 3)) : null;
    A.weather = { temp: j.current.temperature_2m, code: j.current.weather_code, rain: (j.current.precipitation || 0) > 0.1 || (rainP || 0) >= 60, rainP };
    sessionStorage.setItem('pp.wx', JSON.stringify({ at: Date.now(), w: A.weather }));
    if (!A.selected && S.ui.tab === 'map') renderNow();
  } catch (e) { /* no signal: no weather */ }
}
