/* Grand Tour service worker: network first, cache as a fallback so the atlas opens without signal.
   The real map and the place lookup come from other sites and are not cached; the compass works offline. */
const V = 'grandtour-2026.11.14a';
const CORE = ['./', 'index.html', 'app.css', 'js/main.js', 'js/ui.js', 'js/engine.js', 'js/atlas.js', 'js/store.js', 'js/i18n.js', 'fonts/cormorant-garamond.woff2', 'fonts/cormorant-garamond-italic.woff2', 'fonts/figtree.woff2', 'manifest.webmanifest', 'icon-192.png', '../cloud.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('grandtour-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
