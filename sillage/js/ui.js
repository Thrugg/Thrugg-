/* Sillage — every screen. Reads the state, draws HTML, handles taps through data-act. */
import { S, save, saveUi, reset, uid, blankBottle, examples, hasExamples, dropExamples, setInbox, exportBackup, importBackup, WX_KEY } from './store.js';
import { FAMILIES, SEASONS, OCCASIONS, CONCS, SHAPES, BANDS, iso, bandOf, seasonOf, parseNotes, wearIndex, bottleStats, wardrobeStats, suggest, taste, exportData, parseSuggestions, sameScent } from './engine.js';
import { bottle, pyramid } from './draw.js';
import { t, setLang, lang } from './i18n.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TABS = ['today', 'wardrobe', 'queue', 'settings'], CURS = ['EUR', 'CHF', 'GBP', 'USD', 'DKK', 'PLN'];
const ui = { session: undefined, draft: null, wx: null, wxTried: false, askText: '' };
const loc = () => lang() === 'fr' ? 'fr-FR' : 'en-GB';
const nf = {};
const money = (v, d = 0) => { const k = loc() + S.cur + d; nf[k] = nf[k] || new Intl.NumberFormat(loc(), { style: 'currency', currency: S.cur, maximumFractionDigits: d, minimumFractionDigits: d }); return nf[k].format(v || 0); };
const today = () => iso(new Date());
const dayText = d => new Date(d + 'T12:00').toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short' });
const gradeText = g => Number(g) > 0 ? new Intl.NumberFormat(loc(), { maximumFractionDigits: 1 }).format(g) : '–';
const full = b => [b.house, b.name].filter(Boolean).join(' ') || t('bottle.unnamed');
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2400); }
function sheet(html) { const d = $('#sheet'); d.innerHTML = html; if (!d.open) d.showModal(); d.scrollTop = 0; }
const closeSheet = () => { const d = $('#sheet'); if (d.open) d.close(); ui.draft = null; };
const exBanner = () => hasExamples() ? `<p class="banner">${esc(t('ex.banner'))} <button class="link" data-act="ex-off">${esc(t('ex.off'))}</button></p>` : '';
const tiers = b => [['top', 'n.top'], ['heart', 'n.heart'], ['base', 'n.base']].map(([k, l]) => ({ label: t(l), notes: parseNotes(b.notes && b.notes[k]) }));

/* ---------- weather (Open-Meteo, no key) ---------- */
const wxKey = () => `${Number(S.place.lat).toFixed(2)},${Number(S.place.lon).toFixed(2)}`;
function loadWx() {
  const d = today();
  try { const c = JSON.parse(localStorage.getItem(WX_KEY)); if (c && c.d === d && c.k === wxKey() && isFinite(c.max)) { ui.wx = c; return; } } catch (e) { }
  if (ui.wxTried === wxKey() + d) return; ui.wxTried = wxKey() + d; ui.wx = null;
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${S.place.lat}&longitude=${S.place.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`).then(r => r.ok ? r.json() : null).then(j => {
    const x = j && j.daily; if (!x || !isFinite(x.temperature_2m_max[0])) return;
    ui.wx = { d, k: wxKey(), max: x.temperature_2m_max[0], min: x.temperature_2m_min[0], rain: (x.precipitation_probability_max || [])[0] };
    try { localStorage.setItem(WX_KEY, JSON.stringify(ui.wx)); } catch (e) { }
    if (S.ui.tab === 'today' && !$('#sheet').open) render();
  }).catch(() => { });
}
const seasonBand = s => ({ spring: 'mild', summer: 'hot', autumn: 'cool', winter: 'cold' }[s]);
function dayContext() {
  const d = today(), cal = seasonOf(d, Number(S.place.lat)), auto = ui.wx ? bandOf(ui.wx.max) : null, m = S.ui.band;
  /* when the person says how the day feels, the season tags are read against that feeling, not the calendar */
  const mid = cal === 'spring' || cal === 'autumn' ? cal : null;
  const season = m === 'hot' ? 'summer' : m === 'cold' ? 'winter' : m === 'mild' ? (mid || 'spring') : m === 'cool' ? (mid || 'autumn') : cal;
  return { today: d, season, occ: S.ui.occ || null, band: m || auto || seasonBand(cal), auto, manual: !!m };
}

/* ---------- today ---------- */
function renderToday() {
  const c = dayContext(), ix = wearIndex(S.wears);
  const head = c.manual ? t('wx.manual', { band: t('band.' + c.band + '.day') }) : ui.wx ? t('wx.line', { band: t('band.' + c.band + '.day'), min: Math.round(ui.wx.min), max: Math.round(ui.wx.max) }) + (ui.wx.rain >= 60 ? ' ' + t('wx.rain') : '') : t('wx.none', { band: t('band.' + c.band + '.day') });
  const bandChips = `<div class="chips" role="group" aria-label="${esc(t('wx.aria'))}"><button class="chip" data-act="band" data-v="" aria-pressed="${!c.manual}">${esc(ui.wx ? t('wx.auto') : t('wx.season'))}</button>${BANDS.map(b => `<button class="chip" data-act="band" data-v="${b}" aria-pressed="${S.ui.band === b}">${esc(t('band.' + b))}</button>`).join('')}</div>`;
  const occChips = `<div class="chips" role="group" aria-label="${esc(t('occ.aria'))}"><button class="chip" data-act="occ" data-v="" aria-pressed="${!S.ui.occ}">${esc(t('occ.any'))}</button>${OCCASIONS.map(o => `<button class="chip" data-act="occ" data-v="${o}" aria-pressed="${S.ui.occ === o}">${esc(t('occ.' + o))}</button>`).join('')}</div>`;
  const lead = `<section class="lead"><p class="kicker">${esc(new Date().toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' }))} · ${esc(S.place.name)}</p><h1>${esc(head)}</h1>${bandChips}${occChips}</section>`;
  if (!S.bottles.length) return lead + `<section class="empty"><h2>${esc(t('empty.h'))}</h2><p class="sub">${esc(t('empty.sub'))}</p><div class="row"><button class="btn pri" data-act="add">${esc(t('bottle.add'))}</button><button class="btn" data-act="ex-on">${esc(t('ex.on'))}</button></div></section>`;
  const worn = S.wears.filter(w => w.d === c.today).map(w => S.bottles.find(b => b.id === w.b)).filter(Boolean);
  const ranked = suggest(S.bottles, S.wears, c, S.sprays), pick = ranked[0];
  const why = x => x.reasons.filter(r => r !== 'today').map(r => t('why.' + r, { band: t('band.' + c.band + '.day'), season: t('season.' + c.season).toLowerCase(), occ: c.occ ? t('occ.' + c.occ).toLowerCase() : '', n: x.days })).join(' · ');
  let hero;
  if (worn.length) { const b = worn[worn.length - 1], st = bottleStats(b, ix, S.sprays); hero = `<section class="pick worn"><div class="pb">${bottle(b.shape, st.level, b.family, 92)}</div><div class="pm"><p class="kicker">${esc(t('today.wearing'))}</p><h2 class="fname">${esc(b.name || t('bottle.unnamed'))}</h2><p class="house">${esc(b.house)}</p><p class="note">${esc(t('today.logged', { n: st.wears }))}</p><div class="row"><button class="link" data-act="unwear" data-id="${b.id}">${esc(t('today.undo'))}</button></div></div></section>`; }
  else { const b = pick.b; hero = `<section class="pick"><div class="pb">${bottle(b.shape, pick.st.level, b.family, 92)}</div><div class="pm"><p class="kicker">${esc(t('today.pick'))}</p><h2 class="fname">${esc(b.name || t('bottle.unnamed'))}</h2><p class="house">${esc(b.house)}${b.conc ? ' · ' + esc(b.conc) : ''}</p><p class="why">${esc(why(pick) || t('why.default'))}</p><div class="row"><button class="btn pri" data-act="wear" data-id="${b.id}">${esc(t('today.wear'))}</button><button class="btn sm ghost" data-act="open" data-id="${b.id}">${esc(t('today.details'))}</button></div></div></section>${pyramid(tiers(b))}`; }
  const rest = ranked.filter(x => !worn.includes(x.b) && (worn.length || x !== pick)).slice(0, worn.length ? 3 : 2);
  const alts = rest.length ? `<section><h3>${esc(t(worn.length ? 'today.also' : 'today.or'))}</h3>${rest.map(x => `<div class="alt"><button class="altm" data-act="open" data-id="${x.b.id}">${bottle(x.b.shape, x.st.level, x.b.family, 30)}<span><b class="fname">${esc(x.b.name)}</b><small>${esc(x.b.house)}${why(x) ? ' · ' + esc(why(x)) : ''}</small></span></button><button class="btn sm" data-act="wear" data-id="${x.b.id}">${esc(t('today.wearShort'))}</button></div>`).join('')}</section>` : '';
  const last = [...S.wears].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 6).map(w => ({ w, b: S.bottles.find(x => x.id === w.b) })).filter(x => x.b);
  const lately = last.length ? `<section><h3>${esc(t('today.lately'))}</h3><div class="lately">${last.map(x => `<div class="lrow"><span>${esc(dayText(x.w.d))}</span><b>${esc(full(x.b))}</b></div>`).join('')}</div></section>` : '';
  return exBanner() + lead + hero + alts + lately + `<p class="note foot">${esc(t('today.note'))}</p>`;
}

/* ---------- wardrobe ---------- */
function renderWardrobe() {
  if (!S.bottles.length) return `<section class="lead"><h1>${esc(t('ward.h1'))}</h1><p class="sub">${esc(t('empty.sub'))}</p><div class="row"><button class="btn pri" data-act="add">${esc(t('bottle.add'))}</button><button class="btn" data-act="ex-on">${esc(t('ex.on'))}</button></div></section>`;
  const ix = wearIndex(S.wears), ws = wardrobeStats(S.bottles, S.wears, today(), S.sprays), tt = taste(S.bottles);
  const tile = (k, v) => `<div class="tile"><span>${esc(k)}</span><b>${v}</b></div>`;
  const by = S.ui.sort, key = b => { const st = bottleStats(b, ix, S.sprays); return by === 'worn' ? -st.wears : by === 'cost' ? (st.costPerWear ?? 1e9) : by === 'name' ? 0 : -(Number(b.grade) || 0); };
  const list = [...S.bottles].sort((a, b) => key(a) - key(b) || full(a).localeCompare(full(b)));
  const nose = tt.graded >= 2 && tt.liked.length ? `<section class="nose"><h2>${esc(t('nose.h'))}</h2><p class="note">${esc(t('nose.sub', { n: tt.graded }))}</p><div class="notes">${tt.liked.map((x, i) => `<i class="${i < 3 ? 'hi' : ''}">${esc(x.k)}</i>`).join('')}</div>${tt.families.length ? `<p class="sub fam">${esc(t('nose.fam', { a: tt.families.slice(0, 2).map(x => t('fam.' + x.k).toLowerCase()).join(lang() === 'fr' ? ' et ' : ' and ') }))}${tt.avoided.length ? ' ' + esc(t('nose.less', { a: tt.avoided.map(x => x.k).join(', ') })) : ''}</p>` : ''}</section>` : '';
  const callout = ws.most && ws.least && ws.most.b !== ws.least.b ? `<p class="callout">${esc(t('ward.most', { a: full(ws.most.b), n: ws.most.n }))} ${esc(ws.least.n === 0 ? t('ward.never', { b: full(ws.least.b) }) : t('ward.least', { b: full(ws.least.b), n: ws.least.n }))}</p>` : '';
  return exBanner() + `<section class="lead"><p class="kicker">${esc(t('ward.k'))}</p><h1>${esc(t('ward.h1n', { n: S.bottles.length }))}</h1></section>
<section class="tiles">${tile(t('st.value'), money(ws.value))}${tile(t('st.wears'), ws.wears)}${tile(t('st.recent'), ws.recent)}${tile(t('st.perWear'), ws.perWear !== null ? money(ws.perWear, 2) : '–')}</section>${callout}${nose}
<section><div class="listhead"><h2>${esc(t('ward.bottles'))}</h2><label class="sort"><span>${esc(t('sort.by'))}</span><select data-f="sort">${['grade', 'worn', 'cost', 'name'].map(k => `<option value="${k}"${by === k ? ' selected' : ''}>${esc(t('sort.' + k))}</option>`).join('')}</select></label></div>
${list.map(b => { const st = bottleStats(b, ix, S.sprays); return `<div class="bcard"><button class="bmain" data-act="open" data-id="${b.id}">${bottle(b.shape, st.level, b.family, 46)}<span class="bt"><small class="house">${esc(b.house)}</small><b class="fname">${esc(b.name || t('bottle.unnamed'))}</b><small>${esc([b.conc, b.size ? b.size + ' ml' : '', b.family ? t('fam.' + b.family) : ''].filter(Boolean).join(' · '))}</small><small class="figs">${esc(t('card.wears', { n: st.wears }))}${st.costPerWear !== null ? ' · ' + esc(t('card.cpw', { v: money(st.costPerWear, 2) })) : ''}${st.mlLeft !== null && st.wears ? ' · ' + esc(t('card.left', { n: Math.round(st.mlLeft) })) : ''}</small></span><span class="grade${Number(b.grade) >= 8 ? ' hi' : ''}">${gradeText(b.grade)}</span></button><button class="btn sm wearbtn" data-act="wear" data-id="${b.id}" aria-label="${esc(t('today.wearAria', { n: full(b) }))}">${esc(t('today.wearShort'))}</button></div>`; }).join('')}
<div class="row actions"><button class="btn pri" data-act="add">${esc(t('bottle.add'))}</button></div></section>`;
}
function openBottle(id) {
  const b = S.bottles.find(x => x.id === id); if (!b) return;
  const ix = wearIndex(S.wears), st = bottleStats(b, ix, S.sprays), ws = S.wears.filter(w => w.b === id).sort((a, c) => c.d.localeCompare(a.d)).slice(0, 8);
  const kv = (k, v) => `<div class="kv"><span>${esc(k)}</span><b>${v}</b></div>`;
  sheet(`<div class="bhead"><div>${bottle(b.shape, st.level, b.family, 84)}</div><div><p class="house">${esc(b.house)}</p><h2 class="fname">${esc(b.name || t('bottle.unnamed'))}</h2><p class="sub">${esc([b.conc, b.size ? b.size + ' ml' : '', b.family ? t('fam.' + b.family) : ''].filter(Boolean).join(' · '))}</p><p class="gline"><span class="grade big${Number(b.grade) >= 8 ? ' hi' : ''}">${gradeText(b.grade)}</span><small>${esc(t('f.gradeOf'))}</small></p></div></div>
${pyramid(tiers(b))}
<div class="kvs">${kv(t('card.wearsK'), st.wears)}${st.last ? kv(t('card.last'), esc(dayText(st.last))) : ''}${b.price ? kv(t('f.price'), money(b.price)) : ''}${st.costPerWear !== null ? kv(t('card.cpwK'), money(st.costPerWear, 2)) : ''}${st.mlLeft !== null ? kv(t('card.leftK'), esc(t('card.leftV', { n: Math.round(st.mlLeft), w: st.wearsLeft }))) : ''}</div>
${(b.seasons && b.seasons.length) || (b.occ && b.occ.length) ? `<p class="tags">${(b.seasons || []).map(s => `<i>${esc(t('season.' + s))}</i>`).join('')}${(b.occ || []).map(o => `<i>${esc(t('occ.' + o))}</i>`).join('')}</p>` : ''}
${b.note ? `<p class="sub pre">${esc(b.note)}</p>` : ''}
${ws.length ? `<h3>${esc(t('bottle.wears'))}</h3><div class="lately">${ws.map(w => `<div class="lrow"><span>${esc(dayText(w.d))}</span><button class="link" data-act="wear-del" data-id="${w.id}" data-b="${b.id}">${esc(t('bottle.wearDel'))}</button></div>`).join('')}</div>` : ''}
<div class="row end"><button class="btn sm" data-act="close">${esc(t('common.close'))}</button><span class="row"><button class="btn sm" data-act="wear" data-id="${b.id}">${esc(t('today.wearShort'))}</button><button class="btn sm pri" data-act="edit" data-id="${b.id}">${esc(t('common.edit'))}</button></span></div>`);
}
function editSheet() {
  const d = ui.draft, isNew = !S.bottles.find(x => x.id === d.id);
  const inp = (k, o = {}) => `<label class="fld${o.wide ? ' wide' : ''}"><span>${esc(t('f.' + k))}</span><span class="box"><input data-d="${k}" type="${o.type || 'text'}" ${o.type === 'number' ? `inputmode="decimal" min="0" step="${o.step || 1}"` : 'maxlength="80"'} value="${esc(o.val !== undefined ? o.val : (d[k] || ''))}" placeholder="${esc(o.ph || '')}">${o.unit ? `<i>${esc(o.unit)}</i>` : ''}</span></label>`;
  const note = k => `<label class="fld wide"><span>${esc(t('n.' + k))}</span><span class="box"><input data-n="${k}" type="text" maxlength="160" value="${esc(parseNotes(d.notes && d.notes[k]).join(', '))}" placeholder="${esc(t('n.ph'))}"></span></label>`;
  const chips = (act, arr, cur, lab) => `<div class="chips">${arr.map(v => `<button type="button" class="chip" data-act="${act}" data-v="${v}" aria-pressed="${(cur || []).includes(v)}">${esc(t(lab + v))}</button>`).join('')}</div>`;
  sheet(`<h2>${esc(t(isNew ? 'edit.new' : 'edit.h'))}</h2>
<div class="grid">${inp('house', { ph: t('f.housePh') })}${inp('name', { ph: t('f.namePh') })}
<label class="fld"><span>${esc(t('f.conc'))}</span><span class="box"><select data-d="conc">${CONCS.map(c => `<option${c === d.conc ? ' selected' : ''}>${c}</option>`).join('')}</select></span></label>
<label class="fld"><span>${esc(t('f.family'))}</span><span class="box"><select data-d="family"><option value="">${esc(t('f.familyNone'))}</option>${FAMILIES.map(f => `<option value="${f}"${f === d.family ? ' selected' : ''}>${esc(t('fam.' + f))}</option>`).join('')}</select></span></label>
${inp('size', { type: 'number', step: 5, unit: 'ml' })}${inp('price', { type: 'number', step: 5, unit: S.cur })}</div>
<div class="gradebox"><label for="gradeR">${esc(t('f.grade'))}</label><output id="gradeO">${gradeText(d.grade)}</output><input id="gradeR" data-d="grade" type="range" min="0" max="10" step="0.5" value="${Number(d.grade) || 0}"><small>${esc(t('f.gradeHint'))}</small></div>
<h3>${esc(t('n.h'))}</h3><div class="grid">${note('top')}${note('heart')}${note('base')}</div>
<h3>${esc(t('f.seasons'))}</h3>${chips('d-season', SEASONS, d.seasons, 'season.')}
<h3>${esc(t('f.occ'))}</h3>${chips('d-occ', OCCASIONS, d.occ, 'occ.')}
<h3>${esc(t('f.shape'))}</h3><div class="shapes">${SHAPES.map(s => `<button type="button" data-act="d-shape" data-v="${s}" aria-pressed="${d.shape === s}" aria-label="${esc(t('shape.' + s))}">${bottle(s, .6, d.family, 34)}</button>`).join('')}</div>
<label class="fld wide" style="margin-top:14px"><span>${esc(t('f.note'))}</span><textarea data-d="note" rows="2" maxlength="500">${esc(d.note || '')}</textarea></label>
<div class="row end">${isNew ? '<span></span>' : `<button type="button" class="link danger" data-act="del">${esc(t('edit.del'))}</button>`}<span class="row"><button type="button" class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button type="button" class="btn sm pri" data-act="save-bottle">${esc(t('common.save'))}</button></span></div>`);
}

/* ---------- to sample ---------- */
function qItem(q) {
  const tag = q.src === 'claude' ? `<em>${esc(t('q.fromClaude'))}</em>` : '';
  let acts;
  if (q.verdict === 'drop') acts = `<button class="link" data-act="q-set" data-id="${q.id}" data-s="wish">${esc(t('q.again'))}</button><button class="link danger" data-act="q-del" data-id="${q.id}">${esc(t('q.remove'))}</button>`;
  else if (q.state === 'wish') acts = `<button class="btn sm" data-act="q-set" data-id="${q.id}" data-s="sampled">${esc(t('q.tried'))}</button><button class="link danger" data-act="q-del" data-id="${q.id}">${esc(t('q.remove'))}</button>`;
  else acts = `<button class="btn sm pri" data-act="q-buy" data-id="${q.id}">${esc(t('q.buy'))}</button><button class="btn sm" data-act="q-set" data-id="${q.id}" data-s="drop">${esc(t('q.drop'))}</button><button class="link" data-act="q-set" data-id="${q.id}" data-s="wish">${esc(t('q.notYet'))}</button>`;
  return `<div class="qitem${q.verdict === 'drop' ? ' dropped' : ''}"><p class="qn"><small class="house">${esc(q.house)}</small><b class="fname">${esc(q.name)}</b>${tag}</p>${q.why ? `<p class="sub">${esc(q.why)}</p>` : ''}${q.notes ? `<p class="note">${esc(['top', 'heart', 'base'].flatMap(k => parseNotes(q.notes[k])).slice(0, 8).join(' · '))}</p>` : ''}<div class="row">${acts}</div></div>`;
}
function renderQueue() {
  const m = today().slice(0, 7), rit = S.ritual[m] || { set: '', done: false };
  const wish = S.queue.filter(q => q.state === 'wish' && q.verdict !== 'drop'), tried = S.queue.filter(q => q.state === 'sampled' && q.verdict !== 'drop'), dropped = S.queue.filter(q => q.verdict === 'drop');
  const sec = (k, arr) => arr.length ? `<section><h2>${esc(t(k, { n: arr.length }))}</h2>${arr.map(qItem).join('')}</section>` : '';
  return exBanner() + `<section class="lead"><p class="kicker">${esc(t('q.k'))}</p><h1>${esc(t('q.h1', { n: wish.length }))}</h1><p class="sub">${esc(t('q.sub'))}</p><div class="row"><button class="btn pri" data-act="q-add">${esc(t('q.add'))}</button></div></section>
<section class="card ritual"><h3>${esc(t('rit.h', { m: new Date(m + '-15').toLocaleDateString(loc(), { month: 'long' }) }))}</h3><p class="note">${esc(t('rit.sub'))}</p><div class="ritrow"><span class="box"><input data-rit type="text" maxlength="80" value="${esc(rit.set || '')}" placeholder="${esc(t('rit.ph'))}" aria-label="${esc(t('rit.ph'))}"></span><label class="chk"><input type="checkbox" data-ritdone ${rit.done ? 'checked' : ''}> <span>${esc(t('rit.done'))}</span></label></div></section>
<section class="card ask"><h3>${esc(t('ask.h'))}</h3><p class="sub">${esc(t('ask.sub'))}</p><ol><li>${esc(t('ask.1'))}<div class="row"><button class="btn sm" data-act="ask-copy">${esc(t('ask.copy'))}</button></div></li><li>${esc(t('ask.2'))}</li><li>${esc(t('ask.3'))}<textarea data-ask rows="3" placeholder="${esc(t('ask.ph'))}" aria-label="${esc(t('ask.ph'))}">${esc(ui.askText)}</textarea><div class="row"><button class="btn sm" data-act="ask-add">${esc(t('ask.add'))}</button></div></li></ol><p class="note">${esc(t('ask.note'))}</p></section>
${sec('q.wish', wish)}${sec('q.triedH', tried)}${dropped.length ? `<section><details class="more"><summary>${esc(t('q.dropped', { n: dropped.length }))}</summary>${dropped.map(qItem).join('')}</details></section>` : ''}`;
}
function askPrompt() { return t('ask.prompt', { fam: FAMILIES.join(', ') }) + '\n\n' + JSON.stringify(exportData(S, today()), null, 1); }

/* ---------- settings ---------- */
function renderSettings() {
  const email = ui.session, on = window.Cloud && window.Cloud.configured();
  return `<section class="lead"><h1>${esc(t('set.h1'))}</h1></section>
<section><h2>${esc(t('set.lang'))}</h2><div class="seg" role="group"><button data-act="lang" data-l="en" aria-pressed="${lang() === 'en'}">English</button><button data-act="lang" data-l="fr" aria-pressed="${lang() === 'fr'}">Français</button></div></section>
<section><h2>${esc(t('set.place'))}</h2><p class="note">${esc(t('place.sub'))}</p><div class="ritrow"><span class="box"><input data-place type="text" maxlength="40" value="${esc(S.place.name)}" aria-label="${esc(t('set.place'))}"></span><button class="btn sm" data-act="place-find">${esc(t('place.find'))}</button></div><p class="note" id="placeLine">${esc(t('place.at', { lat: Number(S.place.lat).toFixed(2), lon: Number(S.place.lon).toFixed(2) }))}</p></section>
<section><h2>${esc(t('set.sprays'))}</h2><p class="note">${esc(t('sprays.sub'))}</p><label class="fld narrow"><span class="box"><input data-f="sprays" type="number" inputmode="numeric" min="1" max="20" step="1" value="${S.sprays}" aria-label="${esc(t('set.sprays'))}"></span></label></section>
<section><h2>${esc(t('set.cur'))}</h2><label class="fld narrow"><span class="box"><select data-f="cur" aria-label="${esc(t('set.cur'))}">${CURS.map(c => `<option${c === S.cur ? ' selected' : ''}>${c}</option>`).join('')}</select></span></label></section>
<section><h2>${esc(t('set.sync'))}</h2><p class="note">${esc(!on ? t('sync.none') : email ? t('sync.on', { e: email }) : t('sync.off'))}</p>${on ? `<div class="row"><button class="btn sm" data-act="sync">${esc(email ? t('sync.manage') : t('sync.signin'))}</button></div>` : ''}<p class="note">${esc(t('sync.private'))}</p></section>
<section><h2>${esc(t('set.ideas'))}</h2><p class="note">${esc(t('ideas.sub'))}</p><label class="fld wide"><span>${esc(t('ideas.link'))}</span><span class="box"><input type="url" data-inbox value="${esc(S.inbox || '')}" placeholder="https://docs.google.com/…"></span></label>${S.inbox ? `<div class="row" style="margin-top:10px"><a class="btn sm" href="${esc(S.inbox)}" target="_blank" rel="noopener">${esc(t('ideas.open'))}</a></div>` : ''}</section>
<section><h2>${esc(t('set.data'))}</h2><div class="row"><button class="btn sm" data-act="export">${esc(t('data.export'))}</button><label class="btn sm">${esc(t('data.import'))}<input type="file" accept="application/json,.json" data-import hidden></label></div>
<div class="row" style="margin-top:14px">${hasExamples() ? `<button class="btn sm" data-act="ex-off">${esc(t('ex.off'))}</button>` : `<button class="btn sm" data-act="ex-on">${esc(t('ex.on'))}</button>`}<button class="btn sm danger" data-act="reset">${esc(t('data.reset'))}</button></div></section>
<p class="note foot">${esc(t('credits'))}</p>`;
}

/* ---------- shell ---------- */
export function render() {
  document.documentElement.lang = lang();
  const tab = TABS.includes(S.ui.tab) ? S.ui.tab : 'today';
  if (tab === 'today') loadWx();
  $('#tabs').innerHTML = TABS.map(k => `<button data-act="tab" data-tab="${k}" ${k === tab ? 'aria-current="page"' : ''}>${esc(t('tab.' + k))}</button>`).join('');
  $('#main').innerHTML = { today: renderToday, wardrobe: renderWardrobe, queue: renderQueue, settings: renderSettings }[tab]();
}
export function refreshSession() {
  if (!window.Cloud || !window.Cloud.configured()) return;
  window.Cloud.session().then(s => { const e = s ? s.user.email : null; if (e !== ui.session) { ui.session = e; if (S.ui.tab === 'settings') render(); } }).catch(() => { });
}
const startEdit = b => { ui.draft = JSON.parse(JSON.stringify(b)); const d = ui.draft; d.notes = d.notes || {}; d.seasons = d.seasons || []; d.occ = d.occ || []; editSheet(); };
const toggle = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
function copy(text) {
  const fallback = () => sheet(`<h2>${esc(t('ask.copyH'))}</h2><p class="note">${esc(t('ask.copyManual'))}</p><textarea rows="10" readonly class="copybox">${esc(text)}</textarea><div class="row end"><span></span><button class="btn sm pri" data-act="close">${esc(t('common.close'))}</button></div>`);
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast(t('ask.copied')), fallback); else fallback(); } catch (e) { fallback(); }
}

function act(el) {
  const a = el.dataset.act, d = ui.draft, id = el.dataset.id;
  if (a === 'tab') { S.ui.tab = el.dataset.tab; saveUi(); render(); window.scrollTo(0, 0); }
  else if (a === 'close') closeSheet();
  else if (a === 'band') { S.ui.band = el.dataset.v || null; saveUi(); render(); }
  else if (a === 'occ') { S.ui.occ = el.dataset.v || null; saveUi(); render(); }
  else if (a === 'open') openBottle(id);
  else if (a === 'add') startEdit(blankBottle());
  else if (a === 'edit') { const b = S.bottles.find(x => x.id === id); if (b) startEdit(b); }
  else if (a === 'wear') { const b = S.bottles.find(x => x.id === id); if (!b) return; if (S.wears.some(w => w.b === id && w.d === today())) { toast(t('today.already')); return; } S.wears.push({ id: uid(), d: today(), b: id, occ: S.ui.occ || undefined }); save(); closeSheet(); render(); toast(t('today.done', { n: b.name || full(b) })); }
  else if (a === 'unwear') { const i = S.wears.findIndex(w => w.b === id && w.d === today()); if (i >= 0) { S.wears.splice(i, 1); save(); render(); } }
  else if (a === 'wear-del') { S.wears = S.wears.filter(w => w.id !== id); save(); render(); openBottle(el.dataset.b); }
  else if (a === 'd-season' && d) { d.seasons = toggle(d.seasons, el.dataset.v); el.setAttribute('aria-pressed', d.seasons.includes(el.dataset.v)); }
  else if (a === 'd-occ' && d) { d.occ = toggle(d.occ, el.dataset.v); el.setAttribute('aria-pressed', d.occ.includes(el.dataset.v)); }
  else if (a === 'd-shape' && d) { d.shape = el.dataset.v; el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === el)); }
  else if (a === 'save-bottle' && d) {
    if (!String(d.name || '').trim() && !String(d.house || '').trim()) { toast(t('edit.needName')); return; }
    d.name = String(d.name || '').trim(); d.house = String(d.house || '').trim(); delete d.ex; for (const k of ['size', 'price', 'grade']) d[k] = Math.max(0, Number(d[k]) || 0);
    for (const k of ['top', 'heart', 'base']) d.notes[k] = parseNotes(d.notes[k]).join(', ');
    const i = S.bottles.findIndex(x => x.id === d.id); if (i >= 0) S.bottles[i] = d; else S.bottles.push(d);
    if (d.fromQ) { S.queue = S.queue.filter(q => q.id !== d.fromQ); delete d.fromQ; }
    save(); closeSheet(); if (S.ui.tab === 'queue') S.ui.tab = 'wardrobe'; render();
  }
  else if (a === 'del' && d) { if (el.dataset.sure) { S.bottles = S.bottles.filter(x => x.id !== d.id); S.wears = S.wears.filter(w => w.b !== d.id); save(); closeSheet(); render(); } else { el.dataset.sure = '1'; el.textContent = t('edit.delSure'); } }
  else if (a === 'q-add') sheet(`<h2>${esc(t('q.addH'))}</h2><form data-form="q" class="grid"><label class="fld"><span>${esc(t('f.house'))}</span><span class="box"><input name="house" type="text" maxlength="60"></span></label><label class="fld"><span>${esc(t('f.name'))}</span><span class="box"><input name="name" type="text" maxlength="80" required></span></label><label class="fld wide"><span>${esc(t('q.why'))}</span><span class="box"><input name="why" type="text" maxlength="200" placeholder="${esc(t('q.whyPh'))}"></span></label><div class="row end wide"><button type="button" class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button class="btn sm pri">${esc(t('common.save'))}</button></div></form>`);
  else if (a === 'q-set') { const q = S.queue.find(x => x.id === id); if (!q) return; const s = el.dataset.s; delete q.ex; if (s === 'drop') { q.verdict = 'drop'; q.state = 'sampled'; } else { q.verdict = null; q.state = s; if (s === 'sampled') q.tried = today(); } save(); render(); }
  else if (a === 'q-del') { S.queue = S.queue.filter(x => x.id !== id); save(); render(); }
  else if (a === 'q-buy') { const q = S.queue.find(x => x.id === id); if (!q) return; const b = blankBottle(); b.house = q.house; b.name = q.name; b.family = q.family || ''; if (q.notes) b.notes = { top: parseNotes(q.notes.top).join(', '), heart: parseNotes(q.notes.heart).join(', '), base: parseNotes(q.notes.base).join(', ') }; b.fromQ = q.id; startEdit(b); }
  else if (a === 'ask-copy') copy(askPrompt());
  else if (a === 'ask-add') {
    let list; try { list = parseSuggestions(ui.askText); } catch (e) { toast(t('ask.bad')); return; }
    const fresh = list.filter(x => !S.bottles.some(b => sameScent(b, x)) && !S.queue.some(q => sameScent(q, x)));
    if (!fresh.length) { toast(t('ask.none')); return; }
    S.queue.push(...fresh.map(x => ({ id: uid(), ...x, src: 'claude', state: 'wish', verdict: null, note: '' }))); ui.askText = ''; save(); render(); toast(t('ask.added', { n: fresh.length }));
  }
  else if (a === 'place-find') { const q = S.place.name; if (!q) return; fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=' + lang() + '&name=' + encodeURIComponent(q)).then(r => r.json()).then(j => { const x = j && j.results && j.results[0]; if (!x) { toast(t('place.notFound')); return; } S.place = { name: x.name, lat: Math.round(x.latitude * 100) / 100, lon: Math.round(x.longitude * 100) / 100 }; ui.wx = null; save(); render(); toast(t('place.found', { n: x.name })); }).catch(() => toast(t('place.offline'))); }
  else if (a === 'lang') { S.lang = el.dataset.l; setLang(S.lang); save(); render(); }
  else if (a === 'sync') { if (window.Cloud) window.Cloud.dialog(() => window.appSync && window.appSync()); }
  else if (a === 'ex-off') { dropExamples(); save(); render(); }
  else if (a === 'ex-on') { const ex = examples(); S.bottles.push(...ex.bottles); S.wears.push(...ex.wears); S.queue.push(...ex.queue); save(); render(); }
  else if (a === 'reset') sheet(`<h2>${esc(t('reset.h'))}</h2><p class="note">${esc(t('reset.sub'))}</p><div class="row end"><button class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button class="btn sm danger" data-act="reset-yes">${esc(t('reset.yes'))}</button></div>`);
  else if (a === 'reset-yes') { const lg = S.lang; reset(); S.lang = lg; save(true); closeSheet(); render(); }
  else if (a === 'export') { const url = URL.createObjectURL(exportBackup()), x = document.createElement('a'); x.href = url; x.download = 'sillage-' + new Date().toISOString().slice(0, 10) + '.json'; x.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
  else if (a === 'reload') location.reload();
}

export function init() {
  document.addEventListener('click', ev => { const el = ev.target.closest('[data-act]'); if (el && !el.disabled) act(el); });
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('[data-form=q]'); if (!f) return; ev.preventDefault();
    const x = { house: f.house.value.trim(), name: f.name.value.trim() }; if (!x.name) return;
    S.queue.push({ id: uid(), ...x, why: f.why.value.trim(), family: '', notes: null, src: 'me', state: 'wish', verdict: null, note: '' }); save(); closeSheet(); render();
  });
  const onField = (ev, done) => {
    const el = ev.target, d = ui.draft;
    if (el.dataset.d && d) { d[el.dataset.d] = el.value; if (el.dataset.d === 'grade') { const o = $('#gradeO'); if (o) o.textContent = gradeText(el.value); } }
    else if (el.dataset.n && d) d.notes[el.dataset.n] = el.value;
    else if (el.dataset.f === 'sort' && done) { S.ui.sort = el.value; saveUi(); render(); }
    else if (el.dataset.f === 'cur' && done) { S.cur = el.value; save(); render(); }
    else if (el.dataset.f === 'sprays') { S.sprays = Math.min(20, Math.max(1, Math.round(Number(el.value) || 6))); save(); }
    else if (el.dataset.rit !== undefined) { const m = today().slice(0, 7); S.ritual[m] = { ...(S.ritual[m] || { done: false }), set: el.value }; save(); }
    else if (el.dataset.ritdone !== undefined && done) { const m = today().slice(0, 7); S.ritual[m] = { ...(S.ritual[m] || { set: '' }), done: el.checked }; save(); }
    else if (el.dataset.ask !== undefined) ui.askText = el.value;
    else if (el.dataset.place !== undefined) { S.place.name = el.value; save(); }
    else if (el.dataset.inbox !== undefined && done) { setInbox(el.value.trim()); render(); }
    else if (el.dataset.import !== undefined && done && el.files[0]) { el.files[0].text().then(tx => { importBackup(tx); setLang(S.lang); render(); toast(t('data.imported')); }).catch(() => toast(t('data.importFail'))); }
  };
  document.addEventListener('input', ev => onField(ev, false));
  document.addEventListener('change', ev => onField(ev, true));
  $('#sheet').addEventListener('click', ev => { if (ev.target === $('#sheet')) closeSheet(); });
  $('#sheet').addEventListener('close', () => { ui.draft = null; });
  /* a new day while the app stayed open */
  let day = today(); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && today() !== day) { day = today(); ui.wx = null; render(); } });
  render(); refreshSession();
}
