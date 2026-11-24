/* Prisme service worker: network first, cache as a fallback, so the catalogue, your gear and the builder open without
   signal. Asking Claude and the shop links need signal. The text reader (Tesseract, shared with Écurie) is cached the
   first time a screenshot is read. */
const V = 'prisme-2026.11.24c';
const CORE = ['./', 'index.html', 'app.css', 'js/main.js', 'js/ui.js', 'js/engine.js', 'js/store.js', 'js/i18n.js', 'js/ocr.js', 'js/guide.js', 'data/catalog.json', 'data/market.json', 'data/prebuilts.json', 'data/news.json', 'fonts/barlow-400.woff2', 'fonts/barlow-500.woff2', 'fonts/barlow-600.woff2', 'fonts/barlow-700.woff2', 'fonts/martian-mono.woff2', 'manifest.webmanifest', 'icon-192.png', '../cloud.js', '../ask.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('prisme-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
