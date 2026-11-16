/* Révélateur — the screens: Library, Editor, Settings. */
import { S, save, saveUi, resetTaste } from './store.js';
import * as L from './library.js';
import { SLIDERS, SL, BANDS, BAND_HUE, KEYS, neutral, tidy, fmtVal as fmtRaw, labelOf, histogram, tasteSummary, sampleFrom, addSample, compose, isNeutral } from './engine.js';
import { SCENES, PROFILES, sceneName } from './scenes.js';
import { Renderer } from './gl.js';
import { loadVision, state as vstate, onVision } from './vision.js';
import { decode, scaled, importFile, editOf, setManual, hasManual, applyScene, exportPhoto, thumbFrom, recheck } from './photo.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const fmtVal = (k, x) => fmtRaw(k, x).replace('-', '\u2212');
const ICON = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  undo: '<path d="M9 7H4v5"/><path d="M4 12a8 8 0 1 1 2.3 5.7"/>',
  redo: '<path d="M15 7h5v5"/><path d="M20 12a8 8 0 1 0-2.3 5.7"/>',
  share: '<path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  compare: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/><path d="M12 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7z" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12l5 5L20 7"/>'
};
const ico = (k, label = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>${label ? `<span class="vh">${esc(label)}</span>` : ''}`;
const BAND_COL = { red: '#e5484d', orange: '#f08c2e', yellow: '#f2d03b', green: '#46a758', aqua: '#3cc6c6', blue: '#3e7be6', purple: '#8e4ec6', magenta: '#d6409f' };
const PANELS = [['auto', 'Auto'], ['light', 'Light'], ['color', 'Colour'], ['mix', 'Mix'], ['effects', 'Effects'], ['presets', 'Presets']];

const ui = { view: 'library', list: [], urls: new Map(), sel: null, busy: null, session: null, ed: null, clip: null, files: null };
let R = null;
function renderer() {
  if (R && !R.lost()) return R;
  const c = document.createElement('canvas'); c.id = 'view'; c.setAttribute('aria-label', 'Photo');
  R = new Renderer(c, { p3: true });
  c.addEventListener('webglcontextlost', e => { e.preventDefault(); const id = ui.ed && ui.ed.r.id; ui.ed = null; R = null; toast('The graphics memory was reset. Reopening the photo…'); if (id) setTimeout(() => openEditor(id), 300); else go('library'); });
  return R;
}
try { ui.clip = JSON.parse(localStorage.getItem('revelateur.clip')); } catch (e) { ui.clip = null; }

/* ---------- small helpers ---------- */
export function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), ms); }
function sheet(html, cls = '') { const d = $('#sheet'); d.className = cls; d.innerHTML = `<div class="sh">${html}</div>`; if (!d.open) d.showModal(); return d; }
const closeSheet = () => { const d = $('#sheet'); if (d.open) d.close(); };
function thumbUrl(r) {
  const c = ui.urls.get(r.id);
  if (c && c.blob === r.thumb) return c.url;
  if (c) URL.revokeObjectURL(c.url);
  if (!r.thumb) return '';
  const url = URL.createObjectURL(r.thumb); ui.urls.set(r.id, { blob: r.thumb, url }); return url;
}
const fmtMB = n => n >= 1e9 ? (n / 1e9).toFixed(1) + ' GB' : (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + ' MB';
const go = view => { ui.view = view; render(); };

/* ---------- library ---------- */
function renderLibrary() {
  const list = ui.list, sel = ui.sel;
  const busy = ui.busy ? `<p class="busy" role="status"><span class="spin"></span>${esc(ui.busy.msg || `Analysing ${Math.min(ui.busy.done + 1, ui.busy.total)} of ${ui.busy.total}…`)}</p>` : '';
  const head = `<header class="top"><a class="mark" href="../apps/" aria-label="All apps">Révélateur</a><span class="sp"></span>
    ${list.length ? `<button class="btn ghost sm" data-act="select">${sel ? 'Cancel' : 'Select'}</button>` : ''}
    <button class="ibtn" data-act="settings" aria-label="Settings">${ico('gear')}</button></header>`;
  if (!list.length) return head + `<main class="lib empty">${busy}
    <label class="drop"><input type="file" accept="image/*,.heic,.heif" multiple data-add hidden>
      <span class="plus">${ico('plus')}</span><b>Add photos</b>
      <span>Each photo is analysed on this device: what it shows (portrait, landscape, food, night…), how it is exposed and whether it already has a look. The settings are then adjusted for it, and you can change any of them.</span></label>
    <p class="note">Your photos stay in this browser. Nothing is uploaded.</p></main>`;
  const cells = list.map(r => {
    const on = sel && sel.has(r.id);
    return `<button class="cell${on ? ' on' : ''}" data-act="${sel ? 'pick' : 'open'}" data-id="${r.id}" aria-label="${esc(r.name)}${on ? ', selected' : ''}">
      <img src="${thumbUrl(r)}" alt="" loading="lazy"><span class="chip">${esc(sceneName(r.scene))}</span>
      ${r.edited ? '<span class="dot" title="Edited"></span>' : ''}${r.exported ? `<span class="ok" title="Exported">${ico('check')}</span>` : ''}${sel ? `<span class="tick">${on ? ico('check') : ''}</span>` : ''}</button>`;
  }).join('');
  const bar = sel ? `<div class="selbar"><span>${sel.size} selected</span><span class="sp"></span>
      <button class="btn sm" data-act="sel-all">All</button><button class="btn sm danger" data-act="sel-del" ${sel.size ? '' : 'disabled'}>Delete</button><button class="btn sm pri" data-act="sel-export" ${sel.size ? '' : 'disabled'}>Export</button></div>`
    : `<div class="libbar"><label class="btn pri"><input type="file" accept="image/*,.heic,.heif" multiple data-add hidden>${ico('plus')}<span>Add photos</span></label></div>`;
  return head + `<main class="lib">${busy}<div class="grid">${cells}</div></main>${bar}`;
}

async function addFiles(files) {
  const arr = [...files].filter(f => /^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp|avif|tiff?)$/i.test(f.name || ''));
  if (!arr.length) { toast('No photos in that selection'); return; }
  let rr; try { rr = renderer(); } catch (e) { toast(e.message, 5000); return; }
  L.persist();
  ui.busy = { done: 0, total: arr.length }; render();
  if (S.prefs.models && vstate.status !== 'ready') { ui.busy.msg = 'Loading the on-device models (once, about 20 MB)…'; render(); try { await loadVision(); } catch (e) { toast('Scene models unavailable, using the measurements only', 3500); } ui.busy.msg = ''; render(); }
  let last = null, fails = 0;
  for (const f of arr) {
    try {
      const r = await importFile(f, rr, S.prefs, S.taste);
      await L.put(r);
      const { file, ...rest } = r; ui.list.unshift(rest); last = rest;
    } catch (e) { fails++; toast((f.name ? f.name + ': ' : '') + (e && e.message || e), 4000); }
    ui.busy.done++; render();
  }
  ui.busy = null; render();
  if (fails && /quota|full/i.test(String(fails))) toast('The browser storage is full: delete some photos');
  if (arr.length === 1 && last) openEditor(last.id);
}

/* ---------- editor ---------- */
async function openEditor(id) {
  const r = await L.get(id); if (!r) return;
  let rr; try { rr = renderer(); } catch (e) { toast(e.message, 5000); return; }
  ui.busy = { msg: 'Opening…' }; if (ui.view === 'library') render();
  let tex;
  try {
    const d = await decode(r.file);
    try {
      const full = r.w * r.h <= 25e6 && Math.max(r.w, r.h) <= rr.maxTex;
      if (full) tex = rr.load(d.img, d.w, d.h);
      else { const c = scaled(d.img, d.w, d.h, 4000, rr.space); tex = rr.load(c, c.width, c.height); }
    } finally { d.done(); }
  } catch (e) { ui.busy = null; render(); toast(e.message || String(e), 4000); return; }
  ui.busy = null;
  rr.use(tex);
  const snap = snapshot(r);
  ui.ed = { r, tex, z: 1, cx: 0.5, cy: 0.5, before: false, lock: false, hist: null, history: [], future: [], snap, band: 'orange', exported: false, start: JSON.stringify(snap), dirty: false };
  go('editor');
}
const snapshot = r => ({ manual: { ...(r.manual || {}) }, amount: r.amount, scene: r.scene, sceneBy: r.sceneBy, auto: r.auto, autoWhy: r.autoWhy, look: r.look, offset: r.offset, tasteN: r.tasteN });
const restore = (r, s) => Object.assign(r, JSON.parse(JSON.stringify(s)));
function commit() {
  const ed = ui.ed; if (!ed) return;
  const now = snapshot(ed.r);
  if (JSON.stringify(now) === JSON.stringify(ed.snap)) return;
  ed.history.push(ed.snap); if (ed.history.length > 80) ed.history.shift();
  ed.future = []; ed.snap = now; dirty(); toolbar();
}
function undo(dir = -1) {
  const ed = ui.ed; if (!ed) return;
  const from = dir < 0 ? ed.history : ed.future, to = dir < 0 ? ed.future : ed.history;
  if (!from.length) return;
  to.push(snapshot(ed.r)); restore(ed.r, from.pop()); ed.snap = snapshot(ed.r);
  dirty(); panel(); toolbar(); draw();
}
let saveT = null;
function dirty() {
  const ed = ui.ed; if (!ed) return; ed.dirty = true;
  ed.r.edited = hasManual(ed.r);
  clearTimeout(saveT); saveT = setTimeout(persistEdit, 600);
}
async function persistEdit() {
  clearTimeout(saveT); saveT = null;
  const ed = ui.ed; if (!ed) return;
  const r = ed.r; r.edit = editOf(r);
  try { await L.put(r); } catch (e) { toast('Could not save: the browser storage may be full'); }
}
async function closeEditor() {
  const ed = ui.ed; if (!ed) return go('library');
  const r = ed.r, changed = JSON.stringify(snapshot(r)) !== ed.start;
  if (changed || ed.exported) {
    try { r.thumb = await thumbFrom(R, ed.tex, editOf(r), r.st.air); } catch (e) { }
    if (S.prefs.learn && (hasManual(r) || ed.exported)) { S.taste = addSample(S.taste, r.id, r.scene, sampleFrom(r.auto, editOf(r), r.amount)); save(); }
  }
  r.edit = editOf(r);
  try { await L.put(r); } catch (e) { }
  R.free(ed.tex); ui.ed = null;
  const { file, ...rest } = r, i = ui.list.findIndex(x => x.id === r.id);
  if (i >= 0) ui.list[i] = rest;
  go('library');
}

function renderEditor() {
  const ed = ui.ed, r = ed.r, tab = PANELS.some(([k]) => k === S.ui.panel) ? S.ui.panel : 'auto';
  return `<div class="ed">
  <header class="top edtop"><button class="ibtn" data-act="close" aria-label="Back to the library">${ico('back')}</button>
    <button class="scene" data-act="scene" aria-label="Scene type: ${esc(sceneName(r.scene))}. Change">${esc(sceneName(r.scene))}<small>${r.sceneBy === 'you' ? 'your pick' : 'auto'}</small></button>
    <span class="sp"></span>
    <button class="ibtn" data-act="undo" aria-label="Undo">${ico('undo')}</button><button class="ibtn" data-act="redo" aria-label="Redo">${ico('redo')}</button>
    <button class="ibtn" data-act="before" aria-label="Show the original" aria-pressed="${ed.lock}">${ico('compare')}</button>
    <button class="btn pri sm" data-act="export">${ico('share')}<span>Export</span></button></header>
  <div class="stage" id="stage"><canvas id="hist" width="200" height="72" ${S.ui.hist ? '' : 'hidden'} aria-hidden="true"></canvas><span class="badge" id="beforeBadge" hidden>Original</span></div>
  <section class="panel"><nav class="tabs" role="tablist">${PANELS.map(([k, l]) => `<button role="tab" data-act="panel" data-p="${k}" aria-selected="${k === tab}">${l}</button>`).join('')}</nav>
  <div class="pbody" id="pbody"></div></section></div>`;
}
function mountEditor() {
  const st = $('#stage'); st.prepend(R.canvas);
  bindStage(st); panel(); toolbar();
  new ResizeObserver(() => draw()).observe(st);
  draw();
}
function toolbar() {
  const ed = ui.ed; if (!ed) return;
  const u = document.querySelector('[data-act=undo]'), d = document.querySelector('[data-act=redo]');
  if (u) u.disabled = !ed.history.length; if (d) d.disabled = !ed.future.length;
  const b = document.querySelector('[data-act=before]'); if (b) b.setAttribute('aria-pressed', String(ed.lock));
  const s = document.querySelector('.scene'); if (s) s.innerHTML = `${esc(sceneName(ed.r.scene))}<small>${ed.r.sceneBy === 'you' ? 'your pick' : 'auto'}</small>`;
}

/* sliders */
const trackFor = k => {
  if (k === 'temp') return 'linear-gradient(90deg,#3f74d6,#7d7d7d,#e3b13a)';
  if (k === 'tint') return 'linear-gradient(90deg,#47a64f,#7d7d7d,#c64fbd)';
  const [p, b] = k.split('_');
  if (BANDS.includes(b)) {
    const h = BAND_HUE[BANDS.indexOf(b)];
    if (p === 'hue') return `linear-gradient(90deg,hsl(${h - 30} 75% 55%),hsl(${h} 75% 55%),hsl(${h + 30} 75% 55%))`;
    if (p === 'sat') return `linear-gradient(90deg,hsl(${h} 0% 55%),hsl(${h} 85% 55%))`;
    return `linear-gradient(90deg,hsl(${h} 70% 22%),hsl(${h} 70% 75%))`;
  }
  return 'linear-gradient(90deg,#3a3a3a,#3a3a3a)';
};
function slider(k, val, autoVal, label) {
  const s = SL[k], pct = x => ((x - s.min) / (s.max - s.min) * 100).toFixed(2) + '%';
  const changed = Math.abs(val - autoVal) > s.step / 2;
  return `<div class="sl${changed ? ' mine' : ''}" style="--track:${trackFor(k)};--a:${pct(autoVal)}">
    <label for="s-${k}">${esc(label || s.label)}</label><button class="val" data-act="reset-k" data-k="${k}" title="Tap to go back to the auto value" aria-label="${esc(label || s.label)} ${fmtVal(k, val)}${changed ? ', tap to go back to the auto value' : ''}">${fmtVal(k, val)}</button>
    <input id="s-${k}" type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${val}" data-k="${k}"></div>`;
}
function panel() {
  const ed = ui.ed; if (!ed) return;
  const r = ed.r, P = editOf(r), A = compose(r.auto, r.amount ?? 1, r.offset), tab = PANELS.some(([k]) => k === S.ui.panel) ? S.ui.panel : 'auto';
  document.querySelectorAll('.tabs [data-p]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.p === tab)));
  const group = g => SLIDERS.filter(s => s.group === g).map(s => slider(s.k, P[s.k], A[s.k])).join('');
  let h = '';
  if (tab === 'auto') {
    const amt = Math.round((r.amount ?? 1) * 100);
    const taste = r.offset && !isNeutral(r.offset) ? KEYS.filter(k => Math.abs(r.offset[k]) >= (k === 'exposure' ? 0.05 : 2)).sort((a, b) => Math.abs(r.offset[b]) / SL[b].max - Math.abs(r.offset[a]) / SL[a].max).slice(0, 4) : [];
    const why = [...(r.autoWhy || [])];
    h = `<div class="auto">
      <div class="sl amt" style="--track:linear-gradient(90deg,#3a3a3a,#3a3a3a);--a:${(100 / 150 * 100).toFixed(1)}%"><label for="s-amount">Auto strength</label><span class="val">${amt}%</span>
        <input id="s-amount" type="range" min="0" max="150" step="5" value="${amt}" data-amount></div>
      <p class="seen"><b>${esc(sceneName(r.scene))}</b>${r.sceneBy === 'you' ? ' (your pick)' : ''}${r.sceneWhy && r.sceneWhy.length && r.sceneBy !== 'you' ? ': ' + esc(r.sceneWhy.join(' · ')) : ''}${!r.models && S.prefs.models ? ' <span class="muted">(recognised without the models)</span>' : ''}</p>
      ${why.length ? `<ul class="why">${why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '<p class="muted">Already well balanced: the auto changes almost nothing.</p>'}
      ${taste.length ? `<p class="taste">Your taste for ${esc(sceneName(r.scene).toLowerCase())} photos${r.tasteN ? ` (learned from ${r.tasteN})` : ''}: ${taste.map(k => `${esc(labelOf(k))} ${fmtVal(k, r.offset[k])}`).join(', ')}</p>` : ''}
      <div class="row">
        <button class="btn sm" data-act="reset-mine" ${hasManual(r) ? '' : 'disabled'}>Undo my changes</button>
        <button class="btn sm" data-act="original">Original</button>
        <button class="btn sm" data-act="copy">Copy settings</button>
        <button class="btn sm" data-act="paste" ${ui.clip ? '' : 'disabled'}>Paste settings</button>
      </div></div>`;
  } else if (tab === 'mix') {
    const b = ed.band;
    h = `<div class="bands" role="group" aria-label="Colour">${BANDS.map(x => `<button data-act="band" data-b="${x}" style="--c:${BAND_COL[x]}" aria-pressed="${x === b}" aria-label="${x}"></button>`).join('')}</div>
      ${['hue', 'sat', 'lum'].map(p => slider(p + '_' + b, P[p + '_' + b], A[p + '_' + b], { hue: 'Hue', sat: 'Saturation', lum: 'Luminance' }[p])).join('')}`;
  } else if (tab === 'presets') {
    h = `<div class="presets">${S.presets.length ? S.presets.map(p => `<div class="pre"><button class="btn sm" data-act="preset" data-id="${p.id}">${esc(p.name)}</button><button class="ibtn sm" data-act="preset-del" data-id="${p.id}" aria-label="Delete ${esc(p.name)}">×</button></div>`).join('') : '<p class="muted">No presets yet. Save the current settings to reuse them on other photos.</p>'}
      <div class="row"><button class="btn sm pri" data-act="preset-save">Save these settings as a preset</button></div></div>`;
  } else h = group(tab);
  $('#pbody').innerHTML = h;
}
function onSlide(input, final) {
  const ed = ui.ed; if (!ed) return;
  const r = ed.r;
  if (input.dataset.amount != null) {
    r.amount = +input.value / 100;
    input.parentElement.querySelector('.val').textContent = input.value + '%';
    if (final) { commit(); panel(); }
    draw(); return;
  }
  const k = input.dataset.k, v = +input.value;
  setManual(r, k, v);
  const row = input.closest('.sl'), A = compose(r.auto, r.amount ?? 1, r.offset);
  row.querySelector('.val').textContent = fmtVal(k, v);
  row.classList.toggle('mine', Math.abs(v - A[k]) > SL[k].step / 2);
  if (final) commit();
  draw();
}

/* drawing */
let raf = 0, histT = null;
function view(ed) {
  const c = R.canvas, cw = c.width, ch = c.height, ia = ed.tex.w / ed.tex.h;
  const dispW = Math.min(cw, ch * ia), dispH = dispW / ia;
  const sx = cw / (dispW * ed.z), sy = ch / (dispH * ed.z);
  return [ed.cx - sx / 2, ed.cy - sy / 2, sx, sy];
}
function clampCenter(ed) {
  const v = view(ed);
  ed.cx = v[2] >= 1 ? 0.5 : clamp(ed.cx, v[2] / 2, 1 - v[2] / 2);
  ed.cy = v[3] >= 1 ? 0.5 : clamp(ed.cy, v[3] / 2, 1 - v[3] / 2);
}
function draw() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0; const ed = ui.ed; if (!ed || !R) return;
    const st = $('#stage'); if (!st) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3), w = Math.max(1, Math.round(st.clientWidth * dpr)), h = Math.max(1, Math.round(st.clientHeight * dpr));
    if (R.canvas.width !== w || R.canvas.height !== h) { R.canvas.width = w; R.canvas.height = h; clampCenter(ed); }
    R.render(editOf(ed.r), view(ed), { air: ed.r.st.air, before: ed.before || ed.lock });
    const bb = $('#beforeBadge'); if (bb) bb.hidden = !(ed.before || ed.lock);
    clearTimeout(histT); histT = setTimeout(drawHist, 140);
  });
}
function drawHist() {
  const ed = ui.ed, c = $('#hist'); if (!ed || !c || c.hidden) return;
  const s = 200 / Math.max(ed.tex.w, ed.tex.h), w = Math.max(1, Math.round(ed.tex.w * s)), h = Math.max(1, Math.round(ed.tex.h * s));
  const px = R.pixels(ed.tex, ed.before || ed.lock ? neutral() : editOf(ed.r), w, h, { air: ed.r.st.air, dither: false, before: ed.before || ed.lock });
  const H = histogram(px, 100), ctx = c.getContext('2d'), W = c.width, Ht = c.height;
  ctx.clearRect(0, 0, W, Ht); ctx.globalCompositeOperation = 'lighter';
  for (const [a, col] of [[H.r, 'rgba(230,70,70,.55)'], [H.g, 'rgba(70,200,90,.5)'], [H.b, 'rgba(80,120,240,.6)']]) {
    ctx.beginPath(); ctx.moveTo(0, Ht);
    a.forEach((v, i) => ctx.lineTo(i / (a.length - 1) * W, Ht - v * (Ht - 4)));
    ctx.lineTo(W, Ht); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = H.clipLo > 0.01 ? '#5aa0ff' : 'transparent'; ctx.fillRect(0, 0, 6, 6);
  ctx.fillStyle = H.clipHi > 0.01 ? '#ff6a5a' : 'transparent'; ctx.fillRect(W - 6, 0, 6, 6);
}

/* gestures: hold = original, drag = pan when zoomed, pinch or double-tap = zoom, ctrl-scroll on a Mac */
function bindStage(el) {
  const pts = new Map(); let hold = null, moved = false, held = false, last = 0, pinch = null, pan = null;
  const ed = () => ui.ed;
  const setBefore = on => { const e = ed(); if (!e || e.before === on) return; e.before = on; draw(); };
  const zoomAt = (e, z, px, py) => {
    const v = view(e), rect = el.getBoundingClientRect(), u = v[0] + (px - rect.left) / rect.width * v[2], w = v[1] + (py - rect.top) / rect.height * v[3];
    const old = e.z; e.z = clamp(z, 1, 8);
    const k = old / e.z; e.cx = u - (u - e.cx) * k; e.cy = w - (w - e.cy) * k; clampCenter(e); draw();
  };
  el.addEventListener('pointerdown', ev => {
    if (ev.target.closest('button')) return;
    el.setPointerCapture(ev.pointerId); pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const e = ed(); if (!e) return;
    if (pts.size === 1) { moved = false; held = false; pan = { x: ev.clientX, y: ev.clientY, cx: e.cx, cy: e.cy }; clearTimeout(hold); hold = setTimeout(() => { if (!moved) { held = true; setBefore(true); } }, 230); }
    if (pts.size === 2) { clearTimeout(hold); setBefore(false); const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: e.z }; moved = true; }
  });
  el.addEventListener('pointermove', ev => {
    if (!pts.has(ev.pointerId)) return;
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const e = ed(); if (!e) return;
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt(e, pinch.z * d / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2); return; }
    if (!pan) return;
    const dx = ev.clientX - pan.x, dy = ev.clientY - pan.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) { moved = true; clearTimeout(hold); if (!held) setBefore(false); }
    if (moved && e.z > 1 && !held) { const v = view(e), rect = el.getBoundingClientRect(); e.cx = pan.cx - dx / rect.width * v[2]; e.cy = pan.cy - dy / rect.height * v[3]; clampCenter(e); draw(); }
  });
  const up = ev => {
    if (!pts.has(ev.pointerId)) return;
    pts.delete(ev.pointerId); clearTimeout(hold);
    const e = ed(); if (!e) return;
    if (pts.size < 2) pinch = null;
    if (held) { setBefore(false); held = false; pan = null; return; }
    if (!pts.size && !moved && ev.type === 'pointerup') {
      const now = Date.now();
      if (now - last < 320) { zoomAt(e, e.z > 1.01 ? 1 : 2.5, ev.clientX, ev.clientY); last = 0; } else last = now;
    }
    if (!pts.size) pan = null;
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', ev => {
    const e = ed(); if (!e) return; ev.preventDefault();
    if (ev.ctrlKey || ev.metaKey) zoomAt(e, e.z * Math.exp(-ev.deltaY * 0.01), ev.clientX, ev.clientY);
    else if (e.z > 1) { const v = view(e), rect = el.getBoundingClientRect(); e.cx += ev.deltaX / rect.width * v[2]; e.cy += ev.deltaY / rect.height * v[3]; clampCenter(e); draw(); }
  }, { passive: false });
  el.addEventListener('contextmenu', ev => ev.preventDefault());
}

/* scene picker */
function scenePicker() {
  const r = ui.ed.r;
  sheet(`<h2>What is in this photo?</h2><p class="note">The auto works differently for each type. Picked automatically: <b>${esc(sceneName(r.sceneAuto || r.scene))}</b>${r.conf ? ` (${r.conf >= 0.6 ? 'sure' : r.conf >= 0.4 ? 'fairly sure' : 'not sure'})` : ''}.</p>
    <div class="scenes">${SCENES.map(s => `<button class="btn${s === r.scene ? ' pri' : ''}" data-act="pick-scene" data-s="${s}">${esc(PROFILES[s].name)}</button>`).join('')}</div>
    <div class="row">${r.sceneBy === 'you' ? '<button class="btn sm" data-act="pick-scene" data-s="__auto">Back to the automatic pick</button>' : ''}<button class="btn sm" data-act="recheck">Look again with the models</button><span class="sp"></span><button class="btn sm ghost" data-act="close-sheet">Close</button></div>`);
}
function pickScene(s) {
  const ed = ui.ed, r = ed.r;
  if (s === '__auto') { r.sceneBy = 'auto'; s = r.sceneAuto || 'general'; } else r.sceneBy = s === r.sceneAuto ? 'auto' : 'you';
  applyScene(r, s, S.prefs, S.taste); commit(); panel(); toolbar(); draw(); closeSheet();
}

/* export */
async function shareOrSave(files) {
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files }); return true; } catch (e) { if (e && e.name === 'AbortError') return false; }
  }
  for (const f of files) { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
  return true;
}
function readySheet(files) {
  ui.files = files;
  const total = files.reduce((a, f) => a + f.size, 0), canShare = !!(navigator.canShare && navigator.canShare({ files }));
  sheet(`<h2>${files.length === 1 ? 'Your photo is ready' : `${files.length} photos are ready`}</h2>
    <p class="note">Full size JPEG, ${fmtMB(total)}${R && R.p3 ? ', wide colour (Display P3)' : ''}.${canShare ? ' On the iPhone, choose <b>Save Image</b> to put it in Photos.' : ''}</p>
    <div class="row"><button class="btn pri" data-act="share-files">${canShare ? 'Save or share' : 'Download'}</button><span class="sp"></span><button class="btn ghost sm" data-act="close-sheet">Done</button></div>`);
}
async function exportCurrent() {
  const ed = ui.ed; if (!ed) return;
  await persistEdit();
  sheet(`<h2>Exporting…</h2><div class="prog"><span id="pg"></span></div><p class="note">Full size, ${ed.r.w} × ${ed.r.h}.</p>`);
  try {
    const file = await exportPhoto(ed.r, R, S.prefs, ed.tex, p => { const g = $('#pg'); if (g) g.style.width = (p * 100).toFixed(1) + '%'; });
    ed.exported = true; ed.r.exported = Date.now(); persistEdit();
    readySheet([file]);
  } catch (e) { sheet(`<h2>Export failed</h2><p class="note">${esc(e.message || e)}</p><div class="row"><button class="btn sm" data-act="close-sheet">Close</button></div>`); }
  draw();
}
async function exportSelected() {
  const ids = [...ui.sel]; if (!ids.length) return;
  let rr; try { rr = renderer(); } catch (e) { toast(e.message); return; }
  sheet(`<h2>Exporting ${ids.length} photo${ids.length > 1 ? 's' : ''}…</h2><div class="prog"><span id="pg"></span></div><p class="note" id="pgn"></p>`);
  const files = [];
  for (let i = 0; i < ids.length; i++) {
    const r = await L.get(ids[i]); if (!r) continue;
    const n = $('#pgn'); if (n) n.textContent = `${i + 1} of ${ids.length}: ${r.name}`;
    try {
      files.push(await exportPhoto(r, rr, S.prefs, null, p => { const g = $('#pg'); if (g) g.style.width = ((i + p) / ids.length * 100).toFixed(1) + '%'; }));
      r.exported = Date.now(); await L.put(r);
      const j = ui.list.findIndex(x => x.id === r.id); if (j >= 0) ui.list[j].exported = r.exported;
    } catch (e) { toast(r.name + ': ' + (e.message || e), 4000); }
  }
  ui.sel = null; render();
  if (files.length) readySheet(files); else closeSheet();
}

/* ---------- settings ---------- */
function renderSettings() {
  const p = S.prefs, email = ui.session, on = window.Cloud && window.Cloud.configured();
  const learned = tasteSummary(S.taste, SCENES);
  const vs = vstate.status === 'ready' ? 'Ready on this device.' : vstate.status === 'loading' ? 'Loading…' : vstate.status === 'failed' ? esc(vstate.msg) : 'Loaded with the first photo you add.';
  return `<header class="top"><button class="ibtn" data-act="lib" aria-label="Back to the library">${ico('back')}</button><h1>Settings</h1></header>
  <main class="set">
  <section><h2>How the auto works</h2><p class="note">For every photo: it measures the tones (histogram, clipping), the colour cast, the colourfulness and the haze, notices an existing look (faded blacks, split toning, black and white) and recognises the type of picture. Each type has its own targets: a landscape gets deeper skies and more vibrance, a portrait protects skin tones and stays soft, a sunset keeps its warmth, a night shot stays dark. Then your own taste is added on top.</p></section>
  <section><h2>Your taste</h2>
    <label class="tog"><input type="checkbox" data-pref="learn" ${p.learn ? 'checked' : ''}><span>Learn from my changes</span></label>
    <p class="note">When you change the auto's settings on a photo (or export it), the difference is remembered for that type of photo and added to the next ones. The more photos, the more it counts.</p>
    ${learned.length ? `<table class="learn"><tbody>${learned.map(x => `<tr><th>${esc(sceneName(x.scene))}<small>${x.n} photo${x.n > 1 ? 's' : ''}</small></th><td>${x.top.length ? x.top.map(([k, v]) => `${esc(labelOf(k))} ${fmtVal(k, v)}`).join(', ') : 'No clear preference yet'}</td></tr>`).join('')}</tbody></table>
      <div class="row"><button class="btn sm danger" data-act="taste-reset">Forget what it learned</button></div>` : '<p class="muted">Nothing learned yet.</p>'}
    <label class="fld"><span>Default auto strength: <b id="amtv">${p.amount}%</b></span><input type="range" min="0" max="150" step="5" value="${p.amount}" data-pref="amount"></label>
  </section>
  <section><h2>Scene recognition</h2>
    <label class="tog"><input type="checkbox" data-pref="models" ${p.models ? 'checked' : ''}><span>Use the on-device models</span></label>
    <p class="note">A face detector and an image classifier (MediaPipe, about 20 MB, downloaded once). They run in this browser; the photo is not sent anywhere. Without them the type is guessed from colours and tones. ${vs}</p></section>
  <section><h2>Export</h2>
    <label class="fld"><span>JPEG quality: <b id="qv">${p.quality}</b></span><input type="range" min="70" max="100" step="1" value="${p.quality}" data-pref="quality"></label>
    <label class="tog"><input type="checkbox" data-pref="keepInfo" ${p.keepInfo ? 'checked' : ''}><span>Keep the photo's details (date, camera, lens)</span></label>
    <label class="tog"><input type="checkbox" data-pref="keepPlace" ${p.keepPlace ? 'checked' : ''} ${p.keepInfo ? '' : 'disabled'}><span>Keep the place where it was taken</span></label>
    <p class="note">Exports are full size. Wide colour (Display P3) is kept on screens and browsers that support it.</p></section>
  <section><h2>Sync</h2><p class="note">${!on ? 'Sync is not set up.' : email ? `Signed in as ${esc(email)}. Your taste, presets and settings are shared between your devices.` : 'Sign in to share your taste, presets and settings between the iPhone and the Mac.'} Photos stay on each device.</p>${on ? `<div class="row"><button class="btn sm" data-act="sync">${email ? 'Manage' : 'Sign in'}</button></div>` : ''}</section>
  <section><h2>Library</h2><p class="note" id="usage">${ui.list.length} photo${ui.list.length === 1 ? '' : 's'} in this browser.</p>
    <div class="row"><button class="btn sm danger" data-act="del-all" ${ui.list.length ? '' : 'disabled'}>Delete all photos from the app</button></div>
    <p class="note">Only the app's copies are deleted: the photos in your Photos library are not touched.</p></section>
  </main>`;
}
async function showUsage() { const u = await L.usage(); const el = $('#usage'); if (el && u && u.usage) el.textContent += ` About ${fmtMB(u.usage)} used.`; }

/* ---------- shell ---------- */
export function render() {
  const main = $('#app');
  document.body.dataset.view = ui.view;
  if (ui.view === 'editor' && ui.ed) { main.innerHTML = renderEditor(); mountEditor(); return; }
  if (ui.view === 'editor') ui.view = 'library';
  main.innerHTML = ui.view === 'settings' ? renderSettings() : renderLibrary();
  if (ui.view === 'settings') showUsage();
}
export function refreshSession() {
  if (!window.Cloud || !window.Cloud.configured()) return;
  window.Cloud.session().then(s => { const e = s ? s.user.email : null; if (e !== ui.session) { ui.session = e; if (ui.view === 'settings') render(); } }).catch(() => { });
}
export function onRemote() { if (ui.view === 'settings') render(); }

async function act(a, el) {
  const ed = ui.ed;
  switch (a) {
    case 'open': return openEditor(el.dataset.id);
    case 'close': return closeEditor();
    case 'settings': return go('settings');
    case 'lib': return go('library');
    case 'select': ui.sel = ui.sel ? null : new Set(); return render();
    case 'pick': { const id = el.dataset.id; ui.sel.has(id) ? ui.sel.delete(id) : ui.sel.add(id); return render(); }
    case 'sel-all': ui.sel = new Set(ui.list.map(r => r.id)); return render();
    case 'sel-del': {
      if (!confirm(`Delete ${ui.sel.size} photo${ui.sel.size > 1 ? 's' : ''} from the app? Your Photos library is not touched.`)) return;
      for (const id of ui.sel) { await L.del(id); const c = ui.urls.get(id); if (c) URL.revokeObjectURL(c.url); ui.urls.delete(id); }
      ui.list = ui.list.filter(r => !ui.sel.has(r.id)); ui.sel = null; return render();
    }
    case 'sel-export': return exportSelected();
    case 'panel': S.ui.panel = el.dataset.p; saveUi(); return panel();
    case 'band': ed.band = el.dataset.b; return panel();
    case 'reset-k': { const k = el.dataset.k; if (!k || !ed) return; delete ed.r.manual[k]; commit(); panel(); return draw(); }
    case 'reset-mine': ed.r.manual = {}; commit(); panel(); return draw();
    case 'original': { const r = ed.r, base = compose(r.auto, r.amount ?? 1, r.offset); r.manual = {}; for (const k of KEYS) if (base[k]) r.manual[k] = -base[k]; commit(); panel(); return draw(); }
    case 'copy': ui.clip = editOf(ed.r); try { localStorage.setItem('revelateur.clip', JSON.stringify(ui.clip)); } catch (e) { } panel(); return toast('Settings copied: open another photo and paste');
    case 'paste': if (!ui.clip) return; for (const k of KEYS) setManual(ed.r, k, ui.clip[k] || 0); commit(); panel(); draw(); return toast('Settings pasted');
    case 'preset-save': {
      const name = prompt('Name of the preset', sceneName(ed.r.scene) + ' ' + (S.presets.length + 1)); if (!name) return;
      S.presets = [...S.presets, { id: Date.now().toString(36), name: name.slice(0, 40), values: editOf(ed.r) }]; save(); return panel();
    }
    case 'preset': { const p = S.presets.find(x => x.id === el.dataset.id); if (!p) return; for (const k of KEYS) setManual(ed.r, k, p.values[k] || 0); commit(); panel(); draw(); return toast(`“${p.name}” applied`); }
    case 'preset-del': { const p = S.presets.find(x => x.id === el.dataset.id); if (p && confirm(`Delete the preset “${p.name}”?`)) { S.presets = S.presets.filter(x => x !== p); save(); panel(); } return; }
    case 'undo': return undo(-1);
    case 'redo': return undo(1);
    case 'before': ed.lock = !ed.lock; toolbar(); return draw();
    case 'scene': return scenePicker();
    case 'pick-scene': return pickScene(el.dataset.s);
    case 'recheck': {
      el.disabled = true; el.textContent = 'Looking…';
      try { const ok = await recheck(ed.r, S.prefs, S.taste, R.space); if (!ok) toast('The models could not be loaded (offline?)'); }
      catch (e) { toast(e.message || String(e)); }
      commit(); panel(); toolbar(); draw(); return scenePicker();
    }
    case 'close-sheet': return closeSheet();
    case 'export': return exportCurrent();
    case 'share-files': if (ui.files) { if (await shareOrSave(ui.files)) closeSheet(); } return;
    case 'taste-reset': if (confirm('Forget everything learned from your changes?')) { resetTaste(); render(); } return;
    case 'del-all': {
      if (!confirm('Delete all photos from the app? Your Photos library is not touched.')) return;
      for (const r of ui.list) await L.del(r.id);
      for (const c of ui.urls.values()) URL.revokeObjectURL(c.url);
      ui.urls.clear(); ui.list = []; return render();
    }
    case 'sync': if (window.Cloud) window.Cloud.dialog(() => window.appSync && window.appSync()); return;
  }
}

export async function init() {
  document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) act(b.dataset.act, b); });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('input[type=range][data-k], input[data-amount]')) onSlide(t, false);
    else if (t.matches('input[type=range][data-pref]')) { const k = t.dataset.pref; S.prefs[k] = +t.value; save(); const lab = k === 'amount' ? $('#amtv') : $('#qv'); if (lab) lab.textContent = t.value + (k === 'amount' ? '%' : ''); }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('input[type=range][data-k], input[data-amount]')) onSlide(t, true);
    else if (t.matches('input[type=checkbox][data-pref]')) { S.prefs[t.dataset.pref] = t.checked; save(); if (t.dataset.pref === 'models' && t.checked) loadVision().catch(() => { }); render(); }
    else if (t.matches('input[data-add]')) { const f = t.files; if (f && f.length) addFiles(f); t.value = ''; }
  });
  document.addEventListener('keydown', e => {
    if (ui.view !== 'editor' || !ui.ed || e.target.matches('input[type=text], textarea')) return;
    if (e.key === '\\') { ui.ed.lock = !ui.ed.lock; toolbar(); draw(); }
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(e.shiftKey ? 1 : -1); }
    else if (e.key === 'Escape' && !$('#sheet').open) closeEditor();
  });
  /* drag and drop on the Mac */
  window.addEventListener('dragover', e => { if (ui.view === 'library') e.preventDefault(); });
  window.addEventListener('drop', e => { if (ui.view !== 'library') return; e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
  $('#sheet').addEventListener('click', e => { if (e.target === $('#sheet')) closeSheet(); });
  onVision(() => { if (ui.view === 'settings') render(); });
  window.addEventListener('pagehide', () => { if (ui.ed) persistEdit(); });
  try { ui.list = await L.list(); } catch (e) { toast('This browser does not allow storing photos (private mode?)', 5000); }
  render(); refreshSession();
  if (S.prefs.models && ui.list.length) setTimeout(() => loadVision().catch(() => { }), 1500);
}
