/* Grand Tour — every screen. Reads the state, draws HTML, handles taps through data-act. */
import { S, save, saveUi, reset, blank, examples, setInbox, exportBackup, importBackup } from './store.js';
import { NUMERALS, DEFAULT_NAMES, DEFAULT_BANDS, CRITERIA, FACILITIES, PAR, MEMORABLE, gradeOf, gradeSource, gradeFromRate, experience, scoredCount, valueOf, km, driveOf, hasPin, applyFilters, stats, ranking, cleanBands, fmtDrive } from './engine.js';
import { compass, valueChart, realMap } from './atlas.js';
import { t, setLang, lang } from './i18n.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TABS = ['atlas', 'carnet', 'ladder', 'settings'], CURS = ['EUR', 'CHF', 'GBP', 'USD', 'DKK', 'PLN', 'CZK'];
const ui = { session: undefined, draft: null, map: null, finding: false, found: null };
const loc = () => lang() === 'fr' ? 'fr-FR' : 'en-GB';
const nf = {};
const money = v => { const k = loc() + S.cur; nf[k] = nf[k] || new Intl.NumberFormat(loc(), { style: 'currency', currency: S.cur, maximumFractionDigits: 0 }); return nf[k].format(Math.round(v || 0)); };
const sg = v => (v >= 0 ? '+' : '−') + Math.abs(Math.round(v));
const monthOf = d => d ? new Date(d + 'T12:00').toLocaleDateString(loc(), { month: 'short', year: 'numeric' }) : '';
const width = () => Math.min(640, document.documentElement.clientWidth) - 40;
const ctx = () => ({ bands: S.bands, home: S.home });
const gname = g => S.names[g - 1] || DEFAULT_NAMES[g - 1];
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }
function sheet(html) { const d = $('#sheet'); d.innerHTML = html; if (!d.open) d.showModal(); d.scrollTop = 0; }
const closeSheet = () => { const d = $('#sheet'); if (d.open) d.close(); ui.draft = null; ui.found = null; };

/* the embossed plate: five stars, the numeral, the grade's name */
const plate = (g, big) => `<span class="plate${big ? ' big' : ''}${g ? ' g' + g : ' g0'}" aria-label="${g ? esc(t('plate.aria', { n: NUMERALS[g - 1], name: gname(g) })) : esc(t('plate.none'))}"><i aria-hidden="true">★★★★★</i><b aria-hidden="true">${g ? NUMERALS[g - 1] : '–'}</b>${big ? `<em aria-hidden="true">${g ? esc(gname(g)) : esc(t('plate.none'))}</em>` : ''}</span>`;
const bandText = g => g === 1 ? t('band.under', { v: money(S.bands[0]) }) : g === 5 ? t('band.over', { v: money(S.bands[3]) }) : t('band.between', { a: money(S.bands[g - 2]), b: money(S.bands[g - 1]) });
const driveText = h => { const d = driveOf(h, S.home); return !d ? '' : d.min < 15 ? t('drive.here', { home: S.home.name }) : t(d.est ? 'drive.est' : 'drive.real', { v: fmtDrive(d.min), home: S.home.name }); };

/* ---------- atlas ---------- */
function shown() { return applyFilters(S.hotels, S.ui.f, ctx()); }
function sorted(list) {
  const by = S.ui.sort, key = h => by === 'grade' ? -(gradeOf(h, S.bands) || 0) : by === 'value' ? -(valueOf(h, S.bands, S.weights) ?? -999) : by === 'name' ? 0 : (driveOf(h, S.home) || { min: 1e9 }).min;
  return [...list].sort((a, b) => key(a) - key(b) || a.name.localeCompare(b.name));
}
const pins = list => list.filter(hasPin).map(h => ({ id: h.id, name: h.name, lat: Number(h.lat), lon: Number(h.lon), min: (driveOf(h, S.home) || { min: 0 }).min, grade: gradeOf(h, S.bands), stayed: h.status === 'stayed' }));
function cardHtml(h) {
  const g = gradeOf(h, S.bands), e = experience(h, S.weights), v = valueOf(h, S.bands, S.weights), bits = [];
  if (g) bits.push(esc(gname(g)));
  bits.push(esc(h.status === 'stayed' ? (h.from ? t('card.stayedOn', { m: monthOf(h.from) }) : t('card.stayed')) : t('card.wish')));
  if (e !== null) bits.push(esc(t('card.exp', { n: Math.round(e) })));
  if (v !== null) bits.push(`<span class="${v >= 0 ? 'up' : 'down'}">${esc(t('card.value', { v: sg(v) }))}</span>`);
  const has = FACILITIES.filter(k => h.has && h.has[k]).map(k => `<i>${esc(t('has.' + k))}</i>`).join('');
  return `<button class="hcard" data-act="open" data-id="${h.id}">${plate(g)}<span class="hmain"><b class="hname">${esc(h.name || t('hotel.unnamed'))}</b><span class="hplace">${esc([h.place, driveText(h)].filter(Boolean).join(' · '))}</span><span class="hmeta">${bits.join(' · ')}</span>${has ? `<span class="tags">${has}</span>` : ''}</span></button>`;
}
function filtersHtml() {
  const f = S.ui.f, chip = (act, val, label, on) => `<button class="chip" data-act="${act}" data-v="${val}" aria-pressed="${on}">${label}</button>`;
  return `<div class="filters"><div class="chips">${['all', 'stayed', 'wish'].map(k => chip('f-status', k, esc(t('f.' + k)), f.status === k)).join('')}</div>
<div class="chips">${[1, 2, 3, 4, 5].map(g => chip('f-grade', g, `<b class="rn">${NUMERALS[g - 1]}</b>`, f.grades.includes(g))).join('')}<span class="sep"></span>${['pool', 'sauna', 'parking', 'dog'].map(k => chip('f-has', k, esc(t('has.' + k)), !!f[k])).join('')}</div>
<div class="selrow"><label><span>${esc(t('f.drive', { home: S.home.name }))}</span><select data-f="drive">${[0, 2, 4, 6, 8].map(n => `<option value="${n}"${Number(f.drive) === n ? ' selected' : ''}>${n ? esc(t('f.within', { n })) : esc(t('f.any'))}</option>`).join('')}</select></label><label><span>${esc(t('sort.by'))}</span><select data-f="sort">${['drive', 'grade', 'value', 'name'].map(k => `<option value="${k}"${S.ui.sort === k ? ' selected' : ''}>${esc(t('sort.' + k))}</option>`).join('')}</select></label></div></div>`;
}
function stageHtml(list) {
  const p = pins(list);
  if (S.ui.view === 'map') return `<div id="map" class="map"></div><p class="note cap">${esc(t('map.cap'))}</p>`;
  return `<div class="stage">${compass(p, { w: width(), home: S.home, L: { n: t('c.n'), e: t('c.e'), s: t('c.s'), w: t('c.w'), aria: t('c.aria', { home: S.home.name }), hours: n => t('c.hours', { n }) } })}</div><p class="note cap">${esc(t('c.cap', { home: S.home.name }))}${list.length > p.length ? ' ' + esc(t('c.unpinned', { n: list.length - p.length })) : ''}</p>`;
}
function renderAtlas() {
  const list = sorted(shown()), st = stats(S.hotels, S.bands, S.weights);
  const ex = S.hotels.some(h => h.ex) ? `<p class="banner">${esc(t('ex.banner'))} <button class="link" data-act="ex-off">${esc(t('ex.off'))}</button></p>` : '';
  if (!S.hotels.length) return `<section class="lead"><h1>${esc(t('empty.h1'))}</h1><p class="sub">${esc(t('empty.sub'))}</p><div class="row"><button class="btn pri" data-act="add">${esc(t('hotel.add'))}</button><button class="btn" data-act="ex-on">${esc(t('ex.on'))}</button></div></section>`;
  return ex + `<section class="lead"><p class="kicker">${esc(t('atlas.k', { n: S.hotels.length }))}</p><h1>${esc(t('atlas.h1', { a: st.stays, b: st.wishes }))}</h1>
<div class="seg" role="group" aria-label="${esc(t('view.aria'))}"><button data-act="view" data-v="compass" aria-pressed="${S.ui.view !== 'map'}">${esc(t('view.compass'))}</button><button data-act="view" data-v="map" aria-pressed="${S.ui.view === 'map'}">${esc(t('view.map'))}</button></div></section>
<div id="stage">${stageHtml(list)}</div>${filtersHtml()}
<section class="list"><p class="count">${esc(t('list.count', { n: list.length, of: S.hotels.length }))}</p>${list.length ? list.map(cardHtml).join('') : `<p class="sub">${esc(t('list.none'))}</p>`}</section>
<div class="row actions"><button class="btn pri" data-act="add">${esc(t('hotel.add'))}</button></div>`;
}
function mountMap() {
  if (ui.map) { try { ui.map.remove(); } catch (e) { } ui.map = null; }
  const el = $('#map'); if (!el || S.ui.tab !== 'atlas' || S.ui.view !== 'map') return;
  realMap(el, pins(shown()), S.home, id => openHotel(id)).then(m => { ui.map = m; }).catch(() => { S.ui.view = 'compass'; saveUi(); render(); toast(t('map.fail')); });
}

/* ---------- one hotel ---------- */
function openHotel(id) {
  const h = S.hotels.find(x => x.id === id); if (!h) return;
  const g = gradeOf(h, S.bands), src = gradeSource(h), e = experience(h, S.weights), v = valueOf(h, S.bands, S.weights);
  const why = !g ? t('grade.none') : src === 'own' ? t('grade.own') : src === 'ref' ? t('grade.ref', { v: money(h.ref), band: bandText(g) }) : t('grade.paid', { v: money(h.paid), band: bandText(g) });
  const has = FACILITIES.filter(k => h.has && h.has[k]).map(k => `<i>${esc(t('has.' + k))}</i>`).join('');
  let stay = '';
  if (h.status === 'stayed') {
    const facts = [h.from ? new Date(h.from + 'T12:00').toLocaleDateString(loc(), { day: 'numeric', month: 'long', year: 'numeric' }) : '', h.nights ? t('stay.nights', { n: h.nights }) : '', h.who ? t('stay.with', { who: h.who }) : '', h.paid ? t('stay.paid', { v: money(h.paid) }) : ''].filter(Boolean).join(' · ');
    const bars = CRITERIA.map(k => { const s = Number(h.x && h.x[k]) || 0; return s ? `<div class="sbar"><span>${esc(t('x.' + k))}</span><span class="track"><i style="width:${s * 20}%"></i></span><b>${s}</b></div>` : ''; }).join('');
    stay = `<h3>${esc(t('stay.h'))}</h3>${facts ? `<p class="sub">${esc(facts)}</p>` : ''}${bars ? `<div class="sbars">${bars}</div>` : `<p class="note">${esc(t('stay.noScores'))}</p>`}
${e !== null ? `<p class="verdict ${v >= 0 ? 'up' : 'down'}">${esc(t(v >= 0 ? 'value.up' : 'value.down', { e: Math.round(e), par: PAR[g - 1], g: gname(g), d: Math.abs(Math.round(v)) }))}${e >= MEMORABLE ? ' ' + esc(t('value.memorable')) : ''}</p>` : ''}`;
  }
  sheet(`<div class="hhead">${plate(g, true)}<div><h2 class="hname">${esc(h.name || t('hotel.unnamed'))}</h2><p class="sub">${esc(h.place || '')}</p></div></div>
<p class="note">${esc(why)}</p>${driveText(h) ? `<p class="note">${esc(driveText(h))}</p>` : hasPin(h) ? '' : `<p class="note">${esc(t('pin.none'))}</p>`}
${has ? `<p class="tags">${has}</p>` : ''}${stay}${h.note ? `<h3>${esc(t('f.note'))}</h3><p class="sub pre">${esc(h.note)}</p>` : ''}
<div class="row end"><button class="btn sm" data-act="close">${esc(t('common.close'))}</button>${h.status === 'wish' ? `<button class="btn sm" data-act="edit" data-id="${h.id}" data-stayed="1">${esc(t('hotel.stayedNow'))}</button>` : ''}<button class="btn sm pri" data-act="edit" data-id="${h.id}">${esc(t('common.edit'))}</button></div>`);
}

function editSheet() {
  const d = ui.draft, isNew = !S.hotels.find(x => x.id === d.id), stayed = d.status === 'stayed';
  const inp = (k, o = {}) => `<label class="fld${o.wide ? ' wide' : ''}"><span>${esc(t('f.' + k))}</span><span class="box"><input data-d="${k}" type="${o.type || 'text'}" ${o.type === 'number' ? `inputmode="decimal" min="0" step="${o.step || 1}"` : o.type === 'date' ? '' : 'maxlength="80"'} value="${esc(d[k] || (o.type === 'number' ? '' : ''))}" placeholder="${esc(o.ph || '')}">${o.unit ? `<i>${esc(o.unit)}</i>` : ''}</span>${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</label>`;
  const auto = gradeFromRate(d.ref, S.bands) ?? gradeFromRate(d.paid, S.bands);
  const found = ui.found ? `<div class="found">${ui.found.length ? ui.found.map((r, i) => `<button type="button" class="pick" data-act="pick" data-i="${i}">${esc(r.name)}</button>`).join('') : `<p class="note">${esc(t('pin.notFound'))}</p>`}</div>` : '';
  const pinLine = hasPin(d) ? t('pin.set', { v: driveText(d) || `${Number(d.lat).toFixed(3)}, ${Number(d.lon).toFixed(3)}` }) : t('pin.none');
  sheet(`<h2>${esc(t(isNew ? 'edit.new' : 'edit.h'))}</h2>
<div class="grid">${inp('name', { wide: 1, ph: t('f.namePh') })}${inp('place', { wide: 1, ph: t('f.placePh') })}
<div class="fld wide pinbox"><div class="row"><button type="button" class="btn sm" data-act="find" ${ui.finding ? 'disabled' : ''}>${esc(t(ui.finding ? 'pin.finding' : 'pin.find'))}</button><span class="note" id="pinLine">${esc(pinLine)}</span></div>${found}
<details class="more"><summary>${esc(t('pin.manual'))}</summary><div class="grid">${inp('lat', { type: 'number', step: 'any' })}${inp('lon', { type: 'number', step: 'any' })}${inp('drive', { type: 'number', unit: 'min', hint: t('f.driveHint') })}</div></details></div>
<div class="fld wide"><span>${esc(t('f.status'))}</span><div class="seg" role="group"><button type="button" data-act="d-status" data-v="wish" aria-pressed="${!stayed}">${esc(t('f.wish'))}</button><button type="button" data-act="d-status" data-v="stayed" aria-pressed="${stayed}">${esc(t('f.stayed'))}</button></div></div>
${inp('ref', { type: 'number', step: 10, unit: S.cur, hint: t('f.refHint') })}
<label class="fld"><span>${esc(t('f.grade'))}</span><span class="box"><select data-d="gradeOv"><option value="">${esc(auto ? t('f.gradeAuto', { n: NUMERALS[auto - 1], name: gname(auto) }) : t('f.gradeAutoNone'))}</option>${[1, 2, 3, 4, 5].map(g => `<option value="${g}"${Number(d.gradeOv) === g ? ' selected' : ''}>${NUMERALS[g - 1]} · ${esc(gname(g))}</option>`).join('')}</select></span><small>${esc(t('f.gradeHint'))}</small></label>
<div class="fld wide"><span>${esc(t('f.has'))}</span><div class="chips">${FACILITIES.map(k => `<button type="button" class="chip" data-act="d-has" data-v="${k}" aria-pressed="${!!(d.has && d.has[k])}">${esc(t('has.' + k))}</button>`).join('')}</div></div></div>
<div class="stayform"${stayed ? '' : ' hidden'}><h3>${esc(t('stay.h'))}</h3><div class="grid">${inp('from', { type: 'date' })}${inp('nights', { type: 'number' })}${inp('who', { ph: t('f.whoPh') })}${inp('paid', { type: 'number', step: 10, unit: S.cur, hint: t('f.paidHint') })}</div>
<h3>${esc(t('x.h'))}</h3><p class="note">${esc(t('x.sub'))}</p><div class="scores">${CRITERIA.map(k => `<div class="srow"><span>${esc(t('x.' + k))}</span><div class="sc" role="group" aria-label="${esc(t('x.' + k))}">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-act="d-x" data-k="${k}" data-n="${n}" aria-pressed="${Number(d.x && d.x[k]) === n}">${n}</button>`).join('')}</div></div>`).join('')}</div></div>
<label class="fld wide" style="margin-top:14px"><span>${esc(t('f.note'))}</span><textarea data-d="note" rows="2" maxlength="600">${esc(d.note || '')}</textarea></label>
<div class="row end">${isNew ? '<span></span>' : `<button type="button" class="link danger" data-act="del">${esc(t('edit.del'))}</button>`}<span class="row"><button type="button" class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button type="button" class="btn sm pri" data-act="save-hotel">${esc(t('common.save'))}</button></span></div>`);
}
/* look a place up by name (OpenStreetMap), then ask for the drive from home (OSRM) */
async function findPin() {
  const d = ui.draft, q = [d.name, d.place].filter(Boolean).join(', '); if (!q.trim()) { toast(t('pin.needName')); return; }
  ui.finding = true; ui.found = null; editSheet();
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=4&accept-language=' + lang() + '&q=' + encodeURIComponent(q)), j = r.ok ? await r.json() : [];
    let list = j; if (!list.length && d.place) { const r2 = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=4&accept-language=' + lang() + '&q=' + encodeURIComponent(d.place)); list = r2.ok ? await r2.json() : []; }
    ui.found = list.map(x => ({ name: x.display_name, lat: Number(x.lat), lon: Number(x.lon) })).filter(x => isFinite(x.lat) && isFinite(x.lon));
  } catch (e) { ui.found = null; toast(t('pin.offline')); }
  ui.finding = false; if (ui.draft === d) editSheet();
}
async function pick(i) {
  const d = ui.draft, r = ui.found && ui.found[i]; if (!d || !r) return;
  d.lat = Math.round(r.lat * 1e5) / 1e5; d.lon = Math.round(r.lon * 1e5) / 1e5; d.drive = 0; ui.found = null;
  if (!d.place) d.place = r.name.split(',').slice(-3).map(s => s.trim()).filter((s, k, a) => k === 0 || k === a.length - 1).join(', ');
  editSheet();
  try {
    const u = `https://router.project-osrm.org/route/v1/driving/${S.home.lon},${S.home.lat};${d.lon},${d.lat}?overview=false`, j = await (await fetch(u)).json();
    const sec = j && j.routes && j.routes[0] && j.routes[0].duration;
    if (sec > 0 && ui.draft === d) { d.drive = Math.round(sec / 60); const el = $('#pinLine'); if (el) el.textContent = t('pin.set', { v: driveText(d) }); const f = document.querySelector('[data-d=drive]'); if (f) f.value = d.drive; }
  } catch (e) { /* the estimate from the straight-line distance stays */ }
}

/* ---------- carnet: the stays in figures ---------- */
function renderCarnet() {
  const st = stats(S.hotels, S.bands, S.weights), rk = ranking(S.hotels, S.bands, S.weights);
  if (!st.stays) return `<section class="lead"><h1>${esc(t('carnet.h1'))}</h1><p class="sub">${esc(t('carnet.empty'))}</p></section>`;
  const tile = (k, v, note) => `<div class="tile"><span>${esc(k)}</span><b>${v}</b>${note ? `<small>${esc(note)}</small>` : ''}</div>`;
  const best = rk[0], worst = rk.length > 1 ? rk[rk.length - 1] : null;
  const head = st.perMemorable !== null ? t('carnet.lead', { v: money(st.perMemorable) }) : t('carnet.leadNone');
  const chart = rk.length ? `<section><h2>${esc(t('value.h'))}</h2><p class="note">${esc(t('value.sub'))}</p><div class="stage">${valueChart(rk.map(x => ({ name: x.h.name, g: x.g, e: x.e })), { w: width(), names: S.names, L: { par: t('value.par'), aria: t('value.aria') } })}</div>
<div class="rank">${rk.map(x => `<button class="rrow" data-act="open" data-id="${x.h.id}">${plate(x.g)}<span class="rname">${esc(x.h.name)}<small>${esc(t('rank.line', { e: Math.round(x.e), par: PAR[x.g - 1] }))}</small></span><b class="${x.v >= 0 ? 'up' : 'down'}">${sg(x.v)}</b></button>`).join('')}</div>
${best && best.v > 0 ? `<p class="callout">${esc(t('rank.best', { name: best.h.name, g: gname(best.g), d: Math.round(best.v) }))}${worst && worst.v < 0 ? ' ' + esc(t('rank.worst', { name: worst.h.name, d: Math.abs(Math.round(worst.v)) })) : ''}</p>` : ''}</section>` : `<section><p class="note">${esc(t('carnet.noScores'))}</p></section>`;
  return `${S.hotels.some(h => h.ex) ? `<p class="banner">${esc(t('ex.banner'))} <button class="link" data-act="ex-off">${esc(t('ex.off'))}</button></p>` : ''}<section class="lead"><p class="kicker">${esc(t('carnet.k'))}</p><h1>${esc(head)}</h1><p class="sub">${esc(t('carnet.sub', { n: MEMORABLE }))}</p></section>
<section class="tiles">${tile(t('st.stays'), st.stays)}${tile(t('st.nights'), st.nights)}${tile(t('st.spent'), money(st.spent))}${tile(t('st.perNight'), st.perNight !== null ? money(st.perNight) : '–')}${tile(t('st.memorable'), st.memNights, t('st.memorableOf', { n: st.memStays, of: st.rated }))}${tile(t('st.wishes'), st.wishes)}</section>${chart}`;
}

/* ---------- the ladder of grades ---------- */
function renderLadder() {
  const rows = [5, 4, 3, 2, 1].map(g => {
    const hs = S.hotels.filter(h => gradeOf(h, S.bands) === g);
    return `<div class="grow">${plate(g, true)}<div class="gmain"><p class="gband">${esc(bandText(g))}</p><p class="note">${esc(t('ladder.par', { n: PAR[g - 1] }))}</p>${hs.length ? `<div class="ghotels">${hs.map(h => `<button class="link" data-act="open" data-id="${h.id}">${esc(h.name)}</button>`).join('')}</div>` : `<p class="note">${esc(t('ladder.noneYet'))}</p>`}</div></div>`;
  }).join('');
  const ungraded = S.hotels.filter(h => !gradeOf(h, S.bands));
  return `<section class="lead"><p class="kicker">${esc(t('ladder.k'))}</p><h1>${esc(t('ladder.h1'))}</h1><p class="sub">${esc(t('ladder.sub'))}</p></section>
<section class="grades">${rows}</section>${ungraded.length ? `<p class="note">${esc(t('ladder.ungraded', { n: ungraded.length }))}</p>` : ''}
<div class="row actions"><button class="btn" data-act="bands">${esc(t('ladder.edit'))}</button></div>
<section><h2>${esc(t('w.h'))}</h2><p class="note">${esc(t('w.sub'))}</p><div class="weights">${CRITERIA.map(k => `<label><span>${esc(t('x.' + k))}</span><select data-w="${k}">${[0, 1, 2, 3].map(n => `<option value="${n}"${(S.weights[k] === undefined ? 1 : Number(S.weights[k])) === n ? ' selected' : ''}>${esc(t('w.' + n))}</option>`).join('')}</select></label>`).join('')}</div></section>
<section><h2>${esc(t('cal.h'))}</h2><p class="note">${esc(t('cal.1'))}</p><p class="note">${esc(t('cal.2'))}</p><p class="note">${esc(t('cal.3'))}</p></section>`;
}
function bandsSheet() {
  sheet(`<h2>${esc(t('bands.h'))}</h2><p class="note">${esc(t('bands.sub'))}</p><form data-form="bands" class="bandform" novalidate>${[1, 2, 3, 4, 5].map(g => `<div class="brow"><b class="rn">${NUMERALS[g - 1]}</b><input name="n${g}" type="text" maxlength="24" value="${esc(S.names[g - 1])}" aria-label="${esc(t('bands.name', { n: NUMERALS[g - 1] }))}">${g < 5 ? `<span class="box"><input name="b${g}" type="number" inputmode="decimal" min="0" step="any" value="${S.bands[g - 1]}" aria-label="${esc(t('bands.limit', { n: NUMERALS[g - 1] }))}"><i>${S.cur}</i></span>` : `<span class="note">${esc(t('bands.above'))}</span>`}</div>`).join('')}
<p class="note">${esc(t('bands.note'))}</p><div class="row end"><button type="button" class="link" data-act="bands-reset">${esc(t('bands.reset'))}</button><span class="row"><button type="button" class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button class="btn sm pri">${esc(t('common.save'))}</button></span></div></form>`);
}

/* ---------- settings ---------- */
function renderSettings() {
  const email = ui.session, on = window.Cloud && window.Cloud.configured();
  return `<section class="lead"><h1>${esc(t('set.h1'))}</h1></section>
<section><h2>${esc(t('set.lang'))}</h2><div class="seg" role="group"><button data-act="lang" data-l="en" aria-pressed="${lang() === 'en'}">English</button><button data-act="lang" data-l="fr" aria-pressed="${lang() === 'fr'}">Français</button></div></section>
<section><h2>${esc(t('set.home'))}</h2><p class="note">${esc(t('home.sub'))}</p><div class="grid"><label class="fld wide"><span>${esc(t('home.name'))}</span><span class="box"><input data-home="name" type="text" maxlength="40" value="${esc(S.home.name)}"></span></label><label class="fld"><span>${esc(t('f.lat'))}</span><span class="box"><input data-home="lat" type="number" inputmode="decimal" step="any" value="${S.home.lat}"></span></label><label class="fld"><span>${esc(t('f.lon'))}</span><span class="box"><input data-home="lon" type="number" inputmode="decimal" step="any" value="${S.home.lon}"></span></label></div><div class="row" style="margin-top:10px"><button class="btn sm" data-act="home-find">${esc(t('home.find'))}</button></div></section>
<section><h2>${esc(t('set.cur'))}</h2><p class="note">${esc(t('cur.sub'))}</p><label class="fld"><span class="box"><select data-f="cur" aria-label="${esc(t('set.cur'))}">${CURS.map(c => `<option${c === S.cur ? ' selected' : ''}>${c}</option>`).join('')}</select></span></label></section>
<section><h2>${esc(t('set.sync'))}</h2><p class="note">${esc(!on ? t('sync.none') : email ? t('sync.on', { e: email }) : t('sync.off'))}</p>${on ? `<div class="row"><button class="btn sm" data-act="sync">${esc(email ? t('sync.manage') : t('sync.signin'))}</button></div>` : ''}<p class="note">${esc(t('sync.private'))}</p></section>
<section><h2>${esc(t('set.ideas'))}</h2><p class="note">${esc(t('ideas.sub'))}</p><label class="fld wide"><span>${esc(t('ideas.link'))}</span><span class="box"><input type="url" data-inbox value="${esc(S.inbox || '')}" placeholder="https://docs.google.com/…"></span></label>${S.inbox ? `<div class="row" style="margin-top:10px"><a class="btn sm" href="${esc(S.inbox)}" target="_blank" rel="noopener">${esc(t('ideas.open'))}</a></div>` : ''}</section>
<section><h2>${esc(t('set.data'))}</h2><div class="row"><button class="btn sm" data-act="export">${esc(t('data.export'))}</button><label class="btn sm">${esc(t('data.import'))}<input type="file" accept="application/json,.json" data-import hidden></label></div>
<div class="row" style="margin-top:14px">${S.hotels.some(h => h.ex) ? `<button class="btn sm" data-act="ex-off">${esc(t('ex.off'))}</button>` : `<button class="btn sm" data-act="ex-on">${esc(t('ex.on'))}</button>`}<button class="btn sm danger" data-act="reset">${esc(t('data.reset'))}</button></div></section>
<p class="note">${esc(t('credits'))}</p>`;
}

/* ---------- shell ---------- */
export function render() {
  document.documentElement.lang = lang();
  const tab = TABS.includes(S.ui.tab) ? S.ui.tab : 'atlas';
  $('#tabs').innerHTML = TABS.map(k => `<button data-act="tab" data-tab="${k}" ${k === tab ? 'aria-current="page"' : ''}>${esc(t('tab.' + k))}</button>`).join('');
  $('#main').innerHTML = { atlas: renderAtlas, carnet: renderCarnet, ladder: renderLadder, settings: renderSettings }[tab]();
  mountMap();
}
/* filters and sort only redraw the stage and the list */
function refreshAtlas() { render(); }
export function refreshSession() {
  if (!window.Cloud || !window.Cloud.configured()) return;
  window.Cloud.session().then(s => { const e = s ? s.user.email : null; if (e !== ui.session) { ui.session = e; if (S.ui.tab === 'settings') render(); } }).catch(() => { });
}
const startEdit = (h, stayed) => { ui.draft = JSON.parse(JSON.stringify(h)); ui.draft.has = ui.draft.has || {}; ui.draft.x = ui.draft.x || {}; if (stayed) ui.draft.status = 'stayed'; ui.found = null; editSheet(); };

function act(el) {
  const a = el.dataset.act, f = S.ui.f, d = ui.draft;
  if (a === 'tab') { S.ui.tab = el.dataset.tab; saveUi(); render(); window.scrollTo(0, 0); }
  else if (a === 'close') closeSheet();
  else if (a === 'open') openHotel(el.dataset.id);
  else if (a === 'add') startEdit(blank());
  else if (a === 'edit') { const h = S.hotels.find(x => x.id === el.dataset.id); if (h) startEdit(h, !!el.dataset.stayed); }
  else if (a === 'view') { S.ui.view = el.dataset.v; saveUi(); render(); }
  else if (a === 'f-status') { f.status = el.dataset.v; saveUi(); refreshAtlas(); }
  else if (a === 'f-grade') { const g = Number(el.dataset.v); f.grades = f.grades.includes(g) ? f.grades.filter(x => x !== g) : [...f.grades, g]; saveUi(); refreshAtlas(); }
  else if (a === 'f-has') { f[el.dataset.v] = !f[el.dataset.v]; saveUi(); refreshAtlas(); }
  else if (a === 'd-status' && d) { d.status = el.dataset.v; el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === el)); $('#sheet .stayform').hidden = d.status !== 'stayed'; }
  else if (a === 'd-has' && d) { d.has[el.dataset.v] = !d.has[el.dataset.v]; el.setAttribute('aria-pressed', !!d.has[el.dataset.v]); }
  else if (a === 'd-x' && d) { const k = el.dataset.k, n = Number(el.dataset.n); d.x[k] = Number(d.x[k]) === n ? 0 : n; el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.n) === d.x[k])); }
  else if (a === 'find' && d) findPin();
  else if (a === 'pick' && d) pick(Number(el.dataset.i));
  else if (a === 'save-hotel' && d) {
    if (!String(d.name || '').trim()) { toast(t('edit.needName')); return; }
    d.name = d.name.trim(); delete d.ex; for (const k of ['ref', 'paid', 'nights', 'drive']) d[k] = Math.max(0, Number(d[k]) || 0);
    d.lat = d.lat === '' || d.lat === null || !isFinite(Number(d.lat)) ? null : Number(d.lat); d.lon = d.lon === '' || d.lon === null || !isFinite(Number(d.lon)) ? null : Number(d.lon);
    d.gradeOv = Number(d.gradeOv) >= 1 ? Number(d.gradeOv) : null;
    const i = S.hotels.findIndex(x => x.id === d.id); if (i >= 0) S.hotels[i] = d; else S.hotels.push(d);
    save(); closeSheet(); render();
  }
  else if (a === 'del' && d) { if (el.dataset.sure) { S.hotels = S.hotels.filter(x => x.id !== d.id); save(); closeSheet(); render(); } else { el.dataset.sure = '1'; el.textContent = t('edit.delSure'); } }
  else if (a === 'bands') bandsSheet();
  else if (a === 'bands-reset') { S.names = [...DEFAULT_NAMES]; S.bands = [...DEFAULT_BANDS]; save(); closeSheet(); render(); }
  else if (a === 'home-find') { const q = S.home.name; if (!q) return; fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' + encodeURIComponent(q)).then(r => r.json()).then(j => { if (j && j[0]) { S.home.lat = Math.round(Number(j[0].lat) * 1e4) / 1e4; S.home.lon = Math.round(Number(j[0].lon) * 1e4) / 1e4; S.hotels.forEach(h => { h.drive = 0; }); save(); render(); toast(t('home.found')); } else toast(t('pin.notFound')); }).catch(() => toast(t('pin.offline'))); }
  else if (a === 'lang') { S.lang = el.dataset.l; setLang(S.lang); save(); render(); }
  else if (a === 'sync') { if (window.Cloud) window.Cloud.dialog(() => window.appSync && window.appSync()); }
  else if (a === 'ex-off') { S.hotels = S.hotels.filter(x => !x.ex); save(); render(); }
  else if (a === 'ex-on') { S.hotels.push(...examples()); save(); render(); }
  else if (a === 'reset') sheet(`<h2>${esc(t('reset.h'))}</h2><p class="note">${esc(t('reset.sub'))}</p><div class="row end"><button class="btn sm" data-act="close">${esc(t('common.cancel'))}</button><button class="btn sm danger" data-act="reset-yes">${esc(t('reset.yes'))}</button></div>`);
  else if (a === 'reset-yes') { const lg = S.lang; reset(); S.lang = lg; save(true); closeSheet(); render(); }
  else if (a === 'export') { const url = URL.createObjectURL(exportBackup()), x = document.createElement('a'); x.href = url; x.download = 'grand-tour-' + new Date().toISOString().slice(0, 10) + '.json'; x.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
  else if (a === 'reload') location.reload();
}

export function init() {
  document.addEventListener('click', ev => { const el = ev.target.closest('[data-act]'); if (el && !el.disabled) act(el); });
  document.addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('g[data-act]')) { ev.preventDefault(); act(ev.target); } });
  document.addEventListener('submit', ev => {
    const fm = ev.target.closest('[data-form=bands]'); if (!fm) return; ev.preventDefault();
    const b = cleanBands([1, 2, 3, 4].map(g => fm['b' + g].value)); if (!b) { toast(t('bands.bad')); return; }
    S.bands = b; S.names = [1, 2, 3, 4, 5].map(g => fm['n' + g].value.trim() || DEFAULT_NAMES[g - 1]); save(); closeSheet(); render();
  });
  const onField = (ev, done) => {
    const el = ev.target, d = ui.draft;
    if (el.dataset.d && d) { d[el.dataset.d] = el.value; if (el.dataset.d === 'lat' || el.dataset.d === 'lon') { d.drive = 0; const f = document.querySelector('[data-d=drive]'); if (f) f.value = ''; } }
    else if (el.dataset.f === 'drive' && done) { S.ui.f.drive = Number(el.value); saveUi(); refreshAtlas(); }
    else if (el.dataset.f === 'sort' && done) { S.ui.sort = el.value; saveUi(); refreshAtlas(); }
    else if (el.dataset.f === 'cur' && done) { S.cur = el.value; save(); render(); }
    else if (el.dataset.w && done) { S.weights[el.dataset.w] = Number(el.value); save(); }
    else if (el.dataset.home) { const k = el.dataset.home; S.home[k] = k === 'name' ? el.value : Number(el.value) || 0; if (k !== 'name') S.hotels.forEach(h => { h.drive = 0; }); save(); }
    else if (el.dataset.inbox !== undefined && done) { setInbox(el.value.trim()); render(); }
    else if (el.dataset.import !== undefined && done && el.files[0]) { el.files[0].text().then(tx => { importBackup(tx); setLang(S.lang); render(); toast(t('data.imported')); }).catch(() => toast(t('data.importFail'))); }
  };
  document.addEventListener('input', ev => onField(ev, false));
  document.addEventListener('change', ev => onField(ev, true));
  let rz = null, lastW = document.documentElement.clientWidth;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const w = document.documentElement.clientWidth; if (w !== lastW && !$('#sheet').open && (S.ui.tab === 'atlas' || S.ui.tab === 'carnet')) { lastW = w; render(); } }, 150); });
  $('#sheet').addEventListener('click', ev => { if (ev.target === $('#sheet')) closeSheet(); });
  $('#sheet').addEventListener('close', () => { ui.draft = null; ui.found = null; });
  render(); refreshSession();
}
