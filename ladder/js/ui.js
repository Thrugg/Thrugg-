/* The Funds Ladder — every screen. Reads the state, draws HTML, handles taps through data-act. */
import { S, save, saveUi, reset, uid, examples, readSafety, readMove, readGG, readCar, setInbox, exportBackup, importBackup } from './store.js';
import { targetOf, needOf, fillOf, isFull, split, project, nextRung, carMaths } from './engine.js';
import { t, setLang, lang } from './i18n.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TABS = ['ladder', 'car', 'log', 'settings'], CURS = ['EUR', 'CHF', 'DKK', 'PLN', 'NOK', 'GBP', 'USD'];
const KINDS = ['safety', 'move', 'dog', 'events', 'etf', 'car', 'custom'];
const ui = { session: undefined, edit: null };
const loc = () => lang() === 'fr' ? 'fr-FR' : 'en-GB';
const nf = {};
const money = v => { const k = loc() + S.cur; nf[k] = nf[k] || new Intl.NumberFormat(loc(), { style: 'currency', currency: S.cur, maximumFractionDigits: 0 }); return nf[k].format(Math.round(v || 0)).replace(/^-/, '−'); };
const month = ym => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1).toLocaleDateString(loc(), { month: 'short', year: 'numeric' });
const day = d => new Date(d + 'T12:00').toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' });
const one = v => new Intl.NumberFormat(loc(), { maximumFractionDigits: 1 }).format(v);
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2400); }
function sheet(html) { const d = $('#sheet'); d.innerHTML = html; if (!d.open) d.showModal(); d.scrollTop = 0; }
const closeSheet = () => { const d = $('#sheet'); if (d.open) d.close(); ui.edit = null; };

const nameOf = r => { if (r.name) return r.name; if (r.kind === 'car' && r.link) { const c = readCar(); if (c && c.name) return t('kind.carEc', { n: c.name }); } return t('kind.' + (KINDS.includes(r.kind) ? r.kind : 'custom')); };
const partLabel = (r, p, i) => p.label || (r.kind === 'move' && i < 3 ? t('move.p' + i) : t('part.n', { n: i + 1 }));
/* the emergency-fund rung can take its figures from Safety Net Score on this device */
function eff(r) {
  if (r.kind === 'safety' && r.link) { const sn = readSafety(); if (sn && (!sn.cur || sn.cur === S.cur)) return { ...r, parts: null, saved: sn.saved, target: sn.target || r.target, linked: true, levels: !!sn.target, from: 'sn' }; }
  /* the move buffer's target from Safety Net's move planner; what is set aside stays yours */
  if (r.kind === 'move' && r.link) { const mv = readMove(); if (mv && mv.cur === S.cur) return { ...r, parts: null, target: mv.target, linkedT: true, from: 'sn' }; }
  /* the ETF rung's balance from Gains & Greeks; the target stays yours, and this month's money is not added here */
  if (r.kind === 'etf' && r.link) { const g = readGG(); if (g && g.cur === S.cur) return { ...r, saved: g.saved, linked: true, from: 'gg' }; }
  /* the car rung's target from the car put on the ladder in Écurie; what is set aside stays yours */
  if (r.kind === 'car' && r.link) { const c = readCar(); if (c && c.cur === S.cur) return { ...r, parts: null, target: c.target, linkedT: true, from: 'ec' }; }
  return r;
}
const effRungs = () => S.rungs.map(eff);
const projectAll = R => project(R, S.monthly, S.rule, undefined, { infl: S.infl });

/* ---------- the ladder ---------- */
function rungHtml(r, i, P, nxt) {
  const p = P.by[r.id], full = isFull(r), tgt = targetOf(r), bits = [];
  if (r.paused) bits.push(`<span class="warn">${esc(t('rung.paused'))}</span>`);
  else if (full) bits.push(esc(t('rung.full')));
  else {
    if (p.share > 0) bits.push(esc(t('rung.share', { v: money(p.share) })));
    if (p.when) bits.push(esc(t('rung.when', { m: month(p.when) })));
    else if (tgt > 0) bits.push(`<span class="warn">${esc(t('rung.never'))}</span>`);
  }
  if (r.due && !full) bits.push(p.late === null || p.late <= 0 ? esc(t('rung.due', { m: month(r.due) })) : `<span class="warn">${esc(p.late === Infinity ? t('rung.dueMiss', { m: month(r.due) }) : t('rung.dueLate', { m: month(r.due), n: p.late }))}</span>`);
  return `<button class="rung${full ? ' full' : ''}${nxt && nxt.id === r.id ? ' cur' : ''}${r.paused ? ' paused' : ''}" data-act="rung" data-id="${r.id}" aria-label="${esc(nameOf(r))}">
<span class="rtop"><b><i class="n">${i + 1}</i>${esc(nameOf(r))}${r.linked || r.linkedT ? ` <em>${esc(t(r.from === 'gg' ? 'rung.linkedGG' : 'rung.linked'))}</em>` : ''}${Number(r.ret) > 0 ? ` <em>${esc(t('rung.ret', { r: r.ret }))}</em>` : ''}</b><span class="num">${money(Math.max(0, Number(r.saved) || 0))} <small>/ ${tgt > 0 ? money(tgt) : '—'}</small></span></span>
<span class="bar" role="img" aria-label="${Math.round(fillOf(r) * 100)} %"><i style="width:${(fillOf(r) * 100).toFixed(1)}%"></i></span>
<span class="rmeta">${bits.join(' · ')}</span></button>`;
}
function renderLadder() {
  const R = effRungs(), P = projectAll(R), nxt = nextRung(R);
  const ex = S.rungs.some(r => r.ex) ? `<p class="banner">${esc(t('ex.banner'))} <button class="link" data-act="ex-off">${esc(t('ex.off'))}</button></p>` : '';
  let head;
  if (!S.rungs.length) head = `<p class="kicker">${esc(t('next.k'))}</p><h1>${esc(t('next.none'))}</h1><p class="sub">${esc(t('next.noneSub'))}</p>`;
  else if (!nxt) head = `<p class="kicker">${esc(t('next.k'))}</p><h1>${esc(t('next.done'))}</h1><p class="sub">${esc(t('next.doneSub'))}</p>`;
  else { const p = P.by[nxt.id]; head = `<p class="kicker">${esc(t('next.k'))}</p><h1>${esc(nameOf(nxt))}</h1><p class="sub">${esc(t('next.sub', { v: money(needOf(nxt)) }))} ${esc(p.when ? t('next.when', { m: month(p.when), a: money(S.monthly) }) : t('next.noPace'))}</p>`; }
  const late = R.filter(r => !r.paused && !isFull(r) && r.due && P.by[r.id].late > 0);
  const hint = late.length ? `<p class="callout">${esc(t(S.rule === 'order' ? 'late.order' : 'late.pct', { n: late.length, name: nameOf(late[0]), v: money(late.reduce((a, r) => a + (P.by[r.id].perMonthForDue || 0), 0)) }))}</p>` : '';
  const totalT = R.reduce((a, r) => a + targetOf(r), 0), totalS = R.reduce((a, r) => a + Math.min(targetOf(r), Math.max(0, Number(r.saved) || 0)), 0);
  return ex + `<section class="next">${head}</section>
<section class="pace"><label class="fld"><span>${esc(t('pace.monthly'))}</span><span class="box"><input data-f="monthly" type="number" inputmode="decimal" min="0" step="50" value="${S.monthly || ''}"><i>${S.cur}</i></span></label>
<div class="fld"><span>${esc(t('pace.rule'))}</span><div class="seg" role="group"><button data-act="rule" data-r="order" aria-pressed="${S.rule === 'order'}">${esc(t('pace.order'))}</button><button data-act="rule" data-r="pct" aria-pressed="${S.rule === 'pct'}">${esc(t('pace.pct'))}</button></div></div></section>
${hint}
${S.rungs.length ? `<section class="wall"><p class="top">${esc(t('wall.top', { s: money(totalS), t: money(totalT) }))}</p><div class="ladder" id="ladder">${R.map((r, i) => rungHtml(r, i, P, nxt)).reverse().join('')}</div><p class="ground">${esc(t('wall.ground'))}</p></section>` : ''}
<div class="row actions"><button class="btn pri" data-act="alloc" ${S.monthly > 0 && nxt ? '' : 'disabled'}>${esc(t('alloc.cta', { v: money(S.monthly) }))}</button><button class="btn" data-act="rung-add">${esc(t('rung.add'))}</button></div>
<p class="note">${esc(t('ladder.note'))}</p>`;
}

function rungSheet(id) {
  const r = S.rungs.find(x => x.id === id); if (!r) return;
  ui.edit = id;
  const i = S.rungs.indexOf(r), e = eff(r), hasParts = r.parts && r.parts.length;
  const sn = r.kind === 'safety' ? readSafety() : null;
  const linkBox = r.kind === 'safety' ? `<div class="linkbox"><label class="chk"><input type="checkbox" data-rf="link" ${r.link ? 'checked' : ''}> <span>${esc(t('link.use'))}</span></label><p class="note">${esc(!r.link ? t('link.off') : !sn ? t('link.none') : e.linked ? (e.levels ? t('link.on', { s: money(e.saved), t: money(e.target) }) : t('link.onNoLevel', { s: money(e.saved) })) : t('link.cur'))} <a href="../safety-net/">${esc(t('link.open'))}</a></p></div>` : '';
  const mv = r.kind === 'move' ? readMove() : null, gg = r.kind === 'etf' ? readGG() : null, ec = r.kind === 'car' ? readCar() : null;
  const linkBox2 = r.kind === 'move' ? `<div class="linkbox"><label class="chk"><input type="checkbox" data-rf="link" ${r.link ? 'checked' : ''}> <span>${esc(t('link.useMove'))}</span></label><p class="note">${esc(!r.link ? t('link.offMove') : !mv ? t('link.noneMove') : mv.cur !== S.cur ? t('link.cur') : t('link.onMove', { t: money(mv.target), g: money(mv.good) }))} <a href="../safety-net/">${esc(t('link.open'))}</a></p></div>`
    : r.kind === 'etf' ? `<div class="linkbox"><label class="chk"><input type="checkbox" data-rf="link" ${r.link ? 'checked' : ''}> <span>${esc(t('link.useGG'))}</span></label><p class="note">${esc(!r.link ? t('link.offGG') : !gg ? t('link.noneGG') : gg.cur !== S.cur ? t('link.cur') : t('link.onGG', { s: money(gg.saved) }))} <a href="../gains-greeks/">${esc(t('link.openGG'))}</a></p></div>`
    : r.kind === 'car' ? `<div class="linkbox"><label class="chk"><input type="checkbox" data-rf="link" ${r.link ? 'checked' : ''}> <span>${esc(t('link.useEc'))}</span></label><p class="note">${esc(!r.link ? t('link.offEc') : !ec ? t('link.noneEc') : ec.cur !== S.cur ? t('link.cur') : t('link.onEc', { t: money(ec.target), n: ec.name }))} <a href="../ecurie/">${esc(t('link.openEc'))}</a></p></div>` : '';
  const parts = hasParts ? `<div class="parts">${r.parts.map((p, k) => `<div class="prow"><input type="text" maxlength="40" data-pf="label" data-k="${k}" value="${esc(p.label || '')}" placeholder="${esc(partLabel(r, p, k))}" aria-label="${esc(t('part.label'))}"><input type="number" inputmode="decimal" min="0" step="50" data-pf="amt" data-k="${k}" value="${p.amt || ''}" aria-label="${esc(t('part.amt'))}"><button class="x" data-act="part-del" data-k="${k}" aria-label="${esc(t('part.del'))}">×</button></div>`).join('')}<p class="note">${esc(t('part.sum', { v: money(targetOf(r)) }))}</p></div>` : '';
  sheet(`<h2>${esc(t('edit.h', { n: i + 1 }))}</h2>
<div class="grid"><label class="fld wide"><span>${esc(t('f.name'))}</span><span class="box"><input type="text" maxlength="40" data-rf="name" value="${esc(r.name || '')}" placeholder="${esc(t('kind.' + (KINDS.includes(r.kind) ? r.kind : 'custom')))}"></span></label>
${linkBox}${linkBox2}
${e.linked && e.from === 'sn' ? '' : `${e.linkedT ? '' : hasParts ? `<div class="fld wide"><span>${esc(t('f.parts'))}</span>${parts}<div class="row"><button class="btn sm" data-act="part-add">${esc(t('part.add'))}</button></div></div>` : `<label class="fld"><span>${esc(t('f.target'))}</span><span class="box"><input type="number" inputmode="decimal" min="0" step="100" data-rf="target" value="${r.target || ''}"><i>${S.cur}</i></span></label>`}
${e.linked ? '' : `<label class="fld"><span>${esc(t('f.saved'))}</span><span class="box"><input type="number" inputmode="decimal" min="0" step="50" data-rf="saved" value="${r.saved || ''}"><i>${S.cur}</i></span></label>`}`}
<label class="fld"><span>${esc(t('f.ret'))}</span><span class="box"><input type="number" inputmode="decimal" min="0" max="20" step="0.5" data-rf="ret" value="${r.ret || ''}" placeholder="0"><i>%</i></span><small>${esc(t('f.retHint'))}</small></label>
<label class="fld"><span>${esc(t('f.due'))}</span><span class="box"><input type="month" data-rf="due" value="${esc(r.due || '')}"></span><small>${esc(t('f.dueHint'))}</small></label>
<label class="fld"><span>${esc(t('f.pct'))}</span><span class="box"><input type="number" inputmode="decimal" min="0" max="100" step="5" data-rf="pct" value="${r.pct ?? ''}"><i>%</i></span><small>${esc(t('f.pctHint'))}</small></label></div>
${!e.linked && !e.linkedT && !hasParts ? `<div class="row"><button class="link" data-act="part-add">${esc(t('part.start'))}</button></div>` : ''}
<div class="row tools"><button class="btn sm" data-act="rung-up" ${i >= S.rungs.length - 1 ? 'disabled' : ''}>↑ ${esc(t('edit.up'))}</button><button class="btn sm" data-act="rung-down" ${i <= 0 ? 'disabled' : ''}>↓ ${esc(t('edit.down'))}</button><button class="btn sm" data-act="rung-pause">${esc(t(r.paused ? 'edit.resume' : 'edit.pause'))}</button></div>
<div class="row end"><button class="link danger" data-act="rung-del">${esc(t('edit.del'))}</button><button class="btn sm pri" data-act="close">${esc(t('common.done'))}</button></div>`);
}

function allocSheet() {
  const R = effRungs(), s = split(R.map(r => ({ id: r.id, need: needOf(r), paused: r.paused, pct: r.pct })), S.monthly, S.rule);
  const rows = R.filter(r => s.by[r.id]).map(r => `<div class="kv"><span>${esc(nameOf(r))}${r.linked ? ` <em>${esc(t('alloc.linked'))}</em>` : ''}</span><b class="num">${money(s.by[r.id])}</b></div>`).join('');
  sheet(`<h2>${esc(t('alloc.h', { v: money(S.monthly) }))}</h2><p class="note">${esc(t(S.rule === 'order' ? 'alloc.subOrder' : 'alloc.subPct'))}</p>${rows}${s.left > 0 ? `<div class="kv"><span>${esc(t('alloc.left'))}</span><b class="num">${money(s.left)}</b></div>` : ''}
${R.some(r => r.linked && s.by[r.id]) ? `<p class="note">${esc(t('alloc.linkedNote'))}</p>` : ''}
<div class="row end"><button class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button class="btn sm pri" data-act="alloc-yes">${esc(t('alloc.yes'))}</button></div>`);
}
function allocate() {
  const R = effRungs(), s = split(R.map(r => ({ id: r.id, need: needOf(r), paused: r.paused, pct: r.pct })), S.monthly, S.rule);
  const names = {}; let put = 0;
  for (const r of R) { const a = s.by[r.id]; if (!a) continue; names[r.id] = nameOf(r); put += a; if (!r.linked) { const o = S.rungs.find(x => x.id === r.id); o.saved = Math.round(((Number(o.saved) || 0) + a) * 100) / 100; } }
  if (!put) return;
  S.rungs.forEach(r => { delete r.ex; });
  S.log.unshift({ id: uid(), d: new Date().toISOString().slice(0, 10), amt: Math.round(put * 100) / 100, by: s.by, names, linked: R.filter(r => r.linked && s.by[r.id]).map(r => r.id) });
  S.log = S.log.slice(0, 240); save(); closeSheet(); render(); toast(t('alloc.done', { v: money(put) }));
}

/* ---------- 812 maths ---------- */
function carOut() {
  const m = carMaths(S.car);
  if (!(m.year > 0) || m.rentalDays === null) return `<p class="sub">${esc(t('car.need'))}</p>`;
  let cmp = '';
  if (m.ownPerDay !== null) cmp = `<div class="cols"><div class="card"><h3>${esc(t('car.own'))}</h3><p class="big num">${money(m.ownPerDay)}</p><p class="note">${esc(t('car.perDay'))}</p></div><div class="card"><h3>${esc(t('car.rent'))}</h3><p class="big num">${money(S.car.day)}</p><p class="note">${esc(t('car.perDay'))}</p></div></div>
<p class="callout">${esc(m.saving >= 0 ? t('car.verdictRent', { d: one(S.car.days), v: money(m.saving) }) : t('car.verdictOwn', { d: one(S.car.days), v: money(-m.saving) }))}</p>`;
  return `<p class="kicker">${esc(t('car.k'))}</p><h1>${esc(t('car.h1', { n: one(m.rentalDays) }))}</h1><p class="sub">${esc(t('car.sub', { v: money(m.year), d: money(S.car.day) }))}</p>${cmp}`;
}
function renderCar() {
  const c = S.car, f = (k, step) => `<label class="fld"><span>${esc(t('car.f.' + k))}</span><span class="box"><input data-cf="${k}" type="number" inputmode="decimal" min="0" step="${step}" value="${c[k] || ''}"><i>${k === 'days' ? esc(t('car.u.days')) : S.cur}</i></span></label>`;
  return `${c.ex ? `<p class="banner">${esc(t('car.ex'))}</p>` : ''}<section class="next" id="carOut">${carOut()}</section>
<section><h2>${esc(t('car.inputs'))}</h2><div class="grid">${f('dep', 500)}${f('ins', 100)}${f('service', 100)}${f('day', 50)}${f('days', 1)}</div><p class="note">${esc(t('car.note'))}</p></section>`;
}

/* ---------- log ---------- */
function renderLog() {
  if (!S.log.length) return `<section><h1>${esc(t('log.h1'))}</h1><p class="sub">${esc(t('log.empty'))}</p></section>`;
  const tot = S.log.reduce((a, e) => a + e.amt, 0);
  return `<section><h1>${esc(t('log.h1'))}</h1><p class="sub">${esc(t('log.sub', { n: S.log.length, v: money(tot) }))}</p></section>
<section class="logs">${S.log.map((e, i) => `<div class="card"><div class="kv sumtop"><span>${esc(day(e.d))}</span><b class="num">${money(e.amt)}</b></div>${Object.entries(e.by).map(([id, a]) => `<div class="kv"><span>${esc((S.rungs.find(r => r.id === id) ? nameOf(S.rungs.find(r => r.id === id)) : (e.names && e.names[id])) || t('kind.custom'))}</span><b class="num">${money(a)}</b></div>`).join('')}${i === 0 ? `<div class="row end"><button class="link" data-act="undo">${esc(t('log.undo'))}</button></div>` : ''}</div>`).join('')}</section>`;
}

/* ---------- settings ---------- */
function renderSettings() {
  const email = ui.session, on = window.Cloud && window.Cloud.configured();
  return `<section><h1>${esc(t('set.h1'))}</h1></section>
<section><h2>${esc(t('set.lang'))}</h2><div class="seg" role="group"><button data-act="lang" data-l="en" aria-pressed="${lang() === 'en'}">English</button><button data-act="lang" data-l="fr" aria-pressed="${lang() === 'fr'}">Français</button></div></section>
<section><h2>${esc(t('set.cur'))}</h2><label class="fld"><span class="box"><select data-f="cur" aria-label="${esc(t('set.cur'))}">${CURS.map(c => `<option${c === S.cur ? ' selected' : ''}>${c}</option>`).join('')}</select></span></label></section>
<section><h2>${esc(t('set.infl'))}</h2><p class="note">${esc(t('infl.sub'))}</p><label class="fld"><span class="box"><input type="number" inputmode="decimal" min="0" max="10" step="0.5" data-f="infl" value="${S.infl || ''}" placeholder="0" aria-label="${esc(t('set.infl'))}"><i>%</i></span></label></section>
<section><h2>${esc(t('set.sync'))}</h2><p class="note">${esc(!on ? t('sync.none') : email ? t('sync.on', { e: email }) : t('sync.off'))}</p>${on ? `<div class="row"><button class="btn sm" data-act="sync">${esc(email ? t('sync.manage') : t('sync.signin'))}</button></div>` : ''}<p class="note">${esc(t('sync.private'))}</p></section>
<section><h2>${esc(t('set.ideas'))}</h2><p class="note">${esc(t('ideas.sub'))}</p><label class="fld wide"><span>${esc(t('ideas.link'))}</span><span class="box"><input type="url" data-inbox value="${esc(S.inbox || '')}" placeholder="https://docs.google.com/…"></span></label>${S.inbox ? `<div class="row"><a class="btn sm" href="${esc(S.inbox)}" target="_blank" rel="noopener">${esc(t('ideas.open'))}</a></div>` : ''}</section>
<section><h2>${esc(t('set.data'))}</h2><div class="row"><button class="btn sm" data-act="export">${esc(t('data.export'))}</button><label class="btn sm">${esc(t('data.import'))}<input type="file" accept="application/json,.json" data-import hidden></label></div>
<div class="row" style="margin-top:14px">${S.rungs.some(r => r.ex) ? `<button class="btn sm" data-act="ex-off">${esc(t('ex.off'))}</button>` : `<button class="btn sm" data-act="ex-on">${esc(t('ex.on'))}</button>`}<button class="btn sm danger" data-act="reset">${esc(t('data.reset'))}</button></div></section>
<p class="note">${esc(t('ladder.note'))}</p>`;
}

/* ---------- shell ---------- */
export function render() {
  document.documentElement.lang = lang();
  const tab = TABS.includes(S.ui.tab) ? S.ui.tab : 'ladder';
  $('#tabs').innerHTML = TABS.map(k => `<button data-act="tab" data-tab="${k}" ${k === tab ? 'aria-current="page"' : ''}>${esc(t('tab.' + k))}</button>`).join('');
  $('#main').innerHTML = { ladder: renderLadder, car: renderCar, log: renderLog, settings: renderSettings }[tab]();
}
export function refreshSession() {
  if (!window.Cloud || !window.Cloud.configured()) return;
  window.Cloud.session().then(s => { const e = s ? s.user.email : null; if (e !== ui.session) { ui.session = e; if (S.ui.tab === 'settings') render(); } }).catch(() => { });
}
const editing = () => S.rungs.find(r => r.id === ui.edit);
const touch = r => { if (r) delete r.ex; save(); };

function act(el) {
  const a = el.dataset.act, r = editing(), i = r ? S.rungs.indexOf(r) : -1;
  if (a === 'tab') { S.ui.tab = el.dataset.tab; saveUi(); render(); window.scrollTo(0, 0); }
  else if (a === 'close') { closeSheet(); render(); }
  else if (a === 'rule') { S.rule = el.dataset.r; save(); render(); }
  else if (a === 'rung') rungSheet(el.dataset.id);
  else if (a === 'rung-add') sheet(`<h2>${esc(t('add.h'))}</h2><form method="dialog" data-form="add" class="grid" novalidate><label class="fld wide"><span>${esc(t('f.kind'))}</span><span class="box"><select name="kind">${KINDS.map(k => `<option value="${k}"${k === 'custom' ? ' selected' : ''}>${esc(t('kind.' + k))}</option>`).join('')}</select></span></label><label class="fld wide"><span>${esc(t('f.name'))}</span><span class="box"><input name="name" type="text" maxlength="40" placeholder="${esc(t('f.namePh'))}"></span></label><label class="fld"><span>${esc(t('f.target'))}</span><span class="box"><input name="target" type="number" inputmode="decimal" min="0" step="100"><i>${S.cur}</i></span></label><label class="fld"><span>${esc(t('f.due'))}</span><span class="box"><input name="due" type="month"></span></label><div class="row end wide"><button type="button" class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button class="btn sm pri">${esc(t('add.go'))}</button></div></form>`);
  else if (a === 'rung-up' && r && i < S.rungs.length - 1) { S.rungs.splice(i, 1); S.rungs.splice(i + 1, 0, r); touch(r); rungSheet(r.id); }
  else if (a === 'rung-down' && r && i > 0) { S.rungs.splice(i, 1); S.rungs.splice(i - 1, 0, r); touch(r); rungSheet(r.id); }
  else if (a === 'rung-pause' && r) { r.paused = !r.paused; touch(r); rungSheet(r.id); }
  else if (a === 'rung-del' && r) { S.rungs = S.rungs.filter(x => x !== r); save(); closeSheet(); render(); }
  else if (a === 'part-add' && r) { r.parts = r.parts && r.parts.length ? r.parts : (r.target > 0 ? [{ id: uid(), label: '', amt: r.target }] : []); r.parts.push({ id: uid(), label: '', amt: 0 }); touch(r); rungSheet(r.id); }
  else if (a === 'part-del' && r) { r.parts.splice(Number(el.dataset.k), 1); if (!r.parts.length) { r.parts = null; } touch(r); rungSheet(r.id); }
  else if (a === 'alloc') allocSheet();
  else if (a === 'alloc-yes') allocate();
  else if (a === 'undo') { const e = S.log[0]; if (!e) return; for (const [id, amt] of Object.entries(e.by)) { if ((e.linked || []).includes(id)) continue; const x = S.rungs.find(q => q.id === id); if (x) x.saved = Math.max(0, Math.round(((Number(x.saved) || 0) - amt) * 100) / 100); } S.log.shift(); save(); render(); toast(t('log.undone')); }
  else if (a === 'lang') { S.lang = el.dataset.l; setLang(S.lang); save(); render(); }
  else if (a === 'sync') { if (window.Cloud) window.Cloud.dialog(() => window.appSync && window.appSync()); }
  else if (a === 'ex-off') { S.rungs = S.rungs.filter(x => !x.ex); save(); render(); }
  else if (a === 'ex-on') { S.rungs.push(...examples()); save(); render(); }
  else if (a === 'reset') sheet(`<h2>${esc(t('reset.h'))}</h2><p class="note">${esc(t('reset.sub'))}</p><div class="row end"><button class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button class="btn sm danger" data-act="reset-yes">${esc(t('reset.yes'))}</button></div>`);
  else if (a === 'reset-yes') { const lg = S.lang; reset(); S.lang = lg; save(true); closeSheet(); render(); }
  else if (a === 'export') { const url = URL.createObjectURL(exportBackup()), x = document.createElement('a'); x.href = url; x.download = 'funds-ladder-' + new Date().toISOString().slice(0, 10) + '.json'; x.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
  else if (a === 'reload') location.reload();
}

export function init() {
  document.addEventListener('click', ev => { const el = ev.target.closest('[data-act]'); if (el && !el.disabled) act(el); });
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('[data-form=add]'); if (!f) return; ev.preventDefault();
    S.rungs.push({ id: uid(), kind: f.kind.value, name: f.name.value.trim(), target: Math.max(0, Number(f.target.value) || 0), saved: 0, due: f.due.value || null, pct: 10, link: f.kind.value === 'safety' });
    save(); closeSheet(); render();
  });
  const onField = (ev, done) => {
    const el = ev.target, r = editing();
    if (el.dataset.f === 'monthly') { S.monthly = Math.max(0, Number(el.value) || 0); save(); if (done) render(); }
    else if (el.dataset.f === 'cur' && done) { S.cur = el.value; save(); render(); }
    else if (el.dataset.f === 'infl') { S.infl = Math.min(10, Math.max(0, Number(el.value) || 0)); save(); if (done) render(); }
    else if (el.dataset.rf && r) {
      const k = el.dataset.rf;
      if (k === 'link') { r.link = el.checked; touch(r); rungSheet(r.id); return; }
      r[k] = k === 'name' ? el.value : k === 'due' ? (el.value || null) : Math.max(0, Number(el.value) || 0); touch(r);
    }
    else if (el.dataset.pf && r && r.parts) { const p = r.parts[Number(el.dataset.k)]; if (!p) return; p[el.dataset.pf] = el.dataset.pf === 'label' ? el.value : Math.max(0, Number(el.value) || 0); touch(r); if (done && el.dataset.pf === 'amt') rungSheet(r.id); }
    else if (el.dataset.cf) { S.car[el.dataset.cf] = Math.max(0, Number(el.value) || 0); delete S.car.ex; save(); const o = $('#carOut'); if (o) o.innerHTML = carOut(); }
    else if (el.dataset.inbox !== undefined && done) { setInbox(el.value.trim()); render(); }
    else if (el.dataset.import !== undefined && done && el.files[0]) { el.files[0].text().then(tx => { importBackup(tx); setLang(S.lang); render(); toast(t('data.imported')); }).catch(() => toast(t('data.importFail'))); }
  };
  document.addEventListener('input', ev => onField(ev, false));
  document.addEventListener('change', ev => onField(ev, true));
  $('#sheet').addEventListener('close', () => { if (ui.edit) { ui.edit = null; render(); } });
  $('#sheet').addEventListener('click', ev => { if (ev.target === $('#sheet')) { closeSheet(); render(); } });
  /* Safety Net Score may have changed in another tab */
  window.addEventListener('storage', ev => { if (ev.key === 'safetyNetScore.v1' && S.ui.tab === 'ladder' && !$('#sheet').open) render(); });
  render(); refreshSession();
}
