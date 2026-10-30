/* Forge service worker: network first, cache as a fallback so the app opens offline (gym basements). */
const V = 'forge-2026.10.30';
const CORE = ['./', 'index.html', 'app.css', 'js/main.js', 'js/ui.js', 'js/calc.js', 'js/data.js', 'js/i18n.js', 'js/store.js', 'js/charts.js', 'js/health.js', 'js/photo.js', 'vendor/fflate.min.js', 'manifest.webmanifest', 'icon-192.png', '../cloud.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('forge-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
