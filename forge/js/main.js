/* Forge — entry point. */
import { load, KEY, S } from './store.js';
import { init, render, paintSync } from './ui.js';
import { setLang, t } from './i18n.js';

load();
if (window.Cloud) {
  const mirror = window.Cloud.mirror('forge', KEY, { onRemote: () => { load(); setLang(S.profile.lang); render(); } });
  window.forgeSync = () => mirror.pull && mirror.pull();
  window.Cloud.on(() => paintSync());
}
init();

/* A bar at the top, never a silent swap: when a new version has been installed in the background, or when the
   device refuses to store data, the person is told and decides when to reload. */
const bar = (msg, action) => { const el = document.getElementById('notice'); if (!el) return; el.innerHTML = ''; const s = document.createElement('span'); s.textContent = msg; el.append(s); if (action) { const b = document.createElement('button'); b.className = 'btn sm'; b.dataset.act = 'reload'; b.textContent = action; el.append(b); } el.hidden = false; };
window.addEventListener('forge:savefail', () => bar(t('shell.saveFail')));
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => { });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) bar(t('shell.update'), t('shell.reload')); });
}
