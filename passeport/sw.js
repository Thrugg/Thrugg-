/* Passeport offline support.
   The app and the guide: network first, the last good copy without signal. Map tiles (OpenFreeMap) and the places'
   photos (Wikimedia Commons) are kept as you look at them, the newest ones only, so an area you opened at breakfast
   still draws in the métro. Weather, address search and sync always go to the network. Your own photos never pass
   through here: they are made on the phone and stay in its storage. */
const V = 'passeport-2026.11.27c', TILES = 'passeport-tiles-1', PHOTOS = 'passeport-photos-1';
const TILE_MAX = 3000, PHOTO_MAX = 900;
const CORE = ['./', 'index.html', 'app.css', 'data/paris.json', 'manifest.webmanifest', 'icon-192.png', '../cloud.js',
  'js/main.js', 'js/app.js', 'js/ui.js', 'js/views.js', 'js/flows.js', 'js/map.js', 'js/store.js', 'js/i18n.js', 'js/rules.js', 'js/sky.js', 'js/stamp.js', 'js/plan.js', 'js/camera.js', 'js/postcard.js',
  'fonts/bodoni-moda.woff2', 'fonts/bodoni-moda-italic.woff2', 'fonts/dm-sans.woff2', 'fonts/ibm-plex-mono.woff2'];
const LIB = 'unpkg.com', TILE_HOST = 'tiles.openfreemap.org', PHOTO_HOST = 'upload.wikimedia.org';

self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('passeport-') && ![V, TILES, PHOTOS].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const count = { [TILES]: 0, [PHOTOS]: 0 };
async function trim(name, max) { const c = await caches.open(name), ks = await c.keys(); for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]); }
const netFirst = (req, name, own) => fetch(req).then(r => {
  if (r.ok) { const copy = r.clone(); caches.open(name).then(c => c.put(req, copy)); }
  return r;
}).catch(() => caches.match(req, { ignoreSearch: !!own }).then(r => r || Response.error()));
const kept = (req, name, max) => caches.open(name).then(c => c.match(req).then(hit => hit || fetch(req).then(r => {
  if (r.ok) { c.put(req, r.clone()); if (++count[name] % 100 === 0) trim(name, max); }
  return r;
})));

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) { e.respondWith(netFirst(req, V, true)); return; }
  if (u.hostname === LIB) { e.respondWith(netFirst(req, V, false)); return; }
  /* tiles and glyphs (.pbf) are kept; the tile index, which names the current tile set, is fetched first */
  if (u.hostname === TILE_HOST) { e.respondWith(u.pathname.endsWith('.pbf') ? kept(req, TILES, TILE_MAX) : netFirst(req, V, false)); return; }
  if (u.hostname === PHOTO_HOST && req.mode === 'cors') { e.respondWith(kept(req, PHOTOS, PHOTO_MAX)); }
});
