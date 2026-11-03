/* ───────────── Our photos ─────────────
   Photos of the hikes you've done. A log entry keeps its photos as data.photos = [{ id, w, h, t }]
   (t = when it was taken, from the camera), which syncs with the rest of the logbook. The pictures
   themselves are made smaller on the device, kept in IndexedDB and, when signed in, uploaded to
   the private Supabase Storage bucket "cordee-photos" (one folder per account). Another device
   downloads a photo the first time it is shown and keeps it. */
const ALBUM_BUCKET = 'cordee-photos';
const ALBUM_SQL = `-- Cordée photos: a private bucket, each account only sees its own folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cordee-photos', 'cordee-photos', false, 10485760, array['image/jpeg'])
on conflict (id) do nothing;
drop policy if exists "cordee photos read" on storage.objects;
create policy "cordee photos read" on storage.objects for select to authenticated
  using (bucket_id = 'cordee-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "cordee photos add" on storage.objects;
create policy "cordee photos add" on storage.objects for insert to authenticated
  with check (bucket_id = 'cordee-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "cordee photos change" on storage.objects;
create policy "cordee photos change" on storage.objects for update to authenticated
  using (bucket_id = 'cordee-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'cordee-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "cordee photos delete" on storage.objects;
create policy "cordee photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'cordee-photos' and (storage.foldername(name))[1] = auth.uid()::text);`;

/* Date and time a JPEG was taken (EXIF DateTimeOriginal), as "YYYY-MM-DDTHH:MM" local time. */
async function exifDate(file) {
  const b = new DataView(await file.slice(0, 262144).arrayBuffer());
  if (b.byteLength < 4 || b.getUint16(0) !== 0xFFD8) return null;
  let o = 2;
  while (o + 10 < b.byteLength) {
    const m = b.getUint16(o), len = b.getUint16(o + 2);
    if ((m & 0xFF00) !== 0xFF00) break;
    if (m === 0xFFE1 && b.getUint32(o + 4) === 0x45786966) {
      const t = o + 10, le = b.getUint16(t) === 0x4949;
      const u16 = p => b.getUint16(t + p, le), u32 = p => b.getUint32(t + p, le);
      const ifd = p => { const n = u16(p), out = {}; for (let i = 0; i < n; i++) { const e = p + 2 + i * 12; out[u16(e)] = e; } return out; };
      const str = e => { const n = u32(e + 4), p = n > 4 ? u32(e + 8) : e + 8; let s = ''; for (let i = 0; i < n - 1 && i < 40; i++) s += String.fromCharCode(b.getUint8(t + p + i)); return s; };
      const i0 = ifd(u32(4)); let e = null;
      if (i0[0x8769]) { const sub = ifd(u32(i0[0x8769] + 8)); e = sub[0x9003] || sub[0x9004]; }
      if (!e && i0[0x0132]) e = i0[0x0132];
      if (!e) return null;
      const d = str(e).match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d)/);
      return d && +d[1] > 1990 ? `${d[1]}-${d[2]}-${d[3]}T${d[4]}:${d[5]}` : null;
    }
    o += 2 + len;
  }
  return null;
}

const Album = {
  db: null, urls: new Map(), loading: new Map(), busy: false, cloud: { ok: null, msg: '' },

  /* Device storage */
  open() {
    if (this.db) return this.db;
    this.db = new Promise((res, rej) => {
      const r = indexedDB.open('cordee-album', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('img');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error || new Error('photo storage is blocked in this browser'));
    });
    this.db.catch(() => { this.db = null; });
    return this.db;
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction('img', mode), r = fn(t.objectStore('img')); let out;
      if (r) r.onsuccess = () => { out = r.result; };
      t.oncomplete = () => res(out); t.onerror = t.onabort = () => rej(t.error || new Error('photo storage failed'));
    });
  },
  get(id) { return this.tx('readonly', s => s.get(id)); },
  put(id, v) { return this.tx('readwrite', s => s.put(v, id)); },
  del(id) { return this.tx('readwrite', s => s.delete(id)); },
  keys() { return this.tx('readonly', s => s.getAllKeys()); },

  /* Make a photo smaller (1920 px on the long side, plus a 480 px thumbnail) and keep it here. */
  async add(file) {
    const t = await exifDate(file).catch(() => null);
    let src;
    try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) {
      src = await new Promise((res, rej) => {
        const u = URL.createObjectURL(file), im = new Image();
        im.onload = () => { res(im); setTimeout(() => URL.revokeObjectURL(u), 2000); };
        im.onerror = () => { URL.revokeObjectURL(u); rej(new Error(`${file.name || 'this file'} can't be opened in this browser (HEIC works in Safari; or export it as JPEG)`)); };
        im.src = u;
      });
    }
    const W = src.width || src.naturalWidth, H = src.height || src.naturalHeight;
    if (!W || !H) throw new Error('empty image');
    const full = await this.scale(src, W, H, 1920, .82), thumb = await this.scale(src, W, H, 480, .74);
    if (src.close) src.close();
    const s = Math.min(1, 1920 / Math.max(W, H)), id = 'p' + uid();
    await this.put(id, { full, thumb, up: false, ts: Date.now() });
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
    const p = { id, w: Math.round(W * s), h: Math.round(H * s) };
    if (t) p.t = t;
    return p;
  },
  scale(src, W, H, max, q) {
    const s = Math.min(1, max / Math.max(W, H)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * s)); c.height = Math.max(1, Math.round(H * s));
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height);
    return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('could not compress the photo')), 'image/jpeg', q));
  },
  /* Photos dropped before an entry was saved */
  async discard(ids) { for (const id of ids) { this.revoke(id); await this.del(id).catch(() => { }); } },
  /* Photos removed from a saved entry: gone here and from the account */
  async forget(ids) {
    if (!ids.length) return;
    await this.discard(ids);
    LS.set('albumDel', [...new Set([...LS.get('albumDel', []), ...ids])]);
    this.upload();
  },
  revoke(id) { for (const k of ['full', 'thumb']) { const u = this.urls.get(id + ':' + k); if (u) { URL.revokeObjectURL(u); this.urls.delete(id + ':' + k); } } },

  /* Account storage (Supabase) */
  async session() {
    if (!Sync.configured()) return null;
    try { const sb = await Sync.client(); const { data: { session } } = await sb.auth.getSession(); return session ? { sb, uid: session.user.id } : null; } catch (e) { return null; }
  },
  path(c, id, kind) { return `${c.uid}/${id}${kind === 'thumb' ? '_t' : ''}.jpg`; },
  used() { const s = new Set(); for (const l of itemsOf('log')) (l.photos || []).forEach(p => s.add(p.id)); return s; },
  async upload() {
    if (this.busy) return; this.busy = true;
    try {
      const c = await this.session();
      if (!c) { this.cloud = { ok: null, msg: Sync.configured() ? 'Sign in (Settings → Sync) to keep your photos in your account and see them on every device.' : 'Photos are kept on this device only. Set up sync to see them on every device.' }; return; }
      const st = c.sb.storage.from(ALBUM_BUCKET), dels = LS.get('albumDel', []);
      if (dels.length) { const { error } = await st.remove(dels.flatMap(id => [this.path(c, id, 'full'), this.path(c, id, 'thumb')])); if (!error) LS.set('albumDel', LS.get('albumDel', []).filter(x => !dels.includes(x))); }
      const used = this.used();
      let n = 0;
      for (const id of await this.keys()) {
        const r = await this.get(id); if (!r) continue;
        if (!used.has(id)) { if (r.up && Date.now() - (r.ts || 0) > 864e5) await this.del(id); continue; } // removed on another device
        if (r.up || !r.full) continue;
        for (const kind of ['full', 'thumb']) {
          const { error } = await st.upload(this.path(c, id, kind), r[kind], { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' });
          if (error) throw error;
        }
        r.up = true; await this.put(id, r); n++;
      }
      this.cloud = { ok: true, msg: 'Your photos are saved in your account.' };
      if (n && UI.state.tab === 'photos') this.render();
    } catch (e) {
      console.warn('photos', e);
      const m = String(e.message || e);
      this.cloud = { ok: false, msg: /bucket.*not.*found|not found/i.test(m) ? 'Photo storage is not set up in your Supabase project yet, so photos stay on this device for now. Run the photo SQL once (Settings → Photos).' : /row-level|policy|unauthori[sz]ed|403/i.test(m) ? 'Your Supabase project refused the upload. Run the photo SQL once (Settings → Photos).' : 'Photos not uploaded yet (' + m + '). Retrying later.' };
    } finally { this.busy = false; const el = $('#phCloud'); if (el) this.paintCloud(el); }
  },
  async counts() {
    const used = this.used(); let here = 0, wait = 0;
    try { for (const id of await this.keys()) { if (!used.has(id)) continue; const r = await this.get(id); if (r && r.full) here++; if (r && !r.up) wait++; } } catch (e) { }
    return { total: used.size, here, wait };
  },
  paintCloud(el) { el.textContent = this.cloud.msg || ''; el.className = 'ph-cloud' + (this.cloud.ok === false ? ' warn' : ''); el.hidden = !this.cloud.msg || this.cloud.ok === true; },

  /* Showing photos: <img data-ph="id" data-k="thumb|full"> are filled in when they scroll into view. */
  async url(id, kind = 'thumb') {
    const k = id + ':' + kind;
    if (this.urls.has(k)) return this.urls.get(k);
    if (this.loading.has(k)) return this.loading.get(k);
    const p = (async () => {
      let r = await this.get(id).catch(() => null), blob = r && r[kind];
      if (!blob) {
        const c = await this.session(); if (!c) return null;
        const { data, error } = await c.sb.storage.from(ALBUM_BUCKET).download(this.path(c, id, kind));
        if (error || !data) return null;
        blob = data.type === 'image/jpeg' ? data : new Blob([data], { type: 'image/jpeg' });
        r = r || { up: true, ts: Date.now() }; r[kind] = blob; await this.put(id, r).catch(() => { });
      }
      const u = URL.createObjectURL(blob); this.urls.set(k, u); return u;
    })();
    this.loading.set(k, p);
    try { return await p; } finally { this.loading.delete(k); }
  },
  async load(img) {
    const u = await this.url(img.dataset.ph, img.dataset.k || 'thumb').catch(() => null);
    if (u) { img.src = u; img.closest('.ph')?.classList.remove('missing'); } else img.closest('.ph')?.classList.add('missing');
  },
  fill(root) {
    if (!root) return;
    if (!this.io) this.io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { this.io.unobserve(e.target); this.load(e.target); } }), { rootMargin: '400px' }) : null;
    root.querySelectorAll('img[data-ph]:not([src])').forEach(img => this.io ? this.io.observe(img) : this.load(img));
  },

  /* Small row of photos under a logbook entry */
  strip(l) {
    const P = l.photos || []; if (!P.length) return '';
    const max = 5, extra = P.length - max;
    return `<div class="log-ph">${P.slice(0, max).map((p, i) => `<button type="button" class="ph" data-log="${l.id}" data-i="${i}" aria-label="Photo ${i + 1} of ${P.length}"><img data-ph="${p.id}" alt="">${i === max - 1 && extra > 0 ? `<span class="more">+${extra}</span>` : ''}</button>`).join('')}</div>`;
  },
  bindStrips(root) {
    if (!root) return;
    root.querySelectorAll('.log-ph .ph').forEach(b => b.onclick = e => { e.stopPropagation(); this.show(this.seqOf([logById(b.dataset.log)].filter(Boolean)), +b.dataset.i); });
    this.fill(root);
  },
  seqOf(L) { return L.flatMap(l => (l.photos || []).map((p, i) => ({ ...p, log: l.id, n: i + 1, of: l.photos.length }))); },

  /* The Photos tab */
  render() {
    const v = $('#view-photos'); if (!v) return;
    const all = logs().filter(l => l.photos && l.photos.length);
    const years = [...new Set(all.map(l => l.date.slice(0, 4)))];
    let yr = UI.state.phYear || 'all'; if (yr !== 'all' && !years.includes(yr)) yr = 'all';
    const L = yr === 'all' ? all : all.filter(l => l.date.startsWith(yr));
    const seq = this.seqOf(L); this.seq = seq;
    const n = seq.length;
    let k = 0;
    v.innerHTML = `<div class="ph-head"><div><b>${n ? nf.format(n) + ' photo' + (n > 1 ? 's' : '') : 'Photos'}</b><span class="muted">${L.length ? ' · ' + L.length + ' hike' + (L.length > 1 ? 's' : '') : ''}</span></div>
        <button class="btn primary small" id="phAdd">${ic('i-camera')}Add photos</button></div>
      ${years.length > 1 ? `<div class="seg-chips ph-years">${['all', ...years].map(y => `<button type="button" data-y="${y}" aria-pressed="${y === yr}">${y === 'all' ? 'All' : y}</button>`).join('')}</div>` : ''}
      <p class="ph-cloud" id="phCloud" hidden></p>
      ${L.length ? L.map(l => {
        const h = HBY[l.hike], start = k; k += l.photos.length;
        return `<section class="ph-group"><button type="button" class="ph-gh" data-i="${start}"><b>${esc(h.n)}</b><span>${fmtDate(l.date, { wd: true, y: true })} · ${esc(h.ar)} · ${l.photos.length} photo${l.photos.length > 1 ? 's' : ''}</span></button>
          <div class="ph-grid">${l.photos.map((p, i) => `<button type="button" class="ph" data-i="${start + i}" aria-label="${esc(h.n)}, photo ${i + 1}"><img data-ph="${p.id}" alt=""></button>`).join('')}</div></section>`;
      }).join('') : `<div class="empty"><strong>No photos yet</strong>Add photos when you mark a hike as done, or with the button above for a hike already in the logbook. Tap a photo later to see the whole day: where you went, your time, who came, the weather.</div>`}`;
    $('#phAdd').onclick = () => Dlg.addPhotos();
    v.querySelectorAll('.ph-years button').forEach(b => b.onclick = () => { UI.state.phYear = b.dataset.y; UI.save(); this.render(); });
    v.querySelectorAll('.ph-grid .ph, .ph-gh').forEach(b => b.onclick = () => this.show(seq, +b.dataset.i));
    this.paintCloud($('#phCloud'));
    this.fill(v);
  },

  /* Full-screen viewer with everything about that day */
  show(seq, i) {
    if (!seq.length) return;
    let d = $('#pv');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'pv'; d.className = 'pv'; d.setAttribute('aria-label', 'Photo');
      d.innerHTML = `<div class="pv-stage" id="pvStage"><img id="pvImg" alt=""><p class="pv-miss" id="pvMiss" hidden>This photo is not on this device yet.<br>Sign in (Settings → Sync) to load it from your account.</p><button type="button" class="pv-nav prev" id="pvPrev" aria-label="Previous photo">${ic('i-back')}</button><button type="button" class="pv-nav next" id="pvNext" aria-label="Next photo">${ic('i-back')}</button>
        <div class="pv-bar"><span id="pvCount"></span><button type="button" class="pv-x" id="pvClose" aria-label="Close">${ic('i-close')}</button></div></div><aside class="pv-info" id="pvInfo"></aside>`;
      document.body.appendChild(d);
      $('#pvClose').onclick = () => d.close();
      $('#pvPrev').onclick = () => this.go(-1); $('#pvNext').onclick = () => this.go(1);
      d.addEventListener('keydown', e => { if (e.target.closest('input,textarea,select')) return; if (e.key === 'ArrowLeft') this.go(-1); if (e.key === 'ArrowRight') this.go(1); });
      let x0 = null, y0 = 0;
      const st = $('#pvStage');
      st.addEventListener('touchstart', e => { if (e.touches.length === 1) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } }, { passive: true });
      st.addEventListener('touchend', e => { if (x0 == null) return; const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) this.go(dx < 0 ? 1 : -1); else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) d.close(); }, { passive: true });
    }
    this.vseq = seq; this.vi = clamp(i, 0, seq.length - 1); this.vlog = null;
    if (!d.open) d.showModal();
    this.paint();
  },
  go(step) { if (!this.vseq || this.vseq.length < 2) return; this.vi = (this.vi + step + this.vseq.length) % this.vseq.length; this.paint(); },
  async paint() {
    const p = this.vseq[this.vi], l = logById(p.log), h = l && HBY[l.hike];
    if (!l || !h) { $('#pv').close(); return; }
    const img = $('#pvImg'), want = p.id;
    $('#pvCount').textContent = this.vseq.length > 1 ? `${this.vi + 1} / ${this.vseq.length}` : '';
    $('#pvPrev').hidden = $('#pvNext').hidden = this.vseq.length < 2;
    img.alt = `${h.n}, ${fmtDate(l.date, { y: true })}`;
    img.classList.add('loading'); $('#pvMiss').hidden = true;
    const th = await this.url(p.id, 'thumb').catch(() => null);
    if (this.vseq[this.vi]?.id !== want) return;
    if (th) img.src = th; else img.removeAttribute('src');
    this.url(p.id, 'full').then(u => { if (u && this.vseq[this.vi]?.id === want) { img.src = u; img.classList.remove('loading'); } else if (!u && !th && this.vseq[this.vi]?.id === want) { img.classList.remove('loading'); $('#pvMiss').hidden = false; } }).catch(() => { });
    [-1, 1].forEach(s => { const q = this.vseq[(this.vi + s + this.vseq.length) % this.vseq.length]; if (q) this.url(q.id, 'thumb').catch(() => { }); });
    if (this.vlog !== l.id) { this.vlog = l.id; this.info(l, h); }
    this.markStrip(p.id);
  },
  markStrip(id) {
    $$('#pvInfo .pv-strip .ph').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    const on = $('#pvInfo .pv-strip .ph.on'), st = on && on.parentElement;
    if (on && (on.offsetLeft < st.scrollLeft || on.offsetLeft + on.offsetWidth > st.scrollLeft + st.clientWidth)) st.scrollLeft = on.offsetLeft - (st.clientWidth - on.offsetWidth) / 2;
  },
  info(l, h) {
    const box = $('#pvInfo'), p = this.vseq[this.vi];
    const km = l.km || h.km, up = l.up ?? h.up, dn = l.dn ?? (h.ty === 'trav' ? h.dn : up), mine = !!l.km;
    const din = logDin(l), who = (l.who || [0, 1]).map(i => esc(personName(i))).join(' & ');
    const visits = (doneMap()[h.id] || []).filter(x => x.id !== l.id);
    const where = [h.rg, COUNTRIES[h.c]].filter(Boolean).join(', ');
    const [y, m, dd] = l.date.split('-').map(Number), long = new Date(y, m - 1, dd).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const P = l.photos || [], times = P.map(x => x.t && x.t.slice(0, 10) === l.date ? x.t.slice(11, 16) : null).filter(Boolean).sort();
    box.innerHTML = `<div class="pv-kicker">${esc(long)}</div>
      <h2>${esc(h.n)}</h2>
      <div class="d-sub">${esc(h.ar)}${where ? ' · ' + esc(where) : ''}</div>
      <div class="d-chips"><span class="gchip g-${h.g}">${GL[h.g]}</span>${h.sc ? `<span class="chip">${esc(SCALES[h.sc] || h.sc)}</span>` : ''}<span class="chip">${TYPE_LABEL[h.ty]}</span>${l.rating ? `<span class="chip pv-stars" aria-label="${l.rating} of 5 stars">${'★'.repeat(l.rating)}<i>${'★'.repeat(5 - l.rating)}</i></span>` : ''}</div>
      <div class="d-grid">
        <div class="d-cell"><span>Distance</span><b>${fmtKm(km)}</b><small>${mine ? 'from your watch' : TYPE_LABEL[h.ty].toLowerCase()}</small></div>
        <div class="d-cell"><span>Ascent</span><b>${fmtM(up)}</b><small>↓ ${fmtM(dn)}</small></div>
        <div class="d-cell"><span>Highest</span><b>${h.mx ? fmtM(h.mx) : '–'}</b><small>start ${h.lo ? fmtM(h.lo) : '–'}</small></div>
        <div class="d-cell"><span>Time taken</span><b>${l.dur ? fmtDur(l.dur) : '–'}</b><small>breaks included</small></div>
        <div class="d-cell"><span>Signposted</span><b>${fmtDur(din)}</b><small>DIN 33466</small></div>
        <div class="d-cell"><span>Pace</span><b>${l.dur && din ? (l.dur / din).toFixed(2) + '×' : '–'}</b><small>${l.dur && din ? (l.dur <= din ? 'faster than the signs' : 'slower than the signs') : 'no time logged'}</small></div>
      </div>
      <dl class="kv-list pv-kv">
        <dt>Who</dt><dd>${who}${l.dog ? ' · with ' + esc(dogName() || 'the dog') : ''}</dd>
        ${times.length ? `<dt>On the trail</dt><dd>${times.length > 1 && times[0] !== times[times.length - 1] ? `photos from ${times[0]} to ${times[times.length - 1]}` : 'photo at ' + times[0]}</dd>` : ''}
        <dt>Weather</dt><dd id="pvWx"><span class="muted">Looking up that day…</span></dd>
        <dt>${h.sn ? 'Start' : 'Trailhead'}</dt><dd>${h.sn ? esc(h.sn) + ' · ' : ''}${h.tn && h.tn !== h.sn ? esc(h.tn) : ''}${!h.sn && !h.tn ? h.start[0].toFixed(4) + ', ' + h.start[1].toFixed(4) : ''}</dd>
        ${visits.length ? `<dt>Other visits</dt><dd>${visits.map(x => fmtDate(x.date, { y: true })).join(' · ')}</dd>` : ''}
      </dl>
      ${l.note ? `<p class="pv-note">${esc(l.note)}</p>` : ''}
      ${P.length > 1 ? `<div class="pv-sec">${P.length} photos from this day</div><div class="pv-strip">${P.map((x, i) => `<button type="button" class="ph" data-id="${x.id}" data-n="${i}" aria-label="Photo ${i + 1}"><img data-ph="${x.id}" alt=""></button>`).join('')}</div>` : ''}
      <div class="pv-actions">
        <button type="button" class="btn primary small" id="pvHike">${ic('i-route')}Show the hike</button>
        <button type="button" class="btn ghost small" id="pvEdit">${ic('i-edit')}Edit the day</button>
        <button type="button" class="btn ghost small" id="pvSave">${ic('i-upload')}Save photo</button>
        <button type="button" class="btn ghost small" id="pvDel">Delete photo</button>
      </div>`;
    const d = $('#pv');
    box.scrollTop = 0;
    box.querySelectorAll('.pv-strip .ph').forEach(b => b.onclick = () => {
      const j = this.vseq.findIndex(q => q.id === b.dataset.id);
      if (j >= 0) { this.vi = j; this.paint(); } else { this.vseq = this.seqOf([l]); this.vi = +b.dataset.n; this.paint(); }
    });
    box.querySelectorAll('img[data-ph]').forEach(img => this.load(img));
    $('#pvHike').onclick = () => { d.close(); UI.openHike(h.id); };
    $('#pvEdit').onclick = () => { d.close(); Dlg.log(h, l.id); };
    $('#pvSave').onclick = () => this.save(this.vseq[this.vi], h, l);
    Dlg.confirmBtn($('#pvDel'), 'Tap again to delete', () => this.removeCurrent());
    this.dayWx(h, l.date).then(w => {
      const el = $('#pvWx'); if (!el || this.vlog !== l.id) return;
      if (!w) { el.innerHTML = '<span class="muted">Not available for that day</span>'; return; }
      const [icon, label] = wmo(w.c);
      el.innerHTML = `<span class="pv-wx"><svg class="wxi" aria-hidden="true"><use href="#${icon}"/></svg>${label} · ${Math.round(w.tn)}–${Math.round(w.tx)} °C</span><small>at the top (${fmtM(w.el)})${w.pr != null ? ' · ' + (w.pr >= .2 ? (Math.round(w.pr * 10) / 10) + ' mm rain' : 'dry') : ''}${w.wd != null ? ' · wind up to ' + Math.round(w.wd) + ' km/h' : ''}${w.sun != null ? ' · ' + Math.round(w.sun / 3600) + ' h of sun' : ''}</small>`;
    }).catch(() => { const el = $('#pvWx'); if (el) el.innerHTML = '<span class="muted">Not available right now</span>'; });
  },
  async dayWx(h, date) {
    const key = h.top.map(x => x.toFixed(2)).join(',') + '@' + date, mem = this.wxc || (this.wxc = LS.get('dayWx', {}));
    if (mem[key]) return mem[key];
    const ago = (Date.now() - new Date(date + 'T12:00').getTime()) / 864e5;
    if (ago < -0.5) return null;
    const el = h.mx || h.lo || null;
    const base = ago < 60 ? 'https://api.open-meteo.com/v1/forecast' : 'https://archive-api.open-meteo.com/v1/archive';
    const r = await fetchT(`${base}?latitude=${h.top[0].toFixed(4)}&longitude=${h.top[1].toFixed(4)}${el ? '&elevation=' + Math.round(el) : ''}&start_date=${date}&end_date=${date}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunshine_duration&timezone=auto`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json(), d = j.daily;
    if (!d || d.temperature_2m_max?.[0] == null) return null;
    const w = { c: d.weather_code?.[0], tx: d.temperature_2m_max[0], tn: d.temperature_2m_min[0], pr: d.precipitation_sum?.[0], wd: d.wind_speed_10m_max?.[0], sun: d.sunshine_duration?.[0], el: el || j.elevation };
    if (ago > 7) { mem[key] = w; const ks = Object.keys(mem); if (ks.length > 400) delete mem[ks[0]]; LS.set('dayWx', mem); }
    return w;
  },
  async save(p, h, l) {
    const u = await this.url(p.id, 'full') || await this.url(p.id, 'thumb');
    if (!u) { toast('This photo is not on this device yet'); return; }
    const name = `${h.n} ${l.date} ${p.n || ''}`.replace(/[\\/:*?"<>|]+/g, '').trim().replace(/\s+/g, ' ') + '.jpg';
    try {
      const blob = await (await fetch(u)).blob(), file = new File([blob], name, { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && isPhone()) { await navigator.share({ files: [file], title: h.n }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  },
  removeCurrent() {
    const p = this.vseq[this.vi], it = ITEMS[p.log]; if (!it || !it.d) return;
    const photos = (it.d.photos || []).filter(x => x.id !== p.id);
    putItem(p.log, 'log', { ...it.d, photos });
    this.forget([p.id]);
    toast('Photo deleted');
    const rest = this.vseq.filter(x => x.id !== p.id).map(x => x.log === p.log ? { ...x, of: photos.length, n: photos.findIndex(y => y.id === x.id) + 1 } : x);
    afterLog();
    if (!rest.length) { $('#pv').close(); return; }
    this.vseq = rest; this.vi = Math.min(this.vi, rest.length - 1); this.vlog = null; this.paint();
  }
};
const logById = id => { const it = ITEMS[id]; return it && !it.x && it.d && HBY[it.d.hike] ? { id, ...it.d } : null; };
