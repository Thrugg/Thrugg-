/* Funds Ladder service worker: network first, cache as a fallback so the app opens without signal. */
const V = 'ladder-2026.11.14b';
const CORE = ['./', 'index.html', 'app.css', 'js/main.js', 'js/ui.js', 'js/engine.js', 'js/store.js', 'js/i18n.js', 'fonts/bricolage-grotesque.woff2', 'fonts/instrument-sans.woff2', 'fonts/ibm-plex-mono.woff2', 'manifest.webmanifest', 'icon-192.png', '../cloud.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('ladder-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
