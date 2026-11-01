/* ───────────── Route builder ─────────────
   Tag the start and the finish (search or tap), add the places you pass, and the line follows the
   trails on OpenStreetMap (BRouter, hiking profile). Distance, climb, descent, time, grade and what
   is underfoot are worked out from the traced line and its way tags; nothing has to be typed in. */

const WAY_CAT = hw => /^(path|footway|steps|bridleway|via_ferrata)$/.test(hw) ? 'path' : hw === 'track' ? 'track' : /^(residential|unclassified|service|living_street|tertiary|secondary|primary|trunk|cycleway|pedestrian|road)/.test(hw) ? 'road' : 'other';
const CAT_LABEL = { path: 'trail', track: 'forest road', road: 'road', other: 'other ways', off: 'off the map (straight line)' };
const SAC_STEP = { hiking: 1, mountain_hiking: 2, demanding_mountain_hiking: 3, alpine_hiking: 4, demanding_alpine_hiking: 5, difficult_alpine_hiking: 6 };

/* Nominatim allows one request per second: every place lookup goes through this queue. */
const Nomi = {
  q: Promise.resolve(), last: 0,
  get(url) {
    const run = async () => {
      const wait = this.last + 1100 - Date.now(); if (wait > 0) await sleep(wait);
      this.last = Date.now();
      const r = await fetchT(url, {}, 12000);
      if (!r.ok) throw new Error('Place search answered ' + r.status);
      return r.json();
    };
    const p = this.q.then(run, run); this.q = p.catch(() => { }); return p;
  }
};

/* Small elevation profile for the builder panel. */
function miniProfile(c, col) {
  const pts = c.filter(p => p[2] != null);
  if (pts.length < 2) return '<p class="muted">No elevation data for this line yet.</p>';
  const dist = [0]; for (let i = 1; i < pts.length; i++) dist.push(dist[i - 1] + havLL(pts[i - 1], pts[i]));
  const ele = pts.map((p, i) => { let s = 0, n = 0; for (let k = Math.max(0, i - 2); k <= Math.min(pts.length - 1, i + 2); k++) { s += pts[k][2]; n++; } return s / n; });
  const W = 340, H = 112, pl = 34, pr = 6, pt = 8, pb = 20, tot = dist[dist.length - 1] || 1;
  let lo = Math.min(...ele), hi = Math.max(...ele); if (hi - lo < 60) { const m = (hi + lo) / 2; lo = m - 30; hi = m + 30; }
  const X = d => pl + d / tot * (W - pl - pr), Y = e => pt + (1 - (e - lo) / (hi - lo)) * (H - pt - pb);
  let line = '', area = `M${X(0)},${H - pb}`;
  ele.forEach((e, i) => { const s = X(dist[i]).toFixed(1) + ',' + Y(e).toFixed(1); line += (i ? 'L' : 'M') + s; area += 'L' + s; });
  area += `L${X(tot)},${H - pb}Z`;
  const kstep = [0.5, 1, 2, 5, 10, 20].find(s => tot / s <= 6) || 20;
  let ax = '';
  for (let k = 0; k <= tot + 1e-6; k += kstep) ax += `<text x="${X(k).toFixed(1)}" y="${H - 5}" text-anchor="middle">${k} km</text>`;
  ax += `<text x="${pl - 5}" y="${Y(hi) + 4}" text-anchor="end">${nf.format(Math.round(hi))}</text><text x="${pl - 5}" y="${Y(lo) + 4}" text-anchor="end">${nf.format(Math.round(lo))}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Elevation from ${Math.round(lo)} to ${Math.round(hi)} metres over ${tot.toFixed(1)} km">
    <line x1="${pl}" x2="${W - pr}" y1="${Y(hi)}" y2="${Y(hi)}" stroke="var(--line)"/><line x1="${pl}" x2="${W - pr}" y1="${Y(lo)}" y2="${Y(lo)}" stroke="var(--line)"/>
    <path d="${area}" fill="${col}" fill-opacity=".18"/><path d="${line}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/><g class="b-ax">${ax}</g></svg>`;
}

const Builder = {
  on: false, h: null, pts: [], nm: [], ty: 'trav', free: false, known: '',
  marks: [], res: null, seq: 0, busy: false, err: '', menuAt: -1, popup: null, timer: null,
  results: [], hist: [], gcache: {}, geo0: null,

  /* Which role a point plays, in walking order. */
  kind(i) { const n = this.pts.length; return i === 0 ? 'start' : (n > 1 && i === n - 1 && this.ty !== 'loop') ? 'finish' : 'via'; },
  label(i) { const k = this.kind(i); return k === 'start' ? 'Start' : k === 'finish' ? (this.ty === 'out' ? 'Turnaround' : 'Finish') : 'Via point ' + i; },
  glyph(i) { const k = this.kind(i); return k === 'start' ? 'S' : k === 'finish' ? (this.ty === 'out' ? '↺' : 'F') : String(i); },

  start(h = null) {
    if (Pick.on) Pick.stop(); if (Edit.on) Edit.stop(); if (Fly.on) Fly.stop();
    if (UI.detailId) UI.closeDetail(true);
    const d = !h && LS.get('buildDraft', null);
    const restore = !!(d && Array.isArray(d.pts) && d.pts.length && Date.now() - (d.ts || 0) < 14 * 864e5);
    Object.assign(this, { on: true, h, res: null, err: '', menuAt: -1, results: [], hist: [], geo0: null, busy: false });
    if (h) {
      this.pts = h.p.map(q => [q[0], q[1]]);
      this.nm = h.p.map((_, i) => ({ t: i === 0 ? h.sn || '' : i === h.p.length - 1 && h.ty !== 'loop' ? h.fn || '' : '', auto: false }));
      this.ty = h.ty; this.free = !!h.free; this.known = '';
    } else if (restore) {
      this.pts = d.pts; this.nm = (d.nm && d.nm.length === d.pts.length) ? d.nm : d.pts.map(() => ({ t: '', auto: true }));
      this.ty = d.ty || 'trav'; this.free = !!d.free; this.known = d.known || '';
    } else { this.pts = []; this.nm = []; this.ty = 'trav'; this.free = false; this.known = ''; }
    $('#panel').classList.add('building');
    $$('.views > .view').forEach(v => v.hidden = v.id !== 'view-build');
    this.render(); this.draw();
    if (isPhone()) Sheet.to(1);
    if (this.pts.length) this.fit();
    if (this.pts.length >= 2) { this.fitNext = true; this.schedule(0); }
    if (restore) toast('Picked up your unsaved route');
    this.names();
  },
  stop() {
    this.on = false; clearTimeout(this.timer); this.seq++;
    this.marks.forEach(m => m.remove()); this.marks = [];
    if (this.popup) { this.popup.remove(); this.popup = null; }
    setSrc('build', EMPTY); setSrc('build-pre', EMPTY);
    $('#panel').classList.remove('building');
    $('#view-build').innerHTML = '';
    UI.setTab(UI.state.tab);
  },
  cancel() { if (!this.h) LS.del('buildDraft'); this.stop(); },
  done() { LS.del('buildDraft'); this.stop(); },

  /* ── Panel ── */
  render() {
    const v = $('#view-build');
    v.innerHTML = `
      <div class="b-top"><button class="icon-btn" id="bBack" aria-label="Leave the route builder">${ic('i-back')}</button><h2>${this.h ? 'Edit the route' : 'Draw a route'}</h2></div>
      <p class="b-lead">Tag the <b>start</b> and the <b>finish</b> by searching or tapping the map, then tap any place you pass on the way. The line follows the trails; distance, climb, time and grade are worked out from the terrain.</p>
      <form class="b-search" id="bSearch" role="search" autocomplete="off">
        <label class="searchbar">${ic('i-search')}<input id="bQ" type="search" placeholder="Campsite, village, hut, summit, station…" enterkeyhint="search" aria-label="Search a place"></label>
        <button class="btn ghost small" type="submit">Search</button>
        <button class="icon-btn" type="button" id="bLoc" aria-label="Add my location" title="Add my location">${ic('i-pin')}</button>
      </form>
      <ul class="b-results" id="bRes" hidden></ul>
      <ol class="b-pts" id="bPts" aria-label="Points of the route"></ol>
      <div class="b-tools">
        <button type="button" class="btn ghost small" id="bUndo">${ic('i-undo')}Undo</button>
        <button type="button" class="btn ghost small" id="bRev">${ic('i-swap')}Reverse</button>
        <button type="button" class="btn ghost small" id="bClear">${ic('i-close')}Clear</button>
      </div>
      <div class="b-opts">
        <div class="seg" id="bTy" role="radiogroup" aria-label="Route type">${[['trav', 'One way'], ['out', 'Out and back'], ['loop', 'Loop']].map(([k, l]) => `<button type="button" role="radio" data-v="${k}" aria-checked="${this.ty === k}">${l}</button>`).join('')}</div>
        <label class="chk"><input type="checkbox" id="bFollow" ${this.free ? '' : 'checked'}> Follow the trails</label>
        <small class="muted b-sub">Turn off only for a path that isn't on the map: the line is then drawn straight between your points.</small>
      </div>
      <div class="b-stats" id="bStats" aria-live="polite"></div>
      <label class="field b-known">Length you know <small>optional, from a signpost, a guide or another app</small><input id="bKnown" type="number" min="0" step="0.1" inputmode="decimal" placeholder="km" value="${esc(this.known)}"></label>
      <p class="b-note" id="bKnownNote" hidden></p>
      <div class="b-foot"><button type="button" class="btn ghost" id="bCancel">Cancel</button><button type="button" class="btn primary" id="bNext">Next: name and details</button></div>`;
    $('#bBack').onclick = () => { if (!this.pts.length || this.h) this.cancel(); else { this.saveDraft(); this.stop(); toast('Your route is kept: tap Draw a route to continue'); } };
    $('#bCancel').onclick = e => {
      const b = e.currentTarget;
      if (!this.pts.length || b.dataset.armed) return this.cancel();
      b.dataset.armed = '1'; b.textContent = this.h ? 'Tap again to drop the changes' : 'Tap again to discard'; b.style.color = 'var(--bad)';
      setTimeout(() => { delete b.dataset.armed; b.textContent = 'Cancel'; b.style.color = ''; }, 3500);
    };
    $('#bSearch').onsubmit = e => { e.preventDefault(); this.search($('#bQ').value); $('#bQ').blur(); };
    $('#bLoc').onclick = () => this.locate();
    $('#bUndo').onclick = () => this.undo();
    $('#bRev').onclick = () => { this.snap(); this.pts.reverse(); this.nm.reverse(); this.changed(); };
    Dlg.confirmBtn($('#bClear'), 'Tap again to clear', () => { this.snap(); this.pts = []; this.nm = []; this.res = null; this.err = ''; this.changed(); });
    $$('#bTy button').forEach(b => b.onclick = () => { this.ty = b.dataset.v; $$('#bTy button').forEach(x => x.setAttribute('aria-checked', x === b)); this.changed(); });
    $('#bFollow').onchange = e => { this.free = !e.target.checked; this.changed(); };
    $('#bKnown').oninput = e => { this.known = e.target.value; this.knownNote(); this.saveDraft(); };
    $('#bNext').onclick = () => this.next();
    this.renderPts(); this.renderStats();
  },
  renderPts() {
    const box = $('#bPts'); if (!box) return;
    const n = this.pts.length, lead = $('#view-build .b-lead');
    if (lead) lead.hidden = n > 0;
    if (!n) box.innerHTML = `<li class="b-empty">${ic('i-draw')}<span><b>Tap the map where you start</b>, or search for the place. Then tap the places you pass, in order: the last point is the finish.</span></li>`;
    else {
      box.innerHTML = this.pts.map((q, i) => {
        const k = this.kind(i), o = this.nm[i] || {}, name = o.t || (o.pending ? 'Looking up the name…' : '');
        const el = this.res && this.res.ele[i] != null ? ' · ' + fmtM(this.res.ele[i]) : '';
        return `<li class="b-pt" data-i="${i}"><span class="b-ic b-${k}" aria-hidden="true">${this.glyph(i)}</span>
          <button type="button" class="b-nm" data-fly="${i}"><b>${esc(name || this.label(i))}</b><small>${name ? this.label(i) + el : q[0].toFixed(4) + ', ' + q[1].toFixed(4) + el}</small></button>
          <button type="button" class="icon-btn b-more" data-menu="${i}" aria-label="Options for ${esc(this.label(i))}" aria-expanded="${this.menuAt === i}">⋯</button>
          ${this.menuAt === i ? `<div class="b-menu">${k !== 'start' ? `<button type="button" data-act="start" data-i="${i}">Make it the start</button>` : ''}${k !== 'finish' && this.ty !== 'loop' && n > 1 ? `<button type="button" data-act="finish" data-i="${i}">Make it the ${this.ty === 'out' ? 'turnaround' : 'finish'}</button>` : ''}<button type="button" data-act="del" data-i="${i}">Remove</button></div>` : ''}</li>`;
      }).join('') + (n > 1 && this.ty !== 'trav' ? `<li class="b-pt b-back"><span class="b-ic b-start" aria-hidden="true">S</span><span class="b-nm"><b>${this.ty === 'loop' ? 'Back to the start' : 'Same way back to the start'}</b></span></li>` : '');
      if (n === 1) box.insertAdjacentHTML('beforeend', `<li class="b-empty small">${ic('i-plus')}<span>Now tap the finish on the map, or search for it.</span></li>`);
    }
    box.querySelectorAll('[data-fly]').forEach(b => b.onclick = () => { const q = this.pts[+b.dataset.fly]; map.flyTo({ center: [q[1], q[0]], zoom: Math.max(map.getZoom(), 14), duration: 900 }); });
    box.querySelectorAll('[data-menu]').forEach(b => b.onclick = () => { const i = +b.dataset.menu; this.menuAt = this.menuAt === i ? -1 : i; this.renderPts(); });
    box.querySelectorAll('[data-act]').forEach(b => b.onclick = () => this.act(b.dataset.act, +b.dataset.i));
    const dis = (id, v) => { const e = $(id); if (e) e.disabled = v; };
    dis('#bUndo', !this.hist.length); dis('#bRev', n < 2); dis('#bClear', !n); dis('#bNext', !this.res || this.busy);
  },
  renderStats() {
    const box = $('#bStats'); if (!box) return;
    const r = this.res;
    if (this.pts.length < 2) { box.innerHTML = ''; this.knownNote(); $('#bNext') && ($('#bNext').disabled = true); return; }
    if (!r) { box.innerHTML = `<p class="b-busy">${this.busy ? 'Following the trails…' : esc(this.err)}</p>`; return; }
    box.innerHTML = `${this.busy ? '<p class="b-busy">Updating…</p>' : ''}${this.err ? `<p class="b-warn">${esc(this.err)}</p>` : ''}
      <div class="b-big">
        <div><b>${fmtKm(r.km)}</b><small>${TYPE_LABEL[this.ty].toLowerCase()}</small></div>
        <div><b>${fmtM(r.up)}</b><small>↑ ascent</small></div>
        <div><b>${fmtM(r.dn)}</b><small>↓ descent</small></div>
        <div><b>${fmtDur(r.you)}</b><small>your time</small></div>
      </div>
      <div class="profile b-prof">${miniProfile(r.c, cssVar('--' + r.g) || '#22769A')}</div>
      <dl class="kv-list b-kv">
        <dt>Signposted</dt><dd>${fmtDur(r.din)} <span class="muted">· yours at pace ${pace().f.toFixed(2)}×</span></dd>
        <dt>Heights</dt><dd>start ${fmtM(r.lo)} · highest ${fmtM(r.mx)} · lowest ${fmtM(r.mn)}</dd>
        <dt>Grade</dt><dd><span class="gchip g-${r.g}">${GL[r.g]}</span>${r.sc ? ' <b>' + esc(r.sc) + '</b>' : ''}<br><span class="muted">${esc(r.why)}</span></dd>
        ${r.mix ? `<dt>Underfoot</dt><dd>${esc(r.mix)}</dd>` : ''}
        ${r.steep ? `<dt>Steepest</dt><dd>${r.steep} % over 200 m</dd>` : ''}
      </dl>`;
    this.knownNote();
    $('#bNext') && ($('#bNext').disabled = this.busy);
  },
  knownNote() {
    const el = $('#bKnownNote'); if (!el) return;
    const k = parseFloat(String(this.known).replace(',', '.'));
    if (!this.res || !(k > 0)) { el.hidden = true; return; }
    const d = this.res.km - k, pct = Math.abs(d) / k;
    el.hidden = false; el.className = 'b-note ' + (pct > 0.1 ? 'warn' : 'ok');
    el.textContent = pct <= 0.1
      ? `The line is ${fmtKm(this.res.km)}, within ${Math.max(1, Math.round(pct * 100))} % of your ${fmtKm(k)}: it follows the right path. Your ${fmtKm(k)} will be used as the distance.`
      : d < 0 ? `The line is ${fmtKm(-d)} shorter than your ${fmtKm(k)}, so it probably takes a shortcut. Tap the line where your path goes another way, then drag the new point onto your path.`
        : `The line is ${fmtKm(d)} longer than your ${fmtKm(k)}, so it probably makes a detour. Tap the line where your path goes another way, then drag the new point onto your path.`;
  },

  /* ── Search, location, names ── */
  async search(qs) {
    qs = (qs || '').trim(); if (!qs) return;
    const box = $('#bRes'); box.hidden = false; box.innerHTML = '<li class="b-busy">Searching…</li>';
    try {
      const b = map.getBounds(), vb = [b.getWest(), b.getNorth(), b.getEast(), b.getSouth()].map(v => v.toFixed(3)).join(',');
      const j = await Nomi.get(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&accept-language=en&countrycodes=de,at,ch,it,li,fr,si&viewbox=${vb}&q=${encodeURIComponent(qs)}`);
      this.results = j.map(e => {
        const a = e.address || {};
        return { q: [+(+e.lat).toFixed(5), +(+e.lon).toFixed(5)], name: (e.name || e.display_name.split(',')[0]).slice(0, 70), sub: [(e.type || '').replace(/_/g, ' '), a.village || a.town || a.city || a.municipality || '', a.state || a.country || ''].filter(Boolean).join(' · ') };
      });
      this.renderResults();
    } catch (e) { box.innerHTML = `<li class="b-busy">The place search didn't answer (${esc(e.message)}). Tap the map instead.</li>`; }
  },
  renderResults() {
    const box = $('#bRes'); if (!box || box.hidden) return;
    const n = this.pts.length, fin = this.ty === 'out' ? 'Turnaround' : 'Finish';
    box.innerHTML = (this.results.length ? this.results.map((r, i) => `<li><button type="button" class="b-rname" data-go="${i}"><b>${esc(r.name)}</b><small>${esc(r.sub)}</small></button>
      <span class="b-racts"><button type="button" class="btn ghost small" data-add="start" data-r="${i}">Start</button>${n ? `<button type="button" class="btn ghost small" data-add="via" data-r="${i}">Via</button>` : ''}${n && this.ty !== 'loop' ? `<button type="button" class="btn ghost small" data-add="finish" data-r="${i}">${fin}</button>` : ''}</span></li>`).join('')
      : '<li class="b-busy">Nothing found. Try another spelling, or tap the map.</li>') + '<li class="b-rclose"><button type="button" class="btn ghost small" id="bResClose">Close results</button></li>';
    box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const q = this.results[+b.dataset.go].q; map.flyTo({ center: [q[1], q[0]], zoom: Math.max(map.getZoom(), 13.5), duration: 1000 }); });
    box.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
      const r = this.results[+b.dataset.r]; this.fitNext = true; this.add(r.q, b.dataset.add, r.name);
      if (this.pts.length < 2) map.flyTo({ center: [r.q[1], r.q[0]], zoom: Math.max(map.getZoom(), 13), duration: 900 });
      toast(`${r.name}: ${b.textContent.toLowerCase()}`);
    });
    $('#bResClose').onclick = () => { box.hidden = true; box.innerHTML = ''; $('#bQ').value = ''; };
  },
  locate() {
    if (!navigator.geolocation) return toast('This browser has no access to your location');
    toast('Finding your location…');
    navigator.geolocation.getCurrentPosition(p => {
      const q = [+p.coords.latitude.toFixed(5), +p.coords.longitude.toFixed(5)];
      this.add(q, this.pts.length ? 'end' : 'start');
      map.flyTo({ center: [q[1], q[0]], zoom: Math.max(map.getZoom(), 14), duration: 900 });
    }, e => toast('No location: ' + e.message, 3500), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  },
  async geocode(q) {
    const k = q[0].toFixed(4) + ',' + q[1].toFixed(4); if (this.gcache[k]) return this.gcache[k];
    const j = await Nomi.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${q[0].toFixed(5)}&lon=${q[1].toFixed(5)}&zoom=17&addressdetails=1&accept-language=en`);
    const a = j.address || {};
    const place = a.hamlet || a.village || a.locality || a.suburb || a.town || a.city || a.municipality || '';
    const poi = j.name && !/^(highway|boundary|landuse|building|place)$/.test(j.category || '') ? j.name : '';
    return (this.gcache[k] = { name: (poi || place || a.road || '').slice(0, 70), place, cc: (a.country_code || '').toUpperCase(), state: a.state || '' });
  },
  /* Name the start and the finish from the map, unless a name was picked from the search. */
  async names() {
    const n = this.pts.length; if (!n) return;
    for (const i of [...new Set([0, n - 1])]) {
      const o = this.nm[i], q = this.pts[i];
      if (!o || !o.auto || o.t || o.pending) continue;
      if (i > 0 && this.ty === 'loop') continue;
      o.pending = true; this.renderPts();
      try { const g = await this.geocode(q); if (this.pts[i] === q) { o.t = g.name; if (i === 0) this.geo0 = g; } }
      catch (e) { /* the coordinates stay as the label */ }
      finally { o.pending = false; if (this.on) { this.renderPts(); this.labelMarks(); this.saveDraft(); } }
    }
  },

  /* ── Editing points ── */
  snap() { this.hist.push({ pts: this.pts.map(q => q.slice()), nm: this.nm.map(o => ({ t: o.t, auto: o.auto })) }); if (this.hist.length > 40) this.hist.shift(); },
  undo() { const s = this.hist.pop(); if (!s) return; this.pts = s.pts; this.nm = s.nm; this.changed(); },
  add(q, where = 'end', name = null) {
    this.snap();
    const o = { t: name || '', auto: !name }, n = this.pts.length;
    if (where === 'start' && n) { this.pts[0] = q; this.nm[0] = o; }
    else if (where === 'finish' && n >= 2) { this.pts[n - 1] = q; this.nm[n - 1] = o; }
    else if (where === 'via' && n >= 2 && this.ty !== 'loop') { this.pts.splice(n - 1, 0, q); this.nm.splice(n - 1, 0, o); }
    else if (typeof where === 'number') { this.pts.splice(where, 0, q); this.nm.splice(where, 0, o); }
    else { this.pts.push(q); this.nm.push(o); }
    this.changed();
  },
  act(a, i) {
    this.snap();
    const [q] = this.pts.splice(i, 1), [o] = this.nm.splice(i, 1);
    if (a === 'start') { this.pts.unshift(q); this.nm.unshift(o); }
    else if (a === 'finish') { this.pts.push(q); this.nm.push(o); }
    this.changed();
  },
  changed() {
    this.menuAt = -1;
    if (this.popup) { this.popup.remove(); this.popup = null; }
    this.draw(); this.renderPts(); this.renderResults(); this.saveDraft(); this.names(); this.schedule();
  },
  saveDraft() { if (this.h || !this.on) return; if (!this.pts.length) return LS.del('buildDraft'); LS.set('buildDraft', { pts: this.pts, nm: this.nm.map(o => ({ t: o.t, auto: o.auto })), ty: this.ty, free: this.free, known: this.known, ts: Date.now() }); },
  fit() {
    if (!map) return;
    const b = new maplibregl.LngLatBounds(); this.pts.forEach(q => b.extend([q[1], q[0]]));
    if (this.pts.length === 1) map.flyTo({ center: [this.pts[0][1], this.pts[0][0]], zoom: Math.max(map.getZoom(), 13.5), duration: 900 });
    else map.fitBounds(b, { padding: mapPadding(), maxZoom: 14.5, duration: 900 });
  },

  /* ── Map ── */
  click(e) {
    if (this.popup) { this.popup.remove(); this.popup = null; }
    const q = [+e.lngLat.lat.toFixed(5), +e.lngLat.lng.toFixed(5)];
    if (this.res && this.pts.length >= 2 && queryAt(e.point, ['build-line', 'build-free']).length) return this.add(q, this.insertAt(q));
    this.add(q, 'end');
  },
  /* A tap on the line adds a point between the two waypoints that segment joins. */
  insertAt(q) {
    const r = this.res; let ci = 0, bd = 1e9;
    r.c.forEach((p, i) => { const d = hav(q, [p[1], p[0]]); if (d < bd) { bd = d; ci = i; } });
    for (let k = 0; k < r.w.length - 1; k++) if (ci >= r.w[k] && ci <= r.w[k + 1]) return k + 1;
    return this.pts.length;
  },
  draw() {
    this.marks.forEach(m => m.remove()); this.marks = [];
    if (!map) return;
    this.pts.forEach((q, i) => {
      const k = this.kind(i), el = document.createElement('div');
      el.className = 'b-mk b-' + k; el.textContent = this.glyph(i);
      el.setAttribute('role', 'button'); el.tabIndex = 0;
      el.setAttribute('aria-label', this.label(i) + (this.nm[i] && this.nm[i].t ? ': ' + this.nm[i].t : '') + '. Drag to move.');
      const m = new maplibregl.Marker({ element: el, draggable: true, anchor: 'center' }).setLngLat([q[1], q[0]]).addTo(map);
      let moved = false;
      m.on('dragstart', () => { moved = true; });
      m.on('dragend', () => {
        const ll = m.getLngLat(), nq = [+ll.lat.toFixed(5), +ll.lng.toFixed(5)], o = this.nm[i];
        this.snap();
        if (o && (o.auto || hav(nq, this.pts[i]) > 0.3)) { o.t = ''; o.auto = true; }
        this.pts[i] = nq; setTimeout(() => { moved = false; }, 60); this.changed();
      });
      const open = ev => { ev.stopPropagation(); if (!moved) this.pointPopup(i); };
      el.addEventListener('click', open);
      el.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.pointPopup(i); } });
      this.marks.push(m);
    });
  },
  labelMarks() { this.marks.forEach((m, i) => m.getElement().setAttribute('aria-label', this.label(i) + (this.nm[i] && this.nm[i].t ? ': ' + this.nm[i].t : '') + '. Drag to move.')); },
  pointPopup(i) {
    const k = this.kind(i), n = this.pts.length, q = this.pts[i], el = document.createElement('div');
    el.className = 'b-pop';
    el.innerHTML = `<b>${esc((this.nm[i] && this.nm[i].t) || this.label(i))}</b><small>${this.label(i)}${this.res && this.res.ele[i] != null ? ' · ' + fmtM(this.res.ele[i]) : ''}</small>
      <div>${k !== 'start' ? '<button type="button" class="btn ghost small" data-act="start">Make it the start</button>' : ''}${k !== 'finish' && this.ty !== 'loop' && n > 1 ? `<button type="button" class="btn ghost small" data-act="finish">Make it the ${this.ty === 'out' ? 'turnaround' : 'finish'}</button>` : ''}<button type="button" class="btn ghost small" data-act="del">Remove</button></div>`;
    if (this.popup) this.popup.remove();
    this.popup = new maplibregl.Popup({ offset: 18, maxWidth: '250px', closeButton: true }).setLngLat([q[1], q[0]]).setDOMContent(el).addTo(map);
    el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => this.act(b.dataset.act, i));
  },
  routePts() { const p = this.pts.map(q => [q[0], q[1]]); if (this.ty === 'loop' && p.length > 1) p.push(p[0]); return p; },
  schedule(ms = 450) {
    clearTimeout(this.timer);
    if (this.pts.length < 2) { this.seq++; this.res = null; this.busy = false; this.err = ''; setSrc('build', EMPTY); setSrc('build-pre', EMPTY); this.renderStats(); this.renderPts(); return; }
    const p = this.routePts();
    setSrc('build-pre', { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: p.map(q => [q[1], q[0]]) }, properties: {} }] });
    this.busy = true; this.renderStats(); this.renderPts();
    this.timer = setTimeout(() => this.trace(), ms);
  },
  async trace() {
    const id = ++this.seq, pts = this.routePts();
    if (pts.length < 2) return;
    this.busy = true; this.err = '';
    let raw;
    try {
      if (this.free) raw = { c: await Routes.straight(pts), msgs: [], src: 'line' };
      else {
        try { const r = await Routes.brouterFull(pts); raw = { c: r.c, msgs: r.msgs, src: 'brouter' }; }
        catch (e) { if (e.rate) throw e; raw = await this.bySegment(pts, id); }
      }
    } catch (e) {
      if (id !== this.seq || !this.on) return;
      this.err = e.rate ? 'The trail router is busy for a moment, so the line is straight for now. It tries again in a minute.' : `Couldn't follow the trails (${e.message}), so the line is straight for now.`;
      try { raw = { c: await Routes.straight(pts), msgs: [], src: 'line' }; } catch (e2) { raw = { c: pts.map(q => [q[1], q[0], null]), msgs: [], src: 'line' }; }
      if (e.rate) setTimeout(() => { if (this.on && id === this.seq) this.trace(); }, 60000);
    }
    if (id !== this.seq || !this.on) return;
    this.busy = false;
    this.res = this.analyse(raw);
    this.paint(); this.renderStats(); this.renderPts();
    if (this.fitNext) { this.fitNext = false; this.fitLine(); }
  },
  fitLine() {
    if (!map || !this.res) return;
    const b = new maplibregl.LngLatBounds(); this.res.c.forEach(q => b.extend([q[0], q[1]]));
    map.fitBounds(b, { padding: mapPadding(), maxZoom: 14.5, duration: 900 });
  },
  /* When one call can't route everything, route each stretch; stretches with no trail become straight. */
  async bySegment(pts, id) {
    const c = [], msgs = [], segs = []; let off = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      if (id !== this.seq) throw new Error('stale');
      let part, src = 'trail';
      try { const r = await Routes.brouterFull([pts[i], pts[i + 1]]); part = r.c; msgs.push(...r.msgs); }
      catch (e) {
        if (e.rate) throw e;
        src = 'line'; part = [];
        const n = Math.max(1, Math.ceil(hav(pts[i], pts[i + 1]) / 0.06));
        for (let k = 0; k <= n; k++) part.push([pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k / n, pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k / n, null]);
        off += hav(pts[i], pts[i + 1]) * 1000;
      }
      segs.push({ from: c.length ? c.length - 1 : 0, src });
      c.push(...(c.length ? part.slice(1) : part));
      if (i < pts.length - 2) await sleep(350);
    }
    try { await fillElevation(c); } catch (e) { }
    const all = segs.every(s => s.src === 'line'), some = segs.some(s => s.src === 'line');
    return { c, msgs, off, segs, src: all ? 'line' : some ? 'mixed' : 'brouter' };
  },
  paint() {
    setSrc('build-pre', EMPTY);
    const r = this.res; if (!r) { setSrc('build', EMPTY); return; }
    const feats = r.segs && r.segs.length
      ? r.segs.map((s, k) => { const to = k + 1 < r.segs.length ? r.segs[k + 1].from : r.c.length - 1; return { type: 'Feature', geometry: { type: 'LineString', coordinates: r.c.slice(s.from, to + 1).map(q => [q[0], q[1]]) }, properties: { src: s.src } }; })
      : [{ type: 'Feature', geometry: { type: 'LineString', coordinates: r.c.map(q => [q[0], q[1]]) }, properties: { src: r.src === 'line' ? 'line' : 'trail' } }];
    setSrc('build', { type: 'FeatureCollection', features: feats });
  },
  /* Everything the hike needs, from the traced line and the way tags along it. */
  analyse(raw) {
    const c = raw.c.map(q => [q[0], q[1], q[2] != null ? Math.round(q[2]) : null]);
    const st = lineStats(c), out = this.ty === 'out';
    const km = st.km * (out ? 2 : 1), up = out ? st.asc + st.desc : st.asc, dn = out ? up : st.desc;
    const din = dinMinutes(km, up, dn), you = Math.round(din * pace().f / 5) * 5;
    // where each waypoint sits on the line (first close pass, in order)
    const w = []; let from = 0;
    for (const q of this.pts) {
      let best = from, bd = 1e9;
      for (let i = from; i < c.length; i++) { const d = hav(q, [c[i][1], c[i][0]]); if (d < bd) { bd = d; best = i; } }
      let pick = best; for (let i = from; i < best; i++) if (hav(q, [c[i][1], c[i][0]]) < bd + 0.03) { pick = i; break; }
      w.push(pick); from = pick;
    }
    const ele = w.map(i => c[i] ? c[i][2] : null);
    let ti = 0; c.forEach((q, i) => { if ((q[2] ?? -1e9) > (c[ti][2] ?? -1e9)) ti = i; });
    const tp = [+c[ti][1].toFixed(5), +c[ti][0].toFixed(5)];
    let hiWp = 0, hd = 1e9; this.pts.forEach((q, i) => { const d = hav(q, tp); if (d < hd) { hd = d; hiWp = i; } });
    // underfoot and difficulty, from OpenStreetMap tags
    const cat = { path: 0, track: 0, road: 0, other: 0, off: raw.off || (raw.src === 'line' ? st.km * 1000 : 0) };
    let sac = 0, ferrata = false, steps = 0;
    for (const m of raw.msgs || []) {
      const hw = (m.w.match(/(?:^|\s)highway=(\w+)/) || [, ''])[1];
      cat[WAY_CAT(hw)] += m.d;
      sac = Math.max(sac, SAC_STEP[(m.w.match(/sac_scale=(\w+)/) || [, ''])[1]] || 0);
      if (hw === 'via_ferrata' || /via_ferrata_scale=/.test(m.w)) ferrata = true;
      if (hw === 'steps') steps += m.d;
    }
    const tot = Object.values(cat).reduce((a, b) => a + b, 0) || 1;
    const mix = Object.entries(cat).filter(([, v]) => v / tot >= 0.01).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${Math.round(v / tot * 100)} % ${CAT_LABEL[k]}`).join(' · ');
    const dist = [0]; for (let i = 1; i < c.length; i++) dist.push(dist[i - 1] + havLL(c[i - 1], c[i]));
    let steep = 0;
    for (let i = 0, j = 0; i < c.length; i++) {
      while (j < c.length - 1 && dist[j] - dist[i] < 0.2) j++;
      if (dist[j] - dist[i] >= 0.15 && c[i][2] != null && c[j][2] != null) steep = Math.max(steep, Math.abs(c[j][2] - c[i][2]) / ((dist[j] - dist[i]) * 1000) * 100);
    }
    steep = Math.round(steep);
    let g, s = 0, why;
    if (ferrata) { g = 'expert'; why = 'Part of it is a via ferrata: harness, lanyard and helmet.'; }
    else if (sac) { s = sac; g = sac >= 4 ? 'expert' : sac === 3 ? 'hard' : sac === 2 ? 'moderate' : 'easy'; why = `The hardest stretch is marked as a ${SCALES['T' + sac].split(' · ')[1]} on OpenStreetMap.`; }
    else if (cat.path / tot > 0.15 && steep >= 30) { s = 2; g = 'moderate'; why = `No difficulty is marked on the map, but the trail gets steep (${steep} %).`; }
    else { s = 1; g = 'easy'; why = cat.off / tot > 0.5 ? 'Drawn freehand, so there is no trail data: check the grade yourself.' : 'No difficult stretch is marked on the map.'; }
    const sc = ferrata ? '' : s ? 'T' + s : '';
    const dogT = ferrata || sac >= 4 ? 'no' : sac === 3 || steps > 150 ? 'care' : 'ok';
    if (!this.err && raw.src === 'mixed') this.err = 'Part of the way has no trail on the map, so that stretch is a straight dashed line.';
    return { c, segs: raw.segs, src: raw.src, km, up, dn, din, you, mx: st.mx, mn: st.mn, lo: c[0][2] ?? st.mn, tp, hiWp, w, ele, g, sc, why, mix, steep, dogT };
  },

  /* ── Save: name and details in the usual hike dialog, with everything filled in ── */
  async next() {
    const r = this.res; if (!r || this.busy || this.pts.length < 2) return;
    const h0 = this.h, n = this.pts.length;
    let g0 = this.geo0;
    if (!g0) { try { g0 = this.geo0 = await this.geocode(this.pts[0]); } catch (e) { g0 = null; } }
    const cat = HK.filter(x => !x.custom).sort((a, b) => hav(a.start, this.pts[0]) - hav(b.start, this.pts[0]))[0];
    const nearOK = cat && hav(cat.start, this.pts[0]) < 15;
    const c = g0 && COUNTRIES[g0.cc] ? g0.cc : cat ? cat.c : 'DE';
    const sn = (this.nm[0] && this.nm[0].t) || '', fn = this.ty === 'loop' ? '' : (this.nm[n - 1] && this.nm[n - 1].t) || '';
    const known = parseFloat(String(this.known).replace(',', '.'));
    const sc = c === 'IT' ? ({ T1: 'T', T2: 'E', T3: 'EE' }[r.sc] || (r.sc ? 'EE' : '')) : r.sc;
    const draft = enrich({
      id: h0 ? h0.id : 'my-' + uid(), custom: true,
      n: (h0 && h0.n) || this.autoName(sn, fn),
      ar: (h0 && h0.ar) || (nearOK ? cat.ar : (g0 && g0.place) || 'My hikes'), rg: (h0 && h0.rg) || (g0 && g0.state) || (nearOK ? cat.rg : ''), c: (h0 && h0.c) || c,
      p: this.pts.map(q => [q[0], q[1]]), hi: r.hiWp, tp: r.tp, ty: this.ty, free: this.free || undefined, sn: sn || undefined, fn: fn || undefined,
      km: Math.round((known > 0 ? known : r.km) * 10) / 10, up: Math.round(r.up / 10) * 10, dn: this.ty === 'trav' ? Math.round(r.dn / 10) * 10 : null,
      mx: r.mx || 0, lo: r.lo || 0, g: h0 ? h0.g : r.g, sc: h0 ? h0.sc : sc,
      tg: (h0 && h0.tg) || [], ss: (h0 && h0.ss) || (r.mx > 1700 ? [6, 10] : r.mx > 1200 ? [5, 10] : [4, 11]),
      d: (h0 && h0.d) || { r: 'free', t: r.dogT, cow: 0, h2o: 0, n: '' },
      lf: (h0 && h0.lf) || '', b: (h0 && h0.b) || '', links: (h0 && h0.links) || [], auto: !(known > 0)
    });
    const route = { c: simplify(r.c, 4).map(q => [Math.round(q[0] * 1e5) / 1e5, Math.round(q[1] * 1e5) / 1e5, q[2]]), src: r.src === 'brouter' ? 'brouter' : r.src };
    Dlg.hike(draft, !h0, { route, builder: true, why: r.why, suggested: r.g, traced: r.km });
  },
  autoName(sn, fn) {
    if (this.ty === 'loop') return sn ? sn + ' loop' : 'My loop';
    if (this.ty === 'out') return fn ? fn + (sn ? ' from ' + sn : '') : sn ? 'From ' + sn : 'My route';
    return sn && fn ? sn + ' to ' + fn : sn || fn || 'My route';
  }
};
