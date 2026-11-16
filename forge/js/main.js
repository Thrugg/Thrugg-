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
/* Cordée's logged hikes count as a Forge workout (js/links.js); re-read each time Forge opens or comes back. */
import { cordeeWorkout, applyCordee } from './links.js';
import { save } from './store.js';
async function syncCordee() {
  let items = null; try { items = JSON.parse(localStorage.getItem('cordee.items')); } catch (e) { }
  if (!items && !S.activity.workouts.some(w => w.src === 'cordee')) return;
  let hikes = {};
  try { const r = await fetch('../data/hikes.json'); if (r.ok) for (const h of await r.json()) hikes[h.id] = { up: h.up, km: h.km }; } catch (e) { }
  const d = new Date(), td = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (applyCordee(S.activity.workouts, cordeeWorkout(items, hikes, td))) { save(); render(); }
}
if (S.profile.onboarded) syncCordee();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.profile.onboarded) syncCordee(); });
/* Ask the browser to keep Forge's data (granted most readily to apps on the Home Screen). People who onboarded before this existed get it too. */
if (S.profile.onboarded) navigator.storage?.persist?.().catch(() => { });

/* A bar at the top, never a silent swap: when a new version has been installed in the background, or when the
   device refuses to store data, the person is told and decides when to reload. */
const bar = (msg, action) => { const el = document.getElementById('notice'); if (!el) return; el.innerHTML = ''; const s = document.createElement('span'); s.textContent = msg; el.append(s); if (action) { const b = document.createElement('button'); b.className = 'btn sm'; b.dataset.act = 'reload'; b.textContent = action; el.append(b); } el.hidden = false; };
window.addEventListener('forge:savefail', () => bar(t('shell.saveFail')));
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => { });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) bar(t('shell.update'), t('shell.reload')); });
}
