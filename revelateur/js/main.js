/* Révélateur — entry point. */
import { load, flush, KEY, S } from './store.js';
import { init, refreshSession, onRemote, toast } from './ui.js';

load();

/* Sync through the hub's cloud.js: settings, presets and the learned taste. The open panel stays on each device. */
let mirror = null;
window.appSync = () => {
  if (!window.Cloud || !window.Cloud.configured()) return;
  if (!mirror) mirror = window.Cloud.mirror('revelateur', KEY, { ignore: ['ui'], onRemote: () => { load(); onRemote(); } });
  else mirror.sync();
};
if (window.Cloud) { window.Cloud.on(() => refreshSession()); window.appSync(); }
init();
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
window.addEventListener('app:savefail', () => toast('This device refused to save the settings'));

const bar = (msg, action) => { const el = document.getElementById('notice'); el.innerHTML = ''; const s = document.createElement('span'); s.textContent = msg; el.append(s); if (action) { const b = document.createElement('button'); b.className = 'btn sm'; b.textContent = action; b.onclick = () => location.reload(); el.append(b); } el.hidden = false; };
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => { });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) bar('A new version is ready.', 'Reload'); });
}
