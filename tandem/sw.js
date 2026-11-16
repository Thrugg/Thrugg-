/* Tandem service worker: network first, cache as a fallback so the day's cards open without signal.
   The partner link goes to Supabase, another site, and is never cached here. */
const V = 'tandem-2026.11.16a';
const CORE = ['./', 'index.html', 'app.css', 'js/main.js', 'js/ui.js', 'js/engine.js', 'js/decks.js', 'js/pair.js', 'js/store.js', 'js/i18n.js', 'vendor/ts-fsrs.mjs', 'fonts/literata-latin.woff2', 'fonts/literata-latin-ext.woff2', 'fonts/schibsted-grotesk-latin.woff2', 'fonts/schibsted-grotesk-latin-ext.woff2', 'manifest.webmanifest', 'icon-192.png', '../cloud.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tandem-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
