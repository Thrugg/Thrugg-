/* Tandem — every screen. Reads the state, draws HTML, handles taps through data-act. */
import { S, save, saveUi, reset, uid, device, setInbox, exportBackup, importBackup, cachedPartner, cachePartner } from './store.js';
import { DECKS, DECK } from './decks.js';
import { COLORS, COLOR_KEYS, iso, cardsOf, findCard, glossesFor, noteFor, buildQueue, nextCard, minutesLeft, previews, rate, undo, dayTotals, streak, week, deckStats, pairPayload, flagGloss, tidyAnswers, partnerColor, sharedStreak } from './engine.js';
import * as Pair from './pair.js';
import { t, setLang, lang } from './i18n.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TABS = ['today', 'decks', 'together', 'settings'];
const GLOSS = ['en', 'fr', 'pl'];
const DEV = device();
const ui = { session: undefined, uid: null, rv: null, partner: cachedPartner(), pairErr: null, busy: false, joinCode: '', browse: null, search: '', draft: null, flagDraft: null };
const loc = () => lang() === 'fr' ? 'fr-FR' : 'en-GB';
const today = () => iso(new Date());
const nf = (v, d = 0) => new Intl.NumberFormat(loc(), { maximumFractionDigits: d }).format(v);
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2400); }
function sheet(html) { const d = $('#sheet'); d.innerHTML = html; if (!d.open) d.showModal(); d.scrollTop = 0; }
const closeSheet = () => { const d = $('#sheet'); if (d.open) d.close(); ui.draft = null; ui.flagDraft = null; };
const deckTitle = id => id === 'own' ? t('deck.own') : DECK[id] ? DECK[id].title[lang()] || DECK[id].title.en : id;
const myName = () => (S.me.name || '').trim() || t('me.you');
/* the partner's own name; without one, "your partner", capitalised only where it opens a sentence */
const partnerName = (start = false) => (ui.partner && String(ui.partner.name || '').trim()) || t(start ? 'me.partner' : 'me.partnerLow');

/* the mark: two climbers on one rope, one colour each */
export const mark = (w = 40, cls = '') => `<svg class="mark-svg ${cls}" width="${w}" height="${Math.round(w * .5)}" viewBox="0 0 40 20" aria-hidden="true"><path d="M7 13 C 14 2, 26 2, 33 13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="0.1 3.2"/><circle cx="7" cy="13" r="5" fill="var(--a)"/><circle cx="33" cy="13" r="5" fill="var(--b)"/></svg>`;
export function applyColors() {
  const r = document.documentElement.style;
  r.setProperty('--a', COLORS[S.me.color] || COLORS.ember);
  r.setProperty('--b', COLORS[partnerColor(S.me.color, ui.partner && ui.partner.color)]);
}
function ivl(ms) {
  const m = ms / 60000; if (m < 60) return t('iv.m', { n: Math.max(1, Math.round(m)) });
  const h = m / 60; if (h < 24) return t('iv.h', { n: Math.round(h) });
  const d = h / 24; if (d < 30) return t('iv.d', { n: Math.round(d) });
  if (d < 365) return t('iv.mo', { n: Math.round(d / 30) });
  return t('iv.y', { n: nf(d / 365, 1) });
}
function status(c) {
  const st = S.cards[c.id]; if (!st) return t('st.new');
  const ms = Date.parse(st.due) - Date.now();
  if (ms <= 0) return t('st.due');
  if (st.state === 1 || st.state === 3) return t('st.learning', { v: ivl(ms) });
  return t('st.next', { v: ivl(ms) });
}

/* ---------- partner link ---------- */
let pushT = null;
export function queuePush(delay = 4000) { if (!S.pair || !S.pair.code) return; clearTimeout(pushT); pushT = setTimeout(doPush, delay); }
async function doPush() { pushT = null; if (!S.pair) return; try { await Pair.push(S.pair.code, pairPayload(S, today())); if (ui.pairErr) { ui.pairErr = null; soft(); } } catch (e) { ui.pairErr = e.reason || 'net'; soft(); } }
export function flushPush() { if (pushT) { clearTimeout(pushT); doPush(); } }
export async function pullPartner() {
  if (!S.pair || !S.pair.code || ui.busy) return;
  try {
    const r = await Pair.pull(S.pair.code);
    if (!r.joined) await Pair.push(S.pair.code, pairPayload(S, today()));   // the row went missing: write it again
    ui.partner = r.partner; ui.pairErr = null; cachePartner(r.partner);
    if (tidyAnswers(S, r.partner)) save();
    applyColors(); soft();
  } catch (e) { ui.pairErr = e.reason || 'net'; soft(); }
}
/* redraw a list screen after background news, never in the middle of a review or a form */
function soft() { if (!ui.rv && !$('#sheet').open && ['today', 'together'].includes(S.ui.tab) && !document.activeElement?.matches('input,textarea,select')) render(); }

/* ---------- first day ---------- */
function glossSelects() {
  const g = S.me.gloss;
  const sel = (i, none) => `<label class="fld"><span>${esc(t(i ? 'gl.second' : 'gl.first'))}</span><span class="box"><select data-gloss="${i}">${none ? `<option value="">${esc(t('gl.none'))}</option>` : ''}${GLOSS.map(l => `<option value="${l}"${g[i] === l ? ' selected' : ''}>${esc(t('lang.' + l))}</option>`).join('')}</select></span></label>`;
  return `<div class="grid">${sel(0)}${sel(1, true)}</div>`;
}
const swatches = () => `<div class="swatches" role="group" aria-label="${esc(t('set.color'))}">${COLOR_KEYS.map(k => `<button data-act="color" data-v="${k}" aria-pressed="${S.me.color === k}" aria-label="${esc(t('color.' + k))}" style="--c:${COLORS[k]}"></button>`).join('')}</div>`;
const deckToggles = () => DECKS.map(d => `<label class="dtog"><input type="checkbox" data-deck="${d.id}" ${S.decks[d.id] ? 'checked' : ''}><span><b>${esc(d.title[lang()] || d.title.en)}</b><small>${esc(d.sub[lang()] || d.sub.en)} · ${esc(t('deck.count', { n: d.cards.length }))}</small></span></label>`).join('');
function renderSetup() {
  return `<section class="lead setup">${mark(64, 'big')}<p class="kicker">${esc(t('setup.k'))}</p><h1>${esc(t('setup.h'))}</h1><p class="sub">${esc(t('setup.sub'))}</p></section>
<section class="card"><h3>${esc(t('set.name'))}</h3><label class="fld wide"><span class="box"><input data-me="name" type="text" maxlength="30" value="${esc(S.me.name)}" placeholder="${esc(t('name.ph'))}" aria-label="${esc(t('set.name'))}"></span></label>
<h3>${esc(t('set.gloss'))}</h3><p class="note">${esc(t('gl.sub'))}</p>${glossSelects()}
<h3>${esc(t('set.decks'))}</h3>${deckToggles()}
<h3>${esc(t('set.color'))}</h3><p class="note">${esc(t('color.sub'))}</p>${swatches()}
<div class="row actions"><button class="btn pri" data-act="setup-done">${esc(t('setup.go'))}</button></div></section>`;
}

/* ---------- today ---------- */
function weekStrip() {
  const w = week(S, today()), goal = Math.max(1, S.goal || 10), top = Math.max(goal, ...w.map(x => x.min));
  const pd = ui.partner && ui.partner.stats && Array.isArray(ui.partner.stats.days) ? ui.partner.stats.days : null;
  const label = w.map(x => `${new Date(x.d + 'T12:00').toLocaleDateString(loc(), { weekday: 'short' })} ${nf(x.min)} min`).join(', ');
  return `<div class="week" role="img" aria-label="${esc(t('week.aria', { v: label }))}">${w.map((x, i) => `<div class="wd${x.d === today() ? ' now' : ''}"><div class="wbar"><i style="height:${x.min > 0 ? Math.max(6, Math.round(x.min / top * 100)) : 0}%"></i><b class="goal" style="bottom:${Math.round(goal / top * 100)}%"></b></div>${pd ? `<em class="${pd[i] ? 'on' : ''}"></em>` : ''}<small>${esc(new Date(x.d + 'T12:00').toLocaleDateString(loc(), { weekday: 'narrow' }))}</small></div>`).join('')}</div>${pd ? `<p class="note legend"><i class="ka"></i>${esc(t('week.me'))} <i class="kb"></i>${esc(t('week.partner', { p: partnerName(true) }))}</p>` : `<p class="note legend">${esc(t('week.goal', { n: goal }))}</p>`}`;
}
function duo() {
  const p = ui.partner; if (!S.pair || !p) return '';
  const ps = p.stats || {}, me = { streak: streak(S, today()), today: dayTotals(S, today()).n };
  const shared = sharedStreak(week(S, today()).map(x => x.n > 0 ? 1 : 0), ps.days || []);
  const col = (cls, name, s) => `<div class="duo-col ${cls}"><b>${esc(name)}</b><small>${esc(t('duo.streak', { n: s.streak || 0 }))}</small><small>${esc(s.today ? t('duo.done') : t('duo.notyet'))}</small></div>`;
  return `<section class="duo">${col('a', myName(), me)}${mark(44)}${col('b', partnerName(true), ps)}${shared > 1 ? `<p class="duo-both">${esc(t('duo.both', { n: shared }))}</p>` : ''}</section>`;
}
function dinnerTeaser() {
  const theirs = ui.partner && Array.isArray(ui.partner.flags) ? ui.partner.flags.filter(f => !(S.answers[f.id])).length : 0;
  const mine = Object.keys(S.flags).length; if (!theirs && !mine) return '';
  const bits = []; if (theirs) bits.push(t('din.theirs', { n: theirs, p: partnerName() })); if (mine) bits.push(t('din.mine', { n: mine }));
  return `<button class="teaser" data-act="tab" data-tab="together">${mark(30)}<span>${esc(bits.join(' · '))}</span><i>›</i></button>`;
}
function renderToday() {
  if (!S.setup) return renderSetup();
  if (ui.rv) return renderReview();
  const q = buildQueue(S), left = q.due.length + q.fresh.length, tot = dayTotals(S, today()), mins = minutesLeft(q), done = tot.ms / 60000, goal = S.goal || 10;
  const active = DECKS.filter(d => S.decks[d.id]).map(d => ({ id: d.id, cards: d.cards })).concat(S.own.length ? [{ id: 'own', cards: cardsOf(S).filter(c => c.deck === 'own') }] : []);
  const now = new Date(), chips = active.map(d => { const due = q.due.filter(c => c.deck === d.id).length, nw = q.fresh.filter(c => c.deck === d.id).length; return `<div class="dchip"><b>${esc(deckTitle(d.id))}</b><small>${esc(t('chip', { d: due, n: nw }))}</small></div>`; }).join('');
  const h = left ? t('today.h', { n: left, m: mins }) : q.ahead.length ? t('today.later', { n: q.ahead.length }) : t('today.doneH');
  const startLbl = tot.n ? t('today.more') : t('today.start');
  const btn = left ? `<button class="btn pri big" data-act="rv-start">${esc(startLbl)}</button>` : q.ahead.length ? `<button class="btn big" data-act="rv-ahead">${esc(t('rv.aheadGo'))}</button>` : '';
  const st = streak(S, today());
  return `<section class="lead"><p class="kicker">${esc(now.toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' }))}</p><h1>${esc(h)}</h1>
<div class="goalbar" role="progressbar" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${Math.round(done)}" aria-label="${esc(t('goal.aria'))}"><i style="width:${Math.min(100, done / goal * 100)}%"></i></div><p class="note">${esc(t('goal.line', { d: nf(Math.floor(done)), g: goal, n: tot.n }))}${st > 1 ? ' · ' + esc(t('streak', { n: st })) : ''}</p>${btn}</section>
${duo()}${dinnerTeaser()}
${active.length ? `<section><h3>${esc(t('today.decks'))}</h3><div class="dchips">${chips}</div></section>` : `<section class="card"><p>${esc(t('today.nodeck'))}</p><button class="btn sm" data-act="tab" data-tab="decks">${esc(t('tab.decks'))}</button></section>`}
<section><h3>${esc(t('today.week'))}</h3>${weekStrip()}</section>
<p class="note foot">${esc(t('today.note'))}</p>`;
}

/* ---------- review ---------- */
function startReview(ahead = false) { ui.rv = { cur: null, shown: false, shownAt: Date.now(), ahead, n: 0, undo: null, q: null }; pickNext(); S.ui.tab = 'today'; render(); window.scrollTo(0, 0); }
function pickNext() { const rv = ui.rv, q = buildQueue(S, new Date()), c = nextCard(q, rv.ahead); rv.q = q; rv.cur = c ? c.id : null; rv.shown = false; rv.shownAt = Date.now(); }
function renderReview() {
  const rv = ui.rv, q = rv.q, c = rv.cur && findCard(S, rv.cur), tot = dayTotals(S, today()), goal = S.goal || 10, done = tot.ms / 60000;
  const left = q.due.length + q.fresh.length + (rv.ahead ? q.ahead.length : 0);
  const top = `<div class="rvtop"><button class="x" data-act="rv-close" aria-label="${esc(t('rv.close'))}">✕</button><span>${esc(c ? t('rv.left', { n: left }) : '')}</span><span class="mini" title="${esc(t('goal.aria'))}"><i style="width:${Math.min(100, done / goal * 100)}%"></i></span><span class="mins">${esc(t('rv.mins', { n: nf(Math.floor(done)), g: goal }))}</span></div>`;
  if (!c) {
    const reached = done >= goal;
    return `${top}<section class="done">${mark(84, 'big')}<h1>${esc(reached ? t('done.goal') : t('done.empty'))}</h1><p class="sub">${esc(t('done.line', { n: tot.n, nw: tot.nw, m: nf(Math.round(done)) }))}</p>
${q.ahead.length ? `<p class="note">${esc(t('done.ahead', { n: q.ahead.length }))}</p><div class="row"><button class="btn" data-act="rv-ahead">${esc(t('rv.aheadGo'))}</button></div>` : ''}
${!q.newLeft && q.unseen ? `<p class="note">${esc(t('done.newcap', { n: S.newPerDay }))}</p>` : ''}
<div class="row actions">${rv.undo ? `<button class="link" data-act="rv-undo">${esc(t('rv.undo'))}</button>` : ''}<button class="btn pri" data-act="rv-close">${esc(t('done.back'))}</button></div></section>`;
  }
  const st = S.cards[c.id], tag = !st ? t('rv.new') : (st.state === 1 || st.state === 3) ? t('rv.learning') : t('rv.review');
  const gl = glossesFor(c, S.me.gloss.filter(Boolean)), note = noteFor(c, S.me.gloss.filter(Boolean)), flagged = !!S.flags[c.id];
  const L = c.lang && c.lang !== 'other' ? ` lang="${c.lang}"` : '';
  let foot;
  if (!rv.shown) foot = `<button class="btn pri big wide" data-act="rv-show">${esc(t('rv.show'))}</button>`;
  else { const p = previews(S, c.id, new Date()); foot = `<div class="grades">${[1, 2, 3, 4].map(r => `<button class="gr g${r}" data-act="rv-rate" data-r="${r}"><b>${esc(t('r.' + r))}</b><small>${esc(ivl(p[r]))}</small></button>`).join('')}</div>`; }
  return `${top}<article class="card rvcard${rv.shown ? ' shown' : ''}" data-act="${rv.shown ? '' : 'rv-show'}">
<p class="dk"><span>${esc(deckTitle(c.deck))}</span><em>${esc(tag)}</em></p>
<h1 class="front"${L}>${esc(c.f)}</h1>
${rv.shown ? `<div class="back">${gl.map((g, i) => `<p class="${i ? 'g2' : 'g1'}"${g.lang ? ` lang="${g.lang}"` : ''}>${esc(g.text)}</p>`).join('')}${note ? `<p class="cnote">${esc(note)}</p>` : ''}</div>` : `<p class="tap">${esc(t('rv.tap'))}</p>`}
<button class="flag" data-act="rv-flag" aria-pressed="${flagged}">${mark(26)}<span>${esc(flagged ? t('flag.on') : t('flag.ask'))}</span></button>
</article>${foot}
<div class="row rvfoot">${rv.undo ? `<button class="link" data-act="rv-undo">${esc(t('rv.undo'))}</button>` : '<span></span>'}<span class="note keys">${esc(t('rv.keys'))}</span></div>`;
}
function flagSheet(cid) {
  const c = findCard(S, cid); if (!c) return; const fl = S.flags[cid];
  ui.flagDraft = { cid, note: fl ? fl.note || '' : '' };
  sheet(`<h2>${esc(t('flag.h'))}</h2><p class="sub">${esc(t('flag.sub', { p: S.pair ? partnerName() : t('me.partnerLow') }))}</p><p class="fcard"${c.lang && c.lang !== 'other' ? ` lang="${c.lang}"` : ''}>${esc(c.f)}</p>
<label class="fld wide"><span>${esc(t('flag.note'))}</span><textarea data-flagnote rows="2" maxlength="300" placeholder="${esc(t('flag.ph'))}">${esc(ui.flagDraft.note)}</textarea></label>
<div class="row end">${fl ? `<button class="link danger" data-act="flag-off" data-id="${esc(cid)}">${esc(t('flag.off'))}</button>` : '<span></span>'}<span class="row"><button class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button class="btn sm pri" data-act="flag-save">${esc(fl ? t('common.save') : t('flag.go'))}</button></span></div>`);
}

/* ---------- decks ---------- */
function segBar(s) {
  const parts = [['unseen', s.unseen], ['learning', s.learning], ['young', s.young], ['mature', s.mature]].filter(x => x[1] > 0);
  return `<div class="seg4" role="img" aria-label="${esc(parts.map(([k, v]) => t('ds.' + k) + ' ' + v).join(', '))}">${parts.map(([k, v]) => `<i class="${k}" style="flex:${v}"></i>`).join('')}</div><p class="note">${esc([['unseen', s.unseen], ['learning', s.learning], ['young', s.young], ['mature', s.mature]].map(([k, v]) => t('ds.' + k) + ' ' + v).join(' · '))}${s.due ? ' · ' + esc(t('ds.due', { n: s.due })) : ''}</p>`;
}
function renderDecks() {
  const now = new Date(), own = cardsOf({ decks: {}, own: S.own });
  return `<section class="lead"><h1>${esc(t('decks.h'))}</h1><p class="sub">${esc(t('decks.sub'))}</p></section>
${DECKS.map(d => `<section class="card deck"><div class="dhead"><div><p class="kicker">${esc(t('lang.' + d.lang))}</p><h2>${esc(d.title[lang()] || d.title.en)}</h2><p class="note">${esc(d.sub[lang()] || d.sub.en)}</p></div><label class="switch"><input type="checkbox" data-deck="${d.id}" ${S.decks[d.id] ? 'checked' : ''} aria-label="${esc(t('decks.on'))}"><i></i></label></div>${segBar(deckStats(S, d.cards, now))}<div class="row"><button class="btn sm" data-act="browse" data-id="${d.id}">${esc(t('decks.browse'))}</button></div></section>`).join('')}
<section class="card deck"><div class="dhead"><div><p class="kicker">${esc(t('deck.private'))}</p><h2>${esc(t('deck.own'))}</h2><p class="note">${esc(t('own.sub'))}</p></div></div>${own.length ? segBar(deckStats(S, own, now)) : ''}<div class="row"><button class="btn sm pri" data-act="own-add">${esc(t('own.add'))}</button>${own.length ? `<button class="btn sm" data-act="browse" data-id="own">${esc(t('decks.browse'))}</button>` : ''}</div></section>
<p class="note foot">${esc(t('decks.note'))}</p>`;
}
function browseSheet() {
  const id = ui.browse, list = id === 'own' ? cardsOf({ decks: {}, own: S.own }) : (DECK[id] ? DECK[id].cards : []);
  const g = S.me.gloss.filter(Boolean), q = ui.search.trim().toLowerCase();
  const rows = list.filter(c => !q || [c.f, c.en, c.fr, c.pl, c.back].some(x => x && String(x).toLowerCase().includes(q)));
  sheet(`<h2>${esc(deckTitle(id))}</h2><label class="fld wide"><span class="box"><input data-search type="search" value="${esc(ui.search)}" placeholder="${esc(t('browse.ph'))}" aria-label="${esc(t('browse.ph'))}"></span></label>
<div class="clist" id="clist">${rowsHtml(rows, g)}</div>
<div class="row end">${id === 'own' ? `<button class="btn sm" data-act="own-add">${esc(t('own.add'))}</button>` : '<span></span>'}<button class="btn sm pri" data-act="close">${esc(t('common.close'))}</button></div>`);
}
const rowsHtml = (rows, g) => rows.length ? rows.map(c => `<div class="crow"><span><b${c.lang && c.lang !== 'other' ? ` lang="${c.lang}"` : ''}>${esc(c.f)}</b><small>${esc((glossesFor(c, g)[0] || {}).text || '')} · ${esc(status(c))}</small></span>${c.deck === 'own' ? `<button class="btn sm ghost" data-act="own-edit" data-id="${esc(c.id)}">${esc(t('common.edit'))}</button>` : ''}<button class="iconbtn" data-act="flag" data-id="${esc(c.id)}" aria-pressed="${!!S.flags[c.id]}" aria-label="${esc(t('flag.ask'))}">${mark(24)}</button></div>`).join('') : `<p class="note">${esc(t('browse.none'))}</p>`;
function ownSheet() {
  const d = ui.draft, isNew = !S.own.some(c => c.id === d.id);
  sheet(`<h2>${esc(t(isNew ? 'own.new' : 'own.edit'))}</h2><p class="note">${esc(t('own.private'))}</p>
<div class="grid"><label class="fld"><span>${esc(t('own.lang'))}</span><span class="box"><select data-own="lang">${['pl', 'de', 'other'].map(l => `<option value="${l}"${d.lang === l ? ' selected' : ''}>${esc(t('lang.' + l))}</option>`).join('')}</select></span></label>
<label class="fld wide"><span>${esc(t('own.front'))}</span><span class="box"><input data-own="f" type="text" maxlength="200" value="${esc(d.f)}" placeholder="${esc(t('own.frontPh'))}"></span></label>
<label class="fld wide"><span>${esc(t('own.back'))}</span><span class="box"><input data-own="back" type="text" maxlength="200" value="${esc(d.back)}" placeholder="${esc(t('own.backPh'))}"></span></label>
<label class="fld wide"><span>${esc(t('own.note'))}</span><span class="box"><input data-own="n" type="text" maxlength="200" value="${esc(d.n)}"></span></label></div>
<div class="row end">${isNew ? '<span></span>' : `<button class="link danger" data-act="own-del">${esc(t('own.del'))}</button>`}<span class="row"><button class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button class="btn sm pri" data-act="own-save">${esc(t('common.save'))}</button></span></div>`);
}

/* ---------- together ---------- */
const errLine = r => r ? `<p class="err">${esc(t('err.' + r))}</p>` : '';
function linkCard() {
  const on = window.Cloud && window.Cloud.configured();
  if (!on) return `<section class="card"><h2>${esc(t('tog.link'))}</h2><p class="note">${esc(t('err.nosync'))}</p></section>`;
  if (!ui.session) return `<section class="card"><h2>${esc(t('tog.link'))}</h2><ol class="steps"><li>${esc(t('tog.s1'))}</li><li>${esc(t('tog.s2'))}</li><li>${esc(t('tog.s3'))}</li></ol><div class="row"><button class="btn pri" data-act="sync">${esc(t('sync.signin'))}</button></div></section>`;
  return `<section class="card"><h2>${esc(t('tog.link'))}</h2><ol class="steps"><li>${esc(t('tog.s1'))}</li><li>${esc(t('tog.s2'))}</li><li>${esc(t('tog.s3'))}</li></ol>
<div class="row"><button class="btn pri" data-act="pair-new" ${ui.busy ? 'disabled' : ''}>${esc(t('tog.create'))}</button></div>
<p class="or">${esc(t('tog.or'))}</p><div class="ritrow"><span class="box"><input data-joincode type="text" autocapitalize="characters" autocomplete="off" spellcheck="false" value="${esc(ui.joinCode)}" placeholder="XXXX-XXXX-XXXX-XXXX" aria-label="${esc(t('tog.code'))}"></span><button class="btn sm" data-act="pair-join" ${ui.busy ? 'disabled' : ''}>${esc(t('tog.join'))}</button></div>
${errLine(ui.pairErr)}<p class="note">${esc(t('tog.privacy'))}</p></section>`;
}
function theirItem(fl) {
  const a = S.answers[fl.id], g = S.me.gloss.filter(Boolean);
  const L = fl.lang && fl.lang !== 'other' ? ` lang="${esc(fl.lang)}"` : '';
  return `<div class="flagitem b"><p class="ff"${L}>${esc(fl.f)}</p><p class="sub">${esc(flagGloss(fl, g))}</p>${fl.note ? `<p class="q">“${esc(fl.note)}”</p>` : ''}
<div class="row"><button class="chip" data-act="ans" data-id="${esc(fl.id)}" data-ok="1" aria-pressed="${!!(a && a.ok)}">${esc(t('ans.ok'))}</button><button class="chip" data-act="ans" data-id="${esc(fl.id)}" data-ok="0" aria-pressed="${!!(a && !a.ok)}">${esc(t('ans.no'))}</button></div>
${a ? `<label class="fld wide"><span>${esc(a.ok ? t('ans.noteOk') : t('ans.noteNo'))}</span><span class="box"><input data-ansnote="${esc(fl.id)}" type="text" maxlength="300" value="${esc(a.note || '')}" placeholder="${esc(a.ok ? t('ans.phOk') : t('ans.phNo'))}"></span></label>` : ''}</div>`;
}
function mineItem(cid) {
  const fl = S.flags[cid], c = findCard(S, cid); if (!c) return '';
  const a = ui.partner && ui.partner.answers ? ui.partner.answers[fl.id] : null, g = S.me.gloss.filter(Boolean);
  const L = c.lang && c.lang !== 'other' ? ` lang="${c.lang}"` : '';
  const verdict = a ? `<p class="verdict ${a.ok ? 'ok' : 'no'}"><b>${esc(a.ok ? t('ans.gotOk', { p: partnerName(true) }) : t('ans.gotNo', { p: partnerName(true) }))}</b>${a.note ? ` ${esc(a.note)}` : ''}</p>` : (S.pair && ui.partner ? `<p class="note">${esc(t('ans.wait', { p: partnerName() }))}</p>` : '');
  return `<div class="flagitem a"><p class="ff"${L}>${esc(c.f)}</p><p class="sub">${esc((glossesFor(c, g)[0] || {}).text || '')}</p>${fl.note ? `<p class="q">“${esc(fl.note)}”</p>` : ''}${verdict}
<div class="row">${a ? `<button class="btn sm" data-act="flag-done" data-id="${esc(cid)}">${esc(t('flag.done'))}</button>` : ''}<button class="link" data-act="flag" data-id="${esc(cid)}">${esc(t('flag.editNote'))}</button></div></div>`;
}
function renderTogether() {
  const p = ui.partner, paired = !!S.pair, mine = Object.keys(S.flags);
  const theirs = p && Array.isArray(p.flags) ? p.flags : [];
  const open = theirs.filter(f => !S.answers[f.id]), answered = theirs.filter(f => S.answers[f.id]);
  if (!S.setup) return `<p class="banner">${esc(t('tog.setupFirst'))}</p>` + renderSetup();
  const head = `<section class="lead">${mark(72, 'big')}<h1>${esc(paired && p ? t('tog.hPair', { a: myName(), b: partnerName() }) : t('tog.h'))}</h1><p class="sub">${esc(t('tog.sub'))}</p></section>`;
  let body = '';
  if (!paired) body += linkCard();
  else if (!p) body += `<section class="card"><h2>${esc(t('tog.wait'))}</h2><p class="sub">${esc(t('tog.give'))}</p><p class="code">${esc(Pair.showCode(S.pair.code))}</p><div class="row"><button class="btn pri" data-act="pair-share">${esc(t('tog.share'))}</button><button class="btn sm" data-act="pair-refresh">${esc(t('tog.refresh'))}</button></div>${errLine(ui.pairErr)}</section>`;
  if (paired && p) {
    /* answered cards stay in the list, after the open ones, until the partner closes them */
    body += `<section><h2 class="hb">${esc(t('tog.check', { n: open.length }))}</h2>${theirs.length ? open.concat(answered).map(theirItem).join('') : `<p class="note">${esc(t('tog.checkNone', { p: partnerName() }))}</p>`}${answered.length ? `<p class="note">${esc(t('tog.answered', { n: answered.length, p: partnerName() }))}</p>` : ''}</section>`;
  }
  body += `<section><h2 class="ha">${esc(paired && p ? t('tog.mineP', { p: partnerName(), n: mine.length }) : t('tog.mine', { n: mine.length }))}</h2>${mine.length ? mine.map(mineItem).join('') : `<p class="note">${esc(t('tog.mineNone'))}</p>`}</section>`;
  if (paired && p) {
    const ps = p.stats || {}, w = week(S, today()), md = w.map(x => x.n > 0 ? 1 : 0);
    const me = { streak: streak(S, today()), n7: w.reduce((a, x) => a + x.n, 0), min7: Math.round(w.reduce((a, x) => a + x.min, 0)), days: md };
    const col = (cls, name, s) => `<div class="wk ${cls}"><b>${esc(name)}</b><div class="dots">${(s.days || []).map(d => `<i class="${d ? 'on' : ''}"></i>`).join('')}</div><small>${esc(t('wk.line', { n: s.n7 || 0, m: s.min7 || 0 }))}</small><small>${esc(t('duo.streak', { n: s.streak || 0 }))}</small></div>`;
    const both = sharedStreak(md, ps.days || []);
    body += `<section><h3>${esc(t('tog.week'))}</h3><div class="wks">${col('a', myName(), me)}${col('b', partnerName(true), ps)}</div>${both ? `<p class="note">${esc(t('duo.both', { n: both }))}</p>` : ''}</section>`;
  }
  if (paired) body += `<section class="pairfoot"><p class="note">${esc(t('tog.codeIs'))} <b class="mono">${esc(Pair.showCode(S.pair.code))}</b></p>${p && p.updated ? `<p class="note">${esc(t('tog.seen', { p: partnerName(true), d: new Date(p.updated).toLocaleString(loc(), { weekday: 'short', hour: '2-digit', minute: '2-digit' }) }))}</p>` : ''}${p ? errLine(ui.pairErr) : ''}<div class="row"><button class="btn sm" data-act="pair-refresh">${esc(t('tog.refresh'))}</button><button class="btn sm" data-act="pair-share">${esc(t('tog.share'))}</button><button class="link danger" data-act="pair-leave">${esc(t('tog.leave'))}</button></div></section>`;
  return head + body;
}

/* ---------- settings ---------- */
function renderSettings() {
  const email = ui.session, on = window.Cloud && window.Cloud.configured();
  return `<section class="lead"><h1>${esc(t('set.h1'))}</h1></section>
<section><h2>${esc(t('set.lang'))}</h2><div class="seg" role="group"><button data-act="lang" data-l="en" aria-pressed="${lang() === 'en'}">English</button><button data-act="lang" data-l="fr" aria-pressed="${lang() === 'fr'}">Français</button></div></section>
<section><h2>${esc(t('set.name'))}</h2><p class="note">${esc(t('name.sub'))}</p><label class="fld wide"><span class="box"><input data-me="name" type="text" maxlength="30" value="${esc(S.me.name)}" placeholder="${esc(t('name.ph'))}" aria-label="${esc(t('set.name'))}"></span></label></section>
<section><h2>${esc(t('set.color'))}</h2><p class="note">${esc(t('color.sub'))}</p>${swatches()}</section>
<section><h2>${esc(t('set.gloss'))}</h2><p class="note">${esc(t('gl.sub'))}</p>${glossSelects()}</section>
<section><h2>${esc(t('set.pace'))}</h2><div class="grid"><label class="fld"><span>${esc(t('set.new'))}</span><span class="box"><input data-f="newPerDay" type="number" inputmode="numeric" min="0" max="50" step="1" value="${S.newPerDay}"></span></label><label class="fld"><span>${esc(t('set.goal'))}</span><span class="box"><input data-f="goal" type="number" inputmode="numeric" min="1" max="120" step="1" value="${S.goal}"><i>min</i></span></label></div><p class="note">${esc(t('pace.sub'))}</p></section>
<section><h2>${esc(t('set.sync'))}</h2><p class="note">${esc(!on ? t('sync.none') : email ? t('sync.on', { e: email }) : t('sync.off'))}</p>${on ? `<div class="row"><button class="btn sm" data-act="sync">${esc(email ? t('sync.manage') : t('sync.signin'))}</button></div>` : ''}<p class="note">${esc(t('sync.private'))}</p></section>
<section><h2>${esc(t('set.ideas'))}</h2><p class="note">${esc(t('ideas.sub'))}</p><label class="fld wide"><span>${esc(t('ideas.link'))}</span><span class="box"><input type="url" data-inbox value="${esc(S.inbox || '')}" placeholder="https://docs.google.com/…"></span></label>${S.inbox ? `<div class="row" style="margin-top:10px"><a class="btn sm" href="${esc(S.inbox)}" target="_blank" rel="noopener">${esc(t('ideas.open'))}</a></div>` : ''}</section>
<section><h2>${esc(t('set.data'))}</h2><div class="row"><button class="btn sm" data-act="export">${esc(t('data.export'))}</button><label class="btn sm">${esc(t('data.import'))}<input type="file" accept="application/json,.json" data-import hidden></label><button class="btn sm danger" data-act="reset">${esc(t('data.reset'))}</button></div></section>
<p class="note foot">${esc(t('credits'))}</p>`;
}

/* ---------- shell ---------- */
export function render() {
  document.documentElement.lang = lang();
  applyColors();
  const tab = TABS.includes(S.ui.tab) ? S.ui.tab : 'today';
  document.body.classList.toggle('reviewing', !!ui.rv && tab === 'today');
  $('#tabs').innerHTML = TABS.map(k => `<button data-act="tab" data-tab="${k}" ${k === tab ? 'aria-current="page"' : ''}>${esc(t('tab.' + k))}${k === 'together' && ui.partner && Array.isArray(ui.partner.flags) && ui.partner.flags.some(f => !S.answers[f.id]) ? '<i class="dot" aria-hidden="true"></i>' : ''}</button>`).join('');
  $('#main').innerHTML = { today: renderToday, decks: renderDecks, together: renderTogether, settings: renderSettings }[tab]();
}
export function refreshSession() {
  if (!window.Cloud || !window.Cloud.configured()) return;
  window.Cloud.session().then(s => {
    const e = s ? s.user.email : null; ui.uid = s ? s.user.id : null;
    if (e !== ui.session) { ui.session = e; if (e && S.pair) pullPartner(); if (['settings', 'together'].includes(S.ui.tab) && !ui.rv) render(); }
  }).catch(() => { });
}
function copy(text, done) {
  const fallback = () => sheet(`<h2>${esc(t('copy.h'))}</h2><textarea rows="4" readonly class="copybox">${esc(text)}</textarea><div class="row end"><span></span><button class="btn sm pri" data-act="close">${esc(t('common.close'))}</button></div>`);
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast(done), fallback); else fallback(); } catch (e) { fallback(); }
}
function setFlag(cid, note) { const fl = S.flags[cid]; S.flags[cid] = { id: fl ? fl.id : uid(), at: fl ? fl.at : today(), note: String(note || '').trim() }; save(); queuePush(1500); }
async function pairAction(fn) { ui.busy = true; ui.pairErr = null; render(); try { await fn(); } catch (e) { ui.pairErr = e.reason || 'net'; } ui.busy = false; render(); }

function act(el) {
  const a = el.dataset.act, id = el.dataset.id, rv = ui.rv;
  if (a === 'tab') { S.ui.tab = el.dataset.tab; if (S.ui.tab !== 'today') ui.rv = null; saveUi(); render(); window.scrollTo(0, 0); if (S.ui.tab === 'together') pullPartner(); }
  else if (a === 'close') closeSheet();
  else if (a === 'setup-done') { if (!DECKS.some(d => S.decks[d.id])) { toast(t('setup.needDeck')); return; } S.setup = true; if (ui.joinCode) S.ui.tab = 'together'; save(); render(); window.scrollTo(0, 0); }
  else if (a === 'color') { S.me.color = el.dataset.v; save(); queuePush(1500); render(); }
  else if (a === 'rv-start') startReview(false);
  else if (a === 'rv-ahead') startReview(true);
  else if (a === 'rv-close') { ui.rv = null; flushPush(); render(); window.scrollTo(0, 0); }
  else if (a === 'rv-show' && rv && rv.cur && !rv.shown) { rv.shown = true; render(); }
  else if (a === 'rv-rate' && rv && rv.cur && rv.shown) { const now = new Date(); rv.undo = rate(S, rv.cur, Number(el.dataset.r), now, now.getTime() - rv.shownAt, DEV); rv.n++; save(); queuePush(); pickNext(); render(); }
  else if (a === 'rv-undo' && rv && rv.undo) { undo(S, rv.undo); rv.cur = rv.undo.id; rv.shown = true; rv.shownAt = Date.now(); rv.undo = null; rv.n = Math.max(0, rv.n - 1); rv.q = buildQueue(S, new Date()); save(); queuePush(); render(); }
  else if (a === 'rv-flag' && rv && rv.cur) flagSheet(rv.cur);
  else if (a === 'flag') flagSheet(id);
  else if (a === 'flag-save' && ui.flagDraft) { setFlag(ui.flagDraft.cid, ui.flagDraft.note); const wasBrowse = ui.browse; closeSheet(); toast(t('flag.saved')); if (wasBrowse) browseSheet(); else render(); }
  else if (a === 'flag-off') { delete S.flags[id]; save(); queuePush(1500); const wasBrowse = ui.browse; closeSheet(); if (wasBrowse) browseSheet(); else render(); }
  else if (a === 'flag-done') { delete S.flags[id]; save(); queuePush(1500); render(); toast(t('flag.closed')); }
  else if (a === 'ans') { const prev = S.answers[id]; S.answers[id] = { ok: el.dataset.ok === '1', note: prev ? prev.note || '' : '', at: today() }; save(); queuePush(1500); render(); }
  else if (a === 'browse') { ui.browse = id; ui.search = ''; browseSheet(); }
  else if (a === 'own-add') { ui.draft = { id: 'own:' + uid(), lang: 'pl', f: '', back: '', n: '' }; ownSheet(); }
  else if (a === 'own-edit') { const c = S.own.find(x => x.id === id); if (c) { ui.draft = { ...c }; ownSheet(); } }
  else if (a === 'own-save' && ui.draft) {
    const d = ui.draft; d.f = String(d.f || '').trim(); d.back = String(d.back || '').trim(); d.n = String(d.n || '').trim();
    if (!d.f || !d.back) { toast(t('own.need')); return; }
    const i = S.own.findIndex(x => x.id === d.id), c = { id: d.id, lang: d.lang, f: d.f, back: d.back, n: d.n };
    if (i >= 0) S.own[i] = c; else S.own.push(c);
    save(); queuePush(1500); ui.draft = null; if (ui.browse === 'own') browseSheet(); else { closeSheet(); render(); } toast(t('own.saved'));
  }
  else if (a === 'own-del' && ui.draft) { if (el.dataset.sure) { const did = ui.draft.id; S.own = S.own.filter(x => x.id !== did); delete S.cards[did]; delete S.flags[did]; save(); queuePush(1500); ui.draft = null; if (ui.browse === 'own' && S.own.length) browseSheet(); else { ui.browse = null; closeSheet(); } render(); } else { el.dataset.sure = '1'; el.textContent = t('own.delSure'); } }
  else if (a === 'pair-new') pairAction(async () => { const code = Pair.newCode(); await Pair.push(code, pairPayload(S, today())); S.pair = { code, since: today() }; ui.partner = null; cachePartner(null); save(); });
  else if (a === 'pair-join') pairAction(async () => {
    const code = Pair.cleanCode(ui.joinCode); if (!Pair.validCode(code)) throw Object.assign(new Error('code'), { reason: 'code' });
    await Pair.push(code, pairPayload(S, today())); S.pair = { code, since: today() }; ui.joinCode = ''; save();
    const r = await Pair.pull(code); ui.partner = r.partner; cachePartner(r.partner); applyColors();
  });
  else if (a === 'pair-refresh') pullPartner().then(() => { if (!ui.pairErr) toast(t('tog.refreshed')); });
  else if (a === 'pair-share') { const url = location.origin + location.pathname + '#join=' + S.pair.code, text = t('tog.shareText', { c: Pair.showCode(S.pair.code) }); if (navigator.share) navigator.share({ title: 'Tandem', text, url }).catch(() => { }); else copy(text + '\n' + url, t('tog.copied')); }
  else if (a === 'pair-leave') sheet(`<h2>${esc(t('leave.h'))}</h2><p class="sub">${esc(t('leave.sub'))}</p><div class="row end"><button class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button class="btn sm danger" data-act="pair-leave-yes">${esc(t('tog.leave'))}</button></div>`);
  else if (a === 'pair-leave-yes') { closeSheet(); pairAction(async () => { const code = S.pair.code; S.pair = null; ui.partner = null; cachePartner(null); S.answers = {}; save(); await Pair.leave(code).catch(() => { }); }); }
  else if (a === 'lang') { S.lang = el.dataset.l; setLang(S.lang); save(); render(); }
  else if (a === 'sync') { if (window.Cloud) window.Cloud.dialog(() => { window.appSync && window.appSync(); refreshSession(); }); }
  else if (a === 'reset') sheet(`<h2>${esc(t('reset.h'))}</h2><p class="sub">${esc(t('reset.sub'))}</p><div class="row end"><button class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button class="btn sm danger" data-act="reset-yes">${esc(t('reset.yes'))}</button></div>`);
  else if (a === 'reset-yes') { const lg = S.lang, pair = S.pair; reset(); S.lang = lg; S.pair = pair; save(true); closeSheet(); render(); }
  else if (a === 'export') { const url = URL.createObjectURL(exportBackup()), x = document.createElement('a'); x.href = url; x.download = 'tandem-' + today() + '.json'; x.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
  else if (a === 'reload') location.reload();
}

export function init() {
  const h = location.hash.match(/join=([A-Za-z0-9-]+)/);
  if (h) { ui.joinCode = Pair.showCode(h[1]); S.ui.tab = 'together'; try { history.replaceState(null, '', location.pathname); } catch (e) { } }
  document.addEventListener('click', ev => { const el = ev.target.closest('[data-act]'); if (el && el.dataset.act && !el.disabled) act(el); });
  const onField = (ev, done) => {
    const el = ev.target;
    if (el.dataset.me === 'name') { S.me.name = el.value; save(); queuePush(2500); }
    else if (el.dataset.gloss !== undefined && done) { const g = [...S.me.gloss]; g[Number(el.dataset.gloss)] = el.value || null; if (!g[0]) g[0] = 'en'; if (g[1] === g[0]) g[1] = null; S.me.gloss = g.slice(0, 2); save(); render(); }
    else if (el.dataset.deck && done) { S.decks = { ...S.decks, [el.dataset.deck]: el.checked }; save(); queuePush(2500); if (S.setup) render(); }
    else if (el.dataset.f && done) { const k = el.dataset.f, v = Math.round(Number(el.value)); S[k] = k === 'goal' ? Math.min(120, Math.max(1, v || 10)) : Math.min(50, Math.max(0, isFinite(v) ? v : 10)); save(); }
    else if (el.dataset.own && ui.draft) ui.draft[el.dataset.own] = el.value;
    else if (el.dataset.flagnote !== undefined && ui.flagDraft) ui.flagDraft.note = el.value;
    else if (el.dataset.ansnote && done) { const k = el.dataset.ansnote; if (S.answers[k]) { S.answers[k].note = el.value.trim(); save(); queuePush(1500); } }
    else if (el.dataset.joincode !== undefined) ui.joinCode = el.value;
    else if (el.dataset.search !== undefined) { ui.search = el.value; const list = ui.browse === 'own' ? cardsOf({ decks: {}, own: S.own }) : (DECK[ui.browse] ? DECK[ui.browse].cards : []); const q = ui.search.trim().toLowerCase(); $('#clist').innerHTML = rowsHtml(list.filter(c => !q || [c.f, c.en, c.fr, c.pl, c.back].some(x => x && String(x).toLowerCase().includes(q))), S.me.gloss.filter(Boolean)); }
    else if (el.dataset.inbox !== undefined && done) { setInbox(el.value.trim()); render(); }
    else if (el.dataset.import !== undefined && done && el.files[0]) { el.files[0].text().then(tx => { importBackup(tx); setLang(S.lang); render(); toast(t('data.imported')); }).catch(() => toast(t('data.importFail'))); }
  };
  document.addEventListener('input', ev => onField(ev, false));
  document.addEventListener('change', ev => onField(ev, true));
  /* on a keyboard: space shows the answer, 1–4 answer, F flags, Escape leaves */
  document.addEventListener('keydown', ev => {
    const rv = ui.rv; if (!rv || $('#sheet').open || ev.target.matches('input,textarea,select') || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if ((ev.key === ' ' || ev.key === 'Enter') && rv.cur && !rv.shown) { ev.preventDefault(); act({ dataset: { act: 'rv-show' } }); }
    else if (/^[1-4]$/.test(ev.key) && rv.cur && rv.shown) { ev.preventDefault(); act({ dataset: { act: 'rv-rate', r: ev.key } }); }
    else if ((ev.key === 'f' || ev.key === 'F') && rv.cur) { ev.preventDefault(); act({ dataset: { act: 'rv-flag' } }); }
    else if (ev.key === 'Escape') act({ dataset: { act: 'rv-close' } });
  });
  $('#sheet').addEventListener('click', ev => { if (ev.target === $('#sheet')) closeSheet(); });
  $('#sheet').addEventListener('close', () => { ui.draft = null; ui.flagDraft = null; if (!$('#sheet').open) ui.browse = null; });
  /* a new day while the app stayed open; partner news when coming back to the app and every minute on screen */
  let day = today();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { if (today() !== day) { day = today(); if (ui.rv) pickNext(); render(); } pullPartner(); } else flushPush(); });
  setInterval(() => { if (document.visibilityState === 'visible' && ['together', 'today'].includes(S.ui.tab)) pullPartner(); }, 60000);
  render(); refreshSession();
}
