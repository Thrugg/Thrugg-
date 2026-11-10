/* Cordée offline support.
   The app itself, the catalogue and the libraries: the network is tried first, the last good copy is used
   without signal. Map tiles and terrain: kept as you look at them (newest 2,500), so an area you opened at
   home still draws on the trail. Weather: the last forecast you loaded is shown when there is no signal.
   Sign-in, sync, routing and place search always go to the network. */
const V = 'cordee-2026.11.10d', TILES = 'cordee-tiles-1', TILE_MAX = 2500;
const CORE = ['./', 'index.html', 'data/hikes.json', 'cloud.js', 'manifest.webmanifest', 'icon-192.png'];
const LIBS = ['unpkg.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];
/* Only the two sources whose terms plainly allow keeping copies: the OpenFreeMap base map (the default "Cordée" style)
   and the open terrain tiles. Satellite, OpenTopoMap, swisstopo and the trails overlay need signal. */
const TILE_HOSTS = ['tiles.openfreemap.org', 's3.amazonaws.com'];
const WEATHER = ['api.open-meteo.com'];
const has = (list, host) => list.some(h => host === h || host.endsWith('.' + h));
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('cordee-') && k !== V && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
let puts = 0;
async function trim() { const c = await caches.open(TILES), ks = await c.keys(); for (let i = 0; i < ks.length - TILE_MAX; i++) await c.delete(ks[i]); }
const netFirst = (req, name, own) => fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(name).then(c => c.put(req, copy)); } return r; }).catch(() => caches.match(req, { ignoreSearch: !!own }).then(r => r || Response.error()));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  /* the hub's other apps look after themselves */
  if (u.origin === location.origin) { if (/\/(forge|safety-net|gains-greeks)\//.test(u.pathname)) return; e.respondWith(netFirst(req, V, true)); return; }
  if (has(LIBS, u.hostname) || has(WEATHER, u.hostname)) { e.respondWith(netFirst(req, V, false)); return; }
  if (has(TILE_HOSTS, u.hostname) && (u.hostname !== 's3.amazonaws.com' || u.pathname.startsWith('/elevation-tiles-prod/'))) {
    e.respondWith(caches.open(TILES).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { c.put(req, r.clone()); if (++puts % 200 === 0) trim(); } return r; }))));
  }
});
