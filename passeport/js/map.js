/* Passeport — the 3D map. MapLibre on OpenFreeMap vector tiles (© OpenStreetMap contributors), with a style of its own in
   two palettes: "day" (warm paper) and "night" (navy, buildings lit by height). Spots are drawn on the GPU (dots sized by
   importance, a gold glow for Christmas events running today); the grade 4–5 icons get a round photo once zoomed in. */
const LIB = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl';
const OFM = 'https://tiles.openfreemap.org/planet';
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const F_REG = ['Noto Sans Regular'], F_BOLD = ['Noto Sans Bold'], F_IT = ['Noto Sans Italic'];

const PAL = {
  day: { bg: '#f1ebe0', res: '#ebe4d6', park: '#d3dfc0', wood: '#c6d6b2', water: '#a9c9d8', wline: '#9cc0d1', road: '#ffffff', major: '#fbeed2', motor: '#f2d7a6', rail: '#cfc3b0', path: '#e4dccb', bld: '#e4d9c6', bldHi: '#d8c9b0', label: '#5c5446', halo: '#f1ebe0', wlab: '#4f7f99', stroke: '#ffffff', pk: '#2463eb', glow: '#e9b949', line: '#1c2e55' },
  night: { bg: '#0c1220', res: '#0f182a', park: '#0f1f1c', wood: '#0d1b18', water: '#071e31', wline: '#0b2840', road: '#1a2440', major: '#243258', motor: '#33447a', rail: '#1d2844', path: '#162038', bld: '#172238', bldHi: '#33466f', label: '#aebbd8', halo: '#0c1220', wlab: '#5d8db3', stroke: '#0c1220', pk: '#9cbcff', glow: '#ffc861', line: '#e9c46a' }
};

let map = null, lib = null, theme = 'day', threeD = true, onSelect = () => { }, photoMarks = [], selMark = null, dayMarks = [], ready = null;

export function loadLib() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  return lib || (lib = new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LIB + '.css'; document.head.append(css);
    const js = document.createElement('script'); js.src = LIB + '.js'; js.onload = () => res(window.maplibregl);
    js.onerror = () => { lib = null; js.remove(); css.remove(); rej(new Error('offline')); };
    document.head.append(js);
  }));
}

const name = ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name']];
function style(P) {
  const z = (a, b, c, d) => ['interpolate', ['exponential', 1.6], ['zoom'], a, b, c, d];
  return {
    version: 8, glyphs: GLYPHS,
    sources: { omt: { type: 'vector', url: OFM, attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' } },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': P.bg } },
      { id: 'res', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood', 'commercial', 'retail']]], paint: { 'fill-color': P.res } },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': P.park } },
      { id: 'green', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood', 'farmland']]], paint: { 'fill-color': ['match', ['get', 'class'], 'wood', P.wood, P.park], 'fill-opacity': 0.9 } },
      { id: 'cem', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: ['==', ['get', 'class'], 'cemetery'], paint: { 'fill-color': P.wood, 'fill-opacity': 0.7 } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', filter: ['!=', ['get', 'brunnel'], 'tunnel'], paint: { 'fill-color': P.water } },
      { id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway', paint: { 'line-color': P.wline, 'line-width': z(10, 0.6, 18, 6) } },
      { id: 'path', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 14, filter: ['in', ['get', 'class'], ['literal', ['path', 'track', 'pedestrian']]], paint: { 'line-color': P.path, 'line-width': z(14, 0.8, 18, 3), 'line-dasharray': [2, 1] } },
      { id: 'minor', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'tertiary']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': P.road, 'line-width': z(12, 0.5, 18, 12) } },
      { id: 'major', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'trunk']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': P.major, 'line-width': z(9, 0.8, 18, 18) } },
      { id: 'motor', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'motorway'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': P.motor, 'line-width': z(7, 0.8, 18, 20) } },
      { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 11, filter: ['in', ['get', 'class'], ['literal', ['rail', 'transit']]], paint: { 'line-color': P.rail, 'line-width': z(11, 0.6, 18, 2.4), 'line-dasharray': [3, 2] } },
      { id: 'bld', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 13,
        paint: { 'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 10], 0, P.bld, 40, P.bldHi], 'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.5, ['coalesce', ['get', 'render_height'], 10]], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': 0.88, 'fill-extrusion-vertical-gradient': true } },
      { id: 'wname', type: 'symbol', source: 'omt', 'source-layer': 'water_name', layout: { 'text-field': name, 'text-font': F_IT, 'text-size': 12, 'symbol-placement': 'line', 'text-letter-spacing': 0.2 }, paint: { 'text-color': P.wlab, 'text-halo-color': P.halo, 'text-halo-width': 1.2 } },
      { id: 'roadname', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 15.5, layout: { 'text-field': name, 'text-font': F_REG, 'text-size': 11, 'symbol-placement': 'line' }, paint: { 'text-color': P.label, 'text-opacity': 0.7, 'text-halo-color': P.halo, 'text-halo-width': 1.3 } },
      { id: 'quarter', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 11.5, maxzoom: 14.5, filter: ['==', ['get', 'class'], 'suburb'], layout: { 'text-field': name, 'text-font': F_IT, 'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9.5, 14, 12], 'text-transform': 'uppercase', 'text-letter-spacing': 0.15, 'text-max-width': 8 }, paint: { 'text-color': P.label, 'text-opacity': 0.45, 'text-halo-color': P.halo, 'text-halo-width': 1.2 } },
      { id: 'hood', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 14.5, maxzoom: 17, filter: ['in', ['get', 'class'], ['literal', ['quarter', 'neighbourhood']]], layout: { 'text-field': name, 'text-font': F_IT, 'text-size': 11.5, 'text-transform': 'uppercase', 'text-letter-spacing': 0.15, 'text-max-width': 8 }, paint: { 'text-color': P.label, 'text-opacity': 0.45, 'text-halo-color': P.halo, 'text-halo-width': 1.2 } },
      { id: 'city', type: 'symbol', source: 'omt', 'source-layer': 'place', maxzoom: 12, filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]], layout: { 'text-field': name, 'text-font': F_BOLD, 'text-size': ['match', ['get', 'class'], 'city', 15, 12] }, paint: { 'text-color': P.label, 'text-halo-color': P.halo, 'text-halo-width': 1.4 } }
    ]
  };
}

/* the spot layers, added once the style is loaded */
function addSpotLayers(P) {
  map.addSource('spots', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addSource('parks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addSource('day', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  const rad = (a, b) => ['interpolate', ['linear'], ['zoom'], 9, ['+', a, ['*', ['get', 'i'], 0.35]], 15, ['+', b, ['*', ['get', 'i'], 1.5]]];
  map.addLayer({ id: 'day-line', type: 'line', source: 'day', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': P.line, 'line-width': 3, 'line-dasharray': [1, 2], 'line-opacity': 0.85 } });
  map.addLayer({ id: 'sp-glow', type: 'circle', source: 'spots', filter: ['==', ['get', 'x'], 1], paint: { 'circle-color': P.glow, 'circle-radius': rad(6, 14), 'circle-blur': 0.9, 'circle-opacity': 0.75 } });
  map.addLayer({ id: 'sp-dot', type: 'circle', source: 'spots', paint: {
    'circle-color': ['get', 'col'], 'circle-radius': rad(1.6, 3.2),
    'circle-stroke-color': ['case', ['==', ['get', 'v'], 1], '#d4ae5c', P.stroke], 'circle-stroke-width': ['case', ['==', ['get', 'v'], 1], 3, 1.6],
    'circle-opacity': ['case', ['==', ['get', 'cl'], 1], 0.4, 1], 'circle-stroke-opacity': ['case', ['==', ['get', 'cl'], 1], 0.4, 1] } });
  const lab = (id, i, minzoom, size) => map.addLayer({ id, type: 'symbol', source: 'spots', minzoom, filter: i === 2 ? ['<=', ['get', 'i'], 2] : ['==', ['get', 'i'], i],
    layout: { 'text-field': ['get', 'n'], 'text-font': F_BOLD, 'text-size': size, 'text-offset': ['step', ['zoom'], ['literal', [0, 1.1]], 12.9, ['case', ['==', ['get', 'pm'], 1], ['literal', [0, 2.3]], ['literal', [0, 1.1]]]], 'text-anchor': 'top', 'text-max-width': 9, 'symbol-sort-key': ['-', 10, ['get', 'i']], 'text-optional': true },
    paint: { 'text-color': P.label, 'text-halo-color': P.halo, 'text-halo-width': 1.6 } });
  lab('lab5', 5, 10.5, 13); lab('lab4', 4, 12.6, 12); lab('lab3', 3, 14.2, 11.5); lab('lab2', 2, 15.6, 11);
  map.addLayer({ id: 'pk-dot', type: 'circle', source: 'parks', paint: { 'circle-color': '#2463eb', 'circle-radius': 11, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
  map.addLayer({ id: 'pk-p', type: 'symbol', source: 'parks', layout: { 'text-field': 'P', 'text-font': F_BOLD, 'text-size': 13, 'text-allow-overlap': true }, paint: { 'text-color': '#fff' } });
  map.addLayer({ id: 'pk-name', type: 'symbol', source: 'parks', minzoom: 14.5, layout: { 'text-field': ['get', 'n'], 'text-font': F_BOLD, 'text-size': 11, 'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-max-width': 10, 'text-optional': true }, paint: { 'text-color': P.pk, 'text-halo-color': P.halo, 'text-halo-width': 1.6 } });
  map.addLayer({ id: 'day-num', type: 'circle', source: 'day', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-color': P.line, 'circle-radius': 12, 'circle-stroke-color': P.halo, 'circle-stroke-width': 2 } });
  map.addLayer({ id: 'day-txt', type: 'symbol', source: 'day', filter: ['==', ['geometry-type'], 'Point'], layout: { 'text-field': ['to-string', ['get', 'k']], 'text-font': F_BOLD, 'text-size': 12, 'text-allow-overlap': true }, paint: { 'text-color': P.halo } });
}

const PAINT = P => ({
  bg: { 'background-color': P.bg }, res: { 'fill-color': P.res }, park: { 'fill-color': P.park }, cem: { 'fill-color': P.wood },
  green: { 'fill-color': ['match', ['get', 'class'], 'wood', P.wood, P.park] }, water: { 'fill-color': P.water }, waterway: { 'line-color': P.wline },
  path: { 'line-color': P.path }, minor: { 'line-color': P.road }, major: { 'line-color': P.major }, motor: { 'line-color': P.motor }, rail: { 'line-color': P.rail },
  bld: { 'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 10], 0, P.bld, 40, P.bldHi] },
  wname: { 'text-color': P.wlab, 'text-halo-color': P.halo }, roadname: { 'text-color': P.label, 'text-halo-color': P.halo },
  quarter: { 'text-color': P.label, 'text-halo-color': P.halo }, hood: { 'text-color': P.label, 'text-halo-color': P.halo }, city: { 'text-color': P.label, 'text-halo-color': P.halo },
  'sp-glow': { 'circle-color': P.glow }, 'sp-dot': { 'circle-stroke-color': ['case', ['==', ['get', 'v'], 1], '#d4ae5c', P.stroke] },
  lab5: { 'text-color': P.label, 'text-halo-color': P.halo }, lab4: { 'text-color': P.label, 'text-halo-color': P.halo }, lab3: { 'text-color': P.label, 'text-halo-color': P.halo }, lab2: { 'text-color': P.label, 'text-halo-color': P.halo },
  'pk-name': { 'text-color': P.pk, 'text-halo-color': P.halo }, 'day-line': { 'line-color': P.line }, 'day-num': { 'circle-color': P.line, 'circle-stroke-color': P.halo }, 'day-txt': { 'text-color': P.halo }
});

/* o: { el, center, zoom, theme, threeD, onSelect, onMove, reduced } */
export async function createMap(o) {
  const ml = await loadLib();
  theme = o.theme; threeD = o.threeD; onSelect = o.onSelect;
  map = new ml.Map({ container: o.el, style: style(PAL[theme]), center: o.center, zoom: o.zoom, pitch: threeD ? 52 : 0, bearing: threeD ? -12 : 0, maxPitch: 70, attributionControl: { compact: true }, fadeDuration: 150, cooperativeGestures: false });
  map.touchZoomRotate.enableRotation(); map.dragRotate.enable();
  const geo = new ml.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true, fitBoundsOptions: { maxZoom: 15.5 } });
  map.addControl(geo, 'top-left');
  map._ppGeo = geo;
  ready = new Promise(res => map.once('load', () => {
    addSpotLayers(PAL[theme]);
    const pick = e => { const f = e.features && e.features[0]; if (f) onSelect(f.properties.id); };
    for (const id of ['sp-dot', 'lab5', 'lab4', 'lab3', 'lab2']) { map.on('click', id, pick); map.on('mouseenter', id, () => map.getCanvas().style.cursor = 'pointer'); map.on('mouseleave', id, () => map.getCanvas().style.cursor = ''); }
    res(map);
  }));
  const zoomClass = () => o.el.classList.toggle('show-photos', map.getZoom() >= 12.9);
  map.on('zoom', zoomClass); zoomClass();
  map.on('moveend', () => o.onMove && o.onMove(map.getCenter(), map.getZoom()));
  geo.on('geolocate', e => o.onLocate && o.onLocate({ lat: e.coords.latitude, lon: e.coords.longitude, acc: e.coords.accuracy }));
  geo.on('error', () => o.onLocate && o.onLocate(null));
  await ready;
  return map;
}
export const whenReady = () => ready;
export const getMap = () => map;

export function setTheme(t) {
  theme = t; if (!map || !map.isStyleLoaded()) return;
  const P = PAL[t], all = PAINT(P);
  for (const [id, props] of Object.entries(all)) if (map.getLayer(id)) for (const [k, v] of Object.entries(props)) map.setPaintProperty(id, k, v);
}
export function set3D(on, reduced) {
  threeD = on; if (!map) return;
  map.easeTo({ pitch: on ? 55 : 0, bearing: on ? map.getBearing() || -12 : 0, duration: reduced ? 0 : 800 });
  if (map.getLayer('bld')) map.setLayoutProperty('bld', 'visibility', on ? 'visible' : 'none');
}
export function locateMe() { if (map && map._ppGeo) map._ppGeo.trigger(); }

/* features: [{ id, n, c, col, i, v (visited), x (event today), cl (closed today), lat, lon }] */
export function setSpots(features) {
  if (!map || !map.getSource('spots')) return;
  map.getSource('spots').setData({ type: 'FeatureCollection', features: features.map(f => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.lon, f.lat] }, properties: f })) });
}

/* round photo markers for the icons; spots: [{ id, n, lat, lon, img, col, v }] */
export function setPhotoMarkers(spots) {
  if (!map) return;
  photoMarks.forEach(m => m.remove()); photoMarks = [];
  for (const s of spots) {
    const el = document.createElement('button');
    el.className = 'pm' + (s.v ? ' v' : '') + (s.x ? ' x' : ''); el.type = 'button'; el.style.setProperty('--c', s.col);
    el.setAttribute('aria-label', s.n);
    el.innerHTML = `<img src="${s.img}" alt="" loading="lazy" decoding="async" crossorigin="anonymous" referrerpolicy="no-referrer">`;
    el.addEventListener('click', ev => { ev.stopPropagation(); onSelect(s.id); });
    photoMarks.push(new window.maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([s.lon, s.lat]).addTo(map));
  }
}

export function setSelected(s) {
  if (selMark) { selMark.remove(); selMark = null; }
  if (!map || !s) return;
  const el = document.createElement('div'); el.className = 'sel'; el.style.setProperty('--c', s.col || '#c9a45c');
  selMark = new window.maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([s.lon, s.lat]).addTo(map);
}
export function flyTo(s, pad, reduced) {
  if (!map) return;
  map.flyTo({ center: [s.lon, s.lat], zoom: Math.max(map.getZoom(), s.z === 'P' ? 15.4 : 14), pitch: threeD ? 58 : 0, bearing: threeD ? (map.getBearing() || -12) : 0, padding: pad || { top: 0, bottom: 0, left: 0, right: 0 }, duration: reduced ? 0 : 1600, essential: true });
}
export function setParks(list) {
  if (!map || !map.getSource('parks')) return;
  map.getSource('parks').setData({ type: 'FeatureCollection', features: (list || []).map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { n: p.n || '', id: p.id } })) });
}
/* a planned day: numbered stops joined by a dotted line */
export function setDay(stops) {
  if (!map || !map.getSource('day')) return;
  const feats = [];
  if (stops && stops.length > 1) feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: stops.map(s => [s.lon, s.lat]) }, properties: {} });
  (stops || []).forEach((s, k) => feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { k: k + 1, id: s.id } }));
  map.getSource('day').setData({ type: 'FeatureCollection', features: feats });
}
export function fitTo(points, pad, reduced) {
  if (!map || !points.length) return;
  const b = new window.maplibregl.LngLatBounds();
  points.forEach(p => b.extend([p.lon, p.lat]));
  map.fitBounds(b, { padding: pad || 60, maxZoom: 15.5, duration: reduced ? 0 : 1200, pitch: threeD ? 45 : 0 });
}
/* fly from stop to stop, like a drone over the day */
export async function flyover(stops, pad, isOn) {
  for (const s of stops) {
    if (!isOn()) return;
    await new Promise(res => { map.flyTo({ center: [s.lon, s.lat], zoom: 16.2, pitch: 64, bearing: (map.getBearing() + 55) % 360, padding: pad, duration: 3200, essential: true }); map.once('moveend', res); });
    if (!isOn()) return;
    await new Promise(r => setTimeout(r, 900));
  }
}
export function resize() { if (map) map.resize(); }
