/* Nocturne — every screen. Reads the state, draws HTML, and handles taps through data-act attributes. */
import { S, save, reset, syncChoice, setSyncChoice, exportBackup, importBackup } from './store.js';
import * as E from './sleep.js';
import { readHealthFile, mergeNights, sinceDate } from './health.js';
import { waterfall, actogram, columns } from './charts.js';
import { t, setLang, lang } from './i18n.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ui = { wf: null, bed: null, shown: 30, session: undefined, morningOpen: false, busy: false };
const TABS = ['bridge', 'numbers', 'nights', 'plan', 'settings'], SPANS = [7, 14, 28, 90];
const today = () => E.localDate();

/* ---------- words and figures ---------- */
export const dur = m => { m = Math.round(m); const neg = m < 0; m = Math.abs(m); const h = Math.floor(m / 60), r = m % 60; return (neg ? '−' : '') + (h ? `${h}\u00a0h\u00a0${String(r).padStart(2, '0')}` : `${r}\u00a0min`); };
const delta = m => { m = Math.round(m); return m === 0 ? dur(0) : (m > 0 ? '+' : '−') + dur(Math.abs(m)); };
export const clock = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const loc = () => lang() === 'fr' ? 'fr-FR' : 'en-GB';
const dfmt = (d, o) => new Intl.DateTimeFormat(loc(), { timeZone: 'UTC', ...o }).format(new Date(d + 'T00:00:00Z'));
const day = d => dfmt(d, { weekday: 'short', day: 'numeric', month: 'short' });
const nightLabel = d => `${dfmt(E.addDays(d, -1), { weekday: 'short', day: 'numeric' })} → ${day(d)}`;
const fmt = { dur, delta, get targetLabel() { return t('chart.target', { v: dur(S.target) }); } };
const tagWords = tg => E.isClean(tg) ? t('cause.clean') : E.causesOf(tg).map(c => t('cause.' + c)).join(', ');
const hasTag = d => E.isClean(S.tags[d]) || E.causesOf(S.tags[d]).length > 0;
const width = () => Math.min(640, document.documentElement.clientWidth) - 40;
const spanDates = () => { const end = E.lastNight(S.nights); return end ? E.range(end, S.ui.span) : []; };
const seg = () => `<div class="seg" role="group" aria-label="${esc(t('span.aria'))}">${SPANS.map(n => `<button data-act="span" data-n="${n}" aria-pressed="${S.ui.span === n}">${n}</button>`).join('')}</div>`;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2400); }
function sheet(html, after) { const d = $('#sheet'); d.innerHTML = html; if (!d.open) d.showModal(); d.scrollTop = 0; after && after(d); }
const closeSheet = () => { const d = $('#sheet'); if (d.open) d.close(); };

/* ---------- tagging ---------- */
function toggleTag(date, k) {
  const cur = S.tags[date]?.t || []; let next;
  if (k === E.CLEAN) next = cur.includes(E.CLEAN) ? [] : [E.CLEAN];
  else { next = cur.filter(x => x !== E.CLEAN); next = next.includes(k) ? next.filter(x => x !== k) : [...next, k]; }
  if (!next.length) delete S.tags[date];
  else { const n = next.includes('other') ? S.tags[date]?.n : null; S.tags[date] = n ? { t: next, n } : { t: next }; }
  save();
}
function chips(date) {
  const cur = S.tags[date]?.t || [];
  let h = `<div class="chips">${E.CAUSES.map(c => `<button class="chip" data-act="tag" data-d="${date}" data-k="${c}" aria-pressed="${cur.includes(c)}">${esc(t('cause.' + c))}</button>`).join('')}<button class="chip clean" data-act="tag" data-d="${date}" data-k="clean" aria-pressed="${cur.includes(E.CLEAN)}">${esc(t('cause.clean'))}</button></div>`;
  if (cur.includes('other')) h += `<input type="text" data-note="${date}" maxlength="80" placeholder="${esc(t('tag.notePh'))}" value="${esc(S.tags[date]?.n || '')}" aria-label="${esc(t('tag.notePh'))}">`;
  return h;
}

/* ---------- Bridge ---------- */
function morningPanel() {
  const d = E.morningOf(), tagged = hasTag(d);
  if (tagged && !ui.morningOpen) return `<section class="morning"><div class="done"><span><b>${esc(t('morning.done'))}</b> ${esc(tagWords(S.tags[d]))}${S.tags[d].n ? ` (${esc(S.tags[d].n)})` : ''}</span><button class="link" data-act="morning-edit">${esc(t('common.change'))}</button></div></section>`;
  return `<section class="morning"><h2>${esc(t('morning.q'))}</h2><p class="note">${esc(t('morning.sub', { n: nightLabel(d) }))}</p>${chips(d)}${tagged ? `<div class="row" style="margin-top:14px"><button class="btn sm" data-act="morning-done">${esc(t('common.done'))}</button></div>` : ''}</section>`;
}
function bridgeRows(b) {
  return b.rows.map(r => {
    const base = { k: r.k, min: r.min };
    if (r.k === 'ordinary') {
      const lvl = b.ordinary.value;
      return { ...base, label: t('row.ordinary'), sub: lvl != null ? t('row.ordinarySub', { v: dur(lvl) }) : '', nights: `<p style="margin:4px 0">${esc(lvl != null ? t('row.ordinaryHow', { target: dur(b.target), v: dur(lvl), d: dur(b.target - lvl), n: b.ordinary.n }) : t('row.ordinaryNone', { n: b.ordinary.n }))}</p>${r.nights.map(n => `<div><button class="link" data-act="night" data-d="${n.d}">${esc(day(n.d))} · ${dur(S.nights[n.d].a)}</button><span>${delta(-n.v)}</span></div>`).join('')}` };
    }
    const list = r.nights.map(n => `<div><button class="link" data-act="night" data-d="${n.d}">${esc(day(n.d))} · ${dur(S.nights[n.d].a)}</button><span>${delta(-n.v)}</span></div>`).join('');
    return { ...base, label: r.k === 'untagged' ? t('row.untagged') : t('cause.' + r.k), sub: t('n.nights', { n: r.nights.length }), nights: list + `<p class="note" style="margin:6px 0 0">${esc(t('row.share', { n: b.n }))}</p>` };
  });
}
function renderBridge() {
  const end = E.lastNight(S.nights);
  if (!end) return `<section><h1>${esc(t('empty.h1'))}</h1><p class="sub">${esc(t('empty.sub'))}</p><div class="row" style="margin-top:18px"><button class="btn pri" data-act="import-open">${esc(t('imp.cta'))}</button><button class="btn" data-act="demo">${esc(t('empty.demo'))}</button></div></section>${syncAsk()}${howToExport()}`;
  const dates = spanDates(), b = E.bridge(S.nights, S.tags, dates, S.target);
  let h = '';
  if (S.demo) h += `<section><div class="banner"><span>${esc(t('demo.banner'))}</span><button class="btn sm" data-act="import-open">${esc(t('imp.cta'))}</button></div></section>`;
  h += syncAsk() + morningPanel();
  h += `<section><h1>${esc(b.gapMin > 0 ? t('bridge.short', { gap: dur(b.gapMin), target: dur(b.target) }) : t('bridge.met', { gap: dur(-b.gapMin), target: dur(b.target) }))}</h1>`;
  h += `<div class="span"><span class="sub">${esc(t('bridge.sub', { n: b.n, of: b.of, from: day(dates[0]), to: day(end) }))}</span>${seg()}</div>`;
  h += waterfall({ id: 'wf', target: b.target, actual: b.actualMin, rows: bridgeRows(b), open: ui.wf, fmt, labels: { target: t('row.target'), actual: t('row.actual'), aria: t('bridge.aria') } });
  h += `<div class="adds"><span>${esc(t('bridge.adds'))}</span><span>${dur(b.target)} − ${dur(b.gapMin)} = ${dur(b.actualMin)}</span></div>`;
  const notes = [];
  if (b.ordinary.value == null) notes.push(esc(t('note.ordinaryNeed', { n: b.ordinary.n, min: E.ORDINARY_MIN })));
  const un = b.rows.find(r => r.k === 'untagged');
  if (un && un.nights.length) notes.push(`${esc(t('note.untagged', { n: un.nights.length, of: b.n }))} <button class="link" data-act="tab" data-tab="nights">${esc(t('note.tagThem'))}</button>`);
  const waiting = Object.keys(S.tags).filter(d => d > end && hasTag(d)).length;
  if (waiting) notes.push(esc(t('note.waiting', { n: waiting })));
  if (notes.length) h += `<p class="note" style="margin-top:14px">${notes.join('<br>')}</p>`;
  h += `<details><summary>${esc(t('how.sum'))}</summary><ul>${[1, 2, 3, 4, 5].map(i => `<li>${esc(t('how.' + i, { min: E.ORDINARY_MIN, weeks: E.ORDINARY_DAYS / 7 }))}</li>`).join('')}</ul></details></section>`;
  return h;
}
function syncAsk() {
  if (!ui.session || syncChoice() != null) return '';
  return `<section><div class="banner"><span>${esc(t('sync.ask', { e: ui.session }))}</span><span class="row"><button class="btn sm pri" data-act="sync-yes">${esc(t('sync.yes'))}</button><button class="btn sm" data-act="sync-no">${esc(t('sync.no'))}</button></span></div></section>`;
}
const howToExport = () => `<section><h2>${esc(t('imp.howT'))}</h2><ol class="steps">${[1, 2, 3, 4].map(i => `<li>${esc(t('imp.how' + i))}</li>`).join('')}</ol><p class="note">${esc(t('imp.private'))}</p></section>`;

/* ---------- Numbers ---------- */
function renderNumbers() {
  const end = E.lastNight(S.nights); if (!end) return needData();
  const dates = spanDates(), s = E.summary(S.nights, dates, S.target);
  const sri = s.sri.pairs >= 4 ? Math.round(s.sri.value) : null;
  let h = `<section><h1>${esc(t('num.h1'))}</h1><div class="span"><span class="sub">${esc(t('bridge.sub', { n: s.n, of: s.of, from: day(dates[0]), to: day(end) }))}</span>${seg()}</div>`;
  h += `<div class="figs">
    <div class="fig"><b>${sri != null ? sri : '–'}<small> / 100</small></b><span>${esc(t('num.sri'))}</span></div>
    <div class="fig"><b>${s.onSd != null ? '± ' + Math.round(s.onSd) : '–'}<small> min</small></b><span>${esc(t('num.onset', { v: clock(s.onMed) }))}</span></div>
    <div class="fig"><b>${dur(s.a)}</b><span>${esc(t('num.asleep', { gap: dur(S.target - Math.round(s.a)), target: dur(S.target) }))}</span></div>
    <div class="fig"><b>${Math.round(s.conv * 100)}<small> %</small></b><span>${esc(t('num.conv', { b: dur(s.b) }))}</span></div></div></section>`;
  // regularity
  const shown = dates.slice(-42), p = S.plan.start && S.plan.base ? E.planTimes(S.plan.base, S.plan) : null;
  h += `<section><h2>${esc(t('num.regT'))}</h2><p class="sub">${esc(sri != null ? t('num.regLead', { v: sri, pairs: s.sri.pairs }) : t('num.regNeed'))}</p>`;
  h += actogram({ nights: S.nights, dates: shown, width: width(), label: t('num.actoAria'), lang: loc(), plan: p ? { bed: p.bed, wake: S.plan.wake } : null });
  h += `<div class="legend"><span><i style="background:var(--moon)"></i>${esc(t('leg.asleep'))}</span><span><i style="background:var(--line)"></i>${esc(t('leg.bed'))}</span>${p ? `<span><i class="l" style="background:var(--accent)"></i>${esc(t('leg.plan'))}</span>` : ''}</div>`;
  h += `<p class="note" style="margin-top:12px">${esc(t('num.onsetLine', { med: clock(s.onMed), sd: Math.round(s.onSd ?? 0), min: clock(s.onMin), max: clock(s.onMax), wmed: clock(s.offMed), wsd: Math.round(s.offSd ?? 0) }))}${shown.length < dates.length ? ' ' + esc(t('num.actoCut', { n: shown.length })) : ''}</p>`;
  h += `<details><summary>${esc(t('num.sriHowT'))}</summary><p>${esc(t('num.sriHow1'))}</p><p>${esc(t('num.sriHow2'))}</p></details></section>`;
  // asleep vs target
  h += `<section><h2>${esc(t('num.asleepT'))}</h2><p class="sub">${esc(t('num.asleepLead', { avg: dur(s.a), hit: s.hit, n: s.n, target: dur(S.target) }))}</p>`;
  h += columns({ nights: S.nights, dates, target: S.target, width: width(), label: t('num.colAria'), fmt, lang: loc() }) + `<p class="note" style="margin-top:8px">${esc(t('num.colTap'))}</p></section>`;
  // in bed vs asleep
  const bb = E.bedBridge(S.nights, dates, S.target);
  h += `<section><h2>${esc(t('num.bedT'))}</h2><p class="sub">${esc(t('num.bedLead', { conv: Math.round(s.conv * 100), b: dur(s.b), a: dur(s.a) }))}</p>`;
  h += waterfall({ id: 'bed', target: bb.target, actual: bb.actualMin, rows: bb.rows.map(r => ({ k: r.k, min: r.min, label: t('row.' + r.k) })), fmt, labels: { target: t('row.target'), actual: t('row.actual'), aria: t('num.bedAria') } });
  h += `<p class="note" style="margin-top:12px">${esc(s.measured === s.n ? t('num.bedAll') : s.measured === 0 ? t('num.bedNone') : t('num.bedSome', { m: s.measured, n: s.n }))}</p></section>`;
  return h;
}
const needData = () => `<section><h1>${esc(t('need.h1'))}</h1><p class="sub">${esc(t('need.sub'))}</p><div class="row" style="margin-top:18px"><button class="btn pri" data-act="import-open">${esc(t('imp.cta'))}</button><button class="btn" data-act="demo">${esc(t('empty.demo'))}</button></div></section>`;

/* ---------- Nights ---------- */
function renderNights() {
  const all = [...new Set([...Object.keys(S.nights), ...Object.keys(S.tags).filter(hasTag), E.morningOf()])].sort().reverse();
  const untagged = Object.keys(S.nights).filter(d => !hasTag(d)).length;
  let h = `<section><h1>${esc(t('nights.h1'))}</h1><p class="sub">${esc(t('nights.sub', { n: Object.keys(S.nights).length, u: untagged }))}</p><ul class="nights">`;
  for (const d of all.slice(0, ui.shown)) {
    const n = S.nights[d], tg = S.tags[d];
    h += `<li><button class="night" data-act="night" data-d="${d}"><span class="d">${esc(nightLabel(d))}</span><span class="a">${n ? dur(n.a) : '–'}</span><span class="c">${n ? `${clock(n.on)} → ${clock(n.off)}` : esc(t('nights.waiting'))}</span><span class="g">${n ? delta(n.a - S.target) : ''}</span><span class="tg${hasTag(d) ? '' : ' none'}">${hasTag(d) ? esc(tagWords(tg)) + (tg.n ? ` (${esc(tg.n)})` : '') : esc(t('nights.tag'))}</span></button></li>`;
  }
  h += '</ul>';
  if (all.length > ui.shown) h += `<div class="row" style="margin-top:16px"><button class="btn sm" data-act="more">${esc(t('nights.more'))}</button></div>`;
  return h + '</section>';
}
function nightSheet(d) {
  const n = S.nights[d];
  let h = `<div class="sheet-head"><h2>${esc(nightLabel(d))}</h2><button class="link" data-act="close">${esc(t('common.close'))}</button></div>`;
  if (n) {
    const rows = [[t('n.asleep'), `${dur(n.a)} (${delta(n.a - S.target)})`], [t('n.clock'), `${clock(n.on)} → ${clock(n.off)}`], [t('n.inbed'), dur(n.b) + (n.m ? '' : ' *')], [t('n.awake'), dur(n.w)], [t('n.conv'), Math.round(n.a / n.b * 100) + ' %']];
    if (n.d) rows.push([t('n.stages'), `${dur(n.d[0])} · ${dur(n.d[1])} · ${dur(n.d[2])}`]);
    if (n.n) rows.push([t('n.naps'), dur(n.n)]);
    if (n.src) rows.push([t('n.src'), n.src]);
    if (n.z) rows.push([t('n.zone'), n.z]);
    h += `<dl class="kv">${rows.map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl>`;
    if (!n.m) h += `<p class="note">* ${esc(t('n.noBed'))}</p>`;
    if (n.z) h += `<p class="note">${esc(t('n.zoneNote'))}</p>`;
  } else h += `<p class="sub">${esc(t('n.none'))}</p>`;
  h += `<h3 style="margin-top:14px">${esc(t('n.tagT'))}</h3>${chips(d)}<div class="row" style="margin-top:18px"><button class="btn pri" data-act="close">${esc(t('common.done'))}</button></div>`;
  sheet(h); ui.sheetNight = d;
}

/* ---------- Plan ---------- */
const round5 = m => Math.round(m / 5) * 5;
function planNow() {
  const end = E.lastNight(S.nights), live = E.baseline(S.nights, end), started = !!(S.plan.start && S.plan.base), base = started ? S.plan.base : live;
  const p = { ...S.plan, wake: S.plan.wake ?? round5(base.wake) };
  return { end, live, started, base, p, tn: E.tonight(base, p, today()) };
}
function renderPlan() {
  if (!E.lastNight(S.nights)) return needData();
  const { live, started, base, p, tn } = planNow();
  const first = tn.steps ? Math.max(tn.bed, base.bed - E.STEP_MIN) : tn.bed, bedShow = started ? tn.bedTonight : first, windShow = bedShow - p.wind;
  let h = `<section><h1>${esc(t('plan.h1', { v: clock(bedShow) }))}</h1><p class="sub">${esc(tn.steps === 0 ? t('plan.noShift') : started ? (tn.final ? t('plan.final') : t('plan.step', { k: tn.step, n: tn.steps, end: clock(tn.bed), every: E.STEP_NIGHTS, m: E.STEP_MIN })) : t('plan.preview', { first: clock(first), end: clock(tn.bed), n: tn.steps, days: tn.days, every: E.STEP_NIGHTS, m: E.STEP_MIN }))}</p>`;
  h += `<div class="tonight"><div><b>${clock(windShow)}</b><span>${esc(t('plan.wind'))}</span></div><div class="key"><b>${clock(bedShow)}</b><span>${esc(t('plan.bed'))}</span></div><div><b>${clock(p.wake)}</b><span>${esc(t('plan.wake'))}</span></div></div>`;
  h += `<div class="row" style="margin-top:18px">${started ? '' : `<button class="btn pri" data-act="plan-start">${esc(t('plan.start'))}</button>`}</div></section>`;
  if (started) {
    const pr = E.progress(S.nights, S.plan, base);
    h += `<section><h2>${esc(t('plan.progT', { d: day(S.plan.start) }))}</h2>`;
    if (!pr.n) h += `<p class="sub">${esc(t('plan.progNone'))}</p>`;
    else {
      h += `<ul class="maths"><li><span>${esc(t('plan.progA', { n: pr.n }))}</span><b>${dur(pr.a)} (${delta(pr.dA)})</b></li><li><span>${esc(t('plan.progGoal'))}</span><b>${dur(tn.goal)} (${delta(p.gain)})</b></li>${pr.dB != null ? `<li><span>${esc(t('plan.progB'))}</span><b>${delta(pr.dB)}</b></li>` : ''}${pr.conv != null ? `<li><span>${esc(t('plan.progConv'))}</span><b>${Math.round(pr.conv * 100)} %</b></li>` : ''}</ul>`;
      h += `<p class="note">${esc(pr.done ? t('plan.reached') : pr.conv == null ? t('plan.convLater') : t('plan.convNote', { v: Math.round(p.conv * 100) }))}</p>`;
    }
    h += `<div class="row" style="margin-top:12px">${pr.done ? `<button class="btn pri" data-act="plan-start">${esc(t('plan.next'))}</button>` : ''}<button class="btn sm" data-act="plan-stop">${esc(t('plan.stop'))}</button></div></section>`;
  }
  h += `<section><h2>${esc(t('plan.setT'))}</h2>
    <label class="field"><span>${esc(t('plan.fWake'))}</span><input type="time" data-plan="wake" value="${clock(p.wake)}" step="300"></label>
    <label class="field"><span>${esc(t('plan.fGain'))}<b>+${p.gain} min</b></span><input type="range" data-plan="gain" min="30" max="90" step="5" value="${p.gain}"></label>
    <label class="field"><span>${esc(t('plan.fConv'))}<b>${Math.round(p.conv * 100)} %</b></span><input type="range" data-plan="conv" min="50" max="85" step="5" value="${Math.round(p.conv * 100)}"></label>
    <label class="field"><span>${esc(t('plan.fWind'))}</span><select data-plan="wind">${[30, 45, 60, 90].map(v => `<option value="${v}"${p.wind === v ? ' selected' : ''}>${v} min</option>`).join('')}</select></label>
    <p class="note">${esc(t('plan.convWhy'))}</p></section>`;
  const phases = Math.max(1, Math.ceil((S.target - base.a) / p.gain));
  h += `<section><h2>${esc(t('plan.sumT'))}</h2><ul class="maths">
    <li><span>${esc(t('plan.m1', { n: base.n, d: day(base.end || E.lastNight(S.nights)) }))}</span><b>${dur(base.a)}</b></li>
    <li><span>${esc(t('plan.m2'))}</span><b>${dur(base.b)}</b></li>
    <li><span>${esc(t('plan.m3'))}</span><b>${clock(base.bed)} → ${clock(base.wake)}</b></li>
    <li><span>${esc(t('plan.m4', { g: p.gain }))}</span><b>${dur(tn.goal)}</b></li>
    <li><span>${esc(t('plan.m5', { g: p.gain, c: Math.round(p.conv * 100) }))}</span><b>+${dur(tn.extraBed)}</b></li>
    <li><span>${esc(t('plan.m6', { w: clock(p.wake), b: dur(base.b), x: dur(tn.extraBed) }))}</span><b>${clock(tn.bed)}</b></li>
    <li><span>${esc(t('plan.m7'))}</span><b>${dur(Math.max(0, tn.shift))}</b></li></ul>
    <p class="note">${esc(base.measured ? t('plan.baseMeasured') : t('plan.baseAssumed', { m: E.LATENCY }))} ${esc(S.target > base.a ? t('plan.phases', { target: dur(S.target), n: phases, g: p.gain }) : '')}${started && live ? ' ' + esc(t('plan.frozen')) : ''}</p>${base.wakeAvg - p.wake >= 15 && tn.shift > 0 ? `<p class="note">${esc(t('plan.lieIn', { avg: clock(base.wakeAvg), w: clock(p.wake), d: dur(base.wakeAvg - p.wake) }))}</p>` : ''}</section>`;
  return h;
}

/* ---------- Settings ---------- */
function renderSettings() {
  const im = S.imp, cloud = !!window.Cloud && window.Cloud.configured(), choice = syncChoice();
  let h = `<section class="set"><h1>${esc(t('set.h1'))}</h1><h2>${esc(t('imp.T'))}</h2><p class="sub">${esc(im ? t('imp.last', { d: dfmt(im.at.slice(0, 10), { day: 'numeric', month: 'long' }), n: im.n, first: day(im.first), last: day(im.last) }) : t('imp.never'))}</p><div class="row"><button class="btn pri" data-act="import-open">${esc(t('imp.cta'))}</button></div></section>`;
  h += `<section class="set"><h2>${esc(t('set.targetT'))}</h2><label class="field"><span>${esc(t('set.target'))}<b>${dur(S.target)}</b></span><input type="range" data-set="target" min="420" max="570" step="15" value="${S.target}"></label></section>`;
  h += `<section class="set"><h2>${esc(t('set.lookT'))}</h2><label class="field"><span>${esc(t('set.lang'))}</span><select data-set="lang"><option value="en"${S.lang === 'en' ? ' selected' : ''}>English</option><option value="fr"${S.lang === 'fr' ? ' selected' : ''}>Français</option></select></label><label class="field"><span>${esc(t('set.theme'))}</span><select data-set="theme"><option value="night"${S.theme === 'night' ? ' selected' : ''}>${esc(t('set.night'))}</option><option value="day"${S.theme === 'day' ? ' selected' : ''}>${esc(t('set.day'))}</option></select></label><p class="note">${esc(t('set.late'))}</p></section>`;
  if (cloud) h += `<section class="set"><h2>${esc(t('sync.T'))}</h2><p class="sub">${esc(t('sync.lead'))}</p><label class="check"><input type="checkbox" data-set="sync"${choice === '1' ? ' checked' : ''}><span>${esc(t('sync.consent'))}</span></label><p class="note" id="syncStatus">${esc(ui.session ? t('sync.on', { e: ui.session }) : t('sync.off'))}${choice === '1' && ui.cloudMsg ? ' · ' + esc(ui.cloudMsg) : ''}</p><div class="row"><button class="btn sm" data-act="signin"${choice === '1' ? '' : ' disabled'}>${esc(ui.session ? t('sync.account') : t('sync.signIn'))}</button>${ui.session ? '' : `<button class="btn sm" data-act="signup"${choice === '1' ? '' : ' disabled'}>${esc(t('sync.signUp'))}</button>`}</div></section>`;
  h += `<section class="set"><h2>${esc(t('set.dataT'))}</h2><div class="row"><button class="btn sm" data-act="backup">${esc(t('set.backup'))}</button><label class="btn sm pick">${esc(t('set.restore'))}<input type="file" data-file="backup"></label>${S.demo ? `<button class="btn sm" data-act="demo-off">${esc(t('demo.off'))}</button>` : Object.keys(S.nights).length ? '' : `<button class="btn sm" data-act="demo">${esc(t('empty.demo'))}</button>`}<button class="btn sm" data-act="wipe">${esc(t('set.wipe'))}</button></div><p class="note" style="margin-top:12px">${esc(t('set.dataNote'))}</p></section>`;
  h += `<section><h2>${esc(t('about.T'))}</h2><p class="note">${esc(t('about.1'))}</p><p class="note">${esc(t('about.2'))}</p><p class="note">${esc(t('about.3'))}</p></section>`;
  return h;
}

/* ---------- import ---------- */
/* The picker is a real file input inside a label, placed inside the sheet. A hidden input elsewhere on the page,
   opened from code, does not open on an iPhone while a sheet is up (everything outside the sheet is inert).
   No "accept" filter either: iOS greys out files it cannot match to a type, and the content is checked anyway. */
const pickBtn = () => `<label class="btn pri pick">${esc(t('imp.pick'))}<input type="file" data-file="health"></label>`;
function importSheet() {
  sheet(`<div class="sheet-head"><h2>${esc(t('imp.T'))}</h2><button class="link" data-act="close">${esc(t('common.close'))}</button></div><ol class="steps">${[1, 2, 3, 4].map(i => `<li>${esc(t('imp.how' + i))}</li>`).join('')}</ol><p class="note">${esc(t('imp.private'))} ${esc(t('imp.again'))}</p><p class="err" id="impErr"></p><div class="row">${pickBtn()}</div>`);
}
async function runImport(file) {
  if (ui.busy) return; ui.busy = true; ui.impAt = 0;
  sheet(`<h2>${esc(t('imp.reading'))}</h2><p class="sub" id="impMsg">${esc(file.name)} · ${(file.size / 1048576).toFixed(file.size > 1e7 ? 0 : 1)} MB</p><progress id="impBar" max="1" value="0"></progress><p class="note" id="impCount" style="margin-top:10px">${esc(t('imp.keepOpen'))}</p>`);
  let lock = null; try { lock = await navigator.wakeLock?.request('screen'); } catch (e) { }
  try {
    const bar = $('#impBar'), cnt = $('#impCount');
    const res = await readHealthFile(file, { since: sinceDate(today()), onProgress: (p, n) => { ui.impAt = p; bar.value = p; cnt.textContent = t('imp.progress', { p: Math.round(p * 100), n: n.toLocaleString(loc()) }); } });
    if (S.demo) { S.nights = {}; S.tags = {}; S.plan = { ...S.plan, wake: null, start: null, base: null }; S.demo = false; }
    const m = mergeNights(S.nights, res.nights); S.nights = m.nights;
    S.imp = { at: new Date().toISOString(), n: res.stats.n, first: res.stats.first, last: res.stats.last, added: m.added, updated: m.updated, bedOnly: res.stats.bedOnly };
    save(true); render();
    const src = Object.entries(res.stats.sources).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join(', ');
    sheet(`<h2>${esc(t('imp.doneT', { n: m.added }))}</h2><dl class="kv"><dt>${esc(t('imp.rFound'))}</dt><dd>${res.stats.n}</dd><dt>${esc(t('imp.rRange'))}</dt><dd>${esc(day(res.stats.first))} → ${esc(day(res.stats.last))}</dd><dt>${esc(t('imp.rNew'))}</dt><dd>${m.added}</dd><dt>${esc(t('imp.rUpd'))}</dt><dd>${m.updated}</dd><dt>${esc(t('imp.rSame'))}</dt><dd>${m.same}</dd>${res.stats.bedOnly ? `<dt>${esc(t('imp.rBedOnly'))}</dt><dd>${res.stats.bedOnly}</dd>` : ''}</dl><p class="note">${esc(t('imp.rSrc', { s: src }))}</p><div class="row"><button class="btn pri" data-act="close">${esc(t('common.done'))}</button></div>`);
  } catch (e) {
    console.warn(e);
    const detail = e.code ? '' : `${file.name} · ${(file.size / 1048576).toFixed(1)} MB · ${Math.round((ui.impAt || 0) * 100)} % · ${e.name || 'Error'}: ${e.message || e}`;
    sheet(`<div class="sheet-head"><h2>${esc(t('imp.failT'))}</h2><button class="link" data-act="close">${esc(t('common.close'))}</button></div><p class="sub">${esc(e.code === 'noExport' ? t('imp.errZip') : e.code === 'noSleep' ? t('imp.errSleep') : t('imp.errRead'))}</p>${detail ? `<p class="note">${esc(t('imp.errDetail'))} ${esc(detail)}</p>` : ''}<div class="row">${pickBtn()}</div>`);
  } finally { ui.busy = false; try { lock?.release(); } catch (e) { } }
}

/* ---------- shell ---------- */
function paintChrome() {
  document.documentElement.lang = S.lang;
  const h = new Date().getHours(), late = h >= 21 || h < 5;
  document.documentElement.toggleAttribute('data-late', late);
  document.documentElement.dataset.theme = late ? 'night' : S.theme;
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
  document.querySelector('meta[name=theme-color]').content = ink || '#0e1528';
  $('#tabs').innerHTML = TABS.map(k => `<button data-act="tab" data-tab="${k}"${S.ui.tab === k ? ' aria-current="page"' : ''}>${esc(t('tab.' + k))}</button>`).join('');
  const end = E.lastNight(S.nights), chip = $('#impChip');
  if (!end || S.demo) { chip.textContent = ''; chip.hidden = true; }
  else { const age = E.diffDays(E.morningOf(), end); chip.hidden = false; chip.classList.toggle('due', age >= 7); chip.textContent = age >= 7 ? t('chip.due', { n: age }) : t('chip.to', { d: dfmt(end, { day: 'numeric', month: 'short' }) }); }
}
export function render() {
  setLang(S.lang); paintChrome();
  const tab = TABS.includes(S.ui.tab) ? S.ui.tab : 'bridge';
  $('#main').innerHTML = { bridge: renderBridge, numbers: renderNumbers, nights: renderNights, plan: renderPlan, settings: renderSettings }[tab]();
}
export function refreshSession() {
  if (!window.Cloud || !window.Cloud.configured()) { ui.session = null; return; }
  /* the sync library is only fetched when this device syncs, or is already signed in through another app of the hub */
  let known = false; try { known = !!localStorage.getItem('thrugg-auth'); } catch (e) { }
  if (syncChoice() !== '1' && !known) { ui.session = null; return; }
  window.Cloud.session().then(s => { const e = s ? s.user.email : null, was = ui.session; ui.session = e; ui.cloudMsg = window.Cloud.status === 'off' ? '' : window.Cloud.msg; if (e !== was || S.ui.tab === 'settings') { const st = $('#syncStatus'); if (e !== was || !st) render(); else st.textContent = (e ? t('sync.on', { e }) : t('sync.off')) + (syncChoice() === '1' && ui.cloudMsg ? ' · ' + ui.cloudMsg : ''); } }).catch(() => { ui.session = null; });
}
function go(tab) { S.ui.tab = tab; ui.wf = null; ui.morningOpen = false; save(); render(); window.scrollTo(0, 0); }
function wipeSheet() {
  const synced = ui.session && syncChoice() === '1';
  sheet(`<div class="sheet-head"><h2>${esc(t('wipe.T'))}</h2><button class="link" data-act="close">${esc(t('common.close'))}</button></div><p class="sub">${esc(synced ? t('wipe.leadSync') : t('wipe.lead'))}</p><div class="row">${synced ? `<button class="btn" data-act="wipe-device">${esc(t('wipe.device'))}</button><button class="btn" data-act="wipe-all">${esc(t('wipe.all'))}</button>` : `<button class="btn" data-act="wipe-all">${esc(t('wipe.yes'))}</button>`}</div>${synced ? `<p class="note" style="margin-top:12px">${esc(t('wipe.note'))}</p>` : ''}`);
}
function signUpSheet() {
  sheet(`<form method="dialog"><div class="sheet-head"><h2>${esc(t('sync.signUp'))}</h2><button type="button" class="link" data-act="close">${esc(t('common.close'))}</button></div><label class="field"><span>${esc(t('sync.email'))}</span><input type="email" name="e" autocomplete="username" required style="width:100%"></label><label class="field"><span>${esc(t('sync.password'))}</span><input type="password" name="p" minlength="8" autocomplete="new-password" required style="width:100%"></label><p class="err" id="suErr"></p><div class="row"><button class="btn pri">${esc(t('sync.signUp'))}</button></div></form>`, d => {
    const f = d.querySelector('form');
    f.onsubmit = async ev => {
      ev.preventDefault(); const out = $('#suErr'); out.textContent = '…';
      try { const c = await window.Cloud.client(); const { data, error } = await c.auth.signUp({ email: f.e.value.trim(), password: f.p.value }); if (error) throw error; if (data.session) { closeSheet(); window.nocturneSync?.(); refreshSession(); } else out.textContent = t('sync.checkInbox'); }
      catch (e) { out.textContent = e.message || String(e); }
    };
  });
}

const acts = {
  tab: el => go(el.dataset.tab),
  span: el => { S.ui.span = +el.dataset.n; ui.wf = null; save(); render(); },
  tag: el => { toggleTag(el.dataset.d, el.dataset.k); if ($('#sheet').open) { render(); nightSheet(el.dataset.d); } else { ui.morningOpen = true; render(); } },
  'morning-edit': () => { ui.morningOpen = true; render(); },
  'morning-done': () => { ui.morningOpen = false; render(); toast(t('morning.saved')); },
  'wf-open': el => { if (el.dataset.wf !== 'wf') return; ui.wf = ui.wf === el.dataset.k ? null : el.dataset.k; render(); },
  night: el => nightSheet(el.dataset.d),
  more: () => { ui.shown += 60; render(); },
  close: () => { closeSheet(); },
  'import-open': () => importSheet(),
  demo: () => { const d = E.demo(today()); S.nights = d.nights; S.tags = d.tags; S.demo = true; S.imp = null; S.plan = { ...S.plan, wake: null, start: null, base: null }; save(); go('bridge'); },
  'demo-off': () => { S.nights = {}; S.tags = {}; S.demo = false; S.plan = { ...S.plan, wake: null, start: null, base: null }; save(); render(); },
  'plan-start': () => { const { live, p } = planNow(); S.plan = { ...p, start: today(), base: live }; save(); render(); toast(t('plan.started')); },
  'plan-stop': () => { S.plan = { ...S.plan, start: null, base: null }; save(); render(); },
  backup: () => { const a = document.createElement('a'); a.href = URL.createObjectURL(exportBackup()); a.download = `nocturne-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); },
  wipe: () => wipeSheet(),
  'wipe-all': () => { reset(); closeSheet(); go('bridge'); toast(t('wipe.done')); },
  'wipe-device': async () => { try { sessionStorage.setItem('nocturne.wipe', '1'); } catch (e) { } setSyncChoice('0'); location.reload(); },
  'sync-yes': () => { setSyncChoice('1'); window.nocturneSync?.(); render(); },
  'sync-no': () => { setSyncChoice('0'); render(); },
  signin: () => window.Cloud.dialog(() => { window.nocturneSync?.(); refreshSession(); }),
  signup: () => signUpSheet(),
  reload: () => location.reload()
};
export function init() {
  document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el || el.disabled) return; const fn = acts[el.dataset.act]; if (fn) { e.preventDefault(); fn(el); } });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.note) { const tg = S.tags[el.dataset.note]; if (tg) { if (el.value.trim()) tg.n = el.value.trim(); else delete tg.n; save(); } }
    else if (el.dataset.plan === 'gain' || el.dataset.plan === 'conv') { el.closest('label').querySelector('b').textContent = el.dataset.plan === 'gain' ? `+${el.value} min` : `${el.value} %`; }
    else if (el.dataset.set === 'target') el.closest('label').querySelector('b').textContent = dur(+el.value);
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.file === 'health') { if (el.files[0]) runImport(el.files[0]); return; }
    if (el.dataset.file === 'backup') { const f = el.files[0]; if (f) f.text().then(x => { importBackup(x); render(); toast(t('set.restored')); }).catch(() => toast(t('set.restoreFail'))); el.value = ''; return; }
    if (el.dataset.plan) {
      const k = el.dataset.plan; const { p } = planNow();
      if (k === 'wake') { const [h, m] = el.value.split(':').map(Number); if (Number.isFinite(h)) p.wake = h * 60 + (m || 0); }
      else if (k === 'conv') p.conv = +el.value / 100; else p[k] = +el.value;
      S.plan = { ...S.plan, wake: p.wake, gain: p.gain, conv: p.conv, wind: p.wind }; save(); render();
    } else if (el.dataset.set === 'target') { S.target = +el.value; save(); render(); }
    else if (el.dataset.set === 'lang') { S.lang = el.value; save(); render(); }
    else if (el.dataset.set === 'theme') { S.theme = el.value; save(); render(); }
    else if (el.dataset.set === 'sync') { if (el.checked) { setSyncChoice('1'); window.nocturneSync?.(); render(); } else { setSyncChoice('0'); location.reload(); } }
  });
  $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet' && !ui.busy) closeSheet(); });
  $('#sheet').addEventListener('cancel', e => { if (ui.busy) e.preventDefault(); });
  let rz = null; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (S.ui.tab === 'numbers') render(); }, 200); });
  setInterval(paintChrome, 5 * 60 * 1000);   // the 21:00 switch, and the "import due" chip, without a reload
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !$('#sheet').open) render(); });
  render(); refreshSession();
}
