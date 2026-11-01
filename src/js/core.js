'use strict';
/* ───────────── Basics ───────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ic = (id, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const isPhone = () => matchMedia('(max-width: 760px)').matches;
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const nf = new Intl.NumberFormat('en-GB');
const fmtKm = km => (km >= 10 ? Math.round(km) : Math.round(km * 10) / 10).toString().replace(/\.0$/, '') + ' km';
const fmtM = m => nf.format(Math.round(m)) + ' m';
function fmtDur(min) {
  if (min == null || !isFinite(min)) return '–';
  min = Math.round(min);
  if (min < 60) return min + ' min';
  const h = Math.floor(min / 60), m = min % 60;
  return h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : '');
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function fmtDate(iso, opts = {}) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return (opts.wd ? WD[dt.getDay()] + ' ' : '') + d + ' ' + MONTHS[m - 1] + (opts.y ? ' ' + y : '');
}
function hav(a, b) { // [lat,lon] → km
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b[0] - a[0]) * toR, dLon = (b[1] - a[1]) * toR;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const havLL = (a, b) => hav([a[1], a[0]], [b[1], b[0]]); // [lon,lat]
function bearingLL(a, b) {
  const toR = Math.PI / 180, y = Math.sin((b[0] - a[0]) * toR) * Math.cos(b[1] * toR);
  const x = Math.cos(a[1] * toR) * Math.sin(b[1] * toR) - Math.sin(a[1] * toR) * Math.cos(b[1] * toR) * Math.cos((b[0] - a[0]) * toR);
  return (Math.atan2(y, x) / toR + 360) % 360;
}
async function fetchT(url, opts = {}, ms = 20000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ac.signal }); } finally { clearTimeout(t); }
}
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
}
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); });
}

/* ───────────── Storage ───────────── */
const LS = {
  get(k, d) { try { const v = localStorage.getItem('cordee.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('cordee.' + k, JSON.stringify(v)); return true; } catch (e) { console.warn('Storage full or blocked', e); return false; } },
  del(k) { try { localStorage.removeItem('cordee.' + k); } catch (e) { } }
};

const DEFAULTS = {
  names: ['', ''], dogName: '', dogSize: 'medium',
  home: { name: 'Munich', lat: 48.1372, lon: 11.5755 },
  pace: { mode: 'auto', manual: 0.88 },
  base: 'cordee', contours: true, trails: false, exag: 1.35, threeD: true, theme: 'system',
  autoTrace: true, sync: { url: '', key: '', email: '' }
};
const S = Object.assign(structuredClone(DEFAULTS), LS.get('settings', {}));
S.pace = Object.assign({}, DEFAULTS.pace, S.pace); S.home = Object.assign({}, DEFAULTS.home, S.home); S.sync = Object.assign({}, DEFAULTS.sync, S.sync);
const saveSettings = () => LS.set('settings', S);
const personName = i => (S.names[i] || '').trim() || ['Hiker 1', 'Hiker 2'][i];
const hasNames = () => S.names.some(n => (n || '').trim());

/* Where the app is published. On GitHub Pages this is read from the address (owner.github.io/repo/). */
const REPO = (() => {
  const m = location.hostname.match(/^([\w-]+)\.github\.io$/), seg = location.pathname.split('/').filter(Boolean)[0];
  return m && seg && !/\.html?$/.test(seg) ? { owner: m[1], name: seg } : { owner: 'Thrugg', name: 'Thrugg-' };
})();
const repoUrl = (path = '') => `https://github.com/${REPO.owner}/${REPO.name}${path}`;

/* Synced items: logs, marks (bucket list), hike edits/custom hikes, traced routes.
   ITEMS[id] = { k: kind, d: data, x: deleted, u: client timestamp, dirty } */
const ITEMS = LS.get('items', {});
const saveItems = debounce(() => { LS.set('items', ITEMS); }, 400);
function putItem(id, k, d) {
  ITEMS[id] = { k, d, x: false, u: new Date().toISOString(), dirty: true };
  saveItems(); Sync.soon();
}
function delItem(id) {
  if (!ITEMS[id]) return;
  ITEMS[id] = { k: ITEMS[id].k, d: null, x: true, u: new Date().toISOString(), dirty: true };
  saveItems(); Sync.soon();
}
const itemsOf = k => Object.entries(ITEMS).filter(([, v]) => v.k === k && !v.x).map(([id, v]) => ({ id, ...v.d }));

/* ───────────── Hike model ───────────── */
const GRADES = ['easy', 'moderate', 'hard', 'expert'];
const GL = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard', expert: 'Expert' };
const COUNTRIES = { DE: 'Germany', AT: 'Austria', CH: 'Switzerland', IT: 'Italy' };
const TAGS = [['lake', 'Lakes'], ['swim', 'Swimming'], ['summit', 'Summits'], ['hut', 'Huts'], ['waterfall', 'Waterfalls'], ['gorge', 'Gorges'], ['ridge', 'Ridges'], ['views', 'Big views'], ['glacier', 'Glaciers'], ['larch', 'Larches'], ['family', 'Easy-going'], ['history', 'History'], ['cablecar', 'Cable car'], ['boat', 'Boat']];
const SCALES = {
  T1: 'SAC T1 · hiking trail', T2: 'SAC T2 · mountain trail', T3: 'SAC T3 · demanding mountain trail', T4: 'SAC T4 · alpine route', T5: 'SAC T5 · demanding alpine route', T6: 'SAC T6 · difficult alpine route',
  T: 'CAI T · tourist path', E: 'CAI E · hiking trail', EE: 'CAI EE · for experienced hikers', EEA: 'CAI EEA · via ferrata gear needed'
};
const TYPE_LABEL = { loop: 'Loop', out: 'Out and back', trav: 'One way' };

function dinMinutes(km, up, dn) { // DIN 33466 walking time (used by DAV/ÖAV signposts)
  const th = km / 4, tv = up / 300 + dn / 500;
  return Math.round((Math.max(th, tv) + Math.min(th, tv) / 2) * 60);
}
function enrich(h) {
  h.p = h.p || [];
  h.tg = h.tg || []; h.d = Object.assign({ r: 'free', t: 'ok', cow: 0, h2o: 0, n: '', src: 'gen' }, h.d || {});
  h.ss = h.ss || [1, 12]; h.ty = h.ty || 'out'; h.g = GRADES.includes(h.g) ? h.g : 'moderate';
  h.km = +h.km || 0; h.up = +h.up || 0; h.dn = h.dn != null && h.dn !== '' ? +h.dn : h.up; h.mx = +h.mx || 0; h.lo = +h.lo || 0;
  const hi = h.hi != null && h.hi < h.p.length ? h.hi : h.p.length - 1;
  h.start = h.p[0]; h.top = Array.isArray(h.tp) && h.tp.length === 2 && h.tp.every(Number.isFinite) ? h.tp : h.p[hi]; h.hiIdx = hi;
  h.din = dinMinutes(h.km, h.up, h.ty === 'trav' ? h.dn : h.up);
  h.lift = !!h.lf || h.tg.includes('cablecar') || h.tg.includes('boat') || h.tg.includes('train');
  h.q = norm([h.n, h.ar, h.rg, COUNTRIES[h.c], h.tg.map(t => (TAGS.find(x => x[0] === t) || [, t])[1]).join(' '), h.b, h.tn].join(' '));
  return h;
}
/* New hikes: the weekly update stamps "ad" (date added) on each hike it adds. */
const NEW_DAYS = 30;
const addedAgo = h => h.ad ? (Date.now() - new Date(h.ad + 'T12:00').getTime()) / 864e5 : Infinity;
const isNewHike = h => addedAgo(h) <= NEW_DAYS;

/* The catalogue is embedded in the page and also published as data/hikes.json, so an update
   (or a quick fix made on GitHub) shows up without waiting for the page itself to refresh. */
async function loadCatalogue() {
  if (!/^https?:$/.test(location.protocol)) return false;
  try {
    const r = await fetchT('data/hikes.json', { cache: 'no-cache' }, 15000);
    if (!r.ok) return false;
    const j = await r.json();
    const ok = Array.isArray(j) && j.length >= 10 && j.every(h => h && typeof h.id === 'string' && Array.isArray(h.p) && h.p.length >= 2 && h.p.every(q => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite)) && COUNTRIES[h.c] && h.n);
    if (!ok || JSON.stringify(j) === JSON.stringify(HIKES)) return false;
    HIKES = j;
    return true;
  } catch (e) { console.warn('catalogue', e.message); return false; }
}

let HK = [], HBY = {};
function rebuildHikes() {
  const over = {};
  for (const it of itemsOf('hike')) over[it.id.slice(5)] = it;
  const list = HIKES.map(h => over[h.id] ? Object.assign(structuredClone(h), over[h.id], { id: h.id, edited: true }) : structuredClone(h));
  for (const id in over) if (!HIKES.some(h => h.id === id)) list.push(Object.assign({}, over[id], { id, custom: true }));
  HK = list.filter(h => h.p && h.p.length >= 2).map(enrich);
  HBY = Object.fromEntries(HK.map(h => [h.id, h]));
}
function saveHike(h, patch) {
  const base = HIKES.find(b => b.id === h.id);
  const cur = ITEMS['hike:' + h.id] && !ITEMS['hike:' + h.id].x ? ITEMS['hike:' + h.id].d : {};
  const data = Object.assign({}, base ? cur : stripHike(h), patch);
  delete data.id;
  putItem('hike:' + h.id, 'hike', data);
  rebuildHikes();
}
function stripHike(h) {
  const o = {};
  for (const k of ['n', 'ar', 'rg', 'c', 'p', 'hi', 'tn', 'tk', 'ty', 'km', 'up', 'dn', 'mx', 'lo', 'g', 'sc', 'tg', 'ss', 'd', 'lf', 'b', 'links', 'auto', 'sn', 'fn', 'tp', 'free']) if (h[k] !== undefined) o[k] = h[k];
  return o;
}
function inSeason(h, m = new Date().getMonth() + 1) {
  const [a, b] = h.ss; return a <= b ? m >= a && m <= b : m >= a || m <= b;
}
function seasonText(h) { const [a, b] = h.ss; return a === 1 && b === 12 ? 'All year' : MONTHS[a - 1] + '–' + MONTHS[b - 1]; }

/* Logs, bucket list, pace */
const logs = () => itemsOf('log').filter(l => HBY[l.hike]).sort((a, b) => b.date.localeCompare(a.date));
function doneMap() { const m = {}; for (const l of logs()) (m[l.hike] = m[l.hike] || []).push(l); return m; }
const isWish = id => !!(ITEMS['mark:' + id] && !ITEMS['mark:' + id].x && ITEMS['mark:' + id].d.wish);
function toggleWish(id) { if (isWish(id)) delItem('mark:' + id); else putItem('mark:' + id, 'mark', { wish: true }); }
function logDin(l) { const h = HBY[l.hike]; if (l.km && l.up != null) return dinMinutes(l.km, l.up, l.dn ?? l.up); return h ? h.din : null; }
function pace() {
  const r = logs().filter(l => l.dur > 0).map(l => l.dur / logDin(l)).filter(x => isFinite(x) && x > 0.3 && x < 2.5).sort((a, b) => a - b);
  if (S.pace.mode === 'manual' || r.length < 3) return { f: S.pace.manual, n: r.length, auto: false };
  const mid = r.length >> 1; const med = r.length % 2 ? r[mid] : (r[mid - 1] + r[mid]) / 2;
  return { f: clamp(med, 0.5, 1.5), n: r.length, auto: true };
}
const yourTime = h => Math.round(h.din * pace().f / 5) * 5;

/* Dog */
function dogName() { return (S.dogName || '').trim(); }
function dogStatus(h) {
  const d = h.d;
  if (d.r === 'banned') return { s: 'no', label: 'Dogs not allowed' };
  if (d.t === 'no') return { s: 'no', label: 'Not for dogs' };
  if (d.t === 'care') return { s: 'care', label: 'Dog with care' };
  return { s: 'good', label: dogName() ? 'Good for ' + dogName() : 'Dog-friendly' };
}
function dogReasons(h) {
  const d = h.d, out = [];
  if (d.r === 'banned') out.push(['bad', 'Dogs are banned here, even on a leash.']);
  else if (d.r === 'leash') out.push(['warn', 'Leash required' + (d.src === 'rule' ? ' (park or local rule).' : ' (protected area).')]);
  else out.push(['good', 'No known dog ban. Leash near wildlife, livestock and crowds.']);
  if (d.t === 'no') out.push(['bad', 'Terrain unsuitable for a medium-size dog (ladders, chains, scrambling or steep metal stairs).']);
  else if (d.t === 'care') out.push(['warn', 'Some sections need care: exposed, narrow, scree or grated steps.']);
  else out.push(['good', 'Terrain fine for a medium-size dog.']);
  if (d.cow) out.push(['warn', 'Cattle pastures in summer: dog on a short leash, keep distance from mother cows, let go of the leash if cows charge.']);
  if (d.h2o) out.push(['good', 'Water along the way.']); else if (h.km > 8) out.push(['warn', 'Little or no water on the route: carry enough for the dog.']);
  if (h.din > 360 || h.up > 1200) out.push(['warn', 'Long, big day. Build up to it and watch the paws on rock.']);
  if (h.lo < 900 && h.ss[0] <= 6 && h.up > 600) out.push(['warn', 'Low start: hot in summer. Go early.']);
  if (h.lift) out.push(['', 'Lifts and boats: dogs usually ride with a ticket; Italian lifts and the Königssee boats ask for a muzzle.']);
  return out;
}

/* Drive time from home */
let DRIVE = {};
const homeKey = () => S.home.lat.toFixed(3) + ',' + S.home.lon.toFixed(3);
const driveEst = h => Math.round(15 + hav([S.home.lat, S.home.lon], h.start) * 1.35 / 78 * 60);
const driveMin = h => DRIVE[h.id] ?? driveEst(h);
async function loadDrive() {
  const cache = LS.get('drive', {});
  if (cache.key === homeKey()) DRIVE = cache.m || {};
  else DRIVE = {};
  const todo = HK.filter(h => DRIVE[h.id] == null);
  for (let i = 0; i < todo.length; i += 80) {
    const chunk = todo.slice(i, i + 80);
    const coords = [[S.home.lon, S.home.lat], ...chunk.map(h => [h.start[1], h.start[0]])].map(c => c[0].toFixed(5) + ',' + c[1].toFixed(5)).join(';');
    try {
      const r = await fetchT(`https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=duration`, {}, 25000);
      const j = await r.json();
      if (j.code !== 'Ok') throw new Error(j.code);
      j.durations[0].slice(1).forEach((s, k) => { if (s != null) DRIVE[chunk[k].id] = Math.round(s / 60); });
    } catch (e) { console.warn('drive times', e); break; }
    await sleep(1100);
  }
  LS.set('drive', { key: homeKey(), m: DRIVE });
}

/* ───────────── Weather ───────────── */
const OM = 'https://api.open-meteo.com/v1/forecast';
let WX = null; let wxDay = 0;
function wmo(c) {
  if (c == null) return ['w-cloud', 'No data'];
  if (c === 0) return ['w-sun', 'Clear'];
  if (c === 1) return ['w-sun', 'Mostly clear'];
  if (c === 2) return ['w-part', 'Partly cloudy'];
  if (c === 3) return ['w-cloud', 'Overcast'];
  if (c === 45 || c === 48) return ['w-fog', 'Fog'];
  if (c >= 51 && c <= 57) return ['w-drizzle', 'Drizzle'];
  if (c >= 61 && c <= 67) return ['w-rain', 'Rain'];
  if (c >= 80 && c <= 82) return ['w-rain', 'Showers'];
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return ['w-snow', 'Snow'];
  if (c >= 95) return ['w-storm', 'Thunderstorms'];
  return ['w-cloud', 'Cloudy'];
}
function dayScore(w, i) {
  if (!w || w.code[i] == null) return null;
  let s = 100;
  const pp = w.pp[i] ?? 0, ps = w.ps[i] ?? 0, code = w.code[i], sun = (w.sun[i] ?? 0) / 3600, g = w.gust[i] ?? 0, tx = w.tx[i];
  s -= Math.min(45, pp * 0.45); s -= Math.min(30, ps * 5);
  if (code >= 95) s -= 35; else if ((code >= 71 && code <= 77) || code === 85 || code === 86) s -= 20; else if (code === 45 || code === 48) s -= 10;
  if (sun < 3) s -= (3 - sun) * 6;
  if (g > 45) s -= Math.min(30, (g - 45) * 0.8);
  if (tx != null && tx < 0) s -= 12;
  return clamp(Math.round(s), 0, 100);
}
const scoreCls = s => s == null ? '' : s >= 75 ? 's-great' : s >= 55 ? 's-good' : s >= 35 ? 's-mixed' : 's-poor';
const scoreWord = s => s == null ? '' : s >= 75 ? 'Great' : s >= 55 ? 'Good' : s >= 35 ? 'Mixed' : 'Poor';
function toArr(j) { return Array.isArray(j) ? j : [j]; }
async function loadOverview(force = false) {
  const c = LS.get('wxov');
  const fresh = c && c.v === 2 && Date.now() - c.ts < 2 * 3600e3;
  if (fresh && !force) { WX = c; if (HK.every(h => WX.by[h.id])) return WX; }
  const list = force || !fresh ? HK : HK.filter(h => !WX.by[h.id]);
  const by = fresh && !force ? WX.by : {};
  let days = fresh && !force ? WX.days : null;
  for (let i = 0; i < list.length; i += 50) {
    const ch = list.slice(i, i + 50);
    const qs = new URLSearchParams({
      latitude: ch.map(h => h.top[0].toFixed(4)).join(','), longitude: ch.map(h => h.top[1].toFixed(4)).join(','),
      elevation: ch.map(h => Math.round(h.mx || 1000)).join(','),
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunshine_duration,wind_gusts_10m_max',
      timezone: 'Europe/Berlin', forecast_days: '7'
    });
    const r = await fetchT(OM + '?' + qs, {}, 25000);
    if (!r.ok) throw new Error('Weather service answered ' + r.status);
    toArr(await r.json()).forEach((res, k) => {
      const d = res.daily; days = d.time;
      by[ch[k].id] = { code: d.weather_code, tx: d.temperature_2m_max, tn: d.temperature_2m_min, ps: d.precipitation_sum, pp: d.precipitation_probability_max, sun: d.sunshine_duration, gust: d.wind_gusts_10m_max };
    });
  }
  WX = { v: 2, ts: Date.now(), days, by };
  LS.set('wxov', WX);
  return WX;
}
const WXD = {};
async function loadDetailWx(h) {
  const k = h.id + JSON.stringify(h.p) + h.mx;
  if (WXD[k] && Date.now() - WXD[k].ts < 45 * 6e4) return WXD[k];
  const qs = new URLSearchParams({
    latitude: h.start[0].toFixed(4) + ',' + h.top[0].toFixed(4), longitude: h.start[1].toFixed(4) + ',' + h.top[1].toFixed(4),
    elevation: Math.round(h.lo || 800) + ',' + Math.round(h.mx || h.lo || 1000),
    hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_gusts_10m,freezing_level_height,cape',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunshine_duration,wind_gusts_10m_max,sunrise,sunset,uv_index_max',
    timezone: 'Europe/Berlin', forecast_days: '7'
  });
  const r = await fetchT(OM + '?' + qs, {}, 20000);
  if (!r.ok) throw new Error('Weather service answered ' + r.status);
  const [a, b] = toArr(await r.json());
  return (WXD[k] = { ts: Date.now(), th: a, top: b || a });
}
const wxOf = h => WX && WX.by[h.id];
