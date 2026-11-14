/* Sillage service worker: network first, cache as a fallback so the wardrobe opens without signal.
   The forecast comes from another site and is not cached here; without it the pick goes by the season. */
const V = 'sillage-2026.11.14a';
const CORE = ['./', 'index.html', 'app.css', 'js/main.js', 'js/ui.js', 'js/engine.js', 'js/draw.js', 'js/store.js', 'js/i18n.js', 'fonts/bodoni-moda.woff2', 'fonts/bodoni-moda-italic.woff2', 'fonts/dm-sans.woff2', 'manifest.webmanifest', 'icon-192.png', '../cloud.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('sillage-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
