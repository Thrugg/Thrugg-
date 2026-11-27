/* Passeport — entry point: the saved passport, the guide (data/paris.json), sync, links that open a place or bring a
   shared list or trip, and the offline copy. */
import { load, flush, KEY, S } from './store.js';
import { setLang, t } from './i18n.js';
import { A, $, index, localize, shellText, photoFallbacks } from './app.js';
import { start, rerenderAll, openSpot, applyTheme } from './ui.js';
import { openShared } from './flows.js';

load(); setLang(S.lang); shellText(); photoFallbacks();
applyTheme();
$('[data-act=three-d]').classList.toggle('on', S.ui.threeD !== false);
/* older browsers without overflow: clip may still scroll the shell when a field takes focus: put it back */
$('#app').addEventListener('scroll', e => { if (e.target === e.currentTarget && (e.target.scrollTop || e.target.scrollLeft)) e.target.scrollTo(0, 0); });

/* A bar at the top, never a silent swap, when a new version is ready or the phone refuses to store data. */
function bar(msg, action, fn) {
  const el = $('#notice'); el.innerHTML = '';
  const s = document.createElement('span'); s.textContent = msg; el.append(s);
  if (action) { const b = document.createElement('button'); b.className = 'btn sm'; b.textContent = action; b.onclick = fn; el.append(b); }
  el.hidden = false;
}
window.addEventListener('app:savefail', () => bar(t('shell.saveFail')));

async function guide() {
  const r = await fetch('data/paris.json');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

function fromHash() {
  const h = location.hash;
  if (h.startsWith('#share=')) { openShared(h.slice(7)); return; }
  const m = h.match(/^#s=([a-z0-9-]+)/);
  if (m && A.spot.has(m[1])) openSpot(m[1]);
}

async function boot() {
  let data;
  try { data = await guide(); }
  catch (e) {
    $('#sheetBody').innerHTML = `<div class="pad"><p>${t('shell.dataFail')}</p><button class="btn gold" id="retry">${t('shell.retry')}</button></div>`;
    $('#retry').onclick = () => { $('#sheetBody').innerHTML = `<p class="muted">${t('shell.loading')}</p>`; boot(); };
    return;
  }
  index(data); localize();

  /* Sync through the hub's cloud.js: the passport, lists, notes and trip follow the person between phones. What is shown
     on screen (tab, filters) stays on each device, and the photos stay on the phone that took them. */
  let mirror = null;
  window.appSync = () => {
    if (!window.Cloud || !window.Cloud.configured()) return;
    if (!mirror) mirror = window.Cloud.mirror('passeport', KEY, { ignore: ['ui'], onRemote: () => { load(); rerenderAll(); } });
    else mirror.sync();
  };
  if (window.Cloud) {
    window.Cloud.on(() => { const b = document.querySelector('[data-act=sync]'); if (b) b.textContent = window.Cloud.status === 'ok' ? t('set.synced') : t('set.signin'); });
    window.appSync();
  }

  await start();
  if (location.hash.startsWith('#share=')) fromHash();
  window.addEventListener('hashchange', fromHash);
}
boot();

window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => { });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) bar(t('shell.update'), t('shell.reload'), () => location.reload()); });
}
