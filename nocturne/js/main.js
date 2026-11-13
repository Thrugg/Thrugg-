/* Nocturne — entry point. */
import { load, save, flush, KEY, S, syncChoice } from './store.js';
import { init, render, refreshSession } from './ui.js';
import { setLang, t } from './i18n.js';

/* "Delete on this device only": done here, before any sync starts, so the account's copy is never touched. */
try {
  if (sessionStorage.getItem('nocturne.wipe')) {
    sessionStorage.removeItem('nocturne.wipe');
    for (const k of [KEY, 'cloud.meta.nocturne', 'cloud.base.nocturne']) localStorage.removeItem(k);
  }
} catch (e) { }

load(); setLang(S.lang);

/* Sleep data only goes to the account once the person has said so on this device (Settings → Sync, or the question
   on the first screen). Which tab is open stays on each device. */
let mirror = null;
window.nocturneSync = () => {
  if (!window.Cloud || !window.Cloud.configured() || syncChoice() !== '1') return;
  if (!mirror) { save(true); mirror = window.Cloud.mirror('nocturne', KEY, { ignore: ['ui'], onRemote: () => { load(); render(); } }); }
  else mirror.sync();
};
if (window.Cloud) { window.Cloud.on(() => refreshSession()); window.nocturneSync(); }
init();
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
if (Object.keys(S.nights).length && !S.demo) navigator.storage?.persist?.().catch(() => { });

/* A bar at the top, never a silent swap, when a new version is ready or the device refuses to store data. */
const bar = (msg, action) => { const el = document.getElementById('notice'); el.innerHTML = ''; const s = document.createElement('span'); s.textContent = msg; el.append(s); if (action) { const b = document.createElement('button'); b.className = 'btn sm'; b.dataset.act = 'reload'; b.textContent = action; el.append(b); } el.hidden = false; };
window.addEventListener('nocturne:savefail', () => bar(t('shell.saveFail')));
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => { });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) bar(t('shell.update'), t('shell.reload')); });
}
