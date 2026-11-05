/* ───────────── Parking: the car parks around the selected hike ─────────────
   The catalogue lists the car parks people use for each hike ("pk": name, position, fee, note).
   When a hike is selected, the app also asks OpenStreetMap for the car parks mapped around the
   trailhead (and around the valley station for lift hikes). It uses them to move approximate
   points onto the real car park and to add nearby car parks the list doesn't have. Nothing is
   drawn on the map until a hike is selected. */
const PK_ROLE = { start: 'At the start', finish: 'At the finish', valley: 'Valley station', alt: 'Alternative' };
const PK_STOP = new Set(['parkplatz', 'wanderparkplatz', 'parking', 'parcheggio', 'parcheggi', 'parkhaus', 'parkgarage', 'garage', 'park', 'car', 'carpark',
  'talstation', 'bergbahn', 'bahn', 'station', 'comunali', 'comunale', 'der', 'die', 'das', 'dem', 'den', 'am', 'an', 'im', 'beim', 'zum', 'zur', 'und', 'di', 'del', 'della', 'dei', 'de', 'la', 'il', 'le', 'du', 'des', 'et', 'the', 'and', 'of', 'mitte', 'gross', 'grossparkplatz']);
function pkWords(s) {
  return new Set(String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss')
    .split(/[^a-z0-9]+/).filter(w => w && !PK_STOP.has(w) && (w.length > 2 || /^p\d+$/.test(w))));
}
function pkSim(a, b) {
  const A = pkWords(a), B = pkWords(b); if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
}
const Parking = {
  id: null, marks: [], items: [], state: '', req: 0, popup: null, zoomBound: false,
  TTL: 21 * 864e5,

  /* catalogue entries, with the position they start from */
  curated(h) { return (h.pk || []).map((c, i) => Object.assign({}, c, { cur: 1, i, p: c.p ? [c.p[0], c.p[1]] : null, at: c.p ? (c.v ? 'src' : 'approx') : null })); },
  /* where to look on OpenStreetMap: every listed car park, plus the trailhead */
  anchors(h) {
    const out = [];
    const add = (p, r) => { if (p && !out.some(a => hav(a.p, p) < 0.3)) out.push({ p, r }); };
    for (const c of this.curated(h)) if (c.p) add(c.p, 650);
    // lift and boat hikes: you park at the valley station, so there is nothing to look for at the top
    if (!this.curated(h).some(c => c.r === 'valley')) add(h.start, out.length && out.some(a => hav(a.p, h.start) < 2) ? 650 : 1100);
    if (!out.length) add(h.start, 1100);
    return out.slice(0, 4);
  },
  /* the car park to drive to: the first one in the list that has a position */
  best(h) {
    const list = this.id === h.id && this.items.length ? this.items : this.curated(h);
    return list.find(c => c.cur && c.p) || list.find(c => c.p) || null;
  },

  show(h) {
    if (!h) return this.hide();
    if (this.id === h.id) return this.renderList(h); // same hike again (route traced, page redrawn)
    this.hide(); this.id = h.id;
    this.items = this.curated(h); this.state = 'loading';
    this.draw(h); this.renderList(h);
    const id = h.id, ticket = ++this.req;
    this.osm(h).then(o => {
      if (this.id !== id || ticket !== this.req) return;
      this.items = this.merge(h, o); this.state = 'ok';
      this.draw(h); this.renderList(h);
    }).catch(e => {
      if (this.id !== id || ticket !== this.req) return;
      console.warn('parking', e.message); this.state = 'error'; this.renderList(h);
    });
  },
  hide() {
    this.marks.forEach(m => m.remove()); this.marks = [];
    if (this.popup) { this.popup.remove(); this.popup = null; }
    this.id = null; this.items = []; this.state = ''; this.req++;
  },

  /* OpenStreetMap car parks around the anchors, cached on this device for three weeks */
  async osm(h) {
    const A = this.anchors(h), key = A.map(a => a.p[0].toFixed(3) + ',' + a.p[1].toFixed(3) + '/' + a.r).join(';');
    const all = LS.get('parking', {}), hit = all[h.id];
    if (hit && hit.k === key && Date.now() - hit.t < this.TTL) return hit.o;
    const q = `[out:json][timeout:20];(${A.map(a => `nwr["amenity"="parking"](around:${a.r},${a.p[0]},${a.p[1]});`).join('')});out center tags 80;`;
    const j = await overpass(q, 22000);
    const o = [];
    for (const e of j.elements || []) {
      const t = e.tags || {}, la = e.lat ?? (e.center && e.center.lat), lo = e.lon ?? (e.center && e.center.lon);
      if (la == null || lo == null || t.amenity !== 'parking') continue;
      if (/^(private|no|customers|delivery|permit)$/.test(t.access || '')) continue;
      if (/^(disabled|residents)$/.test(t.parking_space || '') || t.parking === 'layby' && !t.name) continue;
      o.push({ n: t.name || t['name:de'] || t['name:it'] || null, p: [+la.toFixed(5), +lo.toFixed(5)], fee: t.fee || null, cap: +t.capacity || null, ref: t.ref || null, k: e.type[0] + e.id, kind: t.parking || null });
    }
    all[h.id] = { k: key, t: Date.now(), o };
    const ids = Object.keys(all); if (ids.length > 160) ids.sort((a, b) => all[a].t - all[b].t).slice(0, ids.length - 160).forEach(k => delete all[k]);
    LS.set('parking', all);
    return o;
  },

  /* put the listed car parks on their mapped position and add the nearest other ones */
  merge(h, osm) {
    const cur = this.curated(h), used = new Set();
    const near = (p, km, pool) => (pool || osm).filter(o => !used.has(o.k) && hav(o.p, p) <= km).sort((a, b) => hav(a.p, p) - hav(b.p, p));
    for (const c of cur) {
      if (c.at === 'src') { const m = near(c.p, 0.12)[0]; if (m) used.add(m.k); continue; } // a checked position: the mapped lot is the same place
      const around = c.p ? [c.p] : this.anchors(h).map(a => a.p);
      let pick = null, best = 0;
      for (const a of around) for (const o of near(a, c.p ? 0.9 : 2.5)) {
        const s = o.n ? pkSim(c.n, o.n) : 0;
        if (s >= 0.5 && s > best) { best = s; pick = o; }
      }
      if (!pick && c.p) pick = near(c.p, 0.45).find(o => !o.n || pkSim(c.n, o.n) > 0) || null; // nearest mapped lot that isn't obviously another one
      if (pick) { used.add(pick.k); c.p = pick.p; c.at = 'osm'; c.cap = c.cap || pick.cap; }
    }
    const placed = cur.filter(c => c.p).map(c => c.p);
    const zone = this.anchors(h);
    const extra = osm.filter(o => !used.has(o.k) && !placed.some(p => hav(p, o.p) < 0.1) && zone.some(a => hav(a.p, o.p) <= a.r / 1000 + 0.1));
    extra.sort((a, b) => (!!b.n - !!a.n) || ((b.cap || 0) >= 30) - ((a.cap || 0) >= 30) || hav(a.p, h.start) - hav(b.p, h.start));
    const room = Math.max(2, 7 - cur.length);
    const pick = []; for (const o of extra) { if (pick.length >= room) break; if (!pick.some(q => hav(q.p, o.p) < 0.08)) pick.push(o); }
    const roleOf = o => { // a car park found next to the valley station (or the finish) is labelled like it
      if (hav(o.p, h.start) < 1.5) return null;
      const c = cur.filter(c => c.p && c.r).sort((a, b) => hav(a.p, o.p) - hav(b.p, o.p))[0];
      return c && hav(c.p, o.p) < 1.2 ? c.r : null;
    };
    return cur.concat(pick.map(o => ({
      n: o.n || (o.ref ? 'Car park ' + o.ref : 'Car park'), p: o.p, at: 'osmonly', cap: o.cap, r: roleOf(o),
      f: o.fee === 'no' ? 'Free' : o.fee === 'yes' ? 'Paid' : null, kind: o.kind, unnamed: !o.n
    })));
  },

  label(c, h) {
    const bits = [];
    if (c.r) bits.push(PK_ROLE[c.r]);
    if (c.p) { const d = hav(c.p, h.start); if (c.r !== 'valley' && c.r !== 'finish' || d < 1.5) bits.push(d < 0.08 ? 'at the trailhead' : (d < 1 ? Math.round(d * 100) * 10 + ' m' : d.toFixed(1) + ' km') + ' from the start'); }
    if (c.cap) bits.push(c.cap + ' spaces');
    return bits.join(' · ');
  },
  nav(c, h) {
    const area = [h.ar, COUNTRIES[h.c]].filter(Boolean).join(', ');
    const exact = c.p && c.at !== 'approx';
    const q = encodeURIComponent(c.n + (area ? ', ' + area : ''));
    if (exact) {
      const [la, lo] = c.p;
      return { g: `https://www.google.com/maps/dir/?api=1&destination=${la},${lo}`, w: `https://waze.com/ul?ll=${la},${lo}&navigate=yes`, a: `https://maps.apple.com/?daddr=${la},${lo}&q=${encodeURIComponent(c.n)}` };
    }
    const ll = c.p || h.start;
    return { g: `https://www.google.com/maps/search/?api=1&query=${q}`, w: `https://waze.com/ul?q=${encodeURIComponent(c.n)}&ll=${ll[0]},${ll[1]}&navigate=yes`, a: `https://maps.apple.com/?daddr=${q}` };
  },

  draw(h) {
    this.marks.forEach(m => m.remove()); this.marks = [];
    if (!map) return;
    if (!this.zoomBound) { this.zoomBound = true; const f = () => $('#map').classList.toggle('pk-far', map.getZoom() < 12.2); map.on('zoom', f); f(); }
    this.items.forEach((c, i) => {
      if (!c.p) return;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'pkm' + (c.cur ? '' : ' pkm-osm') + (c.at === 'approx' ? ' pkm-approx' : '');
      el.setAttribute('aria-label', 'Car park: ' + c.n);
      el.innerHTML = `<b>P</b>${c.unnamed ? '' : `<span>${esc(c.n)}</span>`}`;
      el.addEventListener('click', ev => { ev.stopPropagation(); this.open(i); });
      this.marks.push(new maplibregl.Marker({ element: el, anchor: 'left', offset: [-11, 0] }).setLngLat([c.p[1], c.p[0]]).addTo(map));
    });
  },
  open(i, fly) {
    const h = HBY[this.id], c = this.items[i]; if (!h || !c || !c.p) return;
    if (this.popup) this.popup.remove();
    const n = this.nav(c, h), lb = this.label(c, h);
    const html = `<div class="pk-pop"><b>${esc(c.n)}</b>${lb ? `<small>${esc(lb)}</small>` : ''}${c.f ? `<div class="pk-fee">${esc(c.f)}</div>` : ''}${c.x ? `<p>${esc(c.x)}</p>` : ''}${c.at === 'approx' ? '<p class="muted">Approximate position: the navigation links search the name.</p>' : ''}
      <div class="pk-nav"><a href="${n.w}" target="_blank" rel="noopener">Waze</a><a href="${n.g}" target="_blank" rel="noopener">Google Maps</a><a href="${n.a}" target="_blank" rel="noopener">Apple Maps</a></div></div>`;
    this.popup = new maplibregl.Popup({ offset: [10, -14], maxWidth: '280px', focusAfterOpen: false }).setLngLat([c.p[1], c.p[0]]).setHTML(html).addTo(map);
    if (fly) map.easeTo({ center: [c.p[1], c.p[0]], zoom: Math.max(map.getZoom(), 15), duration: 900, padding: mapPadding() });
  },

  /* the Parking section of the hike detail */
  renderList(h) {
    const box = $('#dParkList'); if (!box || UI.detailId !== h.id) return;
    const note = $('#dParkNote');
    const items = this.items;
    if (note) note.textContent = this.state === 'loading' ? 'checking OpenStreetMap…' : this.state === 'error' ? 'OpenStreetMap unreachable, our list only' : items.some(c => !c.cur) ? 'with OpenStreetMap' : '';
    if (!items.length) {
      box.innerHTML = this.state === 'loading' ? '<p class="muted">Looking for car parks near the start…</p>'
        : `<p class="muted">No car park listed or mapped near the start. <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('parking near ' + h.start[0] + ',' + h.start[1])}" target="_blank" rel="noopener">Search parking on Google Maps</a></p>`;
    } else {
      box.innerHTML = items.map((c, i) => {
        const n = this.nav(c, h), lb = this.label(c, h);
        return `<div class="pk-row${c.cur ? '' : ' pk-row-osm'}">
          <button type="button" class="pk-ico${c.at === 'approx' ? ' pkm-approx' : ''}" data-pk="${i}" ${c.p ? '' : 'disabled'} aria-label="Show ${esc(c.n)} on the map">P</button>
          <div class="pk-body"><button type="button" class="pk-name" data-pk="${i}" ${c.p ? '' : 'disabled'}>${esc(c.n)}</button>${lb ? `<small>${esc(lb)}</small>` : ''}
            ${c.f ? `<div class="pk-fee">${esc(c.f)}</div>` : ''}${c.x ? `<div class="pk-x">${esc(c.x)}</div>` : ''}
            <div class="pk-nav"><a href="${n.w}" target="_blank" rel="noopener">Waze</a><a href="${n.g}" target="_blank" rel="noopener">Google Maps</a><a href="${n.a}" target="_blank" rel="noopener">Apple Maps</a></div></div></div>`;
      }).join('') + `<p class="src-tag">${items.some(c => c.cur) ? 'Car parks from tourism boards, lift operators and route descriptions' + (items.some(c => !c.cur) ? '; the others are mapped on OpenStreetMap' : '') : 'Car parks mapped on OpenStreetMap'}. Fees and access rules change: check the signs.${items.some(c => c.at === 'approx') ? ' A dashed P marks an approximate position.' : ''}</p>`;
      box.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { if (isPhone()) Sheet.to(0); this.open(+b.dataset.pk, true); });
    }
    const dir = $('#dDir'), b = this.best(h);
    if (dir && b) { dir.href = this.nav(b, h).g; dir.title = 'Directions to ' + b.n; }
  }
};
