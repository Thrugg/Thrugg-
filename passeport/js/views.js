/* Passeport — the full-screen tabs: Lists, Passport, Plan and Settings. */
import { S, save, saveUi, reset, exportBackup, importBackup } from './store.js';
import { t } from './i18n.js';
import { A, $, esc, today, fmtTime, fmtDay, fmtDayLong, fmtDate, fmtDist, catName, catColor, photo, stars, toast, dialog, closeDialog } from './app.js';
import { closedOn, eventsOn, hav, walkMin } from './rules.js';
import { stampSVG, points, rank, badges } from './stamp.js';
import { sunTimes } from './sky.js';
import { tripDays, parkOnce, dayWarnings, dayRoute, nav, fromTemplate } from './plan.js';
import * as M from './map.js';
import { card, openSpot, goTab, refreshMap, rerenderAll, applyTheme, listName } from './ui.js';
import { shareLink } from './flows.js';

let listOpen = null, planDay = null, flying = false;

export function renderPanel() {
  const el = $('#panel'), tab = S.ui.tab;
  if (tab === 'map') { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = tab === 'lists' ? lists() : tab === 'passport' ? passport() : tab === 'plan' ? plan() : settings();
  el.scrollTop = 0;
}

/* ---------- Lists ---------- */
function lists() {
  if (listOpen) return listPage(listOpen);
  const mine = A.data.spots.filter(s => S.mine[s.id]).sort((a, b) => (S.mine[a.id] === 'must' ? 0 : 1) - (S.mine[b.id] === 'must' ? 0 : 1) || b.i - a.i);
  const row = (id, title, sub, spots) => `<section class="lrow"><div class="lhead"><div><h2>${esc(title)}</h2><p class="muted">${esc(sub)}</p></div><button class="btn sm" data-act="list-open" data-id="${id}">${esc(t('l.all', { n: spots.length }))}</button></div><div class="cards">${spots.slice(0, 10).map(s => card(s, catName(s.c))).join('')}</div></section>`;
  return `<div class="pane"><header class="ph-h"><h1>${esc(t('tab.lists'))}</h1><button class="btn sm" data-act="search">⌕ ${esc(t('a.search'))}</button></header>
    ${mine.length ? row('mine', t('l.mine'), t('l.mineSub', { m: mine.filter(s => S.mine[s.id] === 'must').length, w: mine.filter(s => S.mine[s.id] === 'want').length }), mine)
      : `<section class="empty"><h2>${esc(t('l.mine'))}</h2><p>${esc(t('l.mineEmpty'))}</p></section>`}
    ${A.lists.map(l => row(l.id, S.lang === 'en' ? l.en : l.fr, S.lang === 'en' ? l.sub_en : l.sub_fr, l.ids.map(id => A.spot.get(id)).filter(Boolean))).join('')}
  </div>`;
}
function listSpots(id) {
  if (id === 'mine') return A.data.spots.filter(s => S.mine[s.id]).sort((a, b) => (S.mine[a.id] === 'must' ? 0 : 1) - (S.mine[b.id] === 'must' ? 0 : 1) || b.i - a.i);
  const l = A.lists.find(x => x.id === id); return l ? l.ids.map(i => A.spot.get(i)).filter(Boolean) : [];
}
function listPage(id) {
  const spots = listSpots(id), day = today();
  const title = id === 'mine' ? t('l.mine') : listName(id);
  return `<div class="pane"><header class="ph-h"><button class="round" data-act="list-back" aria-label="${esc(t('a.back'))}">‹</button><h1>${esc(title)}</h1>${id !== 'mine' ? `<button class="btn sm" data-act="list-map" data-id="${id}">${esc(t('l.onMap'))}</button>` : ''}</header>
    <ul class="rows">${spots.map(s => { const c = closedOn(s, day), v = S.visits[s.id]; return `<li><button data-act="open" data-id="${s.id}" class="${v ? 'v' : ''}">${photo(s, 's', 'th')}<span><b>${esc(s.n)}</b><small>${esc(catName(s.c))}${s.a ? ' · ' + esc(s.a) : ''}${c.s === 'closed' ? ' · <em class="bad">' + esc(t('st.closedToday')) + '</em>' : ''}${S.mine[s.id] === 'must' ? ' · ★' : ''}</small></span>${v ? '<i class="tick">✓</i>' : stars(s.i)}</button></li>`; }).join('') || `<li class="muted pad">${esc(t('l.empty'))}</li>`}</ul></div>`;
}

/* ---------- Passport ---------- */
function passport() {
  const vis = Object.entries(S.visits).map(([id, v]) => ({ s: A.spot.get(id), v })).filter(x => x.s).sort((a, b) => b.v.at.localeCompare(a.v.at));
  const pts = vis.reduce((a, x) => a + points(x.s, x.v), 0), r = rank(pts);
  const onsite = vis.filter(x => x.v.how !== 'self').length;
  const total = A.data.spots.length, pct = Math.round(100 * vis.length / total);
  const bs = badges(A.data.spots, S.visits, { christmas: A.listSet.christmas, chic: A.listSet.chic });
  const todo = A.data.spots.filter(s => s.i >= 4 && !S.visits[s.id]).sort((a, b) => b.i - a.i).slice(0, 12);
  const ring = (p, r0 = 34) => { const C = 2 * Math.PI * r0; return `<svg class="ring" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="${r0}"/><circle class="on" cx="40" cy="40" r="${r0}" stroke-dasharray="${(C * p / 100).toFixed(1)} ${C.toFixed(1)}"/></svg>`; };
  return `<div class="pane passport">
    <div class="cover"><div class="cv-top"><span>${esc(t('pp.republic'))}</span><span>${esc(t('pp.kind'))}</span></div>
      <div class="cv-mid"><div class="ringw">${ring(pct)}<b>${pct}<small>%</small></b></div><div><div class="cv-title">PASSEPORT</div><div class="cv-sub">Paris</div></div></div>
      <div class="cv-who"><span class="lab">${esc(t('pp.holder'))}</span><button class="link" data-act="pp-name">${esc(S.name || t('pp.noName'))}</button></div>
      <div class="cv-stats"><div><b>${vis.length}</b><span>${esc(t('pp.stamps'))}</span></div><div><b>${onsite}</b><span>${esc(t('pp.onsite'))}</span></div><div><b>${pts}</b><span>${esc(t('pp.points'))}</span></div></div>
      <div class="cv-rank"><b>${esc(t('rank.' + r.key))}</b>${r.next ? `<span>${esc(t('pp.next', { n: r.next.at - pts, r: t('rank.' + r.next.key) }))}</span><i style="--p:${Math.min(100, Math.round(100 * (pts - r.at) / (r.next.at - r.at)))}%"></i>` : `<span>${esc(t('pp.top'))}</span>`}</div>
    </div>
    <section><h2>${esc(t('pp.badges'))}</h2><div class="badges">${bs.map(b => `<div class="badge${b.n >= b.of ? ' got' : ''}" title="${esc(t('b.' + b.id + '.d'))}"><span class="bi">${esc(t('b.' + b.id + '.i'))}</span><span class="bt"><b>${esc(t('b.' + b.id))}</b><small>${b.n >= b.of ? '✓ ' + esc(t('pp.got')) : `${b.n}/${b.of} · ${esc(t('b.' + b.id + '.d'))}`}</small></span><i style="--p:${Math.round(100 * Math.min(1, b.n / b.of))}%"></i></div>`).join('')}</div></section>
    <section><h2>${esc(t('pp.pages'))}</h2>${vis.length ? `<div class="stamps">${vis.map(x => `<button class="st" data-act="stamp" data-id="${x.s.id}" aria-label="${esc(x.s.n)}">${stampSVG(x.s, x.v, { color: catColor(x.s.c), lang: S.lang })}</button>`).join('')}</div>` : `<p class="muted">${esc(t('pp.empty'))}</p>`}</section>
    <section><h2>${esc(t('pp.collect'))}</h2><p class="muted">${esc(t('pp.collectSub'))}</p><div class="stamps ghost">${todo.map(s => `<button class="st" data-act="open" data-id="${s.id}" aria-label="${esc(s.n)}">${stampSVG(s, null, {})}<span>${esc(s.n.replace(/\s*\(.*?\)/g, ''))}</span></button>`).join('')}</div></section>
  </div>`;
}

/* ---------- Plan ---------- */
/* ready-made trips from the guide, loaded in one tap */
function suggested(replace) {
  const ts = A.data.trips || []; if (!ts.length) return '';
  return `<section class="tpls"><h2>${esc(t('p.tplH'))}</h2>${ts.map(x => { const n = Object.keys(x.days).length, sp = Object.values(x.days).reduce((a, d) => a + d.stops.length, 0); return `<div class="tpl"><b>${esc(S.lang === 'en' ? x.en : x.fr)}</b><p class="muted small">${esc(S.lang === 'en' ? x.sub_en : x.sub_fr)}</p><p class="small">${esc(fmtDay(x.start))} → ${esc(fmtDay(x.end))} · ${esc(t('p.tplCount', { d: n, n: sp }))}</p><button class="btn ${replace ? '' : 'gold '}sm" data-act="trip-tpl" data-id="${esc(x.id)}">${esc(t(replace ? 'p.tplReplace' : 'p.tplUse'))}</button></div>`; }).join('')}</section>`;
}
function plan() {
  const tr = S.trip;
  if (!tr) return `<div class="pane"><header class="ph-h"><h1>${esc(t('tab.plan'))}</h1></header>${suggested(false)}
    <section class="hero-cta"><h2>${esc(t('p.startH'))}</h2><p>${esc(t('p.startP'))}</p>
      <label>${esc(t('p.from'))}<input type="date" id="tStart" value="${today()}"></label><label>${esc(t('p.to'))}<input type="date" id="tEnd"></label>
      <button class="btn gold wide" data-act="trip-create">${esc(t('p.create'))}</button><p class="muted small">${esc(t('p.importHint'))}</p></section></div>`;
  const days = tripDays(tr.start, tr.end);
  if (!planDay || !days.includes(planDay)) planDay = days.includes(today()) ? today() : days[0];
  const d = (tr.days || {})[planDay] || { t: '', note: '', stops: [] };
  const stops = (d.stops || []).map(id => A.spot.get(id)).filter(Boolean);
  const groups = parkOnce(stops, A.data.parking);
  const warns = dayWarnings(planDay, stops);
  const evs = eventsOn(A.data.events, planDay).filter(e => !['Closure', 'Practical'].includes(e.t));
  const sun = sunTimes(planDay, 48.8566, 2.3522);
  const route = dayRoute(groups.map(g => g.park || g.stops[0]), tr.base);
  const k = day => Math.round((new Date(day + 'T12:00:00Z') - new Date(tr.start + 'T12:00:00Z')) / 864e5) + 1;
  let n = 0;
  return `<div class="pane plan"><header class="ph-h"><div><h1>${esc(t('p.trip'))}</h1><p class="muted">${esc(fmtDay(tr.start))} → ${esc(fmtDay(tr.end))}${tr.base ? ' · ' + esc(t('p.baseShort', { b: tr.base.n })) : ''}</p></div><button class="btn sm" data-act="trip-edit">${esc(t('a.edit'))}</button></header>
    <div class="days">${days.map(x => { const c = ((tr.days || {})[x] || {}).stops || []; return `<button class="dchip${x === planDay ? ' on' : ''}${x === today() ? ' today' : ''}" data-act="plan-day" data-day="${x}"><small>${esc(fmtDay(x).split(' ')[0])}</small><b>${+x.slice(8)}</b>${c.length ? `<i>${c.length}</i>` : ''}</button>`; }).join('')}</div>
    <section class="dayc"><div class="dh"><span class="k">${esc(t('p.dayK', { k: k(planDay), n: days.length }))} · ${esc(fmtDayLong(planDay))}</span>
      <input class="dtitle${(d.t || '').length > 26 ? ' long' : ''}" data-dayfield="t" value="${esc(d.t || '')}" placeholder="${esc(t('p.titlePh'))}"></div>
      <div class="dmeta"><span>☀︎ ${fmtTime(sun.sunset)} · ${esc(t('p.dark', { t: fmtTime(sun.dusk) }))}</span>${evs.length ? `<button class="link" data-act="plan-events">❄ ${esc(t('p.events', { n: evs.length }))}</button>` : ''}</div>
      ${warns.length ? `<ul class="warns">${warns.map(w => `<li class="${w.c.s}">⚠︎ ${esc(t(w.c.s === 'closed' ? 'p.closed' : 'p.maybe', { n: w.s.n }))}</li>`).join('')}</ul>` : ''}
      ${groups.length ? groups.map(g => `<div class="grp">${g.park ? `<div class="park"><span class="P">P</span><span><b>${esc(g.park.n)}</b><small>${esc(t('p.parkOnce', { n: g.stops.length }))}</small></span><a class="mini" href="${nav(g.park.lat, g.park.lon).waze}" target="_blank" rel="noopener">Waze</a></div>` : ''}
        <ol class="stops" start="${n + 1}">${g.stops.map((s, j) => { n++; return `<li><button class="sp" data-act="open" data-id="${s.id}">${photo(s, 's', 'th')}<span><b>${esc(s.n)}</b><small>${esc(catName(s.c))}${g.walk[j] != null ? ' · ' + esc(t('p.walk', { n: g.walk[j] })) : ''}</small></span></button><span class="ord"><button class="round sm" data-act="stop-up" data-id="${s.id}" aria-label="${esc(t('a.up'))}">↑</button><button class="round sm" data-act="stop-del" data-id="${s.id}" aria-label="${esc(t('a.remove'))}">✕</button></span></li>`; }).join('')}</ol></div>`).join('')
        : `<p class="muted">${esc(t('p.noStops'))}</p>`}
      <textarea data-dayfield="note" rows="${Math.min(12, Math.max(3, Math.ceil((d.note || '').length / 42) + 1))}" placeholder="${esc(t('p.notePh'))}">${esc(d.note || '')}</textarea>
      <div class="stack row">${stops.length ? `<button class="btn" data-act="plan-map">${esc(t('p.onMap'))}</button><button class="btn" data-act="plan-fly">✈︎ ${esc(t('p.fly'))}</button>` : ''}${route ? `<a class="btn" href="${route}" target="_blank" rel="noopener">${esc(t('p.route'))}</a>` : ''}<button class="btn" data-act="plan-add">＋ ${esc(t('p.add'))}</button></div>
    </section>
    <section class="sharebox"><h3>${esc(t('p.shareH'))}</h3><p class="muted small">${esc(t('p.shareP'))}</p><button class="btn" data-act="share-plan">⤴ ${esc(t('p.share'))}</button></section>
    ${suggested(true)}
  </div>`;
}

/* ---------- Settings ---------- */
function settings() {
  const opt = (k, v, cur) => `<button class="seg${cur === v ? ' on' : ''}" data-act="${k}" data-v="${v}">${esc(t(k + '.' + v))}</button>`;
  const visits = Object.keys(S.visits).length;
  return `<div class="pane"><header class="ph-h"><h1>${esc(t('tab.settings'))}</h1></header>
    <section class="set"><h3>${esc(t('set.lang'))}</h3><div class="segs">${opt('set-lang', 'fr', S.lang)}${opt('set-lang', 'en', S.lang)}</div></section>
    <section class="set"><h3>${esc(t('set.theme'))}</h3><div class="segs">${opt('set-theme', 'auto', S.theme)}${opt('set-theme', 'day', S.theme)}${opt('set-theme', 'night', S.theme)}</div><p class="muted small">${esc(t('set.themeSub'))}</p></section>
    <section class="set"><h3>${esc(t('set.trip'))}</h3>${S.trip ? `<p>${esc(fmtDay(S.trip.start))} → ${esc(fmtDay(S.trip.end))}${S.trip.base ? ' · ' + esc(S.trip.base.n) : ''}</p><div class="stack row"><button class="btn sm" data-act="trip-edit">${esc(t('a.edit'))}</button><button class="btn sm ghost" data-act="trip-del">${esc(t('set.tripDel'))}</button></div>` : `<button class="btn sm" data-act="tab" data-tab="plan">${esc(t('p.create'))}</button>`}</section>
    <section class="set"><h3>${esc(t('set.sync'))}</h3><p class="muted small">${esc(t('set.syncSub'))}</p><button class="btn sm" data-act="sync">${esc(window.Cloud && window.Cloud.status === 'ok' ? t('set.synced') : t('set.signin'))}</button></section>
    <section class="set"><h3>${esc(t('set.data'))}</h3><p class="muted small">${esc(t('set.dataSub', { n: visits }))}</p><div class="stack row"><button class="btn sm" data-act="share-mine">⤴ ${esc(t('set.shareMine'))}</button><button class="btn sm" data-act="backup">${esc(t('set.export'))}</button><label class="btn sm">${esc(t('set.import'))}<input type="file" accept="application/json" data-import hidden></label><button class="btn sm ghost" data-act="wipe">${esc(t('set.wipe'))}</button></div></section>
    <section class="set about"><h3>${esc(t('set.about'))}</h3><p>${esc(t('set.aboutP', { n: A.data.spots.length, e: A.data.events.length }))}</p><p class="muted small">${esc(t('set.credits'))}</p><p class="muted small">${esc(t('set.lang2'))}</p><p class="muted small"><a href="../apps/">${esc(t('set.allApps'))}</a></p></section>
  </div>`;
}

function tripDialog() {
  const tr = S.trip || {};
  const d = dialog(`<div class="pad"><h2>${esc(t('p.editH'))}</h2>
    <label>${esc(t('p.from'))}<input type="date" id="tStart" value="${esc(tr.start || today())}"></label>
    <label>${esc(t('p.to'))}<input type="date" id="tEnd" value="${esc(tr.end || '')}"></label>
    <label>${esc(t('p.base'))}<input type="text" id="tBase" value="${esc(tr.base ? tr.base.n : '')}" placeholder="${esc(t('p.basePh'))}"></label>
    <div class="stack row"><button class="btn sm" data-act="base-here">◎ ${esc(t('p.baseHere'))}</button><button class="btn sm" data-act="base-find">⌕ ${esc(t('p.baseFind'))}</button></div>
    <p class="muted small" id="baseMsg">${esc(tr.base ? t('p.baseSet', { b: tr.base.n }) : t('p.baseSub'))}</p>
    <div class="stack row end"><button class="btn ghost" data-act="dlg-close">${esc(t('a.cancel'))}</button><button class="btn gold" data-act="trip-save">${esc(t('a.save'))}</button></div></div>`);
  d._base = tr.base || null;
}
function pickDay(id) {
  const tr = S.trip;
  if (!tr) { toast(t('p.needTrip')); goTab('plan'); return; }
  const days = tripDays(tr.start, tr.end);
  dialog(`<div class="pad"><h2>${esc(t('p.addTo'))}</h2><div class="daypick">${days.map(x => `<button class="btn" data-act="addday-to" data-id="${id}" data-day="${x}">${esc(fmtDay(x))}<small>${(((tr.days || {})[x] || {}).stops || []).length || ''}</small></button>`).join('')}</div><button class="btn ghost wide" data-act="dlg-close">${esc(t('a.cancel'))}</button></div>`);
}

/* ---------- actions of these screens ---------- */
export async function panelAct(act, b) {
  const id = b.dataset.id;
  switch (act) {
    case 'list-open': listOpen = id; renderPanel(); return;
    case 'list-back': listOpen = null; renderPanel(); return;
    case 'list-map': S.ui.list = id; saveUi(); listOpen = null; goTab('map'); rerenderAll(); M.fitTo(listSpots(id).filter(s => s.z === 'P'), 60, A.reduced); return;
    case 'pp-name': { const v = prompt(t('pp.namePrompt'), S.name || ''); if (v != null) { S.name = v.trim().slice(0, 40); save(); renderPanel(); } return; }
    case 'plan-day': planDay = b.dataset.day; renderPanel(); return;
    case 'trip-create': {
      const s = $('#tStart').value, e = $('#tEnd').value;
      if (!s || !e || e < s) return toast(t('p.badDates'));
      S.trip = { start: s, end: e, days: {}, base: null }; save(); renderPanel(); return;
    }
    case 'trip-edit': tripDialog(); return;
    case 'trip-tpl': {
      const x = (A.data.trips || []).find(z => z.id === id); if (!x) return;
      if (S.trip && !confirm(t('p.tplSure'))) return;
      S.trip = fromTemplate(x, S.trip && S.trip.base); planDay = null; save(true); renderPanel(); toast(t('p.tplDone'));
      if (!S.trip.base) setTimeout(tripDialog, 400);
      return;
    }
    case 'trip-save': {
      const s = $('#tStart').value, e = $('#tEnd').value, d = $('#dlg');
      if (!s || !e || e < s) return toast(t('p.badDates'));
      const old = S.trip || { days: {} };
      S.trip = { start: s, end: e, days: old.days || {}, base: d._base || null };
      if (S.trip.base && $('#tBase').value.trim()) S.trip.base.n = $('#tBase').value.trim().slice(0, 60);
      save(); closeDialog(); renderPanel(); return;
    }
    case 'trip-del': if (confirm(t('set.tripDelSure'))) { S.trip = null; save(); renderPanel(); } return;
    case 'base-here': {
      const msg = $('#baseMsg'); msg.textContent = t('p.locating');
      navigator.geolocation.getCurrentPosition(p => { $('#dlg')._base = { n: $('#tBase').value.trim() || t('p.myPlace'), lat: +p.coords.latitude.toFixed(5), lon: +p.coords.longitude.toFixed(5) }; msg.textContent = t('p.baseSet', { b: $('#dlg')._base.n }); }, () => { msg.textContent = t('p.noLoc'); }, { enableHighAccuracy: true, timeout: 12000 });
      return;
    }
    case 'base-find': {
      const q = $('#tBase').value.trim(), msg = $('#baseMsg'); if (!q) return (msg.textContent = t('p.typeBase'));
      msg.textContent = t('p.searching');
      try {
        const r = await fetch('https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ q, format: 'jsonv2', limit: 1, countrycodes: 'fr' }), { headers: { 'Accept-Language': S.lang } });
        const j = await r.json();
        if (!j.length) { msg.textContent = t('p.notFound'); return; }
        $('#dlg')._base = { n: q.slice(0, 60), lat: +(+j[0].lat).toFixed(5), lon: +(+j[0].lon).toFixed(5) };
        msg.textContent = t('p.baseSet', { b: j[0].display_name.split(',').slice(0, 2).join(',') });
      } catch (e) { msg.textContent = t('p.offline'); }
      return;
    }
    case 'addday': pickDay(id); return;
    case 'addday-to': {
      const day = b.dataset.day, tr = S.trip; tr.days = tr.days || {};
      const dd = tr.days[day] = tr.days[day] || { t: '', note: '', stops: [] };
      if (!dd.stops.includes(id)) dd.stops.push(id);
      save(); closeDialog(); toast(t('p.added', { d: fmtDay(day) })); planDay = day; return;
    }
    case 'stop-up': case 'stop-del': {
      const dd = S.trip.days[planDay]; const i = dd.stops.indexOf(id); if (i < 0) return;
      if (act === 'stop-del') dd.stops.splice(i, 1); else if (i > 0) [dd.stops[i - 1], dd.stops[i]] = [dd.stops[i], dd.stops[i - 1]];
      save(); renderPanel(); return;
    }
    case 'plan-map': case 'plan-fly': {
      const stops = (((S.trip.days || {})[planDay] || {}).stops || []).map(i => A.spot.get(i)).filter(Boolean);
      goTab('map'); M.setDay(stops);
      if (act === 'plan-map') { M.fitTo(stops, 80, A.reduced); return; }
      flying = true; toast(t('p.flying'), 4000);
      const stop = () => { flying = false; document.removeEventListener('pointerdown', stop, true); };
      document.addEventListener('pointerdown', stop, true);
      await M.flyover(stops, { top: 60, bottom: 200, left: 20, right: 20 }, () => flying);
      stop(); return;
    }
    case 'plan-add': S.ui.tab = 'lists'; listOpen = null; saveUi(); goTab('lists'); toast(t('p.addHint'), 3500); return;
    case 'plan-events': { const evs = eventsOn(A.data.events, planDay).filter(e => !['Closure', 'Practical'].includes(e.t)).sort((a, c) => c.i - a.i); dialog(`<div class="pad"><h2>${esc(t('p.eventsH', { d: fmtDay(planDay) }))}</h2><ul class="evs">${evs.map(e => `<li><button data-act="${e.spot ? 'open' : 'dlg-close'}" data-id="${e.spot || ''}"><span class="evt">${esc(e.n)}</span><small>${esc([e.h, e.p].filter(Boolean).join(' · '))}</small></button></li>`).join('')}</ul><button class="btn wide" data-act="dlg-close">${esc(t('a.close'))}</button></div>`); return; }
    case 'share-plan': shareLink({ trip: S.trip, mine: S.mine }, t('p.shareTitle')); return;
    case 'share-mine': shareLink({ mine: S.mine }, t('set.shareMine')); return;
    case 'set-lang': S.lang = b.dataset.v; save(); rerenderAll(); return;
    case 'set-theme': S.theme = b.dataset.v; save(); applyTheme(); renderPanel(); return;
    case 'sync': if (window.Cloud) window.Cloud.dialog(() => window.appSync && window.appSync()); else toast(t('set.noSync')); return;
    case 'backup': { const a = document.createElement('a'); a.href = URL.createObjectURL(exportBackup()); a.download = 'passeport-' + today() + '.json'; a.click(); return; }
    case 'wipe': if (confirm(t('set.wipeSure'))) { reset(); rerenderAll(); toast(t('set.wiped')); } return;
  }
}
document.addEventListener('input', e => {
  const f = e.target.dataset && e.target.dataset.dayfield; if (!f || !S.trip) return;
  S.trip.days = S.trip.days || {}; const dd = S.trip.days[planDay] = S.trip.days[planDay] || { t: '', note: '', stops: [] };
  dd[f] = e.target.value.slice(0, f === 't' ? 80 : 600); save();
});
document.addEventListener('change', async e => {
  if (!e.target.matches('[data-import]')) return;
  const f = e.target.files[0]; if (!f) return;
  try { importBackup(await f.text()); rerenderAll(); toast(t('set.imported')); } catch (err) { toast(err.message); }
});
