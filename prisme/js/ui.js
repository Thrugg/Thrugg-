/* Prisme — the screens. Build (PC builder, ready-made PCs, offer check), Screens (monitor and TV), Choose (every
   other category), Gear (my gear, watch list, saved builds), Pulse (news, rankings, market). Profile in a sheet. */
import * as E from './engine.js';
import { S, save, saveUi, uid, finances, readSafetyNet, setInbox, exportBackup, importBackup, reset, load } from './store.js';
import { t, LANGS } from './i18n.js';
import { readImage } from './ocr.js';

let NEWS = { items: [], at: null };
const ui = { session: null, busy: '', ocr: '', all: '' };
export const setNews = n => { NEWS = n || NEWS; };
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mk = () => S.prof.market;
const loc = () => S.prof.lang === 'fr' ? 'fr-FR' : 'de-DE';
const eur = v => v == null || !isFinite(v) ? '–' : Math.round(v).toLocaleString(loc()) + ' €';
const n0 = v => Math.round(v).toLocaleString(loc());
const fmtD = d => d ? new Date(d).toLocaleDateString(S.prof.lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';
const today = () => new Date();
const get = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
const put = (o, p, v) => { const ks = p.split('.'), last = ks.pop(); const tgt = ks.reduce((a, k) => (a[k] = a[k] && typeof a[k] === 'object' ? a[k] : {}), o); tgt[last] = v; };
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }

/* ---------- small pieces ---------- */
const chips = (path, opts, cur) => `<div class="chips" role="group">${opts.map(([v, l]) => `<button class="chip${String(cur) === String(v) ? ' on' : ''}" data-act="set" data-k="${path}" data-v="${esc(v)}" aria-pressed="${String(cur) === String(v)}">${esc(l)}</button>`).join('')}</div>`;
const seg = (path, opts, cur) => `<div class="seg" role="tablist">${opts.map(([v, l]) => `<button role="tab" class="${cur === v ? 'on' : ''}" data-act="ui" data-k="${path}" data-v="${v}" aria-selected="${cur === v}">${esc(l)}</button>`).join('')}</div>`;
const field = (label, inner, hint) => `<label class="field"><span class="fl">${esc(label)}</span>${inner}${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
const numIn = (path, unit, step = 1, min = 0) => `<span class="box"><input type="number" inputmode="decimal" min="${min}" step="${step}" data-set="${path}" data-type="num" value="${esc(/budget$/.test(path) && !get(S, path) ? '' : get(S, path) ?? '')}">${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</span>`;
const sel = (path, opts, cur) => `<span class="box"><select data-set="${path}">${opts.map(([v, l]) => `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></span>`;
const level = (path, label) => { const v = Number(get(S, path)) || 0; return `<div class="lvl"><span>${esc(label)}</span><div class="dots">${[0, 1, 2, 3].map(i => `<button class="dot${i <= v && v > 0 && i > 0 ? ' on' : ''}${i === 0 ? ' zero' : ''}" data-act="set" data-k="${path}" data-v="${i}" aria-label="${esc(label)} ${i}">${i === 0 ? '–' : ''}</button>`).join('')}</div></div>`; };
const ring = (v, size = 54) => { const r = size / 2 - 5, c = 2 * Math.PI * r, f = Math.max(0, Math.min(100, v)) / 100; const col = v >= 75 ? 'var(--good)' : v >= 55 ? 'var(--ok)' : 'var(--bad)'; return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="${v}/100"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="5"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c * f} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle">${v}</text></svg>`; };
const conf = it => { const p = E.priceOf(it, mk()); if (!p) return ''; const k = p.conf === 'H' ? 'confH' : p.conf === 'M' ? 'confM' : 'confL'; return `<span class="conf ${k}" title="${esc(t(k + 'Long', { d: p.date }))}">${esc(t(k))}${p.derived ? ' · ' + esc(t('derivedFR')) : ''}</span>`; };
const shopLinks = (q, list) => `<div class="links">${(list || (E.market() && E.market().shops[mk()]) || []).map(s => `<a href="${esc(s.u.replace('{q}', encodeURIComponent(q)))}" target="_blank" rel="noopener">${esc(s.n)}</a>`).join('')}</div>`;
const srcLinks = it => { const src = (it.src || []).map(k => E.market() && E.market().sources[k]).filter(Boolean); return src.length ? `<p class="note">${esc(t('sources'))}: ${src.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">${i + 1}</a>`).join(' · ')}</p>` : ''; };
const verdictPill = v => `<span class="pill ${v}">${esc(t('v_' + v))}</span>`;
const checkIco = st => st === 'pass' ? '✓' : st === 'warn' ? '!' : '✕';
const allGpus = () => E.items('gpu').map(g => [g.id, `${g.name} · ${eur(E.price(g, mk()))}`]);
const allCpus = () => E.items('cpu').map(g => [g.id, `${g.name} · ${eur(E.price(g, mk()))}`]);
const reasonText = r => t('r_' + r.k, r);
const full = it => it.name.toLowerCase().startsWith(it.brand.toLowerCase()) ? it.name : `${it.brand} ${it.name}`;   // "Sony WH-1000XM6", not "Sony Sony …"

/* ---------- BUILD ---------- */
function curBuild() { return E.build({ ...S.pc, market: mk(), gpu: S.pc.gpu || null }); }
function viewBuild() {
  const sub = S.ui.build;
  return `${seg('build', [['custom', t('bCustom')], ['ready', t('bReady')], ['check', t('bCheck')]], sub)}
  ${sub === 'custom' ? viewCustom() : sub === 'ready' ? viewReady() : viewCheck()}`;
}
function goalCard() {
  const p = S.pc;
  return `<section class="card"><h2>${esc(t('goal'))}</h2>
  ${chips('pc.use', Object.keys(E.USES).map(k => [k, t('use_' + k)]), p.use)}
  <div class="grid2">${field(t('budget'), numIn('pc.budget', '€', 50))}${field(t('gpuPick'), sel('pc.gpu', [['', t('auto')], ...allGpus()], p.gpu))}</div>
  <details class="more"${p.platform !== 'any' || p.size !== 'any' || p.look !== 'any' || p.noise !== 'balanced' ? ' open' : ''}><summary>${esc(t('morePrefs'))}</summary>
  <div class="grid2">
  ${field(t('platform'), sel('pc.platform', [['any', t('any')], ['amd', 'AMD (AM5)'], ['intel', 'Intel (LGA1851)']], p.platform))}
  ${field(t('size'), sel('pc.size', [['any', t('sizeMid')], ['small', t('sizeSmall')], ['sff', t('sizeSff')]], p.size))}
  ${field(t('look'), sel('pc.look', [['any', t('any')], ['white', t('white')]], p.look))}
  ${field(t('noise'), sel('pc.noise', [['balanced', t('balanced')], ['quiet', t('quiet')]], p.noise))}
  ${field(t('storage'), sel('pc.storage', [[1, '1 TB'], [2, '2 TB'], [4, '4 TB']], p.storage))}
  ${field(t('memory'), sel('pc.ram', [[0, t('auto')], [32, '32 GB'], [64, '64 GB']], p.ram))}
  ${!p.gpu ? field(t('gpuBrand'), sel('pc.brand', [['any', t('any')], ['nvidia', 'NVIDIA'], ['amd', 'AMD'], ['intel', 'Intel']], p.brand)) : ''}
  </div></details></section>`;
}
function viewCustom() {
  const b = curBuild(), P = b.parts, m = E.market(), u = E.USES[b.use], fin = finances();
  const fails = b.checks.filter(c => c.st === 'fail'), warns = b.checks.filter(c => c.st === 'warn');
  const v = S.view, f = E.fps(P.gpu, P.cpu, u.res, v.kind, v.up, v.fg), bal = b.balance;
  const pr = ['gpu', 'ram', 'ssd'].map(c => m && m.pressure[c] && m.pressure[c].level >= 2 ? c : null).filter(Boolean);
  const tm = E.timing(P.gpu, today(), mk()), aff = E.afford(b.total, fin), fair = E.fairPrice(b.total, true);
  const locked = Object.keys(S.pc.lock || {}).length;
  return `${goalCard()}
  <section class="card hero"><div class="tot"><div><span class="lbl">${esc(t('total'))}</span><b>${eur(b.total)}</b><small>${esc(b.over ? t('overBy', { v: eur(-b.left) }) : t('leftOver', { v: eur(b.left) }))}</small></div>${ring(Math.max(0, Math.round(100 - fails.length * 30 - warns.length * 6 - (b.over ? 20 : 0))), 62)}</div>
   <div class="bar"><i style="width:${Math.min(100, b.total / b.budget * 100)}%" class="${b.over ? 'over' : ''}"></i></div>
   ${b.relaxed ? `<p class="note warn">${esc(t('relaxed'))}</p>` : ''}
   <ul class="parts">${E.PARTS.map(k => { const it = P[k]; if (!it) return ''; const lk = S.pc.lock && S.pc.lock[k]; return `<li data-act="alts" data-cat="${k}"><span class="slot">${esc(t('p_' + k))}${lk ? ' <i class="lock" title="' + esc(t('swapped')) + '">●</i>' : ''}</span><span class="nm">${esc(it.name)}<small>${esc(partWhy(k, it, b))}</small></span><span class="pr">${eur(E.price(it, mk()))}${conf(it)}</span></li>`; }).join('')}</ul>
   <div class="row">${locked ? `<button class="btn sm" data-act="unlock">${esc(t('resetSwaps'))}</button>` : ''}<button class="btn sm" data-act="saveBuild">${esc(t('saveBuild'))}</button><button class="btn sm" data-act="watchBuild">${esc(t('watchParts'))}</button></div>
   <p class="note">${esc(t('tapToSwap'))}</p></section>
  <section class="card"><h2>${esc(t('checksH'))}</h2><ul class="checks">${b.checks.map(c => `<li class="${c.st}"><span>${checkIco(c.st)}</span>${esc(t('c_' + c.k + '_' + c.st, c.v))}</li>`).join('')}</ul></section>
  <section class="card"><h2>${esc(t('perfH', { res: t('res_' + u.res) }))}</h2>
   ${chips('view.kind', [['aaa', t('k_aaa')], ['rt', t('k_rt')], ['pt', t('k_pt')], ['esports', t('k_esports')]], v.kind)}
   <div class="grid2">${field(t('upscale'), sel('view.up', [['off', t('off')], ['quality', t('up_quality')], ['balanced', t('up_balanced')], ['performance', t('up_performance')]], v.up))}${field(t('framegen'), sel('view.fg', [['off', t('off')], ['x2', '2×'], ['x4', '4× (RTX 50)']], v.fg))}</div>
   <div class="fps"><div><b>${f.shown}</b><span>fps</span></div><p>${esc(t('fpsLine', { native: f.native, base: f.base }))}${f.cpuBound ? ' ' + esc(t('cpuBound')) : ''}${f.fgLowBase ? ' ' + esc(t('fgLow')) : ''}${v.fg === 'x4' && !P.gpu.s.mfg ? ' ' + esc(t('noMfg')) : ''}</p></div>
   ${bal ? `<p class="note">${esc(t('bal_' + bal.state, bal))}</p>` : ''}
   <p class="note muted">${esc(t('fpsModel'))}</p></section>
  <section class="card"><h2>${esc(t('whenH'))}</h2><p>${verdictPill(tm.verdict)} ${tm.reasons.map(r => esc(reasonText(r))).join(' ')}</p>
   ${pr.map(c => `<p class="note warn">${esc(m.pressure[c].note)}</p>`).join('')}
   <p class="note">${esc(t('readyCompare', { lo: eur(fair.lo), hi: eur(fair.hi) }))} <button class="link" data-act="ui" data-k="build" data-v="ready">${esc(t('seeReady'))}</button></p></section>
  ${affCard(b.total)}
  <section class="card"><h2>${esc(t('shopH'))}</h2>${E.PARTS.map(k => P[k] ? `<div class="shoprow"><span>${esc(P[k].name)}</span>${shopLinks(P[k].name.replace(/\(.*?\)/g, '').replace(/ board| class/g, ''), (m.shops[mk()] || []).filter(s => s.k === 'compare'))}</div>` : '').join('')}</section>`;
}
function partWhy(k, it, b) {
  const u = E.USES[b.use];
  if (k === 'gpu') return t('w_gpu', { idx: it.s[u.metric], vram: it.s.vram });
  if (k === 'cpu') return it.s.x3d ? t('w_cpuX3d') : t('w_cpu', { g: it.s.game });
  if (k === 'board') return t('w_board', { s: it.s.socket });
  if (k === 'psu') { const n = E.psuNeed(b.parts.gpu, b.parts.cpu); return t('w_psu', { need: n.need, rec: n.rec }); }
  if (k === 'cooler') return t('w_cooler', { cap: it.s.cap, peak: b.parts.cpu.s.peak });
  if (k === 'case') return t('w_case', { len: it.s.gpuMax });
  if (k === 'ram') return it.s.mts >= 6000 ? t('w_ram') : t('w_ramSlow');
  if (k === 'ssd') return it.s.dram ? t('w_ssd') : t('w_ssdNoDram');
  return '';
}
function affCard(cost) {
  const fin = finances(), a = E.afford(cost, fin);
  if (!a) return `<section class="card"><h2>${esc(t('affordH'))}</h2><p class="note">${esc(t('affordNone'))} <button class="link" data-act="profile">${esc(t('openProfile'))}</button></p></section>`;
  return `<section class="card"><h2>${esc(t('affordH'))}</h2><p>${verdictPill('a_' + a.verdict)} ${esc(t('aff_' + a.verdict, { m: a.months, pm: a.planMonths }))}</p>
  <p class="note">${esc(t('affDetail', { after: eur(a.after), m: a.months }))}${a.before ? ' ' + esc(t('affLevel', { b: t('lv_' + a.before), a: t('lv_' + a.afterLv) })) : ''} · ${esc(fin.src === 'sn' ? t('finFromSn') : t('finManual'))}</p></section>`;
}
function sheetAlts(cat) {
  const b = curBuild(), alts = E.alternatives(cat, b.parts, { ...S.pc, market: mk() }), cur = b.parts[cat];
  return `<h2>${esc(t('p_' + cat))}</h2><p class="note">${esc(t('altsSub'))}</p><ul class="alts">${alts.map(a => `<li class="${a.it.id === cur.id ? 'cur' : ''}${a.fails ? ' nofit' : ''}" data-act="swap" data-cat="${cat}" data-id="${a.it.id}"><span class="nm">${esc(a.it.name)}<small>${esc(specLine(a.it))}${a.fails ? ' · ' + esc(t('noFit')) : a.warns ? ' · ' + esc(t('tight')) : ''}</small></span><span class="pr">${eur(a.price)}<small>${a.it.id === cur.id ? esc(t('current')) : (a.price >= E.price(cur, mk()) ? '+' : '−') + eur(Math.abs(a.price - E.price(cur, mk())))}</small></span></li>`).join('')}</ul>
  ${cur.note ? `<p class="note">${esc(cur.note)}</p>` : ''}${srcLinks(cur)}`;
}
function specLine(it) {
  const s = it.s || {};
  switch (it.cat) {
    case 'gpu': return `${s.vram} GB · ${s.watts} W · ${s.len} mm · 4K ${s.perf4k}`;
    case 'cpu': return `${s.cores} ${t('cores')} · ${s.socket} · ${t('games')} ${s.game}`;
    case 'board': return `${s.socket}${s.wifi ? ' · Wi-Fi' : ''}${s.usb4 ? ' · USB4' : ''} · ${s.m2}× M.2`;
    case 'ram': return `${s.gb} GB · ${s.mts} MT/s · CL${s.cl}`;
    case 'ssd': return `${s.tb} TB · PCIe ${s.gen}.0${s.dram ? ' · DRAM' : ''} · ${s.tbw} TBW`;
    case 'psu': return `${s.w} W · ${s.eff}${s.atx31 ? ' · ATX 3.1' : ''}${s.native ? ' · 12V-2x6' : ''}${s.form === 'sfx' ? ' · SFX' : ''}`;
    case 'cooler': return s.type === 'aio' ? `AIO ${s.rad} mm · ${s.cap} W` : `${s.h} mm · ${s.cap} W`;
    case 'case': return `GPU ≤ ${s.gpuMax} mm · ${t('cooler')} ≤ ${s.coolerMax} mm · ${s.vol} L`;
    case 'monitor': return `${s.size}" ${s.w / s.h > 2.1 ? `${s.w}×${s.h}` : s.w >= 3800 ? '4K' : s.w >= 2500 ? '1440p' : '1080p'} ${s.hz} Hz · ${t('panel_' + s.panel)} · ${s.dp === 'none' ? t('hdmiOnly') : s.dp === 'dp14' ? 'DP 1.4' : 'DP 2.1 ' + s.dp.toUpperCase()}${s.dual ? ' · ' + s.dual : ''}`;
    case 'tv': return `${t('panel_' + s.panel)} · ${s.hz} Hz · ${s.hdmi21}× HDMI 2.1${s.dv ? ' · Dolby Vision' : ''} · ${s.os}`;
    case 'soundbar': return `${s.ch}${s.sub ? ' · ' + t('withSub') : ''}${s.rears ? ' · ' + t('withRears') : ''}`;
    case 'phone': return `${s.os} · ${s.screen}"${s.fold ? ' · ' + t('sb_fold') : ''} · ${t('updYears', { n: s.upd })}`;
    case 'headphones': return t('ty_' + s.type);
    case 'laptop': return `${s.os} · ${s.gpu} · ${s.screen}" · ${s.kg} kg`;
    case 'tablet': return `${s.os} · ${s.screen}"`;
    case 'projector': return `${t('ty_' + s.type)} · ${n0(s.lumens)} lm · ${s.res} · ${t('upTo', { n: s.maxIn })}`;
    case 'watch': return `${s.os}${s.needs === 'iphone' ? ' · ' + t('needsIphoneShort') : s.needs === 'android' ? ' · ' + t('needsAndroidShort') : ''}`;
    case 'console': return t('ty_' + s.type);
    default: return '';
  }
}

/* ---------- ready-made ---------- */
function viewReady() {
  const f = S.pre, m = E.market(), list = E.matchPrebuilts({ ...f, market: mk() }, today());
  const target = E.build({ use: f.use, budget: Math.max(800, f.budget - (f.os ? m.windows : 0)), market: mk(), gpu: null });
  const fair = E.fairPrice(target.total, f.os);
  const g = E.byId(f.gpuMin), q = `${g ? g.name.replace(/GeForce |Radeon /, '') : 'RTX'} Gaming PC`;
  const found = S.found && S.found.items && S.found.market === mk() ? S.found : null;
  return `<section class="card"><h2>${esc(t('readyFilters'))}</h2>
   ${chips('pre.use', Object.keys(E.USES).map(k => [k, t('use_' + k)]), f.use)}
   <div class="grid2">${field(t('budgetMax'), numIn('pre.budget', '€', 50))}${field(t('gpuMin'), sel('pre.gpuMin', allGpus(), f.gpuMin))}
   ${field(t('ramMin'), sel('pre.ramMin', [[16, '16 GB'], [32, '32 GB'], [64, '64 GB']], f.ramMin))}${field(t('ssdMin'), sel('pre.ssdMin', [[1, '1 TB'], [2, '2 TB'], [4, '4 TB']], f.ssdMin))}</div>
   <div class="row">${chips('pre.x3d', [[false, t('anyCpu')], [true, t('x3dOnly')]], f.x3d)}${chips('pre.os', [[true, t('withWin')], [false, t('noWin')]], f.os)}</div></section>
  <section class="card"><h2>${esc(t('weeklyOffers'))}</h2>${list.length ? `<ul class="offers">${list.slice(0, 8).map(x => offerRow(x.p, x.c)).join('')}</ul>` : `<p class="note">${esc(t('noWeekly'))}</p>`}
   <button class="btn pri" data-act="findPre"${ui.busy === 'findPre' ? ' disabled' : ''}>${esc(t('findWithClaude'))}</button><p class="note">${esc(t('findSub'))}</p></section>
  ${found ? `<section class="card"><h2>${esc(t('foundH', { d: fmtD(found.at) }))}</h2><ul class="offers">${found.items.map(o => ({ o, c: E.checkOffer(o, mk(), f.use) })).sort((a, b) => (b.c.score || 0) - (a.c.score || 0)).map(x => offerRow(x.o, x.c)).join('')}</ul>${found.note ? `<p class="note">${esc(found.note)}</p>` : ''}</section>` : ''}
  <section class="card"><h2>${esc(t('targetH'))}</h2><p>${esc(t('targetSub', { budget: eur(f.budget) }))}</p>
   <ul class="mini">${['gpu', 'cpu', 'ram', 'ssd', 'psu'].map(k => `<li><span>${esc(t('p_' + k))}</span><b>${esc(target.parts[k].name)}</b></li>`).join('')}</ul>
   <p>${esc(t('fairLine', { lo: eur(fair.lo), hi: eur(fair.hi), parts: eur(fair.parts) }))}</p>
   ${m.pressure.prebuilt && m.pressure.prebuilt.note ? `<p class="note good">${esc(m.pressure.prebuilt.note)}</p>` : ''}</section>
  <section class="card"><h2>${esc(t('redFlagsH'))}</h2><ul class="notes">${['rf1', 'rf2', 'rf3', 'rf4', 'rf5', 'rf6'].map(k => `<li>${esc(t(k))}</li>`).join('')}</ul></section>
  <section class="card"><h2>${esc(t('sellersH'))}</h2>${shopLinks(q, m.prebuiltSellers[mk()])}<p class="note">${esc(t('sellersSub'))}</p></section>`;
}
function offerRow(o, c) {
  if (!c.ok) return `<li><span class="nm">${esc(o.name || o.seller)}<small>${esc(t('cannotRate'))}</small></span><span class="pr">${eur(o.price)}</span></li>`;
  return `<li><div class="ot">${ring(c.score, 46)}<span class="nm">${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.name || '')}</a>` : esc(o.name || '')}<small>${esc(o.seller || '')} · ${esc(c.cpu.name)} · ${esc(c.gpu.name)}${o.ram || o.ram_gb ? ' · ' + (o.ram || o.ram_gb) + ' GB' : ''}${o.ssd || o.ssd_tb ? ' · ' + (o.ssd || o.ssd_tb) + ' TB' : ''}</small></span><span class="pr">${eur(o.price)}<small>${esc(t('ov_' + c.verdict))}</small></span></div>
   <p class="note">${esc(t('offerVs', { parts: eur(c.parts), lo: eur(c.fair.lo), hi: eur(c.fair.hi) }))}${c.flags.length ? ' ' + c.flags.map(f => esc(t('f_' + f.k, f))).join(' ') : ' ' + esc(t('noFlags'))}</p></li>`;
}

/* ---------- check an offer ---------- */
function viewCheck() {
  const o = S.offer, f = o.fields, c = f ? E.checkOffer(f, mk(), S.pre.use) : null;
  return `<section class="card"><h2>${esc(t('checkH'))}</h2><p class="note">${esc(t('checkSub'))}</p>
   <textarea class="txt" data-set="offer.text" placeholder="${esc(t('pastePh'))}">${esc(o.text)}</textarea>
   <div class="row"><button class="btn pri" data-act="parseOffer">${esc(t('readText'))}</button><label class="btn">${esc(t('readShot'))}<input type="file" accept="image/*" data-act="shotOffer" hidden></label></div>
   ${ui.ocr ? `<p class="note">${esc(ui.ocr)}</p>` : ''}</section>
  ${f ? `<section class="card"><h2>${esc(t('offerFields'))}</h2><div class="grid2">
   ${field(t('p_cpu'), sel('offer.fields.cpu', [['', '–'], ...allCpus()], f.cpu))}${field(t('p_gpu'), sel('offer.fields.gpu', [['', '–'], ...allGpus()], f.gpu))}
   ${field(t('memory'), numIn('offer.fields.ram', 'GB'))}${field(t('ramSpeed'), numIn('offer.fields.ramMts', 'MT/s', 100))}
   ${field(t('storage'), numIn('offer.fields.ssd', 'TB', 0.5))}${field(t('psuW'), numIn('offer.fields.psuW', 'W', 50))}
   ${field(t('psuBrand'), `<span class="box"><input data-set="offer.fields.psuBrand" value="${esc(f.psuBrand || '')}" placeholder="be quiet!, Corsair…"></span>`)}${field(t('chipset'), `<span class="box"><input data-set="offer.fields.chipset" value="${esc(f.chipset || '')}" placeholder="B650, B850, X870…"></span>`)}
   ${field(t('priceAsked'), numIn('offer.fields.price', '€', 10))}${field(t('windows'), sel('offer.fields.os', [[true, t('yes')], [false, t('no')]], f.os))}
   </div><label class="field"><span class="fl">${esc(t('ramSingleQ'))}</span>${sel('offer.fields.ramSingle', [[false, t('twoSticks')], [true, t('oneStick')]], f.ramSingle)}</label></section>
  ${c && c.ok ? `<section class="card hero"><div class="tot"><div><span class="lbl">${esc(t('offerScore'))}</span><b>${esc(t('ov_' + c.verdict))}</b><small>${esc(t('offerVs', { parts: eur(c.parts), lo: eur(c.fair.lo), hi: eur(c.fair.hi) }))}</small></div>${ring(c.score, 62)}</div>
   <ul class="checks">${c.flags.length ? c.flags.map(fl => `<li class="warn"><span>!</span>${esc(t('f_' + fl.k, fl))}</li>`).join('') : `<li class="pass"><span>✓</span>${esc(t('noFlags'))}</li>`}${c.balance ? `<li class="${c.balance.state === 'cpuLimits' ? 'warn' : 'pass'}"><span>${c.balance.state === 'cpuLimits' ? '!' : '✓'}</span>${esc(t('bal_' + c.balance.state, c.balance))}</li>` : ''}</ul>
   <div class="grid2">${field(t('offerName'), `<span class="box"><input data-set="offer.name" value="${esc(o.name)}"></span>`)}${field(t('offerUrl'), `<span class="box"><input type="url" data-set="offer.url" value="${esc(o.url)}"></span>`)}</div>
   <button class="btn" data-act="keepOffer">${esc(t('keepOffer'))}</button></section>` : c ? `<section class="card"><p class="note warn">${esc(t('needFields', { f: c.missing.map(x => t('m_' + x)).join(', ') }))}</p></section>` : ''}` : ''}
  ${S.offers.length ? `<section class="card"><h2>${esc(t('keptOffers'))}</h2><ul class="offers">${S.offers.map(k => { const cc = E.checkOffer(k.fields, mk(), S.pre.use); return cc.ok ? offerRow({ ...k.fields, name: k.name, url: k.url, seller: fmtD(k.at) }, cc).replace('</li>', `<button class="link danger" data-act="dropOffer" data-id="${k.id}">${esc(t('remove'))}</button></li>`) : ''; }).join('')}</ul></section>` : ''}`;
}

/* ---------- SCREENS ---------- */
function screenGpu() {
  const from = S.mon.gpuFrom;
  if (from === 'build') { const b = curBuild(); return { gpu: b.parts.gpu, cpu: b.parts.cpu }; }
  if (from === 'none') return { gpu: null, cpu: null };
  return { gpu: E.byId(from), cpu: null };
}
function saleBanner() { const s = E.nextSale(today(), mk()); return s && (s.ongoing || s.days <= 21) ? `<div class="banner">${esc(s.ongoing ? t('saleOn', { n: t('sale_' + s.id) }) : t('saleIn', { n: t('sale_' + s.id), d: s.days }))} ${esc(t('saleHint'))}</div>` : ''; }
function viewScreens() {
  return `${saleBanner()}${seg('screen', [['monitor', t('sMonitor')], ['tv', t('sTv')], ['calc', t('sCalc')]], S.ui.screen)}${S.ui.screen === 'monitor' ? viewMonitor() : S.ui.screen === 'tv' ? viewTv() : viewCalc()}`;
}
/* ---------- filters shared by the screen and choose lists ---------- */
const arr = (o, k) => Array.isArray(o && o[k]) ? o[k] : [];
const fmtSize = s => (Number.isInteger(Number(s)) ? Number(s) : Number(s).toFixed(1)) + '"';
/* multi-choice chips: "All" clears the list, every other chip toggles its value in it */
const toggles = (path, opts, cur, allLabel) => `<div class="chips" role="group"><button class="chip${cur.length ? '' : ' on'}" data-act="toggle" data-k="${path}" data-v="" aria-pressed="${!cur.length}">${esc(allLabel || t('all'))}</button>${opts.map(([v, l]) => { const on = cur.map(String).includes(String(v)); return `<button class="chip${on ? ' on' : ''}" data-act="toggle" data-k="${path}" data-v="${esc(v)}" aria-pressed="${on}">${esc(l)}</button>`; }).join('')}</div>`;
const fgroup = (label, inner) => `<div class="fg"><span class="fl">${esc(label)}</span>${inner}</div>`;
const brandsOf = list => [...new Set(list.map(i => i.brand))].sort((a, b) => a.localeCompare(b)).map(b => [b, b]);
const sortOpts = withSize => [['score', t('sortScore')], ['priceUp', t('sortPriceUp')], ['priceDown', t('sortPriceDown')], ...(withSize ? [['sizeDown', t('sortSizeDown')]] : [])];
function sortRows(rows, how) {
  const by = { score: (a, b) => b.r.score - a.r.score, priceUp: (a, b) => (a.price || 9e9) - (b.price || 9e9), priceDown: (a, b) => b.price - a.price, sizeDown: (a, b) => (b.size || 0) - (a.size || 0) || b.r.score - a.r.score };
  return rows.sort(by[how] || by.score);
}
/* a ranked list with a count; the first 30 show, the rest behind "Show all" */
function resultsCard(key, rows, render, lookupCat) {
  const all = ui.all === key, shown = all ? rows : rows.slice(0, 30);
  return `<section class="card"><h2>${esc(rows.length === 1 ? t('nMatch1') : t('nMatch', { n: rows.length }))}</h2>
   ${rows.length ? `<ul class="prods">${shown.map(render).join('')}</ul>${rows.length > shown.length ? `<button class="btn" data-act="showAll" data-k="${key}">${esc(t('showAll', { n: rows.length }))}</button>` : ''}` : `<p class="note">${esc(t('noMatch'))}</p><button class="btn" data-act="clearF" data-k="${key}">${esc(t('clearF'))}</button>`}
   <div class="row"><button class="btn" data-act="lookup" data-cat="${lookupCat}"${ui.busy === 'lookup' ? ' disabled' : ''}>${esc(t('notListed'))}</button></div></section>`;
}
/* sizes the person chose for a screen type; [] = any. An older single choice ("size": 32) still counts. */
function sizesOf(o) { if (Array.isArray(o.sizes) && o.sizes.length) return o.sizes.map(Number); return o.size && o.size !== 'any' ? [Number(o.size)] : []; }

function viewMonitor() {
  const M = S.mon, { gpu, cpu } = screenGpu();
  const ctx = { uses: M.uses, staticH: M.staticH, room: M.room, dist: M.dist, gpu, cpu, budget: Number(M.budget) || 0, market: mk() };
  const pool = [...E.items('monitor'), ...(M.withTv ? E.tvMonitors() : [])];
  const f = { sizes: sizesOf(M), res: arr(M, 'res'), hzMin: Number(M.hzMin) || 0, panels: arr(M, 'panels'), brands: arr(M, 'brands'), shape: M.shape || 'any' };
  let rows = pool.filter(m => E.screenFilter(m, f)).map(m => ({ it: m, r: E.monitorScore(m, ctx), size: m.s.size, price: E.price(m, mk()) }));
  if (M.gpuOk && gpu) rows = rows.filter(x => E.fpsAt(gpu, cpu, x.it.s.w, x.it.s.h, 'aaa', 'quality').base >= 60);
  rows = sortRows(rows, M.sort);
  const sizes = [...new Set(pool.map(m => Number(m.s.size)))].sort((a, b) => a - b), classes = E.RES_CLASSES.filter(c => pool.some(m => E.resClass(m.s.w, m.s.h) === c));
  const [lo, hi] = E.monSizesFor(M.dist || 75), nf = f.res.length + f.panels.length + f.brands.length + (f.hzMin ? 1 : 0) + (f.shape !== 'any' ? 1 : 0) + (M.gpuOk ? 1 : 0);
  return `<section class="card"><h2>${esc(t('filtersH'))}</h2>
   ${fgroup(t('sizesH'), toggles('mon.sizes', sizes.map(s => [s, fmtSize(s)]), f.sizes, t('allSizes')))}<p class="note">${esc(t('monSizeHint', { d: M.dist || 75, a: lo, b: hi }))}</p>
   ${fgroup(t('resH'), toggles('mon.res', classes.map(c => [c, t('rc_' + c)]), f.res))}
   ${fgroup(t('hzH'), chips('mon.hzMin', [[0, t('anyHz')], [120, '120+ Hz'], [144, '144+ Hz'], [240, '240+ Hz'], [360, '360+ Hz']], f.hzMin))}
   ${fgroup(t('panelH'), toggles('mon.panels', ['oled', 'miniled', 'ips', 'va', 'tn'].map(p => [p, t('pg_' + p)]), f.panels))}
   ${fgroup(t('shapeH'), chips('mon.shape', [['any', t('any')], ['flat', t('flat')], ['curved', t('curved')]], f.shape))}
   ${fgroup(t('moreH'), chips('mon.withTv', [[false, t('monOnly')], [true, t('withTv')]], !!M.withTv) + (gpu ? chips('mon.gpuOk', [[false, t('anyCard')], [true, t('gpuOk', { g: gpu.name })]], !!M.gpuOk) : ''))}
   <details class="more"${f.brands.length ? ' open' : ''}><summary>${esc(t('brandH'))}${f.brands.length ? ` (${f.brands.length})` : ''}</summary>${toggles('mon.brands', brandsOf(pool), f.brands)}</details>
   <div class="grid2">${field(t('budgetOpt'), numIn('mon.budget', '€', 50))}${field(t('sortH'), sel('mon.sort', sortOpts(true), M.sort || 'score'))}</div>
   ${nf || f.sizes.length ? `<button class="link" data-act="clearF" data-k="monitor">${esc(t('clearF'))}</button>` : ''}</section>
  <details class="card uses"${S.ui.usesOpen ? ' open' : ''}><summary><h2>${esc(t('monUses'))}</h2></summary>
   ${['aaa', 'comp', 'work', 'movies', 'creative'].map(k => level('mon.uses.' + k, t('mu_' + k))).join('')}
   <div class="grid2">${field(t('distance'), numIn('mon.dist', 'cm', 5))}${field(t('staticH'), numIn('mon.staticH', 'h', 0.5), t('staticHint'))}
   ${field(t('room'), sel('mon.room', [['dark', t('roomDark')], ['mixed', t('roomMixed')], ['bright', t('roomBright')]], M.room))}${field(t('gpuFor'), sel('mon.gpuFrom', [['build', t('fromBuild')], ['none', t('noGpu')], ...E.items('gpu').map(g => [g.id, g.name])], M.gpuFrom))}</div></details>
  ${resultsCard('monitor', rows, (x, i) => { const need = E.gpuNeed(x.it, cpu, 90, mk()); return prodRow(x.it, x.r, i, `${specLine(x.it)} · ${need ? t('needLine', { g: need.name.replace(/GeForce |Radeon /, '') }) : t('needNoneShort')}`); }, 'monitor')}`;
}
function prodRow(it, r, i, line, priceText) {
  const tm = E.timing(it, today(), mk()), lasting = tm.reasons.some(r => r.k === 'launchSoon' || r.k === 'shortage');   // the coming sale shows once, above the list
  return `<li data-act="detail" data-id="${it.id}"><div class="ot">${ring(r.score, 46)}<span class="nm"><b>${i + 1}. ${esc(full(it))}</b><small>${esc(line)}</small>${r.why && r.why.length ? `<small class="why">${r.why.slice(0, 3).map(w => esc(reasonText(w))).join(' · ')}</small>` : ''}</span><span class="pr">${priceText || eur(r.price)}${conf(it)}${tm.verdict !== 'buy' && lasting ? `<small class="tm ${tm.verdict}">${esc(t('v_' + tm.verdict))}</small>` : ''}</span></div></li>`;
}
/* other sizes a TV comes in within the choice, so the person sees the whole range they allowed */
const tvSizesLine = (tv, picked) => { const s = E.sizesOf(tv, mk()).filter(x => !picked.length || picked.includes(x)); return s.length > 1 ? `${s.map(x => x + '"').join('/')} · ` : ''; };
function viewTv() {
  const T = S.tv, picked = sizesOf(T), want = E.tvSizeFor(T.dist);
  const ctx = { uses: T.uses, staticH: T.staticH, room: T.room, dist: T.dist, budget: Number(T.budget) || 0, market: mk(), sizes: picked };
  const f = { panels: arr(T, 'panels'), brands: arr(T, 'brands'), hzMin: Number(T.hzMin) || 0 }, pool = E.items('tv');
  let rows = pool.filter(tv => E.screenFilter(tv, f) && (!T.hdmiMin || tv.s.hdmi21 >= T.hdmiMin) && (!T.dv || tv.s.dv)).map(tv => { const r = E.tvScore(tv, ctx); return { it: tv, r, size: r.size, price: r.price }; }).filter(x => !x.r.excluded);
  rows = sortRows(rows, T.sort);
  const sizes = E.sizeOptions('tv', mk()), nf = f.panels.length + f.brands.length + (f.hzMin ? 1 : 0) + (T.hdmiMin ? 1 : 0) + (T.dv ? 1 : 0);
  return `<section class="card"><h2>${esc(t('filtersH'))}</h2>
   ${fgroup(t('sizesH'), toggles('tv.sizes', sizes.map(s => [s, fmtSize(s)]), picked, t('allSizes')))}<p class="note">${esc(t('tvWant', { s: want, d: T.dist }))}</p>
   ${fgroup(t('panelH'), toggles('tv.panels', ['oled', 'miniled', 'led'].map(p => [p, t('pg_' + p)]), f.panels))}
   ${fgroup(t('hzH'), chips('tv.hzMin', [[0, t('anyHz')], [120, '120+ Hz'], [144, '144+ Hz']], f.hzMin))}
   ${fgroup(t('hdmiH'), chips('tv.hdmiMin', [[0, t('any')], [2, '2+'], [4, '4']], Number(T.hdmiMin) || 0))}
   ${fgroup(t('dvH'), chips('tv.dv', [[false, t('any')], [true, t('dvReq')]], !!T.dv))}
   <details class="more"${f.brands.length ? ' open' : ''}><summary>${esc(t('brandH'))}${f.brands.length ? ` (${f.brands.length})` : ''}</summary>${toggles('tv.brands', brandsOf(pool), f.brands)}</details>
   <div class="grid2">${field(t('budgetOpt'), numIn('tv.budget', '€', 50))}${field(t('sortH'), sel('tv.sort', sortOpts(true), T.sort || 'score'))}</div>
   ${nf || picked.length ? `<button class="link" data-act="clearF" data-k="tv">${esc(t('clearF'))}</button>` : ''}</section>
  <details class="card uses"${S.ui.usesOpen ? ' open' : ''}><summary><h2>${esc(t('tvUses'))}</h2></summary>
   ${['movies', 'sport', 'gaming', 'tv'].map(k => level('tv.uses.' + k, t('tu_' + k))).join('')}
   <div class="grid2">${field(t('seatDist'), numIn('tv.dist', 'cm', 10))}${field(t('room'), sel('tv.room', [['dark', t('roomDark')], ['mixed', t('roomMixed')], ['bright', t('roomBright')]], T.room))}
   ${field(t('tickerH'), numIn('tv.staticH', 'h', 0.5), t('tickerHint'))}</div></details>
  ${resultsCard('tv', rows, (x, i) => prodRow(x.it, x.r, i, `${x.r.size ? x.r.size + '" · ' : ''}${tvSizesLine(x.it, picked)}${specLine(x.it)}`, eur(x.r.price)), 'tv')}`;
}
function viewCalc() {
  const c = S.calc || (S.calc = { size: 32, res: '3840x2160', hz: 240, dist: 75 }), [w, h] = c.res.split('x').map(Number);
  const p = E.ppi(c.size, w, h), d = E.ppd(p, c.dist), fv = E.fovH(c.size, w, h, c.dist), need = E.needGbps(w, h, c.hz);
  const fit = Object.entries(E.LINKS).map(([k, v]) => [k, need <= v ? 'native' : need <= v * 3 ? 'dsc' : 'no']);
  return `<section class="card"><h2>${esc(t('calcH'))}</h2><div class="grid2">
   ${field(t('screenSize'), numIn('calc.size', '"', 0.5))}${field(t('resolution'), sel('calc.res', [['1920x1080', '1080p'], ['2560x1440', '1440p'], ['3440x1440', '3440×1440'], ['3840x2160', '4K'], ['5120x2160', '5K2K'], ['7680x4320', '8K']], c.res))}
   ${field(t('refresh'), numIn('calc.hz', 'Hz', 1))}${field(t('distance'), numIn('calc.dist', 'cm', 5))}</div>
   <ul class="mini"><li><span>PPI</span><b>${Math.round(p)}</b></li><li><span>${esc(t('ppd'))}</span><b>${Math.round(d)} ${esc(d >= 60 ? t('ppdRetina') : d >= 45 ? t('ppdSharp') : t('ppdSoft'))}</b></li><li><span>${esc(t('fov'))}</span><b>${Math.round(fv)}°</b></li><li><span>${esc(t('dataRate'))}</span><b>${need.toFixed(1)} Gbit/s</b></li></ul>
   <ul class="checks">${fit.map(([k, m]) => `<li class="${m === 'native' ? 'pass' : m === 'dsc' ? 'warn' : 'fail'}"><span>${m === 'native' ? '✓' : m === 'dsc' ? '!' : '✕'}</span>${esc({ dp14: 'DisplayPort 1.4', uhbr10: 'DP 2.1 UHBR10', 'uhbr13.5': 'DP 2.1 UHBR13.5', uhbr20: 'DP 2.1 UHBR20', hdmi21: 'HDMI 2.1' }[k])}: ${esc(t('sig_' + m))}</li>`).join('')}</ul>
   <p class="note">${esc(t('calcNote'))}</p></section>`;
}

/* ---------- CHOOSE ---------- */
const CHOOSE = ['phone', 'headphones', 'soundbar', 'laptop', 'tablet', 'watch', 'console', 'projector'];
/* size bands, types and systems each category can be filtered by */
const BANDS = {
  phone: [['compact', it => it.s.screen <= 6.2 && !it.s.fold], ['standard', it => it.s.screen > 6.2 && it.s.screen < 6.7 && !it.s.fold], ['large', it => it.s.screen >= 6.7 && !it.s.fold], ['fold', it => !!it.s.fold]],
  laptop: [['l13', it => it.s.screen <= 14.2], ['l15', it => it.s.screen > 14.2 && it.s.screen < 17], ['l17', it => it.s.screen >= 17]],
  tablet: [['tmini', it => it.s.screen <= 9], ['t11', it => it.s.screen > 9 && it.s.screen < 12], ['t12', it => it.s.screen >= 12]]
};
const TYPES = { headphones: ['over', 'in', 'gaming'], console: ['home', 'handheld', 'hybrid'], projector: ['ust', 'standard', 'portable'] };
const SYSTEMS = { phone: ['iOS', 'Android'], laptop: ['macOS', 'Windows'], tablet: ['iPadOS', 'Android', 'Windows'], watch: ['watchOS', 'Wear OS', 'Garmin', 'HarmonyOS', 'Withings'] };
function viewChoose() {
  const C = S.choose, cat = CHOOSE.includes(C.cat) ? C.cat : 'phone', crit = E.CRIT[cat], prefs = C.prefs[cat] || (C.prefs[cat] = Object.fromEntries(crit.map(k => [k, k === 'value' ? 1 : 2])));
  const F = (C.f = C.f || {})[cat] || (C.f[cat] = {}), eco = E.ecosystems(S.gear), budget = Number((C.budget || {})[cat]) || 0, pool = E.items(cat);
  const bands = arr(F, 'size'), types = arr(F, 'type'), systems = arr(F, 'os'), brands = arr(F, 'brands');
  let rows = pool.filter(it => (!bands.length || (BANDS[cat] || []).some(([k, fn]) => bands.includes(k) && fn(it))) && (!types.length || types.includes(it.s.type)) && (!systems.length || systems.includes(it.s.os)) && (!brands.length || brands.includes(it.brand)))
    .map(it => ({ it, r: E.scoreProduct(it, prefs, { budget, market: mk(), eco }), price: E.price(it, mk()), size: it.s.screen || it.s.maxIn || 0 }));
  rows = sortRows(rows, F.sort || 'score');
  const nf = bands.length + types.length + systems.length + brands.length;
  return `${saleBanner()}<div class="catbar">${CHOOSE.map(c => `<button class="chip${c === cat ? ' on' : ''}" data-act="set" data-k="choose.cat" data-v="${c}">${esc(t('cat_' + c))}</button>`).join('')}<button class="chip ghost" data-act="go" data-v="screens">${esc(t('cat_monitor'))} / TV →</button><button class="chip ghost" data-act="go" data-v="build">PC →</button></div>
  <section class="card"><h2>${esc(t('filtersH'))}</h2>
   ${BANDS[cat] ? fgroup(t('sizeH'), toggles(`choose.f.${cat}.size`, BANDS[cat].map(([k]) => [k, t('sb_' + k)]), bands)) : ''}
   ${TYPES[cat] ? fgroup(t('typeH'), toggles(`choose.f.${cat}.type`, TYPES[cat].map(k => [k, t('ty_' + k)]), types)) : ''}
   ${SYSTEMS[cat] ? fgroup(t('system'), toggles(`choose.f.${cat}.os`, SYSTEMS[cat].map(k => [k, k]), systems)) : ''}
   <details class="more"${brands.length ? ' open' : ''}><summary>${esc(t('brandH'))}${brands.length ? ` (${brands.length})` : ''}</summary>${toggles(`choose.f.${cat}.brands`, brandsOf(pool), brands)}</details>
   <div class="grid2">${field(t('budgetOpt'), `<span class="box"><input type="number" min="0" step="50" data-set="choose.budget.${cat}" data-type="num" value="${budget || ''}"><span class="unit">€</span></span>`)}${field(t('sortH'), sel(`choose.f.${cat}.sort`, sortOpts(cat === 'phone' || cat === 'laptop' || cat === 'tablet' || cat === 'projector'), F.sort || 'score'))}</div>
   ${nf ? `<button class="link" data-act="clearF" data-k="choose">${esc(t('clearF'))}</button>` : ''}</section>
  <details class="card uses"${S.ui.usesOpen ? ' open' : ''}><summary><h2>${esc(t('whatMatters'))}</h2></summary>${crit.map(k => level(`choose.prefs.${cat}.${k}`, t('cr_' + k))).join('')}
   ${eco.length ? `<p class="note">${esc(t('ecoNote', { e: eco.map(e => t('eco_' + e)).join(', ') }))}</p>` : ''}</details>
  ${resultsCard('choose', rows, (x, i) => prodRow(x.it, x.r, i, specLine(x.it)), cat)}`;
}
function sheetDetail(id) {
  const it = E.byId(id); if (!it) return '';
  const p = E.priceOf(it, mk()), tm = E.timing(it, today(), mk()), m = E.market(), pr = m.pressure[it.cat];
  let extra = '';
  if (it.cat === 'monitor') {
    const { gpu, cpu } = screenGpu(), sig = E.signal(it, gpu), pp = E.ppi(it.s.size, it.s.w, it.s.h), d = E.ppd(pp, S.mon.dist), fv = E.fovH(it.s.size, it.s.w, it.s.h, S.mon.dist), br = E.burnRisk(it.s.panel, S.mon.staticH, it.s.bw);
    const fq = gpu ? E.fpsAt(gpu, cpu, it.s.w, it.s.h, 'aaa', 'quality', 'off') : null, f4 = gpu ? E.fpsAt(gpu, cpu, it.s.w, it.s.h, 'aaa', 'quality', gpu.s.mfg ? 'x4' : 'x2') : null, need = E.gpuNeed(it, cpu, 90, mk());
    extra = `<ul class="mini"><li><span>${esc(t('signal'))}</span><b>${esc(t('sig_' + sig.mode))} (${sig.need} / ${sig.link} Gbit/s, ${sig.via})</b></li><li><span>PPI · ${esc(t('ppd'))}</span><b>${Math.round(pp)} · ${Math.round(d)}</b></li><li><span>${esc(t('fov'))}</span><b>${Math.round(fv)}° ${esc(t('atDist', { d: S.mon.dist }))}</b></li>
     ${gpu ? `<li><span>${esc(gpu.name)}</span><b>${esc(t('fpsAt', { a: fq.base, b: f4.shown, hz: it.s.hz }))}</b></li>` : ''}<li><span>${esc(t('cardNeed'))}</span><b>${esc(need ? t('needFor', { f: 90, g: need.name }) : t('needNone', { f: 90 }))}</b></li><li><span>${esc(t('burn'))}</span><b>${esc(t('burn_' + br.level))}${it.s.bw ? ' · ' + esc(t('burnCover', { y: it.s.bw })) : ''}</b></li></ul>
     ${sig.mode === 'dsc' ? `<p class="note">${esc(t('dscNote'))}</p>` : ''}`;
  }
  const crit = E.CRIT[it.cat];
  return `<h2>${esc(full(it))}</h2><p class="note">${esc(specLine(it))}</p>
   <p class="big">${it.cat === 'tv' ? E.sizesOf(it, mk()).map(s => `${s}" ${eur(E.price(it, mk(), s))}`).join(' · ') : eur(p && p.v)} ${conf(it)}</p>
   ${extra}
   ${crit && it.r ? `<div class="bars">${crit.map(k => `<div><span>${esc(t('cr_' + k))}</span><i style="width:${it.r[k] * 10}%"></i><b>${it.r[k]}</b></div>`).join('')}</div>` : ''}
   <p>${verdictPill(tm.verdict)} ${tm.reasons.map(r => esc(reasonText(r))).join(' ')}</p>${pr && pr.note ? `<p class="note">${esc(pr.note)}</p>` : ''}
   ${it.note ? `<p class="note">${esc(it.note)}</p>` : ''}
   <div class="row"><button class="btn" data-act="watchAdd" data-id="${it.id}">${esc(t('addWatch'))}</button><button class="btn" data-act="gearNew" data-id="${it.id}">${esc(t('iOwnIt'))}</button><button class="btn" data-act="askPrice" data-id="${it.id}">${esc(t('pricesClaude'))}</button></div>
   ${shopLinks(full(it).replace(/\(.*?\)/g, ''))}${srcLinks(it)}`;
}

/* ---------- GEAR ---------- */
function viewGear() {
  const sub = S.ui.gear, s = E.nextSale(today(), mk());
  return `${s ? `<div class="banner">${esc(s.ongoing ? t('saleOn', { n: t('sale_' + s.id) }) : t('saleIn', { n: t('sale_' + s.id), d: s.days }))}</div>` : ''}
  ${seg('gear', [['mine', t('gMine')], ['watch', t('gWatch')], ['builds', t('gBuilds')]], sub)}${sub === 'mine' ? viewMine() : sub === 'watch' ? viewWatch() : viewBuilds()}`;
}
function viewMine() {
  const G = S.gear, tot = G.reduce((a, g) => a + E.valueNow(g, today()), 0);
  return `<section class="card"><div class="tot"><div><span class="lbl">${esc(t('gearValue'))}</span><b>${eur(tot)}</b><small>${esc(t(G.length === 1 ? 'gearCount1' : 'gearCount', { n: G.length }))}</small></div></div><button class="btn pri" data-act="gearNew">${esc(t('addGear'))}</button></section>
  ${G.length ? `<section class="card"><ul class="gear">${G.map(g => { const w = E.warranty(g, today()), v = E.valueNow(g, today()), up = E.upgradeCheck(g, mk()); return `<li><div class="gh"><b>${esc(g.name)}</b><span>${eur(v)}<small>${esc(t('paid', { p: eur(g.price) }))}</small></span></div>
    <p class="wty ${w.stage}">${esc(t('w_' + w.stage, { d: fmtD(w.stage === 'presume' ? w.presEnd : w.stage === 'legal' ? w.legalEnd : w.makerEnd) }))}</p>
    ${up && up.best ? `<p class="note">${esc(up.worth ? t('upWorth', { n: up.best.name, g: up.gain, p: eur(up.price) }) : t('upNot', { n: up.best.name, g: up.gain }))}</p>` : ''}
    <div class="row"><button class="link" data-act="gearEdit" data-id="${g.id}">${esc(t('edit'))}</button><button class="link danger" data-act="gearDel" data-id="${g.id}">${esc(t('remove'))}</button></div></li>`; }).join('')}</ul></section>` : `<section class="card"><p class="note">${esc(t('gearEmpty'))}</p></section>`}
  <section class="card"><h2>${esc(t('rightsH'))}</h2><p class="note">${esc(t('rights_' + mk()))}</p></section>`;
}
function sheetGear(g) {
  const cats = ['gpu', 'cpu', 'pc', 'monitor', 'tv', 'soundbar', 'phone', 'headphones', 'laptop', 'tablet', 'watch', 'console', 'projector', 'other'];
  const opts = E.items(g.cat === 'pc' ? 'none' : g.cat).map(i => [i.id, full(i)]);
  return `<h2>${esc(g._new ? t('addGear') : t('edit'))}</h2><form class="stack" data-form="gear" data-id="${g.id}">
   ${field(t('category'), `<span class="box"><select name="cat">${cats.map(c => `<option value="${c}"${g.cat === c ? ' selected' : ''}>${esc(t('cat_' + c))}</option>`).join('')}</select></span>`)}
   ${opts.length ? field(t('fromList'), `<span class="box"><select name="catId"><option value="">${esc(t('notInList'))}</option>${opts.map(([v, l]) => `<option value="${v}"${g.catId === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></span>`) : ''}
   ${field(t('name'), `<span class="box"><input name="name" required value="${esc(g.name || '')}" placeholder="LG C3 65&quot;"></span>`)}
   <div class="grid2">${field(t('bought'), `<span class="box"><input type="date" name="bought" required value="${esc(g.bought || new Date().toISOString().slice(0, 10))}"></span>`)}${field(t('pricePaid'), `<span class="box"><input type="number" name="price" min="0" step="1" value="${esc(g.price || '')}"><span class="unit">€</span></span>`)}
   ${field(t('boughtIn'), `<span class="box"><select name="market"><option value="DE"${g.market !== 'FR' ? ' selected' : ''}>${esc(t('mk_DE'))}</option><option value="FR"${g.market === 'FR' ? ' selected' : ''}>${esc(t('mk_FR'))}</option></select></span>`)}${field(t('makerM'), `<span class="box"><input type="number" name="makerM" min="0" step="1" value="${esc(g.makerM || '')}"><span class="unit">${esc(t('months'))}</span></span>`)}</div>
   <label class="check"><input type="checkbox" name="used"${g.used ? ' checked' : ''}> ${esc(t('boughtUsed'))}</label>
   <div class="row"><button class="btn pri" type="submit">${esc(t('save'))}</button><button class="btn" type="button" data-act="close">${esc(t('cancel'))}</button></div></form>`;
}
function viewWatch() {
  const W = S.watch;
  return W.length ? `<section class="card"><ul class="gear">${W.map(w => { const it = E.byId(w.catId), cur = it ? E.price(it, mk()) : null, last = w.log && w.log.length ? w.log[w.log.length - 1] : null, tm = E.timing(it || { cat: w.cat }, today(), mk(), { target: w.target, last: last && last.p }); return `<li><div class="gh"><b>${esc(w.name)}</b><span>${eur(last ? last.p : cur)}<small>${esc(last ? t('logged', { d: fmtD(last.d), s: last.shop || '' }) : t('guide'))}</small></span></div>
    <div class="grid2">${field(t('target'), `<span class="box"><input type="number" min="0" step="10" data-set-watch="${w.id}" value="${esc(w.target || '')}"><span class="unit">€</span></span>`)}<div>${verdictPill(tm.verdict)}<p class="note">${tm.reasons.map(r => esc(reasonText(r))).join(' ')}</p></div></div>
    ${w.log && w.log.length > 1 ? `<p class="note">${w.log.slice(-6).map(l => `${fmtD(l.d)}: ${eur(l.p)}`).join(' · ')}</p>` : ''}
    <div class="row"><button class="link" data-act="logPrice" data-id="${w.id}">${esc(t('logPrice'))}</button><label class="link">${esc(t('priceShot'))}<input type="file" accept="image/*" data-act="shotPrice" data-id="${w.id}" hidden></label>${it ? `<button class="link" data-act="askPrice" data-id="${it.id}" data-w="${w.id}">${esc(t('pricesClaude'))}</button>` : ''}<button class="link danger" data-act="watchDel" data-id="${w.id}">${esc(t('remove'))}</button></div>
    ${shopLinks(w.name, (E.market().shops[mk()] || []).filter(s => s.k === 'compare'))}</li>`; }).join('')}</ul></section>` : `<section class="card"><p class="note">${esc(t('watchEmpty'))}</p></section>`;
}
function viewBuilds() {
  return S.builds.length ? `<section class="card"><ul class="gear">${S.builds.map(b => `<li><div class="gh"><b>${esc(b.name)}</b><span>${eur(b.total)}<small>${esc(fmtD(b.at))}</small></span></div><p class="note">${Object.values(b.parts).map(id => E.byId(id) ? E.byId(id).name : id).join(' · ')}</p><div class="row"><button class="link" data-act="openBuild" data-id="${b.id}">${esc(t('open'))}</button><button class="link danger" data-act="buildDel" data-id="${b.id}">${esc(t('remove'))}</button></div></li>`).join('')}</ul></section>` : `<section class="card"><p class="note">${esc(t('buildsEmpty'))}</p></section>`;
}

/* ---------- PULSE ---------- */
function viewPulse() {
  return `${seg('pulse', [['news', t('pNews')], ['ranks', t('pRanks')], ['market', t('pMarket')]], S.ui.pulse)}${S.ui.pulse === 'news' ? viewNews() : S.ui.pulse === 'ranks' ? viewRanks() : viewMarket()}`;
}
function myWords() {
  const b = curBuild(), names = [...S.gear.map(g => g.name), ...S.watch.map(w => w.name), b.parts.gpu.name, b.parts.cpu.name];
  return E.watchWords(names);
}
function viewNews() {
  const words = myWords(), topic = S.ui.topic, all = E.newsFor(NEWS.items, words).filter(n => topic === 'all' || (topic === 'mine' ? n.mine : n.t === topic));
  return `<div class="catbar">${[['all', t('all')], ['mine', t('mine')], ['pc', 'PC'], ['display', t('t_display')], ['phone', t('cat_phone')], ['audio', t('t_audio')], ['laptop', t('t_laptop')], ['deal', t('t_deal')]].map(([v, l]) => `<button class="chip${topic === v ? ' on' : ''}" data-act="ui" data-k="topic" data-v="${v}">${esc(l)}</button>`).join('')}</div>
  ${words.length ? `<p class="note">${esc(t('newsWords', { w: words.slice(0, 8).join(', ') }))}</p>` : ''}
  <section class="card">${all.length ? `<ul class="news">${all.slice(0, 60).map(n => `<li class="${n.mine ? 'mine' : ''}"><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a><small>${esc(n.src)} · ${esc(fmtD(n.date))}${n.mine ? ' · ' + esc(t('aboutYours', { w: n.hit.join(', ') })) : ''}</small></li>`).join('')}</ul>` : `<p class="note">${esc(NEWS.at ? t('newsNone') : t('newsFirst'))}</p>`}
  ${NEWS.at ? `<p class="note muted">${esc(t('newsAt', { d: fmtD(NEWS.at) }))}</p>` : ''}</section>`;
}
function viewRanks() {
  const gp = E.items('gpu').map(g => ({ g, p: E.price(g, mk()) })).sort((a, b) => b.g.s.perf4k - a.g.s.perf4k), maxP = Math.max(...gp.map(x => x.g.s.perf4k));
  const cp = E.items('cpu').sort((a, b) => b.s.game - a.s.game);
  const valueBest = gp.filter(x => x.g.s.vram >= 16 && x.g.s.perf4k >= 70).sort((a, b) => b.g.s.perf4k / b.p - a.g.s.perf4k / a.p)[0];
  return `<section class="card"><h2>${esc(t('gpuRank'))}</h2><div class="bars rank">${gp.map(({ g, p }) => `<div data-act="detailPart" data-id="${g.id}"><span>${esc(g.name.replace('GeForce ', '').replace('Radeon ', ''))}</span><i style="width:${g.s.perf4k / maxP * 100}%"></i><b>${g.s.perf4k}</b><em>${eur(p)} · ${(p / g.s.perf4k).toFixed(1)} €/pt</em></div>`).join('')}</div>
   <p class="note">${esc(t('valueBest', { n: valueBest.g.name }))}</p><p class="note muted">${esc(t('rankSrc'))}</p></section>
  <section class="card"><h2>${esc(t('cpuRank'))}</h2><div class="bars rank">${cp.map(c => `<div><span>${esc(c.name.replace('Ryzen ', '').replace('Core ', ''))}</span><i style="width:${c.s.game}%"></i><b>${c.s.game}</b><em>${eur(E.price(c, mk()))} · ${t('multi')} ${c.s.multi}</em></div>`).join('')}</div></section>`;
}
function viewMarket() {
  const m = E.market(), s = E.nextSale(today(), mk()), lv = ['calm', 'firm', 'high', 'shortage'];
  return `<section class="card"><h2>${esc(t('pressureH'))}</h2><ul class="press">${Object.entries(m.pressure).map(([k, p]) => `<li><span class="lv l${p.level}">${esc(t('pl_' + lv[p.level]))}</span><b>${esc(t('cat_' + k))}</b>${p.note ? `<small>${esc(p.note)}${p.src && m.sources[p.src] ? ` <a href="${esc(m.sources[p.src])}" target="_blank" rel="noopener">↗</a>` : ''}</small>` : ''}</li>`).join('')}</ul></section>
  <section class="card"><h2>${esc(t('salesH'))}</h2><ul class="mini">${[...E.saleDates(today().getFullYear(), mk()), ...E.saleDates(today().getFullYear() + 1, mk())].filter(x => x.end >= today()).slice(0, 5).map(x => `<li><span>${esc(t('sale_' + x.id))}</span><b>${esc(fmtD(x.start))}${x.approx ? ' ' + esc(t('approx')) : ''}</b></li>`).join('')}</ul>${s && !s.ongoing && s.days <= 14 ? `<p class="note warn">${esc(t('saleIn', { n: t('sale_' + s.id), d: s.days }))}</p>` : ''}</section>
  <section class="card"><h2>${esc(t('dataH'))}</h2><p class="note">${esc(t('dataSub', { d: fmtD(m.asOf), n: E.items().length }))}</p><ul class="notes">${(m.changelog || []).map(c => `<li><b>${esc(fmtD(c.date))}</b> ${esc(c.summary)}</li>`).join('')}</ul></section>`;
}

/* ---------- PROFILE ---------- */
function sheetProfile() {
  const p = S.prof, sn = readSafetyNet(p.market), on = window.Cloud && window.Cloud.configured();
  return `<h2>${esc(t('profile'))}</h2>
  <div class="grid2">${field(t('market'), sel('prof.market', [['DE', t('mk_DE')], ['FR', t('mk_FR')]], p.market))}${field(t('language'), sel('prof.lang', LANGS.map(l => [l, l === 'fr' ? 'Français' : 'English']), p.lang))}</div>
  <h3>${esc(t('finH'))}</h3><p class="note">${esc(sn ? t('snFound', { c: sn.country }) : t('snNone'))}</p>
  ${chips('prof.finSrc', [['auto', t('finAuto')], ['manual', t('finManualOpt')]], p.finSrc)}
  ${p.finSrc === 'manual' || !sn ? `<div class="grid2">${field(t('fNet'), numIn('prof.fin.net', '€/mo', 50))}${field(t('fEss'), numIn('prof.fin.essential', '€/mo', 50))}${field(t('fSav'), numIn('prof.fin.savings', '€', 100))}${field(t('fPlan'), numIn('prof.fin.plan', '€/mo', 25))}</div>` : ''}
  <h3>${esc(t('syncH'))}</h3><p class="note">${esc(on ? (ui.session ? t('syncOn', { e: ui.session }) : t('syncOff')) : t('syncNone'))}</p>${on ? `<button class="btn" data-act="sync">${esc(ui.session ? t('syncManage') : t('syncSign'))}</button>` : ''}
  <h3>${esc(t('ideasH'))}</h3><p class="note">${esc(t('ideasSub'))}</p><label class="field"><span class="box"><input type="url" data-act="inbox" value="${esc(S.inbox || '')}" placeholder="https://docs.google.com/…"></span></label>${S.inbox ? `<p><a href="${esc(S.inbox)}" target="_blank" rel="noopener">${esc(t('ideasOpen'))}</a></p>` : ''}
  <h3>${esc(t('dataYours'))}</h3><div class="row"><button class="btn" data-act="export">${esc(t('export'))}</button><label class="btn">${esc(t('import'))}<input type="file" accept="application/json" data-act="import" hidden></label><button class="btn danger" data-act="reset">${esc(t('resetAll'))}</button></div>
  <p class="note muted">${esc(t('about'))}</p><div class="row"><button class="btn" data-act="close">${esc(t('close'))}</button></div>`;
}

/* ---------- shell ---------- */
const TABS = [['build', 'tBuild', 'M4 6h16v10H4zM8 20h8M12 16v4'], ['screens', 'tScreens', 'M3 5h18v12H3zM8 21h8'], ['choose', 'tChoose', 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z'], ['gear', 'tGear', 'M4 7h16v13H4zM9 7V4h6v3'], ['pulse', 'tPulse', 'M3 12h4l3-7 4 14 3-7h4']];
export function render() {
  document.documentElement.lang = S.prof.lang;
  $('#sub').textContent = t('tagline') + ' · ' + mk();
  const tab = S.ui.tab;
  $('#main').innerHTML = tab === 'build' ? viewBuild() : tab === 'screens' ? viewScreens() : tab === 'choose' ? viewChoose() : tab === 'gear' ? viewGear() : viewPulse();
  $('#tabs').innerHTML = TABS.map(([k, l, d]) => `<button class="${tab === k ? 'on' : ''}" data-act="go" data-v="${k}" aria-current="${tab === k ? 'page' : 'false'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg><span>${esc(t(l))}</span></button>`).join('');
  $('#prof-btn').setAttribute('aria-label', t('profile'));
}
function openSheet(html) { const d = $('#sheet'); d.innerHTML = `<div class="sheet-in">${html}</div>`; if (!d.open) d.showModal(); }
const closeSheet = () => { const d = $('#sheet'); if (d.open) d.close(); };
let sheetFn = null;                                       // re-renders an open sheet after a change made inside it
function rerender() { render(); if (sheetFn && $('#sheet').open) { const sc = $('#sheet').scrollTop; openSheet(sheetFn()); $('#sheet').scrollTop = sc; } }

/* Claude handoffs */
async function ask(task, input, title) {
  if (!window.Ask) { toast(t('askMissing')); return null; }
  try { return await window.Ask.run(task, input, { title }); } catch (e) { if (e && e.code !== 'cancelled') toast(e.message || t('askFail')); return null; }
}
async function findPrebuilts() {
  const f = S.pre, g = E.byId(f.gpuMin); ui.busy = 'findPre'; render();
  const r = await ask('prebuilt_find', { market: mk(), filters: { ...f, gpuMin: g ? g.name : '' } }, t('findWithClaude'));
  ui.busy = '';
  if (r && Array.isArray(r.items)) {
    S.found = { at: new Date().toISOString(), market: mk(), note: r.note || '', items: r.items.map(o => ({ seller: o.seller, name: o.name, url: o.url, price: o.price, cpu: (E.matchPart(o.cpu, 'cpu') || {}).id || o.cpu, gpu: (E.matchPart(o.gpu, 'gpu') || {}).id || o.gpu, ram: o.ram_gb, ramMts: o.ram_mts, ramSingle: o.ram_sticks === 1, ssd: o.ssd_tb, psuW: Number((String(o.psu || '').match(/(\d{3,4})\s?W/i) || [])[1]) || null, psuBrand: /be ?quiet|corsair|seasonic|msi|thermaltake|cooler ?master|gigabyte|asus|lian ?li|nzxt|fractal|super ?flower|fsp|xpg|phanteks|montech|endorfy|silverstone/i.test(o.psu || '') ? 'yes' : null, chipset: (String(o.board || '').match(/X870E?|B850|B650E?|A620|B860|Z890|H810/i) || [null])[0], os: o.os !== false })) };
    save();
  }
  render();
}
async function lookup(cat) {
  const name = prompt(t('lookupPrompt')); if (!name) return;
  ui.busy = 'lookup'; render();
  const r = await ask('tech_lookup', { name, cat, market: mk() }, t('notListed'));
  ui.busy = '';
  if (r && r.found) {
    const id = 'x-' + uid(), rr = Object.fromEntries((r.scores || []).map(s => [s.k, Math.max(1, Math.min(10, Number(s.v) || 5))]));
    const it = { id, cat: r.cat || cat, brand: r.brand || '', name: r.name || name, yr: r.year || null, p: { de: r.price_de || 0, ...(r.price_fr ? { fr: r.price_fr } : {}) }, pd: new Date().toISOString().slice(0, 7), conf: r.confidence === 'high' ? 'M' : 'L', src: [], s: { eco: r.eco || 'none', ...(r.perf4k ? { perf4k: r.perf4k } : {}), ...(r.game ? { game: r.game } : {}), specs: r.specs || [] }, r: rr, note: r.note || '', custom: true };
    S.custom.push(it); save(); window.dispatchEvent(new CustomEvent('prisme:custom'));
    toast(t('added', { n: it.name }));
  } else if (r) toast(r.note || t('notFound'));
  render();
}
async function askPrice(id, wid) {
  const it = E.byId(id); if (!it) return;
  const r = await ask('tech_prices', { name: full(it), market: mk() }, t('pricesClaude'));
  if (!r || !(r.low > 0)) { if (r) toast(t('noPrice')); return; }
  let w = wid ? S.watch.find(x => x.id === wid) : S.watch.find(x => x.catId === id);
  if (!w) { w = { id: uid(), catId: id, name: full(it), cat: it.cat, target: null, log: [], added: new Date().toISOString() }; S.watch.push(w); }
  w.log.push({ d: new Date().toISOString(), p: r.low, shop: r.shop || '' }); save();
  toast(t('priceLogged', { p: eur(r.low), s: r.shop || '' }) + (r.advice ? ' ' + r.advice : ''));
  rerender();
}

/* ---------- events ---------- */
function setPath(k, raw, type) {
  let v = raw;
  if (type === 'num') v = raw === '' ? null : Number(raw);
  else if (raw === 'true' || raw === 'false') v = raw === 'true';
  else if (/^\d+(\.\d+)?$/.test(raw) && !/gpu|cpu|id|name|url|brand|chipset|text/i.test(k)) v = Number(raw);
  put(S, k, v);
  if (k === 'prof.lang' || k === 'prof.market') window.dispatchEvent(new CustomEvent('prisme:market'));
  if (k.startsWith('offer.fields') && S.offer.fields) { /* keep */ }
}
export function init() {
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-act]'); if (!el || el.tagName === 'INPUT' && el.type === 'file') return;
    const a = el.dataset.act, id = el.dataset.id;
    if (a === 'go') { S.ui.tab = el.dataset.v; saveUi(); render(); window.scrollTo(0, 0); }
    else if (a === 'ui') { S.ui[el.dataset.k] = el.dataset.v; saveUi(); render(); }
    else if (a === 'set') { setPath(el.dataset.k, el.dataset.v); save(); rerender(); }
    else if (a === 'toggle') {
      const path = el.dataset.k, v = el.dataset.v, num = /\.(sizes)$/.test(path), parent = get(S, path.split('.').slice(0, -1).join('.'));
      let cur = /\.sizes$/.test(path) ? sizesOf(parent) : (get(S, path) || []).slice();
      const val = num ? Number(v) : v;
      cur = v === '' ? [] : cur.map(String).includes(String(val)) ? cur.filter(x => String(x) !== String(val)) : [...cur, val];
      if (num) { cur.sort((x, y) => x - y); delete parent.size; }
      put(S, path, cur); ui.all = ''; save(); render();
    }
    else if (a === 'showAll') { ui.all = el.dataset.k; render(); }
    else if (a === 'clearF') {
      const k = el.dataset.k;
      if (k === 'monitor') Object.assign(S.mon, { sizes: [], res: [], hzMin: 0, panels: [], brands: [], shape: 'any', withTv: false, gpuOk: false }), delete S.mon.size;
      else if (k === 'tv') Object.assign(S.tv, { sizes: [], panels: [], brands: [], hzMin: 0, hdmiMin: 0, dv: false });
      else if (k === 'choose' && S.choose.f) S.choose.f[S.choose.cat] = { sort: (S.choose.f[S.choose.cat] || {}).sort || 'score' };
      ui.all = ''; save(); render();
    }
    else if (a === 'sizes') { const o = S[el.dataset.k], v = el.dataset.v; let cur = sizesOf(o); cur = v === '' ? [] : cur.includes(Number(v)) ? cur.filter(x => x !== Number(v)) : [...cur, Number(v)].sort((x, y) => x - y); o.sizes = cur; delete o.size; save(); render(); }
    else if (a === 'profile') { sheetFn = sheetProfile; openSheet(sheetProfile()); }
    else if (a === 'close') { sheetFn = null; closeSheet(); }
    else if (a === 'alts') { const cat = el.dataset.cat; sheetFn = () => sheetAlts(cat); openSheet(sheetFn()); }
    else if (a === 'swap') { S.pc.lock = { ...(S.pc.lock || {}), [el.dataset.cat]: id }; if (el.dataset.cat === 'gpu') S.pc.gpu = id; save(); sheetFn = null; closeSheet(); render(); }
    else if (a === 'unlock') { S.pc.lock = {}; save(); render(); }
    else if (a === 'saveBuild') { const b = curBuild(), name = prompt(t('buildName'), `${t('use_' + S.pc.use)} · ${eur(b.total)}`); if (name) { S.builds.unshift({ id: uid(), name, at: new Date().toISOString(), parts: Object.fromEntries(E.PARTS.map(k => [k, b.parts[k].id])), total: b.total, market: mk() }); save(); toast(t('saved')); } }
    else if (a === 'openBuild') { const b = S.builds.find(x => x.id === id); if (b) { S.pc.lock = { ...b.parts }; S.pc.gpu = b.parts.gpu; S.ui.tab = 'build'; S.ui.build = 'custom'; save(); render(); } }
    else if (a === 'buildDel') { S.builds = S.builds.filter(x => x.id !== id); save(); render(); }
    else if (a === 'watchBuild') { const b = curBuild(); for (const k of ['gpu', 'cpu', 'ram']) { const it = b.parts[k]; if (!S.watch.some(w => w.catId === it.id)) S.watch.push({ id: uid(), catId: it.id, name: it.name, cat: it.cat, target: null, log: [], added: new Date().toISOString() }); } save(); toast(t('watching')); }
    else if (a === 'watchAdd') { const it = E.byId(id); if (it && !S.watch.some(w => w.catId === id)) { S.watch.push({ id: uid(), catId: id, name: full(it), cat: it.cat, target: null, log: [], added: new Date().toISOString() }); save(); } toast(t('watching')); }
    else if (a === 'watchDel') { S.watch = S.watch.filter(w => w.id !== id); save(); render(); }
    else if (a === 'logPrice') { const w = S.watch.find(x => x.id === id), v = Number(String(prompt(t('logPrompt')) || '').replace(/[^\d.,]/g, '').replace(',', '.')); if (w && v > 0) { w.log.push({ d: new Date().toISOString(), p: v, shop: '' }); save(); render(); } }
    else if (a === 'detail' || a === 'detailPart') { sheetFn = () => sheetDetail(id); openSheet(sheetFn()); }
    else if (a === 'gearNew') { const it = id ? E.byId(id) : null, g = { id: uid(), _new: true, cat: it ? it.cat : 'monitor', catId: it ? it.id : '', name: it ? full(it) : '', price: it ? E.price(it, mk(), E.sizesOf(it, mk())[1]) || E.price(it, mk()) : '', market: mk() }; sheetFn = null; openSheet(sheetGear(g)); }
    else if (a === 'gearEdit') { const g = S.gear.find(x => x.id === id); if (g) { sheetFn = null; openSheet(sheetGear(g)); } }
    else if (a === 'gearDel') { if (confirm(t('confirmDel'))) { S.gear = S.gear.filter(x => x.id !== id); save(); render(); } }
    else if (a === 'parseOffer') { S.offer.fields = E.parseOffer(S.offer.text); save(); render(); }
    else if (a === 'keepOffer') { if (S.offer.fields) { S.offers.unshift({ id: uid(), name: S.offer.name || t('offer'), url: S.offer.url, at: new Date().toISOString(), fields: { ...S.offer.fields } }); save(); toast(t('saved')); render(); } }
    else if (a === 'dropOffer') { S.offers = S.offers.filter(o => o.id !== id); save(); render(); }
    else if (a === 'findPre') findPrebuilts();
    else if (a === 'lookup') lookup(el.dataset.cat);
    else if (a === 'askPrice') askPrice(id, el.dataset.w);
    else if (a === 'sync') { if (window.Cloud) window.Cloud.dialog(() => { window.appSync && window.appSync(); refreshSession(); }); }
    else if (a === 'export') { const url = URL.createObjectURL(exportBackup()), l = document.createElement('a'); l.href = url; l.download = `prisme-${new Date().toISOString().slice(0, 10)}.json`; l.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
    else if (a === 'reset') { if (confirm(t('confirmReset'))) { reset(); load(); sheetFn = null; closeSheet(); render(); } }
  });
  document.addEventListener('change', async e => {
    const el = e.target;
    if (el.dataset.set) { setPath(el.dataset.set, el.value, el.dataset.type); save(); rerender(); return; }
    if (el.dataset.setWatch) { const w = S.watch.find(x => x.id === el.dataset.setWatch); if (w) { w.target = Number(el.value) || null; save(); render(); } return; }
    const a = el.dataset.act;
    if (a === 'inbox') { setInbox(el.value.trim()); rerender(); }
    else if (a === 'import' && el.files[0]) { try { importBackup(await el.files[0].text()); load(); toast(t('imported')); sheetFn = null; closeSheet(); render(); } catch (err) { toast(t('importBad')); } }
    else if ((a === 'shotOffer' || a === 'shotPrice') && el.files[0]) {
      const file = el.files[0], wid = el.dataset.id;
      try {
        ui.ocr = t('ocr_prep'); if (a === 'shotOffer') render(); else toast(t('ocr_prep'));
        const text = await readImage(file, st => { ui.ocr = t('ocr_' + st); if (a === 'shotOffer') render(); });
        ui.ocr = '';
        if (a === 'shotOffer') { S.offer.text = text; S.offer.fields = E.parseOffer(text); save(); render(); }
        else { const w = S.watch.find(x => x.id === wid), p = E.parseOffer(text).price || Number(((text.match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)\s?€/) || [])[1] || '').replace(/[.\s]/g, '').replace(',', '.')); if (w && p > 0) { w.log.push({ d: new Date().toISOString(), p, shop: t('fromShot') }); save(); toast(t('priceLogged', { p: eur(p), s: '' })); render(); } else toast(t('noPriceShot')); }
      } catch (err) { ui.ocr = ''; toast(err.message === 'bad-image' ? t('badImage') : err.message); render(); }
      el.value = '';
    }
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('form[data-form="gear"]'); if (!f) return; e.preventDefault();
    const d = Object.fromEntries(new FormData(f)), id = f.dataset.id, g = S.gear.find(x => x.id === id) || { id };
    Object.assign(g, { cat: d.cat, catId: d.catId || '', name: d.name.trim(), bought: d.bought, price: Number(d.price) || 0, market: d.market, makerM: Number(d.makerM) || 0, used: !!d.used });
    delete g._new; if (!S.gear.includes(g)) S.gear.push(g);
    save(); closeSheet(); S.ui.tab = 'gear'; S.ui.gear = 'mine'; render();
  });
  /* choosing a product in the gear form fills its name */
  document.addEventListener('input', e => { const el = e.target; if (el.name === 'catId' && el.form) { const it = E.byId(el.value); if (it) el.form.name.value = full(it); } if (el.name === 'cat' && el.form) { const g = { id: el.form.dataset.id, _new: true, cat: el.value, name: el.form.name.value, bought: el.form.bought.value, price: el.form.price.value, market: el.form.market.value }; openSheet(sheetGear(g)); } });
  $('#prof-btn').addEventListener('click', () => { sheetFn = sheetProfile; openSheet(sheetProfile()); });
  $('#sheet').addEventListener('close', () => { sheetFn = null; });
  document.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('details.uses')) { S.ui.usesOpen = e.target.open; saveUi(); } }, true);
  $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
  render(); refreshSession();
}
export async function refreshSession() {
  if (!window.Cloud || !window.Cloud.configured()) return;
  try { const s = await window.Cloud.session(); const e = s ? s.user.email : null; if (e !== ui.session) { ui.session = e; if (sheetFn === sheetProfile) rerender(); } } catch (e) { }
}
