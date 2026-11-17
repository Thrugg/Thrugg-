/* Écurie — entry point. The checked list and market prices come from data/; everything personal from store.js. */
import { load, flush, KEY, S } from './store.js';
import { init, render, refreshSession, setData } from './ui.js';

load();
const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
Promise.all([get('data/cars.json').catch(() => []), get('data/market.json').catch(() => null)]).then(([cars, meta]) => { setData(cars, meta); init(); });

/* Sync through the hub's cloud.js. The open tab and the compare ticks stay on each device. */
let mirror = null;
window.appSync = () => {
  if (!window.Cloud || !window.Cloud.configured()) return;
  if (!mirror) mirror = window.Cloud.mirror('ecurie', KEY, { ignore: ['ui'], onRemote: () => { load(); render(); } });
  else mirror.sync();
};
if (window.Cloud) { window.Cloud.on(() => refreshSession()); window.appSync(); }
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

/* a bar at the top, never a silent swap, when a new version is ready or the device refuses to store data */
const bar = (msg, action) => { const el = document.getElementById('notice'); el.innerHTML = ''; const s = document.createElement('span'); s.textContent = msg; el.append(s); if (action) { const b = document.createElement('button'); b.className = 'btn sm'; b.textContent = action; b.onclick = () => location.reload(); el.append(b); } el.hidden = false; };
window.addEventListener('app:savefail', () => bar('This device refused to save. Free some storage, or export a backup from Profile.'));
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => { });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) bar('A new version is ready.', 'Reload'); });
}
