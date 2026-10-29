/* ───────────── Dialogs ───────────── */
const Dlg = {
  open({ title, body, foot, onOpen, onSubmit }) {
    const d = $('#dlg'), f = $('#dlgForm');
    if (d.open) d.close();
    f.innerHTML = `<div class="dlg-head"><h2 id="dlgTitle">${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${ic('i-close')}</button></div><div class="dlg-body">${body}</div><div class="dlg-foot">${foot}</div>`;
    f.onsubmit = e => { e.preventDefault(); if (onSubmit && onSubmit(f) === false) return; d.close(); };
    f.querySelectorAll('[data-close]').forEach(b => b.onclick = () => d.close());
    d.showModal(); if (onOpen) onOpen(f);
  },
  confirmBtn(btn, label, action) { // two-tap confirmation, no browser dialogs
    btn.addEventListener('click', () => {
      if (btn.dataset.armed) { action(); return; }
      btn.dataset.armed = '1'; const old = btn.textContent; btn.textContent = label; btn.style.color = 'var(--bad)';
      setTimeout(() => { delete btn.dataset.armed; btn.textContent = old; btn.style.color = ''; }, 3500);
    });
  },
  hikeOptions(sel) {
    const by = {}; HK.forEach(h => (by[h.ar] = by[h.ar] || []).push(h));
    return Object.keys(by).sort().map(a => `<optgroup label="${esc(a)}">${by[a].sort((x, y) => x.n.localeCompare(y.n)).map(h => `<option value="${h.id}" ${h.id === sel ? 'selected' : ''}>${esc(h.n)}</option>`).join('')}</optgroup>`).join('');
  },
  log(h, logId, preset = {}) {
    const L = logId && ITEMS[logId] ? ITEMS[logId].d : null;
    const est = h ? yourTime(h) : 0, dur = preset.dur ?? L?.dur ?? est;
    let who = (L?.who || [0, 1]).slice(), rating = L?.rating || 0;
    this.open({
      title: logId ? 'Edit entry' : 'Mark as done',
      body: `${h ? `<div class="field">Hike<b style="font:500 18px var(--f-display);text-transform:none;letter-spacing:0;color:var(--ink)">${esc(h.n)}</b><input type="hidden" name="hike" value="${h.id}"></div>` : `<label class="field">Hike<select name="hike" required>${this.hikeOptions()}</select></label>`}
        <div class="row2"><label class="field">Date<input type="date" name="date" value="${preset.date || L?.date || todayISO()}" max="${todayISO()}" required></label>
        <div class="field">Time taken<div class="row2"><input type="number" name="hh" min="0" max="40" value="${Math.floor(dur / 60)}" aria-label="Hours"><input type="number" name="mm" min="0" max="59" step="1" value="${dur % 60}" aria-label="Minutes"></div><small>hours · minutes, breaks included</small></div></div>
        <div class="field">Who came<div class="who" id="fWho">${[0, 1].map(i => `<button type="button" data-i="${i}" aria-pressed="${who.includes(i)}">${esc(personName(i))}</button>`).join('')}</div></div>
        <label class="chk"><input type="checkbox" name="dog" ${(L ? L.dog : preset.dog) ? 'checked' : ''}> ${esc(dogName() || 'Our dog')} came along</label>
        <div class="field">How was it<div class="stars" id="fStars">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-v="${i}" class="${i <= rating ? 'on' : ''}" aria-label="${i} star${i > 1 ? 's' : ''}">${ic('i-star')}</button>`).join('')}</div></div>
        <label class="field">Note<textarea name="note" placeholder="Conditions, the view, where we had lunch…">${esc(L?.note || '')}</textarea></label>
        ${preset.km ? `<p class="muted" style="margin:0">From your GPX: ${fmtKm(preset.km)} · ↑ ${fmtM(preset.up)}</p>` : ''}`,
      foot: `${logId ? '<button type="button" class="btn ghost left" id="logDel">Delete entry</button>' : ''}<button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary" type="submit">Save</button>`,
      onOpen: f => {
        f.querySelectorAll('#fWho button').forEach(b => b.onclick = () => { const i = +b.dataset.i; who = who.includes(i) ? who.filter(x => x !== i) : [...who, i].sort(); b.setAttribute('aria-pressed', who.includes(i)); });
        f.querySelectorAll('#fStars button').forEach(b => b.onclick = () => { rating = +b.dataset.v === rating ? 0 : +b.dataset.v; f.querySelectorAll('#fStars button').forEach(x => x.classList.toggle('on', +x.dataset.v <= rating)); });
        const del = f.querySelector('#logDel');
        if (del) this.confirmBtn(del, 'Tap again to delete', () => { delItem(logId); $('#dlg').close(); afterLog(); toast('Entry deleted'); });
      },
      onSubmit: f => {
        const fd = new FormData(f), hike = fd.get('hike');
        if (!who.length) { toast('Pick at least one of you'); return false; }
        const dur = (+fd.get('hh') || 0) * 60 + (+fd.get('mm') || 0);
        const data = { hike, date: fd.get('date'), dur: dur || null, who, dog: !!fd.get('dog'), rating, note: (fd.get('note') || '').trim() };
        if (preset.km) Object.assign(data, { km: preset.km, up: preset.up, dn: preset.dn });
        else if (L && L.km) Object.assign(data, { km: L.km, up: L.up, dn: L.dn });
        putItem(logId || 'log:' + uid(), 'log', data);
        afterLog(); toast(logId ? 'Entry updated' : 'Logged. Well walked!');
      }
    });
  },
  hike(h, isNew = false) {
    const tags = new Set(h.tg || []);
    const opt = (v, cur, lbl) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${lbl}</option>`;
    this.open({
      title: isNew ? 'New hike' : 'Edit hike',
      body: `<label class="field">Name<input name="n" value="${esc(h.n || '')}" required placeholder="e.g. Herzogstand from Walchensee"></label>
        <div class="row2"><label class="field">Area<input name="ar" value="${esc(h.ar || '')}" list="areaList"></label><label class="field">Country<select name="c">${Object.entries(COUNTRIES).map(([k, v]) => opt(k, h.c, v)).join('')}</select></label></div>
        <datalist id="areaList">${[...new Set(HK.map(x => x.ar))].sort().map(a => `<option value="${esc(a)}">`).join('')}</datalist>
        <div class="row3"><label class="field">Difficulty<select name="g">${GRADES.map(g => opt(g, h.g, GL[g])).join('')}</select></label><label class="field">Scale<select name="sc">${['', ...Object.keys(SCALES)].map(s => opt(s, h.sc || '', s || '–')).join('')}</select></label><label class="field">Type<select name="ty">${Object.entries(TYPE_LABEL).map(([k, v]) => opt(k, h.ty, v)).join('')}</select></label></div>
        <div class="row3"><label class="field">Distance km<input name="km" type="number" step="0.1" min="0" value="${h.km || ''}" placeholder="auto"></label><label class="field">Ascent m<input name="up" type="number" step="10" min="0" value="${h.up || ''}" placeholder="auto"></label><label class="field">Descent m<input name="dn" type="number" step="10" min="0" value="${h.ty === 'trav' ? h.dn ?? '' : ''}" placeholder="same"></label></div>
        <div class="row2"><label class="field">Highest point m<input name="mx" type="number" step="10" value="${h.mx || ''}" placeholder="auto"></label><label class="field">Trailhead m<input name="lo" type="number" step="10" value="${h.lo || ''}" placeholder="auto"></label></div>
        <div class="row2"><label class="field">Season from<select name="s0">${MONTHS.map((m, i) => opt(i + 1, (h.ss || [1, 12])[0], m)).join('')}</select></label><label class="field">to<select name="s1">${MONTHS.map((m, i) => opt(i + 1, (h.ss || [1, 12])[1], m)).join('')}</select></label></div>
        <div class="field">Features<div class="seg-chips" id="eTags">${TAGS.map(([k, v]) => `<button type="button" data-v="${k}" aria-pressed="${tags.has(k)}">${v}</button>`).join('')}</div></div>
        <div class="row2"><label class="field">Dogs<select name="dr">${opt('free', h.d?.r, 'Allowed')}${opt('leash', h.d?.r, 'Leash required')}${opt('banned', h.d?.r, 'Banned')}</select></label><label class="field">Terrain for the dog<select name="dt">${opt('ok', h.d?.t, 'Fine')}${opt('care', h.d?.t, 'With care')}${opt('no', h.d?.t, 'Not suitable')}</select></label></div>
        <div class="row2"><label class="chk"><input type="checkbox" name="cow" ${h.d?.cow ? 'checked' : ''}> Cattle pastures</label><label class="chk"><input type="checkbox" name="h2o" ${h.d?.h2o ? 'checked' : ''}> Water on the way</label></div>
        <label class="field">Dog note<input name="dn2" value="${esc(h.d?.n || '')}"></label>
        <label class="field">Lift, boat or access note<input name="lf" value="${esc(h.lf || '')}"></label>
        <label class="field">Description<textarea name="b">${esc(h.b || '')}</textarea></label>
        <label class="field">Your links <small>one per line: photos, Komoot tour, blog…</small><textarea name="links">${esc((h.links || []).join('\n'))}</textarea></label>
        ${isNew ? '' : '<button type="button" class="btn ghost" id="eRoute">' + ic('i-route') + 'Edit the route on the map</button>'}`,
      foot: `${h.custom && !isNew ? '<button type="button" class="btn ghost left" id="eDel">Delete hike</button>' : h.edited ? '<button type="button" class="btn ghost left" id="eReset">Back to catalogue version</button>' : ''}<button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary" type="submit">Save</button>`,
      onOpen: f => {
        f.querySelectorAll('#eTags button').forEach(b => b.onclick = () => { const v = b.dataset.v; tags.has(v) ? tags.delete(v) : tags.add(v); b.setAttribute('aria-pressed', tags.has(v)); });
        const del = f.querySelector('#eDel'); if (del) this.confirmBtn(del, 'Tap again to delete', () => { delItem('hike:' + h.id); delItem('route:' + h.id); $('#dlg').close(); rebuildHikes(); UI.closeDetail(); UI.refresh(); toast('Hike deleted'); });
        const rs = f.querySelector('#eReset'); if (rs) this.confirmBtn(rs, 'Tap again to reset', () => { delItem('hike:' + h.id); $('#dlg').close(); rebuildHikes(); UI.refresh(); UI.openHike(h.id, { noFly: true }); toast('Back to the catalogue version'); });
        const er = f.querySelector('#eRoute'); if (er) er.onclick = () => { $('#dlg').close(); Edit.start(HBY[h.id]); };
      },
      onSubmit: f => {
        const fd = new FormData(f), num = k => fd.get(k) === '' ? null : +fd.get(k);
        const auto = !num('km') && !num('up');
        const patch = {
          n: fd.get('n').trim(), ar: fd.get('ar').trim() || 'My hikes', c: fd.get('c'), g: fd.get('g'), sc: fd.get('sc'), ty: fd.get('ty'),
          km: num('km') || 0, up: num('up') || 0, dn: fd.get('ty') === 'trav' ? num('dn') : null, mx: num('mx') || 0, lo: num('lo') || 0,
          ss: [+fd.get('s0'), +fd.get('s1')], tg: [...tags],
          d: { r: fd.get('dr'), t: fd.get('dt'), cow: fd.get('cow') ? 1 : 0, h2o: fd.get('h2o') ? 1 : 0, n: fd.get('dn2').trim(), src: h.d?.src === 'rule' && fd.get('dr') === h.d.r ? 'rule' : 'gen' },
          lf: fd.get('lf').trim(), b: fd.get('b').trim(), links: fd.get('links').split('\n').map(s => s.trim()).filter(s => /^https?:\/\//.test(s))
        };
        if (!patch.rg && !HIKES.some(b => b.id === h.id)) patch.rg = h.rg || '';
        if (h.custom || isNew) { patch.auto = auto; patch.p = h.p; patch.hi = h.hi ?? h.p.length - 1; }
        const target = isNew ? Object.assign({}, h, patch) : h;
        saveHike(target, patch);
        UI.refresh();
        const nh = HBY[h.id];
        if (isNew || auto) Routes.get(nh, true).then(() => { rebuildHikes(); UI.refresh(); if (UI.detailId === h.id) UI.openHike(h.id, { noFly: true }); });
        UI.openHike(h.id, { noFly: !isNew });
        toast(isNew ? 'Hike added' : 'Saved');
      }
    });
  },
  /* First visit on a device: names stay on the device, never in the published catalogue. */
  welcome() {
    this.open({
      title: 'Welcome to Cordée',
      body: `<p style="margin:0 0 12px">A map of mountain and lake hikes in Bavaria, Austria, Switzerland and the Dolomites, with the weather for each one and a shared logbook. Who's on the rope?</p>
        <div class="row2"><label class="field">First name<input name="n0" autocomplete="given-name" required></label><label class="field">Second name<input name="n1"></label></div>
        <label class="field">Dog's name <small>optional, add it later in Settings</small><input name="dog" value="${esc(S.dogName)}"></label>
        <small class="muted">Home base for drive times: ${esc(S.home.name)}. You can change it, the pace and the map style in Settings.</small>`,
      foot: `<button type="button" class="btn ghost" data-close>Later</button><button class="btn primary" type="submit">Start</button>`,
      onOpen: f => { LS.set('welcomed', 1); setTimeout(() => f.n0.focus(), 50); },
      onSubmit: f => {
        S.names = [f.n0.value.trim(), f.n1.value.trim()]; S.dogName = f.dog.value.trim();
        saveSettings(); brandLine(); UI.syncFind(); UI.refresh(); if (UI.state.tab === 'log') UI.renderLog();
      }
    });
  },
  /* Ask for a hike: one line for data/requests.md, which the weekly update reads first. */
  ask(prefill = '') {
    const line = (what, note) => `- [ ] ${what.trim() || '…'}${note.trim() ? ' — ' + note.trim() : ''} (asked${hasNames() ? ' by ' + personName(0) : ''} on ${fmtDate(todayISO(), { y: true })})`;
    const editUrl = repoUrl('/edit/main/data/requests.md');
    this.open({
      title: 'Ask for a hike',
      body: `<label class="field">Hike, lake, summit or hut<input name="what" value="${esc(prefill)}" placeholder="e.g. Schrecksee from Hinterstein" required></label>
        <label class="field">Anything specific <small>optional</small><input name="note" placeholder="a start point, a variant, good with the dog…"></label>
        <div class="field">Line for the wish list<div class="ask-line" id="askLine"></div></div>
        <ol class="steps"><li>Copy the line.</li><li>Open the wish list on GitHub (signed in) and paste it under <b>Waiting</b>.</li><li>Press <b>Commit changes</b>. It is added in the next Monday update, checked against OpenStreetMap.</li></ol>`,
      foot: `<button type="button" class="btn ghost" id="askCopy">Copy the line</button><a class="btn primary" id="askOpen" href="${esc(editUrl)}" target="_blank" rel="noopener">Open the wish list</a>`,
      onOpen: f => {
        const upd = () => { $('#askLine').textContent = line(f.what.value, f.note.value); };
        f.what.oninput = upd; f.note.oninput = upd; upd();
        const copy = async () => {
          const t = line(f.what.value, f.note.value);
          try { await navigator.clipboard.writeText(t); toast('Copied. Paste it under “Waiting”.'); }
          catch (e) { const r = document.createRange(); r.selectNodeContents($('#askLine')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Selected, copy it with ⌘C'); }
        };
        $('#askCopy').onclick = copy;
        $('#askOpen').onclick = () => { if (f.what.value.trim()) copy(); };
        if (!prefill) setTimeout(() => f.what.focus(), 50);
      },
      onSubmit: () => false
    });
  },
  settings() {
    const sql = SYNC_SQL;
    this.open({
      title: 'Settings',
      body: `<div class="set-sec" style="border:0;padding:0"><h3>The two of you</h3><div class="row2"><label class="field">First name<input name="n0" value="${esc(S.names[0])}" placeholder="Hiker 1"></label><label class="field">Second name<input name="n1" value="${esc(S.names[1])}" placeholder="Hiker 2"></label></div></div>
        <div class="set-sec"><h3>Dog</h3><div class="row2"><label class="field">Name<input name="dog" value="${esc(S.dogName)}" placeholder="When you know it"></label><label class="field">Size<select name="dogSize">${['small', 'medium', 'large'].map(s => `<option ${S.dogSize === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label></div><small class="muted">Medium Goldendoodle: ladders, chains and scrambles count as no-go.</small></div>
        <div class="set-sec"><h3>Home base</h3><div class="row3"><label class="field">Name<input name="hn" value="${esc(S.home.name)}"></label><label class="field">Latitude<input name="hlat" type="number" step="0.0001" value="${S.home.lat}"></label><label class="field">Longitude<input name="hlon" type="number" step="0.0001" value="${S.home.lon}"></label></div><button type="button" class="btn ghost small" id="sPickHome">Pick home on the map</button></div>
        <div class="set-sec"><h3>Pace</h3><div class="row2"><label class="field">Mode<select name="pm"><option value="auto" ${S.pace.mode === 'auto' ? 'selected' : ''}>Learn from our logged times</option><option value="manual" ${S.pace.mode === 'manual' ? 'selected' : ''}>Fixed factor</option></select></label><label class="field">Factor <small>1.00 = signposted</small><input name="pf" type="number" min="0.5" max="1.5" step="0.01" value="${S.pace.manual}"></label></div></div>
        <div class="set-sec"><h3>Map</h3><div class="row2"><label class="field">Theme<select name="theme">${[['system', 'Follow the device'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<option value="${v}" ${S.theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="field">Terrain exaggeration <small>${S.exag.toFixed(2)}×</small><input name="exag" type="range" min="1" max="2" step="0.05" value="${S.exag}"></label></div>
        <label class="chk"><input type="checkbox" name="autoTrace" ${S.autoTrace ? 'checked' : ''}> Trace all hike routes in the background (once, then cached)</label></div>
        <div class="set-sec"><h3>Sync between your devices</h3>
          <small class="muted">Without sync, each device keeps its own logbook. To share one logbook: create a free Supabase project, run the SQL below in its SQL editor, add one user under Authentication (tick “Auto confirm”), then enter the details here on each device. You both sign in with that same account.</small>
          <div class="row2"><label class="field">Project URL<input name="su" value="${esc(S.sync.url)}" placeholder="https://xxxx.supabase.co"></label><label class="field">Publishable (anon) key<input name="sk" value="${esc(S.sync.key)}" placeholder="sb_publishable_… or eyJ…"></label></div>
          <div class="row2"><label class="field">Email<input name="se" type="email" value="${esc(S.sync.email)}" autocomplete="username"></label><label class="field">Password<input name="sp" type="password" autocomplete="current-password"></label></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button type="button" class="btn ghost small" id="sConnect">Save and sign in</button><button type="button" class="btn ghost small" id="sNow">Sync now</button><button type="button" class="btn ghost small" id="sOut">Sign out</button><span class="muted" id="syncStatus">${esc(Sync.msg || (Sync.configured() ? '' : 'Not set up'))}</span></div>
          <details><summary class="muted" style="cursor:pointer">SQL for the Supabase SQL editor</summary><div class="codebox" id="sqlBox">${esc(sql)}</div><button type="button" class="btn ghost small" id="sqlCopy" style="margin-top:6px">Copy SQL</button></details></div>
        <div class="set-sec"><h3>Backup</h3><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn ghost small" id="sExport">${ic('i-upload')}Export our data</button><button type="button" class="btn ghost small" id="sImport">Import a backup</button></div></div>
        <div class="set-sec"><h3>How difficulty is graded</h3><div class="tablewrap"><table class="grade-table"><thead><tr><th>Cordée</th><th>Switzerland (SAC)</th><th>Austria / Bavaria</th><th>Italy (CAI)</th></tr></thead><tbody>
          <tr><td><span class="gchip g-easy">Easy</span></td><td>T1 · yellow trail</td><td>valley and blue trails</td><td>T</td></tr>
          <tr><td><span class="gchip g-moderate">Moderate</span></td><td>T2 · red-white</td><td>red mountain trails</td><td>E</td></tr>
          <tr><td><span class="gchip g-hard">Hard</span></td><td>T3 · red-white, demanding</td><td>red to black, sure-footed</td><td>EE</td></tr>
          <tr><td><span class="gchip g-expert">Expert</span></td><td>T4–T6 · blue-white</td><td>black, alpine routes</td><td>EE+ / EEA (via ferrata)</td></tr></tbody></table></div>
          <small class="muted">Graded by the hardest section. The country columns are an approximate match, not an official equivalence. Distance and climbing show up separately as time.</small></div>
        <div class="set-sec"><h3>Data sources</h3><small class="muted">Map data © OpenStreetMap contributors (ODbL) via OpenFreeMap and OpenMapTiles · terrain from Mapzen/AWS terrain tiles · topo map © OpenTopoMap · satellite © Esri · swisstopo · weather and elevation by Open-Meteo (CC BY 4.0) using DWD, MeteoSwiss and GeoSphere models · routing by BRouter and FOSSGIS OSRM · drive times by OSRM · photos from Wikimedia Commons (credited per photo) · trails overlay by Waymarked Trails · OSM queries via Overpass API. Grades and conditions are indicative; always check local information.</small></div>`,
      foot: `<button type="button" class="btn ghost" data-close>Close</button><button class="btn primary" type="submit">Save settings</button>`,
      onOpen: f => {
        $('#sPickHome').onclick = () => { $('#dlg').close(); Pick.start('home'); };
        const saveSync = () => { S.sync.url = f.su.value.trim(); S.sync.key = f.sk.value.trim(); S.sync.email = f.se.value.trim(); saveSettings(); Sync.sb = null; };
        $('#sConnect').onclick = async () => { saveSync(); try { $('#syncStatus').textContent = 'Signing in…'; await Sync.signIn(f.se.value.trim(), f.sp.value); Sync.start(); } catch (e) { $('#syncStatus').textContent = e.message; } };
        $('#sNow').onclick = () => { saveSync(); Sync.run(true); };
        $('#sOut').onclick = () => Sync.signOut();
        $('#sqlCopy').onclick = async () => { try { await navigator.clipboard.writeText(sql); toast('SQL copied'); } catch (e) { const r = document.createRange(); r.selectNodeContents($('#sqlBox')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Selected, copy it with ⌘C'); } };
        $('#sExport').onclick = () => Backup.export();
        $('#sImport').onclick = () => $('#fileBackup').click();
      },
      onSubmit: f => {
        const prevHome = homeKey(), prevTheme = S.theme, prevExag = S.exag;
        S.names = [f.n0.value.trim(), f.n1.value.trim()];
        S.dogName = f.dog.value.trim(); S.dogSize = f.dogSize.value;
        S.home = { name: f.hn.value.trim() || 'Home', lat: +f.hlat.value || DEFAULTS.home.lat, lon: +f.hlon.value || DEFAULTS.home.lon };
        S.pace = { mode: f.pm.value, manual: clamp(+f.pf.value || 0.88, 0.5, 1.5) };
        S.theme = f.theme.value; S.exag = +f.exag.value; S.autoTrace = f.autoTrace.checked;
        S.sync.url = f.su.value.trim(); S.sync.key = f.sk.value.trim(); S.sync.email = f.se.value.trim();
        saveSettings(); applyTheme(); brandLine();
        if (S.theme !== prevTheme) restyle();
        else if (S.exag !== prevExag && S.threeD && map) map.setTerrain({ source: 'dem-terrain', exaggeration: S.exag });
        pushHome();
        if (homeKey() !== prevHome) loadDrive().then(() => UI.refresh());
        UI.syncFind(); UI.refresh(); if (UI.detailId) UI.openHike(UI.detailId, { noFly: true });
        if (UI.state.tab === 'log') UI.renderLog();
        Routes.background(); Sync.setStatus(Sync.status, Sync.msg || '');
        toast('Settings saved');
      }
    });
  }
};
function afterLog() { UI.refresh(); if (UI.detailId) UI.openHike(UI.detailId, { noFly: true }); if (UI.state.tab === 'log') UI.renderLog(); }
function brandLine() {
  const n = S.names.map(x => (x || '').trim()).filter(Boolean);
  $('#brandSub').textContent = n.length ? n.join(' & ') + (dogName() ? ' & ' + dogName() : '') : 'Our rope team in the Alps';
}
function applyTheme() { if (S.theme === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = S.theme; }

/* ───────────── Backup ───────────── */
const Backup = {
  export() {
    const data = { app: 'cordee', version: 1, exported: new Date().toISOString(), settings: { ...S, sync: { ...S.sync, key: S.sync.key ? '(removed)' : '' } }, items: ITEMS };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `cordee-backup-${todayISO()}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
  async import(file) {
    try {
      const j = JSON.parse(await file.text());
      if (j.app !== 'cordee' || !j.items) throw new Error('Not a Cordée backup');
      let n = 0;
      for (const [id, v] of Object.entries(j.items)) { const cur = ITEMS[id]; if (!cur || new Date(v.u) > new Date(cur.u)) { ITEMS[id] = { ...v, dirty: true }; n++; } }
      LS.set('items', ITEMS); rebuildHikes(); UI.refresh(); if (UI.state.tab === 'log') UI.renderLog(); Sync.soon();
      toast(`Imported ${n} entries`);
    } catch (e) { toast('Import failed: ' + e.message, 4000); }
  }
};

/* ───────────── GPX import ───────────── */
const Gpx = {
  queue: [],
  parse(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('This file is not valid GPX');
    let els = [...doc.getElementsByTagName('trkpt')]; if (!els.length) els = [...doc.getElementsByTagName('rtept')];
    const pts = els.map(p => { const e = p.getElementsByTagName('ele')[0], t = p.getElementsByTagName('time')[0]; return { lat: +p.getAttribute('lat'), lon: +p.getAttribute('lon'), ele: e ? +e.textContent : null, t: t ? Date.parse(t.textContent) : null }; }).filter(p => isFinite(p.lat) && isFinite(p.lon));
    if (pts.length < 2) throw new Error('No track points in this file');
    const nm = doc.getElementsByTagName('name')[0];
    let km = 0, moving = 0; const c = pts.map(p => [p.lon, p.lat, p.ele]);
    for (let i = 1; i < pts.length; i++) {
      const d = hav([pts[i - 1].lat, pts[i - 1].lon], [pts[i].lat, pts[i].lon]); km += d;
      if (pts[i].t && pts[i - 1].t) { const dt = (pts[i].t - pts[i - 1].t) / 1000; if (dt > 0 && dt < 300 && d * 1000 / dt > 0.3) moving += dt; }
    }
    const sm = c.map((p, i) => { if (p[2] == null) return p; let s = 0, n = 0; for (let k = Math.max(0, i - 3); k <= Math.min(c.length - 1, i + 3); k++) if (c[k][2] != null) { s += c[k][2]; n++; } return [p[0], p[1], s / n]; });
    const st = lineStats(sm);
    const t0 = pts.find(p => p.t)?.t, t1 = [...pts].reverse().find(p => p.t)?.t;
    const date = t0 ? new Date(t0 - new Date(t0).getTimezoneOffset() * 6e4).toISOString().slice(0, 10) : todayISO();
    return { name: nm ? nm.textContent.trim() : '', c: sm, km, asc: st.asc, desc: st.desc, mx: st.mx, mn: st.mn, dur: t0 && t1 ? Math.round((t1 - t0) / 6e4) : null, moving: Math.round(moving / 60), date };
  },
  matches(t) {
    const step = Math.max(1, Math.floor(t.c.length / 400)), smp = t.c.filter((_, i) => i % step === 0);
    const near = q => Math.min(...smp.map(p => hav(q, [p[1], p[0]])));
    return HK.map(h => ({ h, ds: near(h.start), dt: near(h.top) })).filter(x => x.dt < 0.6 && x.ds < 2).sort((a, b) => (a.ds + a.dt) - (b.ds + b.dt)).slice(0, 4);
  },
  async import(files) { this.queue.push(...files); if (!$('#dlg').open) this.next(); },
  async next() {
    const file = this.queue.shift(); if (!file) return;
    let t; try { t = this.parse(await file.text()); } catch (e) { toast(file.name + ': ' + e.message, 4000); return this.next(); }
    const m = this.matches(t); let pick = m.length ? m[0].h.id : 'new';
    const s = t.c.find(p => p), e = t.c[t.c.length - 1], loop = havLL(s, e) < 0.35;
    Dlg.open({
      title: 'Import track',
      body: `<p style="margin:0"><b style="font:500 18px var(--f-display)">${esc(t.name || file.name)}</b><br><span class="muted">${fmtDate(t.date, { wd: true, y: true })} · ${fmtKm(t.km)} · ↑ ${fmtM(t.asc)} · ${t.dur ? fmtDur(t.dur) + ' total' : 'no timestamps'}${t.moving ? ' · ' + fmtDur(t.moving) + ' moving' : ''}</span></p>
        <div class="field">Which hike was it?<div class="match-list" id="gMatch">${m.map(x => `<button type="button" data-v="${x.h.id}" aria-pressed="${pick === x.h.id}"><b>${esc(x.h.n)}</b><span>${esc(x.h.ar)} · catalogue ${fmtKm(x.h.km)}, ↑ ${fmtM(x.h.up)} · passes ${Math.round(x.dt * 1000)} m from its top</span></button>`).join('')}
        <button type="button" data-v="new" aria-pressed="${pick === 'new'}"><b>A new hike from this track</b><span>Adds it to the map with this exact line</span></button></div></div>
        <div class="row2" id="gNew" ${pick === 'new' ? '' : 'hidden'}><label class="field">Name<input name="gn" value="${esc(t.name || 'New hike')}"></label><label class="field">Difficulty<select name="gg">${GRADES.map(g => `<option value="${g}" ${g === 'moderate' ? 'selected' : ''}>${GL[g]}</option>`).join('')}</select></label></div>`,
      foot: `<button type="button" class="btn ghost" data-close>Skip</button><button class="btn primary" type="submit">Continue</button>`,
      onOpen: f => f.querySelectorAll('#gMatch button').forEach(b => b.onclick = () => { pick = b.dataset.v; f.querySelectorAll('#gMatch button').forEach(x => x.setAttribute('aria-pressed', x === b)); f.querySelector('#gNew').hidden = pick !== 'new'; }),
      onSubmit: f => {
        let h;
        if (pick === 'new') {
          const hiI = t.c.reduce((bi, p, i, a) => (p[2] ?? -1e9) > (a[bi][2] ?? -1e9) ? i : bi, 0);
          const hiP = t.c[hiI], near = [...HK].sort((a, b) => hav(a.start, [s[1], s[0]]) - hav(b.start, [s[1], s[0]]))[0];
          const id = 'my-' + uid(), p = [[s[1], s[0]], [hiP[1], hiP[0]]]; if (!loop) p.push([e[1], e[0]]);
          const data = { n: f.gn.value.trim() || 'New hike', ar: near && hav(near.start, [s[1], s[0]]) < 25 ? near.ar : 'My hikes', rg: near?.rg || '', c: near?.c || 'DE', p, hi: 1, ty: loop ? 'loop' : 'trav', km: Math.round(t.km * 10) / 10, up: t.asc, dn: t.desc, mx: t.mx || 0, lo: Math.round(s[2] ?? t.mn ?? 0), g: f.gg.value, sc: '', tg: [], ss: [5, 10], d: { r: 'free', t: f.gg.value === 'expert' ? 'no' : 'ok' }, b: 'Added from our GPX track.' };
          putItem('hike:' + id, 'hike', data); rebuildHikes(); h = HBY[id];
          putItem('route:' + id, 'route', { c: simplify(t.c, 4).map(q => [Math.round(q[0] * 1e5) / 1e5, Math.round(q[1] * 1e5) / 1e5, q[2] != null ? Math.round(q[2]) : null]), wk: Routes.key(h), src: 'gpx', ts: Date.now() });
        } else h = HBY[pick];
        UI.refresh();
        setTimeout(() => { Dlg.log(h, null, { date: t.date, dur: t.dur || undefined, km: Math.round(t.km * 10) / 10, up: t.asc, dn: t.desc }); const watch = setInterval(() => { if (!$('#dlg').open) { clearInterval(watch); this.next(); } }, 400); }, 60);
      }
    });
  }
};

/* ───────────── Pick points on the map (new hike, home) ───────────── */
const Pick = {
  on: false, mode: null, pts: [], marks: [],
  msg(t) { $('#mapMsg').hidden = false; $('#mapMsgText').textContent = t; },
  start(mode) {
    UI.closeDetail(); this.on = true; this.mode = mode; this.pts = []; this.clear();
    if (isPhone()) Sheet.to(0);
    this.msg(mode === 'home' ? 'Tap your home on the map.' : 'Tap the trailhead on the map.');
  },
  clear() { this.marks.forEach(m => m.remove()); this.marks = []; },
  stop() { this.on = false; this.clear(); $('#mapMsg').hidden = true; },
  click(e) {
    const p = [e.lngLat.lat, e.lngLat.lng];
    if (this.mode === 'home') {
      S.home = { name: S.home.name || 'Home', lat: +p[0].toFixed(5), lon: +p[1].toFixed(5) }; saveSettings(); pushHome(); this.stop();
      toast('Home set. Updating drive times…'); loadDrive().then(() => UI.refresh()); return;
    }
    this.pts.push(p);
    const el = document.createElement('div'); el.className = 'pin-num' + (this.pts.length === 1 ? ' start' : ''); el.textContent = this.pts.length;
    this.marks.push(new maplibregl.Marker({ element: el }).setLngLat([p[1], p[0]]).addTo(map));
    if (this.pts.length === 1) return this.msg('Now tap the summit, lake or end point.');
    const near = [...HK].sort((a, b) => hav(a.start, p) - hav(b.start, p))[0];
    const h = enrich({ id: 'my-' + uid(), n: '', ar: near ? near.ar : 'My hikes', rg: near?.rg || '', c: near?.c || 'DE', p: this.pts.slice(), ty: 'out', g: 'moderate', sc: 'T2', tg: [], ss: [5, 10], d: { r: 'free', t: 'ok' }, km: 0, up: 0, mx: 0, lo: 0, auto: true, custom: true });
    this.stop();
    Dlg.hike(h, true);
  }
};

/* ───────────── Edit a route's waypoints ───────────── */
const Edit = {
  on: false, h: null, pts: [], hi: 0, marks: [],
  start(h) {
    if (!h) return; this.on = true; this.h = h; this.pts = h.p.map(q => [...q]); this.hi = h.hiIdx;
    $('#editBar').hidden = false; if (isPhone()) Sheet.to(0); this.draw();
  },
  draw() {
    this.marks.forEach(m => m.remove()); this.marks = [];
    this.pts.forEach((q, i) => {
      const el = document.createElement('div'); el.className = 'pin-num' + (i === 0 ? ' start' : ''); el.textContent = i === this.hi && i ? '▲' : i + 1; el.title = i === 0 ? 'Trailhead' : i === this.hi ? 'Top / highlight' : 'Via point';
      const m = new maplibregl.Marker({ element: el, draggable: true }).setLngLat([q[1], q[0]]).addTo(map);
      m.on('dragend', () => { const ll = m.getLngLat(); this.pts[i] = [+ll.lat.toFixed(5), +ll.lng.toFixed(5)]; this.line(); });
      this.marks.push(m);
    });
    this.line();
  },
  line() {
    const c = this.pts.map(q => [q[1], q[0]]); if (this.h.ty === 'loop') c.push(c[0]);
    setSrc('edit', { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: c }, properties: {} }] });
  },
  click(e) {
    const q = [+e.lngLat.lat.toFixed(5), +e.lngLat.lng.toFixed(5)];
    if (this.h.ty === 'loop') this.pts.push(q);
    else { this.pts.splice(this.pts.length - 1, 0, q); if (this.hi === this.pts.length - 2) this.hi++; }
    this.draw();
  },
  undo() {
    if (this.pts.length <= 2) return toast('A route needs at least two points');
    const i = this.h.ty === 'loop' ? this.pts.length - 1 : this.pts.length - 2;
    if (i <= 0) return; this.pts.splice(i, 1); if (this.hi >= this.pts.length) this.hi = this.pts.length - 1; else if (this.hi > i) this.hi--;
    this.draw();
  },
  stop() { this.on = false; this.marks.forEach(m => m.remove()); this.marks = []; setSrc('edit', EMPTY); $('#editBar').hidden = true; },
  save() {
    const h = this.h, pts = this.pts, hi = this.hi; this.stop();
    saveHike(h, { p: pts, hi });
    const nh = HBY[h.id]; toast('Re-tracing the route…');
    Routes.get(nh, true).then(() => { rebuildHikes(); UI.refresh(); UI.openHike(h.id); toast('Route updated'); }).catch(e => toast('Tracing failed: ' + e.message, 4000));
  }
};

/* ───────────── Explore OpenStreetMap: all marked trails & huts in view ───────────── */
const SAC = { hiking: 1, mountain_hiking: 2, demanding_mountain_hiking: 3, alpine_hiking: 4, demanding_alpine_hiking: 5, difficult_alpine_hiking: 6 };
const sacGrade = s => s === 0 ? 'unknown' : s === 1 ? 'easy' : s === 2 ? 'moderate' : s === 3 ? 'hard' : 'expert';
const Explore = {
  on: false, last: '', popup: null,
  toggle() {
    if (this.on) { this.on = false; setSrc('explore', EMPTY); setSrc('huts', EMPTY); $('#btnExplore').setAttribute('aria-pressed', false); if (this._mv) map.off('moveend', this._mv); this.last = ''; return; }
    if (map.getZoom() < 10.5) { toast('Zoom in to a valley first, then tap again to load every marked trail and hut there.', 3600); return; }
    this.on = true; $('#btnExplore').setAttribute('aria-pressed', true);
    this._mv = debounce(() => { if (this.on) this.load(); }, 700); map.on('moveend', this._mv);
    this.load();
  },
  async load() {
    if (map.getZoom() < 10.5) return;
    const b = map.getBounds(), bb = [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].map(v => v.toFixed(3)).join(',');
    if (bb === this.last) return; this.last = bb;
    toast('Loading marked trails and huts from OpenStreetMap…', 1800);
    try {
      const j = await overpass(`[out:json][timeout:40];rel["route"="hiking"](${bb})->.r;.r out body geom;way(r.r)["sac_scale"];out tags;node["tourism"~"^(alpine_hut|wilderness_hut)$"](${bb});out tags;`, 45000);
      if (!this.on) return;
      const ways = {}, rels = [], huts = [];
      for (const e of j.elements) { if (e.type === 'relation') rels.push(e); else if (e.type === 'way') ways[e.id] = e.tags || {}; else if (e.type === 'node') huts.push(e); }
      const feats = rels.map(r => {
        const lines = []; let km = 0, mx = 0;
        for (const m of r.members || []) { if (m.type !== 'way' || !m.geometry) continue; const c = m.geometry.filter(Boolean).map(g => [g.lon, g.lat]); if (c.length < 2) continue; lines.push(c); for (let i = 1; i < c.length; i++) km += havLL(c[i - 1], c[i]); mx = Math.max(mx, SAC[(ways[m.ref] || {}).sac_scale] || 0); }
        const t = r.tags || {};
        return lines.length ? { type: 'Feature', geometry: { type: 'MultiLineString', coordinates: lines }, properties: { rid: r.id, name: t.name || t.ref || 'Unnamed route', ref: t.ref || '', net: t.network || '', km: Math.round(km * 10) / 10, g: sacGrade(mx), sac: mx, from: t.from || '', to: t.to || '' } } : null;
      }).filter(Boolean);
      setSrc('explore', { type: 'FeatureCollection', features: feats });
      setSrc('huts', { type: 'FeatureCollection', features: huts.map(n => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [n.lon, n.lat] }, properties: { name: n.tags.name || 'Hut', ele: n.tags.ele || '', dog: n.tags.dog || '', web: n.tags.website || n.tags['contact:website'] || '', oh: n.tags.opening_hours || '', op: n.tags.operator || '' } })) });
      toast(`${feats.length} marked trails and ${huts.length} huts here`);
    } catch (e) { this.last = ''; toast('OpenStreetMap is busy, try again in a moment (' + e.message + ')', 4000); }
  },
  routePopup(f, ll) {
    const p = f.properties, net = { iwn: 'international', nwn: 'national', rwn: 'regional', lwn: 'local' }[p.net] || '';
    const el = document.createElement('div');
    el.innerHTML = `<b style="font:500 16px var(--f-display)">${esc(p.name)}</b><div class="muted" style="margin:2px 0 6px">${p.km} km of marked trail${net ? ' · ' + net : ''}${p.from && p.to ? `<br>${esc(p.from)} → ${esc(p.to)}` : ''}</div>
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px"><span class="gchip g-${p.g === 'unknown' ? 'moderate' : p.g}" ${p.g === 'unknown' ? 'style="background:var(--ink-3);color:#fff"' : ''}>${p.g === 'unknown' ? 'Not graded' : GL[p.g]}</span>${p.sac ? `<span class="muted">hardest bit T${p.sac}</span>` : ''}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn primary small" data-add>Add to our hikes</button><a class="btn ghost small" target="_blank" rel="noopener" href="https://hiking.waymarkedtrails.org/#route?id=${p.rid}">Details</a></div>`;
    if (this.popup) this.popup.remove();
    this.popup = new maplibregl.Popup({ maxWidth: '280px' }).setLngLat(ll).setDOMContent(el).addTo(map);
    el.querySelector('[data-add]').onclick = () => { this.popup.remove(); this.addRoute(p.rid); };
  },
  hutPopup(f, ll) {
    const p = f.properties, el = document.createElement('div');
    el.innerHTML = `<b style="font:500 16px var(--f-display)">${esc(p.name)}</b><div class="muted">${p.ele ? fmtM(+p.ele) + ' · ' : ''}${esc(p.op)}</div>
      ${p.dog ? `<div style="margin-top:4px">Dogs: <b>${esc(p.dog)}</b> (OSM tag)</div>` : ''}${p.oh ? `<div class="muted" style="margin-top:4px">${esc(p.oh)}</div>` : ''}
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">${p.web ? `<a class="btn ghost small" target="_blank" rel="noopener" href="${esc(p.web)}">Website</a>` : ''}<a class="btn ghost small" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(p.name + ' opening times')}">Opening times</a></div>`;
    if (this.popup) this.popup.remove();
    this.popup = new maplibregl.Popup({ maxWidth: '260px' }).setLngLat(ll).setDOMContent(el).addTo(map);
  },
  async addRoute(rid) {
    const f = GEO.explore.features.find(x => x.properties.rid === rid); if (!f) return;
    const segs = f.geometry.coordinates.map(s => s.slice());
    let line = segs.shift();
    while (segs.length) { // greedy chaining of member ways
      const end = line[line.length - 1], st = line[0]; let best = -1, mode = 0, bd = 1e9;
      segs.forEach((s, i) => { [[havLL(end, s[0]), 0], [havLL(end, s[s.length - 1]), 1], [havLL(st, s[s.length - 1]), 2], [havLL(st, s[0]), 3]].forEach(([d, m]) => { if (d < bd) { bd = d; best = i; mode = m; } }); });
      if (bd > 0.08) break;
      const s = segs.splice(best, 1)[0];
      if (mode === 0) line = line.concat(s.slice(1)); else if (mode === 1) line = line.concat(s.reverse().slice(1)); else if (mode === 2) line = s.concat(line.slice(1)); else line = s.reverse().concat(line.slice(1));
    }
    toast('Getting elevations…');
    let c = simplify(line.map(q => [q[0], q[1], null]), 6);
    try { c = await addElevation(c); } catch (e) { }
    const st = lineStats(c), hiI = c.reduce((bi, q, i, a) => (q[2] ?? -1e9) > (a[bi][2] ?? -1e9) ? i : bi, 0);
    const loop = havLL(c[0], c[c.length - 1]) < 0.35, p = f.properties;
    const near = [...HK].sort((a, b) => havLL([a.start[1], a.start[0]], c[0]) - havLL([b.start[1], b.start[0]], c[0]))[0];
    const id = 'osm-' + rid, pts = [[c[0][1], c[0][0]], [c[hiI][1], c[hiI][0]]]; if (!loop) pts.push([c[c.length - 1][1], c[c.length - 1][0]]);
    putItem('hike:' + id, 'hike', { n: p.name, ar: near ? near.ar : 'My hikes', rg: near?.rg || '', c: near?.c || 'DE', p: pts, hi: 1, ty: loop ? 'loop' : 'trav', km: Math.round(st.km * 10) / 10, up: st.asc, dn: st.desc, mx: st.mx || 0, lo: c[0][2] || 0, g: p.g === 'unknown' ? 'moderate' : p.g, sc: p.sac ? 'T' + p.sac : '', tg: [], ss: [5, 10], d: { r: 'free', t: p.sac >= 4 ? 'no' : p.sac === 3 ? 'care' : 'ok' }, b: `Marked route from OpenStreetMap (relation ${rid}).`, links: [`https://hiking.waymarkedtrails.org/#route?id=${rid}`] });
    rebuildHikes();
    putItem('route:' + id, 'route', { c: c.map(q => [Math.round(q[0] * 1e5) / 1e5, Math.round(q[1] * 1e5) / 1e5, q[2]]), wk: Routes.key(HBY[id]), src: 'gpx', ts: Date.now() });
    UI.refresh(); UI.openHike(id); toast('Added to your hikes');
  },
  async checkRules(h) {
    const out = $('#dOsmOut'); out.innerHTML = '<p class="muted">Asking OpenStreetMap…</p>';
    const r = Routes.cached(h), pts = r ? r.c.map(q => [q[1], q[0]]) : h.p;
    const la = pts.map(q => q[0]), lo = pts.map(q => q[1]), pad = 0.004;
    const bb = [Math.min(...la) - pad, Math.min(...lo) - pad, Math.max(...la) + pad, Math.max(...lo) + pad].map(v => v.toFixed(4)).join(',');
    try {
      const j = await overpass(`[out:json][timeout:25];(relation["boundary"~"^(national_park|protected_area)$"](${bb});relation["leisure"="nature_reserve"](${bb});way["leisure"="nature_reserve"](${bb});way["boundary"="protected_area"](${bb});way["dog"](${bb});node["dog"](${bb}););out tags 80;`);
      const parks = new Map(), dogs = {};
      for (const e of j.elements) {
        const t = e.tags || {};
        if (t.dog && !t.boundary && !t.leisure) dogs[t.dog] = (dogs[t.dog] || 0) + 1;
        if (t.name && (t.boundary || t.leisure)) parks.set(t.name, t.boundary === 'national_park' ? 'national park' : t.leisure === 'nature_reserve' ? 'nature reserve' : t.protection_title || 'protected area');
        if (t.dog && (t.boundary || t.leisure) && t.name) parks.set(t.name, (parks.get(t.name) || '') + ` · dog=${t.dog}`);
      }
      const dl = Object.entries(dogs).map(([k, v]) => `${v}× dog=${esc(k)}`).join(', ');
      out.innerHTML = `<ul class="dog-list">${[...parks].map(([n, k]) => `<li>${esc(n)} <span class="muted">(${esc(k)})</span></li>`).join('') || '<li>No national park or nature reserve mapped around this route.</li>'}
        <li>${dl ? 'Dog tags on paths or places nearby: ' + dl : 'No dog tags mapped on paths here.'}</li></ul><p class="src-tag">OpenStreetMap is volunteer-mapped and covers the rectangle around the route, so treat this as a hint.</p>`;
    } catch (e) { out.innerHTML = `<p class="muted">OpenStreetMap didn't answer (${esc(e.message)}). Try again later.</p>`; }
  }
};

/* ───────────── Photos from Wikimedia Commons ───────────── */
const Photos = {
  cache: {},
  async load(h) {
    const box = $('#dPhotos'); if (!box) return;
    const k = h.top.join(',');
    try {
      let list = this.cache[k];
      if (!list) {
        const qs = new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'geosearch', ggscoord: `${h.top[0]}|${h.top[1]}`, ggsradius: '4000', ggslimit: '40', ggsnamespace: '6', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '360', iiextmetadatafilter: 'Artist|LicenseShortName' });
        const r = await fetchT('https://commons.wikimedia.org/w/api.php?' + qs, {}, 15000);
        const j = await r.json();
        if (j.error) throw new Error(j.error.info || 'busy');
        list = Object.values(j.query?.pages || {}).filter(p => p.imageinfo && /\.(jpe?g|png|webp)$/i.test(p.title)).sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).slice(0, 14).map(p => ({ t: p.title, i: p.imageinfo[0] }));
        this.cache[k] = list;
      }
      if (UI.detailId !== h.id) return;
      const txt = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.trim(); };
      box.innerHTML = list.length ? list.map(p => `<a class="photo" href="${esc(p.i.descriptionurl)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(p.i.thumburl)}" alt="${esc(p.t.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''))}"><span>${esc(txt(p.i.extmetadata?.Artist?.value) || 'Unknown author')} · ${esc(txt(p.i.extmetadata?.LicenseShortName?.value))}</span></a>`).join('')
        : '<span class="muted">No geotagged photos within 4 km. Try the links below.</span>';
    } catch (e) { if (UI.detailId !== h.id) return; box.innerHTML = '<span class="muted">Wikimedia photo search is busy right now. <button class="btn ghost small" id="phRetry">Try again</button></span>'; $('#phRetry').onclick = () => { box.innerHTML = '<span class="muted">Looking for photos…</span>'; this.load(h); }; }
  }
};

/* ───────────── Flyover & “play our year” ───────────── */
const Fly = {
  on: false, raf: 0,
  hud(t, sub) { $('#flyHud').hidden = false; $('#flyTitle').innerHTML = `${esc(t)}<small>${esc(sub)}</small>`; $('#flyProg').style.width = '0'; },
  stop() { this.on = false; cancelAnimationFrame(this.raf); $('#flyHud').hidden = true; setSrc('prog', EMPTY); },
  async hike(h) {
    let r = Routes.cached(h);
    if (!r) { toast('Tracing the route first…'); r = await Routes.get(h).catch(() => null); }
    if (!r || r.c.length < 2) return toast('No route to fly over yet');
    this.stop(); if (!S.threeD) set3D(true);
    if (isPhone()) Sheet.to(0);
    const c = r.c, cum = [0]; for (let i = 1; i < c.length; i++) cum.push(cum[i - 1] + havLL(c[i - 1], c[i]));
    const tot = cum[cum.length - 1];
    const at = d => { let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m + 1; else hi = m; } if (lo === 0) return [c[0][0], c[0][1], 0]; const t = (d - cum[lo - 1]) / Math.max(1e-9, cum[lo] - cum[lo - 1]); return [c[lo - 1][0] + (c[lo][0] - c[lo - 1][0]) * t, c[lo - 1][1] + (c[lo][1] - c[lo - 1][1]) * t, lo]; };
    const look = Math.max(0.3, tot * 0.06), zoom = tot > 14 ? 13.3 : tot > 7 ? 13.8 : 14.3, dur = clamp(14000 + tot * 1700, 16000, 52000);
    let brg = bearingLL(c[0], at(Math.min(tot, look)));
    this.on = true; this.hud(h.n, `${fmtKm(tot)} traced · ${GL[h.g]}${h.ty === 'out' ? ' · one way' : ''}`);
    await new Promise(res => { map.flyTo({ center: [c[0][0], c[0][1]], zoom, pitch: 64, bearing: brg, duration: 2400, essential: true }); map.once('moveend', res); });
    if (!this.on) return;
    const t0 = performance.now(); let frame = 0;
    const step = now => {
      if (!this.on) return;
      const p = Math.min(1, (now - t0) / dur), d = p * tot, pos = at(d), ahead = at(Math.min(tot, d + look));
      const tb = bearingLL(pos, ahead), diff = ((tb - brg + 540) % 360) - 180; brg = (brg + diff * 0.035 + 360) % 360;
      map.jumpTo({ center: [pos[0], pos[1]], bearing: brg });
      if (++frame % 4 === 0) setSrc('prog', { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [...c.slice(0, Math.max(1, pos[2])).map(q => [q[0], q[1]]), [pos[0], pos[1]]] }, properties: {} }] });
      $('#flyProg').style.width = (p * 100).toFixed(1) + '%';
      if (p < 1) this.raf = requestAnimationFrame(step); else { this.on = false; setTimeout(() => { $('#flyHud').hidden = true; setSrc('prog', EMPTY); flyToHike(h); }, 900); }
    };
    this.raf = requestAnimationFrame(step);
  },
  async year() {
    const L = logs(); if (!L.length) return toast('Log a few hikes first, then play them back here.');
    const y = L[0].date.slice(0, 4), list = L.filter(l => l.date.startsWith(y)).reverse();
    this.stop(); this.on = true; if (!S.threeD) set3D(true); if (isPhone()) Sheet.to(0);
    UI.closeDetail();
    for (let k = 0; k < list.length && this.on; k++) {
      const l = list[k], h = HBY[l.hike];
      this.hud(h.n, `${fmtDate(l.date, { wd: true, y: true })} · ${k + 1} of ${list.length}`);
      $('#flyProg').style.width = ((k + 1) / list.length * 100) + '%';
      showSelected(h);
      await new Promise(res => { map.flyTo({ center: [h.top[1], h.top[0]], zoom: 12.4, pitch: 62, bearing: (k * 53) % 360 - 120, duration: 3800, curve: 1.7, essential: true }); map.once('moveend', res); });
      await sleep(1500);
    }
    if (this.on) { this.stop(); showSelected(null); fitRegion(); toast(`${list.length} outing${list.length > 1 ? 's' : ''} in ${y}. On to the next ones.`, 4000); }
  }
};

/* ───────────── Sync (Supabase, optional) ───────────── */
const SUPA_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js';
const SYNC_SQL = `create table if not exists public.cordee_items (
  id text primary key,
  kind text not null,
  data jsonb,
  deleted boolean not null default false,
  client_ts timestamptz not null,
  updated_at timestamptz not null default now(),
  owner uuid not null default auth.uid()
);
create index if not exists cordee_items_updated on public.cordee_items (updated_at);
alter table public.cordee_items enable row level security;
drop policy if exists "owner only" on public.cordee_items;
create policy "owner only" on public.cordee_items for all
  using (auth.uid() = owner) with check (auth.uid() = owner);
create or replace function public.cordee_touch() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists cordee_touch on public.cordee_items;
create trigger cordee_touch before insert or update on public.cordee_items
  for each row execute function public.cordee_touch();`;
const Sync = {
  sb: null, busy: false, status: 'off', msg: '', started: false,
  soon: debounce(() => Sync.run(), 3000),
  configured() { return !!(S.sync.url && S.sync.key); },
  async client() {
    if (this.sb) return this.sb; if (!this.configured()) return null;
    if (!window.supabase) await loadScript(SUPA_JS);
    this.sb = window.supabase.createClient(S.sync.url, S.sync.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'cordee-auth' } });
    return this.sb;
  },
  async signIn(email, password) {
    const sb = await this.client(); if (!sb) throw new Error('Enter the project URL and key first');
    const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error;
    await this.run(true);
  },
  async signOut() { try { const sb = await this.client(); if (sb) await sb.auth.signOut(); } catch (e) { } this.setStatus('off', 'Signed out'); },
  async run(full = false) {
    if (this.busy || !this.configured()) return; this.busy = true;
    try {
      const sb = await this.client(); const { data: { session } } = await sb.auth.getSession();
      if (!session) { this.setStatus('off', 'Not signed in'); return; }
      this.setStatus('busy', 'Syncing…');
      const since = full ? '1970-01-01T00:00:00Z' : LS.get('lastPull', '1970-01-01T00:00:00Z');
      let from = 0, maxU = since, changed = false;
      for (; ;) {
        const { data, error } = await sb.from('cordee_items').select('id,kind,data,deleted,client_ts,updated_at').gt('updated_at', since).order('updated_at', { ascending: true }).range(from, from + 999);
        if (error) throw error;
        for (const row of data) {
          const loc = ITEMS[row.id], rt = new Date(row.client_ts).getTime();
          if (!loc || rt > new Date(loc.u).getTime()) { ITEMS[row.id] = { k: row.kind, d: row.data, x: row.deleted, u: new Date(rt).toISOString(), dirty: false }; changed = true; }
          if (row.updated_at > maxU) maxU = row.updated_at;
        }
        if (data.length < 1000) break; from += 1000;
      }
      const dirty = Object.entries(ITEMS).filter(([, v]) => v.dirty);
      for (let i = 0; i < dirty.length; i += 200) {
        const part = dirty.slice(i, i + 200);
        const { error } = await sb.from('cordee_items').upsert(part.map(([id, v]) => ({ id, kind: v.k, data: v.d, deleted: !!v.x, client_ts: v.u })), { onConflict: 'id' });
        if (error) throw error;
        part.forEach(([id, v]) => { if (ITEMS[id] && ITEMS[id].u === v.u) ITEMS[id].dirty = false; });
      }
      LS.set('lastPull', maxU); LS.set('items', ITEMS);
      if (changed) { rebuildHikes(); UI.refresh(); if (UI.state.tab === 'log') UI.renderLog(); }
      this.setStatus('ok', 'Synced at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e) { console.warn('sync', e); this.setStatus('err', 'Sync failed: ' + (e.message || e)); }
    finally { this.busy = false; }
  },
  setStatus(s, msg) {
    this.status = s; this.msg = msg;
    const b = $('#btnSync'); if (b) { b.hidden = !this.configured(); b.className = 'icon-btn' + (s === 'ok' ? ' ok' : s === 'err' ? ' err' : ''); b.title = msg; b.setAttribute('aria-label', 'Sync: ' + msg); }
    const el = $('#syncStatus'); if (el) el.textContent = msg;
  },
  start() {
    if (!this.configured()) { this.setStatus('off', 'Not set up'); return; }
    this.run();
    if (this.started) return; this.started = true;
    setInterval(() => this.run(), 5 * 60e3);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.run(); });
  }
};

/* ───────────── Boot ───────────── */
function bindControls() {
  $$('.tabs [role=tab]').forEach(b => b.onclick = () => UI.setTab(b.dataset.tab));
  $('#q').value = UI.state.q || '';
  $('#q').addEventListener('input', e => { UI.state.q = e.target.value; UI.refreshSoon(); });
  $('#sortSel').value = UI.state.sort; $('#sortSel').onchange = e => { UI.state.sort = e.target.value; UI.renderList(); UI.save(); };
  $('#inView').checked = UI.state.inView; $('#inView').onchange = e => { UI.state.inView = e.target.checked; UI.renderList(); UI.save(); };
  $('#btnAddHike').onclick = () => Pick.start('hike');
  $('#btnAsk').onclick = () => Dlg.ask(UI.state.q || '');
  $('#btnSettings').onclick = () => Dlg.settings();
  $('#btnSync').onclick = () => { toast(Sync.msg || 'Syncing'); Sync.run(true); };
  const bm = $('#baseMenu');
  const syncBase = () => { $$('#baseMenu [data-base]').forEach(b => b.setAttribute('aria-checked', b.dataset.base === S.base)); $('#optContours').checked = S.contours; $('#optTrails').checked = S.trails; };
  $('#btnBase').onclick = () => { bm.hidden = !bm.hidden; $('#btnBase').setAttribute('aria-expanded', !bm.hidden); syncBase(); };
  $$('#baseMenu [data-base]').forEach(b => b.onclick = () => { setBase(b.dataset.base); syncBase(); bm.hidden = true; $('#btnBase').setAttribute('aria-expanded', false); });
  $('#optContours').onchange = e => { S.contours = e.target.checked; saveSettings(); restyle(); };
  $('#optTrails').onchange = e => { S.trails = e.target.checked; saveSettings(); restyle(); };
  document.addEventListener('click', e => { if (!bm.hidden && !e.target.closest('#baseMenu,#btnBase')) { bm.hidden = true; $('#btnBase').setAttribute('aria-expanded', false); } });
  $('#btn3d').setAttribute('aria-pressed', S.threeD); $('#btn3d').onclick = () => set3D(!S.threeD);
  $('#btnWx').setAttribute('aria-pressed', UI.state.wxOnMap); $('#btnWx').onclick = () => UI.setWxOnMap(!UI.state.wxOnMap);
  $('#wxOnMap').onchange = e => UI.setWxOnMap(e.target.checked);
  $('#btnExplore').onclick = () => Explore.toggle();
  $('#btnHome').onclick = () => { UI.closeDetail(); fitRegion(); };
  $('#btnLogNew').onclick = () => Dlg.log(null);
  $('#btnGpx').onclick = () => $('#fileGpx').click();
  $('#fileGpx').onchange = e => { Gpx.import([...e.target.files]); e.target.value = ''; };
  $('#fileBackup').onchange = e => { if (e.target.files[0]) Backup.import(e.target.files[0]); e.target.value = ''; };
  $('#btnYear').onclick = () => Fly.year();
  $('#flyStop').onclick = () => Fly.stop();
  $('#mapMsgCancel').onclick = () => Pick.stop();
  $('#editUndo').onclick = () => Edit.undo(); $('#editCancel').onclick = () => Edit.stop(); $('#editSave').onclick = () => Edit.save();
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || $('#dlg').open) return;
    if (Fly.on) Fly.stop(); else if (Pick.on) Pick.stop(); else if (Edit.on) Edit.stop(); else if (UI.detailId) UI.closeDetail();
  });
  addEventListener('hashchange', () => { const m = location.hash.match(/^#hike-(.+)$/); if (m && HBY[m[1]] && UI.detailId !== m[1]) UI.openHike(m[1]); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.theme === 'system') { restyle(); if (UI.detailId) UI.openHike(UI.detailId, { noFly: true }); } });
}
function boot() {
  applyTheme(); rebuildHikes(); brandLine();
  UI.buildFind(); bindControls(); Sheet.init();
  UI.compute();
  UI.setTab(['hikes', 'find', 'weather', 'log'].includes(UI.state.tab) ? UI.state.tab : 'hikes');
  if (window.maplibregl) initMap();
  else $('#map').innerHTML = '<div class="empty" style="padding-top:30vh"><strong>The map library did not load</strong>Check the internet connection and reload.</div>';
  UI.refresh();
  if (UI.state.wxOnMap) UI.setWxOnMap(true);
  const m = location.hash.match(/^#hike-(.+)$/); if (m && HBY[m[1]]) setTimeout(() => UI.openHike(m[1]), 700);
  const wx = () => loadOverview().then(() => { UI.syncFind(); UI.refresh(); UI.renderMapDaybar(); }).catch(e => toast('Weather unavailable: ' + e.message, 4000));
  wx(); setInterval(wx, 30 * 6e4);
  loadDrive().then(() => UI.refresh());
  Sync.start();
  setTimeout(() => Routes.background(), 3500);
  loadCatalogue().then(changed => {
    if (!changed) return;
    rebuildHikes(); UI.refresh();
    if (UI.detailId && HBY[UI.detailId]) UI.openHike(UI.detailId, { noFly: true });
    loadOverview().then(() => UI.refresh()).catch(() => { });
    loadDrive().then(() => UI.refresh());
  });
  if (!hasNames() && !LS.get('welcomed', 0) && !m) setTimeout(() => { if (!$('#dlg').open) Dlg.welcome(); }, 900);
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
