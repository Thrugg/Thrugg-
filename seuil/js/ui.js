/* Seuil — every screen. Reads the state, draws HTML, handles taps through data-act and typing through data-f. */
import { hpiFor } from './history.js';
import { monteCarlo } from './engine.js';
import { S, save, saveUi, reset, newLoc, examples, setInbox, exportBackup, importBackup } from './store.js';
import { analyse, bridge, totals, HORIZON } from './engine.js';
import { PACKS, PACK_ORDER, PACKS_ASOF, CURRENCIES, RULE_FIELDS, rulesFor } from './packs.js';
import { crossing, compareLines } from './charts.js';
import { t, setLang, lang } from './i18n.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TABS = ['seuil', 'compare', 'rules', 'settings'];
const ui = { session: undefined, rulesPack: null };
const loc = () => lang() === 'fr' ? 'fr-FR' : 'en-GB';
const nf = {};
const money = (v, cur) => { const k = loc() + cur; nf[k] = nf[k] || new Intl.NumberFormat(loc(), { style: 'currency', currency: cur, maximumFractionDigits: 0 }); return nf[k].format(Math.round(v || 0)).replace(/^-/, '−'); };
const signed = (v, cur) => (v > 0 ? '+' : '') + money(v, cur);
const short = v => new Intl.NumberFormat(loc(), { notation: 'compact', maximumFractionDigits: 1 }).format(v);
const pct = (v, d = 1) => new Intl.NumberFormat(loc(), { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(v) + ' %';
const width = () => Math.min(680, document.documentElement.clientWidth) - 40;
const cur = () => S.locs.find(l => l.id === S.ui.loc) || S.locs[0] || null;
const yr = n => n > HORIZON ? t('never') : String(n);
const num1 = v => new Intl.NumberFormat(loc(), { maximumFractionDigits: 2 }).format(v);
const yrWord = n => n === null ? t('never') : t('sens.y', { n });
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2400); }
function sheet(html) { const d = $('#sheet'); d.innerHTML = html; if (!d.open) d.showModal(); d.scrollTop = 0; }
const closeSheet = () => { const d = $('#sheet'); if (d.open) d.close(); };

/* ---------- the threshold ---------- */
function heroHtml(l, a) {
  if (!a.ok) return `<section class="hero"><p class="kicker">${esc(l.name || t('loc.unnamed'))}</p><h1>${esc(t('hero.empty'))}</h1><p class="sub">${esc(t('hero.emptySub'))}</p></section>`;
  let h1, range;
  if (a.be === null) { h1 = t('hero.never', { n: HORIZON }); range = a.lo <= HORIZON ? t('hero.neverRange', { lo: a.lo }) : t('hero.neverFirm'); }
  else {
    h1 = a.be <= 1 ? t('hero.now') : t('hero.after', { n: a.be });
    range = a.lo === a.hi ? t('hero.rangeNone') : a.hi > HORIZON ? t('hero.rangeOpen', { lo: a.lo }) : t('hero.range', { lo: a.lo, hi: a.hi });
    if (a.until) range += ' ' + t('hero.until', { n: a.until });
  }
  const adv = a.at.adv, stay = t(adv >= 0 ? 'hero.stayBuy' : 'hero.stayRent', { n: a.stay, v: money(Math.abs(adv), l.cur) });
  const span = Math.min(HORIZON, Math.max(12, Math.max(a.stay, a.be ?? 0, a.hi <= HORIZON ? a.hi : (a.be === null ? 25 : 0)) + 5));
  const svg = crossing(a.rows, { w: width(), span, be: a.be, lo: a.lo, hi: Math.min(a.hi, HORIZON), stay: a.stay, short, L: { buy: t('chart.buy'), rent: t('chart.rent'), stay: t('chart.stay', { n: a.stay }), year: t('u.years'), aria: t('chart.aria') } });
  return `<section class="hero ${a.be === null ? 'isRent' : 'isBuy'}"><p class="kicker">${esc(l.name || t('loc.unnamed'))} · ${esc(t('pack.' + l.pack))}${l.ex ? ` · <span class="exTag">${esc(t('ex.tag'))}</span>` : ''}</p>
<h1>${esc(h1)}</h1><p class="range">${esc(range)}</p><p class="sub">${esc(stay)}</p>
<div class="plot">${svg}</div><p class="note cap">${esc(t('chart.cap'))}</p></section>`;
}

function bridgeHtml(l, a) {
  const rows = bridge(a.at); let run = 0; const cum = [0];
  rows.forEach(r => { run += r.v; cum.push(run); });
  const lo = Math.min(...cum), hi = Math.max(...cum), sc = v => (v - lo) / ((hi - lo) || 1) * 100;
  let c = 0;
  const body = rows.map(r => {
    const a0 = c, a1 = c + r.v; c = a1;
    const left = sc(Math.min(a0, a1)), w = Math.max(0.8, Math.abs(sc(a1) - sc(a0)));
    return `<div class="brow"><span class="bl">${esc(t('br.' + r.k))}</span><span class="bt"><i class="${r.v >= 0 ? 'pos' : 'neg'}" style="left:${left.toFixed(2)}%;width:${w.toFixed(2)}%"></i><b class="z" style="left:${sc(0).toFixed(2)}%"></b></span><span class="bv num">${signed(r.v, l.cur)}</span></div>`;
  }).join('');
  const adv = a.at.adv;
  return `<section><h2>${esc(t('br.title', { n: a.stay }))}</h2><p class="note">${esc(t('br.sub'))}</p>
<div class="bridge">${body}<div class="brow total"><span class="bl">${esc(t(adv >= 0 ? 'br.totalBuy' : 'br.totalRent'))}</span><span class="bt"><i class="${adv >= 0 ? 'pos' : 'neg'} solid" style="left:${sc(Math.min(0, adv)).toFixed(2)}%;width:${Math.max(0.8, Math.abs(sc(adv) - sc(0))).toFixed(2)}%"></i><b class="z" style="left:${sc(0).toFixed(2)}%"></b></span><span class="bv num">${money(Math.abs(adv), l.cur)}</span></div></div>
<p class="note">${esc(t('br.adds'))}</p></section>`;
}

function outHtml(l, a) {
  if (!a.ok) return '';
  const f = a.first, R = a.rules;
  const sens = a.sens.map(s => `<tr><th scope="row">${esc(t('g.' + s.k))}</th><td class="num">${esc(t('sens.cell', { d: num1(s.d), y: yrWord(s.lo) }))}</td><td class="num">${esc(t('sens.cellUp', { d: num1(s.d), y: yrWord(s.hi) }))}</td></tr>`).join('');
  const kv = (k, v, cls = '') => `<div class="kv ${cls}"><span>${esc(k)}</span><b class="num">${v}</b></div>`;
  const mc = monteCarlo(l);
  const mcHtml = `<section class="mc"><h2>${esc(t('mc.title'))}</h2><p class="big">${esc(t('mc.ahead', { p: Math.round(mc.pAhead * 100), n: mc.stay }))}</p><p class="note">${esc(mc.p50 > HORIZON ? t('mc.mostNever', { p: Math.round(mc.never * 100), n: HORIZON }) : t('mc.half', { y: mc.p50, lo: mc.p10, hi: mc.p90 > HORIZON ? t('mc.never') : mc.p90 }))} ${esc(t('mc.how', { n: mc.n }))}</p></section>`;
  return mcHtml + bridgeHtml(l, a) + `
<section><h2>${esc(t('sens.title'))}</h2><p class="note">${esc(t('sens.sub'))}</p>
<table class="tbl"><thead><tr><th></th><th>${esc(t('sens.down'))}</th><th>${esc(t('sens.up'))}</th></tr></thead><tbody>${sens}</tbody></table></section>
<section><h2>${esc(t('cash.title'))}</h2>
<div class="cols"><div class="card"><h3>${esc(t('cash.day'))}</h3>
${kv(t('f.down'), money(a.down, l.cur))}${kv(t('cash.fees', { p: pct(a.price ? a.fees / a.price * 100 : 0) }), money(a.fees, l.cur))}${a.reno ? kv(t('f.reno'), money(a.reno, l.cur)) : ''}${kv(t('cash.total'), money(a.upfront, l.cur), 'sum')}
<p class="note">${esc(t('cash.loan', { v: money(a.loan0, l.cur), p: pct(a.price ? a.loan0 / a.price * 100 : 0, 0) }))}${a.price && a.down / a.price * 100 < (PACKS[l.pack] || PACKS.XX).minDown ? ' ' + esc(t('cash.minDown', { p: (PACKS[l.pack] || PACKS.XX).minDown })) : ''}</p></div>
<div class="card"><h3>${esc(t('cash.month'))}</h3>
${kv(t('cash.interest'), money(f.interest, l.cur))}${kv(t('cash.principal'), money(f.principal, l.cur))}${kv(t('cash.upkeep'), money(f.upkeep, l.cur))}${f.tax ? kv(t('cash.tax'), money(f.tax, l.cur)) : ''}${f.relief ? kv(t('cash.relief'), money(-f.relief, l.cur)) : ''}${kv(t('cash.owner'), money(f.ownerOut, l.cur), 'sum')}${kv(t('cash.rent'), money(f.rent, l.cur), 'sum')}
<p class="note">${esc(t(R.loan === 'target' ? 'cash.loanTarget' : 'cash.loanAnnuity', { to: R.loanTo, y: R.loanYears, n: l.term }))}</p></div></div></section>
<p class="note limits">${esc(t('limits.short'))} <button class="link" data-act="tab" data-tab="rules">${esc(t('limits.more'))}</button></p>`;
}

const inp = (f, v, o = {}) => `<label class="fld${o.wide ? ' wide' : ''}"><span>${esc(o.label || t('f.' + f))}</span><span class="box"><input data-f="${f}" type="${o.type || 'number'}" ${o.type === 'text' ? 'maxlength="40"' : `inputmode="decimal" min="${o.min ?? 0}" step="${o.step || 'any'}"`} value="${esc(v ?? '')}" placeholder="${esc(o.ph || '')}">${o.unit ? `<i>${esc(o.unit)}</i>` : ''}</span>${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</label>`;
const slider = (f, v, min, max, step) => `<label class="sld"><span>${esc(t('g.' + f))}</span><output data-o="${f}" class="num">${pct(Number(v), 2)}</output><input data-f="${f}" type="range" min="${min}" max="${max}" step="${step}" value="${v}"></label>`;

/* SE-3: price and rent levels researched by Claude for this place */
let askBusy = false;
function researchHtml(l) {
  const r = l.research && l.research.data;
  const card = r ? `<div class="research"><p><b>${esc(t('ask.found', { p: r.place || l.name || '' }))}</b> ${r.price_m2 ? esc(t('ask.price', { v: money(r.price_m2, l.cur) })) : ''} ${r.rent_m2 ? esc(t('ask.rent', { v: new Intl.NumberFormat(loc(), { maximumFractionDigits: 1 }).format(r.rent_m2) + ' ' + l.cur })) : ''}</p><p class="note">${esc([r.period, t('ask.conf.' + (r.confidence || 'low')), r.note].filter(Boolean).join(' · '))}</p>${(r.sources || []).length ? `<p class="note">${r.sources.slice(0, 4).map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>`).join(' · ')}</p>` : ''}${r.price_m2 && r.rent_m2 ? `<div class="row"><button class="btn sm" data-act="ask-use">${esc(t('ask.use'))}</button></div>` : ''}</div>` : '';
  return `<div class="row"><button class="btn sm" data-act="ask-place" ${askBusy ? 'disabled' : ''}>${esc(askBusy ? t('ask.wait') : t('ask.btn'))}</button></div>${card}`;
}
/* SE-4: the last ten years of house prices next to the price-growth guess */
function historyHtml(l) {
  const h = hpiFor(l.pack, () => { if (S.ui.tab === 'seuil') render(); });
  const g = l.research && l.research.data && typeof l.research.data.growth_10y_pct === 'number' ? l.research.data.growth_10y_pct : null;
  const bits = [];
  if (h) bits.push(t('hist.hpi', { c: t('pack.' + l.pack), v: num1(h.pct), a: h.from, b: h.to }));
  if (g !== null) bits.push(t('hist.claude', { v: num1(g) }));
  return bits.length ? `<p class="note hist">${esc(bits.join(' '))}</p>` : '';
}
function formHtml(l) {
  const p = PACKS[l.pack] || PACKS.XX, T = totals(l), R = rulesFor(l), per = l.mode === 'sqm';
  const packs = PACK_ORDER.map(k => `<option value="${k}"${k === l.pack ? ' selected' : ''}>${esc(t('pack.' + k))}</option>`).join('');
  const regions = p.regions ? `<label class="fld"><span>${esc(t('f.region'))}</span><span class="box"><select data-f="region">${p.regions.map(r => `<option value="${r[0]}"${r[0] === (l.region || p.region) ? ' selected' : ''}>${esc(r[1])} · ${pct(r[2], 2)}</option>`).join('')}</select></span></label>` : '';
  const curSel = l.pack === 'XX' ? `<label class="fld"><span>${esc(t('f.cur'))}</span><span class="box"><select data-f="cur">${CURRENCIES.map(c => `<option${c === l.cur ? ' selected' : ''}>${c}</option>`).join('')}</select></span></label>` : '';
  const u = per ? l.cur + '/m²' : l.cur;
  const rules = RULE_FIELDS.map(k => {
    const base = k === 'transfer' && p.regions ? (p.regions.find(r => r[0] === (l.region || p.region)) || [0, 0, p.transfer])[2] : p[k];
    const v = l.ov && l.ov[k] !== undefined ? l.ov[k] : '';
    if (k === 'cgtFree') return `<label class="fld"><span>${esc(t('r.cgtFree'))}</span><span class="box"><select data-ov="cgtFree"><option value=""${v === '' ? ' selected' : ''}>${esc(t('r.pack'))}: ${esc(cgtWord(p.cgtFree))}</option><option value="0"${v === 0 ? ' selected' : ''}>${esc(cgtWord(0))}</option><option value="null"${v === null ? ' selected' : ''}>${esc(cgtWord(null))}</option>${[2, 5, 10].map(n => `<option value="${n}"${v === n ? ' selected' : ''}>${esc(cgtWord(n))}</option>`).join('')}</select></span></label>`;
    return `<label class="fld"><span>${esc(t('r.' + k))}</span><span class="box"><input data-ov="${k}" type="number" inputmode="decimal" min="0" step="any" value="${esc(v)}" placeholder="${base}"><i>%</i></span></label>`;
  }).join('');
  const nOv = Object.keys(l.ov || {}).length;
  return `<section class="form"><h2>${esc(t('form.home'))}</h2>
<div class="grid">${inp('name', l.name, { type: 'text', wide: 1, ph: t('f.namePh') })}
<label class="fld"><span>${esc(t('f.pack'))}</span><span class="box"><select data-f="pack">${packs}</select></span></label>${regions}${curSel}
<div class="fld wide"><span>${esc(t('f.mode'))}</span><div class="seg" role="group"><button data-act="mode" data-m="total" aria-pressed="${!per}">${esc(t('f.modeTotal'))}</button><button data-act="mode" data-m="sqm" aria-pressed="${per}">${esc(t('f.modeSqm'))}</button></div></div>
${inp('sqm', l.sqm, { unit: 'm²', step: 1 })}${inp('price', l.price || '', { unit: u, step: per ? 50 : 1000 })}${inp('rent', l.rent || '', { unit: u, step: per ? 0.5 : 10, hint: t('f.rentHint') })}</div>
<p class="note derived" id="derived">${derivedText(l, T)}</p>${researchHtml(l)}
<h2>${esc(t('form.money'))}</h2>
<div class="grid">${inp('down', l.down || '', { unit: l.cur, step: 1000, hint: t('f.downHint') })}${inp('reno', l.reno || '', { unit: l.cur, step: 1000, hint: t('f.renoHint') })}
${inp('rate', l.rate, { unit: '%', step: 0.05 })}${inp('fixYears', l.fixYears || '', { unit: t('u.years'), step: 1, min: 0, hint: t('f.fixHint') })}${Number(l.fixYears) > 0 ? inp('rate2', l.rate2 ?? '', { unit: '%', step: 0.05, ph: l.rate, hint: t('f.rate2Hint') }) : ''}${R.loan === 'annuity' ? inp('term', l.term, { unit: t('u.years'), step: 1, min: 1 }) : ''}${inp('stay', l.stay, { unit: t('u.years'), step: 1, min: 1, hint: t('f.stayHint') })}</div>
<h2>${esc(t('form.guess'))}</h2><p class="note">${esc(t('form.guessSub'))}</p>${historyHtml(l)}
<div class="slds">${slider('gPrice', l.gPrice, -2, 8, 0.25)}${slider('gRent', l.gRent, -2, 8, 0.25)}${slider('ret', l.ret, 0, 10, 0.25)}</div>
<details class="more"${S.ui.open.rules ? ' open' : ''} data-open="rules"><summary>${esc(t('form.rules'))}${nOv ? ` <em>${esc(t('form.changed', { n: nOv }))}</em>` : ''}</summary>
<p class="note">${esc(t('form.rulesSub', { p: t('pack.' + l.pack) }))}</p><div class="grid">${rules}</div>
<label class="fld wide"><span>${esc(t('r.loan'))}</span><span class="box"><select data-ov="loan"><option value="">${esc(t('r.pack'))}: ${esc(t('r.loan.' + p.loan))}</option><option value="annuity"${l.ov && l.ov.loan === 'annuity' ? ' selected' : ''}>${esc(t('r.loan.annuity'))}</option><option value="target"${l.ov && l.ov.loan === 'target' ? ' selected' : ''}>${esc(t('r.loan.target'))}</option></select></span></label>
${nOv ? `<div class="row"><button class="btn sm" data-act="ov-reset">${esc(t('form.rulesReset'))}</button></div>` : ''}</details>
<div class="row end"><button class="link danger" data-act="loc-del">${esc(t('loc.del'))}</button></div></section>`;
}
const cgtWord = v => v === null ? t('r.cgt.always') : v === 0 ? t('r.cgt.never') : t('r.cgt.after', { n: v });
function derivedText(l, T) {
  if (!(T.price > 0) || !(T.sqm > 0)) return '';
  const bits = [t('d.sqm', { v: money(T.price / T.sqm, l.cur) })];
  if (T.rent > 0) { bits.push(t('d.rentSqm', { v: new Intl.NumberFormat(loc(), { maximumFractionDigits: 1 }).format(T.rent / T.sqm) + ' ' + l.cur })); bits.push(t('d.ratio', { n: new Intl.NumberFormat(loc(), { maximumFractionDigits: 1 }).format(T.price / (T.rent * 12)) })); }
  if (l.mode === 'sqm') bits.unshift(t('d.total', { p: money(T.price, l.cur), r: money(T.rent, l.cur) }));
  return esc(bits.join(' · '));
}

const locChips = () => `<div class="locs" role="tablist" aria-label="${esc(t('loc.aria'))}">${S.locs.map(l => `<button role="tab" data-act="loc" data-id="${l.id}" aria-selected="${l.id === S.ui.loc}">${esc(l.name || t('loc.unnamed'))}</button>`).join('')}<button class="add" data-act="loc-add">${esc(t('loc.add'))}</button></div>`;
const exBanner = () => S.locs.some(l => l.ex) ? `<p class="banner">${esc(t('ex.banner'))} <button class="link" data-act="ex-off">${esc(t('ex.off'))}</button></p>` : '';

function renderSeuil() {
  const l = cur();
  if (!l) return `<section class="hero"><h1>${esc(t('none.h1'))}</h1><p class="sub">${esc(t('none.sub'))}</p><div class="row"><button class="btn pri" data-act="loc-add">${esc(t('loc.add'))}</button></div></section>`;
  const a = analyse(l);
  return exBanner() + locChips() + `<div id="hero">${heroHtml(l, a)}</div>${formHtml(l)}<div id="out">${outHtml(l, a)}</div>`;
}
/* typing only redraws the results, so the field keeps the cursor */
function refresh() {
  const l = cur(); if (!l || S.ui.tab !== 'seuil') return;
  const a = analyse(l), h = $('#hero'), o = $('#out'), d = $('#derived');
  if (h) h.innerHTML = heroHtml(l, a); if (o) o.innerHTML = outHtml(l, a); if (d) d.innerHTML = derivedText(l, totals(l));
}

/* ---------- compare ---------- */
function renderCompare() {
  if (S.locs.length < 2) return `<section><h1>${esc(t('cmp.h1'))}</h1><p class="sub">${esc(t('cmp.need'))}</p><div class="row"><button class="btn pri" data-act="loc-add">${esc(t('loc.add'))}</button></div></section>`;
  const picked = S.locs.filter(l => S.cmp.includes(l.id)), A = picked.map(l => ({ l, a: analyse(l) })).filter(x => x.a.ok);
  const chips = `<div class="chips">${S.locs.map(l => `<button class="chip" data-act="cmp" data-id="${l.id}" aria-pressed="${S.cmp.includes(l.id)}">${esc(l.name || t('loc.unnamed'))}</button>`).join('')}</div>`;
  if (!A.length) return `<section><h1>${esc(t('cmp.h1'))}</h1><p class="sub">${esc(t('cmp.pick'))}</p>${chips}</section>`;
  const span = Math.min(HORIZON, Math.max(15, ...A.map(x => Math.max(x.a.stay, x.a.be ?? 0) + 5)));
  const svg = compareLines(A.map(x => ({ name: x.l.name || t('loc.unnamed'), vals: x.a.rows.map(r => r.adv / x.a.price * 100) })), { w: width(), span, aria: t('cmp.aria') });
  const row = (k, f, cls = '') => `<tr class="${cls}"><th scope="row">${esc(t(k))}</th>${A.map((x, i) => `<td class="num">${f(x, i)}</td>`).join('')}</tr>`;
  const best = Math.min(...A.map(x => x.a.be ?? 99));
  return `<section><h1>${esc(t('cmp.h1'))}</h1><p class="sub">${esc(t('cmp.sub'))}</p>${chips}</section>
<section><div class="plot">${svg}</div><p class="note cap">${esc(t('cmp.cap'))}</p></section>
<section><div class="scroll"><table class="tbl cmp"><thead><tr><th></th>${A.map((x, i) => `<th><i class="dot c${i}"></i>${esc(x.l.name || t('loc.unnamed'))}</th>`).join('')}</tr></thead><tbody>
${row('cmp.be', x => `<b class="${(x.a.be ?? 99) === best && best < 99 ? 'best' : ''}">${x.a.be === null ? esc(t('never')) : esc(t('cmp.year', { n: x.a.be }))}</b>`)}
${row('cmp.range', x => `${yr(x.a.lo)} – ${yr(x.a.hi)}`)}
${row('cmp.stay', x => esc(t('cmp.stayV', { n: x.a.stay })))}
${row('cmp.adv', x => `<span class="${x.a.at.adv >= 0 ? 'pos' : 'neg'}">${signed(x.a.at.adv, x.l.cur)}</span>`)}
${row('cmp.advPct', x => `<span class="${x.a.at.adv >= 0 ? 'pos' : 'neg'}">${(x.a.at.adv > 0 ? '+' : '') + pct(x.a.at.adv / x.a.price * 100)}</span>`)}
${row('cmp.ratio', x => new Intl.NumberFormat(loc(), { maximumFractionDigits: 1 }).format(x.a.ratio))}
${row('cmp.fees', x => pct(x.a.fees / x.a.price * 100))}
${row('cmp.month', x => `${money(x.a.first.ownerOut, x.l.cur)}<br><small>${esc(t('cmp.vsRent', { v: money(x.a.first.rent, x.l.cur) }))}</small>`)}
</tbody></table></div><p class="note">${esc(t('cmp.note'))}</p></section>`;
}

/* ---------- rules ---------- */
function renderRules() {
  const k = ui.rulesPack || (cur() ? cur().pack : 'DE'), p = PACKS[k];
  const chips = `<div class="chips">${PACK_ORDER.map(x => `<button class="chip" data-act="rules-pack" data-k="${x}" aria-pressed="${x === k}">${esc(t('pack.' + x))}</button>`).join('')}</div>`;
  const line = (f, v) => `<tr><th scope="row">${esc(t('r.' + f))}<small>${esc(t('rx.' + f))}</small></th><td class="num">${v}</td></tr>`;
  const reg = p.regions ? `<p class="note">${esc(t('rules.regions'))} ${p.regions.map(r => `${esc(r[1])} ${pct(r[2], 2)}`).join(' · ')}</p>` : '';
  const src = p.src.length ? `<h3>${esc(t('rules.src'))}</h3><ul class="src">${p.src.map(s => `<li><a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a></li>`).join('')}</ul>` : '';
  return `<section><h1>${esc(t('rules.h1'))}</h1><p class="sub">${esc(t('rules.sub', { d: new Date(PACKS_ASOF + 'T12:00').toLocaleDateString(loc(), { day: 'numeric', month: 'long', year: 'numeric' }) }))}</p>${chips}</section>
<section><h2>${esc(t('pack.' + k))} · ${p.cur}</h2><table class="tbl rules"><tbody>
${RULE_FIELDS.filter(f => f !== 'cgtFree').map(f => line(f, pct(p[f], 3))).join('')}
${line('cgtFree', esc(cgtWord(p.cgtFree)))}
<tr><th scope="row">${esc(t('r.loan'))}<small>${esc(t('rx.loan'))}</small></th><td>${esc(t('r.loan.' + p.loan))}${p.loan === 'target' ? ` (${p.loanTo} %, ${p.loanYears} ${esc(t('u.years'))})` : ''}</td></tr>
${line('rate', pct(p.rate, 2))}${line('minDown', pct(p.minDown, 0))}
</tbody></table>${reg}<p class="note">${esc(t('rules.note.' + k))}</p>${src}</section>
<section><h2>${esc(t('method.h'))}</h2>${[1, 2, 3, 4, 5, 6].map(i => `<p class="note">${esc(t('method.' + i, { n: HORIZON }))}</p>`).join('')}</section>
<section><h2>${esc(t('limits.h'))}</h2>${[1, 2, 3, 4].map(i => `<p class="note">${esc(t('limits.' + i))}</p>`).join('')}</section>`;
}

/* ---------- settings ---------- */
function renderSettings() {
  const email = ui.session, on = window.Cloud && window.Cloud.configured();
  return `<section><h1>${esc(t('set.h1'))}</h1></section>
<section><h2>${esc(t('set.lang'))}</h2><div class="seg" role="group"><button data-act="lang" data-l="en" aria-pressed="${lang() === 'en'}">English</button><button data-act="lang" data-l="fr" aria-pressed="${lang() === 'fr'}">Français</button></div></section>
<section><h2>${esc(t('set.sync'))}</h2><p class="note" id="syncStatus">${esc(!on ? t('sync.none') : email ? t('sync.on', { e: email }) : t('sync.off'))}</p>${on ? `<div class="row"><button class="btn sm" data-act="sync">${esc(email ? t('sync.manage') : t('sync.signin'))}</button></div>` : ''}<p class="note">${esc(t('sync.private'))}</p></section>
<section><h2>${esc(t('set.ideas'))}</h2><p class="note">${esc(t('ideas.sub'))}</p><label class="fld wide"><span>${esc(t('ideas.link'))}</span><span class="box"><input type="url" data-inbox value="${esc(S.inbox || '')}" placeholder="https://docs.google.com/…"></span></label>${S.inbox ? `<div class="row"><a class="btn sm" href="${esc(S.inbox)}" target="_blank" rel="noopener">${esc(t('ideas.open'))}</a></div>` : ''}</section>
<section><h2>${esc(t('set.data'))}</h2><div class="row"><button class="btn sm" data-act="export">${esc(t('data.export'))}</button><label class="btn sm">${esc(t('data.import'))}<input type="file" accept="application/json,.json" data-import hidden></label></div>
<div class="row" style="margin-top:14px">${S.locs.some(l => l.ex) ? `<button class="btn sm" data-act="ex-off">${esc(t('ex.off'))}</button>` : `<button class="btn sm" data-act="ex-on">${esc(t('ex.on'))}</button>`}<button class="btn sm danger" data-act="reset">${esc(t('data.reset'))}</button></div></section>
<p class="note limits">${esc(t('limits.short'))}</p>`;
}

/* ---------- shell ---------- */
export function render() {
  document.documentElement.lang = lang();
  const tab = TABS.includes(S.ui.tab) ? S.ui.tab : 'seuil';
  $('#tabs').innerHTML = TABS.map(k => `<button data-act="tab" data-tab="${k}" ${k === tab ? 'aria-current="page"' : ''}>${esc(t('tab.' + k))}</button>`).join('');
  $('#main').innerHTML = { seuil: renderSeuil, compare: renderCompare, rules: renderRules, settings: renderSettings }[tab]();
}
export function refreshSession() {
  if (!window.Cloud || !window.Cloud.configured()) return;
  window.Cloud.session().then(s => { const e = s ? s.user.email : null; if (e !== ui.session) { ui.session = e; if (S.ui.tab === 'settings') render(); } }).catch(() => { });
}
const edit = fn => { const l = cur(); if (!l) return; fn(l); if (l.ex) delete l.ex; save(); };

function act(el, ev) {
  const a = el.dataset.act;
  if (a === 'tab') { S.ui.tab = el.dataset.tab; saveUi(); render(); window.scrollTo(0, 0); }
  else if (a === 'loc') { S.ui.loc = el.dataset.id; saveUi(); render(); }
  else if (a === 'loc-add') sheet(`<h2>${esc(t('add.h'))}</h2><p class="note">${esc(t('add.sub'))}</p><form method="dialog" data-form="add"><label class="fld wide"><span>${esc(t('f.name'))}</span><span class="box"><input name="name" type="text" maxlength="40" required placeholder="${esc(t('f.namePh'))}"></span></label><label class="fld wide"><span>${esc(t('f.pack'))}</span><span class="box"><select name="pack">${PACK_ORDER.map(k => `<option value="${k}">${esc(t('pack.' + k))}</option>`).join('')}</select></span></label><div class="row end"><button type="button" class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button class="btn sm pri">${esc(t('add.go'))}</button></div></form>`);
  else if (a === 'close') closeSheet();
  else if (a === 'loc-del') { const l = cur(); if (!l) return; sheet(`<h2>${esc(t('del.h', { n: l.name || t('loc.unnamed') }))}</h2><p class="note">${esc(t('del.sub'))}</p><div class="row end"><button class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button class="btn sm danger" data-act="loc-del-yes">${esc(t('del.yes'))}</button></div>`); }
  else if (a === 'loc-del-yes') { const id = S.ui.loc; S.locs = S.locs.filter(l => l.id !== id); S.cmp = S.cmp.filter(x => x !== id); S.ui.loc = S.locs[0] ? S.locs[0].id : null; save(); closeSheet(); render(); }
  else if (a === 'ask-place') {
    const l = cur(); if (!l || askBusy) return;
    if (!window.Ask) { toast(t('ask.off')); return; }
    askBusy = true; render();
    window.Ask.run('place_prices', { place: l.name || '', country: t('pack.' + l.pack), currency: l.cur, size: Number(l.sqm) || 70, kind: 'flat' }, { title: t('ask.btn') })
      .then(data => { edit(x => { x.research = { d: new Date().toISOString().slice(0, 10), data }; }); })
      .catch(e => { if (e.code !== 'cancelled') toast(e.message || t('ask.off')); })
      .finally(() => { askBusy = false; render(); });
  }
  else if (a === 'ask-use') { const l = cur(); const r = l && l.research && l.research.data; if (!r) return; edit(x => { x.mode = 'sqm'; x.price = Math.round(r.price_m2); x.rent = Math.round(r.rent_m2 * 10) / 10; }); render(); toast(t('ask.used')); }
  else if (a === 'mode') { edit(l => { const T = totals(l), to = el.dataset.m; if (to === l.mode) return; const q = Math.max(1, Number(l.sqm) || 1); if (to === 'sqm') { l.price = Math.round(T.price / q * 100) / 100; l.rent = Math.round(T.rent / q * 100) / 100; } else { l.price = Math.round(T.price); l.rent = Math.round(T.rent); } l.mode = to; }); render(); }
  else if (a === 'ov-reset') { edit(l => { l.ov = {}; }); render(); }
  else if (a === 'cmp') { const id = el.dataset.id; if (S.cmp.includes(id)) S.cmp = S.cmp.filter(x => x !== id); else if (S.cmp.length >= 4) { toast(t('cmp.max')); return; } else S.cmp.push(id); save(); render(); }
  else if (a === 'rules-pack') { ui.rulesPack = el.dataset.k; render(); }
  else if (a === 'lang') { S.lang = el.dataset.l; setLang(S.lang); save(); render(); }
  else if (a === 'sync') { if (window.Cloud) window.Cloud.dialog(() => window.appSync && window.appSync()); }
  else if (a === 'ex-off') { S.locs = S.locs.filter(l => !l.ex); S.cmp = S.cmp.filter(id => S.locs.find(l => l.id === id)); S.ui.loc = S.locs[0] ? S.locs[0].id : null; save(); render(); }
  else if (a === 'ex-on') { const ex = examples(); S.locs.push(...ex); if (!S.ui.loc) S.ui.loc = ex[0].id; save(); render(); }
  else if (a === 'reset') sheet(`<h2>${esc(t('reset.h'))}</h2><p class="note">${esc(t('reset.sub'))}</p><div class="row end"><button class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button class="btn sm danger" data-act="reset-yes">${esc(t('reset.yes'))}</button></div>`);
  else if (a === 'reset-yes') { const lg = S.lang; reset(); S.lang = lg; save(true); closeSheet(); render(); }
  else if (a === 'export') { const url = URL.createObjectURL(exportBackup()), x = document.createElement('a'); x.href = url; x.download = 'seuil-' + new Date().toISOString().slice(0, 10) + '.json'; x.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
  else if (a === 'reload') location.reload();
}

export function init() {
  document.addEventListener('click', ev => { const el = ev.target.closest('[data-act]'); if (el) act(el, ev); });
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('[data-form=add]'); if (!f) return; ev.preventDefault();
    const l = newLoc(f.pack.value, f.name.value.trim()); S.locs.push(l); S.ui.loc = l.id; if (S.cmp.length < 4) S.cmp.push(l.id); S.ui.tab = 'seuil'; save(); closeSheet(); render(); window.scrollTo(0, 0);
  });
  const onField = (ev, done) => {
    const el = ev.target;
    if (el.dataset.f) {
      const f = el.dataset.f, l = cur(); if (!l) return;
      if (f === 'pack') { edit(x => { const p = PACKS[el.value] || PACKS.XX; x.pack = el.value; x.region = p.region || null; x.cur = p.cur; x.rate = p.rate; x.term = p.term; x.ov = {}; }); render(); return; }
      if (f === 'region' || f === 'cur') { edit(x => { x[f] = el.value; }); render(); return; }
      if (f === 'fixYears' && done) { edit(x => { x.fixYears = el.value === '' ? 0 : Number(el.value); }); render(); return; }
      edit(x => { x[f] = f === 'name' ? el.value : el.value === '' ? (f === 'rate2' ? '' : 0) : Number(el.value); });
      if (el.type === 'range') { const o = document.querySelector(`[data-o="${f}"]`); if (o) o.textContent = pct(Number(el.value), 2); }
      if (f === 'name' && done) render(); else refresh();
    } else if (el.dataset.ov) {
      const k = el.dataset.ov;
      edit(x => { x.ov = x.ov || {}; if (el.value === '') delete x.ov[k]; else x.ov[k] = k === 'loan' ? el.value : el.value === 'null' ? null : Number(el.value); });
      if (done || el.tagName === 'SELECT') render(); else refresh();
    } else if (el.dataset.inbox !== undefined && done) { setInbox(el.value.trim()); render(); }
    else if (el.dataset.import !== undefined && done && el.files[0]) { el.files[0].text().then(tx => { importBackup(tx); render(); toast(t('data.imported')); }).catch(() => toast(t('data.importFail'))); }
  };
  document.addEventListener('input', ev => onField(ev, false));
  document.addEventListener('change', ev => onField(ev, true));
  document.addEventListener('toggle', ev => { const d = ev.target; if (d.dataset && d.dataset.open) { S.ui.open[d.dataset.open] = d.open; saveUi(); } }, true);
  let rz = null; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (S.ui.tab === 'seuil') refresh(); else if (S.ui.tab === 'compare') render(); }, 150); });
  $('#sheet').addEventListener('click', ev => { if (ev.target === $('#sheet')) closeSheet(); });
  render(); refreshSession();
}
