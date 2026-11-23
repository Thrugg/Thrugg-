/* Prisme — entry point. The catalogue, market data, weekly offers and news come from data/; everything personal from store.js. */
import { load, flush, KEY, S } from './store.js';
import { init, render, refreshSession, setNews } from './ui.js';
import { setData } from './engine.js';

load();
const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
let CAT = { items: [] }, MKT = null, PRE = null;
/* products the person had Claude research join the catalogue on this device */
const apply = () => setData({ items: [...(CAT.items || []), ...(S.custom || [])] }, MKT, PRE);
window.addEventListener('prisme:custom', () => { apply(); render(); });
window.addEventListener('prisme:market', () => render());
Promise.all([get('data/catalog.json').catch(() => ({ items: [] })), get('data/market.json').catch(() => null), get('data/prebuilts.json').catch(() => ({ items: [] }))]).then(([c, m, p]) => {
  CAT = c; MKT = m; PRE = p; apply(); init();
  get('data/news.json').then(n => { setNews(n); if (S.ui.tab === 'pulse') render(); }).catch(() => { });
});

/* Sync through the hub's cloud.js. The open tab and filters stay on each device. */
let mirror = null;
window.appSync = () => {
  if (!window.Cloud || !window.Cloud.configured()) return;
  if (!mirror) mirror = window.Cloud.mirror('prisme', KEY, { ignore: ['ui'], onRemote: () => { load(); apply(); render(); } });
  else mirror.sync();
};
if (window.Cloud) { window.Cloud.on(() => refreshSession()); window.appSync(); }
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

/* a bar at the top, never a silent swap, when a new version is ready or the device refuses to store data */
const bar = (msg, action) => { const el = document.getElementById('notice'); el.innerHTML = ''; const s = document.createElement('span'); s.textContent = msg; el.append(s); if (action) { const b = document.createElement('button'); b.className = 'btn sm'; b.textContent = action; b.onclick = () => location.reload(); el.append(b); } el.hidden = false; };
window.addEventListener('app:savefail', () => bar(S.prof.lang === 'fr' ? 'Cet appareil refuse d\'enregistrer. Libérez de l\'espace ou exportez une sauvegarde depuis le profil.' : 'This device refused to save. Free some storage, or export a backup from the profile.'));
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => { });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) bar(S.prof.lang === 'fr' ? 'Une nouvelle version est prête.' : 'A new version is ready.', S.prof.lang === 'fr' ? 'Recharger' : 'Reload'); });
}
