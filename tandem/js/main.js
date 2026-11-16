/* Tandem — entry point. */
import { load, flush, KEY, S } from './store.js';
import { init, render, refreshSession, flushPush, pullPartner } from './ui.js';
import { setLang, t } from './i18n.js';

load(); setLang(S.lang);

/* Sync through the hub's cloud.js. Which tab is open stays on each device. Nothing is uploaded before the learner has
   changed something: until then there is no saved state. */
let mirror = null;
window.appSync = () => {
  if (!window.Cloud || !window.Cloud.configured()) return;
  if (!mirror) mirror = window.Cloud.mirror('tandem', KEY, { ignore: ['ui'], onRemote: () => { const tab = S.ui.tab; load(); S.ui.tab = tab; setLang(S.lang); render(); pullPartner(); } });
  else mirror.sync();
};
if (window.Cloud) { window.Cloud.on(() => refreshSession()); window.appSync(); }
init();
pullPartner();
window.addEventListener('pagehide', () => { flush(); flushPush(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

/* A bar at the top, never a silent swap, when a new version is ready or the device refuses to store data. */
const bar = (msg, action) => { const el = document.getElementById('notice'); el.innerHTML = ''; const s = document.createElement('span'); s.textContent = msg; el.append(s); if (action) { const b = document.createElement('button'); b.className = 'btn sm'; b.dataset.act = 'reload'; b.textContent = action; el.append(b); } el.hidden = false; };
window.addEventListener('app:savefail', () => bar(t('shell.saveFail')));
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => { });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) bar(t('shell.update'), t('shell.reload')); });
}
