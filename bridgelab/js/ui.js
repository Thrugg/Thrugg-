/* BridgeLab — every screen. Reads the state, draws HTML, handles taps through data-act. Moving a slider only redraws
   the headline, the chart and the formula, so the slider keeps its grip. */
import { S, save, saveUi, flush, usePreset, edited, reset, setInbox } from './store.js';
import { SKUS, CATS, PRESETS, PRESET_KEYS } from './portfolio.js';
import { ORDERS, lines, bridge, allOrders, crossTerms, steps, domain, skuRows, materiality, spread, drivers } from './engine.js';
import { waterfall } from './chart.js';
import { t, setLang, lang } from './i18n.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TABS = ['bridge', 'trap', 'table', 'settings'];
const ui = { session: undefined };
const loc = () => lang() === 'fr' ? 'fr-FR' : 'en-GB';
const fr = () => lang() === 'fr';
const nfc = {};
const num = (v, d) => { const k = loc() + d; nfc[k] = nfc[k] || new Intl.NumberFormat(loc(), { minimumFractionDigits: d, maximumFractionDigits: d }); return nfc[k].format(v); };
const sgn = (v, shown) => Number(shown.replace(/[^\d]/g, '')) === 0 ? '' : v > 0 ? '+' : v < 0 ? '−' : '';
/* money in millions with two decimals; thousands in the table */
export function fm(v, sign = true) { const n = num(Math.abs(v) / 1e6, 2), s = sign ? sgn(v, n) : (v < 0 && Number(n.replace(/[^\d]/g, '')) ? '−' : ''); return fr() ? `${s}${n}\u00a0M€` : `${s}€${n}m`; }
const fk = (v, sign = false) => { const n = num(Math.abs(v) / 1000, 0), s = sign ? sgn(v, n) : (v < 0 && Number(n.replace(/[^\d]/g, '')) ? '−' : ''); return fr() ? `${s}${n}\u00a0k€` : `${s}€${n}k`; };
const fpct = (x, d = 1) => { const n = num(Math.abs(x) * 100, d), s = sgn(x, n); return fr() ? `${s}${n}\u00a0%` : `${s}${n}%`; };
const ft = q => `${num(q, 0)}\u00a0t`;
const fkg = p => fr() ? `${num(p, 2)}\u00a0€/kg` : `€${num(p, 2)}/kg`;
const axis = v => num(v / 1e6, Math.abs(v / 1e6 - Math.round(v / 1e6)) < 1e-9 ? 0 : 1);   // tick labels in millions; the unit is in the note under the chart
const nameOf = x => x.name[lang()] || x.name.en;
const joinList = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + (fr() ? ' et ' : ' and ') + a[a.length - 1];
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const label = k => t('bar.' + k);

const model = () => { const L = lines(SKUS, S.adj); return { L, b: bridge(L, S.order) }; };

/* ---------- the bridge ---------- */
function headlineHtml(b) {
  const h = Math.abs(b.change) < 5000 ? t('h.flat') : t(b.change > 0 ? 'h.up' : 'h.down', { v: fm(Math.abs(b.change), false), p: fpct(b.pct) });
  const parts = drivers(b).filter(([, v]) => Math.abs(v) >= 5000).map(([k, v]) => t(v >= 0 ? 'drv.add' : 'drv.sub', { k: t('drvn.' + k), v: fm(Math.abs(v), false) }));
  return `<p class="kicker">${esc(t('k.company'))}</p><h1>${esc(h)}</h1>${parts.length ? `<p class="sub">${esc(cap(joinList(parts)))}.</p>` : ''}`;
}
function chartHtml(b) {
  const st = steps(b, S.split), [lo, hi] = domain(st);
  const sel = st.some(s => s.key === S.ui.sel) ? S.ui.sel : 'price';
  return waterfall(st, { lo, hi, label, money: fm, axis, sel, caption: t('chart.caption') }) + `<p class="note axisnote">${esc(t('chart.axis', { v: fm(lo, false) }))}</p>`;
}
function catStats(L, pk) {
  const Q0 = L.reduce((a, x) => a + x.q0, 0), Q1 = L.reduce((a, x) => a + x.q1, 0);
  return CATS.map(c => { const M = L.filter(x => x.cat === c.id), q0 = M.reduce((a, x) => a + x.q0, 0), q1 = M.reduce((a, x) => a + x.q1, 0); return { c, s0: q0 / Q0, s1: q1 / Q1, p0: M.reduce((a, x) => a + x.q0 * x[pk], 0) / q0, p1: M.reduce((a, x) => a + x.q1 * x[pk], 0) / q1 }; });
}
const top = (rows, f, n = 3) => [...rows].sort((a, c) => Math.abs(f(c)) - Math.abs(f(a))).filter(r => Math.abs(f(r)) >= 500).slice(0, n);
function explainHtml(L, b) {
  const T = b.T, k = steps(b, S.split).some(s => s.key === S.ui.sel) ? S.ui.sel : 'price', o = b.order;
  const line = (f, v) => `<p class="formula">${esc(f)}</p><p class="calc">${v}</p>`;
  let body = '';
  if (k === 'base' || k === 'actual') {
    const q = k === 'base' ? T.Q0 : T.Q1, s = k === 'base' ? T.S00 : T.S11;
    body = line(t('ex.total'), `${esc(ft(q))} × ${esc(fkg(s / q / 1000))} = <b>${esc(fm(s, false))}</b>`) + `<p class="note">${esc(t('ex.totalNote'))}</p>`;
  } else if (k === 'vol') {
    const basis = o === 'pvm' ? T.P0s : o === 'mvp' ? T.A1 : T.P0, bk = o === 'pvm' ? 'P0s' : o === 'mvp' ? 'A1' : 'P0';
    body = line(t('ex.vol', { basis: t('basis.' + bk) }), `(${esc(ft(T.Q1))} − ${esc(ft(T.Q0))}) × ${esc(fkg(basis / 1000))} = <b>${esc(fm(b.vol))}</b>`);
  } else if (k === 'mixB' || k === 'mixW' || k === 'mix') {
    const cs = catStats(L, b.mixP), v = k === 'mixB' ? b.mixBetween : k === 'mixW' ? b.mixWithin : b.mix;
    body = line(t('ex.' + k, { V: ft(b.mixV), when: t(b.mixV === T.Q1 ? 'when.ac' : 'when.py'), prices: t(b.mixP === 'p1' ? 'prices.ac' : 'prices.py') }), `<b>${esc(fm(v))}</b>`)
      + `<table class="mini"><thead><tr><th></th><th>${esc(t('ex.share'))}</th><th>${esc(t('ex.avg'))}</th></tr></thead><tbody>${cs.map(x => `<tr><th>${esc(nameOf(x.c))}</th><td>${esc(fpct(x.s0, 1).replace('+', ''))} → ${esc(fpct(x.s1, 1).replace('+', ''))}</td><td>${esc(fkg(x.p0))} → ${esc(fkg(x.p1))}</td></tr>`).join('')}</tbody></table><p class="note">${esc(t('ex.mixNote'))}</p>`;
  } else if (k === 'price') {
    const atAc = o === 'vmp' || o === 'mvp', rows = skuRows(L, o);
    body = line(t(atAc ? 'ex.priceAc' : 'ex.pricePy'), `<b>${esc(fm(b.price))}</b>`) + `<p class="note">${esc(t('ex.mostly'))} ${esc(top(rows, r => r.price).map(r => `${nameOf(r)} ${fm(r.price)}`).join(' · '))}</p>`;
  } else if (k === 'vm') {
    body = line(t('ex.vm'), `(${esc(ft(T.Q1))} − ${esc(ft(T.Q0))}) × (${esc(fkg(T.A1 / 1000))} − ${esc(fkg(T.P0 / 1000))}) = <b>${esc(fm(b.vm))}</b>`);
  } else if (k === 'pv') {
    const rows = skuRows(L, 'pure');
    body = line(t('ex.pv'), `<b>${esc(fm(b.pv))}</b>`) + `<p class="note">${esc(t('ex.mostly'))} ${esc(top(rows, r => r.joint).map(r => `${nameOf(r)} ${fm(r.joint)}`).join(' · '))}</p>`;
  }
  return `<h3>${esc(label(k))}</h3>${body}`;
}
function refreshBridge() {
  const { L, b } = model(), h = $('#headline'), c = $('#chart'), e = $('#explain');
  if (h) h.innerHTML = headlineHtml(b); if (c) c.innerHTML = chartHtml(b); if (e) e.innerHTML = explainHtml(L, b);
  const p = $('#presetNote'); if (p) p.textContent = edited() ? t('preset.edited') : '';
  for (const cat of CATS) { const el = document.querySelector(`[data-catline="${cat.id}"]`); if (el) el.textContent = catLine(L, cat.id); }
}
function catLine(L, id) { const M = L.filter(x => x.cat === id), s0 = M.reduce((a, x) => a + x.q0 * x.p0, 0) * 1000, s1 = M.reduce((a, x) => a + x.q1 * x.p1, 0) * 1000; return `${fm(s0, false)} → ${fm(s1, false)} (${fpct(s1 / s0 - 1)})`; }
const pctOut = v => fpct(v / 100, Number.isInteger(v) ? 0 : 1);
function renderBridge() {
  const { L, b } = model();
  const orders = `<div class="orders" role="group" aria-label="${esc(t('ord.aria'))}">${ORDERS.map(o => `<button data-act="order" data-v="${o}" aria-pressed="${S.order === o}">${esc(t('ord.short.' + o))}</button>`).join('')}</div><p class="note orddesc">${esc(t('ord.desc.' + S.order))}</p>`;
  const sliders = CATS.map(c => `<details class="cat" data-cat="${c.id}" ${S.ui.open[c.id] ? 'open' : ''}><summary><b>${esc(nameOf(c))}</b><small data-catline="${c.id}">${esc(catLine(L, c.id))}</small></summary>${SKUS.filter(s => s.cat === c.id).map(s => { const a = S.adj[s.id]; return `<div class="sku"><p class="sn">${esc(nameOf(s))}<small>${esc(ft(s.q0))} · ${esc(fkg(s.p0))}</small></p><label class="sl"><span>${esc(t('sl.vol'))}</span><input type="range" min="-40" max="40" step="1" data-adj="${s.id}" data-k="dv" value="${a.dv}" aria-label="${esc(t('sl.volAria', { n: nameOf(s) }))}"><output>${esc(pctOut(a.dv))}</output></label><label class="sl"><span>${esc(t('sl.price'))}</span><input type="range" min="-15" max="15" step="0.5" data-adj="${s.id}" data-k="dp" value="${a.dp}" aria-label="${esc(t('sl.priceAria', { n: nameOf(s) }))}"><output>${esc(pctOut(a.dp))}</output></label></div>`; }).join('')}</details>`).join('');
  return `<section class="lead" id="headline">${headlineHtml(b)}</section>
<section class="panel">${orders}<label class="chk"><input type="checkbox" data-split ${S.split ? 'checked' : ''}> <span>${esc(t('split'))}</span></label><div id="chart">${chartHtml(b)}</div><div id="explain" class="explain" aria-live="polite">${explainHtml(L, b)}</div></section>
<section><h2>${esc(t('in.h'))}</h2><p class="note">${esc(t('in.sub'))}</p><div class="chips">${PRESET_KEYS.map(k => `<button class="chip" data-act="preset" data-v="${k}" aria-pressed="${S.preset === k && !edited()}">${esc(PRESETS[k].name[lang()] || PRESETS[k].name.en)}</button>`).join('')}</div><p class="note" id="presetNote">${esc(edited() ? t('preset.edited') : '')}</p>${sliders}</section>
<p class="note foot">${esc(t('synthetic'))}</p>`;
}

/* ---------- the trap ---------- */
function renderTrap() {
  const L = lines(SKUS, S.adj), all = allOrders(L), b = all[S.order], ct = crossTerms(L), mat = materiality(L, b), ps = spread(all, 'price');
  const rowsDef = [['vol', 'vol'], ['mix', 'mix'], ['price', 'price'], ['joint', null]];
  const cell = (o, k) => k === 'joint' ? (all[o].vm + all[o].pv) : all[o][k];
  const table = `<div class="tscroll"><table class="cmp"><thead><tr><th></th>${ORDERS.map(o => `<th class="${o === S.order ? 'on' : ''}">${esc(t('ord.short.' + o))}</th>`).join('')}</tr></thead><tbody>${rowsDef.map(([k]) => `<tr><th>${esc(t('cmp.' + k))}</th>${ORDERS.map(o => `<td class="${o === S.order ? 'on' : ''}">${esc(o !== 'pure' && k === 'joint' ? '–' : fm(cell(o, k)))}</td>`).join('')}</tr>`).join('')}<tr class="tot"><th>${esc(t('cmp.total'))}</th>${ORDERS.map(o => `<td class="${o === S.order ? 'on' : ''}">${esc(fm(all[o].change))}</td>`).join('')}</tr></tbody></table></div>`;
  const big = mat.material ? t('trap.material', { s: fpct(mat.share, 0).replace('+', '') }) : Math.abs(ct.pv) > 0.5 ? t('trap.small', { s: fpct(mat.share, 0).replace('+', '') }) : t('trap.none');
  const other = S.order === 'pvm' || S.order === 'pure' ? all.vmp.price : all.pvm.price;
  return `<section class="lead"><p class="kicker">${esc(t('trap.k'))}</p><h1>${esc(t('trap.h'))}</h1><p class="sub">${esc(t('trap.sub'))}</p></section>
<section class="panel">${table}<p class="callout">${esc(Math.abs(ps.max - ps.min) >= 5000 ? t('trap.range', { a: fm(ps.min), b: fm(ps.max), d: fm(Math.abs(ct.pv), false) }) : t('trap.norange'))} ${esc(big)}</p>${S.preset !== 'price' || edited() ? `<div class="row"><button class="btn sm" data-act="preset" data-v="price" data-go="trap">${esc(t('trap.try'))}</button></div>` : ''}</section>
<section><h2>${esc(t('why.h'))}</h2><p>${esc(t('why.p1'))}</p><p>${esc(t('why.p2'))}</p><p class="note">${esc(t('why.vm', { v: fm(ct.vm) }))}</p></section>
<section class="card present"><h2>${esc(t('pres.h'))}</h2><ol><li>${esc(t('pres.1'))}</li><li>${esc(t('pres.2'))}</li><li>${esc(t('pres.3'))}</li></ol>
<h3>${esc(t('pres.foot'))}</h3><p class="footnote">${esc(t('foot.' + S.order))}${S.order !== 'pure' && Math.abs(ct.pv) > 0.5 ? ' ' + esc(t('foot.alt', { v: fm(other), d: fm(ct.pv) })) : ''}</p></section>
<section><h3>${esc(t('de.h'))}</h3><p class="note">${esc(t('de.line'))}</p></section>`;
}

/* ---------- the table (the chart's twin, product by product) ---------- */
function renderTable() {
  const L = lines(SKUS, S.adj), rows = skuRows(L, S.order), pure = S.order === 'pure';
  const sumR = rs => rs.reduce((a, r) => ({ q0: a.q0 + r.q0, q1: a.q1 + r.q1, s0: a.s0 + r.s0, s1: a.s1 + r.s1, vm: a.vm + r.vm, price: a.price + r.price, joint: a.joint + r.joint }), { q0: 0, q1: 0, s0: 0, s1: 0, vm: 0, price: 0, joint: 0 });
  const tr = (r, cls, name) => `<tr class="${cls}"><th>${esc(name)}</th><td>${esc(num(r.q0, 0))}</td><td>${esc(num(r.q1, 0))}</td><td>${esc(fpct(r.q1 / r.q0 - 1))}</td>${r.p0 !== undefined ? `<td>${esc(num(r.p0, 2))}</td><td>${esc(num(r.p1, 2))}</td>` : '<td></td><td></td>'}<td>${esc(fk(r.s0))}</td><td>${esc(fk(r.s1))}</td><td>${esc(fk(r.vm, true))}</td><td>${esc(fk(r.price, true))}</td>${pure ? `<td>${esc(fk(r.joint, true))}</td>` : ''}</tr>`;
  let body = '';
  for (const c of CATS) { const rs = rows.filter(r => r.cat === c.id); body += rs.map(r => tr(r, '', nameOf(r))).join('') + tr(sumR(rs), 'subt', nameOf(c)); }
  body += tr(sumR(rows), 'tot', t('tb.total'));
  return `<section class="lead"><h1>${esc(t('tb.h'))}</h1><p class="sub">${esc(t('tb.sub', { o: t('ord.short.' + S.order) }))}</p></section>
<div class="tscroll"><table class="skus"><thead><tr><th></th><th colspan="3">${esc(t('tb.tonnes'))}</th><th colspan="2">${esc(t('tb.price'))}</th><th colspan="2">${esc(t('tb.sales'))}</th><th colspan="${pure ? 3 : 2}">${esc(t('tb.effects'))}</th></tr><tr><th>${esc(t('tb.product'))}</th><th>${esc(t('tb.py'))}</th><th>${esc(t('tb.ac'))}</th><th>Δ</th><th>${esc(t('tb.py'))}</th><th>${esc(t('tb.ac'))}</th><th>${esc(t('tb.py'))}</th><th>${esc(t('tb.ac'))}</th><th>${esc(t('tb.vm'))}</th><th>${esc(t('tb.pr'))}</th>${pure ? `<th>${esc(t('tb.jt'))}</th>` : ''}</tr></thead><tbody>${body}</tbody></table></div>
<p class="note">${esc(t('tb.note'))}</p><p class="note foot">${esc(t('synthetic'))}</p>`;
}

/* ---------- settings ---------- */
function renderSettings() {
  const email = ui.session, on = window.Cloud && window.Cloud.configured();
  return `<section class="lead"><h1>${esc(t('set.h1'))}</h1></section>
<section><h2>${esc(t('set.lang'))}</h2><div class="seg" role="group"><button data-act="lang" data-l="en" aria-pressed="${lang() === 'en'}">English</button><button data-act="lang" data-l="fr" aria-pressed="${lang() === 'fr'}">Français</button></div></section>
<section><h2>${esc(t('set.sync'))}</h2><p class="note">${esc(!on ? t('sync.none') : email ? t('sync.on', { e: email }) : t('sync.off'))}</p>${on ? `<div class="row"><button class="btn sm" data-act="sync">${esc(email ? t('sync.manage') : t('sync.signin'))}</button></div>` : ''}</section>
<section><h2>${esc(t('set.ideas'))}</h2><p class="note">${esc(t('ideas.sub'))}</p><label class="fld"><span>${esc(t('ideas.link'))}</span><span class="box"><input type="url" data-inbox value="${esc(S.inbox || '')}" placeholder="https://docs.google.com/…"></span></label>${S.inbox ? `<div class="row" style="margin-top:10px"><a class="btn sm" href="${esc(S.inbox)}" target="_blank" rel="noopener">${esc(t('ideas.open'))}</a></div>` : ''}</section>
<section><h2>${esc(t('set.about'))}</h2><p class="note">${esc(t('about.1'))}</p><p class="note">${esc(t('about.2'))}</p><div class="row"><button class="btn sm danger" data-act="reset">${esc(t('data.reset'))}</button></div></section>`;
}

/* ---------- shell ---------- */
export function render() {
  document.documentElement.lang = lang();
  const tab = TABS.includes(S.ui.tab) ? S.ui.tab : 'bridge';
  $('#tabs').innerHTML = TABS.map(k => `<button data-act="tab" data-tab="${k}" ${k === tab ? 'aria-current="page"' : ''}>${esc(t('tab.' + k))}</button>`).join('');
  $('#main').innerHTML = { bridge: renderBridge, trap: renderTrap, table: renderTable, settings: renderSettings }[tab]();
}
export function refreshSession() {
  if (!window.Cloud || !window.Cloud.configured()) return;
  window.Cloud.session().then(s => { const e = s ? s.user.email : null; if (e !== ui.session) { ui.session = e; if (S.ui.tab === 'settings') render(); } }).catch(() => { });
}
function sheet(html) { const d = $('#sheet'); d.innerHTML = html; if (!d.open) d.showModal(); }
const closeSheet = () => { const d = $('#sheet'); if (d.open) d.close(); };
function act(el) {
  const a = el.dataset.act;
  if (a === 'tab') { S.ui.tab = el.dataset.tab; saveUi(); render(); window.scrollTo(0, 0); }
  else if (a === 'order') { S.order = el.dataset.v; save(); if (S.ui.tab === 'bridge') { document.querySelectorAll('[data-act=order]').forEach(b => b.setAttribute('aria-pressed', b === el)); const d = $('.orddesc'); if (d) d.textContent = t('ord.desc.' + S.order); refreshBridge(); } else render(); }
  else if (a === 'bar') { S.ui.sel = el.dataset.k; saveUi(); document.querySelectorAll('.wrow').forEach(r => r.setAttribute('aria-pressed', r === el)); const { L, b } = model(); $('#explain').innerHTML = explainHtml(L, b); }
  else if (a === 'preset') { usePreset(el.dataset.v); save(); if (el.dataset.go) S.ui.tab = el.dataset.go; render(); }
  else if (a === 'lang') { S.lang = el.dataset.l; setLang(S.lang); save(); render(); }
  else if (a === 'sync') { if (window.Cloud) window.Cloud.dialog(() => { window.appSync && window.appSync(); refreshSession(); }); }
  else if (a === 'reset') sheet(`<h2>${esc(t('reset.h'))}</h2><p class="sub">${esc(t('reset.sub'))}</p><div class="row end"><button class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button class="btn sm danger" data-act="reset-yes">${esc(t('reset.yes'))}</button></div>`);
  else if (a === 'reset-yes') { const lg = S.lang; reset(); S.lang = lg; save(true); closeSheet(); render(); }
  else if (a === 'close') closeSheet();
  else if (a === 'reload') location.reload();
}
export function init() {
  document.addEventListener('click', ev => { const el = ev.target.closest('[data-act]'); if (el && !el.disabled) act(el); });
  document.addEventListener('input', ev => {
    const el = ev.target;
    if (el.dataset.adj) { const v = Number(el.value); S.adj[el.dataset.adj][el.dataset.k] = v; const o = el.parentElement.querySelector('output'); if (o) o.textContent = pctOut(v); save(); refreshBridge(); document.querySelectorAll('[data-act=preset]').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === S.preset && !edited())); }
  });
  document.addEventListener('change', ev => {
    const el = ev.target;
    if (el.dataset.split !== undefined) { S.split = el.checked; if (!S.split && (S.ui.sel === 'mixB' || S.ui.sel === 'mixW')) S.ui.sel = 'mix'; if (S.split && S.ui.sel === 'mix') S.ui.sel = 'mixB'; save(); refreshBridge(); }
    else if (el.dataset.inbox !== undefined) { setInbox(el.value.trim()); render(); }
  });
  document.addEventListener('toggle', ev => { const d = ev.target; if (d.matches && d.matches('details.cat')) { S.ui.open[d.dataset.cat] = d.open; saveUi(); } }, true);
  $('#sheet').addEventListener('click', ev => { if (ev.target === $('#sheet')) closeSheet(); });
  window.addEventListener('pagehide', flush);
  render(); refreshSession();
}
