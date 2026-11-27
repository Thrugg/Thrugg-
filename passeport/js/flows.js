/* Passeport — the moments: validating a visit with a photo (and the stamp falling on the page), a stamp's own page,
   the postcard, and sharing or opening a link that carries a list or a whole trip. */
import { S, save } from './store.js';
import { t } from './i18n.js';
import { A, $, esc, fmtDay, fmtDate, fmtTime, catName, catColor, photo, toast, dialog, closeDialog, vibrate } from './app.js';
import { locate, pickPhoto, readExif, shrink, judge, putPhoto, getPhoto, delPhoto } from './camera.js';
import { stampSVG, badges, points, INK_FILTER } from './stamp.js';
import { makePostcard } from './postcard.js';
import { pack, unpack, cleanShare } from './plan.js';
import { renderSpot, refreshMap, renderTabs, rerenderAll } from './ui.js';
import { renderPanel } from './views.js';

const urls = new Map();
export async function visitPhotoUrl(id, kind = 'thumb') {
  const key = id + ':' + kind;
  if (urls.has(key)) return urls.get(key);
  const rec = await getPhoto(id); if (!rec) return null;
  const u = URL.createObjectURL(kind === 'full' ? rec.full : rec.thumb || rec.full); urls.set(key, u); return u;
}
const forget = id => { for (const k of ['thumb', 'full']) { const u = urls.get(id + ':' + k); if (u) { URL.revokeObjectURL(u); urls.delete(id + ':' + k); } } };

/* ---- validate a visit ---- */
async function validate(id) {
  const s = A.spot.get(id); if (!s) return;
  const where = locate(15000);                       // the GPS starts while the camera opens
  const file = await pickPhoto($('#cam'));
  if (!file) { toast(t('v.noPhoto')); return; }
  toast(t('v.checking'), 6000);
  const before = badges(A.data.spots, S.visits, { christmas: A.listSet.christmas, chic: A.listSet.chic }).filter(b => b.n >= b.of).map(b => b.id);
  let full, thumb, exif;
  try { [exif, full, thumb] = await Promise.all([readExif(file), shrink(file, 1600, 0.82), shrink(file, 480, 0.8)]); }
  catch (e) { toast(t('v.unreadable')); return; }
  const pos = await where;
  const j = judge(s, pos, exif);
  try { await putPhoto(id, { full, thumb, at: j.at }); forget(id); } catch (e) { toast(t('v.noStore')); }
  S.visits[id] = { at: j.at, how: j.how, d: j.d ?? null, acc: j.acc ?? null, duo: false, photo: true };
  if (S.mine[id] === 'want' || S.mine[id] === 'must') { /* keep it in the list: it shows as done */ }
  save(true);
  const after = badges(A.data.spots, S.visits, { christmas: A.listSet.christmas, chic: A.listSet.chic }).filter(b => b.n >= b.of && !before.includes(b.id));
  stampFx(s, S.visits[id], j, after);
  renderTabs(); refreshMap(); renderSpot();
}

/* the stamp falls on the page */
function stampFx(s, v, j, newBadges) {
  const fx = $('#fx'); $('#toast').classList.remove('on');
  const msg = j.how === 'geo' ? t('v.geo', { d: j.d }) : j.how === 'exif' ? t('v.exif') : t('v.self.' + (j.why || 'far'));
  fx.innerHTML = `<div class="fx-card" role="dialog" aria-live="polite"><div class="fx-paper"><div class="fx-stamp">${stampSVG(s, v, { color: catColor(s.c), lang: S.lang })}</div></div>
    <h2>${esc(j.how === 'self' ? t('v.titleSelf') : t('v.title'))}</h2><p>${esc(msg)}</p><p class="pts">+${points(s, v)} ${esc(t('pp.points'))}</p>
    ${newBadges.map(b => `<p class="newb">🏅 ${esc(t('v.badge', { b: t('b.' + b.id) }))}</p>`).join('')}
    <div class="stack row"><button class="btn" data-act="fx-close">${esc(t('a.close'))}</button><button class="btn gold" data-act="postcard" data-id="${s.id}">${esc(t('a.postcard'))}</button></div></div>`;
  fx.hidden = false; requestAnimationFrame(() => fx.classList.add('on'));
  setTimeout(() => vibrate([12, 40, 30]), A.reduced ? 0 : 420);
}

/* ---- a stamp's page ---- */
async function stampPage(id) {
  const s = A.spot.get(id), v = S.visits[id]; if (!s || !v) return;
  const img = v.photo ? await visitPhotoUrl(id, 'full') : null;
  const how = v.how === 'geo' ? t('v.howGeo', { d: v.d ?? '?' }) : v.how === 'exif' ? t('v.howExif') : t('v.howSelf');
  dialog(`<div class="stamppage"><div class="sp-photo">${img ? `<img src="${img}" alt="">` : photo(s, 'l')}<div class="sp-stamp">${stampSVG(s, v, { color: catColor(s.c), lang: S.lang })}</div></div>
    <div class="pad"><h2>${esc(s.n)}</h2><p class="muted">${esc(fmtDate(new Date(v.at)))} · ${esc(fmtTime(new Date(v.at)))} · ${esc(how)}</p>
    <label class="check"><input type="checkbox" data-duo="${id}" ${v.duo ? 'checked' : ''}> ${esc(t('v.duo'))}</label>
    <div class="stack row"><button class="btn gold" data-act="postcard" data-id="${id}">${esc(t('a.postcard'))}</button><button class="btn" data-act="open" data-id="${id}">${esc(t('a.seePlace'))}</button>${v.how === 'self' ? `<button class="btn" data-act="validate" data-id="${id}">${esc(t('v.retry'))}</button>` : ''}</div>
    <div class="stack row end"><button class="btn ghost sm" data-act="unvisit" data-id="${id}">${esc(t('v.remove'))}</button><button class="btn sm" data-act="dlg-close">${esc(t('a.close'))}</button></div></div></div>`, 'wide');
}

/* ---- the postcard ---- */
async function postcard(id) {
  const s = A.spot.get(id), v = S.visits[id]; if (!s) return;
  toast(t('pc.making'), 5000);
  const rec = v && v.photo ? await getPhoto(id) : null;
  try {
    const blob = await makePostcard({
      photo: rec ? rec.full : null, photoUrl: s.ph ? s.ph.l : null,
      stampSvg: v ? stampSVG(s, v, { color: catColor(s.c), lang: S.lang, defs: true }) : null,
      title: s.n, place: s.a ? `${s.a} · ${catName(s.c)}` : catName(s.c), date: v ? fmtDate(new Date(v.at)) : fmtDate(new Date()),
      greeting: t('pc.greeting'), footer: S.name ? `PASSEPORT · ${S.name.toUpperCase()}` : 'PASSEPORT · PARIS'
    });
    const file = new File([blob], `passeport-${id}.jpg`, { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    dialog(`<div class="pad"><img class="pc" src="${url}" alt="${esc(t('a.postcard'))}"><div class="stack row end">${navigator.canShare && navigator.canShare({ files: [file] }) ? `<button class="btn gold" data-act="pc-share">${esc(t('a.share'))}</button>` : ''}<a class="btn" href="${url}" download="passeport-${id}.jpg">${esc(t('pc.save'))}</a><button class="btn ghost" data-act="dlg-close">${esc(t('a.close'))}</button></div></div>`, 'wide');
    $('#dlg')._pc = file;
  } catch (e) { toast(t('pc.fail')); }
}

/* ---- share links ---- */
export async function shareLink(payload, title) {
  try {
    const code = await pack({ ...payload, from: S.name || undefined });
    const url = location.origin + location.pathname + '#share=' + code;
    if (navigator.share) { try { await navigator.share({ title: 'Passeport · ' + title, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    await navigator.clipboard.writeText(url); toast(t('share.copied'));
  } catch (e) { toast(t('share.fail')); }
}
export async function openShared(code) {
  let x;
  try { x = cleanShare(await unpack(code), new Set(A.data.spots.map(s => s.id))); } catch (e) { toast(t('share.bad')); return; }
  const nMine = x.mine ? Object.keys(x.mine).length : 0, days = x.trip ? Object.values(x.trip.days).filter(d => d.stops.length || d.t).length : 0;
  dialog(`<div class="pad"><h2>${esc(t('share.h'))}</h2><p>${esc(x.from ? t('share.from', { n: x.from }) : t('share.anon'))}</p><ul class="plain">${nMine ? `<li>★ ${esc(t('share.mine', { n: nMine }))}</li>` : ''}${x.trip ? `<li>✈︎ ${esc(t('share.trip', { a: fmtDay(x.trip.start), b: fmtDay(x.trip.end), n: days }))}</li>` : ''}</ul>
    ${x.trip && S.trip ? `<p class="muted small">${esc(t('share.replace'))}</p>` : ''}<div class="stack row end"><button class="btn ghost" data-act="dlg-close">${esc(t('a.cancel'))}</button><button class="btn gold" data-act="share-accept" autofocus>${esc(t('share.accept'))}</button></div></div>`);
  $('#dlg')._share = x;
}

export async function flowAct(act, b) {
  const id = b.dataset.id;
  switch (act) {
    case 'validate': closeDialog(); await validate(id); return true;
    case 'stamp': await stampPage(id); return true;
    case 'postcard': { const fx = $('#fx'); fx.classList.remove('on'); fx.hidden = true; await postcard(id); return true; }
    case 'pc-share': { const f = $('#dlg')._pc; if (f) { try { await navigator.share({ files: [f], title: 'Passeport' }); } catch (e) { } } return true; }
    case 'fx-close': { const fx = $('#fx'); fx.classList.remove('on'); setTimeout(() => { fx.hidden = true; fx.innerHTML = ''; }, 250); return true; }
    case 'unvisit': if (confirm(t('v.removeSure'))) { delete S.visits[id]; await delPhoto(id); forget(id); save(true); closeDialog(); renderTabs(); refreshMap(); if (A.selected === id) renderSpot(); renderPanel(); } return true;
    case 'share-spot': { const s = A.spot.get(id); const url = location.origin + location.pathname + '#s=' + id; if (navigator.share) { try { await navigator.share({ title: s.n, text: s.why, url }); } catch (e) { } } else { await navigator.clipboard.writeText(url); toast(t('share.copied')); } return true; }
    case 'share-accept': {
      const x = $('#dlg')._share; if (!x) return true;
      if (x.mine) for (const [k, v] of Object.entries(x.mine)) if (!S.mine[k] || v === 'must') S.mine[k] = v;
      if (x.trip) S.trip = x.trip;
      save(true); closeDialog(); history.replaceState(null, '', location.pathname); toast(t('share.done')); rerenderAll(); return true;
    }
  }
  return false;
}
document.addEventListener('change', e => {
  const id = e.target.dataset && e.target.dataset.duo; if (!id || !S.visits[id]) return;
  S.visits[id].duo = e.target.checked; save(); renderPanel();
});
