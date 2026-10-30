/* Forge — entry point. */
import { load, KEY, S } from './store.js';
import { init, render, paintSync } from './ui.js';
import { setLang } from './i18n.js';

load();
if (window.Cloud) {
  const mirror = window.Cloud.mirror('forge', KEY, { onRemote: () => { load(); setLang(S.profile.lang); render(); } });
  window.forgeSync = () => mirror.pull && mirror.pull();
  window.Cloud.on(() => paintSync());
}
init();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
