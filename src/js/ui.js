/* ───────────── UI ───────────── */
const F_DEFAULT = { grades: [], km: [0, 26], up: 2300, drive: 480, dog: 'any', status: 'all', countries: [], tags: [], season: false, loop: false, lift: false, wx: false, area: '' };
const UI = {
  state: Object.assign({ tab: 'hikes', q: '', sort: 'weather', inView: false, wxOnMap: false, dDay: null }, LS.get('ui', {})),
  filtered: null, detailId: null,
  save() { LS.set('ui', { ...this.state, dDay: null }); },
  f() { return (this.state.f = Object.assign(structuredClone(F_DEFAULT), this.state.f || {})); },

  /* Filtering */
  pass(h, dm) {
    const f = this.f();
    if (f.grades.length && !f.grades.includes(h.g)) return false;
    if (h.km < f.km[0] || (f.km[1] < 26 && h.km > f.km[1])) return false;
    if (f.up < 2300 && h.up > f.up) return false;
    if (f.drive < 480 && driveMin(h) > f.drive) return false;
    if (f.dog === 'allowed' && h.d.r === 'banned') return false;
    if (f.dog === 'good' && dogStatus(h).s !== 'good') return false;
    if (f.status === 'done' && !dm[h.id]) return false;
    if (f.status === 'todo' && dm[h.id]) return false;
    if (f.status === 'wish' && !isWish(h.id)) return false;
    if (f.countries.length && !f.countries.includes(h.c)) return false;
    if (f.tags.length && !f.tags.some(t => h.tg.includes(t) || (t === 'cablecar' && h.lift))) return false;
    if (f.season && !inSeason(h)) return false;
    if (f.loop && h.ty !== 'loop') return false;
    if (f.lift && !h.lift) return false;
    if (f.area && h.ar !== f.area) return false;
    if (f.wx && WX) { const s = dayScore(wxOf(h), wxDay); if (s == null || s < 55) return false; }
    const q = norm(this.state.q).trim();
    if (q && !q.split(/\s+/).every(t => h.q.includes(t))) return false;
    return true;
  },
  compute() { const dm = doneMap(); this.filtered = HK.filter(h => this.pass(h, dm)); return this.filtered; },
  sortList(list) {
    const k = this.state.sort, sc = h => dayScore(wxOf(h), wxDay) ?? -1;
    const by = {
      weather: (a, b) => sc(b) - sc(a) || (inSeason(b) - inSeason(a)) || a.n.localeCompare(b.n),
      drive: (a, b) => driveMin(a) - driveMin(b), km: (a, b) => a.km - b.km, up: (a, b) => a.up - b.up,
      grade: (a, b) => GRADES.indexOf(a.g) - GRADES.indexOf(b.g) || a.km - b.km, name: (a, b) => a.n.localeCompare(b.n),
      recent: (a, b) => (b.ad || '').localeCompare(a.ad || '') || a.n.localeCompare(b.n)
    }[k] || ((a, b) => a.n.localeCompare(b.n));
    return list.slice().sort(by);
  },
  refresh() {
    this.compute(); this.renderList(); this.renderChips(); pushHikeData(); renderWxMarkers();
    const n = this.filtered.length; $('#fShow').textContent = `Show ${n} hike${n === 1 ? '' : 's'}`;
    if (this.state.tab === 'weather') this.renderWeather();
    this.save(); Routes.background();
  },

  /* Rows */
  row(h, dm, extra = '') {
    const w = wxOf(h), st = dogStatus(h), done = dm[h.id];
    const wx = w ? (() => { const [i] = wmo(w.code[wxDay]); return `<span class="wx-mini" title="${esc(wmo(w.code[wxDay])[1])} at the top">${ic(i)}${Math.round(w.tx[wxDay])}°</span>`; })() : '';
    return `<li class="hike-row" tabindex="0" data-id="${h.id}">
      <span class="gdot g-${h.g}" title="${GL[h.g]}"></span>
      <div class="row-main">
        <div class="row-name">${esc(h.n)}${isNewHike(h) ? '<span class="badge-new">New</span>' : ''}${done ? `<span class="badge-done" title="Done ${done.length}×">${ic('i-check')}</span>` : isWish(h.id) ? `<span class="badge-wish" title="On the bucket list">${ic('i-star')}</span>` : ''}</div>
        <div class="row-meta"><span>${fmtKm(h.km)}</span><span>↑ ${fmtM(h.up)}</span><span>${fmtDur(yourTime(h))}</span><span>${ic('i-car')} ${fmtDur(driveMin(h))}</span></div>
        <div class="row-area">${esc(h.ar)} · ${h.c}${!inSeason(h) ? ' · <em>out of season</em>' : ''}</div>
      </div>
      <div class="row-side">${extra}${wx}<span class="dog-mini dog-${st.s}" title="${esc(st.label)}">${ic('i-paw')}</span></div>
    </li>`;
  },
  bindRows(root) {
    root.querySelectorAll('.hike-row').forEach(li => {
      li.addEventListener('click', () => this.openHike(li.dataset.id));
      li.addEventListener('keydown', e => { if (e.key === 'Enter') this.openHike(li.dataset.id); });
    });
  },
  renderList() {
    if (!this.filtered) this.compute();
    let list = this.filtered;
    if (this.state.inView && map) { const b = map.getBounds(); list = list.filter(h => b.contains([h.start[1], h.start[0]])); }
    list = this.sortList(list);
    const dm = doneMap();
    $('#countLabel').textContent = this.state.inView ? `${list.length} in view · ${this.filtered.length} match` : `${list.length} hike${list.length === 1 ? '' : 's'}`;
    const q = (this.state.q || '').trim();
    $('#hikeList').innerHTML = list.length ? list.map(h => this.row(h, dm)).join('') :
      `<li class="empty"><strong>No hikes match</strong>Loosen a filter in Find, or add your own hike on the map.${q ? `<br><button type="button" class="btn ghost small" id="askEmpty">${ic('i-plus')}Ask for “${esc(q)}” in the weekly update</button>` : ''}</li>`;
    this.bindRows($('#hikeList'));
    const ask = $('#askEmpty'); if (ask) ask.onclick = () => Dlg.ask(q);
    this.renderNews();
  },
  /* "New this week" strip above the list, until it is dismissed */
  renderNews() {
    const box = $('#newsBar'); if (!box) return;
    const seen = LS.get('newsSeen', '');
    const fresh = HK.filter(h => isNewHike(h) && h.ad > seen).sort((a, b) => b.ad.localeCompare(a.ad) || a.n.localeCompare(b.n));
    if (!fresh.length || this.state.sort === 'recent') { box.hidden = true; return; }
    const names = fresh.slice(0, 3).map(h => esc(h.n)).join(', ') + (fresh.length > 3 ? ` and ${fresh.length - 3} more` : '');
    box.hidden = false;
    box.innerHTML = `<div><b>${fresh.length} new hike${fresh.length === 1 ? '' : 's'}</b> · added ${fmtDate(fresh[0].ad)}<br><span>${names}</span></div>
      <button type="button" class="btn primary small" id="newsShow">Show</button><button type="button" class="icon-btn" id="newsClose" aria-label="Dismiss">${ic('i-close')}</button>`;
    const done = () => { LS.set('newsSeen', fresh[0].ad); box.hidden = true; };
    $('#newsShow').onclick = () => { this.state.sort = 'recent'; $('#sortSel').value = 'recent'; this.state.q = ''; $('#q').value = ''; done(); this.refresh(); };
    $('#newsClose').onclick = done;
  },
  renderChips() {
    const f = this.f(), chips = [];
    const add = (label, clear) => chips.push({ label, clear });
    if (f.grades.length) add(f.grades.map(g => GL[g]).join(', '), () => f.grades = []);
    if (f.km[0] > 0 || f.km[1] < 26) add(`${f.km[0]}–${f.km[1] < 26 ? f.km[1] : '25+'} km`, () => f.km = [0, 26]);
    if (f.up < 2300) add(`≤ ${fmtM(f.up)} up`, () => f.up = 2300);
    if (f.drive < 480) add(`≤ ${fmtDur(f.drive)} drive`, () => f.drive = 480);
    if (f.dog !== 'any') add(f.dog === 'good' ? (dogName() ? `Good for ${dogName()}` : 'Good for our dog') : 'Dogs allowed', () => f.dog = 'any');
    if (f.status !== 'all') add({ done: 'Done', todo: 'Not done', wish: 'Bucket list' }[f.status], () => f.status = 'all');
    if (f.countries.length) add(f.countries.join(', '), () => f.countries = []);
    if (f.tags.length) add(f.tags.map(t => (TAGS.find(x => x[0] === t) || [, t])[1]).join(' or '), () => f.tags = []);
    if (f.season) add('In season', () => f.season = false);
    if (f.loop) add('Loops', () => f.loop = false);
    if (f.lift) add('Lift or boat', () => f.lift = false);
    if (f.wx) add('Good weather', () => f.wx = false);
    if (f.area) add(f.area, () => f.area = '');
    const box = $('#activeFilters');
    box.innerHTML = chips.map((c, i) => `<span class="chip">${esc(c.label)}<button data-i="${i}" aria-label="Remove filter ${esc(c.label)}">${ic('i-close')}</button></span>`).join('');
    box.querySelectorAll('button').forEach(b => b.onclick = () => { chips[+b.dataset.i].clear(); this.syncFind(); this.refresh(); });
  },

  /* Tabs & sheet */
  setTab(tab) {
    if (this.detailId) this.closeDetail(true);
    this.state.tab = tab;
    $$('.tabs [role=tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
    $$('.views > .view').forEach(v => v.hidden = v.dataset.view !== tab);
    if (tab === 'weather') this.renderWeather();
    if (tab === 'log') this.renderLog();
    if (tab === 'hikes') this.renderList();
    this.save();
  },

  /* Find */
  buildFind() {
    $('#fGrades').innerHTML = GRADES.map(g => `<button type="button" data-v="${g}"><span class="gdot g-${g}"></span>${GL[g]}</button>`).join('');
    $('#fCountry').innerHTML = Object.entries(COUNTRIES).map(([k, v]) => `<button type="button" data-v="${k}">${v}</button>`).join('');
    $('#fTags').innerHTML = TAGS.map(([k, v]) => `<button type="button" data-v="${k}">${v}</button>`).join('');
    const tog = (box, key) => box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const f = this.f(), arr = f[key], v = b.dataset.v, i = arr.indexOf(v);
      i >= 0 ? arr.splice(i, 1) : arr.push(v);
      this.syncFind(); this.refresh();
    });
    tog($('#fGrades'), 'grades'); tog($('#fCountry'), 'countries'); tog($('#fTags'), 'tags');
    const seg = (box, key) => box.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; this.f()[key] = b.dataset.v; this.syncFind(); this.refresh(); });
    seg($('#fDog'), 'dog'); seg($('#fStatus'), 'status');
    const rng = () => {
      const f = this.f(); let a = +$('#fKmMin').value, b = +$('#fKmMax').value;
      if (a >= b) { if (document.activeElement === $('#fKmMin')) b = a + 1; else a = b - 1; }
      f.km = [a, b]; f.up = +$('#fUp').value; f.drive = +$('#fDrive').value;
      this.syncFind(); this.refreshSoon();
    };
    ['#fKmMin', '#fKmMax', '#fUp', '#fDrive'].forEach(s => $(s).addEventListener('input', rng));
    [['#fSeason', 'season'], ['#fLoop', 'loop'], ['#fLift', 'lift'], ['#fWx', 'wx']].forEach(([s, k]) => $(s).addEventListener('change', e => { this.f()[k] = e.target.checked; this.refresh(); }));
    $('#fReset').onclick = () => { this.state.f = structuredClone(F_DEFAULT); this.syncFind(); this.refresh(); };
    $('#fShow').onclick = () => { this.setTab('hikes'); fitRegion(); };
    this.syncFind();
  },
  refreshSoon: debounce(function () { UI.refresh(); }, 250),
  syncFind() {
    const f = this.f();
    $$('#fGrades button').forEach(b => b.setAttribute('aria-pressed', f.grades.includes(b.dataset.v)));
    $$('#fCountry button').forEach(b => b.setAttribute('aria-pressed', f.countries.includes(b.dataset.v)));
    $$('#fTags button').forEach(b => b.setAttribute('aria-pressed', f.tags.includes(b.dataset.v)));
    $$('#fDog button').forEach(b => b.setAttribute('aria-checked', f.dog === b.dataset.v));
    $$('#fStatus button').forEach(b => b.setAttribute('aria-checked', f.status === b.dataset.v));
    $('#fDogGood').textContent = dogName() ? 'Good for ' + dogName() : 'Good for our dog';
    $('#fKmMin').value = f.km[0]; $('#fKmMax').value = f.km[1]; $('#fUp').value = f.up; $('#fDrive').value = f.drive;
    $('#oKm').textContent = `${f.km[0]}–${f.km[1] < 26 ? f.km[1] : '25+'} km`;
    $('#oUp').textContent = f.up < 2300 ? '≤ ' + fmtM(f.up) : 'Any';
    $('#oDrive').textContent = f.drive < 480 ? '≤ ' + fmtDur(f.drive) : 'Any';
    $('#fSeason').checked = f.season; $('#fLoop').checked = f.loop; $('#fLift').checked = f.lift; $('#fWx').checked = f.wx;
    $('#fWxDay').textContent = WX ? fmtDate(WX.days[wxDay], { wd: true }) : 'today';
    const n = this.filtered ? this.filtered.length : HK.length;
    $('#fShow').textContent = `Show ${n} hike${n === 1 ? '' : 's'}`;
  },

  /* Weather tab */
  dayBar(box, onPick) {
    if (!WX) { box.innerHTML = '<span class="muted">Loading forecast…</span>'; return; }
    const avg = i => { const v = (this.filtered || HK).map(h => wxOf(h)).filter(Boolean); const c = {}; v.forEach(w => c[w.code[i]] = (c[w.code[i]] || 0) + 1); const code = +Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0]; return { code, tx: v.reduce((s, w) => s + (w.tx[i] || 0), 0) / Math.max(1, v.length) }; };
    box.innerHTML = WX.days.map((d, i) => { const a = avg(i); return `<button class="day" data-i="${i}" aria-pressed="${i === wxDay}"><span>${i === 0 ? 'Today' : WD[new Date(d + 'T12:00').getDay()]}</span>${ic(wmo(a.code)[0])}<b>${Math.round(a.tx)}°</b></button>`; }).join('');
    box.querySelectorAll('.day').forEach(b => b.onclick = () => { wxDay = +b.dataset.i; onPick(); });
  },
  renderWeather() {
    const pick = () => { this.syncFind(); this.refresh(); this.renderWeather(); this.renderMapDaybar(); };
    this.dayBar($('#wxDays'), pick);
    $('#wxOnMap').checked = this.state.wxOnMap;
    if (!WX) { $('#wxBest').innerHTML = '<li class="empty">Forecast is loading…</li>'; return; }
    const age = Math.round((Date.now() - WX.ts) / 6e4);
    $('#wxUpdated').textContent = age < 2 ? 'Updated just now' : `Updated ${age} min ago`;
    const list = (this.filtered || HK).map(h => ({ h, s: dayScore(wxOf(h), wxDay) })).filter(x => x.s != null)
      .sort((a, b) => (b.s - (inSeason(b.h) ? 0 : 40)) - (a.s - (inSeason(a.h) ? 0 : 40)));
    $('#wxScope').textContent = `· ${fmtDate(WX.days[wxDay], { wd: true })}, from your ${list.length} filtered hikes`;
    const dm = doneMap();
    $('#wxBest').innerHTML = list.slice(0, 12).map(x => this.row(x.h, dm, `<span class="score ${scoreCls(x.s)}" title="${scoreWord(x.s)} day">${x.s}</span>`)).join('') || '<li class="empty">No forecast for these hikes yet.</li>';
    this.bindRows($('#wxBest'));
    const areas = {};
    for (const x of list) (areas[x.h.ar] = areas[x.h.ar] || []).push(x);
    $('#wxAreas').innerHTML = Object.entries(areas).map(([a, xs]) => {
      const s = Math.round(xs.reduce((t, x) => t + x.s, 0) / xs.length), w = wxOf(xs[0].h);
      return { a, s, html: `<div class="wx-area"><span>${esc(a)} <span class="muted">· ${xs.length}</span></span><span class="wx-mini">${ic(wmo(w.code[wxDay])[0])}${Math.round(w.tx[wxDay])}°</span><span class="score ${scoreCls(s)}">${s}</span></div>` };
    }).sort((p, q) => q.s - p.s).map(x => x.html).join('');
  },
  renderMapDaybar() {
    const bar = $('#wxMapbar'); bar.hidden = !this.state.wxOnMap || !WX;
    if (!bar.hidden) this.dayBar(bar, () => { this.syncFind(); this.refresh(); this.renderMapDaybar(); if (this.state.tab === 'weather') this.renderWeather(); });
  },
  setWxOnMap(on) {
    this.state.wxOnMap = on; this.save();
    $('#btnWx').setAttribute('aria-pressed', on); $('#wxOnMap').checked = on;
    renderWxMarkers(); this.renderMapDaybar();
  },

  /* Logbook */
  renderLog() {
    const L = logs(), dm = doneMap(), ids = Object.keys(dm), hs = ids.map(id => HBY[id]);
    const km = L.reduce((s, l) => s + (l.km || HBY[l.hike].km), 0), up = L.reduce((s, l) => s + (l.up ?? HBY[l.hike].up), 0);
    const hrs = L.reduce((s, l) => s + (l.dur || 0), 0) / 60, top = hs.reduce((m, h) => Math.max(m, h.mx), 0);
    const ctry = new Set(hs.map(h => h.c)).size;
    $('#logStats').innerHTML = [[ids.length, 'Hikes'], [Math.round(km), 'Kilometres'], [nf.format(Math.round(up)), 'Metres up'], [Math.round(hrs), 'Hours'], [top ? nf.format(top) : '–', 'Highest (m)'], [ctry + '/4', 'Countries']]
      .map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
    const p = pace();
    $('#paceCard').innerHTML = `Your pace: <b>${p.f.toFixed(2)}×</b> signposted time. ${p.auto ? `Learned from ${p.n} timed hikes.` : p.n ? `Using your setting until 3 timed hikes are logged (${p.n} so far).` : 'From what you told me (5–10 min faster per hour); it recalibrates after 3 timed hikes.'} A 3 h signpost is about <b>${fmtDur(180 * p.f)}</b> for you.`;
    const areas = {};
    for (const h of HK) { const a = areas[h.ar] = areas[h.ar] || { t: 0, d: 0, c: h.c }; a.t++; if (dm[h.id]) a.d++; }
    const ar = Object.entries(areas).sort((a, b) => b[1].d - a[1].d || b[1].t - a[1].t);
    const showAll = this._allAreas;
    $('#logAreas').innerHTML = ar.slice(0, showAll ? 99 : 8).map(([n, a]) => `<div class="area" data-a="${esc(n)}" role="button" tabindex="0"><span>${esc(n)} <span class="muted">· ${a.c}</span></span><em>${a.d}/${a.t}</em><div class="bar"><i style="width:${Math.round(a.d / a.t * 100)}%"></i></div></div>`).join('') +
      (ar.length > 8 ? `<button class="btn ghost small" id="areasMore">${showAll ? 'Show fewer' : `All ${ar.length} areas`}</button>` : '');
    $$('#logAreas .area').forEach(el => el.onclick = () => { this.f().area = el.dataset.a; this.syncFind(); this.setTab('hikes'); this.refresh(); fitRegion(); });
    const more = $('#areasMore'); if (more) more.onclick = () => { this._allAreas = !this._allAreas; this.renderLog(); };
    $('#logList').innerHTML = L.length ? L.map(l => {
      const h = HBY[l.hike], [y, m, d] = l.date.split('-');
      const who = (l.who || [0, 1]).map(i => esc(personName(i))).join(' & ');
      return `<li class="log-item"><div class="log-date"><b>${+d}</b>${MONTHS[+m - 1]} ${y}</div>
        <div><div class="log-name" data-id="${h.id}">${esc(h.n)}</div><div class="log-meta">${l.dur ? fmtDur(l.dur) + ' · ' : ''}${who}${l.dog ? ' · with ' + esc(dogName() || 'the dog') : ''}${l.rating ? ' · ' + '★'.repeat(l.rating) : ''}${l.km ? ' · GPX ' + fmtKm(l.km) : ''}</div>${l.note ? `<div class="log-note">${esc(l.note)}</div>` : ''}</div>
        <button class="icon-btn" data-edit="${l.id}" aria-label="Edit this entry">${ic('i-edit')}</button></li>`;
    }).join('') : `<li class="empty"><strong>Nothing logged yet</strong>Open a hike and press “Mark as done”, or import a GPX from Komoot, Strava or Apple Health.</li>`;
    $$('#logList .log-name').forEach(el => el.onclick = () => this.openHike(el.dataset.id));
    $$('#logList [data-edit]').forEach(b => b.onclick = () => Dlg.log(HBY[ITEMS[b.dataset.edit].d.hike], b.dataset.edit));
    const wl = HK.filter(h => isWish(h.id) && !dm[h.id]);
    $('#wishList').innerHTML = wl.length ? wl.map(h => this.row(h, dm)).join('') : `<li class="empty">Tap the star on any hike to add it here.</li>`;
    this.bindRows($('#wishList'));
    $('#badges').innerHTML = badges(L, dm).map(b => `<div class="badge${b.on ? ' on' : ''}" title="${esc(b.how)}"><i>${b.on ? '✓' : b.n}</i>${esc(b.t)}</div>`).join('');
  },

  /* Detail */
  openHike(id, opts = {}) {
    const h = HBY[id]; if (!h) return;
    this.detailId = id;
    $$('.views > .view').forEach(v => v.hidden = v.id !== 'view-detail');
    const v = $('#view-detail'); v.scrollTop = 0;
    this.state.dDay = wxDay;
    v.innerHTML = this.detailHTML(h);
    this.bindDetail(h);
    showSelected(h);
    if (!opts.noFly) flyToHike(h);
    if (isPhone()) Sheet.atLeast(1);
    try { history.replaceState(null, '', '#hike-' + id); } catch (e) { }
    Routes.get(h).then(r => { if (this.detailId !== id) return; showSelected(h); if (!opts.noFly) flyToHike(h); this.renderProfile(h, r); pushHikeData(); })
      .catch(e => { const p = $('#dProfile'); if (p) p.innerHTML = `<p class="muted">Couldn't trace the route right now (${esc(e.message)}). The waypoints are still shown on the map.</p>`; });
    this.loadDetailWeather(h);
    Photos.load(h);
  },
  closeDetail(silent) {
    this.detailId = null; showSelected(null);
    if (!silent) { $$('.views > .view').forEach(v => v.hidden = v.dataset.view !== this.state.tab); }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { }
  },
  detailHTML(h) {
    const dm = doneMap(), done = dm[h.id] || [], st = dogStatus(h), p = pace();
    const where = [h.rg, COUNTRIES[h.c]].filter(Boolean).join(', ');
    const lines = [];
    const gsearch = (site) => `https://www.google.com/search?q=${encodeURIComponent((site ? 'site:' + site + ' ' : '') + h.n + ' ' + (h.ar || ''))}`;
    const links = [['Photos', `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(h.n + ' ' + h.ar)}`], ['Komoot', gsearch('komoot.com')], ['Outdooractive', gsearch('outdooractive.com')], ['AllTrails', gsearch('alltrails.com')], ['hikr', gsearch('hikr.org')], ['Webcams', `https://www.google.com/search?q=${encodeURIComponent('webcam ' + (h.tn || h.ar))}`]];
    (h.links || []).forEach((u, i) => links.unshift(['Link ' + (i + 1), u]));
    const m = new Date().getMonth() + 1;
    const winter = m >= 11 || m <= 5 || (h.mx > 1800 && (m === 10 || m === 6));
    const aval = { DE: ['Bavarian avalanche service', 'https://www.lawinenwarndienst-bayern.de/'], AT: h.rg === 'Tyrol' ? ['Euregio avalanche report', 'https://avalanche.report'] : h.rg === 'Salzburg' ? ['Salzburg avalanche service', 'https://lawine.salzburg.at/'] : h.rg === 'Vorarlberg' ? ['Vorarlberg avalanche service', 'https://www.vorarlberg.at/lawine'] : ['Upper Austria avalanche service', 'https://www.land-oberoesterreich.gv.at/lawinenwarndienst.htm'], CH: ['SLF avalanche bulletin', 'https://www.slf.ch/en/avalanche-bulletin-and-snow-situation.html'], IT: /South Tyrol|Trentino/.test(h.rg) ? ['Euregio avalanche report', 'https://avalanche.report'] : ['AINEVA bulletins', 'https://bollettini.aineva.it/'] }[h.c];
    return `
    <div class="d-top" id="dTop">
      <button class="icon-btn" id="dBack" aria-label="Back to the list">${ic('i-back')}</button>
      <span class="t">${esc(h.n)}</span>
      <button class="icon-btn" id="dWish" aria-label="Bucket list" aria-pressed="${isWish(h.id)}" style="${isWish(h.id) ? 'color:var(--gold)' : ''}">${ic('i-star')}</button>
      <button class="icon-btn" id="dEdit" aria-label="Edit hike">${ic('i-edit')}</button>
    </div>
    <div class="d-head">
      <h2>${esc(h.n)}</h2>
      <div class="d-sub">${esc(h.ar)}${where ? ' · ' + esc(where) : ''}${h.custom ? ' · added by you' : h.edited ? ' · edited' : ''}</div>
      <div class="d-chips">
        <span class="gchip g-${h.g}">${GL[h.g]}</span>
        ${h.sc ? `<span class="chip" title="${esc(SCALES[h.sc] || h.sc)}">${esc(SCALES[h.sc] || h.sc)}</span>` : ''}
        <span class="chip">${TYPE_LABEL[h.ty]}</span>
        ${isNewHike(h) ? `<span class="chip chip-new">New · added ${fmtDate(h.ad)}</span>` : ''}
        <span class="chip" ${inSeason(h) ? '' : 'style="border-color:var(--warn)"'}>${seasonText(h)}${inSeason(h) ? '' : ' · out of season'}</span>
        ${done.length ? `<span class="chip" style="border-color:var(--glow);color:var(--ink)">${ic('i-check')} Done ${done.length > 1 ? done.length + '×' : 'on ' + fmtDate(done[0].date, { y: true })}</span>` : ''}
      </div>
    </div>
    ${h.b ? `<p class="d-blurb">${esc(h.b)}</p>` : ''}
    <div class="d-grid">
      <div class="d-cell"><span>Distance</span><b>${fmtKm(h.km)}</b><small>${TYPE_LABEL[h.ty].toLowerCase()}</small></div>
      <div class="d-cell"><span>Ascent</span><b>${fmtM(h.up)}</b><small>${h.ty === 'trav' ? '↓ ' + fmtM(h.dn) : 'and back down'}</small></div>
      <div class="d-cell"><span>Highest</span><b>${h.mx ? fmtM(h.mx) : '–'}</b><small>start ${h.lo ? fmtM(h.lo) : '–'}</small></div>
      <div class="d-cell"><span>Signposted</span><b>${fmtDur(h.din)}</b><small>DIN 33466</small></div>
      <div class="d-cell"><span>Your time</span><b>${fmtDur(yourTime(h))}</b><small>pace ${p.f.toFixed(2)}×</small></div>
      <div class="d-cell"><span>Drive</span><b>${fmtDur(driveMin(h))}</b><small>from ${esc(S.home.name || 'home')}${DRIVE[h.id] == null ? ' (est.)' : ''}</small></div>
    </div>
    <div class="d-actions">
      <button class="btn glow grow" id="dDone">${ic('i-check')}${done.length ? 'Log again' : 'Mark as done'}</button>
      <button class="btn ghost" id="dFly">${ic('i-play')}Fly over</button>
      <a class="btn ghost" href="https://www.google.com/maps/dir/?api=1&destination=${h.start[0]},${h.start[1]}" target="_blank" rel="noopener">${ic('i-car')}Directions</a>
    </div>
    ${h.lf ? `<div class="note-box">${esc(h.lf)}</div>` : ''}
    ${done.length ? `<div class="d-sec"><h3>Our visits</h3><ol class="log-list">${done.map(l => `<li class="log-item"><div class="log-date"><b>${+l.date.slice(8)}</b>${MONTHS[+l.date.slice(5, 7) - 1]} ${l.date.slice(0, 4)}</div><div><div class="log-meta">${l.dur ? fmtDur(l.dur) + ' (signposted ' + fmtDur(logDin(l)) + ')' : 'No time logged'}${l.dog ? ' · with ' + esc(dogName() || 'the dog') : ''}${l.rating ? ' · ' + '★'.repeat(l.rating) : ''}</div>${l.note ? `<div class="log-note">${esc(l.note)}</div>` : ''}</div><button class="icon-btn" data-edit="${l.id}" aria-label="Edit entry">${ic('i-edit')}</button></li>`).join('')}</ol></div>` : ''}
    <div class="d-sec"><h3>Elevation profile <span class="r" id="dProfNote"></span></h3><div class="profile" id="dProfile"><p class="muted">Tracing the route on the trail network…</p></div></div>
    <div class="d-sec"><h3>Weather <span class="r">trailhead ${fmtM(h.lo)} · top ${fmtM(h.mx)}</span></h3><div id="dWx"><p class="muted">Loading the forecast…</p></div></div>
    <div class="d-sec"><h3>${ic('i-paw')} Dog</h3>
      <div class="dogbox"><div class="dog-head dog-${st.s}">${ic('i-paw')}<span>${esc(st.label)}</span></div>
      ${h.d.n ? `<p style="margin:8px 0 0;font-size:13.5px">${esc(h.d.n)}</p>` : ''}
      <ul class="dog-list">${dogReasons(h).map(([c, t]) => `<li class="${c ? 'dog-' + (c === 'bad' ? 'no' : c === 'warn' ? 'care' : 'good') : ''}"><span style="color:var(--ink-2)">${esc(t)}</span></li>`).join('')}</ul>
      <p class="src-tag">${h.d.src === 'rule' ? 'Based on a published rule for this area.' : 'General guidance from the terrain and area. Check signs at the trailhead.'}</p>
      <button class="btn ghost small" id="dOsm">Check parks and dog tags on OpenStreetMap</button>
      <div id="dOsmOut"></div></div></div>
    <div class="d-sec"><h3>${ic('i-camera')} Photos <span class="r">Wikimedia Commons, near the top</span></h3><div class="photos" id="dPhotos"><span class="muted">Looking for photos…</span></div>
      <div class="links">${links.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}</div></div>
    <div class="d-sec"><h3>Plan</h3><dl class="kv-list">
      <dt>Trailhead</dt><dd>${h.start[0].toFixed(4)}, ${h.start[1].toFixed(4)} · <a href="https://maps.apple.com/?daddr=${h.start[0]},${h.start[1]}" target="_blank" rel="noopener">Apple Maps</a> · <a href="https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=${h.start[0]},${h.start[1]}" target="_blank" rel="noopener">by train or bus</a></dd>
      ${winter && aval ? `<dt>Snow</dt><dd><a href="${aval[1]}" target="_blank" rel="noopener">${aval[0]}</a></dd>` : ''}
      ${h.tk === 'hut' && h.tn ? `<dt>Hut</dt><dd><a href="https://www.google.com/search?q=${encodeURIComponent(h.tn + ' opening times')}" target="_blank" rel="noopener">${esc(h.tn)}: opening times</a></dd>` : ''}
      ${Array.isArray(h.ref) && h.ref.length ? `<dt>Sources</dt><dd>${h.ref.map(u => { let t = u; try { t = new URL(u).hostname.replace(/^www\./, ''); } catch (e) { } return `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`; }).join(' · ')}</dd>` : ''}
      <dt>Trail map</dt><dd><a href="https://hiking.waymarkedtrails.org/#?map=14/${h.top[0].toFixed(4)}/${h.top[1].toFixed(4)}" target="_blank" rel="noopener">Waymarked Trails</a> · <a href="https://www.openstreetmap.org/#map=15/${h.top[0].toFixed(4)}/${h.top[1].toFixed(4)}" target="_blank" rel="noopener">OpenStreetMap</a></dd>
    </dl>
    <p class="fineprint">Distance and ascent come from the route checked on OpenStreetMap paths or from standard descriptions, rounded. Waypoints are placed on OSM summits, huts and lakes; the line is traced live and can take a different variant than the one you know. Grades and conditions are indicative; you decide on the day.</p></div>`;
  },
  bindDetail(h) {
    const v = $('#view-detail');
    $('#dBack').onclick = () => this.closeDetail();
    $('#dWish').onclick = () => { toggleWish(h.id); const on = isWish(h.id); $('#dWish').setAttribute('aria-pressed', on); $('#dWish').style.color = on ? 'var(--gold)' : ''; toast(on ? 'Added to the bucket list' : 'Removed from the bucket list'); pushHikeData(); };
    $('#dEdit').onclick = () => Dlg.hike(h);
    $('#dDone').onclick = () => Dlg.log(h);
    $('#dFly').onclick = () => Fly.hike(h);
    $('#dOsm').onclick = () => Explore.checkRules(h);
    v.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => Dlg.log(h, b.dataset.edit));
    const top = $('#dTop');
    v.onscroll = () => top.classList.toggle('stuck', v.scrollTop > 60);
  },
  renderProfile(h, r) {
    const box = $('#dProfile'); if (!box || !r) return;
    const c = r.c.filter(p => p[2] != null);
    if (c.length < 2) { box.innerHTML = '<p class="muted">No elevation data for this line.</p>'; return; }
    const dist = [0]; for (let i = 1; i < c.length; i++) dist.push(dist[i - 1] + havLL(c[i - 1], c[i]));
    const ele = c.map((p, i) => { let s = 0, n = 0; for (let k = Math.max(0, i - 2); k <= Math.min(c.length - 1, i + 2); k++) { s += c[k][2]; n++; } return s / n; });
    const W = Math.max(280, box.clientWidth || 360), H = 160, pl = 40, pr = 8, pt = 10, pb = 30;
    const tot = dist[dist.length - 1] || 1, emin = Math.min(...ele), emax = Math.max(...ele);
    const step = [20, 50, 100, 200, 250, 500, 1000].find(s => (emax - emin) / s <= 4) || 1000;
    const y0 = Math.floor(emin / step) * step, y1 = Math.max(y0 + step, Math.ceil(emax / step) * step);
    const X = d => pl + d / tot * (W - pl - pr), Y = e => pt + (1 - (e - y0) / (y1 - y0)) * (H - pt - pb - 6);
    const kstep = [0.5, 1, 2, 5, 10, 20].find(s => tot / s <= 7) || 20;
    const col = cssVar('--' + h.g) || '#888';
    let line = '', area = `M${X(0)},${Y(y0)}`;
    ele.forEach((e, i) => { line += (i ? 'L' : 'M') + X(dist[i]).toFixed(1) + ',' + Y(e).toFixed(1); area += 'L' + X(dist[i]).toFixed(1) + ',' + Y(e).toFixed(1); });
    area += `L${X(tot)},${Y(y0)}Z`;
    const slopeCol = g => g < 8 ? '#9CC79F' : g < 15 ? '#E3C15A' : g < 25 ? '#E58A4E' : '#C9463D';
    let strip = ''; const sy = H - pb - 4;
    for (let i = 1; i < c.length; i++) { const dd = (dist[i] - dist[i - 1]) * 1000; if (dd <= 0) continue; const g = Math.abs(ele[i] - ele[i - 1]) / dd * 100; strip += `<rect x="${X(dist[i - 1]).toFixed(1)}" y="${sy}" width="${Math.max(0.6, X(dist[i]) - X(dist[i - 1])).toFixed(1)}" height="5" fill="${slopeCol(g)}"/>`; }
    let grid = '';
    for (let e = y0; e <= y1 + 0.1; e += step) grid += `<line x1="${pl}" x2="${W - pr}" y1="${Y(e)}" y2="${Y(e)}" stroke="var(--line)" stroke-width="1"/><text x="${pl - 6}" y="${Y(e) + 3.5}" text-anchor="end" font-size="10.5" fill="var(--ink-3)" font-family="Barlow Condensed, sans-serif">${nf.format(e)}</text>`;
    for (let k = 0; k <= tot + 1e-6; k += kstep) grid += `<text x="${X(k)}" y="${H - 8}" text-anchor="middle" font-size="10.5" fill="var(--ink-3)" font-family="Barlow Condensed, sans-serif">${k} km</text>`;
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Elevation profile from ${Math.round(emin)} to ${Math.round(emax)} metres over ${tot.toFixed(1)} km">
      <defs><linearGradient id="pg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".45"/><stop offset="1" stop-color="${col}" stop-opacity=".04"/></linearGradient></defs>
      ${grid}<path d="${area}" fill="url(#pg)"/><path d="${line}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round"/>${strip}
      <line id="pvl" x1="0" x2="0" y1="${pt}" y2="${sy}" stroke="var(--ink)" stroke-width="1" opacity="0"/><circle id="pdot" r="4.5" fill="var(--glow)" stroke="var(--surface)" stroke-width="2" opacity="0"/>
    </svg><div class="tip" id="ptip" hidden></div>`;
    const st = lineStats(r.c), k = h.ty === 'out' ? 2 : 1;
    $('#dProfNote').textContent = h.ty === 'out' ? 'one way shown' : '';
    box.parentElement.querySelectorAll('.prof-note').forEach(n => n.remove());
    box.insertAdjacentHTML('afterend', `<div class="prof-note"><span>Traced line: ${fmtKm(st.km * k)} · ↑ ${fmtM(h.ty === 'out' ? st.asc + st.desc : st.asc)}${r.src === 'line' ? ' · straight-line sketch' : r.src === 'gpx' ? ' · your GPX' : ''}</span><span class="slope-key"><span><i style="background:#9CC79F"></i>&lt;8%</span><span><i style="background:#E3C15A"></i>15%</span><span><i style="background:#E58A4E"></i>25%</span><span><i style="background:#C9463D"></i>steeper</span></span></div>`);
    const svg = box.querySelector('svg'), tip = $('#ptip'), vl = svg.querySelector('#pvl'), dot = svg.querySelector('#pdot');
    const move = ev => {
      const rect = svg.getBoundingClientRect(), x = (ev.clientX - rect.left) / rect.width * W;
      const d = clamp((x - pl) / (W - pl - pr), 0, 1) * tot;
      let i = dist.findIndex(v => v >= d); if (i < 0) i = dist.length - 1;
      const g = i > 0 ? Math.round(Math.abs(ele[i] - ele[i - 1]) / Math.max(1, (dist[i] - dist[i - 1]) * 1000) * 100) : 0;
      vl.setAttribute('x1', X(dist[i])); vl.setAttribute('x2', X(dist[i])); vl.setAttribute('opacity', 0.5);
      dot.setAttribute('cx', X(dist[i])); dot.setAttribute('cy', Y(ele[i])); dot.setAttribute('opacity', 1);
      tip.hidden = false; tip.style.left = (X(dist[i]) / W * 100) + '%'; tip.textContent = `${dist[i].toFixed(1)} km · ${nf.format(Math.round(ele[i]))} m · ${g}%`;
      setSrc('pos', { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [c[i][0], c[i][1]] }, properties: {} }] });
    };
    svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', () => { tip.hidden = true; vl.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); setSrc('pos', EMPTY); });
  },
  async loadDetailWeather(h) {
    const box = $('#dWx'); if (!box) return;
    try { const d = await loadDetailWx(h); if (this.detailId === h.id) this.renderDetailWx(h, d); }
    catch (e) { box.innerHTML = `<p class="muted">Forecast unavailable right now (${esc(e.message)}). <button class="btn ghost small" id="dWxRetry">Try again</button></p>`; $('#dWxRetry').onclick = () => this.loadDetailWeather(h); }
  },
  renderDetailWx(h, d) {
    const box = $('#dWx'); if (!box) return;
    const T = d.top.daily, B = d.th.daily, i = clamp(this.state.dDay ?? 0, 0, T.time.length - 1);
    const ov = { code: T.weather_code, tx: T.temperature_2m_max, tn: T.temperature_2m_min, ps: T.precipitation_sum, pp: T.precipitation_probability_max, sun: T.sunshine_duration, gust: T.wind_gusts_10m_max };
    const days = T.time.map((t, k) => { const s = dayScore(ov, k); return `<button class="day" data-i="${k}" aria-pressed="${k === i}"><span>${k === 0 ? 'Today' : WD[new Date(t + 'T12:00').getDay()]}</span>${ic(wmo(T.weather_code[k])[0])}<b>${Math.round(T.temperature_2m_max[k])}°</b><span class="score ${scoreCls(s)}" style="height:16px;font-size:11px">${s ?? ''}</span></button>`; }).join('');
    const hours = (res) => res.hourly.time.map((t, k) => ({ t, h: +t.slice(11, 13), k })).filter(x => x.t.startsWith(T.time[i]));
    const H = hours(d.top), HB = hours(d.th), hv = (res, key, k) => res.hourly[key] ? res.hourly[key][k] : null;
    const day = H.filter(x => x.h >= 8 && x.h <= 18);
    const fz = day.map(x => hv(d.top, 'freezing_level_height', x.k)).filter(v => v != null);
    const fzMin = fz.length ? Math.min(...fz) : null;
    const storm = day.some(x => (hv(d.top, 'weather_code', x.k) >= 95) || ((hv(d.top, 'cape', x.k) || 0) > 700 && (hv(d.top, 'precipitation_probability', x.k) || 0) >= 35));
    const sc = dayScore(ov, i);
    const flags = [];
    if (sc != null && sc >= 75) flags.push(['good', 'Great day for it']);
    if (storm) flags.push(['bad', 'Thunderstorm risk in the afternoon: start early, be down by 14:00']);
    if (fzMin != null && fzMin < h.mx + 150) flags.push(['warn', `Freezing level about ${nf.format(Math.round(fzMin / 50) * 50)} m: ice or snow possible on top`]);
    if ((T.wind_gusts_10m_max[i] || 0) >= 60) flags.push(['warn', `Gusts up to ${Math.round(T.wind_gusts_10m_max[i])} km/h at the top`]);
    if ((B.temperature_2m_max[i] || 0) >= 28) flags.push(['warn', `Hot at the start (${Math.round(B.temperature_2m_max[i])}°): go early, mind hot ground for paws`]);
    if (!inSeason(h)) flags.push(['warn', `Outside the usual season (${seasonText(h)}): huts and lifts may be closed`]);
    const col = (title, D, elev, extra) => { const [icn, lbl] = wmo(D.weather_code[i]); return `<div class="wx-col"><h4>${title} · ${fmtM(elev)}</h4>
      <div class="wx-big">${ic(icn)}<div><b>${Math.round(D.temperature_2m_max[i])}°</b><span>${lbl} · low ${Math.round(D.temperature_2m_min[i])}°</span></div></div>
      <dl class="wx-kv"><dt>Rain</dt><dd>${(D.precipitation_sum[i] ?? 0).toFixed(1)} mm · ${D.precipitation_probability_max[i] ?? 0}%</dd><dt>Gusts</dt><dd>${Math.round(D.wind_gusts_10m_max[i] ?? 0)} km/h</dd><dt>Sun</dt><dd>${((D.sunshine_duration[i] ?? 0) / 3600).toFixed(1)} h</dd>${extra}</dl></div>`; };
    const sr = B.sunrise[i] ? B.sunrise[i].slice(11) : '–', ss = B.sunset[i] ? B.sunset[i].slice(11) : '–';
    box.innerHTML = `<div class="wx-days">${days}</div>
      <div class="wx-pair">${col('Trailhead', B, h.lo, `<dt>Sunrise</dt><dd>${sr}</dd><dt>Sunset</dt><dd>${ss}</dd>`)}${col(h.tk === 'lake' || h.tk === 'fall' ? 'Highest point' : 'Top', T, h.mx, `<dt>Freezing lvl</dt><dd>${fzMin != null ? nf.format(Math.round(fzMin / 50) * 50) + ' m' : '–'}</dd><dt>UV max</dt><dd>${T.uv_index_max[i] != null ? Math.round(T.uv_index_max[i]) : '–'}</dd>`)}</div>
      <div class="wx-flags">${sc != null ? `<span class="flag ${sc >= 55 ? 'good' : sc >= 35 ? 'warn' : 'bad'}">Day score ${sc}/100 · ${scoreWord(sc)}</span>` : ''}${flags.map(([c, t]) => `<span class="flag ${c}">${esc(t)}</span>`).join('')}</div>
      <div class="hourly">${this.hourlySvg(d.top, H)}</div>`;
    box.querySelectorAll('.wx-days .day').forEach(b => b.onclick = () => { this.state.dDay = +b.dataset.i; this.renderDetailWx(h, d); });
  },
  hourlySvg(res, H) {
    const hs = H.filter(x => x.h >= 6 && x.h <= 21); if (!hs.length) return '';
    const W = 360, Hh = 92, pl = 26, pr = 14, pt = 14, pb = 18;
    const t = hs.map(x => res.hourly.temperature_2m[x.k]), pp = hs.map(x => res.hourly.precipitation_probability[x.k] ?? 0);
    const tmin = Math.floor(Math.min(...t) - 1), tmax = Math.ceil(Math.max(...t) + 1);
    const X = j => pl + j / (hs.length - 1) * (W - pl - pr), Y = v => pt + (1 - (v - tmin) / Math.max(1, tmax - tmin)) * (Hh - pt - pb);
    const bw = (W - pl - pr) / hs.length * 0.6;
    let s = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Hourly temperature and rain probability at the top">`;
    pp.forEach((p, j) => { const bh = p / 100 * (Hh - pt - pb); s += `<rect x="${(X(j) - bw / 2).toFixed(1)}" y="${(Hh - pb - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="var(--rain)" opacity=".28" rx="1.5"/>`; });
    s += `<path d="${t.map((v, j) => (j ? 'L' : 'M') + X(j).toFixed(1) + ',' + Y(v).toFixed(1)).join('')}" fill="none" stroke="var(--hard)" stroke-width="2"/>`;
    hs.forEach((x, j) => { if (x.h % 3 === 0) s += `<text x="${X(j)}" y="${Hh - 4}" text-anchor="middle" font-size="10" fill="var(--ink-3)" font-family="Barlow Condensed, sans-serif">${x.h}h</text><text x="${X(j)}" y="${Y(t[j]) - 5}" text-anchor="middle" font-size="10.5" fill="var(--ink)" font-family="Barlow Condensed, sans-serif">${Math.round(t[j])}°</text>`; });
    s += `<text x="0" y="${pt}" font-size="9.5" fill="var(--ink-3)" font-family="Barlow, sans-serif">°C</text><text x="${W - pr}" y="${pt - 3}" text-anchor="end" font-size="9.5" fill="var(--rain)" font-family="Barlow, sans-serif">bars: rain %</text></svg>`;
    return s;
  }
};

function badges(L, dm) {
  const hs = Object.keys(dm).map(id => HBY[id]);
  const lakes = hs.filter(h => h.tg.includes('lake')).length, peaks = hs.filter(h => h.tg.includes('summit')).length;
  const c = new Set(hs.map(h => h.c)), dogDays = L.filter(l => l.dog).length, big = L.some(l => (l.up ?? HBY[l.hike].up) >= 1000);
  const two = hs.some(h => h.mx >= 2000), three = hs.some(h => h.mx >= 3000), dolo = hs.some(h => /Dolomites/.test(h.ar)), ch = hs.some(h => h.c === 'CH');
  const areas = {}; HK.forEach(h => { areas[h.ar] = areas[h.ar] || [0, 0]; areas[h.ar][0]++; if (dm[h.id]) areas[h.ar][1]++; });
  const fullArea = Object.values(areas).some(([t, d]) => t >= 3 && d === t);
  return [
    { t: 'First one logged', on: hs.length >= 1, n: 1, how: 'Log any hike' },
    { t: 'Ten hikes', on: hs.length >= 10, n: 10, how: 'Ten different hikes done' },
    { t: 'Lake collector', on: lakes >= 10, n: lakes, how: 'Ten lake hikes' },
    { t: 'Summit hunters', on: peaks >= 5, n: peaks, how: 'Five summits' },
    { t: '1,000 m day', on: big, n: '1k', how: 'A hike with 1,000 m or more of ascent' },
    { t: 'Above 2,000 m', on: two, n: '2k', how: 'A hike reaching 2,000 m' },
    { t: 'Above 3,000 m', on: three, n: '3k', how: 'A hike reaching 3,000 m' },
    { t: 'All four countries', on: c.size === 4, n: c.size, how: 'A hike in Germany, Austria, Switzerland and Italy' },
    { t: 'Dolomites debut', on: dolo, n: 'D', how: 'Any hike in the Dolomites' },
    { t: 'Swiss chapter', on: ch, n: 'CH', how: 'Any hike in Switzerland' },
    { t: 'Dog days', on: dogDays >= 5, n: dogDays, how: 'Five hikes with the dog' },
    { t: 'Area completed', on: fullArea, n: '★', how: 'Every hike in an area with 3 or more' }
  ];
}

/* Mobile bottom sheet */
const Sheet = {
  idx: 1,
  snaps() { const H = innerHeight; return [Math.round(H * 0.24), Math.round(H * 0.52), Math.round(H * 0.9)]; },
  set(px, anim = true) {
    const p = $('#panel'); p.classList.toggle('dragging', !anim);
    document.documentElement.style.setProperty('--sheet-h', px + 'px');
  },
  to(i) { this.idx = clamp(i, 0, 2); this.set(this.snaps()[this.idx]); },
  atLeast(i) { if (this.idx < i) this.to(i); },
  init() {
    const grab = [$('#sheetHandle'), $('.brand')];
    let y0 = 0, h0 = 0, moved = false, active = false;
    const down = e => { if (!isPhone() || e.target.closest('button')) return; active = true; moved = false; y0 = e.clientY; h0 = $('#panel').offsetHeight; e.currentTarget.setPointerCapture(e.pointerId); };
    const move = e => { if (!active) return; const dy = e.clientY - y0; if (Math.abs(dy) > 4) moved = true; this.set(clamp(h0 - dy, 120, innerHeight * 0.94), false); };
    const up = e => {
      if (!active) return; active = false; $('#panel').classList.remove('dragging');
      if (!moved) return this.to(this.idx === 0 ? 1 : this.idx === 1 ? 2 : 0);
      const h = $('#panel').offsetHeight, s = this.snaps();
      let best = 0; s.forEach((v, i) => { if (Math.abs(v - h) < Math.abs(s[best] - h)) best = i; }); this.to(best);
    };
    grab.forEach(g => { g.addEventListener('pointerdown', down); g.addEventListener('pointermove', move); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up); });
    addEventListener('resize', debounce(() => { if (isPhone()) this.to(this.idx); }, 150));
    if (isPhone()) this.to(1);
  }
};
