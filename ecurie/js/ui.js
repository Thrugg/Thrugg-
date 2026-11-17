/* Écurie — the interface: Analyse (search and report), Garage (saved cars, compare), My car, Profile. */
import * as E from './engine.js';
import { carSVG } from './art.js';
import { ring, valueChart, stack, tenBar, tone } from './charts.js';
import { S, save, saveUi, uid, blankQ, finances, readSafetyNet, readGrandTour, readSeuil, readLadder, exportBackup, importBackup, reset, setInbox } from './store.js';

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const eur = v => v == null || !isFinite(v) ? '–' : (v < 0 ? '−' : '') + '€' + Math.abs(Math.round(v)).toLocaleString('en-GB');
const kmf = v => Math.round(v).toLocaleString('en-GB') + ' km';
const n1 = v => (Math.round(v * 10) / 10).toLocaleString('en-GB');
const pct = v => Math.round(v * 100) + ' %';
const when = y => { if (y < 0.08) return 'now'; if (y < 0.96) { const m = Math.max(1, Math.round(y * 12)); return `in ${m} month${m === 1 ? '' : 's'}`; } const h = Math.round(y * 2) / 2; return `in ${n1(h)} year${h === 1 ? '' : 's'}`; };
const today = () => new Date().toISOString().slice(0, 10);
const CUR_YEAR = new Date().getFullYear();
const ICON = {
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  analyse: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  garage: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10l9-6 9 6v10H3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 20v-6h10v6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  mine: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15l2-5h12l2 5v4H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8" cy="16.5" r="1.3" fill="currentColor"/><circle cx="16" cy="16.5" r="1.3" fill="currentColor"/></svg>',
  profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
};
const TABS = [['analyse', 'Analyse'], ['garage', 'Garage'], ['mine', 'My car'], ['profile', 'Profile']];

let CARS = [], META = null;
export function setData(cars, meta) { CARS = cars || []; META = meta || null; }
const allCars = () => [...CARS, ...Object.values(S.lookups || {})];
const byId = id => (S.lookups || {})[id] || CARS.find(c => c.id === id) || null;
const nameOf = c => `${c.make} ${c.model}`;
const fullName = c => `${c.make} ${c.model}${c.gen && c.gen !== '—' ? ` (${c.gen})` : ''}`;
const num = v => v === '' || v == null || !isFinite(Number(v)) ? null : Number(v);
/* the typed car as the engine reads it */
const qOf = q => ({ year: num(q.year), km: Math.max(0, num(q.km) || 0), ps: num(q.ps), price: num(q.price), options: q.options || [] });
const carIn = q => ({ name: q.name, year: num(q.year), ps: num(q.ps), km: num(q.km), options: (q.options || []).map(id => E.OPT[id] ? E.OPT[id].label : id), extras: q.extras || '' });
const keyOf = q => `${q.carId}|${num(q.year)}|${num(q.km)}|${num(q.price) || 0}`;
const entryOf = q => S.garage.find(g => keyOf(g.q) === keyOf(q)) || null;
const liveKey = q => `${q.carId}|${num(q.year)}|${Math.round((num(q.km) || 0) / 10000)}`;
const liveOf = q => { const l = (S.live || {})[liveKey(q)]; return l && (Date.now() - new Date(l.at).getTime()) < 30 * 864e5 ? l : null; };

const ui = { session: null, busy: false, busyMsg: '', err: '', note: '', choice: null, ticks: {}, delSure: null, sugg: [], suggOn: -1, finEdit: false };
export async function refreshSession() {
  if (!window.Cloud || !window.Cloud.configured()) return;
  try { const s = await window.Cloud.session(); const e = s ? s.user.email : null; if (e !== ui.session) { ui.session = e; if (S.ui.tab === 'profile') render(); } } catch (e) { }
}

/* ---------- shell ---------- */
export function render() {
  const tab = TABS.some(t => t[0] === S.ui.tab) ? S.ui.tab : 'analyse';
  $('#tabs').innerHTML = TABS.map(([k, l]) => `<button data-act="tab" data-tab="${k}" ${k === tab ? 'aria-current="page"' : ''}>${ICON[k]}<span>${l}</span>${k === 'garage' && S.garage.length ? `<em>${S.garage.length}</em>` : ''}</button>`).join('');
  $('#main').innerHTML = tab === 'analyse' ? viewAnalyse() : tab === 'garage' ? viewGarage() : tab === 'mine' ? viewMine() : viewProfile();
}
export function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3200); }
function sheet(html) { const d = $('#sheet'); d.innerHTML = `<div class="sheet-in">${html}</div>`; if (!d.open) d.showModal(); }
const closeSheet = () => { const d = $('#sheet'); if (d.open) d.close(); };

/* ---------- Analyse ---------- */
const field = (k, label, v, o = {}) => `<div class="field"><label for="q-${k}">${label}</label><span class="box"><input id="q-${k}" data-q="${k}" type="number" inputmode="${o.dec ? 'decimal' : 'numeric'}" min="${o.min ?? 0}" ${o.max ? `max="${o.max}"` : ''} step="${o.step || 1}" value="${v ?? ''}" placeholder="${esc(o.ph || '')}">${o.unit ? `<i>${o.unit}</i>` : ''}</span></div>`;
const chip = (o, on) => `<button type="button" class="chip" data-act="opt" data-id="${o.id}" aria-pressed="${on}">${esc(o.label)}</button>`;
function viewAnalyse() {
  const q = S.q, on = new Set(q.options);
  return `<section class="card search">
<div class="shead"><div><div class="kicker">Analyse a car</div><h1>Which car?</h1></div>${q.name || q.km != null || q.options.length ? '<button class="link" data-act="newq">New search</button>' : ''}</div>
<div class="field wide sbox"><label for="q-name">Make and model</label><input id="q-name" data-q="name" type="text" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="e.g. BMW M550i xDrive, Golf GTI, 911 Carrera S" value="${esc(q.name)}" role="combobox" aria-expanded="false" aria-controls="sugg"><div id="sugg" class="sugg" role="listbox" hidden></div></div>
<div class="g4">${field('year', 'Model year', q.year, { min: 1990, max: CUR_YEAR + 1, ph: String(CUR_YEAR - 4) })}${field('ps', 'Power', q.ps, { unit: 'PS', ph: 'e.g. 300' })}${field('km', 'Mileage', q.km, { unit: 'km', step: 1000, ph: 'e.g. 60000' })}${field('price', 'Asking price', q.price, { unit: '€', step: 500, ph: 'optional' })}</div>
<details class="opts" ${q.options.length || q.extras ? 'open' : ''}><summary>Options and condition <span>${q.options.length ? `${q.options.length} chosen` : 'optional'}</span></summary>
<div class="chips">${E.OPTIONS.filter(o => !o.cond).map(o => chip(o, on.has(o.id))).join('')}</div>
<div class="sublbl">Condition</div><div class="chips">${E.OPTIONS.filter(o => o.cond).map(o => chip(o, on.has(o.id))).join('')}</div>
<div class="field wide"><label for="q-extras">Other equipment</label><input id="q-extras" data-q="extras" type="text" maxlength="300" value="${esc(q.extras)}" placeholder="e.g. Bowers &amp; Wilkins, soft-close doors"></div></details>
<div class="row"><button class="btn pri" data-act="analyse">Analyse</button><button class="btn" data-act="ad">${ICON.camera}<span>Read an ad screenshot</span></button></div>
<div id="status" class="status" aria-live="polite">${statusHtml()}</div>
</section>
<div id="report" class="report">${reportHtml()}</div>`;
}
function statusHtml() {
  if (ui.busy) return `<div class="busy"><span class="spin" aria-hidden="true"></span><span>${esc(ui.busyMsg)}</span></div>`;
  if (ui.err) return `<p class="err">${esc(ui.err)}</p>`;
  if (ui.choice) {
    const ms = ui.choice, q = S.q;
    const why = !ms.length ? 'Nothing in Écurie’s checked list matches that name.' : ms[0].words < 0.99 ? 'Écurie’s checked list has no car with exactly that name.' : 'The closest cars in the checked list differ in year or power.';
    return `<div class="choice"><p><b>Not an exact match.</b> ${esc(why)}</p>
${ms.length ? `<div class="alts">${ms.slice(0, 4).map(m => `<button class="alt" data-act="use" data-id="${esc(m.car.id)}"><span>${esc(fullName(m.car))}</span><small>${m.car.years[0]}–${m.car.onSale ? 'today' : m.car.years[1]} · ${m.car.ps} PS${!m.yearOk ? ' · other years' : ''}${!m.psOk && num(q.ps) ? ' · other power' : ''}</small></button>`).join('')}</div>` : ''}
<div class="row"><button class="btn pri" data-act="research">Research it now in Claude</button><button class="btn" data-act="weekly">Add to the weekly list</button></div>
<p class="note"><b>Now:</b> Écurie writes the question, you paste it into your Claude app and paste the answer back (about a minute, on your Claude plan). The result is kept and synced. <b>Weekly list:</b> it joins the checked list for everyone after the next Wednesday update.</p></div>`;
  }
  if (ui.note) return `<p class="note ok">${esc(ui.note)}</p>`;
  return '';
}
const renderStatus = () => { const el = $('#status'); if (el) el.innerHTML = statusHtml(); };
const renderReport = () => { const el = $('#report'); if (el) el.innerHTML = reportHtml(); };

/* suggestions under the name field, from the checked list and earlier research */
function suggest(text) {
  const box = $('#sugg'), inp = $('#q-name'); if (!box) return;
  const ms = text.trim().length >= 2 ? E.match(allCars(), { name: text }).filter(m => m.words >= 0.5).slice(0, 6) : [];
  ui.sugg = ms; ui.suggOn = -1;
  box.hidden = !ms.length; inp.setAttribute('aria-expanded', String(!!ms.length));
  box.innerHTML = ms.map((m, i) => `<button type="button" role="option" data-act="sugg" data-i="${i}">${carSVG(m.car, { shadow: false })}<span><b>${esc(nameOf(m.car))}</b><small>${esc(m.car.gen && m.car.gen !== '—' ? m.car.gen + ' · ' : '')}${m.car.years[0]}–${m.car.onSale ? 'today' : m.car.years[1]} · ${m.car.ps} PS${m.car.status === 'researched' ? ' · researched' : ''}</small></span></button>`).join('');
}
function pickSugg(i) {
  const m = ui.sugg[i]; if (!m) return;
  const c = m.car, q = S.q;
  /* the name and, when empty, a year this variant was built; the power stays as typed so a later year can match a sibling */
  q.name = nameOf(c);
  if (!num(q.year)) q.year = c.onSale ? Math.min(CUR_YEAR, c.years[1]) : c.years[1];
  q.carId = null; ui.sugg = []; save(); render();
  const k = $('#q-km'); if (k && !num(q.km)) k.focus();
}

function fail(msg) { ui.err = msg; ui.choice = null; renderStatus(); }
function analyse() {
  const q = S.q; ui.err = ''; ui.note = ''; ui.choice = null;
  if (!q.name.trim()) return fail('Type the make and model.');
  if (!(num(q.year) >= 1990 && num(q.year) <= CUR_YEAR + 1)) return fail('Add the model year.');
  if (num(q.km) == null) return fail('Add the mileage (0 for a new car).');
  const ms = E.match(allCars(), { name: q.name, year: num(q.year), ps: num(q.ps) });
  if (ms.length && E.sure(ms[0])) return use(ms[0].car.id);
  ui.choice = ms.filter(m => m.words >= 0.5); renderStatus();
}
function use(id) {
  S.q.carId = id; ui.choice = null; ui.err = ''; ui.ticks = {};
  const c = byId(id);
  ui.note = c && num(S.q.ps) && Math.abs(num(S.q.ps) - c.ps) / c.ps > 0.08 ? `Analysed as the ${c.ps} PS version, the closest in the list. Research the exact car with Claude for a ${num(S.q.ps)} PS record.` : '';
  save(); render();
  requestAnimationFrame(() => { const r = $('#report'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
}
async function research() {
  if (!window.Ask) return fail('Asking Claude is not available here.');
  ui.busy = true; ui.err = ''; ui.choice = null; ui.busyMsg = `Waiting for Claude’s answer about the ${S.q.name} (${S.q.year})…`; renderStatus();
  try {
    const j = await window.Ask.run('car_lookup', { car: carIn(S.q) }, { title: `Research the ${S.q.name} (${S.q.year})` });
    if (!j || !j.found) ui.err = `Claude found no such car${j && j.note ? ': ' + j.note : '.'}`;
    else {
      const c = E.fromLookup(j, qOf(S.q)); if (!E.validCar(c)) throw new Error('Claude’s answer could not be used. Try again.');
      S.lookups[c.id] = c; S.q.carId = c.id; ui.note = c.note || ''; save();
    }
  } catch (e) { if (e.code !== 'cancelled') ui.err = e.message || 'Claude’s answer could not be used.'; }
  ui.busy = false; render();
}
/* the weekly list: one line for data/requests.md, which a weekly task researches into the checked list */
const REQUESTS_EDIT = 'https://github.com/Thrugg/Thrugg-/edit/main/ecurie/data/requests.md';
function weeklySheet() {
  const q = S.q, line = `- [ ] ${q.name.trim()}${num(q.year) ? `, ${num(q.year)}` : ''}${num(q.ps) ? `, ${num(q.ps)} PS` : ''} (asked on ${today()})`;
  sheet(`<div class="sheet-head"><h2>Add to the weekly list</h2><button class="x" data-act="close" aria-label="Close">×</button></div>
<p>Every Wednesday evening, the cars on this list are researched and added to Écurie’s checked list, on all your devices.</p>
<pre class="reqline">${esc(line)}</pre>
<ol class="steps"><li>Copy the line.</li><li>Open the list on GitHub (signed in) and paste it under <b>Waiting</b>.</li><li>Press <b>Commit changes</b>.</li></ol>
<div class="row"><button class="btn" data-act="reqcopy">Copy the line</button><a class="btn pri" data-act="reqopen" href="${REQUESTS_EDIT}" target="_blank" rel="noopener">Open the list</a></div>`);
  ui.reqLine = line;
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); toast('Copied. Paste it under “Waiting”.'); } catch (e) { toast('Select the line and copy it.'); } }
/* an advert: the screenshot is attached in Claude, the answer fills the form */
async function readAd() {
  if (!window.Ask) return fail('Asking Claude is not available here.');
  ui.busy = true; ui.err = ''; ui.note = ''; ui.choice = null; ui.busyMsg = 'Waiting for Claude to read the ad…'; renderStatus();
  try {
    const r = await window.Ask.run('car_ad_read', {}, { title: 'Read an ad screenshot' });
    if (!r || !r.readable) ui.err = 'Claude could not find a car advert in that picture. Try a sharper screenshot that shows the title, the price and the key facts.';
    else {
      const q = S.q, y = r.year || (r.first_reg ? Number(String(r.first_reg).slice(0, 4)) : null);
      Object.assign(q, { name: r.name || q.name, year: y || q.year, ps: r.ps || q.ps, km: r.km ?? q.km, price: r.price || q.price, options: [...new Set([...(q.options || []), ...(r.option_ids || [])])].filter(id => E.OPT[id]), extras: (r.extras || []).join(', ').slice(0, 300) || q.extras, carId: null });
      ui.note = `Filled in from the ad${r.seller && r.seller !== 'unknown' ? ` (${r.seller} seller${r.location ? ', ' + r.location : ''})` : ''}. Check the fields, then Analyse.${r.accident_free === false ? ' The ad mentions accident damage.' : ''}`;
      save();
    }
  } catch (e) { if (e.code !== 'cancelled') ui.err = e.message || 'Claude’s answer could not be used.'; }
  ui.busy = false; render();
}
async function checkLive() {
  const q = S.q, c = byId(q.carId); if (!c || !window.Ask) return;
  try {
    const r = await window.Ask.run('car_market', { car: carIn(q), variant: `${fullName(c)}, ${c.ps} PS` }, { title: 'Check live ads' });
    S.live = S.live || {}; S.live[liveKey(q)] = { ...r, at: today() }; save(); renderReport();
  } catch (e) { if (e.code !== 'cancelled') toast(e.message || 'Claude’s answer could not be used.'); }
}

/* ---------- the report ---------- */
function compute(c, q) {
  const fin = finances(), now = E.nowYear(), live = liveOf(S.q);
  const sc = E.scores(c, q, S.prof, META, fin, now), pc = E.priceCheck(c, q, now, live);
  return { fin, now, live, sc, pc, m: sc.m, cv: sc.m.curve, due: sc.m.due, fit: E.fit(c, q, S.prof), check: E.checklist(c, q) };
}
const pill = (t, txt) => `<span class="pill ${t}">${esc(txt)}</span>`;
const sourceTag = c => c.status === 'researched' ? `<span class="tag ai">Researched by Claude ${esc(c.checked || '')}</span>` : `<span class="tag ok">Checked list${c.checked ? ' · ' + esc(c.checked) : ''}</span>`;
function reportHtml() {
  const q0 = S.q;
  if (!q0.carId) return `<section class="card empty">${carSVG({ art: 'coupe', color: '#8a96a3', ps: 400, cls: 'sports', body: 'coupe' }, { shadow: false })}<p><b>Type a car, its year and its mileage, then Analyse.</b></p><p class="note">${CARS.length} cars are in the checked list, carried over from Prüfstand. Anything else, your Claude app researches once and Écurie keeps. A screenshot of a mobile.de or AutoScout24 ad, read in Claude, fills the form for you.</p></section>`;
  const c = byId(q0.carId);
  if (!c) return `<section class="card"><p>This car’s record is missing on this device. Analyse it again.</p></section>`;
  const q = qOf(q0), x = compute(c, q), s = x.sc, d = s.detail, g = entryOf(q0);
  return [hero(c, q, x, g), cover(c, q, x), priceCard(c, q, x), valueCard(c, q, x), costCard(c, q, x), dueCard(c, q, x), fitCard(c, q, x), tripsCard(c, q, x), checkCard(c, q, x, g), specCard(c, q, x)].join('');
}
const reasonOf = {
  burden: x => { const b = x.sc.detail.burden; return !b ? 'Needs your figures: open Safety Net Score or fill in Profile.' : b.verdict === 'covered' ? `Fully covered: ${eur(b.cashM)} a month is ${pct(b.share)} of what is left after essentials.` : b.verdict === 'stretch' ? `Covered, but it stretches: ${eur(b.cashM)} a month, ${pct(b.share)} of what is left after essentials.` : `Not covered: ${eur(b.cashM)} a month against ${eur(b.room)} left after essentials.`; },
  awe: (x, c) => c.wowNote || `${c.wow} out of 10 for public reaction.`,
  fun: (x, c) => { const f = x.sc.detail.fun; return `${n1(f.ratio)} kg per PS · ${c.drive}${c.gearbox ? ' · ' + c.gearbox : ''}`; },
  rel: (x, c) => { const r = x.sc.detail.rel; return `${r.base} of 5 on TÜV and ADAC records${r.kmPen ? `, −${r.kmPen} for the mileage` : ''}${r.agePen ? `, −${r.agePen} for the age` : ''}.`; }
};
function hero(c, q, x, g) {
  const s = x.sc, saved = !!g, mine = S.mine && g && S.mine.gid === g.id;
  const bars = E.SCORE_KEYS.map(k => `<div class="sbar t-${tone(s[k])}"><div class="sh"><span>${E.SCORE_LABEL[k]}</span><b>${s[k] ?? '–'}</b></div><div class="st"><span style="width:${s[k] ?? 0}%"></span></div><p>${esc(reasonOf[k](x, c))}</p></div>`).join('');
  return `<section class="card hero">
<div class="sign"><div class="sign-make">${esc(c.make)}</div><div class="sign-model">${esc(c.model)}</div><div class="sign-sub">${esc([c.variant, c.gen !== '—' ? c.gen : '', `${c.ps} PS`].filter(Boolean).join(' · '))}</div>
<div class="plate" aria-label="Model year and mileage"><span class="eu">D</span><span>${q.year} · ${Math.round(q.km / 1000)}k km</span></div></div>
<div class="road">${carSVG(c)}</div>
<div class="hero-body">
<div class="overall">${ring(s.overall, 84, 'Écurie score')}<div><div class="kicker">Écurie score</div><p class="big">${s.overall == null ? '–' : s.overall >= 75 ? 'A strong choice for you' : s.overall >= 60 ? 'A good fit, with trade-offs' : s.overall >= 45 ? 'Mixed: read the details' : 'A hard case for you'}</p><p class="note">Your four scores, weighted as set in Profile. ${sourceTag(c)}</p></div></div>
<div class="sbars">${bars}</div>
<div class="row"><button class="btn ${saved ? '' : 'pri'}" data-act="save" ${saved ? 'disabled' : ''}>${saved ? 'In your Garage ✓' : 'Save to Garage'}</button><button class="btn" data-act="mine">${mine ? 'This is your car ✓' : 'This is my car'}</button></div>
${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}
</div></section>`;
}
function cover(c, q, x) {
  const b = x.sc.detail.burden, m = x.m, sn = readSafetyNet(), src = x.fin && x.fin.src === 'sn' ? `From Safety Net Score (${x.fin.country} profile).` : 'From the figures in your Profile.';
  const use = `<div class="use"><label>Your km a year <span class="box"><input type="number" inputmode="numeric" step="1000" min="1000" data-p="km" value="${S.prof.km}"><i>km</i></span></label><label>You keep it <span class="box"><input type="number" inputmode="numeric" step="1" min="1" max="15" data-p="hold" value="${S.prof.hold}"><i>years</i></span></label><div class="seg" role="group" aria-label="How you pay"><button data-act="mode" data-m="loan" aria-pressed="${m.mode === 'loan'}">Loan</button><button data-act="mode" data-m="cash" aria-pressed="${m.mode === 'cash'}">Cash</button></div></div>`;
  if (!b) return `<section class="card" id="cover"><div class="kicker">Is it covered?</div><h2>Connect your finances</h2>${use}<p>Open <a href="../safety-net/">Safety Net Score</a> and enter your figures: Écurie reads them on this device and judges every car against them. Or type them in <button class="link" data-act="tab" data-tab="profile">Profile</button>.</p></section>`;
  const head = { covered: ['good', 'Fully covered'], stretch: ['warn', 'Covered, but it stretches'], not: ['bad', 'Not covered'] }[b.verdict];
  const lv = b.levels ? `<li>${m.mode === 'cash' ? 'Paying' : 'The down payment of'} ${eur(b.cashOut)} takes your savings from ${eur(b.savings)} to ${eur(b.savingsAfter)}: ${b.afterLv === b.before ? `your safety net stays at <b>${esc(b.afterName)}</b>` : `your safety net goes from <b>${esc(b.beforeName)}</b> to <b>${esc(b.afterName)}</b>`}.</li>` : `<li>${m.mode === 'cash' ? 'Paying' : 'The down payment of'} ${eur(b.cashOut)} takes your savings from ${eur(b.savings)} to ${eur(b.savingsAfter)}.${sn ? '' : ' Open Safety Net Score once to see what that does to your safety-net level.'}</li>`;
  const se = readSeuil(), hd = se ? E.homeDelay(m, x.fin, se.down) : null;
  const lad = readLadder(), target = E.ladderTarget(m), onLadder = S.ladder && S.ladder.target === target && S.ladder.name === nameOf(c);
  return `<section class="card" id="cover"><div class="kicker">Is it covered?</div>
<div class="verdict ${head[0]}"><span class="lamp"></span><b>${head[1]}</b></div>${use}
<ul class="facts">
<li><b>${eur(b.cashM)}</b> a month leaves your account${m.mode === 'loan' ? ` (loan ${eur(m.instalment)}, running costs ${eur(m.runM + m.extraM)})` : ' in running costs'}: ${pct(b.share)} of the ${eur(b.room)} left after essentials.</li>
<li>After the car, ${eur(b.after)} a month is left. ${b.plan > 0 ? (b.cut > 0 ? `Your savings plan of ${eur(b.plan)} a month loses <b>${eur(b.cut)}</b> a month.` : `Your savings plan of ${eur(b.plan)} a month stays whole.`) : ''}</li>
${lv}
${hd ? `<li>${hd.never ? `Your ${esc(se.name)} home deposit (Seuil) would no longer grow: the car takes the whole savings plan.` : hd.months > 0 ? `Your ${esc(se.name)} home deposit (Seuil) arrives about <b>${hd.months} month${hd.months === 1 ? '' : 's'} later</b>.` : `Your ${esc(se.name)} home deposit (Seuil) is not delayed.`}</li>` : ''}
</ul>
<p class="note">${esc(src)} <a href="../safety-net/">Open Safety Net Score</a></p>
<div class="row"><button class="btn sm" data-act="ladder" ${onLadder ? 'disabled' : ''}>${onLadder ? `On the Funds Ladder ✓ (${eur(target)})` : `Put the ${eur(target)} ${m.mode === 'cash' ? 'price' : 'down payment'} on the Funds Ladder`}</button></div>
${onLadder && lad && !lad.linked ? `<p class="note">In <a href="../ladder/">The Funds Ladder</a>, ${lad.hasCar ? 'open the “Supercar days” step' : 'add a target of the kind “Supercar days”'} and tick “Take the target from Écurie”: it then carries this car’s name and amount.</p>` : ''}
</section>`;
}
function priceCard(c, q, x) {
  const p = x.pc, live = x.live, cv = x.cv;
  const src = { live: `Live ads, ${live && live.at}`, market: 'Market prices in the checked list', researched: 'Claude’s research', model: 'Depreciation model (no market price for this year yet)' }[p.source];
  const v = p.asking ? { low: ['good', 'Below the fair range: ask why'], good: ['good', 'A good price'], fair: ['ok', 'A fair price'], high: ['warn', 'On the high side'], over: ['bad', 'Overpriced'] }[p.verdict] : null;
  const sweet = cv.collector ? 'This model behaves like a collector’s car: values hold or rise, so there is no buying sweet spot.' : cv.sweet ? (cv.inSweet ? `At ${n1(cv.age0)} years old it is in the buying sweet spot (${cv.sweet.from} to ${cv.sweet.to} years), when the yearly loss has slowed.` : cv.age0 < cv.sweet.from ? `At ${n1(cv.age0)} years old it is still in its steepest years; the sweet spot starts at about ${cv.sweet.from} years.` : `At ${n1(cv.age0)} years old it is past the sweet spot: losses are small now, repairs weigh more.`) : '';
  return `<section class="card"><div class="kicker">The price</div><h2>Fair price for this car</h2>
<div class="price-row"><div><div class="bignum">${eur(p.fair)}</div><p class="note">range ${eur(p.lo)} to ${eur(p.hi)} · ${q.year} · ${kmf(q.km)}${q.options.length ? ` · ${q.options.length} option${q.options.length === 1 ? '' : 's'}` : ''}</p></div>
${p.asking ? `<div class="ask">${pill(v[0], v[1])}<p>Asking ${eur(p.asking)}: ${pct(Math.abs(p.ratio - 1))} ${p.ratio >= 1 ? 'above' : 'below'} fair.</p></div>` : ''}</div>
${p.asking ? `<div class="nego"><div><span>Open at</span><b>${eur(p.open)}</b></div><div><span>Aim for</span><b>${eur(p.aim)}</b></div><div><span>Walk away above</span><b>${eur(p.walk)}</b></div></div>` : '<p class="note">Add the asking price above to see whether it is fair and what to offer.</p>'}
<p class="note">Based on: ${esc(src)}.</p>
${live ? liveHtml(live) : `<div class="row"><button class="btn sm" data-act="live">Check live ads with Claude</button></div><p class="note">Claude looks up comparable listings on mobile.de and AutoScout24 in your Claude app. The result counts for 30 days.</p>`}
${sweet ? `<p class="callout">${esc(sweet)}</p>` : ''}</section>`;
}
function liveHtml(l) {
  const rows = (l.listings || []).slice(0, 5).map(r => `<li><a href="${esc(/^https?:\/\//.test(r.url) ? r.url : '#')}" target="_blank" rel="noopener">${esc(r.title)}</a><span>${r.year || ''} · ${r.km ? kmf(r.km) : '–'} · <b>${eur(r.price)}</b></span></li>`).join('');
  return `<div class="live"><p><b>Live ads (${esc(l.at)}):</b> median ${eur(l.median)}, most between ${eur(l.lo)} and ${eur(l.hi)}, from ${l.n || 'a few'} listings${l.km_from ? ` with ${kmf(l.km_from)} to ${kmf(l.km_to)}` : ''}. ${esc(l.note || '')}</p>${rows ? `<ul class="listings">${rows}</ul>` : ''}<button class="link" data-act="live">Check again</button></div>`;
}
function valueCard(c, q, x) {
  const cv = x.cv;
  const steps = cv.steps.map(s => `<li>Sell before <b>${kmf(s.km)}</b> (${when(s.years)}) and keep about <b>${eur(s.amount)}</b>: buyers pay noticeably less past it.</li>`).join('');
  return `<section class="card"><div class="kicker">Value</div><h2>What it will be worth</h2>
${valueChart(cv, q.year, { label: `Value of this ${nameOf(c)} from new, at your mileage from today` })}
<ul class="facts"><li>Over your ${cv.hold} years and ${kmf(cv.kmEnd - q.km)}: worth about <b>${eur(cv.vEnd)}</b> at the end, a loss of <b>${eur(cv.loss)}</b> (${pct(cv.lossPct)}), ${eur(cv.perYear)} a year.</li>${steps}</ul>
<p class="note">Before today the curve assumes its mileage built up evenly; after today it adds your ${kmf(S.prof.km)} a year.</p></section>`;
}
function costCard(c, q, x) {
  const m = x.m, r = m.run;
  const legend = m.parts.map((p, i) => `<li><i class="c${i}"></i>${esc(p[0])}<b>${eur(p[1])}</b></li>`).join('');
  const en = r.en, unit = en.normal.unit, cons = `${n1(en.normal.amt)} ${unit} normal · ${n1(en.dynamic.amt)} spirited · ${n1(en.fast.amt)} at 200 km/h`;
  return `<section class="card"><div class="kicker">Costs</div><h2>What it costs a month</h2>
<div class="price-row"><div><div class="bignum">${eur(m.econM)}</div><p class="note">real cost a month, loss in value included</p></div><div><div class="bignum sm">${eur(m.cashM)}</div><p class="note">leaves your account a month</p></div></div>
${stack(m.parts)}<ul class="legend">${legend}</ul>
<p class="note">${esc(cons)} per 100 km · ${esc(E.SF[S.prof.sf].label)} · Kfz-Steuer ${eur(r.tax)} a year${m.mode === 'loan' ? ` · loan: ${eur(m.down)} down, ${eur(m.instalment)} a month for ${m.term} months at ${n1(m.apr)} %, interest ${eur(m.interestTotal)}` : ''}.</p></section>`;
}
function dueCard(c, q, x) {
  const d = x.due;
  const rows = d.items.map(i => `<li class="${i.extra ? 'extra' : ''}"><span class="w">${esc(when(i.in))}<small>${kmf(i.km)}</small></span><span class="i">${esc(i.item)}${i.extra ? ' <em>on top: from an option</em>' : i.specific ? ' <em>for this model</em>' : ''}</span><b>${eur(i.cost)}</b></li>`).join('');
  return `<section class="card"><div class="kicker">While you own it</div><h2>What falls due</h2>
${rows ? `<ul class="due">${rows}</ul>` : '<p>Nothing big falls due in your years with it.</p>'}
<p class="note">From ${kmf(d.km0)} to ${kmf(d.km1)} over ${d.hold} years. Regular items are part of the yearly upkeep in the costs above; the ones marked “on top” come in addition.${c.bigTicket ? ' ' + esc(c.bigTicket) : ''}</p></section>`;
}
function fitCard(c, q, x) {
  const f = x.fit.f;
  const bars = E.FIT_KEYS.map(k => tenBar(E.FIT_LABEL[k], f[k], k === 'family' && S.prof.family)).join('') + tenBar('Dog in the boot', f.dog, S.prof.dog);
  const li = (arr, cls, sym) => (arr || []).map(([t, s]) => `<li class="${cls}"><span class="sym">${sym}</span><span>${t ? `<i>${esc(E.FIT_LABEL[t] || t)}</i>` : ''}${esc(s)}</span></li>`).join('');
  return `<section class="card"><div class="kicker">Your life with it</div><h2>Where it shines</h2><div class="tbars">${bars}</div>
<p class="note">Your driving mix scores it ${n1(x.fit.drive)} of 10.</p>
<div class="pc"><ul>${li(c.pos, 'plus', '+')}</ul><ul>${li(c.neg, 'minus', '−')}</ul></div></section>`;
}
function tripsCard(c, q, x) {
  const gt = readGrandTour(); if (!gt) return '';
  const trips = E.roadTrips(c, S.prof, META, gt.home, gt.hotels);
  if (!trips.length) return '';
  return `<section class="card"><div class="kicker">Road trips</div><h2>To your Grand Tour wish list</h2>
<ul class="trips">${trips.map(t => `<li><span><b>${esc(t.name)}</b><small>${esc(t.place || '')} · ${kmf(t.km)} each way${t.stops ? ` · ${t.stops} charging stop${t.stops > 1 ? 's' : ''} each way` : ''}</small></span><b>${eur(t.cost)}</b></li>`).join('')}</ul>
<p class="note">${c.fuel === 'ev' ? 'Charging' : 'Fuel'} there and back from ${esc(gt.home.name || 'home')}, mostly Autobahn. <a href="../grand-tour/">Open Grand Tour</a></p></section>`;
}
function checkCard(c, q, x, g) {
  const ticks = g ? (g.checks || {}) : ui.ticks, done = x.check.filter(i => ticks[i.id]).length;
  return `<section class="card"><div class="kicker">Test drive</div><h2>What to check <span class="muted">${done} of ${x.check.length}</span></h2>
<ul class="checks">${x.check.map(i => `<li><label><input type="checkbox" data-act="tick" data-id="${esc(i.id)}" ${ticks[i.id] ? 'checked' : ''}><span>${esc(i.text)}${i.from === 'model' ? ' <em>this model</em>' : ''}</span></label></li>`).join('')}</ul>
${g ? '' : '<p class="note">Save the car to your Garage to keep your ticks.</p>'}</section>`;
}
function specCard(c, q, x) {
  const en = x.m.run.en, a2 = c.a200 && c.a200.v ? `${n1(c.a200.v)} s${c.a200.kind === 'measured' ? '' : ' (est.)'}` : '–';
  const rows = [['Engine', c.engine], ['Power', `${c.ps} PS · ${c.nm} Nm`], ['Gearbox', c.gearbox], ['Drive', c.drive], ['Weight', `${c.kg} kg · ${n1(c.kg / c.ps)} kg/PS`], ['0–100 km/h', c.acc && c.acc.claim ? `${n1(c.acc.claim)} s` : '–'], ['100–200 km/h', a2], ['Top speed', c.vmax ? `${c.vmax.v} km/h${c.vmax.limited ? ' (limited)' : ''}` : '–'], [c.fuel === 'ev' ? 'Consumption' : 'Fuel', `${n1(en.normal.amt)} ${en.normal.unit}/100 km normal`], ['Boot · seats', `${c.trunk} L · ${c.seats}`], ['CO₂ · tax', `${c.co2 || 0} g/km · ${eur(x.m.run.tax)} a year`], ['Class', E.CLASS_LABEL[c.cls]], ['Parts supply', `${c.parts} of 5${c.partsNote ? ' · ' + c.partsNote : ''}`]];
  const src = c.status === 'researched' ? (c.src || []).map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('') : (c.src || []).map(s => `<li>${esc(s)}</li>`).join('');
  return `<section class="card"><div class="kicker">Specifications</div><h2>${esc(fullName(c))}</h2><dl class="specs">${rows.filter(r => r[1]).map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl>
${src ? `<details class="srcs"><summary>Sources</summary><ul>${src}</ul></details>` : ''}
${c.status === 'researched' ? '<p class="note">Researched by Claude from web sources; figures are estimates where no source gave them. <button class="link" data-act="reresearch">Research again</button></p>' : ''}</section>`;
}

/* ---------- Garage ---------- */
function rowScores(g) {
  const c = byId(g.q.carId); if (!c) return null;
  const q = qOf(g.q), fin = finances(), now = E.nowYear();
  const sc = E.scores(c, q, S.prof, META, fin, now), pc = E.priceCheck(c, q, now, (S.live || {})[liveKey(g.q)] || null);
  return { c, q, sc, pc };
}
function viewGarage() {
  if (!S.garage.length) return `<section class="card empty"><div class="kicker">Garage</div><h1>No cars saved yet</h1><p>Analyse a car and tap “Save to Garage”. Saved cars keep your test-drive ticks and can be compared side by side.</p><div class="row"><button class="btn pri" data-act="tab" data-tab="analyse">Analyse a car</button></div></section>`;
  const sel = new Set(S.ui.cmp || []);
  const cards = S.garage.map(g => {
    const r = rowScores(g); if (!r) return '';
    const { c, q, sc, pc } = r, b = sc.detail.burden, isMine = S.mine && S.mine.gid === g.id;
    return `<article class="gcard"><button class="gopen" data-act="open" data-id="${g.id}" aria-label="Open ${esc(fullName(c))}">${carSVG(c, { shadow: false })}</button>
<div class="gmain"><h3>${esc(nameOf(c))}${isMine ? ' <span class="badge">My car</span>' : ''}</h3><p class="note">${q.year} · ${kmf(q.km)} · ${q.price ? eur(q.price) : 'fair ' + eur(pc.fair)}</p>
<div class="mini">${E.SCORE_KEYS.map(k => `<span class="t-${tone(sc[k])}" title="${E.SCORE_LABEL[k]}"><i style="height:${sc[k] ?? 0}%"></i><b>${sc[k] ?? '–'}</b></span>`).join('')}</div>
<p class="note">${eur(sc.m.econM)} a month${b ? ` · <span class="dotv ${b.verdict}"></span>${b.verdict === 'covered' ? 'covered' : b.verdict === 'stretch' ? 'stretches' : 'not covered'}` : ''}</p></div>
<div class="gside">${ring(sc.overall, 54, 'Écurie score')}<label class="cmpk"><input type="checkbox" data-act="cmp" data-id="${g.id}" ${sel.has(g.id) ? 'checked' : ''}> Compare</label><button class="link danger" data-act="gdel" data-id="${g.id}">${ui.delSure === g.id ? 'Tap again' : 'Remove'}</button></div></article>`;
  }).join('');
  const k = [...sel].filter(id => S.garage.some(g => g.id === id)).length;
  return `<section class="ghead"><div><div class="kicker">Garage</div><h1>${S.garage.length} car${S.garage.length === 1 ? '' : 's'}</h1></div><button class="btn ${k >= 2 ? 'pri' : ''}" data-act="compare" ${k >= 2 ? '' : 'disabled'}>Compare ${k >= 2 ? k : ''}</button></section>
<p class="note">Tick two to four cars to compare them.</p><div class="glist">${cards}</div>`;
}
function compareSheet() {
  const ids = (S.ui.cmp || []).filter(id => S.garage.some(g => g.id === id)).slice(0, 4);
  const R = ids.map(id => { const g = S.garage.find(x => x.id === id); return { g, ...rowScores(g) }; }).filter(r => r.c);
  const rows = [
    ['Écurie score', r => r.sc.overall, 'hi'], ...E.SCORE_KEYS.map(k => [E.SCORE_LABEL[k], r => r.sc[k], 'hi']),
    ['Fair price', r => r.pc.fair, 'eur'], ['Asking price', r => r.q.price, 'eur'], ['Real cost a month', r => r.sc.m.econM, 'lo€'], ['Leaves the account a month', r => r.sc.m.cashM, 'lo€'],
    [`Loss over ${S.prof.hold} years`, r => r.sc.m.curve.loss, 'lo€'], ['Big items due', r => r.sc.m.due.total, 'lo€'], ['Power', r => r.c.ps, 'hi', ' PS'], ['0–100 km/h', r => r.c.acc && r.c.acc.claim, 'lo', ' s'], ['kg per PS', r => Math.round(r.c.kg / r.c.ps * 100) / 100, 'lo'], ['Boot', r => r.c.trunk, 'hi', ' L']
  ];
  const cell = (v, kind, unit) => v == null ? '–' : kind.includes('€') || kind === 'eur' ? eur(v) : `${typeof v === 'number' ? n1(v) : esc(v)}${unit || ''}`;
  const body = rows.map(([l, f, kind, unit]) => {
    const vs = R.map(f), ok = vs.filter(v => v != null), best = !ok.length || kind === 'eur' ? null : kind.startsWith('lo') ? Math.min(...ok) : Math.max(...ok);
    return `<tr><th>${esc(l)}</th>${vs.map(v => `<td class="${best != null && v === best && ok.length > 1 ? 'best' : ''}">${cell(v, kind, unit)}</td>`).join('')}</tr>`;
  }).join('');
  sheet(`<div class="sheet-head"><h2>Side by side</h2><button class="x" data-act="close" aria-label="Close">×</button></div>
<div class="scroll-x"><table class="cmp"><thead><tr><th></th>${R.map(r => `<th>${carSVG(r.c, { shadow: false })}<span>${esc(nameOf(r.c))}</span><small>${r.q.year} · ${Math.round(r.q.km / 1000)}k km</small></th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>
<p class="note">The best value in each row is marked.</p>`);
}

/* ---------- My car ---------- */
function viewMine() {
  const mn = S.mine, g = mn && S.garage.find(x => x.id === mn.gid), c = g && byId(g.q.carId);
  if (!mn || !g || !c) {
    const list = S.garage.map(g => { const c = byId(g.q.carId); return c ? `<li><span>${esc(nameOf(c))} · ${g.q.year} · ${kmf(num(g.q.km) || 0)}</span><button class="btn sm" data-act="setmine" data-id="${g.id}">This is my car</button></li>` : ''; }).join('');
    return `<section class="card empty"><div class="kicker">My car</div><h1>Follow the car you own</h1><p>Écurie tracks what it is worth as the kilometres add up, what falls due next, and the best moment to sell.</p>${list ? `<ul class="pick">${list}</ul>` : ''}<div class="row"><button class="btn pri" data-act="tab" data-tab="analyse">Analyse your car</button></div><p class="note">Analyse it, then tap “This is my car”.</p></section>`;
  }
  const log = (mn.log || []).slice().sort((a, b) => a.d.localeCompare(b.d)), last = log[log.length - 1], kmNow = last ? last.km : num(g.q.km) || 0;
  const q = { ...qOf(g.q), km: kmNow }, now = E.nowYear(), v = E.valueAt(c, q, now), pc = E.priceCheck(c, q, now);
  const m = E.monthly(c, { ...q, price: v }, S.prof, META, now), cv = m.curve;
  const bought = num(mn.bought), diff = bought ? v - bought : null;
  const A = S.prof.km, thisYear = E.valueAt(c, q, now) - E.valueAt(c, { ...q, km: kmNow + A }, now + 1), in3 = E.valueAt(c, { ...q, km: kmNow + 3 * A }, now + 3) - E.valueAt(c, { ...q, km: kmNow + 4 * A }, now + 4);
  const next = m.due.items.filter(i => i.in <= 2);
  const sell = [];
  cv.steps.forEach(s => sell.push(`Sell before <b>${kmf(s.km)}</b> (${when(s.years)} at your pace) to keep about ${eur(s.amount)}.`));
  const big = m.due.items.filter(i => i.cost >= 1500)[0];
  if (big) sell.push(`${esc(big.item)} falls due ${when(big.in)} (about ${eur(big.cost)}): selling before it saves you the bill, or ask a buyer to pay for it.`);
  sell.push(`It loses about ${eur(thisYear)} this year and ${eur(in3)} a year in three years: ${thisYear > in3 * 1.4 ? 'the yearly loss is still falling, so every extra year you keep it costs less in value than the one before' : 'the yearly loss is already flat, so keeping it longer costs mostly upkeep and what falls due'}.`);
  const logPts = log.map(l => ({ a: Math.max(0, E.dateToYear(l.d) - (q.year + 0.5)), v: E.valueAt(c, { ...q, km: l.km }, E.dateToYear(l.d)) }));
  return `<section class="card hero"><div class="sign"><div class="sign-make">My car</div><div class="sign-model">${esc(nameOf(c))}</div><div class="sign-sub">${q.year} · ${kmf(kmNow)}</div></div><div class="road">${carSVG(c)}</div>
<div class="hero-body"><div class="price-row"><div><div class="bignum">${eur(v)}</div><p class="note">worth today, range ${eur(pc.lo)} to ${eur(pc.hi)}</p></div>${diff != null ? `<div><div class="bignum sm">${diff >= 0 ? '+' : '−'}${eur(Math.abs(diff))}</div><p class="note">since you bought it for ${eur(bought)}${mn.boughtOn ? ' in ' + esc(mn.boughtOn) : ''}</p></div>` : ''}</div>
<div class="g3"><label class="field"><span>Mileage now</span><span class="box"><input type="number" inputmode="numeric" step="100" id="mine-km" value="${kmNow}"><i>km</i></span></label><label class="field"><span>You paid</span><span class="box"><input type="number" inputmode="numeric" step="500" data-mine="bought" value="${bought || ''}"><i>€</i></span></label><label class="field"><span>Bought in</span><span class="box"><input type="month" data-mine="boughtOn" value="${esc(mn.boughtOn || '')}"></span></label></div>
<div class="row"><button class="btn pri" data-act="minekm">Update the mileage</button><button class="btn" data-act="open" data-id="${g.id}">Full report</button></div></div></section>
<section class="card"><div class="kicker">Value</div><h2>Its value as the kilometres add up</h2>${valueChart(cv, q.year, { log: logPts, label: 'Value of your car over time' })}<p class="note">Dots are your mileage updates. ${log.length} update${log.length === 1 ? '' : 's'} so far.</p></section>
<section class="card"><div class="kicker">Selling</div><h2>When to sell</h2><ul class="facts">${sell.map(s => `<li>${s}</li>`).join('')}</ul></section>
<section class="card"><div class="kicker">Next</div><h2>Due in the next two years</h2>${next.length ? `<ul class="due">${next.map(i => `<li class="${i.extra ? 'extra' : ''}"><span class="w">${esc(when(i.in))}<small>${kmf(i.km)}</small></span><span class="i">${esc(i.item)}</span><b>${eur(i.cost)}</b></li>`).join('')}</ul>` : '<p>Nothing big in the next two years.</p>'}<p class="note">It costs you ${eur(m.runM + m.extraM)} a month to run, ${eur(m.deprM + m.runM + m.extraM)} with the loss in value.</p></section>
<div class="row center"><button class="link danger" data-act="unmine">${ui.delSure === 'mine' ? 'Tap again: it is no longer my car' : 'It is no longer my car'}</button></div>`;
}

/* ---------- Profile ---------- */
const pnum = (k, label, v, unit, o = {}) => `<label class="field"><span>${label}</span><span class="box"><input type="number" inputmode="${o.dec ? 'decimal' : 'numeric'}" min="${o.min ?? 0}" ${o.max != null ? `max="${o.max}"` : ''} step="${o.step || 1}" data-p="${k}" value="${v ?? ''}" placeholder="${esc(o.ph || '')}">${unit ? `<i>${unit}</i>` : ''}</span>${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</label>`;
function viewProfile() {
  const p = S.prof, sn = readSafetyNet(), fin = finances(), on = window.Cloud && window.Cloud.configured(), pr = E.prices(META, p);
  const snBox = sn ? `<div class="linked"><p><b>Linked to Safety Net Score</b> (${esc(sn.country)} profile): net ${eur(sn.net)} a month${sn.other ? ` + ${eur(sn.other)} other` : ''}, essentials ${eur(sn.essential)}, savings ${eur(sn.savings)}, savings plan ${eur(sn.plan)} a month${sn.levels ? `, “Good” level ${eur(sn.levels[1])}` : ''}.</p><p class="note">Change them there; every car here follows. <a href="../safety-net/">Open Safety Net Score</a></p></div>` : `<p class="note">Safety Net Score holds no figures of yours on this device yet. <a href="../safety-net/">Open it</a> and enter them, or type them below.</p>`;
  const manual = p.finSrc === 'manual' || !sn;
  const f = p.fin;
  return `<section class="card"><div class="kicker">Profile</div><h1>Your finances</h1>${snBox}
${sn ? `<label class="chk"><input type="checkbox" data-act="finsrc" ${p.finSrc === 'manual' ? 'checked' : ''}> <span>Use my own figures instead</span></label>` : ''}
${manual ? `<div class="g2">${pnum('fin.net', 'Net income a month', f.net || '', '€', { step: 50 })}${pnum('fin.other', 'Other income a month', f.other || '', '€', { step: 50 })}${pnum('fin.essential', 'Essential spending a month', f.essential || '', '€', { step: 50, hint: 'Rent, food, insurance, debts: what you cannot skip.' })}${pnum('fin.plan', 'Savings plan a month', f.plan || '', '€', { step: 50 })}${pnum('fin.savings', 'Cash savings', f.savings || '', '€', { step: 500 })}</div>` : ''}
<p class="note">${fin ? 'Every car’s Financial burden and “Is it covered?” use these.' : 'Until there are figures, cars get no Financial burden score.'}</p></section>
<section class="card"><h2>How you drive</h2><div class="g2">${pnum('km', 'Kilometres a year', p.km, 'km', { step: 1000, min: 1000 })}${pnum('hold', 'Years you keep a car', p.hold, 'years', { min: 1, max: 15 })}</div>
<div class="sublbl">Your mix</div>${E.USAGE_KEYS.map(k => `<label class="slider"><span>${E.FIT_LABEL[k]}</span><input type="range" min="0" max="100" step="5" data-p="usage.${k}" value="${p.usage[k]}"><output>${p.usage[k]}</output></label>`).join('')}
<label class="chk"><input type="checkbox" data-p="family" ${p.family ? 'checked' : ''}> <span>Family duty</span></label><label class="chk"><input type="checkbox" data-p="dog" ${p.dog ? 'checked' : ''}> <span>The dog comes along</span></label>
<div class="g2"><label class="field"><span>No-claims class</span><span class="box"><select data-p="sf">${Object.entries(E.SF).map(([k, v]) => `<option value="${k}" ${p.sf === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></span></label>${pnum('homeShare', 'Charging at home (EV, PHEV)', p.homeShare, '%', { max: 100, step: 5 })}</div></section>
<section class="card"><h2>How you pay</h2><div class="seg" role="group" aria-label="How you pay"><button data-act="mode" data-m="loan" aria-pressed="${p.mode !== 'cash'}">Loan</button><button data-act="mode" data-m="cash" aria-pressed="${p.mode === 'cash'}">Cash</button></div>
${p.mode !== 'cash' ? `<div class="g3">${pnum('downPct', 'Down payment', p.downPct, '%', { max: 100, step: 5 })}${pnum('term', 'Term', p.term, 'months', { min: 6, max: 96, step: 6 })}${pnum('apr', 'Interest', p.apr || '', '%', { dec: true, step: 0.1, ph: String((META && META.loan && META.loan.good) || 5.9), hint: 'Empty: today’s typical good rate.' })}</div>` : ''}</section>
<section class="card"><h2>What matters most</h2><p class="note">How the four scores weigh in the Écurie score.</p>${E.SCORE_KEYS.map(k => `<label class="slider"><span>${E.SCORE_LABEL[k]}</span><input type="range" min="0" max="50" step="5" data-p="w.${k}" value="${p.w[k]}"><output>${p.w[k]}</output></label>`).join('')}</section>
<section class="card"><h2>Market data</h2><p class="note">Fuel ${pr.date ? `(${esc(pr.date)})` : ''}: Super E10 €${pr.e10.toFixed(3)}, Super Plus €${pr.sp98.toFixed(3)}, Diesel €${pr.diesel.toFixed(3)} a litre; electricity €${pr.home.toFixed(2)} at home, €${pr.dc.toFixed(2)} fast-charging. Loans from ${n1((META && META.loan && META.loan.good) || 5.9)} %. ${CARS.length} cars in the checked list${META && META.asOf ? `, prices as of ${esc(META.asOf)}` : ''}; ${Object.keys(S.lookups || {}).length} researched by Claude on your account.</p></section>
<section class="card"><h2>Sync</h2><p class="note">${!on ? 'Sync is not set up on this site.' : ui.session ? `Signed in as ${esc(ui.session)}. Your garage, my car, profile and researched cars follow you to every device.` : 'Not signed in: everything stays on this device.'}</p>${on ? `<div class="row"><button class="btn sm" data-act="sync">${ui.session ? 'Manage' : 'Sign in to sync'}</button></div>` : ''}</section>
<section class="card"><h2>Backup</h2><div class="row"><button class="btn sm" data-act="export">Export a backup</button><label class="btn sm">Import<input type="file" accept="application/json" data-act="import" hidden></label></div>
<div class="row"><button class="link danger" data-act="reset">${ui.delSure === 'reset' ? 'Tap again to erase Écurie on this device' : 'Erase Écurie on this device'}</button></div></section>
<section class="card"><h2>Ideas inbox</h2><p class="note">A link to a shared document where you jot ideas for the apps; every app on this site shows the same one.</p><label class="field wide"><span class="box"><input type="url" data-act="inbox" value="${esc(S.inbox || '')}" placeholder="https://docs.google.com/…"></span></label>${S.inbox ? `<p><a href="${esc(S.inbox)}" target="_blank" rel="noopener">Open the ideas inbox</a></p>` : ''}</section>
<p class="note center">Écurie replaces Prüfstand. Germany only for now.</p>`;
}

/* ---------- events ---------- */
const setPath = (obj, path, v) => { const ks = path.split('.'); let o = obj; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]] = o[ks[i]] || {}; o[ks[ks.length - 1]] = v; };
function onClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) { if (!e.target.closest('.sbox')) { const s = $('#sugg'); if (s) s.hidden = true; } return; }
  const a = b.dataset.act, id = b.dataset.id;
  if (b.tagName === 'INPUT' && b.type !== 'checkbox') return;
  if (a !== 'gdel' && a !== 'unmine' && a !== 'reset') ui.delSure = null;
  if (a === 'tab') { S.ui.tab = b.dataset.tab; saveUi(); closeSheet(); render(); window.scrollTo(0, 0); }
  else if (a === 'opt') { const o = new Set(S.q.options); o.has(id) ? o.delete(id) : o.add(id); S.q.options = [...o]; save(); b.setAttribute('aria-pressed', String(o.has(id))); const sm = $('.opts summary span'); if (sm) sm.textContent = o.size ? `${o.size} chosen` : 'optional'; if (S.q.carId) renderReport(); }
  else if (a === 'analyse') analyse();
  else if (a === 'newq') { S.q = blankQ(); ui.choice = null; ui.err = ''; ui.note = ''; ui.ticks = {}; save(); render(); const n = $('#q-name'); if (n) n.focus(); }
  else if (a === 'use') use(id);
  else if (a === 'research' || a === 'reresearch') research();
  else if (a === 'sugg') pickSugg(Number(b.dataset.i));
  else if (a === 'ad') readAd();
  else if (a === 'weekly') { if (!S.q.name.trim()) return fail('Type the make and model first.'); weeklySheet(); }
  else if (a === 'reqcopy' || a === 'reqopen') copyText(ui.reqLine || '');
  else if (a === 'live') checkLive();
  else if (a === 'save') { if (!entryOf(S.q)) { S.garage.unshift({ id: uid(), q: { ...S.q, options: [...S.q.options] }, added: today(), checks: { ...ui.ticks } }); save(); toast('Saved to your Garage.'); render(); } }
  else if (a === 'mine') { let g = entryOf(S.q); if (!g) { g = { id: uid(), q: { ...S.q, options: [...S.q.options] }, added: today(), checks: { ...ui.ticks } }; S.garage.unshift(g); } const c = byId(S.q.carId), q = qOf(S.q); S.mine = { gid: g.id, bought: q.price || (c ? E.priceCheck(c, q).fair : null), boughtOn: today().slice(0, 7), log: [{ d: today(), km: q.km }] }; save(); toast('Set as your car: see My car.'); render(); }
  else if (a === 'setmine') { const g = S.garage.find(x => x.id === id); if (!g) return; const c = byId(g.q.carId), q = qOf(g.q); S.mine = { gid: g.id, bought: q.price || (c ? E.priceCheck(c, q).fair : null), boughtOn: g.added ? g.added.slice(0, 7) : today().slice(0, 7), log: [{ d: today(), km: q.km }] }; save(); render(); }
  else if (a === 'unmine') { if (ui.delSure !== 'mine') { ui.delSure = 'mine'; render(); return; } S.mine = null; ui.delSure = null; save(); render(); }
  else if (a === 'minekm') { const v = num($('#mine-km').value); if (v == null) return; S.mine.log = (S.mine.log || []).filter(l => l.d !== today()).concat([{ d: today(), km: v }]); save(); toast('Mileage updated.'); render(); }
  else if (a === 'mode') { S.prof.mode = b.dataset.m; save(); render(); }
  else if (a === 'ladder') { const c = byId(S.q.carId); if (!c) return; const x = compute(c, qOf(S.q)); S.ladder = { name: nameOf(c), target: E.ladderTarget(x.m), cur: 'EUR', at: today() }; save(); toast('The Funds Ladder’s car rung can now take this target.'); renderReport(); }
  else if (a === 'open') { const g = S.garage.find(x => x.id === id); if (!g) return; S.q = { ...blankQ(), ...g.q, options: [...(g.q.options || [])] }; S.ui.tab = 'analyse'; ui.choice = null; ui.err = ''; ui.note = ''; save(); closeSheet(); render(); window.scrollTo(0, 0); }
  else if (a === 'gdel') { if (ui.delSure !== id) { ui.delSure = id; render(); return; } S.garage = S.garage.filter(g => g.id !== id); if (S.mine && S.mine.gid === id) S.mine = null; S.ui.cmp = (S.ui.cmp || []).filter(x => x !== id); ui.delSure = null; save(); render(); }
  else if (a === 'compare') compareSheet();
  else if (a === 'close') closeSheet();
  else if (a === 'sync') { if (window.Cloud) window.Cloud.dialog(() => { window.appSync && window.appSync(); refreshSession(); }); }
  else if (a === 'export') { const url = URL.createObjectURL(exportBackup()), l = document.createElement('a'); l.href = url; l.download = `ecurie-${today()}.json`; l.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
  else if (a === 'reset') { if (ui.delSure !== 'reset') { ui.delSure = 'reset'; render(); return; } reset(); ui.delSure = null; render(); toast('Écurie was erased on this device.'); }
}
function onInput(e) {
  const t = e.target;
  if (t.dataset.q) { const k = t.dataset.q; S.q[k] = t.type === 'number' ? num(t.value) : t.value; if (k === 'name') { S.q.carId = null; suggest(t.value); } ui.err = ''; saveUi(); return; }
  if (t.type === 'range' && t.dataset.p) { const o = t.parentElement.querySelector('output'); if (o) o.textContent = t.value; }
}
function onChange(e) {
  const t = e.target;
  if (t.dataset.q) {
    const k = t.dataset.q; save();
    if (['year', 'km', 'price', 'ps'].includes(k) && S.q.carId) { const c = byId(S.q.carId); if (k === 'ps' && c && num(S.q.ps) && Math.abs(num(S.q.ps) - c.ps) / c.ps > 0.08) { S.q.carId = null; render(); return; } renderReport(); }
    return;
  }
  if (t.dataset.p) {
    const k = t.dataset.p, v = t.type === 'checkbox' ? t.checked : t.tagName === 'SELECT' ? t.value : num(t.value);
    if (t.type === 'number' && v == null && !k.startsWith('fin.') && k !== 'apr') return;
    setPath(S.prof, k, t.type === 'number' && v == null ? 0 : v); save();
    if (S.ui.tab === 'analyse') renderReport(); else if (k === 'mode') render();
    return;
  }
  if (t.dataset.mine) { const k = t.dataset.mine; S.mine[k] = k === 'bought' ? num(t.value) : t.value; save(); render(); return; }
  const a = t.dataset.act;
  if (a === 'tick') { const g = entryOf(S.q), store = g ? (g.checks = g.checks || {}) : ui.ticks; store[t.dataset.id] = t.checked; if (g) save(); const h = t.closest('.card').querySelector('h2 .muted'); if (h) { const n = t.closest('.checks').querySelectorAll('input:checked').length, tot = t.closest('.checks').querySelectorAll('input').length; h.textContent = `${n} of ${tot}`; } }
  else if (a === 'cmp') { const s = new Set(S.ui.cmp || []); t.checked ? s.add(t.dataset.id) : s.delete(t.dataset.id); if (s.size > 4) { t.checked = false; s.delete(t.dataset.id); toast('Compare up to four cars.'); } S.ui.cmp = [...s]; saveUi(); render(); }
  else if (a === 'finsrc') { S.prof.finSrc = t.checked ? 'manual' : 'auto'; save(); render(); }
  else if (a === 'inbox') { setInbox(t.value.trim()); render(); }
  else if (a === 'import') { const f = t.files && t.files[0]; if (!f) return; f.text().then(txt => { importBackup(txt); render(); toast('Backup imported.'); }).catch(err => toast(err.message || 'That file could not be read.')); }
}
function onKey(e) {
  if (e.target.id === 'q-name' && ui.sugg.length) {
    const box = $('#sugg'); if (!box || box.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); ui.suggOn = (ui.suggOn + (e.key === 'ArrowDown' ? 1 : -1) + ui.sugg.length) % ui.sugg.length; box.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === ui.suggOn)); }
    else if (e.key === 'Enter' && ui.suggOn >= 0) { e.preventDefault(); pickSugg(ui.suggOn); }
    else if (e.key === 'Escape') box.hidden = true;
  } else if (e.key === 'Enter' && e.target.dataset && e.target.dataset.q) { e.preventDefault(); e.target.blur(); analyse(); }
}
export function init() {
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', onKey);
  $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
  render(); refreshSession();
}
